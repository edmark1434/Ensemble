import { getBudgetDisplayInfo, getJobBudgetType } from "@/lib/formatBudget";
import { getImageUrl } from "@/lib/utils";
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
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

// Datasets & Types
import { sampleJobs, sampleCategories } from "./job_datasets";
import type { Job } from "./job_components/job_lists";
import { computeJobRankingBreakdown } from "./job_ranking";

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
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm">
      <div className="mb-4 h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-5 backdrop-blur-sm space-y-4">
      <div className="h-3 w-28 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="flex gap-2">
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
          <div className="h-8 flex-1 animate-pulse rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
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
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || "");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(location.state?.category || "All");
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [showFilters, setShowFilters] = useState(true);

  // Popup Report State
  const [reportingJob, setReportingJob] = useState<Job | null>(null);

  // Filter States
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [priceSort, setPriceSort] = useState<"inc" | "dec" | null>(null);
  const [selectedDiffs, setSelectedDifficulty] = useState<string[]>([]);
  const [selectedHiringTypes, setSelectedHiringTypes] = useState<string[]>([]);
  const [selectedBudgetTypes, setSelectedBudgetTypes] = useState<string[]>([]);
  const [matchMySkills, setMatchMySkills] = useState<boolean>(false);
  const [posValue, setPosValue] = useState<string>("");
  const [posSort, setPosSort] = useState<"inc" | "dec" | null>(null);
  const [ratingSort, setRatingSort] = useState<boolean>(false);

  // User Profile Skills State
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loadingUserSkills, setLoadingUserSkills] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserSkills = async () => {
      if (!userInfo?.account_id) {
        setUserSkills([]);
        return;
      }
      setLoadingUserSkills(true);
      try {
        const res = await api.get(`/api/tags/users/${userInfo.account_id}/tags`);
        const tags = res.data?.data || [];
        const skillNames = tags
          .map((t: any) => t.tag_name || t.name)
          .filter((name: any): name is string => typeof name === "string" && name.trim().length > 0);
        setUserSkills(skillNames);
      } catch (err) {
        console.error("Failed to fetch user skills for matching:", err);
      } finally {
        setLoadingUserSkills(false);
      }
    };

    fetchUserSkills();
  }, [userInfo?.account_id]);

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
          priceRange: getBudgetDisplayInfo({
            minBudget: j.rate_credits_min,
            maxBudget: j.rate_credits_max,
            isTeam: Boolean(j.hiring_type === "team" || j.is_team || j.posted_as === "Team"),
            positionsNeeded: j.positions_needed
          }).amountText,
          minBudget: j.rate_credits_min || 0,
          maxBudget: j.rate_credits_max || 0,
          postedBy: j.client_name || j.client_handle || "Unknown",
          client_account_id: j.client_account_id,
          clientAvatar: j.client_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${j.client_avatar_path.startsWith('/') ? '' : '/'}${j.client_avatar_path}`
            : undefined,
          postedAt: new Date(j.created_at).toLocaleString(),
          createdAt: j.created_at,
          timeAgo: getTimeAgo(new Date(j.created_at)),
          clientRating: parseFloat(j.client_rating) || 0,
          ratingCount: parseInt(j.client_rating_count) || 0,
          positionsNeeded: j.no_of_hires || 1,
          hiredCount: parseInt(j.hired_count) || 0,
          applicantsCount: parseInt(j.applicant_count) || 0,
          savesCount: parseInt(j.saves_count) || 0,
          timeline: `${j.timeline_min}-${j.timeline_max} Days`,
          thumbnail: getImageUrl(j.thumbnail_path) || "/placeholder.svg",
          skills: j.tags || [],
          isSaved: j.is_saved || false,
          isOwnPost: Boolean(j.is_own_post),
          isManageablePost: Boolean(j.is_manageable_post),
          isPersonalPost: Boolean(j.is_personal_post),
          hasProposed: j.has_proposed || false,
          myProposalId: j.my_proposal_id || null,
          team_id: j.team_id || null,
          teamId: j.team_id || null,
          team_visibility: j.team_visibility || null,
          teamVisibility: j.team_visibility || null,
          is_team: Boolean(j.is_team || j.posted_as === 'Team' || j.team_id),
          isTeam: Boolean(j.is_team || j.posted_as === 'Team' || j.team_id),
          posted_as: j.posted_as,
          hiring_type: j.hiring_type || (j.posted_as === 'Team' ? "team" : "single"),
          milestones: Array.isArray(j.milestones) ? j.milestones : [],
          deadline: j.rough_deadline ? new Date(j.rough_deadline).toLocaleDateString() : undefined,
          requireNDA: j.require_nda || false,
          portfolioUseAllowed: j.portfolio_use_allowed || false,
          portfolioDuration: j.portfolio_use_duration_seconds || null,
          isExistingProject: j.is_existing_project || false,
          existingProjectId: j.existing_project_id || null,
          initiatorRole: j.initiator_role || "Client",
          attachments: Array.isArray(j.attachments) ? j.attachments : [],
          screeningQuestions: Array.isArray(j.screening_questions) ? j.screening_questions : [],
          shortlistedCount: parseInt(j.shortlisted_count) || 0,
          clientHireRate: typeof j.client_hire_rate === "number" ? j.client_hire_rate : (parseInt(j.client_hire_rate) || 100),
          clientLastActive: j.client_last_active ? getTimeAgo(new Date(j.client_last_active)) : undefined
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

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!reportingJob?.id) throw new Error("Select a job to report");
    await api.post(`/api/jobs/${reportingJob.id}/report`, { reason, description: details });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setActiveCategoryFilter("All");
    setMinPrice("");
    setMaxPrice("");
    setPriceSort(null);
    setSelectedDifficulty([]);
    setSelectedHiringTypes([]);
    setSelectedBudgetTypes([]);
    setMatchMySkills(false);
    setPosValue("");
    setPosSort(null);
    setRatingSort(false);
  };

  const tabFilteredJobs = useMemo(() => {
    const isSavedTab = location.pathname.includes("/saved-posts");
    const isMyPostsTab = location.pathname.includes("/my-job-post");

    return jobsList.filter((job) => {
      if (isSavedTab) return job.isSaved && job.status !== "Closed";
      if (isMyPostsTab) return job.isOwnPost;
      return job.status !== "Closed"; // Default postings tab
    });
  }, [jobsList, location.pathname]);

  const dynamicCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    tabFilteredJobs.forEach((job) => {
      if (job.category) {
        counts[job.category] = (counts[job.category] || 0) + 1;
      }
    });
    const catArray = Object.keys(counts).map((name) => ({
      label: name,
      count: counts[name],
    }));
    return [
      { label: "All", count: tabFilteredJobs.length },
      ...catArray.sort((a, b) => b.count - a.count),
    ];
  }, [tabFilteredJobs]);

  const filteredJobs = useMemo(() => {
    const result = tabFilteredJobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.postedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategoryFilter === "All" || job.category === activeCategoryFilter;
      const matchesMinPrice = minPrice === "" || job.minBudget >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || job.minBudget <= parseInt(maxPrice);
      const matchesDiff = selectedDiffs.length === 0 || selectedDiffs.includes(job.difficulty);
      const matchesPos = posValue === "" || job.positionsNeeded === parseInt(posValue);
      const isTeam = Boolean(job.hiring_type === "team" || job.is_team || job.isTeam || job.posted_as === "Team");
      const jobHiringType = isTeam ? "team" : "individual";
      const matchesHiringType = selectedHiringTypes.length === 0 || selectedHiringTypes.includes(jobHiringType);
      const jobBudgetType = getJobBudgetType(job);
      const matchesBudgetType = selectedBudgetTypes.length === 0 || selectedBudgetTypes.includes(jobBudgetType);

      // Skills Matching: Check if any declared profile skill matches job tags or appears in job title/description
      const matchesSkills = !matchMySkills || userSkills.length === 0 || (() => {
        const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());
        const jobSkills = Array.isArray(job.skills) ? job.skills.map((s) => s.toLowerCase().trim()) : [];
        const titleLower = job.title.toLowerCase();
        const descLower = job.description.toLowerCase();

        return normalizedUserSkills.some((userSkill) => {
          if (!userSkill) return false;
          // Exact or substring match in job tags
          const inJobTags = jobSkills.some((js) => js === userSkill || js.includes(userSkill) || userSkill.includes(js));
          if (inJobTags) return true;

          // Word boundary or containment check in title/description for key skills
          return titleLower.includes(userSkill) || descLower.includes(userSkill);
        });
      })();

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesDiff &&
        matchesPos &&
        matchesHiringType &&
        matchesBudgetType &&
        matchesSkills
      );
    });

    result.sort((a, b) => {
      if (priceSort === "inc") return a.minBudget - b.minBudget;
      if (priceSort === "dec") return b.minBudget - a.minBudget;
      if (posSort === "inc") return a.positionsNeeded - b.positionsNeeded;
      if (posSort === "dec") return b.positionsNeeded - a.positionsNeeded;
      if (ratingSort) return b.clientRating - a.clientRating;
      return computeJobRankingBreakdown(b).totalScore - computeJobRankingBreakdown(a).totalScore;
    });

    return result;
  }, [
    tabFilteredJobs,
    searchQuery,
    activeCategoryFilter,
    minPrice,
    maxPrice,
    priceSort,
    selectedDiffs,
    selectedHiringTypes,
    selectedBudgetTypes,
    matchMySkills,
    userSkills,
    posValue,
    posSort,
    ratingSort,
  ]);

  const isInfoTab = location.pathname.includes("/jobs/info");

  const getParentRoute = () => {
    if (location.pathname.includes("/saved-posts")) return "/jobs/saved-posts";
    if (location.pathname.includes("/my-job-post")) return "/jobs/my-job-post";
    return "/jobs/postings";
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-dark-base relative">
      {/* Sticky User Header */}
      <div className="sticky top-0 z-50">
        <UserHeader pageTitle="Job Market" />
      </div>

      <div className="mx-auto max-w-7xl p-6 md:p-8 w-full" data-tour="job-market">
        <JobSearchbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
          <JobTabs />
          {!isInfoTab && (
            <div className="py-2 flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${
                  showFilters 
                    ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-900 dark:text-white' 
                    : 'bg-white dark:bg-white/5 shadow-sm dark:shadow-none border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-white/10'
                }`}
                title="Toggle Filters"
              >
                <Filter className="h-5 w-5" />
              </button>
              <JobListViewType viewType={viewType} onViewTypeChange={setViewType} />
            </div>
          )}
        </div>

        <div className={`grid grid-cols-1 ${showFilters && !isInfoTab ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-8 items-start`}>
          {showFilters && !isInfoTab && (
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
                      selectedHiringTypes,
                      selectedBudgetTypes,
                      matchMySkills,
                      posValue,
                      posSort,
                      ratingSort,
                    }}
                    setters={{
                      setMinPrice,
                      setMaxPrice,
                      setPriceSort,
                      setSelectedDifficulty,
                      setSelectedHiringTypes,
                      setSelectedBudgetTypes,
                      setMatchMySkills,
                      setPosValue,
                      setPosSort,
                      setRatingSort,
                    }}
                    userSkills={userSkills}
                    isLoadingSkills={loadingUserSkills}
                    onClear={handleClearFilters}
                  />
                </>
              )}
            </div>
          )}

          <div className={showFilters && !isInfoTab ? "lg:col-span-3" : "lg:col-span-1"}>
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
