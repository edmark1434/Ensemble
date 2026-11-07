"use client";

export default function PreviewError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center p-6">
    <div className="max-w-md rounded-xl border border-border bg-background p-6">
      <h1 className="text-lg font-semibold">Unable to load the preview</h1>
      <p className="mt-2 text-sm text-muted-foreground">The saved snapshot could not be loaded. Please try again.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg border border-border px-3 py-2 text-sm font-semibold">Try again</button>
    </div>
  </main>;
}
