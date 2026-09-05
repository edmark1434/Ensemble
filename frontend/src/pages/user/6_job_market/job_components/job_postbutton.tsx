import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";

interface JobPostButtonProps {
  className?: string;
}

const JobPostButton: React.FC<JobPostButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const isVerified = useGlobalState((state) => state.isVerified);
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  return (
    <button
      onClick={() => {
        if (isGuestMode) {
           navigate("/login");
        } else {
           continueIfAccountVerified(() => navigate("/jobs/create"), false, "Account Verification is required to access Job Creation. Please verify your identity to proceed.");
        }
      }}
      
      className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition bg-blue-500 hover:bg-blue-600 hover:scale-105 ${className}`}
    >
      <Plus className="h-4 w-4" />
      <span>Post a Job</span>
    </button>
  );
};

export default JobPostButton;