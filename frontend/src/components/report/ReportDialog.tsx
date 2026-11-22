import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Flag, X } from "lucide-react";
import type { ReportReasonGroup } from "@/lib/reportReasons";

const MAX_DETAILS = 2000;
const AUTO_CLOSE_MS = 2200;

export interface ReportDialogProps {
  isOpen: boolean;
  /** "Report discussion", "Report user", ... */
  title: string;
  /** Name of what is reported (person, team, post title). */
  subjectName?: string;
  /** Optional excerpt of what is reported (a comment or message). */
  subjectPreview?: string | null;
  /** One flat list, or grouped reasons. Reason strings are sent to the server unchanged. */
  reasons: string[] | ReportReasonGroup[];
  /** Singular noun used in copy: "this {word}". */
  subjectWord: string;
  /** Who reviews it: "forum moderators", "marketplace moderators", ... */
  reviewer: string;
  /** Minimum description length; 0 makes the description optional. */
  minDetails?: number;
  onClose: () => void;
  /** Sends the report and throws on failure; the dialog shows the outcome and closes itself. */
  onSubmit: (reason: string, details: string) => Promise<void> | void;
}

function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  if (data?.message || data?.error) return data.message || data.error || "";
  if (error instanceof Error && error.message) return error.message;
  return "Failed to submit the report. Please try again.";
}

function toGroups(reasons: string[] | ReportReasonGroup[]): ReportReasonGroup[] {
  if (reasons.length === 0) return [];
  if (typeof reasons[0] === "string") return [{ label: "", reasons: reasons as string[] }];
  return reasons as ReportReasonGroup[];
}

/**
 * The one report flow members see everywhere (forum, jobs, gigs, assets, profiles, teams,
 * messages): reason chips, a described reason, the server's refusal inline, then a short
 * confirmation that closes itself.
 */
export default function ReportDialog({
  isOpen,
  title,
  subjectName,
  subjectPreview,
  reasons,
  subjectWord,
  reviewer,
  minDetails = 20,
  onClose,
  onSubmit,
}: ReportDialogProps) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const trimmed = details.trim();
  const tooShort = trimmed.length < minDetails;
  const groups = toGroups(reasons);

  const close = () => {
    if (submitting) return;
    setReason("");
    setDetails("");
    setError("");
    setSubmitted(false);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting]);

  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!reason) {
      setError("Choose a reason for this report");
      return;
    }
    if (tooShort) {
      setError(`Describe the problem in at least ${minDetails} characters`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(reason, trimmed);
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-dark-surface"
          >
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.div
                  key="report-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mb-3.5 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-100 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                        <Flag className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h3 id={titleId} className="text-sm font-bold leading-tight text-gray-900 dark:text-white">
                          {title}
                        </h3>
                        {subjectName && (
                          <p className="max-w-[300px] truncate text-[11px] text-gray-500 dark:text-zinc-400">
                            {subjectName}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close report"
                      className="shrink-0 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {subjectPreview && (
                    <blockquote className="mb-3 line-clamp-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                      {subjectPreview}
                    </blockquote>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <fieldset className="space-y-1.5">
                      <legend className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                        Select reason
                      </legend>
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
                        {groups.map((group) => (
                          <div key={group.label || "reasons"}>
                            {group.label && (
                              <p className="mb-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
                                {group.label}
                              </p>
                            )}
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                              {group.reasons.map((item) => {
                                const selected = reason === item;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => {
                                      setReason(item);
                                      if (error) setError("");
                                    }}
                                    className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition ${
                                      selected
                                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                                        : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-white/5 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                                    }`}
                                  >
                                    <span>{item}</span>
                                    {selected && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500 dark:text-red-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </fieldset>

                    <div className="space-y-1">
                      <label
                        htmlFor={`${titleId}-details`}
                        className="block text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400"
                      >
                        {minDetails > 0 ? "Description" : "Description (optional)"}
                      </label>
                      <textarea
                        id={`${titleId}-details`}
                        rows={4}
                        maxLength={MAX_DETAILS}
                        placeholder={
                          minDetails > 0
                            ? `Tell the ${reviewer} what is wrong with this ${subjectWord}. At least ${minDetails} characters.`
                            : `Tell the ${reviewer} what is wrong with this ${subjectWord}.`
                        }
                        value={details}
                        onChange={(event) => {
                          setDetails(event.target.value);
                          if (error) setError("");
                        }}
                        className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-red-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-red-500/50"
                      />
                      <p
                        className={`text-right text-[10px] ${
                          trimmed.length > 0 && tooShort ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-zinc-500"
                        }`}
                      >
                        {trimmed.length} / {MAX_DETAILS}
                        {tooShort ? ` · ${minDetails} minimum` : ""}
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                      Reports go to the {reviewer} for review. Misuse of reports may lead to account penalties.
                    </p>

                    {error && (
                      <p className="text-xs text-red-500" role="alert">
                        {error}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={close}
                        className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!reason || tooShort || submitting}
                        className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-red-500 dark:shadow-red-500/20 dark:hover:bg-red-600"
                      >
                        {submitting ? "Submitting..." : "Submit report"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="report-success"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex flex-col items-center justify-center space-y-3 py-5 text-center"
                  role="status"
                >
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0.8 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute h-12 w-12 rounded-full bg-emerald-500/30"
                    />
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="z-10 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/10 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </motion.div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Report submitted</h4>
                    <p className="mt-0.5 max-w-[260px] text-xs text-gray-500 dark:text-zinc-400">
                      Thank you. The {reviewer} will review this {subjectWord} shortly.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    Dismiss now
                  </button>

                  <div className="absolute -bottom-5 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl bg-gray-100 dark:bg-white/5">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: AUTO_CLOSE_MS / 1000, ease: "linear" }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
