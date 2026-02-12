const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['smoke:prod'] = 'bash scripts/smoke-prod.sh https://www.rinawarptech.com';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Added smoke:prod script');
