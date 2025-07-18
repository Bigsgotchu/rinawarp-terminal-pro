const { execSync } = require('child_process');
const fs = require('fs');

const CONFIG_MAP = {
  'next.config.js': { build: 'npm run build && next export', public: 'out' },
  'nuxt.config.ts': { build: 'npm run generate', public: 'dist' },
  'webpack.config.cjs': { build: 'npm run build', public: 'build' },
};

const detectedConfig = Object.keys(CONFIG_MAP).find(file => fs.existsSync(file));

if (!detectedConfig) {
  console.error('⚠️ No known config file found. Aborting.');
  process.exit(1);
}

const { build, public: publicDir } = CONFIG_MAP[detectedConfig];
console.log(`🛠️ Detected framework from ${detectedConfig}. Using public dir: ${publicDir}`);

console.log('📦 Building project...');
execSync(build, { stdio: 'inherit' });

const firebaseJson = {
  hosting: {
    public: publicDir,
    ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
    rewrites: [{ source: '**', destination: '/index.html' }],
  },
};

fs.writeFileSync('firebase.json', JSON.stringify(firebaseJson, null, 2));
console.log('✅ Updated firebase.json');

console.log('🚀 Deploying to Firebase Hosting...');
execSync('firebase deploy', { stdio: 'inherit' });
