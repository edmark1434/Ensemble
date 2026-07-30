// src/pages/user/4_forums/forum_modals/ReportMemberModal.tsx
import { useState } from "react";
import { X, Flag, AlertCircle } from "lucide-react";

interface ReportMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onSubmit: (reason: string, description: string) => Promise<void>;
}

const reportReasons = [
  "Inappropriate behavior",
  "Spam or advertising",
  "Harassment or bullying",
  "Impersonation",
  "Other",
];

const ReportMemberModal: React.FC<ReportMemberModalProps> = ({
  isOpen,
  onClose,
  memberName,
  onSubmit,
}) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ reason?: string; description?: string }>({});

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: { reason?: string; description?: string } = {};
    if (!reason) newErrors.reason = "Please select a reason";
    if (!description.trim()) newErrors.description = "Please provide more details";
    else if (description.length < 20) newErrors.description = "Please provide at least 20 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(reason, description);
      setReason("");
      setDescription("");
      setErrors({});
      onClose();
    } catch {
      // The parent displays the API error and the modal stays open for retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-modal">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0f1a] p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Report Member
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Reporting <span className="text-white font-medium">{memberName}</span>
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Reason for report *
          </label>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) setErrors({ ...errors, reason: undefined });
            }}
            className={`w-full rounded-lg border ${
              errors.reason ? "border-red-500/50" : "border-white/15"
            } bg-[#1a1f2e] px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <option value="" className="bg-[#1a1f2e] text-zinc-400">Select a reason</option>
            {reportReasons.map((r) => (
              <option key={r} value={r} className="bg-[#1a1f2e] text-white">
                {r}
              </option>
            ))}
          </select>
          {errors.reason && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.reason}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors({ ...errors, description: undefined });
            }}
            placeholder="Please provide more details about why you're reporting this member..."
            rows={4}
            className={`w-full rounded-lg border ${
              errors.description ? "border-red-500/50" : "border-white/15"
            } bg-[#1a1f2e] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description}
            </p>
          )}
          <p className="mt-1 text-right text-[10px] text-zinc-500">
            {description.length} characters (minimum 20)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportMemberModal;
