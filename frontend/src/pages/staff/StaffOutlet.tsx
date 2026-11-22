import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import api from '@/lib/axios';
import { useStaffLiveConnection } from '@/lib/staffLive';
import { preloadStaffConsole, type StaffConsole } from './staffPages';
import ConsolePageSkeleton from './ConsolePageSkeleton';

/** Keeps this staff member "on duty" (online) while a console tab is open and visible. */
const PRESENCE_HEARTBEAT_MS = 60_000;

function useStaffPresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (!document.hidden) void api.get('/api/staff/presence/heartbeat').catch(() => {});
    };
    ping();
    const timer = window.setInterval(ping, PRESENCE_HEARTBEAT_MS);
    document.addEventListener('visibilitychange', ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);
}

function StaffPageLoader() {
  return (
    <ConsolePageSkeleton />
  );
}

/** Console content area: keeps the sidebar mounted while a page loads and preloads sibling pages when idle. */
export default function StaffOutlet({ consoleId }: { consoleId: StaffConsole }) {
  useStaffPresenceHeartbeat();
  // Pages follow `staffDataChanged` / `staffCaseChanged`; connect before they mount.
  useStaffLiveConnection();
  useEffect(() => {
    const run = () => preloadStaffConsole(consoleId);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 1500);
    return () => window.clearTimeout(timer);
  }, [consoleId]);

  return (
    <Suspense fallback={<StaffPageLoader />}>
      <Outlet />
    </Suspense>
  );
}
