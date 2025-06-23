@echo off
echo.
echo ==========================================
echo  RinaWarp Terminal - Enhanced UI Launch
echo ==========================================
echo.
echo Starting RinaWarp Terminal with Enhanced Beginner-Friendly UI...
echo.

REM Set environment variable to enable enhanced features
set RINAWARP_ENHANCED_UI=true
set RINAWARP_DEBUG=true

REM Launch the application
if exist "RinaWarp-Terminal-BETA-Portable.exe" (
    echo Launching portable version...
    start "RinaWarp Terminal Enhanced" "RinaWarp-Terminal-BETA-Portable.exe"
) else if exist "RinaWarp-Terminal-BETA-Setup.exe" (
    echo Setup file found. Please install first.
    pause
) else (
    echo Error: RinaWarp Terminal executable not found!
    echo Please ensure you're running this from the correct directory.
    pause
)

echo.
echo Enhanced UI Features Available:
echo  * 🎯 Guided Mode - Step-by-step assistance
echo  * 🎨 Visual Mode - Drag-and-drop command builder  
echo  * ⌨️ Enhanced Terminal - Smart traditional mode
echo  * 🚀 Expert Mode - Advanced power-user features
echo.
echo Press F1 for help or Ctrl+? for the AI assistant!
echo.
pause

