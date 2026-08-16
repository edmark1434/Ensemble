import React, { useState } from "react";
import { ArrowRight, Plus, Trash2, Check, X, GripVertical, FileText, Upload, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Questionnaire } from "../../gig_datasets";

interface CreateFormsProps {
  questionnaires: Questionnaire[];
  setQuestionnaires: React.Dispatch<React.SetStateAction<Questionnaire[]>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

const QUESTION_TYPES = [
  { id: "text", label: "Fill in the blank", icon: FileText },
  { id: "file", label: "Upload a file", icon: Upload },
  { id: "choice", label: "Multiple choice", icon: ListTodo }
];

export const CreateForms: React.FC<CreateFormsProps> = ({
  questionnaires,
  setQuestionnaires,
  errors,
  setErrors,
  onBack,
  onNext,
}) => {
  const handleAddQuestion = () => {
    setQuestionnaires([...questionnaires, {
      id: Date.now().toString(),
      type: "text",
      question: "",
      isRequired: true,
      options: [],
      allowMultiple: false
    }]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestionnaires(questionnaires.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof Questionnaire, value: any) => {
    setQuestionnaires(questionnaires.map(q => q.id === id ? { ...q, [field]: value } : q));
    clearError(`question_${id}_${field}`);
  };

  const addOption = (qId: string) => {
    setQuestionnaires(questionnaires.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...(q.options || []), ""] };
      }
      return q;
    }));
  };

  const updateOption = (qId: string, optIndex: number, val: string) => {
    setQuestionnaires(questionnaires.map(q => {
      if (q.id === qId && q.options) {
        const newOpts = [...q.options];
        newOpts[optIndex] = val;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const removeOption = (qId: string, optIndex: number) => {
    setQuestionnaires(questionnaires.map(q => {
      if (q.id === qId && q.options) {
        return { ...q, options: q.options.filter((_, i) => i !== optIndex) };
      }
      return q;
    }));
  };

  const clearError = (key: string) => {
    setErrors(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Requirements & Questionnaires</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Set up questions and requests for the client to answer when they order your service.</p>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {questionnaires.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gray-200 dark:bg-white/10 rounded cursor-grab">
                    <GripVertical className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-zinc-400">Question {index + 1}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={q.isRequired} 
                        onChange={(e) => updateQuestion(q.id, "isRequired", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-white/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400">Required</span>
                  </label>
                  <div className="w-px h-4 bg-gray-300 dark:bg-white/10" />
                  <button onClick={() => handleRemoveQuestion(q.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Question Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter your question here..."
                  value={q.question}
                  onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                  className={`w-full rounded-xl border bg-white dark:bg-[#080a12] shadow-sm dark:shadow-none px-3.5 py-3 text-sm text-gray-900 dark:text-white outline-none transition-all ${
                    errors[`question_${q.id}_question`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                  }`}
                />
              </div>

              {/* Type Selector */}
              <div className="flex flex-wrap gap-2 mb-4">
                {QUESTION_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = q.type === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => updateQuestion(q.id, "type", type.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isSelected 
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                          : "bg-white dark:bg-[#080a12] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {type.label}
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>

              {/* Multiple Choice Options */}
              {q.type === "choice" && (
                <div className="pl-2 border-l-2 border-blue-500/50 ml-2 space-y-3">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`mode-${q.id}`} 
                        checked={!q.allowMultiple}
                        onChange={() => updateQuestion(q.id, "allowMultiple", false)}
                        className="text-blue-500"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Single Choice</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`mode-${q.id}`} 
                        checked={q.allowMultiple}
                        onChange={() => updateQuestion(q.id, "allowMultiple", true)}
                        className="text-blue-500"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Multiple Answers</span>
                    </label>
                  </div>

                  {q.options?.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className={`h-4 w-4 border ${q.allowMultiple ? 'rounded' : 'rounded-full'} border-gray-300 dark:border-white/20 flex-shrink-0`} />
                      <input
                        type="text"
                        placeholder={`Option ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                        className={`flex-1 rounded-lg border bg-white dark:bg-[#080a12] px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none transition-all ${
                           errors[`question_${q.id}_option_${optIndex}`] ? "border-red-500/50 focus:border-red-500" : "border-gray-200 dark:border-white/10 focus:border-blue-500/50"
                        }`}
                      />
                      <button onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addOption(q.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Option
                  </button>
                  {errors[`question_${q.id}_options_length`] && (
                    <p className="text-[11px] text-red-400 mt-1">{errors[`question_${q.id}_options_length`]}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={handleAddQuestion}
          className="w-full py-4 rounded-2xl border border-dashed border-gray-300 dark:border-white/20 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
        >
          <Plus className="h-5 w-5" /> Add New Requirement
        </button>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition text-xs focus:outline-none">
          Go Back
        </button>
        <button type="button" onClick={onNext} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Review Service <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateForms;
