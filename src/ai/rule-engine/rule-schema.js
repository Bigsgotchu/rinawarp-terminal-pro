/**
 * Rule Schema Definitions
 * Provides standardized structure for rules, conditions, and actions
 */

class Rule {
  constructor({
    id,
    name,
    description,
    priority = 0,
    category,
    condition,
    action,
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.category = category;
    this.condition = condition;
    this.action = action;
    this.metadata = metadata;
    this.createdAt = new Date();
    this.enabled = true;
  }

  /**
     * Execute the rule with given context
     * @param {Object} context - The execution context
     * @returns {boolean} - Whether the rule was executed
     */
  execute(context) {
    if (!this.enabled) return false;

    try {
      if (this.condition(context)) {
        this.action(context);
        return true;
      }
    } catch (error) {
      console.error(`Rule execution error for ${this.id}:`, error);
    }
    return false;
  }

  /**
     * Enable or disable the rule
     * @param {boolean} enabled
     */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

class Condition {
  constructor(fn, description = '') {
    if (typeof fn !== 'function') {
      throw new Error('Condition must be a function');
    }
    this.fn = fn;
    this.description = description;
  }

  /**
     * Evaluate the condition
     * @param {Object} context
     * @returns {boolean}
     */
  evaluate(context) {
    return this.fn(context);
  }

  /**
     * Combine conditions with AND logic
     * @param {Condition} other
     * @returns {Condition}
     */
  and(other) {
    return new Condition(
      (context) => this.evaluate(context) && other.evaluate(context),
      `(${this.description}) AND (${other.description})`
    );
  }

  /**
     * Combine conditions with OR logic
     * @param {Condition} other
     * @returns {Condition}
     */
  or(other) {
    return new Condition(
      (context) => this.evaluate(context) || other.evaluate(context),
      `(${this.description}) OR (${other.description})`
    );
  }

  /**
     * Negate the condition
     * @returns {Condition}
     */
  not() {
    return new Condition(
      (context) => !this.evaluate(context),
      `NOT (${this.description})`
    );
  }
}

class Action {
  constructor(fn, description = '', type = 'default') {
    if (typeof fn !== 'function') {
      throw new Error('Action must be a function');
    }
    this.fn = fn;
    this.description = description;
    this.type = type;
  }

  /**
     * Execute the action
     * @param {Object} context
     * @returns {Promise|any}
     */
  async execute(context) {
    return this.fn(context);
  }
}

// Pre-defined condition builders
const ConditionBuilders = {
  /**
     * Check if a property exists and matches a value
     */
  propertyEquals: (path, value) => new Condition(
    (context) => {
      const actual = getNestedProperty(context, path);
      return actual === value;
    },
    `${path} equals ${value}`
  ),

  /**
     * Check if a property exists
     */
  propertyExists: (path) => new Condition(
    (context) => {
      const value = getNestedProperty(context, path);
      return value !== undefined && value !== null;
    },
    `${path} exists`
  ),

  /**
     * Check if a numeric property is above threshold
     */
  threshold: (path, threshold, operator = '>=') => new Condition(
    (context) => {
      const value = getNestedProperty(context, path);
      if (typeof value !== 'number') return false;

      switch (operator) {
      case '>=': return value >= threshold;
      case '>': return value > threshold;
      case '<=': return value <= threshold;
      case '<': return value < threshold;
      case '===': return value === threshold;
      default: return false;
      }
    },
    `${path} ${operator} ${threshold}`
  ),

  /**
     * Time-based condition
     */
  timeWindow: (startHour, endHour) => new Condition(
    () => {
      const hour = new Date().getHours();
      return hour >= startHour && hour <= endHour;
    },
    `time between ${startHour}:00 and ${endHour}:00`
  )
};

// Pre-defined action builders
const ActionBuilders = {
  /**
     * Log a message
     */
  log: (message) => new Action(
    (context) => {
      console.info(`[Rule Engine] ${message}`, context);
    },
    `Log: ${message}`,
    'logging'
  ),

  /**
     * Set a property in context
     */
  setProperty: (path, value) => new Action(
    (context) => {
      setNestedProperty(context, path, value);
    },
    `Set ${path} to ${value}`,
    'mutation'
  ),

  /**
     * Increment a numeric property
     */
  increment: (path, amount = 1) => new Action(
    (context) => {
      const current = getNestedProperty(context, path) || 0;
      setNestedProperty(context, path, current + amount);
    },
    `Increment ${path} by ${amount}`,
    'mutation'
  ),

  /**
     * Emit an event
     */
  emit: (eventName, data = {}) => new Action(
    (context) => {
      if (context.eventEmitter) {
        context.eventEmitter.emit(eventName, { ...data, context });
      }
    },
    `Emit event: ${eventName}`,
    'event'
  )
};

// Utility functions
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function setNestedProperty(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

module.exports = {
  Rule,
  Condition,
  Action,
  ConditionBuilders,
  ActionBuilders
};
