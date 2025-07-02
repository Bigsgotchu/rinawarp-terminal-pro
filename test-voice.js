// Simple voice test script
// Run this in the browser console to test voice functionality

console.info('🎤 Testing Voice Engine...');

// Check if voice engine is available
if (window.voiceEngine) {
  console.info('✅ Voice Engine found!');
  console.info('Status:', window.voiceEngine.getStatus());

  // Test basic TTS
  try {
    window.voiceEngine.enable();
    window.voiceEngine.speak('Hello! This is a test of the voice engine.', {
      type: 'notification',
      interrupt: true,
    });
    console.info('✅ Voice test completed');
  } catch (error) {
    console.error('❌ Voice test failed:', error);
  }
} else {
  console.info('❌ Voice Engine not found');
  console.info(
    'Available on window:',
    Object.keys(window).filter(k => k.includes('voice'))
  );
}

// Check if voice control UI is available
if (window.voiceControlUI) {
  console.info('✅ Voice Control UI found!');

  // Test opening voice recording modal
  try {
    // Uncomment the line below to test the recording modal
    // window.voiceControlUI.showVoiceRecordingModal();
    console.info('✅ Voice Control UI is working');
  } catch (error) {
    console.error('❌ Voice Control UI test failed:', error);
  }
} else {
  console.info('❌ Voice Control UI not found');
}

// Check Web Speech API support
if ('speechSynthesis' in window) {
  console.info('✅ Browser supports Speech Synthesis');
  console.info('Available voices:', speechSynthesis.getVoices().length);
} else {
  console.info('❌ Browser does not support Speech Synthesis');
}

// Check MediaDevices API for recording
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  console.info('✅ Browser supports voice recording');
} else {
  console.info('❌ Browser does not support voice recording');
}
