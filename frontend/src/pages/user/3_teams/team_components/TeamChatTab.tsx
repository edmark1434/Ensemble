import React, { useState } from "react";
import {
  MessageCircle,
  Users,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { showErrorToast } from "@/components/utility/toast";

interface TeamChatTabProps {
  teamId: string;
  teamName: string;
  memberCount: number;
  members: Array<{
    account_id: string;
    display_name: string;
    handle: string;
    role: string;
    avatar_path?: string;
  }>;
}

const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/+$/, "");
const getAvatarUrl = (path?: string | null) => {
  if (!path) return "/placeholders/avatar.png";
  if (path.startsWith("http")) return path;
  return `${cloudfront}/${path.replace(/^\/+/, "")}`;
};

export const TeamChatTab: React.FC<TeamChatTabProps> = ({
  teamId,
  teamName,
  memberCount,
  members,
}) => {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const handleOpenChat = async () => {
    try {
      setOpening(true);
      const res = await api.post(`/api/teams/${teamId}/chat`);
      const conversationId = res.data.data?.conversationId;
      navigate("/inbox/direct", {
        state: { conversationId },
      });
    } catch (err: unknown) {
      console.error("Unable to open team chat:", err);
      showErrorToast("Unable to open Team Chat");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Team Chat Showcase Hub */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-8 shadow-xs text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-sm">
          <MessageCircle className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">
            {teamName} Group Chat
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Realtime team communications channel. Share quick updates, media links, task discussions, and project feedback with your {memberCount} teammates.
          </p>
        </div>

        {/* Members Avatars preview */}
        <div className="flex items-center justify-center -space-x-2 py-1">
          {members.slice(0, 7).map((m) => (
            <div
              key={m.account_id}
              className="w-9 h-9 rounded-full overflow-hidden border-2 border-white dark:border-dark-base shadow-xs"
              title={`${m.display_name} (${m.role})`}
            >
              <img
                src={getAvatarUrl(m.avatar_path)}
                alt={m.display_name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {members.length > 7 && (
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 border-2 border-white dark:border-dark-base flex items-center justify-center text-[11px] font-bold text-gray-600 dark:text-zinc-300">
              +{members.length - 7}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleOpenChat}
            disabled={opening}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>{opening ? "Opening Inbox..." : "Open Team Chat in Inbox"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Note */}
        <p className="text-[11px] text-gray-400 dark:text-zinc-500">
          Messages are private to active members of this Team.
        </p>
      </div>
    </div>
  );
};
