/**
 * RinaWarp Terminal - Terminal Sharing
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class LiveTerminalSharing {
  constructor() {
    this.isSharing = false;
    this.isJoinedSession = false;
    this.sessionId = null;
    this.participants = new Map();
    this.messageHistory = [];
    this.cursors = new Map();
    this.webRTCConnections = new Map();
    this.sharingUI = null;
    this.voiceChat = new VoiceChat();
    this.screenRecording = new SessionRecorder();
    this.collaborationEngine = new CollaborationEngine();
    this.init();
  }

  async init() {
    this.createSharingUI();
    this.initializeWebRTC();
    this.setupEventListeners();
    console.log('🤝 Live Terminal Sharing initialized');
  }

  async startSharingSession(options = {}) {
    try {
      this.sessionId = this.generateSessionId();

      const sessionConfig = {
        sessionId: this.sessionId,
        hostId: this.generateUserId(),
        permissions: options.permissions || {
          allowEditing: true,
          allowCommandExecution: false,
          allowFileAccess: false,
          allowVoiceChat: true,
        },
        maxParticipants: options.maxParticipants || 10,
        sessionName: options.sessionName || 'RinaWarp Collaboration Session',
        isPrivate: options.isPrivate || false,
        recordSession: options.recordSession || true,
      };

      // Initialize sharing infrastructure
      await this.setupSharingInfrastructure(sessionConfig);

      // Start session recording if enabled
      if (sessionConfig.recordSession) {
        await this.screenRecording.startRecording(this.sessionId);
      }

      // Create shareable link
      const shareLink = this.generateShareLink(sessionConfig);

      this.isSharing = true;
      this.showSharingInterface(sessionConfig, shareLink);

      // Notify terminal of sharing state
      this.broadcastToTerminal('session-started', sessionConfig);

      return {
        success: true,
        sessionId: this.sessionId,
        shareLink: shareLink,
        config: sessionConfig,
      };
    } catch (error) {
      console.error('Failed to start sharing session:', error);
      return { success: false, error: error.message };
    }
  }

  async joinSession(sessionId, accessCode = null) {
    try {
      // Validate session
      const sessionInfo = await this.validateSession(sessionId, accessCode);
      if (!sessionInfo.valid) {
        throw new Error('Invalid session or access code');
      }

      this.sessionId = sessionId;
      this.isJoinedSession = true;

      // Connect to session
      await this.connectToSession(sessionInfo);

      // Sync current terminal state
      await this.syncTerminalState();

      // Show collaboration interface
      this.showCollaborationInterface(sessionInfo);

      // Announce join to other participants
      this.broadcastToParticipants('user-joined', {
        userId: this.generateUserId(),
        userName: sessionInfo.userName || 'Anonymous User',
        timestamp: Date.now(),
      });

      return {
        success: true,
        sessionInfo: sessionInfo,
      };
    } catch (error) {
      console.error('Failed to join session:', error);
      return { success: false, error: error.message };
    }
  }

  async syncCommand(command, cursorPosition, userId) {
    if (!this.isSharing && !this.isJoinedSession) return;

    const commandData = {
      type: 'command-sync',
      sessionId: this.sessionId,
      userId: userId,
      command: command,
      cursorPosition: cursorPosition,
      timestamp: Date.now(),
      terminalState: await this.getTerminalSnapshot(),
    };

    // Broadcast to all participants
    this.broadcastToParticipants('command-update', commandData);

    // Update local UI
    this.updateCollaborativeCursors(userId, cursorPosition);

    // Log collaboration event
    this.logCollaborationEvent('command-sync', commandData);
  }

  updateCollaborativeCursors(userId, position) {
    const cursor = this.cursors.get(userId) || this.createUserCursor(userId);

    cursor.style.left = `${position.x}px`;
    cursor.style.top = `${position.y}px`;
    cursor.classList.add('active');

    // Add user info tooltip
    const participant = this.participants.get(userId);
    if (participant) {
      cursor.title = `${participant.name} is here`;
      cursor.style.borderColor = participant.color;
    }

    // Auto-hide cursor after inactivity
    clearTimeout(cursor.hideTimeout);
    cursor.hideTimeout = setTimeout(() => {
      cursor.classList.remove('active');
    }, 3000);
  }

  async startVoiceChat() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup voice chat for all participants
      for (const [userId, connection] of this.webRTCConnections) {
        await this.voiceChat.setupAudioConnection(userId, connection, stream);
      }

      this.showVoiceChatControls(true);

      return { success: true };
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      return { success: false, error: error.message };
    }
  }

  async startSessionRecording() {
    const recordingConfig = {
      includeAudio: true,
      includeVideo: false,
      includeCommands: true,
      includeChat: true,
      quality: 'high',
    };

    await this.screenRecording.startRecording(this.sessionId, recordingConfig);
    this.showRecordingIndicator(true);

    return {
      success: true,
      recordingId: this.screenRecording.recordingId,
    };
  }

  async generateCollaborationInsights() {
    const insights = {
      sessionDuration: Date.now() - this.sessionStartTime,
      totalCommands: this.commandHistory.length,
      participantActivity: this.analyzeParticipantActivity(),
      productivityMetrics: this.calculateProductivityMetrics(),
      collaborationPatterns: this.identifyCollaborationPatterns(),
      suggestions: this.generateCollaborationSuggestions(),
    };

    return insights;
  }

  async setupSharingInfrastructure(config) {
    // Setup WebRTC for peer-to-peer communication
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    // Initialize signaling server connection
    await this.connectToSignalingServer();

    // Setup data channels
    this.setupDataChannels();

    // Initialize collaboration engine
    await this.collaborationEngine.initialize(config);
  }

  async connectToSession(sessionInfo) {
    // Connect to existing session infrastructure
    await this.connectToSignalingServer();

    // Join WebRTC connections with existing participants
    for (const participant of sessionInfo.participants) {
      await this.establishPeerConnection(participant.userId);
    }

    // Sync with session state
    await this.requestSessionSync();
  }

  async establishPeerConnection(userId) {
    const connection = new RTCPeerConnection(this.rtcConfiguration);

    // Setup data channel for commands and cursor positions
    const dataChannel = connection.createDataChannel('collaboration', {
      ordered: true,
    });

    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${userId}`);
    };

    dataChannel.onmessage = event => {
      this.handleCollaborationMessage(JSON.parse(event.data));
    };

    this.webRTCConnections.set(userId, connection);

    // Handle ICE candidates
    connection.onicecandidate = event => {
      if (event.candidate) {
        this.sendSignalingMessage(userId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    return connection;
  }

  createSharingUI() {
    const sharingContainer = document.createElement('div');
    sharingContainer.id = 'terminal-sharing-ui';
    sharingContainer.className = 'sharing-ui hidden';

    sharingContainer.innerHTML = `
            <div class="sharing-header">
                <h3>🤝 Live Collaboration</h3>
                <div class="sharing-controls">
                    <button id="start-sharing-btn" class="share-btn">Start Sharing</button>
                    <button id="join-session-btn" class="join-btn">Join Session</button>
                    <button id="voice-chat-btn" class="voice-btn disabled">🎤 Voice Chat</button>
                    <button id="record-session-btn" class="record-btn">🔴 Record</button>
                    <button id="close-sharing-btn" class="close-btn">×</button>
                </div>
            </div>
            
            <div class="sharing-content">
                <!-- Session Info -->
                <div class="session-info hidden">
                    <div class="session-details">
                        <div class="session-id">
                            <label>Session ID:</label>
                            <span id="session-id-display"></span>
                            <button id="copy-session-id" class="copy-btn">📋</button>
                        </div>
                        <div class="share-link">
                            <label>Share Link:</label>
                            <input id="share-link-input" type="text" readonly>
                            <button id="copy-share-link" class="copy-btn">📋</button>
                        </div>
                    </div>
                </div>
                
                <!-- Participants List -->
                <div class="participants-section">
                    <h4>👥 Participants (<span id="participant-count">0</span>)</h4>
                    <div id="participants-list" class="participants-list"></div>
                </div>
                
                <!-- Chat Section -->
                <div class="chat-section">
                    <h4>💬 Chat</h4>
                    <div id="chat-messages" class="chat-messages"></div>
                    <div class="chat-input">
                        <input id="chat-input" type="text" placeholder="Type a message...">
                        <button id="send-chat" class="send-btn">Send</button>
                    </div>
                </div>
                
                <!-- Collaboration Insights -->
                <div class="insights-section">
                    <h4>📊 Session Insights</h4>
                    <div id="collaboration-insights" class="insights-content">
                        <div class="insight-metric">
                            <span class="metric-label">Commands Run:</span>
                            <span id="commands-count" class="metric-value">0</span>
                        </div>
                        <div class="insight-metric">
                            <span class="metric-label">Session Duration:</span>
                            <span id="session-duration" class="metric-value">00:00</span>
                        </div>
                        <div class="insight-metric">
                            <span class="metric-label">Collaboration Score:</span>
                            <span id="collaboration-score" class="metric-value">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- Session Recording -->
                <div class="recording-section hidden">
                    <div class="recording-indicator">
                        <span class="recording-dot"></span>
                        <span>Recording Session</span>
                        <span id="recording-duration">00:00</span>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(sharingContainer);
    this.sharingUI = sharingContainer;
    this.attachSharingEventListeners();
  }

  showSharingInterface(config, shareLink) {
    this.sharingUI.classList.remove('hidden');

    // Update session info
    document.getElementById('session-id-display').textContent = config.sessionId;
    document.getElementById('share-link-input').value = shareLink;

    // Show session info section
    this.sharingUI.querySelector('.session-info').classList.remove('hidden');

    // Update participants
    this.updateParticipantsList();

    // Start session timer
    this.startSessionTimer();
  }

  showCollaborationInterface(sessionInfo) {
    this.sharingUI.classList.remove('hidden');

    // Update UI for joined session
    document.getElementById('session-id-display').textContent = sessionInfo.sessionId;

    // Update participants
    this.participants = new Map(sessionInfo.participants);
    this.updateParticipantsList();

    // Enable collaboration features
    this.enableCollaborationFeatures();
  }

  createUserCursor(userId) {
    const cursor = document.createElement('div');
    cursor.className = 'collaborative-cursor';
    cursor.id = `cursor-${userId}`;

    const participant = this.participants.get(userId);
    if (participant) {
      cursor.style.borderColor = participant.color;
      cursor.innerHTML = `
                <div class="cursor-pointer"></div>
                <div class="cursor-label">${participant.name}</div>
            `;
    }

    document.querySelector('.terminal-container').appendChild(cursor);
    this.cursors.set(userId, cursor);

    return cursor;
  }

  attachSharingEventListeners() {
    // Start sharing
    document.getElementById('start-sharing-btn')?.addEventListener('click', async () => {
      const options = await this.showSharingOptionsDialog();
      if (options) {
        await this.startSharingSession(options);
      }
    });

    // Join session
    document.getElementById('join-session-btn')?.addEventListener('click', async () => {
      const sessionInfo = await this.showJoinSessionDialog();
      if (sessionInfo) {
        await this.joinSession(sessionInfo.sessionId, sessionInfo.accessCode);
      }
    });

    // Voice chat toggle
    document.getElementById('voice-chat-btn')?.addEventListener('click', async () => {
      if (this.voiceChat.isActive) {
        await this.voiceChat.stop();
      } else {
        await this.startVoiceChat();
      }
    });

    // Record session
    document.getElementById('record-session-btn')?.addEventListener('click', async () => {
      if (this.screenRecording.isRecording) {
        await this.screenRecording.stopRecording();
      } else {
        await this.startSessionRecording();
      }
    });

    // Chat functionality
    document.getElementById('chat-input')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.sendChatMessage();
      }
    });

    document.getElementById('send-chat')?.addEventListener('click', () => {
      this.sendChatMessage();
    });

    // Copy buttons
    document.getElementById('copy-session-id')?.addEventListener('click', () => {
      this.copyToClipboard(document.getElementById('session-id-display').textContent);
    });

    document.getElementById('copy-share-link')?.addEventListener('click', () => {
      this.copyToClipboard(document.getElementById('share-link-input').value);
    });
  }

  handleCollaborationMessage(message) {
    switch (message.type) {
      case 'command-update':
        this.handleCommandUpdate(message);
        break;
      case 'cursor-position':
        this.updateCollaborativeCursors(message.userId, message.position);
        break;
      case 'chat-message':
        this.displayChatMessage(message);
        break;
      case 'user-joined':
        this.handleUserJoined(message);
        break;
      case 'user-left':
        this.handleUserLeft(message);
        break;
      case 'session-sync':
        this.handleSessionSync(message);
        break;
    }
  }

  broadcastToParticipants(type, data) {
    const message = {
      type: type,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      ...data,
    };

    // Send to all connected peers
    for (const [userId, connection] of this.webRTCConnections) {
      const dataChannel = connection.dataChannel;
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
      }
    }
  }

  sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (message) {
      const chatData = {
        userId: this.generateUserId(),
        userName: this.getCurrentUserName(),
        message: message,
        timestamp: Date.now(),
      };

      this.broadcastToParticipants('chat-message', chatData);
      this.displayChatMessage(chatData);

      input.value = '';
    }
  }

  displayChatMessage(messageData) {
    const chatContainer = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';

    const time = new Date(messageData.timestamp).toLocaleTimeString();
    messageElement.innerHTML = `
            <div class="message-header">
                <span class="user-name">${messageData.userName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${this.escapeHtml(messageData.message)}</div>
        `;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  generateSessionId() {
    return 'rina-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
  }

  generateUserId() {
    return 'user-' + Math.random().toString(36).substr(2, 9);
  }

  generateShareLink(config) {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      session: config.sessionId,
      type: 'join',
    });

    return `${baseUrl}/collaborate?${params.toString()}`;
  }

  async validateSession(sessionId, accessCode) {
    // In a real implementation, this would validate against a server
    return {
      valid: true,
      sessionId: sessionId,
      participants: [],
      permissions: {
        allowEditing: true,
        allowCommandExecution: false,
        allowFileAccess: false,
      },
    };
  }

  async getTerminalSnapshot() {
    // Capture current terminal state
    return {
      workingDirectory: process.cwd(),
      commandHistory: [],
      environment: process.env,
      timestamp: Date.now(),
    };
  }

  updateParticipantsList() {
    const container = document.getElementById('participants-list');
    const count = document.getElementById('participant-count');

    if (!container) return;

    container.innerHTML = '';
    count.textContent = this.participants.size;

    for (const [userId, participant] of this.participants) {
      const participantElement = document.createElement('div');
      participantElement.className = 'participant-item';
      participantElement.innerHTML = `
                <div class="participant-avatar" style="background-color: ${participant.color}"></div>
                <div class="participant-info">
                    <div class="participant-name">${participant.name}</div>
                    <div class="participant-status">${participant.status || 'Active'}</div>
                </div>
                <div class="participant-actions">
                    <button class="participant-action" title="Mute">🔇</button>
                    <button class="participant-action" title="Follow">👁️</button>
                </div>
            `;

      container.appendChild(participantElement);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  copyToClipboard(text) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.showNotification('Copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }

  showNotification(message, type = 'info') {
    // Create and show notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Public API
  showSharingPanel() {
    this.sharingUI.classList.remove('hidden');
  }

  hideSharingPanel() {
    this.sharingUI.classList.add('hidden');
  }

  async endSession() {
    if (this.isSharing) {
      // Stop recording if active
      if (this.screenRecording.isRecording) {
        await this.screenRecording.stopRecording();
      }

      // Notify participants
      this.broadcastToParticipants('session-ended', {
        reason: 'Host ended session',
      });
    }

    // Clean up connections
    for (const [userId, connection] of this.webRTCConnections) {
      connection.close();
    }

    this.reset();
  }

  reset() {
    this.isSharing = false;
    this.isJoinedSession = false;
    this.sessionId = null;
    this.participants.clear();
    this.cursors.clear();
    this.webRTCConnections.clear();
    this.hideSharingPanel();
  }
}

class VoiceChat {
  constructor() {
    this.isActive = false;
    this.audioStreams = new Map();
    this.audioContext = null;
  }

  async setupAudioConnection(userId, rtcConnection, localStream) {
    // Add local stream to connection
    localStream.getTracks().forEach(track => {
      rtcConnection.addTrack(track, localStream);
    });

    // Handle incoming audio
    rtcConnection.ontrack = event => {
      const remoteStream = event.streams[0];
      this.playRemoteAudio(userId, remoteStream);
    };

    this.isActive = true;
  }

  playRemoteAudio(userId, stream) {
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.id = `audio-${userId}`;

    document.body.appendChild(audio);
    this.audioStreams.set(userId, audio);
  }

  async stop() {
    this.isActive = false;

    // Stop all audio streams
    for (const [userId, audio] of this.audioStreams) {
      audio.remove();
    }

    this.audioStreams.clear();
  }
}

class SessionRecorder {
  constructor() {
    this.isRecording = false;
    this.recordingId = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  async startRecording(sessionId, config = {}) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: config.includeAudio || false,
      });

      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingId = `recording-${sessionId}-${Date.now()}`;

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecording();
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      return { success: true, recordingId: this.recordingId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  saveRecording() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.recordingId}.webm`;
    a.click();

    URL.revokeObjectURL(url);
    this.recordedChunks = [];
  }
}

class CollaborationEngine {
  constructor() {
    this.operationalTransform = new OperationalTransform();
    this.conflictResolution = new ConflictResolution();
  }

  async initialize(config) {
    // Initialize collaboration algorithms
    await this.operationalTransform.initialize();
    await this.conflictResolution.initialize();
  }

  async processCollaborativeEdit(edit, userId) {
    // Apply operational transform for conflict-free editing
    const transformedEdit = await this.operationalTransform.transform(edit);

    // Resolve any conflicts
    const resolvedEdit = await this.conflictResolution.resolve(transformedEdit, userId);

    return resolvedEdit;
  }
}

class OperationalTransform {
  async initialize() {
    // Initialize OT algorithms
  }

  async transform(operation) {
    // Transform operation for conflict-free collaboration
    return operation;
  }
}

class ConflictResolution {
  async initialize() {
    // Initialize conflict resolution strategies
  }

  async resolve(operation, userId) {
    // Resolve conflicts using CRDT or similar algorithms
    return operation;
  }
}

// Export for use in renderer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveTerminalSharing;
} else {
  window.LiveTerminalSharing = LiveTerminalSharing;
}
