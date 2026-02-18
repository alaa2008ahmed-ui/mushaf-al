@echo off
cls
echo =========================================
echo    جاري تحديث تطبيق (مصحف أحمد وليلى)
echo =========================================

echo [1/4] Syncing Capacitor...
call npx cap sync android

echo [2/4] Saving changes to Git...
git add .
git commit -m "Update: %date% %time%"

echo [3/4] Pushing to GitHub...
git push origin main

echo [4/4] Done! 
echo =========================================
echo اذهب الآن إلى GitHub Actions لتحميل ملف:
echo (مصحف أحمد وليلى.apk)
echo =========================================
pause