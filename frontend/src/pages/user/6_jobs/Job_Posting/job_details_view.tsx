import React from "react";
import { X, User, Calendar, Users, Clock, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JobDetailsViewProps {
  job: any;
  onClose: () => void;
}

const JobDetailsView: React.FC<JobDetailsViewProps> = ({ job, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z- flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0f1a] shadow-2xl custom-scrollbar animate-scale-up">

        {/* Header Image */}
        <div className="relative h-48 w-full">
          <img src={job.thumbnail} className="h-full w-full object-cover opacity-40" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-white/10 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase">{job.category}</span>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold uppercase">{job.difficulty}</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center min-w-[140px]">
              <div className="text-xl font-bold text-yellow-500">{job.priceRange}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Fixed Price</div>
            </div>
          </div>

          {/* Detailed Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex flex-col items-center text-center">
              <User className="h-5 w-5 text-zinc-500 mb-1" />
              <span className="text-[10px] uppercase text-zinc-500">Posted By</span>
              <span className="text-sm font-medium text-white">{job.postedBy}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Calendar className="h-5 w-5 text-zinc-500 mb-1" />
              <span className="text-[10px] uppercase text-zinc-500">Posted On</span>
              <span className="text-sm font-medium text-white">{job.postedAt}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Users className="h-5 w-5 text-zinc-500 mb-1" />
              <span className="text-[10px] uppercase text-zinc-500">Positions</span>
              <span className="text-sm font-medium text-white">{job.positionsNeeded} Needed</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <Clock className="h-5 w-5 text-zinc-500 mb-1" />
              <span className="text-[10px] uppercase text-zinc-500">Timeline</span>
              <span className="text-sm font-medium text-white">{job.timeline}</span>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-3">Job Description</h3>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Action Footer */}
          <div className="sticky bottom-0 pt-4 bg-[#0d0f1a] border-t border-white/10 flex gap-4">
            <button
              onClick={() => navigate(`/jobs/${job.id}/make-proposal`)}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-sm font-bold text-white hover:bg-blue-600 transition-all active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              Send Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsView;