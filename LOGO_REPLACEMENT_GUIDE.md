# RinaWarp Terminal - Logo Replacement Guide

## Overview
This guide provides step-by-step instructions for replacing all logos and branding assets in the RinaWarp Terminal application.

## ✅ Backup Status
- **Current logos backed up to:** `backup-logos-20250814/assets/`
- **Backup date:** August 14, 2025

## Required Logo Files and Formats

### 1. Application Icons (Critical - Required for builds)
These files are referenced in `package.json` and are essential for app builds:

| Platform | File Path | Format | Sizes | Usage |
|----------|-----------|--------|-------|-------|
| macOS | `assets/icon.icns` | ICNS | Multiple sizes (16x16 to 1024x1024) | Mac app icon, DMG installer |
| Windows | `assets/icon.ico` | ICO | 16x16, 32x32, 48x48, 256x256 | Windows executable icon |
| Linux | `assets/rinawarp-icon-1024.png` | PNG | 1024x1024 | Linux AppImage, tar.gz |

### 2. Web Favicons
| File | Format | Size | Usage |
|------|--------|------|-------|
| `assets/favicon.svg` | SVG | Vector | Modern browsers, main favicon |
| `assets/ico/favicon.ico` | ICO | 16x16, 32x32 | Legacy browsers |

### 3. Application UI Logos
| File | Format | Usage | Referenced In |
|------|--------|-------|---------------|
| `assets/rinawarp-icon-final.png` | PNG | Main UI logo | `public/index.html` (line 62) |
| `assets/rinawarp-logo-primary.svg` | SVG | Primary full logo | Various UI components |
| `assets/rinawarp-monogram.svg` | SVG | Compact logo | Small UI spaces |

### 4. Social Media & Marketing
| File | Format | Size | Usage |
|------|--------|------|-------|
| `assets/rinawarp-icon-final-2x.png` | PNG | High-res | Open Graph, Twitter cards |
| `assets/rinawarp-icon-1024.png` | PNG | 1024x1024 | High-res marketing |
| `assets/rinawarp-icon-1024-hq.png` | PNG | 1024x1024 | Premium quality |

## Step-by-Step Replacement Process

### Phase 1: Prepare Your New Logos
1. **Create your new logo designs** in the following formats:
   - Source file (AI, PSD, or high-res PNG)
   - SVG version (scalable)
   - PNG versions in multiple sizes
   - ICO and ICNS versions

### Phase 2: Generate Required Formats
2. **Create platform-specific icons:**

   **For macOS (.icns):**
   ```bash
   # Use iconutil (macOS) or online converter
   # Create iconset folder with required sizes:
   # icon_16x16.png, icon_32x32.png, icon_128x128.png, 
   # icon_256x256.png, icon_512x512.png, icon_1024x1024.png
   # Plus @2x versions for retina
   iconutil -c icns icon.iconset
   ```

   **For Windows (.ico):**
   ```bash
   # Use online converter or ImageMagick
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```

   **For Web (favicon.svg):**
   - Optimize SVG for small sizes
   - Ensure readability at 16x16px

### Phase 3: Replace Files Systematically

3. **Replace core application icons:**
   ```bash
   # Replace the main app icons
   cp your-new-icon.icns assets/icon.icns
   cp your-new-icon.ico assets/icon.ico
   cp your-new-icon-1024.png assets/rinawarp-icon-1024.png
   ```

4. **Replace web favicons:**
   ```bash
   cp your-new-favicon.svg assets/favicon.svg
   cp your-new-favicon.ico assets/ico/favicon.ico
   ```

5. **Replace UI logos:**
   ```bash
   cp your-new-logo.png assets/rinawarp-icon-final.png
   cp your-new-logo.svg assets/rinawarp-logo-primary.svg
   cp your-new-monogram.svg assets/rinawarp-monogram.svg
   ```

6. **Replace marketing assets:**
   ```bash
   cp your-new-logo-2x.png assets/rinawarp-icon-final-2x.png
   cp your-new-logo-hq.png assets/rinawarp-icon-1024-hq.png
   ```

### Phase 4: Update References (if needed)

7. **Check if filename changes are needed:**
   - If you rename files, update references in:
     - `package.json` (lines 52, 68, 112)
     - `public/index.html` (line 62)
     - Any other HTML files that reference logos

8. **Update Open Graph images:**
   - Check `public/index.html` lines 14 and 23 for social media previews
   - Update if using different filenames

### Phase 5: Test and Build

9. **Test the changes:**
   ```bash
   # Start the application to verify UI logos
   npm start
   
   # Test electron app
   npm run start:electron
   
   # Check favicon in browser
   open http://localhost:8080
   ```

10. **Build and verify app icons:**
    ```bash
    # Test builds for each platform
    npm run build:mac      # Test macOS icon
    npm run build:windows  # Test Windows icon  
    npm run build:linux    # Test Linux icon
    ```

### Phase 6: Update Branding Documentation

11. **Update brand assets documentation:**
    - Edit `assets/README.md` with new logo descriptions
    - Update `BRAND_IDENTITY.md` if colors/style changed
    - Update any marketing materials referencing old logos

## File Size Recommendations

- **Favicon SVG**: < 2KB (keep it simple)
- **ICO files**: < 50KB total
- **ICNS files**: < 200KB total
- **PNG logos**: Balance quality vs. file size
  - UI logos: 10-50KB
  - High-res marketing: 100-500KB

## Quality Checklist

### ✅ Before Going Live:
- [ ] All platform icons display correctly in builds
- [ ] Favicon appears in browser tab
- [ ] UI logos are crisp at all sizes
- [ ] Social media previews show new logo
- [ ] No broken image references in console
- [ ] App launches successfully on all platforms
- [ ] Icons appear correctly in OS file managers

### ✅ Brand Consistency:
- [ ] All logo variations use consistent colors
- [ ] Monogram matches primary logo style  
- [ ] Icons work on both light and dark backgrounds
- [ ] Logo is readable at smallest sizes (16x16px)

## Rollback Instructions

If you need to revert to original logos:
```bash
# Restore from backup
cp -r backup-logos-20250814/assets/* assets/
```

## Common Issues & Solutions

**Issue**: Icon doesn't appear in built app
- **Solution**: Check file paths in `package.json`, ensure files exist

**Issue**: Favicon not updating in browser  
- **Solution**: Clear browser cache, hard refresh (Cmd+Shift+R)

**Issue**: Low quality at small sizes
- **Solution**: Create separate optimized versions for different sizes

**Issue**: Build fails after logo replacement
- **Solution**: Verify file formats and paths, check build logs

## Tools & Resources

### Recommended Icon Creation Tools:
- **macOS**: Icon Composer, iconutil
- **Cross-platform**: ImageMagick, GIMP
- **Online**: RealFaviconGenerator.net, ConvertICO.com
- **Professional**: Adobe Illustrator, Sketch

### Testing Resources:
- Favicon checker: https://realfavicongenerator.net/favicon_checker
- Open Graph preview: Facebook Debugger, Twitter Card Validator

---

**Important Notes:**
- Always backup before making changes
- Test builds on target platforms when possible  
- Consider trademark/copyright implications when changing branding
- Update marketing materials and documentation accordingly

**Need Help?**
- Check the `assets/README.md` for brand guidelines
- Review `BRAND_IDENTITY.md` for color specifications
- Test builds locally before deploying
