import React, { useState } from 'react';
import { useInboxUploadMedia, InboxUploadMediaButton, InboxUploadMediaPreview } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import api from '@/lib/axios';
import { uploadFileWithIntent } from '@/lib/uploadFile';
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
    const { mediaList, removeMedia, clearMedia, openFilePicker, handleFileChange, fileInputRef } =
        useInboxUploadMedia(5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage && mediaList.length === 0) return;

        setIsSubmitting(true);
        try {
            const uploadPromises = mediaList.map(async (media) => {
                const { key } = await uploadFileWithIntent(media.file, 'documents');
                return key;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            const payload = {
                message: trimmedMessage,
                attachments: uploadedUrls,
                status: markAsDone ? 'submitted_for_review' : 'progress',
            };

            const response = await api.post(
                `/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/submit`,
                payload
            );

            setMessage('');
            clearMedia();
            setMarkAsDone(false);
            onSuccess(response.data.task);
        } catch (error) {
            console.error('Failed to submit milestone update', error);
            showErrorToast('Failed to submit update. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2.5">
            {/* Contextual notice if milestone is already under review */}
            {isSubmittedForReview && (
                <div className="flex items-center justify-between px-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Deliverable is currently under client review
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
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
                            className="w-3.5 h-3.5 rounded bg-gray-100 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-300 transition">
                            {isSubmittedForReview ? 'Resubmit for Review' : 'Submit for Review'}
                        </span>
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || (!message.trim() && mediaList.length === 0)}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
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
        </form>
    );
};
