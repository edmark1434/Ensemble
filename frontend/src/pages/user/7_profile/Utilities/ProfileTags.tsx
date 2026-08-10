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

  const getSubscriptionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "premium":
        return "/icons/subscription/premium.png";
      case "business":
        return "/icons/subscription/studio.png";
      default:
        return "/icons/subscription/freemium.png";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
      {/* Verification Badge Icon */}
      <img 
        src={verificationLevel ? "/icons/verification/lvl2_verified.png" : "/icons/verification/lvl1_verified.png"} 
        alt={verificationLevel ? "Verified User" : "Unverified User"} 
        className="h-5 w-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
        title={verificationLevel ? "Verified" : "Unverified"}
      />

      {/* Subscription Badge Icon */}
      <img 
        src={getSubscriptionIcon(subscriptionType)} 
        alt={`${subscriptionType} Tier`} 
        className="h-5 w-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
        title={`${subscriptionType} Member`}
      />
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

    </div>
  );
};