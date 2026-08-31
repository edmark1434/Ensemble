import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, Check, CreditCard, Box, MapPin, PlayCircle, Search, FileText } from "lucide-react";
import api from "@/lib/axios";
import type { Gig } from "../gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import ShapeGrid from "@/components/ui/ShapeGrid";
import useGlobalState from "@/lib/global_state";
import PopupConfirmReturn from "@/pages/user/6_job_market/job_components/job_popups/popup_confirm_return";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import SuccessModal from "@/components/ui/SuccessModal";
import { uploadFileWithIntent } from "@/lib/uploadFile";
import { UploadCloud } from "lucide-react";
import MarketplaceIdentitySelector from "@/components/marketplace/MarketplaceIdentitySelector";

const ORDER_WIZARD_STEPS = [
  { id: 1, label: "Order Details" },
  { id: 2, label: "Questions" },
  { id: 3, label: "Review & Pay" },
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
  
  const searchParams = new URLSearchParams(location.search);
  const editOrderId = searchParams.get('edit');
  
  const [tierIndex, setTierIndex] = useState(location.state?.tierIndex || 0);

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentSlide, setCurrentSlide] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: number]: boolean}>({});
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [actingTeamId, setActingTeamId] = useState("");

  const [projectBrief, setProjectBrief] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const [agreedToFreelancerTerms, setAgreedToFreelancerTerms] = useState(!!editOrderId);
  const [agreedToPlatformTerms, setAgreedToPlatformTerms] = useState(!!editOrderId);

  useEffect(() => {
    const fetchGigAndOrder = async () => {
      try {
        const gigRes = await api.get(`/api/gigs/${id}`);
        if (gigRes.data.success && gigRes.data.data) {
          const g = gigRes.data.data;
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

          if (editOrderId) {
             const orderRes = await api.get(`/api/gigs/orders/${editOrderId}`);
             if (orderRes.data.success && orderRes.data.data) {
                 const orderData = orderRes.data.data;
                 setProjectBrief(orderData.project_brief || "");
                 
                 if (orderData.gig_tier_id) {
                     const tIndex = g.tiers.findIndex((t: any) => t.tierId === orderData.gig_tier_id);
                     if (tIndex !== -1) setTierIndex(tIndex);
                 }
                 
                 const parsedAnswers: Record<string, any> = {};
                 if (orderData.responses && Array.isArray(orderData.responses)) {
                     orderData.responses.forEach((resp: any) => {
                         const reqId = resp.question_id || resp.gig_requirement_id;
                         const index = g.questionnaires?.findIndex((q: any) => q.id === reqId);
                         if (index !== undefined && index !== -1) {
                             parsedAnswers[index] = resp.response;
                         } else {
                             parsedAnswers[reqId] = resp.response;
                         }
                     });
                 }
                 setQuestionAnswers(parsedAnswers);
             }
          }
        }
      } catch (error) {
        console.error("Failed to fetch gig details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGigAndOrder();
  }, [id, editOrderId]);

  const activeTier = gig?.tiers[tierIndex] || gig?.tiers[0];

  const handleReturnTrigger = () => {
    if (projectBrief.trim() || Object.keys(questionAnswers).length > 0) {
      setIsDiscardOpen(true);
    } else {
      navigate(-1);
    }
  };

  const isStep2Valid = () => {
    if (!gig?.questionnaires || gig.questionnaires.length === 0) return true;
    for (let i = 0; i < gig.questionnaires.length; i++) {
      const q = gig.questionnaires[i];
      if (q.required || q.isRequired) {
        const ans = questionAnswers[i];
        if ((q.type === 'multiple-choice' || q.type === 'choice' || q.type === 'multiple_choice') && q.multipleAnswer) {
          if (!ans || ans.length === 0) return false;
        } else {
          if (!ans || String(ans).trim() === '') return false;
        }
      }
    }
    return true;
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        tierId: activeTier?.tierId,
        projectBrief,
        acting_team_id: actingTeamId || null,
        responses: Object.entries(questionAnswers).map(([idx, response]) => ({
          requirementId: gig.questionnaires[parseInt(idx)]?.id || idx,
          response: Array.isArray(response) ? response.join(', ') : response
        }))
      };

      if (editOrderId) {
        await api.put(`/api/gigs/orders/${editOrderId}`, payload);
      } else {
        await api.post(`/api/gigs/${gig.id}/order`, payload);
      }
      setIsProcessing(false);
      setIsSuccessOpen(true);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      alert("Failed to submit order. Please try again.");
    }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{editOrderId ? "Editing Order" : "Making an Order"}</h1>
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
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Review your selected package and provide a project brief.</p>
                    </div>

                    <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 mb-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 mb-1">
                            Selected Tier
                          </span>
                          <h3 className="font-bold text-gray-900 dark:text-white">{activeTier?.tierName} - {activeTier?.title}</h3>
                        </div>
                        <div className="text-right">
                          <span className="block font-black text-blue-600 dark:text-blue-400">{activeTier?.price} Credits</span>
                          <span className="text-xs text-gray-500">{activeTier?.daysOfDelivery} Days Delivery</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-zinc-400">{activeTier?.description || "No description provided."}</p>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2 uppercase tracking-wide">Project Brief <span className="text-red-500">*</span></label>
                        <textarea
                          rows={10}
                          maxLength={1000}
                          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                          placeholder="Describe what you need in detail..."
                          value={projectBrief}
                          onChange={(e) => setProjectBrief(e.target.value)}
                        />
                        <div className="flex justify-end mt-1">
                          <span className={`text-[10px] ${projectBrief.length >= 1000 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            {projectBrief.length} / 1000 characters
                          </span>
                        </div>
                      </div>

                      {!editOrderId && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                        <MarketplaceIdentitySelector
                          teamId={actingTeamId}
                          onChange={setActingTeamId}
                          label="Place this order as"
                        />
                      </div>
                    )}

                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                        <button onClick={handleReturnTrigger} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                          Discard
                        </button>
                        <button
                          onClick={() => setCurrentSlide(2)}
                          disabled={!projectBrief.trim()}
                          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                        >
                          Next: Questions <span className="ml-1">→</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentSlide === 2 && (
                  <motion.div key="step-2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Freelancer Questions</h2>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">Please answer the following questions required by the freelancer.</p>
                    </div>

                    <div className="space-y-6">
                      {gig.questionnaires && gig.questionnaires.length > 0 ? (
                        <div className="space-y-4">
                          {gig.questionnaires.map((q, idx) => (
                              <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/10">
                                <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-1">
                                  {q.question} {(q.required || q.isRequired) && <span className="text-red-500">*</span>}
                                </p>
                                {(q.type === "multiple-choice" || q.type === "choice" || q.type === 'multiple_choice') && (
                                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                                    {q.multipleAnswer ? "Select one or more answers" : "Select only one answer"}
                                  </p>
                                )}

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
                                      id={`file-upload-${idx}`}
                                      accept={
                                        q.fileTypes?.includes('pdf') ? '.pdf' :
                                        q.fileTypes?.includes('image') ? '.png,.jpeg,.jpg' :
                                        q.fileTypes?.includes('video') ? '.mp4,.mov' :
                                        '.png,.jpeg,.jpg,.mp4,.mov,.pdf'
                                      }
                                      className="hidden"
                                      required={(q.required || q.isRequired) && !questionAnswers[idx]}
                                      multiple={q.fileTypes?.includes('image') ? (q.fileLimit || 1) > 1 : false}
                                      onChange={async (e) => {
                                        const fileArray = Array.from(e.target.files || []);
                                        if (fileArray.length > 0) {
                                          const isPdf = q.fileTypes?.includes('pdf');
                                          const isImage = q.fileTypes?.includes('image');
                                          const isVideo = q.fileTypes?.includes('video');
                                          
                                          const maxLimit = isPdf ? 1 : isVideo ? 1 : isImage ? (q.fileLimit || 1) : 5;
                                          if (fileArray.length > maxLimit) {
                                            alert(`You can only upload up to ${maxLimit} file(s).`);
                                            e.target.value = '';
                                            return;
                                          }
                                          
                                          for (const file of fileArray) {
                                            if (isPdf && !file.type.includes('pdf')) { alert("Only PDF allowed."); e.target.value = ''; return; }
                                            if (isImage && !file.type.startsWith('image/')) { alert("Only images allowed."); e.target.value = ''; return; }
                                            if (isVideo && !file.type.startsWith('video/')) { alert("Only videos allowed."); e.target.value = ''; return; }

                                            const maxSizeMB = isVideo ? 15 : 10;
                                            if (file.size > maxSizeMB * 1024 * 1024) {
                                              alert(`File ${file.name} exceeds ${maxSizeMB}MB limit.`);
                                              e.target.value = '';
                                              return;
                                            }
                                          }

                                          setUploadingFiles(prev => ({ ...prev, [idx]: true }));
                                          try {
                                            const keys = await Promise.all(fileArray.map(async file => {
                                              // Fallback to existing folders if gig_orders is not yet loaded in their backend
                                              const folder = file.type.includes('pdf') ? 'documents' : (file.type.startsWith('video/') ? 'assets' : 'documents');
                                              const { key } = await uploadFileWithIntent(file, folder);
                                              return key;
                                            }));
                                            setQuestionAnswers(prev => ({ ...prev, [idx]: keys.join(',') }));
                                          } catch (err) {
                                            console.error(err);
                                            alert("Failed to upload file(s). Please try again.");
                                          } finally {
                                            setUploadingFiles(prev => ({ ...prev, [idx]: false }));
                                          }
                                        }
                                      }}
                                    />
                                    <div className="flex flex-col sm:flex-row items-start gap-4 w-full">
                                      <label
                                        htmlFor={`file-upload-${idx}`}
                                        className={`flex flex-col items-center justify-center w-full ${questionAnswers[idx] ? 'sm:w-48' : ''} shrink-0 min-h-[8rem] p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${questionAnswers[idx] ? 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5' : 'border-gray-300 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                      >
                                        {uploadingFiles[idx] ? (
                                          <div className="flex flex-col items-center">
                                            <Loader2 className="h-6 w-6 text-blue-500 animate-spin mb-2" />
                                            <span className="text-sm font-medium text-gray-500">Uploading...</span>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center text-center text-gray-500 dark:text-zinc-400">
                                            <UploadCloud className="h-6 w-6 mb-2 opacity-60" />
                                            <span className="text-sm font-bold">{questionAnswers[idx] ? "Upload New" : "Upload File"}</span>
                                            <span className="text-[10px] mt-1.5 text-center px-1">
                                              {q.fileTypes?.includes('pdf') ? "PDF (Max 1, 10MB)" :
                                               q.fileTypes?.includes('image') ? `Images (Max ${q.fileLimit || 1}, 10MB)` :
                                               q.fileTypes?.includes('video') ? "Video (Max 1, 15MB)" :
                                               "PDF, Image, or Video"}
                                            </span>
                                          </div>
                                        )}
                                      </label>

                                      {questionAnswers[idx] && (
                                        <div className="flex-1 flex flex-wrap gap-3 items-start p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-900/10 min-h-[8rem] w-full">
                                          {questionAnswers[idx].split(',').map((key, i) => {
                                            const isImg = key.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);
                                            const isVid = key.match(/\.(mp4|mov)$/i);
                                            const url = `${import.meta.env.VITE_CLOUDFRONT_URL}/${key}`;
                                            const filename = key.split('/').pop() || 'file';
                                            return (
                                              <div key={i} className="flex flex-col items-center gap-1.5 w-16">
                                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm bg-white dark:bg-dark-base group">
                                                  {isImg ? (
                                                    <img src={url} alt="upload" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                  ) : isVid ? (
                                                    <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-500 dark:bg-blue-900/20"><PlayCircle className="w-6 h-6" /></div>
                                                  ) : (
                                                    <div className="flex items-center justify-center w-full h-full bg-red-50 text-red-500 dark:bg-red-900/20"><FileText className="w-6 h-6" /></div>
                                                  )}
                                                </div>
                                                <span className="text-[9px] text-gray-600 dark:text-zinc-400 truncate w-full text-center px-0.5" title={filename}>
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
                      ) : (
                        <div className="py-8 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                          <p className="text-sm text-gray-500 dark:text-zinc-400">This gig does not have any additional requirements.</p>
                        </div>
                      )}

                      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                        <button onClick={() => setCurrentSlide(1)} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                          Back
                        </button>
                        <button
                          onClick={() => setCurrentSlide(3)}
                          disabled={!isStep2Valid()}
                          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
                        >
                          Review & Confirm <span className="ml-1">→</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentSlide === 3 && (
                  <motion.div key="step-3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
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

                    <div className="space-y-3 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            checked={agreedToFreelancerTerms}
                            onChange={(e) => setAgreedToFreelancerTerms(e.target.checked)}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">
                          I certify that I have read and agree to the <strong className="font-semibold text-gray-800 dark:text-zinc-300">Freelancer's Terms of Service</strong> for this order.
                        </span>
                      </label>
                      
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            checked={agreedToPlatformTerms}
                            onChange={(e) => setAgreedToPlatformTerms(e.target.checked)}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">
                          I agree to the <strong className="font-semibold text-gray-800 dark:text-zinc-300">Platform Terms & Conditions</strong> and acknowledge that credits will be held in escrow upon acceptance.
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100 dark:border-white/5">
                      <button onClick={() => setCurrentSlide(2)} disabled={isProcessing} className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        Back
                      </button>
                      <button
                        onClick={handleCheckout}
                        disabled={isProcessing || !agreedToFreelancerTerms || !agreedToPlatformTerms}
                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {isProcessing ? "Processing..." : editOrderId ? "Save Changes" : "Pay with Credits"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
      </motion.div>

      <SuccessModal
        isOpen={isSuccessOpen}
        title={editOrderId ? "Order Successfully Updated!" : "Order Successfully Sent!"}
        message={editOrderId ? "Your order details have been saved." : "Your order has been placed! The seller will reach out to you shortly to begin working."}
        buttonText={editOrderId ? "VIEW ORDER" : "GO TO MY ORDERS"}
        onConfirm={() => navigate(editOrderId ? `/gigs/orders/sent/${editOrderId}` : '/gigs/orders/sent')}
      />

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