// Simple voice test script
// Run this in the browser console to test voice functionality

console.log('🎤 Testing Voice Engine...');

// Check if voice engine is available
if (window.voiceEngine) {
  console.log('✅ Voice Engine found!');
  console.log('Status:', window.voiceEngine.getStatus());

  // Test basic TTS
  try {
    window.voiceEngine.enable();
    window.voiceEngine.speak('Hello! This is a test of the voice engine.', {
      type: 'notification',
      interrupt: true,
    });
    console.log('✅ Voice test completed');
  } catch (error) {
    console.error('❌ Voice test failed:', error);
  }
} else {
  console.log('❌ Voice Engine not found');
  console.log(
    'Available on window:',
    Object.keys(window).filter(k => k.includes('voice'))
  );
}

// Check if voice control UI is available
if (window.voiceControlUI) {
  console.log('✅ Voice Control UI found!');

  // Test opening voice recording modal
  try {
    // Uncomment the line below to test the recording modal
    // window.voiceControlUI.showVoiceRecordingModal();
    console.log('✅ Voice Control UI is working');
  } catch (error) {
    console.error('❌ Voice Control UI test failed:', error);
  }
} else {
  console.log('❌ Voice Control UI not found');
}

// Check Web Speech API support
if ('speechSynthesis' in window) {
  console.log('✅ Browser supports Speech Synthesis');
  console.log('Available voices:', speechSynthesis.getVoices().length);
} else {
  console.log('❌ Browser does not support Speech Synthesis');
}

// Check MediaDevices API for recording
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  console.log('✅ Browser supports voice recording');
} else {
  console.log('❌ Browser does not support voice recording');
}
