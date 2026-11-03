import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useStore from "../store/use-store";
import { mediaSources, mediaSourceKey } from "../utils/media-sources";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteUploadModal({
  id,
  name,
  source,
  open,
  pending,
  onClose,
  onConfirm,
}: { id: string; name: string; source: string; open: boolean; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  const editor = useStore();
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["upload-usage", id],
    staleTime: 0,
    enabled: open,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/media-assets/${id}/usage`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unable to check projects.");
      return response.json() as Promise<{ sources: string[]; projects: { projectId: string | null; name: string; locations: string[] }[] }>;
    },
  });
  // The current document may not have reached the persistence debounce yet.
  // Merge it directly, rather than claiming no usage from an older server snapshot.
  const sourceKeys = new Set([source, ...(data?.sources || [])].map(mediaSourceKey));
  const usedHere = mediaSources(editor).some(value => sourceKeys.has(mediaSourceKey(value)));
  const projects = (data?.projects || []).map(project => ({ ...project, locations: [...project.locations] }));
  if (usedHere) {
    const location = editor.activeSceneBlockId ? editor.currentBlockName || "Current scene" : "Project timeline";
    const existing = projects.find(project => project.projectId === editor.projectId);
    if (existing) { if (!existing.locations.includes(location)) existing.locations.push(location); }
    else projects.unshift({ projectId: editor.projectId, name: editor.projectName || "Current project", locations: [location] });
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        className="z-[250] max-h-[calc(100dvh-2rem)] overflow-y-auto border bg-card px-2 py-8 gap-6 sm:max-w-lg"
        showCloseButton={!pending}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader className="px-6 -mt-0.75">
          <DialogTitle className="text-md font-semibold">Delete upload forever?</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 px-6">
          <DialogDescription className="leading-relaxed text-pretty">
            Permanently delete <span className="font-medium text-foreground break-words">{name}</span>?
            This cannot be undone. Clips using this upload will show missing media and must be replaced or removed before export.
          </DialogDescription>
          {isFetching ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking projects and scenes…
            </p>
          ) : isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>Unable to check where this upload is used.</p>
              <Button variant="outline" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.length ? (
                <>
                  <p className="text-sm font-medium">Used in {projects.length} {projects.length === 1 ? "project" : "projects"}</p>
                  <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                    {projects.map((project, i) => {
                      const scenes = project.locations.filter(location => location !== "Project timeline");
                      return <li key={project.projectId || i} className="px-4 py-3">
                        <p className="break-words text-sm font-medium">{project.name}</p>
                        {scenes.length > 0 && <p className="mt-1 break-words text-xs text-muted-foreground">Scenes: {scenes.join(" · ")}</p>}
                      </li>;
                    })}
                  </ul>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    If these projects have collaborators, this deletion affects them too.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This upload is not used in any saved project or scene.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="outline" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || isFetching || isError || !data}
              onClick={onConfirm}
            >
              {pending ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
