@echo off
REM PlantGenius Backend - Local Testing Quick Start (Windows)
REM Usage: start-local.bat

echo 🚀 PlantGenius Backend - Local Testing Setup
echo.

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env from template...
    if exist .env.local (
        copy .env.local .env
        echo ✅ .env file created from .env.local
        echo.
        echo ⚠️  IMPORTANT: Edit .env and configure:
        echo    1. MONGODB_URI (MongoDB Atlas or local)
        echo    2. JWT_SECRET (run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        echo    3. Optional: PAYSTACK_SECRET_KEY, PLANTNET_API_KEY
        echo.
        echo Press any key when done editing .env...
        pause >nul
    ) else (
        echo ❌ .env.local template not found
        exit /b 1
    )
)

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
    echo ✅ Dependencies installed
    echo.
)

REM Check MongoDB configuration
echo 🔍 Checking .env configuration...
findstr "YOUR_NEW_USERNAME" .env >nul
if %errorlevel% == 0 (
    echo ⚠️  MongoDB not configured yet
    echo.
    echo Setup MongoDB Atlas (recommended):
    echo   1. Go to https://cloud.mongodb.com
    echo   2. Create free cluster
    echo   3. Create database user
    echo   4. Whitelist IP: 0.0.0.0/0
    echo   5. Get connection string
    echo   6. Update MONGODB_URI in .env
    echo.
    echo Or use local MongoDB:
    echo   MONGODB_URI=mongodb://localhost:27017/plantgenius-dev
    echo.
    echo Press any key when MongoDB is configured...
    pause >nul
)

echo.
echo 🎯 Starting backend server...
echo.
echo Available servers:
echo   1. server-enhanced.js (recommended - full features)
echo   2. server.js (basic features)
echo.
echo Starting server-enhanced.js...
echo.
echo ================================
echo.

REM Start the enhanced server
if exist server-enhanced.js (
    node server-enhanced.js
) else (
    echo ⚠️  server-enhanced.js not found, using server.js
    node server.js
)
