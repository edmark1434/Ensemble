import type * as awarenessProtocol from "y-protocols/awareness";

export interface LiveTransformPatch {
  left?: number;
  top?: number;
  transform?: string; // full CSS transform string
  width?: number;
  height?: number;
  fontSize?: number;
}

export type LiveTransformState = Record<string /* itemId */, LiveTransformPatch>;

const FIELD = "liveTransform";
const MIN_INTERVAL_MS = 50; // ~20fps is plenty for a remote preview; final
// position always lands via the real Y.Doc write on *End

let lastSent = 0;

export function broadcastLiveTransform(
  awareness: awarenessProtocol.Awareness,
  patches: LiveTransformState,
) {
  const now = performance.now();
  if (now - lastSent < MIN_INTERVAL_MS) return;
  lastSent = now;
  awareness.setLocalStateField(FIELD, patches);
}

export function clearLiveTransform(awareness: awarenessProtocol.Awareness) {
  awareness.setLocalStateField(FIELD, null);
}

// Fires with a merged, per-client map any time remote awareness state
// changes. Skips the local client's own entry.
export function subscribeToRemoteLiveTransforms(
  awareness: awarenessProtocol.Awareness,
  onChange: (statesByClient: Map<number, LiveTransformState>) => void,
): () => void {
  const handleChange = () => {
    const result = new Map<number, LiveTransformState>();
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const patches = state?.[FIELD] as LiveTransformState | null | undefined;
      if (patches) result.set(clientId, patches);
    });
    onChange(result);
  };
  awareness.on("change", handleChange);
  handleChange();
  return () => awareness.off("change", handleChange);
}