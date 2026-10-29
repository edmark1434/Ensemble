import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CheckCircle, Clock, Star, Eye, ArrowRight, ListChecks, X } from 'lucide-react';

interface ReviewData {
    rating?: number | string;
    feedback?: string;
    created_at?: string;
}

const RATING_TIER_STYLES: Record<number, { label: string; badgeClass: string }> = {
    1: {
        label: "Poor",
        badgeClass: "text-rose-800 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/30",
    },
    2: {
        label: "Fair",
        badgeClass: "text-orange-800 dark:text-orange-300 bg-orange-100/90 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/30",
    },
    3: {
        label: "Good",
        badgeClass: "text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30",
    },
    4: {
        label: "Very Good",
        badgeClass: "text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40",
    },
    5: {
        label: "Outstanding",
        badgeClass: "text-indigo-950 dark:text-purple-200 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-purple-500/25 border-indigo-400 dark:border-purple-400/50 font-bold",
    },
};

interface ContractReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: DashboardTask | null;
    currentUserAccountId?: string;
}

export const ContractReviewsModal: React.FC<ContractReviewsModalProps> = ({
    isOpen,
    onClose,
    task,
    currentUserAccountId,
}) => {
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (!isOpen || !task) return null;

    const isFreelancerRole = task.user_role?.effective_role
        ? task.user_role.effective_role === 'freelancer'
        : task.freelancer_account_id === currentUserAccountId;

    const theirReview: ReviewData | null = (isFreelancerRole ? task.client_rating : task.freelancer_rating) || null;
    const myReview: ReviewData | null = (isFreelancerRole ? task.freelancer_rating : task.client_rating) || null;

    const counterpartyName = isFreelancerRole ? task.client_name : task.freelancer_name;
    const counterpartyRole = isFreelancerRole ? 'Client' : 'Freelancer';
    const counterpartyAvatar = isFreelancerRole ? task.client_avatar : task.freelancer_avatar;

    const renderReviewCard = (
        title: string,
        reviewerSubtitle: string,
        review: ReviewData | null,
        avatar?: string
    ) => {
        const ratingNum = Math.max(1, Math.min(5, Math.round(Number(review?.rating || 0))));
        const rawRating = Number(review?.rating || 0);
        const tier = RATING_TIER_STYLES[ratingNum] || RATING_TIER_STYLES[5];
        const hasRating = review && review.rating !== null && review.rating !== undefined && !isNaN(Number(review.rating));

        return (
            <div className="p-4 rounded-xl bg-gray-50/90 dark:bg-white/[0.03] border border-gray-200/90 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {avatar ? (
                            <img
                                src={`${import.meta.env.VITE_CLOUDFRONT_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`}
                                alt={title}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0 shadow-2xs"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold shrink-0 border border-blue-200 dark:border-blue-500/30">
                                {title[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {title}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium truncate">
                                {reviewerSubtitle}
                            </p>
                        </div>
                    </div>

                    {hasRating ? (
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center bg-white dark:bg-dark-base/80 px-2.5 py-1.5 rounded-xl border border-gray-200/90 dark:border-white/10 shadow-2xs">
                            <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((starIdx) => (
                                    <Star
                                        key={starIdx}
                                        className={`w-3.5 h-3.5 ${
                                            starIdx <= ratingNum
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-gray-300 dark:text-zinc-600'
                                        }`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                                {rawRating.toFixed(1)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${tier.badgeClass}`}>
                                {tier.label}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 dark:text-zinc-500 italic shrink-0 self-start sm:self-center">
                            No rating submitted yet
                        </span>
                    )}
                </div>

                <div className="pl-3.5 border-l-2 border-amber-400 dark:border-amber-500/80 py-1 bg-amber-50/40 dark:bg-amber-500/[0.04] rounded-r-lg pr-3">
                    {review?.feedback?.trim() ? (
                        <p className="text-xs sm:text-sm text-gray-800 dark:text-zinc-200 italic leading-relaxed whitespace-pre-wrap break-words">
                            "{review.feedback.trim()}"
                        </p>
                    ) : (
                        <p className="text-xs text-gray-400 dark:text-zinc-500 italic">
                            No written feedback provided.
                        </p>
                    )}
                </div>

                {review?.created_at && !isNaN(new Date(review.created_at).getTime()) && (
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500 text-right">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                    </div>
                )}
            </div>
        );
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                Ratings & Reviews
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                {task.job_title}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        title="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body: Both Reviews */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Review from Counterparty */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
                            Review from {counterpartyRole}
                        </p>
                        {renderReviewCard(
                            counterpartyName,
                            `Rated you as ${isFreelancerRole ? 'Freelancer' : 'Client'}`,
                            theirReview,
                            counterpartyAvatar
                        )}
                    </div>

                    {/* Your Review */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
                            Your Review
                        </p>
                        {renderReviewCard(
                            'Your Review',
                            `Given to ${counterpartyName} (${counterpartyRole})`,
                            myReview
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

interface DashboardTask {
    contract_id: string;
    contract_type?: string;
    contract_status: string;
    job_title: string;
    client_name: string;
    freelancer_name: string;
    client_avatar?: string;
    freelancer_avatar?: string;
    client_account_id: string;
    freelancer_account_id: string;
    contract_value: string;
    milestones: any[];
    job_id?: string;
    job_banner?: string;
    job_category?: string;
    job_difficulty?: string;
    job_hiring_type?: string;
    job_no_of_hires?: number;
    team_project_id?: string;
    client_rating?: ReviewData | null;
    freelancer_rating?: ReviewData | null;
    user_role?: {
        effective_role?: string;
        can_buy_revision?: boolean;
        can_review_milestone?: boolean;
        can_submit_milestone?: boolean;
    };
}

interface DashboardTaskListProps {
    tasks: DashboardTask[];
    isFreelancerTab: boolean;
    isArchivedTab?: boolean;
    isRateTab?: boolean;
    currentUserAccountId?: string;
    onOpenRateReview?: (contractId: string, reviewTargetName: string, contractValue: string, isFreelancerRole: boolean, reviewTargetAvatar?: string) => void;
}

export const DashboardTaskList: React.FC<DashboardTaskListProps> = ({ tasks, isFreelancerTab, isArchivedTab, isRateTab, currentUserAccountId, onOpenRateReview }) => {
    const navigate = useNavigate();
    const [viewingReviewsTask, setViewingReviewsTask] = useState<DashboardTask | null>(null);

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-zinc-500 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-lg border border-gray-200 dark:border-white/10 border-dashed">
                {isRateTab 
                    ? "No contracts pending rating. All done contracts have been rated!"
                    : isArchivedTab
                    ? "No archived tasks."
                    : "No active tasks in this tab."}
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {tasks.map(task => {
                const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
                const isFreelancerRole = task.user_role?.effective_role
                    ? task.user_role.effective_role === 'freelancer'
                    : task.freelancer_account_id === currentUserAccountId;
                const myReview = isFreelancerRole ? task.freelancer_rating : task.client_rating;
                const theirReview = isFreelancerRole ? task.client_rating : task.freelancer_rating;
                
                let computedStatus = task.contract_status;
                if (computedStatus === 'Active') computedStatus = 'Ongoing';
                if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                if (task.contract_status === 'Completed' || (allMilestonesDone && myReview && theirReview)) {
                    computedStatus = 'Completed';
                } else if (allMilestonesDone) {
                    computedStatus = 'Done';
                }

                const hasMyReview = Boolean(myReview && myReview.rating !== null && myReview.rating !== undefined && !isNaN(Number(myReview.rating)));
                const hasTheirReview = Boolean(theirReview && theirReview.rating !== null && theirReview.rating !== undefined && !isNaN(Number(theirReview.rating)));
                const bothSidesRated = hasMyReview && hasTheirReview;
                const isCompletedContract = task.contract_status?.toLowerCase() === 'completed' || computedStatus?.toLowerCase() === 'completed' || isArchivedTab;
                const showReviewCallout = Boolean(hasTheirReview && (bothSidesRated || isCompletedContract));

                const completedMilestones = task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length || 0;
                const totalMilestones = task.milestones?.length || 0;
                const progressPercentage = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

                const statusBadgeColor = 
                    computedStatus === 'Completed' || computedStatus === 'Done'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' 
                        : computedStatus === 'Ongoing' 
                        ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30' 
                        : computedStatus === 'Waiting'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';

                return (
                <div key={task.contract_id} className={`bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all ${isArchivedTab ? 'opacity-70 hover:opacity-100' : ''}`}>
                    <div className="flex flex-col sm:flex-row gap-5 w-full">
                        {task.job_banner && (
                            <div className="w-full sm:w-52 h-36 sm:h-auto rounded-xl overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-dark-base/50 flex items-center justify-center">
                                <img 
                                    src={`${import.meta.env.VITE_CLOUDFRONT_URL}${task.job_banner.startsWith('/') ? '' : '/'}${task.job_banner}`}
                                    alt="Job Banner"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                                        {computedStatus}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                        {task.contract_type?.toLowerCase() === 'gig' 
                                            ? 'Gig' 
                                            : (task.team_project_id || task.job_hiring_type === 'team' || Number(task.job_no_of_hires) > 1 ? 'Team Job' : 'Job')}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1.5">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate max-w-md">{task.job_title}</h3>
                                {task.job_id && (
                                    <a 
                                        href={task.contract_type?.toLowerCase() === 'gig' ? `/gigs/services/${task.job_id}` : `/jobs/postings/${task.job_id}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center justify-center p-1.5 rounded-md bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition-colors shrink-0 border border-gray-200 dark:border-white/10"
                                        title={task.contract_type?.toLowerCase() === 'gig' ? "View Original Gig Post" : "View Original Job Post"}
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-2.5 text-sm">
                                <img src="/icons/lottie/credit.png" alt="credits" className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <span>{Number(task.contract_value).toLocaleString()} Credits</span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-3.5">
                                {task.job_category && (
                                    <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10">
                                        {task.job_category}
                                    </span>
                                )}
                                {task.job_difficulty && (
                                    <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10 capitalize">
                                        {task.job_difficulty}
                                    </span>
                                )}
                            </div>
                            
                            <div className="mb-4 w-full max-w-md">
                                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1.5">
                                    <span>Milestone Progress</span>
                                    <span className="font-mono text-[11px]">
                                        {completedMilestones}/{totalMilestones} Completed ({progressPercentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full flex overflow-hidden">
                                    {task.milestones?.map((m: any, idx: number) => {
                                        const isMilestoneDone = m.status === 'completed' || m.status === 'approved';
                                        return (
                                            <div 
                                                key={m.id || idx} 
                                                className={`h-full flex-1 ${idx !== 0 ? 'border-l border-white dark:border-[#0d0f1a]' : ''} ${isMilestoneDone ? 'bg-emerald-600' : 'bg-transparent'}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-white/10 pt-4 mt-1">
                            <div className="flex items-center gap-3">
                                <img 
                                    src={isFreelancerRole 
                                        ? (task.client_avatar 
                                            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}`
                                            : "https://i.pravatar.cc/150?u=a042581f4e29026704d") 
                                        : (task.freelancer_avatar 
                                            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}`
                                            : "https://i.pravatar.cc/150?u=b042581f4e29026704d")} 
                                    alt="User Avatar" 
                                    className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0"
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 tracking-wider">
                                        {isFreelancerRole ? 'Client' : 'Freelancer'}
                                    </span>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                                        {isFreelancerRole ? task.client_name : task.freelancer_name}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Done status but needs review */}
                                {computedStatus === 'Done' && (
                                    <>
                                        {!myReview ? (
                                            <button 
                                                onClick={() => onOpenRateReview && onOpenRateReview(
                                                    task.contract_id, 
                                                    isFreelancerRole ? task.client_name : task.freelancer_name, 
                                                    task.contract_value, 
                                                    isFreelancerRole,
                                                    isFreelancerRole ? task.client_avatar : task.freelancer_avatar
                                                )}
                                                className="group inline-flex items-center active:scale-98 rounded-xl text-xs font-bold transition-all shadow-xs overflow-hidden border border-emerald-600 dark:border-emerald-500"
                                                title="Review required within 24 hours of milestone completion"
                                            >
                                                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 group-hover:bg-emerald-700 text-white transition-colors">
                                                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0 transition-transform group-hover:scale-110" />
                                                    <span>Rate & Review</span>
                                                </div>
                                                <div className="flex items-center gap-1 px-2.5 py-2 bg-white group-hover:bg-gray-50 border-l border-emerald-700/30 text-[11px] font-bold text-gray-900 transition-colors">
                                                    <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                                    <span>24h Window</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 px-3 py-2 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold select-none shadow-2xs">
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                <span>You Reviewed</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* View Ratings & Reviews Button (opens popup modal) */}
                                {(bothSidesRated || isCompletedContract || isArchivedTab) && (hasTheirReview || hasMyReview) && (
                                    <button 
                                        type="button"
                                        onClick={() => setViewingReviewsTask(task)}
                                        className="group inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
                                        title="View ratings and reviews from both parties"
                                    >
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                        <span>View Reviews</span>
                                    </button>
                                )}

                                {/* View Progress / Update Milestones Button */}
                                {(() => {
                                    const isTeamJob = Boolean(task.team_project_id || task.job_hiring_type === 'team' || Number(task.job_no_of_hires) > 1);
                                    const targetPath = isTeamJob
                                        ? `/team-project/${task.team_project_id || task.job_id}`
                                        : (isFreelancerRole ? `/dashboard/tasks/${task.contract_id}` : `/dashboard/review/${task.contract_id}`);

                                    return (
                                        <button 
                                            onClick={() => navigate(targetPath)}
                                            className={(isArchivedTab || computedStatus === 'Done' || computedStatus === 'Completed')
                                                ? "group inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
                                                : isTeamJob
                                                ? "group inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
                                                : "group inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98"
                                            }
                                        >
                                            {isTeamJob ? (
                                                <>
                                                    <ListChecks className="w-3.5 h-3.5 shrink-0 text-blue-200" />
                                                    <span>Open Team Project Workspace</span>
                                                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                </>
                                            ) : (isArchivedTab || computedStatus === 'Done' || computedStatus === 'Completed') ? (
                                                <>
                                                    <Eye className="w-3.5 h-3.5 shrink-0 text-gray-300 dark:text-zinc-600 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors" />
                                                    <span>View Progress Details</span>
                                                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                </>
                                            ) : isFreelancerRole ? (
                                                <>
                                                    <ListChecks className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                                                    <span>Update Milestones</span>
                                                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-3.5 h-3.5 shrink-0 text-emerald-200" />
                                                    <span>View Progress</span>
                                                    <ArrowRight className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                                </>
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                );
            })}

            {/* Reviews Popup Modal */}
            <ContractReviewsModal
                isOpen={Boolean(viewingReviewsTask)}
                onClose={() => setViewingReviewsTask(null)}
                task={viewingReviewsTask}
                currentUserAccountId={currentUserAccountId}
            />
        </div>
    );
};
