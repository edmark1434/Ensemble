import React from "react";
import { Edit2, Laptop, Briefcase, User } from "lucide-react";

interface ProfileTagsProps {
  role?: {
    role_id: number;
    role_name: string;
  }[];
  verificationLevel?: boolean;
  subscriptionType?: "Free" | "Premium" | "Business";
  onEditRole?: () => void;
}

export const ProfileTags: React.FC<ProfileTagsProps> = ({
  role,
  verificationLevel = false,
  subscriptionType = "Free",
  onEditRole,
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
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20"
          >
            {roleItem.role_name === "Freelancer" && <Laptop className="w-2.5 h-2.5" />}
            {roleItem.role_name === "Client" && <Briefcase className="w-2.5 h-2.5" />}
            {roleItem.role_name === "Casual" && <User className="w-2.5 h-2.5" />}
            {roleItem.role_name}
          </span>
        ))
      ) : (
        <span className="text-zinc-500 text-xs">No roles assigned</span>
      )}

      {onEditRole && (
        <button
          onClick={onEditRole}
          className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-blue-500 transition-colors"
          title="Edit Account Tags"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};