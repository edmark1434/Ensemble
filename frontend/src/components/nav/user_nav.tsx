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
    ChevronUp,
    BriefcaseBusiness,
    MicVocal,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

let otherMarketplaceItemsInitial: NavItem[] = [
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
    const [primaryNavState, setPrimaryNavState] = useState(primaryNavInitial);
    const [jobsState, setJobsState] = useState(jobsItemsInitial);
    const [gigsState, setGigsState] = useState(gigsItemsInitial);
    const [otherMarketplaceState, setOtherMarketplaceState] = useState(otherMarketplaceItemsInitial);
    const user = useGlobalState((state) => state.user);
    const isAuthenticated = useGlobalState((state) => state.isAuthenticated);

    const handleLogoClick = () => {
       const { user: currentUser, isAuthenticated: auth } = useGlobalState.getState();
       if (auth && currentUser?.type === "User") {
          navigate("/home");
          return;
       }
       navigate("/");
    };

    useEffect(() => {
       if (!isAuthenticated || user?.type !== "User") {
           // eslint-disable-next-line react-hooks/set-state-in-effect
          setPrimaryNavState(primaryNavInitial.filter((i) => i.label !== "Teams"));
          setJobsState(jobsItemsInitial.filter((i) => i.label === "Job Posting"));
          setGigsState(gigsItemsInitial.filter((i) => i.label === "Gig Posting"));
          setOtherMarketplaceState([]);
       } else {
          setPrimaryNavState(primaryNavInitial);
          setJobsState(jobsItemsInitial);
          setGigsState(gigsItemsInitial);
          setOtherMarketplaceState(otherMarketplaceItemsInitial);
       }
    }, [isAuthenticated, user?.type]);

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

             {/* Navigation - Scrollable */}
             <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
                {/* Main Menu */}
                <div>
                   {!isCollapsed && (
                      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                         Main Menu
                      </p>
                   )}
                   <ul className="space-y-1">
                      {primaryNavState.map(({ label, icon: Icon, to }) => (
                         <li key={label}>
                            <NavLink to={to} className={linkClassName} title={isCollapsed ? label : undefined}>
                               <Icon className="h-4 w-4 shrink-0" />
                               {!isCollapsed && (
                                  <span className="text-sm font-medium">
                                     {label}
                                  </span>
                               )}
                            </NavLink>
                         </li>
                      ))}
                   </ul>
                </div>

                {/* Section Separator Line - Visible only when navigation bar is collapsed */}
                {isCollapsed && (
                   <div className="my-4 border-t border-white/10 mx-2" />
                )}

                {/* Marketplace Section */}
                <div className={isCollapsed ? "mt-0" : "mt-4"}>
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
                            {isJobsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                         </button>
                         {isJobsOpen && (
                            <ul className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-2">
                               {jobsState.map(({ label, icon: Icon, to }) => (
                                  <li key={label}>
                                     <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{label}</span>
                                     </NavLink>
                                  </li>
                               ))}
                            </ul>
                         )}
                      </div>
                   ) : (
                      <div className="mb-2 flex flex-col items-center gap-1">
                         {jobsState.map(({ label, icon: Icon, to }) => (
                            <NavLink key={label} to={to} className={({ isActive }) => `flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`} title={label}>
                               <Icon className="h-4 w-4" />
                            </NavLink>
                         ))}
                      </div>
                   )}

                   {/* Small spacing element to separate sections when collapsed */}
                   {isCollapsed && <div className="h-2" />}

                   {/* Gigs Section */}
                   {!isCollapsed ? (
                      <div className="mb-2">
                         <button onClick={() => setIsGigsOpen(!isGigsOpen)} className={sectionHeaderClassName()}>
                            <MicVocal className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left text-sm font-medium">Gigs</span>
                            {isGigsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                         </button>
                         {isGigsOpen && (
                            <ul className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-2">
                               {gigsState.map(({ label, icon: Icon, to }) => (
                                  <li key={label}>
                                     <NavLink to={to} className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}>
                                        <Icon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="text-xs font-medium">{label}</span>
                                     </NavLink>
                                  </li>
                               ))}
                            </ul>
                         )}
                      </div>
                   ) : (
                      <div className="mb-2 flex flex-col items-center gap-1">
                         {gigsState.map(({ label, icon: Icon, to }) => (
                            <NavLink key={label} to={to} className={({ isActive }) => `flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}`} title={label}>
                               <Icon className="h-4 w-4" />
                            </NavLink>
                         ))}
                      </div>
                   )}

                   {/* Small spacing element to separate sections when collapsed */}
                   {isCollapsed && otherMarketplaceState.length > 0 && <div className="h-2" />}

                   {/* Other Marketplace Items */}
                   <ul className={`mt-2 space-y-1 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                      {otherMarketplaceState.map(({ label, icon: Icon, to }) => (
                         <li key={label} className="w-full">
                            <NavLink to={to} className={isCollapsed ? ({ isActive }) => `flex w-full items-center justify-center rounded-lg px-2 py-2 transition-all duration-200 ${isActive ? "bg-blue-500/10 text-blue-400" : "text-zinc-400 hover:text-white hover:bg-white/5"}` : linkClassName} title={label}>
                               <Icon className="h-4 w-4 shrink-0" />
                               {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
                            </NavLink>
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
                   title={isCollapsed ? "Expand" : "Collapse"}
                >
                   {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span className="font-medium">Collapse</span></>}
                </button>
             </div>
          </aside>

          <style>{`
             .scrollbar-thin::-webkit-scrollbar { width: 4px; }
             .scrollbar-thin::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
             .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
          `}</style>
       </>
    );
};

export default UserNav;
