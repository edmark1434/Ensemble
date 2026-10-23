import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Briefcase, CheckCircle2, XCircle, Sparkles, Eye } from "lucide-react";
import api from "@/lib/axios";

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
  size?: string;
}

interface CreateTermsProps {
  portfolioUseAllowed: boolean;
  setPortfolioUseAllowed: (val: boolean) => void;
  portfolioDuration: string;
  setPortfolioDuration: (val: string) => void;
  isExistingProject: boolean;
  setIsExistingProject: (val: boolean) => void;
  existingProjectId: string | null;
  setExistingProjectId: (val: string | null) => void;
  initiatorRole: string;
  setInitiatorRole: (val: string) => void;
  requireNDA: boolean;
  setRequireNDA: (val: boolean) => void;
  errors: { [key: string]: string };
  setErrors?: any;
  onBack: () => void;
  onAdvance: () => void;
  advanceButtonText?: string;
  isTeam?: boolean;
}

export const CreateTerms: React.FC<CreateTermsProps> = ({
  portfolioUseAllowed,
  setPortfolioUseAllowed,
  portfolioDuration,
  setPortfolioDuration,
  isExistingProject,
  setIsExistingProject,
  existingProjectId,
  setExistingProjectId,
  initiatorRole,
  setInitiatorRole,
  requireNDA,
  setRequireNDA,
  errors,
  onBack,
  onAdvance,
  advanceButtonText,
  isTeam = false,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (isExistingProject && initiatorRole === "Client" && projects.length === 0) {
      const fetchProjects = async () => {
        try {
          setLoadingProjects(true);
          const response = await api.get('/api/projects');
          setProjects(response.data.projects || []);
        } catch (error) {
          console.error("Failed to fetch projects", error);
        } finally {
          setLoadingProjects(false);
        }
      };
      fetchProjects();
    }
  }, [isExistingProject, initiatorRole, projects.length]);

  const selectedProject = projects.find(p => p.id === existingProjectId);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Workflow & Terms</h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Set the rules for the final output, project initiation, and confidentiality agreements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Configuration Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Initiator Role */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <label className="text-sm font-bold text-gray-900 dark:text-white block mb-0.5">
              Who will initiate the creation of the video project?
            </label>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
              If this is a new collaboration, who is responsible for initiating and inviting the other party?
            </p>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="initiatorRole"
                  value="Client"
                  checked={initiatorRole === "Client"}
                  onChange={(e) => {
                    setInitiatorRole(e.target.value);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">Me (Client)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="initiatorRole"
                  value="Freelancer"
                  checked={initiatorRole === "Freelancer"}
                  onChange={(e) => {
                    setInitiatorRole(e.target.value);
                    setIsExistingProject(false);
                    setExistingProjectId(null);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-white/20 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200">The Freelancer</span>
              </label>
            </div>
          </div>

          {/* 2. Confidentiality / NDA */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="flex items-start gap-3.5">
              <input 
                type="checkbox" 
                checked={requireNDA}
                onChange={(e) => setRequireNDA(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
              />
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer" onClick={() => setRequireNDA(!requireNDA)}>
                  Require Confidentiality (NDA)
                </label>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Let candidates know they cannot share any details about this project with anyone while it is in active development.
                  {requireNDA && (
                    <span className={`block mt-2 font-medium ${portfolioUseAllowed ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {portfolioUseAllowed 
                        ? "✓ Since you allow Portfolio Use below, they will be permitted to showcase approved clips only after the project is officially completed."
                        : "ⓘ They will not be permitted to share the footage or finished edit even after completion unless Portfolio Use is explicitly allowed."}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Portfolio Use */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
            <div className="flex items-start gap-3.5">
              <input 
                type="checkbox" 
                checked={portfolioUseAllowed}
                onChange={(e) => {
                  setPortfolioUseAllowed(e.target.checked);
                  if (!e.target.checked) setPortfolioDuration("");
                }}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
              />
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer" onClick={() => {
                  const nextVal = !portfolioUseAllowed;
                  setPortfolioUseAllowed(nextVal);
                  if (!nextVal) setPortfolioDuration("");
                }}>
                  Allow Freelancer Portfolio Use
                </label>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Agree to let the freelancer showcase the final project cut in their personal portfolio reel.
                </p>
                {portfolioUseAllowed && (
                  <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-white/5">
                    <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block mb-2">
                      Allowed Showcase Duration <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["5", "10", "15", "20", "30", "45", "60"].map(secs => (
                        <button
                          key={secs}
                          type="button"
                          onClick={() => setPortfolioDuration(secs)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                            portfolioDuration === secs 
                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20" 
                              : "bg-gray-50 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {secs} secs
                        </button>
                      ))}
                    </div>
                    {errors.portfolioDuration && <p className="text-[11px] font-medium text-red-500 mt-2">{errors.portfolioDuration}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Existing Project Link */}
          {initiatorRole === "Client" && (
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-xs">
              <div className="flex items-start gap-3.5">
                <input 
                  type="checkbox" 
                  checked={isExistingProject}
                  onChange={(e) => {
                    setIsExistingProject(e.target.checked);
                    if (!e.target.checked) setExistingProjectId(null);
                  }}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 bg-transparent cursor-pointer"
                />
                <div className="flex-1">
                  <label className="text-sm font-bold text-gray-900 dark:text-white block cursor-pointer" onClick={() => {
                    const nextVal = !isExistingProject;
                    setIsExistingProject(nextVal);
                    if (!nextVal) setExistingProjectId(null);
                  }}>
                    Link to Existing Project
                  </label>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Is this job part of an existing Ensemble project? (Helps auto-populate contract terms)
                  </p>
                  {isExistingProject && (
                    <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-white/5">
                      <label className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider block mb-2">
                        Select Project <span className="text-red-500">*</span>
                      </label>
                      {loadingProjects ? (
                        <div className="text-xs text-gray-500">Loading projects...</div>
                      ) : existingProjectId ? (
                        <div className="flex flex-col gap-2">
                          {projects.filter(p => p.id === existingProjectId).map(p => (
                            <div key={p.id} className="relative w-56 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d2d] shadow-sm">
                              <div className="h-28 bg-gray-100 dark:bg-black/40 relative">
                                {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                                {p.duration_seconds && (
                                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="font-bold">{new Date(p.duration_seconds * 1000).toISOString().slice(11, 19)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="p-2.5">
                                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                                <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                                  <span>{p.width}x{p.height}</span>
                                  <span>{p.size}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button 
                            type="button" 
                            onClick={() => setExistingProjectId(null)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline text-left font-bold cursor-pointer"
                          >
                            Change Project
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {projects.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setExistingProjectId(p.id)}
                              className="text-left relative rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 hover:border-blue-500 transition-colors bg-white dark:bg-[#1a1d2d] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <div className="h-20 bg-gray-100 dark:bg-black/40 relative">
                                {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                              </div>
                              <div className="p-2">
                                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.existingProjectId && <p className="text-[11px] font-medium text-red-500 mt-1">{errors.existingProjectId}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Job Post Sidebar Preview */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                Workflow & Terms
              </h4>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Live Job Post Preview
              </span>
            </div>

            {/* Exact Card matching Job Post Details UI */}
            <div className="p-4 sm:p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4 shadow-xs">
              {/* Client initiates the project? */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                  {initiatorRole === "Client" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Client initiates the project?</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {initiatorRole === "Client"
                      ? "Yes, the client will create the project upon hiring."
                      : "No, the freelancer is expected to create the project."}
                  </p>
                </div>
              </div>

              {/* Client linked an existing project? */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                  {isExistingProject && existingProjectId ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Client linked an existing project?</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {isExistingProject && existingProjectId
                      ? (selectedProject ? `Yes, linked to "${selectedProject.name}".` : "Yes, a project is already prepared for this job.")
                      : "No, a project has not been linked yet."}
                  </p>
                </div>
              </div>

              {/* Require Confidentiality (NDA)? */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                  {requireNDA ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Require Confidentiality (NDA)?</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {requireNDA
                      ? "Yes, freelancers cannot share details about this project during development."
                      : "No, a strict confidentiality agreement is not required."}
                  </p>
                </div>
              </div>

              {/* Allow Portfolio Use? */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                  {portfolioUseAllowed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Portfolio Use?</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {portfolioUseAllowed
                      ? `Yes, allowed to use output for portfolio (Up to ${portfolioDuration || "45"} secs).`
                      : "No, not allowed to use final output for personal portfolio."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance Banner */}
          <div className="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] text-[11px] text-gray-500 dark:text-zinc-400 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Marketplace Transparency:</strong> This preview reflects how candidates see your terms before applying.
            </span>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH ACTIONS */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition text-sm focus:outline-none shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <button
          type="button"
          onClick={onAdvance}
          className="min-w-[220px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition focus:outline-none shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99] cursor-pointer"
        >
          {advanceButtonText || (isTeam ? "Continue to Milestones" : "Confirm and Review")} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateTerms;
