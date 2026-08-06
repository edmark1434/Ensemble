import React from "react";

interface ReportProps {
  subject: string;
  setSubject: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
}

export const UserSettingsReport: React.FC<ReportProps> = ({
  subject,
  setSubject,
  description,
  setDescription,
  onSubmit,
  submitting = false,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Report Technical Problem</h2>
        <p className="text-xs text-zinc-400 mt-1">Found a bug or issue? Submit a ticket to technical support.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Subject</label>
          <input
            type="text"
            placeholder="e.g. Issue uploading profile image"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Description of the Issue</label>
          <textarea
            rows={5}
            placeholder="Please provide steps to reproduce or details about the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
            required
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Technical Report"}
        </button>
      </div>
    </form>
  );
};
