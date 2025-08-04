# RinaWarp Terminal Brand Guide

## Logo Usage

### Primary Logo
- **File**: `assets/logo-designs/rinawarp-icon-final.svg`
- **Usage**: App icon, main branding, marketing materials
- **Minimum size**: 32x32px

### Logo Variants
1. **Dark Mode**: `rinawarp-icon-dark.svg` - For dark backgrounds
2. **Monochrome**: `rinawarp-icon-mono.svg` - For single-color printing
3. **Banner**: `rinawarp-banner.svg` - For headers and wide layouts

## Color Palette

### Primary Colors
```css
/* Hot Pink */
--color-primary: #EC4899;

/* Pink */
--color-secondary: #F472B6;

/* Coral */
--color-accent: #FB7185;

/* Teal */
--color-success: #14B8A6;

/* Cyan */
--color-info: #06B6D4;
```

### Background Colors
```css
/* Dark Background */
--bg-dark: #0F172A;

/* Medium Dark */
--bg-medium: #1E293B;

/* Light (for contrast) */
--bg-light: #E0E7FF;
```

### Gradient
```css
background: linear-gradient(135deg, #EC4899 0%, #F472B6 25%, #FB7185 50%, #14B8A6 75%, #06B6D4 100%);
```

## Typography

### Headings
- **Font**: SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif
- **Weight**: 700 (Bold)
- **Usage**: Product name, headlines

### Code/Terminal
- **Font**: SF Mono, Monaco, Consolas, monospace
- **Weight**: 400 (Regular)
- **Usage**: Terminal content, code snippets

### Body Text
- **Font**: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- **Weight**: 400 (Regular), 500 (Medium)
- **Usage**: Documentation, UI text

## Logo Clear Space
Maintain a clear space around the logo equal to the height of the hexagon's stroke width.

## Do's and Don'ts

### DO ✅
- Use the logo on dark backgrounds for best visibility
- Maintain aspect ratio when scaling
- Use provided color variations
- Apply subtle shadows/glows for depth

### DON'T ❌
- Stretch or distort the logo
- Change the gradient colors
- Place logo on busy backgrounds
- Use less than 32x32px size

## Application Examples

### App Icon
- Use the full logo with gradient background
- Ensure proper padding for platform requirements

### Documentation
- Use monochrome variant for better readability
- Banner variant for headers

### Marketing
- Primary logo with full colors and effects
- Dark mode variant for presentations

## File Formats
- **SVG**: Preferred for all digital uses (scalable)
- **PNG**: For raster requirements (include @2x and @3x)
- **ICO/ICNS**: Platform-specific app icons
