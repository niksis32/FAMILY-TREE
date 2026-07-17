import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Globe2,
  LayoutDashboard,
  MessageSquare,
  Monitor,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';

export type AdminNavKey =
  | 'overview'
  | 'users'
  | 'sessions'
  | 'messages'
  | 'moderation'
  | 'site'
  | 'ops';

export interface AdminNavItem {
  href: string;
  key: AdminNavKey;
  icon: LucideIcon;
  exact?: boolean;
  comingSoon?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', key: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', key: 'users', icon: Users },
  { href: '/admin/sessions', key: 'sessions', icon: Monitor },
  { href: '/admin/messages', key: 'messages', icon: MessageSquare },
  { href: '/admin/moderation', key: 'moderation', icon: Shield },
  { href: '/admin/site', key: 'site', icon: Globe2 },
  { href: '/admin/ops', key: 'ops', icon: Activity },
];

export interface AdminModerationLink {
  href: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  queueKey?: 'military';
}

export const ADMIN_MODERATION_LINKS: AdminModerationLink[] = [
  {
    href: '/admin/moderation/military-history',
    titleKey: 'moderationMilitaryTitle',
    descriptionKey: 'moderationMilitaryDesc',
    icon: ShieldCheck,
    queueKey: 'military',
  },
  {
    href: '/community/moderation',
    titleKey: 'moderationCommunityTitle',
    descriptionKey: 'moderationCommunityDesc',
    icon: Shield,
  },
  {
    href: '/stories/moderation',
    titleKey: 'moderationStoriesTitle',
    descriptionKey: 'moderationStoriesDesc',
    icon: ShieldCheck,
  },
];
