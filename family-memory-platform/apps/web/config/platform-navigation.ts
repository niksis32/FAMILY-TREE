import type { LucideIcon } from 'lucide-react';
import {
  Box,
  FileText,
  GitBranch,
  Globe2,
  Image,
  LayoutDashboard,
  Map,
  Settings,
  Sparkles,
  Users,
  Clock3,
  BookOpen,
  Shuffle,
  Network,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'tree'
  | 'tree3d'
  | 'map'
  | 'timeline'
  | 'persons'
  | 'media'
  | 'documents'
  | 'aiLab'
  | 'matching'
  | 'community'
  | 'stories'
  | 'research'
  | 'settings';

export interface PlatformNavItem {
  href: string;
  key: NavItemKey;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
}

export interface PlatformNavGroup {
  groupKey: 'explore' | 'records' | 'intelligence' | 'social';
  items: PlatformNavItem[];
}

export const PLATFORM_DASHBOARD: PlatformNavItem = {
  href: '/dashboard',
  key: 'dashboard',
  icon: LayoutDashboard,
};

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    groupKey: 'explore',
    items: [
      { href: '/tree', key: 'tree', icon: GitBranch },
      {
        href: '/tree/3d',
        key: 'tree3d',
        icon: Box,
        match: (p) => p === '/tree/3d' || p.startsWith('/tree/3d/'),
      },
      { href: '/map', key: 'map', icon: Map },
      { href: '/timeline', key: 'timeline', icon: Clock3 },
    ],
  },
  {
    groupKey: 'records',
    items: [
      { href: '/persons', key: 'persons', icon: Users },
      { href: '/media', key: 'media', icon: Image },
      { href: '/documents', key: 'documents', icon: FileText },
    ],
  },
  {
    groupKey: 'intelligence',
    items: [
      { href: '/ai-lab', key: 'aiLab', icon: Sparkles },
      { href: '/matching', key: 'matching', icon: Shuffle },
      { href: '/research', key: 'research', icon: Network },
    ],
  },
  {
    groupKey: 'social',
    items: [
      { href: '/community', key: 'community', icon: Globe2 },
      { href: '/stories', key: 'stories', icon: BookOpen },
    ],
  },
];

export const PLATFORM_SETTINGS: PlatformNavItem = {
  href: '/settings',
  key: 'settings',
  icon: Settings,
};
