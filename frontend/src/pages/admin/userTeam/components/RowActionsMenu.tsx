import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeCheck,
  Ban,
  Download,
  History,
  Lock,
  MoreHorizontal,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  User,
  Wallet,
} from 'lucide-react';

type MenuItem = { id: string; label: string; danger?: boolean; section?: string };

export type { MenuItem };

const DEFAULT_ITEMS: MenuItem[] = [
  { id: 'view', label: 'View profile' },
  { id: 'credit', label: 'Credits & wallet' },
  { id: 'verification', label: 'Verification' },
  { id: 'history', label: 'Violations & disputes' },
  { id: 'export', label: 'Export JSON', section: 'tools' },
  { id: 'ban', label: 'Ban', danger: true, section: 'manage' },
  { id: 'suspend', label: 'Suspend', danger: true, section: 'manage' },
  { id: 'lock', label: 'Lock', section: 'manage' },
  { id: 'warn', label: 'Issue warning', section: 'manage' },
];

type RowActionsMenuProps = {
  onAction: (actionId: string) => void;
  items?: MenuItem[];
  status?: string | null;
};

type MenuCoords = { top: number; left: number; openUp: boolean };

function iconForAction(id: string) {
  switch (id) {
    case 'view':
      return User;
    case 'credit':
      return Wallet;
    case 'verification':
      return BadgeCheck;
    case 'history':
      return History;
    case 'export':
      return Download;
    case 'ban':
      return Ban;
    case 'unban':
    case 'unsuspend':
    case 'pardon':
      return ShieldCheck;
    case 'unlock':
      return Unlock;
    case 'suspend':
    case 'warn':
      return ShieldAlert;
    case 'lock':
      return Lock;
    default:
      return Scale;
  }
}

function statusTone(status?: string | null) {
  const s = String(status || '').toLowerCase();
  if (s === 'banned') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  if (s === 'suspended') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (s === 'locked') return 'border-zinc-400/30 bg-zinc-400/10 text-zinc-200';
  if (s === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  return 'border-white/10 bg-white/[0.04] text-zinc-300';
}

export default function RowActionsMenu({
  onAction,
  items = DEFAULT_ITEMS,
  status,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 360;
    const menuWidth = menuRef.current?.offsetWidth ?? 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;

    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;
    setCoords({
      top: Math.max(8, Math.min(top, window.innerHeight - Math.min(menuHeight, window.innerHeight - 16))),
      left,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, items, status]);

  useEffect(() => {
    if (!open) return;

    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', close);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const primary = items.filter((i) => !i.section);
  const tools = items.filter((i) => i.section === 'tools' || i.section === 'divider');
  const manage = items.filter((i) => i.section === 'manage');

  const renderItem = (item: MenuItem) => {
    const Icon = iconForAction(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onAction(item.id);
          setOpen(false);
        }}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-white/[0.06] ${
          item.danger ? 'text-red-300' : 'text-zinc-200'
        }`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${item.danger ? 'text-red-400' : 'text-zinc-500'}`} />
        {item.label}
      </button>
    );
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: -9999, left: -9999, visibility: 'hidden' }
          }
          className="fixed z-[200] max-h-[min(420px,calc(100vh-16px))] w-[236px] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#1a1b24] py-1.5 shadow-2xl"
        >
          {status && (
            <div className="border-b border-white/[0.06] px-3 pb-2 pt-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Account status
              </p>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone(status)}`}
              >
                {status}
              </span>
            </div>
          )}

          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Account
          </p>
          {primary.map(renderItem)}

          {tools.length > 0 && (
            <>
              <div className="my-1 border-t border-white/[0.08]" />
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Tools
              </p>
              {tools.map(renderItem)}
            </>
          )}

          {manage.length > 0 && (
            <>
              <div className="my-1 border-t border-white/[0.08]" />
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Enforcement
              </p>
              {manage.map(renderItem)}
            </>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}
