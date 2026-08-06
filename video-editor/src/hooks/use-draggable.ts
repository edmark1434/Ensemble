import { RefObject, useRef, useState } from "react";

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
    const minX = -originLeft;
    const minY = -originTop;
    const maxX = window.innerWidth - rect.width - originLeft;
    const maxY = window.innerHeight - rect.height - originTop;
    return {
      x: Math.min(Math.max(next.x, minX), maxX),
      y: Math.min(Math.max(next.y, minY), maxY)
    };
  };

  const setOffset = (next: { x: number; y: number }) => setOffsetState(clamp(next));

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