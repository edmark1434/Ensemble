import React, { useState } from 'react';
import type { AxiosError } from 'axios';
import { useInboxUploadMedia, InboxUploadMediaButton, InboxUploadMediaPreview } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import api from '@/lib/axios';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import { AlertCircle, CheckCircle, Clock, Shield, Send, MessageSquare } from 'lucide-react';
import { showErrorToast } from '@/components/utility/toast';

export interface MilestoneSubmission {
    status?: string;
}

export interface ActiveMilestone {
    id?: string;
    name?: string;
    status?: string;
    submissions?: MilestoneSubmission[];
    revisions_max?: number;
    credits?: number;
}

export interface DashboardTask {
    revision_price_credits?: number;
    user_role?: {
        effective_role?: string;
        can_buy_revision?: boolean;
        can_review_milestone?: boolean;
        can_submit_milestone?: boolean;
        is_team_client?: boolean;
        is_project_lead?: boolean;
        team_role?: string;
    };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ClientReviewCardActions
 * Renders directly INSIDE the submitted review card on "Submissions for Review"
 * tab. Buttons and text are compact and styled to suit the card cleanly.
 * ─────────────────────────────────────────────────────────────────────────────
 */
interface ReviewCardActionsProps {
    contractId: string;
    milestoneId: string;
    activeMilestone?: ActiveMilestone;
    task?: DashboardTask;
    onSuccess: (task?: unknown) => void;
}

export const ClientReviewCardActions: React.FC<ReviewCardActionsProps> = ({
    contractId,
    milestoneId,
    activeMilestone,
    task,
    onSuccess,
}) => {
    const [action, setAction] = useState<'approve' | 'revise' | 'buy_revision' | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [revisionPurchaseKey, setRevisionPurchaseKey] = useState<string | null>(null);
    const { mediaList, removeMedia, clearMedia, openFilePicker, handleFileChange, fileInputRef } =
        useInboxUploadMedia(3);

    const usedRevisions =
        activeMilestone?.submissions?.filter((s) => s.status === 'revision_request').length || 0;
    const maxRevisions = activeMilestone?.revisions_max || 0;
    const isOutOfRevisions = maxRevisions > 0 && usedRevisions >= maxRevisions;

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!action || (action !== 'approve' && action !== 'revise')) return;

        setIsSubmitting(true);
        try {
            const uploadPromises = mediaList.map(async (media) => {
                const { key } = await uploadFileWithIntent(media.file, 'documents');
                return `https://s3.amazonaws.com/your-bucket-name/${key}`;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            const payload = {
                message: message.trim(),
                attachments: uploadedUrls,
                status: action === 'approve' ? 'approval' : 'revision_request',
            };

            const response = await api.post(
                `/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/review`,
                payload
            );

            setMessage('');
            clearMedia();
            setAction(null);
            onSuccess(response.data.task);
        } catch (error) {
            console.error('Failed to submit review', error);
            showErrorToast('Failed to submit review. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyRevision = async () => {
        if (!task) return;
        const idempotencyKey = revisionPurchaseKey || crypto.randomUUID();
        if (!revisionPurchaseKey) setRevisionPurchaseKey(idempotencyKey);
        setIsSubmitting(true);
        try {
            const response = await api.post(
                `/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/buy-revision`,
                { idempotency_key: idempotencyKey }
            );
            setRevisionPurchaseKey(null);
            setAction(null);
            onSuccess(response.data.task);
        } catch (error: unknown) {
            console.error('Failed to buy revision', error);
            const apiError = error as AxiosError<{ message?: string }>;
            showErrorToast(apiError.response?.data?.message || 'Failed to buy revision.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-4 pt-3.5 border-t border-blue-500/20 bg-blue-500/[0.03] dark:bg-white/[0.02] rounded-xl p-3.5 space-y-3">
            {/* Compact Policy & Escrow note */}
            <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-300">
                <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    5 days review window • Auto-approves if no revision requested
                </span>
                {maxRevisions > 0 && (
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                        {Math.max(0, maxRevisions - usedRevisions)} revision(s) left
                    </span>
                )}
            </div>

            {/* Default compact action buttons inside card */}
            {action === null && (
                <div className="flex items-center gap-2.5 pt-0.5">
                    <button
                        type="button"
                        onClick={() => setAction(isOutOfRevisions ? 'buy_revision' : 'revise')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-500 dark:text-red-400 hover:bg-red-500/20 transition"
                    >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {isOutOfRevisions ? 'Purchase Revision' : 'Ask to Revise'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setAction('approve')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve Milestone
                    </button>
                </div>
            )}

            {/* Inline Confirm Approval Form inside card */}
            {action === 'approve' && (
                <form onSubmit={handleReviewSubmit} className="space-y-2.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Confirm Milestone Approval
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setAction(null);
                                setMessage('');
                            }}
                            className="text-[11px] text-gray-400 hover:underline font-normal"
                        >
                            Cancel
                        </button>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Optional remarks or feedback for the freelancer..."
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base p-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAction(null);
                                setMessage('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Approving...' : 'Confirm & Release'}
                        </button>
                    </div>
                </form>
            )}

            {/* Inline Request Revision Form inside card */}
            {action === 'revise' && (
                <form onSubmit={handleReviewSubmit} className="space-y-2.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-red-500 dark:text-red-400">
                        <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Request Revisions
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setAction(null);
                                setMessage('');
                            }}
                            className="text-[11px] text-gray-400 hover:underline font-normal"
                        >
                            Cancel
                        </button>
                    </div>

                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe what needs to be changed in detail..."
                        rows={2}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base p-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 resize-none leading-relaxed"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />

                    <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />

                    <div className="flex items-center justify-between">
                        <InboxUploadMediaButton
                            onClick={openFilePicker}
                            fileInputRef={fileInputRef}
                            onFileChange={handleFileChange}
                            disabled={isSubmitting}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setAction(null);
                                    setMessage('');
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !message.trim()}
                                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-sm transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Revision Request'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Inline Buy Revision Card inside card */}
            {action === 'buy_revision' && (
                <div className="space-y-3 pt-0.5">
                    <div className="flex items-center justify-between text-xs font-bold text-red-500">
                        <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Revision Limit Exceeded
                        </span>
                        <button
                            type="button"
                            onClick={() => setAction(null)}
                            className="text-[11px] text-gray-400 hover:underline font-normal"
                        >
                            Cancel
                        </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-zinc-300">
                        You have used all <b>{maxRevisions}</b> included revisions. You can purchase an additional
                        revision for <b>{task?.revision_price_credits || 0} credits</b>.
                    </p>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setAction(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleBuyRevision}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-black shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? 'Processing...' : `Pay ${task?.revision_price_credits || 0} Credits & Revise`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ClientReviewPanel (Client Milestone Chat Composer)
 * Renders at the bottom of MilestoneActivityFeed for the client.
 * Clean, compact, standard milestone chat composer so clients can chat anytime.
 * ─────────────────────────────────────────────────────────────────────────────
 */
interface Props {
    contractId: string;
    milestoneId: string;
    canReview: boolean;
    onSuccess: (task?: unknown) => void;
    activeMilestone?: ActiveMilestone;
    task?: DashboardTask;
    onViewReviewTab?: () => void;
}

export const ClientReviewPanel: React.FC<Props> = ({
    contractId,
    milestoneId,
    canReview,
    onSuccess,
    activeMilestone,
    onViewReviewTab,
}) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mediaList, removeMedia, clearMedia, openFilePicker, handleFileChange, fileInputRef } =
        useInboxUploadMedia(5);

    // Send chat message in milestone chat
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage && mediaList.length === 0) return;

        setIsSubmitting(true);
        try {
            const uploadPromises = mediaList.map(async (media) => {
                const { key } = await uploadFileWithIntent(media.file, 'documents');
                return `https://s3.amazonaws.com/your-bucket-name/${key}`;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            const payload = {
                message: trimmedMessage,
                attachments: uploadedUrls,
                status: 'client_message',
            };

            const response = await api.post(
                `/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/review`,
                payload
            );

            setMessage('');
            clearMedia();
            onSuccess(response.data.task);
        } catch (error) {
            console.error('Failed to send message', error);
            showErrorToast('Failed to send message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSendMessage} className="space-y-2.5">
            {/* Slim contextual indicator */}
            {canReview ? (
                <div className="flex items-center justify-between px-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Deliverable submitted for review
                    </span>
                    {onViewReviewTab && (
                        <button
                            type="button"
                            onClick={onViewReviewTab}
                            className="font-bold underline text-blue-600 dark:text-blue-400 hover:opacity-80"
                        >
                            View & Review Deliverable &rarr;
                        </button>
                    )}
                </div>
            ) : (
                activeMilestone?.status === 'overdue' && (
                    <div className="flex items-center justify-between px-1 text-[11px] text-rose-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Milestone deadline has passed
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                            Coordinate progress with freelancer below
                        </span>
                    </div>
                )
            )}

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to the freelancer..."
                rows={2}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/50 p-3 text-xs font-sans text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition focus:border-blue-500/50 focus:outline-none resize-none leading-relaxed shadow-sm dark:shadow-none"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                required={mediaList.length === 0}
            />

            <InboxUploadMediaPreview mediaList={mediaList} onRemove={removeMedia} />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <InboxUploadMediaButton
                        onClick={openFilePicker}
                        fileInputRef={fileInputRef}
                        onFileChange={handleFileChange}
                        disabled={isSubmitting}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || (!message.trim() && mediaList.length === 0)}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
            </div>
        </form>
    );
};
