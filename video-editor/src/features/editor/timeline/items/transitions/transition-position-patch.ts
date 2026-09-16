import Timeline, { Transition, timeMsToUnits } from "@designcombo/timeline";

// @designcombo/timeline's own Timeline.prototype.renderTransitions() reads
// the "from" item's .left/.width/.top directly to position the transition
// guide. Those are canvas-ABSOLUTE only when the object isn't grouped —
// Fabric gives an object a `.group` and makes .left/.top relative to that
// group's own origin the instant it becomes part of a multi-selection
// (which is exactly what a "group selection" is). renderTransitions() never
// checks for that, so any transition whose "from" item happens to be part
// of the current selection gets positioned from garbage numbers.
//
// It also isn't scoped to just that one transition: it calls
// removeTransitions() (deletes every Transition object on the canvas) and
// rebuilds the whole set from transitionsMap/transitionIds in one pass —
// and it's wired into the library's own subscribeToUpdateTracks, which
// fires on every trackItemsMap/tracks update, local or remote. So any
// state change landing while a multi-select is active corrupts every
// transition on the canvas at once, not just ones connected to the
// selection — that's the "disconnect/drag one, they all vanish/teleport"
// behavior.
//
// Confirms this is a known blind spot in the library, not just a guess:
// alignTransitionsToTrack() — which runs right after renderTransitions() in
// the same update chain — explicitly excludes any transition whose "from"
// item is in getActiveObjects(). The library authors patched around this
// exact issue there; it just never made it into renderTransitions() too.
//
// The fix: resolve each endpoint's true canvas-absolute box via
// getBoundingRect(), which walks the object's full transform chain
// (including any parent group), instead of reading .left/.top/.width
// directly. The library itself already relies on getBoundingRect() for
// this same reason elsewhere (see Timeline.prototype.calcBounding()) — it
// just doesn't use it here.
export function patchTransitionRenderPositioning() {
  const proto = Timeline.prototype as any;
  if (proto.__patchedRenderTransitionsPositioning) return;

  proto.renderTransitions = function (this: any) {
    this.removeTransitions();

    this.transitionIds.forEach((id: string) => {
      const t = this.transitionsMap[id];
      const objects = this.getObjects();
      const fromObj = objects.find((o: any) => o.id === t.fromId);
      const toObj = objects.find((o: any) => o.id === t.toId);
      if (!fromObj || !toObj) return;

      // getBoundingRect() is safe whether or not fromObj is currently part
      // of an ActiveSelection — unlike raw .left/.top/.width.
      const fromRect = fromObj.getBoundingRect();

      const widthPx = timeMsToUnits(t.duration, this.tScale);
      const left = fromRect.left + fromRect.width - widthPx / 2;

      const transition = new Transition({
        id: t.id,
        left,
        top: fromRect.top,
        height: fromRect.height,
        width: widthPx,
        tScale: this.tScale,
        duration: t.duration,
        fromId: fromObj.id,
        toId: toObj.id,
        kind: t.kind,
      } as any);

      if (t.kind === "none") (transition as any).visible = false;
      this.add(transition);
    });
  };

  proto.__patchedRenderTransitionsPositioning = true;
}