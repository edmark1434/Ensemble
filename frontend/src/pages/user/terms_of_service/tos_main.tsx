import useGlobalState from "@/lib/global_state";
import { UnverifiedOverlay } from "@/components/ui/UnverifiedOverlay";
// src/pages/user/terms_of_service/tos_main.tsx
import React, { useState, useEffect } from "react";
import UserHeader from "@/components/nav/user_header";
import { Plus, FileText, ChevronDown, Trash2, Edit3 } from "lucide-react";

import { useTerms, type TosTemplate } from "@/hooks/useTerms";

// ============================================================================
// SKELETON COMPONENT FOR LOADING STATE
// ============================================================================
const TosSkeletonLoader: React.FC = () => (
  <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-pulse">
    {/* Banner Skeleton */}
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-6 md:p-8">
      <div className="h-8 w-64 rounded-lg bg-gray-100 dark:bg-white/10" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
    </div>

    {/* Layout Grid Skeleton */}
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left Form Skeleton */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-gray-100 dark:bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
            <div className="h-10 w-full rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
            <div className="h-40 w-full rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
          </div>
          <div className="h-10 w-full rounded-xl bg-gray-100 dark:bg-white/10" />
        </div>
      </div>

      {/* Right List Skeleton */}
      <div className="lg:col-span-7 space-y-4">
        <div className="h-5 w-32 rounded bg-gray-100 dark:bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-gray-100 dark:bg-white/10" />
                <div className="h-4 w-48 rounded bg-gray-100 dark:bg-white/10" />
              </div>
              <div className="h-4 w-12 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const TosMain: React.FC = () => { 
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);
  const { terms: tosList, loading, error, fetchTerms, createTerms, updateTerms, deleteTerms } = useTerms();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditingDefault, setIsEditingDefault] = useState(false);

  // Fetch terms on mount
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  // Set default expanded item once loaded
  useEffect(() => {
    if (tosList.length > 0 && !expandedId) {
      setExpandedId(tosList[0].id);
    }
  }, [tosList, expandedId]);

  // Handle Save / Update TOS
  const handleSaveTOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      if (editingId && !isEditingDefault) {
        // Update existing user template
        const updated = await updateTerms(editingId, { terms_title: title.trim(), terms_content: content.trim() });
        setExpandedId(updated.id);
        setEditingId(null);
      } else {
        // Create new template (or clone default)
        const created = await createTerms({ terms_title: title.trim(), terms_content: content.trim() });
        setExpandedId(created.id);
        setEditingId(null);
        setIsEditingDefault(false);
      }
      setTitle("");
      setContent("");
    } catch (err) {
      console.error("Failed to save TOS", err);
    }
  };

  // Populate form for editing
  const handleEdit = (tos: TosTemplate) => {
    setEditingId(tos.id);
    setIsEditingDefault(tos.is_default);
    setTitle(tos.terms_title);
    setContent(tos.terms_content);
    setExpandedId(tos.id);
  };

  // Delete template
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTerms(id);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error("Failed to delete TOS", err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsEditingDefault(false);
    setTitle("");
    setContent("");
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white">
      {/* Top Header */}
      <UserHeader pageTitle="Terms of Service" credits={1250} />
      {!isGuestMode && !isVerified && <UnverifiedOverlay featureName="terms of service" />}

      {loading ? (
        <TosSkeletonLoader />
      ) : (
        /* Animated Main Container */
        <div className={`mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in`}>
          {/* Banner Title */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-dark-surface/60 shadow-sm dark:shadow-none p-6 md:p-8 backdrop-blur-xl">
            <div className="relative z-10">
              <h1
                className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white md:text-3xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                My Terms of Service Presets
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                Create and manage custom TOS templates to select when submitting proposal contracts to clients.
              </p>
            </div>
          </div>

          {/* Content Layout */}
          <div className="grid gap-8 lg:grid-cols-12">
            {/* LEFT: TOS Form Creator */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 shadow-sm dark:shadow-none p-6 shadow-xl backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-400" />
                  <h2
                    className="text-base font-bold text-gray-900 dark:text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {editingId ? "Edit TOS Template" : "Create New TOS Template"}
                  </h2>
                </div>

                <form onSubmit={handleSaveTOS} className="space-y-4">
                  {/* Title */}
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
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-zinc-500 transition focus:border-blue-500/50 focus:outline-none"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />
                  </div>

                  {/* Terms List / Body */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      Terms & Clauses (List)
                    </label>
                    <textarea
                      required
                      rows={8}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="1. Source files delivered upon project completion.&#10;2. Milestone revisions limited to 2 rounds."
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3.5 text-xs font-mono text-gray-900 dark:text-white placeholder-zinc-500 transition focus:border-blue-500/50 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-gray-500 dark:text-zinc-400 transition hover:text-gray-900 dark:text-white"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {editingId ? "Update Template" : "Save TOS Template"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT: Saved TOS Templates List */}
            <div className="lg:col-span-7 space-y-4">
              <h2
                className="text-base font-bold text-gray-900 dark:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Saved Presets ({tosList.length})
              </h2>

              {tosList.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-8 text-center text-xs text-gray-500 dark:text-zinc-500">
                  No custom terms templates created yet. Create one on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {tosList.map((tos) => {
                    const isExpanded = expandedId === tos.id;

                    return (
                      <div
                        key={tos.id}
                        className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/30 transition hover:border-white/20"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() =>
                            setExpandedId(isExpanded ? null : tos.id)
                          }
                          className="flex cursor-pointer items-center justify-between p-4 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 shadow-sm dark:shadow-none"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                            <h3
                              className="text-sm font-bold text-gray-900 dark:text-white"
                              style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              {tos.terms_title}
                            </h3>
                            {tos.usage_contracts && tos.usage_contracts.length > 0 && (
                                <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-blue-300">
                                  Used in {tos.usage_contracts.length} {tos.usage_contracts.length === 1 ? 'Job' : 'Jobs'}
                                </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(tos);
                              }}
                              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-1.5 text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
                              title={tos.is_default ? "Clone & Edit Template" : "Edit Template"}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {!tos.is_default && (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(tos.id, e)}
                                className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-1.5 text-gray-500 dark:text-zinc-400 transition hover:bg-red-500/20 hover:text-red-400"
                                title="Delete Template"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <ChevronDown
                              className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-300 ${
                                isExpanded ? "rotate-180 text-gray-900 dark:text-white" : ""
                              }`}
                            />
                          </div>
                        </div>

                        {/* Accordion Content Body */}
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isExpanded
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-dark-surface/60 shadow-sm dark:shadow-none p-4 text-xs leading-relaxed text-gray-600 dark:text-zinc-300 font-mono whitespace-pre-wrap">
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
        </div>
      )}

      {/* Fade-in Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TosMain;