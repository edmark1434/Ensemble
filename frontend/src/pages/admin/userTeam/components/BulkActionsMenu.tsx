import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2 } from 'lucide-react';

export type BulkActionItem = {
  id: string;
  label: string;
  danger?: boolean;
  section?: string;
};

export type BulkActionId =
  | 'ban'
  | 'suspend'
  | 'restore'
  | 'lock'
  | 'approve'
  | 'reject'
  | 'clear';

const DEFAULT_BULK_ITEMS: BulkActionItem[] = [
  { id: 'restore', label: 'Restore to Active', section: 'Status' },
  { id: 'suspend', label: 'Suspend accounts', danger: true, section: 'Status' },
  { id: 'lock', label: 'Lock accounts', section: 'Status' },
  { id: 'ban', label: 'Ban accounts', danger: true, section: 'Status' },
  { id: 'approve', label: 'Approve verification', section: 'Verification' },
  { id: 'reject', label: 'Reject verification', danger: true, section: 'Verification' },
  { id: 'clear', label: 'Clear selection', section: 'Other' },
];

type BulkActionsMenuProps = {
  selectedCount: number;
  disabled?: boolean;
  busy?: boolean;
  items?: BulkActionItem[];
  onAction: (actionId: string) => void;
};

export default function BulkActionsMenu({
  selectedCount,
  disabled,
  busy,
  items = DEFAULT_BULK_ITEMS,
  onAction,
}: BulkActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const noSelection = selectedCount === 0;

  const sections = items.reduce<{ name: string; items: BulkActionItem[] }[]>((acc, item) => {
    const name = item.section || 'Actions';
    const existing = acc.find((s) => s.name === name);
    if (existing) existing.items.push(item);
    else acc.push({ name, items: [item] });
    return acc;
  }, []);

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 220;
    const menuHeight = menuRef.current?.offsetHeight ?? 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > spaceBelow;

    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4;

    setCoords({
      top: Math.max(8, top),
      left,
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

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: -9999, left: -9999, visibility: 'hidden' }
          }
          className="fixed z-[200] max-h-[min(360px,calc(100vh-16px))] min-w-[220px] overflow-y-auto rounded-xl border border-white/[0.1] bg-[#1a1b24] py-1 shadow-2xl"
        >
          {noSelection ? (
            <p className="px-4 py-3 text-xs text-zinc-500">Select rows with the checkboxes first.</p>
          ) : (
            sections.map((section, idx) => (
              <div key={section.name}>
                {idx > 0 && <div className="my-1 border-t border-white/[0.08]" />}
                {section.name !== 'Other' && (
                  <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                    {section.name} ({selectedCount})
                  </p>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onAction(item.id);
                      setOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-white/[0.06] ${
                      item.danger
                        ? 'text-red-300'
                        : item.section === 'Other'
                          ? 'text-zinc-400 hover:text-white'
                          : 'text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))
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
        disabled={disabled || busy}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50 ${
          selectedCount > 0
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            : 'border-white/[0.08] text-zinc-300 hover:text-white'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Bulk actions
        {selectedCount > 0 && (
          <span className="rounded-full bg-rose-500/30 px-1.5 text-[10px] font-bold text-rose-100">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  );
}
