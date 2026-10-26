import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  FileText,
  FileCheck,
  Film,
  Flag,
  Info,
  Kanban,
  Layers,
  Lock,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import api from '@/lib/axios';
import UserHeader from '@/components/nav/user_header';
import useGlobalState from '@/lib/global_state';
import socket from '@/lib/socket';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { ProjectTaskboardTab } from './ProjectTaskboardTab';
import { ProjectVideoTab } from './ProjectVideoTab';
import { ProjectSubmissionsTab } from './ProjectSubmissionsTab';
import { ProjectInfoTab } from './ProjectInfoTab';
import { ProjectContractAndMembersTab } from './ProjectContractAndMembersTab';
import { ProjectHistoryTab } from './ProjectHistoryTab';
import { ProjectChatTab } from './ProjectChatTab';
import ReportTeamModal from '../team_modals/ReportTeamModal';
import { RateReviewModal } from '@/pages/user/8_dashboard/dashboard_components/RateReviewModal';

type TabType = 'overview' | 'taskboard' | 'project' | 'submissions' | 'info' | 'contract' | 'history' | 'chat';

export const TeamProjectWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setIsFloatingChatHidden } = useGlobalState();
  const currentUserAccountId = user?.account_id || user?.id || '';

  const rawTab = searchParams.get('tab');
  const initialTab: TabType =
    rawTab === 'info'
      ? 'info'
      : rawTab === 'members' || rawTab === 'contract'
      ? 'contract'
      : rawTab === 'submissions' || rawTab === 'submission'
      ? 'submissions'
      : rawTab === 'project' || rawTab === 'video'
      ? 'project'
      : ((rawTab as TabType) || 'overview');
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Hide global floating chat widget when the in-workspace Chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      setIsFloatingChatHidden(true);
      return () => {
        setIsFloatingChatHidden(false);
      };
    } else {
      setIsFloatingChatHidden(false);
    }
  }, [activeTab, setIsFloatingChatHidden]);

  const [project, setProject] = useState<any>(null);
  const [taskboardTasks, setTaskboardTasks] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const milestone1Timeline = useMemo(() => {
    if (!milestones || milestones.length === 0) return null;
    const m1 = milestones.find((m: any) => Number(m.order_index) === 0) || milestones[0];
    if (!m1) return null;

    const status = String(m1.milestone_status || '').toLowerCase();
    const isClaimed = status === 'claimed' || status === 'approved' || status === 'completed';

    let targetDate: Date | null = null;
    if (m1.deadline_at) {
      const d = new Date(m1.deadline_at);
      if (!isNaN(d.getTime())) targetDate = d;
    }
    if (!targetDate && m1.duration_hours) {
      const startRef = m1.started_at || m1.contract_starts_at || project?.created_at;
      if (startRef) {
        const d = new Date(startRef);
        if (!isNaN(d.getTime())) {
          targetDate = new Date(d.getTime() + Number(m1.duration_hours) * 3600000);
        }
      }
    }
    if (!targetDate && m1.contract_overall_deadline) {
      const d = new Date(m1.contract_overall_deadline);
      if (!isNaN(d.getTime())) targetDate = d;
    }

    const startRef = m1.started_at || m1.contract_starts_at || project?.created_at;
    let range: string | null = null;
    if (targetDate) {
      const endStr = targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (startRef) {
        const s = new Date(startRef);
        if (!isNaN(s.getTime())) {
          const startStr = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          range = `${startStr} – ${endStr}`;
        }
      }
      if (!range) range = `Due ${endStr}`;
    }

    if (isClaimed) {
      return {
        range,
        countdown: 'Completed',
        isClaimed: true,
        isExpired: false,
      };
    }

    if (!targetDate) {
      return {
        range: null,
        countdown: m1.duration_hours ? `${m1.duration_hours}h duration` : 'In Progress',
        isClaimed: false,
        isExpired: false,
      };
    }

    const diff = targetDate.getTime() - now;
    if (diff <= 0) {
      return {
        range,
        countdown: '00:00:00 (Overdue)',
        isClaimed: false,
        isExpired: true,
      };
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const countdown = days > 0
      ? `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      : `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

    return {
      range,
      countdown,
      isClaimed: false,
      isExpired: false,
    };
  }, [milestones, project, now]);

  // Collapsible banner state
  const [isBannerCollapsed, setIsBannerCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ensemble_team_project_banner_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBannerCollapse = () => {
    setIsBannerCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ensemble_team_project_banner_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const [rateModalConfig, setRateModalConfig] = useState<{
    isOpen: boolean;
    contractId: string;
    targetName: string;
  }>({
    isOpen: false,
    contractId: '',
    targetName: '',
  });

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadProjectData = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setIsLoading(true);
      const [projRes, tasksRes, contractsRes, historyRes, membersRes, milestonesRes, videoProjectsRes] = await Promise.all([
        api.get(`/api/team-projects/${id}`),
        api.get(`/api/team-projects/${id}/taskboard`),
        api.get(`/api/team-projects/${id}/contracts`),
        api.get(`/api/team-projects/${id}/history`),
        api.get(`/api/team-projects/${id}/members`),
        api.get(`/api/team-projects/${id}/milestones`),
        api.get(`/api/team-projects/${id}/video-projects`).catch(() => ({ data: { data: [] } })),
      ]);

      const pData = projRes.data?.data;
      setProject(pData);
      setEditTitle(pData?.project_title || '');
      setEditDescription(pData?.project_description || '');

      setTaskboardTasks(tasksRes.data?.data || []);
      setContracts(contractsRes.data?.data || []);
      setHistory(historyRes.data?.data || []);
      setMembers(membersRes.data?.data || []);
      setMilestones(milestonesRes.data?.data || []);
      setLinkedProjects(videoProjectsRes.data?.data || []);
    } catch (err: any) {
      console.error('Error loading team project workspace:', err);
      showErrorToast(err?.response?.data?.message || 'Failed to load project workspace');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  // Real-time synchronization for milestone submits, approvals, and revisions
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleRealtimeRefresh = () => {
      loadProjectData(true);
    };

    socket.on('dashboardTaskUpdated', handleRealtimeRefresh);
    socket.on('teamTaskWorkspaceUpdated', handleRealtimeRefresh);
    socket.on('milestoneStatusUpdated', handleRealtimeRefresh);
    socket.on('milestone_status_updated', handleRealtimeRefresh);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadProjectData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadProjectData(true);
      }
    }, 8000);

    return () => {
      socket.off('dashboardTaskUpdated', handleRealtimeRefresh);
      socket.off('teamTaskWorkspaceUpdated', handleRealtimeRefresh);
      socket.off('milestoneStatusUpdated', handleRealtimeRefresh);
      socket.off('milestone_status_updated', handleRealtimeRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, [loadProjectData]);

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.team_id) return;
    setIsSubmittingEdit(true);
    try {
      await api.patch(`/api/team-projects/${project.team_id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      showSuccessToast('Project updated successfully');
      setIsEditModalOpen(false);
      loadProjectData();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to update project');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project?.team_id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/team-projects/${project.team_id}`);
      showSuccessToast('Team project deleted');
      navigate('/dashboard/tasks');
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReportTeam = async (reason: string, description: string) => {
    if (!project?.team_id) return;
    try {
      await api.post(`/api/team-projects/${project.team_id}/report`, {
        category: reason,
        description,
      });
      showSuccessToast('Report submitted to moderation');
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || 'Failed to submit report');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-dark-base text-zinc-900 dark:text-white flex flex-col">
        <UserHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-36 space-y-6">
          {/* Navigation Skeleton */}
          <div className="flex items-center justify-between">
            <div className="w-32 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="w-44 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>

          {/* Banner Card Skeleton */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="h-44 w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-72 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div className="flex items-center gap-2">
                  <div className="w-28 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                  <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="w-24 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                <div className="w-36 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-zinc-200 dark:border-zinc-800 px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-24 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse shrink-0" />
              ))}
            </div>
          </div>

          {/* Metrics & Content Skeletons */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="w-24 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                    <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                  </div>
                  <div className="w-32 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="w-16 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                  <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-48 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                    <div className="w-36 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                  </div>
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                          <div className="w-48 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md animate-pulse" />
                        </div>
                        <div className="w-28 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                      </div>
                      <div className="w-full h-12 bg-zinc-100 dark:bg-zinc-900/50 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="w-32 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="space-y-1.5 flex-1">
                      <div className="w-28 h-4 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                      <div className="w-20 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-dark-base flex flex-col">
        <UserHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <Lock className="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Project Not Found or Unauthorized
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This contractual team project workspace is only accessible to the client and contracted team contributors.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => navigate('/teams')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Teams
              </button>
              <button
                onClick={() => navigate('/dashboard/tasks')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition shadow-xs cursor-pointer"
              >
                <span>Deliveries</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isClient = Boolean(project.is_client);
  const isArchived = Boolean(project.is_archived);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-dark-base text-zinc-900 dark:text-white flex flex-col">
      <UserHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-36 space-y-6">
        {/* Navigation & Breadcrumbs: Return to Teams + Go to Deliveries */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate('/teams')}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Teams</span>
          </button>

          <div className="flex items-center gap-2.5">
            {isArchived && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800">
                <Lock className="w-3.5 h-3.5" />
                Archived (Contract Finished)
              </span>
            )}

            <button
              onClick={() => navigate('/dashboard/tasks')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition shadow-2xs cursor-pointer"
            >
              <span>Go to Deliveries & Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Project Header Banner Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden transition-all duration-300">
          {/* Top banner visual (Collapsible) */}
          <div
            className={`w-full bg-zinc-900 dark:bg-zinc-950 relative overflow-hidden transition-all duration-300 ease-in-out ${
              isBannerCollapsed ? 'max-h-0 opacity-0' : 'h-36 sm:h-48 opacity-100'
            }`}
          >
            {project.thumbnail_path ? (
              <img
                src={constructAvatarUrl(project.thumbnail_path, project.project_title)}
                alt={project.project_title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(project.project_title);
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 dark:bg-zinc-900 flex items-center justify-center">
                <Briefcase className="w-16 h-16 text-zinc-600 dark:text-zinc-700" />
              </div>
            )}
          </div>

          {/* Header Metadata */}
          <div className={`transition-all duration-300 ${isBannerCollapsed ? 'p-4 sm:px-6' : 'p-5 sm:p-6'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {isBannerCollapsed && (
                  project.thumbnail_path ? (
                    <img
                      src={constructAvatarUrl(project.thumbnail_path, project.project_title)}
                      alt={project.project_title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getFallbackAvatarUrl(project.project_title);
                      }}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-zinc-500" />
                    </div>
                  )
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">
                  {project.project_title || project.job_title}
                </h1>
              </div>

              {/* Action Buttons: Collapse Banner toggle + 3-dot Actions Menu */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleBannerCollapse}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer"
                  title={isBannerCollapsed ? 'Expand banner' : 'Collapse banner'}
                >
                  {isBannerCollapsed ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Expand Banner</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="hidden sm:inline">Collapse Banner</span>
                    </>
                  )}
                </button>

                {/* 3-dot Actions Menu */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsActionMenuOpen((prev) => !prev)}
                    className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition cursor-pointer"
                    title="More actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                {isActionMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsActionMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      {isClient ? (
                        <>
                          <button
                            onClick={() => {
                              setIsActionMenuOpen(false);
                              setIsEditModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-left"
                          >
                            <Edit3 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            <span>Edit Project</span>
                          </button>

                          <button
                            onClick={() => {
                              setIsActionMenuOpen(false);
                              setIsDeleteModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Project</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setIsActionMenuOpen(false);
                            setIsReportModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report Team Project</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

            {/* 3 Tags under Team Name */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Active Workspace: Green */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isArchived
                    ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isArchived ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                {isArchived ? 'Archived Workspace' : 'Active Workspace'}
              </span>

              {/* Category tag: Gray */}
              {project.job_category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                  {project.job_category}
                </span>
              )}

              {/* Role tag: Gray */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {isClient ? 'Client (Project Owner)' : `Contributor (${project.user_role || 'Freelancer'})`}
              </span>

              {/* Milestone 1 Timeline & Countdown Pill */}
              {milestone1Timeline && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-mono">
                  <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-sans">
                    Milestone 1:
                  </span>
                  {milestone1Timeline.range && (
                    <span className="text-zinc-600 dark:text-zinc-400 font-sans">
                      {milestone1Timeline.range}
                    </span>
                  )}
                  {milestone1Timeline.range && (
                    <span className="text-zinc-400 dark:text-zinc-600 font-sans">•</span>
                  )}
                  <span className={`font-bold ${milestone1Timeline.isClaimed ? 'text-emerald-600 dark:text-emerald-400' : milestone1Timeline.isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>
                    {milestone1Timeline.countdown}
                  </span>
                </span>
              )}
            </div>

            {/* Read-only Archived Banner */}
            {isArchived && (
              <div className="mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>
                  All contractual milestones and payouts for this team project have been fully approved. The project is now preserved in read-only archived status.
                </span>
              </div>
            )}
          </div>

          {/* Navigation Tabs (Single Clean Unified Row) */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex items-center overflow-x-auto scrollbar-none px-4 sm:px-6">
              {[
                { id: 'overview' as TabType, label: 'Overview', icon: FileText },
                { id: 'taskboard' as TabType, label: 'Taskboard', icon: Kanban, badge: taskboardTasks.length },
                {
                  id: 'submissions' as TabType,
                  label: 'Submissions',
                  icon: FileCheck,
                  badge: milestones.filter(
                    (m) => String(m.milestone_status || '').toLowerCase() === 'submitted_for_review'
                  ).length,
                },
                { id: 'chat' as TabType, label: 'Chat', icon: MessageCircle },
                {
                  id: 'project' as TabType,
                  label: 'Video Projects',
                  icon: Film,
                  badge: linkedProjects.length > 0 ? linkedProjects.length : undefined,
                },
                { id: 'contract' as TabType, label: 'Contract & Members', icon: Briefcase, badge: members.length },
                { id: 'history' as TabType, label: 'History', icon: Clock, badge: history.length },
                { id: 'info' as TabType, label: 'Project Info', icon: Info },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 py-3 px-3.5 sm:px-4 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-zinc-900'
                        : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content Rendering */}
        <div className="pt-2">
          {activeTab === 'overview' && (
            <ProjectOverviewTab
              project={project}
              taskboardTasks={taskboardTasks}
              contracts={contracts}
              members={members}
              milestones={milestones}
              onSelectTab={handleTabChange}
              onOpenRateModal={(contractId, targetName) => {
                setRateModalConfig({
                  isOpen: true,
                  contractId,
                  targetName,
                });
              }}
            />
          )}

          {activeTab === 'taskboard' && (
            <ProjectTaskboardTab
              teamId={project.team_id}
              tasks={taskboardTasks}
              videoProjects={linkedProjects}
              currentUserAccountId={currentUserAccountId}
              isClient={isClient}
              members={members}
              contracts={contracts}
              milestones={milestones}
              onTasksUpdated={(silent?: boolean) => loadProjectData(silent)}
              projectTitle={project.project_title || project.job_title}
            />
          )}

          {activeTab === 'project' && (
            <ProjectVideoTab
              teamId={project.team_id}
              isClient={isClient}
              currentUserAccountId={currentUserAccountId}
              workspaceTitle={project.project_title || project.job_title}
              onRefreshWorkspace={() => loadProjectData(true)}
            />
          )}

          {activeTab === 'submissions' && (
            <ProjectSubmissionsTab
              teamId={project.team_id}
              milestones={milestones}
              contracts={contracts}
              tasks={taskboardTasks}
              videoProjects={linkedProjects}
              currentUserAccountId={currentUserAccountId}
              isClient={isClient}
              onUpdated={(silent?: boolean) => loadProjectData(silent)}
              onNavigateTab={handleTabChange}
            />
          )}

          {activeTab === 'info' && (
            <ProjectInfoTab
              project={project}
              contracts={contracts}
              members={members}
              milestones={milestones}
            />
          )}

          {activeTab === 'contract' && (
            <ProjectContractAndMembersTab
              teamId={project.team_id}
              contracts={contracts}
              members={members}
              currentUserAccountId={currentUserAccountId}
              isClient={isClient}
              milestones={milestones}
              defaultSubTab={searchParams.get('tab') === 'members' ? 'members' : 'contracts'}
              onContractsUpdated={loadProjectData}
              onOpenRateModal={(contractId, targetName) => {
                setRateModalConfig({
                  isOpen: true,
                  contractId,
                  targetName,
                });
              }}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {activeTab === 'history' && <ProjectHistoryTab history={history} />}

          {activeTab === 'chat' && (
            <ProjectChatTab
              teamId={project.team_id}
              currentUserAccountId={currentUserAccountId}
              members={members}
            />
          )}
        </div>
      </main>

      {/* EDIT PROJECT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Edit Project Details
            </h3>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Project Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-rose-600">
              Delete Team Project Workspace?
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete this team project workspace? Existing contracted payouts and job records will remain in the transaction history.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteProject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT TEAM MODAL */}
      <ReportTeamModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        teamName={project.project_title || 'Team Project'}
        onSubmit={handleReportTeam}
      />

      {/* RATE & REVIEW MODAL */}
      {rateModalConfig.isOpen && (
        <RateReviewModal
          isOpen={rateModalConfig.isOpen}
          onClose={() => setRateModalConfig({ isOpen: false, contractId: '', targetName: '' })}
          contractId={rateModalConfig.contractId}
          reviewTargetName={rateModalConfig.targetName}
          isFreelancerRole={!isClient}
          onSuccess={() => {
            showSuccessToast('Rating and feedback submitted successfully!');
            setRateModalConfig({ isOpen: false, contractId: '', targetName: '' });
            loadProjectData();
          }}
        />
      )}
    </div>
  );
};

export default TeamProjectWorkspace;