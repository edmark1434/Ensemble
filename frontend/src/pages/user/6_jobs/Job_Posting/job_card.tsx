import React from "react";
import { Clock, Users, Star } from "lucide-react";

interface JobCardProps {
  job: any; // You can define a strict interface later
  onClick: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:border-blue-500/50 hover:bg-white/[0.07] cursor-pointer"
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Image/Thumbnail placeholder */}
        <div className="h-32 w-full md:w-48 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900">
           <img src={job.thumbnail} alt="" className="h-full w-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        </div>

        {/* Right Side: Quick Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${job.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {job.status}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{job.category}</span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                {job.title}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-yellow-500">{job.priceRange}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Estimated Budget</div>
            </div>
          </div>

          <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
            {job.description}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-zinc-300">{job.clientRating}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{job.applicantsCount} Applicants</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{job.timeline}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;