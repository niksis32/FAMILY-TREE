import type { Preview } from '@storybook/react';
import './storybook.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#f8f6f3' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
  },
};

export default preview;
