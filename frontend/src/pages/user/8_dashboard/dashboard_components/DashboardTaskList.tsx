import React from 'react';
import { CreditIcon } from '@/components/ui/credit-icon';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CheckCircle } from 'lucide-react';

interface DashboardTask {
    contract_id: string;
    contract_status: string;
    job_title: string;
    client_name: string;
    freelancer_name: string;
    client_account_id: string;
    freelancer_account_id: string;
    contract_value: string;
    milestones: any[];
    job_id?: string;
    job_banner?: string;
    job_category?: string;
    job_difficulty?: string;
}

interface DashboardTaskListProps {
    tasks: DashboardTask[];
    isFreelancerTab: boolean;
    isArchivedTab?: boolean;
    currentUserAccountId?: string;
    onOpenRateReview?: (contractId: string, reviewTargetName: string, contractValue: string, isFreelancerRole: boolean) => void;
    onClaimCredits?: (contractId: string, contractValue: string) => void;
}

export const DashboardTaskList: React.FC<DashboardTaskListProps> = ({ tasks, isFreelancerTab, isArchivedTab, currentUserAccountId, onOpenRateReview, onClaimCredits }) => {
    const navigate = useNavigate();

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500 bg-white/5 rounded-lg border border-white/10 border-dashed">
                No active tasks in this tab.
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {tasks.map(task => {
                const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
                const isFreelancerRole = task.freelancer_account_id === currentUserAccountId;
                const myReview = isFreelancerRole ? task.freelancer_rating : task.client_rating;
                const theirReview = isFreelancerRole ? task.client_rating : task.freelancer_rating;
                
                let computedStatus = task.contract_status;
                if (computedStatus === 'Active') computedStatus = 'Ongoing';
                if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                if (allMilestonesDone) {
                    if (myReview && theirReview) {
                        computedStatus = 'Completed';
                    } else {
                        computedStatus = 'Done';
                    }
                }

                const statusBadgeColor = 
                    computedStatus === 'Completed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    computedStatus === 'Done' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    computedStatus === 'Ongoing' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

                return (
                <div key={task.contract_id} className={`bg-white/5 transition border rounded-xl p-4 sm:p-6 ${isArchivedTab ? 'opacity-60 border-white/5 hover:opacity-100 hover:bg-white/10' : 'hover:bg-white/10 border-white/10'}`}>
                    <div className="flex flex-col sm:flex-row gap-5 w-full">
                        {task.job_banner && (
                            <div className="w-full sm:w-48 h-32 sm:h-auto rounded-lg overflow-hidden shrink-0 border border-white/10 bg-[#080a12]/50 flex items-center justify-center">
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
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${statusBadgeColor}`}>
                                        {computedStatus}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                        Job
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-white truncate max-w-sm">{task.job_title}</h3>
                                <a 
                                    href={`/jobs/postings/${task.job_id}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="flex items-center justify-center p-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
                                    title="View Original Job Post"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500 font-bold mb-2 text-sm">
                                <CreditIcon className="h-4 w-4" /> {task.contract_value}
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                {task.job_category && (
                                    <span className="text-[10px] font-semibold text-zinc-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                                        {task.job_category}
                                    </span>
                                )}
                                {task.job_difficulty && (
                                    <span className="text-[10px] font-semibold text-zinc-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 capitalize">
                                        {task.job_difficulty}
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 mb-4 w-full max-w-sm">
                                <div className="w-full h-1.5 bg-white/10 rounded-full flex overflow-hidden">
                                    {task.milestones?.map((m: any, idx: number) => (
                                        <div 
                                            key={m.id} 
                                            className={`h-full flex-1 ${idx !== 0 ? 'border-l border-[#0d0f1a]' : ''} ${m.status === 'completed' || m.status === 'approved' ? 'bg-emerald-500' : 'bg-transparent'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400 font-bold whitespace-nowrap tracking-wider">
                                    {task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length}/{task.milestones?.length}
                                </span>
                            </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
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
                                    className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                        {isFreelancerRole ? 'Client' : 'Freelancer'}
                                    </span>
                                    <p className="text-sm font-semibold text-zinc-300 leading-tight">
                                        {isFreelancerRole ? task.client_name : task.freelancer_name}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                                {/* Done status but needs review */}
                                {computedStatus === 'Done' && (
                                    <>
                                        {!myReview ? (
                                            <button 
                                                onClick={() => onOpenRateReview && onOpenRateReview(task.contract_id, isFreelancerRole ? task.client_name : task.freelancer_name, task.contract_value, isFreelancerRole)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-600/20"
                                            >
                                                Rate & Review
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm text-zinc-400 select-none">
                                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                                <span className="font-medium">You Reviewed</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Completed status (both reviewed) */}
                                {computedStatus === 'Completed' && isFreelancerRole && onClaimCredits && (
                                    <button 
                                        onClick={() => onClaimCredits(task.contract_id, task.contract_value)}
                                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2 rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20"
                                    >
                                        Claim Credits
                                    </button>
                                )}

                                {/* View Progress / Update Milestones Button */}
                                <button 
                                    onClick={() => navigate(isFreelancerRole ? `/dashboard/tasks/${task.contract_id}` : `/dashboard/review/${task.contract_id}`)}
                                    className={(isArchivedTab || computedStatus === 'Done' || computedStatus === 'Completed')
                                        ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-2 rounded-lg text-sm font-semibold transition"
                                        : "bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-emerald-500/20"
                                    }
                                >
                                    {(isArchivedTab || computedStatus === 'Done' || computedStatus === 'Completed') ? 'View Progress Details' : (isFreelancerRole ? 'Update Milestones' : 'View Progress')}
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
    );
};
