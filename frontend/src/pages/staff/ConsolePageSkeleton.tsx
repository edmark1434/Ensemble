/**
 * Placeholder for a staff console page while its first data loads. Mirrors the common
 * layout (sticky header, tab row, stat tiles, two panels) so the page does not jump when
 * content arrives. The shimmer is CSS-only and stops under prefers-reduced-motion.
 */
export default function ConsolePageSkeleton({ tiles = 4, tabs = true }: { tiles?: number; tabs?: boolean }) {
  return (
    <main className="relative z-10 min-h-screen md:pl-[260px]" aria-busy="true" aria-label="Loading">
      <div className="border-b border-white/[0.06] px-6 py-4 md:px-8">
        <div className="console-skeleton h-2.5 w-28 rounded-full" />
        <div className="console-skeleton mt-3 h-5 w-56 rounded-lg" />
        <div className="console-skeleton mt-2 h-3 w-72 max-w-full rounded-full" />
        {tabs && (
          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="console-skeleton h-7 w-24 rounded-lg" />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className={`grid gap-3 sm:grid-cols-2 ${tiles >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-[#14151c] p-5">
              <div className="console-skeleton h-2.5 w-24 rounded-full" />
              <div className="console-skeleton mt-4 h-7 w-28 rounded-lg" />
              <div className="console-skeleton mt-3 h-2.5 w-36 rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-white/[0.06] bg-[#14151c] p-5">
            <div className="console-skeleton h-3.5 w-40 rounded-full" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="console-skeleton h-9 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#14151c] p-5">
            <div className="console-skeleton h-3.5 w-32 rounded-full" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="console-skeleton h-8 w-8 rounded-full" />
                  <div className="console-skeleton h-3 flex-1 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
