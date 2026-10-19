import { useState } from "react";
import { AlertCircle, Flag, X } from "lucide-react";
import api from "@/lib/axios";
import { showSuccessToast } from "@/components/utility/toast";

const reportReasons = [
  "Harassment or bullying",
  "Spam or scam",
  "Impersonation",
  "Inappropriate content",
  "Other",
];

export function ReportUserModal({
  isOpen,
  accountId,
  displayName,
  onClose,
}: {
  isOpen: boolean;
  accountId: string;
  displayName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const close = () => {
    if (submitting) return;
    setReason("");
    setDescription("");
    setError("");
    onClose();
  };

  const submit = async () => {
    if (!reason) {
      setError("Select a reason");
      return;
    }
    if (description.trim().length < 20) {
      setError("Describe the report in at least 20 characters");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/api/accounts/${accountId}/report`, {
        reason,
        description: description.trim(),
      });
      setReason("");
      setDescription("");
      showSuccessToast("Report submitted");
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit the report";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <Flag className="h-5 w-5" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report user</h3>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">
          Reporting <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
        </p>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</label>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
        >
          <option value="">Select a reason</option>
          {reportReasons.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Describe what happened. At least 20 characters."
          className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
        />
        <p className="mt-1 text-right text-[10px] text-gray-400">{description.trim().length} / 20 minimum</p>
        {error && (
          <p className="mt-2 flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 dark:border-white/10 dark:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
