import { useEffect, useRef, useState, type ReactNode } from "react";
import { BriefcaseBusiness, CalendarDays, Check, ChevronDown, Circle, Flag, Loader2, LockKeyhole, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import type { EditorWorkspaceSnapshot, WorkspaceProgress, WorkspaceTask, WorkspaceTaskStatus } from "../types/workspace";

const statuses: { key: WorkspaceTaskStatus; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "text-muted-foreground" },
  { key: "in_progress", label: "In progress", color: "text-primary" },
  { key: "review", label: "In review", color: "text-amber-500" },
  { key: "completed", label: "Finished", color: "text-green-500" },
  { key: "overdue", label: "Overdue", color: "text-red-500" },
];
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
function dueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}
function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase());
}

function ProgressSummary({ value, label }: { value: WorkspaceProgress; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{value.completed} of {value.total} tasks finished</span>
        <span className="font-medium tabular-nums">{value.percent}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={value.percent} aria-valuemin={0} aria-valuemax={100}
        aria-valuetext={`${value.completed} of ${value.total} tasks finished`}
        className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${value.percent}%` }} />
      </div>
    </div>
  );
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

function TaskItem({ task }: { task: WorkspaceTask }) {
  const status = statuses.find(item => item.key === task.status)!;
  const date = dueDate(task.dueAt);
  return (
    <details className="group rounded-md border border-border/80">
      <summary className="flex cursor-pointer list-none items-start gap-2.5 rounded-md p-3 hover:bg-accent/20 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {task.status === "completed" ? <Check size={15} className="mt-0.5 shrink-0 text-green-500" /> : <Circle size={15} className={cn("mt-0.5 shrink-0", status.color)} />}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="break-words text-sm font-medium">{task.title}</p>
          {task.milestoneTitle && <p className="break-words text-xs text-muted-foreground">{task.milestoneTitle}</p>}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={status.color}>{status.label}</span>
            {date && <span className={cn("flex items-center gap-1 text-muted-foreground", task.status === "overdue" && "text-red-500")}><CalendarDays size={12} />{date}</span>}
            {task.locked && <span className="flex items-center gap-1 text-muted-foreground"><LockKeyhole size={12} />Locked</span>}
          </div>
        </div>
        <ChevronDown size={14} className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-border/80 px-3 py-3 text-xs text-muted-foreground">
        <p className="whitespace-pre-wrap break-words leading-relaxed">{task.description || "No description added."}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Priority: {statusLabel(task.priority)}</span>
          {task.assignedBy && <span className="break-words">Assigned by {task.assignedBy}</span>}
        </div>
      </div>
    </details>
  );
}

export function WorkspacePanel() {
  const projectId = useStore(s => s.projectId);
  const userId = useStore(s => s.userId);
  const selectionKey = useStore(s => s.activeIds.join(","));
  const previousSelection = useRef(selectionKey);
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);
  useEffect(() => {
    if (selectionKey && selectionKey !== previousSelection.current) setActiveRightItem("controls");
    previousSelection.current = selectionKey;
  }, [selectionKey, setActiveRightItem]);
  // Key personal data by both identities, including when switching scenes/projects.
  return <WorkspacePanelContent key={`${projectId}:${userId}`} projectId={projectId} />;
}

function WorkspacePanelContent({ projectId }: { projectId?: string }) {
  const [data, setData] = useState<EditorWorkspaceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [filter, setFilter] = useState<WorkspaceTaskStatus | "all">("all");
  const refreshRef = useRef<() => void>(() => {});
  const setActiveRightItem = useLayoutStore(s => s.setActiveRightItem);

  useEffect(() => {
    if (!projectId) return;
    let disposed = false;
    let active: AbortController | null = null;
    const refresh = async () => {
      if (active || disposed) return;
      const controller = new AbortController();
      active = controller;
      setRefreshing(true);
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, { cache: "no-store", signal: controller.signal });
        if (disposed) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setData(null);
          throw new Error(response.status === 401 ? "Sign in again to view your workspace." : response.status === 403
            ? "You no longer have access to this project." : "Unable to refresh your workspace. Please try again.");
        }
        const snapshot: EditorWorkspaceSnapshot = await response.json();
        if (disposed) return;
        setData(snapshot);
        setError(null);
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load your workspace.");
      } finally {
        active = null;
        if (!disposed) setRefreshing(false);
      }
    };
    refreshRef.current = () => { void refresh(); };
    const refreshVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const interval = window.setInterval(refreshVisible, 30_000);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      disposed = true;
      active?.abort();
      refreshRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [projectId]);

  const workspace = data?.workspaces.find(item => item.id === workspaceId) ?? data?.workspaces[0];
  const tasks = workspace?.tasks.filter(task => filter === "all" || task.status === filter) ?? [];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="m-0 flex min-w-0 flex-col gap-6 border-0 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-sans text-sm font-semibold">Workspace</Label>
              <div className="-my-1.5 flex items-center gap-1">
                <PanelAction label="Refresh workspace" onClick={() => refreshRef.current()} disabled={refreshing || !projectId}>
                  <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
                </PanelAction>
                <PanelAction label="Close workspace" onClick={() => setActiveRightItem("controls")}><X size={18} /></PanelAction>
              </div>
            </div>
            {data && data.workspaces.length > 1 ? (
              <Select value={workspace?.id} onValueChange={value => { setWorkspaceId(value); setFilter("all"); }}>
                <SelectTrigger className="w-full min-w-0" aria-label="Linked workspace"><SelectValue /></SelectTrigger>
                <SelectContent>{data.workspaces.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : workspace && <p className="break-words text-sm text-muted-foreground">{workspace.name}</p>}
          </div>

          {error && <div role="alert" className="space-y-2 text-xs text-red-500">
            <p>{error}{data ? " Showing the last loaded information." : ""}</p>
            <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => refreshRef.current()}>Try again</Button>
          </div>}
          {!data && !error && projectId && <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading workspace...</div>}
          {(!projectId || (data && !workspace)) && <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <BriefcaseBusiness size={24} />
            <p className="text-sm">No linked workspace available.</p>
            <p className="max-w-64 text-xs leading-relaxed">Link this project from a workspace you belong to to see your milestone and assigned tasks here.</p>
          </div>}

          {workspace && <>
            <section className="space-y-3" aria-label="My milestone">
              <div className="flex items-center gap-2"><Flag size={15} className="text-muted-foreground" /><Label className="text-sm font-semibold">My milestone{workspace.milestones.length > 1 ? "s" : ""}</Label></div>
              {workspace.milestones.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">No current milestone on your contracts in this workspace. Tasks assigned to you still appear below.</p>}
              {workspace.milestones.map(milestone => <div key={milestone.id} className="space-y-3 rounded-md border border-border/80 p-3">
                <div className="space-y-1.5">
                  <p className="break-words text-sm font-medium">{milestone.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="text-primary">{statusLabel(milestone.status)}</span>
                    {dueDate(milestone.dueAt) && <span className="flex items-center gap-1"><CalendarDays size={12} />Due {dueDate(milestone.dueAt)}</span>}
                  </div>
                </div>
                {milestone.description && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{milestone.description}</p>}
                <ProgressSummary value={milestone.progress} label={`${milestone.title} task progress`} />
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {statuses.filter(status => milestone.progress[status.key] > 0).map(status => <span key={status.key} className={status.color}>{milestone.progress[status.key]} {status.label.toLowerCase()}</span>)}
                </div>
              </div>)}
            </section>

            <section className="space-y-3 border-t border-border/80 pt-4" aria-label="My tasks">
              <div className="flex items-center justify-between"><Label className="text-sm font-semibold">My tasks</Label><span className="text-xs tabular-nums text-muted-foreground">{workspace.progress.total} total</span></div>
              <ProgressSummary value={workspace.progress} label="My assigned tasks progress" />
              <div className="grid grid-cols-3 gap-1.5" aria-label="Filter tasks by status">
                {[{ key: "all" as const, label: "All tasks", color: "text-foreground" }, ...statuses].map(status => <button key={status.key} type="button" aria-pressed={filter === status.key}
                  onClick={() => setFilter(status.key)} className={cn("rounded-md border border-border/80 px-2 py-2 text-left hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === status.key && "border-primary/50 bg-primary/10")}>
                  <span className="block text-sm font-semibold tabular-nums">{status.key === "all" ? workspace.progress.total : workspace.progress[status.key]}</span>
                  <span className={cn("text-[11px]", status.color)}>{status.label}</span>
                </button>)}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">All tasks assigned to you, including tasks from other members' milestones.</p>
              {workspace.tasks.length === 0 ? <p className="py-3 text-xs text-muted-foreground">You have no assigned tasks in this workspace yet.</p>
                : tasks.length === 0 ? <p className="py-3 text-xs text-muted-foreground">No tasks match this status.</p>
                : <div className="space-y-2">{tasks.map(task => <TaskItem key={task.id} task={task} />)}</div>}
            </section>
          </>}
        </div>
      </ScrollArea>
    </div>
  );
}
