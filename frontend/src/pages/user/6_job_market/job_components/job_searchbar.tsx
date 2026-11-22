import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Loader2, Briefcase, User, Tag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import useGlobalState from "@/lib/global_state";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { CreditIcon } from "@/components/ui/credit-icon";
import type { Job } from "../job_types";
import type { JobSearchScope } from "../job_main";

interface JobSearchbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchScope?: JobSearchScope;
  setSearchScope?: (scope: JobSearchScope) => void;
  jobs?: Job[];
  onSelectCategory?: (category: string) => void;
  onSelectClient?: (clientName: string) => void;
  onSelectJob?: (jobId: string) => void;
}

const SCOPE_LABELS: Record<Exclude<JobSearchScope, "all">, string> = {
  title: "Job Title",
  client: "Client",
  category: "Category",
};

const JobSearchbar: React.FC<JobSearchbarProps> = ({
  searchQuery,
  setSearchQuery,
  searchScope = "all",
  setSearchScope,
  jobs = [],
  onSelectCategory,
  onSelectClient,
  onSelectJob,
}) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = searchQuery.trim();
  const q = trimmedQuery.toLowerCase();

  const suggestions = useMemo(() => {
    if (!q || jobs.length === 0) {
      return { jobs: [], clients: [], categories: [] as string[] };
    }

    const matchedJobs = jobs
      .filter(
        (j) =>
          (j.title || "").toLowerCase().includes(q) ||
          (j.category || "").toLowerCase().includes(q)
      )
      .slice(0, 4);

    const clientMap = new Map<string, { name: string; avatar?: string; count: number }>();
    for (const j of jobs) {
      const name = (j.postedBy || "").trim();
      if (!name || !name.toLowerCase().includes(q)) continue;
      const existing = clientMap.get(name.toLowerCase());
      if (existing) {
        existing.count += 1;
      } else {
        clientMap.set(name.toLowerCase(), {
          name,
          avatar: j.clientAvatar,
          count: 1,
        });
      }
    }
    const clients = Array.from(clientMap.values()).slice(0, 3);

    const categorySet = new Set<string>();
    for (const j of jobs) {
      const cat = (j.category || "").trim();
      if (cat && cat.toLowerCase().includes(q)) {
        categorySet.add(cat);
      }
    }
    const categories = Array.from(categorySet).slice(0, 2);

    return { jobs: matchedJobs, clients, categories };
  }, [jobs, q]);

  const handlePostClick = async () => {
    if (isCheckingAccess) return;
    if (isGuestMode) {
      setIsGuestModalOpen(true);
    } else {
      setIsCheckingAccess(true);
      try {
        await continueIfAccountVerified(
          () => navigate("/jobs/create"),
          false,
          "Account Verification is required to access Job Creation. Please verify your identity to proceed."
        );
      } finally {
        setIsCheckingAccess(false);
      }
    }
  };

  const applyScope = (scope: JobSearchScope) => {
    setSearchScope?.(scope);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
        <button
          data-tour="jobs-create-button"
          onClick={handlePostClick}
          disabled={isCheckingAccess}
          className={`shrink-0 flex items-center gap-2 rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-black transition-all duration-200 shadow-sm hover:shadow-md select-none ${
            isCheckingAccess ? "opacity-80 cursor-wait" : "hover:scale-105 active:scale-95 cursor-pointer"
          }`}
        >
          {isCheckingAccess ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Opening...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>Post a Job</span>
            </>
          )}
        </button>

        <div ref={searchContainerRef} data-tour="jobs-search-bar" className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by job title, client name, or category..."
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsDropdownOpen(false);
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            className={`w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 ${
              searchScope !== "all" ? "pr-36" : trimmedQuery ? "pr-10" : "pr-4"
            }`}
          />

          {/* Active Scope Pill + Clear Button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchScope !== "all" && trimmedQuery && (
              <button
                type="button"
                onClick={() => setSearchScope?.("all")}
                title="Reset search scope"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <span>{SCOPE_LABELS[searchScope]}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            {trimmedQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchScope?.("all");
                  setIsDropdownOpen(false);
                }}
                title="Clear search"
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scoped Live Suggestion Dropdown */}
          {isDropdownOpen && trimmedQuery.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xl dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
              <div className="p-2 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {/* Search Intent / Scope Options */}
                {setSearchScope && (
                  <div className="space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Search For &ldquo;{trimmedQuery}&rdquo; As
                    </div>
                    <button
                      type="button"
                      onClick={() => applyScope("title")}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                        searchScope === "title"
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Briefcase className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">
                          Job Title matching <strong className="font-bold">&ldquo;{trimmedQuery}&rdquo;</strong>
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">Title</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyScope("client")}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                        searchScope === "client"
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">
                          Client matching <strong className="font-bold">&ldquo;{trimmedQuery}&rdquo;</strong>
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0">User</span>
                    </button>

                    {suggestions.categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (onSelectCategory) {
                            onSelectCategory(cat);
                          } else {
                            applyScope("category");
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Tag className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                          <span className="truncate">
                            Filter by Category: <strong className="font-bold">{cat}</strong>
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">Category</span>
                      </button>
                    ))}

                    {searchScope !== "all" && (
                      <button
                        type="button"
                        onClick={() => applyScope("all")}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Search className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                          <span className="truncate">
                            Search everywhere for <strong className="font-bold">&ldquo;{trimmedQuery}&rdquo;</strong>
                          </span>
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">All</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Matching Jobs Preview */}
                {suggestions.jobs.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Matching Jobs
                    </div>
                    {suggestions.jobs.map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          if (onSelectJob) {
                            onSelectJob(job.id);
                          } else {
                            navigate(`/jobs/postings/${job.id}`);
                          }
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {job.thumbnail ? (
                            <img
                              src={job.thumbnail}
                              alt={job.title}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                              className="h-8 w-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 bg-zinc-100 dark:bg-zinc-900"
                            />
                          ) : (
                            <div className="h-8 w-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                              <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                              {job.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              {job.category} · by {job.postedBy}
                            </p>
                          </div>
                        </div>
                        {job.minBudget > 0 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                            <CreditIcon className="h-3 w-3" />
                            {job.maxBudget > 0 && job.maxBudget >= job.minBudget
                              ? `${job.minBudget.toLocaleString()}–${job.maxBudget.toLocaleString()}`
                              : `${job.minBudget.toLocaleString()}+`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Matching Clients Preview */}
                {suggestions.clients.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 space-y-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Matching Clients
                    </div>
                    {suggestions.clients.map((client) => (
                      <button
                        key={client.name}
                        type="button"
                        onClick={() => {
                          if (onSelectClient) {
                            onSelectClient(client.name);
                          } else {
                            setSearchQuery(client.name);
                            setSearchScope?.("client");
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {client.avatar ? (
                            <img
                              src={client.avatar}
                              alt={client.name}
                              className="h-7 w-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold shrink-0">
                              {client.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {client.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {client.count} {client.count === 1 ? "job" : "jobs"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <GuestLoginModal isOpen={isGuestModalOpen} onClose={() => setIsGuestModalOpen(false)} />
    </>
  );
};

export default JobSearchbar;
