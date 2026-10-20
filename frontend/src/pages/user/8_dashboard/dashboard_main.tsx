import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import useGlobalState from "@/lib/global_state"; 
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import { LayoutDashboard, Clock, Briefcase, FileSearch, ShieldCheck, CheckCircle, ExternalLink, Archive, Shield, Calendar, ChevronRight, Layers, Award, AlertTriangle, Star, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import UserHeader from "@/components/nav/user_header";
import { DashboardTaskList } from './dashboard_components/DashboardTaskList';
import { RateReviewModal } from './dashboard_components/RateReviewModal';
import { DeliveryFlowGuide } from './dashboard_components/DeliveryFlowGuide';
import socket from '@/lib/socket';

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
    contract_type: string;
    contract_status: string;
    job_id?: string;
    job_title: string;
    client_name: string;
    freelancer_name: string;
    client_avatar?: string;
    freelancer_avatar?: string;
    client_account_id: string;
    freelancer_account_id: string;
    contract_value: string;
    milestones: any[];
    target_milestone_title?: string;
    client_rating?: any;
    freelancer_rating?: any;
    user_role?: {
        effective_role?: string;
        can_buy_revision?: boolean;
        can_review_milestone?: boolean;
        can_submit_milestone?: boolean;
    };
}

const DashboardMain = () => {
    const { user, isGuestMode, isVerified } = useGlobalState();
    const location = useLocation();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileStats, setProfileStats] = useState<any>(null);

    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewTarget, setReviewTarget] = useState({ id: '', name: '', value: '', isFreelancerRole: false, avatar: '' });

    const activeTab = location.pathname.includes('/dashboard/review') 
        ? 'client' 
        : location.pathname.includes('/dashboard/tasks') 
            ? 'freelancer' 
            : location.pathname.includes('/dashboard/rate')
                ? 'rate'
                : location.pathname.includes('/dashboard/archived')
                    ? 'archived'
                    : location.pathname.includes('/dashboard/flow')
                        ? 'flow'
                        : 'overview';
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (user?.account_id) {
            api.get(`/api/accounts/profile/${user.account_id}`)
                .then(res => {
                    if (res.data?.success && res.data?.data) {
                        setProfileStats(res.data.data);
                    } else if (res.data) {
                        setProfileStats(res.data);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch profile stats for dashboard:", err);
                });
        }
    }, [user?.account_id]);

    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        const handleTaskUpdated = (event: { contract_id?: string; task?: DashboardTask }) => {
            if (!event?.task || !event.contract_id) return;
            setTasks((current) => {
                const exists = current.some(
                    (task) => String(task.contract_id) === String(event.contract_id)
                );
                return exists
                    ? current.map((task) =>
                        String(task.contract_id) === String(event.contract_id)
                            ? event.task!
                            : task
                    )
                    : [event.task!, ...current];
            });
        };
        const handleReconnect = () => {
            void fetchTasks();
        };

        socket.on('dashboardTaskUpdated', handleTaskUpdated);
        socket.io.on('reconnect', handleReconnect);
        return () => {
            socket.off('dashboardTaskUpdated', handleTaskUpdated);
            socket.io.off('reconnect', handleReconnect);
        };
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
        if (t.contract_status === 'Completed') return true;
        const allMilestonesDone = t.milestones?.length > 0 && t.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
        const isFreelancer = t.user_role?.effective_role
            ? t.user_role.effective_role === 'freelancer'
            : t.freelancer_account_id === user?.account_id;
        const myReview = isFreelancer ? t.freelancer_rating : t.client_rating;
        const theirReview = isFreelancer ? t.client_rating : t.freelancer_rating;
        return Boolean(allMilestonesDone && myReview && theirReview);
    };

    const isTaskToRate = (t: DashboardTask) => {
        const allMilestonesDone = t.milestones?.length > 0 && t.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
        const isDone = t.contract_status === 'Done' || allMilestonesDone;
        const isCompleted = t.contract_status === 'Completed';
        if (isCompleted) return false;

        const isFreelancer = t.user_role?.effective_role
            ? t.user_role.effective_role === 'freelancer'
            : t.freelancer_account_id === user?.account_id;
        const myReview = isFreelancer ? t.freelancer_rating : t.client_rating;
        const hasMyReview = Boolean(myReview && myReview.rating !== null && myReview.rating !== undefined && !isNaN(Number(myReview.rating)));

        return isDone && !hasMyReview;
    };

    const myTasks = tasks.filter(t => (t.user_role?.effective_role === 'freelancer' || (t.freelancer_account_id === user?.account_id && t.user_role?.effective_role !== 'client')) && !computeCompleted(t));
    const toReview = tasks.filter(t => (t.user_role?.effective_role === 'client' || (t.client_account_id === user?.account_id && t.user_role?.effective_role !== 'freelancer')) && !computeCompleted(t));
    const toRateTasks = tasks.filter(t => isTaskToRate(t));
    const archivedTasks = tasks.filter(t => computeCompleted(t));

    // Ratings received from Clients (when current user acted as Freelancer)
    const clientRatingsList = tasks
        .filter(t => (t.user_role?.effective_role === 'freelancer' || t.freelancer_account_id === user?.account_id) && t.client_rating?.rating)
        .map(t => Number(t.client_rating.rating))
        .filter(r => !isNaN(r) && r > 0);
    
    const profileClientCount = Number(profileStats?.freelancer_service_count || 0) + Number(profileStats?.freelancer_job_count || 0);
    const profileClientWeighted = (Number(profileStats?.freelancer_service_rating || 0) * Number(profileStats?.freelancer_service_count || 0)) + 
                                  (Number(profileStats?.freelancer_job_rating || 0) * Number(profileStats?.freelancer_job_count || 0));
    
    const totalClientReviewsCount = profileClientCount > 0 ? profileClientCount : clientRatingsList.length;
    const avgClientRating = profileClientCount > 0
        ? (profileClientWeighted / profileClientCount).toFixed(1)
        : (clientRatingsList.length > 0
            ? (clientRatingsList.reduce((sum, r) => sum + r, 0) / clientRatingsList.length).toFixed(1)
            : '0.0');

    // Ratings received from Freelancers (when current user acted as Client)
    const freelancerRatingsList = tasks
        .filter(t => (t.user_role?.effective_role === 'client' || t.client_account_id === user?.account_id) && t.freelancer_rating?.rating)
        .map(t => Number(t.freelancer_rating.rating))
        .filter(r => !isNaN(r) && r > 0);

    const profileFreelancerCount = Number(profileStats?.client_service_count || 0) + Number(profileStats?.client_job_count || 0);
    const profileFreelancerWeighted = (Number(profileStats?.client_service_rating || 0) * Number(profileStats?.client_service_count || 0)) + 
                                      (Number(profileStats?.client_job_rating || 0) * Number(profileStats?.client_job_count || 0));

    const totalFreelancerReviewsCount = profileFreelancerCount > 0 ? profileFreelancerCount : freelancerRatingsList.length;
    const avgFreelancerRating = profileFreelancerCount > 0
        ? (profileFreelancerWeighted / profileFreelancerCount).toFixed(1)
        : (freelancerRatingsList.length > 0
            ? (freelancerRatingsList.reduce((sum, r) => sum + r, 0) / freelancerRatingsList.length).toFixed(1)
            : '0.0');

    // Overdue Tasks: ongoing/waiting contracts with incomplete milestones past deadline
    const overdueTasks = tasks.filter(t => {
        const statusLower = t.contract_status?.toLowerCase();
        if (statusLower === 'completed' || statusLower === 'done') return false;
        if (!t.milestones || t.milestones.length === 0) return false;

        const now = Date.now();
        return t.milestones.some((m: any) => {
            const isMilestoneDone = m.status === 'completed' || m.status === 'approved';
            if (isMilestoneDone) return false;

            const deadlineDate = m.deadline_at 
                ? new Date(m.deadline_at).getTime() 
                : (m.deadline && !isNaN(new Date(m.deadline).getTime()) ? new Date(m.deadline).getTime() : null);
            return deadlineDate !== null && deadlineDate < now;
        });
    });

    const ongoingCount = [...myTasks, ...toReview].filter(t => t.contract_status === 'Active').length;
    const waitingCount = [...myTasks, ...toReview].filter(t => t.contract_status === 'Waiting' || t.contract_status === 'Pending Signature').length;
    const remainingMilestonesCount = [...myTasks, ...toReview].reduce((sum, t) => {
        return sum + (t.milestones?.filter(m => m.status !== 'completed' && m.status !== 'approved').length || 0);
    }, 0);

    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base">
            {/* Top Header */}
            <UserHeader pageTitle="Dashboard" />
            {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="deliveries and tasks" />}

            {/* Main Content */}
            <div className={`mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in`} data-tour="deliveries-dashboard">
                {/* Banner Title */}
                <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-dark-surface/60 shadow-sm dark:shadow-none p-6 md:p-8 backdrop-blur-xl">
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
                        {(() => {
                            const formattedTimeParts = currentTime.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit', 
                                second: '2-digit', 
                                hour12: true 
                            }).split(/\s+/);
                            const timeDigits = formattedTimeParts[0];
                            const timePeriod = formattedTimeParts[1];

                            return (
                                <div className="flex items-center gap-3.5 bg-white/95 dark:bg-dark-surface/90 border border-gray-200 dark:border-white/10 px-4 py-2.5 rounded-2xl text-gray-700 dark:text-zinc-300 shadow-xs backdrop-blur-md w-max">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-baseline gap-1.5 font-mono">
                                            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                                {timeDigits}
                                            </span>
                                            {timePeriod && (
                                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                                    {timePeriod}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-5 w-px bg-gray-200 dark:bg-white/10" />
                                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-zinc-400">
                                        <Calendar className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                                        <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="border-b border-gray-200 dark:border-white/10 flex gap-1 relative overflow-x-auto w-full max-w-full">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'overview' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4" /> Overview
                            </span>
                            {activeTab === 'overview' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/tasks')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'freelancer' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Briefcase className="h-4 w-4" /> My Tasks
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    activeTab === 'freelancer'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-400'
                                }`}>
                                    {myTasks.length}
                                </span>
                            </span>
                            {activeTab === 'freelancer' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/review')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'client' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <FileSearch className="h-4 w-4" /> To Review
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    activeTab === 'client'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-400'
                                }`}>
                                    {toReview.length}
                                </span>
                            </span>
                            {activeTab === 'client' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/rate')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'rate' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Star className="h-4 w-4" /> To Rate
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    activeTab === 'rate'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-400'
                                }`}>
                                    {toRateTasks.length}
                                </span>
                            </span>
                            {activeTab === 'rate' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/archived')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'archived' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Archive className="h-4 w-4" /> Archived
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    activeTab === 'archived'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                        : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-400'
                                }`}>
                                    {archivedTasks.length}
                                </span>
                            </span>
                            {activeTab === 'archived' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => navigate('/dashboard/flow')}
                            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                                activeTab === 'flow' 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5 rounded-t-lg'
                            }`}
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <HelpCircle className="h-4 w-4" /> Delivery Flow
                            </span>
                            {activeTab === 'flow' && (
                                <>
                                    <motion.div layoutId="dashboardTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-t-lg" transition={{ duration: 0.2, ease: "easeOut" }} />
                                    <motion.div layoutId="dashboardTabUnderline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-blue-500 z-10" transition={{ duration: 0.2, ease: "easeOut" }} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <DashboardSkeletonLoader />
                ) : activeTab === 'overview' ? (
                    <div>
                        {/* Stat Cards - Row 1: Task Activity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-6">
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Ongoing Tasks</p>
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{ongoingCount}</h2>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Upcoming Tasks</p>
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{waitingCount}</h2>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Completed Tasks</p>
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{archivedTasks.length}</h2>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Remaining Milestones</p>
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{remainingMilestonesCount}</h2>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <Layers className="h-5 w-5" />
                                </div>
                            </div>
                        </div>

                        {/* Stat Cards - Row 2: Ratings, Reviews & Deadlines */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Pending for Rating */}
                            <div 
                                onClick={() => navigate('/dashboard/rate')}
                                className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 cursor-pointer transition-all group"
                            >
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Pending for Rating</p>
                                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{toRateTasks.length}</h2>
                                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Awaiting your rating</p>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs group-hover:scale-105 transition-transform">
                                    <Star className="h-5 w-5" />
                                </div>
                            </div>

                            {/* Your total rating from Clients */}
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Rating from Clients</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{avgClientRating}</h2>
                                        <div className="flex items-center text-amber-500">
                                            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                        {totalClientReviewsCount} {totalClientReviewsCount === 1 ? 'review' : 'reviews'} received
                                    </p>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <Award className="h-5 w-5" />
                                </div>
                            </div>

                            {/* Total rating from Freelancers */}
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Rating from Freelancers</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{avgFreelancerRating}</h2>
                                        <div className="flex items-center text-amber-500">
                                            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                        {totalFreelancerReviewsCount} {totalFreelancerReviewsCount === 1 ? 'review' : 'reviews'} received
                                    </p>
                                </div>
                                <div className="bg-gray-100 dark:bg-white/5 p-3 rounded-xl border border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400 shadow-xs">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                            </div>

                            {/* Overdue Tasks */}
                            <div className="bg-white dark:bg-dark-surface/70 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-white/20 transition-all">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">Overdue Tasks</p>
                                    <h2 className={`text-3xl font-extrabold mt-1 tracking-tight ${overdueTasks.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                                        {overdueTasks.length}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                                        {overdueTasks.length > 0 ? 'Milestones past deadline' : 'All on schedule'}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-xl border shadow-xs ${
                                    overdueTasks.length > 0 
                                        ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200/80 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' 
                                        : 'bg-gray-100 dark:bg-white/5 border-gray-200/80 dark:border-white/10 text-gray-600 dark:text-zinc-400'
                                }`}>
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* My Tasks Column */}
                            <div className="bg-white dark:bg-dark-surface/70 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">My Tasks</h3>
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                                            {myTasks.length}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/dashboard/tasks')} 
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-0.5 transition-colors"
                                    >
                                        View all
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {myTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                                        <div className="p-3 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 mb-3">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No active tasks</p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs">
                                            When you are hired for a job or gig, your active tasks will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {myTasks.map(task => {
                                            let computedStatus = task.contract_status;
                                            if (computedStatus === 'Active') computedStatus = 'Ongoing';
                                            if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                                            const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
                                            if (task.contract_status === 'Completed') computedStatus = 'Completed';
                                            else if (allMilestonesDone) computedStatus = 'Done';

                                            const statusBadgeColor = 
                                                computedStatus === 'Completed' || computedStatus === 'Done'
                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold' 
                                                    : computedStatus === 'Ongoing' 
                                                    ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-bold' 
                                                    : computedStatus === 'Waiting'
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold'
                                                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-bold';

                                            const completedCount = task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length || 0;
                                            const totalCount = task.milestones?.length || 0;
                                            const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                            const activeMilestone = task.milestones?.find((m: any) => m.status === 'ongoing' || m.status === 'in_progress' || m.status === 'pending_review' || m.status === 'pending') || task.milestones?.find((m: any) => m.status !== 'completed' && m.status !== 'approved');
                                            const activeMilestoneTitle = task.target_milestone_title || activeMilestone?.title;

                                            return (
                                                <div 
                                                    key={task.contract_id} 
                                                    onClick={() => navigate(`/dashboard/tasks/${task.contract_id}`)}
                                                    className="group bg-white dark:bg-dark-surface/50 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/70 dark:hover:bg-white/5 cursor-pointer transition-all shadow-xs"
                                                >
                                                    {/* Top Row: Title, External link, Badges */}
                                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {task.job_title}
                                                                </h4>
                                                                {task.job_id && (
                                                                    <a 
                                                                        href={task.contract_type === 'gig' ? `/gigs/services/${task.job_id}` : `/jobs/postings/${task.job_id}`} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        onClick={(e) => e.stopPropagation()} 
                                                                        className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0" 
                                                                        title={task.contract_type === 'gig' ? "View Original Gig Post" : "View Original Job Post"}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                                                                {computedStatus}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                                {task.contract_type === 'gig' ? 'Gig' : 'Job'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Middle Row: Client info & Credits */}
                                                    <div className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-zinc-400 mb-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <img 
                                                                src={task.client_avatar 
                                                                        ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}`
                                                                        : "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                                                alt="Client Avatar" 
                                                                className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0"
                                                            />
                                                            <span className="truncate">
                                                                Client: <strong className="font-semibold text-gray-900 dark:text-white">{task.client_name || 'Client'}</strong>
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white shrink-0">
                                                            <img src="/icons/lottie/credit.png" alt="credits" className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            <span>{Number(task.contract_value || 0).toLocaleString()} Credits</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Row: Milestone Progress Bar + Ratio / Active Title */}
                                                    <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <span className="text-gray-500 dark:text-zinc-400 font-medium truncate max-w-[220px]">
                                                                {activeMilestoneTitle ? (
                                                                    <span>Phase: <span className="text-gray-800 dark:text-zinc-200 font-semibold">{activeMilestoneTitle}</span></span>
                                                                ) : (
                                                                    <span>Milestones</span>
                                                                )}
                                                            </span>
                                                            <span className="font-mono font-bold text-gray-700 dark:text-zinc-300 shrink-0">
                                                                {completedCount}/{totalCount} ({progressPercentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex overflow-hidden">
                                                            {task.milestones?.map((m: any, idx: number) => (
                                                                <div 
                                                                    key={m.id || idx} 
                                                                    className={`h-full flex-1 ${idx !== 0 ? 'border-l border-white dark:border-[#0d0f1a]' : ''} ${m.status === 'completed' || m.status === 'approved' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-transparent'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* To Review Column */}
                            <div className="bg-white dark:bg-dark-surface/70 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">To Review</h3>
                                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                                            {toReview.length}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/dashboard/review')} 
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-0.5 transition-colors"
                                    >
                                        View all
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {toReview.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-gray-50/50 dark:bg-white/[0.02]">
                                        <div className="p-3 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 mb-3">
                                            <FileSearch className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No tasks to review</p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-xs">
                                            Contracts you've created where freelancers are working will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {toReview.map(task => {
                                            let computedStatus = task.contract_status;
                                            if (computedStatus === 'Active') computedStatus = 'Ongoing';
                                            if (computedStatus === 'Waiting' || computedStatus === 'Pending Signature') computedStatus = 'Waiting';
                                            const allMilestonesDone = task.milestones?.length > 0 && task.milestones.every((m: any) => m.status === 'completed' || m.status === 'approved');
                                            if (task.contract_status === 'Completed') computedStatus = 'Completed';
                                            else if (allMilestonesDone) computedStatus = 'Done';

                                            const statusBadgeColor = 
                                                computedStatus === 'Completed' || computedStatus === 'Done'
                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold' 
                                                    : computedStatus === 'Ongoing' 
                                                    ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-bold' 
                                                    : computedStatus === 'Waiting'
                                                    ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold'
                                                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-bold';

                                            const completedCount = task.milestones?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length || 0;
                                            const totalCount = task.milestones?.length || 0;
                                            const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                            const pendingReviewMilestone = task.milestones?.find((m: any) => m.status === 'pending_review');
                                            const activeMilestone = pendingReviewMilestone || task.milestones?.find((m: any) => m.status === 'ongoing' || m.status === 'in_progress' || m.status === 'pending') || task.milestones?.find((m: any) => m.status !== 'completed' && m.status !== 'approved');
                                            const activeMilestoneTitle = task.target_milestone_title || activeMilestone?.title;

                                            return (
                                                <div 
                                                    key={task.contract_id} 
                                                    onClick={() => navigate(`/dashboard/review/${task.contract_id}`)}
                                                    className="group bg-white dark:bg-dark-surface/50 p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/70 dark:hover:bg-white/5 cursor-pointer transition-all shadow-xs"
                                                >
                                                    {/* Top Row: Title, External link, Badges */}
                                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                    {task.job_title}
                                                                </h4>
                                                                {task.job_id && (
                                                                    <a 
                                                                        href={task.contract_type === 'gig' ? `/gigs/services/${task.job_id}` : `/jobs/postings/${task.job_id}`} 
                                                                        target="_blank" 
                                                                        rel="noreferrer" 
                                                                        onClick={(e) => e.stopPropagation()} 
                                                                        className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0" 
                                                                        title={task.contract_type === 'gig' ? "View Original Gig Post" : "View Original Job Post"}
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
                                                                {computedStatus}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                                                {task.contract_type === 'gig' ? 'Gig' : 'Job'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Middle Row: Freelancer info & Credits */}
                                                    <div className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-zinc-400 mb-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <img 
                                                                src={task.freelancer_avatar 
                                                                        ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}`
                                                                        : "https://i.pravatar.cc/150?u=a042581f4e29026704d"}
                                                                alt="Freelancer Avatar" 
                                                                className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0"
                                                            />
                                                            <span className="truncate">
                                                                Freelancer: <strong className="font-semibold text-gray-900 dark:text-white">{task.freelancer_name || 'Freelancer'}</strong>
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white shrink-0">
                                                            <img src="/icons/lottie/credit.png" alt="credits" className="w-3.5 h-3.5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            <span>{Number(task.contract_value || 0).toLocaleString()} Credits</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Row: Milestone Progress Bar + Ratio / Pending Review or Active Title */}
                                                    <div className="pt-2.5 border-t border-gray-100 dark:border-white/5 flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[11px]">
                                                            <span className="text-gray-500 dark:text-zinc-400 font-medium truncate max-w-[220px]">
                                                                {pendingReviewMilestone ? (
                                                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Review Pending: {pendingReviewMilestone.title}</span>
                                                                ) : activeMilestoneTitle ? (
                                                                    <span>Phase: <span className="text-gray-800 dark:text-zinc-200 font-semibold">{activeMilestoneTitle}</span></span>
                                                                ) : (
                                                                    <span>Milestones</span>
                                                                )}
                                                            </span>
                                                            <span className="font-mono font-bold text-gray-700 dark:text-zinc-300 shrink-0">
                                                                {completedCount}/{totalCount} ({progressPercentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full flex overflow-hidden">
                                                            {task.milestones?.map((m: any, idx: number) => (
                                                                <div 
                                                                    key={m.id || idx} 
                                                                    className={`h-full flex-1 ${idx !== 0 ? 'border-l border-white dark:border-[#0d0f1a]' : ''} ${m.status === 'completed' || m.status === 'approved' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-transparent'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'flow' ? (
                    <DeliveryFlowGuide />
                ) : (
                    <DashboardTaskList 
                        tasks={
                            activeTab === 'freelancer' 
                                ? myTasks 
                                : activeTab === 'client' 
                                ? toReview 
                                : activeTab === 'rate'
                                ? toRateTasks
                                : archivedTasks
                        } 
                        isFreelancerTab={activeTab === 'freelancer' || (activeTab === 'archived' && false)} 
                        isArchivedTab={activeTab === 'archived'}
                        isRateTab={activeTab === 'rate'}
                        currentUserAccountId={user?.account_id}
                        onOpenRateReview={(id, name, value, role, avatar) => {
                            setReviewTarget({ id, name, value, isFreelancerRole: role, avatar: avatar || '' });
                            setReviewModalOpen(true);
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
                reviewTargetAvatar={reviewTarget.avatar}
                reviewTargetRole={reviewTarget.isFreelancerRole ? 'client' : 'freelancer'}
                isFreelancerRole={reviewTarget.isFreelancerRole}
                contractValue={reviewTarget.value}
                onSuccess={() => fetchTasks()}
            />
        </div>
    );
};

export default DashboardMain;
