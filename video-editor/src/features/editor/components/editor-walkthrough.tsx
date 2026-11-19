import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Briefcase, Clapperboard, History, Layers, MessageSquare, Monitor, Image, CloudUpload, Captions, ZoomIn, Keyboard, SlidersHorizontal, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceAvailability, useWorkspaceVisible } from "../workspace/workspace-button";

import { createPortal } from "react-dom";
import { tourAction, tourBlockId, tourThreadId, useTourDemo, type TourSurface } from "../store/use-tour-demo";
import { timeMsToUnits } from "@designcombo/timeline";
import { createSceneItem } from "../utils/add-scene";
import { useCommentsStore } from "../store/use-comments-store";
import { tourMembersStore } from "../store/use-block-members-store";
import { getCurrentTime } from "../utils/time";
import { useProjectRole } from "../hooks/use-project-role";
import { canManageSharing } from "../types/editor-role";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import type { ILayoutState, IMenuItem } from "../interfaces/layout";

type Step = {
  title: string;
  icon: typeof Layers;
  selector: string;
  body: string;
  separateTargets?: boolean;
  highlightPadding?: number;
  surface?: TourSurface;
  trigger?: string;
  prompt?: string;
  fallback?: string;
  menu?: IMenuItem;
  panel?: ILayoutState["activeRightItem"];
};

const allSteps: Step[] = [
  { title: "Canvas", icon: Monitor, selector: '[data-editor-tour="canvas"]', body: "The canvas shows the frame at your playhead. Select an image, video or text layer here to move it, or drag its handles to resize it." },
  { title: "Preview controls", icon: Monitor, selector: '[data-editor-tour="preview-controls"]', body: "Read the timestamp, play or pause, and skip between markers here. Try muting the preview or opening it full screen. If you go full screen, press Esc or click Exit fullscreen to continue the tour." },
  { title: "Timeline", icon: Clapperboard, selector: '[data-editor-tour="timeline"]', body: "Click the ruler to move the playhead. Drag an item along a lane to change when it appears, or drag its ends to adjust how long it plays." },
  { title: "Timeline zoom", icon: ZoomIn, selector: '[data-editor-tour="zoom"]', body: "Zoom in to line up a cut, zoom out to see nearby clips, or use Zoom to fit to see the whole timeline." },
  { title: "Menus", icon: Image, menu: "images", selector: '[data-editor-tour="menus"], [data-editor-tour="menu-panel"]', body: "Pick a tool on the left to open its menu. Images is open here. Drag an image onto the timeline to place it at a specific time." },
  { title: "Uploads", icon: CloudUpload, menu: "uploads", selector: '[data-editor-tour="menus"], [data-editor-tour="menu-panel"]', body: "Bring your own video, images and audio into Uploads. Drag an uploaded file onto the canvas or timeline to use it in your edit." },
  { title: "Captions", icon: Captions, menu: "captions", selector: '[data-editor-tour="menus"], [data-editor-tour="menu-panel"]', body: "On Premium and Business, use Captions to generate subtitles from speech. Review the words and timing against the preview." },
  { title: "Control panel", icon: SlidersHorizontal, panel: "controls", selector: '[data-editor-tour="right-panel"]', body: "Select an item on the canvas or timeline to see its controls here. For an image or video, you can enter precise dimensions and adjust its position." },
  { title: "Plan your scenes", icon: Layers, selector: '[data-editor-tour="scenes"]', body: "Build the structure of your video first. Try Add scene or press S to select the sample scene. Next also shows its access controls. You can arrange scenes on the timeline and edit the clips inside each one." },
  { title: "Scene access", icon: Layers, panel: "controls", separateTargets: true, selector: '[data-editor-tour="sample-access"], [data-editor-tour="specific-access"]', fallback: '[data-editor-tour="right-panel"]', body: "The sample scene is selected. Use Access in its control panel to choose who can work on it. Scene owners and managers can set general access and give individual people specific roles." },
  { title: "Open a scene", icon: Layers, selector: '[data-editor-tour="sample-scene"]', body: "Double-click the sample scene on its lane to open its own timeline." },
  { title: "Back to the project", icon: Layers, separateTargets: true, selector: '[data-editor-tour="scene-back"], [data-editor-tour="scene-home"]', body: "Inside a scene, the timeline shows its clips. Click the back arrow, choose Home, or press H to return to the project." },
  { title: "Add a comment", icon: MessageSquare, selector: '[data-editor-tour="add-comment"]', body: 'Click the speech bubble in the timeline header or press C to open the sample comment, "hi", at the playhead.' },
  { title: "Open Comments", icon: MessageSquare, selector: 'button[aria-label^="Comments"]', body: "You can also open the comments panel from this button in the top bar." },
  { title: "Comments", icon: MessageSquare, panel: "comments", selector: '[data-editor-tour="right-panel"]', body: "Here’s your sample comment. This panel brings together time-linked feedback and replies." },
  { title: "Timeline comments", icon: MessageSquare, highlightPadding: 8, selector: '[data-editor-tour="sample-marker"]', fallback: '[data-editor-tour="ruler"]', body: "Comments appear as pink markers on the ruler. Hover over a marker to preview the comment, or click it to jump to that moment and open its thread." },
  { title: "Workspace", icon: Briefcase, panel: "workspace", trigger: 'button[aria-label="Workspace"]', prompt: "Click the briefcase in the top bar to open Workspace.", selector: '[data-editor-tour="right-panel"]', body: "The briefcase opens your current milestone and assigned tasks. Update a task's status, priority or dates while you edit." },
  { title: "Undo, redo and save", icon: History, selector: '[data-editor-tour="edit-history"]', body: "Undo your last edit or redo it with the arrows. Use Save to capture the current project and its scenes together." },
  { title: "Saves", icon: History, panel: "saves", trigger: 'button[aria-label="Saves"]', prompt: "On Premium and Business, click Saves in the top bar to browse project history.", selector: '[data-editor-tour="right-panel"]', body: "On Premium and Business, preview an earlier version here or apply it to replace the current project." },
  { title: "Keyboard shortcuts", icon: Keyboard, selector: '[data-editor-tour="shortcuts"]', body: "Open the shortcut list with the keyboard button or Ctrl + /. Close the list when you’re ready to continue." },
  { title: "Shortcut list", icon: Keyboard, surface: "shortcuts", selector: "", body: "Find keys for playback, selection and timeline editing here. For example, S adds a scene from the project timeline." },
  { title: "Export", icon: Download, highlightPadding: 8, selector: '[data-editor-tour="export"]', body: "Open Export to see the available output settings." },
  { title: "Export settings", icon: Download, surface: "export", selector: "", body: "Choose a format, resolution and frame rate. Export renders the project, or just the current scene when editing inside one." },
  { title: "Share", icon: Send, highlightPadding: 8, selector: '[data-editor-tour="share"]', body: "Open Share to manage access or share a template." },
  { title: "Sharing options", icon: Send, surface: "share", selector: "", body: "Invite people and choose their roles here. Share as template in the Asset Library lets others start their own project from your work." },
];

function placeCard(target: DOMRect | null, card: HTMLElement, preferSide: boolean) {
  const gap = 12;
  const width = card.offsetWidth, height = card.offsetHeight;
  const maxX = window.innerWidth - width - gap, maxY = window.innerHeight - height - gap;
  const clamp = (value: number, max: number) => Math.max(gap, Math.min(value, max));
  if (!target) return { left: clamp(maxX / 2, maxX), top: clamp(maxY / 2, maxY) };
  const x = clamp(target.left + (target.width - width) / 2, maxX);
  const y = clamp(target.top + (target.height - height) / 2, maxY);
  const sides = [{ left: target.right + gap, top: y }, { left: target.left - width - gap, top: y }];
  const ends = [{ left: x, top: target.bottom + gap }, { left: x, top: target.top - height - gap }];
  const candidates = preferSide ? [...sides, ...ends] : [...ends, ...sides];
  const overflow = (p: typeof candidates[number]) =>
    Math.abs(p.left - clamp(p.left, maxX)) + Math.abs(p.top - clamp(p.top, maxY));
  const best = candidates.reduce((a, b) => overflow(a) <= overflow(b) ? a : b);
  return { left: clamp(best.left, maxX), top: clamp(best.top, maxY) };
}

const walkthroughReviewMode = true;

type TourPart = "editor" | "workspace";

async function claimPart(part: TourPart) {
  const response = await fetch("/api/editor/walkthrough?part=" + part, { method: "POST" });
  return response.ok && (await response.json()).show === true;
}

export function EditorWalkthrough({ projectId, userId }: { projectId: string; userId: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [workspaceOnly, setWorkspaceOnly] = useState(false);
  const [highlights, setHighlights] = useState<DOMRect[]>([]);
  const [commentOpenedFromTimeline, setCommentOpenedFromTimeline] = useState(false);

  const canShare = canManageSharing(useProjectRole(projectId));
  const card = useRef<HTMLElement>(null);
  const workspaceVisible = useWorkspaceVisible();
  const workspaceReady = useWorkspaceAvailability(state => state.key === projectId + ":" + userId);
  const steps = allSteps.filter(s => canShare || (s.title !== "Share" && s.surface !== "share")).filter(s => workspaceOnly ? s.panel === "workspace" && workspaceVisible : s.panel !== "workspace" || workspaceVisible);

  if (commentOpenedFromTimeline && !workspaceOnly) {
    const opener = steps.findIndex(s => s.title === "Open Comments");
    [steps[opener], steps[opener + 1]] = [steps[opener + 1], steps[opener]];
  }
  const step = index === null ? null : steps[index];
  const activePanel = useLayoutStore(s => s.activeRightItem);
  const atTrigger = !!step?.trigger && activePanel !== step.panel;
  const selector = step?.surface
    ? (step.surface === "export" ? '[data-tour-surface="export"] > div:first-child' : '[data-tour-surface="' + step.surface + '"]')
    : atTrigger ? step!.trigger! : step?.selector;
  const reviewKey = "ensemble:walkthrough-review:" + userId;

  useEffect(() => {
    if (!workspaceReady) return;
    let mounted = true;
    const timer = window.setTimeout(async () => {
      try {
        let onlyWorkspace = false;
        if (walkthroughReviewMode) {
          // Rehearse the follow-up in this tab without consuming account history.
          try {
            onlyWorkspace = workspaceVisible && sessionStorage.getItem(reviewKey) === "editor";
            if (!onlyWorkspace && !sessionStorage.getItem(reviewKey)) sessionStorage.setItem(reviewKey, "editor");
          } catch { /* Storage is optional for review. */ }
        } else if (!await claimPart("editor")) {
          if (!mounted || !workspaceVisible || !await claimPart("workspace")) return;
          onlyWorkspace = true;
        }
        if (mounted) { setWorkspaceOnly(onlyWorkspace); setIndex(0); }
      } catch { /* Keep editing available if the walkthrough request fails. */ }
    }, 0);
    return () => { mounted = false; clearTimeout(timer); };
  }, [workspaceReady, workspaceVisible, reviewKey]);

  useEffect(() => {
    if (step?.panel !== "workspace") return;
    if (walkthroughReviewMode) {
      try { sessionStorage.setItem(reviewKey, "workspace"); } catch { /* Optional in review. */ }
    } else if (!workspaceOnly) {
      void claimPart("workspace").catch(() => {});
    }
  }, [step, reviewKey, workspaceOnly]);

  useLayoutEffect(() => {
    if (!step) return;
    const { activeMenuItem, showMenuItem, activeRightItem } = useLayoutStore.getState();
    const available = step.panel !== "workspace" || workspaceVisible;
    useLayoutStore.setState({
      activeMenuItem: step.menu ?? activeMenuItem,
      showMenuItem: !!step.menu,
      activeRightItem: available && step.panel && !step.trigger ? step.panel : "controls",
    });
    return () => useLayoutStore.setState({ activeMenuItem, showMenuItem, activeRightItem });
  }, [step, workspaceVisible]);

  const running = index !== null;
  useLayoutEffect(() => {
    if (!running) return;
    return () => {
      const demo = useTourDemo.getState();
      demo.attachments.forEach(file => URL.revokeObjectURL(file.url));
      const comments = useCommentsStore.getState();
      if (comments.focusedId === tourThreadId) comments.setFocusedId(null);
      if (comments.openThreadId === tourThreadId) comments.setOpenThreadId(null);
      tourMembersStore.setState(tourMembersStore.getInitialState(), true);
      useTourDemo.setState(useTourDemo.getInitialState(), true);
    };
  }, [running, projectId, userId]);

  useLayoutEffect(() => {
    if (!step || index === null) return;
    const advance = () => setIndex(current => current === index ? (index + 1 < steps.length ? index + 1 : null) : current);
    const title = step.title;
    const access = title === "Scene access";
    const addComment = title === "Add a comment";
    const demo = useTourDemo.getState();
    const editor = useStore.getState();
    if ((title === "Plan your scenes" || access) && !demo.scene) {
      useTourDemo.setState({ scene: createSceneItem(getCurrentTime(), editor.size, tourBlockId) });
    }
    if (addComment && !demo.comment) {
      const person = useCommentsStore.getState().data?.people.find(p => p.userId === userId);
      useTourDemo.setState({
        commentTarget: editor.activeSceneBlockId ?? projectId,
        comment: { id: tourThreadId, body: "hi", authorName: person?.name || editor.userName || "You",
          avatarUrl: person?.avatarUrl ?? null, createdAt: new Date().toISOString(), timeMs: getCurrentTime(),
          canDelete: true, status: "open", attachments: [], replies: [] },
      });
    }
    if (title === "Open a scene" && demo.scene && editor.timeline) {
      const canvas = editor.timeline;
      const left = timeMsToUnits(demo.scene.display.from, editor.scale.zoom);
      const right = timeMsToUnits(demo.scene.display.to, editor.scale.zoom);
      if (left + canvas.viewportTransform[4] >= canvas.width - 12 || right + canvas.viewportTransform[4] <= 12) {
        canvas.scrollTo({ scrollLeft: left });
      }
    }
    if (title === "Back to the project") editor.playerRef?.current?.pause();
    useTourDemo.setState({
      access, insideScene: title === "Back to the project",
      surface: step.surface, exportIntro: title === "Export",
      act(action) {
        if (action === "scene" && (title === "Plan your scenes" || access)) {
          if (!access) advance();
          return true;
        }
        if ((action === "enter-scene" && title === "Open a scene") ||
            (action === "leave-scene" && title === "Back to the project")) {
          advance();
          return true;
        }
        if (action === "comment" && addComment) {
          useCommentsStore.getState().setFocusedId(tourThreadId);
          setCommentOpenedFromTimeline(true);
          advance();
          return true;
        }
        if (action === "comment" && title === "Timeline comments") {
          useLayoutStore.getState().setActiveRightItem("comments");
          useCommentsStore.getState().setFocusedId(tourThreadId);
          return true;
        }
        if ((action === "comments-button" && title === "Open Comments") ||
            (action === "shortcuts" && title === "Keyboard shortcuts") ||
            (action === "export" && title === "Export") ||
            (action === "share" && title === "Share") || (action === "close" && step.surface)) {
          advance();
          return true;
        }
        return false;
      },
    });
    return () => {
      if (access && useLayoutStore.getState().floatingControl === "access-picker") {
        useLayoutStore.getState().setFloatingControl("");
      }
      useTourDemo.setState({ access: false, insideScene: false, surface: undefined, exportIntro: false, act: undefined });
    };
  }, [step, index, steps.length, commentOpenedFromTimeline, projectId, userId]);

  useEffect(() => {
    if (!step || index === null) return;
    const advance = () => setIndex(current => current === index ? index + 1 : current);
    if (step.title === "Back to the project") {
      // Only the rehearsal is visible. Keep editing shortcuts off the underlying project.
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Tab" || event.key === "Escape") return;
        if (event.target instanceof Element && event.target.closest("button") &&
            (event.key === "Enter" || event.key === " ")) return;
        event.stopImmediatePropagation();
        if (event.code === "KeyH" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          tourAction("leave-scene");
        }
      };
      window.addEventListener("keydown", handleKey, true);
      return () => window.removeEventListener("keydown", handleKey, true);
    }
    if (step.title === "Preview controls") {
      let entered = false;
      const fullscreen = () => {
        if (document.fullscreenElement) entered = true;
        else if (entered) advance();
      };
      document.addEventListener("fullscreenchange", fullscreen);
      const unsubscribe = useStore.subscribe((now, prev) => {
        if (now.muted !== prev.muted && !document.fullscreenElement) advance();
      });
      return () => { unsubscribe(); document.removeEventListener("fullscreenchange", fullscreen); };
    }
  }, [step, index, steps.length]);

  useLayoutEffect(() => {
    if (!step || !selector) return;
    let lastBounds = "";
    setHighlights([]);
    // Resizable panels also move adjacent buttons without resizing those buttons.
    const measure = () => {
      let rects = Array.from(document.querySelectorAll(selector), node => node.getBoundingClientRect())
        .filter(rect => rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight);
      if (step.title === "Timeline comments") rects = rects.slice(0, 1);
      const padding = step.highlightPadding;
      if (padding) {
        rects = rects.map(r => {
          const left = Math.max(0, r.left - padding), top = Math.max(0, r.top - padding);
          return new DOMRect(left, top, Math.min(innerWidth, r.right + padding) - left,
            Math.min(innerHeight, r.bottom + padding) - top);
        });
      }
      const fallback = !rects.length && step.fallback ? document.querySelector(step.fallback) : null;
      if (fallback) rects.push(fallback.getBoundingClientRect());
      const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top));
      const box = rects.length ? new DOMRect(left, top, Math.max(...rects.map(r => r.right)) - left,
        Math.max(...rects.map(r => r.bottom)) - top) : null;
      const visible = step.separateTargets ? rects : box ? [box] : [];
      const key = visible.map(r => [r.x, r.y, r.width, r.height].join(",")).join("|");
      if (key !== lastBounds) {
        lastBounds = key;
        setHighlights(visible);
      }
      if (card.current) {
        if (step.surface === "shortcuts") {
          const guide = card.current;
          guide.style.maxWidth = "";
          guide.style.left = Math.max(12, innerWidth - guide.offsetWidth - 16) + "px";
          guide.style.top = "12px";
          return;
        }
        if (step.surface && box) {
          const sideSpace = Math.max(box.left, innerWidth - box.right) - 24;
          card.current.style.maxWidth = sideSpace >= (step.surface === "share" ? 200 : 240) ? Math.min(384, sideSpace) + "px" : "";
        } else card.current.style.maxWidth = "";
        const target = step.title === "Back to the project" ? rects[0] ?? null : box;
        const position = placeCard(target, card.current, !!step.surface);
        card.current.style.left = position.left + "px";
        card.current.style.top = position.top + "px";
      }
    };
    measure();
    // Portaled surfaces animate into place, and the export panel can be dragged.
    if (step.surface || step.separateTargets || step.title === "Open a scene" || step.title === "Share") {
      let frame: number;
      const follow = () => { measure(); frame = requestAnimationFrame(follow); };
      frame = requestAnimationFrame(follow);
      return () => cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(measure);
    const frame = requestAnimationFrame(() => {
      // Observe after the new menu has mounted and the panel group has resized.
      document.querySelectorAll(selector + ", [data-panel], [data-editor-tour='timeline']").forEach(node => observer.observe(node));
      if (card.current) observer.observe(card.current);
      measure();
    });
    const changes = new MutationObserver(measure);
    const dynamicTarget = step.fallback && document.querySelector(step.fallback);
    if (dynamicTarget) changes.observe(dynamicTarget, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, selector]);

  if (index === null || !step) return null;
  const Icon = step.icon;
  const finish = () => setIndex(null);
  const next = () => {
    if (step.title === "Add a comment") setCommentOpenedFromTimeline(false);
    if (atTrigger && step.panel) useLayoutStore.getState().setActiveRightItem(step.panel);
    else if (index === steps.length - 1) finish();
    else setIndex(index + 1);
  };
  const guide = (
      <section ref={card} role={step.surface ? "region" : "dialog"} aria-labelledby="editor-tour-title" aria-describedby="editor-tour-description"
        onKeyDown={event => {
          if (["Escape", "Enter", " "].includes(event.key)) event.stopPropagation();
          if (event.key === "Escape") { if (step.surface) next(); else finish(); }
        }}
        onKeyUp={event => { if (["Escape", "Enter", " "].includes(event.key)) event.stopPropagation(); }}
        className="pointer-events-auto absolute grid max-h-[calc(100dvh-2rem)] w-96 max-w-[calc(100vw-2rem)] min-w-0 gap-6 overflow-y-auto overflow-x-hidden rounded-lg border bg-card px-6 py-6 shadow-xl">
        <div aria-live="polite" aria-atomic="true" className="grid gap-2">
          <p className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Editor walkthrough</span>{steps.length > 1 && <span>{index + 1} of {steps.length}</span>}</p>
          <h2 id="editor-tour-title" className="flex items-center gap-2 text-md font-semibold"><Icon className="size-4 text-primary" />{step.title}</h2>
          <p id="editor-tour-description" className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {atTrigger ? step.prompt : step.body}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {steps.length > 1 && <Button size="sm" variant="ghost" className="mr-auto" onClick={finish}>Skip tour</Button>}
          {index > 0 && <Button size="sm" variant="outline" onClick={() => setIndex(index - 1)}>Back</Button>}
          <Button size="sm" onClick={next}>
            {atTrigger ? "Open panel" : index === steps.length - 1 ? "Finish" : "Next"}
          </Button>
        </div>
      </section>
  );
  if (step.surface) return createPortal(<>
    <div aria-hidden className="pointer-events-auto fixed inset-0 z-[240] bg-black/60" />
    <div className="pointer-events-none fixed inset-0 z-[310] text-foreground">{guide}</div>
  </>, document.body);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden text-foreground">
      <div aria-hidden className="pointer-events-auto absolute inset-0 bg-black/60"
        style={highlights.length ? { clipPath: "polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, " +
          highlights.map(r => [r.left + "px " + r.top + "px", r.left + "px " + r.bottom + "px",
            r.right + "px " + r.bottom + "px", r.right + "px " + r.top + "px", r.left + "px " + r.top + "px", "0 0"].join(", ")).join(", ") + ")" } : undefined} />
      {highlights.map((r, i) => <div key={i} aria-hidden className="pointer-events-none absolute rounded-sm border-2 border-primary"
        style={{ top: r.top, left: r.left, width: r.width, height: r.height }} />)}
      {guide}
    </div>
  );
}
