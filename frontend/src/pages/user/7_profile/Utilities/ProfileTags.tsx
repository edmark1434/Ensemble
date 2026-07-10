import React from "react";

interface ProfileTagsProps {
  role?: "Freelancer" | "Client" | "Freelancer & Client" | "Casual";
  verificationLevel?: 1 | 2;
  subscriptionType?: "Freemium" | "Premium" | "Studio";
}

export const ProfileTags: React.FC<ProfileTagsProps> = ({
  role,
  verificationLevel = 1,
  subscriptionType = "Freemium",
}) => {
  const getVerificationIcon = (level: number) => {
    return level === 2 ? "/icons/verification/lvl2_verified.png" : "/icons/verification/lvl1_verified.png";
  };

  const getSubscriptionStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case "premium":
        return "bg-yellow-500/10 border-amber-500/30 text-amber-400 animate-none";
      case "studio":
        return "bg-gradient-to-r from-purple-600 via-yellow-400 via-cyan-400 to-purple-600 bg-[length:200%_auto] animate-cyber-spectrum text-white font-black border-transparent shadow-[0_0_12px_rgba(147,51,234,0.2)]";
      default:
        return "bg-zinc-500/10 border-zinc-500/30 text-zinc-400 animate-none";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
      {/* Verification Badge */}
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded px-2 py-0.5" title={`Verification Level ${verificationLevel}`}>
        <img src={getVerificationIcon(verificationLevel)} alt="Verification Icon" className="h-4 w-4 object-contain" />
        <span className="text-[9px] font-bold text-zinc-300 tracking-wider uppercase">LVL {verificationLevel}</span>
      </div>

      {/* Subscription Badge (Text Tag Only - Inner Icon Removed) */}
      <div className={`flex items-center rounded px-2 py-0.5 text-[9px] select-none border transition-all duration-300 ${getSubscriptionStyles(subscriptionType)}`} title={`${subscriptionType} Tier`}>
        <span className="font-black tracking-wider uppercase">{subscriptionType}</span>
      </div>

      {/* Role Tag Matrix */}
      {role && (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
          role === "Freelancer" 
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
            : role === "Client" 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
            : role === "Casual"
            ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
            : "bg-blue-500/10 text-blue-400 border-blue-500/20" 
        }`}>
          {role}
        </span>
      )}

      <style>{`
        @keyframes cyber-spectrum {
          0% { bg-position: 0% center; }
          50% { bg-position: 100% center; }
          100% { bg-position: 0% center; }
        }
        .animate-cyber-spectrum {
          animation: cyber-spectrum 4.5s ease infinite;
        }
      `}</style>
    </div>
  );
};