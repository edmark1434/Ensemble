import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Shield, Film, UploadCloud, Loader2, PlayCircle, FileText, Check, HelpCircle } from "lucide-react";
import type { GigRequirement } from "@/pages/user/7_gigs/gig_datasets";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { showErrorToast } from "@/components/utility/toast";

interface OrderQuestionsProps {
  questionnaires: GigRequirement[];
  requireNda: "Yes" | "No";
  setRequireNda: (val: "Yes" | "No") => void;
  allowPortfolio: "Yes" | "No";
  setAllowPortfolio: (val: "Yes" | "No") => void;
  portfolioDuration: number;
  setPortfolioDuration: (val: number) => void;
  questionAnswers: Record<string, any>;
  setQuestionAnswers: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onNext: () => void;
  onBack: () => void;
}

export const OrderQuestions: React.FC<OrderQuestionsProps> = ({
  questionnaires,
  requireNda,
  setRequireNda,
  allowPortfolio,
  setAllowPortfolio,
  portfolioDuration,
  setPortfolioDuration,
  questionAnswers,
  setQuestionAnswers,
  onNext,
  onBack,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: number]: boolean }>({});

  // Filter out any questionnaires that already duplicate the NDA or Portfolio questions
  const customQuestions = questionnaires.filter((q) => {
    const text = (q.question || "").toLowerCase();
    const isNda = text.includes("confidentiality") || text.includes("nda");
    const isPortfolio = text.includes("portfolio") || text.includes("showcase");
    return !isNda && !isPortfolio;
  });

  // Validation
  const isFormValid = () => {
    if (!requireNda || !allowPortfolio) return false;

    for (let i = 0; i < customQuestions.length; i++) {
      const q = customQuestions[i];
      if (q.required || q.isRequired) {
        const ans = questionAnswers[i];
        if (
          (q.type === "multiple-choice" || q.type === "choice" || q.type === "multiple_choice") &&
          q.multipleAnswer
        ) {
          if (!ans || !Array.isArray(ans) || ans.length === 0) return false;
        } else {
          if (!ans || String(ans).trim() === "") return false;
        }
      }
    }
    return true;
  };

  return (
    <div className="space-y-8">
      {/* 1. Workflow & Legal Questions */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-7 shadow-sm space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Workflow &amp; Rights Questions</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Clarify non-disclosure agreements and portfolio rights before work starts.
          </p>
        </div>

        {/* NDA Question */}
        <div className="space-y-2.5">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span>Do you require confidentiality (NDA) for this project?</span>
            <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                requireNda === "Yes"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="requireNda"
                value="Yes"
                checked={requireNda === "Yes"}
                onChange={() => setRequireNda("Yes")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  Yes, I require an NDA
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-400 block mt-0.5">
                  The freelancer must agree to mutual non-disclosure and strict confidentiality of all project assets.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                requireNda === "No"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="requireNda"
                value="No"
                checked={requireNda === "No"}
                onChange={() => setRequireNda("No")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  No, standard confidentiality is fine
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-400 block mt-0.5">
                  Standard platform terms apply; no extra custom NDA document required.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Portfolio Showcase Question */}
        <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-white/5">
          <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span>
              Do you allow us to display the final work in our Freelancer/Studio Portfolio after completion (up to 30s showcase)?
            </span>
            <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                allowPortfolio === "Yes"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="allowPortfolio"
                value="Yes"
                checked={allowPortfolio === "Yes"}
                onChange={() => setAllowPortfolio("Yes")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  Yes, portfolio showcase is allowed
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-400 block mt-0.5">
                  The freelancer or studio may feature short highlight snippets in their showreel.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                allowPortfolio === "No"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="allowPortfolio"
                value="No"
                checked={allowPortfolio === "No"}
                onChange={() => setAllowPortfolio("No")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white block">
                  No, deliverables must remain strictly private
                </span>
                <span className="text-xs text-gray-500 dark:text-zinc-400 block mt-0.5">
                  All output remains completely unreleased and private to your team.
                </span>
              </div>
            </label>
          </div>

          {/* Duration Selector when Yes */}
          {allowPortfolio === "Yes" && (
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 space-y-2 mt-2">
              <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Film className="h-4 w-4 text-blue-500" />
                <span>Maximum Allowed Showcase Duration</span>
              </label>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Choose the maximum video length the editor is allowed to include in their portfolio.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[5, 10, 15, 20, 30].map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => setPortfolioDuration(secs)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      portfolioDuration === secs
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                        : "bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10 hover:border-gray-300"
                    }`}
                  >
                    Up to {secs} seconds
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Freelancer Questions */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 sm:p-7 shadow-sm space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-500" />
            <span>Freelancer Questionnaire</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Specific questions required by the creator to ensure smooth delivery.
          </p>
        </div>

        {customQuestions.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] text-center">
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              This freelancer has not added additional custom questionnaire requirements.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {customQuestions.map((q, idx) => {
              const isRequired = q.required || q.isRequired;
              const isMultiChoice =
                q.type === "multiple-choice" || q.type === "choice" || q.type === "multiple_choice";
              const isFileUpload =
                q.type === "file-upload" || q.type === "file" || q.type === "attachment";

              return (
                <div
                  key={q.id || idx}
                  className="p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-black/20 space-y-3"
                >
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{q.question}</span>
                      {isRequired && <span className="text-red-500">*</span>}
                    </h3>
                    {isMultiChoice && (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500 block mt-0.5">
                        {q.multipleAnswer ? "Select one or more options" : "Select one option"}
                      </span>
                    )}
                  </div>

                  {/* Multiple Choice Render */}
                  {isMultiChoice ? (
                    q.multipleAnswer ? (
                      <div className="space-y-2">
                        {q.options?.map((opt, oIdx) => {
                          const currentArr: string[] = questionAnswers[idx] || [];
                          const checked = currentArr.includes(opt);
                          return (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                checked
                                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300"
                              }`}
                            >
                              <div
                                className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                                  checked
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "border-gray-300 dark:border-zinc-700 text-transparent"
                                }`}
                              >
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={(e) => {
                                  const updated = e.target.checked
                                    ? [...currentArr, opt]
                                    : currentArr.filter((v) => v !== opt);
                                  setQuestionAnswers((prev) => ({ ...prev, [idx]: updated }));
                                }}
                              />
                              <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.options?.map((opt, oIdx) => {
                          const checked = questionAnswers[idx] === opt;
                          return (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                checked
                                  ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                                  : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 hover:border-gray-300"
                              }`}
                            >
                              <div
                                className={`h-4 w-4 rounded-full flex items-center justify-center border transition-colors ${
                                  checked
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "border-gray-300 dark:border-zinc-700 text-transparent"
                                }`}
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              </div>
                              <input
                                type="radio"
                                name={`q-${idx}`}
                                className="hidden"
                                checked={checked}
                                onChange={() =>
                                  setQuestionAnswers((prev) => ({ ...prev, [idx]: opt }))
                                }
                              />
                              <span className="text-xs font-medium text-gray-800 dark:text-zinc-200">
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  ) : isFileUpload ? (
                    /* File Upload Render */
                    <div>
                      <input
                        type="file"
                        id={`file-upload-${idx}`}
                        accept={
                          q.fileTypes?.includes("pdf")
                            ? ".pdf"
                            : q.fileTypes?.includes("image")
                            ? ".png,.jpeg,.jpg"
                            : q.fileTypes?.includes("video")
                            ? ".mp4,.mov"
                            : ".png,.jpeg,.jpg,.mp4,.mov,.pdf"
                        }
                        className="hidden"
                        multiple={q.fileTypes?.includes("image") ? (q.fileLimit || 1) > 1 : false}
                        onChange={async (e) => {
                          const fileArray = Array.from(e.target.files || []);
                          if (fileArray.length === 0) return;

                          const isPdf = q.fileTypes?.includes("pdf");
                          const isImage = q.fileTypes?.includes("image");
                          const isVideo = q.fileTypes?.includes("video");

                          const maxLimit = isPdf ? 1 : isVideo ? 1 : isImage ? q.fileLimit || 1 : 5;
                          if (fileArray.length > maxLimit) {
                            showErrorToast(`You can only upload up to ${maxLimit} file(s).`);
                            e.target.value = "";
                            return;
                          }

                          for (const file of fileArray) {
                            if (isPdf && !file.type.includes("pdf")) {
                              showErrorToast("Only PDF documents are allowed.");
                              e.target.value = "";
                              return;
                            }
                            if (isImage && !file.type.startsWith("image/")) {
                              showErrorToast("Only image files are allowed.");
                              e.target.value = "";
                              return;
                            }
                            if (isVideo && !file.type.startsWith("video/")) {
                              showErrorToast("Only video files are allowed.");
                              e.target.value = "";
                              return;
                            }

                            const maxSizeMB = isVideo ? 15 : 10;
                            if (file.size > maxSizeMB * 1024 * 1024) {
                              showErrorToast(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
                              e.target.value = "";
                              return;
                            }
                          }

                          setUploadingFiles((prev) => ({ ...prev, [idx]: true }));
                          try {
                            const keys = await Promise.all(
                              fileArray.map(async (file) => {
                                const folder = file.type.includes("pdf")
                                  ? "documents"
                                  : file.type.startsWith("video/")
                                  ? "assets"
                                  : "documents";
                                const { key } = await uploadFileWithIntent(file, folder);
                                return key;
                              })
                            );
                            setQuestionAnswers((prev) => ({ ...prev, [idx]: keys.join(",") }));
                          } catch (err) {
                            console.error(err);
                            showErrorToast("Failed to upload file(s). Please try again.");
                          } finally {
                            setUploadingFiles((prev) => ({ ...prev, [idx]: false }));
                          }
                        }}
                      />

                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <label
                          htmlFor={`file-upload-${idx}`}
                          className="flex flex-col items-center justify-center w-full sm:w-48 shrink-0 min-h-[7rem] p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-gray-300 dark:border-white/20 hover:bg-gray-100/50 dark:hover:bg-white/5 bg-white dark:bg-dark-surface"
                        >
                          {uploadingFiles[idx] ? (
                            <div className="flex flex-col items-center">
                              <Loader2 className="h-5 w-5 text-blue-500 animate-spin mb-1.5" />
                              <span className="text-xs font-semibold text-gray-500">Uploading...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center text-gray-500 dark:text-zinc-400">
                              <UploadCloud className="h-5 w-5 mb-1 opacity-70" />
                              <span className="text-xs font-bold">
                                {questionAnswers[idx] ? "Change File(s)" : "Upload File"}
                              </span>
                              <span className="text-[10px] mt-1 text-gray-400">
                                {q.fileTypes?.includes("pdf")
                                  ? "PDF (Max 10MB)"
                                  : q.fileTypes?.includes("image")
                                  ? `Images (Max ${q.fileLimit || 1})`
                                  : q.fileTypes?.includes("video")
                                  ? "Video (Max 15MB)"
                                  : "File upload"}
                              </span>
                            </div>
                          )}
                        </label>

                        {questionAnswers[idx] && (
                          <div className="flex-1 flex flex-wrap gap-2.5 items-start p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 min-h-[7rem] w-full">
                            {String(questionAnswers[idx])
                              .split(",")
                              .filter(Boolean)
                              .map((key, kIdx) => {
                                const isImg = key.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);
                                const isVid = key.match(/\.(mp4|mov)$/i);
                                const url = `${import.meta.env.VITE_CLOUDFRONT_URL}/${key}`;
                                const filename = key.split("/").pop() || "file";

                                return (
                                  <div key={kIdx} className="flex flex-col items-center gap-1 w-16">
                                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 shadow-xs bg-white dark:bg-dark-base">
                                      {isImg ? (
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                      ) : isVid ? (
                                        <div className="flex items-center justify-center w-full h-full text-blue-500">
                                          <PlayCircle className="w-5 h-5" />
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center w-full h-full text-red-500">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className="text-[9px] text-gray-600 dark:text-zinc-400 truncate w-full text-center"
                                      title={filename}
                                    >
                                      {filename}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Textarea Render */
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-3.5 py-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                      placeholder="Write your answer here..."
                      value={questionAnswers[idx] || ""}
                      onChange={(e) =>
                        setQuestionAnswers((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Details</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!isFormValid()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <span>Next: Review Order</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default OrderQuestions;
