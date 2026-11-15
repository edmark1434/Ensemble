import { cn } from "@/lib/utils";

export function UploadDropOverlay({ isDragOver, error, className }: {
  isDragOver: boolean;
  error: string | null;
  className?: string;
}) {
  if (!isDragOver && !error) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-md border border-dashed",
        error ? "border-red-500 bg-red-500/10" : "border-primary bg-primary/10",
        className,
      )}
    >
      {error && (
        <span role="status" className="rounded bg-card/90 px-3 py-1 text-sm font-medium text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}
