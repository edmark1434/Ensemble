import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

type MenuItem = { id: string; label: string; danger?: boolean; section?: string };

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

export default function RowActionsMenu({ onAction, items = DEFAULT_ITEMS }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const primary = items.filter((i) => !i.section);
  const manage = items.filter((i) => i.section === 'manage');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[200px] rounded-xl border border-white/[0.1] bg-[#1a1b24] py-1 shadow-xl">
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
          <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">Management</p>
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
        </div>
      )}
    </div>
  );
}
