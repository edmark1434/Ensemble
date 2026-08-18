import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from "@/lib/global_state";
import { ArrowLeft, Send, ExternalLink, LoaderCircle, Star } from 'lucide-react';
import { MilestoneActivityFeed } from './MilestoneActivityFeed';
import UserHeader from "@/components/nav/user_header";
import { RateReviewModal } from './RateReviewModal';

export const DashboardTaskDetail = () => {
    const { id } = useParams(); // contractId
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useGlobalState();
    
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    const fetchTask = async () => {
        try {
            const response = await api.get(`/api/dashboard/tasks/${id}`);
            if (response.data.success) {
                const fetchedTask = response.data.data;
                setTask(fetchedTask);
                if (!activeMilestoneId && fetchedTask?.milestones?.length > 0) {
                    const active = fetchedTask.milestones.find((m: any) => m.status === 'active' || m.status === 'submitted_for_review');
                    setActiveMilestoneId(active ? active.id : fetchedTask.milestones[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching task details:", error);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex items-center justify-center">
                <LoaderCircle className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex items-center justify-center text-gray-900 dark:text-white">
                Task not found.
            </div>
        );
    }

    const isFreelancer = user?.account_id === task.freelancer_account_id;
    const activeMilestone = task.milestones?.find((m: any) => m.id === activeMilestoneId);
    
    // Status Computation
    const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
    const myReview = isFreelancer ? task.freelancer_rating : task.client_rating;
    const theirReview = isFreelancer ? task.client_rating : task.freelancer_rating;
    
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
        computedStatus === 'Completed' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' :
        computedStatus === 'Done' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
        computedStatus === 'Ongoing' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
        'bg-zinc-500/10 border-zinc-500/20 text-gray-600 dark:text-zinc-400';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
            <UserHeader pageTitle={isFreelancer ? "My Task" : "To Review"} credits={user?.wallet?.balance_credits || 0} />
            
            <div className="mx-auto max-w-7xl p-6 md:p-8 h-[calc(100vh-100px)] flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
                    {/* Left Column */}
                    <div className="lg:col-span-5 flex flex-col h-full gap-6">
                        <div>
                            <button 
                                onClick={() => navigate(location.pathname.includes('/review/') ? '/dashboard/review' : '/dashboard/tasks')}
                                className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition"
                            >
                                <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 shrink-0">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${statusBadgeColor} shrink-0`}>
                                        {computedStatus}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-zinc-500/10 text-gray-600 dark:text-zinc-400 border-zinc-500/20 shrink-0">
                                        Job
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight break-words line-clamp-3">{task.job_title}</h1>
                                    <a 
                                        href={`/jobs/postings/${task.job_id}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center justify-center p-1.5 rounded-md bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 mt-0.5"
                                        title="View Original Job Post"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={isFreelancer 
                                            ? (task.client_avatar 
                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}`
                                                : "https://i.pravatar.cc/150?u=a042581f4e29026704d") 
                                            : (task.freelancer_avatar 
                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}`
                                                : "https://i.pravatar.cc/150?u=b042581f4e29026704d")} 
                                        alt="User Avatar" 
                                        className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-zinc-700"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 tracking-wider">
                                            {isFreelancer ? 'Client' : 'Freelancer'}
                                        </span>
                                        <span className="text-gray-700 dark:text-zinc-300 font-medium text-sm leading-tight">
                                            {isFreelancer ? task.client_name : task.freelancer_name}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/profile/${isFreelancer ? task.client_account_id : task.freelancer_account_id}`)}
                                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 transition-colors uppercase tracking-wider"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>

                        {/* Milestones Stepper */}
                        <div className="bg-white dark:bg-dark-surface/70 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex-1 overflow-y-auto inbox-scroll-thin min-h-0">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">Milestones</h2>
                                <button 
                                    onClick={() => navigate(`/contracts/${task.contract_id || id}`)}
                                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors uppercase tracking-wider"
                                >
                                    View Contract
                                </button>
                            </div>
                            <div className="space-y-4">
                                {task.milestones?.map((milestone: any, index: number) => {
                                    // Logic: A milestone is locked if it's not the first one AND the previous milestone is not 'completed' or 'approved'
                                    let isLocked = false;
                                    if (index > 0) {
                                        const prevStatus = task.milestones[index - 1].status;
                                        if (prevStatus !== 'completed' && prevStatus !== 'approved') {
                                            isLocked = true;
                                        }
                                    }
                                    
                                    const isActive = activeMilestoneId === milestone.id;
                                    const isCompleted = milestone.status === 'completed' || milestone.status === 'approved';
                                    const isActionable = milestone.status === 'active' || milestone.status === 'submitted_for_review';
                                    
                                    const statusColors = isCompleted 
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                        : isActionable 
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-zinc-500 border-gray-200 dark:border-white/5';
                                            
                                    const circleColors = isCompleted ? 'bg-emerald-500 text-white' : isActionable ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500';

                                    return (
                                        <div 
                                            key={milestone.id} 
                                            className={`relative flex gap-3 p-3 rounded-xl transition ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5'} ${isActive ? 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10' : 'border border-transparent'}`}
                                            onClick={() => !isLocked && setActiveMilestoneId(milestone.id)}
                                        >
                                            <div className="flex flex-col items-center mt-1">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${circleColors}`}>
                                                    {index + 1}
                                                </div>
                                                {index !== task.milestones.length - 1 && (
                                                    <div className="w-px h-full bg-gray-200 dark:bg-white/10 my-1" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-1">
                                                <p className={`font-semibold text-xs mb-1 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-zinc-300'}`}>{milestone.name}</p>
                                                <p className="text-gray-500 dark:text-zinc-500 text-[10px] mb-2 leading-relaxed line-clamp-2" title={milestone.description}>
                                                    {milestone.description || "No description provided."}
                                                </p>
                                                
                                                <div className="flex flex-col gap-1.5 mt-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-500">
                                                            <img src="/icons/lottie/credit.png" alt="credits" className="w-3 h-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                                            {milestone.credits} Credits
                                                        </div>
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${isLocked ? 'bg-gray-100 dark:bg-dark-surface text-gray-500 dark:text-zinc-600 border-gray-200 dark:border-white/5' : statusColors}`}>
                                                            {isLocked ? 'LOCKED' : milestone.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9px] text-gray-500 dark:text-zinc-400 font-medium">
                                                        <span>Additional work rate: <span className="text-yellow-600 dark:text-yellow-500">{task.revision_price_credits} Credits</span></span>
                                                        <span>
                                                            Revisions: <span className={milestone.submissions?.filter((s: any) => s.status === 'revision_request').length >= milestone.revisions_max ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-white"}>
                                                                {milestone.submissions?.filter((s: any) => s.status === 'revision_request').length || 0} / {milestone.revisions_max}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interaction Panel (Submit Work / Review Work) */}
                    <div className="lg:col-span-7 flex flex-col h-full min-h-0 rounded-2xl overflow-hidden">
                        {activeMilestone ? (
                            <MilestoneActivityFeed 
                                task={task} 
                                activeMilestone={activeMilestone} 
                                isFreelancer={isFreelancer} 
                                onRefreshTask={fetchTask}
                                canReviewContract={allMilestonesDone && !myReview}
                                onOpenReviewModal={() => setIsReviewModalOpen(true)}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-zinc-500">
                                Select a milestone to view activity.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <RateReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                contractId={task.contract_id || id}
                reviewTargetName={isFreelancer ? task.client_name : task.freelancer_name}
                onSuccess={fetchTask}
            />
        </div>
    );
};
