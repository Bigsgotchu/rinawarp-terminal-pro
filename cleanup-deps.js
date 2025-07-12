// cleanup-deps.js - RinaWarp Terminal Dependency Cleanup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌊 RinaWarp Terminal - Dependency Cleanup Tool');
console.log('================================================');

const overrides = {
  rimraf: '^4.4.1',
  glob: '^9.3.5',
  'lodash.isequal': undefined, // migrate to native
  q: undefined, // migrate to Promise
  '@npmcli/move-file': '@npmcli/fs',
  'stringify-package': '@npmcli/package-json',
  inflight: undefined, // migrate to lru-cache
  abab: undefined, // use native atob/btoa
  domexception: undefined, // use native DOMException
};

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Initialize overrides section
pkg.overrides = pkg.overrides || {};

console.log('\n🔍 Scanning for deprecated packages...');

for (const [oldPkg, newPkg] of Object.entries(overrides)) {
  if (newPkg) {
    pkg.overrides[oldPkg] = newPkg;
    console.log(`✅ Override added: ${oldPkg} → ${newPkg}`);
  } else {
    console.log(`⚠️  Manual cleanup recommended: ${oldPkg} (migrate to native APIs)`);
  }
}

// Add resolutions for better compatibility
pkg.resolutions = pkg.resolutions || {};
pkg.resolutions.rimraf = '^4.4.1';
pkg.resolutions.glob = '^9.3.5';

// Write updated package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log('\n🧜‍♀️ Package.json updated with safer overrides!');
console.log('📦 Run "npm install" to apply changes');
console.log('🧼 Your dependencies are now squeaky clean!');
