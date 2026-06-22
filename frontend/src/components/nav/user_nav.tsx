import {
    Briefcase,
    ClipboardList,
    FolderKanban,
    Handshake,
    Home,
    Inbox,
    Megaphone,
    MessageSquare,
    Palette,
    Send,
    Shield,
    Users,
    Wallet,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BriefcaseBusiness,
    MicVocal,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
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
    { label: "Incoming Proposals", icon: ClipboardList, to: "/proposals" },
    { label: "My Proposals", icon: Send, to: "/my-proposals" },
];

let gigsItemsInitial: NavItem[] = [
    { label: "Gig Posting", icon: Megaphone, to: "/gigs" },
    { label: "Incoming Requests", icon: Inbox, to: "/requests" },
    { label: "My Requests", icon: Handshake, to: "/my-requests" },
];

let activityRecordsInitial: NavItem[] = [
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
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isJobsOpen, setIsJobsOpen] = useState(true);
    const [isGigsOpen, setIsGigsOpen] = useState(true);

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

    const linkClassName = ({ isActive }: { isActive: boolean }) =>
       `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
          isActive
             ? "bg-blue-500/10 text-blue-400 border-l-2 border-blue-500"
             : "text-zinc-400 hover:text-white hover:bg-white/5"
       } ${isCollapsed ? "justify-center px-2 border-l-0" : ""}`;

    const sectionHeaderClassName = () =>
       `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 text-zinc-400 hover:text-white hover:bg-white/5 ${
          isCollapsed ? "justify-center px-2" : ""
       }`;

    return (
       <>
          <aside
             className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-white/10 bg-[#080a12] transition-all duration-300 ${
                isCollapsed ? "w-20" : "w-64"
             }`}
          >
             {/* Logo Section */}
             <button
                type="button"
                onClick={handleLogoClick}
                className={`flex items-center border-b border-white/10 px-5 py-5 text-left transition hover:bg-white/5 ${
                   isCollapsed ? "justify-center px-2" : "gap-2.5"
                }`}
             >
                <img
                   src="/ensemble_lg.svg"
                   alt="Ensemble Logo"
                   className="h-9 w-9 shrink-0"
                />
                {!isCollapsed && (
                   <div className="overflow-hidden whitespace-nowrap px-2">
                      <p className="text-base font-semibold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                         Ensemble
                      </p>
                   </div>
                )}
             </button>

             {/* Navigation - Always Scrollable */}
             <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
                {/* 1. Main Menu */}
                <div>
                   {!isCollapsed && (
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                         Main Menu
                      </p>
                   )}
                   <ul className="space-y-1">
                      {primaryNavState.map(({ label, icon: Icon, to }) => (
                         <li key={label}>
                            {!isCollapsed ? (
                               <NavLink to={to} className={linkClassName}>
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span className="text-sm font-medium">{label}</span>
                               </NavLink>
                            ) : (
                               /* Collapsed Floating Display for Primary Items (No Children) */
                               <div className="group static flex flex-col items-center">
                                  <NavLink to={to} className={linkClassName}>
                                     <Icon className="h-4 w-4 shrink-0" />
                                  </NavLink>

                                  {/* Floating Title Display - Anchored left-20 to clear scroll viewport limits */}
                                  <div className="absolute left-20 pl-2 hidden group-hover:block z-50 pointer-events-none">
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
                {isCollapsed && <div className="my-4 border-t border-white/10 mx-2" />}

                {/* 2. Marketplace Section */}
                <div className={isCollapsed ? "mt-0 space-y-3" : "mt-6"}>
                   {!isCollapsed && (
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                            <ul className="ml-6 overflow-hidden space-y-1 border-l border-white/10 pl-2">
                               {jobsState.map(({ label, icon: Icon, to }) => (
                                  <li key={label}>
                                     <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{label}</span>
                                     </NavLink>
                                  </li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   ) : (
                      /* Collapsed Menu Flyout Item for Jobs (With Children) */
                      <div className="group static flex flex-col items-center">
                         <div className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors group-hover:bg-white/5 group-hover:text-white cursor-pointer">
                            <BriefcaseBusiness className="h-4 w-4" />
                         </div>

                         {/* Uses absolute left-20 to breakout of overflow hidden container contexts */}
                         <div className="absolute left-20 pl-2 hidden w-52 group-hover:block z-50">
                            <div className="rounded-xl border border-white/10 bg-[#0d0f1a] p-1.5 shadow-2xl animate-fade-in">
                               <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/5 mb-1">Jobs</p>
                               <ul className="space-y-0.5">
                                  {jobsState.map(({ label, icon: Icon, to }) => (
                                     <li key={label}>
                                        <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
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

                   {/* Gigs Section */}
                   {!isCollapsed ? (
                      <div className="mb-2">
                         <button onClick={() => setIsGigsOpen(!isGigsOpen)} className={sectionHeaderClassName()}>
                            <MicVocal className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left text-sm font-medium">Gigs</span>
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isGigsOpen ? "rotate-180" : ""}`} />
                         </button>

                         <div className={`grid transition-all duration-300 ease-in-out ${isGigsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                            <ul className="ml-6 overflow-hidden space-y-1 border-l border-white/10 pl-2">
                               {gigsState.map(({ label, icon: Icon, to }) => (
                                  <li key={label}>
                                     <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{label}</span>
                                     </NavLink>
                                  </li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   ) : (
                      /* Collapsed Menu Flyout Item for Gigs (With Children) */
                      <div className="group static flex flex-col items-center">
                         <div className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors group-hover:bg-white/5 group-hover:text-white cursor-pointer">
                            <MicVocal className="h-4 w-4" />
                         </div>

                         {/* Uses absolute left-20 to breakout of overflow hidden container contexts */}
                         <div className="absolute left-20 pl-2 hidden w-52 group-hover:block z-50">
                            <div className="rounded-xl border border-white/10 bg-[#0d0f1a] p-1.5 shadow-2xl animate-fade-in">
                               <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/5 mb-1">Gigs</p>
                               <ul className="space-y-0.5">
                                  {gigsState.map(({ label, icon: Icon, to }) => (
                                     <li key={label}>
                                        <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
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
                {isCollapsed && <div className="my-4 border-t border-white/10 mx-2" />}

                {/* 3. Activity & Records Section */}
                <div className={isCollapsed ? "mt-0 space-y-1" : "mt-6"}>
                   {!isCollapsed && (
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                         Activity & Records
                      </p>
                   )}
                   <ul className="space-y-1">
                      {activityState.map(({ label, icon: Icon, to }) => (
                         <li key={label} className="w-full">
                            {!isCollapsed ? (
                               <NavLink to={to} className={linkClassName}>
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span className="text-sm font-medium">{label}</span>
                               </NavLink>
                            ) : (
                               /* Collapsed Floating Display for Activity Items (No Children) */
                               <div className="group static flex flex-col items-center">
                                  <NavLink to={to} className={linkClassName}>
                                     <Icon className="h-4 w-4 shrink-0" />
                                  </NavLink>

                                  {/* Floating Title Display - Anchored left-20 to clear scroll viewport limits */}
                                  <div className="absolute left-20 pl-2 hidden group-hover:block z-50 pointer-events-none">
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

             {/* Collapse Button */}
             <div className="border-t border-white/10 p-3">
                <button
                   onClick={() => setIsCollapsed(!isCollapsed)}
                   className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/10 hover:text-white ${
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