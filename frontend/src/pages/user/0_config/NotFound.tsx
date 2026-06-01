import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Frown } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080a12] relative overflow-hidden">

      {/* Animated Color Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl animate-float-pulse" />
        <div className="absolute top-1/3 right-10 w-80 h-80 rounded-full bg-yellow-500/10 blur-3xl animate-float-pulse-delayed" />
        <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl animate-float-pulse-slow" />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 rounded-full bg-pink-500/10 blur-3xl animate-float-pulse-more-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/8 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">

          {/* 404 Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-transparent p-12 backdrop-blur-sm transition-all duration-500 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10">

            {/* Animated Gradient Border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 opacity-40 animate-gradient-xy" />

            {/* Moving Light Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

            {/* Decorative Blurs */}
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl animate-float-pulse" />
            <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/20 blur-3xl animate-breathing" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl animate-float-pulse-delayed" />

            {/* 404 Number */}
            <div className="mb-6">
              <div className="relative inline-block">
                <span
                  className="text-8xl font-bold bg-gradient-to-r from-cyan-500 via-yellow-500 to-purple-500 bg-clip-text text-transparent md:text-9xl"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  404
                </span>
              </div>
            </div>

            {/* Sorry Face Icon */}
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-cyan-500/20 via-yellow-500/20 to-purple-500/20 p-6">
                <Frown className="h-20 w-20 text-yellow-400 animate-float" />
              </div>
            </div>

            {/* Title */}
            <h1
              className="mb-3 text-2xl font-bold text-white md:text-3xl"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Oops! Page Not Found
            </h1>

            {/* Message */}
            <p
              className="mb-8 text-sm text-zinc-400 md:text-base"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              We're sorry, but the page you were looking for doesn't exist.<br />
              It might have been moved, deleted, or you might have typed the wrong address.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => navigate(-1)}
                className="group flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                Go Back
              </button>

              <button
                onClick={() => navigate("/home")}
                className="group flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 active:bg-gradient-to-r active:from-cyan-500 active:via-yellow-500 active:to-purple-600 active:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <Home className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                Back to Home
              </button>
            </div>

            {/* Decorative Line */}
            <div className="mx-auto mt-8 h-px w-32 bg-gradient-to-r from-cyan-500 via-yellow-500 to-purple-500 animate-pulse-width" />

            {/* Decorative Dots */}
            <div className="mt-4 flex justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce-subtle" />
              <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60 animate-bounce-subtle-delayed" />
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce-subtle-more-delayed" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 4s ease-in-out infinite; }
        
        @keyframes float-pulse {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.15; }
          50% { transform: scale(1.15) translate(20px, -20px); opacity: 0.25; }
        }
        .animate-float-pulse { animation: float-pulse 6s ease-in-out infinite; }
        .animate-float-pulse-delayed { animation: float-pulse 7s ease-in-out infinite; }
        .animate-float-pulse-slow { animation: float-pulse 8s ease-in-out infinite; }
        .animate-float-pulse-more-delayed { animation: float-pulse 9s ease-in-out infinite; }
        
        @keyframes breathing {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.4; }
        }
        .animate-breathing { animation: breathing 3s ease-in-out infinite; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        
        @keyframes pulse-width {
          0%, 100% { width: 8rem; }
          50% { width: 12rem; }
        }
        .animate-pulse-width { animation: pulse-width 3s ease-in-out infinite; }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        .animate-bounce-subtle-delayed { animation: bounce-subtle 2s ease-in-out infinite 0.3s; }
        .animate-bounce-subtle-more-delayed { animation: bounce-subtle 2s ease-in-out infinite 0.6s; }
      `}</style>
    </div>
  );
};

export default NotFound;