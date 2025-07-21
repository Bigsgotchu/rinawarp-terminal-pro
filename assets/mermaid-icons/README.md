# RinaWarp Mermaid Icons

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
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/rinawarp-mermaid-180.png">
```

### PWA Manifest
```html
<link rel="manifest" href="/web/manifest.json">
```
