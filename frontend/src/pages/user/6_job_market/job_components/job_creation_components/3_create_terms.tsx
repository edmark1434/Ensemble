import React, { useState, useEffect } from "react";
import { ArrowRight, HelpCircle, FileText, Settings, User } from "lucide-react";
import api from "@/lib/axios";

interface Project {
  id: string;
  name: string;
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
  errors: { [key: string]: string };
  onBack: () => void;
  onAdvance: () => void;
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
  errors,
  onBack,
  onAdvance,
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

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Workflow & Terms</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Set the rules for the final output and collaboration initiation.</p>
      </div>

      <div className="space-y-4">
        {/* Initiator */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          <label className="text-sm font-semibold text-gray-900 dark:text-white block mb-0.5">
            Who will initiate the Creation of the video project?
          </label>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
            If this is a new project, who is responsible for creating and inviting the other party?
          </p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="initiatorRole"
                value="Client"
                checked={initiatorRole === "Client"}
                onChange={(e) => {
                  setInitiatorRole(e.target.value);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 bg-transparent"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Me (Client)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 bg-transparent"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">The Freelancer</span>
            </label>
          </div>
        </div>

        {/* Portfolio Use */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              checked={portfolioUseAllowed}
              onChange={(e) => {
                setPortfolioUseAllowed(e.target.checked);
                if (!e.target.checked) setPortfolioDuration("");
              }}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent"
            />
            <div className="flex-1">
              <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                Allow Freelancer Portfolio Use
              </label>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Agree to let the freelancer use the final project output for their personal portfolio.
              </p>
              {portfolioUseAllowed && (
                <div className="mt-3">
                  <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                    Allowed Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["5", "10", "15", "20", "30", "45", "60"].map(secs => (
                      <button
                        key={secs}
                        type="button"
                        onClick={() => setPortfolioDuration(secs)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          portfolioDuration === secs 
                            ? "bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10"
                        }`}
                      >
                        {secs} secs
                      </button>
                    ))}
                  </div>
                  {errors.portfolioDuration && <p className="text-[11px] text-red-400 mt-2">{errors.portfolioDuration}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Existing Project Link */}
        {initiatorRole === "Client" && (
          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
            <div className="flex items-start gap-3">
              <input 
                type="checkbox" 
                checked={isExistingProject}
                onChange={(e) => {
                  setIsExistingProject(e.target.checked);
                  if (!e.target.checked) setExistingProjectId(null);
                }}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-transparent"
              />
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900 dark:text-white block">
                  Link to Existing Project
                </label>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Is this job part of an existing Ensemble project? (Helps with contract creation)
                </p>
                {isExistingProject && (
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                      Select Project <span className="text-red-500">*</span>
                    </label>
                    {loadingProjects ? (
                      <div className="text-xs text-gray-500">Loading projects...</div>
                    ) : existingProjectId ? (
                      <div className="flex flex-col gap-2">
                        {projects.filter(p => p.id === existingProjectId).map(p => (
                          <div key={p.id} className="relative w-48 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1d2d] shadow-sm">
                            <div className="h-24 bg-gray-100 dark:bg-black/40 relative">
                              {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                              {p.duration_seconds && (
                                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <span className="font-bold">{new Date(p.duration_seconds * 1000).toISOString().slice(11, 19)}</span>
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                              <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500">
                                <span>{p.width}x{p.height}</span>
                                <span>{p.size}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setExistingProjectId(null)}
                          className="text-[10px] text-blue-500 hover:underline text-left font-bold"
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
                            className="text-left relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 hover:border-blue-500 transition-colors bg-white dark:bg-[#1a1d2d] focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <div className="h-20 bg-gray-100 dark:bg-black/40 relative">
                              {p.thumbnail && <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="p-2">
                              <div className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{p.name}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.existingProjectId && <p className="text-[11px] text-red-400 mt-1">{errors.existingProjectId}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex gap-2.5">
        <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs focus:outline-none">Go Back</button>
        <button type="button" onClick={onAdvance} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white hover:bg-blue-600 transition focus:outline-none shadow-lg shadow-blue-500/20">
          Confirm and Review <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateTerms;
