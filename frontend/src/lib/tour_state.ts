import { create } from 'zustand';

export type UserPlatformRole = 'freelancer' | 'client' | 'explorer';

export interface WalkthroughStep {
  id: string;
  route: string;
  routeState?: any;
  selector: string;
  tabHint: string;
  targetName: string;
  text: string;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  // --- SECTION 1: HOME PAGE & HEADER CONTROLS ---
  {
    id: 'home_search',
    route: '/home',
    selector: '[data-tour="home-search-bar"]',
    tabHint: 'Search',
    targetName: 'Global Search',
    text: 'Use the **Global Search** bar to quickly find video assets, creator libraries, effects, and templates across the ecosystem.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'home_quick_actions',
    route: '/home',
    selector: '[data-tour="home-quick-actions"]',
    tabHint: 'Quick Actions',
    targetName: 'Quick Action Buttons',
    text: 'These **Quick Action buttons** let you quickly start projects, find video services, or post job listings.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'header_notifications',
    route: '/home',
    selector: '[data-tour="notifications-button"]',
    tabHint: 'Notifications',
    targetName: 'Notifications Bell',
    text: 'Click the **Notifications** bell to keep track of contract updates, proposal responses, and escrow payments.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'header_ask_ai',
    route: '/home',
    selector: '[data-tour="header-ask-ai"]',
    tabHint: 'Ask AI',
    targetName: 'Ask AI Assistant',
    text: 'Click **Ask AI** anytime in the top bar for instant 24/7 answers to questions across the platform.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'header_profile_nav',
    route: '/home',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Profile Menu',
    targetName: 'Profile Avatar',
    text: 'Click your **Profile Avatar** in the top header and select **Profile** to view your setup and portfolio.',
    preferredPlacement: 'left',
  },

  // --- SECTION 2: PROFILE PAGE ---
  {
    id: 'profile_avatar',
    route: '/profile',
    selector: '[data-tour="profile-avatar"]',
    tabHint: 'Profile Avatar',
    targetName: 'Profile Picture',
    text: 'This is where you change your **Profile Avatar**. Click the edit pen to upload a photo or choose an avatar preset.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'profile_tabs',
    route: '/profile',
    selector: '[data-tour="profile-tabs"]',
    tabHint: 'Profile Tabs',
    targetName: 'Profile Tabs',
    text: 'These **Profile Tabs** let you navigate your Introduction, Portfolio showreels, Services, and Activity Records.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'profile_budget',
    route: '/profile',
    selector: '[data-tour="profile-budget"]',
    tabHint: 'Ratings & Budget',
    targetName: 'Ratings & Budget',
    text: 'Set up your **Budget** here to indicate your planned spending and hiring capacity for creative video projects.',
    preferredPlacement: 'right',
  },
  {
    id: 'profile_badges',
    route: '/profile',
    selector: '[data-tour="profile-badges"]',
    tabHint: 'Account Badges',
    targetName: 'Account Badges',
    text: 'Manage and arrange your **Account Badges** here to showcase earned achievements, tiers, and community standing.',
    preferredPlacement: 'right',
  },
  {
    id: 'profile_skills',
    route: '/profile',
    selector: '[data-tour="profile-skills"]',
    tabHint: 'Skills & Capabilities',
    targetName: 'Skills Matrix',
    text: 'Add and edit your **Skills & Capabilities** here, displaying your software proficiencies and years of experience.',
    preferredPlacement: 'right',
  },
  {
    id: 'header_settings_nav',
    route: '/profile',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Settings Nav',
    targetName: 'Profile & Settings',
    text: 'Click your **Profile Avatar** in the top header and select **Settings** to open account credentials and preferences.',
    preferredPlacement: 'left',
  },

  // --- SECTION 3: SETTINGS & VERIFICATION FLOW ---
  {
    id: 'settings_verification',
    route: '/settings',
    routeState: { tab: 'account' },
    selector: '[data-tour="settings-verification-button"]',
    tabHint: 'Account Details',
    targetName: 'Verification Status',
    text: 'In **Settings > Account Details**, click here to view your **Identity Verification** status to unlock verified badges and escrow withdrawals.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'settings_display',
    route: '/settings',
    routeState: { tab: 'display' },
    selector: '[data-tour="settings-theme-toggle"]',
    tabHint: 'Display Settings',
    targetName: 'Theme Toggle',
    text: 'In **Display Settings**, you can switch between **Light and Dark mode** anytime to customize your workspace appearance.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'settings_back',
    route: '/settings',
    selector: '[data-tour="settings-back-button"]',
    tabHint: 'Return to Workspace',
    targetName: 'Back Arrow',
    text: 'Click the **Back Arrow** button to exit Settings and return to your main workspace.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 4: PROJECTS WORKSPACE & CREATE PROJECT ---
  {
    id: 'sidenav_projects',
    route: '/profile',
    selector: '[data-tour="sidenav-projects"]',
    tabHint: 'Navigation',
    targetName: 'Projects Tab',
    text: 'Click on **Projects** in the sidebar navigation to open your cloud projects workspace.',
    preferredPlacement: 'right',
  },
  {
    id: 'projects_workspace',
    route: '/projects',
    selector: '[data-tour="projects-workspace"]',
    tabHint: 'Projects',
    targetName: 'Projects Workspace',
    text: 'This is your **Projects Workspace**. Manage client footage, organize video cuts, and launch the built-in cloud editor.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'projects_create',
    route: '/projects',
    selector: '[data-tour="projects-create-button"]',
    tabHint: 'Create Project',
    targetName: 'Create a Project Button',
    text: 'Click **Create a Project** here to begin setting up a new editing timeline with custom canvas settings.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'projects_format',
    route: '/projects/select',
    selector: '[data-tour="projects-format-selection"]',
    tabHint: 'Format Selection',
    targetName: 'Aspect Ratio Selection',
    text: 'This is the area where you select your **Video Format** (Landscape 16:9, Portrait 9:16, or Square) and start editing.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 5: TEAMS ---
  {
    id: 'teams_workspace',
    route: '/teams',
    selector: '[data-tour="teams-workspace"]',
    tabHint: 'Teams',
    targetName: 'Teams Workspace',
    text: 'This is **Teams**. Collaborate with other editors, share media libraries, and assign client project deliverables.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 6: FORUMS ---
  {
    id: 'forums_tabs',
    route: '/forums',
    selector: '[data-tour="forums-tabs"]',
    tabHint: 'Forums',
    targetName: 'Community Groups',
    text: 'In **Forums**, you can browse group feeds, join creator groups, or create your own community group.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'forums_new_discussion',
    route: '/forums',
    selector: '[data-tour="forums-new-discussion"]',
    tabHint: 'New Discussion',
    targetName: 'New Discussion Button',
    text: 'Click this **New Discussion** button to start a thread, ask editing questions, or share tips with other creators.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 7: DISCOVERY ---
  {
    id: 'discovery_page',
    route: '/discovery',
    selector: '[data-tour="discovery-container"]',
    tabHint: 'Discovery',
    targetName: 'Discovery Feed',
    text: 'This is **Discovery**. Browse featured video creators, trending edits, and community talent across Ensemble.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 8: ASSET LIBRARY ---
  {
    id: 'assets_catalog',
    route: '/assets',
    selector: '[data-tour="assets-catalog"]',
    tabHint: 'Asset Library',
    targetName: 'Asset Catalog',
    text: 'This is the **Asset Library**. Browse stock footage, visual presets, audio packs, and templates for your video pipeline.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 9: JOB MARKET FLOW ---
  {
    id: 'jobs_market',
    route: '/jobs/postings',
    selector: '[data-tour="job-market"]',
    tabHint: 'Job Market',
    targetName: 'Job Postings',
    text: 'This is the **Job Market**. Browse client job posts and submit milestone proposals with your custom rates.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'jobs_search',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-search-bar"]',
    tabHint: 'Search Jobs',
    targetName: 'Job Search Bar',
    text: 'Use the **Search Bar** to find jobs matching specific video styles, editing tools, keywords, or client names.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'jobs_create',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-create-button"]',
    tabHint: 'Post a Job',
    targetName: 'Post a Job Button',
    text: 'Click **Post a Job** to hire creators for video editing, animation, sound design, or full post-production.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'jobs_tabs',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-tabs"]',
    tabHint: 'Job Tabs',
    targetName: 'Job Market Tabs',
    text: 'Switch between active **Postings**, your bookmarked **Saved** listings, and **My Job Posts** to manage your hiring.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'jobs_card_details',
    route: '/jobs/postings',
    selector: '[data-tour="job-card-first"]',
    tabHint: 'Job Details & Apply',
    targetName: 'Job Listing Card',
    text: 'Click any **Job Card** to open details where you can click **View Full** or click **Send Proposal** to apply.',
    preferredPlacement: 'right',
  },
  {
    id: 'jobs_proposals',
    route: '/jobs/postings',
    selector: '[data-tour="sidenav-jobs-proposals"]',
    tabHint: 'Proposals',
    targetName: 'Proposals Tab',
    text: 'The **Proposals** tab lets you track all sent milestone proposals, incoming applicant submissions, and client acceptances.',
    preferredPlacement: 'right',
  },

  // --- SECTION 10: GIGS & VIDEO SERVICES FLOW ---
  {
    id: 'gigs_services',
    route: '/gigs/services',
    selector: '[data-tour="gigs-catalog"]',
    tabHint: 'Services',
    targetName: 'Services Catalog',
    text: 'This is **Gigs**. Browse packaged video editing services with upfront pricing and guaranteed turnaround times.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'gigs_search',
    route: '/gigs/services',
    selector: '[data-tour="gigs-search-bar"]',
    tabHint: 'Search Services',
    targetName: 'Gigs Search Bar',
    text: 'Search for editing services by category, software proficiencies, turnaround speed, or package price.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'gigs_create',
    route: '/gigs/services',
    selector: '[data-tour="gigs-create-button"]',
    tabHint: 'Post a Service',
    targetName: 'Post a Service Button',
    text: 'Click **Post a Service** to package and publish your own tiered editing offers with custom pricing and delivery windows.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'gigs_tabs',
    route: '/gigs/services',
    selector: '[data-tour="gigs-tabs"]',
    tabHint: 'Gigs Tabs',
    targetName: 'Service Market Tabs',
    text: 'Easily navigate between **All Services**, your bookmarked **My Saved** packages, and **My Services** to track your offers.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'gigs_card_details',
    route: '/gigs/services',
    selector: '[data-tour="gig-card-first"]',
    tabHint: 'Gig Details & Order',
    targetName: 'Service Card',
    text: 'Click any **Gig Card** to preview showreels, inspect package tiers, and click **Order** to start an escrow order.',
    preferredPlacement: 'right',
  },
  {
    id: 'gigs_orders',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-gigs-orders"]',
    tabHint: 'Orders',
    targetName: 'Orders Tab',
    text: 'The **Orders** tab tracks all active client service purchases, countdown timers, draft deliveries, and completed orders.',
    preferredPlacement: 'right',
  },

  // --- SECTION 11: ACTIVITY TABS (SIDEBAR BUTTONS ONLY - NO VERIFICATION WALL) ---
  {
    id: 'deliveries_nav',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-deliveries"]',
    tabHint: 'Deliveries',
    targetName: 'Deliveries Tab',
    text: 'In **Deliveries**, manage client video cuts, submit draft versions for review, and track milestone release approvals.',
    preferredPlacement: 'right',
  },
  {
    id: 'terms_nav',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-tos"]',
    tabHint: 'My Terms',
    targetName: 'My Terms Tab',
    text: 'In **My Terms**, set your turnaround windows, revision limits, and raw footage retention terms for all client agreements.',
    preferredPlacement: 'right',
  },
  {
    id: 'contracts_nav',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-contracts"]',
    tabHint: 'Contracts',
    targetName: 'My Contracts Tab',
    text: 'In **My Contracts**, review ongoing legal agreements, escrow-protected milestone payments, and project deadlines.',
    preferredPlacement: 'right',
  },

  // --- SECTION 12: LEDGER & INBOX ---
  {
    id: 'transaction_history',
    route: '/transactions',
    selector: '[data-tour="transactions-table"]',
    tabHint: 'Transactions',
    targetName: 'Transaction History',
    text: 'This is your **Transaction History**. Review your credit balance ledger, payouts, and deposit records.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'inbox_messages',
    route: '/inbox',
    selector: '[data-tour="inbox-container"]',
    tabHint: 'Inbox',
    targetName: 'Inbox Messages',
    text: 'This is your **Inbox**. Chat with clients in real time, share video files, or start 1-click Google Meet video calls.',
    preferredPlacement: 'bottom',
  },

  // --- SECTION 13: CREDITS, CREATOR SEARCH, SIDEBAR & HELP ---
  {
    id: 'header_credits',
    route: '/inbox',
    selector: '[data-tour="credits-pill"]',
    tabHint: 'Top-up Credits',
    targetName: 'Credit Balance',
    text: 'This displays your **Credits Balance**. Click the **+** button anytime to purchase credit bundles and top up your wallet.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'header_creator_search',
    route: '/inbox',
    selector: '[data-tour="header-search-creators"]',
    tabHint: 'Creator Search',
    targetName: 'Creator Search',
    text: 'Use the **Creator Search** (Alt+K) in the top header to look up editors, animators, and talent by name across the platform.',
    preferredPlacement: 'bottom',
  },
  {
    id: 'sidebar_collapse',
    route: '/inbox',
    selector: '[data-tour="sidenav-collapse"]',
    tabHint: 'Collapse Sidebar',
    targetName: 'Collapse Button',
    text: 'Click here to **Collapse or Expand** the sidebar navigation anytime to maximize your creative editing workspace.',
    preferredPlacement: 'right',
  },
  {
    id: 'header_feedback_support',
    route: '/inbox',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Help & Feedback',
    targetName: 'Help & Support',
    text: 'Need assistance? Open your **Profile Menu** to submit feedback, file support tickets, or replay this walkthrough anytime.',
    preferredPlacement: 'left',
  },
];

export function resolveUserRole(user: any): UserPlatformRole {
  if (!user) return 'freelancer';
  const roleNames: string[] = [];
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r: any) => {
      if (typeof r === 'string') roleNames.push(r.toLowerCase());
      else if (r && typeof r.role_name === 'string') roleNames.push(r.role_name.toLowerCase());
    });
  }
  if (typeof user.role === 'string') roleNames.push(user.role.toLowerCase());
  if (typeof user.platform_purpose === 'string') roleNames.push(user.platform_purpose.toLowerCase());
  if (Array.isArray(user.platform_purposes)) {
    user.platform_purposes.forEach((p: any) => roleNames.push(String(p).toLowerCase()));
  }

  const combined = roleNames.join(' ');
  if (combined.includes('client') || combined.includes('hire')) return 'client';
  if (combined.includes('enthusiast') || combined.includes('explore') || combined.includes('learn')) return 'explorer';
  return 'freelancer';
}

const STORAGE_KEY_COMPLETED = 'ensemble_platform_walkthrough_completed';
const STORAGE_KEY_DISMISSED = 'ensemble_platform_walkthrough_dismissed';

interface WalkthroughState {
  isWalkthroughActive: boolean;
  isTourActive?: boolean;
  isWelcomeOpen: boolean;
  isGraduationOpen: boolean;
  currentStepIndex: number;
  userRole: UserPlatformRole;
  hasCompletedWalkthrough: boolean;

  // Actions
  initFromUser: (user: any) => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  startWalkthrough: (role?: UserPlatformRole) => void;
  startTour: (role?: UserPlatformRole) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipWalkthrough: () => void;
  skipTour: () => void;
  finishWalkthrough: () => void;
  finishTour: () => void;
  closeGraduation: () => void;
  setRole: (role: UserPlatformRole) => void;
  resetWalkthroughHistory: () => void;
}

export const useTourStore = create<WalkthroughState>((set, get) => ({
  isWalkthroughActive: false,
  isWelcomeOpen: false,
  isGraduationOpen: false,
  currentStepIndex: 0,
  userRole: 'freelancer',
  hasCompletedWalkthrough: localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true',

  initFromUser: (user: any) => {
    const role = resolveUserRole(user);
    const completed = localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';

    set({ userRole: role, hasCompletedWalkthrough: completed });

    if (!completed && !dismissed) {
      set({ isWelcomeOpen: true });
    }
  },

  openWelcome: () => set({ isWelcomeOpen: true }),
  closeWelcome: () => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    set({ isWelcomeOpen: false });
  },

  startWalkthrough: (role?: UserPlatformRole) => {
    const currentRole = role || get().userRole || 'freelancer';
    set({
      userRole: currentRole,
      isWelcomeOpen: false,
      isGraduationOpen: false,
      isWalkthroughActive: true,
      currentStepIndex: 0,
    });
  },

  startTour: (role?: UserPlatformRole) => get().startWalkthrough(role),

  nextStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      get().finishWalkthrough();
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    if (index >= 0 && index < WALKTHROUGH_STEPS.length) {
      set({ currentStepIndex: index });
    }
  },

  skipWalkthrough: () => {
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true');
    set({ isWalkthroughActive: false, isWelcomeOpen: false });
  },

  skipTour: () => get().skipWalkthrough(),

  finishWalkthrough: () => {
    localStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
    set({
      isWalkthroughActive: false,
      hasCompletedWalkthrough: true,
      isGraduationOpen: true,
    });
  },

  finishTour: () => get().finishWalkthrough(),

  closeGraduation: () => set({ isGraduationOpen: false }),

  setRole: (role: UserPlatformRole) => set({ userRole: role }),

  resetWalkthroughHistory: () => {
    localStorage.removeItem(STORAGE_KEY_COMPLETED);
    localStorage.removeItem(STORAGE_KEY_DISMISSED);
    set({ hasCompletedWalkthrough: false, isWelcomeOpen: true, isWalkthroughActive: false });
  },
}));

// Backwards-compatible aliases
export const TOUR_STEPS = WALKTHROUGH_STEPS;
