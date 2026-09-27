@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================
echo   QQ Bot Launcher  (qq-deepseek-bot)
echo ================================================
echo Starting bot... keep this window open.
echo.

node --env-file-if-exists=.env index.js

echo.
echo ================================================
echo   Bot stopped.
echo   If there is an error above, copy the text and send it.
echo ================================================
pause
