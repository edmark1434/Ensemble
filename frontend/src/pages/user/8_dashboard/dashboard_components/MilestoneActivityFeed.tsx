import React from 'react';
import { CheckCircle, Clock, FileText, AlertCircle, Paperclip, MessageSquare, CheckCircle2 } from 'lucide-react';
import { MilestoneSubmissionForm } from './MilestoneSubmissionForm';
import { ClientReviewPanel } from './ClientReviewPanel';

interface FeedItem {
    id: string;
    message: string;
    attachments: any[];
    status: 'progress' | 'submitted_for_review' | 'revision_request' | 'approval';
    submitted_at: string;
}

interface Props {
    task: any;
    activeMilestone: any;
    isFreelancer: boolean;
    onRefreshTask: () => void;
    canReviewContract?: boolean;
    onOpenReviewModal?: () => void;
}

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)} sec${diffInSeconds !== 1 ? 's' : ''} ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
};

export const MilestoneActivityFeed: React.FC<Props> = ({ task, activeMilestone, isFreelancer, onRefreshTask, canReviewContract, onOpenReviewModal }) => {
    
    // Sort submissions ascending (oldest first) for chronological chat feed
    const feed: FeedItem[] = activeMilestone?.submissions ? [...activeMilestone.submissions].reverse() : [];
    
    const isLocked = activeMilestone?.status === 'locked';
    const isCompleted = activeMilestone?.status === 'completed';
    const isSubmittedForReview = activeMilestone?.status === 'submitted_for_review';
    
    if (isLocked) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-24 bg-[#0d0f1a]/70 shadow-xl">
                <div className="bg-zinc-900/50 p-6 rounded-full border border-white/5 mb-4">
                    <AlertCircle className="h-10 w-10 text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Milestone Locked</h3>
                <p>Complete previous milestones before working on this one.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0d0f1a]/70 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {activeMilestone.name}
                        {isCompleted && <CheckCircle className="h-4 w-4 text-emerald-400" />}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        {feed.length} updates • Deadline: {new Date(activeMilestone.deadline).toLocaleDateString()}
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isCompleted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                    isSubmittedForReview ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                    {activeMilestone.status.replace(/_/g, ' ')}
                </div>
            </div>

            {/* Feed Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 inbox-scroll-thin">
                {feed.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        <MessageSquare className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                        <p>No activity yet for this milestone.</p>
                    </div>
                ) : (
                    feed.map((item) => {
                        const isFreelancerMsg = item.status === 'progress' || item.status === 'submitted_for_review';
                        
                        return (
                            <div key={item.id} className={`flex w-full ${isFreelancerMsg ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-3 max-w-[90%] ${isFreelancerMsg ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className="shrink-0 mt-5">
                                        <img 
                                            src={isFreelancerMsg
                                                ? (task.freelancer_avatar ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.freelancer_avatar.startsWith('/') ? '' : '/'}${task.freelancer_avatar}` : "https://i.pravatar.cc/150?u=b042581f4e29026704d")
                                                : (task.client_avatar ? `${import.meta.env.VITE_CLOUDFRONT_URL}${task.client_avatar.startsWith('/') ? '' : '/'}${task.client_avatar}` : "https://i.pravatar.cc/150?u=a042581f4e29026704d")
                                            } 
                                            alt="Avatar"
                                            className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                                        />
                                    </div>
                                    <div className={`flex flex-col ${isFreelancerMsg ? 'items-end' : 'items-start'}`}>
                                        <div className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1 flex gap-2">
                                            <span>{isFreelancerMsg ? task.freelancer_name : task.client_name}</span>
                                            <span>•</span>
                                            <span>
                                                {formatRelativeTime(item.submitted_at)} 
                                                <span className="text-[9px] font-normal text-gray-400 dark:text-zinc-600/70 ml-1">
                                                    {new Date(item.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </span>
                                        </div>
                                        <div className={`rounded-2xl p-4 ${
                                            item.status === 'submitted_for_review' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-none' :
                                            item.status === 'approval' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-tl-none' :
                                            item.status === 'revision_request' ? 'bg-red-500/20 border border-red-500/30 text-red-600 dark:text-white rounded-tl-none' :
                                            'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-tr-none'
                                        }`}>
                                    
                                    {item.status === 'submitted_for_review' && (
                                        <div className="mb-2 font-bold text-xs uppercase tracking-wider text-blue-100 dark:text-blue-200 border-b border-blue-400/30 pb-2 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" /> Submitted for Review
                                        </div>
                                    )}
                                    {item.status === 'approval' && (
                                        <div className="mb-2 font-bold text-xs uppercase tracking-wider text-emerald-100 dark:text-emerald-200 border-b border-emerald-400/30 pb-2 flex items-center gap-2">
                                            <CheckCircle className="h-3 w-3" /> Milestone Approved
                                        </div>
                                    )}
                                    {item.status === 'revision_request' && (
                                        <div className="mb-2 font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-300 border-b border-red-500/30 pb-2 flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" /> Revision Requested
                                        </div>
                                    )}

                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words break-all font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {item.message}
                                    </div>
                                    
                                    {item.attachments && item.attachments.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            {item.attachments.map((url, i) => (
                                                <a 
                                                    key={i} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="flex items-center justify-center bg-black/30 rounded-xl overflow-hidden aspect-video border border-white/10 hover:border-white/30 transition group relative"
                                                >
                                                    {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                        <img src={url} alt="Attachment" className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition" />
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <FileText className="h-6 w-6 text-zinc-400 mb-1" />
                                                            <span className="text-[10px] text-zinc-400">View File</span>
                                                        </div>
                                                    )}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    </div>
                                </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Interaction Panel */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                {isCompleted ? (
                    <div className="text-center py-4 text-emerald-400 font-bold bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <CheckCircle2 className="w-5 h-5" />
                            This milestone is complete.
                        </div>
                        {canReviewContract && onOpenReviewModal && (
                            <button 
                                onClick={onOpenReviewModal}
                                className="mt-3 text-sm font-semibold px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] inline-block"
                            >
                                Review {isFreelancer ? 'Client' : 'Freelancer'}
                            </button>
                        )}
                    </div>
                ) : isFreelancer ? (
                    <MilestoneSubmissionForm 
                        contractId={task.contract_id} 
                        milestoneId={activeMilestone.id} 
                        isSubmittedForReview={isSubmittedForReview}
                        onSuccess={onRefreshTask} 
                    />
                ) : (
                    <ClientReviewPanel 
                        contractId={task.contract_id || task.job_id} 
                        milestoneId={activeMilestone.id} 
                        canReview={isSubmittedForReview} 
                        onSuccess={onRefreshTask} 
                        activeMilestone={activeMilestone}
                        task={task}
                    />
                )}
            </div>
        </div>
    );
};
