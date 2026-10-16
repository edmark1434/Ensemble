import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import useGlobalState from "@/lib/global_state";
import { ArrowLeft, Send, ExternalLink, LoaderCircle, Star, Check, Lock, RotateCcw, ShieldCheck, ListChecks } from 'lucide-react';
import { MilestoneActivityFeed } from './MilestoneActivityFeed';
import UserHeader from "@/components/nav/user_header";
import { RateReviewModal } from './RateReviewModal';
import socket from '@/lib/socket';

export const DashboardTaskDetail = () => {
    const { id } = useParams(); // contractId
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useGlobalState();
    
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    const resolveActiveMilestoneId = (fetchedTask: any, currentId: string | null) => {
        if (!fetchedTask?.milestones?.length) return null;
        
        // If current milestone exists and is not completed/approved, keep it selected
        if (currentId) {
            const current = fetchedTask.milestones.find((m: any) => m.id === currentId);
            if (current && current.status !== 'completed' && current.status !== 'approved') {
                return currentId;
            }
        }
        
        // Otherwise, auto-advance to the first active or submitted_for_review milestone
        const active = fetchedTask.milestones.find(
            (m: any) => m.status === 'active' || m.status === 'submitted_for_review'
        );
        return active ? active.id : (currentId || fetchedTask.milestones[0].id);
    };

    const fetchTask = useCallback(async () => {
        try {
            const response = await api.get(`/api/dashboard/tasks/${id}`);
            if (response.data.success) {
                const fetchedTask = response.data.data;
                setTask(fetchedTask);
                setActiveMilestoneId((curr) => resolveActiveMilestoneId(fetchedTask, curr));
            }
        } catch (error: any) {
            console.error("Error fetching task details:", error);
            const message = error.response?.data?.message || "Failed to load contract task details.";
            toast.error(message);
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchTask();
    }, [fetchTask]);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }

        const handleTaskUpdated = (event: {
            contract_id?: string;
            task?: { contract_id?: string; [key: string]: unknown };
        }) => {
            if (String(event?.contract_id || '') === String(id || '')) {
                // Instantly re-fetch task with current user's session credentials so
                // roles, permissions, and latest milestone statuses sync in real-time
                void fetchTask();
            }
        };
        const handleReconnect = () => {
            void fetchTask();
        };

        socket.on('dashboardTaskUpdated', handleTaskUpdated);
        socket.io.on('reconnect', handleReconnect);
        return () => {
            socket.off('dashboardTaskUpdated', handleTaskUpdated);
            socket.io.off('reconnect', handleReconnect);
        };
    }, [fetchTask, id]);

    const applyTaskUpdate = (updatedTask?: unknown) => {
        const nextTask = updatedTask as
            | { contract_id?: string; milestones?: any[]; [key: string]: unknown }
            | undefined;
        if (String(nextTask?.contract_id || '') === String(id || '')) {
            setTask(nextTask);
            setActiveMilestoneId((curr) => resolveActiveMilestoneId(nextTask, curr));
        }
        void fetchTask();
    };

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

    const isFreelancer = task?.user_role?.effective_role
        ? task.user_role.effective_role === 'freelancer'
        : user?.account_id === task.freelancer_account_id;
    const activeMilestone = task.milestones?.find((m: any) => m.id === activeMilestoneId);
    
    // Status Computation
    const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
    const myReview = isFreelancer ? task.freelancer_rating : task.client_rating;
    const theirReview = isFreelancer ? task.client_rating : task.freelancer_rating;
    
    let computedStatus = task.contract_status;
    if (computedStatus === 'Active') computedStatus = 'Ongoing';
    if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
    if (task.contract_status === 'Completed' || (allMilestonesDone && myReview && theirReview)) {
        computedStatus = 'Completed';
    } else if (allMilestonesDone) {
        computedStatus = 'Done';
    }

    const statusBadgeColor = 
        computedStatus === 'Completed' || computedStatus === 'Done'
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold'
            : computedStatus === 'Ongoing'
            ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-bold'
            : computedStatus === 'Waiting'
            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold'
            : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-bold';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
            <UserHeader pageTitle={isFreelancer ? "My Task" : "To Review"} />
            
            <div className="mx-auto flex min-h-[calc(100dvh-100px)] max-w-7xl flex-col p-4 sm:p-6 md:p-8 lg:h-[calc(100vh-100px)] lg:min-h-0">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:flex-1 lg:min-h-0 lg:gap-8">
                    {/* Left Column */}
                    <div className="flex flex-col gap-6 lg:col-span-5 lg:h-full lg:min-h-0">
                        <div>
                            <button 
                                onClick={() => navigate(location.pathname.includes('/review/') ? '/dashboard/review' : '/dashboard/tasks')}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition px-2.5 py-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-white/5 -ml-2.5"
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
                                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 shrink-0">
                                        {task.contract_type === 'gig' ? 'Gig' : 'Job'}
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight break-words line-clamp-3">{task.job_title}</h1>
                                    <a 
                                        href={task.contract_type === 'gig' ? `/gigs/services/${task.job_id}` : `/jobs/postings/${task.job_id}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="flex items-center justify-center p-1.5 rounded-md bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0 mt-0.5 border border-gray-200 dark:border-white/10"
                                        title={task.contract_type === 'gig' ? "View Original Gig Post" : "View Original Job Post"}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 shadow-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img 
                                        src={isFreelancer 
                                            ? (task.client_avatar 
                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}`
                                                : "https://i.pravatar.cc/150?u=a042581f4e29026704d") 
                                            : (task.freelancer_avatar 
                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}`
                                                : "https://i.pravatar.cc/150?u=b042581f4e29026704d")} 
                                        alt="User Avatar" 
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-400 tracking-wider">
                                            {isFreelancer ? 'Client' : 'Freelancer'}
                                        </span>
                                        <span className="text-gray-900 dark:text-white font-bold text-sm leading-tight truncate">
                                            {isFreelancer ? task.client_name : task.freelancer_name}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate(`/profile/${isFreelancer ? task.client_account_id : task.freelancer_account_id}`)}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-200 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors uppercase tracking-wider shrink-0"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>

                        {/* Milestones Stepper */}
                        <div className="inbox-scroll-thin max-h-[50dvh] min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-dark-surface/70 dark:shadow-none lg:max-h-none lg:flex-1">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">Milestones</h2>
                                <button 
                                    onClick={() => navigate(`/contracts/${task.contract_id || id}`)}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors uppercase tracking-wider"
                                >
                                    View Contract
                                </button>
                            </div>
                            <div className="space-y-3">
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
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' 
                                        : isActionable 
                                            ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30' 
                                            : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
                                            
                                    const circleColors = isCompleted 
                                        ? 'bg-emerald-600 text-white' 
                                        : isActionable 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';

                                    const cardClasses = isActive
                                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-600/80 dark:border-blue-500/70 shadow-sm'
                                        : 'bg-white dark:bg-dark-surface/50 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20';

                                    const rawDescription = milestone.description?.trim();
                                    const hasDescription = rawDescription && rawDescription.toLowerCase() !== 'no description provided.';

                                    const milestoneTasks: string[] = Array.isArray(task.target_milestone_tasks) 
                                        ? task.target_milestone_tasks 
                                        : (typeof task.target_milestone_tasks === 'string' ? JSON.parse(task.target_milestone_tasks || '[]') : []);

                                    const revisionsUsed = milestone.submissions?.filter((s: any) => s.status === 'revision_request').length || 0;
                                    const revisionsMax = milestone.revisions_max || 0;
                                    const isRevisionsExhausted = revisionsUsed >= revisionsMax && revisionsMax > 0;

                                    return (
                                        <div 
                                            key={milestone.id} 
                                            className={`relative overflow-hidden rounded-xl p-3.5 transition-all ${isLocked ? 'opacity-55 cursor-not-allowed bg-gray-50/70 dark:bg-zinc-900/30 border border-gray-200 dark:border-white/5' : 'cursor-pointer'} ${cardClasses}`}
                                            onClick={() => !isLocked && setActiveMilestoneId(milestone.id)}
                                        >
                                            {/* Active Left Indicator Bar */}
                                            {isActive && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 dark:bg-blue-500 rounded-l-xl" />
                                            )}

                                            {/* Header: Milestone Step Icon, Title & Status Badge */}
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs ${circleColors}`}>
                                                        {isCompleted ? (
                                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                                        ) : isLocked ? (
                                                            <Lock className="w-3 h-3" />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className={`font-bold text-sm truncate ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-zinc-200'}`}>
                                                            {milestone.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${isLocked ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-dark-surface dark:text-zinc-400 dark:border-white/5' : statusColors}`}>
                                                    {isLocked ? 'LOCKED' : milestone.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            {/* Description (if available) */}
                                            {hasDescription && (
                                                <p className="text-gray-600 dark:text-zinc-400 text-xs mt-2 pl-8.5 leading-relaxed line-clamp-2" title={rawDescription}>
                                                    {rawDescription}
                                                </p>
                                            )}

                                            {/* Deliverables / Tasks Scope (if contract is linked to milestone tasks) */}
                                            {milestoneTasks.length > 0 && (
                                                <div className="mt-2.5 pl-8.5 flex items-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700 dark:text-zinc-300 bg-gray-100/90 dark:bg-white/5 px-2.5 py-1 rounded-md border border-gray-200 dark:border-white/10">
                                                        <ListChecks className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                        <span>{milestoneTasks.length} {milestoneTasks.length === 1 ? 'Deliverable Scope' : 'Deliverables Scope'}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {/* Structured Financial & Revisions Box */}
                                            <div className="mt-3 rounded-lg bg-gray-50/90 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/5 p-2.5">
                                                {/* Top Row: Milestone Value & Role-specific Payout / Escrow Tag */}
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-200/70 dark:border-white/5">
                                                    <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 dark:text-white">
                                                        <img src="/icons/lottie/credit.png" alt="credits" className="w-4 h-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                        <span>{Number(milestone.credits).toLocaleString()} Credits</span>
                                                    </div>
                                                    {isFreelancer ? (
                                                        <div className="flex items-center gap-1 text-[11px]">
                                                            <span className="text-gray-500 dark:text-zinc-400">Net:</span>
                                                            <span className="font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 px-1.5 py-0.5 rounded">
                                                                {Math.round(milestone.credits * 0.9).toLocaleString()} C
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider">
                                                            <ShieldCheck className="w-3 h-3" /> Escrow Protected
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Bottom Row: Revisions Used & Additional Revision Rate */}
                                                <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                                                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-400">
                                                        <RotateCcw className="w-3 h-3 text-gray-400 dark:text-zinc-500 shrink-0" />
                                                        <span>Revisions:</span>
                                                        <span className={`font-semibold ${isRevisionsExhausted ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {revisionsUsed} / {revisionsMax}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1.5 text-gray-600 dark:text-zinc-400">
                                                        <span>Extra Rev:</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {task.revision_price_credits ? `+${task.revision_price_credits} C` : '0 C'}
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
                    <div className="flex h-[calc(100dvh-2rem)] min-h-[32rem] scroll-mt-24 flex-col overflow-hidden rounded-2xl lg:col-span-7 lg:h-full lg:min-h-0">
                        {activeMilestone ? (
                            <MilestoneActivityFeed 
                                task={task} 
                                activeMilestone={activeMilestone} 
                                isFreelancer={isFreelancer} 
                                onRefreshTask={applyTaskUpdate}
                                canReviewContract={allMilestonesDone && !myReview}
                                myReview={myReview}
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
                contractId={task?.contract_id || id}
                reviewTargetName={isFreelancer ? (task?.client_name || 'Client') : (task?.freelancer_name || 'Freelancer')}
                reviewTargetAvatar={isFreelancer ? task?.client_avatar : task?.freelancer_avatar}
                reviewTargetRole={isFreelancer ? 'client' : 'freelancer'}
                isFreelancerRole={isFreelancer}
                contractValue={task?.contract_value}
                onSuccess={fetchTask}
            />
        </div>
    );
};
