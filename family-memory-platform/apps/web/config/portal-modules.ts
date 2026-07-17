import type { PortalModuleKey, PortalModuleToggles } from '@family/shared';
import type { NavItemKey, PlatformNavGroup } from './platform-navigation';

/** Defaults match API `DEFAULT_PORTAL_MODULES` — all enabled until config loads. */
export const DEFAULT_MODULE_TOGGLES: PortalModuleToggles = {
  messenger: true,
  community: true,
  aiLab: true,
  cemeteries: true,
  militaryHistory: true,
  matching: true,
  wiki: true,
  archivesSearch: true,
  calendar: true,
  stories: true,
  quests: true,
};

/** Nav items gated by a portal module toggle. Items not listed are always visible. */
export const NAV_ITEM_MODULE: Partial<Record<NavItemKey, PortalModuleKey>> = {
  militaryHistory: 'militaryHistory',
  cemeteries: 'cemeteries',
  archivesSearch: 'archivesSearch',
  aiLab: 'aiLab',
  matching: 'matching',
  wiki: 'wiki',
  quests: 'quests',
  messages: 'messenger',
  calendar: 'calendar',
  community: 'community',
  stories: 'stories',
};

export const PATH_MODULE_PREFIXES: Array<{ prefix: string; module: PortalModuleKey }> = [
  { prefix: '/cemeteries', module: 'cemeteries' },
  { prefix: '/military-history', module: 'militaryHistory' },
  { prefix: '/archives/search', module: 'archivesSearch' },
  { prefix: '/ai-lab', module: 'aiLab' },
  { prefix: '/matching', module: 'matching' },
  { prefix: '/wiki', module: 'wiki' },
  { prefix: '/quests', module: 'quests' },
  { prefix: '/messages', module: 'messenger' },
  { prefix: '/calendar', module: 'calendar' },
  { prefix: '/community', module: 'community' },
  { prefix: '/stories', module: 'stories' },
];

export function isModuleEnabled(modules: PortalModuleToggles, key: PortalModuleKey): boolean {
  return modules[key] !== false;
}

export function isNavItemEnabled(modules: PortalModuleToggles, navKey: NavItemKey): boolean {
  const moduleKey = NAV_ITEM_MODULE[navKey];
  if (!moduleKey) return true;
  return isModuleEnabled(modules, moduleKey);
}

export function filterNavGroups(groups: PlatformNavGroup[], modules: PortalModuleToggles): PlatformNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemEnabled(modules, item.key)),
    }))
    .filter((group) => group.items.length > 0);
}

export function moduleForPathname(pathname: string): PortalModuleKey | null {
  for (const { prefix, module } of PATH_MODULE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return module;
  }
  return null;
}
