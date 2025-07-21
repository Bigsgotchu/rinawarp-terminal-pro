# ElevenLabs Voice Provider with Enhanced Fallback Mechanisms

This enhanced voice provider integrates ElevenLabs AI voice synthesis with comprehensive error handling, retry logic, and multiple fallback systems to ensure reliable voice functionality even when the ElevenLabs API is unavailable.

## 🎯 Key Features

### ✅ Enhanced Error Handling
- **API Health Monitoring**: Continuous monitoring of ElevenLabs API availability
- **Error Categorization**: Intelligent classification of errors (network, auth, rate limit, etc.)
- **Comprehensive Logging**: Integration with centralized logging and error triage systems
- **Graceful Degradation**: Seamless fallback without disrupting user experience

### ✅ Retry Logic with Exponential Backoff
- **Smart Retries**: Automatic retry for recoverable errors with exponential backoff
- **Jitter Implementation**: Prevents thundering herd problems
- **Configurable Limits**: Customizable retry counts and delays
- **Request Caching**: Caches failed requests to avoid immediate retries

### ✅ Multiple Fallback Systems
- **Browser Speech Synthesis**: Native browser text-to-speech as primary fallback
- **Rina Voice Clips**: Pre-recorded voice clips for character responses
- **Smart Fallback Selection**: Intelligent choice of best available fallback

### ✅ Performance Optimization
- **Enhanced Caching**: Multi-level caching with expiration and LRU eviction
- **Request Queuing**: Priority-based request processing with rate limiting
- **Cache Analytics**: Detailed metrics on cache hit rates and performance

## 🚀 Quick Start

```javascript
import ElevenLabsVoiceProvider from './elevenlabs-voice-provider.js';

// Initialize with enhanced fallback configuration
const voiceProvider = new ElevenLabsVoiceProvider({
  fallbackEnabled: true,
  maxCacheSize: 50,
  fallbackConfig: {
    enableRetry: true,
    maxRetries: 3,
    retryBaseDelay: 1000,
    retryMaxDelay: 8000,
    fallbackToSynthesis: true,
    fallbackToRinaClips: true,
    enableConnectionHealth: true,
    healthCheckInterval: 30000,
    cacheFailedRequests: true
  }
});

// Initialize with API key
await voiceProvider.initialize('your-elevenlabs-api-key');

// Use enhanced speak method with comprehensive fallback
await voiceProvider.speakWithFallback('Hello from Rina!', {
  mood: 'confident',
  priority: 'high',
  onFallback: (fallbackType) => {
    console.log(`Using fallback: ${fallbackType}`);
  }
});
```

## 🛠️ Configuration Options

### Fallback Configuration

```javascript
const fallbackConfig = {
  // Retry settings
  enableRetry: true,           // Enable automatic retries
  maxRetries: 3,              // Maximum number of retry attempts
  retryBaseDelay: 1000,       // Base delay for exponential backoff (ms)
  retryMaxDelay: 10000,       // Maximum retry delay (ms)
  
  // Fallback systems
  fallbackToSynthesis: true,   // Enable browser synthesis fallback
  fallbackToRinaClips: true,   // Enable Rina clips fallback
  
  // Health monitoring
  enableConnectionHealth: true, // Enable API health monitoring
  healthCheckInterval: 30000,   // Health check interval (ms)
  
  // Performance
  cacheFailedRequests: true    // Cache failed requests to avoid retries
};
```

### Voice Configuration

```javascript
const voiceConfig = {
  voiceId: 'your-voice-id',
  model: 'eleven_monolingual_v1',
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.0,
  useSpeakerBoost: true,
  optimizeStreamingLatency: 0,
  outputFormat: 'mp3_44100_128'
};
```

## 📊 Monitoring and Metrics

### Health Status Monitoring

```javascript
const status = voiceProvider.getStatus();
console.log('API Health:', status.apiHealth);
console.log('Fallback Systems:', status.fallbackSystems);
console.log('Performance Metrics:', status.metrics);
```

### Performance Metrics

The provider tracks comprehensive metrics:

- **Request Statistics**: Total, successful, and failed requests
- **Cache Performance**: Hit rates and cache sizes
- **API Health**: Response times and availability
- **Fallback Usage**: Frequency of fallback system usage
- **Error Breakdown**: Categorized error counts

## 🔄 Fallback Hierarchy

The system uses a smart fallback hierarchy:

1. **Primary**: ElevenLabs API with retry logic
2. **Secondary**: Rina Voice Clips (for character responses)
3. **Tertiary**: Browser Speech Synthesis
4. **Final**: Silent failure with error logging

## 🎭 Mood-Aware Voice Modulation

The provider supports mood-aware voice settings that work across all systems:

```javascript
// Set global mood
voiceProvider.setMood('confident');

// Speak with specific mood
await voiceProvider.speakWithFallback('Hello!', {
  mood: 'excited',
  volume: 0.8
});
```

### Supported Moods

- `confident` - Assertive, clear delivery
- `neutral` - Balanced, natural tone
- `uncertain` - Tentative, questioning tone
- `frustrated` - Slightly agitated tone
- `confused` - Puzzled, seeking tone
- `excited` - Energetic, enthusiastic
- `focused` - Concentrated, deliberate
- `curious` - Inquisitive, interested
- `overwhelmed` - Stressed, busy tone

## 🔧 Integration Examples

### Full Integration Manager

```javascript
import ElevenLabsIntegrationManager from './elevenlabs-integration-example.js';

const manager = new ElevenLabsIntegrationManager();
await manager.initialize('your-api-key');

// Use enhanced speak with fallback
await manager.speakWithFallback('Command completed!', {
  mood: 'satisfied',
  priority: 'normal',
  onFallback: (type) => console.log(`Fallback used: ${type}`)
});

// Get comprehensive status
const status = manager.getStatus();
console.log('System Health:', status.healthSummary);
```

### Error Handling Integration

The provider integrates with the centralized error triage system:

```javascript
// Errors are automatically triaged and logged
// No additional code needed for basic error handling

// Custom error handling
await voiceProvider.speakWithFallback('Hello!', {
  onError: (error) => {
    console.error('Speech failed completely:', error);
    // Custom error handling logic
  }
});
```

### Event System Integration

```javascript
// Listen for fallback events
window.addEventListener('elevenlabs-fallback-used', (event) => {
  const { fallbackType, text } = event.detail;
  showUserNotification(`Using ${fallbackType} for: ${text}`);
});

// Listen for mood changes
window.addEventListener('elevenlabs-mood-change', (event) => {
  const { mood } = event.detail;
  updateUIForMood(mood);
});
```

## 🧪 Testing Fallback Systems

```javascript
// Test all fallback systems
await manager.testFallbackSystems();

// Test specific scenarios
await voiceProvider.speakWithFallback('Test message', {
  mood: 'neutral',
  onFallback: (type) => console.log(`Tested fallback: ${type}`)
});
```

## 📈 Performance Tips

1. **Enable Caching**: Use caching for repeated phrases
2. **Monitor Health**: Regular health checks prevent failures
3. **Smart Retries**: Configure appropriate retry limits
4. **Fallback Preparation**: Ensure Rina clips are loaded
5. **Error Logging**: Monitor error patterns for optimization

## 🔒 Error Recovery

The system includes automatic error recovery:

- **API Recovery**: Automatic reconnection when API becomes available
- **Cache Cleanup**: Automatic cleanup of expired cache entries
- **Health Restoration**: Health status restoration after successful requests
- **Graceful Degradation**: Seamless switching between systems

## 📝 Logging Integration

All errors and events are logged through the centralized logging system:

- **Debug Logs**: Detailed operation logs in development
- **Info Logs**: System state changes and health updates
- **Warning Logs**: Fallback usage and recoverable errors
- **Error Logs**: Critical failures with full context

## 🎯 Best Practices

1. **Always Enable Fallbacks**: Never disable fallback systems in production
2. **Monitor Metrics**: Regular monitoring prevents issues
3. **Configure Retries**: Set appropriate retry limits for your use case
4. **Cache Management**: Configure cache sizes based on usage patterns
5. **Health Monitoring**: Use health checks to prevent user-facing failures
6. **Error Handling**: Implement custom error handlers for critical operations

## 🔍 Troubleshooting

### Common Issues

1. **API Key Issues**: Check API key validity and permissions
2. **Network Failures**: Verify network connectivity
3. **Rate Limiting**: Monitor API usage and implement proper delays
4. **Cache Issues**: Check cache size and expiration settings
5. **Fallback Failures**: Ensure browser supports speech synthesis

### Debug Mode

Enable debug logging for detailed troubleshooting:

```javascript
// Set LOG_LEVEL environment variable
process.env.LOG_LEVEL = 'debug';

// Or enable debug in development
const voiceProvider = new ElevenLabsVoiceProvider({
  debug: true
});
```

## 📊 Metrics Dashboard

The system provides comprehensive metrics for monitoring:

```javascript
const metrics = manager.getPerformanceMetrics();
console.log('Cache Hit Rate:', metrics.cacheStats.cacheHitRate);
console.log('Fallback Usage:', metrics.fallbackStats.fallbackUsageRate);
console.log('API Health:', metrics.apiHealth);
```

This enhanced ElevenLabs Voice Provider ensures reliable voice functionality with comprehensive fallback mechanisms, intelligent error handling, and detailed monitoring capabilities.
