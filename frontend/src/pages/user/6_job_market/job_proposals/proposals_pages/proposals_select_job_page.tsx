import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, ChevronRight, Calendar, CircleDollarSign, Layers } from "lucide-react";
import { sampleJobs } from "../../job_datasets";
import type { ProposalsMainContext } from "../proposals_main";

export const ProposalsSelectJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery } = useOutletContext<ProposalsMainContext>();

  // Filter only the user's own active job posts
  const myJobPosts = sampleJobs.filter(
    (j) =>
      j.isOwnPost &&
      (j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5 text-left w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Select a Job Listing</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Choose one of your published job posts to view its incoming proposal submissions.
          </p>
        </div>
        <span className="text-xs font-semibold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
          {myJobPosts.length} Active Listings
        </span>
      </div>

      {myJobPosts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-12 text-center">
          <p className="text-sm text-zinc-400 font-medium">No job postings found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {myJobPosts.map((job) => (
            <motion.div
              key={job.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/jobs/proposals/incoming/${job.id}`)}
              className="group rounded-2xl border border-white/10 bg-[#0d0f1a]/80 overflow-hidden backdrop-blur-sm shadow-xl hover:border-blue-500/50 cursor-pointer transition flex flex-col justify-between"
            >
              {/* Thumbnail Image Header */}
              <div className="relative h-36 w-full bg-zinc-950 overflow-hidden border-b border-white/5">
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  className="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f1a] via-transparent to-transparent" />

                {/* ID & Status Floating Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-black/60 text-blue-400 border border-white/10 backdrop-blur-md">
                    ID: {job.id}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                    {job.status}
                  </span>
                </div>
              </div>

              {/* Job Info Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{job.category}</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{job.difficulty}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {job.title}
                  </h3>
                </div>

                {/* Financial & Applicants Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">Budget Pool</span>
                    <span className="font-extrabold text-yellow-500 flex items-center gap-1 text-xs mt-0.5">
                      <CircleDollarSign className="h-3.5 w-3.5" /> ₱{job.priceRange}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">Applicants</span>
                    <span className="font-bold text-white flex items-center gap-1 text-xs mt-0.5">
                      <ClipboardList className="h-3.5 w-3.5 text-blue-400" /> {job.applicantsCount} Proposals
                    </span>
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-blue-400">
                  <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                    <Calendar className="h-3 w-3 text-zinc-500" /> Posted {job.postedAt}
                  </span>
                  <span className="flex items-center gap-1 group-hover:underline">
                    View Applicants <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalsSelectJobPage;