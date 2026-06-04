import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ModalShell } from './modal-shell';

const meta: Meta<typeof ModalShell> = {
  title: 'Premium/ModalShell',
  component: ModalShell,
};

export default meta;
type Story = StoryObj<typeof ModalShell>;

function ModalDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="rounded-xl border px-4 py-2" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        title="Document intelligence"
        subtitle="OCR and entity extraction for this archive item."
        footer={
          <button type="button" className="rounded-xl bg-family-primary px-4 py-2 text-sm text-white" onClick={() => setOpen(false)}>
            Close
          </button>
        }
      >
        <p className="text-sm text-stone-600">Tab cycles inside the dialog. Escape or backdrop closes it.</p>
      </ModalShell>
    </>
  );
}

export const Open: Story = {
  render: () => <ModalDemo />,
};
