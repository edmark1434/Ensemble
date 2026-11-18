import { useEffect, useRef, useState, type ReactNode } from "react";
import { Briefcase, CalendarDays, Check, ChevronDown, Clock, Flag, Info, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DraggablePanel } from "@/components/draggable-panel";
import type { DateRange } from "react-day-picker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useWorkspaceAvailability } from "./workspace-button";
import useLayoutStore from "../store/use-layout-store";
import type { EditorWorkspaceSnapshot, WorkspaceTask, WorkspaceTaskStatus } from "../types/workspace";

const statuses: { key: WorkspaceTaskStatus; label: string; color: string }[] = [
  { key: "pending", label: "To do", color: "text-muted-foreground" },
  { key: "in_progress", label: "In progress", color: "text-blue-500" },
  { key: "review", label: "In review", color: "text-amber-500" },
  { key: "completed", label: "Complete", color: "text-emerald-500" },
  { key: "overdue", label: "Overdue", color: "text-red-500" },
];
const editableStatuses = statuses.filter(status => status.key !== "completed" && status.key !== "overdue");
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
function dueDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}
function dateTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase());
}

function statusMarker(status: (typeof statuses)[number]) {
  if (status.key === "completed") return <Check aria-hidden size={12} className={cn("shrink-0", status.color)} />;
  if (status.key === "review") return <Clock aria-hidden size={12} className={cn("shrink-0", status.color)} />;
  return (
    <span aria-hidden className={cn(
      "size-2.5 shrink-0 rounded-full",
      status.color,
      status.key === "pending" ? "border border-dashed border-current" : "bg-current",
    )} />
  );
}

function ProgressSummary({ percent, label, caption }: { percent: number; label: string; caption: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{caption}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
        aria-valuetext={`${percent}% complete`}
        className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
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

const priorities = [
  { key: "low", label: "Low", color: "text-zinc-400" },
  { key: "normal", label: "Normal", color: "text-blue-500" },
  { key: "high", label: "High", color: "text-amber-500" },
  { key: "urgent", label: "Urgent", color: "text-rose-500" },
];
const priorityOrder = ["urgent", "high", "normal", "low"];
function compareWorkspaceTasks(a: WorkspaceTask, b: WorkspaceTask) {
  const priorityRank = (priority: string) => {
    const rank = priorityOrder.indexOf(priority);
    return rank < 0 ? priorityOrder.indexOf("normal") : rank;
  };
  const priorityDifference = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDifference !== 0) return priorityDifference;

  const statusDifference = statuses.findIndex(status => status.key === a.status)
    - statuses.findIndex(status => status.key === b.status);
  if (statusDifference !== 0) return statusDifference;

  const dueA = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
  const dueB = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
  const validDueA = Number.isNaN(dueA) ? Number.POSITIVE_INFINITY : dueA;
  const validDueB = Number.isNaN(dueB) ? Number.POSITIVE_INFINITY : dueB;
  return validDueA === validDueB ? 0 : validDueA - validDueB;
}
function milestoneColor(status: string) {
  const value = status.toLowerCase();
  if (["overdue", "stalled", "abandoned", "cancelled"].includes(value)) return "text-red-500";
  if (["completed", "approved", "claimed"].includes(value)) return "text-emerald-500";
  if (["review", "submitted_for_review", "revision_requested"].includes(value)) return "text-amber-500";
  if (["active", "in_progress"].includes(value)) return "text-blue-500";
  return "text-muted-foreground";
}
function TaskItem({ task, projectId, onSaved }: { task: WorkspaceTask; projectId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState<DateRange>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("23:59");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!dateOpen) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dateOpen]);
  const inFlight = useRef(false);
  const status = statuses.find(item => item.key === task.status)!;
  const priority = priorities.find(item => item.key === task.priority) ?? priorities[1];
  const startLabel = dueDate(task.startsAt);
  const endLabel = dueDate(task.dueAt);
  const start = startLabel && task.startsAt ? new Date(task.startsAt) : undefined;
  const end = endLabel && task.dueAt ? new Date(task.dueAt) : undefined;
  const earliestDate = new Date(now);
  earliestDate.setHours(0, 0, 0, 0);
  const firstMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  const preferredMonth = start ?? end ?? earliestDate;
  const rangeLabel = startLabel && endLabel ? `${startLabel} - ${endLabel}`
    : endLabel ? `Due ${endLabel}` : startLabel ? `Starts ${startLabel}` : "Pick a date";
  const disabled = saving || task.locked;
  const nextMinute = new Date((Math.floor(now / 60_000) + 1) * 60_000);
  const isToday = (day?: Date) => day?.toDateString() === earliestDate.toDateString();
  const noTimesLeftToday = nextMinute.toDateString() !== earliestDate.toDateString();
  const minimumTime = (day?: Date) => isToday(day) ? dateTimeInput(nextMinute) : undefined;
  const draftTimestamp = (day: Date | undefined, time: string) => {
    if (!day || !/^\d{2}:\d{2}$/.test(time)) return NaN;
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(day);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };
  const selectDateRange = (range: DateRange | undefined, selectedDay: Date) => {
    const current = new Date();
    setNow(current.getTime());
    setDateDraft(range);
    setError(null);
    if (selectedDay.toDateString() !== current.toDateString()) return;

    const lastMinuteToday = new Date(current);
    lastMinuteToday.setHours(23, 59, 0, 0);
    const suggested = new Date(Math.min(current.getTime() + 10 * 60_000, lastMinuteToday.getTime()));
    if (range?.from?.toDateString() === current.toDateString()) setStartTime(dateTimeInput(suggested));
    if (range?.to?.toDateString() === current.toDateString()) setEndTime(dateTimeInput(suggested));
  };
  const clampTime = (day: Date | undefined, time: string) => {
    const current = new Date();
    if (day?.toDateString() !== current.toDateString() || !(draftTimestamp(day, time) <= current.getTime())) return time;
    // Minute-only inputs must round up to satisfy the API's strictly-future rule.
    const earliest = new Date((Math.floor(current.getTime() / 60_000) + 1) * 60_000);
    return earliest.toDateString() === current.toDateString() ? dateTimeInput(earliest) : "23:59";
  };
  const validTime = (day: Date | undefined, time: string, existing?: Date) =>
    Boolean(existing && day?.toDateString() === existing.toDateString() && time === dateTimeInput(existing))
    || draftTimestamp(day, time) > now;
  const timesValid = validTime(dateDraft?.from, startTime, start)
    && validTime(dateDraft?.to, endTime, end);
  const rangeOrdered = draftTimestamp(dateDraft?.to, endTime) >= draftTimestamp(dateDraft?.from, startTime);
  const update = async (changes: { status?: string; priority?: string; starts_at?: string | null; due_at?: string | null }) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/workspace`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, changes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update task.");
      onSaved();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update task.");
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  const saveRange = async (range: DateRange | null) => {
    if (range && (!range.from || !range.to)) return;
    const changes: { starts_at?: string; due_at?: string } = {};
    const dates = [
      { field: "starts_at" as const, day: range?.from, time: startTime, existing: start },
      { field: "due_at" as const, day: range?.to, time: endTime, existing: end },
    ];
    for (const { field, day, time, existing } of dates) {
      if (!day) {
        if (existing) changes[field] = "CLEAR";
        continue;
      }
      if (!/^\d{2}:\d{2}$/.test(time)) {
        setError("Choose a start and end time.");
        return;
      }
      // Keep the original timestamp when its displayed date and time are unchanged.
      if (existing && day.toDateString() === existing.toDateString() && time === dateTimeInput(existing)) continue;
      const date = new Date(day);
      const [hours, minutes] = time.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      if (date.getTime() <= Date.now()) {
        setError("New start and end dates must be ahead of the current time.");
        return;
      }
      changes[field] = date.toISOString();
    }
    const effectiveStart = changes.starts_at === "CLEAR" ? null : changes.starts_at ?? task.startsAt;
    const effectiveEnd = changes.due_at === "CLEAR" ? null : changes.due_at ?? task.dueAt;
    if (effectiveStart && effectiveEnd && Date.parse(effectiveEnd) < Date.parse(effectiveStart)) {
      setError("End date & time cannot be earlier than the start date & time.");
      return;
    }
    if (Object.keys(changes).length === 0 || await update(changes)) {
      setDateOpen(false);
    }
  };
  return (
    <div className="space-y-3 rounded-md border border-border/80 p-3">
      <div className="space-y-1">
        <p className="break-words text-sm font-medium">{task.title}</p>
        {task.description && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{task.description}</p>}
      </div>
      <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full min-w-0 justify-between gap-2 px-2 text-xs" aria-label={`Status for ${task.title}`} disabled={disabled}>
              <span className="flex min-w-0 items-center gap-2"><span className="flex size-4 shrink-0 items-center justify-center">{statusMarker(status)}</span><span className="truncate">{status.label}</span></span>
              <ChevronDown aria-hidden size={14} className="shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[300] p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
            {editableStatuses.map(item => <button key={item.key} type="button" onClick={() => { setStatusOpen(false); void update({ status: item.key === "pending" ? "todo" : item.key === "review" ? "in_review" : item.key }); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800/50">
              <span className={cn("flex min-w-0 items-center gap-2", item.color)}><span className="flex size-4 shrink-0 items-center justify-center">{statusMarker(item)}</span>{item.label}</span>
              {status.key === item.key && <Check aria-hidden size={14} className="shrink-0 text-muted-foreground" />}
            </button>)}
          </PopoverContent>
        </Popover>
        <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full min-w-0 justify-between gap-2 px-2 text-xs" aria-label={`Priority for ${task.title}`} disabled={saving}>
              <span className="flex min-w-0 items-center gap-2"><Flag aria-hidden size={14} className={cn("shrink-0", priority.color)} /><span className="truncate">{priority.label}</span></span>
              <ChevronDown aria-hidden size={14} className="shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[300] p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
            {priorities.map(item => <button key={item.key} type="button" onClick={() => { setPriorityOpen(false); void update({ priority: item.key }); }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800/50">
              <span className="flex min-w-0 items-center gap-2"><Flag aria-hidden size={14} className={cn("shrink-0", item.color)} />{item.label}</span>
              {priority.key === item.key && <Check aria-hidden size={14} className="shrink-0 text-muted-foreground" />}
            </button>)}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col items-stretch gap-2 text-xs">
        {/* shadcn New York date-picker-with-range example, with task save and clear actions. */}
        <Popover open={dateOpen} onOpenChange={open => {
          if (open) {
            setDateDraft(start ? { from: start, to: end } : undefined);
            setStartTime(dateTimeInput(start ?? new Date(Date.now() + 3_600_000)));
            setEndTime(end ? dateTimeInput(end) : "23:59");
            setError(null);
          }
          setDateOpen(open);
        }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={saving}
              aria-label={`Task date range for ${task.title}: ${rangeLabel}`}
              className={cn("w-full min-w-0 justify-start text-left font-normal",
                !start && !end && "text-muted-foreground", task.status === "overdue" && "text-red-500")}>
              <CalendarDays aria-hidden size={14} /><span className="truncate">{rangeLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            collisionPadding={12}
            sticky="always"
            className="pointer-events-none z-[250] w-max max-w-[calc(100dvw-1.5rem)] border-0 bg-transparent p-0 shadow-none"
            aria-label={`Task date range for ${task.title}`}
            onKeyDown={event => { if (event.key !== "Escape") event.stopPropagation(); }}>
            <DraggablePanel title="Date range" onClose={() => setDateOpen(false)}
              className="max-w-[calc(100dvw-2rem)] text-card-foreground">
              <ScrollArea className="h-auto w-fit max-w-full [&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-7rem)]">
                <div className="flex flex-col gap-4">
                  <Calendar mode="range" selected={dateDraft} onSelect={selectDateRange}
                    defaultMonth={preferredMonth < firstMonth ? firstMonth : preferredMonth}
                    startMonth={firstMonth} numberOfMonths={2}
                    disabled={saving ? true : { before: earliestDate }} excludeDisabled autoFocus
                    className="p-0" />
                  <div className="grid grid-cols-2 gap-4 font-sans">
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-muted-foreground">
                      <span>Start time</span>
                      <Input type="time" step={60} value={startTime} min={minimumTime(dateDraft?.from)}
                        disabled={saving || (isToday(dateDraft?.from) && noTimesLeftToday)}
                        aria-invalid={Boolean(dateDraft?.from && !validTime(dateDraft.from, startTime, start))}
                        className="workspace-time-input block appearance-none bg-background py-0 font-sans text-sm leading-normal text-foreground"
                        onChange={event => setStartTime(clampTime(dateDraft?.from, event.target.value))}
                        onBlur={event => setStartTime(clampTime(dateDraft?.from, event.target.value))} />
                    </label>
                    <label className="flex min-w-0 flex-col gap-2 text-xs text-muted-foreground">
                      <span>End time</span>
                      <Input type="time" step={60} value={endTime} min={minimumTime(dateDraft?.to)}
                        disabled={saving || (isToday(dateDraft?.to) && noTimesLeftToday)}
                        aria-invalid={Boolean(dateDraft?.to && !validTime(dateDraft.to, endTime, end))}
                        className="workspace-time-input block appearance-none bg-background py-0 font-sans text-sm leading-normal text-foreground"
                        onChange={event => setEndTime(clampTime(dateDraft?.to, event.target.value))}
                        onBlur={event => setEndTime(clampTime(dateDraft?.to, event.target.value))} />
                    </label>
                  </div>
                  {dateDraft?.from && dateDraft.to && !timesValid && (
                    <p className="text-xs text-muted-foreground">Choose a future time for each changed date.</p>
                  )}
                  {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
                  <div className="flex justify-end gap-2">
                    {(start || end) && <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => void saveRange(null)}>Clear</Button>}
                    <Button type="button" size="sm" disabled={saving || !timesValid || !rangeOrdered}
                      onClick={() => { if (dateDraft) void saveRange(dateDraft); }}>Save</Button>
                  </div>
                </div>
              </ScrollArea>
            </DraggablePanel>
          </PopoverContent>
        </Popover>
        {saving && <Loader2 size={13} className="animate-spin" />}
        {task.locked && <span className="flex items-center gap-1 text-muted-foreground"><LockKeyhole size={12} />Locked</span>}
      </div>
      </div>
      {error && !dateOpen && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </div>
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

  useEffect(() => {
    if (!projectId) return;
    let disposed = false;
    let active: AbortController | null = null;
    const refresh = async (force = false) => {
      if (disposed || (active && !force)) return;
      if (force) active?.abort();
      const controller = new AbortController();
      active = controller;
      setRefreshing(true);
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/workspace`, { cache: "no-store", signal: controller.signal });
        if (disposed || controller.signal.aborted) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setData(null);
            useWorkspaceAvailability.setState({ key: "", available: false });
          }
          throw new Error(response.status === 401 ? "Sign in again to view your workspace." : response.status === 403
            ? "You no longer have access to this project." : "Unable to refresh your workspace. Please try again.");
        }
        const snapshot: EditorWorkspaceSnapshot = await response.json();
        if (disposed || controller.signal.aborted) return;
        if (snapshot.workspaces.length === 0) useWorkspaceAvailability.setState({ key: "", available: false });
        setData(snapshot);
        setError(null);
      } catch (cause) {
        if (!disposed && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load your workspace.");
      } finally {
        if (active === controller) {
          active = null;
          if (!disposed) setRefreshing(false);
        }
      }
    };
    refreshRef.current = () => { void refresh(true); };
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
  const tasks = workspace?.tasks
    .filter(task => filter === "all" || task.status === filter)
    .sort(compareWorkspaceTasks) ?? [];

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
              </div>
            </div>
            {data && data.workspaces.length > 1 ? (
              <Select value={workspace?.id} onValueChange={value => { setWorkspaceId(value); setFilter("all"); }}>
                <SelectTrigger className="w-full min-w-0 font-semibold" aria-label="Linked workspace"><SelectValue /></SelectTrigger>
                <SelectContent>{data.workspaces.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : workspace && <p className="break-words text-sm font-semibold text-foreground">{workspace.name}</p>}
            {typeof workspace?.overallPercent === "number" && (
              <ProgressSummary percent={workspace.overallPercent} label="Overall workspace progress" caption="Overall progress" />
            )}
          </div>

          {error && <div role="alert" className="space-y-2 text-xs text-red-500">
            <p>{error}{data ? " Showing the last loaded information." : ""}</p>
            <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => refreshRef.current()}>Try again</Button>
          </div>}
          {!data && !error && projectId && <div role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" />Loading workspace...</div>}
          {(!projectId || (data && !workspace)) && <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Briefcase size={24} />
            <p className="text-sm">No linked workspace available.</p>
            <p className="max-w-64 text-xs leading-relaxed">Link this project from a workspace you belong to to see your milestone and assigned tasks here.</p>
          </div>}

          {workspace && <>
            <section className="space-y-3" aria-label="Current milestone">
              <p className="text-xs text-muted-foreground">{workspace.milestones.length > 1 ? "Current milestones" : "Current milestone"}</p>
              {workspace.milestones.length === 0 && <p className="text-xs leading-relaxed text-muted-foreground">No current milestone on your contracts in this workspace.</p>}
              {workspace.milestones.map(milestone => <div key={milestone.id} className="space-y-3 rounded-md border border-border/80 p-3">
                <div className="space-y-1.5">
                  <p className="break-words text-sm font-medium">{milestone.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className={milestoneColor(milestone.status)}>{statusLabel(milestone.status)}</span>
                    {dueDate(milestone.dueAt) && <span className="flex items-center gap-1"><CalendarDays size={12} />Due {dueDate(milestone.dueAt)}</span>}
                  </div>
                </div>
                {milestone.description && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{milestone.description}</p>}
                <ProgressSummary percent={milestone.progress.percent} label={`${milestone.title} task progress`}
                  caption={`${milestone.progress.completed} of ${milestone.progress.total} tasks finished`} />
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {statuses.filter(status => milestone.progress[status.key] > 0).map(status => <span key={status.key} className={status.color}>{milestone.progress[status.key]} {status.label.toLowerCase()}</span>)}
                </div>
              </div>)}
            </section>

            <section className="space-y-3" aria-label="My tasks">
              <div className="grid grid-cols-3 gap-1.5" aria-label="Filter tasks by status">
                {[{ key: "all" as const, label: "All tasks", color: "text-foreground" }, ...statuses].map(status => <button key={status.key} type="button" aria-pressed={filter === status.key}
                  onClick={() => setFilter(status.key)} className={cn("rounded-md border border-border/80 px-2 py-2 text-left font-sans hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === status.key && "border-primary/50 bg-primary/10")}>
                  <span className="block text-sm font-semibold tabular-nums">{status.key === "all" ? workspace.progress.total : workspace.progress[status.key]}</span>
                  <span className={cn("text-[11px]", status.color)}>{status.label}</span>
                </button>)}
              </div>
              <div className="flex items-start gap-2 text-pretty text-xs text-muted-foreground">
                <Info size={16} className="shrink-0" aria-hidden="true" />
                <span>
                  You can only set tasks to To do, In progress, or In review.<br />
                  Tasks become Complete when the client accepts the milestone submission.
                  Unfinished tasks become Overdue when either the task or its milestone is due.
                </span>
              </div>
              {workspace.tasks.length === 0 ? <p className="py-3 text-xs text-muted-foreground">No assigned tasks in the current milestone.</p>
                : tasks.length === 0 ? <p className="py-3 text-xs text-muted-foreground">No tasks match this status.</p>
                : <div className="space-y-2">{tasks.map(task => <TaskItem key={task.id} task={task} projectId={projectId!} onSaved={() => refreshRef.current()} />)}</div>}
            </section>
          </>}
        </div>
      </ScrollArea>
    </div>
  );
}
