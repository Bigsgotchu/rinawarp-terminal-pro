import dotenvFlow from 'dotenv-flow';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables based on NODE_ENV
dotenvFlow.config({
  path: path.join(__dirname, '..'),
  node_env: process.env.NODE_ENV || 'development',
  default_node_env: 'development'
});

// Configuration schema
const configSchema = Joi.object({
  // App configuration
  app: {
    nodeEnv: Joi.string().valid('development', 'production', 'test').default('development'),
    version: Joi.string().required(),
    logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    debug: Joi.boolean().default(false),
  },

  // Stripe Configuration
  stripe: {
    secretKey: Joi.string().required(),
    publishableKey: Joi.string().required(),
    webhookSecret: Joi.string().required(),
    prices: {
      personalMonthly: Joi.string().required(),
      personalYearly: Joi.string().required(),
      professionalMonthly: Joi.string().required(),
      professionalYearly: Joi.string().required(),
      teamMonthly: Joi.string().required(),
      teamYearly: Joi.string().required(),
    },
    beta: {
      productId: Joi.string().required(),
      prices: {
        earlyBird: Joi.string().required(),
        access: Joi.string().required(),
        premium: Joi.string().required(),
      }
    }
  },

  // Telemetry & Analytics
  telemetry: {
    enabled: Joi.boolean().default(true),
    privacyMode: Joi.string().valid('strict', 'balanced', 'minimal').default('strict'),
    batchSize: Joi.number().integer().min(1).default(10),
    flushInterval: Joi.number().integer().min(1000).default(30000),
    systemMetricsInterval: Joi.number().integer().min(5000).default(30000),
    endpoint: Joi.string().uri().required(),
    apiKey: Joi.string().required(),
  },

  analytics: {
    enabled: Joi.boolean().default(false),
    endpoint: Joi.string().uri().required(),
    apiKey: Joi.string().required(),
  },

  // Error Tracking
  sentry: {
    dsn: Joi.string().uri().required(),
    environment: Joi.string().default('development'),
    sampleRate: Joi.number().min(0).max(1).default(1.0),
    tracesSampleRate: Joi.number().min(0).max(1).default(0.5),
  },

  // Application Insights
  appInsights: {
    instrumentationKey: Joi.string().required(),
    connectionString: Joi.string().required(),
    endpoint: Joi.string().uri().required(),
    samplingPercentage: Joi.number().min(0).max(100).default(100),
  },

  // Google Analytics
  ga: {
    measurementId: Joi.string().required(),
    apiSecret: Joi.string().required(),
  },

  // Logging
  logging: {
    toFile: Joi.boolean().default(true),
    directory: Joi.string().default('./logs'),
    maxSize: Joi.string().default('10MB'),
    maxFiles: Joi.number().integer().min(1).default(5),
  },

  // Feature Flags
  features: {
    aiFeatures: Joi.boolean().default(true),
    cloudSync: Joi.boolean().default(false),
    crashReporting: Joi.boolean().default(true),
    autoUpdates: Joi.boolean().default(false),
  },

  // URLs
  urls: {
    pricing: Joi.string().uri().required(),
  }
}).required();

// Configuration values
const config = {
  app: {
    nodeEnv: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
    logLevel: process.env.LOG_LEVEL,
    debug: process.env.DEBUG === 'true',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    prices: {
      personalMonthly: process.env.STRIPE_PRICE_PERSONAL_MONTHLY,
      personalYearly: process.env.STRIPE_PRICE_PERSONAL_YEARLY,
      professionalMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      professionalYearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY,
      teamMonthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
      teamYearly: process.env.STRIPE_PRICE_TEAM_YEARLY,
    },
    beta: {
      productId: process.env.STRIPE_PRODUCT_BETA_ACCESS,
      prices: {
        earlyBird: process.env.STRIPE_PRICE_BETA_EARLYBIRD,
        access: process.env.STRIPE_PRICE_BETA_ACCESS,
        premium: process.env.STRIPE_PRICE_BETA_PREMIUM,
      }
    }
  },
  telemetry: {
    enabled: process.env.ENABLE_TELEMETRY === 'true',
    privacyMode: process.env.TELEMETRY_PRIVACY_MODE,
    batchSize: parseInt(process.env.TELEMETRY_BATCH_SIZE),
    flushInterval: parseInt(process.env.TELEMETRY_FLUSH_INTERVAL),
    systemMetricsInterval: parseInt(process.env.SYSTEM_METRICS_INTERVAL),
    endpoint: process.env.TELEMETRY_ENDPOINT,
    apiKey: process.env.TELEMETRY_API_KEY,
  },
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
    endpoint: process.env.ANALYTICS_ENDPOINT,
    apiKey: process.env.ANALYTICS_API_KEY,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE),
  },
  appInsights: {
    instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    endpoint: process.env.APPINSIGHTS_ENDPOINT,
    samplingPercentage: parseInt(process.env.APPINSIGHTS_SAMPLING_PERCENTAGE),
  },
  ga: {
    measurementId: process.env.GA_MEASUREMENT_ID,
    apiSecret: process.env.GA_API_SECRET,
  },
  logging: {
    toFile: process.env.LOG_TO_FILE === 'true',
    directory: process.env.LOG_DIRECTORY,
    maxSize: process.env.MAX_LOG_SIZE,
    maxFiles: parseInt(process.env.MAX_LOG_FILES),
  },
  features: {
    aiFeatures: process.env.ENABLE_AI_FEATURES === 'true',
    cloudSync: process.env.ENABLE_CLOUD_SYNC === 'true',
    crashReporting: process.env.ENABLE_CRASH_REPORTING === 'true',
    autoUpdates: process.env.ENABLE_AUTO_UPDATES === 'true',
  },
  urls: {
    pricing: process.env.PRICING_URL,
  }
};

// Validate configuration
const { error, value: validatedConfig } = configSchema.validate(config, {
  abortEarly: false,
  allowUnknown: false,
});

if (error) {
  console.error('Configuration validation failed:');
  error.details.forEach((detail) => {
    console.error(`- ${detail.message}`);
  });
  process.exit(1);
}

export default validatedConfig;
