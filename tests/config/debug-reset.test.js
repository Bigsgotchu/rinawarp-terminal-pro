const { UnifiedConfig } = require('../../src/config/unified-config.cjs');
const fs = require('fs');
const os = require('os');

// Mock modules
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home')
}));
jest.mock('child_process', () => ({
  execSync: jest.fn(() => {
    throw new Error('Command not found');
  })
}));

describe('Debug Reset Test', () => {
  test('should properly reset config', () => {
    // Setup mocks
    os.homedir = jest.fn().mockReturnValue('/mock/home');
    process.env.SHELL = '/bin/bash';
    
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    
    const config = new UnifiedConfig();
    
    // Check initial state
    console.log('Initial elevenlabs.enabled:', config.get('elevenlabs.enabled'));
    console.log('Default elevenlabs.enabled:', config.defaultConfig.elevenlabs.enabled);
    
    // Modify
    config.set('elevenlabs.enabled', true);
    console.log('After set elevenlabs.enabled:', config.get('elevenlabs.enabled'));
    
    // Reset
    config.reset();
    console.log('After reset elevenlabs.enabled:', config.get('elevenlabs.enabled'));
    console.log('Config after reset:', JSON.stringify(config.config.elevenlabs, null, 2));
    console.log('DefaultConfig:', JSON.stringify(config.defaultConfig.elevenlabs, null, 2));
    
    expect(config.get('elevenlabs.enabled')).toBe(false);
  });
});
