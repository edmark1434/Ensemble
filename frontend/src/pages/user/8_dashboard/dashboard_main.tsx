import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from "@/lib/global_state";
import { LayoutDashboard, Clock, Briefcase, FileSearch, ShieldCheck, CheckCircle, ExternalLink, Archive, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import UserHeader from "@/components/nav/user_header";
import { DashboardTaskList } from './dashboard_components/DashboardTaskList';
import { RateReviewModal } from './dashboard_components/RateReviewModal';
import { ClaimCreditsModal } from './dashboard_components/ClaimCreditsModal';

// ============================================================================
// SKELETON COMPONENT FOR LOADING STATE
// ============================================================================
const DashboardSkeletonLoader: React.FC = () => (
  <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-pulse">
    {/* Tabs Skeleton */}
    <div className="flex space-x-1 p-1 bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-xl w-max border border-gray-200 dark:border-white/10">
        <div className="h-10 w-24 rounded-lg bg-gray-100 dark:bg-white/10" />
        <div className="h-10 w-32 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-10 w-32 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
    </div>

    {/* Content Skeleton */}
    <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-6" />
        ))}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
    client_rating?: any;
    freelancer_rating?: any;
}

const DashboardMain = () => {
    const { user } = useGlobalState();
    const location = useLocation();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [loading, setLoading] = useState(true);

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewTarget, setReviewTarget] = useState({ id: '', name: '', value: '', isFreelancerRole: false });

    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [claimTarget, setClaimTarget] = useState({ id: '', value: '' });

    const activeTab = location.pathname.includes('/dashboard/review') 
        ? 'client' 
        : location.pathname.includes('/dashboard/tasks') 
            ? 'freelancer' 
            : location.pathname.includes('/dashboard/archived')
                ? 'archived'
                : 'overview';
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/api/dashboard/tasks');
            if (res.data.success) {
                setTasks(res.data.data);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const computeCompleted = (t: DashboardTask) => {
        const allMilestonesDone = t.milestones?.length > 0 && t.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
        const isFreelancer = t.freelancer_account_id === user?.account_id;
        const myReview = isFreelancer ? t.freelancer_rating : t.client_rating;
        const theirReview = isFreelancer ? t.client_rating : t.freelancer_rating;
        return allMilestonesDone && myReview && theirReview;
    };

    const myTasks = tasks.filter(t => t.freelancer_account_id === user?.account_id && !computeCompleted(t));
    const toReview = tasks.filter(t => t.client_account_id === user?.account_id && !computeCompleted(t));
    const archivedTasks = tasks.filter(t => computeCompleted(t));

    const ongoingCount = [...myTasks, ...toReview].filter(t => t.contract_status === 'Active').length;
    const waitingCount = [...myTasks, ...toReview].filter(t => t.contract_status === 'Waiting' || t.contract_status === 'Pending Signature').length;
    const remainingMilestonesCount = [...myTasks, ...toReview].reduce((sum, t) => {
        return sum + (t.milestones?.filter(m => m.status !== 'completed' && m.status !== 'approved').length || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#080a12]">
            {/* Top Header */}
            <UserHeader pageTitle="Dashboard" credits={user?.wallet?.balance_credits || 0} />

            {/* Main Content */}
            <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in">
                {/* Banner Title */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/60 shadow-sm dark:shadow-none p-6 md:p-8 backdrop-blur-xl">
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 w-full">
                        {/*<div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">*/}
                        {/*    <LayoutDashboard className="h-8 w-8 text-emerald-400" />*/}
                        {/*</div>*/}
                        <div>
                            <h1
                                className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                Delivery Dashboard
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                                Manage your ongoing and upcoming tasks from a job or gig.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-white/5 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 px-5 py-2.5 rounded-xl text-gray-600 dark:text-zinc-300 shadow-xl w-max">
                            <Clock className="h-5 w-5 text-emerald-400" />
                            <span className="font-mono text-base font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span className="text-sm text-gray-500 dark:text-zinc-500 border-l border-gray-200 dark:border-white/10 pl-3">{currentTime.toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="border-b border-gray-200 dark:border-white/10 flex gap-1 relative overflow-x-auto w-full max-w-full">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'overview' 
                                    ? 'text-blue-400 font-bold' 
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4" /> Overview
                            </span>
                            {activeTab === 'overview' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/tasks')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'freelancer' 
                                    ? 'text-blue-400 font-bold' 
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Briefcase className="h-4 w-4" /> My Tasks
                                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.2 text-[10px] text-gray-600 dark:text-zinc-300">{myTasks.length}</span>
                            </span>
                            {activeTab === 'freelancer' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/review')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'client' 
                                    ? 'text-blue-400 font-bold' 
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <FileSearch className="h-4 w-4" /> To Review
                                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.2 text-[10px] text-gray-600 dark:text-zinc-300">{toReview.length}</span>
                            </span>
                            {activeTab === 'client' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/archived')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'archived' 
                                    ? 'text-blue-400 font-bold' 
                                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Archive className="h-4 w-4" /> Archived
                                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.2 text-[10px] text-gray-600 dark:text-zinc-300">{archivedTasks.length}</span>
                            </span>
                            {activeTab === 'archived' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <DashboardSkeletonLoader />
                ) : activeTab === 'overview' ? (
                    <div>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-6">
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Ongoing Tasks</p>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{ongoingCount}</h2>
                                </div>
                                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                    <Briefcase className="h-6 w-6 text-emerald-400" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Upcoming Tasks</p>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{waitingCount}</h2>
                                </div>
                                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                                    <Clock className="h-6 w-6 text-blue-400" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Completed Tasks</p>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{archivedTasks.length}</h2>
                                </div>
                                <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                                    <CheckCircle className="h-6 w-6 text-purple-400" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Remaining Milestones</p>
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{remainingMilestonesCount}</h2>
                                </div>
                                <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                                    <LayoutDashboard className="h-6 w-6 text-orange-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* My Tasks Column */}
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">My Tasks</h3>
                                {myTasks.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-zinc-500 italic">No tasks currently.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {myTasks.map(task => {
                                            let computedStatus = task.contract_status;
                                            if (computedStatus === 'Active') computedStatus = 'Ongoing';
                                            if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                                            const statusBadgeColor = 
                                                computedStatus === 'Completed' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                computedStatus === 'Done' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                                computedStatus === 'Ongoing' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                'bg-zinc-500/10 text-gray-600 dark:text-zinc-400 border-zinc-500/20';

                                            return (
                                                <div 
                                                    key={task.contract_id} 
                                                    onClick={() => navigate(`/dashboard/tasks/${task.contract_id}`)}
                                                    className="flex items-center gap-4 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:bg-white/10 transition-colors"
                                                >
                                                    <img 
                                                        src={task.client_avatar 
                                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}`
                                                                : "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                                        alt="Client Avatar" 
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-zinc-700 shrink-0"
                                                    />
                                                    <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.job_title}</h4>
                                                            <a href={`/jobs/postings/${task.job_id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white transition-colors shrink-0" title="View Original Job Post">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full">
                                                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex overflow-hidden">
                                                                {task.milestones?.map((m: any, idx: number) => (
                                                                    <div 
                                                                        key={m.id} 
                                                                        className={`h-full flex-1 ${idx !== 0 ? 'border-l border-[#0d0f1a]' : ''} ${m.status === 'completed' || m.status === 'approved' ? 'bg-emerald-500' : 'bg-transparent'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 font-bold whitespace-nowrap tracking-wider">
                                                                {task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length}/{task.milestones?.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                                                            {computedStatus}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-zinc-500/10 text-gray-600 dark:text-zinc-400 border-zinc-500/20">
                                                            Job
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* To Review Column */}
                            <div className="bg-white dark:bg-[#0d0f1a]/70 shadow-sm dark:shadow-none rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">To Review</h3>
                                {toReview.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-zinc-500 italic">No tasks to review currently.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {toReview.map(task => {
                                            let computedStatus = task.contract_status;
                                            if (computedStatus === 'Active') computedStatus = 'Ongoing';
                                            if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                                            const statusBadgeColor = 
                                                computedStatus === 'Completed' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                                                computedStatus === 'Done' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                                                computedStatus === 'Ongoing' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                'bg-zinc-500/10 text-gray-600 dark:text-zinc-400 border-zinc-500/20';

                                            return (
                                                <div 
                                                    key={task.contract_id} 
                                                    onClick={() => navigate(`/dashboard/review/${task.contract_id}`)}
                                                    className="flex items-center gap-4 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 rounded-xl border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:bg-white/10 transition-colors"
                                                >
                                                    <img 
                                                        src={task.freelancer_avatar 
                                                                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}`
                                                                : "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                                        alt="Freelancer Avatar" 
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-zinc-700 shrink-0"
                                                    />
                                                    <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.job_title}</h4>
                                                            <a href={`/jobs/postings/${task.job_id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white transition-colors shrink-0" title="View Original Job Post">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full">
                                                            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex overflow-hidden">
                                                                {task.milestones?.map((m: any, idx: number) => (
                                                                    <div 
                                                                        key={m.id} 
                                                                        className={`h-full flex-1 ${idx !== 0 ? 'border-l border-[#0d0f1a]' : ''} ${m.status === 'completed' || m.status === 'approved' ? 'bg-emerald-500' : 'bg-transparent'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 font-bold whitespace-nowrap tracking-wider">
                                                                {task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length}/{task.milestones?.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                                                            {computedStatus}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-zinc-500/10 text-gray-500 dark:text-zinc-400 border-zinc-500/20">
                                                            Job
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <DashboardTaskList 
                        tasks={activeTab === 'freelancer' ? myTasks : activeTab === 'client' ? toReview : archivedTasks} 
                        isFreelancerTab={activeTab === 'freelancer' || (activeTab === 'archived' && false)} 
                        isArchivedTab={activeTab === 'archived'}
                        currentUserAccountId={user?.account_id}
                        onOpenRateReview={(id, name, value, role) => {
                            setReviewTarget({ id, name, value, isFreelancerRole: role });
                            setReviewModalOpen(true);
                        }}
                        onClaimCredits={(id, value) => {
                            setClaimTarget({ id, value });
                            setClaimModalOpen(true);
                        }}
                    />
                )}
            </div>

            {/* Fade-in Animation keyframes */}
            <style>{`
                @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                animation: fadeIn 0.35s ease-out forwards;
                }
            `}</style>

            <RateReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                contractId={reviewTarget.id}
                reviewTargetName={reviewTarget.name}
                isFreelancerRole={reviewTarget.isFreelancerRole}
                contractValue={reviewTarget.value}
                onSuccess={() => fetchTasks()}
            />

            <ClaimCreditsModal
                isOpen={claimModalOpen}
                onClose={() => setClaimModalOpen(false)}
                contractId={claimTarget.id}
                contractValue={claimTarget.value}
                onSuccess={() => fetchTasks()}
            />
        </div>
    );
};

export default DashboardMain;
