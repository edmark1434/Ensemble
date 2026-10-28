import {
    Briefcase,
    ClipboardList,
    FileText,
    FolderKanban,
    Handshake,
    Home,
    Inbox,
    MessageSquare,
    Palette,
    ScrollText,
    Users,
    Wallet,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BriefcaseBusiness,
    Clapperboard,
    MonitorPlay,
    LayoutDashboard,
    Film,
    Video,
    ListVideo,
    Projector,
    Library,
    Compass
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import useGlobalState from "@/lib/global_state";
import { useTourStore } from "@/lib/tour_state";
import { isStaffPlatformViewer } from "@/lib/staffPlatformView";
import { formatUnreadBadge, useInboxUnreadTotals } from "@/components/ui/chat_bubble/useInboxUnreadTotals";

type NavItem = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    to: string;
};

let primaryNavInitial: NavItem[] = [
    { label: "Home", icon: Home, to: "/home" },
    { label: "Projects", icon: ListVideo, to: "/projects" },
    { label: "Teams", icon: Users, to: "/teams" },
    { label: "Forums", icon: Projector, to: "/forums" },
];

let jobsItemsInitial: NavItem[] = [
    { label: "Job Posting", icon: Video, to: "/jobs" },
    { label: "Proposals", icon: ClipboardList, to: "/jobs/proposals" },
];

let gigsItemsInitial: NavItem[] = [
    { label: "Services", icon: MonitorPlay, to: "/gigs" },
    { label: "Orders", icon: Inbox, to: "/gigs/orders" },
];

let marketplaceTopInitial: NavItem[] = [
    { label: "Discovery", icon: Compass, to: "/discovery" },
    { label: "Asset Library", icon: Library, to: "/assets" },
];

let workflowInitial: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Workspace", icon: Briefcase, to: "/workspaces" },
    { label: "Chat Inbox", icon: MessageSquare, to: "/inbox" },
];

let recordsInitial: NavItem[] = [
    { label: "My Terms", icon: FileText, to: "/terms-of-services" },
    { label: "My Contracts", icon: ScrollText, to: "/contracts" },
    { label: "Transaction History", icon: Wallet, to: "/transactions" },
];

const getSidenavTourId = (path: string) => {
    if (path === "/home") return "sidenav-home";
    if (path === "/projects") return "sidenav-projects";
    if (path === "/teams") return "sidenav-teams";
    if (path === "/forums") return "sidenav-forums";
    if (path === "/discovery") return "sidenav-discovery";
    if (path === "/assets") return "sidenav-assets";
    if (path === "/jobs") return "sidenav-jobs-posting";
    if (path === "/jobs/proposals") return "sidenav-jobs-proposals";
    if (path === "/gigs") return "sidenav-gigs-services";
    if (path === "/gigs/orders") return "sidenav-gigs-orders";
    if (path === "/dashboard") return "sidenav-deliveries";
    if (path === "/workspaces") return "sidenav-workspaces";
    if (path === "/terms-of-services") return "sidenav-tos";
    if (path === "/contracts") return "sidenav-contracts";
    if (path === "/transactions") return "sidenav-transactions";
    if (path === "/inbox") return "sidenav-inbox";
    return undefined;
};

interface UserNavProps {
    userName?: string;
    userTier?: string;
    userAvatar?: string;
}

const UserNav: React.FC<UserNavProps> = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useGlobalState((state) => state.user);
    const isVerified = useGlobalState((state) => state.isVerified);
    const isCollapsed = useGlobalState((state) => state.isSidebarCollapsed);
    const setIsCollapsed = useGlobalState((state) => state.setIsSidebarCollapsed);
    const isGuestMode = useGlobalState((state) => state.isGuestMode);
    const isStaffPreview = isStaffPlatformViewer(user);
    const hidePersonalNav = isGuestMode || isStaffPreview;

    const isAccountVerified = Boolean(
        isVerified ||
        user?.is_verified ||
        user?.isVerified ||
        user?.verification_status === true ||
        user?.verification_status === "Verified"
    );
    const showVerificationAd = !isAccountVerified && !hidePersonalNav;
    const [isJobsOpen, setIsJobsOpen] = useState(false);
    const [isGigsOpen, setIsGigsOpen] = useState(false);
    const isTourActive = useTourStore((state) => state.isWalkthroughActive);
    const tourStepIndex = useTourStore((state) => state.currentStepIndex);
    const activeSteps = useTourStore((state) => state.activeSteps);
    const currentTourStep = isTourActive && activeSteps ? activeSteps[tourStepIndex] : null;

    useEffect(() => {
        if (location.pathname.startsWith('/jobs')) {
            setIsJobsOpen(true);
        }
        if (location.pathname.startsWith('/gigs')) {
            setIsGigsOpen(true);
        }
    }, [location.pathname]);

    useEffect(() => {
        if (!isTourActive || !currentTourStep) return;
        const sId = (currentTourStep.id || '').toLowerCase();
        const sel = (currentTourStep.selector || '').toLowerCase();
        if (sId.includes('job') || sel.includes('jobs')) {
            setIsJobsOpen(true);
        }
        if (sId.includes('gig') || sel.includes('gigs')) {
            setIsGigsOpen(true);
        }
    }, [isTourActive, currentTourStep]);
    const inboxUnread = useInboxUnreadTotals().total;

    const primaryNavState = isGuestMode ? primaryNavInitial.filter(item => item.label !== "Teams") : primaryNavInitial;
    const marketplaceTopState = marketplaceTopInitial;
    const jobsState = hidePersonalNav ? jobsItemsInitial.filter(item => item.label !== "Proposals") : jobsItemsInitial;
    const gigsState = hidePersonalNav ? gigsItemsInitial.filter(item => item.label !== "Orders") : gigsItemsInitial;
    const workflowState = hidePersonalNav ? [] : workflowInitial;
    const recordsState = hidePersonalNav ? [] : recordsInitial;

    const handleLogoClick = () => {
       const { user: currentUser, isAuthenticated: auth } = useGlobalState.getState();
       if (auth && (currentUser?.type === "User" || currentUser?.type === "Staff")) {
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
    const isWorkflowItemActive = (to: string) => {
        if (to === "/dashboard") {
            return location.pathname.startsWith("/dashboard");
        }
        if (to === "/workspaces") {
            return (
                location.pathname.startsWith("/workspaces") ||
                location.pathname.startsWith("/team-project") ||
                (location.pathname === "/teams" && location.search.includes("tab=projects"))
            );
        }
        if (to === "/inbox") {
            return location.pathname.startsWith("/inbox");
        }
        return location.pathname === to;
    };

    const isPrimaryItemActive = (to: string, defaultIsActive: boolean) => {
        if (to === "/teams") {
            if (
                location.pathname.startsWith("/workspaces") ||
                location.pathname.startsWith("/team-project") ||
                (location.pathname === "/teams" && location.search.includes("tab=projects"))
            ) {
                return false;
            }
            return location.pathname.startsWith("/teams");
        }
        return defaultIsActive;
    };

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

    const isGigItemActive = (to: string) => {
        if (to === "/gigs") {
            return (
                location.pathname.startsWith("/gigs") &&
                !location.pathname.startsWith("/gigs/orders")
            );
        }
        if (to === "/gigs/orders") {
            return location.pathname.startsWith("/gigs/orders");
        }
        return location.pathname === to;
    };

    return (
       <>
          <aside
             className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base transition-all duration-300 print:hidden ${
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
                                  <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                     {({ isActive }) => (
                                        <div
                                           className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                              isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                           }`}
                                        >
                                           {isActive && (
                                              <motion.div
                                                 layoutId="activeNavBackground"
                                                 className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
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
                                     <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                        {({ isActive }) => (
                                           <div
                                              className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                 isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                              }`}
                                           >
                                              {isActive && (
                                                 <motion.div
                                                    layoutId="activeNavBackgroundCollapsed"
                                                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                 />
                                              )}
                                              <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                           </div>
                                        )}
                                     </NavLink>

                                     {/* Floating Title Display */}
                                     <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3 py-2 shadow-xl dark:shadow-2xl animate-fade-in whitespace-nowrap">
                                           <span className="text-xs font-medium text-gray-900 dark:text-zinc-200">{label}</span>
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

                       {/* Marketplace Top Items: Discovery, Asset Library */}
                       <ul className={isCollapsed ? "space-y-1" : "space-y-1 mb-2"}>
                          {marketplaceTopState.map(({ label, icon: Icon, to }) => (
                             <li key={label}>
                                {!isCollapsed ? (
                                   <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                      {({ isActive }) => (
                                         <div
                                            className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                               isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                            }`}
                                         >
                                            {isActive && (
                                               <motion.div
                                                  layoutId="activeNavBackground"
                                                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                               />
                                            )}
                                            <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                            <span className="relative z-10 text-sm">{label}</span>
                                         </div>
                                      )}
                                   </NavLink>
                                ) : (
                                   <div className="group w-full flex justify-center hover:z-50">
                                      <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                         {({ isActive }) => (
                                            <div
                                               className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                  isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                               }`}
                                            >
                                               {isActive && (
                                                  <motion.div
                                                     layoutId="activeNavBackgroundCollapsed"
                                                     className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                     transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                  />
                                               )}
                                               <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                            </div>
                                         )}
                                      </NavLink>
                                      <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                         <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3 py-2 shadow-xl dark:shadow-2xl animate-fade-in whitespace-nowrap">
                                            <span className="text-xs font-medium text-gray-900 dark:text-zinc-200">{label}</span>
                                         </div>
                                      </div>
                                   </div>
                                )}
                             </li>
                          ))}
                       </ul>

                      {/* Jobs Section */}
                      {!isCollapsed ? (
                         <div className="mb-2">
                            <button data-tour="sidenav-jobs-toggle" onClick={() => setIsJobsOpen(!isJobsOpen)} className={sectionHeaderClassName()}>
                               <Film className="h-4 w-4 shrink-0" />
                               <span className="flex-1 text-left text-sm font-medium">Jobs</span>
                               <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isJobsOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${isJobsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                               <ul className="ml-6 overflow-hidden space-y-1 border-l border-gray-200 dark:border-white/10 pl-2">
                                  {jobsState.map(({ label, icon: Icon, to }) => {
                                     const isActive = isJobItemActive(to);
                                     return (
                                        <li key={label}>
                                           <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                              <div
                                                 className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                                                    isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
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
                               <Film className="h-4 w-4" />
                            </div>

                            <div className="absolute left-full -ml-6 pl-6 hidden w-52 group-hover:block z-50">
                               <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-xl dark:shadow-2xl animate-fade-in">
                                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-white/5 mb-1">Jobs</p>
                                  <ul className="space-y-0.5">
                                     {jobsState.map(({ label, icon: Icon, to }) => {
                                        const isActive = isJobItemActive(to);
                                        return (
                                           <li key={label}>
                                              <NavLink to={to} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}>
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
                            <button data-tour="sidenav-gigs-toggle" onClick={() => setIsGigsOpen(!isGigsOpen)} className={sectionHeaderClassName()}>
                               <Clapperboard className="h-4 w-4 shrink-0" />
                               <span className="flex-1 text-left text-sm font-medium">Gigs</span>
                               <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isGigsOpen ? "rotate-180" : ""}`} />
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${isGigsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                               <ul className="ml-6 overflow-hidden space-y-1 border-l border-gray-200 dark:border-white/10 pl-2">
                                  {gigsState.map(({ label, icon: Icon, to }) => {
                                     const isActive = isGigItemActive(to);
                                     return (
                                     <li key={label}>
                                        <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                              <div
                                                 className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                                                    isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
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
                         /* Collapsed Menu Flyout Item for Gigs */
                         <div className="group w-full flex justify-center hover:z-50">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 transition-colors group-hover:bg-gray-100 dark:group-hover:bg-white/5 group-hover:text-gray-900 dark:group-hover:text-white cursor-pointer">
                               <Clapperboard className="h-4 w-4" />
                            </div>

                            <div className="absolute left-full -ml-6 pl-6 hidden w-52 group-hover:block z-50">
                               <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-xl dark:shadow-2xl animate-fade-in">
                                  <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500 border-b border-gray-100 dark:border-white/5 mb-1">Gigs</p>
                                  <ul className="space-y-0.5">
                                     {gigsState.map(({ label, icon: Icon, to }) => {
                                        const isActive = isGigItemActive(to);
                                        return (
                                         <li key={label}>
                                            <NavLink to={to} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200 ${isActive ? "bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"}`}>
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
                   </div>


                   {/* Section Separator Line */}
                   {isCollapsed && <div className="my-4 border-t border-gray-200 dark:border-white/10 mx-2" />}

                   {/* 3. Workflow Section */}
                   {workflowState.length > 0 && (
                     <div className={isCollapsed ? "mt-0 space-y-1" : "mt-6"}>
                        {!isCollapsed && (
                           <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                              Workflow
                           </p>
                        )}
                        <ul className="space-y-1">
                           {workflowState.map(({ label, icon: Icon, to }) => {
                              const isActive = isWorkflowItemActive(to);
                              return (
                                <li key={label} className="w-full">
                                   {!isCollapsed ? (
                                      <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                         <div
                                            className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                               isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                            }`}
                                         >
                                            {isActive && (
                                               <motion.div
                                                  layoutId="activeNavBackground"
                                                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                               />
                                            )}
                                            <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                            <span className="relative z-10 text-sm">{label}</span>
                                         </div>
                                      </NavLink>
                                   ) : (
                                      /* Collapsed Floating Display for Workflow Items */
                                      <div className="group w-full flex justify-center hover:z-50">
                                         <NavLink to={to} data-tour={getSidenavTourId(to)}>
                                            <div
                                               className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                  isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                               }`}
                                            >
                                               {isActive && (
                                                  <motion.div
                                                     layoutId="activeNavBackgroundCollapsed"
                                                     className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                     transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                  />
                                               )}
                                               <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                            </div>
                                         </NavLink>

                                         {/* Floating Title Display */}
                                         <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                            <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3 py-2 shadow-xl dark:shadow-2xl animate-fade-in whitespace-nowrap">
                                               <span className="text-xs font-medium text-gray-900 dark:text-zinc-200">{label}</span>
                                            </div>
                                         </div>
                                      </div>
                                   )}
                                </li>
                              );
                           })}
                        </ul>
                     </div>
                   )}

                   {/* Section Separator Line */}
                   {isCollapsed && <div className="my-4 border-t border-gray-200 dark:border-white/10 mx-2" />}

                   {/* 4. Records Section */}
                   {recordsState.length > 0 && (
                     <div className={isCollapsed ? "mt-0 space-y-1" : "mt-6"}>
                        {!isCollapsed && (
                           <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
                              Records
                           </p>
                        )}
                        <ul className="space-y-1">
                           {recordsState.map(({ label, icon: Icon, to }) => (
                            <li key={label} className="w-full">
                               {!isCollapsed ? (
                                  <NavLink to={to} end={to === "/contracts"} data-tour={getSidenavTourId(to)}>
                                     {({ isActive }) => (
                                        <div
                                           className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
                                              isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                           }`}
                                        >
                                           {isActive && (
                                              <motion.div
                                                 layoutId="activeNavBackground"
                                                 className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
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
                                     <NavLink to={to} end={to === "/contracts"} data-tour={getSidenavTourId(to)}>
                                        {({ isActive }) => (
                                           <div
                                              className={`relative flex items-center justify-center rounded-lg p-2 text-sm transition-colors duration-200 ${
                                                 isActive ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                              }`}
                                           >
                                              {isActive && (
                                                 <motion.div
                                                    layoutId="activeNavBackgroundCollapsed"
                                                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200/50 dark:from-white/10 dark:to-white/5 shadow-sm border border-gray-200 dark:border-white/10 nav-rainbow-shine"
                                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                                 />
                                              )}
                                              <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                              
                                           </div>
                                        )}
                                     </NavLink>

                                     {/* Floating Title Display */}
                                     <div className="absolute left-full -ml-6 pl-6 hidden group-hover:block z-50 pointer-events-none">
                                        <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] px-3 py-2 shadow-xl dark:shadow-2xl animate-fade-in whitespace-nowrap">
                                           <span className="text-xs font-medium text-gray-900 dark:text-zinc-200">{label}</span>
                                        </div>
                                     </div>
                                  </div>
                               )}
                            </li>
                         ))}
                      </ul>
                   </div>
                   )}
                </nav>
             </LayoutGroup>

             {/* Verification Banner Ad (only shown if account is unverified) */}
             {showVerificationAd && (
                <div className="border-t border-gray-200 dark:border-white/10 w-full overflow-hidden shrink-0">
                   <Link
                      to="/account-verification-status"
                      className="group block w-full transition-opacity hover:opacity-90"
                      title="Account Verification"
                   >
                      <img
                         src={isCollapsed ? "/ad/verify_ad_s.png" : "/ad/verify_ad.png"}
                         alt="Verify Ad"
                         className="w-full h-auto block object-cover dark:invert select-none"
                      />
                   </Link>
                </div>
             )}

             {/* Collapse Button */}
             <div className="border-t border-gray-200 dark:border-white/10 p-3">
                <button
                   data-tour="sidenav-collapse"
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