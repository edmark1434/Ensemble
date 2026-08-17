import {
    Briefcase,
    ClipboardList,
    FileText,
    FolderKanban,
    Handshake,
    Home,
    Inbox,
    Megaphone,
    MessageSquare,
    Palette,
    Shield,
    Users,
    Wallet,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BriefcaseBusiness,
    MicVocal,
    LayoutDashboard,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import useGlobalState from "@/lib/global_state";

type NavItem = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    to: string;
};

let primaryNavInitial: NavItem[] = [
    { label: "Home", icon: Home, to: "/home" },
    { label: "Projects", icon: FolderKanban, to: "/projects" },
    { label: "Teams", icon: Users, to: "/teams" },
    { label: "Forums", icon: MessageSquare, to: "/forums" },
    { label: "Asset Library", icon: Palette, to: "/assets" },
];

let jobsItemsInitial: NavItem[] = [
    { label: "Job Posting", icon: Briefcase, to: "/jobs" },
    { label: "Proposals", icon: ClipboardList, to: "/jobs/proposals" },
];

let gigsItemsInitial: NavItem[] = [
    { label: "Services", icon: Megaphone, to: "/gigs" },
    { label: "Orders", icon: Inbox, to: "/orders" },
];

let activityRecordsInitial: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "My Terms", icon: FileText, to: "/terms-of-services" },
    { label: "My Contracts", icon: Shield, to: "/contracts" },
    { label: "Transaction History", icon: Wallet, to: "/transactions" },
    { label: "Inbox", icon: MessageSquare, to: "/inbox" },
];

interface UserNavProps {
    userName?: string;
    userTier?: string;
    userAvatar?: string;
}

const UserNav: React.FC<UserNavProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isJobsOpen, setIsJobsOpen] = useState(false);
    const [isGigsOpen, setIsGigsOpen] = useState(false);

    const primaryNavState = primaryNavInitial;
    const jobsState = jobsItemsInitial;
    const gigsState = gigsItemsInitial;
    const activityState = activityRecordsInitial;

    const handleLogoClick = () => {
       const { user: currentUser, isAuthenticated: auth } = useGlobalState.getState();
       if (auth && currentUser?.type === "User") {
          navigate("/home");
          return;
       }
       navigate("/");
    };

    const sectionHeaderClassName = () =>
       `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 ${
          isCollapsed ? "justify-center px-2" : ""
       }`;

    // Helper to determine active state for Jobs sub-navigation
    const isJobItemActive = (to: string) => {
        if (to === "/jobs") {
            return (
                location.pathname.startsWith("/jobs") &&
                !location.pathname.startsWith("/jobs/proposals")
            );
        }
        if (to === "/jobs/proposals") {
            return location.pathname.startsWith("/jobs/proposals");
        }
        return location.pathname === to;
    };

    return (
       <>
          <aside
             className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base transition-all duration-300 ${
                isCollapsed ? "w-20" : "w-64"
             }`}
          >
             {/* Logo Section */}
             <button
                type="button"
                onClick={handleLogoClick}
                className={`flex items-center border-b border-gray-200 dark:border-white/10 px-5 py-5 text-left transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                   isCollapsed ? "justify-center px-2" : "gap-2.5"
                }`}
             >
                <img
                   src="/ensemble_lg.svg"
                   alt="Ensemble Logo"
                   className="h-9 w-9 shrink-0 invert dark:invert-0"
                />
                {!isCollapsed && (
                   <div className="overflow-hidden whitespace-nowrap px-2">
                      <p className="text-base font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                         Ensemble
                      </p>
                   </div>
                )}
             </button>

             {/* Navigation Layout Group */}
             <LayoutGroup>
                <nav className="flex-1 px-3 py-5 scrollbar-thin overflow-y-auto">

                   {/* 1. Main Menu */}
                   <div>
                      {!isCollapsed && (
                         <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                            Main Menu
                         </p>
                      )}
                      <ul className="space-y-1">
                         {primaryNavState.map(({ label, icon: Icon, to }) => (
                            <li key={label}>
                               {!isCollapsed ? (
                                  <NavLink to={to}>
                                     {({ isActive }) => (
                                        <div
                                           className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                              isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                           }`}
                                        >
                                           {isActive && (
                                              <motion.div
                                                 layoutId="activeNavBackground"
                                                 className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 nav-rainbow-shine"
                                                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                              />
                                           )}
                                           <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                           <span className="relative z-10 text-sm">{label}</span>
                                        </div>
                                     )}
                                  </NavLink>
                               ) : (
                                  /* Collapsed Floating Display for Primary Items */
                                  <div className="group w-full flex justify-center hover:z-50">
                                     <NavLink to={to}>
                                        {({ isActive }) => (
                                           <div
                                              className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                 isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                              }`}
                                           >
                                              {isActive && (
                                                 <motion.div
                                                    layoutId="activeNavBackgroundCollapsed"
                                                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 nav-rainbow-shine"
                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                 />
                                              )}
                                              <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                           </div>
                                        )}
                                     </NavLink>

                                     {/* Floating Title Display */}
                                     <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="rounded-lg border border-white/10 bg-[#0d0f1a] px-3 py-2 shadow-2xl animate-fade-in whitespace-nowrap">
                                           <span className="text-xs font-medium text-zinc-200">{label}</span>
                                        </div>
                                     </div>
                                  </div>
                               )}
                            </li>
                         ))}
                      </ul>
                   </div>

                   {/* Section Separator Line */}
                   {isCollapsed && <div className="my-4 border-t border-gray-200 dark:border-white/10 mx-2" />}

                   {/* 2. Marketplace Section */}
                   <div className={isCollapsed ? "mt-0 space-y-3" : "mt-6"}>
                      {!isCollapsed && (
                         <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                            Marketplace
                         </p>
                      )}

                      {/* Jobs Section */}
                      {!isCollapsed ? (
                         <div className="mb-2">
                            <button onClick={() => setIsJobsOpen(!isJobsOpen)} className={sectionHeaderClassName()}>
                               <BriefcaseBusiness className="h-4 w-4 shrink-0" />
                               <span className="flex-1 text-left text-sm font-medium">Jobs</span>
                               <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isJobsOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${isJobsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                               <ul className="ml-6 overflow-hidden space-y-1 border-l border-gray-200 dark:border-white/10 pl-2">
                                  {jobsState.map(({ label, icon: Icon, to }) => {
                                     const isActive = isJobItemActive(to);
                                     return (
                                        <li key={label}>
                                           <NavLink to={to}>
                                              <div
                                                 className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                                                    isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                                 }`}
                                              >
                                                 {isActive && (
                                                    <motion.div
                                                       layoutId="activeNavBackground"
                                                       className="absolute inset-0 rounded-lg nav-rainbow-shine"
                                                       transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                    />
                                                 )}
                                                 <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                                                 <span className="relative z-10 text-xs">{label}</span>
                                              </div>
                                           </NavLink>
                                        </li>
                                     );
                                  })}
                               </ul>
                            </div>
                         </div>
                      ) : (
                         /* Collapsed Menu Flyout Item for Jobs */
                         <div className="group w-full flex justify-center hover:z-50">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-white/5 group-hover:text-gray-900 dark:group-hover:text-white cursor-pointer">
                               <BriefcaseBusiness className="h-4 w-4" />
                            </div>

                            <div className="absolute left-full -ml-6 pl-6 hidden w-52 group-hover:block z-50">
                               <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-xl dark:shadow-2xl animate-fade-in">
                                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-white/5 mb-1">Jobs</p>
                                  <ul className="space-y-0.5">
                                     {jobsState.map(({ label, icon: Icon, to }) => {
                                        const isActive = isJobItemActive(to);
                                        return (
                                           <li key={label}>
                                              <NavLink to={to} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                                                 <Icon className="h-3.5 w-3.5 shrink-0" />
                                                 <span>{label}</span>
                                              </NavLink>
                                           </li>
                                        );
                                     })}
                                  </ul>
                               </div>
                            </div>
                         </div>
                      )}

                      {/* Gigs Section */}
                      {!isCollapsed ? (
                         <div className="mb-2">
                            <button onClick={() => setIsGigsOpen(!isGigsOpen)} className={sectionHeaderClassName()}>
                               <MicVocal className="h-4 w-4 shrink-0" />
                               <span className="flex-1 text-left text-sm font-medium">Gigs</span>
                               <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isGigsOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${isGigsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                               <ul className="ml-6 overflow-hidden space-y-1 border-l border-gray-200 dark:border-white/10 pl-2">
                                  {gigsState.map(({ label, icon: Icon, to }) => (
                                     <li key={label}>
                                        <NavLink to={to}>
                                           {({ isActive }) => (
                                              <div
                                                 className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                                                    isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                                 }`}
                                              >
                                                 {isActive && (
                                                    <motion.div
                                                       layoutId="activeNavBackground"
                                                       className="absolute inset-0 rounded-lg nav-rainbow-shine"
                                                       transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                    />
                                                 )}
                                                 <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" />
                                                 <span className="relative z-10 text-xs">{label}</span>
                                              </div>
                                           )}
                                        </NavLink>
                                     </li>
                                  ))}
                               </ul>
                            </div>
                         </div>
                      ) : (
                         /* Collapsed Menu Flyout Item for Gigs */
                         <div className="group w-full flex justify-center hover:z-50">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-white/5 group-hover:text-gray-900 dark:group-hover:text-white cursor-pointer">
                               <MicVocal className="h-4 w-4" />
                            </div>

                            <div className="absolute left-full -ml-6 pl-6 hidden w-52 group-hover:block z-50">
                               <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-xl dark:shadow-2xl animate-fade-in">
                                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-white/5 mb-1">Gigs</p>
                                  <ul className="space-y-0.5">
                                     {gigsState.map(({ label, icon: Icon, to }) => (
                                        <li key={label}>
                                           <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}>
                                              <Icon className="h-3.5 w-3.5 shrink-0" />
                                              <span>{label}</span>
                                           </NavLink>
                                        </li>
                                     ))}
                                  </ul>
                               </div>
                            </div>
                         </div>
                      )}
                   </div>

                   {/* Section Separator Line */}
                   {isCollapsed && <div className="my-4 border-t border-gray-200 dark:border-white/10 mx-2" />}

                   {/* 3. Activity & Records Section */}
                   <div className={isCollapsed ? "mt-0 space-y-1" : "mt-6"}>
                      {!isCollapsed && (
                         <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                            Activity & Records
                         </p>
                      )}
                      <ul className="space-y-1">
                         {activityState.map(({ label, icon: Icon, to }) => (
                            <li key={label} className="w-full">
                               {!isCollapsed ? (
                                  <NavLink to={to}>
                                     {({ isActive }) => (
                                        <div
                                           className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                              isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                           }`}
                                        >
                                           {isActive && (
                                              <motion.div
                                                 layoutId="activeNavBackground"
                                                 className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 nav-rainbow-shine"
                                                 transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                              />
                                           )}
                                           <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                           <span className="relative z-10 text-sm">{label}</span>
                                        </div>
                                     )}
                                  </NavLink>
                               ) : (
                                  /* Collapsed Floating Display for Activity Items */
                                  <div className="group w-full flex justify-center hover:z-50">
                                     <NavLink to={to}>
                                        {({ isActive }) => (
                                           <div
                                              className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                 isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                              }`}
                                           >
                                              {isActive && (
                                                 <motion.div
                                                    layoutId="activeNavBackgroundCollapsed"
                                                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-gray-800/40 dark:to-gray-700/20 shadow-sm border border-gray-200 dark:border-gray-700/50 nav-rainbow-shine"
                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                 />
                                              )}
                                              <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                           </div>
                                        )}
                                     </NavLink>

                                     {/* Floating Title Display */}
                                     <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="rounded-lg border border-white/10 bg-[#0d0f1a] px-3 py-2 shadow-2xl animate-fade-in whitespace-nowrap">
                                           <span className="text-xs font-medium text-zinc-200">{label}</span>
                                        </div>
                                     </div>
                                  </div>
                               )}
                            </li>
                         ))}
                      </ul>
                   </div>
                </nav>
             </LayoutGroup>

             {/* Collapse Button */}
             <div className="border-t border-gray-200 dark:border-white/10 p-3">
                <button
                   onClick={() => setIsCollapsed(!isCollapsed)}
                   className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-zinc-400 transition hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white ${
                      isCollapsed ? "justify-center" : ""
                   }`}
                   title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                   {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="font-medium">Collapse</span></>}
                </button>
             </div>
          </aside>

          <style>{`
             .scrollbar-thin::-webkit-scrollbar { width: 4px; }
             .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
             .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
             
             @keyframes fadeIn {
                from { opacity: 0; transform: translateX(-4px); }
                to { opacity: 1; transform: translateX(0); }
             }
             .animate-fade-in {
                animation: fadeIn 0.15s ease-out forwards;
             }
          `}</style>
       </>
    );
};

export default UserNav;