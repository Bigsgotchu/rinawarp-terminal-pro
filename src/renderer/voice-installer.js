/**
 * RinaWarp Terminal - Voice Installer
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * System to permanently install creator's voice as the default RinaWarp voice
 */

export class VoiceInstaller {
  constructor() {
    this.installationPath = 'assets/voices/';
    this.creatorVoiceFile = 'creator_voice.webm';
    this.voiceManifest = 'voice_manifest.json';
  }

  async installCreatorVoice(audioBlob, voiceMetadata = {}) {
    try {
      // Check authorization
      if (!process.env.RINAWARP_CREATOR) {
        throw new Error('Unauthorized: Only creator can install permanent voice');
      }

      console.log('🎤 Installing creator voice as permanent RinaWarp voice...');

      // Create voice data package
      const voicePackage = {
        name: 'creator_voice',
        displayName: 'RinaWarp Creator Voice',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        format: 'webm',
        sampleRate: 16000,
        channelCount: 1,
        duration: voiceMetadata.duration || 0,
        checksum: await this.calculateChecksum(audioBlob),
        isDefault: true,
        isBuiltIn: true,
        description: 'Official RinaWarp Terminal voice by the creator',
      };

      // Convert to base64 for embedding
      const base64Audio = await this.blobToBase64(audioBlob);

      // Create the embedded voice module
      await this.createEmbeddedVoiceModule(base64Audio, voicePackage);

      // Update voice manifest
      await this.updateVoiceManifest(voicePackage);

      console.log('✅ Creator voice installed successfully as permanent RinaWarp voice');
      return true;
    } catch (error) {
      console.error('❌ Failed to install creator voice:', error);
      return false;
    }
  }

  async createEmbeddedVoiceModule(base64Audio, voicePackage) {
    const moduleContent = `/**
 * RinaWarp Terminal - Embedded Creator Voice
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * This module contains the embedded creator voice for RinaWarp Terminal
 * Generated on: ${new Date().toISOString()}
 */

export const CREATOR_VOICE_DATA = {
    metadata: ${JSON.stringify(voicePackage, null, 4)},
    audioData: "${base64Audio}"
};

export class EmbeddedVoiceLoader {
    static async loadCreatorVoice() {
        try {
            const binaryString = atob(CREATOR_VOICE_DATA.audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBlob = new Blob([bytes], { type: 'audio/webm' });
            
            return {
                blob: audioBlob,
                metadata: CREATOR_VOICE_DATA.metadata
            };
        } catch (error) {
            console.error('Failed to load embedded creator voice:', error);
            return null;
        }
    }
    
    static isAvailable() {
        return CREATOR_VOICE_DATA && CREATOR_VOICE_DATA.audioData;
    }
    
    static getMetadata() {
        return CREATOR_VOICE_DATA.metadata;
    }
}

// Export for global access
window.EmbeddedVoiceLoader = EmbeddedVoiceLoader;
`;

    // Save the embedded voice module
    const fs = await import('fs');
    const path = await import('path');

    const currentDir = await nodeAPI.getCurrentDir();
    const voiceModulePath = path.join(currentDir, 'src/renderer/embedded-creator-voice.js');
    fs.writeFileSync(voiceModulePath, moduleContent, 'utf8');

    console.log('📁 Embedded voice module created at:', voiceModulePath);
  }

  async updateVoiceManifest(voicePackage) {
    const fs = await import('fs');
    const path = await import('path');

    const currentDir = await nodeAPI.getCurrentDir();
    const manifestPath = path.join(currentDir, 'src/renderer/voice-manifest.json');

    let manifest = {
      version: '1.0.0',
      voices: [],
      defaultVoice: 'creator_voice',
      lastUpdated: new Date().toISOString(),
    };

    // Load existing manifest if it exists
    try {
      if (fs.existsSync(manifestPath)) {
        const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest = { ...manifest, ...existingManifest };
      }
    } catch (error) {
      console.warn('Could not load existing manifest, creating new one');
    }

    // Update with creator voice
    const existingVoiceIndex = manifest.voices.findIndex(v => v.name === 'creator_voice');
    if (existingVoiceIndex >= 0) {
      manifest.voices[existingVoiceIndex] = voicePackage;
    } else {
      manifest.voices.push(voicePackage);
    }

    manifest.defaultVoice = 'creator_voice';
    manifest.lastUpdated = new Date().toISOString();

    // Save manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('📋 Voice manifest updated');
  }

  async calculateChecksum(blob) {
    // Simple checksum calculation
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let checksum = 0;
    for (let i = 0; i < uint8Array.length; i++) {
      checksum = (checksum + uint8Array[i]) % 256;
    }
    return checksum.toString(16).padStart(2, '0');
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async createInstallationScript() {
    const scriptContent = `@echo off
echo Installing RinaWarp Creator Voice...
echo.

:: Check if we're in the right directory
if not exist "src\\renderer\\voice-engine.js" (
    echo Error: Please run this script from the RinaWarp Terminal root directory
    pause
    exit /b 1
)

:: Set creator environment variable
set RINAWARP_CREATOR=true

echo Starting RinaWarp Terminal for voice recording...
echo.
echo Instructions:
echo 1. The terminal will open with voice recording enabled
echo 2. Press Ctrl+Shift+R to start recording your voice
echo 3. Read the provided text clearly
echo 4. Save your recording as "creator_voice"
echo 5. Your voice will be permanently installed as RinaWarp's voice
echo.

npm start

echo.
echo Voice installation complete!
pause
`;

    const fs = await import('fs');
    const path = await import('path');

    const currentDir = await nodeAPI.getCurrentDir();
    const scriptPath = path.join(currentDir, 'install-creator-voice.bat');
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');

    console.log('📜 Voice installation script created:', scriptPath);
  }
}

// Export for use
window.VoiceInstaller = VoiceInstaller;
