import React, { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { X } from 'lucide-react';

export type SwipeToastCloseReason = 'timeout' | 'swipe' | 'action' | 'close' | 'escape' | 'programmatic';
export type SwipeToastFuse = 'bottom' | 'top' | 'none';
export type SwipeToastPhase = 'open' | 'closing' | 'gone';

export interface SwipeToastProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  open?: boolean;
  onClose?: (reason: SwipeToastCloseReason) => void;
  onClick?: () => void;
  fuseColor?: string;
  radius?: number;
  slideMs?: number;
  settleBounce?: number;
  swipeDistance?: number;
  duration?: number;
  fuse?: SwipeToastFuse;
  pauseOnHover?: boolean;
  closeButton?: boolean;
  inline?: boolean;
  dismissible?: boolean;
  className?: string;
}

type Sample = [number, number];

interface Drag {
  id: number;
  startX: number;
  grab: number | null;
  moved: boolean;
  hist: Sample[];
}

interface Latest {
  onClose?: (reason: SwipeToastCloseReason) => void;
  slideMs: number;
  inline: boolean;
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const FLICK = 0.11;
const DEAD_ZONE = 5;
const RESIST_PX = 24;
const COLLAPSE_MS = 200;
const EXIT = 0.7;
const BURN = [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }];
const HAS_STARTING_STYLE = typeof window !== 'undefined' && 'CSSStartingStyleRule' in window;

const rubberband = (over: number, dim: number, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));
const velocityOf = (hist: Sample[]) => {
  if (hist.length < 2) return 0;
  const [t0, x0] = hist[0];
  const [t1, x1] = hist[hist.length - 1];
  return performance.now() - t1 > 100 ? 0 : (x1 - x0) / Math.max(1, t1 - t0);
};

export const SwipeToast: React.FC<SwipeToastProps> = ({
  title,
  description = '',
  icon,
  children,
  open = true,
  onClose,
  onClick,
  fuseColor = '#f5a524',
  radius = 12,
  slideMs = 360,
  settleBounce = 0.2,
  swipeDistance = 44,
  duration = 4000,
  fuse = 'bottom',
  pauseOnHover = true,
  closeButton = false,
  inline = false,
  dismissible = true,
  className = ''
}) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<SwipeToastPhase>('open');
  const [instant, setInstant] = useState(false);
  const [mounted, setMounted] = useState(HAS_STARTING_STYLE);
  const cardRef = useRef<HTMLDivElement>(null);
  const fuseRef = useRef<HTMLElement>(null);
  const anim = useRef<Animation | null>(null);
  const drag = useRef<Drag | null>(null);
  const flags = useRef({ hover: false, interacting: false, focus: false, hidden: false });
  const lastInput = useRef<'pointer' | 'keyboard'>('pointer');
  const pendingClose = useRef<SwipeToastCloseReason | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reason = useRef<SwipeToastCloseReason>('timeout');
  const leaving = useRef(false);
  const suppressClick = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const latest = useRef<Latest>({} as Latest);
  latest.current = { onClose, slideMs, inline };

  const x = useMotionValue(0);
  const fade = useMotionValue(1);
  const transform = useTransform(x, v => `translateX(${v}px)`);

  const syncFuse = () => {
    const a = anim.current;
    if (!a) return;
    const f = flags.current;
    if (f.hover || f.interacting || f.focus || f.hidden) a.pause();
    else if (a.playState === 'paused') a.play();
  };
  const finish = (why: SwipeToastCloseReason) => {
    setPhase('gone');
    leaving.current = false;
    if (latest.current.inline) closeTimer.current = setTimeout(() => latest.current.onClose?.(why), COLLAPSE_MS);
    else latest.current.onClose?.(why);
  };
  const close = (why: SwipeToastCloseReason) => {
    if (phaseRef.current !== 'open' || leaving.current) return;
    if (drag.current) {
      pendingClose.current = why;
      return;
    }
    anim.current?.pause();
    reason.current = why;
    const now = why === 'escape' || ((why === 'action' || why === 'close') && lastInput.current === 'keyboard');
    setInstant(now);
    setPhase('closing');
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => finish(why), now ? 0 : latest.current.slideMs * EXIT + 60);
  };
  const rescue = () => {
    clearTimeout(closeTimer.current);
    setInstant(false);
    x.set(0);
    fade.set(1);
    setPhase('open');
  };

  const showFuse = fuse !== 'none' && duration > 0 && Number.isFinite(duration);

  useEffect(() => {
    if (!open) close('programmatic');
    else if (phaseRef.current !== 'open') rescue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!HAS_STARTING_STYLE) requestAnimationFrame(() => setMounted(true));
  }, []);
  useEffect(() => {
    if (phase !== 'open' || !showFuse || !fuseRef.current) return undefined;
    anim.current?.cancel();
    const a = fuseRef.current.animate(BURN, { duration, easing: 'linear', fill: 'forwards' });
    a.onfinish = () => close('timeout');
    anim.current = a;
    syncFuse();
    return () => {
      a.onfinish = null;
      a.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, duration, showFuse, fuseColor]);
  useEffect(() => {
    if (!pauseOnHover) {
      flags.current.hover = false;
      syncFuse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseOnHover]);
  useEffect(() => {
    const onVisibility = () => {
      flags.current.hidden = document.hidden;
      syncFuse();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(closeTimer.current);
      anim.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipeOut = (dx: number, v: number) => {
    anim.current?.pause();
    leaving.current = true;
    pendingClose.current = null;
    if (!reduce && cardRef.current) {
      animate(x, dx + cardRef.current.offsetWidth, { type: 'spring', duration: 0.3, bounce: 0, velocity: v * 1000 });
    }
    animate(fade, 0, { duration: 0.2, ease: EASE_OUT }).then(() => finish('swipe'));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    lastInput.current = 'pointer';
    suppressClick.current = false;
    if (
      e.button !== 0 ||
      !dismissible ||
      drag.current ||
      leaving.current ||
      (e.target as HTMLElement).closest('button')
    )
      return;
    if (phaseRef.current === 'closing') rescue();
    x.stop();
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      grab: null,
      moved: false,
      hist: [[performance.now(), x.get()]]
    };
    flags.current.interacting = true;
    syncFuse();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.grab === null) {
      if (Math.abs(e.clientX - d.startX) < DEAD_ZONE) return;
      d.grab = e.clientX - x.get();
      if (cardRef.current) {
        cardRef.current.dataset.swiping = '';
        try {
          cardRef.current.setPointerCapture(e.pointerId);
        } catch {}
      }
    }
    const raw = e.clientX - d.grab;
    // Swipe right (raw >= 0) moves freely to dismiss; swipe left (raw < 0) rubberbands
    const next = raw >= 0 ? raw : rubberband(raw, RESIST_PX);
    x.set(next);
    d.moved = true;
    suppressClick.current = true;
    d.hist.push([performance.now(), next]);
    if (d.hist.length > 4) d.hist.shift();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (cardRef.current) delete cardRef.current.dataset.swiping;
    flags.current.interacting = false;
    const pending = pendingClose.current;
    pendingClose.current = null;
    if (!d.moved) {
      if (pending) close(pending);
      else syncFuse();
      return;
    }
    const dx = x.get();
    const v = velocityOf(d.hist);
    if (dx >= swipeDistance || (dx > 6 && v > FLICK)) {
      swipeOut(dx, v);
      return;
    }
    if (pending) {
      close(pending);
      return;
    }
    syncFuse();
    if (reduce) x.set(0);
    else animate(x, 0, { type: 'spring', duration: 0.4, bounce: settleBounce });
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (cardRef.current) delete cardRef.current.dataset.swiping;
    flags.current.interacting = false;
    const pending = pendingClose.current;
    pendingClose.current = null;
    if (pending) {
      close(pending);
      return;
    }
    syncFuse();
    x.set(0);
  };

  const onMouseEnter = () => {
    if (!pauseOnHover) return;
    flags.current.hover = true;
    syncFuse();
  };
  const onMouseLeave = () => {
    if (!pauseOnHover) return;
    flags.current.hover = false;
    syncFuse();
  };
  const onFocusCapture = () => {
    flags.current.focus = true;
    syncFuse();
  };
  const onBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
    if (cardRef.current?.contains(e.relatedTarget as Node | null)) return;
    flags.current.focus = false;
    syncFuse();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    lastInput.current = 'keyboard';
    if (e.key === 'Escape' && dismissible) {
      e.stopPropagation();
      close('escape');
    }
  };

  const handleCardClick = () => {
    if (suppressClick.current || leaving.current) {
      suppressClick.current = false;
      return;
    }
    if (onClick) {
      onClick();
      close('action');
    }
  };

  if (phase === 'gone' && !inline) return null;

  const isClosing = phase === 'closing';
  const dur = reduce || instant ? 0 : isClosing ? slideMs * EXIT : slideMs;
  const spring: CSSProperties = {
    ['--st-r' as string]: `${radius}px`,
    ['--st-fuse' as string]: fuseColor,
    ['--st-dur' as string]: `${dur}ms`,
    transitionTimingFunction: isClosing
      ? 'cubic-bezier(0.23, 1, 0.32, 1)'
      : 'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)',
    fontFamily: "'Plus Jakarta Sans', sans-serif"
  };

  const card = (
    <motion.div
      ref={cardRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-phase={phase}
      data-entered={mounted ? '' : undefined}
      onClick={onClick ? handleCardClick : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      onKeyDown={onKeyDown}
      style={{ ...spring, transform, opacity: fade, touchAction: 'pan-y' }}
      className={[
        'relative box-border overflow-hidden rounded-[var(--st-r)] select-none pointer-events-auto',
        'bg-white dark:bg-[#27272a] text-gray-900 dark:text-[#f5f5f5]',
        'border border-gray-200/80 dark:border-white/10',
        'shadow-[0_12px_32px_-8px_rgba(0,0,0,0.16)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)]',
        "font-['Plus_Jakarta_Sans',sans-serif] text-[13px] leading-[1.35] tracking-[-0.006em] antialiased",
        'transition-[translate,scale,opacity] duration-[var(--st-dur)]',
        'not-data-entered:translate-x-[calc(100%+16px)] not-data-entered:scale-[0.97] not-data-entered:opacity-0',
        'starting:translate-x-[calc(100%+16px)] starting:scale-[0.97] starting:opacity-0',
        'data-[phase=closing]:pointer-events-none data-[phase=closing]:translate-x-[calc(100%+16px)] data-[phase=closing]:scale-[0.97] data-[phase=closing]:opacity-0',
        'data-[phase=gone]:pointer-events-none data-[phase=gone]:opacity-0',
        dismissible ? 'data-swiping:cursor-grabbing' : '',
        onClick ? 'cursor-pointer' : dismissible ? 'cursor-grab' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children ? (
        children
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">
          {icon ? (
            <span className="grid shrink-0 place-items-center" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {title ? <div className="line-clamp-2 break-words font-semibold text-gray-900 dark:text-[#f5f5f5]">{title}</div> : null}
            {description ? <div className="line-clamp-2 break-words text-[12px] text-gray-500 dark:text-zinc-400">{description}</div> : null}
          </div>
          {closeButton ? (
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={e => {
                e.stopPropagation();
                close('close');
              }}
              className="-mr-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-[calc(var(--st-r)*0.5)] border-0 bg-transparent p-0 text-current opacity-50 transition-[opacity,background-color,scale] duration-120 hover:bg-black/5 dark:hover:bg-white/10 hover:opacity-90 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current active:scale-[0.93]"
            >
              <X size={13} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      )}
      {showFuse ? (
        <span
          ref={fuseRef}
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--st-fuse) 18%, transparent) 9%, color-mix(in srgb, var(--st-fuse) 36%, transparent) 22%, color-mix(in srgb, var(--st-fuse) 58%, transparent) 41%, color-mix(in srgb, var(--st-fuse) 78%, transparent) 64%, var(--st-fuse) 100%)'
          }}
          className={[
            'pointer-events-none absolute inset-x-0 h-0.5 origin-left will-change-transform',
            fuse === 'top' ? 'top-0' : 'bottom-0'
          ].join(' ')}
        />
      ) : null}
    </motion.div>
  );

  if (!inline) return card;

  const gone = phase === 'gone';
  return (
    <div
      style={{
        gridTemplateRows: gone ? '0fr' : '1fr',
        transition: `grid-template-rows ${reduce || instant ? 0 : COLLAPSE_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`
      }}
      className={['grid', gone ? 'pointer-events-none' : ''].filter(Boolean).join(' ')}
    >
      <div className={gone ? 'min-h-0 overflow-hidden' : 'min-h-0'}>{card}</div>
    </div>
  );
};

export default SwipeToast;
