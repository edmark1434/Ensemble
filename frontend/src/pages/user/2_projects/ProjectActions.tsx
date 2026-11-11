import { AlertDialog, DropdownMenu } from "radix-ui";
import { Loader2, MoreVertical, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

export type ProjectAction = "trash" | "restore" | "permanent";

export function ProjectActions({ project, pending, onAction }: {
  project: { id: string; name: string; role?: string; status?: string; trashedAt?: string | null; expiresAt?: string | null };
  pending: boolean;
  onAction: (action: ProjectAction) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  if (project.role !== "Owner") return null;
  const frozen = project.status?.toLowerCase() === "frozen";
  const expired = !!project.expiresAt && new Date(project.expiresAt).getTime() <= Date.now();
  const itemClass = "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

  return <div className="shrink-0" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={`Actions for ${project.name}`} disabled={pending}
          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-white/10 dark:bg-dark-surface dark:text-zinc-300 dark:hover:bg-white/10">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={5} className="z-[150] min-w-40 rounded-lg border border-gray-200 bg-white p-1 text-gray-900 shadow-lg dark:border-white/10 dark:bg-dark-surface dark:text-white">
          {frozen && <p className="px-3 py-2 text-xs text-gray-500 dark:text-zinc-400">This project is frozen.</p>}
          {project.trashedAt ? <>
            <DropdownMenu.Item className={itemClass} disabled={pending || frozen || expired} onSelect={() => void onAction("restore")}>
              <RotateCcw className="h-4 w-4" /> Restore
            </DropdownMenu.Item>
            <DropdownMenu.Item className={`${itemClass} text-red-500`} disabled={pending || frozen} onSelect={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4" /> Delete forever
            </DropdownMenu.Item>
          </> : <DropdownMenu.Item className={`${itemClass} text-red-500`} disabled={pending || frozen} onSelect={() => void onAction("trash")}>
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenu.Item>}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <AlertDialog.Root open={confirming} onOpenChange={open => { if (!pending) setConfirming(open); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[200] bg-black/60" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[201] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-dark-surface">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Delete project forever?</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            “{project.name}” will no longer be recoverable by you or its collaborators. Your uploads will stay in your library. This cannot be undone.
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel disabled={pending} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300">Cancel</AlertDialog.Cancel>
            <button type="button" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              onClick={async () => { if (await onAction("permanent")) setConfirming(false); }}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Delete forever
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </div>;
}
