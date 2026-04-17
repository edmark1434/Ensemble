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
    ChevronLeft,
    ChevronRight,
    Folder,
    FileVideo, User,
} from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useState, useRef, useEffect } from "react";

interface Project {
  id: number;
  name: string;
  type: "video" | "audio" | "image";
  size: string;
  duration?: string;
  lastUpdated: string;
  sharedBy?: string;
  thumbnail: string;
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

// Recent Projects (mix of personal and shared)
const recentProjects: Project[] = [
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
];

// Team Projects - Folders
const teamProjects: TeamProject[] = [
  {
    id: 11,
    name: "Team Alpha - Commercial",
    sharedBy: "Sarah Chen",
    lastUpdated: "1 hour ago",
    size: "2.1GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Team+Alpha",
    videoCount: 12
  },
  {
    id: 12,
    name: "Documentary Project",
    sharedBy: "Marcus Thompson",
    lastUpdated: "3 hours ago",
    size: "4.5GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Documentary",
    videoCount: 8
  },
  {
    id: 13,
    name: "Music Video - Indie Band",
    sharedBy: "Emma Watson",
    lastUpdated: "Yesterday",
    size: "1.8GB",
    thumbnail: "https://placehold.co/400x225/1e2130/4a6fa5?text=Music+Video",
    videoCount: 5
  },
];

type TabType = "recent" | "personal" | "team";

// Skeleton Components
const ProjectCardSkeleton = () => (
  <div className="w-[280px] flex-shrink-0 rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="mb-3 h-36 w-full animate-pulse rounded-lg bg-white/10" />
    <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/10" />
    <div className="mt-2 flex gap-3">
      <div className="h-4 w-16 animate-pulse rounded-lg bg-white/5" />
      <div className="h-4 w-12 animate-pulse rounded-lg bg-white/5" />
    </div>
    <div className="mt-3 flex gap-2">
      <div className="h-8 w-8 animate-pulse rounded-lg bg-white/5" />
      <div className="h-8 w-8 animate-pulse rounded-lg bg-white/5" />
    </div>
  </div>
);

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("recent");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

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

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [activeTab]);

  const tabs = [
    { id: "recent" as TabType, label: "Recent", icon: <Clock className="h-4 w-4" /> },
    { id: "personal" as TabType, label: "Personal", icon: <User className="h-4 w-4" /> },
    { id: "team" as TabType, label: "Team", icon: <Users className="h-4 w-4" /> },
  ];

  const renderProjectCard = (project: Project) => (
    <div
      key={project.id}
      className="group relative w-[280px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]"
      onMouseEnter={() => setHoveredProject(project.id)}
      onMouseLeave={() => setHoveredProject(null)}
    >
      {/* Thumbnail */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0d0f1a]">
        <img
          src={project.thumbnail}
          alt={project.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080a12] via-transparent to-transparent" />

        {/* Type Badge */}
        <div className="absolute left-3 top-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(project.type)}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {getTypeIcon(project.type)}
            <span className="capitalize">{project.type}</span>
          </span>
        </div>

        {/* Duration Badge */}
        {project.duration && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Clock className="h-2.5 w-2.5" />
              {project.duration}
            </span>
          </div>
        )}

        {/* Shared By Badge */}
        {project.sharedBy && (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Users className="h-3 w-3" />
              {project.sharedBy.split(" ")[0]}
            </span>
          </div>
        )}

        {/* More Options Button */}
        <button className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-white backdrop-blur-sm">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-2 text-sm font-semibold text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {project.name}
        </h3>

        <div className="flex items-center justify-between text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
          <div>{project.size}</div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <button className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white">
            <Edit className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      {hoveredProject === project.id && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
    </div>
  );

  const renderTeamFolderCard = (project: TeamProject) => (
    <div
      key={project.id}
      className="group relative w-[280px] flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:scale-[1.02] cursor-pointer"
      onMouseEnter={() => setHoveredProject(project.id + 200)}
      onMouseLeave={() => setHoveredProject(null)}
      onClick={() => navigate(`/projects/team/${project.id}`)}
    >
      {/* Folder Thumbnail */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <Folder className="h-20 w-20 text-blue-400/30" />
        </div>

        {/* Video Previews */}
        <div className="absolute bottom-2 right-2 flex -space-x-2">
          <div className="h-8 w-8 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <FileVideo className="h-4 w-4 text-blue-400" />
          </div>
          <div className="h-8 w-8 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <FileVideo className="h-4 w-4 text-blue-400" />
          </div>
          <div className="h-8 w-8 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[10px] text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>+{project.videoCount}</span>
          </div>
        </div>

        {/* Team Badge */}
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Users className="h-3 w-3" />
            Team Project
          </span>
        </div>

        {/* More Options Button */}
        <button
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-zinc-400 transition hover:text-white backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="mb-1 text-sm font-semibold text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {project.name}
        </h3>

        <p className="text-xs text-zinc-500 mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Shared by {project.sharedBy.split(" ")[0]}
        </p>

        <div className="flex items-center justify-between text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <button
            className="flex items-center gap-1 rounded-lg bg-purple-500/20 px-2.5 py-1 text-xs font-medium text-purple-400 transition hover:bg-purple-500/30"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/projects/team/${project.id}`);
            }}
          >
            <FolderKanban className="h-3 w-3" />
            Open Folder
          </button>
          <button
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <Users className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hover Glow Effect */}
      {hoveredProject === project.id + 200 && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "recent":
        return recentProjects.map(renderProjectCard);
      case "personal":
        return personalProjects.map(renderProjectCard);
      case "team":
        return teamProjects.map(renderTeamFolderCard);
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "recent":
        return "Recent Projects";
      case "personal":
        return "Personal Projects";
      case "team":
        return "Team Projects";
      default:
        return "Projects";
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case "recent":
        return "Recently accessed projects";
      case "personal":
        return "Your private workspace";
      case "team":
        return "Collaborative workspace folders";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080a12]">
        <UserHeader pageTitle="Projects" credits={1250} />
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-10 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="flex gap-3">
              <div className="h-10 w-64 animate-pulse rounded-full bg-white/5" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
          <div className="mb-6 flex gap-2 border-b border-white/10 pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-24 animate-pulse rounded-lg bg-white/10" />
            ))}
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle="Projects" credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">

        {/* Action Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Create Project Button */}
          <button
            onClick={() => navigate("/projects/select")}
            className="group flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a Project</span>
          </button>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-white/15 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              />
            </div>
            <button className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition hover:border-white/30 hover:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg ${
                activeTab === tab.id
                  ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{getTabTitle()}</h2>
            <p className="text-xs text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{getTabDescription()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!showLeftArrow}
              className={`rounded-full border border-white/15 bg-black/50 p-1.5 backdrop-blur-sm transition-all duration-300 ${
                showLeftArrow 
                  ? "hover:bg-white/20 text-white cursor-pointer" 
                  : "opacity-30 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!showRightArrow}
              className={`rounded-full border border-white/15 bg-black/50 p-1.5 backdrop-blur-sm transition-all duration-300 ${
                showRightArrow 
                  ? "hover:bg-white/20 text-white cursor-pointer" 
                  : "opacity-30 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {renderContent()}
        </div>
      </div>

      <style>{`
        /* Hide scrollbar completely */
        div[ref] {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        div[ref]::-webkit-scrollbar {
          display: none;
        }
        
        /* Smooth scrolling */
        div[ref] {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default Projects;