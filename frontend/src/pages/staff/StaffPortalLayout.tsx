import { Gem, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useGlobalState from '@/lib/global_state';
import api from '@/lib/axios';
import { STAFF_LOGIN_PATH } from '@/lib/staffRoutes';

const navClassName = (isActive: boolean) =>
  `flex w-full items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
    isActive
      ? 'border-white/20 bg-white/10 text-white'
      : 'border-transparent text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white'
  }`;

const StaffPortalLayout = () => {
  const { user, clearUser } = useGlobalState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.get('/api/users/logout');
    } catch {
      // Still clear local session if the request fails.
    }
    clearUser();
    navigate(STAFF_LOGIN_PATH, { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07080e] text-zinc-100 [font-family:Space_Grotesk,Segoe_UI,sans-serif]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.15),transparent_42%)]" />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <Gem className="h-5 w-5" />
            <p className="text-sm font-semibold tracking-wide text-white">Staff Portal</p>
          </div>
          {user?.role ? (
            <p className="mt-2 text-xs text-zinc-500">{user.role}</p>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <NavLink to="/staff/dashboard" end className={({ isActive }) => navClassName(isActive)}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-zinc-300 transition hover:border-white/15 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <Outlet />
    </div>
  );
};

export default StaffPortalLayout;
