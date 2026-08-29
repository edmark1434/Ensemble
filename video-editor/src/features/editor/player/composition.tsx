import { SequenceItem } from "./sequence-item";
import { useEffect, useState } from "react";
import { dispatch, filter, subject } from "@designcombo/events";
import { EDIT_OBJECT, ENTER_EDIT_MODE } from "@designcombo/state";
import { groupTrackItems } from "../utils/track-items";
import { TransitionSeries, Transitions } from "@designcombo/transitions";
import { calculateTextHeight } from "../utils/text";
import { getBackgroundFillStyle } from "./styles";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import useStore from "../store/use-store";

const Composition = () => {
  const [editableTextId, setEditableTextId] = useState<string | null>(null);
  const {
    trackItemIds,
    trackItemsMap,
    fps,
    sceneMoveableRef,
    size,
    background,
    transitionsMap,
    structure,
    activeIds
  } = useStore();
  const frame = useCurrentFrame();

  const groupedItems = groupTrackItems({
    trackItemIds,
    transitionsMap,
    trackItemsMap: trackItemsMap
  });

  const visibleGroupedItems = groupedItems.map(group =>
    group.filter(item => {
      if (item.type === "transition") return true;
      return !trackItemsMap[item.id]?.details?.hidden;
    })
  ).filter(group => group.length > 0);

  const mediaItems = Object.values(trackItemsMap).filter((item) => {
    return item.type === "video" || item.type === "audio";
  });

  const handleTextChange = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const containerDiv = elRef.firstElementChild?.firstElementChild as HTMLDivElement;
    const textEl = document.querySelector(`[data-text-id="${id}"]`) as HTMLDivElement;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
      textTransform
    } = textEl.style;

    if (!textEl.innerHTML) return;

    // measure longest word
    const words = elRef.innerText.split(/\s+/);
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      ""
    );

    const tempDiv = document.createElement("div");
    tempDiv.style.visibility = "hidden";
    tempDiv.style.position = "absolute";
    tempDiv.style.top = "-1000px";
    tempDiv.style.fontSize = fontSize;
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontWeight = fontWeight;
    tempDiv.style.letterSpacing = letterSpacing;
    tempDiv.textContent = longestWord;
    document.body.appendChild(tempDiv);
    const wordWidth = tempDiv.offsetWidth;
    document.body.removeChild(tempDiv);

    const rawHeight = parseFloat(elRef.style.height);
    const currentHeight = isNaN(rawHeight) ? elRef.clientHeight : rawHeight;

    const rawWidth = parseFloat(elRef.style.width);
    const currentWidth = isNaN(rawWidth) ? elRef.clientWidth : rawWidth;

    // only grow width if longest word can't fit
    let finalWidth = currentWidth;
    if (wordWidth > currentWidth) {
      finalWidth = wordWidth;
      elRef.style.width = `${finalWidth}px`;
      textEl.style.width = `${finalWidth}px`;
      containerDiv.style.width = `${finalWidth}px`;
    }

    // measure height the same way TextAnimated renders — single div with white-space: pre-line
    const rawText = textEl.innerText
      .replace(/\n+$/, "")
      .split("\n")
      .map(line => line === "" ? "0" : line)
      .join("\n")
      .replace(/(^|\n)0(\n0)+/g, "\n0");
    const tempMeasure = document.createElement("div");
    tempMeasure.style.visibility = "hidden";
    tempMeasure.style.position = "absolute";
    tempMeasure.style.top = "-9999px";
    tempMeasure.style.whiteSpace = "pre-line";
    tempMeasure.style.overflowWrap = "break-word";
    tempMeasure.style.wordBreak = "normal";
    tempMeasure.style.width = `${finalWidth}px`;
    tempMeasure.style.fontSize = fontSize;
    tempMeasure.style.fontFamily = fontFamily;
    tempMeasure.style.fontWeight = fontWeight;
    tempMeasure.style.letterSpacing = letterSpacing;
    tempMeasure.style.lineHeight = lineHeight;
    tempMeasure.style.webkitTextStroke = webkitTextStroke;
    tempMeasure.style.textShadow = textShadow;
    tempMeasure.style.textTransform = textTransform;
    tempMeasure.style.minWidth = "1ch";
    tempMeasure.innerText = rawText;
    document.body.appendChild(tempMeasure);
    const minHeight = tempMeasure.clientHeight;
    document.body.removeChild(tempMeasure);

    // only grow height if box is too short
    let finalHeight = currentHeight;
    if (minHeight > currentHeight) {
      finalHeight = minHeight;
      elRef.style.height = `${finalHeight}px`;
      textEl.style.height = `${finalHeight}px`;

      const animationDiv = elRef.firstElementChild?.firstElementChild as HTMLDivElement | null;
      if (animationDiv) {
        animationDiv.style.height = `${finalHeight}px`;
      }
    }

    sceneMoveableRef?.current?.moveable.updateRect();
    sceneMoveableRef?.current?.moveable.forceUpdate();

    // only dispatch if something actually changed
    if (
      (finalWidth !== currentWidth || finalHeight !== currentHeight) &&
      !isNaN(finalWidth) && finalWidth > 0 &&
      !isNaN(finalHeight) && finalHeight > 0
    ) {
      dispatch(EDIT_OBJECT, {
        payload: { [id]: { details: { width: finalWidth, height: finalHeight } } }
      });
    }
  };

  const onTextBlur = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    const textEl = document.querySelector(`[data-text-id="${id}"]`) as HTMLDivElement;
    if (!elRef || !textEl) return;

    const {
      fontFamily, fontSize, fontWeight, letterSpacing,
      lineHeight, textShadow, webkitTextStroke, textTransform,
      wordSpacing, wordBreak
    } = textEl.style;

    if (!textEl.innerText) return;

    const rawWidth = parseFloat(elRef.style.width);
    const width = isNaN(rawWidth) ? `${elRef.clientWidth}px` : elRef.style.width;

    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      lineHeight,
      letterSpacing,
      wordSpacing,
      textShadow,
      webkitTextStroke,
      textTransform,
      wordBreak: wordBreak || "normal",
      text: textEl.innerText || "",
      width
    });

    if (isNaN(newHeight) || newHeight <= 0) return;

    dispatch(EDIT_OBJECT, { payload: { [id]: { details: { height: newHeight } } } });
  };

  // handle track and track item events - updates
  // inline editing now disabled
  useEffect(() => {
    const stateEvents = subject.pipe(
      filter(({ key }) => key.startsWith(ENTER_EDIT_MODE))
    );

    const subscription = stateEvents.subscribe((obj) => {
      if (obj.key === ENTER_EDIT_MODE) {
        const incomingId = obj.value?.payload.id;
        const freshMap = useStore.getState().trackItemsMap;

        if (incomingId && freshMap[incomingId]?.details?.locked) {
          return;
        }

        // Inline contentEditable is disabled in TextLayer now, so the
        // data-text-id div can never contain a raw text node to scrape —
        // it's always TextAnimated's element tree. The old DOM read-back
        // here was walking that tree and prefixing "\n" per element node,
        // corrupting details.text on every switch. No-op until the sidebar
        // textarea replaces inline editing (that'll dispatch text directly).
        setEditableTextId(obj.value?.payload.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [editableTextId]);

  return (
    <>
      <AbsoluteFill style={getBackgroundFillStyle(background.value)} />
        {visibleGroupedItems.map((group, index) => {
          if (group.length === 1) {
            const item = trackItemsMap[group[0].id];
            return SequenceItem[item.type](item, {
              fps,
              handleTextChange,
              onTextBlur,
              editableTextId,
              frame,
              size,
              isTransition: false
            });
          }
          const firstItem = trackItemsMap[group[0].id];
          const rawFrom = (firstItem.display.from / 1000) * fps;
          const from = Number.isFinite(rawFrom) ? rawFrom : 0;
          return (
            <TransitionSeries from={from} key={index}>
              {group.map((item) => {
                if (item.type === "transition") {
                  const rawDuration = (item.duration / 1000) * fps;
                  const isBad = !Number.isFinite(rawDuration) || rawDuration <= 0;
                  if (isBad) {
                    console.warn("[transition-nan-guard] bad transition duration, clamped", {
                      transitionId: item.id,
                      rawDuration: item.duration,
                      fromId: (item as any).fromId,
                      toId: (item as any).toId
                    });
                  }
                  const durationInFrames = isBad ? 1 : Math.round(rawDuration);
                  return Transitions[item.kind]({
                    durationInFrames,
                    ...size,
                    id: item.id,
                    direction: item.direction
                  });
                }
                return SequenceItem[item.type](trackItemsMap[item.id], {
                  fps,
                  handleTextChange,
                  editableTextId,
                  isTransition: true,
                  size,
                  frame
                });
              })}
            </TransitionSeries>
          );
        }
      )}
    </>
  );
};

export default Composition;