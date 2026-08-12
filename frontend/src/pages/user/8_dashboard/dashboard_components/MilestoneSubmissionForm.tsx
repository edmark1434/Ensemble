import React, { useState } from 'react';
import { useInboxUploadMedia, InboxUploadMediaButton, InboxUploadMediaPreview } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import api from '@/lib/axios';
import { uploadFileWithIntent } from '@/lib/uploadFile';
import { Clock } from 'lucide-react';

interface Props {
    contractId: string;
    milestoneId: string;
    isSubmittedForReview: boolean;
    onSuccess: () => void;
}

export const MilestoneSubmissionForm: React.FC<Props> = ({ contractId, milestoneId, isSubmittedForReview, onSuccess }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [markAsDone, setMarkAsDone] = useState(false);
    const { mediaList, removeMedia, openFilePicker, handleFileChange, fileInputRef } = useInboxUploadMedia(5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() && mediaList.length === 0) return;

        setIsSubmitting(true);
        try {
            // Upload all images sequentially and get their URLs
            const uploadPromises = mediaList.map(async (media) => {
                const { key } = await uploadFileWithIntent(media.file, "documents");
                
                // Assuming your S3 bucket maps directly to a public URL or you store the key
                // Based on `uploadChatAttachment` in the codebase, it returns `attachment_key`.
                return `https://s3.amazonaws.com/your-bucket-name/${key}`; // Replace with actual base URL logic if needed, or backend can construct
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            const payload = {
                message,
                attachments: uploadedUrls, // Send URLs to backend
                status: markAsDone ? 'submitted_for_review' : 'progress'
            };

            await api.post(`/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/submit`, payload);
            
            setMessage('');
            onSuccess();
        } catch (error) {
            console.error("Failed to submit milestone update", error);
            alert("Failed to submit update. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmittedForReview) {
        return (
            <div className="flex items-center justify-center gap-2 text-center py-4 text-blue-400 font-bold bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Clock className="w-4 h-4 text-blue-400" />
                Waiting for client review. You cannot submit further updates right now.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your update here..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs font-sans text-white placeholder-zinc-500 transition focus:border-emerald-500/50 focus:outline-none resize-none leading-relaxed"
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
                    
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={markAsDone}
                            onChange={(e) => setMarkAsDone(e.target.checked)}
                            className="w-4 h-4 rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-300 transition">
                            Submit for Review
                        </span>
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || (!message.trim() && mediaList.length === 0)}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                    {isSubmitting ? 'Sending...' : 'Send Update'}
                </button>
            </div>
        </form>
    );
};
