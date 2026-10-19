import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Home,
  ArrowLeft,
  Compass,
  Briefcase,
  Sparkles,
  MessageSquare,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import useGlobalState from "@/lib/global_state";

interface NotFoundProps {
  title?: string;
  message?: string;
  showNavigation?: boolean;
}

const NotFound: React.FC<NotFoundProps> = ({
  title = "Lost in the digital workspace?",
  message = "The page you're looking for doesn't exist, has been removed, or the link may have a typo.",
  showNavigation = true,
}) => {
  const navigate = useNavigate();
  const isAuthenticated = useGlobalState((state) => state.isAuthenticated);
  const user = useGlobalState((state) => state.user);
  const homeRoute = isAuthenticated || user ? "/home" : "/";

  const popularDestinations = [
    {
      title: "Job Postings",
      description: "Find client projects & team openings",
      to: "/jobs/postings",
      icon: Briefcase,
    },
    {
      title: "Services & Gigs",
      description: "Explore packaged freelance services",
      to: "/gigs",
      icon: Sparkles,
    },
    {
      title: "Community Forums",
      description: "Join discussions and collaborate",
      to: "/forums",
      icon: MessageSquare,
    },
    {
      title: "Help & Support",
      description: "Submit a ticket or read FAQs",
      to: "/support/ticket",
      icon: HelpCircle,
    },
  ];

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homeRoute);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#080a12] dark:text-white transition-colors duration-200 select-none">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Top Brand Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          to={homeRoute}
          className="inline-flex items-center gap-2.5 text-gray-900 dark:text-white hover:opacity-85 transition group"
        >
          <img
            src="/ensemble_lg.svg"
            alt="Ensemble Logo"
            className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-base font-bold tracking-tight font-sans">
            Ensemble
          </span>
        </Link>

        <Link
          to="/support/ticket"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Need assistance?</span>
          <span>Help Center</span>
        </Link>
      </header>

      {/* Main 404 Hero Content */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-5 py-8 md:py-12 flex flex-col items-center text-center">
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 mb-6 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Error 404 · Page Not Found
        </div>

        {/* 404 Big Numeric Display */}
        <div className="relative mb-4 flex items-center justify-center">
          <span
            className="text-8xl sm:text-9xl font-black tracking-tight select-none bg-gradient-to-b from-gray-900 via-gray-700 to-gray-400 dark:from-white dark:via-zinc-200 dark:to-zinc-600 bg-clip-text text-transparent drop-shadow-sm dark:drop-shadow-[0_0_40px_rgba(59,130,246,0.18)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            404
          </span>
          <div className="absolute -bottom-2 -right-3 sm:-bottom-1 sm:-right-4 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 shadow-lg text-blue-500 dark:text-blue-400 backdrop-blur-md">
            <Compass className="h-5 w-5 sm:h-6 sm:w-6 animate-[spin_12s_linear_infinite]" />
          </div>
        </div>

        {/* Heading & Explanatory Text */}
        <h1
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {title}
        </h1>
        <p
          className="text-sm sm:text-base text-gray-600 dark:text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {message}
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-10">
          <button
            onClick={handleGoBack}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => navigate(homeRoute)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition active:scale-[0.98] cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>{isAuthenticated || user ? "Back to Dashboard" : "Back to Home"}</span>
          </button>
        </div>

        {/* Popular Destinations Quick Links */}
        {showNavigation && (
          <div className="w-full max-w-xl mx-auto pt-7 border-t border-gray-200 dark:border-white/10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-3.5 text-center">
              Popular destinations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              {popularDestinations.map((dest) => {
                const IconComponent = dest.icon;
                return (
                  <Link
                    key={dest.to}
                    to={dest.to}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.06] hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all hover:-translate-y-0.5 group shadow-sm"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                        {dest.title}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                        {dest.description}
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-[11px] text-gray-600 dark:text-zinc-400">
        <p>© {new Date().getFullYear()} Ensemble · All rights reserved.</p>
      </footer>
    </div>
  );
};

export default NotFound;