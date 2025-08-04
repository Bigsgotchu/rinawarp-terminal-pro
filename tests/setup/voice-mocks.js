// tests/setup/voice-mocks.js

global.window = global.window || {};
window.speechSynthesis = {
  speak: jest.fn(),
};

global.AudioContext = jest.fn().mockImplementation(() => ({
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    onended: null,
  }),
  destination: {},
}));
