import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { preloadStaffConsole, type StaffConsole } from './staffPages';
import ConsolePageSkeleton from './ConsolePageSkeleton';

function StaffPageLoader() {
  return (
    <ConsolePageSkeleton />
  );
}

/** Console content area: keeps the sidebar mounted while a page loads and preloads sibling pages when idle. */
export default function StaffOutlet({ consoleId }: { consoleId: StaffConsole }) {
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
