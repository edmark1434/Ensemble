'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { Archive } from 'lucide-react';

const HYST = 8;
const FLICK = 110;
const DECEL = 0.998;
const VMAX = 1500;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: 'spring' as const, duration: 0.28, bounce: 0 };
const DEFAULT_ACTIONS: SwipeAction[] = [{ id: 'archive', label: 'Archive' }];

export interface SwipeAction {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: string;
  dismiss?: boolean;
  onSelect?: () => void;
}

export interface SwipeRowProps {
  children?: ReactNode;
  actions?: SwipeAction[];
  actionColor?: string;
  drawerColor?: string;
  isUnread?: boolean;
  radius?: number;
  actionWidth?: number;
  direction?: 'left' | 'right';
  snapBounce?: number;
  resistance?: number;
  collapseMs?: number;
  commitAt?: number;
  fullSwipe?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (action: SwipeAction) => void;
  onCommit?: (action: SwipeAction) => void;
  closeOnAction?: boolean;
  haptic?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

type Sample = [number, number];
type Phase = 'idle' | 'committing' | 'collapsing';

interface Grip {
  id: number;
  x0: number;
  y0: number;
  grab: number | null;
  moved: boolean;
  hist: Sample[];
  touch: boolean;
}

interface Live {
  move: (e: PointerEvent) => void;
  up: (e: PointerEvent) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rubber = (o: number, dim: number, c: number) => (o * dim * c) / (dim + c * Math.abs(o));
const unrubber = (y: number, dim: number, c: number) => (y * dim) / (c * Math.max(1, dim - Math.abs(y)));
const project = (v: number) => ((v / 1000) * DECEL) / (1 - DECEL);
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const a = hist[0];
  const b = hist[hist.length - 1];
  return ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
};

const watchWindow = (live: { current: Live }) => {
  const onMove = (e: PointerEvent) => {
    if (e.isTrusted) live.current.move(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.isTrusted) live.current.up(e);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };
};

const SwipeRow: React.FC<SwipeRowProps> = ({
  children,
  actions = DEFAULT_ACTIONS,
  actionColor = '#334155',
  drawerColor = '#334155',
  isUnread = false,
  radius = 12,
  actionWidth = 74,
  direction = 'left',
  snapBounce = 0.15,
  resistance = 0.55,
  collapseMs = 200,
  commitAt = 0.45,
  fullSwipe = true,
  disabled = false,
  open: openProp,
  onOpenChange,
  onAction,
  onCommit,
  closeOnAction = true,
  haptic = true,
  label = 'Notification item',
  className = '',
  style
}) => {
  const uid = useId();
  const reduce = useReducedMotion();
  const s = direction === 'left' ? -1 : 1;
  const A = actionWidth;
  const n = actions.length;
  const D = n * A;
  const c = clamp(resistance, 0.05, 1);
  const primary = actions[0];
  const [openState, setOpenState] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [say, setSay] = useState('');
  const open = openProp ?? openState;

  const root = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const w = useRef(360);
  const grip = useRef<Grip | null>(null);
  const unwatch = useRef<(() => void) | null>(null);
  const live = useRef<Live>({} as Live);
  const foldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heading = useRef<number | null>(null);
  const collapseH = useRef<number>(76);

  const x = useMotionValue(0);
  const spread = useMotionValue(0);
  const commitPoint = () => Math.max(commitAt * w.current, D + A / 2);
  const canCommit = () => fullSwipe && n > 0 && commitPoint() <= w.current;
  const exposed = useTransform(x, v => s * v);
  const railOpacity = useTransform(exposed, [0, 4], [0, 1]);
  const surfaceXf = useTransform(x, v => `translateX(${v}px)`);

  const map = (raw: number) => {
    const W = w.current;
    if (raw < 0) return rubber(raw, W, 0.2); // light rubber band when dragging right
    if (raw <= D) return raw;
    if (!canCommit()) return D + rubber(raw - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return raw <= knee ? D + c * (raw - D) : C + rubber(raw - knee, W, c);
  };
  const inv = (ex: number) => {
    const W = w.current;
    if (ex < 0) return unrubber(ex, W, 0.2);
    if (ex <= D) return ex;
    if (!canCommit()) return D + unrubber(ex - D, W, c);
    const C = commitPoint();
    const knee = D + (C - D) / c;
    return ex <= C ? D + (ex - D) / c : knee + unrubber(ex - C, W, c);
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    w.current = el.offsetWidth || w.current;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) w.current = width;
      if (surface.current && surface.current.offsetHeight > 0) {
        collapseH.current = surface.current.offsetHeight + 2;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(foldTimer.current);
      unwatch.current?.();
    },
    []
  );

  const setOpen = (next: boolean) => {
    if (next === open) return;
    setOpenState(next);
    onOpenChange?.(next);
  };
  const settle = (target: number, v = 0) => {
    heading.current = target;
    if (reduce) {
      animate(x, s * target, { duration: 0.2, ease: EASE_OUT });
      return;
    }
    const flick = Math.abs(v) >= FLICK;
    animate(
      x,
      s * target,
      flick
        ? { type: 'spring', duration: 0.35, bounce: snapBounce, velocity: s * clamp(v, -VMAX, VMAX) }
        : { ...SPRING_UI, velocity: s * v }
    );
  };
  const setSpread = (on: boolean) => {
    if ((spread.get() === 1) === on) return;
    if (reduce) spread.set(on ? 1 : 0);
    else animate(spread, on ? 1 : 0, SPRING_UI);
    if (on && primary) {
      setSay(`Release to ${primary.label}`);
      if (haptic && grip.current?.touch) navigator.vibrate?.(8);
    }
  };
  const commit = (a: SwipeAction, viaKey: boolean, v = 0) => {
    setPhase('committing');
    setSay(a.label);
    setOpen(false);
    const fold = () => {
      setPhase('collapsing');
      foldTimer.current = setTimeout(() => {
        onCommit?.(a);
        a.onSelect?.();
      }, collapseMs);
    };
    if (viaKey || reduce) {
      if (viaKey) {
        x.set(s * w.current);
        fold();
      } else animate(x, s * w.current, { duration: 0.2, ease: EASE_OUT }).then(fold);
      return;
    }
    animate(x, s * w.current, { ...SPRING_UI, velocity: s * v }).then(fold);
  };

  useEffect(() => {
    if (openProp === undefined || grip.current || phase !== 'idle') return;
    const target = open ? D : 0;
    if (heading.current === target) return;
    if (Math.abs(exposed.get() - target) > 0.5) settle(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, D]);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || n === 0 || phase !== 'idle' || grip.current || e.button !== 0) return;
    x.stop();
    heading.current = null;
    grip.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      grab: null,
      moved: false,
      hist: [],
      touch: e.pointerType === 'touch'
    };
    try {
      surface.current?.setPointerCapture(e.pointerId);
    } catch {}
    unwatch.current?.();
    unwatch.current = watchWindow(live);
  };
  const move = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    if (g.grab === null) {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (Math.abs(dx) < HYST || Math.abs(dx) < Math.abs(dy)) return;
      g.grab = s * (g.x0 + Math.sign(dx) * HYST) - inv(exposed.get());
      g.moved = true;
      root.current?.setAttribute('data-dragging', '');
    }
    const ex = map(s * e.clientX - g.grab);
    x.set(s * ex);
    g.hist.push([performance.now(), ex]);
    if (g.hist.length > 4) g.hist.shift();
    setSpread(canCommit() && ex >= commitPoint());
  };
  const up = (e: PointerEvent) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    unwatch.current?.();
    unwatch.current = null;
    root.current?.removeAttribute('data-dragging');
    try {
      surface.current?.releasePointerCapture(e.pointerId);
    } catch {}
    const ex = exposed.get();
    const v = velocityOf(g.hist);
    if (!g.moved) {
      if (open) {
        setOpen(false);
        settle(0);
      }
      return;
    }
    if (primary && canCommit() && ex >= commitPoint()) {
      commit(primary, false, v);
      return;
    }
    const target = Math.abs(v) >= FLICK ? (v > 0 ? D : 0) : ex + project(v) > D / 2 ? D : 0;
    setSpread(false);
    setOpen(target === D);
    settle(target, v);
  };
  live.current = { move, up };

  const act = (a: SwipeAction, e: React.MouseEvent<HTMLButtonElement>) => {
    if (phase !== 'idle') return;
    onAction?.(a);
    if (a === primary || a.dismiss) {
      commit(a, e.detail === 0);
      return;
    }
    a.onSelect?.();
    if (!closeOnAction) return;
    setOpen(false);
    if (e.detail === 0) {
      heading.current = 0;
      x.set(0);
    } else settle(0);
  };
  const openNow = () => {
    heading.current = D;
    x.set(s * D);
    setOpen(true);
    setSay(`${n} actions revealed`);
  };
  const closeNow = () => {
    heading.current = 0;
    x.set(0);
    setOpen(false);
  };
  const onToggleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || phase !== 'idle' || n === 0) return;
    const openKey = s < 0 ? 'ArrowLeft' : 'ArrowRight';
    const closeKey = s < 0 ? 'ArrowRight' : 'ArrowLeft';
    const toggle = e.key === 'Enter' || e.key === ' ';
    if (e.key === openKey || (toggle && !open)) {
      e.preventDefault();
      openNow();
    } else if (e.key === closeKey || e.key === 'Escape' || (toggle && open)) {
      e.preventDefault();
      closeNow();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && open && primary && canCommit()) {
      e.preventDefault();
      commit(primary, true);
    }
  };
  const onToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0 || disabled || phase !== 'idle' || n === 0) return;
    if (open) closeNow();
    else openNow();
  };

  const railId = `${uid}-rail`;

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`group relative overflow-hidden rounded-xl border transition-[height,margin,opacity] duration-200 ease-out select-none ${
        isUnread
          ? 'border-gray-200/80 dark:border-white/10 shadow-2xs'
          : 'border-gray-200/50 dark:border-white/5 opacity-85 hover:opacity-100'
      } ${className}`}
      data-direction={direction}
      data-open={open ? '' : undefined}
      data-phase={phase}
      data-disabled={disabled ? '' : undefined}
      style={
        {
          height: phase === 'collapsing' ? 0 : undefined,
          marginBottom: phase === 'collapsing' ? 0 : undefined,
          opacity: phase === 'collapsing' ? 0 : 1,
          '--sr-r': `${radius}px`,
          '--sr-a': `${A}px`,
          '--sr-drawer': drawerColor,
          '--sr-action': actionColor,
          '--sr-collapse': `${collapseMs}ms`,
          ...style
        } as CSSProperties
      }
    >
      {/* Container background: Light gray on left side when dragged right */}
      <div className="relative overflow-hidden w-full h-full bg-gray-100 dark:bg-white/[0.04]">
        {/* Right side drawer (Archive): Dark slate action */}
        <motion.div
          id={railId}
          className="absolute inset-y-0 right-0 z-0 bg-slate-700 dark:bg-slate-800 overflow-hidden flex items-center justify-center"
          style={{ width: `${A}px`, opacity: railOpacity }}
          inert={!open || undefined}
          aria-hidden={!open}
        >
          {primary ? (
            <button
              type="button"
              className="w-full h-full cursor-pointer touch-manipulation grid place-items-center border-0 bg-transparent p-0 outline-none select-none text-white hover:bg-slate-600/50 transition-colors"
              onClick={e => act(primary, e)}
            >
              <span className="grid justify-items-center gap-1.5 text-[10px] uppercase tracking-wider leading-none font-bold text-white">
                <span className="inline-flex">
                  {primary.icon ?? <Archive size={16} strokeWidth={2.2} />}
                </span>
                <span>{primary.label}</span>
              </span>
            </button>
          ) : null}
        </motion.div>

        {/* Sliding Card Surface (seamless solid background) */}
        <motion.div
          ref={surface}
          className={`relative z-10 flex w-full h-full touch-pan-y items-start ${
            isUnread
              ? 'bg-gray-50/95 dark:bg-[#151827] hover:bg-gray-100/90 dark:hover:bg-[#1c2033]'
              : 'bg-white dark:bg-[#12141f] hover:bg-gray-50/80 dark:hover:bg-white/[0.04]'
          }`}
          style={{ transform: surfaceXf }}
          onPointerDown={down}
        >
          {children}
          <button
            type="button"
            className="sr-only"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-controls={railId}
            aria-keyshortcuts={s < 0 ? 'ArrowLeft' : 'ArrowRight'}
            onKeyDown={onToggleKey}
            onClick={onToggleClick}
          >
            {n} {n === 1 ? 'action' : 'actions'}
          </button>
        </motion.div>
      </div>
      <span className="sr-only" aria-live="polite">
        {say}
      </span>
    </div>
  );
};

export default SwipeRow;
