import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Calculator, Database, Info, Lightbulb, Search, X, type LucideIcon } from 'lucide-react';
import { GLOSSARY, GLOSSARY_SECTIONS, type GlossaryEntry, type GlossaryId } from './analyticsGlossary';

/**
 * Explanations for Admin → Analytics without crowding the numbers: a small ⓘ next to a figure
 * opens a popover (what it is, how it is worked out, where it comes from), and the page header's
 * Definitions button opens a drawer with every term for the current tab.
 */

type GlossaryApi = { open: (focus?: GlossaryId) => void };

const GlossaryContext = createContext<GlossaryApi | null>(null);

export const GlossaryProvider = GlossaryContext.Provider;

const POP_WIDTH = 320;
const EDGE = 12;
const GAP = 8;

function EntryLine({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <div className="text-xs leading-relaxed text-zinc-400">{children}</div>
    </div>
  );
}

/** The parts of one definition, shared by the popover and the drawer. */
function EntryBody({ entry }: { entry: GlossaryEntry }) {
  return (
    <>
      <p className="text-xs leading-relaxed text-zinc-300">{entry.what}</p>
      {entry.calc && (
        <EntryLine icon={Calculator} label="How it’s worked out">
          <code className="block rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-rose-100">
            {entry.calc}
          </code>
        </EntryLine>
      )}
      {entry.source && (
        <EntryLine icon={Database} label="Where it comes from">
          {entry.source}
        </EntryLine>
      )}
      {entry.note && (
        <EntryLine icon={Lightbulb} label="Good to know">
          <span className="text-amber-100/80">{entry.note}</span>
        </EntryLine>
      )}
    </>
  );
}

/**
 * ⓘ button that explains one figure. Safe inside a link tile: clicks never reach the link.
 */
export function InfoButton({ id, className = '' }: { id: GlossaryId; className?: string }) {
  const entry: GlossaryEntry = GLOSSARY[id];
  const glossary = useContext(GlossaryContext);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(POP_WIDTH, window.innerWidth - EDGE * 2);
    const height = popRef.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - EDGE);
    const below = rect.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - EDGE;
    const above = rect.top - GAP - height;
    setPos({ top: fitsBelow || above < EDGE ? below : above, left, width });
  }, []);

  // Measured after the popover renders (hidden), so it can open above the button near the bottom.
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: Event) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  // Inside a tile that is a link: keep the click on the button.
  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`What is “${entry.term}”?`}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={(event) => {
          stop(event);
          setOpen((v) => !v);
        }}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 ${
          open ? 'text-rose-300' : 'text-zinc-600 hover:text-zinc-300'
        } ${className}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="dialog"
            aria-label={entry.term}
            onClick={(event) => event.stopPropagation()}
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: pos?.width ?? POP_WIDTH, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed z-[90] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0f1016] p-4 text-left font-normal normal-case tracking-normal shadow-2xl shadow-black/60 motion-safe:animate-[console-fade_0.15s_ease-out_backwards]"
          >
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-white">{entry.term}</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="-mr-1 -mt-1 rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <EntryBody entry={entry} />
            {glossary && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  glossary.open(id);
                }}
                className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-300 hover:text-rose-200"
              >
                <BookOpen className="h-3 w-3" />
                All definitions
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/** Header button that opens the Definitions drawer. */
export function DefinitionsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:border-white/20 hover:text-white"
      title="What each number means and where it comes from"
    >
      <BookOpen className="h-4 w-4" />
      Definitions
    </button>
  );
}

/**
 * Every definition, one tab section at a time, with search across all of them. `focus` scrolls
 * to and highlights one term (opened from a popover's "All definitions").
 */
export function DefinitionsDrawer({
  open,
  section,
  focus,
  onClose,
}: {
  open: boolean;
  /** Tab the page is on; its section is shown first. */
  section: string;
  focus: GlossaryId | null;
  onClose: () => void;
}) {
  const initial = useMemo(() => {
    if (focus) return GLOSSARY_SECTIONS.find((s) => s.ids.includes(focus))?.id || section;
    return GLOSSARY_SECTIONS.some((s) => s.id === section) ? section : 'basics';
  }, [focus, section]);
  const [active, setActive] = useState(initial);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setActive(initial);
    setQuery('');
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !focus) return;
    const frame = window.requestAnimationFrame(() =>
      listRef.current?.querySelector(`[data-term="${focus}"]`)?.scrollIntoView({ block: 'center' })
    );
    return () => window.cancelAnimationFrame(frame);
  }, [open, focus, active]);

  if (!open) return null;

  const needle = query.trim().toLowerCase();
  const matches = (id: GlossaryId) => {
    if (!needle) return true;
    const e: GlossaryEntry = GLOSSARY[id];
    return [e.term, e.what, e.calc, e.source, e.note].some((t) => t?.toLowerCase().includes(needle));
  };
  const sections = needle
    ? GLOSSARY_SECTIONS.map((s) => ({ ...s, ids: s.ids.filter(matches) })).filter((s) => s.ids.length)
    : GLOSSARY_SECTIONS.filter((s) => s.id === active);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Analytics definitions">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0c11] shadow-2xl motion-safe:animate-[console-fade_0.2s_ease-out_backwards]">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-400/80">Analytics</p>
              <h2 className="text-base font-semibold text-white">Definitions</h2>
              <p className="mt-0.5 text-xs text-zinc-500">What each number means, how it is worked out and where it comes from.</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#12131a] px-3 py-2 focus-within:border-rose-500/40">
            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search every definition, e.g. net cash"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </label>
          {!needle && (
            <div className="-mx-1 mt-3 flex flex-wrap gap-1.5">
              {GLOSSARY_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  aria-pressed={active === s.id}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    active === s.id
                      ? 'border-rose-400/40 bg-rose-500/10 text-rose-200'
                      : 'border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={listRef} className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {sections.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">No definition mentions “{query.trim()}”.</p>}
          {sections.map((s) => (
            <section key={s.id}>
              {needle && <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{s.title}</h3>}
              <div className="space-y-2.5">
                {s.ids.map((id) => {
                  const entry: GlossaryEntry = GLOSSARY[id];
                  return (
                    <article
                      key={id}
                      data-term={id}
                      className={`rounded-xl border px-4 py-3.5 ${
                        focus === id ? 'border-rose-400/40 bg-rose-500/[0.06]' : 'border-white/[0.07] bg-[#12131a]'
                      }`}
                    >
                      <h4 className="mb-1.5 text-sm font-semibold text-white">{entry.term}</h4>
                      <EntryBody entry={entry} />
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}
