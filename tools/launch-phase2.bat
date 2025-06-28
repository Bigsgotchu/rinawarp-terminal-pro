@echo off
echo ========================================
echo   RinaWarp Terminal - Phase 2 Launcher
echo   Next-Generation UI Integration
echo ========================================
echo.

:: Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if we're in the correct directory
if not exist "src\renderer\phase2-ui-manager.js" (
    echo ERROR: Phase 2 files not found
    echo Please run this script from the RinaWarp Terminal root directory
    pause
    exit /b 1
)

echo [1/5] Checking dependencies...
:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [2/5] Validating Phase 2 components...
:: Validate critical files exist
set "required_files=src\renderer\phase2-ui-manager.js src\renderer\phase2-integration.js styles\phase2-ui.css"
for %%f in (%required_files%) do (
    if not exist "%%f" (
        echo ERROR: Missing required file: %%f
        pause
        exit /b 1
    )
)

echo [3/5] Preparing Phase 2 environment...
:: Create backup of current configuration
if exist "phase2-backup" rmdir /s /q "phase2-backup"
mkdir "phase2-backup"
xcopy "src\renderer\index.html" "phase2-backup\" /Y >nul 2>&1

echo [4/5] Integrating Phase 2 UI...
:: Phase 2 integration is already configured in index.html

echo [5/5] Launching RinaWarp Terminal with Phase 2...
echo.
echo ========================================
echo   Phase 2 Integration Status: READY
echo ========================================
echo.
echo Starting RinaWarp Terminal...
echo Phase 2 features will activate automatically
echo.
echo Features included in Phase 2:
echo + Adaptive next-generation UI
echo + Enhanced accessibility features
echo + Advanced multimodal interactions
echo + Real-time collaboration support
echo + Intelligent context assistance
echo + Performance optimization system
echo.

:: Start the application
if exist "RinaWarp-Terminal-BETA-Portable.exe" (
    echo Launching portable version...
    start "" "RinaWarp-Terminal-BETA-Portable.exe"
) else if exist "npm" (
    echo Launching development version...
    npm start
) else (
    echo ERROR: No executable found
    echo Please build the application first or download the portable version
    pause
    exit /b 1
)

echo.
echo Phase 2 launched successfully!
echo.
echo Quick Phase 2 shortcuts:
echo - F1: Help system
echo - Ctrl+?: AI Assistant
echo - Ctrl+Shift+P: Quick action palette
echo - Alt+1-4: Switch UI modes
echo.
echo Enjoy your next-generation terminal experience!
pause

