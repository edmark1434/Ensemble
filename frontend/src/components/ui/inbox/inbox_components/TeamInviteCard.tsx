import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

export interface TeamInviteData {
  teamId?: string;
  teamName: string;
  joinCode?: string;
  description?: string;
}

export function parseTeamInviteMessage(content: string): TeamInviteData | null {
  if (!content || typeof content !== "string") return null;

  // 1. Tag format: [team-invite:teamId:teamName:joinCode] optional text
  const tagMatch = content.match(/^\[team-invite:([^:\]]+)(?::([^:\]]*))?(?::([^\]]*))?\]\s*(.*)$/);
  if (tagMatch) {
    const teamId = tagMatch[1];
    const teamName = decodeURIComponent(tagMatch[2] || "Team");
    const joinCode = tagMatch[3] || "";
    const description = tagMatch[4] || `You're invited to join Team "${teamName}".`;
    return { teamId, teamName, joinCode, description };
  }

  // 2. Legacy / URL text format:
  // "Hello! You have been invited to join Team "Edmark's Team 2"...\nhttp://localhost:5173/teams/join/D6C4176E050F"
  const textMatch = content.match(/invited to join Team "([^"]+)"[\s\S]*?teams\/(?:join\/([a-zA-Z0-9_-]+)|([0-9a-fA-F-]{36}))/i);
  if (textMatch) {
    const teamName = textMatch[1] || "Team";
    const joinCode = textMatch[2] || "";
    const teamId = textMatch[3] || "";
    return {
      teamId,
      teamName,
      joinCode,
      description: `You're invited to join Team "${teamName}".`,
    };
  }

  return null;
}

interface TeamInviteCardProps {
  teamId?: string;
  teamName: string;
  joinCode?: string;
  description?: string;
  isSender: boolean;
  compact?: boolean;
}

export const TeamInviteCard: React.FC<TeamInviteCardProps> = ({
  teamId,
  teamName,
  joinCode,
  description,
  isSender,
  compact = false,
}) => {
  const navigate = useNavigate();

  const targetPath = joinCode
    ? `/teams/join/${encodeURIComponent(joinCode)}`
    : teamId
    ? `/teams/${teamId}`
    : "/teams";

  const handleViewInvite = () => {
    navigate(targetPath);
  };

  return (
    <div
      className={`rounded-2xl p-4 my-1 transition ${
        compact ? "min-w-48 max-w-xs" : "min-w-64 max-w-sm"
      } ${
        isSender
          ? "bg-blue-900/40 border border-white/20 text-white"
          : "bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white shadow-sm"
      }`}
    >
      {/* Header with Team Icon */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            isSender
              ? "bg-white/20 text-white"
              : "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400"
          }`}
        >
          <Users className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">
            Team Invitation
          </span>
          <h4 className="truncate text-sm font-bold leading-tight">
            {teamName}
          </h4>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs opacity-85 mb-3 leading-relaxed">
        {description || `You're invited to join Team "${teamName}".`}
      </p>

      {/* Button: Only View Invite */}
      <button
        type="button"
        onClick={handleViewInvite}
        className={`cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] ${
          isSender
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-blue-500 hover:bg-blue-400 text-white"
        }`}
      >
        <span>View Invite</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default TeamInviteCard;
