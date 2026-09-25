import useGlobalState from "@/lib/global_state";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
import React, { useState, useEffect, useMemo } from "react";
import UserHeader from "@/components/nav/user_header";
import { Plus, FileText, ChevronDown, Trash2, Edit3, Star, AlertTriangle, X, GripVertical } from "lucide-react";
import { useTerms, type TosTemplate } from "@/hooks/useTerms";
import { Reorder, AnimatePresence, motion } from "framer-motion";

const TosSkeletonLoader: React.FC = () => (
  <div className="grid gap-8 lg:grid-cols-12 animate-pulse">
    <div className="lg:col-span-5 h-96 rounded-2xl bg-gray-100 dark:bg-white/5" />
    <div className="lg:col-span-7 space-y-3">
      <div className="h-16 w-full rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div className="h-16 w-full rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div className="h-16 w-full rounded-2xl bg-gray-100 dark:bg-white/5" />
    </div>
  </div>
);

export const TosMain: React.FC = () => { 
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);
  const { terms: tosList, loading, error, fetchTerms, createTerms, updateTerms, deleteTerms, setDefaultTerms } = useTerms();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jobs' | 'gigs'>('jobs');

  const [title, setTitle] = useState("");
  const [clauses, setClauses] = useState<{id: string, text: string}[]>([{ id: crypto.randomUUID(), text: "" }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const filteredTerms = useMemo(() => tosList.filter(t => t.terms_type === activeTab), [tosList, activeTab]);

  useEffect(() => {
    if (filteredTerms.length > 0) {
      const isExpandedStillVisible = filteredTerms.some(t => t.id === expandedId);
      if (!expandedId || !isExpandedStillVisible) {
        setExpandedId(filteredTerms[0].id);
      }
    }
  }, [filteredTerms, expandedId]);

  const handleSaveTOS = async (e: React.FormEvent) => {
    e.preventDefault();
    const validClauses = clauses.filter(c => c.text.trim() !== "");
    if (!title.trim() || validClauses.length === 0) return;

    // Join clauses with numbers
    const content = validClauses.map((c, i) => `${i + 1}. ${c.text.trim()}`).join('\n');

    try {
      if (editingId) {
        const updated = await updateTerms(editingId, { terms_title: title.trim(), terms_content: content, terms_type: activeTab });
        setExpandedId(updated.id);
        setEditingId(null);
      } else {
        const created = await createTerms({ terms_title: title.trim(), terms_content: content, terms_type: activeTab });
        setExpandedId(created.id);
        setEditingId(null);
      }
      setTitle("");
      setClauses([{ id: crypto.randomUUID(), text: "" }]);
    } catch (err) {
      console.error("Failed to save TOS", err);
    }
  };

  const handleEdit = (tos: TosTemplate) => {
    if (tos.usage_contracts && tos.usage_contracts.length > 0) return;
    
    // If it's a global template (no account_id), we treat editing it as creating a new copy
    if (tos.account_id === null) {
      setEditingId(null);
      setTitle(`${tos.terms_title} (Copy)`);
    } else {
      setEditingId(tos.id);
      setTitle(tos.terms_title);
    }
    
    // Parse existing content back into clauses
    const lines = tos.terms_content.split('\n');
    const parsedClauses = lines.map(line => {
      // Remove leading number and dot (e.g. "1. Scope of Work" -> "Scope of Work")
      return { id: crypto.randomUUID(), text: line.replace(/^\d+\.\s*/, '').trim() };
    }).filter(c => c.text !== "");
    
    setClauses(parsedClauses.length > 0 ? parsedClauses : [{ id: crypto.randomUUID(), text: "" }]);
    setExpandedId(tos.id);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTerms(id);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error("Failed to delete TOS", err);
    }
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDefaultTerms(id);
    } catch (err) {
      console.error("Failed to set default", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setClauses([{ id: crypto.randomUUID(), text: "" }]);
  };

  const updateClause = (id: string, value: string) => {
    setClauses(clauses.map(c => c.id === id ? { ...c, text: value } : c));
  };

  const removeClause = (id: string) => {
    if (clauses.length <= 1) {
      setClauses([{ id: crypto.randomUUID(), text: "" }]);
      return;
    }
    setClauses(clauses.filter(c => c.id !== id));
  };

  const addClause = () => {
    setClauses([...clauses, { id: crypto.randomUUID(), text: "" }]);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white">
      <UserHeader pageTitle="Terms of Service" />
      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="terms of service" />}

      <div className={`mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in`}>
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-dark-surface/60 shadow-sm p-6 md:p-8 backdrop-blur-xl">
          <div className="relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl">
              My Terms of Service Presets
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Create and manage custom TOS templates to select when submitting proposal contracts to clients.
            </p>
          </div>
          
          <div className="mt-6 flex border-b border-gray-200 dark:border-white/10">
            <button
              onClick={() => { setActiveTab('jobs'); handleCancelEdit(); }}
              className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'jobs' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white'}`}
            >
              Job Terms
            </button>
            <button
              onClick={() => { setActiveTab('gigs'); handleCancelEdit(); }}
              className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'gigs' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white'}`}
            >
              Gig Terms
            </button>
          </div>
        </div>

        {loading ? (
          <TosSkeletonLoader />
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 shadow-xl p-6 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-400" />
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingId ? `Edit ${activeTab === 'jobs' ? 'Job' : 'Gig'} Template` : `Create New ${activeTab === 'jobs' ? 'Job' : 'Gig'} Template`}
                  </h2>
                </div>

                <form onSubmit={handleSaveTOS} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      Terms Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Short Turnaround & Revisions TOS"
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      Terms & Clauses
                    </label>
                    <div className="space-y-3">
                      <Reorder.Group axis="y" values={clauses} onReorder={setClauses} className="space-y-3">
                        <AnimatePresence initial={false}>
                          {clauses.map((clause, index) => (
                            <Reorder.Item 
                              key={clause.id} 
                              value={clause}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                              transition={{ duration: 0.2 }}
                              className="flex gap-2 items-start"
                            >
                              <div className="mt-2.5 text-xs font-bold text-gray-400 w-4 text-right shrink-0">
                                {index + 1}.
                              </div>
                              <textarea
                                required
                                rows={1}
                                value={clause.text}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = "auto";
                                    el.style.height = `${el.scrollHeight}px`;
                                  }
                                }}
                                onChange={(e) => updateClause(clause.id, e.target.value)}
                                placeholder="Type a specific term or condition here..."
                                className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-xs text-gray-900 dark:text-white outline-none resize-none overflow-hidden leading-relaxed focus:border-blue-500/50 transition-colors"
                              />
                              <div className="flex flex-col gap-1 mt-1 shrink-0">
                                <div className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing rounded-lg transition-colors flex justify-center">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeClause(clause.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex justify-center"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </Reorder.Item>
                          ))}
                        </AnimatePresence>
                      </Reorder.Group>
                    </div>
                    <button
                      type="button"
                      onClick={addClause}
                      className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors px-1"
                    >
                      <Plus className="w-3 h-3" /> Add another clause
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-gray-500 transition hover:text-gray-900 dark:text-white"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                    >
                      {editingId ? "Update Template" : "Save TOS Template"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Saved {activeTab === 'jobs' ? 'Job' : 'Gig'} Presets ({filteredTerms.length})
              </h2>

              {filteredTerms.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-8 text-center text-xs text-gray-500">
                  No custom terms templates created yet for {activeTab}. Create one on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTerms.map((tos) => {
                    const isExpanded = expandedId === tos.id;
                    const isUsed = tos.usage_contracts && tos.usage_contracts.length > 0;

                    return (
                      <div key={tos.id} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/30 transition hover:border-white/20">
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : tos.id)}
                          className="flex cursor-pointer flex-col sm:flex-row sm:items-center justify-between p-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              {tos.terms_title}
                            </h3>
                            {tos.is_default && (
                                <span className="flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                  <Star className="h-3 w-3" /> Default
                                </span>
                            )}
                            {isUsed && tos.account_id !== null && (
                                <span className="flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                                  <AlertTriangle className="h-3 w-3" /> {activeTab === 'jobs' ? `Used for Proposal: ${tos.usage_contracts[0]?.title || 'Unknown'}` : `Used for Services`}
                                </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-3 sm:mt-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isUsed) handleEdit(tos);
                              }}
                              disabled={isUsed}
                              className={`rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-1.5 transition ${isUsed ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white'}`}
                              title={isUsed ? "Cannot edit template in use" : "Edit Template"}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isUsed && tos.account_id !== null) handleDelete(tos.id, e); }}
                              disabled={isUsed || tos.account_id === null}
                              className={`rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-1.5 transition ${isUsed || tos.account_id === null ? 'opacity-50 cursor-not-allowed text-gray-400' : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'}`}
                              title={tos.account_id === null ? "Cannot delete platform default templates" : isUsed ? "Cannot delete template in use" : "Delete Template"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <ChevronDown
                              className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </div>
                        </div>

                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                          <div className="overflow-hidden">
                            <div className="border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-dark-surface/60 p-4 text-xs leading-relaxed text-gray-600 dark:text-zinc-300 font-mono whitespace-pre-wrap">
                              {isUsed && tos.account_id !== null && (
                                <div className="mb-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                                  <p>This template is locked because it is actively used in one or more contracts/proposals. You must create a new template if you want to make changes.</p>
                                </div>
                              )}
                              {tos.terms_content}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.35s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default TosMain;