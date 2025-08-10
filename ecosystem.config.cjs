module.exports = {
  apps: [
    {
      name: 'rinawarp-terminal-server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Advanced PM2 features
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 4000,

      // Monitoring
      monitoring: false,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'rinawarp-websocket-server',
      script: 'websocket-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 8081,
      },
      env_development: {
        NODE_ENV: 'development',
        WS_PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        WS_PORT: 8081,
      },
      log_file: './logs/websocket-combined.log',
      out_file: './logs/websocket-out.log',
      error_file: './logs/websocket-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'rinawarptech.com',
      ref: 'origin/main',
      repo: 'git@github.com:Rinawarp-Terminal/rinawarp-terminal.git',
      path: '/var/www/rinawarp-terminal',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/www/rinawarp-terminal/logs',
    },
    development: {
      user: 'developer',
      host: 'localhost',
      ref: 'origin/develop',
      repo: 'git@github.com:Rinawarp-Terminal/rinawarp-terminal.git',
      path: '/tmp/rinawarp-terminal-dev',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development',
    },
  },
};
