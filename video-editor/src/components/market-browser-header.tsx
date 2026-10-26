import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarketBrowserHeaderProps {
  title: string;
  subtitle: ReactNode;
  onBack: () => void;
  backLabel: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function MarketBrowserHeader({ title, subtitle, onBack, backLabel, actions, children }: MarketBrowserHeaderProps) {
  return <div className="p-4">
    <Button type="button" size="icon" variant="ghost" className="group mb-3 -ml-1 size-6 p-0 text-muted-foreground hover:bg-transparent dark:hover:bg-transparent" aria-label={backLabel} onClick={onBack}>
      <ArrowLeft className="size-4 transition-colors group-hover:text-white group-focus-visible:text-white" />
    </Button>
    <div className="flex items-center justify-between gap-2">
      <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-200">{title}</h2>
      {actions}
    </div>
    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{subtitle}</p>
    {children}
  </div>;
}
