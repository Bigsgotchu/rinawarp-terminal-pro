@echo off
echo Starting RinaWarp Terminal with graphics compatibility mode...
npx electron src/main.js --disable-gpu --disable-hardware-acceleration --disable-web-security --disable-features=VizDisplayCompositor --dev
pause

