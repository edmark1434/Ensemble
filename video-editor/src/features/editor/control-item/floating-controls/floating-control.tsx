import { createPortal } from "react-dom";
import Draggable from "react-draggable";
import React, { useEffect, useState, useRef } from "react";
import useLayoutStore from "../../store/use-layout-store";
import AnimationCaption from "./animation-caption";
import AnimationPicker from "./animation-picker";
import CaptionPresetPicker from "./caption-preset-picker";
import FontFamilyPicker from "./font-family-picker";
import TextPresetPicker from "./text-preset-picker";

export default function FloatingControl({ anchorRef }: { anchorRef: React.RefObject<HTMLDivElement | null> }) {
  const { floatingControl, trackItem, floatingControlIds, floatingControlAnimationType } = useLayoutStore();
  const [spawnPos, setSpawnPos] = useState<{ top: number; left: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const dragStartSetRef = useRef(false);

  const hasTarget = !!trackItem || (floatingControlIds && floatingControlIds.length > 0);

  useEffect(() => {
    if (!floatingControl || !anchorRef.current) {
      setSpawnPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    setSpawnPos({ top: rect.top + 16, left: rect.left });
  }, [floatingControl]);

  useEffect(() => {
    dragStartSetRef.current = false;
    setDragStart(null);
  }, [floatingControl]);

  let content = null;
  if (floatingControl === "font-family-picker") content = <FontFamilyPicker />;
  else if (floatingControl === "text-preset-picker") content = <TextPresetPicker trackItem={trackItem} />;
  else if (floatingControl === "animation-picker")
    content = (
      <AnimationPicker
        animationType={floatingControlAnimationType ?? (trackItem?.type === "text" ? "text" : "media")}
      />
    );
  else if (floatingControl === "animation-caption") content = <AnimationCaption />;
  else if (floatingControl === "caption-preset-picker") content = <CaptionPresetPicker trackItem={trackItem} />;

  useEffect(() => {
    if (!spawnPos || !measureRef.current || dragStartSetRef.current) return;
    const width = measureRef.current.getBoundingClientRect().width;
    setDragStart({ x: spawnPos.left - 16 - width, y: spawnPos.top });
    dragStartSetRef.current = true;
  }, [spawnPos, content]);

  if (!hasTarget || !floatingControl || !spawnPos || !content) return null;

  if (!dragStart) {
    return createPortal(
      <div ref={measureRef} style={{ position: "fixed", top: -9999, left: -9999 }}>
        {content}
      </div>,
      document.body
    );
  }

  return createPortal(
    <Draggable nodeRef={nodeRef as unknown as React.RefObject<HTMLElement>} handle=".handle" bounds="body" defaultPosition={dragStart}>
      <div ref={nodeRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 100 }}>
        {content}
      </div>
    </Draggable>,
    document.body
  );
}