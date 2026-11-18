import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, History, Info, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useEditorPlan } from "../hooks/use-editor-plan";
import { PlanIcon } from "../components/plan-icon";
import { SaveApplyConfirmModal } from "../modals/save-apply-confirm-modal";
import { applySave } from "../utils/apply-save";
import { PROJECT_SAVES_UPDATED_EVENT, type ProjectSaveSummary, type ProjectSavesPage } from "../types/project-saves";

const DATE_FMT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

function formatSavedAt(iso: string) {
  const date = new Date(iso);
  return `${DATE_FMT.format(date)} · ${TIME_FMT.format(date)}`;
}

// "Just now" / "5 min ago" / "2 hr ago" / "3 days ago"; older saves show only their date.
function formatAge(iso: string, now: number) {
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} ${days === 1 ? "day" : "days"} ago` : null;
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

async function fetchSaves(projectId: string, before: string | null, signal?: AbortSignal): Promise<ProjectSavesPage> {
  const query = before ? `?${new URLSearchParams({ before })}` : "";
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/saves${query}`, { cache: "no-store", signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to load saves. Please try again.");
  return body as ProjectSavesPage;
}

// A refresh reloads the newest page; keep any older pages already loaded behind it.
function mergeFirstPage(previous: ProjectSavesPage | null, page: ProjectSavesPage): ProjectSavesPage {
  const last = page.saves.at(-1);
  if (!previous || !last || !page.hasMore) return page;
  const index = previous.saves.findIndex(save => save.id === last.id);
  return index < 0 ? page : { saves: [...page.saves, ...previous.saves.slice(index + 1)], hasMore: previous.hasMore };
}

function PanelAction({ label, onClick, disabled, children }: {
  label: string; onClick: () => void; disabled?: boolean; children: ReactNode;
}) {
  return (
    <Tooltip delayDuration={10}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:!bg-accent/30" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={1}>{label}</TooltipContent>
    </Tooltip>
  );
}

function SaveItem({ save, latest, now, onApply }: {
  save: ProjectSaveSummary; latest: boolean; now: number; onApply: () => void;
}) {
  const author = save.createdBy?.name ?? "Former member";
  const age = formatAge(save.createdAt, now);
  return (
    <div className="space-y-3 rounded-md border border-border/80 p-3">
      <div className="flex gap-3">
        <Avatar name={author} avatarUrl={save.createdBy?.avatarUrl} />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{formatSavedAt(save.createdAt)}</p>
            {latest && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Latest</span>}
          </div>
          <p className="truncate text-xs text-muted-foreground">{age ? `${author} · ${age}` : author}</p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={`/saves/${encodeURIComponent(save.id)}`} target="_blank" rel="noopener noreferrer"><Eye className="size-4" />Preview</a>
        </Button>
        <Button variant="default" size="sm" className="gap-2" onClick={onApply}><RotateCcw className="size-4" />Apply</Button>
      </div>
    </div>
  );
}

function SavesHistory() {
  const projectId = useStore(state => state.projectId);
  const now = useNow();
  const [data, setData] = useState<ProjectSavesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<ProjectSaveSummary | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!projectId) return;
    let disposed = false;
    let active: AbortController | null = null;
    setData(null);
    setError(null);
    const refresh = async (force = false) => {
      if (disposed || (active && !force)) return;
      if (force) active?.abort();
      const controller = new AbortController();
      active = controller;
      setRefreshing(true);
      try {
        const page = await fetchSaves(projectId, null, controller.signal);
        if (disposed || controller.signal.aborted) return;
        setData(previous => mergeFirstPage(previous, page));
        setError(null);
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load saves.");
      } finally {
        if (active === controller) {
          active = null;
          if (!disposed) setRefreshing(false);
        }
      }
    };
    refreshRef.current = () => { void refresh(true); };
    const refreshVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const refreshSaved = () => { void refresh(true); };
    void refresh();
    const interval = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    window.addEventListener(PROJECT_SAVES_UPDATED_EVENT, refreshSaved);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      disposed = true;
      active?.abort();
      refreshRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      window.removeEventListener(PROJECT_SAVES_UPDATED_EVENT, refreshSaved);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [projectId]);

  const loadMore = async () => {
    const last = data?.saves.at(-1);
    if (!projectId || !last || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchSaves(projectId, last.id);
      setData(previous => {
        if (!previous) return previous;
        const known = new Set(previous.saves.map(save => save.id));
        return { saves: [...previous.saves, ...page.saves.filter(save => !known.has(save.id))], hasMore: page.hasMore };
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to load more saves.");
    } finally {
      setLoadingMore(false);
    }
  };

  const confirmApply = async () => {
    if (!selected || !projectId || applying) return;
    setApplying(true);
    setApplyError("");
    try {
      await applySave(selected.id, projectId);
      toast.success("Save applied to the project.");
      setSelected(null);
    } catch (cause) {
      setApplyError(cause instanceof Error ? cause.message : "Unable to apply this save.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="m-0 flex min-w-0 flex-col gap-6 border-0 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-sans text-sm font-semibold">Saves</Label>
              <div className="-my-1.5 flex items-center gap-1">
                <PanelAction label="Refresh saves" onClick={() => refreshRef.current()} disabled={refreshing || !projectId}>
                  <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
                </PanelAction>
              </div>
            </div>
            <div className="flex items-start gap-2 text-pretty text-xs text-muted-foreground">
              <Info size={16} className="shrink-0" aria-hidden="true" />
              <span>Each save keeps the project and all of its scenes together. Preview a save, or apply it to replace the whole project.</span>
            </div>
          </div>

          {error && <div role="alert" className="space-y-2 text-xs text-red-500">
            <p>{error}{data ? " Showing the last loaded saves." : ""}</p>
            <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => refreshRef.current()}>Try again</Button>
          </div>}
          {!data && !error && <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading saves...</div>}
          {data && data.saves.length === 0 && <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <History size={24} />
            <p className="text-sm">No saves yet.</p>
            <p className="max-w-64 text-xs leading-relaxed">Click the save button in the top bar to save the project and its scenes as a version you can come back to.</p>
          </div>}
          {data && data.saves.length > 0 && <section className="space-y-2" aria-label="Saves">
            {data.saves.map((save, index) => <SaveItem key={save.id} save={save} latest={index === 0} now={now}
              onApply={() => { setApplyError(""); setSelected(save); }} />)}
            {data.hasMore && <Button variant="outline" size="sm" className="mt-2 w-full" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore && <Loader2 className="size-4 animate-spin" />}Load more
            </Button>}
          </section>}
        </div>
      </ScrollArea>
      {selected && <SaveApplyConfirmModal savedAt={formatSavedAt(selected.createdAt)} pending={applying} error={applyError}
        onCancel={() => setSelected(null)} onConfirm={() => void confirmApply()} />}
    </div>
  );
}

export function SavesPanel() {
  const { data: policy, isError, refetch } = useEditorPlan();
  if (!policy) return <output className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-sm text-muted-foreground">
    {isError ? <>Unable to load your plan.<Button variant="outline" onClick={() => void refetch()}>Try again</Button></> : "Loading your plan…"}
  </output>;
  if (policy.plan === "Free") return <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
    <PlanIcon plan="Premium" className="size-10" />
    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">Upgrade to Premium or Business to browse, preview, and apply earlier saves of your project and its scenes.</p>
    <Button asChild><a href={policy.upgradeUrl} target="_blank" rel="noopener noreferrer">Upgrade plan</a></Button>
  </div>;
  return <SavesHistory />;
}
