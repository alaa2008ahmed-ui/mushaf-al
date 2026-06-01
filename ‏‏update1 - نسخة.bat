@echo off
:: دعم اللغة العربية في الكوماند بروومبت
chcp 65001 >nul
title Mushaf Fast Deployer
echo ==========================================
echo       REPAIRING AND DEPLOYING MUSHAF
echo ==========================================

:: --- هنا السؤال السحري ---
echo.
set /p DEPLOY_NAME="اكتب الاسم اللي عاوزه يظهر في صفحة جيت هاب (ثم اضغط Enter): "
echo.

echo [1/8] Initializing Git (if needed)...
git rev-parse --is-inside-work-tree >nul 2>&1
if %ERRORLEVEL% neq 0 (
    git init
    git branch -M main
)
echo Git is ready.

echo [2/8] Installing Core Capacitor Android...
call npm install @capacitor/core @capacitor/android @capacitor/cli
if %ERRORLEVEL% neq 0 goto :error

echo [3/8] Installing Geolocation...
call npm install @capacitor/geolocation
if %ERRORLEVEL% neq 0 goto :error

echo [4/8] Building web project...
call npm run build
if %ERRORLEVEL% neq 0 goto :error

echo [5/8] Updating Android Platform...
call npx cap sync android
if %ERRORLEVEL% neq 0 goto :error

echo [6/8] Setting up Git Remote...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/alaa2008ahmed-ui/mushaf-al.git

echo [7/8] Committing with your name (FORCED)...
git add .
git commit --allow-empty -m "%DEPLOY_NAME%"

echo [8/8] Pushing to GitHub...
git push -u origin main --force
if %ERRORLEVEL% neq 0 goto :error

echo ==========================================
echo      SUCCESS! %DEPLOY_NAME% is LIVE
echo ==========================================
timeout /t 5
exit

:error
echo.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
echo      ERROR DETECTED! Process Stopped.
echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
pause
exit
