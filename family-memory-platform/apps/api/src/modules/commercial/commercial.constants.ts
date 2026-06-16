import type { PlanEntitlements, SubscriptionPlanCode } from '@family/shared';

const GB = 1024 * 1024 * 1024;

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlanCode, PlanEntitlements> = {
  FREE: {
    maxFamilies: 1,
    maxPersons: 50,
    maxMediaBytes: 500 * 1024 * 1024,
    aiCreditsPerMonth: 0,
    maxGedcomExportsPerMonth: 1,
    maxReportExportsPerMonth: 0,
    features: {
      gedcomAdvanced: false,
      historicalMaps: false,
      communityTools: false,
      clientManagement: false,
      multiWorkspace: false,
      reportExport: false,
      onPremDeploy: false,
      whiteLabel: false,
      webhooksEnabled: false,
    },
  },
  FAMILY: {
    maxFamilies: 1,
    maxPersons: 500,
    maxMediaBytes: 5 * GB,
    aiCreditsPerMonth: 50,
    maxGedcomExportsPerMonth: 5,
    maxReportExportsPerMonth: 2,
    features: {
      gedcomAdvanced: false,
      historicalMaps: false,
      communityTools: false,
      clientManagement: false,
      multiWorkspace: false,
      reportExport: true,
      onPremDeploy: false,
      whiteLabel: false,
      webhooksEnabled: false,
    },
  },
  RESEARCHER: {
    maxFamilies: 2,
    maxPersons: 2000,
    maxMediaBytes: 20 * GB,
    aiCreditsPerMonth: 200,
    maxGedcomExportsPerMonth: 30,
    maxReportExportsPerMonth: 10,
    features: {
      gedcomAdvanced: true,
      historicalMaps: true,
      communityTools: true,
      clientManagement: false,
      multiWorkspace: false,
      reportExport: true,
      onPremDeploy: false,
      whiteLabel: false,
      webhooksEnabled: false,
    },
  },
  PROFESSIONAL: {
    maxFamilies: 10,
    maxPersons: 10000,
    maxMediaBytes: 100 * GB,
    aiCreditsPerMonth: 1000,
    maxGedcomExportsPerMonth: 100,
    maxReportExportsPerMonth: 50,
    features: {
      gedcomAdvanced: true,
      historicalMaps: true,
      communityTools: true,
      clientManagement: true,
      multiWorkspace: true,
      reportExport: true,
      onPremDeploy: false,
      whiteLabel: true,
      webhooksEnabled: true,
    },
  },
  ON_PREM: {
    maxFamilies: 999,
    maxPersons: 999999,
    maxMediaBytes: 999 * GB,
    aiCreditsPerMonth: 999999,
    maxGedcomExportsPerMonth: 999999,
    maxReportExportsPerMonth: 999999,
    features: {
      gedcomAdvanced: true,
      historicalMaps: true,
      communityTools: true,
      clientManagement: true,
      multiWorkspace: true,
      reportExport: true,
      onPremDeploy: true,
      whiteLabel: true,
      webhooksEnabled: true,
    },
  },
};

export const PLAN_LABELS: Record<SubscriptionPlanCode, { name: string; description: string }> = {
  FREE: {
    name: 'Free',
    description: '1 дерево, ограничение персон и медиа.',
  },
  FAMILY: {
    name: 'Family',
    description: 'Больше персон и медиа, AI credits.',
  },
  RESEARCHER: {
    name: 'Researcher',
    description: 'Расширенный GEDCOM, исторические карты, community tools.',
  },
  PROFESSIONAL: {
    name: 'Professional',
    description: 'Клиенты, несколько деревьев, экспорт отчётов.',
  },
  ON_PREM: {
    name: 'On-Prem',
    description: 'Установка на VPS клиента, без облачных лимитов.',
  },
};
