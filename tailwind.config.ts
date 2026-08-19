import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0f',
        panel: '#151319',
        magenta: '#ff2e88',
        gold: '#f5c542',
        cyan: '#3ee6e6',
      },
      fontFamily: {
        display: ['var(--font-anton)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
