import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
    FolderKanban,
    Plus,
    Video,
    Music,
    Image,
    MoreVertical,
    Clock,
    Users,
    Search,
    Filter,
    ChevronDown,
    Share2,
    Edit,
    Folder,
    FileVideo,
    User,
    Grid3x3,
    List,
    FileCheck,
    DollarSign,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useEffect } from "react";
import api from "@/lib/axios.ts";
import { formatDistanceToNow } from "date-fns";

interface Project {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  size: string;
  duration?: string;
  lastUpdated: string;
  sharedBy?: string;
  thumbnail: string;
  progress?: number;
  contractAmount?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  role?: string;
}

interface TeamProject {
  id: number;
  name: string;
  sharedBy: string;
  lastUpdated: string;
  size: string;
  thumbnail: string;
  videoCount?: number;
}

// Team Projects - Folders (placeholder)
const teamProjects: TeamProject[] = [];
// With Contract Projects (projects with active contracts and progress) (placeholder)
const contractProjects: Project[] = [];

type TabType = "recent" | "personal" | "shared";
type ViewType = "grid" | "compact";

// Skeleton Components
const ProjectCardSkeleton = ({ view = "grid" }: { view?: ViewType }) => (
  view === "compact" ? (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3">
      <div className="h-16 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
      <div className="flex-1">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div className="mt-1 h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
      </div>
      <div className="h-8 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
    </div>
  ) : (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
      <div className="mb-3 h-36 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
      <div className="h-5 w-3/4 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
      <div className="mt-2 flex gap-3">
        <div className="h-4 w-16 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
        <div className="h-4 w-12 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      </div>
    </div>
  )
);

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredProject, setHoveredProject] = useState<string | number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewType>("grid");
  const [sortMethod, setSortMethod] = useState<"none" | "az" | "size">("none");
  const [openTeamFolderId, setOpenTeamFolderId] = useState<number | null>(null);

  const cachedData = sessionStorage.getItem('ensemble_projects_data');
  const parsedCache = cachedData ? JSON.parse(cachedData) : null;

  const [personalProjects, setPersonalProjects] = useState<Project[]>(parsedCache?.personal || []);
  const [sharedProjects, setSharedProjects] = useState<Project[]>(parsedCache?.shared || []);
  const [recentProjects, setRecentProjects] = useState<Project[]>(parsedCache?.recent || []);

  const [loading, setLoading] = useState(!parsedCache);
  const [isRefreshing, setIsRefreshing] = useState(!!parsedCache);

  let activeTab: TabType = "recent";
  if (location.pathname.includes("/projects/personal")) {
    activeTab = "personal";
  } else if (location.pathname.includes("/projects/shared")) {
    activeTab = "shared";
  }

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/api/projects');
        const projects = response.data.projects.map((p: any) => {
          return {
            ...p,
            type: "video",
            duration: p.duration_seconds ? new Date(p.duration_seconds * 1000).toISOString().substr(11, 8) : "00:00:00",
            lastUpdated: p.lastUpdated ? formatDistanceToNow(new Date(p.lastUpdated), { addSuffix: true }) : "Unknown"
          };
        });

        const personal = projects.filter((p: Project) => p.role === "Owner");
        const shared = projects.filter((p: Project) => p.role !== "Owner");

        setPersonalProjects(personal);
        setSharedProjects(shared);
        setRecentProjects(projects);

        sessionStorage.setItem('ensemble_projects_data', JSON.stringify({
          personal, shared, recent: projects
        }));
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    setOpenTeamFolderId(null);
  }, [location.pathname]);

  const getTypeIcon = (type: Project["type"]) => {
    switch (type) {
      case "video": return <Video className="h-3 w-3" />;
      case "audio": return <Music className="h-3 w-3" />;
      case "image": return <Image className="h-3 w-3" />;
      default: return <Video className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type: Project["type"]) => {
    switch (type) {
      case "video": return "bg-red-500/20 text-red-400";
      case "audio": return "bg-purple-500/20 text-purple-400";
      case "image": return "bg-green-500/20 text-green-400";
      default: return "bg-blue-500/20 text-blue-400";
    }
  };

  const tabs = [
    { id: "recent" as TabType, label: "Recent", icon: <Clock className="h-4 w-4" /> },
    { id: "personal" as TabType, label: "Personal", icon: <User className="h-4 w-4" /> },
    { id: "shared" as TabType, label: "Shared", icon: <Share2 className="h-4 w-4" /> },
  ];

  const handleTabClick = (tabId: TabType) => {
    setOpenTeamFolderId(null);
    if (tabId === "recent") navigate("/projects");
    else if (tabId === "personal") navigate("/projects/personal");
    else if (tabId === "shared") navigate("/projects/shared");
  };

  const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000';

  const handleOpenProject = async (projectId: string) => {
    try {
      const { data } = await api.get('/api/editor/handoff-token');
      const handoffToken = data.handoffToken;

      const params = new URLSearchParams({
        token: handoffToken,
      });

      window.location.href = `${EDITOR_URL}/editor/${projectId}?${params.toString()}`;
    } catch (err) {
      console.error('Failed to get editor handoff token:', err);
    }
  };

  const getContent = () => {
    switch (activeTab) {
      case "recent": return recentProjects;
      case "personal": return personalProjects;
      case "shared": return sharedProjects;
      case "team": return teamProjects;
      default: return [];
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "recent": return "Recent Projects";
      case "personal": return "Personal Projects";
      case "shared": return "Shared With You";
      case "contract": return "Projects Under Contract";
      case "team": return "Team Projects";
      default: return "Projects";
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case "recent": return "Recently accessed projects";
      case "personal": return "Your private workspace";
      case "shared": return "Videos shared with you by collaborators";
      case "contract": return "Projects with active contracts and progress tracking";
      case "team": return "Collaborative workspace folders";
      default: return "";
    }
  };

  // Render Project Card (Grid View) - 4 columns layout
  const renderProjectCard = (project: Project) => (
    <div
      key={project.id}
      className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 hover:scale-[1.02] shadow-sm hover:shadow-md dark:shadow-none cursor-pointer"
      onMouseEnter={() => setHoveredProject(project.id)}
      onMouseLeave={() => setHoveredProject(null)}
      onClick={() => handleOpenProject(project.id)}
    >
      <div className="relative h-36 w-full overflow-hidden bg-gray-200 dark:bg-gradient-to-br dark:from-dark-surface dark:to-dark-surface">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 dark:from-dark-base via-transparent to-transparent" />

        {project.duration && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              {project.duration}
            </span>
          </div>
        )}

        {project.sharedBy && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm">
              <Users className="h-3 w-3" />
              Shared by {project.sharedBy.split(" ")[0]}
            </span>
          </div>
        )}

        <button 
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-white backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4">
        {isRefreshing ? (
          <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        ) : (
          <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white truncate">
            {project.name}
          </h3>
        )}

        {/* Progress Bar for Contract Projects */}
        {activeTab === "contract" && project.progress !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500 mb-1">
              <span>Progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Contract Amount */}
        {activeTab === "contract" && project.contractAmount && (
          <div className="mb-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <DollarSign className="h-3 w-3" />
            <span>{project.contractAmount}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          {isRefreshing ? (
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          ) : (
            <div>{project.size}</div>
          )}
        </div>

        {(project.width || project.height || project.duration_seconds) && (
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 dark:text-zinc-500">
            <div>
              {project.width && project.height ? `${project.width}x${project.height}` : ''}
            </div>
            <div>
              {project.duration_seconds ? `${project.duration_seconds}s` : ''}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-3">
          <button 
            className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button 
            className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hoveredProject === project.id && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
    </div>
  );

  // Render Project Card (Compact View)
  const renderCompactProjectCard = (project: Project) => (
    <div
      key={project.id}
      className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 shadow-sm hover:shadow-md dark:shadow-none cursor-pointer"
      onClick={() => handleOpenProject(project.id)}
    >
      <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gradient-to-br dark:from-dark-surface dark:to-dark-surface">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="h-full w-full object-cover"
        />
        {project.duration && (
          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white">
            {project.duration}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isRefreshing ? (
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        ) : (
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          {isRefreshing ? (
            <div className="h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          ) : (
            <div>{project.size}</div>
          )}
          {project.width && project.height && (
            <div className="text-[10px] text-gray-400 dark:text-zinc-500">{project.width}x{project.height}</div>
          )}
          {project.duration_seconds && (
            <div className="text-[10px] text-gray-400 dark:text-zinc-500">{project.duration_seconds}s</div>
          )}
          {project.sharedBy && (
            <span className="text-gray-400 dark:text-zinc-400">Shared by {project.sharedBy.split(" ")[0]}</span>
          )}
        </div>

        {/* Progress Bar for Contract Projects in Compact View */}
        {activeTab === "contract" && project.progress !== undefined && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-zinc-500">{project.progress}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button 
          className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button 
          className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  // Render Team Folder Card (Grid View)
  const renderTeamFolderCard = (project: TeamProject) => (
    <div
      key={project.id}
      className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 hover:scale-[1.02] cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
      onMouseEnter={() => setHoveredProject(project.id + 200)}
      onMouseLeave={() => setHoveredProject(null)}
      onClick={() => setOpenTeamFolderId(project.id)}
    >
      <div className="relative h-36 w-full p-2 bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
        <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-1.5">
          <div className="bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center transition-transform group-hover:scale-[1.05]">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/70 dark:border-l-white/70 border-b-[4px] border-b-transparent ml-0.5" />
          </div>
          <div className="bg-amber-700/60 dark:bg-amber-700/50 rounded flex items-center justify-center transition-transform group-hover:scale-[1.05]">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/70 dark:border-l-white/70 border-b-[4px] border-b-transparent ml-0.5" />
          </div>
          <div className="bg-green-500/80 dark:bg-green-500/60 rounded flex items-center justify-center transition-transform group-hover:scale-[1.05]">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/70 dark:border-l-white/70 border-b-[4px] border-b-transparent ml-0.5" />
          </div>
          <div className="bg-orange-500/80 dark:bg-orange-500/60 rounded flex items-center justify-center transition-transform group-hover:scale-[1.05]">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-black/70 dark:border-l-white/70 border-b-[4px] border-b-transparent ml-0.5" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
            <Users className="h-3 w-3" />
            Team Folder
          </span>
        </div>

        <button
          className="absolute right-3 top-3 rounded-full bg-white/80 dark:bg-black/50 p-1.5 text-gray-600 dark:text-zinc-400 transition hover:text-gray-900 dark:hover:text-white backdrop-blur-sm border border-gray-200 dark:border-none"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">Shared by {project.sharedBy.split(" ")[0]}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileVideo className="h-3 w-3" />
            <span>{project.videoCount} videos</span>
          </div>
          <div>{project.size}</div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-3">
          <button 
            onClick={(e) => { e.stopPropagation(); setOpenTeamFolderId(project.id); }}
            className="flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 transition hover:bg-purple-100 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-none"
          >
            <FolderKanban className="h-3 w-3" />
            Open Folder
          </button>
          <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hoveredProject === project.id + 200 && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
    </div>
  );

  // Render Team Folder Card (Compact View)
  const renderCompactTeamFolderCard = (project: TeamProject) => (
    <div
      key={project.id}
      className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 cursor-pointer shadow-sm hover:shadow-md dark:shadow-none"
      onClick={() => setOpenTeamFolderId(project.id)}
    >
      <div className="relative h-16 w-24 flex-shrink-0 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-1">
        <div className="h-full w-full grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="bg-gray-300 dark:bg-gray-600 rounded-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[2px] border-t-transparent border-l-[3px] border-l-black/70 dark:border-l-white/70 border-b-[2px] border-b-transparent ml-px" />
          </div>
          <div className="bg-amber-700/60 dark:bg-amber-700/50 rounded-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[2px] border-t-transparent border-l-[3px] border-l-black/70 dark:border-l-white/70 border-b-[2px] border-b-transparent ml-px" />
          </div>
          <div className="bg-green-500/80 dark:bg-green-500/60 rounded-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[2px] border-t-transparent border-l-[3px] border-l-black/70 dark:border-l-white/70 border-b-[2px] border-b-transparent ml-px" />
          </div>
          <div className="bg-orange-500/80 dark:bg-orange-500/60 rounded-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[2px] border-t-transparent border-l-[3px] border-l-black/70 dark:border-l-white/70 border-b-[2px] border-b-transparent ml-px" />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-500">Shared by {project.sharedBy.split(" ")[0]}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileVideo className="h-3 w-3" />
            <span>{project.videoCount} videos</span>
          </div>
          <div>{project.size}</div>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); setOpenTeamFolderId(project.id); }}
        className="flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 transition hover:bg-purple-100 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-none"
      >
        <FolderKanban className="h-3 w-3" />
        Open
      </button>
    </div>
  );

  const renderContent = () => {
    let content = getContent();

    const parseSize = (sizeStr: string) => {
      let multiplier = 1;
      if (sizeStr.includes("GB")) multiplier = 1024;
      return parseFloat(sizeStr) * multiplier;
    };

    content = [...content].sort((a: any, b: any) => {
      if (sortMethod === "az") {
        return (a.name || "").localeCompare(b.name || "");
      } else if (sortMethod === "size") {
        return parseSize(b.size || "0") - parseSize(a.size || "0");
      }
      return 0; // none
    });

    if (activeTab === "team") {
      if (openTeamFolderId) {
        // Mocking videos inside the folder using some existing projects
        const folderVideos = personalProjects.slice(0, 4);
        
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-white/10 mb-4">
              <button 
                onClick={() => setOpenTeamFolderId(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm"
              >
                ← Back to Folders
              </button>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {teamProjects.find(p => p.id === openTeamFolderId)?.name || "Team Folder"}
              </h3>
            </div>
            
            {viewMode === "compact" ? (
              <div className="space-y-3">
                {folderVideos.map(renderCompactProjectCard)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {folderVideos.map(renderProjectCard)}
              </div>
            )}
          </div>
        );
      }

      if (viewMode === "compact") {
        return (
          <div className="space-y-3">
            {(content as TeamProject[]).map(renderCompactTeamFolderCard)}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(content as TeamProject[]).map(renderTeamFolderCard)}
        </div>
      );
    }

    if (viewMode === "compact") {
      return (
        <div className="space-y-3">
          {(content as Project[]).map(renderCompactProjectCard)}
        </div>
      );
    }

    // Grid view - 4 columns
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(content as Project[]).map(renderProjectCard)}
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <UserHeader pageTitle="Projects" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
          <button
            onClick={() => navigate("/projects/select")}
            className="shrink-0 flex items-center gap-2 rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-black transition hover:scale-105 group"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a Project</span>
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search projects by title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Tabs & View Toggle */}
        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
          <div className="flex gap-1 relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                    isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-t-lg"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.icon} {tab.label}
                  </span>

                  {isActive && (
                    <>
                      <motion.div
                        layoutId="activeTabGlow"
                        className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="py-2 flex items-center gap-4">
            {/* Sort Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1 mr-2">
              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 px-2">Sort by:</span>
              <button
                onClick={() => setSortMethod("none")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  sortMethod === "none"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setSortMethod("az")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  sortMethod === "az"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortMethod("size")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  sortMethod === "size"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Size
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1">
              <button
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  viewMode === "compact"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <List className="h-4 w-4" />
                List View
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Grid View
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{getTabTitle()}</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500">{getTabDescription()}</p>
        </div>

        {/* Content */}
        <div className="pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loading ? (
                viewMode === "compact" ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <ProjectCardSkeleton key={i} view="compact" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <ProjectCardSkeleton key={i} view="grid" />
                    ))}
                  </div>
                )
              ) : (
                renderContent()
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {!loading && getContent().length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-12 text-center">
            <FolderKanban className="mb-3 h-12 w-12 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Create your first project to get started
            </p>
            <button
              onClick={() => navigate("/projects/select")}
              className="mt-4 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Create Project
            </button>
          </div>
        )}
      </div>


    </div>
  );
};

export default Projects;