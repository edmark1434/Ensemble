import React, { useState } from 'react';
import { useInboxUploadMedia, InboxUploadMediaButton, InboxUploadMediaPreview } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import api from '@/lib/axios';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import {
  SubmissionProgressModal,
  formatBytes,
  type SubmissionProgressModalState,
  type ProgressFileItem,
} from '@/components/ui/SubmissionProgressModal';
import { Clock, Send } from 'lucide-react';
import { showErrorToast } from '@/components/utility/toast';

interface Props {
    contractId: string;
    milestoneId: string;
    isSubmittedForReview: boolean;
    onSuccess: (task?: unknown) => void;
}

export const MilestoneSubmissionForm: React.FC<Props> = ({
    contractId,
    milestoneId,
    isSubmittedForReview,
    onSuccess,
}) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [markAsDone, setMarkAsDone] = useState(false);
    const [uploadModalState, setUploadModalState] = useState<SubmissionProgressModalState | null>(null);
    const { mediaList, removeMedia, clearMedia, openFilePicker, handleFileChange, fileInputRef } =
        useInboxUploadMedia(5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage && mediaList.length === 0) return;

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
            title: markAsDone ? 'Submitting Deliverable for Review' : 'Sending Progress Update',
            statusText: initialFiles.length > 0 ? 'Preparing files for upload...' : 'Connecting to submission server...',
            progress: initialFiles.length > 0 ? 0 : 25,
            totalBytes,
            transferredBytes: 0,
            files: initialFiles,
            stage: initialFiles.length > 0 ? 'uploading' : 'submitting',
        });

        try {
            let uploadedUrls: string[] = [];

            if (mediaList.length > 0) {
                const loadedBytesPerFile = new Array(mediaList.length).fill(0);

                const uploadPromises = mediaList.map(async (media, idx) => {
                    setUploadModalState((prev) => {
                        if (!prev) return prev;
                        const newFiles = [...prev.files];
                        if (newFiles[idx]) newFiles[idx] = { ...newFiles[idx], status: 'uploading' };
                        return { ...prev, files: newFiles };
                    });

                    const { key } = await uploadFileWithIntent(media.file, 'documents', (loaded) => {
                        loadedBytesPerFile[idx] = loaded;
                        const currentTotalTransferred = loadedBytesPerFile.reduce((a, b) => a + b, 0);
                        const filePct = Math.min(100, Math.round((loaded / Math.max(1, media.file.size)) * 100));
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
                        if (newFiles[idx]) newFiles[idx] = { ...newFiles[idx], progress: 100, status: 'completed' };
                        return { ...prev, files: newFiles };
                    });

                    return key;
                });

                uploadedUrls = await Promise.all(uploadPromises);

                setUploadModalState((prev) => prev ? {
                    ...prev,
                    progress: 88,
                    statusText: 'Verifying files & finalizing storage...',
                    stage: 'verifying',
                } : null);
            } else {
                setUploadModalState((prev) => prev ? {
                    ...prev,
                    progress: 60,
                    statusText: 'Packaging deliverable notes...',
                    stage: 'submitting',
                } : null);
            }

            const payload = {
                message: trimmedMessage,
                attachments: uploadedUrls,
                status: markAsDone ? 'submitted_for_review' : 'progress',
            };

            setUploadModalState((prev) => prev ? {
                ...prev,
                progress: 94,
                statusText: markAsDone
                    ? 'Submitting deliverable to client review queue...'
                    : 'Registering progress update...',
                stage: 'submitting',
            } : null);

            const response = await api.post(
                `/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/submit`,
                payload
            );

            setUploadModalState((prev) => prev ? {
                ...prev,
                progress: 100,
                statusText: markAsDone
                    ? 'Deliverable successfully submitted!'
                    : 'Milestone update sent!',
                stage: 'completed',
            } : null);

            setMessage('');
            clearMedia();
            setMarkAsDone(false);
            onSuccess(response.data.task);

            setTimeout(() => {
                setUploadModalState(null);
            }, 650);
        } catch (error: any) {
            console.error('Failed to submit milestone update', error);
            const errMsg = error?.response?.data?.message || 'Failed to submit update. Please try again.';
            showErrorToast(errMsg);
            setUploadModalState((prev) => prev ? {
                ...prev,
                stage: 'error',
                statusText: 'Submission failed',
                errorMessage: errMsg,
            } : null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Contextual notice if milestone is already under review */}
            {isSubmittedForReview && (
                <div className="flex items-center justify-between px-1 text-[11px] text-blue-900 dark:text-blue-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Deliverable is currently under client review
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                        You can continue chatting or send further updates below
                    </span>
                </div>
            )}

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isSubmitting && (message.trim() || mediaList.length > 0)) {
                            e.currentTarget.form?.requestSubmit();
                        }
                    }
                }}
                placeholder={
                    isSubmittedForReview
                        ? 'Type a message or further update for your client...'
                        : 'Type your message or milestone update here...'
                }
                rows={2}
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-dark-base/50 p-3 text-xs font-sans text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition focus:border-emerald-500/50 focus:outline-none resize-none leading-relaxed shadow-sm dark:shadow-none"
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

                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={markAsDone}
                            onChange={(e) => setMarkAsDone(e.target.checked)}
                            className="w-3.5 h-3.5 rounded bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500/50 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 group-hover:text-gray-900 dark:group-hover:text-white transition">
                            {isSubmittedForReview ? 'Resubmit for Review' : 'Submit for Review'}
                        </span>
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || (!message.trim() && mediaList.length === 0)}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmitting
                        ? 'Sending...'
                        : markAsDone
                        ? isSubmittedForReview
                            ? 'Resubmit'
                            : 'Submit for Review'
                        : 'Send Update'}
                </button>
            </div>

            {/* Submission Upload & Progress Modal */}
            <SubmissionProgressModal
                state={uploadModalState}
                onClose={() => setUploadModalState(null)}
                onRetry={() => {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handleSubmit(fakeEvent);
                }}
            />
        </form>
    );
};
