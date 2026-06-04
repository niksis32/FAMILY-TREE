import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}', './.storybook/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['system-ui', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        family: {
          primary: '#1e3a5f',
          accent: '#c9a227',
          surface: '#f8f6f3',
          ink: '#172033',
          muted: '#6b7280',
          night: '#0f172a',
        },
      },
      boxShadow: {
        premium: '0 24px 80px -32px rgba(15, 23, 42, 0.45)',
        'premium-sm': '0 12px 40px -20px rgba(15, 23, 42, 0.28)',
      },
    },
  },
  plugins: [],
};

export default config;
