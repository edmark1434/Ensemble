import { useEffect, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import useChatState, { type GoogleMeetingEvent } from "../chat_state";

function avatarUrl(path: string | null | undefined, name: string) {
  if (path && /^https?:\/\//i.test(path)) return path;
  const base = String(import.meta.env.VITE_CLOUDFRONT_URL || import.meta.env.VITE_ASSET_BASE_URL || "").replace(/\/$/, "");
  if (path && base) return `${base}/${path.replace(/^\/+/, "")}`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=16a34a&color=fff&bold=true`;
}

function durationLabel(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function LiveGoogleMeetingBanner({ call, compact = false }: { call: GoogleMeetingEvent; compact?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const accountId = useGlobalState((state) => state.user?.account_id);
  const joinMeeting = useChatState((state) => state.joinGoogleMeeting);
  const endMeeting = useChatState((state) => state.endGoogleMeeting);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (call.status !== "active") return;
    const sync = () => void api.post(`/api/google-meet/meetings/${call.meeting_id}/sync`).catch(() => undefined);
    const timer = window.setInterval(sync, 15000);
    return () => window.clearInterval(timer);
  }, [call.meeting_id, call.status]);

  const name = call.requester_name || "Someone";
  const participantCount = call.participant_ids?.length || 0;
  const isOrganizer = String(accountId) === String(call.requested_by_account_id);
  const isScheduled = call.status === "scheduled" && call.scheduled_at;

  return (
    <div className={`flex items-center gap-3 border-b border-green-500/20 bg-green-500/10 ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}>
      <div className="relative flex-shrink-0">
        <img src={avatarUrl(call.requester_avatar, name)} alt={name} className={`${compact ? "h-8 w-8" : "h-9 w-9"} rounded-full object-cover`} />
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#102119] bg-green-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${compact ? "text-[11px]" : "text-xs"} truncate font-semibold text-green-100`}>
          {isScheduled
            ? `${name} scheduled a meeting`
            : participantCount
              ? `${name} is in the meeting`
              : `${name} requested an instant meeting`}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-green-300/80">
          <Video className="h-3 w-3" />
          {isScheduled ? (
            <span>{new Date(call.scheduled_at!).toLocaleString()}</span>
          ) : (
            <>
              <span>{participantCount || "No"} {participantCount === 1 ? "participant" : "participants"}</span>
              <span>•</span>
              <span className="tabular-nums">{durationLabel(call.started_at, now)}</span>
            </>
          )}
        </p>
      </div>
      <button type="button" onClick={() => void joinMeeting(call)} className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-green-400">
        <ExternalLink className="h-3 w-3" /> Join meeting
      </button>
      {isOrganizer && (
        <button type="button" onClick={() => void endMeeting(call)} className="rounded-md bg-red-500/15 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/25">
          End
        </button>
      )}
    </div>
  );
}
