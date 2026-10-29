import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { memberPreviewPath, STAFF_PREVIEW_NAV_MESSAGE } from '@/lib/staffPlatformView';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ReportedItemPreviewOverlay({
  open,
  path,
  title,
  onClose,
}: {
  open: boolean;
  path: string | null;
  title?: string;
  onClose: () => void;
}) {
  const safePath = memberPreviewPath(path) || '/home';
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loadedPath = useRef<string | null>(null);
  const openPath = useRef(safePath);
  openPath.current = safePath;
  const [session, setSession] = useState(0);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      loadedPath.current = null;
      setReady(false);
      setIframeSrc(null);
      return;
    }
    setSession((value) => value + 1);
    setReady(false);
    loadedPath.current = null;
    const timer = window.setTimeout(() => setIframeSrc(openPath.current), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !ready || !iframeSrc) return;
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow || loadedPath.current === safePath) return;
    loadedPath.current = safePath;
    frameWindow.postMessage(
      { type: STAFF_PREVIEW_NAV_MESSAGE, path: safePath },
      window.location.origin
    );
  }, [open, ready, safePath, iframeSrc]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-black/50 md:left-[260px]"
            onClick={onClose}
            aria-label="Close preview"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Reported item'}
            className="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-[1100px] flex-col overflow-hidden border-l border-white/[0.08] bg-[#0b0c12] shadow-[0_0_80px_rgba(0,0,0,0.45)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <header className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to report
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{title || 'Reported item'}</p>
                <p className="truncate text-[11px] text-zinc-500">{safePath}</p>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 bg-[#111218]">
              {iframeSrc ? (
                <iframe
                  key={session}
                  ref={frameRef}
                  title={title || 'Reported item'}
                  src={iframeSrc}
                  sandbox="allow-scripts allow-same-origin"
                  onLoad={() => {
                    loadedPath.current = iframeSrc;
                    setReady(true);
                  }}
                  className={`h-full w-full bg-white transition-opacity duration-500 ease-out ${
                    ready ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ) : null}
              <AnimatePresence>
                {!ready && (
                  <motion.div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111218]"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <Loader2 className="h-7 w-7 animate-spin text-sky-300" />
                    <p className="text-xs text-zinc-500">Opening the reported item…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
