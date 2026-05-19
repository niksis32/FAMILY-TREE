import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
};

export default config;
