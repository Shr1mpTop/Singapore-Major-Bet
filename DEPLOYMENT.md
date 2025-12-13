# Singapore Major Bet - Render.com 部署指南

## 概述

本项目包含一个Flask后端和Next.js前端，用于CS2比赛投注系统。使用Render.com进行部署。

## 部署前准备

### 1. 环境变量配置

在Render.com中为每个服务设置以下环境变量：

#### 后端服务 (singapore-major-bet-backend)
```
FLASK_ENV=production
INFURA_PROJECT_ID=your_infura_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### 前端服务 (singapore-major-bet-frontend)
```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-service.onrender.com
NODE_ENV=production
```

### 2. 获取API密钥

- **Infura Project ID**: 从 [Infura](https://infura.io/) 获取
- **Etherscan API Key**: 从 [Etherscan](https://etherscan.io/apis) 获取

## 部署步骤

### 1. 连接GitHub仓库

1. 登录 [Render.com](https://render.com)
2. 点击 "New" → "Blueprint"
3. 连接你的GitHub仓库 `Singapore-Major-Bet`
4. 选择仓库分支 (通常是 `main`)

### 2. 部署服务

Render.com 会自动识别 `render.yaml` 文件并创建两个服务：

- **后端服务**: `singapore-major-bet-backend`
- **前端服务**: `singapore-major-bet-frontend`

### 3. 配置环境变量

为每个服务设置相应的环境变量 (见上文)。

### 4. 部署完成

部署完成后，你会获得两个URL：
- 后端API: `https://singapore-major-bet-backend.onrender.com`
- 前端应用: `https://singapore-major-bet-frontend.onrender.com`

## 故障排除

### 常见问题

1. **CORS错误**: 确保前端的 `NEXT_PUBLIC_BACKEND_URL` 设置正确
2. **API连接失败**: 检查后端服务是否正常运行
3. **构建失败**: 确保所有依赖都在 `requirements.txt` 和 `package.json` 中

### 日志查看

在Render.com控制台中查看每个服务的日志来诊断问题。

## 架构说明

- **后端**: Flask + SQLAlchemy + Web3 + Gunicorn
- **前端**: Next.js + React + TypeScript + Tailwind CSS
- **数据库**: SQLite (文件存储)
- **Web3**: Infura + Etherscan API

## 性能优化

- 使用Gunicorn作为WSGI服务器
- 配置了2个worker进程
- 设置了适当的超时和连接限制