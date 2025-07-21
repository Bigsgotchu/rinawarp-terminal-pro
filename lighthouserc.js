module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000/terminal.html'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: ['--no-sandbox', '--disable-gpu'],
        throttling: {
          cpuSlowdownMultiplier: 2,
          networkRequestLatencyMs: 150,
          networkDownloadSpeedKbps: 1500,
          networkUploadSpeedKbps: 750,
        },
      },
    },
    assert: {
      assertions: {
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        'bootup-time': ['warn', { maxNumericValue: 3000 }],
        'uses-rel-preload': 'off',
        'uses-responsive-images': 'off',
        'offscreen-images': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      killTimeout: 30000,
    },
  },
};
