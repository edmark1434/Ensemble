import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Filter, X } from 'lucide-react';

export type FilterOption = { value: string; label: string };

export type FilterDefinition = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
};

type TableFilterBarProps = {
  filters: FilterDefinition[];
  sort: { value: string; options: FilterOption[] };
  onFilterChange: (id: string, value: string) => void;
  onSortChange: (value: string) => void;
  onClear: () => void;
};

const ALL = 'all';

export default function TableFilterBar({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  onClear,
}: TableFilterBarProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const activeCount = filters.filter((f) => f.value !== ALL).length;

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const panelWidth = panelRef.current?.offsetWidth ?? 256;
    const panelHeight = panelRef.current?.offsetHeight ?? 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < panelHeight + 12 && rect.top > spaceBelow;

    let left = rect.right - panelWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    const top = openUp ? rect.top - panelHeight - 8 : rect.bottom + 8;

    setCoords({ top: Math.max(8, top), left });
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

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onReposition = () => updatePosition();
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  const selectClass =
    'mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0f1016] px-2.5 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/20';

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          style={
            coords
              ? { top: coords.top, left: coords.left }
              : { top: -9999, left: -9999, visibility: 'hidden' }
          }
          className="fixed z-[200] w-64 rounded-xl border border-white/[0.1] bg-[#14151c] p-4 shadow-2xl"
        >
          <div className="space-y-3">
            {filters.map((f) => (
              <label key={f.id} className="block text-xs text-zinc-500">
                {f.label}
                <select
                  value={f.value}
                  onChange={(e) => onFilterChange(f.id, e.target.value)}
                  className={selectClass}
                >
                  <option value={ALL}>All</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="block text-xs text-zinc-500">
              Sort by
              <select
                value={sort.value}
                onChange={(e) => onSortChange(e.target.value)}
                className={selectClass}
              >
                {sort.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex justify-between border-t border-white/[0.08] pt-3">
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="text-xs text-zinc-400 underline-offset-2 hover:text-white hover:underline"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex items-center gap-2">
        {filters
          .filter((f) => f.value !== ALL)
          .map((f) => {
            const label = f.options.find((o) => o.value === f.value)?.label ?? f.value;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id, ALL)}
                className="hidden items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-500/20 sm:inline-flex"
                title={`Clear ${f.label.toLowerCase()} filter`}
              >
                {f.label}: {label}
                <X className="h-3 w-3" />
              </button>
            );
          })}

        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition ${
            activeCount > 0
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : 'border-white/[0.08] text-zinc-400 hover:text-white'
          }`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-rose-500/30 px-1.5 text-[10px] font-bold text-rose-100">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {panel}
    </div>
  );
}

export function uniqueOptions(values: (string | null | undefined)[]): FilterOption[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    if (!v) continue;
    const key = v.toLowerCase();
    if (!seen.has(key)) seen.set(key, v);
  }
  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => ({ value: key, label }));
}
