import { RefObject, useLayoutEffect, useRef, useState } from "react";

interface UseDraggableOptions {
  clampToViewport?: boolean;
}

export function useDraggable<T extends HTMLElement>(
  nodeRef: RefObject<T | null>,
  options: UseDraggableOptions = {}
) {
  const { clampToViewport = true } = options;
  const [offset, setOffsetState] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const clamp = (next: { x: number; y: number }) => {
    if (!clampToViewport || !nodeRef.current) return next;
    const rect = nodeRef.current.getBoundingClientRect();
    // rect reflects whatever offset is currently applied, so back out the
    // panel's untransformed origin before clamping the new offset against it.
    const originLeft = rect.left - offset.x;
    const originTop = rect.top - offset.y;
    const viewport = window.visualViewport;
    const minX = (viewport?.offsetLeft ?? 0) - originLeft;
    const minY = (viewport?.offsetTop ?? 0) - originTop;
    const maxX = Math.max(minX, minX + (viewport?.width ?? window.innerWidth) - rect.width);
    const maxY = Math.max(minY, minY + (viewport?.height ?? window.innerHeight) - rect.height);
    return {
      x: Math.min(Math.max(next.x, minX), maxX),
      y: Math.min(Math.max(next.y, minY), maxY)
    };
  };

  const setOffset = (next: { x: number; y: number }) => setOffsetState(clamp(next));

  useLayoutEffect(() => {
    if (!clampToViewport) return;
    let frame: number;
    const keepInViewport = () => {
      const next = clamp(offset);
      if (Math.abs(next.x - offset.x) > 0.5 || Math.abs(next.y - offset.y) > 0.5) {
        setOffsetState(next);
      }
      // Popper can move its ancestor without resizing the panel (scrolling,
      // layout shifts, or opening animations), so track the rendered bounds.
      frame = window.requestAnimationFrame(keepInViewport);
    };
    frame = window.requestAnimationFrame(keepInViewport);
    return () => window.cancelAnimationFrame(frame);
  });

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    dragState.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragState.current) return;
    const { x, y, offsetX, offsetY } = dragState.current;
    setOffset({
      x: offsetX + (e.clientX - x),
      y: offsetY + (e.clientY - y)
    });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return { offset, setOffset, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp } };
}
