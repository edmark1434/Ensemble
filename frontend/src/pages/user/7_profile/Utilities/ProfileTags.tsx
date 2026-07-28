import React from "react";

interface ProfileTagsProps {
  role?: {
    role_id: number;
    role_name: string;
  }[];
  verificationLevel?: boolean;
  subscriptionType?: "Free" | "Premium" | "Business";
}

export const ProfileTags: React.FC<ProfileTagsProps> = ({
  role,
  verificationLevel = false,
  subscriptionType = "Free",
}) => {

  const getSubscriptionStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case "premium":
        return "bg-yellow-500/10 border-amber-500/30 text-amber-400 animate-none";
      case "business":
        return "bg-gradient-to-r from-purple-600 via-yellow-400 via-cyan-400 to-purple-600 bg-[length:200%_auto] animate-cyber-spectrum text-white font-black border-transparent shadow-[0_0_12px_rgba(147,51,234,0.2)]";
      default:
        return "bg-zinc-500/10 border-zinc-500/30 text-zinc-400 animate-none";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
      {/* Verification Badge */}
      <div
        className={`flex items-center gap-1.5 rounded px-2 py-0.5 border ${
          verificationLevel
            ? "bg-green-500/10 border-green-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}
        title={verificationLevel ? "Verified" : "Unverified"}
      >
        <span
          className={`text-[9px] font-bold tracking-wider uppercase ${
            verificationLevel ? "text-green-400" : "text-red-400"
          }`}
        >
          {verificationLevel ? "Verified" : "Unverified"}
        </span>
      </div>

      {/* Subscription Badge (Text Tag Only - Inner Icon Removed) */}
      <div className={`flex items-center rounded px-2 py-0.5 text-[9px] select-none border transition-all duration-300 ${getSubscriptionStyles(subscriptionType)}`} title={`${subscriptionType} Tier`}>
        <span className="font-black tracking-wider uppercase">{subscriptionType}</span>
      </div>
      {/* Role Tag Matrix */}
{role && Array.isArray(role) && role.length > 0 ? (
  role.map((roleItem, index) => (
    <span 
      key={index} 
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
        roleItem.role_name === "Freelancer"
          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
          : roleItem.role_name === "Client"
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : roleItem.role_name === "Casual"
          ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
      }`}
    >
      {roleItem.role_name}
    </span>
  ))
) : (
  <span className="text-zinc-500 text-xs">No roles assigned</span>
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