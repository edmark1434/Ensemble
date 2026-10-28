import React, { useState, useEffect } from "react";
import {
  Film,
  Plus,
  Play,
  Search,
  ExternalLink,
  Users,
  Trash2,
  X,
  Loader2,
  ShieldAlert,
  Info,
  Clock,
  Check,
} from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

interface Collaborator {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_url?: string;
  avatar_path?: string;
  role: string;
}

interface VideoProject {
  id: string;
  project_id: string;
  name: string;
  status?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  size_bytes?: number;
  thumbnailUrl?: string;
  created_at?: string;
  updated_at?: string;
  lastUpdated?: string;
  created_by_name?: string;
  created_by_handle?: string;
  collaborators?: Collaborator[];
}

interface TeamVideoProjectsTabProps {
  teamId: string;
  teamName?: string;
  canManage?: boolean;
  isOwner?: boolean;
  teamLeaderName?: string;
}

const ASPECT_RATIO_PRESETS = [
  {
    id: "16-9",
    name: "16:9 Landscape",
    width: 1920,
    height: 1080,
    ratio: "16:9",
    desc: "YouTube, standard desktop video",
    iconRatio: "w-8 h-4.5",
  },
  {
    id: "9-16",
    name: "9:16 Vertical",
    width: 1080,
    height: 1920,
    ratio: "9:16",
    desc: "TikTok, Reels, Shorts",
    iconRatio: "w-4.5 h-8",
  },
  {
    id: "1-1",
    name: "1:1 Square",
    width: 1080,
    height: 1080,
    ratio: "1:1",
    desc: "Instagram & feed posts",
    iconRatio: "w-6 h-6",
  },
  {
    id: "4-5",
    name: "4:5 Portrait",
    width: 1080,
    height: 1350,
    ratio: "4:5",
    desc: "Instagram vertical feed",
    iconRatio: "w-5 h-6.5",
  },
];

const resolveAvatarPath = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const cfBase = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
  return cfBase ? `${cfBase}/${path.replace(/^\/+/, "")}` : path;
};

export const TeamVideoProjectsTab: React.FC<TeamVideoProjectsTabProps> = ({
  teamId,
  teamName,
  canManage = true,
  isOwner = false,
  teamLeaderName,
}) => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Project Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState(
    teamName ? `${teamName} - Project` : "Team Video Project"
  );
  const [selectedPreset, setSelectedPreset] = useState(ASPECT_RATIO_PRESETS[0]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || "http://localhost:3000";

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/teams/${teamId}/video-projects`);
      setProjects(res.data?.data || []);
    } catch (err: any) {
      console.error("Failed to load team video projects:", err);
      showErrorToast(
        err?.response?.data?.message || "Failed to load team video projects"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      void fetchProjects();
    }
  }, [teamId]);

  const handleOpenProject = async (projectId: string) => {
    try {
      const { data } = await api.get("/api/editor/handoff-token");
      const handoffToken = data?.handoffToken;
      const targetUrl = handoffToken
        ? `${EDITOR_URL}/editor/${projectId}?token=${encodeURIComponent(
            handoffToken
          )}`
        : `${EDITOR_URL}/editor/${projectId}`;
      window.open(targetUrl, "_blank");
    } catch (err) {
      console.error("Failed to get editor handoff token:", err);
      window.open(`${EDITOR_URL}/editor/${projectId}`, "_blank");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) {
      showErrorToast("Only the Team Leader can create video projects for this team");
      return;
    }

    const title = newProjectName.trim();
    if (!title) {
      showErrorToast("Please enter a project title");
      return;
    }

    try {
      setCreating(true);
      const res = await api.post(`/api/teams/${teamId}/video-projects`, {
        name: title,
        width: selectedPreset.width,
        height: selectedPreset.height,
      });

      showSuccessToast(
        "Team video project created! All team members have been added as collaborators."
      );
      setIsCreateModalOpen(false);
      await fetchProjects();

      // Automatically launch the project in video editor
      const newProjectId = res.data?.data?.id || res.data?.data?.project_id;
      if (newProjectId) {
        handleOpenProject(newProjectId);
      }
    } catch (err: any) {
      console.error("Failed to create team video project:", err);
      showErrorToast(
        err?.response?.data?.message || "Failed to create team video project"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) {
      showErrorToast("Only the Team Leader can delete team video projects");
      return;
    }

    if (
      !window.confirm(
        "Remove this video project from the team? Team members will no longer share collaborative access to it."
      )
    ) {
      return;
    }

    try {
      setDeletingId(projectId);
      await api.delete(`/api/teams/${teamId}/video-projects/${projectId}`);
      showSuccessToast("Video project removed from team");
      setProjects((prev) => prev.filter((p) => (p.id || p.project_id) !== projectId));
    } catch (err: any) {
      console.error("Failed to remove team video project:", err);
      showErrorToast(
        err?.response?.data?.message || "Failed to remove video project"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar: Search & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs">
        <div className="relative min-w-[200px] sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team video projects..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="flex items-center gap-3">
          {isOwner ? (
            <button
              onClick={() => {
                setNewProjectName(
                  teamName ? `${teamName} - Project` : "Team Video Project"
                );
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Video Project</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 text-xs">
              <Info className="w-3.5 h-3.5 text-purple-500" />
              <span>
                Managed by Team Leader
                {teamLeaderName ? ` (${teamLeaderName})` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 animate-pulse space-y-3"
            >
              <div className="aspect-video w-full bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
            <Film className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            No video projects yet
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
            {isOwner
              ? "Create video edits, collaborative sequences, and client deliverables with your team. Every member is automatically granted editing access."
              : `No video projects have been created yet. When the Team Leader (${
                  teamLeaderName || "Owner"
                }) creates a video project, it will automatically appear here for the entire team to collaborate on.`}
          </p>
          {isOwner && (
            <button
              onClick={() => {
                setNewProjectName(
                  teamName ? `${teamName} - Project` : "Team Video Project"
                );
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const projId = p.id || p.project_id;
            const isVertical = p.height && p.width && p.height > p.width;
            const collabs = Array.isArray(p.collaborators) ? p.collaborators : [];
            const isDeleting = deletingId === projId;

            return (
              <div
                key={projId}
                onClick={() => handleOpenProject(projId)}
                className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3.5 shadow-xs hover:shadow-md hover:border-purple-500/40 transition-all duration-200 space-y-3 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Preview Area */}
                  <div className="relative aspect-video w-full rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center group-hover:brightness-95 transition">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 gap-1.5">
                        <Film className="w-8 h-8 opacity-40" />
                        <span className="text-[10px] uppercase font-mono tracking-wider">
                          {p.width && p.height
                            ? `${p.width}x${p.height}`
                            : isVertical
                            ? "9:16 Vertical"
                            : "16:9 Landscape"}
                        </span>
                      </div>
                    )}

                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 text-purple-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                        <Play className="w-4 h-4 fill-purple-600 ml-0.5" />
                      </div>
                    </div>

                    {/* Format Badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-medium text-white/90">
                      {isVertical ? "9:16" : "16:9"}
                    </span>

                    {/* Duration Badge */}
                    {p.duration_seconds !== undefined && p.duration_seconds > 0 && (
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-mono text-white">
                        {formatDuration(p.duration_seconds)}
                      </span>
                    )}
                  </div>

                  {/* Info Header */}
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 inline text-gray-400" />
                        <span>
                          {p.updated_at || p.lastUpdated
                            ? `Edited ${new Date(
                                p.updated_at || p.lastUpdated || ""
                              ).toLocaleDateString()}`
                            : "Ready to edit"}
                        </span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isOwner && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(projId, e)}
                          disabled={isDeleting}
                          title="Remove project from team"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(projId);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-400/40 text-[11px] font-bold transition"
                        title="Open in Video Editor"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Collaborators Bar */}
                <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>Team Access:</span>
                  </div>

                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {collabs.slice(0, 4).map((c, idx) => {
                      const avatarSrc = resolveAvatarPath(c.avatar_url || c.avatar_path);
                      const initial = (c.display_name || c.handle || "U").slice(0, 1).toUpperCase();
                      const isProjectOwner = c.role === "Owner";

                      return (
                        <div
                          key={c.account_id || idx}
                          title={`${c.display_name} (${isProjectOwner ? "Team Leader / Project Owner" : "Collaborator"})`}
                          className={`relative inline-block w-6 h-6 rounded-full border-2 border-white dark:border-dark-surface bg-zinc-700 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0 ${
                            isProjectOwner ? "ring-1 ring-purple-500" : ""
                          }`}
                        >
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={c.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>
                      );
                    })}
                    {collabs.length > 4 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-white dark:border-dark-surface bg-gray-100 dark:bg-white/10 text-[9px] font-bold text-gray-600 dark:text-zinc-300">
                        +{collabs.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Video Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Create Team Video Project
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Shared automatically with all team members
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Summer Campaign Edit"
                  maxLength={50}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base text-xs text-gray-900 dark:text-white outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Video Aspect Ratio & Resolution
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {ASPECT_RATIO_PRESETS.map((preset) => {
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset)}
                        className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 ring-1 ring-purple-500"
                            : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 leading-tight">
                          {preset.desc}
                        </p>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 mt-2">
                          {preset.width} × {preset.height}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notice callout */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-300">
                <Users className="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
                <p>
                  As the <strong>Team Leader</strong>, you are the project Owner.
                  Every active member of this team is automatically added as a
                  collaborator with editor permissions.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create & Open Editor</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
