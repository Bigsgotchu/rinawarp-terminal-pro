const Conf = require('conf');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = new Conf({
      projectName: 'rinawarp',
      schema: {
        cleanupPaths: {
          type: 'array',
          items: {
            type: 'string'
          },
          default: ['tmp', 'cache']
        },
        debugOverlay: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              default: 3030
            },
            refreshInterval: {
              type: 'number',
              default: 1000
            },
            enabledMetrics: {
              type: 'array',
              items: {
                type: 'string'
              },
              default: ['moduleStatus', 'performance', 'errors']
            }
          }
        },
        logging: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'debug'],
              default: 'info'
            },
            file: {
              type: 'string',
              default: 'rinawarp.log'
            }
          }
        }
      }
    });
  }

  async getConfig() {
    return this.config.store;
  }

  async getValue(key) {
    return this.config.get(key);
  }

  async setValue(key, value) {
    // Handle type conversion for numbers and booleans
    if (!isNaN(value)) {
      value = Number(value);
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    }
    
    this.config.set(key, value);
    return this.getValue(key);
  }

  async resetConfig() {
    this.config.clear();
    return this.getConfig();
  }
}

module.exports = { ConfigManager };
