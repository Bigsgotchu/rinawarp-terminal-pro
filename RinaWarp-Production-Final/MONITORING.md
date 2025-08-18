# RinaWarp Terminal Monitoring & Uptime Setup

This document describes the comprehensive monitoring, uptime tracking, and operational management system for RinaWarp Terminal.

## 🚀 Quick Setup

Run the automated setup script:

```bash
./scripts/setup-monitoring.sh
```

This will:
- ✅ Set up health check endpoints
- ✅ Configure uptime monitoring
- ✅ Install PM2 process management
- ✅ Set up performance monitoring
- ✅ Configure logging system
- ✅ Create backup procedures
- ✅ Test all components

## 📊 Monitoring Components

### 1. Health Check Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Basic health check | `{"status":"ok","timestamp":"..."}` |
| `/health/detailed` | Detailed system info | Memory, uptime, dependencies |
| `/ready` | Load balancer readiness | Ready/not ready status |
| `/live` | Kubernetes liveness | Always returns alive |

### 2. Uptime Monitoring

**Script**: `scripts/uptime-monitor.sh`

```bash
# Manual monitoring check
./scripts/uptime-monitor.sh check

# Generate uptime report
./scripts/uptime-monitor.sh report

# View live logs
./scripts/uptime-monitor.sh tail

# Install/remove cron jobs
./scripts/uptime-monitor.sh install-cron
./scripts/uptime-monitor.sh remove-cron
```

**Features**:
- HTTP health check monitoring
- Response time tracking  
- Memory usage alerts
- Process monitoring
- Email & webhook alerts
- Automatic log rotation

### 3. Performance Monitoring

**Script**: `scripts/performance-monitor.sh`

```bash
# Run performance monitoring
./scripts/performance-monitor.sh monitor

# Generate performance report
./scripts/performance-monitor.sh report

# View metrics
./scripts/performance-monitor.sh metrics

# Cleanup old data
./scripts/performance-monitor.sh cleanup
```

**Metrics Tracked**:
- CPU usage %
- Memory usage (total, used, free)
- Disk usage %
- Network connections
- Load averages
- API response times
- Process counts

### 4. Process Management (PM2)

**Configuration**: `ecosystem.config.js`

```bash
# Start all services
pm2 start ecosystem.config.js

# Production mode
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all
```

**Managed Processes**:
- `rinawarp-api` - Main API server
- `rinawarp-monitoring` - Uptime checks (every 5 min)
- `rinawarp-performance` - Performance metrics (hourly)

### 5. Logging System

**Enhanced Logging**: `backend/logger.js`

**Log Files**:
- `logs/error.log` - Error logs only
- `logs/access.log` - HTTP requests
- `logs/app.log` - General application logs  
- `logs/security.log` - Security events
- `logs/performance.log` - Performance data

**Features**:
- Structured JSON logging
- Multiple log levels (error, warn, info, debug, trace)
- Automatic log rotation (>100MB)
- Request/response tracking
- Security event logging

### 6. Backup & Recovery

**Script**: `scripts/backup-recovery.sh`

```bash
# Full backup
./scripts/backup-recovery.sh backup

# Backup specific components
./scripts/backup-recovery.sh backup-config
./scripts/backup-recovery.sh backup-app
./scripts/backup-recovery.sh backup-logs

# List backups
./scripts/backup-recovery.sh list

# Restore configuration
./scripts/backup-recovery.sh restore-config 20231215-143022

# System health check
./scripts/backup-recovery.sh health

# Cleanup old backups
./scripts/backup-recovery.sh cleanup 30
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Basic Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring Configuration  
ALERT_EMAIL=alerts@yourdomain.com
WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Monitoring Configuration

Edit `monitoring/monitoring.conf`:

```bash
# API Configuration
API_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:8080"

# Alert Configuration
ALERT_EMAIL="alerts@yourdomain.com"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Thresholds
MEMORY_THRESHOLD=500    # Alert if memory usage exceeds this (MB)
RESPONSE_TIME_THRESHOLD=5  # Alert if response time exceeds this (seconds)
```

## 🚨 Alerting

### Email Alerts

Configure `ALERT_EMAIL` in monitoring.conf. Requires `mail` command.

```bash
# Install mail command (macOS)
brew install mailutils

# Test email
echo "Test alert" | mail -s "RinaWarp Test" your-email@domain.com
```

### Webhook Alerts (Slack/Discord)

Configure `WEBHOOK_URL` for Slack, Discord, or custom webhooks.

**Slack Setup**:
1. Create Slack App: https://api.slack.com/apps
2. Create Incoming Webhook
3. Copy webhook URL to `WEBHOOK_URL`

**Alert Payload**:
```json
{
  "service": "API",
  "status": "DOWN",
  "message": "Health check timeout after 10s",
  "timestamp": "2023-12-15T14:30:22.000Z"
}
```

## 📈 Monitoring Dashboard

### PM2 Web Dashboard

```bash
# Install PM2 web interface
pm2 install pm2-server-monit

# Access dashboard
open http://localhost:9615
```

### Custom Metrics API

Health endpoints return detailed metrics:

```bash
# Get detailed health info
curl http://localhost:3000/health/detailed | jq

# Sample response
{
  "status": "ok",
  "timestamp": "2023-12-15T14:30:22.000Z",
  "service": "rinawarp-terminal-api",
  "version": "1.0.0",
  "uptime": 3600.5,
  "memory": {
    "rss": 45,
    "heapTotal": 25,
    "heapUsed": 18,
    "external": 2
  },
  "environment": "development",
  "port": 3000,
  "dependencies": {
    "stripe": "connected",
    "database": "memory"
  }
}
```

## 🔧 Operations

### Daily Operations

```bash
# Check system status
./scripts/setup-monitoring.sh status

# Create backup
./scripts/backup-recovery.sh backup

# View monitoring logs
tail -f logs/monitoring/uptime.log

# Check PM2 processes
pm2 status
```

### Weekly Operations

```bash
# Generate performance report
./scripts/performance-monitor.sh report

# Cleanup old logs/backups
./scripts/backup-recovery.sh cleanup 7
find logs/ -name "*.log" -mtime +7 -delete

# Review alerts
less logs/monitoring/alerts.log
```

### Monthly Operations

```bash
# Full system backup
./scripts/backup-recovery.sh backup

# Update dependencies
npm audit
npm update

# Review system performance
./scripts/performance-monitor.sh metrics | tail -100
```

## 🚦 Troubleshooting

### API Server Issues

```bash
# Check if API is responding
curl -I http://localhost:3000/health

# View PM2 logs
pm2 logs rinawarp-api --lines 50

# Restart API server
pm2 restart rinawarp-api

# Check system resources
htop
df -h
```

### Monitoring Issues

```bash
# Test monitoring manually
./scripts/uptime-monitor.sh check

# Check monitoring logs
tail -f logs/monitoring/uptime.log

# Verify cron jobs
crontab -l | grep monitor
```

### Performance Issues

```bash
# Check system metrics
./scripts/performance-monitor.sh monitor

# Review performance logs
less logs/performance/metrics.log

# Check memory usage
ps aux | grep node | head -5
```

## 📋 Maintenance Tasks

### Log Rotation

Logs automatically rotate when >100MB. Manual rotation:

```bash
# Rotate all logs
find logs/ -name "*.log" -size +100M -exec gzip {} \;

# Archive old logs
tar -czf logs-archive-$(date +%Y%m%d).tar.gz logs/
```

### Database Backup

Currently using in-memory storage. For production:

```bash
# PostgreSQL backup example
pg_dump rinawarp > backups/db-$(date +%Y%m%d).sql

# MongoDB backup example  
mongodump --db rinawarp --out backups/mongo-$(date +%Y%m%d)
```

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Log Sanitization**: Sensitive data is filtered from logs
3. **Access Control**: Restrict monitoring endpoint access in production
4. **Alert Security**: Use secure webhook URLs
5. **Backup Encryption**: Consider encrypting backup files

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Stripe Webhook Security](https://stripe.com/docs/webhooks/signatures)

## 🆘 Support

For issues with monitoring setup:

1. Check logs: `./scripts/setup-monitoring.sh status`
2. Run health check: `./scripts/backup-recovery.sh health`
3. Review configuration: `monitoring/monitoring.conf`
4. Test manually: `./scripts/uptime-monitor.sh check`

---

**Happy Monitoring! 🚀**
