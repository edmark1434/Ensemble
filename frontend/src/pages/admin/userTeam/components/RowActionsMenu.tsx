import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

type MenuItem = { id: string; label: string; danger?: boolean; section?: string };

export type { MenuItem };

const DEFAULT_ITEMS: MenuItem[] = [
  { id: 'view', label: 'View profile' },
  { id: 'credit', label: 'Credit action' },
  { id: 'moderation', label: 'Moderation action' },
  { id: 'verification', label: 'Verification action' },
  { id: 'history', label: 'Violations overview' },
  { id: 'export', label: 'Export account', section: 'divider' },
  { id: 'ban', label: 'Ban account', danger: true, section: 'manage' },
  { id: 'suspend', label: 'Suspend account', danger: true, section: 'manage' },
  { id: 'restore', label: 'Restore account', section: 'manage' },
  { id: 'lock', label: 'Lock account', section: 'manage' },
  { id: 'warn', label: 'Warn account', section: 'manage' },
];

type RowActionsMenuProps = {
  onAction: (actionId: string) => void;
  items?: MenuItem[];
};

type MenuCoords = { top: number; left: number; openUp: boolean };

export default function RowActionsMenu({ onAction, items = DEFAULT_ITEMS }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 320;
    const menuWidth = menuRef.current?.offsetWidth ?? 200;
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
  }, [open]);

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
  const manage = items.filter((i) => i.section === 'manage');

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: -9999, left: -9999, visibility: 'hidden' }
          }
          className="fixed z-[200] max-h-[min(360px,calc(100vh-16px))] min-w-[200px] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#1a1b24] py-1 shadow-2xl"
        >
          {primary.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAction(item.id);
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-white/[0.08]" />
          <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Management
          </p>
          {manage.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAction(item.id);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-white/[0.06] ${
                item.danger ? 'text-red-300' : 'text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
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
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </div>
  );
}
