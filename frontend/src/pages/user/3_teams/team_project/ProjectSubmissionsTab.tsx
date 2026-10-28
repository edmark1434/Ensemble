import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Film,
  Flag,
  HelpCircle,
  History,
  Info,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useGlobalState from '@/lib/global_state';
import {
  chatAttachmentUrl,
  useInboxUploadMedia,
} from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import socket from '@/lib/socket';
import {
  SubmissionProgressModal,
  formatBytes,
  type SubmissionProgressModalState,
  type ProgressFileItem,
} from '@/components/ui/SubmissionProgressModal';
import type { TaskItem } from './ProjectTaskboardTab';

interface SubmissionItem {
  id?: string;
  message?: string;
  attachments?: string[];
  status?: string;
  submitted_at?: string;
  responded_at?: string;
}

interface MilestoneData {
  job_milestone_id: string;
  milestone_title: string;
  milestone_description?: string;
  order_index: number;
  budget_credits: number;
  duration_hours?: number;
  contract_id?: string;
  contract_milestone_id?: string;
  milestone_status?: string;
  contract_status?: string;
  deadline_at?: string;
  assignee_account_id?: string;
  assignee_name?: string;
  assignee_handle?: string;
  assignee_avatar_path?: string;
  no_of_revisions_max?: number;
  revisions_used?: number;
  revision_price_credits?: number;
  submissions?: SubmissionItem[];
  is_current?: boolean;
  is_upcoming?: boolean;
  is_locked?: boolean;
}

interface ProjectSubmissionsTabProps {
  teamId: string;
  milestones: MilestoneData[];
  contracts: any[];
  tasks?: TaskItem[];
  videoProjects?: any[];
  currentUserAccountId: string;
  isClient: boolean;
  onUpdated: (silent?: boolean) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProjectSubmissionsTab: React.FC<ProjectSubmissionsTabProps> = ({
  teamId,
  milestones,
  contracts,
  tasks,
  videoProjects,
  currentUserAccountId,
  isClient,
  onUpdated,
  onNavigateTab,
}) => {
  const { user } = useGlobalState();
  const myAccountId = currentUserAccountId || user?.account_id || user?.id || '';

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(() => {
    // Default to the first current or under-review milestone, or the first one
    const active = milestones.find(
      (m) =>
        m.milestone_status === 'submitted_for_review' ||
        m.milestone_status === 'in_progress' ||
        m.milestone_status === 'active' ||
        m.is_current
    );
    return active?.job_milestone_id || milestones[0]?.job_milestone_id || null;
  });

  // Auto-resolve initial selected milestone if initially unselected
  useEffect(() => {
    if (!selectedMilestoneId && milestones.length > 0) {
      const active = milestones.find(
        (m) =>
          m.milestone_status === 'submitted_for_review' ||
          m.milestone_status === 'in_progress' ||
          m.milestone_status === 'active' ||
          m.is_current
      );
      setSelectedMilestoneId(active?.job_milestone_id || milestones[0]?.job_milestone_id || null);
    }
  }, [milestones, selectedMilestoneId]);

  // Real-time synchronization for milestone submissions and revisions
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleRealtimeRefresh = () => {
      onUpdated(true);
    };

    socket.on('dashboardTaskUpdated', handleRealtimeRefresh);
    socket.on('teamTaskWorkspaceUpdated', handleRealtimeRefresh);
    socket.on('milestoneStatusUpdated', handleRealtimeRefresh);
    socket.on('milestone_status_updated', handleRealtimeRefresh);

    return () => {
      socket.off('dashboardTaskUpdated', handleRealtimeRefresh);
      socket.off('teamTaskWorkspaceUpdated', handleRealtimeRefresh);
      socket.off('milestoneStatusUpdated', handleRealtimeRefresh);
      socket.off('milestone_status_updated', handleRealtimeRefresh);
    };
  }, [onUpdated]);

  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);

  // Switch selected milestone and reset transient input states
  const handleSelectMilestone = (id: string) => {
    setSelectedMilestoneId(id);
    setIsDetailsCollapsed(false);
    setReviewAction(null);
    setReviewNote('');
    setSubmissionMessage('');
    setSubmissionLink('');
    setSelectedVideoProjectId('');
    clearMedia();
    setShowAdditionalSubmitFormMap((prev) => ({ ...prev, [id]: false }));
  };

  const toggleExpand = () => {
    setIsDetailsCollapsed((prev) => !prev);
  };

  // Additional Deliverable Update Form Toggle State (mapped by milestone ID)
  const [showAdditionalSubmitFormMap, setShowAdditionalSubmitFormMap] = useState<Record<string, boolean>>({});

  // Submission History Modal Popup State
  const [historyModalMilestoneId, setHistoryModalMilestoneId] = useState<string | null>(null);

  // Expanded Media / Document Preview Popup Modal State
  const [expandedMedia, setExpandedMedia] = useState<{
    url: string;
    type: 'image' | 'video' | 'pdf' | 'doc';
    name?: string;
  } | null>(null);

  // Contributor Submit Form State
  const EDITOR_URL = (import.meta.env.VITE_EDITOR_URL || 'http://localhost:3000').replace(/\/$/, '');
  const [workspaceVideoProjects, setWorkspaceVideoProjects] = useState<any[]>(videoProjects || []);
  const [selectedVideoProjectId, setSelectedVideoProjectId] = useState<string>('');
  const [deliverableType, setDeliverableType] = useState<'video_project' | 'external_link'>('video_project');

  useEffect(() => {
    if (videoProjects && videoProjects.length > 0) {
      setWorkspaceVideoProjects(videoProjects);
    } else if (teamId) {
      api.get(`/api/team-projects/${teamId}/video-projects`)
        .then((res) => setWorkspaceVideoProjects(res.data?.data || []))
        .catch(() => {});
    }
  }, [videoProjects, teamId]);

  useEffect(() => {
    if (workspaceVideoProjects.length === 0) {
      setDeliverableType('external_link');
    } else if (!selectedVideoProjectId) {
      setDeliverableType('video_project');
    }
  }, [workspaceVideoProjects.length]);

  const handleOpenVideoProject = async (projectId: string) => {
    try {
      const { data } = await api.get('/api/editor/handoff-token');
      const handoffToken = data?.handoffToken;
      const targetUrl = handoffToken
        ? `${EDITOR_URL}/editor/${projectId}?token=${encodeURIComponent(handoffToken)}`
        : `${EDITOR_URL}/editor/${projectId}`;
      window.open(targetUrl, '_blank');
    } catch (err) {
      console.error('Failed to get editor handoff token:', err);
      window.open(`${EDITOR_URL}/editor/${projectId}`, '_blank');
    }
  };

  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [isReadyForReview, setIsReadyForReview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadModalState, setUploadModalState] = useState<SubmissionProgressModalState | null>(null);

  // Deliverable Media / File Uploads
  const {
    mediaList,
    removeMedia,
    clearMedia,
    openFilePicker,
    handleFileChange,
    fileInputRef,
  } = useInboxUploadMedia(5);

  // Client Review Form State ('approval' | 'revision_request')
  const [reviewAction, setReviewAction] = useState<'approval' | 'revision_request' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Helper to render attachment links & file chips (opens preview popup for media/pdf)
  const renderAttachmentChip = (att: string, aIdx: number) => {
    if (att.startsWith('video_project:')) {
      const parts = att.split(':');
      const vProjectId = parts[1];
      const vProjectName = decodeURIComponent(parts.slice(2).join(':')) || 'Workspace Video Project';

      return (
        <button
          key={aIdx}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleOpenVideoProject(vProjectId);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-950 dark:text-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 transition shadow-2xs group cursor-pointer"
          title="Open video project directly in collaborative editor"
        >
          <Film className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="truncate max-w-[220px] font-bold">{vProjectName}</span>
          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded">
            Editor
          </span>
          <ExternalLink className="w-3 h-3 text-purple-400 shrink-0" />
        </button>
      );
    }

    const isHttp = /^https?:\/\//i.test(att);
    const resolvedUrl = chatAttachmentUrl(att);
    const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att);
    const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(att);
    const isPdf = /\.pdf(\?.*)?$/i.test(att);
    const isDoc = /\.(docx?|xlsx?|pptx?|zip|txt)(\?.*)?$/i.test(att);

    let displayName = att;
    if (!isHttp) {
      const rawName = att.split('/').pop() || `Attachment #${aIdx + 1}`;
      displayName = rawName.replace(/^\d+[-_]/, '');
    }

    const mediaType = isImage ? 'image' : isVideo ? 'video' : isPdf ? 'pdf' : isDoc ? 'doc' : null;

    if (mediaType) {
      return (
        <button
          key={aIdx}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpandedMedia({
              url: resolvedUrl,
              type: mediaType,
              name: displayName,
            });
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition shadow-2xs group cursor-pointer"
        >
          {isImage ? (
            <FileText className="w-3.5 h-3.5 text-blue-500" />
          ) : isVideo ? (
            <Film className="w-3.5 h-3.5 text-purple-500" />
          ) : isPdf ? (
            <FileText className="w-3.5 h-3.5 text-rose-500" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
          )}
          <span className="truncate max-w-[220px]">{displayName}</span>
          <span className="text-[10px] text-zinc-400 font-normal">Preview</span>
        </button>
      );
    }

    return (
      <a
        key={aIdx}
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition shadow-2xs group"
      >
        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
        <span className="truncate max-w-[220px]">{displayName}</span>
        <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
      </a>
    );
  };

  // Switch to Team Workspace Channel chat with milestone context indicator
  const handleSendFeedbackInChat = (m: MilestoneData, mIdx: number) => {
    const prefill = `💬 Regarding M${mIdx + 1} Deliverable (${m.milestone_title}): `;
    sessionStorage.setItem('team_chat_prefill', prefill);
    if (onNavigateTab) {
      onNavigateTab('chat');
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('tab', 'chat');
      window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // Check if current user is the assignee of the milestone
  const isMilestoneAssignee = (m: MilestoneData) => {
    if (!myAccountId || !m.assignee_account_id) return false;
    return String(m.assignee_account_id).trim() === String(myAccountId).trim();
  };

  // Contributor submits deliverable
  const handleDeliverableSubmit = async (m: MilestoneData) => {
    if (!m.contract_id || !m.contract_milestone_id) {
      showErrorToast('Milestone is not attached to an active contract yet.');
      return;
    }

    const messageText = submissionMessage.trim();
    const linkText = submissionLink.trim();

    if (!messageText && !linkText && !selectedVideoProjectId && mediaList.length === 0) {
      showErrorToast('Please enter deliverable notes, select a video project, attach files, or provide a link to your work.');
      return;
    }

    const initialFiles: ProgressFileItem[] = mediaList.map((media) => ({
      name: media.file.name,
      size: media.file.size,
      progress: 0,
      status: 'pending',
    }));

    const totalBytes = initialFiles.reduce((acc, f) => acc + f.size, 0);

    setIsSubmitting(true);
    setUploadModalState({
      isOpen: true,
      title: isReadyForReview ? 'Submitting Deliverable for Review' : 'Sending Progress Update',
      statusText: initialFiles.length > 0 ? 'Preparing files for upload...' : 'Connecting to submission server...',
      progress: initialFiles.length > 0 ? 0 : 25,
      totalBytes,
      transferredBytes: 0,
      files: initialFiles,
      stage: initialFiles.length > 0 ? 'uploading' : 'submitting',
    });

    try {
      let uploadedKeys: string[] = [];

      if (mediaList.length > 0) {
        const loadedBytesPerFile = new Array(mediaList.length).fill(0);

        const uploadPromises = mediaList.map(async (media, idx) => {
          setUploadModalState((prev) => {
            if (!prev) return prev;
            const newFiles = [...prev.files];
            if (newFiles[idx]) {
              newFiles[idx] = { ...newFiles[idx], status: 'uploading' };
            }
            return { ...prev, files: newFiles };
          });

          const { key } = await uploadFileWithIntent(media.file, 'documents', (loaded) => {
            loadedBytesPerFile[idx] = loaded;
            const currentTotalTransferred = loadedBytesPerFile.reduce((a, b) => a + b, 0);
            const filePct = Math.min(100, Math.round((loaded / Math.max(1, media.file.size)) * 100));
            // 0% - 85% allocated to byte uploads
            const overallPct = totalBytes > 0
              ? Math.min(85, Math.round((currentTotalTransferred / totalBytes) * 85))
              : 50;

            setUploadModalState((prev) => {
              if (!prev) return prev;
              const newFiles = [...prev.files];
              if (newFiles[idx]) {
                newFiles[idx] = {
                  ...newFiles[idx],
                  progress: filePct,
                  status: filePct >= 100 ? 'completed' : 'uploading',
                };
              }
              return {
                ...prev,
                statusText: `Uploading ${media.file.name} (${formatBytes(currentTotalTransferred)} of ${formatBytes(totalBytes)})...`,
                transferredBytes: currentTotalTransferred,
                progress: overallPct,
                files: newFiles,
                stage: 'uploading',
              };
            });
          });

          setUploadModalState((prev) => {
            if (!prev) return prev;
            const newFiles = [...prev.files];
            if (newFiles[idx]) {
              newFiles[idx] = { ...newFiles[idx], progress: 100, status: 'completed' };
            }
            return { ...prev, files: newFiles };
          });

          return key;
        });

        uploadedKeys = await Promise.all(uploadPromises);

        setUploadModalState((prev) =>
          prev
            ? {
                ...prev,
                progress: 88,
                statusText: 'Verifying files & finalizing storage...',
                stage: 'verifying',
              }
            : null
        );
      } else {
        setUploadModalState((prev) =>
          prev
            ? {
                ...prev,
                progress: 60,
                statusText: 'Packaging deliverable notes & link...',
                stage: 'submitting',
              }
            : null
        );
      }

      // 2. Assemble all attachments
      const allAttachments = [...uploadedKeys];
      if (deliverableType === 'video_project' && selectedVideoProjectId) {
        const vp = workspaceVideoProjects.find(
          (p) => String(p.project_id || p.id) === String(selectedVideoProjectId)
        );
        const pName = vp?.name || 'Workspace Video Project';
        allAttachments.push(`video_project:${selectedVideoProjectId}:${encodeURIComponent(pName)}`);
      } else if (linkText) {
        allAttachments.push(linkText);
      }

      setUploadModalState((prev) =>
        prev
          ? {
              ...prev,
              progress: 94,
              statusText: isReadyForReview
                ? 'Submitting deliverable to client review queue...'
                : 'Registering progress update...',
              stage: 'submitting',
            }
          : null
      );

      await api.post(`/api/dashboard/tasks/${m.contract_id}/milestones/${m.contract_milestone_id}/submit`, {
        message: messageText || (allAttachments.length > 0 ? 'Deliverable files submitted.' : ''),
        attachments: allAttachments,
        status: isReadyForReview ? 'submitted_for_review' : 'progress',
      });

      setUploadModalState((prev) =>
        prev
          ? {
              ...prev,
              progress: 100,
              statusText: isReadyForReview
                ? 'Deliverable successfully submitted for review!'
                : 'Milestone progress update sent!',
              stage: 'completed',
            }
          : null
      );

      showSuccessToast(
        isReadyForReview
          ? 'Deliverable submitted for client review!'
          : 'Milestone progress update sent!'
      );
      setSubmissionMessage('');
      setSubmissionLink('');
      setSelectedVideoProjectId('');
      clearMedia();
      setShowAdditionalSubmitFormMap((prev) => ({ ...prev, [m.job_milestone_id]: false }));
      onUpdated();

      // Brief pause to display completion state
      setTimeout(() => {
        setUploadModalState(null);
      }, 650);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit deliverable';
      showErrorToast(errMsg);
      setUploadModalState((prev) =>
        prev
          ? {
              ...prev,
              stage: 'error',
              statusText: 'Submission failed',
              errorMessage: errMsg,
            }
          : null
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client reviews deliverable (approval, revision_request with optional additional work rate)
  const handleClientReview = async (
    m: MilestoneData,
    action: 'approval' | 'revision_request',
    isPaid?: boolean,
    priceCredits?: number
  ) => {
    if (!m.contract_id || !m.contract_milestone_id) {
      showErrorToast('Milestone contract reference not found.');
      return;
    }

    if (action === 'revision_request' && !reviewNote.trim()) {
      showErrorToast('Please describe the required changes for the revision.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      if (action === 'revision_request' && isPaid) {
        // First purchase the additional revision to hold agreed additional work rate in escrow
        const idempotencyKey = crypto.randomUUID();
        await api.post(`/api/dashboard/tasks/${m.contract_id}/milestones/${m.contract_milestone_id}/buy-revision`, {
          idempotency_key: idempotencyKey,
        });
      }

      const payload: any = {
        message: reviewNote.trim() || 'Deliverable approved!',
        attachments: [],
        status: action,
      };

      await api.post(`/api/dashboard/tasks/${m.contract_id}/milestones/${m.contract_milestone_id}/review`, payload);

      if (action === 'approval') {
        showSuccessToast('Deliverable approved! Escrow payment released to contributor.');
      } else if (isPaid) {
        showSuccessToast(`Additional revision requested! Escrow holds +${priceCredits || 35} credits for the contributor.`);
      } else {
        showSuccessToast('Revision requested. Contributor has been notified.');
      }

      setReviewAction(null);
      setReviewNote('');
      onUpdated();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Summary counts
  const totalCount = milestones.length;
  const completedCount = milestones.filter((m) => {
    const s = String(m.milestone_status || '').toLowerCase();
    return s === 'completed' || s === 'approved';
  }).length;
  const underReviewCount = milestones.filter(
    (m) => String(m.milestone_status || '').toLowerCase() === 'submitted_for_review'
  ).length;
  const totalEscrowCredits = milestones.reduce((sum, m) => sum + (Number(m.budget_credits) || 0), 0);
  const selectedMilestone =
    milestones.find((m) => m.job_milestone_id === selectedMilestoneId) || milestones[0] || null;
  const selectedMilestoneIndex = selectedMilestone
    ? milestones.findIndex((m) => m.job_milestone_id === selectedMilestone.job_milestone_id)
    : 0;
  const historyModalMilestone =
    milestones.find((m) => m.job_milestone_id === historyModalMilestoneId) || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Deliverables & Submissions Review Station */}
      <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-6 space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                Deliverables & Submissions Review Station
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Where contributors submit completed milestone deliverables and the client inspects work, requests revisions, or approves payment release.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>100% Escrow Secured</span>
              </span>
            </div>
          </div>

          {/* 3 Metric Summary Boxes Stacked */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Milestones Approved
                </span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {completedCount} / {totalCount}
                </span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Pending Client Review
                </span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {underReviewCount} {underReviewCount === 1 ? 'Milestone' : 'Milestones'}
                </span>
              </div>
              <Clock className={`w-6 h-6 ${underReviewCount > 0 ? 'text-amber-500 animate-pulse' : 'text-zinc-400 dark:text-zinc-500'}`} />
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Total Deliverables Escrow
                </span>
                <span className="text-lg font-bold text-zinc-900 dark:text-white">
                  {totalEscrowCredits.toLocaleString()} Credits
                </span>
              </div>
              <Sparkles className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
            </div>

            {/* Milestone Switcher Navigation on Left */}
            {milestones.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Switch Milestone ({milestones.length})
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Select to view
                  </span>
                </div>

                <div className="space-y-1.5">
                  {milestones.map((mItem, mIdx) => {
                    const isSelected = mItem.job_milestone_id === (selectedMilestone?.job_milestone_id);
                    const statusLower = String(mItem.milestone_status || '').toLowerCase();
                    const isApp = statusLower === 'completed' || statusLower === 'approved';
                    const isRev = statusLower === 'submitted_for_review';
                    const isReq = statusLower === 'revision_requested' || statusLower === 'revisions_requested';

                    return (
                      <button
                        key={mItem.job_milestone_id || mIdx}
                        type="button"
                        onClick={() => handleSelectMilestone(mItem.job_milestone_id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white shadow-xs'
                            : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/60 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? 'bg-zinc-800 text-white border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-300'
                                : 'bg-white text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            M{mIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-900 dark:text-white'}`}>
                              {mItem.milestone_title || `Milestone ${mIdx + 1}`}
                            </p>
                            <p className={`text-[10px] truncate ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                              {isApp
                                ? 'Approved'
                                : isRev
                                ? 'Awaiting Review'
                                : isReq
                                ? 'Revision Requested'
                                : mItem.is_current
                                ? 'In Progress'
                                : 'Upcoming'}
                              {' • '}
                              {Number(mItem.budget_credits || mItem.milestone_credits || 0).toLocaleString()} cr
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isApp ? (
                            <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-emerald-400 dark:text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
                          ) : isRev ? (
                            <Clock className={`w-4 h-4 ${isSelected ? 'text-amber-300 dark:text-amber-600' : 'text-amber-500'}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'}`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submission & Audit History Button on Left */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  const targetId = selectedMilestone?.job_milestone_id || milestones[0]?.job_milestone_id || null;
                  setHistoryModalMilestoneId(targetId);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white transition cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 group-hover:scale-105 transition">
                    <History className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                      Submission History
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Open deliverable & audit records
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Milestone Scope & Requirements on Left */}
        {selectedMilestone?.milestone_description && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  M{selectedMilestoneIndex + 1} Scope & Requirements
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-zinc-400">
                Brief
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-normal">
              {selectedMilestone.milestone_description}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT: Collapsible Milestones Deliverables List */}
      <div className="lg:col-span-8 xl:col-span-8 space-y-4">
        {milestones.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <FileText className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-800 dark:text-white">No Milestones Found</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              This team project workspace does not have any milestone deliverables configured yet.
            </p>
          </div>
        ) : selectedMilestone ? (
          (() => {
            const m = selectedMilestone;
            const idx = selectedMilestoneIndex;
            const isExpanded = !isDetailsCollapsed;
            const statusLower = String(m.milestone_status || '').toLowerCase();
            const isApproved = statusLower === 'completed' || statusLower === 'approved';
            const isUnderReview = statusLower === 'submitted_for_review';
            const isRevisionRequested = statusLower === 'revision_requested' || statusLower === 'revisions_requested';
            const isInProgress = statusLower === 'in_progress' || statusLower === 'active' || (!isApproved && !isUnderReview && !isRevisionRequested && m.is_current);

            const isAssignee = isMilestoneAssignee(m);
            const canSubmit = !isClient && (isAssignee || !m.assignee_account_id) && !isApproved;
            const canReview = isClient && isUnderReview;

            const submissionsList = Array.isArray(m.submissions) ? m.submissions : [];
            const latestSubmission = submissionsList[0];
            const latestDeliverableSubmission = submissionsList.find(
              (s) => s.status === 'submitted_for_review' || s.status === 'progress' || s.status === 'submitted'
            ) || submissionsList[0];
            const isAdditionalOpen = Boolean(showAdditionalSubmitFormMap[m.job_milestone_id]);
            const shouldShowSubmitForm = canSubmit && (!isUnderReview || isAdditionalOpen || !latestDeliverableSubmission);

            const recordedRevisionsCount = submissionsList.filter(
              (s) => s.status === 'revision_request' || s.status === 'revision_requested'
            ).length;
            const maxRevisions = m.no_of_revisions_max !== undefined ? m.no_of_revisions_max : 2;
            const usedRevisions = Math.max(Number(m.revisions_used || 0), recordedRevisionsCount);
            const remainingRevisions = Math.max(0, maxRevisions - usedRevisions);
            const contractForMilestone = contracts.find((c) => c.contract_id === m.contract_id);
            const additionalRate = Number(m.revision_price_credits || contractForMilestone?.revision_price_credits || 35);

            const isRejectedOrRevisionRequested =
              !isApproved &&
              (isRevisionRequested ||
                latestSubmission?.status === 'revision_request' ||
                latestSubmission?.status === 'revision_requested');

            const latestRevisionEntry = submissionsList.find(
              (s) => s.status === 'revision_request' || s.status === 'revision_requested'
            );

            return (
              <div className="space-y-4">
                {/* Top Quick-Switcher Bar when there are multiple milestones */}
                {milestones.length > 1 && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 pr-2">
                      {milestones.map((mItem, mIdx) => {
                        const isSelected = mItem.job_milestone_id === m.job_milestone_id;
                        return (
                          <button
                            key={mItem.job_milestone_id || mIdx}
                            type="button"
                            onClick={() => handleSelectMilestone(mItem.job_milestone_id)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="font-mono font-bold text-[11px]">M{mIdx + 1}</span>
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{mItem.milestone_title}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx <= 0}
                        onClick={() => handleSelectMilestone(milestones[idx - 1].job_milestone_id)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Previous Milestone"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx >= milestones.length - 1}
                        onClick={() => handleSelectMilestone(milestones[idx + 1].job_milestone_id)}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        title="Next Milestone"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Milestone Card */}
                <div
                  key={m.job_milestone_id || idx}
                  className={`bg-white dark:bg-zinc-900 rounded-xl border transition-all duration-200 shadow-xs overflow-hidden ${
                    isUnderReview
                      ? 'border-amber-300 dark:border-amber-600/60 ring-1 ring-amber-400/20'
                      : isExpanded
                      ? 'border-zinc-300 dark:border-zinc-700 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Milestone Accordion Header */}
                  <div
                    onClick={toggleExpand}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition"
                  >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Index Badge */}
                    <div className="px-2.5 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border border-zinc-200 dark:border-zinc-700">
                      M{idx + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {m.milestone_title}
                        </h4>

                        {/* Status Badge */}
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved & Escrow Released
                          </span>
                        ) : isUnderReview ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Awaiting Client Review
                          </span>
                        ) : isRevisionRequested ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                            <RotateCcw className="w-3 h-3" />
                            Revision Requested ({remainingRevisions} left)
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Description & Contributor Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {m.assignee_name && (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={constructAvatarUrl(m.assignee_avatar_path, m.assignee_name)}
                              alt={m.assignee_name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.assignee_name);
                              }}
                              className="w-4 h-4 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {m.assignee_name} {isAssignee && '(You)'}
                            </span>
                          </div>
                        )}

                        {m.deadline_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {new Date(m.deadline_at).toLocaleDateString()}
                          </span>
                        )}

                        <span>
                          Revisions: {remainingRevisions} / {maxRevisions} remaining
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryModalMilestoneId(m.job_milestone_id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                        >
                          <History className="w-3 h-3 text-zinc-500" />
                          <span>History ({submissionsList.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Escrow Amount & Expand Chevron */}
                  <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Milestone Escrow
                      </span>
                      <span className="text-base font-bold text-zinc-900 dark:text-white">
                        {Number(m.budget_credits || m.milestone_credits || 0).toLocaleString()} Credits
                      </span>
                    </div>

                    <div className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20 space-y-6">
                    {/* Rejected / Revision Requested One-Line Clickable Indicator */}
                    {isRejectedOrRevisionRequested && (
                      <div
                        onClick={() => setHistoryModalMilestoneId(m.job_milestone_id)}
                        className="p-3 sm:px-4 rounded-xl border border-rose-300 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition cursor-pointer shadow-2xs group"
                        title="Click to view full revision feedback in submission history"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/60 dark:text-rose-200 dark:border-rose-800 shrink-0 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            <span>Revision Requested</span>
                          </span>

                          <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">
                            {latestRevisionEntry?.message ? (
                              <>
                                <span className="text-zinc-500 dark:text-zinc-400 font-normal">Feedback: </span>
                                &ldquo;{latestRevisionEntry.message}&rdquo;
                              </>
                            ) : (
                              <span>Client requested revisions before approving this milestone.</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 shrink-0 group-hover:underline">
                          <History className="w-3.5 h-3.5" />
                          <span>View in Submission History</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 1. CLIENT REVIEW ACTION PANEL (WHEN SUBMITTED FOR REVIEW) */}
                    {/* ========================================================= */}
                    {isClient && isUnderReview && (
                      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 shadow-xs space-y-4">
                        {/* Header Banner */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Deliverable Review & Approval
                            </h5>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                            Awaiting Your Review
                          </span>
                        </div>

                        {/* Submitted Deliverable Details to Inspect */}
                        {latestSubmission ? (
                          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Latest Submitted Deliverable
                              </span>
                              {latestSubmission.submitted_at && (
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                  {new Date(latestSubmission.submitted_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                            {latestSubmission.message && (
                              <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                                {latestSubmission.message}
                              </p>
                            )}
                            {Array.isArray(latestSubmission.attachments) && latestSubmission.attachments.length > 0 && (
                              <div className="space-y-2 pt-1">
                                {/* Thumbnail previews for image attachments */}
                                {latestSubmission.attachments.filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att)).length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {latestSubmission.attachments
                                      .filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att))
                                      .map((att, imgIdx) => (
                                        <button
                                          key={imgIdx}
                                          type="button"
                                          onClick={() =>
                                            setExpandedMedia({
                                              url: chatAttachmentUrl(att),
                                              type: 'image',
                                              name: att.split('/').pop()?.replace(/^\d+[-_]/, '') || 'Image Preview',
                                            })
                                          }
                                          className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-2xs cursor-pointer"
                                        >
                                          <img
                                            src={chatAttachmentUrl(att)}
                                            alt="Deliverable image preview"
                                            className="h-16 w-auto max-w-[140px] object-cover rounded-xl group-hover:scale-105 transition"
                                          />
                                        </button>
                                      ))}
                                  </div>
                                )}

                                {/* Attachment chips */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {latestSubmission.attachments.map((att, aIdx) => renderAttachmentChip(att, aIdx))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            The contributor has marked this milestone as submitted for your review.
                          </p>
                        )}

                        {/* Action Buttons or Active Form */}
                        {reviewAction === null ? (
                          <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setReviewAction('approval')}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve & Release Payment ({Number(m.budget_credits || 0).toLocaleString()} Credits)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReviewAction('revision_request')}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 active:scale-98 transition shadow-2xs cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4 text-zinc-500" />
                              {remainingRevisions > 0 ? (
                                <span>Request Revisions ({remainingRevisions} left)</span>
                              ) : (
                                <span>Request Additional Revision (+{additionalRate} Credits)</span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendFeedbackInChat(m, idx)}
                              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition shadow-2xs cursor-pointer"
                              title="Discuss this deliverable directly in the Team Workspace Channel chat"
                            >
                              <MessageCircle className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                              <span>Discuss in Team Chat</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                                {reviewAction === 'approval'
                                  ? 'Confirm Deliverable Approval & Escrow Release'
                                  : remainingRevisions <= 0
                                  ? 'Request Additional Revision (Paid Work Rate)'
                                  : 'Detail Changes Required for Revision'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewAction(null);
                                  setReviewNote('');
                                }}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>

                            {reviewAction === 'approval' ? (
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Are you sure you want to approve this milestone? Approving will mark this deliverable as completed and automatically release{' '}
                                <strong className="text-zinc-900 dark:text-white">{Number(m.budget_credits || 0).toLocaleString()} credits</strong> from escrow directly to the contributor.
                              </p>
                            ) : (
                              <div className="space-y-2.5">
                                {remainingRevisions <= 0 && (
                                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                      <span>Additional Work Rate Applies</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-mono">
                                        +{additionalRate} Credits
                                      </span>
                                    </div>
                                    <p className="text-amber-800/90 dark:text-amber-300/80 text-[11px] leading-relaxed font-normal">
                                      You have used all {maxRevisions} included revisions. Requesting this revision will charge the agreed additional work rate of <strong className="text-amber-950 dark:text-white">{additionalRate} credits</strong> from your wallet into escrow for the contributor.
                                    </p>
                                  </div>
                                )}

                                <div className="space-y-1.5">
                                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                                    Revision Notes & Specific Changes Needed *
                                  </label>
                                  <textarea
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                    rows={4}
                                    placeholder="Specify clearly what revisions or changes are needed before this deliverable can be approved..."
                                    className="w-full text-xs p-3.5 rounded-xl bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-900 dark:focus:border-white transition resize-y min-h-[90px] shadow-2xs font-normal"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isSubmittingReview || (reviewAction === 'revision_request' && !reviewNote.trim())}
                                onClick={() => handleClientReview(m, reviewAction, remainingRevisions <= 0, additionalRate)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs ${
                                  reviewAction === 'approval'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100'
                                }`}
                              >
                                {isSubmittingReview ? (
                                  <span className="flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : reviewAction === 'approval' ? (
                                  'Yes, Release Escrow & Approve'
                                ) : remainingRevisions <= 0 ? (
                                  `Pay ${additionalRate} Credits & Request Revision`
                                ) : (
                                  'Send Revision Request'
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReviewAction(null);
                                  setReviewNote('');
                                }}
                                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 1.1 CLIENT VIEW: APPROVED DELIVERABLE                     */}
                    {/* ========================================================= */}
                    {isClient && isApproved && latestDeliverableSubmission && (
                      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                              Approved Deliverable
                            </h5>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved & Escrow Released
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Approved Deliverable Submission
                            </span>
                            {latestDeliverableSubmission.submitted_at && (
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(latestDeliverableSubmission.submitted_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {latestDeliverableSubmission.message && (
                            <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                              {latestDeliverableSubmission.message}
                            </p>
                          )}
                          {Array.isArray(latestDeliverableSubmission.attachments) && latestDeliverableSubmission.attachments.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {latestDeliverableSubmission.attachments.filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att)).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {latestDeliverableSubmission.attachments
                                    .filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att))
                                    .map((att, imgIdx) => (
                                      <button
                                        key={imgIdx}
                                        type="button"
                                        onClick={() =>
                                          setExpandedMedia({
                                            url: chatAttachmentUrl(att),
                                            type: 'image',
                                            name: att.split('/').pop()?.replace(/^\d+[-_]/, '') || 'Image Preview',
                                          })
                                        }
                                        className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-2xs cursor-pointer"
                                      >
                                        <img
                                          src={chatAttachmentUrl(att)}
                                          alt="Deliverable image preview"
                                          className="h-16 w-auto max-w-[140px] object-cover rounded-xl group-hover:scale-105 transition"
                                        />
                                      </button>
                                    ))}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                {latestDeliverableSubmission.attachments.map((att, aIdx) => renderAttachmentChip(att, aIdx))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 1.2 CONTRIBUTOR VIEW: SUBMITTED DELIVERABLE DISPLAY       */}
                    {/* ========================================================= */}
                    {!isClient && latestDeliverableSubmission && (
                      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                              {isUnderReview
                                ? 'Submitted Deliverable'
                                : isApproved
                                ? 'Approved Deliverable'
                                : 'Latest Submitted Deliverable'}
                            </h5>
                          </div>
                          {isUnderReview ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                              Awaiting Client Review
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                              Approved & Released
                            </span>
                          ) : isRejectedOrRevisionRequested ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                              Revision Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700">
                              Submitted
                            </span>
                          )}
                        </div>

                        {/* Deliverable Details Box */}
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              What You Submitted
                            </span>
                            {latestDeliverableSubmission.submitted_at && (
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(latestDeliverableSubmission.submitted_at).toLocaleString()}
                              </span>
                            )}
                          </div>

                          {latestDeliverableSubmission.message && (
                            <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                              {latestDeliverableSubmission.message}
                            </p>
                          )}

                          {Array.isArray(latestDeliverableSubmission.attachments) && latestDeliverableSubmission.attachments.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {/* Thumbnail previews for image attachments */}
                              {latestDeliverableSubmission.attachments.filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att)).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {latestDeliverableSubmission.attachments
                                    .filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att))
                                    .map((att, imgIdx) => (
                                      <button
                                        key={imgIdx}
                                        type="button"
                                        onClick={() =>
                                          setExpandedMedia({
                                            url: chatAttachmentUrl(att),
                                            type: 'image',
                                            name: att.split('/').pop()?.replace(/^\d+[-_]/, '') || 'Image Preview',
                                          })
                                        }
                                        className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-2xs cursor-pointer"
                                      >
                                        <img
                                          src={chatAttachmentUrl(att)}
                                          alt="Deliverable image preview"
                                          className="h-16 w-auto max-w-[140px] object-cover rounded-xl group-hover:scale-105 transition"
                                        />
                                      </button>
                                    ))}
                                </div>
                              )}

                              {/* Attachment chips */}
                              <div className="flex flex-wrap items-center gap-2">
                                {latestDeliverableSubmission.attachments.map((att, aIdx) => renderAttachmentChip(att, aIdx))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Row: Submit Another Update Toggle */}
                        {canSubmit && isUnderReview && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              Your deliverable is currently awaiting client review. Need to provide an additional file or update?
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowAdditionalSubmitFormMap((prev) => ({
                                ...prev,
                                [m.job_milestone_id]: !prev[m.job_milestone_id],
                              }))}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto active:scale-98"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isAdditionalOpen ? 'Hide Update Form' : 'Submit Another Update'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 2. CONTRIBUTOR SUBMISSION FORM (WHEN READY TO SUBMIT)     */}
                    {/* ========================================================= */}
                    {shouldShowSubmitForm && (
                      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-zinc-900 dark:text-white" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                              {isUnderReview ? 'Submit Additional Deliverable Update' : 'Submit Deliverable for Client Review'}
                            </h5>
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnderReview && isAdditionalOpen && (
                              <button
                                type="button"
                                onClick={() => setShowAdditionalSubmitFormMap((prev) => ({
                                  ...prev,
                                  [m.job_milestone_id]: false,
                                }))}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                              Escrow: {Number(m.budget_credits || 0).toLocaleString()} Credits
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>Deliverable Notes & Summary</span>
                                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">Required</span>
                              </label>
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Plain text or instructions</span>
                            </div>
                            <textarea
                              value={submissionMessage}
                              onChange={(e) => setSubmissionMessage(e.target.value)}
                              placeholder="Type deliverable details here: describe what was built, changes made, release notes, or instructions for client verification..."
                              rows={4}
                              className="w-full text-xs p-3.5 rounded-xl bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-900 dark:focus:border-white transition resize-y min-h-[100px] shadow-2xs font-normal"
                            />
                          </div>

                          {/* Deliverable File Uploads (Images, Videos, PDF, Docs) */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>Attach Deliverable Files</span>
                                <span className="text-[10px] font-medium text-zinc-400">Optional • Max 5 files</span>
                              </label>
                              {mediaList.length > 0 && (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                                  {mediaList.length} of 5 attached
                                </span>
                              )}
                            </div>

                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                              className="hidden"
                              onChange={handleFileChange}
                            />

                            <button
                              type="button"
                              onClick={openFilePicker}
                              disabled={isSubmitting || mediaList.length >= 5}
                              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                            >
                              <Paperclip className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                              <span>Click to browse and attach images, videos, or PDFs</span>
                            </button>

                            {/* Previews of attached media before submission */}
                            {mediaList.length > 0 && (
                              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {mediaList.map((media) => (
                                  <div
                                    key={media.id}
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 shadow-2xs"
                                  >
                                    {media.type === 'image' || media.type === 'gif' ? (
                                      <img
                                        src={media.previewUrl}
                                        alt={media.file.name}
                                        className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                      />
                                    ) : media.type === 'video' ? (
                                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-300">
                                        <Film className="w-5 h-5" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-600 dark:text-zinc-300">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {media.file.name}
                                      </p>
                                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                        {(media.file.size / (1024 * 1024)).toFixed(2)} MB
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => removeMedia(media.id)}
                                      className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                                      title="Remove file"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Deliverable Video Project / External Link Selector */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <span>Deliverable Work / Prototype</span>
                                <span className="text-[10px] font-medium text-zinc-400">Optional</span>
                              </label>

                              {/* Toggle between Workspace Video Project and External Link */}
                              <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold select-none">
                                <button
                                  type="button"
                                  onClick={() => setDeliverableType('video_project')}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
                                    deliverableType === 'video_project'
                                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold'
                                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                  }`}
                                >
                                  <Film className="w-3.5 h-3.5 text-purple-500" />
                                  <span>Workspace Video Project</span>
                                  {workspaceVideoProjects.length > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 font-bold">
                                      {workspaceVideoProjects.length}
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeliverableType('external_link')}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
                                    deliverableType === 'external_link'
                                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xs font-bold'
                                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                  }`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>External Link</span>
                                </button>
                              </div>
                            </div>

                            {deliverableType === 'video_project' ? (
                              <div className="space-y-2">
                                {workspaceVideoProjects.length === 0 ? (
                                  <div className="p-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                                      <Film className="w-4 h-4 text-purple-500 shrink-0" />
                                      <span>No video projects linked to this workspace yet.</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => onNavigateTab && onNavigateTab('project')}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 transition shrink-0 cursor-pointer"
                                    >
                                      <span>Open Video Projects Tab</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {workspaceVideoProjects.map((vp) => {
                                      const pId = String(vp.project_id || vp.id);
                                      const isSelected = selectedVideoProjectId === pId;

                                      return (
                                        <div
                                          key={pId}
                                          onClick={() => setSelectedVideoProjectId(isSelected ? '' : pId)}
                                          className={`relative p-3 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 select-none ${
                                            isSelected
                                              ? 'border-purple-600 dark:border-purple-500 bg-purple-50/60 dark:bg-purple-950/20 shadow-2xs'
                                              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700'
                                          }`}
                                        >
                                          {/* Thumbnail / Icon */}
                                          <div className="w-12 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                                            {vp.thumbnailUrl || vp.thumbnail_path ? (
                                              <img
                                                src={vp.thumbnailUrl || vp.thumbnail_path}
                                                alt={vp.name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <Film className="w-5 h-5 text-purple-500" />
                                            )}
                                          </div>

                                          {/* Info */}
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-1">
                                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                                {vp.name}
                                              </p>
                                              <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                                                  isSelected
                                                    ? 'bg-purple-600 border-purple-600 text-white'
                                                    : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                                                }`}
                                              >
                                                {isSelected && <Check className="w-2.5 h-2.5" />}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                                              {vp.width && vp.height && (
                                                <span>{vp.width}x{vp.height}</span>
                                              )}
                                              {vp.duration_seconds > 0 && (
                                                <span>• {Math.floor(vp.duration_seconds)}s</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {selectedVideoProjectId && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-purple-700 dark:text-purple-300">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                      Video project attached to deliverable submission
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenVideoProject(selectedVideoProjectId);
                                        }}
                                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>Preview in Editor</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                      <span>•</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedVideoProjectId('');
                                        }}
                                        className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                      >
                                        Deselect
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative flex items-center">
                                <ExternalLink className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                                <input
                                  type="url"
                                  value={submissionLink}
                                  onChange={(e) => setSubmissionLink(e.target.value)}
                                  placeholder="https://... (e.g. Figma prototype, live demo, Google Drive, or repository link)"
                                  className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-900 dark:focus:border-white transition shadow-2xs"
                                />
                              </div>
                            )}
                          </div>

                          {(() => {
                            const milestoneTasks = (tasks || []).filter(
                              (t) => t.job_milestone_id && String(t.job_milestone_id) === String(m.job_milestone_id)
                            );
                            const incompleteTasks = milestoneTasks.filter(
                              (t) => t.status !== 'completed' && t.status !== 'review'
                            );
                            const hasIncompleteTasks = incompleteTasks.length > 0;

                            return (
                              <>
                                {isReadyForReview && hasIncompleteTasks && (
                                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5">
                                    <Info className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                        Taskboard Note: {incompleteTasks.length} task(s) still open
                                      </p>
                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                        Internal tasks do not block your submission. You can submit your deliverable for client review whenever ready.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                  <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isReadyForReview}
                                      onChange={(e) => setIsReadyForReview(e.target.checked)}
                                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 cursor-pointer accent-zinc-900 dark:accent-white"
                                    />
                                    <span>Mark deliverable as Ready for Client Review</span>
                                  </label>

                                  {isUnderReview && isAdditionalOpen && (
                                    <button
                                      type="button"
                                      onClick={() => setShowAdditionalSubmitFormMap((prev) => ({
                                        ...prev,
                                        [m.job_milestone_id]: false,
                                      }))}
                                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={
                                      isSubmitting ||
                                      (!submissionMessage.trim() && !submissionLink.trim() && !selectedVideoProjectId && mediaList.length === 0)
                                    }
                                    onClick={() => handleDeliverableSubmit(m)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 active:scale-98 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {isSubmitting ? (
                                      <span className="flex items-center gap-1.5">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        {mediaList.length > 0 ? 'Uploading files & submitting...' : 'Submitting...'}
                                      </span>
                                    ) : (
                                      <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{isReadyForReview ? 'Submit Deliverable' : 'Send Progress Update'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 3. SUBMISSION TIMELINE TRIGGER BAR                        */}
                    {/* ========================================================= */}
                    <div className="pt-2 flex items-center justify-between border-t border-zinc-200/80 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {submissionsList.length} recorded submission{submissionsList.length === 1 ? '' : 's'} & client reviews
                      </span>
                      <button
                        type="button"
                        onClick={() => setHistoryModalMilestoneId(m.job_milestone_id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 transition cursor-pointer shadow-2xs"
                      >
                        <History className="w-3.5 h-3.5 text-zinc-500" />
                        <span>View Submission History</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Next / Previous Milestone navigation footer */}
              {milestones.length > 1 && (
                <div className="flex items-center justify-between pt-1">
                  {idx > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleSelectMilestone(milestones[idx - 1].job_milestone_id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous: M{idx} ({milestones[idx - 1].milestone_title})</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {idx < milestones.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleSelectMilestone(milestones[idx + 1].job_milestone_id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow-2xs cursor-pointer ml-auto"
                    >
                      <span>Next: M{idx + 2} ({milestones[idx + 1].milestone_title})</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : null}
    </div>

      {/* ========================================================= */}
      {/* SUBMISSION HISTORY MODAL POPUP                            */}
      {/* ========================================================= */}
      {historyModalMilestone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setHistoryModalMilestoneId(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-50 zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Deliverable & Submission History
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {historyModalMilestone.milestone_title || `Milestone ${historyModalMilestone.milestone_number || 1}`} • {(historyModalMilestone.submissions || []).length} event{(historyModalMilestone.submissions || []).length === 1 ? '' : 's'} recorded
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHistoryModalMilestoneId(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If there are multiple milestones, quick switch tabs */}
            {milestones.length > 1 && (
              <div className="px-5 py-2.5 bg-zinc-100/60 dark:bg-zinc-950/40 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">Milestones:</span>
                {milestones.map((mItem, idx) => (
                  <button
                    key={mItem.job_milestone_id}
                    type="button"
                    onClick={() => setHistoryModalMilestoneId(mItem.job_milestone_id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      mItem.job_milestone_id === historyModalMilestone.job_milestone_id
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                    }`}
                  >
                    M{idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body: Scrollable History List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {(!historyModalMilestone.submissions || historyModalMilestone.submissions.length === 0) ? (
                <div className="p-8 text-center rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 text-xs">
                  No submissions or review records logged for this milestone yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyModalMilestone.submissions.map((sub, sIdx) => {
                    const isApproval = sub.status === 'approval' || sub.status === 'approved';
                    const isRevision = sub.status === 'revision_request' || sub.status === 'revision_requested';
                    const isReviewReady = sub.status === 'submitted_for_review';

                    return (
                      <div
                        key={sub.id || sIdx}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isApproval
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : isRevision
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  : isReviewReady
                                  ? 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700'
                                  : 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                              }`}
                            >
                              {isApproval
                                ? 'Client Approval'
                                : isRevision
                                ? 'Revision Request'
                                : isReviewReady
                                ? 'Deliverable Submitted'
                                : 'Update'}
                            </span>

                            {sub.submitted_at && (
                              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {sub.message && (
                          <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                            {sub.message}
                          </p>
                        )}

                        {Array.isArray(sub.attachments) && sub.attachments.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {/* Thumbnail previews for image attachments */}
                            {sub.attachments.filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att)).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {sub.attachments
                                  .filter((att) => /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(att))
                                  .map((att, imgIdx) => (
                                    <button
                                      key={imgIdx}
                                      type="button"
                                      onClick={() =>
                                        setExpandedMedia({
                                          url: chatAttachmentUrl(att),
                                          type: 'image',
                                          name: att.split('/').pop()?.replace(/^\d+[-_]/, '') || 'Image Preview',
                                        })
                                      }
                                      className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition shadow-2xs cursor-pointer"
                                    >
                                      <img
                                        src={chatAttachmentUrl(att)}
                                        alt="Deliverable image preview"
                                        className="h-16 w-auto max-w-[140px] object-cover rounded-lg group-hover:scale-105 transition"
                                      />
                                    </button>
                                  ))}
                              </div>
                            )}

                            {/* Attachment chips */}
                            <div className="flex flex-wrap items-center gap-2">
                              {sub.attachments.map((att, aIdx) => renderAttachmentChip(att, aIdx))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalMilestoneId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MEDIA PREVIEW POPUP MODAL (Lightbox / Player / PDF viewer) */}
      {/* ========================================================= */}
      {expandedMedia && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setExpandedMedia(null)}
        >
          <div
            className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in-50 zoom-in-95 duration-150 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 px-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                {expandedMedia.type === 'image' ? (
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                ) : expandedMedia.type === 'video' ? (
                  <Film className="w-4 h-4 text-zinc-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
                <span className="text-xs font-semibold text-zinc-200 truncate">
                  {expandedMedia.name || 'Deliverable Preview'}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  {expandedMedia.type}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={expandedMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                  title="Open in new window / original link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open Original</span>
                </a>
                <a
                  href={expandedMedia.url}
                  download
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700 transition"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setExpandedMedia(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/90 min-h-[300px]">
              {expandedMedia.type === 'image' && (
                <img
                  src={expandedMedia.url}
                  alt={expandedMedia.name || 'Preview'}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                />
              )}

              {expandedMedia.type === 'video' && (
                <video
                  src={expandedMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[75vh] rounded-lg shadow-lg bg-black"
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {expandedMedia.type === 'pdf' && (
                <iframe
                  src={expandedMedia.url}
                  title={expandedMedia.name || 'PDF Preview'}
                  className="w-full h-[75vh] bg-white rounded-lg border-0 shadow-lg"
                />
              )}

              {expandedMedia.type === 'doc' && (
                <div className="p-8 text-center space-y-4 max-w-md bg-zinc-900 border border-zinc-800 rounded-xl">
                  <FileText className="w-12 h-12 text-zinc-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      {expandedMedia.name || 'Document File'}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      This document cannot be previewed directly in the browser modal. You can download or open it in a new window.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-3">
                    <a
                      href={expandedMedia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Document</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Submission Upload & Progress Modal */}
      <SubmissionProgressModal
        state={uploadModalState}
        onClose={() => setUploadModalState(null)}
        onRetry={selectedMilestone ? () => handleDeliverableSubmit(selectedMilestone) : undefined}
      />
    </div>
  );
};
export default ProjectSubmissionsTab;