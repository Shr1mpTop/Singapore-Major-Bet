#!/bin/bash

echo "🔍 验证部署配置..."

# 检查后端文件
echo "📁 检查后端配置..."
if [ -f "backend/requirements.txt" ]; then
    echo "✅ requirements.txt 存在"
else
    echo "❌ requirements.txt 缺失"
fi

if [ -f "backend/runtime.txt" ]; then
    echo "✅ runtime.txt 存在"
else
    echo "❌ runtime.txt 缺失"
fi

if [ -f "backend/gunicorn.conf.py" ]; then
    echo "✅ gunicorn.conf.py 存在"
else
    echo "❌ gunicorn.conf.py 缺失"
fi

# 检查前端文件
echo "📁 检查前端配置..."
if [ -f "frontend/package.json" ]; then
    echo "✅ package.json 存在"
else
    echo "❌ package.json 缺失"
fi

# 检查部署文件
echo "📁 检查部署配置..."
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml 存在"
else
    echo "❌ render.yaml 缺失"
fi

if [ -f ".env.example" ]; then
    echo "✅ .env.example 存在"
else
    echo "❌ .env.example 缺失"
fi

if [ -f "DEPLOYMENT.md" ]; then
    echo "✅ DEPLOYMENT.md 存在"
else
    echo "❌ DEPLOYMENT.md 缺失"
fi

echo "🎉 配置验证完成！"