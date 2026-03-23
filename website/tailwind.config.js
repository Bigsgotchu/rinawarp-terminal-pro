/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#e5e5e5',
        primary: {
          DEFAULT: '#00d4ff', // Bright cyan
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#ff0080', // Hot pink/magenta
          foreground: '#000000',
        },
        accent: {
          cyan: '#00d4ff',
          teal: '#00e5cc',
          pink: '#ff0080',
          magenta: '#ff1493',
          orange: '#ff8800',
        },
        muted: {
          DEFAULT: '#1a1a1a',
          foreground: '#888',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Fira Sans', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-pink-cyan': 'linear-gradient(135deg, #ff0080 0%, #ff8800 25%, #00e5cc 75%, #00d4ff 100%)',
        'gradient-infinity': 'linear-gradient(90deg, #ff1493 0%, #ff8800 50%, #00d4ff 100%)',
        'neon-glow-pink': 'radial-gradient(circle, #ff0080 0%, transparent 70%)',
        'neon-glow-cyan': 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
      },
      boxShadow: {
        'neon-pink': '0 0 20px rgba(255, 0, 128, 0.6), 0 0 40px rgba(255, 0, 128, 0.3)',
        'neon-cyan': '0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.3)',
        'neon-gradient': '0 0 30px rgba(255, 0, 128, 0.4), 0 0 60px rgba(0, 212, 255, 0.4)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
