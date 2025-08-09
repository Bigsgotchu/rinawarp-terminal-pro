const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // Subscription & License Information
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'professional', 'enterprise'],
      default: 'free',
    },
    stripe_customer_id: String,
    stripe_subscription_id: String,
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid'],
      default: 'active',
    },
    trial_end: Date,
    current_period_start: Date,
    current_period_end: Date,
    cancel_at_period_end: {
      type: Boolean,
      default: false,
    },
  },

  // License Keys (for desktop app validation)
  licenses: [
    {
      key: {
        type: String,
        required: true,
        unique: true,
      },
      platform: {
        type: String,
        enum: ['windows', 'macos', 'linux', 'universal'],
        required: true,
      },
      tier: {
        type: String,
        enum: ['professional', 'enterprise'],
        required: true,
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
      last_used: Date,
      machine_id: String, // For device binding
      is_active: {
        type: Boolean,
        default: true,
      },
    },
  ],

  // Download Tracking
  downloads: [
    {
      platform: String,
      tier: String,
      version: String,
      downloaded_at: {
        type: Date,
        default: Date.now,
      },
      ip_address: String,
    },
  ],

  // Profile Information
  profile: {
    company: String,
    role: String,
    usage_purpose: {
      type: String,
      enum: ['personal', 'professional', 'enterprise', 'education'],
    },
  },

  // Authentication
  email_verified: {
    type: Boolean,
    default: false,
  },
  verification_token: String,
  reset_password_token: String,
  reset_password_expires: Date,

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  last_login: Date,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.stripe_customer_id': 1 });
userSchema.index({ 'licenses.key': 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
userSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// Instance Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      tier: this.subscription.tier,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

userSchema.methods.generateLicenseKey = function (platform = 'universal') {
  const crypto = require('crypto');

  // Generate a unique license key
  const key = [
    'RWT', // RinaWarp Terminal prefix
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
    crypto.randomBytes(4).toString('hex').toUpperCase(),
  ].join('-');

  return key;
};

userSchema.methods.addLicense = async function (platform, tier = 'professional') {
  const licenseKey = this.generateLicenseKey(platform);

  const license = {
    key: licenseKey,
    platform,
    tier,
    created_at: new Date(),
    is_active: true,
  };

  this.licenses.push(license);
  await this.save();

  return license;
};

userSchema.methods.hasValidSubscription = function () {
  if (this.subscription.tier === 'free') return true;

  const now = new Date();

  // Check if subscription is active or in trial
  if (!['active', 'trialing'].includes(this.subscription.status)) {
    return false;
  }

  // Check if not past due date
  if (this.subscription.current_period_end && this.subscription.current_period_end < now) {
    return false;
  }

  return true;
};

userSchema.methods.getActiveFeatures = function () {
  const tier = this.subscription.tier;
  const hasValidSub = this.hasValidSubscription();

  if (!hasValidSub && tier !== 'free') {
    // Downgrade to free features if subscription invalid
    return getFeaturesForTier('free');
  }

  return getFeaturesForTier(tier);
};

userSchema.methods.canDownloadTier = function (requestedTier) {
  const userTier = this.subscription.tier;
  const hasValidSub = this.hasValidSubscription();

  // Free tier is always available
  if (requestedTier === 'free') return true;

  // Must have valid subscription for paid tiers
  if (!hasValidSub) return false;

  // Check tier hierarchy
  if (requestedTier === 'professional') {
    return ['professional', 'enterprise'].includes(userTier);
  }

  if (requestedTier === 'enterprise') {
    return userTier === 'enterprise';
  }

  return false;
};

// Static Methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByStripeCustomerId = function (customerId) {
  return this.findOne({ 'subscription.stripe_customer_id': customerId });
};

userSchema.statics.findByLicenseKey = function (licenseKey) {
  return this.findOne({ 'licenses.key': licenseKey });
};

// Helper function for feature mapping
function getFeaturesForTier(tier) {
  const features = {
    free: {
      ai_suggestions: false,
      voice_control: false,
      max_themes: 3,
      plugin_development: false,
      team_features: false,
      advanced_security: false,
      priority_support: false,
      performance_analytics: false,
    },
    professional: {
      ai_suggestions: true,
      voice_control: true,
      max_themes: 'unlimited',
      plugin_development: true,
      team_features: true,
      advanced_security: true,
      priority_support: 'email',
      performance_analytics: true,
      sso_integration: false,
      on_premise: false,
    },
    enterprise: {
      ai_suggestions: true,
      voice_control: true,
      max_themes: 'unlimited',
      plugin_development: true,
      team_features: true,
      advanced_security: true,
      priority_support: 'dedicated',
      performance_analytics: true,
      sso_integration: true,
      on_premise: true,
      custom_integrations: true,
      compliance_features: true,
    },
  };

  return features[tier] || features.free;
}

module.exports = mongoose.model('User', userSchema);
