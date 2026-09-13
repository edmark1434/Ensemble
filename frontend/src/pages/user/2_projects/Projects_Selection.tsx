import { useState } from "react";
import { ArrowLeft, Check, Monitor, Smartphone, Layout, ChevronRight, Square, Settings, Info } from "lucide-react";
import UserHeader from "@/components/nav/user_header";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios.ts";

interface FormatOption {
  id: string;
  title: string;
  subtitle: string;
  aspectRatio: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  borderColor: string;
  selectedBgColor: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

const formatOptions: FormatOption[] = [
  {
    id: "landscape",
    title: "Landscape",
    subtitle: "16:9",
    aspectRatio: "16:9",
    icon: <Monitor className="h-5 w-5" />,
    description: "Standard YouTube, TV, and cinematic format",
    color: "from-cyan-500/20 to-blue-500/100",
    borderColor: "border-cyan-500/50 dark:border-cyan-500/20",
    selectedBgColor: "bg-cyan-50 dark:bg-cyan-500/10",
    defaultWidth: 1920,
    defaultHeight: 1080
  },
  {
    id: "mobile",
    title: "Mobile",
    subtitle: "9:16",
    aspectRatio: "9:16",
    icon: <Smartphone className="h-5 w-5" />,
    description: "Perfect for TikTok, Instagram Reels, YouTube Shorts",
    color: "from-green-500/20 to-emerald-500/100",
    borderColor: "border-green-500/50 dark:border-green-500/20",
    selectedBgColor: "bg-green-50 dark:bg-green-500/10",
    defaultWidth: 1080,
    defaultHeight: 1920
  },
  {
    id: "feed",
    title: "Feed",
    subtitle: "4:5",
    aspectRatio: "4:5",
    icon: <Layout className="h-5 w-5" />,
    description: "Ideal for Instagram feed posts and Facebook",
    color: "from-pink-500/20 to-rose-500/100",
    borderColor: "border-pink-500/50 dark:border-pink-500/20",
    selectedBgColor: "bg-pink-50 dark:bg-pink-500/10",
    defaultWidth: 1080,
    defaultHeight: 1350
  },
  {
    id: "square",
    title: "Square",
    subtitle: "1:1",
    aspectRatio: "1:1",
    icon: <Square className="h-5 w-5" />,
    description: "Perfect for profile pictures and square format content",
    color: "from-orange-500/20 to-red-500/100",
    borderColor: "border-orange-500/50 dark:border-orange-500/20",
    selectedBgColor: "bg-orange-50 dark:bg-orange-500/10",
    defaultWidth: 1080,
    defaultHeight: 1080
  },
  {
    id: "custom",
    title: "Custom",
    subtitle: "Vanes",
    aspectRatio: "",
    icon: <Layout className="h-5 w-5" />,
    description: "Set your own aspect ratio and resolution",
    color: "from-purple-500/20 to-pink-500/100",
    borderColor: "border-purple-500/50 dark:border-purple-500/20",
    selectedBgColor: "bg-purple-50 dark:bg-purple-500/10",
    defaultWidth: 1920,
    defaultHeight: 1080
  }
];

// Calculate aspect ratio from width and height
const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;
  return `${ratioW}:${ratioH}`;
};

// Given a ratio like "16:9", returns dimensions with 1080 applied to the shorter side
const calculateDimensionsFromRatio = (aspectRatio: string): { width: number; height: number } => {
  const [wRatio, hRatio] = aspectRatio.split(":").map(Number);
  if (wRatio <= hRatio) {
    const width = 1080;
    const height = Math.round((1080 * hRatio) / wRatio);
    return { width, height };
  } else {
    const height = 1080;
    const width = Math.round((1080 * wRatio) / hRatio);
    return { width, height };
  }
};

const ProjectsSelection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [adjustedWidth, setAdjustedWidth] = useState<number>(1920);
  const [adjustedHeight, setAdjustedHeight] = useState<number>(1080);

  const handleSelect = (formatId: string) => {
    setSelectedFormat(formatId);
    const format = formatOptions.find(f => f.id === formatId);

    if (formatId === "custom") {
      const width = format?.defaultWidth ?? 1920;
      const height = format?.defaultHeight ?? 1080;
      setAdjustedWidth(width);
      setAdjustedHeight(height);
      setCustomWidth(width);
      setCustomHeight(height);
    } else if (format?.aspectRatio) {
      const { width, height } = calculateDimensionsFromRatio(format.aspectRatio);
      setAdjustedWidth(width);
      setAdjustedHeight(height);
    }
  };

  const handleWidthChange = (width: number) => {
    setAdjustedWidth(width);
    const selected = formatOptions.find(f => f.id === selectedFormat);
    if (selected && selected.aspectRatio && selected.aspectRatio !== "custom") {
      const [widthRatio, heightRatio] = selected.aspectRatio.split(":").map(Number);
      const newHeight = Math.round((width * heightRatio) / widthRatio);
      setAdjustedHeight(newHeight);
    }
  };

  const handleHeightChange = (height: number) => {
    setAdjustedHeight(height);
    const selected = formatOptions.find(f => f.id === selectedFormat);
    if (selected && selected.aspectRatio && selected.aspectRatio !== "custom") {
      const [widthRatio, heightRatio] = selected.aspectRatio.split(":").map(Number);
      const newWidth = Math.round((height * widthRatio) / heightRatio);
      setAdjustedWidth(newWidth);
    }
  };

  const EDITOR_URL = import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000';

  const handleContinue = async () => {
    if (!selectedFormat) return;

    try {
      const { data } = await api.get('/api/editor/handoff-token');
      const handoffToken = data.handoffToken;

      const params = new URLSearchParams({
        width: String(adjustedWidth),
        height: String(adjustedHeight),
        token: handoffToken,
      });

      window.location.href = `${EDITOR_URL}/editor/new?${params.toString()}`;
    } catch (err) {
      console.error('Failed to get editor handoff token:', err);
      // not logged in / session expired — bail or redirect to login
    }
  };

  const handleReturn = () => {
    navigate("/projects");
  };

  const selectedOption = formatOptions.find(opt => opt.id === selectedFormat);

  // Get aspect ratio display string
  const getAspectRatioDisplay = () => {
    if (selectedFormat === "custom") {
      return calculateAspectRatio(adjustedWidth, adjustedHeight);
    }
    return selectedOption?.aspectRatio || "";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base relative overflow-hidden">

      {/* Enhanced Color Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl animate-float-pulse" />
        <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-yellow-500/10 blur-3xl animate-float-pulse-delayed" />
        <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-float-pulse-slow" />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-pink-500/10 blur-3xl animate-float-pulse-more-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      {/* Top Header */}
      <UserHeader pageTitle="Projects / Select Format" credits={1250} />

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-4xl p-6 md:p-8">

        {/* Return Button - Top Left */}
        <button
          onClick={handleReturn}
          className="group mb-6 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm font-medium text-gray-500 dark:text-zinc-400 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Return to Projects
        </button>

        {/* Header Section */}
        <div className="mb-8 text-center animate-fade-up">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 dark:from-white to-gray-600 dark:to-white/70 bg-clip-text text-transparent" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Select Format
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Choose the aspect ratio for your project
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Format Options */}
          <div className="space-y-3">
            {formatOptions.map((option, index) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setIsHovered(option.id)}
                onMouseLeave={() => setIsHovered(null)}
                className={`group relative w-full text-left transition-all duration-300 ${
                  selectedFormat === option.id
                    ? "scale-[1.01]"
                    : "hover:scale-[1.005]"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${option.color} opacity-0 transition-opacity duration-300 blur-sm ${
                  isHovered === option.id ? "opacity-8" : ""
                } ${selectedFormat === option.id ? "opacity-12" : ""}`} />

                <div className={`relative flex items-center justify-between rounded-xl border p-3 transition-all duration-300 backdrop-blur-sm ${
                  selectedFormat === option.id
                    ? `${option.borderColor} ${option.selectedBgColor}`
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/15 hover:bg-gray-100 dark:hover:bg-white/10"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`relative rounded-lg p-2 transition-all duration-300 ${
                      selectedFormat === option.id
                        ? `bg-gradient-to-br ${option.color} text-gray-900 dark:text-white shadow-sm`
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 group-hover:bg-gray-200 dark:group-hover:bg-white/15 group-hover:text-gray-900 dark:group-hover:text-white"
                    }`}>
                      {option.icon}
                      {selectedFormat === option.id && (
                        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold transition-colors duration-300 ${
                          selectedFormat === option.id ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-zinc-300"
                        }`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {option.title}
                        </h3>
                        {selectedFormat === option.id && (
                          <div className="rounded-full bg-green-100 dark:bg-green-500/15 px-1.5 py-0.5">
                            <span className="text-[9px] font-medium text-green-700 dark:text-green-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Selected</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{option.subtitle}</p>
                    </div>
                  </div>

                  {selectedFormat === option.id ? (
                    <div className="rounded-full bg-green-500 p-1 shadow-sm shadow-green-500/15 animate-scale-in">
                      <Check className="h-3 w-3 text-gray-900 dark:text-white" />
                    </div>
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-gray-900 dark:group-hover:text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right Column - Resolution Settings */}
          <div className="animate-fade-up-delayed">
            {selectedFormat ? (
              <div className="sticky top-24 rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white dark:from-white/5 to-transparent p-5 backdrop-blur-sm">
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <Settings className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  Resolution Settings
                </h3>

                <div className="space-y-3">
                  {/* Selected Format Info */}
                  <div className="rounded-lg bg-white dark:bg-white/5 p-3">
                    <p className="text-xs text-gray-500 dark:text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Selected Format</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selectedOption?.title}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{selectedOption?.description}</p>
                  </div>

                  {/* Width & Height in one row */}
                  {selectedFormat === "custom" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setCustomWidth(value);
                            setAdjustedWidth(value);
                          }}
                          className="w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          placeholder="Width"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Height (px)
                        </label>
                        <input
                          type="number"
                          value={customHeight}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setCustomHeight(value);
                            setAdjustedHeight(value);
                          }}
                          className="w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          placeholder="Height"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={adjustedWidth}
                          onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          Height (px)
                          <span className="ml-1 text-[10px] text-gray-400 dark:text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>(auto)</span>
                        </label>
                        <input
                          type="number"
                          value={adjustedHeight}
                          onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Aspect Ratio Display */}
                  <div className="rounded-lg bg-white dark:bg-white/5 p-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Aspect Ratio</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {getAspectRatioDisplay() || "—"}
                    </p>
                  </div>

                  {/* Fixed Size Preview Box */}
                  <div className="mt-3 rounded-lg bg-white dark:bg-white/5 p-3">
                    <p className="mb-2 text-xs text-gray-500 dark:text-zinc-400" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Preview</p>
                    <div className="flex justify-center">
                      <div
                        className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/15 transition-all duration-300"
                        style={{
                          width: "200px",
                          height: "150px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <div
                          className="flex items-center justify-center transition-all duration-300"
                          style={{
                            width: `${Math.min(Math.max((adjustedWidth / adjustedHeight) * 100, 60), 180)}px`,
                            height: "100px",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            borderRadius: "8px",
                            border: "1px solid rgba(59, 130, 246, 0.2)"
                          }}
                        >
                          <span className="text-[10px] text-gray-500 dark:text-white/50 text-center px-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {adjustedWidth} x {adjustedHeight}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Placeholder when no format is selected
              <div className="sticky top-24 rounded-xl border border-dashed border-gray-300 dark:border-white/15 bg-gradient-to-br from-white dark:from-white/3 to-transparent p-8 backdrop-blur-sm text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="rounded-full bg-white dark:bg-white/5 p-4">
                    <Info className="h-8 w-8 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No Format Selected</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Click on any format from the left panel to see resolution settings and preview
                  </p>
                  <div className="mt-2 flex gap-2">
                    {formatOptions.slice(0, 3).map((opt) => (
                      <div key={opt.id} className="text-xs text-gray-400 dark:text-zinc-500 bg-white dark:bg-white/5 px-2 py-1 rounded-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {opt.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Continue Button - White with black text */}
        {selectedFormat && (
          <div className="mt-8 animate-slide-up">
            <button
              onClick={handleContinue}
              className="group relative w-full overflow-hidden rounded-xl bg-gray-900 dark:bg-white px-6 py-3 text-white dark:text-black transition-all duration-300 hover:scale-[1.01] hover:shadow-lg active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100/0 via-gray-200/50 to-gray-100/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative flex items-center justify-center gap-2">
                <span className="text-base font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Create Project ({adjustedWidth} x {adjustedHeight})
                </span>
              </div>
            </button>
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-zinc-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              You can change these settings later in project settings
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float-pulse {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.15) translate(20px, -20px);
            opacity: 0.25;
          }
        }
        
        @keyframes float-pulse-delayed {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.2) translate(-30px, 20px);
            opacity: 0.2;
          }
        }
        
        @keyframes float-pulse-slow {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.1) translate(10px, 30px);
            opacity: 0.25;
          }
        }
        
        @keyframes float-pulse-more-delayed {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.25) translate(-15px, -25px);
            opacity: 0.2;
          }
        }
        
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-up-delayed {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-float-pulse {
          animation: float-pulse 6s ease-in-out infinite;
        }
        
        .animate-float-pulse-delayed {
          animation: float-pulse-delayed 7s ease-in-out infinite;
        }
        
        .animate-float-pulse-slow {
          animation: float-pulse-slow 8s ease-in-out infinite;
        }
        
        .animate-float-pulse-more-delayed {
          animation: float-pulse-more-delayed 9s ease-in-out infinite;
        }
        
        .animate-fade-up {
          animation: fade-up 0.4s ease-out;
        }
        
        .animate-fade-up-delayed {
          animation: fade-up-delayed 0.4s ease-out 0.1s both;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProjectsSelection;