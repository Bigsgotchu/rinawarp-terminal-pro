@echo off
echo Building RinaWarp Terminal Installer...
echo.

cd /d %~dp0

echo [1/4] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

echo.
echo [3/4] Building application...
npm run build-all
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build completed successfully!
echo.
echo Generated files:
if exist "dist\RinaWarp-Terminal-Setup-*.exe" (
    echo - NSIS Installer: dist\RinaWarp-Terminal-Setup-*.exe
)
if exist "dist\RinaWarp-Terminal-Portable-*.exe" (
    echo - Portable Version: dist\RinaWarp-Terminal-Portable-*.exe
)

echo.
echo Opening dist folder...
start explorer dist

echo.
echo Build process completed!
pause

