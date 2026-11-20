import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, Send, Briefcase } from "lucide-react";
import api from "@/lib/axios";
import GlideSelect from "@/components/ui/GlideSelect";

const MAX_MESSAGE_LENGTH = 500;

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
  const submittingRef = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      setSuccess(false);
      submittingRef.current = false;
      api.get("/api/jobs/my-active-jobs")
        .then(res => setJobs(res.data?.data || []))
        .catch(() => setError("Failed to load active jobs."))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const openJobs = jobs.filter(job => job.status?.toLowerCase() === "open");

  const handleSend = async () => {
    if (submittingRef.current || submitting) return;
    if (!selectedJob) return setError("Please select a job.");
    if (message.length > MAX_MESSAGE_LENGTH) {
      return setError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`);
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/jobs/invite", {
        jobId: selectedJob,
        freelancerAccountId: freelancerId,
        message: message.trim(),
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
      submittingRef.current = false;
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
        ) : openJobs.length === 0 ? (
          <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <p className="text-zinc-500 text-sm">You do not have any open job posts yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">Select Job</label>
              <GlideSelect
                options={openJobs.map((job) => ({
                  value: job.id,
                  label: job.title,
                  tag: job.status,
                  icon: <Briefcase className="h-4 w-4 text-zinc-400" />,
                }))}
                value={selectedJob}
                onChange={(val) => {
                  setSelectedJob(val);
                  if (error) setError("");
                }}
                placeholder="Choose a job post..."
                triggerIcon={<Briefcase className="h-4 w-4 text-zinc-400" />}
                fullWidth
                size="lg"
                maxVisibleItems={4}
                ariaLabel="Select job to invite to"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">Message (Optional)</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Hi, I think you'd be a great fit for..."
                className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              />
              <p className={`mt-1 text-right text-xs ${message.length >= MAX_MESSAGE_LENGTH ? "text-amber-600 dark:text-amber-400 font-medium" : "text-zinc-500 dark:text-zinc-400"}`}>
                {message.length}/{MAX_MESSAGE_LENGTH} characters
              </p>
            </div>
            
            {error && <p className="text-xs font-bold text-red-500">{error}</p>}
            
            <button 
              onClick={handleSend}
              disabled={submitting}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Invite</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

