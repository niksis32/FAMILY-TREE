/** Design tokens — align with Tailwind config in apps/web */
export const theme = {
  colors: {
    primary: '#1e3a5f',
    accent: '#c9a227',
    surface: '#f8f6f3',
    text: '#1a1a1a',
  },
  fontFamily: {
    sans: 'var(--font-geist-sans), system-ui, sans-serif',
    serif: 'var(--font-serif), Georgia, serif',
  },
} as const;
