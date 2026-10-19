// src/components/modals/ReportTeamModal.tsx
import { useState } from "react";
import { X, Flag } from "lucide-react";

interface ReportTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onSubmit: (reason: string, description: string) => void | Promise<void>;
}

const reportReasons = [
  "Inappropriate Content",
  "Spam or Misleading",
  "Harassment or Bullying",
  "Fake Team",
  "Copyright Infringement",
  "Other",
];

const ReportTeamModal: React.FC<ReportTeamModalProps> = ({
  isOpen,
  onClose,
  teamName,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason || isSubmitting) return;
    if (description.trim().length < 20) {
      setError("Describe the report in at least 20 characters");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(selectedReason, description.trim());
      onClose();
      setSelectedReason("");
      setDescription("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit the report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-surface p-6 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-400" />
            <h3 className="text-xl font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Report Team
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
          Reporting: <span className="text-white">{teamName}</span>
        </p>

        {/* Reason Selection */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Reason for reporting *
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="">Select a reason</option>
            {reportReasons.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide additional details about your report..."
            rows={4}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
          />
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || description.trim().length < 20 || isSubmitting}
            className="flex-1 rounded-full bg-gradient-to-r from-red-500 to-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default ReportTeamModal;