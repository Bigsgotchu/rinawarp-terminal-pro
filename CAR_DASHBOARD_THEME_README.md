# 🚗 Car Dashboard Theme for RinaWarp Terminal

Transform your terminal into a modern automotive dashboard with real-time gauges, an odometer, and car-inspired aesthetics!

## ✨ Features

### 🎛️ **Dashboard Gauges**
- **Speedometer** - Network activity/speed simulation (green)
- **RPM Gauge** - CPU usage monitoring (red) 
- **Fuel Gauge** - Disk space remaining (amber/yellow)
- **Temperature Gauge** - System temperature (blue)

### 🔢 **Digital Odometer**
- **Command Counter** - Tracks total commands executed
- **Session Uptime** - Shows current session duration
- **Persistent Storage** - Remembers your totals between sessions

### ⚠️ **Status Indicator Lights**
- **Engine Light** - System online indicator (always green)
- **Oil Pressure** - CPU warning indicator (amber when high)
- **Battery** - Memory status indicator (red when critical)
- **Signal** - Network activity indicator (blue when active)

### 🎨 **Automotive Design**
- Dark carbon fiber/leather inspired backgrounds
- Amber dashboard accent lighting (#ff6b35)
- Realistic gauge needles and arcs
- Car-style scrollbars and UI elements
- Animated warning lights when thresholds exceeded

## 🚀 Quick Start

### Option 1: Use the Activator Script
```bash
# Activate the car dashboard theme
node activate-car-theme.js

# Check status
node activate-car-theme.js status

# Deactivate
node activate-car-theme.js deactivate

# Show help
node activate-car-theme.js help
```

### Option 2: Direct Integration
```javascript
import { CarDashboardTheme } from './src/themes/car-dashboard-theme.js';

const carTheme = new CarDashboardTheme();
carTheme.apply();
```

### Option 3: Through Theme Manager
```javascript
import { getThemeManager } from './src/themes/unified-theme-manager.js';

const themeManager = getThemeManager();
themeManager.applyTheme('car-dashboard');
```

## 🎮 Interactive Demo

Open `demo-car-theme.html` in your browser to see the theme in action:

```bash
# Serve the demo file
python -m http.server 8000
# Then visit http://localhost:8000/demo-car-theme.html
```

**Demo Controls:**
- 🎮 **Simulate Command** - Add fake commands to test the odometer
- 🔄 **Reset Metrics** - Clear all counters and restart timers
- 🎨 **Toggle Theme** - Switch between car theme and default
- 📊 **Gauge Info** - Show detailed gauge information

## 📊 Gauge Details

### Speedometer (Network Speed)
- **Range:** 0-1000 Mbps
- **Warning:** >800 Mbps (amber border pulse)
- **Critical:** >950 Mbps (red border pulse)
- **Color:** Green (#00ff55)

### RPM Gauge (CPU Usage)
- **Range:** 0-100%
- **Warning:** >70% (amber border pulse)
- **Critical:** >90% (red border pulse)
- **Color:** Red (#ff3333)

### Fuel Gauge (Disk Space)
- **Range:** 0-100% remaining
- **Warning:** <20% remaining (amber border pulse)
- **Critical:** <5% remaining (red border pulse)
- **Color:** Amber (#ffaa00)

### Temperature Gauge (System Temp)
- **Range:** 0-100°C
- **Warning:** >75°C (amber border pulse)
- **Critical:** >85°C (red border pulse)
- **Color:** Blue (#3399ff)

## 🎛️ Customization

### Gauge Configuration
Each gauge can be customized in the theme definition:

```javascript
gauges: {
  speedometer: {
    label: 'Network Speed',
    unit: 'Mbps',
    max: 1000,
    color: '#00ff55',
    warningThreshold: 800,
    criticalThreshold: 950
  }
  // ... other gauges
}
```

### Color Scheme
Modify the automotive color palette:

```javascript
colors: {
  background: '#0a0a0a',        // Dark dashboard
  foreground: '#e0e0e0',        // White text
  cursor: '#ff6b35',            // Amber accent
  // ... terminal colors
}

ui: {
  headerBg: '#1a1a1a',          // Dashboard panel
  borderColor: '#ff6b35',       // Amber trim
  accentColor: '#ff6b35',       // Primary amber
  // ... car-specific colors
}
```

## 🔧 Advanced Features

### Real-time Metrics
The theme updates every 2 seconds with:
- Simulated network activity
- CPU usage estimation
- Disk space monitoring
- Temperature readings
- Command counting

### Click Interactions
- **Click any gauge** - Shows detailed information modal
- **Hover effects** - Gauges scale and glow on hover
- **Warning animations** - Pulsing borders when thresholds exceeded

### Persistent Data
Your driving statistics are saved between sessions:
- Total commands executed (odometer reading)
- Session-specific metrics
- Customization preferences

## 🛠️ Technical Implementation

### File Structure
```
src/themes/
├── car-dashboard-theme.js      # Main theme class
├── unified-theme-manager.js    # Theme integration
styles/themes/
├── theme-collection.css        # CSS variables
scripts/
├── activate-car-theme.js       # Activation script
demo/
├── demo-car-theme.html         # Interactive demo
```

### Dependencies
- Modern JavaScript (ES6+)
- CSS3 custom properties
- DOM manipulation APIs
- Local storage for persistence

### Browser Compatibility
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern terminal applications with web views

## 🎨 Design Philosophy

The Car Dashboard Theme brings the excitement and functionality of modern automotive interfaces to your terminal experience:

- **Familiarity** - Uses recognizable car dashboard elements
- **Functionality** - Each gauge serves a real monitoring purpose  
- **Aesthetics** - Premium automotive materials and lighting
- **Interactivity** - Engaging hover effects and click interactions
- **Persistence** - Your "driving record" builds over time

## 🚙 Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Amber | `#ff6b35` | Primary accent, borders, cursor |
| Green | `#00ff55` | Speedometer, OK status, success |
| Red | `#ff3333` | RPM gauge, warnings, errors |
| Yellow | `#ffaa00` | Fuel gauge, caution status |
| Blue | `#3399ff` | Temperature gauge, info status |
| Dark | `#0a0a0a` | Background, carbon fiber effect |
| Light | `#e0e0e0` | Primary text, gauge values |

## 🏁 Getting Started

1. **Install the theme files** in your RinaWarp terminal project
2. **Run the activator**: `node activate-car-theme.js`
3. **Watch your dashboard come alive** with real-time metrics
4. **Click gauges** to explore detailed information
5. **Build up your odometer** as you use the terminal

## 🤝 Contributing

Want to add more automotive features?

- **New gauge types** (oil pressure, boost pressure, etc.)
- **More status lights** (ABS, traction control, etc.)
- **Sound effects** (engine sounds, turn signals)
- **Additional themes** (racing, luxury, truck dashboard)

## 📝 License

Copyright (c) 2025 Rinawarp Technologies, LLC

---

**Ready to transform your terminal into a high-tech automotive dashboard? Start your engines! 🏁**
