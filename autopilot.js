const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const WATCH_DIR = __dirname; // Watch current directory
const FILE_EXTENSIONS = ['.ts', '.js', '.py', '.sh']; // Support multiple file types

// --- KILO CODE AUTOFIX ---
function applyKiloFix(filePath) {
  console.log(`[Kilo] Fixing: ${filePath}`);
  exec(`kilo apply --file "${filePath}" --auto-save`, (err, stdout, stderr) => {
    if (err) return console.error(`[Kilo ERROR] ${err}`);
    if (stderr) console.error(`[Kilo STDERR] ${stderr}`);
    console.log(`[Kilo SUCCESS] ${stdout}`);
    runBuildAndTest();
  });
}

// --- BUILD & TEST ---
function runBuildAndTest() {
  console.log('[Autopilot] Building project...');
  exec('tsc', (err, stdout, stderr) => {
    if (err) return console.error(`[BUILD ERROR] ${err}`);
    if (stderr) console.error(`[BUILD STDERR] ${stderr}`);
    console.log('[Autopilot] Build successful');
    runTests();
  });
}

// --- TESTS ---
function runTests() {
  console.log('[Autopilot] Running tests...');
  exec('npm test', (err, stdout, stderr) => {
    if (err) return console.error(`[TEST ERROR] ${err}`);
    if (stderr) console.error(`[TEST STDERR] ${stderr}`);
    console.log('[Autopilot] Tests passed');
    deploy();
  });
}

// --- DEPLOY ---
function deploy() {
  console.log('[Autopilot] Deploying...');
  exec('vercel --prod', (err, stdout, stderr) => {
    if (err) return console.error(`[DEPLOY ERROR] ${err}`);
    if (stderr) console.error(`[DEPLOY STDERR] ${stderr}`);
    console.log('[Autopilot] Deployed successfully');
  });
}

// --- WATCHER ---
function watchDir(dir) {
  fs.readdir(dir, { withFileTypes: true }, (err, files) => {
    if (err) return console.error(err);

    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) watchDir(fullPath);
      else if (FILE_EXTENSIONS.includes(path.extname(file.name))) {
        fs.watchFile(fullPath, { interval: 500 }, (curr, prev) => {
          if (curr.mtime !== prev.mtime) applyKiloFix(fullPath);
        });
      }
    });
  });
}

console.log(`[Autopilot] Watching ${WATCH_DIR} for changes...`);
watchDir(WATCH_DIR);