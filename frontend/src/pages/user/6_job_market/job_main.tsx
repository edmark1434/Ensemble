import React, { useState, useEffect, useMemo } from "react";
import { Filter } from "lucide-react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// Modular Component Imports
import JobSearchbar from "./job_components/job_searchbar";
import JobTabs from "./job_components/job_tabs";
import JobCategories from "./job_components/job_categories";
import JobFilters from "./job_components/job_filters";
import JobListViewType from "./job_components/job_list_viewtype";
import JobViewDetails from "./job_components/job_viewdetails";
import PopupReportJob from "./job_components/job_popups/popup_report_job";
import type { ViewType } from "./job_components/job_list_viewtype";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";

// Datasets & Types
import { sampleJobs, sampleCategories } from "./job_datasets";
import type { Job } from "./job_components/job_lists";

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "Just now";
}

export interface JobMainContext {
  jobsList: Job[];
  filteredJobs: Job[];
  loading: boolean;
  viewType: ViewType;
  toggleSaveJob: (e: React.MouseEvent, jobId: string) => void;
  handleReportJob: (job: Job) => void;
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

  const { fetchJobs, toggleJobSave: toggleSaveJobApi } = useJobs();
  const userInfo = useGlobalState((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Popup Report State
  const [reportingJob, setReportingJob] = useState<Job | null>(null);

  // Filter States
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);
  const [selectedDiffs, setSelectedDifficulty] = useState<string[]>([]);
  const [posValue, setPosValue] = useState<string>("");
  const [posSort, setPosSort] = useState<"inc" | "dec" | null>(null);
  const [ratingSort, setRatingSort] = useState<boolean>(false);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const fetchedJobs = await fetchJobs();
        
        if (!Array.isArray(fetchedJobs)) return;

        // Backend is_saved handles the saved status per account
        const mappedJobs = fetchedJobs.map((j: any) => ({
          id: j.job_id,
          title: j.title,
          description: j.description,
          status: j.status,
          category: j.category,
          difficulty: j.experience_level,
          priceRange: `${j.rate_credits_min?.toLocaleString() || 0} ~ ${j.rate_credits_max?.toLocaleString() || 0}`,
          minBudget: j.rate_credits_min || 0,
          maxBudget: j.rate_credits_max || 0,
          postedBy: j.client_name || j.client_handle || "Unknown",
          clientAvatar: j.client_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${j.client_avatar_path.startsWith('/') ? '' : '/'}${j.client_avatar_path}`
            : undefined,
          postedAt: new Date(j.created_at).toLocaleString(),
          timeAgo: getTimeAgo(new Date(j.created_at)),
          clientRating: 5.0,
          ratingCount: 0,
          positionsNeeded: j.no_of_hires || 1,
          hiredCount: parseInt(j.hired_count) || 0,
          applicantsCount: parseInt(j.applicant_count) || 0,
          savesCount: parseInt(j.saves_count) || 0,
          timeline: `${j.timeline_min}-${j.timeline_max} Days`,
          thumbnail: j.thumbnail_path 
             ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${j.thumbnail_path}`
             : "/placeholder.svg",
          skills: j.tags || [],
          isSaved: j.is_saved || false,
          isOwnPost: userInfo?.account_id === j.client_account_id,
          hasProposed: j.has_proposed || false,
          myProposalId: j.my_proposal_id || null
        }));
        setJobsList(mappedJobs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [fetchJobs, userInfo?.account_id]);

  useEffect(() => {
    if (id) {
      const found = jobsList.find((j) => j.id === id);
      if (found) setSelectedJob(found);
    } else {
      setSelectedJob(null);
    }
  }, [id, jobsList]);

  const toggleSaveJob = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    
    // Optimistic UI update
    setJobsList((prev) => {
      return prev.map((job) => {
        if (job.id === jobId) {
          return {
            ...job,
            isSaved: !job.isSaved,
            savesCount: job.isSaved ? job.savesCount - 1 : job.savesCount + 1
          };
        }
        return job;
      });
    });

    try {
      await toggleSaveJobApi(jobId);
    } catch (err) {
      console.error("Failed to toggle save", err);
      // Revert on failure (simplified)
      setJobsList((prev) => {
        return prev.map((job) => {
          if (job.id === jobId) {
            return {
              ...job,
              isSaved: !job.isSaved,
              savesCount: job.isSaved ? job.savesCount - 1 : job.savesCount + 1
            };
          }
          return job;
        });
      });
    }
  };

  const handleReportJob = (job: Job) => {
    setReportingJob(job);
  };

  const handleSubmitReport = (reason: string, details: string) => {
    console.log(`Report submitted for ${reportingJob?.id}:`, { reason, details });
    // Integrate backend API call here when ready
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

  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    jobsList.forEach((job) => {
      if (job.category) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    const catArray = Object.keys(counts).map((name) => ({
      label: name,
      count: counts[name],
    }));
    return [
      { label: "All", count: jobsList.length },
      ...catArray.sort((a, b) => b.count - a.count),
    ];
  }, [jobsList]);

  const filteredJobs = useMemo(() => {
    const result = jobsList.filter((job) => {
      const isNotClosed = job.status !== "Closed";

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
        isNotClosed &&
        matchesSearch &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesDiff &&
        matchesPos
      );
    });

    result.sort((a, b) => {
      if (priceSort === "inc") return a.minBudget - b.minBudget;
      if (priceSort === "dec") return b.minBudget - a.minBudget;
      if (posSort === "inc") return a.positionsNeeded - b.positionsNeeded;
      if (posSort === "dec") return b.positionsNeeded - a.positionsNeeded;
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
    <div className="w-full min-h-screen bg-[#080a12] relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Market" credits={1250} />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full">
        <JobSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-white/10 gap-4">
          <JobTabs />
          <div className="py-2 flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${
                showFilters 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Filters"
            >
              <Filter className="h-5 w-5" />
            </button>
            <JobListViewType viewType={viewType} onViewTypeChange={setViewType} />
          </div>
        </div>

        <div className={`grid grid-cols-1 ${showFilters ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-8 items-start`}>
          {showFilters && (
            <div className="space-y-6 sticky top-24 lg:col-span-1">
              {loading ? (
                <SidebarSkeleton />
              ) : (
                <>
                  <JobCategories
                    categories={dynamicCategories}
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
          )}

          <div className={showFilters ? "lg:col-span-3" : "lg:col-span-1"}>
            <Outlet
              context={
                {
                  jobsList,
                  filteredJobs,
                  loading,
                  viewType,
                  toggleSaveJob,
                  handleReportJob,
                } satisfies JobMainContext
              }
            />
          </div>
        </div>
      </div>

      {/* Slide-out details drawer */}
      <JobViewDetails
        selectedJob={selectedJob}
        onClose={() => navigate(getParentRoute())}
        onReportJob={handleReportJob}
        onToggleSave={(jobId) => {
           const e = { stopPropagation: () => {} } as React.MouseEvent;
           toggleSaveJob(e, jobId);
        }}
      />

      {/* Report Popup Modal */}
      <PopupReportJob
        isOpen={Boolean(reportingJob)}
        jobTitle={reportingJob?.title}
        onClose={() => setReportingJob(null)}
        onSubmitReport={handleSubmitReport}
      />

      {/* Scroll To Top Utility */}
      {/*<UtilScrollTop />*/}
    </div>
  );
};

export default JobMain;