# Configuration System Documentation

This document describes the configuration system for the RinaWarp Terminal application.

## Overview

The configuration system uses a combination of:
- Environment variables
- Environment-specific configuration files
- Validation schema
- Centralized configuration module

## Configuration Files

The application uses [dotenv-flow](https://github.com/kerimdzhanov/dotenv-flow) to manage environment-specific configuration files:

- `.env.defaults`: Default values used as fallbacks
- `.env.development`: Development environment configuration
- `.env.production`: Production environment configuration
- `.env.local`: Local overrides (not committed to version control)

## Configuration Schema

The configuration is validated using [Joi](https://joi.dev/). The schema is defined in `config/index.js` and validates:

### App Configuration
- `nodeEnv`: Environment name ('development', 'production', 'test')
- `version`: Application version
- `logLevel`: Logging level ('error', 'warn', 'info', 'debug')
- `debug`: Debug mode flag

### Stripe Configuration
- Secret key, publishable key, and webhook secret
- Product and pricing IDs for different subscription tiers
- Beta access product configuration

### Telemetry & Analytics
- Enable/disable flags
- Privacy mode settings
- Batch sizes and intervals
- Endpoints and API keys

### Error Tracking
- Sentry configuration
- Application Insights settings
- Sample rates and environments

### Logging
- File logging settings
- Directory paths
- File rotation settings

### Feature Flags
- AI features
- Cloud sync
- Crash reporting
- Auto-updates

## Usage

Import the configuration module:

```javascript
import config from '../config';

// Access configuration values
const { logLevel } = config.app;
const { secretKey } = config.stripe;
```

## Environment Variables

### Required Variables

The following environment variables must be set:

#### Stripe Configuration
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_*` (various pricing tier IDs)

#### Telemetry & Analytics
- `TELEMETRY_ENDPOINT`
- `TELEMETRY_API_KEY`
- `ANALYTICS_ENDPOINT`
- `ANALYTICS_API_KEY`

#### Error Tracking
- `SENTRY_DSN`
- `APPINSIGHTS_INSTRUMENTATIONKEY`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `GA_MEASUREMENT_ID`
- `GA_API_SECRET`

### Optional Variables

The following variables have default values but can be overridden:

#### Application Settings
- `NODE_ENV` (default: 'development')
- `LOG_LEVEL` (default: 'info')
- `DEBUG` (default: false)

#### Telemetry Settings
- `ENABLE_TELEMETRY` (default: true)
- `ENABLE_ANALYTICS` (default: false)
- `TELEMETRY_PRIVACY_MODE` (default: 'strict')
- `TELEMETRY_BATCH_SIZE` (default: 10)
- `TELEMETRY_FLUSH_INTERVAL` (default: 30000)
- `SYSTEM_METRICS_INTERVAL` (default: 30000)

#### Feature Flags
- `ENABLE_AI_FEATURES` (default: true)
- `ENABLE_CLOUD_SYNC` (default: false)
- `ENABLE_CRASH_REPORTING` (default: true)
- `ENABLE_AUTO_UPDATES` (default: false)

## Validation

The configuration system validates all values at startup. If any required values are missing or invalid, the application will fail to start and log the validation errors.

## Adding New Configuration

1. Add the new variable to the Joi schema in `config/index.js`
2. Add the variable to the configuration object
3. Add default values in `.env.defaults` if appropriate
4. Add environment-specific values in `.env.development` and `.env.production`
5. Update this documentation with the new variable

## Security Notes

- Never commit sensitive values to version control
- Use `.env.local` for local development secrets
- Use secure secret management in production
- Validate all configuration values before use
- Ensure proper access control for config files

## CI Pipeline Integration

The configuration system is integrated with the CI pipeline through:

1. Validation of all configuration files during build
2. Environment-specific config loading based on build type
3. Secret injection from secure storage
4. Configuration validation as part of test suite

To run configuration validation:

```bash
npm run validate:config
```
