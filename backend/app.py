import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from web3 import Web3
from dotenv import load_dotenv
import threading
import time
from datetime import datetime

# 1. 初始化配置
load_dotenv()
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"]) # 允许前端跨域访问

# 配置 SQLite 数据库
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///betting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 配置 Web3
rpc_url = os.getenv("RPC_URL")
if not rpc_url:
    raise ValueError("RPC_URL not set in .env")

contract_address_str = os.getenv("CONTRACT_ADDRESS")
if not contract_address_str:
    raise ValueError("CONTRACT_ADDRESS not set in .env")

contract_address = Web3.to_checksum_address(contract_address_str)
web3 = Web3(Web3.HTTPProvider(rpc_url))

# 加载 ABI
with open('abi.json', 'r') as f:
    contract_abi = json.load(f)

contract = web3.eth.contract(address=contract_address, abi=contract_abi)

# --- 2. 数据库模型 (Models) ---

class GameState(db.Model):
    """存储游戏的全局状态"""
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.Integer, default=0) # 0: Open, 1: Stopped, etc.
    total_prize_pool = db.Column(db.String(50), default="0") # 存 Wei (大整数用字符串存)
    winning_team_id = db.Column(db.Integer, nullable=True)


class Team(db.Model):
    """存储战队信息"""
    id = db.Column(db.Integer, primary_key=True) # 对应合约里的 teamId
    name = db.Column(db.String(100))
    total_bet_amount = db.Column(db.String(50), default="0") # Wei
    supporter_count = db.Column(db.Integer, default=0)

class UserBet(db.Model):
    """记录每个用户的下注"""
    id = db.Column(db.Integer, primary_key=True)
    user_address = db.Column(db.String(42))  # ETH 地址
    team_id = db.Column(db.Integer)
    amount_wei = db.Column(db.String(50))  # 下注金额 Wei
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# --- 3. 辅助函数：从链上同步数据 ---

def sync_data_from_chain():
    """
    核心逻辑：调用智能合约的 view 函数，更新本地 SQLite。
    在生产环境中，这通常由 Celery 定时任务或后台线程触发。
    """
    if not web3.is_connected():
        return {"error": "Blockchain connection failed"}

    try:
        # 1. 获取全局状态
        current_status = contract.functions.status().call()
        pool_wei = contract.functions.totalPrizePool().call()
        
        # 获取冠军ID (只有在 Finished 状态下才有意义，为了防止报错需try-catch或判断状态)
        winner_id = 0
        if current_status == 2: # Finished
            winner_id = contract.functions.winningTeamId().call()

        # 更新 State 表
        state_record = GameState.query.first()
        if not state_record:
            state_record = GameState(id=1)
            db.session.add(state_record)
        
        state_record.status = current_status
        state_record.total_prize_pool = str(pool_wei)
        state_record.winning_team_id = winner_id

        # 2. 获取战队列表
        # 合约返回: tuple(id, name, totalBetAmount, supporterCount)[]
        teams_data = contract.functions.getTeams().call()

        # 更新 Teams 表
        # 简单粗暴策略：清空旧数据，写入新数据 (适合数据量小的情况)
        # 生产环境建议用 update logic
        Team.query.delete() 
        
        for t in teams_data:
            # t 结构: (id, name, totalBetAmount, supporterCount)
            new_team = Team(
                id=t[0],
                name=t[1],
                total_bet_amount=str(t[2]), # 转字符串存 Wei
                supporter_count=t[3]
            )
            db.session.add(new_team)

        db.session.commit()
        return {"message": "Synced successfully", "status": current_status}

    except Exception as e:
        print(f"Sync Error: {e}")
        return {"error": str(e)}

# --- 4. 事件监听器：实时同步 ---

def setup_event_listeners():
    """设置智能合约事件监听器，实现实时数据同步"""
    
    # 监听 NewBet 事件
    bet_filter = contract.events.NewBet.create_filter(fromBlock='latest')
    
    # 监听 GameStatusChanged 事件
    status_filter = contract.events.GameStatusChanged.create_filter(fromBlock='latest')
    
    # 监听 WinnerSelected 事件
    winner_filter = contract.events.WinnerSelected.create_filter(fromBlock='latest')
    
    def handle_new_bet(event):
        """处理新下注事件"""
        try:
            args = event['args']
            user_address = args['user']
            team_id = args['teamId']
            amount_wei = str(args['amount'])
            
            print(f"New bet detected: {user_address} bet {amount_wei} wei on team {team_id}")
            
            # 记录用户下注到数据库
            with app.app_context():
                new_bet = UserBet(
                    user_address=user_address,
                    team_id=int(team_id),
                    amount_wei=amount_wei
                )
                db.session.add(new_bet)
                db.session.commit()
                
                # 触发完整同步以更新统计数据
                sync_data_from_chain()
                
        except Exception as e:
            print(f"Error handling NewBet event: {e}")
    
    def handle_status_change(event):
        """处理游戏状态改变事件"""
        try:
            args = event['args']
            new_status = args['newStatus']
            
            print(f"Game status changed to: {new_status}")
            
            # 更新游戏状态
            with app.app_context():
                sync_data_from_chain()
                
        except Exception as e:
            print(f"Error handling GameStatusChanged event: {e}")
    
    def handle_winner_selected(event):
        """处理获胜者选择事件"""
        try:
            args = event['args']
            winner_team_id = args['teamId']
            winner_team_name = args['teamName']
            
            print(f"Winner selected: Team {winner_team_id} - {winner_team_name}")
            
            # 更新获胜者信息
            with app.app_context():
                sync_data_from_chain()
                
        except Exception as e:
            print(f"Error handling WinnerSelected event: {e}")
    
    # 启动事件监听线程
    def event_listener():
        while True:
            try:
                # 检查 NewBet 事件
                for event in bet_filter.get_new_entries():
                    handle_new_bet(event)
                
                # 检查状态改变事件
                for event in status_filter.get_new_entries():
                    handle_status_change(event)
                
                # 检查获胜者选择事件
                for event in winner_filter.get_new_entries():
                    handle_winner_selected(event)
                
                time.sleep(2)  # 每2秒检查一次新事件
                
            except Exception as e:
                print(f"Event listener error: {e}")
                time.sleep(5)  # 出错后等待5秒再试
    
    # 启动监听线程
    listener_thread = threading.Thread(target=event_listener, daemon=True)
    listener_thread.start()
    print("Event listeners started")

# --- 5. API 接口 (Routes) ---

@app.route('/api/sync', methods=['POST', 'GET'])
def trigger_sync():
    """
    手动触发同步接口。
    前端页面加载时，或者管理员操作后可以调用此接口刷新后端数据。
    """
    result = sync_data_from_chain()
    return jsonify(result)

@app.route('/api/user_bets/<user_address>', methods=['GET'])
def get_user_bets(user_address):
    """获取用户总下注"""
    bets = UserBet.query.filter_by(user_address=user_address).all()
    total_bet_wei = sum(int(bet.amount_wei) for bet in bets)
    return jsonify({
        "total_bet_wei": str(total_bet_wei),
        "total_bet_eth": float(web3.from_wei(total_bet_wei, 'ether')),
        "bets": [
            {
                "team_id": bet.team_id,
                "amount_wei": bet.amount_wei,
                "amount_eth": float(web3.from_wei(int(bet.amount_wei), 'ether')),
                "timestamp": bet.timestamp.isoformat()
            } for bet in bets
        ]
    })

@app.route('/api/record_bet', methods=['POST'])
def record_bet():
    """记录用户下注"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_address = data.get('userAddress')
    team_id = data.get('teamId')
    amount_wei = data.get('amount')
    
    if not all([user_address, team_id, amount_wei]):
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        new_bet = UserBet(
            user_address=user_address,
            team_id=int(team_id),
            amount_wei=str(amount_wei)
        )
        db.session.add(new_bet)
        db.session.commit()
        return jsonify({"message": "Bet recorded successfully", "bet_id": new_bet.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/reset_database', methods=['POST'])
def reset_database():
    """清空所有数据库数据（用于更换合约时）"""
    try:
        # 清空所有表
        UserBet.query.delete()
        Team.query.delete()
        GameState.query.delete()
        
        # 重置GameState为初始状态
        initial_state = GameState(id=1, status=0, total_prize_pool="0", winning_team_id=0)
        db.session.add(initial_state)
        
        db.session.commit()
        return jsonify({"message": "Database reset successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """获取当前游戏状态和奖池"""
    state = GameState.query.first()
    if not state:
        return jsonify({"status": 0, "total_prize_pool": "0", "winning_team_id": 0})
    
    return jsonify({
        "status": state.status, # 0: Open, 1: Stopped...
        "status_text": ["Open", "Stopped", "Finished", "Refunding"][state.status],
        "total_prize_pool_wei": state.total_prize_pool,
        # 方便前端展示，后端也可以简单换算一下 ETH，但建议前端处理精度
        "total_prize_pool_eth": float(web3.from_wei(int(state.total_prize_pool), 'ether')),
        "winning_team_id": state.winning_team_id
    })

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """获取所有战队列表及当前赔率数据"""
    teams = Team.query.order_by(Team.id).all()
    result = []
    
    for t in teams:
        result.append({
            "id": t.id,
            "name": t.name,
            "total_bet_wei": t.total_bet_amount,
            "total_bet_eth": float(web3.from_wei(int(t.total_bet_amount), 'ether')),
            "supporters": t.supporter_count
        })
    
    return jsonify(result)

# 初始化数据库
with app.app_context():
    db.create_all()

# 自动同步函数
def auto_sync():
    while True:
        with app.app_context():
            sync_data_from_chain()
        time.sleep(60)

# 启动后台线程
sync_thread = threading.Thread(target=auto_sync, daemon=True)
sync_thread.start()

# 启动事件监听器
setup_event_listeners()

if __name__ == '__main__':
    app.run(debug=True, port=5001)