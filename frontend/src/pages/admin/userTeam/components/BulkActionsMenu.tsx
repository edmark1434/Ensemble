import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2 } from 'lucide-react';

export type BulkActionId =
  | 'ban'
  | 'suspend'
  | 'restore'
  | 'lock'
  | 'approve'
  | 'reject'
  | 'clear';

type BulkActionItem = {
  id: BulkActionId;
  label: string;
  danger?: boolean;
  section?: 'status' | 'verification' | 'other';
};

const BULK_ITEMS: BulkActionItem[] = [
  { id: 'restore', label: 'Restore to Active', section: 'status' },
  { id: 'suspend', label: 'Suspend accounts', danger: true, section: 'status' },
  { id: 'lock', label: 'Lock accounts', section: 'status' },
  { id: 'ban', label: 'Ban accounts', danger: true, section: 'status' },
  { id: 'approve', label: 'Approve verification', section: 'verification' },
  { id: 'reject', label: 'Reject verification', danger: true, section: 'verification' },
  { id: 'clear', label: 'Clear selection', section: 'other' },
];

type BulkActionsMenuProps = {
  selectedCount: number;
  disabled?: boolean;
  busy?: boolean;
  onAction: (actionId: BulkActionId) => void;
};

export default function BulkActionsMenu({
  selectedCount,
  disabled,
  busy,
  onAction,
}: BulkActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const noSelection = selectedCount === 0;

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

  const statusItems = BULK_ITEMS.filter((i) => i.section === 'status');
  const verificationItems = BULK_ITEMS.filter((i) => i.section === 'verification');
  const otherItems = BULK_ITEMS.filter((i) => i.section === 'other');

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
            <>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Status ({selectedCount})
              </p>
              {statusItems.map((item) => (
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
              <div className="my-1 border-t border-white/[0.08]" />
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Verification
              </p>
              {verificationItems.map((item) => (
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
              <div className="my-1 border-t border-white/[0.08]" />
              {otherItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onAction(item.id);
                    setOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </button>
              ))}
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
