import React from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { continueIfAccountVerified } from "@/lib/accountVerification";

interface JobPostButtonProps {
  className?: string;
}

const JobPostButton: React.FC<JobPostButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => continueIfAccountVerified(() => navigate("/jobs/create"))}
      className={`flex items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600 hover:scale-105 ${className}`}
    >
      <Plus className="h-4 w-4" />
      <span>Post a Job</span>
    </button>
  );
};

export default JobPostButton;