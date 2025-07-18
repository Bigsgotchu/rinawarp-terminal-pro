import { useState, useEffect, useRef } from 'react';

const useVoiceRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser');
      return;
    }

    setIsSupported(true);
    
    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Configuration
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setListening(true);
      setError('');
      setTranscript('');
      setInterimTranscript('');
      console.log('🎙️ Voice recognition started');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimTranscript(interimTranscript);
      
      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        console.log('🎙️ Voice recognition result:', finalTranscript);
      }

      // Reset silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      // Auto-stop after 3 seconds of silence
      silenceTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && listening) {
          recognition.stop();
        }
      }, 3000);
    };

    recognition.onerror = (event) => {
      console.error('🎙️ Voice recognition error:', event.error);
      setError(`Voice recognition error: ${event.error}`);
      setListening(false);
      
      // Handle specific errors
      switch (event.error) {
      case 'no-speech':
        setError('No speech detected. Please try again.');
        break;
      case 'audio-capture':
        setError('Audio capture failed. Check microphone permissions.');
        break;
      case 'not-allowed':
        setError('Microphone access denied. Please allow microphone access.');
        break;
      case 'network':
        setError('Network error. Please check your internet connection.');
        break;
      default:
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
      console.log('🎙️ Voice recognition ended');
      
      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startListening = () => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    if (recognitionRef.current && !listening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        setError('Failed to start voice recognition');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError('');
  };

  // Voice command processing
  const processVoiceCommand = (command) => {
    const lowerCommand = command.toLowerCase();
    
    // Common voice command patterns
    const patterns = {
      help: /^(help|show help|what can you do|hey rina)/i,
      clear: /^(clear|clear screen|clean)/i,
      list: /^(list|ls|show files|list files)/i,
      git: /^(git|show git|check git|git status)/i,
      directory: /^(where am i|current directory|pwd)/i,
      home: /^(go home|home directory|cd home)/i,
      back: /^(go back|back|previous|cd back)/i,
      theme: /^(change theme|switch theme|dark mode|light mode)/i,
      voice: /^(stop listening|stop voice|turn off voice)/i
    };

    // Match patterns and return structured command
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerCommand)) {
        return {
          type,
          command: lowerCommand,
          action: getActionForType(type, lowerCommand)
        };
      }
    }

    // Default: treat as direct command
    return {
      type: 'direct',
      command: lowerCommand,
      action: lowerCommand
    };
  };

  const getActionForType = (type, command) => {
    switch (type) {
    case 'help':
      return 'help';
    case 'clear':
      return 'clear';
    case 'list':
      return 'ls -la';
    case 'git':
      return 'git status';
    case 'directory':
      return 'pwd';
    case 'home':
      return 'cd ~';
    case 'back':
      return 'cd ..';
    case 'theme':
      return command.includes('dark') ? 'theme:dark' : 'theme:light';
    case 'voice':
      return 'voice:stop';
    default:
      return command;
    }
  };

  return {
    transcript,
    interimTranscript,
    listening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    processVoiceCommand
  };
};

export default useVoiceRecognition;
