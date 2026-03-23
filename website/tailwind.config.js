/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        primary: {
          DEFAULT: '#4dd4d4',
          foreground: '#0a0a0a',
        },
        secondary: {
          DEFAULT: '#ff5a78',
          foreground: '#0a0a0a',
        },
        muted: {
          DEFAULT: '#222',
          foreground: '#888',
        },
        accent: {
          DEFAULT: '#4dd4d4',
          foreground: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Fira Sans', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
