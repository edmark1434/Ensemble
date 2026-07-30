// src/pages/user/terms_of_service/tos_main.tsx
import React, { useState, useEffect } from "react";
import UserHeader from "@/components/nav/user_header";
import { Plus, FileText, ChevronDown, Trash2, Edit3 } from "lucide-react";

export interface TosTemplate {
  id: string;
  terms_title: string;
  terms_content: string; // List of terms/clauses
}

const DEFAULT_TOS_TEMPLATES: TosTemplate[] = [
  {
    id: "tos-1",
    terms_title: "Standard Platform TOS",
    terms_content:
      "1. All deliverables remain property of the creator until final milestone payout.\n2. Source files delivered upon project completion.\n3. Communication conducted via platform inbox.\n4. Additional revisions outside milestone quotas billed at agreed additional work rate.",
  },
  {
    id: "tos-2",
    terms_title: "Strict IP Transfer TOS",
    terms_content:
      "1. Full IP transfer granted immediately upon each milestone approval.\n2. Raw media and project files transferred after step sign-off.\n3. Non-disclosure agreement applies to all unreleased media.",
  },
];

// ============================================================================
// SKELETON COMPONENT FOR LOADING STATE
// ============================================================================
const TosSkeletonLoader: React.FC = () => (
  <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-pulse">
    {/* Banner Skeleton */}
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
      <div className="h-8 w-64 rounded-lg bg-white/10" />
      <div className="mt-2 h-4 w-96 max-w-full rounded-lg bg-white/5" />
    </div>

    {/* Layout Grid Skeleton */}
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left Form Skeleton */}
      <div className="lg:col-span-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-white/5" />
            <div className="h-10 w-full rounded-xl bg-white/5" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-white/5" />
            <div className="h-40 w-full rounded-xl bg-white/5" />
          </div>
          <div className="h-10 w-full rounded-xl bg-white/10" />
        </div>
      </div>

      {/* Right List Skeleton */}
      <div className="lg:col-span-7 space-y-4">
        <div className="h-5 w-32 rounded bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-white/10" />
                <div className="h-4 w-48 rounded bg-white/10" />
              </div>
              <div className="h-4 w-12 rounded bg-white/5" />
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
  const [loading, setLoading] = useState(true);
  const [tosList, setTosList] = useState<TosTemplate[]>(DEFAULT_TOS_TEMPLATES);
  const [expandedId, setExpandedId] = useState<string | null>("tos-1");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Simulate smooth page loading delay
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Handle Save / Update TOS
  const handleSaveTOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingId) {
      // Update existing item
      setTosList((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, terms_title: title.trim(), terms_content: content.trim() }
            : item
        )
      );
      setEditingId(null);
    } else {
      // Create new item
      const newTos: TosTemplate = {
        id: `tos-${Date.now()}`,
        terms_title: title.trim(),
        terms_content: content.trim(),
      };
      setTosList((prev) => [newTos, ...prev]);
      setExpandedId(newTos.id);
    }

    setTitle("");
    setContent("");
  };

  // Populate form for editing
  const handleEdit = (tos: TosTemplate) => {
    setEditingId(tos.id);
    setTitle(tos.terms_title);
    setContent(tos.terms_content);
    setExpandedId(tos.id);
  };

  // Delete template
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTosList((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  return (
    <div className="min-h-screen bg-[#080a12] text-white">
      {/* Top Header */}
      <UserHeader pageTitle="Terms of Service" credits={1250} />

      {loading ? (
        <TosSkeletonLoader />
      ) : (
        /* Animated Main Container */
        <div className="mx-auto max-w-7xl p-6 md:p-8 space-y-8 animate-fade-in">
          {/* Banner Title */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 p-6 md:p-8 backdrop-blur-xl">
            <div className="relative z-10">
              <h1
                className="text-2xl font-extrabold tracking-tight text-white md:text-3xl"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                My Terms of Service Presets
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Create and manage custom TOS templates to select when submitting proposal contracts to clients.
              </p>
            </div>
          </div>

          {/* Content Layout */}
          <div className="grid gap-8 lg:grid-cols-12">
            {/* LEFT: TOS Form Creator */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 shadow-xl backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-400" />
                  <h2
                    className="text-base font-bold text-white"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {editingId ? "Edit TOS Template" : "Create New TOS Template"}
                  </h2>
                </div>

                <form onSubmit={handleSaveTOS} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Terms Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Short Turnaround & Revisions TOS"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 transition focus:border-blue-500/50 focus:outline-none"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    />
                  </div>

                  {/* Terms List / Body */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Terms & Clauses (List)
                    </label>
                    <textarea
                      required
                      rows={8}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="1. Source files delivered upon project completion.&#10;2. Milestone revisions limited to 2 rounds."
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs font-mono text-white placeholder-zinc-500 transition focus:border-blue-500/50 focus:outline-none resize-y leading-relaxed"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:text-white"
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
                className="text-base font-bold text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Saved Presets ({tosList.length})
              </h2>

              {tosList.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-zinc-500">
                  No custom terms templates created yet. Create one on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {tosList.map((tos) => {
                    const isExpanded = expandedId === tos.id;

                    return (
                      <div
                        key={tos.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/30 transition hover:border-white/20"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() =>
                            setExpandedId(isExpanded ? null : tos.id)
                          }
                          className="flex cursor-pointer items-center justify-between p-4 text-left transition hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                            <h3
                              className="text-sm font-bold text-white"
                              style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}
                            >
                              {tos.terms_title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(tos);
                              }}
                              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                              title="Edit Template"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(tos.id, e)}
                              className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition hover:bg-red-500/20 hover:text-red-400"
                              title="Delete Template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <ChevronDown
                              className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${
                                isExpanded ? "rotate-180 text-white" : ""
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
                            <div className="border-t border-white/5 bg-zinc-950/60 p-4 text-xs leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap">
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