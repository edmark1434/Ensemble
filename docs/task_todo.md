# UPDATED TODO — Chat and Video Call

## Completed / Keep Verified
- [x] Group-call leave removes the user correctly.
- [x] Participant tiles use each user’s profile avatar.
- [x] Group avatar is used only for group-call header/notification.

## 1. Caller Modal
- [ ] Fix direct/group caller modal closing after a few seconds.
- [ ] Keep open while status is `ringing`.
- [ ] Close only on cancel, decline, error, explicit end, or 60s unanswered timeout.
- [ ] Remove duplicate socket listeners/state resets causing closure.

## 2. Call Persistence
- [ ] Refresh/reconnect must not end active direct/group calls.
- [ ] Restore the same `call_id`.
- [ ] Do not automatically rejoin users who already left.
- [ ] Require explicit **Join Call** after leaving.
- [ ] Server remains the source of truth.

## 3. Group Call Session
- [ ] Allow members to join/rejoin while the session remains active.
- [ ] Leaving removes only that participant.
- [ ] Keep the session active if one participant remains.
- [ ] Last participant clicking **End Call** must end immediately.
- [ ] Last participant clicking **Leave Call** must close the empty session.
- [ ] Keep active-call banner and participant names synchronized.
- [ ] Enforce maximum 8 participants on the backend.

## 4. Default Media State
- [x] Start direct/group calls with camera OFF.
- [x] Start direct/group calls with mic OFF.
- [x] Show profile avatar while camera is OFF.
- [x] Show live video while camera is ON.

## 5. Realtime Camera Sync
- [x] Remote users must see camera ON/OFF immediately.
- [x] Use `replaceTrack` on every peer connection.
- [x] Do not recreate the full call when toggling camera.
- [x] Update the correct remote participant tile through `ontrack`.
- [x] Stop stale tracks.
- [x] Prevent duplicate video senders.
- [x] Reduce unnecessary rerenders/renegotiations.
- [x] Use reasonable video constraints for smoother streaming.

Suggested constraints:

```js
video: {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 }
}
```

## 6. Audio, Speaking, and Duration
- [x] Publish microphone tracks to every direct/group peer with `replaceTrack`.
- [x] Play remote group audio through the shared call audio output.
- [x] Show an active-speaker indicator from live audio levels.
- [x] Calculate ended-call duration from the captured call start time even after realtime state cleanup.
- [x] Broadcast authoritative camera/microphone state so remote clients immediately replace frozen video with the participant avatar.
