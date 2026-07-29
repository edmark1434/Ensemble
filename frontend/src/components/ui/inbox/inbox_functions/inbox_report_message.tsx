// src/components/ui/inbox/inbox_functions/inbox_report_message.tsx
import React, { useState } from "react";
import { Flag, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Message } from "../inbox_dataset";

const REPORT_REASONS = [
  "Harassment or Bullying",
  "Spam or Scam",
  "Inappropriate or Explicit Content",
  "Hate Speech or Violence",
  "Other",
];

interface InboxReportModalProps {
  messageToReport: Message | null;
  onClose: () => void;
  onSubmitReport: (reportData: {
    messageId: string;
    reason: string;
    details: string;
  }) => void;
}

export const InboxReportModal: React.FC<InboxReportModalProps> = ({
  messageToReport,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!messageToReport) return null;

  const quotedText =
    messageToReport.message_content ||
    (messageToReport.attachments?.length ? "[Image Attachment]" : "Message");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReport({
      messageId: messageToReport._id,
      reason: selectedReason,
      details,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12141f] p-5 shadow-2xl transition-all"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-red-400">
            <Flag className="h-5 w-5" />
            <h3 className="font-semibold text-white text-base">Report Message</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
            <p className="font-medium text-white text-sm">Report Submitted</p>
            <p className="text-xs text-zinc-400 mt-1">
              Thank you for helping keep the community safe.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Quoted Reported Message */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
              <span className="text-[10px] uppercase font-semibold text-zinc-500 block mb-1">
                Reporting this message:
              </span>
              <p className="italic text-zinc-200 truncate">"{quotedText}"</p>
            </div>

            {/* Select Reason */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Reason for report
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0d0f1a] px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition"
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Details */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide additional context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0d0f1a] p-3 text-xs text-white outline-none resize-none placeholder:text-zinc-600 focus:border-blue-500 transition inbox-scroll-thin"
              />
            </div>

            {/* Disclaimer & Actions */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
              <span>Misuse of reports may lead to account penalties.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-red-600/80 hover:bg-red-600 px-4 py-2 text-xs font-medium text-white transition shadow-lg shadow-red-500/20"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};