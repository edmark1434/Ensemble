import { useNavigate } from "react-router-dom";
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

interface Project {
  id: number;
  name: string;
  type: "video" | "audio" | "image";
  size: string;
  duration?: string;
  lastUpdated: string;
  sharedBy?: string;
  thumbnail: string;
  progress?: number;
  contractAmount?: string;
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

// Personal Projects
const personalProjects: Project[] = [
  {
    id: 1,
    name: "Untitled.mp4",
    type: "video",
    size: "140MB",
    duration: "02:34",
    lastUpdated: "8 mins ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Untitled.mp4"
  },
  {
    id: 2,
    name: "Summer Vacation Reel",
    type: "video",
    size: "450MB",
    duration: "05:23",
    lastUpdated: "2 hours ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Summer+Vacation"
  },
  {
    id: 3,
    name: "Product Review Final",
    type: "video",
    size: "280MB",
    duration: "03:45",
    lastUpdated: "Yesterday",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Product+Review"
  },
  {
    id: 4,
    name: "Tutorial Part 1",
    type: "video",
    size: "620MB",
    duration: "12:18",
    lastUpdated: "2 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Tutorial+Part+1"
  },
  {
    id: 5,
    name: "Wedding Highlights",
    type: "video",
    size: "1.2GB",
    duration: "08:42",
    lastUpdated: "3 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Wedding+Highlights"
  },
  {
    id: 6,
    name: "Gaming Montage",
    type: "video",
    size: "890MB",
    duration: "15:30",
    lastUpdated: "5 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Gaming+Montage"
  },
];

// Shared Projects (videos shared with you)
const sharedProjects: Project[] = [
  {
    id: 7,
    name: "YT-Vid v5 Minecraft",
    type: "video",
    size: "503MB",
    duration: "22:15",
    lastUpdated: "2 mins ago",
    sharedBy: "Edmark Talingting",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Minecraft"
  },
  {
    id: 8,
    name: "Untitled(2).mp4",
    type: "video",
    size: "25MB",
    duration: "00:45",
    lastUpdated: "8 mins ago",
    sharedBy: "Jadei Pacibe",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Untitled(2).mp4"
  },
  {
    id: 9,
    name: "01:58",
    type: "video",
    size: "140MB",
    duration: "01:58",
    lastUpdated: "8 mins ago",
    sharedBy: "Jadei Pacibe",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=01:58"
  },
  {
    id: 10,
    name: "Team Alpha - Commercial",
    type: "video",
    size: "2.1GB",
    duration: "45:20",
    lastUpdated: "1 hour ago",
    sharedBy: "Sarah Chen",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Team+Alpha"
  },
  {
    id: 11,
    name: "Documentary Rough Cut",
    type: "video",
    size: "3.2GB",
    duration: "01:23:45",
    lastUpdated: "3 hours ago",
    sharedBy: "Marcus Thompson",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Documentary"
  },
];

// With Contract Projects (projects with active contracts and progress)
const contractProjects: Project[] = [
  {
    id: 12,
    name: "Corporate Video - Tech Startup",
    type: "video",
    size: "1.8GB",
    duration: "05:30",
    lastUpdated: "2 days ago",
    sharedBy: "Sarah Chen",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Corporate+Video",
    progress: 75,
    contractAmount: "15,000"
  },
  {
    id: 13,
    name: "Music Video - Indie Band",
    type: "video",
    size: "2.3GB",
    duration: "04:15",
    lastUpdated: "5 days ago",
    sharedBy: "Emma Watson",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Music+Video",
    progress: 45,
    contractAmount: "25,000"
  },
  {
    id: 14,
    name: "Documentary - Nature",
    type: "video",
    size: "4.5GB",
    duration: "45:00",
    lastUpdated: "1 week ago",
    sharedBy: "Marcus Thompson",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Nature+Doc",
    progress: 90,
    contractAmount: "50,000"
  },
  {
    id: 15,
    name: "Commercial - Product Launch",
    type: "video",
    size: "1.2GB",
    duration: "00:30",
    lastUpdated: "3 days ago",
    sharedBy: "Jessica Martinez",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Commercial",
    progress: 30,
    contractAmount: "8,000"
  },
];

// Recent Projects (mix of personal, shared, and team projects - most recently accessed)
const recentProjects: Project[] = [
  {
    id: 1,
    name: "YT-Vid v5 Minecraft",
    type: "video",
    size: "503MB",
    duration: "22:15",
    lastUpdated: "2 mins ago",
    sharedBy: "Edmark Talingting",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Minecraft"
  },
  {
    id: 2,
    name: "Summer Vacation Reel",
    type: "video",
    size: "450MB",
    duration: "05:23",
    lastUpdated: "2 hours ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Summer+Vacation"
  },
  {
    id: 3,
    name: "Corporate Video - Tech Startup",
    type: "video",
    size: "1.8GB",
    duration: "05:30",
    lastUpdated: "2 days ago",
    sharedBy: "Sarah Chen",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Corporate+Video",
    progress: 75,
    contractAmount: "15,000"
  },
  {
    id: 4,
    name: "Team Alpha - Commercial",
    type: "video",
    size: "2.1GB",
    duration: "45:20",
    lastUpdated: "1 hour ago",
    sharedBy: "Sarah Chen",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Team+Alpha"
  },
  {
    id: 5,
    name: "Untitled(2).mp4",
    type: "video",
    size: "25MB",
    duration: "00:45",
    lastUpdated: "8 mins ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Untitled(2).mp4"
  },
  {
    id: 6,
    name: "01:58",
    type: "video",
    size: "140MB",
    duration: "01:58",
    lastUpdated: "8 mins ago",
    sharedBy: "Jadei Pacibe",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=01:58"
  },
  {
    id: 7,
    name: "Music Video - Indie Band",
    type: "video",
    size: "2.3GB",
    duration: "04:15",
    lastUpdated: "5 days ago",
    sharedBy: "Emma Watson",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Music+Video",
    progress: 45,
    contractAmount: "25,000"
  },
  {
    id: 8,
    name: "Documentary - Nature",
    type: "video",
    size: "4.5GB",
    duration: "45:00",
    lastUpdated: "1 week ago",
    sharedBy: "Marcus Thompson",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Nature+Doc",
    progress: 90,
    contractAmount: "50,000"
  },
  {
    id: 9,
    name: "Product Review Final",
    type: "video",
    size: "280MB",
    duration: "03:45",
    lastUpdated: "Yesterday",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Product+Review"
  },
  {
    id: 10,
    name: "Tutorial Part 1",
    type: "video",
    size: "620MB",
    duration: "12:18",
    lastUpdated: "2 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Tutorial+Part+1"
  },
  {
    id: 11,
    name: "Wedding Highlights",
    type: "video",
    size: "1.2GB",
    duration: "08:42",
    lastUpdated: "3 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Wedding+Highlights"
  },
  {
    id: 12,
    name: "Gaming Montage",
    type: "video",
    size: "890MB",
    duration: "15:30",
    lastUpdated: "5 days ago",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Gaming+Montage"
  },
];

// Team Projects - Folders
const teamProjects: TeamProject[] = [
  {
    id: 16,
    name: "Team Alpha - Commercial",
    sharedBy: "Sarah Chen",
    lastUpdated: "1 hour ago",
    size: "2.1GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Team+Alpha",
    videoCount: 12
  },
  {
    id: 17,
    name: "Documentary Project",
    sharedBy: "Marcus Thompson",
    lastUpdated: "3 hours ago",
    size: "4.5GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Documentary",
    videoCount: 8
  },
  {
    id: 18,
    name: "Music Video - Indie Band",
    sharedBy: "Emma Watson",
    lastUpdated: "Yesterday",
    size: "1.8GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Music+Video",
    videoCount: 5
  },
];

type TabType = "recent" | "personal" | "shared" | "contract" | "team";
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
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const [viewMode, setViewMode] = useState<ViewType>("grid");

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
    
    { id: "team" as TabType, label: "Team", icon: <Users className="h-4 w-4" /> },
  ];

  const getContent = () => {
    switch (activeTab) {
      case "recent": return recentProjects;
      case "personal": return personalProjects;
      case "shared": return sharedProjects;
      case "contract": return contractProjects;
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
      className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 hover:scale-[1.02] shadow-sm hover:shadow-md dark:shadow-none"
      onMouseEnter={() => setHoveredProject(project.id)}
      onMouseLeave={() => setHoveredProject(null)}
    >
      <div className="relative h-36 w-full overflow-hidden bg-gray-200 dark:bg-gradient-to-br dark:from-dark-surface dark:to-dark-surface">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 dark:from-dark-base via-transparent to-transparent" />

        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(project.type)}`}>
            {getTypeIcon(project.type)}
            <span className="capitalize">{project.type}</span>
          </span>
        </div>

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
              {project.sharedBy.split(" ")[0]}
            </span>
          </div>
        )}

        <button className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-white backdrop-blur-sm">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white truncate">
          {project.name}
        </h3>

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
          <div>{project.size}</div>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 dark:border-white/10 pt-3">
          <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
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
      className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-3 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-dark-surface/80 shadow-sm hover:shadow-md dark:shadow-none"
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
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          <div>{project.size}</div>
          {project.sharedBy && (
            <span className="text-gray-400 dark:text-zinc-400">by {project.sharedBy.split(" ")[0]}</span>
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
        <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button className="rounded-lg p-1.5 text-gray-500 dark:text-zinc-500 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white">
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
      onClick={() => navigate(`/projects/team/${project.id}`)}
    >
      <div className="relative h-36 w-full overflow-hidden bg-blue-50 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-purple-500/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <Folder className="h-20 w-20 text-blue-500/20 dark:text-blue-400/30" />
        </div>

        <div className="absolute bottom-2 right-2 flex -space-x-2">
          <div className="h-8 w-8 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center border border-gray-200 dark:border-none">
            <FileVideo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="h-8 w-8 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center border border-gray-200 dark:border-none">
            <FileVideo className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="h-8 w-8 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center border border-gray-200 dark:border-none">
            <span className="text-[10px] text-gray-700 dark:text-white">+{project.videoCount}</span>
          </div>
        </div>

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-none">
            <Users className="h-3 w-3" />
            Team Project
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
          <button className="flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 transition hover:bg-purple-100 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-none">
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
      onClick={() => navigate(`/projects/team/${project.id}`)}
    >
      <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-blue-50 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center border border-blue-100 dark:border-none">
        <Folder className="h-8 w-8 text-blue-500/50 dark:text-blue-400/50" />
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

      <button className="flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 transition hover:bg-purple-100 dark:hover:bg-purple-500/30 border border-purple-200 dark:border-none">
        <FolderKanban className="h-3 w-3" />
        Open
      </button>
    </div>
  );

  const renderContent = () => {
    const content = getContent();

    if (activeTab === "team") {
      if (viewMode === "compact") {
        return (
          <div className="space-y-3">
            {(teamProjects as TeamProject[]).map(renderCompactTeamFolderCard)}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(teamProjects as TeamProject[]).map(renderTeamFolderCard)}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
        <UserHeader pageTitle="Projects" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-10 w-40 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="flex gap-3">
              <div className="h-10 w-64 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-white/5" />
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
            ))}
          </div>
          <div className="flex justify-end mb-4">
            <div className="h-10 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
          </div>
          {viewMode === "compact" ? (
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <UserHeader pageTitle="Projects" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/projects/select")}
            className="group flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a Project</span>
          </button>

          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <button className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 transition hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-900 dark:hover:text-white">
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                activeTab === tab.id
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-500/5"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Toggle and Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{getTabTitle()}</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-500">{getTabDescription()}</p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md p-1.5 transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
              title="Grid View"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("compact")}
              className={`rounded-md p-1.5 transition-all duration-200 ${
                viewMode === "compact"
                  ? "bg-blue-500 text-white"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
              title="Compact View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content - Vertical Scrollable */}
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
          {renderContent()}
        </div>

        {/* Empty State */}
        {getContent().length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-12 text-center">
            <FolderKanban className="mb-3 h-12 w-12 text-gray-400 dark:text-zinc-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No projects found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {activeTab === "contract"
                ? "No active contracts yet. Start collaborating to create contracts."
                : "Create your first project to get started"}
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
};

export default Projects;