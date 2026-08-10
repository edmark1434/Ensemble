import { Construction } from "lucide-react";
import UserHeader from "@/components/nav/user_header.tsx";

type SectionPlaceholderProps = {
  title: string;
  subtitle?: string;
};

const SectionPlaceholder = ({ 
  title, 
  subtitle = "This section is currently under construction." 
}: SectionPlaceholderProps) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
      {/* Top Header */}
      <UserHeader pageTitle={title} credits={1250} />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        
        {/* Placeholder Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-white/5 via-white/5 to-transparent p-12 backdrop-blur-sm transition-all duration-500 hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10">
          
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/30 via-yellow-500/30 to-purple-500/30 opacity-40 animate-gradient-xy" />
          
          {/* Moving Light Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          {/* Decorative Blurs */}
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/30 blur-3xl animate-float-pulse" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-500/20 blur-3xl animate-breathing" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl animate-float-pulse-delayed" />

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-gradient-to-br from-cyan-500/20 via-yellow-500/20 to-purple-500/20 p-4">
              <Construction className="h-12 w-12 text-yellow-400" />
            </div>
          </div>

          {/* Title */}
          <h1 
            className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-white md:text-4xl animate-slide-right-subtle"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-center text-sm text-gray-500 dark:text-zinc-400 md:text-base animate-slide-right-subtle-delayed"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {subtitle}
          </p>

          {/* Decorative Line */}
          <div className="mx-auto mt-6 h-px w-32 bg-gradient-to-r from-cyan-500 via-yellow-500 to-purple-500 animate-pulse-width" />
          
          {/* Decorative Dots */}
          <div className="mt-4 flex justify-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce-subtle" />
            <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60 animate-bounce-subtle-delayed" />
            <div className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce-subtle-more-delayed" />
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
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.3; }
          50% { transform: scale(1.3) translate(-10px, -10px); opacity: 0.5; }
        }
        .animate-float-pulse { animation: float-pulse 4s ease-in-out infinite; }
        .animate-float-pulse-delayed { animation: float-pulse 4s ease-in-out infinite 2s; }
        
        @keyframes breathing {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.4; }
        }
        .animate-breathing { animation: breathing 3s ease-in-out infinite; }
        
        @keyframes slide-right-subtle {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .animate-slide-right-subtle { animation: slide-right-subtle 4s ease-in-out infinite; }
        .animate-slide-right-subtle-delayed { animation: slide-right-subtle 4s ease-in-out infinite 0.5s; }
        
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

export default SectionPlaceholder;