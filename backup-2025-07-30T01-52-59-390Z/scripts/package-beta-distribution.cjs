#!/usr/bin/env node

/**
 * RinaWarp Terminal - Beta Distribution Packaging Script
 * This script packages the beta builds for distribution to testers
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

async function packageBetaDistribution() {
  console.log('📦 Packaging RinaWarp Terminal Beta for Distribution...\n');

  try {
    const distDir = path.join(process.cwd(), 'dist');
    const betaDistDir = path.join(process.cwd(), 'beta-distribution');

    // Create distribution directory
    await fs.mkdir(betaDistDir, { recursive: true });

    // Package macOS build
    if (await fileExists(path.join(distDir, 'mac'))) {
      await packageMacOS(distDir, betaDistDir);
    }

    // Package Windows build
    if (await fileExists(path.join(distDir, 'win-unpacked'))) {
      await packageWindows(distDir, betaDistDir);
    }

    // Package Linux build
    if (await fileExists(path.join(distDir, 'linux-unpacked'))) {
      await packageLinux(distDir, betaDistDir);
    }

    // Copy beta documentation
    await copyBetaDocumentation(betaDistDir);

    // Generate checksums
    await generateChecksums(betaDistDir);

    // Create distribution readme
    await createDistributionReadme(betaDistDir);

    console.log('\n✨ Beta distribution packaging complete!');
    console.log(`📁 Distribution packages available in: ${betaDistDir}`);
    console.log('\nNext steps:');
    console.log('1. Upload packages to your distribution platform');
    console.log('2. Share download links with beta testers');
    console.log('3. Monitor feedback channels');
  } catch (error) {
    console.error('❌ Error packaging beta distribution:', error.message);
    process.exit(1);
  }
}

async function packageMacOS(distDir, betaDistDir) {
  console.log('🍎 Packaging macOS build...');

  const macDir = path.join(distDir, 'mac');
  const appPath = path.join(macDir, 'RinaWarp Terminal Beta.app');
  const dmgPath = path.join(betaDistDir, 'RinaWarp-Terminal-Beta-macOS.dmg');

  if (await fileExists(appPath)) {
    // Create DMG
    try {
      execSync(
        `hdiutil create -volname "RinaWarp Terminal Beta" -srcfolder "${appPath}" -ov -format UDZO "${dmgPath}"`,
        {
          stdio: 'inherit',
        }
      );
      console.log('✅ macOS DMG created');
    } catch (error) {
      console.warn('⚠️  Could not create DMG, creating ZIP instead');
      // Fallback to ZIP
      const zipPath = path.join(betaDistDir, 'RinaWarp-Terminal-Beta-macOS.zip');
      execSync(`cd "${macDir}" && zip -r "${zipPath}" "RinaWarp Terminal Beta.app"`, {
        stdio: 'inherit',
      });
      console.log('✅ macOS ZIP created');
    }
  }
}

async function packageWindows(distDir, betaDistDir) {
  console.log('🪟 Packaging Windows build...');

  const winDir = path.join(distDir, 'win-unpacked');
  const zipPath = path.join(betaDistDir, 'RinaWarp-Terminal-Beta-Windows.zip');

  if (await fileExists(winDir)) {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" win-unpacked`, {
      stdio: 'inherit',
    });
    console.log('✅ Windows ZIP created');
  }
}

async function packageLinux(distDir, betaDistDir) {
  console.log('🐧 Packaging Linux build...');

  const linuxDir = path.join(distDir, 'linux-unpacked');
  const tarPath = path.join(betaDistDir, 'RinaWarp-Terminal-Beta-Linux.tar.gz');

  if (await fileExists(linuxDir)) {
    execSync(`cd "${distDir}" && tar -czf "${tarPath}" linux-unpacked`, {
      stdio: 'inherit',
    });
    console.log('✅ Linux tar.gz created');
  }

  // Check for AppImage
  const appImageFiles = await findAppImages(distDir);
  for (const appImage of appImageFiles) {
    const destPath = path.join(
      betaDistDir,
      path.basename(appImage).replace('RinaWarp', 'RinaWarp-Beta')
    );
    await fs.copyFile(appImage, destPath);
    console.log('✅ Linux AppImage copied');
  }
}

async function copyBetaDocumentation(betaDistDir) {
  console.log('📄 Copying beta documentation...');

  const betaReleaseDir = path.join(process.cwd(), 'beta-release');
  const docsToInclude = [
    'BETA_TESTING_GUIDE.md',
    'KNOWN_ISSUES.md',
    'RELEASE_NOTES.md',
    'FEEDBACK_TEMPLATE.md',
  ];

  for (const doc of docsToInclude) {
    const sourcePath = path.join(betaReleaseDir, doc);
    const destPath = path.join(betaDistDir, doc);

    if (await fileExists(sourcePath)) {
      await fs.copyFile(sourcePath, destPath);
    }
  }

  console.log('✅ Documentation copied');
}

async function generateChecksums(betaDistDir) {
  console.log('🔐 Generating checksums...');

  const files = await fs.readdir(betaDistDir);
  const checksums = {};

  for (const file of files) {
    if (
      file.endsWith('.dmg') ||
      file.endsWith('.zip') ||
      file.endsWith('.tar.gz') ||
      file.endsWith('.AppImage')
    ) {
      const filePath = path.join(betaDistDir, file);
      const checksum = await calculateChecksum(filePath);
      checksums[file] = checksum;
    }
  }

  const checksumContent = Object.entries(checksums)
    .map(([file, hash]) => `${hash}  ${file}`)
    .join('\n');

  await fs.writeFile(path.join(betaDistDir, 'checksums.txt'), checksumContent + '\n');

  console.log('✅ Checksums generated');
}

async function calculateChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = require('fs').createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function createDistributionReadme(betaDistDir) {
  const readme = `# RinaWarp Terminal Beta Distribution

## Version: 1.0.19-beta.1

### Download Instructions

1. Choose the appropriate package for your operating system
2. Verify the checksum (see checksums.txt)
3. Follow the installation guide in BETA_TESTING_GUIDE.md

### Available Packages

- **macOS**: RinaWarp-Terminal-Beta-macOS.dmg (or .zip)
- **Windows**: RinaWarp-Terminal-Beta-Windows.zip
- **Linux**: RinaWarp-Terminal-Beta-Linux.tar.gz or .AppImage

### Important Links

- Beta Testing Guide: BETA_TESTING_GUIDE.md
- Known Issues: KNOWN_ISSUES.md
- Release Notes: RELEASE_NOTES.md
- Feedback Template: FEEDBACK_TEMPLATE.md

### Support

- Email: beta@rinawarp.com
- Discord: discord.gg/rinawarp

### Security

Always verify checksums before installing. The checksums.txt file contains SHA-256 hashes for all distribution packages.

Thank you for participating in our beta program!
`;

  await fs.writeFile(path.join(betaDistDir, 'README.md'), readme);
  console.log('✅ Distribution README created');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findAppImages(distDir) {
  const files = await fs.readdir(distDir);
  return files.filter(file => file.endsWith('.AppImage')).map(file => path.join(distDir, file));
}

// Run the script
packageBetaDistribution().catch(console.error);
