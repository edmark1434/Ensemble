import React, { useState } from "react";
import { ArrowRight, ChevronDown, Check, FileText, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const sampleTosTemplates = [
  {
    id: "default",
    name: "Standard Platform TOS",
    content: "1. All deliverables remain property of the creator until final milestone payout.\n2. Source files delivered upon project completion.\n3. Communication conducted via platform inbox.\n4. Additional revisions outside milestone quotas billed at agreed additional work rate.",
  },
  {
    id: "strict-ip",
    name: "Strict IP Transfer TOS",
    content: "1. Full IP transfer granted immediately upon each milestone approval.\n2. Raw media and project files transferred after step sign-off.\n3. Non-disclosure agreement applies to all unreleased media.",
  },
];

interface ProposalTermsProps {
  selectedTosId: string;
  setSelectedTosId: (id: string) => void;
  tosContent: string;
  setTosContent: (content: string) => void;
  onBack: () => void;
  onAdvance: () => void;
}

export const ProposalTermsStep: React.FC<ProposalTermsProps> = ({
  selectedTosId,
  setSelectedTosId,
  tosContent,
  setTosContent,
  onBack,
  onAdvance,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectTemplate = (id: string) => {
    setSelectedTosId(id);
    const found = sampleTosTemplates.find((t) => t.id === id);
    if (found) {
      setTosContent(found.content);
    }
  };

  const selectedName =
    sampleTosTemplates.find((t) => t.id === selectedTosId)?.name || "Custom Terms of Service";

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Terms of Service (TOS)</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400">Select an existing TOS template or edit standard agreement terms for the client.</p>
      </div>

      {/* Template Selector Dropdown */}
      <div className="space-y-1.5 relative">
        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
          Select TOS Preset
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3.5 py-2.5 text-xs text-left transition hover:border-white/20"
        >
          <span className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            {selectedName}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-blue-400" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-20 cursor-default" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 4 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 z-30 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] p-1.5 shadow-2xl space-y-0.5"
              >
                {sampleTosTemplates.map((tmpl) => {
                  const isSelected = selectedTosId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        handleSelectTemplate(tmpl.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isSelected ? "bg-blue-500/15 text-blue-400" : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:text-white"
                      }`}
                    >
                      <span>{tmpl.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Editable TOS Area */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Edit3 className="h-3 w-3 text-gray-500 dark:text-zinc-400" /> Active Contract Terms (Editable)
          </label>
        </div>
        <textarea
          rows={9}
          value={tosContent}
          onChange={(e) => setTosContent(e.target.value)}
          className="w-full min-h-[180px] rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-all resize-y leading-relaxed font-mono"
        />
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs"
        >
          Go Back
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
        >
          Confirm TOS & Next <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ProposalTermsStep;