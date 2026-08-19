import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Rocket, Calendar, MapPin, Tag, Box, Layers, DollarSign, Edit2 } from "lucide-react";
import { motion } from "framer-motion";
import type { GigTier, Milestone, Questionnaire } from "../../gig_datasets";

interface CreateReviewProps {
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  slots: number;
  termsOfService: string;
  skills: string[];
  firstDraftDelivery: string;
  galleryUrls: string[];
  tiers: GigTier[];
  milestones: Milestone[];
  additionalWorkRate: number;
  questionnaires: Questionnaire[];
  onBack: () => void;
  onSubmit: () => Promise<void> | void;
  onEdit?: (step: number) => void;
}

export const CreateReview: React.FC<CreateReviewProps> = ({
  title,
  description,
  category,
  thumbnailUrl,
  slots,
  termsOfService,
  skills,
  firstDraftDelivery,
  galleryUrls,
  tiers,
  milestones,
  additionalWorkRate,
  questionnaires,
  onBack,
  onSubmit,
  onEdit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Review & Publish</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Please review your service details before posting to the marketplace.</p>
      </div>

      <div className="space-y-6">
        {/* Core Details Summary */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex justify-between items-center">
            <div className="flex items-center">
              <span>Core Information</span>
            {onEdit && (
              <button onClick={() => onEdit(1)} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ml-2" title="Edit section">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            </div>
          </h3>
          <div className="flex flex-col md:flex-row gap-5">
            {thumbnailUrl && (
              <img src={thumbnailUrl} alt="Thumbnail" className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-white/10" />
            )}
            <div className="flex-1 space-y-2">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h4>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-zinc-400 font-medium">
                <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {category}</span>
                <span className="flex items-center gap-1"><Box className="h-3.5 w-3.5" /> {slots} Slots Available</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> First Draft in {firstDraftDelivery}</span>
              </div>
              <div className="text-xs text-gray-700 dark:text-zinc-300 mt-2 line-clamp-2">
                <div dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tiers Summary */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex items-center justify-between">
            <span>Pricing Tiers</span>
            <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[9px]">+{additionalWorkRate}/hr Additional</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiers.map((tier, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{tier.tierName}</span>
                  <span className="text-xs font-black text-gray-900 dark:text-white">${tier.price}</span>
                </div>
                <div className="text-xs font-bold text-gray-800 dark:text-zinc-200 mb-1 truncate">{tier.title}</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                  <span>{tier.daysOfDelivery} Days</span> • <span>{tier.revisions} Revs</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones Summary */}
        {milestones.length > 0 && (
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex justify-between">
              <span>Project Milestones</span>
              <span>{milestones.length} Phases</span>
            </h3>
            <div className="space-y-2">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-zinc-300">
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <div className="h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[8px]">
                      {idx + 1}
                    </div>
                    {idx < milestones.length - 1 && <div className="w-[1.5px] h-full bg-blue-100 dark:bg-blue-500/20 min-h-[16px]" />}
                  </div>
                  <div className="pb-2">
                    <span className="font-bold text-gray-900 dark:text-white">{m.name}</span>
                    <div className="text-[11px] text-gray-500 mt-0.5">{m.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements Summary */}
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex justify-between">
            <span>Client Requirements</span>
            <span>{questionnaires.length} Questions</span>
          </h3>
          <div className="space-y-2">
            {questionnaires.map((q, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-zinc-300">
                <span className="text-gray-400 font-bold">{idx + 1}.</span>
                <div>
                  <span className="font-medium">{q.question}</span>
                  <div className="text-[10px] text-gray-500 uppercase mt-0.5 tracking-wider font-bold">
                    [{q.type}] {q.isRequired ? "• Required" : ""}
                  </div>
                </div>
              </div>
            ))}
            {questionnaires.length === 0 && (
              <div className="text-xs text-gray-500 italic">No requirements specified.</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5 inline-block mr-1" /> Go Back
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white hover:from-blue-700 hover:to-indigo-700 transition focus:outline-none shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
              Publishing...
            </span>
          ) : (
            <>Publish Service <Rocket className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default CreateReview;
