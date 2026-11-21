import { useEffect, useRef } from "react";
import socket from "@/lib/socket";

/**
 * `staffCaseChanged` socket payload. Every staff socket gets it (room `staff:cases`) after a
 * ticket or dispute is opened, answered, moved or decided. It carries ids only: desks read the
 * case back over HTTP, which applies each desk's own access rules.
 */
export type StaffCaseChange = {
  kind: "ticket" | "dispute";
  id: string;
  reason?: string | null;
  at?: string;
};

/**
 * Re-read a staff view when a ticket or dispute changes elsewhere (a member, another staff
 * member, a background job). Bursts are folded into one call after `delayMs`, and a reconnect
 * calls it once, so anything missed while offline is read back.
 * @param kinds which case kinds this view lists
 * @param onChange called with the last change of the burst, or null after a reconnect
 */
export function useStaffCaseEvents(
  kinds: StaffCaseChange["kind"][],
  onChange: (change: StaffCaseChange | null) => void,
  { enabled = true, delayMs = 500 }: { enabled?: boolean; delayMs?: number } = {}
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const kindKey = [...kinds].sort().join(",");

  useEffect(() => {
    if (!enabled) return;
    const wanted = new Set(kindKey.split(",").filter(Boolean));
    let timer: number | undefined;
    let last: StaffCaseChange | null = null;
    const schedule = (change: StaffCaseChange | null) => {
      last = change;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onChangeRef.current(last), delayMs);
    };
    const onCase = (change: StaffCaseChange) => {
      if (!change?.id || !wanted.has(change.kind)) return;
      schedule(change);
    };
    let dropped = false;
    const onDisconnect = () => {
      dropped = true;
    };
    const onReconnect = () => {
      if (!dropped) return;
      dropped = false;
      schedule(null);
    };
    if (!socket.connected) socket.connect();
    socket.on("staffCaseChanged", onCase);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onReconnect);
    return () => {
      window.clearTimeout(timer);
      socket.off("staffCaseChanged", onCase);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onReconnect);
    };
  }, [kindKey, enabled, delayMs]);
}
