import React, { useState } from 'react';
import { useInboxUploadMedia, InboxUploadMediaButton, InboxUploadMediaPreview } from '@/components/ui/inbox/inbox_functions/inbox_upload_image';
import api from '@/lib/axios';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
    contractId: string;
    milestoneId: string;
    canReview: boolean;
    onSuccess: () => void;
    activeMilestone?: any;
    task?: any;
}

export const ClientReviewPanel: React.FC<Props> = ({ contractId, milestoneId, canReview, onSuccess, activeMilestone, task }) => {
    const [action, setAction] = useState<'approve' | 'revise' | 'buy_revision' | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mediaList, removeMedia, openFilePicker, handleFileChange, fileInputRef } = useInboxUploadMedia(5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!action) return;

        setIsSubmitting(true);
        try {
            // Upload all images sequentially and get their URLs
            const uploadPromises = mediaList.map(async (media) => {
                const response = await api.post("/api/files/upload-url", {
                    folder: "documents",
                    filename: media.file.name,
                    contentType: media.file.type || "application/octet-stream",
                });
                const { uploadUrl, key } = response.data || {};
                
                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': media.file.type },
                    body: media.file
                });
                
                return `https://s3.amazonaws.com/your-bucket-name/${key}`;
            });

            const uploadedUrls = await Promise.all(uploadPromises);

            const payload = {
                message,
                attachments: uploadedUrls,
                status: action === 'approve' ? 'approval' : 'revision_request'
            };

            await api.post(`/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/review`, payload);
            
            setMessage('');
            setAction(null);
            onSuccess();
        } catch (error) {
            console.error("Failed to submit review", error);
            alert("Failed to submit review. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyRevision = async () => {
        if (!task) return;
        setIsSubmitting(true);
        try {
            await api.post(`/api/dashboard/tasks/${contractId}/milestones/${milestoneId}/buy-revision`, {
                priceCredits: task.revision_price_credits
            });
            // After successfully buying, we just refresh the task and clear the action
            // The user will now have +1 max revisions and can ask to revise normally
            setAction(null);
            onSuccess();
        } catch (error: any) {
            console.error("Failed to buy revision", error);
            alert(error.response?.data?.message || "Failed to buy revision.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!canReview) {
        return (
            <div className="text-center py-4 text-zinc-500 font-bold bg-white/5 rounded-xl border border-white/10">
                Waiting for the freelancer to submit work for review.
            </div>
        );
    }

    const usedRevisions = activeMilestone?.submissions?.filter((s: any) => s.status === 'revision_request').length || 0;
    const maxRevisions = activeMilestone?.revisions_max || 0;
    const isOutOfRevisions = usedRevisions >= maxRevisions;

    if (!action) {
        return (
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setAction(isOutOfRevisions ? 'buy_revision' : 'revise')}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                    <AlertCircle className="h-4 w-4" /> {isOutOfRevisions ? 'Purchase Revision' : 'Ask to Revise'}
                </button>
                <button 
                    onClick={() => setAction('approve')}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                    <CheckCircle className="h-4 w-4" /> Approve Milestone
                </button>
            </div>
        );
    }

    if (action === 'buy_revision') {
        const rate = task?.revision_price_credits || 0;
        const total = rate;
        
        return (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-red-400 font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Revision Limit Exceeded
                    </h3>
                    <button onClick={() => setAction(null)} className="text-xs text-zinc-400 hover:text-white">Cancel</button>
                </div>
                
                <p className="text-sm text-zinc-300 leading-relaxed">
                    You have used all <b>{maxRevisions}</b> included revisions for this milestone. 
                    You can purchase an additional revision to request more changes.
                </p>

                <div className="bg-[#080a12]/50 rounded-lg border border-white/5 p-4 space-y-3">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Base Milestone Price:</span>
                        <span className="text-white font-bold">{activeMilestone?.credits} Credits</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Additional Revision Rate:</span>
                        <span className="text-yellow-500 font-bold">+{rate} Credits</span>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                        <span className="font-bold text-white">Amount to Pay:</span>
                        <span className="font-bold text-yellow-500">{total} Credits</span>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button 
                        onClick={handleBuyRevision}
                        disabled={isSubmitting}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2.5 rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Processing...' : 'Pay & Add Revision'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${action === 'approve' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {action === 'approve' ? 'Approve with Remark' : 'Request Revision'}
                </span>
                <button 
                    type="button" 
                    onClick={() => setAction(null)}
                    className="text-[10px] text-zinc-400 hover:text-white"
                >
                    Cancel
                </button>
            </div>

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={action === 'approve' ? "Optional remark for the freelancer..." : "Describe what needs to be changed..."}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#080a12]/50 p-3.5 text-xs font-sans text-white placeholder-zinc-500 transition focus:border-emerald-500/50 focus:outline-none resize-none leading-relaxed"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                required={action === 'revise'}
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
                    disabled={isSubmitting || (action === 'revise' && !message.trim())}
                    className={`${action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'} text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-lg`}
                >
                    {isSubmitting ? 'Submitting...' : action === 'approve' ? 'Confirm Approval' : 'Send Revision Request'}
                </button>
            </div>
        </form>
    );
};
