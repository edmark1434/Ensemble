import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { preloadStaffConsole, type StaffConsole } from './staffPages';

function StaffPageLoader() {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center md:pl-[260px]">
      <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
    </main>
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
