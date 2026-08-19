import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, Check, CreditCard, Box, MapPin, PlayCircle, Search } from "lucide-react";
import api from "@/lib/axios";
import type { Gig } from "../gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import PopupConfirmReturn from "@/pages/user/6_job_market/job_components/job_popups/popup_confirm_return";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const ORDER_WIZARD_STEPS = [
  { id: 1, label: "Order Details" },
  { id: 2, label: "Review & Pay" },
];

const OrderCreateHeader = ({ currentSlide, onReturn }: { currentSlide: number; onReturn: () => void }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <button
        type="button"
        onClick={onReturn}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 focus:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return</span>
      </button>

      <div className="flex items-center w-full max-w-sm mx-auto md:mx-0 relative justify-between z-0">
        {ORDER_WIZARD_STEPS.map((step, idx) => {
          const isCompleted = currentSlide > step.id;
          const isActive = currentSlide === step.id;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10 select-none">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center border text-xs font-bold transition-all duration-300 shadow-md ${
                    isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-[#080a12]"
                      : isActive
                      ? "bg-blue-500/20 border-blue-500 text-blue-400 ring-4 ring-blue-500/10"
                      : "bg-white dark:bg-dark-surface border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors absolute -bottom-5 whitespace-nowrap ${
                    isActive ? "text-blue-400" : isCompleted ? "text-emerald-400" : "text-gray-500 dark:text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < ORDER_WIZARD_STEPS.length - 1 && (
                <div className="flex-1 h-[2px] bg-white dark:bg-white/5 shadow-sm dark:shadow-none mx-3 relative top-[-6px] z-0">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-500"
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const GigOrderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useGlobalState((state) => state.theme);
  const tierIndex = location.state?.tierIndex || 0;

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);

  const [projectBrief, setProjectBrief] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const response = await api.get(`/api/gigs/${id}`);
        if (response.data.success && response.data.data) {
          const g = response.data.data;
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || '';
          const mapUrl = (path: string) => {
            if (!path) return undefined;
            if (!cloudFrontUrl && path.includes('public')) return undefined;
            if (path.startsWith('http') || path.startsWith('/')) return path;
            return `${cloudFrontUrl}${path.startsWith('/') ? '' : '/'}${path}`;
          };

          setGig({
            ...g,
            thumbnail: mapUrl(g.thumbnail) || "https://d2dl0agwn9kque.cloudfront.net/gig_thumbnails/ede6f8d1-cc62-4afd-be9f-11f044d86122/placeholder_1787040672764_8a5d64b3.png",
          });
        }
      } catch (error) {
        console.error("Failed to fetch gig details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGig();
  }, [id]);

  const activeTier = gig?.tiers[tierIndex] || gig?.tiers[0];

  const handleReturnTrigger = () => {
    if (projectBrief.trim() || Object.keys(questionAnswers).length > 0) {
      setIsDiscardOpen(true);
    } else {
      navigate(-1);
    }
  };

  const handleCheckout = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccessOpen(true);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-36 w-36 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Service Not Found
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          The freelance service you are looking for does not exist or might have been removed.
        </p>
        <button
          onClick={() => navigate("/gigs/services")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-500/20"
        >
          <Search className="h-4 w-4" />
          Explore Services
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-12">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-3xl p-6 md:p-8 w-full space-y-6"
      >
        {isSuccessOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-surface rounded-3xl border border-gray-200 dark:border-white/10 p-12 text-center shadow-2xl backdrop-blur-xl mt-12"
          >
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Order Successfully Sent</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
              Your order has been placed! The seller will reach out to you shortly via messages to begin working.
            </p>
            <button
              onClick={() => navigate('/gigs/orders')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              Go to My Orders
            </button>
          </motion.div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Making an Order</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Applying for Gig ID <span className="font-mono text-blue-400">{gig.id}</span>:{" "}
                <strong className="text-gray-900 dark:text-white">{gig.title}</strong>
              </p>
            </div>

            <OrderCreateHeader currentSlide={currentSlide} onReturn={handleReturnTrigger} />

            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <AnimatePresence mode="wait">
                {currentSlide === 1 && (
                  <motion.div key="step-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Order Details</h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Specify your order requirements so the seller can start working.</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">Project Brief <span className="text-red-500">*</span></label>
                        <textarea
                          rows={4}
                          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                          placeholder="Describe what you need in detail..."
                          value={projectBrief}
                          onChange={(e) => setProjectBrief(e.target.value)}
                        />
                      </div>

                      {gig.questionnaires && gig.questionnaires.length > 0 && (
                        <div className="space-y-4">
                          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wide">Questionnaire</label>
                          {gig.questionnaires.map((q, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/10">
                                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-3">
                                  {q.question} {(q.required || q.isRequired) && <span className="text-red-500">*</span>}
                                </p>

                                {(q.type === "multiple-choice" || q.type === "choice" || q.type === 'multiple_choice') ? (
                                  q.multipleAnswer ? (
                                    <div className="space-y-2">
                                      {q.options?.map((opt, oIdx) => (
                                        <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface cursor-pointer hover:border-blue-500 transition-colors">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                                            checked={(questionAnswers[idx] || []).includes(opt)}
                                            onChange={(e) => {
                                              setQuestionAnswers(prev => {
                                                const current = prev[idx] || [];
                                                if (e.target.checked) return { ...prev, [idx]: [...current, opt] };
                                                return { ...prev, [idx]: current.filter((v: string) => v !== opt) };
                                              })
                                            }}
                                          />
                                          <span className="text-sm text-gray-700 dark:text-zinc-300">{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {q.options?.map((opt, oIdx) => (
                                        <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface cursor-pointer hover:border-blue-500 transition-colors">
                                          <input
                                            type="radio"
                                            name={`q-${idx}`}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                                            checked={questionAnswers[idx] === opt}
                                            onChange={() => setQuestionAnswers(prev => ({ ...prev, [idx]: opt }))}
                                            required={(q.required || q.isRequired) && !questionAnswers[idx]}
                                          />
                                          <span className="text-sm text-gray-700 dark:text-zinc-300">{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )
                                ) : (q.type === "file-upload" || q.type === "file" || q.type === "attachment") ? (
                                  <div>
                                    <input
                                      type="file"
                                      accept={q.fileTypes?.length ? q.fileTypes.map(t => '.' + t).join(',') : '*'}
                                      className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-500/10 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                                      required={q.required || q.isRequired}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file && q.fileLimit && file.size > q.fileLimit * 1024 * 1024) {
                                          alert(`File size must be less than ${q.fileLimit}MB`);
                                          e.target.value = '';
                                          return;
                                        }
                                        setQuestionAnswers(prev => ({ ...prev, [idx]: file ? file.name : "" }));
                                      }}
                                    />
                                    {q.fileLimit && <p className="mt-1.5 text-xs text-gray-500">Max size: {q.fileLimit}MB</p>}
                                  </div>
                                ) : (
                                  <textarea
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                                    placeholder="Your answer..."
                                    value={questionAnswers[idx] || ""}
                                    onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                                    required={q.required || q.isRequired}
                                  />
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                        <button onClick={handleReturnTrigger} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                          Discard
                        </button>
                        <button
                          onClick={() => setCurrentSlide(2)}
                          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                        >
                          Confirm Details & Next <span className="ml-1">→</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentSlide === 2 && (
                  <motion.div key="step-2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Review & Confirm</h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Please review your order details before making a payment.</p>
                    </div>

                    <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <img src={gig.thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{gig.title}</h3>
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{activeTier?.tierName} Package</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-zinc-400 font-medium">Delivery Time</span>
                        <span className="font-bold text-gray-900 dark:text-white">{activeTier?.daysOfDelivery} Days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-zinc-400 font-medium">Revisions</span>
                        <span className="font-bold text-gray-900 dark:text-white">{activeTier?.revisions}</span>
                      </div>
                      <div className="h-px w-full bg-gray-200 dark:bg-white/10" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-zinc-400 font-medium">Subtotal</span>
                        <span className="font-bold text-gray-900 dark:text-white">{activeTier?.price?.toLocaleString()} Credits</span>
                      </div>
                      <div className="flex justify-between text-lg pt-2">
                        <span className="font-bold text-gray-900 dark:text-white">Total</span>
                        <span className="font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><CreditIcon className="h-5 w-5 text-yellow-500 shrink-0" />{(activeTier?.price || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                      <button onClick={() => setCurrentSlide(1)} disabled={isProcessing} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        Back
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isProcessing}
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {isProcessing ? "Processing..." : "Pay with Credits"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>

      <PopupConfirmReturn
        isOpen={isDiscardOpen}
        onConfirm={() => {
          setIsDiscardOpen(false);
          navigate(-1);
        }}
        onCancel={() => setIsDiscardOpen(false)}
        description="All unsaved order requirements will be permanently lost if you return now."
      />
    </div>
  );
};

export default GigOrderPage;