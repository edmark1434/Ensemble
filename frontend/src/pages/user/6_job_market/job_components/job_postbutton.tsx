import React, { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

interface JobPostButtonProps {
  className?: string;
}

const JobPostButton: React.FC<JobPostButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const handleClick = async () => {
    if (isCheckingAccess) return;
    if (isGuestMode) {
      navigate("/login");
    } else {
      setIsCheckingAccess(true);
      try {
        await continueIfAccountVerified(
          () => navigate("/jobs/create"),
          false,
          "Account Verification is required to access Job Creation. Please verify your identity to proceed."
        );
      } finally {
        setIsCheckingAccess(false);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isCheckingAccess}
      className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition bg-blue-500 hover:bg-blue-600 ${
        isCheckingAccess ? "opacity-80 cursor-wait" : "hover:scale-105 cursor-pointer"
      } ${className}`}
    >
      {isCheckingAccess ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Opening...</span>
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          <span>Post a Job</span>
        </>
      )}
    </button>
  );
};

export default JobPostButton;