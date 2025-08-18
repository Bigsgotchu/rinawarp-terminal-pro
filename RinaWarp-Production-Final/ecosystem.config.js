module.exports = {
  apps: [
    {
      name: 'rinawarp-api',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork', // Use 'cluster' for production with multiple instances
      watch: false, // Set to true in development
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        LOG_LEVEL: 'debug',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'info',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        LOG_LEVEL: 'debug',
      },
      // Logging
      log_file: './logs/pm2/combined.log',
      out_file: './logs/pm2/out.log',
      error_file: './logs/pm2/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Process management
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Auto restart settings
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Monitoring
      monitoring: false, // Set to true to enable PM2 monitoring
      pmx: false,
      // Process behavior
      ignore_watch: ['node_modules', 'logs', '*.log', 'dist', '.git'],
      // Health checks
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
    {
      name: 'rinawarp-monitoring',
      script: './scripts/uptime-monitor.sh',
      args: 'check',
      instances: 1,
      exec_mode: 'fork',
      interpreter: '/bin/bash',
      cron_restart: '*/5 * * * *', // Run every 5 minutes
      autorestart: false, // Don't auto-restart monitoring script
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_file: './logs/pm2/monitoring.log',
      out_file: './logs/pm2/monitoring-out.log',
      error_file: './logs/pm2/monitoring-error.log',
    },
    {
      name: 'rinawarp-performance',
      script: './scripts/performance-monitor.sh',
      args: 'monitor',
      instances: 1,
      exec_mode: 'fork',
      interpreter: '/bin/bash',
      cron_restart: '0 * * * *', // Run every hour
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_file: './logs/pm2/performance.log',
      out_file: './logs/pm2/performance-out.log',
      error_file: './logs/pm2/performance-error.log',
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:kgilley/rinawarp-terminal-personal.git',
      path: '/var/www/rinawarp-api',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm git -y',
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:kgilley/rinawarp-terminal-personal.git',
      path: '/var/www/rinawarp-api-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};
