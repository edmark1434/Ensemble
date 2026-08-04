import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Compass, Plus, Search, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import EditTeamModal from "./team_modals/EditTeamModal";

interface Team {
  team_id: string;
  display_name: string;
  handle: string;
  description: string;
  avatar_path?: string;
  member_count: number;
  current_user_role?: string;
  current_user_status?: string;
}

interface CreateTeamValues {
  name: string;
  handle: string;
  tagline: string;
  description: string;
  photo: File;
}

const cloudfrontUrl = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(
  /\/$/,
  "",
);

function getImageUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${cloudfrontUrl}/${path.replace(/^\/+/, "")}`;
}

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isBrowseMode, setIsBrowseMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const loadTeams = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.get("/api/teams", {
        params: {
          mine: !isBrowseMode,
          search: searchTerm,
        },
      });

      setTeams(response.data.data || []);
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to load Teams"));
    } finally {
      setIsLoading(false);
    }
  }, [isBrowseMode, searchTerm]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const createTeam = async ({ photo, ...teamValues }: CreateTeamValues) => {
    if (!photo.type.startsWith("image/")) {
      showErrorToast("Choose a valid image file");
      return;
    }

    if (photo.size > 5 * 1024 * 1024) {
      showErrorToast("Choose an image up to 5 MB");
      return;
    }

    setIsSaving(true);

    try {
      const uploadResponse = await api.post("/api/files/upload-url", {
        folder: "profile",
        filename: photo.name,
        contentType: photo.type,
      });

      await axios.put(uploadResponse.data.uploadUrl, photo, {
        headers: {
          "Content-Type": photo.type,
        },
      });

      const fileResponse = await api.post("/api/files/register", {
        name: photo.name,
        path: uploadResponse.data.key,
        mimeType: photo.type,
        sizeBytes: photo.size,
      });

      const teamResponse = await api.post("/api/teams", {
        ...teamValues,
        avatarFileId: fileResponse.data.fileId,
      });

      showSuccessToast("Team created");
      setIsCreateModalOpen(false);
      navigate(`/teams/${teamResponse.data.data.team_id}`);
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to create Team"));
    } finally {
      setIsSaving(false);
    }
  };

  const joinTeam = async () => {
    if (!joinCode.trim() || isSaving) return;

    setIsSaving(true);

    try {
      await api.post("/api/teams/join-by-code", {
        code: joinCode.trim(),
      });

      showSuccessToast("Team joined or request submitted");
      setIsJoinModalOpen(false);
      setJoinCode("");
      setIsBrowseMode(false);
      await loadTeams();
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to join Team"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a12]">
      <UserHeader pageTitle="Teams" />

      <main className="mx-auto max-w-7xl p-6 md:p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Teams</h1>
          <p className="text-sm text-zinc-400">
            Collaborate with your Team members on projects
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black"
          >
            <UserPlus className="h-4 w-4" />
            Join with Code
          </button>

          <button
            onClick={() => setIsBrowseMode((current) => !current)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white"
          >
            {isBrowseMode ? (
              <X className="h-4 w-4" />
            ) : (
              <Compass className="h-4 w-4" />
            )}
            {isBrowseMode ? "Back to My Teams" : "Browse Teams"}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-white"
          >
            <Plus className="h-4 w-4" />
            Create a Team
          </button>

          <label className="ml-auto flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-zinc-400">
            <Search className="mr-2 h-4 w-4" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search Teams"
              className="bg-transparent text-sm text-white outline-none"
            />
          </label>
        </div>

        <h2 className="mb-4 text-lg font-semibold text-white">
          {isBrowseMode ? "Browse Teams" : "My Teams"}
        </h2>

        {isLoading ? (
          <div className="p-8 text-zinc-400">Loading Teams...</div>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-12 text-center text-zinc-400">
            No Teams found.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <article
                key={team.team_id}
                onClick={() => navigate(`/teams/${team.team_id}`)}
                className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition hover:scale-[1.02] hover:border-white/20"
              >
                <div className="relative h-24 overflow-hidden bg-[#1e2130]">
                  {team.avatar_path ? (
                    <img
                      src={getImageUrl(team.avatar_path)}
                      alt={team.display_name}
                      className="h-full w-full object-cover transition group-hover:scale-110"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl text-white/30">
                      {team.display_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />
                </div>

                <div className="p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {team.display_name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        @{team.handle} · {team.member_count} members
                      </p>
                    </div>

                    {team.current_user_role && (
                      <span className="h-fit rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                        {team.current_user_role}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                    {team.description || "No description"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <EditTeamModal
        isOpen={isCreateModalOpen}
        mode="create"
        saving={isSaving}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createTeam}
      />

      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6">
            <h3 className="mb-2 text-xl font-semibold text-white">
              Join a Team
            </h3>
            <p className="mb-4 text-sm text-zinc-400">
              Enter the Team invite code to join.
            </p>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              className="mb-4 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white outline-none"
              placeholder="Invite code"
            />
            <div className="flex gap-3">
              <button
                disabled={isSaving || !joinCode.trim()}
                onClick={() => void joinTeam()}
                className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 py-2 text-white disabled:opacity-50"
              >
                {isSaving ? "Joining..." : "Join Team"}
              </button>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="flex-1 rounded-full border border-white/15 py-2 text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (
      (
        error as {
          response?: {
            data?: {
              message?: string;
            };
          };
        }
      ).response?.data?.message || fallback
    );
  }

  return fallback;
}
