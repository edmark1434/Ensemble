import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  Film,
  Link as LinkIcon,
  Loader2,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Unlink,
  Users,
  Video,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';

interface Collaborator {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_path?: string;
  role: string;
}

interface VideoProject {
  id: string;
  project_id: string;
  name: string;
  status: string;
  width: number;
  height: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
  lastUpdated?: string;
  thumbnail_path?: string;
  thumbnailUrl?: string | null;
  size_bytes?: number;
  linked_at?: string;
  linked_by_name?: string;
  linked_by_handle?: string;
  collaborators?: Collaborator[];
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const placeholderThumbnail = (name: string) =>
  `https://placehold.co/400x225/1e2130/4a6fa5?text=${encodeURIComponent(name)}`;

const ProjectThumbnail = ({
  project,
  className,
}: {
  project: { thumbnailUrl?: string | null; thumbnail_path?: string | null; name: string };
  className: string;
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumb = project.thumbnailUrl || project.thumbnail_path;
  const useReal = !!thumb && thumb !== failedUrl;

  return (
    <img
      src={useReal ? thumb! : placeholderThumbnail(project.name)}
      alt={project.name}
      className={className}
      onError={() => {
        if (thumb) setFailedUrl(thumb);
      }}
    />
  );
};

interface ProjectVideoTabProps {
  teamId: string;
  isClient: boolean;
  currentUserAccountId?: string;
  workspaceTitle?: string;
  onRefreshWorkspace?: () => void;
}

const ASPECT_RATIO_PRESETS = [
  { id: '9:16', label: '9:16 Vertical (Reel / TikTok)', width: 1080, height: 1920, desc: 'Instagram Reels, TikTok, YouTube Shorts' },
  { id: '16:9', label: '16:9 Landscape (Standard HD)', width: 1920, height: 1080, desc: 'YouTube, Web, Desktop Monitors' },
  { id: '1:1', label: '1:1 Square (Feed)', width: 1080, height: 1080, desc: 'Instagram Square, Facebook Feed' },
  { id: '4:5', label: '4:5 Portrait (Social Feed)', width: 1080, height: 1350, desc: 'Instagram Portrait Feed' },
];

export const ProjectVideoTab: React.FC<ProjectVideoTabProps> = ({
  teamId,
  isClient,
  currentUserAccountId,
  workspaceTitle = 'Video Project',
  onRefreshWorkspace,
}) => {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Link existing project modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create new project modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState((workspaceTitle || 'Video Project').slice(0, 50));
  const [selectedPreset, setSelectedPreset] = useState(ASPECT_RATIO_PRESETS[0]);
  const [creating, setCreating] = useState(false);

  // Unlink state
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // Card interaction & renaming state (matching /projects)
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState<string>('');
  const [isRenamingProjectId, setIsRenamingProjectId] = useState<string | null>(null);
  const renameInFlightRef = useRef(false);

  const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000';

  const handleOpenProject = async (projectId: string) => {
    try {
      const { data } = await api.get('/api/editor/handoff-token');
      const handoffToken = data?.handoffToken;
      const targetUrl = handoffToken
        ? `${EDITOR_URL}/editor/${projectId}?token=${encodeURIComponent(handoffToken)}`
        : `${EDITOR_URL}/editor/${projectId}`;
      window.open(targetUrl, '_blank');
    } catch (err) {
      console.error('Failed to get editor handoff token:', err);
      window.open(`${EDITOR_URL}/editor/${projectId}`, '_blank');
    }
  };

  const handleRenameProject = async (projectId: string) => {
    if (renameInFlightRef.current) return;

    const nextName = editProjectName.trim().slice(0, 50);
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      setEditingProjectId(null);
      return;
    }

    if (!nextName || nextName === project.name) {
      setEditingProjectId(null);
      return;
    }

    renameInFlightRef.current = true;
    setIsRenamingProjectId(projectId);
    try {
      await api.put(`/api/projects/${projectId}`, { name: nextName });
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, name: nextName } : p))
      );
      showSuccessToast('Project renamed successfully');
    } catch (err: any) {
      console.error('Failed to rename project:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to rename project');
    } finally {
      renameInFlightRef.current = false;
      setIsRenamingProjectId(null);
      setEditingProjectId(null);
    }
  };

  const fetchVideoProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/team-projects/${teamId}/video-projects`);
      setProjects(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load video projects:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to load video projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) fetchVideoProjects();
  }, [teamId]);

  const openLinkModal = async () => {
    setIsLinkModalOpen(true);
    setSelectedProjectId('');
    setSearchQuery('');
    try {
      setLoadingAvailable(true);
      const res = await api.get(`/api/team-projects/${teamId}/video-projects/available`);
      setAvailableProjects(res.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load available projects:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleLinkProject = async () => {
    if (!selectedProjectId) {
      showErrorToast('Please select a project to link');
      return;
    }
    try {
      setLinking(true);
      await api.post(`/api/team-projects/${teamId}/video-projects/link`, {
        projectId: selectedProjectId,
      });
      showSuccessToast('Video project linked to workspace! All members now have editing access.');
      setIsLinkModalOpen(false);
      await fetchVideoProjects();
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      console.error('Failed to link project:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to link video project');
    } finally {
      setLinking(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      showErrorToast('Please enter a project title');
      return;
    }
    try {
      setCreating(true);
      const res = await api.post(`/api/team-projects/${teamId}/video-projects/create`, {
        name: newProjectName.trim(),
        width: selectedPreset.width,
        height: selectedPreset.height,
      });
      showSuccessToast('Video project created! Workspace members have been granted access.');
      setIsCreateModalOpen(false);
      await fetchVideoProjects();
      if (onRefreshWorkspace) onRefreshWorkspace();

      // Open new project directly in editor
      const newId = res.data?.data?.id || res.data?.data?.project_id;
      if (newId) {
        handleOpenProject(newId);
      }
    } catch (err: any) {
      console.error('Failed to create project:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to create video project');
    } finally {
      setCreating(false);
    }
  };

  const handleUnlinkProject = async (projectId: string) => {
    if (!window.confirm('Unlink this video project from the contract workspace? Existing project assets will remain intact in the editor.')) {
      return;
    }
    try {
      setUnlinkingId(projectId);
      await api.delete(`/api/team-projects/${teamId}/video-projects/${projectId}`);
      showSuccessToast('Video project unlinked from workspace');
      await fetchVideoProjects();
      if (onRefreshWorkspace) onRefreshWorkspace();
    } catch (err: any) {
      console.error('Failed to unlink project:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to unlink video project');
    } finally {
      setUnlinkingId(null);
    }
  };

  const filteredAvailable = availableProjects.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-3" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Loading linked video projects...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header & Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Contract Video Projects
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
              {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Video projects linked to this contract workspace. Every member of this workspace has full Editor access to collaborate in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openLinkModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition shadow-2xs active:scale-95"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link Project</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewProjectName((workspaceTitle || 'Video Project').slice(0, 50));
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>
      </div>

      {/* Projects List or Empty State */}
      {projects.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <Film className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
              No Video Project Linked Yet
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Link an existing project from your library or create a new video project for this contract. All workspace team members will automatically receive collaborative Editor access.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={openLinkModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition shadow-2xs"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Link Existing Project</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNewProjectName((workspaceTitle || 'Video Project').slice(0, 50));
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Video Project</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {projects.map((project) => {
            const duration = project.duration_seconds
              ? new Date(project.duration_seconds * 1000).toISOString().substr(11, 8)
              : '00:00:00';
            const lastUpdated = project.updated_at
              ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
              : 'Just now';
            const size = formatBytes(Number(project.size_bytes || 0));
            const collaborators = project.collaborators || [];

            return (
              <div
                key={project.id}
                className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 hover:scale-[1.02] shadow-sm hover:shadow-md dark:shadow-none cursor-pointer"
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
                onClick={() => handleOpenProject(project.id)}
              >
                <div className="relative h-36 w-full overflow-hidden bg-gray-200 dark:bg-gradient-to-br dark:from-dark-surface dark:to-dark-surface">
                  <ProjectThumbnail
                    project={project}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 dark:from-dark-base via-transparent to-transparent pointer-events-none" />

                  {/* Unlink project button on top right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkProject(project.id);
                    }}
                    disabled={unlinkingId === project.id}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 text-zinc-300 hover:text-rose-400 hover:bg-black/80 backdrop-blur-sm transition z-10 opacity-70 group-hover:opacity-100"
                    title="Unlink project from workspace"
                  >
                    {unlinkingId === project.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Duration badge on bottom right */}
                  <div className="absolute bottom-3 right-3 pointer-events-none">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm">
                      <Clock className="h-2.5 w-2.5" />
                      {duration}
                    </span>
                  </div>

                  {/* Collaborators badge on bottom left */}
                  {collaborators.length > 0 && (
                    <div className="absolute bottom-3 left-3 pointer-events-none">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm">
                        <Users className="h-2.5 w-2.5" />
                        {collaborators.length} {collaborators.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      className="rounded-lg p-1 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProjectId(project.id);
                        setEditProjectName(project.name);
                      }}
                      title="Rename Project"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    {isRenamingProjectId === project.id ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400 italic">Saving...</span>
                      </div>
                    ) : editingProjectId === project.id ? (
                      <input
                        autoFocus
                        type="text"
                        maxLength={50}
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameProject(project.id);
                          } else if (e.key === 'Escape') {
                            setEditingProjectId(null);
                          }
                        }}
                        onBlur={() => handleRenameProject(project.id)}
                        className="flex-1 min-w-0 bg-transparent border-b border-blue-500 text-sm font-semibold text-gray-900 dark:text-white outline-none"
                      />
                    ) : (
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={project.name}>
                        {project.name}
                      </h3>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{lastUpdated}</span>
                    </div>
                    <div>{size}</div>
                  </div>

                  {(project.width || project.height || project.duration_seconds !== undefined) && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500">
                      <div>
                        {project.width && project.height ? `${project.width}x${project.height}` : ''}
                      </div>
                      <div>
                        {project.duration_seconds ? `${Math.round(project.duration_seconds)}s` : ''}
                      </div>
                    </div>
                  )}
                </div>

                {hoveredProject === project.id && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Link Existing Project */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Link Existing Video Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search your video projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              {loadingAvailable ? (
                <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading your projects...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  {searchQuery ? 'No matching projects found' : 'No available projects found to link'}
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  {filteredAvailable.map((p) => {
                    const isSelected = selectedProjectId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                            <Video className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                              {p.name}
                            </h5>
                            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                              {p.width} × {p.height}
                            </span>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
              <span>
                Linking this project will automatically add all team workspace members as collaborative Editors in the video editor.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkProject}
                disabled={!selectedProjectId || linking}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {linking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Link Project</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create New Video Project */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Create Workspace Video Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Project Title
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {newProjectName.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Gym Workout Reel – Main Edit"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Aspect Ratio & Format Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ASPECT_RATIO_PRESETS.map((preset) => {
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset)}
                        className={`p-3 rounded-xl border cursor-pointer transition space-y-1 ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-white'
                            : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {preset.id}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                            {preset.width} × {preset.height}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                          {preset.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                Creating this project will initialize the editor canvas and automatically grant real-time Editor access to all members in this workspace.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create & Open Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectVideoTab;
