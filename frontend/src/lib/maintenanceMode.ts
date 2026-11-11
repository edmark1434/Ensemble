import { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { activeConsoleId } from '@/lib/consoleHosts';

export type PublicPlatformConfig = {
  siteName?: string;
  supportEmail?: string;
  maintenanceMode?: boolean;
};

let cachedConfig: PublicPlatformConfig | null = null;
let inflight: Promise<PublicPlatformConfig> | null = null;

export function isLandingAllowedDuringMaintenance(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/' || path === '/maintenance') return true;
  if (path.startsWith('/landing/')) {
    const leaf = path.slice('/landing/'.length).toLowerCase();
    // Ticket submission needs an authenticated member session.
    if (leaf === 'submitaticket' || leaf === 'submit-a-ticket') return false;
    return true;
  }
  return false;
}

export async function fetchPublicPlatformConfig(force = false): Promise<PublicPlatformConfig> {
  if (!force && cachedConfig) return cachedConfig;
  if (!force && inflight) return inflight;

  inflight = api
    .get('/api/configuration/public')
    .then((res) => {
      const configuration = (res.data?.configuration || {}) as PublicPlatformConfig;
      cachedConfig = {
        siteName: configuration.siteName || 'Ensemble',
        supportEmail: configuration.supportEmail || 'support@ensemble.app',
        maintenanceMode: Boolean(configuration.maintenanceMode),
      };
      return cachedConfig;
    })
    .catch(() => {
      cachedConfig = cachedConfig || {
        siteName: 'Ensemble',
        supportEmail: 'support@ensemble.app',
        maintenanceMode: false,
      };
      return cachedConfig;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useMaintenanceGate(pathname: string) {
  const onConsoleHost = Boolean(activeConsoleId());
  const [loading, setLoading] = useState(!onConsoleHost && !cachedConfig);
  const [maintenanceMode, setMaintenanceMode] = useState(
    () => Boolean(!onConsoleHost && cachedConfig?.maintenanceMode)
  );
  const [config, setConfig] = useState<PublicPlatformConfig | null>(() =>
    onConsoleHost ? null : cachedConfig
  );

  useEffect(() => {
    if (onConsoleHost) {
      setLoading(false);
      setMaintenanceMode(false);
      return;
    }

    let cancelled = false;
    void fetchPublicPlatformConfig().then((next) => {
      if (cancelled) return;
      setConfig(next);
      setMaintenanceMode(Boolean(next.maintenanceMode));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [onConsoleHost, pathname]);

  const blockProduct =
    !onConsoleHost && maintenanceMode && !isLandingAllowedDuringMaintenance(pathname);

  return {
    loading: onConsoleHost ? false : loading,
    maintenanceMode,
    blockProduct,
    config,
  };
}
