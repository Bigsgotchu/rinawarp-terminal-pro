const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function createArchive(output, files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputZip = fs.createWriteStream(output);

    outputZip.on('close', () => {
      console.log(`✅ Created ${output}, ${archive.pointer()} total bytes.`);
      resolve();
    });

    archive.on('warning', err => {
      if (err.code === 'ENOENT') {
        console.warn(`⚠️  Warning: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.on('error', err => {
      reject(err);
    });

    archive.pipe(outputZip);

    files.forEach(file => {
      if (fs.existsSync(file.path)) {
        archive.file(file.path, { name: file.name });
        console.log(`📦 Adding ${file.name} to archive`);
      } else {
        console.warn(`⚠️  File not found: ${file.path}`);
      }
    });

    archive.finalize();
  });
}

async function packageReleases() {
  console.log('🚀 Starting RinaWarp Terminal release packaging...');
  
  const baseDir = path.join(__dirname, '..');
  const publicDir = path.join(baseDir, 'public');
  
  // Define release files
  const releaseFiles = [
    { path: path.join(publicDir, 'RinaWarp-Terminal-Setup-Windows.exe'), name: 'RinaWarp-Terminal-Setup-Windows.exe' },
    { path: path.join(publicDir, 'RinaWarp-Terminal-Linux.tar.gz'), name: 'RinaWarp-Terminal-Linux.tar.gz' },
    { path: path.join(publicDir, 'RinaWarp-Terminal-macOS.dmg'), name: 'RinaWarp-Terminal-macOS.dmg' },
    { path: path.join(publicDir, 'RinaWarp-Terminal-Portable-Windows.exe'), name: 'RinaWarp-Terminal-Portable-Windows.exe' }
  ];
  
  try {
    // Create main release archive
    await createArchive(path.join(distDir, 'rinawarp-terminal-v1.0.7-all-platforms.zip'), releaseFiles);
    
    // Create platform-specific archives
    console.log('\n📦 Creating platform-specific archives...');
    
    // Windows package
    await createArchive(path.join(distDir, 'rinawarp-terminal-v1.0.7-windows.zip'), [
      { path: path.join(publicDir, 'RinaWarp-Terminal-Setup-Windows.exe'), name: 'RinaWarp-Terminal-Setup-Windows.exe' },
      { path: path.join(publicDir, 'RinaWarp-Terminal-Portable-Windows.exe'), name: 'RinaWarp-Terminal-Portable-Windows.exe' }
    ]);
    
    // Linux package
    await createArchive(path.join(distDir, 'rinawarp-terminal-v1.0.7-linux.zip'), [
      { path: path.join(publicDir, 'RinaWarp-Terminal-Linux.tar.gz'), name: 'RinaWarp-Terminal-Linux.tar.gz' }
    ]);
    
    // macOS package
    await createArchive(path.join(distDir, 'rinawarp-terminal-v1.0.7-macos.zip'), [
      { path: path.join(publicDir, 'RinaWarp-Terminal-macOS.dmg'), name: 'RinaWarp-Terminal-macOS.dmg' }
    ]);
    
    // Create checksums
    console.log('\n🔐 Generating checksums...');
    await generateChecksums(distDir);
    
    console.log('\n✅ Packaging complete!');
    console.log('📁 Release files available in:', distDir);
    
  } catch (error) {
    console.error('❌ Error during packaging:', error);
    process.exit(1);
  }
}

async function generateChecksums(distDir) {
  const crypto = require('crypto');
  const checksumFile = path.join(distDir, 'checksums.txt');
  
  const files = fs.readdirSync(distDir).filter(file => file.endsWith('.zip'));
  let checksums = 'RinaWarp Terminal v1.0.7 - Release Checksums\n';
  checksums += `Generated: ${new Date().toISOString()}\n\n`;
  
  for (const file of files) {
    const filePath = path.join(distDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    checksums += `${hex}  ${file}\n`;
    console.log(`🔐 ${file}: ${hex.substring(0, 8)}...`);
  }
  
  fs.writeFileSync(checksumFile, checksums);
  console.log(`✅ Checksums saved to ${checksumFile}`);
}

// Run the packaging
packageReleases();
