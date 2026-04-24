@echo off
setlocal
cd /d "%~dp0\.."
echo ==^> Hearth OS: lint + build (from %CD%)
call npm run lint
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
echo ==^> OK. Full stack tests: start API (3001) + WunderGraph router (4000), then: npm test
exit /b 0
