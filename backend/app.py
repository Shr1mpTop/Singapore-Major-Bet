import os
import json
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from web3 import Web3
from dotenv import load_dotenv

# 1. 初始化配置
load_dotenv()
app = Flask(__name__)
CORS(app) # 允许前端跨域访问

# 配置 SQLite 数据库
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///betting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 配置 Web3
rpc_url = os.getenv("RPC_URL")
contract_address = os.getenv("CONTRACT_ADDRESS")
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

# --- 4. API 接口 (Routes) ---

@app.route('/api/sync', methods=['POST', 'GET'])
def trigger_sync():
    """
    手动触发同步接口。
    前端页面加载时，或者管理员操作后可以调用此接口刷新后端数据。
    """
    result = sync_data_from_chain()
    return jsonify(result)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)