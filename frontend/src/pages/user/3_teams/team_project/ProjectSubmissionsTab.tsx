import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Flag,
  HelpCircle,
  History,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import { constructAvatarUrl, getFallbackAvatarUrl } from '@/lib/accountAvatars';
import useGlobalState from '@/lib/global_state';
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
  currentUserAccountId: string;
  isClient: boolean;
  onUpdated: (silent?: boolean) => void;
}

export const ProjectSubmissionsTab: React.FC<ProjectSubmissionsTabProps> = ({
  teamId,
  milestones,
  contracts,
  tasks,
  currentUserAccountId,
  isClient,
  onUpdated,
}) => {
  const { user } = useGlobalState();
  const myAccountId = currentUserAccountId || user?.account_id || user?.id || '';

  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(() => {
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

  // Contributor Submit Form State
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [isReadyForReview, setIsReadyForReview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client Review Form State
  const [reviewAction, setReviewAction] = useState<'approval' | 'revision_request' | 'client_message' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedMilestoneId((prev) => (prev === id ? null : id));
    setReviewAction(null);
    setReviewNote('');
    setSubmissionMessage('');
    setSubmissionLink('');
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

    if (!messageText && !linkText) {
      showErrorToast('Please enter deliverable notes or attach a link to your work.');
      return;
    }

    const fullMessage = linkText
      ? `${messageText ? `${messageText}\n\n` : ''}Deliverable Link: ${linkText}`
      : messageText;

    const attachments = linkText ? [linkText] : [];

    // Milestone Task Completion Gate: cannot submit for review unless all tasks for this milestone are done
    if (isReadyForReview) {
      const milestoneTasks = (tasks || []).filter(
        (t) => t.job_milestone_id && String(t.job_milestone_id) === String(m.job_milestone_id)
      );
      const incompleteTasks = milestoneTasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'review'
      );
      if (incompleteTasks.length > 0) {
        showErrorToast(
          `Cannot submit deliverable for review: All milestone tasks must be completed first (${incompleteTasks.length} task(s) still open).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post(`/api/dashboard/tasks/${m.contract_id}/milestones/${m.contract_milestone_id}/submit`, {
        message: fullMessage,
        attachments,
        status: isReadyForReview ? 'submitted_for_review' : 'progress',
      });

      showSuccessToast(
        isReadyForReview
          ? 'Deliverable submitted for client review!'
          : 'Milestone progress update sent!'
      );
      setSubmissionMessage('');
      setSubmissionLink('');
      onUpdated();
    } catch (err: any) {
      showErrorToast(err?.response?.data?.message || 'Failed to submit deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client reviews deliverable (approval, revision_request, client_message)
  const handleClientReview = async (m: MilestoneData, action: 'approval' | 'revision_request' | 'client_message') => {
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
      const payload: any = {
        message: reviewNote.trim() || (action === 'approval' ? 'Deliverable approved!' : 'Client review note'),
        attachments: [],
        status: action,
      };

      await api.post(`/api/dashboard/tasks/${m.contract_id}/milestones/${m.contract_milestone_id}/review`, payload);

      if (action === 'approval') {
        showSuccessToast('Deliverable approved! Escrow payment released to contributor.');
      } else if (action === 'revision_request') {
        showSuccessToast('Revision requested. Contributor has been notified.');
      } else {
        showSuccessToast('Message sent to contributor.');
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Station Intro */}
      <div className="bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Deliverables & Submissions Review Station
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Where contributors submit completed milestone deliverables and the client inspects work, requests revisions, or approves payment release.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Escrow Secured</span>
            </span>
          </div>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Milestones Approved
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {completedCount} / {totalCount}
              </span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Pending Client Review
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {underReviewCount} {underReviewCount === 1 ? 'Milestone' : 'Milestones'}
              </span>
            </div>
            <Clock className={`w-6 h-6 ${underReviewCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400 dark:text-zinc-500'}`} />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Total Deliverables Escrow
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {totalEscrowCredits.toLocaleString()} Credits
              </span>
            </div>
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Milestones Deliverable List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#151720] rounded-xl border border-slate-200 dark:border-zinc-800">
            <FileText className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-white">No Milestones Found</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              This team project workspace does not have any milestone deliverables configured yet.
            </p>
          </div>
        ) : (
          milestones.map((m, idx) => {
            const isExpanded = expandedMilestoneId === m.job_milestone_id;
            const statusLower = String(m.milestone_status || '').toLowerCase();
            const isApproved = statusLower === 'completed' || statusLower === 'approved';
            const isUnderReview = statusLower === 'submitted_for_review';
            const isRevisionRequested = statusLower === 'revision_requested' || statusLower === 'revisions_requested';
            const isInProgress = statusLower === 'in_progress' || statusLower === 'active' || (!isApproved && !isUnderReview && !isRevisionRequested && m.is_current);

            const isAssignee = isMilestoneAssignee(m);
            const canSubmit = !isClient && (isAssignee || !m.assignee_account_id) && !isApproved;
            const canReview = isClient && isUnderReview;

            const maxRevisions = m.no_of_revisions_max !== undefined ? m.no_of_revisions_max : 2;
            const usedRevisions = m.revisions_used || 0;
            const remainingRevisions = Math.max(0, maxRevisions - usedRevisions);

            const submissionsList = Array.isArray(m.submissions) ? m.submissions : [];
            const latestSubmission = submissionsList[0];

            return (
              <div
                key={m.job_milestone_id || idx}
                className={`bg-white dark:bg-[#151720] rounded-xl border transition-all duration-200 shadow-xs overflow-hidden ${
                  isUnderReview
                    ? 'border-amber-300 dark:border-amber-600/60 ring-1 ring-amber-400/20'
                    : isExpanded
                    ? 'border-blue-400 dark:border-blue-500/60 shadow-md'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Milestone Accordion Header */}
                <div
                  onClick={() => toggleExpand(m.job_milestone_id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Index Badge */}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                            Upcoming
                          </span>
                        )}
                      </div>

                      {/* Description & Contributor Details */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                        {m.assignee_name && (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={constructAvatarUrl(m.assignee_avatar_path, m.assignee_name)}
                              alt={m.assignee_name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getFallbackAvatarUrl(m.assignee_name);
                              }}
                              className="w-4 h-4 rounded-full object-cover border border-slate-200 dark:border-zinc-700"
                            />
                            <span className="font-medium text-slate-700 dark:text-zinc-300">
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
                      </div>
                    </div>
                  </div>

                  {/* Right: Escrow Amount & Expand Chevron */}
                  <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                        Milestone Escrow
                      </span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {Number(m.budget_credits || m.milestone_credits || 0).toLocaleString()} Credits
                      </span>
                    </div>

                    <div className="p-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-900/20 space-y-6">
                    {/* Milestone Project Brief / Description */}
                    {m.milestone_description && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#181a24] border border-slate-200/80 dark:border-zinc-800 text-xs leading-relaxed space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-zinc-400 block">
                          Milestone Scope & Requirements
                        </span>
                        <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                          {m.milestone_description}
                        </p>
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 1. CLIENT REVIEW ACTION PANEL (WHEN SUBMITTED FOR REVIEW) */}
                    {/* ========================================================= */}
                    {isClient && isUnderReview && (
                      <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 shadow-sm space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                            <Clock className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                              Client Action Required: Deliverable Submitted for Review
                            </h5>
                            <p className="text-xs text-amber-800 dark:text-amber-300">
                              The contributor has submitted work for this deliverable. Please inspect the submission below and choose to approve and release escrow, or request revisions.
                            </p>
                          </div>
                        </div>

                        {/* Review Buttons */}
                        {reviewAction === null ? (
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setReviewAction('approval')}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve & Release Payment ({Number(m.budget_credits || 0).toLocaleString()} Credits)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReviewAction('revision_request')}
                              disabled={remainingRevisions <= 0}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 border border-amber-300 dark:border-amber-700 active:scale-98 transition shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Request Revisions ({remainingRevisions} left)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReviewAction('client_message')}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-100 border border-slate-200 dark:border-zinc-700 transition shadow-2xs cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>Send Feedback Message</span>
                            </button>
                          </div>
                        ) : (
                          /* Detailed Action Confirmation / Input Form */
                          <div className="p-4 rounded-xl bg-white dark:bg-[#181a24] border border-amber-200 dark:border-amber-800/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {reviewAction === 'approval'
                                  ? 'Confirm Deliverable Approval & Escrow Release'
                                  : reviewAction === 'revision_request'
                                  ? 'Detail Changes Required for Revision'
                                  : 'Send Feedback Message'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewAction(null);
                                  setReviewNote('');
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                              >
                                Cancel
                              </button>
                            </div>

                            {reviewAction === 'approval' ? (
                              <p className="text-xs text-slate-600 dark:text-zinc-400">
                                Are you sure you want to approve this milestone? Approving will mark this deliverable as completed and automatically release{' '}
                                <strong className="text-slate-900 dark:text-white">{Number(m.budget_credits || 0).toLocaleString()} credits</strong> from escrow directly to the contributor.
                              </p>
                            ) : (
                              <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                rows={3}
                                placeholder={
                                  reviewAction === 'revision_request'
                                    ? 'Specify clearly what revisions or changes are needed before this deliverable can be approved...'
                                    : 'Write your message to the contributor...'
                                }
                                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                              />
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isSubmittingReview || (reviewAction === 'revision_request' && !reviewNote.trim())}
                                onClick={() => handleClientReview(m, reviewAction)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                                  reviewAction === 'approval'
                                    ? 'bg-emerald-600 hover:bg-emerald-500'
                                    : reviewAction === 'revision_request'
                                    ? 'bg-amber-600 hover:bg-amber-500'
                                    : 'bg-blue-600 hover:bg-blue-500'
                                }`}
                              >
                                {isSubmittingReview ? (
                                  <span className="flex items-center gap-1.5">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Processing...
                                  </span>
                                ) : reviewAction === 'approval' ? (
                                  'Yes, Release Escrow & Approve'
                                ) : reviewAction === 'revision_request' ? (
                                  'Send Revision Request'
                                ) : (
                                  'Send Message'
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReviewAction(null);
                                  setReviewNote('');
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================= */}
                    {/* 2. CONTRIBUTOR SUBMISSION FORM (WHEN READY TO SUBMIT)     */}
                    {/* ========================================================= */}
                    {canSubmit && (
                      <div className="p-5 rounded-2xl bg-white dark:bg-[#181a24] border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                              {isUnderReview ? 'Submit Additional Update / Work Link' : 'Submit Deliverable for Client Review'}
                            </h5>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            Escrow: {Number(m.budget_credits || 0).toLocaleString()} Credits
                          </span>
                        </div>

                        {isRevisionRequested && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200">
                            <strong>Client Revision Requested:</strong> Please address the requested revisions below and re-submit your updated deliverable when ready.
                          </div>
                        )}

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                              Submission Notes & Summary *
                            </label>
                            <textarea
                              value={submissionMessage}
                              onChange={(e) => setSubmissionMessage(e.target.value)}
                              placeholder="Describe what was accomplished, deliverables completed, release notes, or instructions for the client..."
                              rows={3}
                              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase mb-1">
                              Deliverable Link or Repository URL (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                              <ExternalLink className="w-4 h-4 text-slate-400 ml-2 absolute pointer-events-none" />
                              <input
                                type="url"
                                value={submissionLink}
                                onChange={(e) => setSubmissionLink(e.target.value)}
                                placeholder="https://github.com/... or https://figma.com/... or Google Drive link"
                                className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
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
                                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>Milestone Tasks Must Be Completed Before Client Review</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                      You cannot submit this milestone deliverable for client review until all tasks assigned to this milestone are marked as completed.
                                    </p>
                                    <div className="pt-0.5">
                                      <span className="font-semibold text-[11px] text-amber-900 dark:text-amber-200">
                                        Remaining tasks to complete ({incompleteTasks.length}):
                                      </span>
                                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] opacity-95">
                                        {incompleteTasks.map((task) => (
                                          <li key={task.task_id} className="truncate">
                                            <span className="font-semibold text-slate-900 dark:text-white">{task.title}</span>
                                            <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase">
                                              [{task.status === 'in_progress' ? 'IN PROGRESS' : 'TO DO'}]
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isReadyForReview}
                                      onChange={(e) => setIsReadyForReview(e.target.checked)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                                    />
                                    <span>Mark deliverable as Ready for Client Review</span>
                                  </label>

                                  <button
                                    type="button"
                                    disabled={
                                      isSubmitting ||
                                      (!submissionMessage.trim() && !submissionLink.trim()) ||
                                      (isReadyForReview && hasIncompleteTasks)
                                    }
                                    onClick={() => handleDeliverableSubmit(m)}
                                    title={
                                      isReadyForReview && hasIncompleteTasks
                                        ? 'All tasks for this milestone must be completed before submitting for client review'
                                        : undefined
                                    }
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {isSubmitting ? (
                                      <span className="flex items-center gap-1.5">
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        Submitting...
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
                    {/* 3. SUBMISSION TIMELINE & AUDIT HISTORY                    */}
                    {/* ========================================================= */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h6 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>Submission & Review History ({submissionsList.length})</span>
                        </h6>
                      </div>

                      {submissionsList.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-white dark:bg-[#181a24] border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs">
                          No submissions recorded yet for this deliverable.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {submissionsList.map((sub, sIdx) => {
                            const isApproval = sub.status === 'approval' || sub.status === 'approved';
                            const isRevision = sub.status === 'revision_request' || sub.status === 'revision_requested';
                            const isReviewReady = sub.status === 'submitted_for_review';

                            return (
                              <div
                                key={sub.id || sIdx}
                                className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                                  isApproval
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                    : isRevision
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                                    : isReviewReady
                                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                                    : 'bg-white dark:bg-[#181a24] border-slate-200 dark:border-zinc-800'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        isApproval
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                          : isRevision
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                          : isReviewReady
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                          : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300'
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
                                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                                        {new Date(sub.submitted_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {sub.message && (
                                  <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                    {sub.message}
                                  </p>
                                )}

                                {Array.isArray(sub.attachments) && sub.attachments.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {sub.attachments.map((att, aIdx) => {
                                      const isUrl = att.startsWith('http://') || att.startsWith('https://');
                                      return (
                                        <a
                                          key={aIdx}
                                          href={att}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:underline"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          <span className="truncate max-w-[200px]">
                                            {isUrl ? att : `Attachment #${aIdx + 1}`}
                                          </span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default ProjectSubmissionsTab;
