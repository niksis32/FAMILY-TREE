import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './progress-bar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Premium/ProgressBar',
  component: ProgressBar,
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Medium: Story = {
  args: { value: 62, className: 'w-64' },
};

export const Small: Story = {
  args: { value: 40, size: 'sm', className: 'w-64' },
};
