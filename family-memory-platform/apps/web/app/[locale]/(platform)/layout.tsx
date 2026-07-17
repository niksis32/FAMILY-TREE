import { PlatformLayoutSwitch } from '@/components/platform-layout-switch';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformLayoutSwitch>{children}</PlatformLayoutSwitch>;
}
