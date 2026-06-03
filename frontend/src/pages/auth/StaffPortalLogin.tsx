import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Gem, Lock, Mail, Shield } from 'lucide-react';
import useGlobalState from '@/lib/global_state';
import { API_BASE_URL } from '@/lib/api';
import {
  ADMIN_LOGIN_PATH,
  STAFF_LOGIN_PATH,
  getStaffHomePath,
} from '@/lib/staffRoutes';

type PortalKind = 'admin' | 'staff';

type PortalConfig = {
  title: string;
  subtitle: string;
  badge: string;
  allowedRole: 'Admin' | 'moderator';
  redirectPath: (role?: string | null) => string;
  alternateLabel: string;
  alternatePath: string;
  accent: string;
  accentMuted: string;
  glow: string;
};

const PORTAL_CONFIG: Record<PortalKind, PortalConfig> = {
  admin: {
    title: 'Admin Portal',
    subtitle: 'Sign in with your administrator credentials.',
    badge: 'Internal — Administrators only',
    allowedRole: 'Admin',
    redirectPath: () => getStaffHomePath('Admin'),
    alternateLabel: 'Moderator or support staff?',
    alternatePath: STAFF_LOGIN_PATH,
    accent: '#f87171',
    accentMuted: 'rgba(248, 113, 113, 0.15)',
    glow: 'rgba(239, 68, 68, 0.22)',
  },
  staff: {
    title: 'Staff Portal',
    subtitle: 'Sign in with your moderator or support credentials.',
    badge: 'Internal — Staff & moderators',
    allowedRole: 'moderator',
    redirectPath: (role) => getStaffHomePath(role),
    alternateLabel: 'Administrator?',
    alternatePath: ADMIN_LOGIN_PATH,
    accent: '#34d399',
    accentMuted: 'rgba(52, 211, 153, 0.15)',
    glow: 'rgba(16, 185, 129, 0.2)',
  },
};

function normalizeCredentials(credentials: Record<string, unknown>) {
  return {
    ...credentials,
    account_id: credentials.accountId ?? credentials.account_id,
    email: credentials.email,
    username: credentials.username,
    type: credentials.type,
    role: credentials.role,
    staffId: credentials.staffId ?? credentials.staff_id,
  };
}

type StaffPortalLoginProps = {
  portal: PortalKind;
};

export default function StaffPortalLogin({ portal }: StaffPortalLoginProps) {
  const config = PORTAL_CONFIG[portal];
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated } = useGlobalState();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.type !== 'Staff' || !user?.role) {
      return;
    }

    if (portal === 'admin' && user.role === 'Admin') {
      navigate(config.redirectPath(user.role), { replace: true });
      return;
    }

    if (portal === 'staff' && user.role !== 'Admin') {
      navigate(config.redirectPath(user.role), { replace: true });
    }
  }, [user, portal, navigate, config]);

  const validate = () => {
    if (!loginIdentifier.trim()) {
      return 'Email or username is required.';
    }
    if (!password) {
      return 'Password is required.';
    }
    return '';
  };

  const handleSignIn = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await axios.post(
        `${API_BASE_URL}/api/users/login`,
        { loginIdentifier: loginIdentifier.trim(), password },
        { withCredentials: true }
      );

      if (result.status !== 200 || !result.data.success) {
        setError(result.data.message || 'Login failed. Please try again.');
        return;
      }

      const credentials = normalizeCredentials(result.data.credentials ?? {});
      const { type, role } = credentials;

      if (type !== 'Staff' || !role) {
        setError('This portal is for staff accounts only. Use the main site login for user accounts.');
        return;
      }

      if (portal === 'admin' && role !== 'Admin') {
        setError('This portal is for administrators only. Use the staff portal for moderator access.');
        return;
      }

      if (portal === 'staff' && role === 'Admin') {
        setError('Administrators should sign in through the admin portal.');
        return;
      }

      setUser(credentials);
      setIsAuthenticated(true);
      navigate(config.redirectPath(role), { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'An error occurred. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSignIn();
    }
  };

  const PortalIcon = portal === 'admin' ? Shield : Gem;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07080e] px-4 py-10 text-zinc-100"
      style={{ fontFamily: 'Space Grotesk, Segoe UI, sans-serif' }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${config.glow}, transparent 40%), radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.12), transparent 42%), radial-gradient(circle at 65% 80%, rgba(168, 85, 247, 0.08), transparent 36%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <img src="/ensemble_lg.svg" alt="Ensemble" className="h-9 w-9" />
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">Ensemble</p>
            <p className="text-xs text-zinc-400">Production platform</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/50 p-8 shadow-2xl backdrop-blur-xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{
              borderColor: `${config.accent}55`,
              background: config.accentMuted,
              color: config.accent,
            }}
          >
            <PortalIcon className="h-3.5 w-3.5" />
            {config.badge}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">{config.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{config.subtitle}</p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Email or username
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginIdentifier(e.target.value)}
                  placeholder="admin or email@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-white/[0.07]"
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Password
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-white/[0.07]"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSignIn()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: loading ? `${config.accent}99` : config.accent }}
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {config.alternateLabel}{' '}
            <Link
              to={config.alternatePath}
              className="font-medium transition hover:text-white"
              style={{ color: config.accent }}
            >
              Sign in here
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          <Link to="/" className="transition hover:text-zinc-400">
            ← Back to Ensemble
          </Link>
        </p>
      </div>
    </div>
  );
}
