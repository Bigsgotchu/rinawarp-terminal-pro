// Voice System Index - Exports for integration tests
import { RinaVoiceSystem } from './rina-voice-system.js';
import { EnhancedVoiceEngine } from './enhanced-voice-engine.js';

// Create singleton instances
const rinaVoiceSystem = new RinaVoiceSystem();
const voiceEngine = new EnhancedVoiceEngine();

// Mock implementation of runVoiceCommand for tests
export async function runVoiceCommand(command) {
  // Simulate processing a voice command
  switch (command.toLowerCase()) {
  case 'list files':
    return 'List of files...';
  case 'how is the weather today?':
    return 'The weather is sunny with a high of 75°F.';
  case 'remind me to call john at 3 pm':
    return 'Reminder set for 3 PM to call John.';
  default:
    // For other commands, just echo back
    return `Executing: ${command}`;
  }
}

// Export voice system components
export { RinaVoiceSystem, EnhancedVoiceEngine, rinaVoiceSystem, voiceEngine };
