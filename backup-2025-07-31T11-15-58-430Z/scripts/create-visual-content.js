#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced Visual Content Generator for RinaWarp Terminal
 * Creates animations, status indicators, and performance dashboards
 */

class VisualContentGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../marketing/visual-assets');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateTerminalStatusAnimation() {
    console.log('🚦 Generating Terminal Status Animation...');

    const frames = [
      {
        status: 'missing',
        color: '#ff4444',
        symbol: '❌',
        message: 'STRIPE_SECRET_KEY - Missing',
        progress: 0,
      },
      {
        status: 'checking',
        color: '#ff8800',
        symbol: '🔄',
        message: 'STRIPE_SECRET_KEY - Validating...',
        progress: 33,
      },
      {
        status: 'syncing',
        color: '#ffaa00',
        symbol: '⚡',
        message: 'STRIPE_SECRET_KEY - Syncing...',
        progress: 66,
      },
      {
        status: 'synced',
        color: '#00ff44',
        symbol: '✅',
        message: 'STRIPE_SECRET_KEY - Fully Synced',
        progress: 100,
      },
    ];

    const htmlContent = this.createAnimatedStatusHTML(frames);
    fs.writeFileSync(path.join(this.outputDir, 'terminal-status-animation.html'), htmlContent);

    // Create CSS animation file
    const cssContent = this.createStatusAnimationCSS();
    fs.writeFileSync(path.join(this.outputDir, 'status-animation.css'), cssContent);

    console.log('✅ Terminal status animation created');
    return frames;
  }

  createAnimatedStatusHTML(frames) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Status Animation</title>
    <link rel="stylesheet" href="status-animation.css">
</head>
<body>
    <div class="terminal-container">
        <div class="terminal-header">
            <div class="terminal-buttons">
                <span class="close"></span>
                <span class="minimize"></span>
                <span class="maximize"></span>
            </div>
            <div class="terminal-title">RinaWarp Terminal - Secret Sync</div>
        </div>
        <div class="terminal-body">
            <div class="command-line">
                <span class="prompt">$ </span>
                <span class="command">npm run sync:platform:full</span>
            </div>
            <div class="status-container">
                ${frames
    .map(
      (frame, index) => `
                <div class="status-line" data-frame="${index}">
                    <span class="status-symbol">${frame.symbol}</span>
                    <span class="status-message">${frame.message}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${frame.progress}%; background-color: ${frame.color};"></div>
                    </div>
                </div>
                `
    )
    .join('')}
            </div>
            <div class="final-message">
                <div class="success-banner">
                    🎉 All secrets synchronized across platforms!
                </div>
                <div class="time-saved">
                    ⏱️ Time saved this deployment: <span class="highlight">2.3 hours</span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let currentFrame = 0;
        const frames = document.querySelectorAll('.status-line');
        const totalFrames = frames.length;
        
        function animateStatus() {
            frames.forEach((frame, index) => {
                frame.style.display = index <= currentFrame ? 'flex' : 'none';
            });
            
            currentFrame++;
            if (currentFrame < totalFrames) {
                setTimeout(animateStatus, 1500);
            } else {
                setTimeout(() => {
                    document.querySelector('.final-message').style.display = 'block';
                }, 500);
            }
        }
        
        // Start animation after page load
        setTimeout(animateStatus, 1000);
        
        // Restart animation every 10 seconds
        setInterval(() => {
            currentFrame = 0;
            document.querySelector('.final-message').style.display = 'none';
            setTimeout(animateStatus, 1000);
        }, 10000);
    </script>
</body>
</html>`;
  }

  createStatusAnimationCSS() {
    return `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.terminal-container {
    width: 700px;
    background: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
}

.terminal-header {
    background: #333;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #444;
}

.terminal-buttons {
    display: flex;
    gap: 8px;
}

.terminal-buttons span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.close { background: #ff5f57; }
.minimize { background: #ffbd2e; }
.maximize { background: #28ca42; }

.terminal-title {
    flex: 1;
    text-align: center;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
}

.terminal-body {
    padding: 20px;
    background: #1e1e1e;
    min-height: 300px;
}

.command-line {
    color: #00ff41;
    margin-bottom: 20px;
    font-size: 14px;
}

.prompt {
    color: #667eea;
    font-weight: bold;
}

.command {
    color: #00ff41;
}

.status-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.status-line {
    display: none;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    animation: slideIn 0.5s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.status-symbol {
    font-size: 18px;
    min-width: 24px;
}

.status-message {
    color: #fff;
    font-size: 14px;
    flex: 1;
}

.progress-bar {
    width: 200px;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    transition: width 0.8s ease-out;
    animation: glow 2s infinite alternate;
}

@keyframes glow {
    from { box-shadow: 0 0 5px currentColor; }
    to { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
}

.final-message {
    display: none;
    margin-top: 20px;
    padding: 15px;
    border-radius: 6px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.success-banner {
    color: white;
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 8px;
}

.time-saved {
    color: #e0e0e0;
    font-size: 14px;
}

.highlight {
    color: #00ff41;
    font-weight: bold;
}`;
  }

  generateTimeSavingsBreakdown() {
    console.log('🕘 Generating Time Savings Breakdown...');

    const timeData = {
      before: {
        tasks: [
          { name: 'Manual secret sync', time: 45 },
          { name: 'Environment validation', time: 30 },
          { name: 'Deployment checks', time: 25 },
          { name: 'Error troubleshooting', time: 40 },
        ],
        total: 140,
      },
      after: {
        tasks: [
          { name: 'RinaWarp sync command', time: 2 },
          { name: 'Automated validation', time: 1 },
          { name: 'One-click deployment', time: 3 },
          { name: 'Zero errors', time: 0 },
        ],
        total: 6,
      },
    };

    const htmlContent = this.createTimeSavingsHTML(timeData);
    fs.writeFileSync(path.join(this.outputDir, 'time-savings-breakdown.html'), htmlContent);

    console.log('✅ Time savings breakdown created');
    return timeData;
  }

  createTimeSavingsHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Time Savings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .comparison-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            max-width: 900px;
            width: 100%;
        }
        
        .time-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .card-header {
            text-align: center;
            margin-bottom: 25px;
        }
        
        .card-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .before .card-title { color: #ff4444; }
        .after .card-title { color: #00aa44; }
        
        .total-time {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .before .total-time { color: #ff4444; }
        .after .total-time { color: #00aa44; }
        
        .task-list {
            list-style: none;
        }
        
        .task-item {
            display: flex;
            justify-content: between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        
        .task-name {
            flex: 1;
            font-size: 16px;
        }
        
        .task-time {
            font-weight: bold;
            font-size: 16px;
        }
        
        .before .task-time { color: #ff6666; }
        .after .task-time { color: #66aa66; }
        
        .savings-banner {
            grid-column: 1 / -1;
            text-align: center;
            background: linear-gradient(90deg, #00aa44 0%, #66dd66 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
        }
        
        .savings-text {
            font-size: 28px;
            font-weight: bold;
        }
        
        .weekly-savings {
            font-size: 18px;
            margin-top: 10px;
            opacity: 0.9;
        }
        
        @media (max-width: 768px) {
            .comparison-container {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="comparison-container">
        <div class="time-card before">
            <div class="card-header">
                <div class="card-title">❌ Before RinaWarp</div>
                <div class="total-time">${data.before.total} min</div>
                <div>per deployment</div>
            </div>
            <ul class="task-list">
                ${data.before.tasks
    .map(
      task => `
                    <li class="task-item">
                        <span class="task-name">${task.name}</span>
                        <span class="task-time">${task.time}m</span>
                    </li>
                `
    )
    .join('')}
            </ul>
        </div>
        
        <div class="time-card after">
            <div class="card-header">
                <div class="card-title">✅ With RinaWarp</div>
                <div class="total-time">${data.after.total} min</div>
                <div>per deployment</div>
            </div>
            <ul class="task-list">
                ${data.after.tasks
    .map(
      task => `
                    <li class="task-item">
                        <span class="task-name">${task.name}</span>
                        <span class="task-time">${task.time}m</span>
                    </li>
                `
    )
    .join('')}
            </ul>
        </div>
        
        <div class="savings-banner">
            <div class="savings-text">⏱️ ${data.before.total - data.after.total} minutes saved per deployment</div>
            <div class="weekly-savings">That's ${Math.round((((data.before.total - data.after.total) * 4) / 60) * 10) / 10} hours saved weekly!</div>
        </div>
    </div>
</body>
</html>`;
  }

  generateFeatureHighlightCarousel() {
    console.log('🔍 Generating Feature Highlight Carousel...');

    const features = [
      {
        icon: '🔐',
        title: 'Secret Sync Checker',
        description: 'Validates and syncs secrets across all platforms',
        color: '#667eea',
      },
      {
        icon: '🔥',
        title: 'Firebase Health Auditor',
        description: 'Real-time Firebase configuration monitoring',
        color: '#ff6b35',
      },
      {
        icon: '📊',
        title: 'Dashboard Glowing Status',
        description: 'Beautiful visual indicators for system health',
        color: '#4ecdc4',
      },
      {
        icon: '🎤',
        title: 'Voice-Triggered Deploys',
        description: 'Deploy with simple voice commands',
        color: '#45b7d1',
      },
    ];

    const htmlContent = this.createFeatureCarouselHTML(features);
    fs.writeFileSync(path.join(this.outputDir, 'feature-highlight-carousel.html'), htmlContent);

    console.log('✅ Feature highlight carousel created');
    return features;
  }

  createFeatureCarouselHTML(features) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Feature Highlights</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .carousel-container {
            width: 400px;
            height: 500px;
            position: relative;
            overflow: hidden;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .carousel-slide {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.5s ease-in-out;
        }
        
        .carousel-slide.active {
            opacity: 1;
            transform: translateX(0);
        }
        
        .feature-icon {
            font-size: 80px;
            margin-bottom: 30px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        .feature-title {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
            color: white;
        }
        
        .feature-description {
            font-size: 18px;
            line-height: 1.6;
            color: #e0e0e0;
            margin-bottom: 40px;
        }
        
        .feature-workflow {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #ccc;
        }
        
        .workflow-step {
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        
        .carousel-indicators {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
        }
        
        .indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .indicator.active {
            background: white;
            transform: scale(1.2);
        }
    </style>
</head>
<body>
    <div class="carousel-container">
        ${features
    .map(
      (feature, index) => `
            <div class="carousel-slide ${index === 0 ? 'active' : ''}" 
                 style="background: linear-gradient(135deg, ${feature.color} 0%, ${this.darkenColor(feature.color)} 100%);">
                <div class="feature-icon">${feature.icon}</div>
                <h2 class="feature-title">${feature.title}</h2>
                <p class="feature-description">${feature.description}</p>
                <div class="feature-workflow">
                    <span class="workflow-step">Setup</span>
                    <span>→</span>
                    <span class="workflow-step">Run</span>
                    <span>→</span>
                    <span class="workflow-step">Success</span>
                </div>
            </div>
        `
    )
    .join('')}
        
        <div class="carousel-indicators">
            ${features
    .map(
      (_, index) => `
                <div class="indicator ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
            `
    )
    .join('')}
        </div>
    </div>
    
    <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.indicator');
        const totalSlides = slides.length;
        
        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            indicators.forEach(indicator => indicator.classList.remove('active'));
            
            slides[index].classList.add('active');
            indicators[index].classList.add('active');
        }
        
        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }
        
        // Auto advance slides
        setInterval(nextSlide, 3000);
        
        // Click indicators to navigate
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                currentSlide = index;
                showSlide(currentSlide);
            });
        });
    </script>
</body>
</html>`;
  }

  darkenColor(hex) {
    // Simple color darkening function
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
  }

  generateSuccessMetricAnimations() {
    console.log('📊 Generating Success Metric Animations...');

    const metrics = [
      { name: 'Sync Rate', value: 100, unit: '%', color: '#00aa44' },
      { name: 'Uptime', value: 99.9, unit: '%', color: '#4ecdc4' },
      { name: 'Time Saved', value: 7.3, unit: 'hrs/week', color: '#667eea' },
      { name: 'Error Rate', value: 0.01, unit: '%', color: '#ff6b35' },
    ];

    const htmlContent = this.createMetricsAnimationHTML(metrics);
    fs.writeFileSync(path.join(this.outputDir, 'success-metrics-animation.html'), htmlContent);

    console.log('✅ Success metric animations created');
    return metrics;
  }

  createMetricsAnimationHTML(metrics) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Success Metrics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .metrics-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            max-width: 800px;
            width: 100%;
        }
        
        .metric-card {
            background: white;
            border-radius: 15px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            position: relative;
            overflow: hidden;
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--color);
        }
        
        .metric-name {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .metric-value {
            font-size: 48px;
            font-weight: bold;
            color: var(--color);
            margin-bottom: 10px;
            position: relative;
        }
        
        .metric-unit {
            font-size: 18px;
            color: #999;
            font-weight: normal;
        }
        
        .metric-chart {
            width: 120px;
            height: 120px;
            margin: 20px auto;
            position: relative;
        }
        
        .chart-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: conic-gradient(var(--color) 0deg, #eee 0deg);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: rotateIn 2s ease-out;
        }
        
        @keyframes rotateIn {
            from {
                background: conic-gradient(var(--color) 0deg, #eee 0deg);
            }
            to {
                background: conic-gradient(var(--color) var(--degrees), #eee var(--degrees));
            }
        }
        
        .chart-center {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: var(--color);
        }
        
        .metric-trend {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 14px;
            color: #00aa44;
            margin-top: 15px;
        }
        
        .trend-arrow {
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="metrics-container">
        ${metrics
    .map((metric, index) => {
      const degrees =
              metric.name === 'Error Rate'
                ? Math.min(metric.value * 36, 360) // Scale error rate differently
                : (metric.value / 100) * 360;

      return `
                <div class="metric-card" style="--color: ${metric.color}; --degrees: ${degrees}deg; animation-delay: ${index * 0.3}s;">
                    <div class="metric-name">${metric.name}</div>
                    <div class="metric-value">
                        <span class="counter" data-target="${metric.value}">0</span>
                        <span class="metric-unit">${metric.unit}</span>
                    </div>
                    <div class="metric-chart">
                        <div class="chart-circle">
                            <div class="chart-center">${metric.value}${metric.unit}</div>
                        </div>
                    </div>
                    <div class="metric-trend">
                        <span class="trend-arrow">📈</span>
                        <span>Trending up</span>
                    </div>
                </div>
            `;
    })
    .join('')}
    </div>
    
    <script>
        // Counter animation
        function animateCounter(element, target) {
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = current.toFixed(target < 10 ? 2 : 0);
            }, 20);
        }
        
        // Start animations when page loads
        window.addEventListener('load', () => {
            document.querySelectorAll('.counter').forEach(counter => {
                const target = parseFloat(counter.dataset.target);
                setTimeout(() => animateCounter(counter, target), 500);
            });
        });
    </script>
</body>
</html>`;
  }

  generateSocialMediaAssets() {
    console.log('📱 Generating Social Media Assets...');

    // Generate platform-specific templates
    const platforms = {
      twitter: {
        dimensions: '1200x675',
        format: 'fast-gif',
        content: 'quick-demo',
      },
      linkedin: {
        dimensions: '1200x627',
        format: 'mp4',
        content: 'professional-demo',
      },
      instagram: {
        dimensions: '1080x1080',
        format: 'carousel',
        content: 'visual-story',
      },
    };

    const assetsInfo = [];

    Object.entries(platforms).forEach(([platform, specs]) => {
      const content = this.createPlatformSpecificContent(platform, specs);
      fs.writeFileSync(path.join(this.outputDir, `${platform}-optimized.html`), content);
      assetsInfo.push({ platform, ...specs });
    });

    console.log('✅ Social media assets generated');
    return assetsInfo;
  }

  createPlatformSpecificContent(platform, _specs) {
    const baseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - ${platform.charAt(0).toUpperCase() + platform.slice(1)}</title>
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: white;
        }
        
        .content-container {
            text-align: center;
            max-width: 600px;
            padding: 40px;
        }
        
        .platform-logo {
            font-size: 60px;
            margin-bottom: 30px;
        }
        
        .main-headline {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .sub-headline {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 40px;
        }
        
        .cta-button {
            background: white;
            color: #667eea;
            padding: 15px 30px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            font-size: 18px;
            display: inline-block;
            transition: transform 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
        }
        
        .features-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 40px 0;
        }
        
        .feature-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="content-container">
        ${this.getPlatformSpecificContent(platform)}
    </div>
</body>
</html>`;

    return baseTemplate;
  }

  getPlatformSpecificContent(platform) {
    const content = {
      twitter: `
                <div class="platform-logo">🐦</div>
                <h1 class="main-headline">This one system shaved hours off my weekly workload</h1>
                <p class="sub-headline">Cross-platform secret sync that just works</p>
                <div class="features-list">
                    <div class="feature-item">⚡ One Command</div>
                    <div class="feature-item">🔒 Secure Sync</div>
                    <div class="feature-item">🌐 Cross-Platform</div>
                    <div class="feature-item">📊 Live Monitoring</div>
                </div>
                <a href="https://www.rinawrptech.com" class="cta-button">Try Beta Now</a>
            `,
      linkedin: `
                <div class="platform-logo">💼</div>
                <h1 class="main-headline">Professional DevOps Made Simple</h1>
                <p class="sub-headline">Enterprise-grade secret synchronization for modern teams</p>
                <div class="features-list">
                    <div class="feature-item">🔐 Enterprise Security</div>
                    <div class="feature-item">⚡ Intelligent Sync</div>
                    <div class="feature-item">📊 Real-time Analytics</div>
                    <div class="feature-item">🚀 Global CDN</div>
                </div>
                <a href="https://www.rinawrptech.com" class="cta-button">Join Beta</a>
            `,
      instagram: `
                <div class="platform-logo">📸</div>
                <h1 class="main-headline">Behind the Scenes</h1>
                <p class="sub-headline">Building the future of DevOps automation</p>
                <div class="features-list">
                    <div class="feature-item">✨ Beautiful UI</div>
                    <div class="feature-item">🎨 Glowing Status</div>
                    <div class="feature-item">🌟 Smooth Animations</div>
                    <div class="feature-item">🔥 Live Updates</div>
                </div>
                <a href="https://www.rinawrptech.com" class="cta-button">Experience Beta</a>
            `,
    };

    return content[platform] || content.twitter;
  }

  generatePostingScheduleTemplate() {
    console.log('📅 Generating Posting Schedule Template...');

    const schedule = {
      twitter: {
        times: ['8:00 AM PT', '12:00 PM PT', '6:00 PM PT'],
        content: ['Threads', 'Visuals', 'Replies'],
        frequency: 'Daily',
      },
      linkedin: {
        times: ['9:00 AM PT'],
        content: ['Long-form posts'],
        frequency: 'Daily (1 long-form weekly)',
      },
      reddit: {
        times: ['Tuesday 7:00 PM PT', 'Thursday 7:00 PM PT'],
        content: ['AMA-style posts', 'Dev discussions'],
        frequency: 'Twice weekly',
      },
      email: {
        times: ['Friday 10:00 AM PT'],
        content: ['Weekly wins', 'Demos', 'Previews'],
        frequency: 'Weekly',
      },
    };

    const jsonContent = JSON.stringify(schedule, null, 2);
    fs.writeFileSync(path.join(this.outputDir, 'posting-schedule.json'), jsonContent);

    const htmlTemplate = this.createScheduleHTML(schedule);
    fs.writeFileSync(path.join(this.outputDir, 'posting-schedule-dashboard.html'), htmlTemplate);

    console.log('✅ Posting schedule template created');
    return schedule;
  }

  createScheduleHTML(schedule) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Terminal - Content Calendar</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .title {
            font-size: 32px;
            color: #333;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 18px;
            color: #666;
        }
        
        .platforms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .platform-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-left: 4px solid var(--color);
        }
        
        .platform-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .platform-icon {
            font-size: 24px;
        }
        
        .platform-name {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        
        .schedule-item {
            margin-bottom: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .schedule-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
        }
        
        .schedule-value {
            font-size: 14px;
            color: #333;
            font-weight: 500;
        }
        
        .content-mix {
            margin-top: 20px;
            padding: 16px;
            background: #f0f8ff;
            border-radius: 8px;
            border-left: 3px solid #4ecdc4;
        }
        
        .mix-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #333;
        }
        
        .mix-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .mix-label {
            color: #666;
        }
        
        .mix-percentage {
            color: #4ecdc4;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1 class="title">🗓️ RinaWarp Terminal Content Calendar</h1>
            <p class="subtitle">Optimized posting schedule for maximum engagement</p>
        </div>
        
        <div class="platforms-grid">
            ${Object.entries(schedule)
    .map(([platform, data]) => {
      const colors = {
        twitter: '#1da1f2',
        linkedin: '#0077b5',
        reddit: '#ff4500',
        email: '#34495e',
      };

      const icons = {
        twitter: '🐦',
        linkedin: '💼',
        reddit: '🤖',
        email: '📧',
      };

      return `
                    <div class="platform-card" style="--color: ${colors[platform]};">
                        <div class="platform-header">
                            <span class="platform-icon">${icons[platform]}</span>
                            <span class="platform-name">${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                        </div>
                        
                        <div class="schedule-item">
                            <div class="schedule-label">Times</div>
                            <div class="schedule-value">${data.times.join(', ')}</div>
                        </div>
                        
                        <div class="schedule-item">
                            <div class="schedule-label">Content Types</div>
                            <div class="schedule-value">${data.content.join(', ')}</div>
                        </div>
                        
                        <div class="schedule-item">
                            <div class="schedule-label">Frequency</div>
                            <div class="schedule-value">${data.frequency}</div>
                        </div>
                    </div>
                `;
    })
    .join('')}
        </div>
        
        <div class="content-mix">
            <div class="mix-title">📊 Content Mix Strategy</div>
            <div class="mix-item">
                <span class="mix-label">Educational Content</span>
                <span class="mix-percentage">40%</span>
            </div>
            <div class="mix-item">
                <span class="mix-label">Product Features</span>
                <span class="mix-percentage">30%</span>
            </div>
            <div class="mix-item">
                <span class="mix-label">Behind-the-Scenes</span>
                <span class="mix-percentage">20%</span>
            </div>
            <div class="mix-item">
                <span class="mix-label">Community Highlights</span>
                <span class="mix-percentage">10%</span>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  run() {
    console.log('🚀 Starting Enhanced Visual Content Generation...\n');

    const results = {
      statusAnimation: this.generateTerminalStatusAnimation(),
      timeSavings: this.generateTimeSavingsBreakdown(),
      featureCarousel: this.generateFeatureHighlightCarousel(),
      successMetrics: this.generateSuccessMetricAnimations(),
      socialAssets: this.generateSocialMediaAssets(),
      schedule: this.generatePostingScheduleTemplate(),
    };

    console.log('\n🎉 All enhanced visual content generated successfully!');
    console.log(`📁 Assets saved to: ${this.outputDir}`);

    return results;
  }
}

// Run the generator
const generator = new VisualContentGenerator();
generator.run();
