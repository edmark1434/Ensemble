import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import { X, Calendar, Clock, Briefcase, Users, Star, Send } from "lucide-react";
import UserHeader from "@/components/nav/user_header";

// Modular Component Imports
import JobSearchbar from "./job_components/job_searchbar";
import JobTabs from "./job_components/job_tabs";
import JobCategories from "./job_components/job_categories";
import JobFilters from "./job_components/job_filters";
import JobListViewType from "./job_components/job_list_viewtype";
import type { ViewType } from "./job_components/job_list_viewtype";

// Datasets & Types
import { sampleJobs, sampleCategories } from "./job_datasets";
import type { Job } from "./job_components/job_lists";

export interface JobMainContext {
  jobsList: Job[];
  filteredJobs: Job[];
  loading: boolean;
  viewType: ViewType;
  toggleSaveJob: (e: React.MouseEvent, jobId: string) => void;
}

const SidebarSkeleton = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm">
      <div className="mb-4 h-3 w-20 animate-pulse rounded bg-white/10" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white/5" />
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0d0f1a]/60 p-5 backdrop-blur-sm space-y-4">
      <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/5" />
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
    </div>
  </div>
);

const JobMain: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [jobsList, setJobsList] = useState<Job[]>(sampleJobs);

  // Filter States
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);
  const [selectedDiffs, setSelectedDifficulty] = useState<string[]>([]);
  const [posValue, setPosValue] = useState<string>("");
  const [posSort, setPosSort] = useState<"inc" | "dec" | null>(null);
  const [ratingSort, setRatingSort] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (id) {
      const found = jobsList.find((j) => j.id === id);
      if (found) setSelectedJob(found);
    } else {
      setSelectedJob(null);
    }
  }, [id, jobsList]);

  const toggleSaveJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setJobsList((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, isSaved: !job.isSaved } : job))
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategoryFilter("All");
    setMinPrice("");
    setMaxPrice("");
    setPriceSort(null);
    setSelectedDifficulty([]);
    setPosValue("");
    setPosSort(null);
    setRatingSort(false);
  };

  const filteredJobs = useMemo(() => {
    const result = jobsList.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategoryFilter === "All" || job.category === activeCategoryFilter;
      const matchesMinPrice = minPrice === "" || job.minBudget >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || job.minBudget <= parseInt(maxPrice);
      const matchesDiff = selectedDiffs.length === 0 || selectedDiffs.includes(job.difficulty);
      const matchesPos = posValue === "" || job.positionsNeeded === parseInt(posValue);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesDiff &&
        matchesPos
      );
    });

    // Flexible multi-attribute sorting comparator
    result.sort((a, b) => {
      // 1. Price Sorting Priority
      if (priceSort === "inc") return a.minBudget - b.minBudget;
      if (priceSort === "dec") return b.minBudget - a.minBudget;

      // 2. Positions Needed Sorting
      if (posSort === "inc") return a.positionsNeeded - b.positionsNeeded;
      if (posSort === "dec") return b.positionsNeeded - a.positionsNeeded;

      // 3. Client Rating Sorting
      if (ratingSort) return b.clientRating - a.clientRating;

      return 0;
    });

    return result;
  }, [
    jobsList,
    searchQuery,
    activeCategoryFilter,
    minPrice,
    maxPrice,
    priceSort,
    selectedDiffs,
    posValue,
    posSort,
    ratingSort,
  ]);

  const getParentRoute = () => {
    if (location.pathname.includes("/saved-posts")) return "/jobs/saved-posts";
    if (location.pathname.includes("/my-job-post")) return "/jobs/my-job-post";
    return "/jobs/postings";
  };

  return (
    <div className="w-full min-h-screen bg-[#080a12] overflow-x-hidden relative">
      <UserHeader pageTitle="Job Market" credits={1250} />

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        <JobSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-white/10 gap-4">
          <JobTabs />
          <div className="py-2">
            <JobListViewType viewType={viewType} onViewTypeChange={setViewType} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          <div className="space-y-6 sticky top-24">
            {loading ? (
              <SidebarSkeleton />
            ) : (
              <>
                <JobCategories
                  categories={sampleCategories}
                  activeCategory={activeCategoryFilter}
                  onCategoryChange={setActiveCategoryFilter}
                />
                <JobFilters
                  filters={{
                    minPrice,
                    maxPrice,
                    priceSort,
                    selectedDiffs,
                    posValue,
                    posSort,
                    ratingSort,
                  }}
                  setters={{
                    setMinPrice,
                    setMaxPrice,
                    setPriceSort,
                    setSelectedDifficulty,
                    setPosValue,
                    setPosSort,
                    setRatingSort,
                  }}
                  onClear={handleClearFilters}
                />
              </>
            )}
          </div>

          <div className="lg:col-span-3">
            <Outlet
              context={
                {
                  jobsList,
                  filteredJobs,
                  loading,
                  viewType,
                  toggleSaveJob,
                } satisfies JobMainContext
              }
            />
          </div>
        </div>
      </div>

      {/* --- RIGHT SLIDE-OUT PANEL DRAWER --- */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity ${
          selectedJob ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => navigate(getParentRoute())}
      />
      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-1/2 bg-[#0d0f1a] border-l border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${
          selectedJob ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedJob && (
          <>
            <div className="relative h-64 shrink-0 bg-zinc-950 border-b border-white/5">
              <img src={selectedJob.thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
              <button
                onClick={() => navigate(getParentRoute())}
                className="absolute top-5 left-5 h-10 w-10 flex items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f1a] to-transparent" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-green-500/15 border border-green-500/20 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase text-green-400">{selectedJob.status}</span>
                  <span className="bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase text-blue-400">{selectedJob.difficulty}</span>
                  <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md text-[10px] font-medium text-zinc-300">{selectedJob.category}</span>
                </div>

                <h2 className="text-2xl font-bold text-white leading-tight mb-1">{selectedJob.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{selectedJob.postedAt} • {selectedJob.timeAgo}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Budget Range</p>
                <p className="text-xl font-extrabold text-yellow-500">{selectedJob.priceRange}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center text-xs">
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Timeline</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.timeline}</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Briefcase className="h-3 w-3" /> Positions</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.positionsNeeded} Slot(s)</p>
                </div>
                <div>
                  <p className="text-zinc-500 uppercase text-[9px] font-bold tracking-wider mb-1 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Applicants</p>
                  <p className="text-zinc-200 font-semibold">{selectedJob.applicantsCount} Bidders</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400">Scope of Work & Requirements</h4>
                <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                  {selectedJob.description}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-white font-bold border border-white/10">
                    {selectedJob.postedBy.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-0.5">Project Client</p>
                    <p className="text-sm font-bold text-white leading-none">{selectedJob.postedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-yellow-500/10 px-2.5 py-1 text-xs font-semibold text-yellow-500 border border-yellow-500/10">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{selectedJob.clientRating} Rating</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0d0f1a] shrink-0 flex gap-3">
              <button onClick={() => navigate(getParentRoute())} className="px-5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:text-white transition">
                Close View
              </button>

              {!selectedJob.isOwnPost ? (
                <button
                  onClick={() => navigate(`/jobs/${selectedJob.id}/make-proposal`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-sm font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  <Send className="h-4 w-4" /> Send Proposal
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/jobs/manage/${selectedJob.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-white/10 py-3.5 text-sm font-bold text-white hover:bg-zinc-700 transition"
                >
                  Manage Post Applicants
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default JobMain;