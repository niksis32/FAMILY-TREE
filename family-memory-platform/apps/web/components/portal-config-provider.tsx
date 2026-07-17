'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PortalModuleKey, PortalModuleToggles } from '@family/shared';
import { DEFAULT_MODULE_TOGGLES, isModuleEnabled } from '@/config/portal-modules';
import { apiClient } from '@/lib/api-client';

export const PORTAL_CONFIG_CHANGED_EVENT = 'portal-config-changed';

interface PortalConfigState {
  modules: PortalModuleToggles;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  portalName: string;
  loading: boolean;
  refresh: () => Promise<void>;
  isModuleEnabled: (key: PortalModuleKey) => boolean;
}

const PortalConfigContext = createContext<PortalConfigState | null>(null);

export function PortalConfigProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<PortalModuleToggles>(DEFAULT_MODULE_TOGGLES);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(null);
  const [portalName, setPortalName] = useState('Family Memory');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const config = await apiClient.public.portalConfig();
      setModules({ ...DEFAULT_MODULE_TOGGLES, ...config.modules });
      setMaintenanceMode(config.maintenanceMode);
      setMaintenanceMessage(config.maintenanceMessage);
      setPortalName(config.portalName);
    } catch {
      // Keep defaults when API is unavailable (local dev without API).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(PORTAL_CONFIG_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PORTAL_CONFIG_CHANGED_EVENT, onChange);
  }, [refresh]);

  const value = useMemo(
    () => ({
      modules,
      maintenanceMode,
      maintenanceMessage,
      portalName,
      loading,
      refresh,
      isModuleEnabled: (key: PortalModuleKey) => isModuleEnabled(modules, key),
    }),
    [modules, maintenanceMode, maintenanceMessage, portalName, loading, refresh],
  );

  return <PortalConfigContext.Provider value={value}>{children}</PortalConfigContext.Provider>;
}

export function usePortalConfig() {
  const ctx = useContext(PortalConfigContext);
  if (!ctx) throw new Error('usePortalConfig must be used within PortalConfigProvider');
  return ctx;
}

export function notifyPortalConfigChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PORTAL_CONFIG_CHANGED_EVENT));
  }
}
