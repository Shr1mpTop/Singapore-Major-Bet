#!/usr/bin/env python3
"""
数据库重置脚本
用于更换合约时清空所有数据
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# 添加backend目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 加载环境变量
load_dotenv()

# 初始化Flask应用和数据库
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///betting.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 数据库模型定义（与app.py中的相同）
class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.Integer, default=0)
    total_prize_pool = db.Column(db.String(50), default="0")
    winning_team_id = db.Column(db.Integer, nullable=True)

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    total_bet_amount = db.Column(db.String(50), default="0")
    supporter_count = db.Column(db.Integer, default=0)

class UserBet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_address = db.Column(db.String(42))
    team_id = db.Column(db.Integer)
    amount_wei = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())

def reset_database():
    """清空数据库并重新初始化"""
    with app.app_context():
        print("正在清空数据库...")

        # 删除所有数据
        UserBet.query.delete()
        Team.query.delete()
        GameState.query.delete()

        # 重新创建初始状态
        initial_state = GameState(id=1, status=0, total_prize_pool="0", winning_team_id=0)
        db.session.add(initial_state)

        db.session.commit()
        print("数据库已重置完成！")

if __name__ == "__main__":
    reset_database()