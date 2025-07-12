/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}',
    './public/**/*.html',
    './*.html',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        // Terminal-specific colors
        'terminal-bg': '#1a1a1a',
        'terminal-fg': '#ffffff',
        'terminal-green': '#00ff00',
        'terminal-blue': '#0080ff',
        'terminal-red': '#ff0000',
        'terminal-yellow': '#ffff00',
        'terminal-cyan': '#00ffff',
        'terminal-magenta': '#ff00ff',
        // RinaWarp brand colors
        'rinawarp-primary': '#6366f1',
        'rinawarp-secondary': '#8b5cf6',
        'rinawarp-accent': '#06b6d4',
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        terminal: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        blink: 'blink 1s linear infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
