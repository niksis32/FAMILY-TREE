import type { LucideIcon } from 'lucide-react';
import {
  Box,
  FileText,
  GitBranch,
  Globe2,
  Image,
  LayoutDashboard,
  Lightbulb,
  Map,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
  Clock3,
  BookOpen,
  Shuffle,
  Network,
  MessageCircle,
  CalendarDays,
  Landmark,
  BookMarked,
  Archive,
  Trophy,
  Compass,
  ShieldCheck,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'tree'
  | 'tree3d'
  | 'map'
  | 'militaryHistory'
  | 'timeline'
  | 'persons'
  | 'media'
  | 'documents'
  | 'aiLab'
  | 'matching'
  | 'community'
  | 'stories'
  | 'research'
  | 'settings'
  | 'messages'
  | 'calendar'
  | 'archivesSearch'
  | 'cemeteries'
  | 'exportPdf'
  | 'advancedSearch'
  | 'hints'
  | 'mergeWizard'
  | 'evidence'
  | 'wiki'
  | 'quests'
  | 'onboarding'
  | 'admin';

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
      { href: '/military-history', key: 'militaryHistory', icon: Shield },
      { href: '/cemeteries', key: 'cemeteries', icon: Landmark },
      { href: '/timeline', key: 'timeline', icon: Clock3 },
    ],
  },
  {
    groupKey: 'records',
    items: [
      { href: '/persons', key: 'persons', icon: Users },
      { href: '/media', key: 'media', icon: Image },
      { href: '/documents', key: 'documents', icon: FileText },
      { href: '/archives/search', key: 'archivesSearch', icon: Archive },
      { href: '/export', key: 'exportPdf', icon: BookMarked },
    ],
  },
  {
    groupKey: 'intelligence',
    items: [
      { href: '/search', key: 'advancedSearch', icon: Search },
      { href: '/hints', key: 'hints', icon: Lightbulb },
      { href: '/ai-lab', key: 'aiLab', icon: Sparkles },
      { href: '/matching', key: 'matching', icon: Shuffle },
      { href: '/merge', key: 'mergeWizard', icon: GitBranch },
      { href: '/evidence', key: 'evidence', icon: FileText },
      { href: '/wiki', key: 'wiki', icon: BookOpen },
      { href: '/research', key: 'research', icon: Network },
      { href: '/quests', key: 'quests', icon: Trophy },
    ],
  },
  {
    groupKey: 'social',
    items: [
      { href: '/onboarding', key: 'onboarding', icon: Compass },
      { href: '/messages', key: 'messages', icon: MessageCircle },
      { href: '/calendar', key: 'calendar', icon: CalendarDays },
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

/** Visible only to platform ADMIN — rendered separately in app-shell. */
export const PLATFORM_ADMIN: PlatformNavItem = {
  href: '/admin',
  key: 'admin',
  icon: ShieldCheck,
  match: (p) => p === '/admin' || p.startsWith('/admin/'),
};
