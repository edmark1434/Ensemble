import type { ReactNode } from "react";

export function MarketCollectionRow({ title, description, icon, onOpen }: {
  title: string;
  description: string;
  icon: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button type="button" onClick={onOpen}
      title={title} className="group flex min-w-0 w-full items-center gap-2 rounded bg-secondary/70 px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-0.5 block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-300">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
