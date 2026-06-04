import type { Meta, StoryObj } from '@storybook/react';
import { PageHero } from './page-hero';

const meta: Meta<typeof PageHero> = {
  title: 'Premium/PageHero',
  component: PageHero,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof PageHero>;

export const Default: Story = {
  args: {
    eyebrow: 'Genealogy intelligence',
    title: 'Family memory dashboard',
    description: 'Your archive at a glance — tree, media, documents, and AI-assisted research.',
    action: <button type="button" className="rounded-xl bg-family-primary px-4 py-2 text-sm text-white">Add person</button>,
  },
};
