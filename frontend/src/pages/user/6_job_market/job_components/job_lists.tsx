import React from "react";
import { Star, Clock, Bookmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Job {
  id: string;
  title: string;
  description: string;
  status: "Open" | "Closed";
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  priceRange: string;
  minBudget: number;
  postedBy: string;
  postedAt: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  positionsNeeded: number;
  applicantsCount: number;
  timeline: string;
  thumbnail: string;
  isSaved?: boolean;
  isOwnPost?: boolean;
}

interface JobListProps {
  jobs: Job[];
  activeJobId?: string;
  onToggleSave: (e: React.MouseEvent, jobId: string) => void;
  baseRoute: string; // e.g. "/jobs/postings" or "/jobs/saved-posts"
}

const JobList: React.FC<JobListProps> = ({ jobs, activeJobId, onToggleSave, baseRoute }) => {
  const navigate = useNavigate();

  if (jobs.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-white/10 bg-[#0d0f1a]/40 text-zinc-500">
        No job postings found matching your parameters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => navigate(`${baseRoute}/${job.id}`)}
          className={`group flex flex-col md:flex-row gap-6 rounded-2xl border p-5 transition-all cursor-pointer ${
            activeJobId === job.id 
              ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]" 
              : "border-white/10 bg-[#0d0f1a]/40 hover:border-white/20"
          }`}
        >
          {/* Thumbnail */}
          <div className="h-40 w-full md:w-64 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/5 relative">
            <img src={job.thumbnail} alt="" className="h-full w-full object-cover opacity-80 transition-transform group-hover:scale-105 duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-wrap gap-2">
                  <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-500/20">{job.status}</span>
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-500/20">{job.difficulty}</span>
                  <span className="bg-white/5 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{job.category}</span>
                </div>
                <button onClick={(e) => onToggleSave(e, job.id)} className={`transition-colors ${job.isSaved ? "text-yellow-500" : "text-zinc-600 hover:text-white"}`}>
                  <Bookmark className={`h-5 w-5 ${job.isSaved ? "fill-current" : ""}`} />
                </button>
              </div>

              <div className="text-yellow-500 text-lg font-black mb-1">{job.priceRange}</div>
              <h3 className="text-white text-xl font-bold mb-1.5 group-hover:text-blue-400 transition-colors">{job.title}</h3>
              <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-3">{job.description}</p>
              <p className="text-[11px] text-zinc-500 font-medium mb-1">{job.timeAgo}</p>
            </div>

            {/* Footer Metadata */}
            <div className="mt-2 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-widest gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-white font-bold border border-white/10 overflow-hidden">
                  {job.postedBy.charAt(0)}
                </div>
                <div className="text-left leading-tight">
                  <p className="text-xs font-bold text-zinc-300 normal-case">{job.postedBy}</p>
                  <div className="flex items-center gap-1 text-[10px] text-yellow-500">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    <span>{job.clientRating} ({job.ratingCount} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 tracking-wider">
                <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{job.positionsNeeded} Positions Needed</span>
                <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{job.applicantsCount} Applicants</span>
                <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-zinc-500" /> {job.timeline}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobList;