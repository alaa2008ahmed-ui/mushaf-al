@echo off
echo [1/3] Syncing Capacitor...
call npx cap sync android
echo [2/3] Adding changes to Git...
git add .
git commit -m "Update from One-Click Script"
echo [3/3] Pushing to GitHub...
git push origin main
echo DONE! Now check GitHub Actions.
pause