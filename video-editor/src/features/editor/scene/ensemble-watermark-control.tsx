import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Moveable } from "@interactify/toolkit";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import useStore from "../store/use-store";
import { useEnsembleWatermark } from "../hooks/use-ensemble-watermark";
import { EnsembleWatermarkModal } from "../modals/ensemble-watermark-modal";
import { exitFullscreenForModal } from "../utils/exit-fullscreen-for-modal";

export function EnsembleWatermarkControl({ container, transforming, onSelect }: { container: HTMLDivElement | null; transforming: boolean; onSelect: () => void }) {
  const { showWatermark } = useEnsembleWatermark();
  const playerRef = useStore(state => state.playerRef);
  const projectId = useStore(state => state.projectId);
  const sceneId = useStore(state => state.activeSceneBlockId);
  const activeIds = useStore(state => state.activeIds);
  const controlRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);
  const moveableRef = useRef<Moveable>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { setSelected(false); setOpen(false); }, [projectId, sceneId]);
  useEffect(() => { if (activeIds.length) setSelected(false); }, [activeIds]);
  useEffect(() => {
    if (!selected || open) return;
    const dismiss = (event: PointerEvent) => {
      if (!controlRef.current?.contains(event.target as Node)) setSelected(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(false); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [selected, open]);

  useEffect(() => {
    if (!container || !showWatermark) return;
    let frame = 0;
    let previousBounds = "";
    let previousMoveable: Moveable | null = null;
    const position = () => {
      const control = controlRef.current;
      const target = container.querySelector<HTMLElement>("[data-ensemble-watermark]");
      if (control) {
        const rect = target?.getBoundingClientRect();
        const visible = rect && rect.width > 0 && !transforming && !open && !playerRef?.current?.isPlaying();
        control.style.visibility = visible ? "visible" : "hidden";
        if (visible) {
          const bounds = container.getBoundingClientRect();
          control.style.left = `${rect.left - bounds.left}px`;
          control.style.top = `${rect.top - bounds.top}px`;
          control.style.width = `${rect.width}px`;
          control.style.height = `${rect.height}px`;
          const nextBounds = `${rect.left},${rect.top},${rect.width},${rect.height},${bounds.left},${bounds.top}`;
          if (nextBounds !== previousBounds || moveableRef.current !== previousMoveable) {
            moveableRef.current?.moveable.updateRect();
            previousBounds = nextBounds;
            previousMoveable = moveableRef.current;
          }
        }
      }
      frame = requestAnimationFrame(position);
    };
    position();
    return () => cancelAnimationFrame(frame);
  }, [container, showWatermark, transforming, open, playerRef]);

  if (!container || !showWatermark) return null;
  return <>
    {createPortal(<div ref={controlRef} data-ensemble-watermark-control="" style={{ visibility: "hidden" }}
      className="group absolute z-[220]"
      onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}
      onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") setSelected(false); }}>
      <button ref={targetRef} type="button" aria-label="Select MADE IN Ensemble watermark (locked)" aria-pressed={selected}
        className="absolute inset-0 cursor-pointer outline-none"
        onFocus={() => { onSelect(); setSelected(true); }} onClick={() => { onSelect(); setSelected(true); }} />
      {(hovered || selected) && <Moveable ref={moveableRef} target={targetRef.current} container={controlRef.current}
        className="designcombo-scene-moveable" origin={false} draggable={false} resizable={false}
        scalable={false} rotatable={false} renderDirections={[]} />}
      <div className={cn("pointer-events-none absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100", selected && "pointer-events-auto opacity-100")}>
        <button type="button" className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border bg-card px-2.5 text-xs font-medium text-foreground shadow-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={async () => { if (await exitFullscreenForModal()) setOpen(true); }}><Sparkles className="size-3.5" />Remove watermark</button>
      </div>
    </div>, container)}
    <EnsembleWatermarkModal open={open} onOpenChange={setOpen} />
  </>;
}
