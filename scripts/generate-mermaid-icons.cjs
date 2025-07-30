/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('child_process');
const { promisify } = require('node:util');

const execAsync = promisify(exec);

// Icon sizes needed for various purposes
const ICON_SIZES = {
  // Standard app icon sizes
  '16': 'Small icons, system tray',
  '32': 'Dock/taskbar at standard DPI',
  '48': 'Windows taskbar',
  '64': 'macOS dock',
  '128': 'Standard app icon',
  '256': 'Large app icon',
  '512': 'Extra large icon, Linux',
  '1024': 'App store submission',
  
  // Web and social media sizes
  '180': 'Apple touch icon',
  '192': 'Android Chrome icon',
  '196': 'Chrome Web Store icon',
  '512': 'PWA icon',
  
  // Favicon sizes
  '16': 'Favicon',
  '32': 'Favicon high DPI',
  '96': 'Google TV favicon',
  
  // Social media
  '200': 'Facebook profile picture minimum',
  '400': 'Twitter profile picture',
  '800': 'Instagram profile picture'
};

async function generateIcons() {
  const svgPath = path.join(__dirname, '..', 'assets', 'rinawarp-mermaid-logo.svg');
  const outputDir = path.join(__dirname, '..', 'assets', 'mermaid-icons');
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create subdirectories
  const subdirs = ['app', 'web', 'social', 'favicon'];
  for (const subdir of subdirs) {
    const dir = path.join(outputDir, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  console.log('🧜‍♀️ Generating RinaWarp Mermaid icons...\n');
  
  // Check if we have ImageMagick or rsvg-convert
  let converterCmd = '';
  try {
    await execAsync('which convert');
    converterCmd = 'convert';
    console.log('✅ Using ImageMagick for conversion');
  } catch {
    try {
      await execAsync('which rsvg-convert');
      converterCmd = 'rsvg-convert';
      console.log('✅ Using rsvg-convert for conversion');
    } catch {
      console.log('⚠️  No image converter found. Attempting with built-in method...');
    }
  }
  
  // Generate icons
  const sizes = [16, 32, 48, 64, 96, 128, 180, 192, 196, 200, 256, 400, 512, 800, 1024];
  
  for (const size of sizes) {
    const outputPath = getOutputPath(outputDir, size);
    
    try {
      if (converterCmd === 'convert') {
        // ImageMagick command
        await execAsync(`convert -background none -resize ${size}x${size} "${svgPath}" "${outputPath}"`);
      } else if (converterCmd === 'rsvg-convert') {
        // rsvg-convert command
        await execAsync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outputPath}"`);
      } else {
        // Fallback: create a simple placeholder
        createPlaceholder(outputPath, size);
      }
      
      console.log(`✅ Generated ${size}x${size} → ${path.relative(process.cwd(), outputPath)}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}: ${error.message}`);
    }
  }
  
  // Generate special files
  await generateSpecialFiles(outputDir, svgPath, converterCmd);
  
  console.log('\n✨ Icon generation complete!');
  console.log(`📁 Icons saved to: ${path.relative(process.cwd(), outputDir)}`);
}

function getOutputPath(baseDir, size) {
  let subdir = 'app';
  let filename = `rinawarp-mermaid-${size}.png`;
  
  if (size <= 96 && [16, 32, 96].includes(size)) {
    subdir = 'favicon';
    filename = `favicon-${size}.png`;
  } else if ([180, 192, 196, 512].includes(size) && size !== 512) {
    subdir = 'web';
  } else if ([200, 400, 800].includes(size)) {
    subdir = 'social';
  }
  
  return path.join(baseDir, subdir, filename);
}

async function generateSpecialFiles(outputDir, svgPath, converterCmd) {
  console.log('\n🎨 Generating special files...');
  
  // Copy SVG to output
  const svgDest = path.join(outputDir, 'rinawarp-mermaid.svg');
  fs.copyFileSync(svgPath, svgDest);
  console.log('✅ Copied original SVG');
  
  // Generate ICO file (Windows)
  const icoPath = path.join(outputDir, 'favicon', 'favicon.ico');
  try {
    if (converterCmd === 'convert') {
      // Generate multi-resolution ICO
      const sizes = [16, 32, 48];
      const inputs = sizes.map(s => path.join(outputDir, 'favicon', `favicon-${s}.png`)).join(' ');
      await execAsync(`convert ${inputs} ${icoPath}`);
      console.log('✅ Generated favicon.ico');
    }
  } catch (error) {
    console.log('⚠️  Could not generate ICO file');
  }
  
  // Create a manifest.json for PWA
  const manifest = {
    name: 'RinaWarp Terminal',
    short_name: 'RinaWarp',
    description: 'Advanced Terminal with AI Integration',
    icons: [
      { src: 'web/rinawarp-mermaid-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'web/rinawarp-mermaid-512.png', sizes: '512x512', type: 'image/png' }
    ],
    theme_color: '#FF1493',
    background_color: '#00CED1'
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'web', 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ Generated web manifest');
  
  // Create README
  const readme = `# RinaWarp Mermaid Icons

This directory contains the RinaWarp Terminal mermaid icon in various sizes and formats.

## Directory Structure

- **app/** - Application icons for desktop apps
- **web/** - Web icons for PWA, touch icons, etc.
- **social/** - Social media profile pictures
- **favicon/** - Favicon files for websites

## Icon Sizes

### Application Icons
- 16x16 - Small icons, system tray
- 32x32 - Dock/taskbar at standard DPI
- 48x48 - Windows taskbar
- 64x64 - macOS dock
- 128x128 - Standard app icon
- 256x256 - Large app icon
- 512x512 - Extra large icon, Linux
- 1024x1024 - App store submission

### Web Icons
- 180x180 - Apple touch icon
- 192x192 - Android Chrome icon
- 196x196 - Chrome Web Store icon
- 512x512 - PWA icon

### Favicon Sizes
- 16x16 - Standard favicon
- 32x32 - High DPI favicon
- 96x96 - Google TV favicon
- favicon.ico - Multi-resolution ICO file

### Social Media
- 200x200 - Facebook profile picture minimum
- 400x400 - Twitter profile picture
- 800x800 - Instagram profile picture

## Colors
- Primary (Hair): #FF1493 (Deep Pink)
- Secondary (Tail): #00CED1 (Dark Turquoise)
- Accent: #FF69B4 (Hot Pink)

## Usage

### HTML Favicon
\`\`\`html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/rinawarp-mermaid-180.png">
\`\`\`

### PWA Manifest
\`\`\`html
<link rel="manifest" href="/web/manifest.json">
\`\`\`
`;
  
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
  console.log('✅ Generated README');
}

function createPlaceholder(outputPath, size) {
  // This is a fallback - in reality, you'd need a proper image library
  console.log(`⚠️  Created placeholder for ${size}x${size} (install ImageMagick or rsvg-convert for actual conversion)`);
  // Create directories if needed
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Touch file
  fs.writeFileSync(outputPath, '');
}

// Run the script
generateIcons().catch(console.error);
