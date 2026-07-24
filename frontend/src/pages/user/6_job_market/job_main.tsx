import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useParams, useLocation } from "react-router-dom";
import UserHeader from "@/components/nav/user_header";

// Modular Component Imports
import JobSearchbar from "./job_components/job_searchbar";
import JobTabs from "./job_components/job_tabs";
import JobCategories from "./job_components/job_categories";
import JobFilters from "./job_components/job_filters";
import JobListViewType from "./job_components/job_list_viewtype";
import JobViewDetails from "./job_components/job_viewdetails";
import UtilScrollTop from "./job_components/job_utilities/util_scroll_top";
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
      // 🚫 Hide Closed Job Posts
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

      {/* Slide-out details drawer */}
      <JobViewDetails
        selectedJob={selectedJob}
        onClose={() => navigate(getParentRoute())}
      />

      {/* Scroll To Top Utility */}
      <UtilScrollTop />
    </div>
  );
};

export default JobMain;