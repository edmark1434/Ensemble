type PortalEmptyDashboardProps = {
  title: string;
  subtitle?: string;
};

export default function PortalEmptyDashboard({ title, subtitle }: PortalEmptyDashboardProps) {
  return (
    <main className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 md:pl-[260px] md:px-8">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 px-8 py-12 text-center shadow-lg shadow-black/20">
        <h1 className="text-2xl font-semibold tracking-wide text-white">{title}</h1>
        <p className="mt-3 text-sm text-zinc-400">
          {subtitle ?? 'Dashboard content coming soon.'}
        </p>
      </div>
    </main>
  );
}
