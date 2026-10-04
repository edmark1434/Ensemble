import React, { useState, useEffect } from "react";
import { X, Loader2, Send } from "lucide-react";
import api from "@/lib/axios";

interface Job {
  id: string;
  title: string;
  status: string;
}

interface InviteToJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancerId: string;
  freelancerName: string;
}

export const InviteToJobModal: React.FC<InviteToJobModalProps> = ({ isOpen, onClose, freelancerId, freelancerName }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      setSuccess(false);
      api.get("/api/jobs/my-active-jobs")
        .then(res => setJobs(res.data?.data || []))
        .catch(err => setError("Failed to load active jobs."))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!selectedJob) return setError("Please select a job.");
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/jobs/invite", {
        jobId: selectedJob,
        freelancerAccountId: freelancerId,
        message
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setSelectedJob("");
        setMessage("");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 border border-zinc-200 dark:border-white/10 z-10 flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Invite to Job</h2>
        <p className="text-sm text-zinc-500 mb-6">Select an active job post to invite <span className="font-bold text-zinc-800 dark:text-zinc-200">{freelancerName}</span> to apply.</p>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : success ? (
          <div className="flex flex-col items-center justify-center py-8 text-emerald-500">
            <Send className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-bold">Invitation Sent!</h3>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <p className="text-zinc-500 text-sm">You do not have any job posts yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">Select Job</label>
              <select 
                value={selectedJob} 
                onChange={e => setSelectedJob(e.target.value)}
                className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a job post --</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id} disabled={job.status?.toLowerCase() !== "open"}>{job.title} ({job.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">Message (Optional)</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi, I think you'd be a great fit for..."
                className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              />
            </div>
            
            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            
            <button 
              onClick={handleSend}
              disabled={submitting}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Invite</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

