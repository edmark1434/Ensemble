import React, { useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, ExternalLink } from "lucide-react";
import ProposalsList, { type ProposalStatus } from "../proposals_components/proposals_list";
import { useJobs } from "@/hooks/useJobs";
import type { ProposalsMainContext } from "../proposals_main";
import { continueIfAccountVerified } from "@/lib/accountVerification";

export const ProposalsIncomingPage: React.FC = () => {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  const navigate = useNavigate();

  const {
    searchQuery,
    activeStatus,
    minPrice,
    maxPrice,
    priceSort,
    milestonesValue,
    milestonesSort,
    revisionRateSort,
    dateSort,
    viewType,
    setChildProposalsCounts,
  } = useOutletContext<ProposalsMainContext>();

  const [proposals, setProposals] = useState<any[]>([]);
  const [targetJob, setTargetJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchProposalsByJob, fetchJobs } = useJobs();

  React.useEffect(() => {
    const loadData = async () => {
      if (!jobPostId) return;
      try {
        const fetchedProposals = await fetchProposalsByJob(jobPostId);
        const mapped = fetchedProposals.map((p: any) => ({
          id: p.proposal_id,
          jobId: p.job_id,
          jobTitle: p.job_title || "Unknown Job",
          jobCategory: p.job_category || "Uncategorized",
          partyName: p.freelancer_name || p.freelancer_handle || "Unknown",
          partyAvatar: p.freelancer_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.freelancer_avatar_path.startsWith('/') ? '' : '/'}${p.freelancer_avatar_path}`
            : undefined,
          bidAmount: parseFloat(p.rate_credits) || 0,
          additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
          status: p.status,
          submittedAt: new Date(p.created_at).toLocaleDateString(),
          coverLetter: p.letter || "",
          rejectionReason: p.reject_reason,
          milestones: p.milestones || [],
          type: "incoming"
        }));
        setProposals(mapped);

        // Fetch job details to display title and thumbnail
        const jobs = await fetchJobs();
        const found = jobs.find((j: any) => j.job_id === jobPostId);
        if (found) {
          setTargetJob({ 
            title: found.title,
            thumbnail: found.thumbnail_path 
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${found.thumbnail_path}` 
              : "/placeholder.svg"
          });
        }

        // Calculate and report status counts to parent
        const counts = { All: mapped.length, Pending: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
        mapped.forEach((p: any) => {
          if (p.status in counts) {
            counts[p.status as keyof typeof counts]++;
          }
        });
        setChildProposalsCounts(counts);
      } catch (err) {
        console.error("Failed to load incoming proposals", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostId]);

  const handleUpdateStatus = (
    id: string,
    newStatus: ProposalStatus,
    reason?: string
  ) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: newStatus, rejectionReason: reason || p.rejectionReason }
          : p
      )
    );
  };

  const filtered = proposals
    .filter((p) => {
      // 1. Must match the route parameter jobPostId
      const matchesJob = jobPostId ? p.jobId === jobPostId : true;

      // 2. Status Match
      const matchesStatus = activeStatus === "All" || p.status === activeStatus;

      // 3. Search Match
      const matchesSearch =
        p.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.coverLetter.toLowerCase().includes(searchQuery.toLowerCase());

      // 4. Price Filter
      const matchesMinPrice = minPrice === "" || p.bidAmount >= parseInt(minPrice);
      const matchesMaxPrice = maxPrice === "" || p.bidAmount <= parseInt(maxPrice);

      // 5. Milestones Exact Count Filter
      const matchesMilestones =
        milestonesValue === "" ||
        (p.milestones && p.milestones.length === parseInt(milestonesValue));

      return (
        matchesJob &&
        matchesStatus &&
        matchesSearch &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesMilestones
      );
    })
    .sort((a, b) => {
      if (priceSort === "inc") return a.bidAmount - b.bidAmount;
      if (priceSort === "dec") return b.bidAmount - a.bidAmount;
      if (milestonesSort === "inc") return (a.milestones?.length || 0) - (b.milestones?.length || 0);
      if (milestonesSort === "dec") return (b.milestones?.length || 0) - (a.milestones?.length || 0);
      if (revisionRateSort === "inc") return a.additionalWorkRate - b.additionalWorkRate;
      if (revisionRateSort === "dec") return b.additionalWorkRate - a.additionalWorkRate;
      if (dateSort === "inc") return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      if (dateSort === "dec") return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return 0;
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-zinc-400 text-sm animate-pulse">Loading incoming proposals...</p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-full flex items-center justify-center mb-2">
          <Briefcase className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Proposals Received Yet</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">You haven't received any proposals for this job post yet, or you haven't created a job post.</p>
        <button
          onClick={() => continueIfAccountVerified(() => navigate('/jobs/create'))}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
        >
          Create a Job Post
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* Target Job Header Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/jobs/proposals")}
            className="p-2 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
            title="Return to Job Posts Selection"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex items-center gap-3">
            {targetJob?.thumbnail && (
              <img 
                src={targetJob.thumbnail} 
                alt="" 
                className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" 
              />
            )}
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block mb-0.5">
                Viewing Proposals
              </span>
              <button
                type="button"
                onClick={() => navigate(`/jobs/my-job-post/${jobPostId}`)}
                className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-400 transition-colors flex items-center gap-2 truncate text-left"
                title="View My Job Post Details"
              >
                <span className="truncate">{targetJob?.title || "Job Post"}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </button>
            </div>
          </div>
        </div>

        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 shrink-0">
          {filtered.length} Total Applicants
        </span>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2 mt-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Received Proposal Applications ({filtered.length})
        </h2>
        <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">Incoming</span>
      </div>

      <ProposalsList
        proposals={filtered}
        viewType={viewType}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default ProposalsIncomingPage;