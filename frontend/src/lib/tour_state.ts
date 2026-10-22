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
  /** 'click' = user must click the highlighted element to advance (Next button is hidden).
   *  'next' = passive observation step (Next button advances). Default: 'next'. */
  actionType?: 'click' | 'next';
  /** Section badge displayed in the card header (e.g. "Home", "Your Profile"). */
  section?: string;
  /** Target user roles for role-filtered tours. If omitted or empty, step appears in all tours. */
  roles?: UserPlatformRole[];
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
    actionType: 'next',
    section: 'Home',
    roles: ['freelancer','client','explorer'],
  },
  {
    id: 'home_quick_actions',
    route: '/home',
    selector: '[data-tour="home-quick-actions"]',
    tabHint: 'Quick Actions',
    targetName: 'Quick Action Buttons',
    text: 'These **Quick Action buttons** let you quickly start projects, find video services, or post job listings.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Home',
    roles: ['client','explorer'],
  },
  {
    id: 'home_featured_jobs',
    route: '/home',
    selector: '[data-tour="home-featured-jobs"]',
    tabHint: 'Latest Jobs',
    targetName: 'Latest Job Posts',
    text: 'Browse **Latest Job Posts** on the homepage to find urgent video editing contracts, client budgets, and hiring openings.',
    preferredPlacement: 'top',
    actionType: 'next',
    section: 'Home',
    roles: ['freelancer'],
  },
  {
    id: 'home_featured_gigs',
    route: '/home',
    selector: '[data-tour="home-featured-gigs"]',
    tabHint: 'Top Services',
    targetName: 'Top Services',
    text: 'Explore **Top Services** offered by vetted creators with upfront pricing, turnaround guarantees, and client reviews.',
    preferredPlacement: 'top',
    actionType: 'next',
    section: 'Home',
    roles: ['freelancer','client'],
  },
  {
    id: 'home_featured_assets',
    route: '/home',
    selector: '[data-tour="home-featured-assets"]',
    tabHint: 'Popular Assets',
    targetName: 'Popular Assets',
    text: 'Preview **Popular Assets** including video stock footage, visual presets, audio packs, and video templates.',
    preferredPlacement: 'top',
    actionType: 'next',
    section: 'Home',
    roles: ['explorer'],
  },
  {
    id: 'header_notifications',
    route: '/home',
    selector: '[data-tour="notifications-button"]',
    tabHint: 'Notifications',
    targetName: 'Notifications Bell',
    text: 'Click the **Notifications** bell to keep track of contract updates, proposal responses, and escrow payments.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Home',
  },
  {
    id: 'header_ask_ai',
    route: '/home',
    selector: '[data-tour="header-ask-ai"]',
    tabHint: 'Ask AI',
    targetName: 'Ask AI Assistant',
    text: 'Click **Ask AI** anytime in the top bar for instant 24/7 answers to questions across the platform.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Home',
    roles: ['explorer'],
  },
  {
    id: 'header_profile_nav',
    route: '/home',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Profile Menu',
    targetName: 'Profile Avatar',
    text: 'Click your **Profile Avatar** in the top header and select **Profile** to view your setup and portfolio.',
    preferredPlacement: 'left',
    actionType: 'click',
    section: 'Home',
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
    actionType: 'next',
    section: 'Your Profile',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'profile_tabs',
    route: '/profile',
    selector: '[data-tour="profile-tabs"]',
    tabHint: 'Profile Tabs',
    targetName: 'Profile Tabs',
    text: 'These **Profile Tabs** let you navigate your Introduction, Portfolio showreels, Services, and Activity Records.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Your Profile',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'profile_budget',
    route: '/profile',
    selector: '[data-tour="profile-budget"]',
    tabHint: 'Ratings & Budget',
    targetName: 'Ratings & Budget',
    text: 'Set up your **Budget** here to indicate your planned spending and hiring capacity for creative video projects.',
    preferredPlacement: 'right',
    actionType: 'next',
    section: 'Your Profile',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'profile_badges',
    route: '/profile',
    selector: '[data-tour="profile-badges"]',
    tabHint: 'Account Badges',
    targetName: 'Account Badges',
    text: 'Manage and arrange your **Account Badges** here to showcase earned achievements, tiers, and community standing.',
    preferredPlacement: 'right',
    actionType: 'next',
    section: 'Your Profile',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'profile_skills',
    route: '/profile',
    selector: '[data-tour="profile-skills"]',
    tabHint: 'Skills & Capabilities',
    targetName: 'Skills Matrix',
    text: 'Add and edit your **Skills & Capabilities** here, displaying your software proficiencies and years of experience.',
    preferredPlacement: 'right',
    actionType: 'next',
    section: 'Your Profile',
    roles: ['freelancer', 'client', 'explorer'],
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
    actionType: 'click',
    section: 'Projects',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'projects_workspace',
    route: '/projects',
    selector: '[data-tour="projects-workspace"]',
    tabHint: 'Projects',
    targetName: 'Projects Workspace',
    text: 'This is your **Projects Workspace**. Manage client footage, organize video cuts, and launch the built-in cloud editor.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Projects',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'projects_create',
    route: '/projects',
    selector: '[data-tour="projects-create-button"]',
    tabHint: 'Create Project',
    targetName: 'Create a Project Button',
    text: 'Click **Create a Project** here to begin setting up a new editing timeline with custom canvas settings.',
    preferredPlacement: 'bottom',
    actionType: 'click',
    section: 'Projects',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'projects_format',
    route: '/projects/select',
    selector: '[data-tour="projects-format-selection"]',
    tabHint: 'Format Selection',
    targetName: 'Aspect Ratio Selection',
    text: 'This is the area where you select your **Video Format** (Landscape 16:9, Portrait 9:16, or Square) and start editing.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Projects',
  },

  // --- SECTION 5: TEAMS ---
  {
    id: 'sidenav_teams',
    route: '/projects',
    selector: '[data-tour="sidenav-teams"]',
    tabHint: 'Teams Navigation',
    targetName: 'Teams Tab',
    text: 'Click on **Teams** in the sidebar navigation to open the collaborative workspace.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Teams',
  },
  {
    id: 'teams_workspace',
    route: '/teams',
    selector: '[data-tour="teams-workspace"]',
    tabHint: 'Teams',
    targetName: 'Teams Workspace',
    text: 'This is **Teams**. Collaborate with other editors, share media libraries, and assign client project deliverables.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Teams',
  },

  // --- SECTION 6: FORUMS ---
  {
    id: 'sidenav_forums',
    route: '/teams',
    selector: '[data-tour="sidenav-forums"]',
    tabHint: 'Forums Navigation',
    targetName: 'Forums Tab',
    text: 'Click on **Forums** in the sidebar navigation to join discussions with other creators.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Forums',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'forums_tabs',
    route: '/forums',
    selector: '[data-tour="forums-tabs"]',
    tabHint: 'Forums',
    targetName: 'Community Groups',
    text: 'In **Forums**, you can browse group feeds, join creator groups, or create your own community group.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Forums',
  },
  {
    id: 'forums_new_discussion',
    route: '/forums',
    selector: '[data-tour="forums-new-discussion"]',
    tabHint: 'New Discussion',
    targetName: 'New Discussion Button',
    text: 'Click this **New Discussion** button to start a thread, ask editing questions, or share tips with other creators.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Forums',
  },

  // --- SECTION 7: DISCOVERY ---
  {
    id: 'sidenav_discovery',
    route: '/forums',
    selector: '[data-tour="sidenav-discovery"]',
    tabHint: 'Discovery Navigation',
    targetName: 'Discovery Tab',
    text: 'Click on **Discovery** in the sidebar navigation to explore featured creators and edits.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Discovery',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'discovery_page',
    route: '/discovery',
    selector: '[data-tour="discovery-container"]',
    tabHint: 'Discovery',
    targetName: 'Discovery Feed',
    text: 'This is **Discovery**. Browse featured video creators, trending edits, and community talent across Ensemble.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Discovery',
    roles: ['freelancer', 'client', 'explorer'],
  },

  // --- SECTION 8: ASSET LIBRARY ---
  {
    id: 'sidenav_assets',
    route: '/discovery',
    selector: '[data-tour="sidenav-assets"]',
    tabHint: 'Asset Library Navigation',
    targetName: 'Asset Library Tab',
    text: 'Click on **Asset Library** in the sidebar navigation to browse presets and footage.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Asset Library',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'assets_catalog',
    route: '/assets',
    selector: '[data-tour="assets-catalog"]',
    tabHint: 'Asset Library',
    targetName: 'Asset Catalog',
    text: 'This is the **Asset Library**. Browse stock footage, visual presets, audio packs, and templates for your video pipeline.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Asset Library',
  },

  // --- SECTION 9: JOB MARKET FLOW ---
  {
    id: 'sidenav_jobs',
    route: '/assets',
    selector: '[data-tour="sidenav-jobs-posting"]',
    tabHint: 'Jobs Navigation',
    targetName: 'Job Market Tab',
    text: 'Click on **Jobs** in the sidebar navigation to enter the client hiring and proposal market.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Job Market',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'jobs_search',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-search-bar"]',
    tabHint: 'Search Jobs',
    targetName: 'Job Search Bar',
    text: 'Use the **Search Bar** to find jobs matching specific video styles, editing tools, keywords, or client names.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Job Market',
    roles: ['freelancer'],
  },
  {
    id: 'jobs_create',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-create-button"]',
    tabHint: 'Post a Job',
    targetName: 'Post a Job Button',
    text: 'Click **Post a Job** to hire creators for video editing, animation, sound design, or full post-production.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Job Market',
    roles: ['client'],
  },
  {
    id: 'jobs_tabs',
    route: '/jobs/postings',
    selector: '[data-tour="jobs-tabs"]',
    tabHint: 'Job Tabs',
    targetName: 'Job Market Tabs',
    text: 'Switch between active **Postings**, your bookmarked **Saved** listings, and **My Job Posts** to manage your hiring.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Job Market',
  },
  {
    id: 'jobs_card_details',
    route: '/jobs/postings',
    selector: '[data-tour="job-card-first"]',
    tabHint: 'Open Job Details',
    targetName: 'Job Listing Card',
    text: 'Click this **Job Card** to open the project details drawer.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Job Market',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'jobs_detail_view_full',
    route: '/jobs/postings',
    selector: '[data-tour="job-detail-view-full"]',
    tabHint: 'View Full Page',
    targetName: 'View Full Page Button',
    text: 'Click **View Full** here to view the complete job posting in a dedicated full page with attachments and client history.',
    preferredPlacement: 'left',
    actionType: 'next',
    section: 'Job Market',
  },
  {
    id: 'jobs_detail_send_proposal',
    route: '/jobs/postings',
    selector: '[data-tour="job-detail-send-proposal"]',
    tabHint: 'Send Proposal',
    targetName: 'Send Proposal Button',
    text: 'This is where you apply! Click **Send Proposal** to submit your custom quote, milestone timeline, and pitch to the client.',
    preferredPlacement: 'left',
    actionType: 'next',
    section: 'Job Market',
    roles: ['freelancer'],
  },
  {
    id: 'jobs_detail_exit',
    route: '/jobs/postings',
    selector: '[data-tour="job-detail-exit-pill"]',
    tabHint: 'Exit Details',
    targetName: 'Exit Detail View',
    text: 'Click anywhere outside the drawer to close details and return to the job list.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Job Market',
  },
  {
    id: 'jobs_proposals',
    route: '/jobs/postings',
    selector: '[data-tour="sidenav-jobs-proposals"]',
    tabHint: 'Proposals',
    targetName: 'Proposals Tab',
    text: 'Click **Proposals** in the sidebar to track all sent milestone proposals, incoming submissions, and client acceptances.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Job Market',
    roles: ['freelancer', 'client', 'explorer'],
  },

  // --- SECTION 10: GIGS & VIDEO SERVICES FLOW ---
  {
    id: 'sidenav_gigs',
    route: '/jobs/postings',
    selector: '[data-tour="sidenav-gigs-services"]',
    tabHint: 'Gigs Navigation',
    targetName: 'Gigs & Services Tab',
    text: 'Click on **Gigs** in the sidebar navigation to browse fixed-price editing services.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Gigs & Services',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'gigs_search',
    route: '/gigs/services',
    selector: '[data-tour="gigs-search-bar"]',
    tabHint: 'Search Services',
    targetName: 'Gigs Search Bar',
    text: 'Search for editing services by category, software proficiencies, turnaround speed, or package price.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Gigs & Services',
    roles: ['client'],
  },
  {
    id: 'gigs_create',
    route: '/gigs/services',
    selector: '[data-tour="gigs-create-button"]',
    tabHint: 'Post a Service',
    targetName: 'Post a Service Button',
    text: 'Click **Post a Service** to package and publish your own tiered editing offers with custom pricing and delivery windows.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Gigs & Services',
    roles: ['freelancer'],
  },
  {
    id: 'gigs_tabs',
    route: '/gigs/services',
    selector: '[data-tour="gigs-tabs"]',
    tabHint: 'Gigs Tabs',
    targetName: 'Service Market Tabs',
    text: 'Navigate between **All Services**, your bookmarked **My Saved** packages, and **My Services** to track your offers.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Gigs & Services',
  },
  {
    id: 'gigs_card_details',
    route: '/gigs/services',
    selector: '[data-tour="gig-card-first"]',
    tabHint: 'Open Service Details',
    targetName: 'Service Card',
    text: 'Click this **Service Card** to open package tiers and order options.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Gigs & Services',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'gigs_detail_view_full',
    route: '/gigs/services',
    selector: '[data-tour="gig-detail-view-full"]',
    tabHint: 'View Full Showcase',
    targetName: 'View Full Page Button',
    text: 'Click **View Full** to inspect the entire service showcase, customer reviews, and full portfolio showreels.',
    preferredPlacement: 'left',
    actionType: 'next',
    section: 'Gigs & Services',
  },
  {
    id: 'gigs_detail_order',
    route: '/gigs/services',
    selector: '[data-tour="gig-detail-order-button"]',
    tabHint: 'Order Package',
    targetName: 'Package Tiers & Order Button',
    text: 'Here in service details, review deliverables, compare tiers, and click **Order** to start an escrow-protected order.',
    preferredPlacement: 'left',
    actionType: 'next',
    section: 'Gigs & Services',
    roles: ['client'],
  },
  {
    id: 'gigs_detail_exit',
    route: '/gigs/services',
    selector: '[data-tour="gig-detail-exit-pill"]',
    tabHint: 'Exit Details',
    targetName: 'Exit Detail View',
    text: 'Click anywhere outside the drawer to close details and return to the services catalog.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Gigs & Services',
  },
  {
    id: 'gigs_orders',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-gigs-orders"]',
    tabHint: 'Orders',
    targetName: 'Orders Tab',
    text: 'Click **Orders** in the sidebar to track active service purchases, countdown timers, draft deliveries, and completed orders.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Gigs & Services',
    roles: ['freelancer', 'client', 'explorer'],
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
    actionType: 'next',
    section: 'Deliveries & Contracts',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'terms_nav',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-tos"]',
    tabHint: 'My Terms',
    targetName: 'My Terms Tab',
    text: 'In **My Terms**, set your turnaround windows, revision limits, and raw footage retention terms for all client agreements.',
    preferredPlacement: 'right',
    actionType: 'next',
    section: 'Deliveries & Contracts',
  },
  {
    id: 'contracts_nav',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-contracts"]',
    tabHint: 'Contracts',
    targetName: 'My Contracts Tab',
    text: 'In **My Contracts**, review ongoing legal agreements, escrow-protected milestone payments, and project deadlines.',
    preferredPlacement: 'right',
    actionType: 'next',
    section: 'Deliveries & Contracts',
    roles: ['freelancer', 'client', 'explorer'],
  },

  // --- SECTION 12: LEDGER & INBOX ---
  {
    id: 'sidenav_transactions',
    route: '/gigs/services',
    selector: '[data-tour="sidenav-transactions"]',
    tabHint: 'Transactions Navigation',
    targetName: 'Transactions Tab',
    text: 'Click on **Transactions** in the sidebar navigation to view your ledger balance.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Ledger',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'transaction_history',
    route: '/transactions',
    selector: '[data-tour="transactions-table"]',
    tabHint: 'Transactions',
    targetName: 'Transaction History',
    text: 'This is your **Transaction History**. Review your credit balance ledger, payouts, and deposit records.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Ledger',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'sidenav_inbox',
    route: '/transactions',
    selector: '[data-tour="sidenav-inbox"]',
    tabHint: 'Inbox Navigation',
    targetName: 'Inbox Tab',
    text: 'Click on **Inbox** in the sidebar navigation to open client chats.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Inbox & Credits',
  },
  {
    id: 'inbox_messages',
    route: '/inbox',
    selector: '[data-tour="inbox-container"]',
    tabHint: 'Inbox',
    targetName: 'Inbox Messages',
    text: 'This is your **Inbox**. Chat with clients in real time, share video files, or start 1-click Google Meet video calls.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Inbox & Credits',
  },

  // --- SECTION 13: BILLING & SUBSCRIPTIONS ---
  {
    id: 'header_credits',
    route: '/inbox',
    selector: '[data-tour="credits-pill"]',
    tabHint: 'Top-up Credits',
    targetName: 'Credit Balance',
    text: 'Click your **Credit Balance** in the header to open the Billing & Credits store.',
    preferredPlacement: 'bottom',
    actionType: 'click',
    section: 'Billing & Credits',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'credits_balance',
    route: '/credits',
    selector: '[data-tour="credits-balance-card"]',
    tabHint: 'Current Balance',
    targetName: 'Current Credits Balance',
    text: 'View your real-time **Credits Balance** here, protected and funded for escrow milestones.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Billing & Credits',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'credits_topup',
    route: '/credits',
    selector: '[data-tour="credits-tab-topup"]',
    tabHint: 'Top Up Packs',
    targetName: 'Top up Credits',
    text: 'Purchase discounted **Credit Bundles** or enter a custom amount with encrypted checkout.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Billing & Credits',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'credits_subscription_tab',
    route: '/credits',
    selector: '[data-tour="credits-tab-membership"]',
    tabHint: 'Subscription Plans',
    targetName: 'Subscription Plans Tab',
    text: 'Click **Subscription Plans** to view tiered creator memberships and unlocks.',
    preferredPlacement: 'bottom',
    actionType: 'click',
    section: 'Billing & Credits',
  },
  {
    id: 'credits_subscription_plans',
    route: '/credits-subscriptions',
    selector: '[data-tour="credits-plans-grid"]',
    tabHint: 'Membership Plans',
    targetName: 'Membership Plans',
    text: 'Choose between **Free**, **Premium**, and **Business** tiers for 4K video exports, AI tools, unlimited assets, and prioritized queues.',
    preferredPlacement: 'top',
    actionType: 'next',
    section: 'Billing & Credits',
  },

  // --- SECTION 14: WORKSPACE TOOLS & SUPPORT ---
  {
    id: 'header_creator_search',
    route: '/credits-subscriptions',
    selector: '[data-tour="header-search-creators"]',
    tabHint: 'Creator Search',
    targetName: 'Creator Search',
    text: 'Use the **Creator Search** (Alt+K) in the top header to look up editors, animators, and talent by name across the platform.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Workspace Tools',
  },
  {
    id: 'sidebar_collapse',
    route: '/credits-subscriptions',
    selector: '[data-tour="sidenav-collapse"]',
    tabHint: 'Collapse Sidebar',
    targetName: 'Collapse Button',
    text: 'Click here to **Collapse or Expand** the sidebar navigation anytime to maximize your creative editing workspace.',
    preferredPlacement: 'right',
    actionType: 'click',
    section: 'Workspace Tools',
  },
  // --- SETTINGS & VERIFICATION ---
  {
    id: 'settings_verification',
    route: '/settings',
    routeState: { tab: 'account' },
    selector: '[data-tour="settings-verification-button"]',
    tabHint: 'Account Details',
    targetName: 'Verification Status',
    text: 'In **Settings › Account Details**, click here to view your **Identity Verification** status to unlock verified badges and escrow withdrawals.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Settings',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'settings_display',
    route: '/settings',
    routeState: { tab: 'display' },
    selector: '[data-tour="settings-theme-toggle"]',
    tabHint: 'Display Settings',
    targetName: 'Theme Toggle',
    text: 'In **Display Settings**, switch between **Light and Dark mode** anytime to customize your workspace appearance.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Settings',
    roles: ['freelancer', 'client', 'explorer'],
  },

  // --- HELP & FEEDBACK ---
  {
    id: 'header_feedback_support',
    route: '/home',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Help & Support',
    targetName: 'Help & Support',
    text: 'Access the **Help Center** from your profile menu anytime for FAQs, editing guidelines, and dispute support.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Help & Feedback',
    roles: ['freelancer', 'client', 'explorer'],
  },
  {
    id: 'submit_a_feedback',
    route: '/home',
    selector: '[data-tour="user-profile-button"]',
    tabHint: 'Submit a Feedback',
    targetName: 'Submit a Feedback',
    text: 'Click **Submit a Feedback** in your profile menu to report bugs, suggest new tools, or request features directly from the development team.',
    preferredPlacement: 'bottom',
    actionType: 'next',
    section: 'Help & Feedback',
    roles: ['freelancer', 'client', 'explorer'],
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

export function getActiveTourSteps(role?: UserPlatformRole): WalkthroughStep[] {
  if (!role) return WALKTHROUGH_STEPS;
  return WALKTHROUGH_STEPS.filter(
    (step) => !step.roles || step.roles.length === 0 || step.roles.includes(role)
  );
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
  activeSteps: WalkthroughStep[];
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
  skipSection: () => void;
  skipWalkthrough: () => void;
  skipTour: () => void;
  finishWalkthrough: () => void;
  finishTour: () => void;
  closeGraduation: () => void;
  setRole: (role: UserPlatformRole) => void;
  resetWalkthroughHistory: () => void;
}

let lastAdvanceTimestamp = 0;

export const useTourStore = create<WalkthroughState>((set, get) => ({
  isWalkthroughActive: false,
  isWelcomeOpen: false,
  isGraduationOpen: false,
  currentStepIndex: 0,
  userRole: 'freelancer',
  activeSteps: getActiveTourSteps('freelancer'),
  hasCompletedWalkthrough: localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true',

  initFromUser: (user: any) => {
    const role = resolveUserRole(user);
    const completed = localStorage.getItem(STORAGE_KEY_COMPLETED) === 'true';
    const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED) === 'true';

    set({
      userRole: role,
      activeSteps: getActiveTourSteps(role),
      hasCompletedWalkthrough: completed,
    });

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
    const active = getActiveTourSteps(currentRole);
    lastAdvanceTimestamp = Date.now();
    set({
      userRole: currentRole,
      activeSteps: active,
      isWelcomeOpen: false,
      isGraduationOpen: false,
      isWalkthroughActive: true,
      currentStepIndex: 0,
    });
  },

  startTour: (role?: UserPlatformRole) => get().startWalkthrough(role),

  nextStep: () => {
    const now = Date.now();
    // 450ms debounce guard to prevent double-advance when click + route change fire simultaneously
    if (now - lastAdvanceTimestamp < 450) {
      return;
    }
    lastAdvanceTimestamp = now;

    const { currentStepIndex, activeSteps } = get();
    if (currentStepIndex < activeSteps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      get().finishWalkthrough();
    }
  },

  prevStep: () => {
    const now = Date.now();
    if (now - lastAdvanceTimestamp < 300) {
      return;
    }
    lastAdvanceTimestamp = now;

    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    const { activeSteps } = get();
    if (index >= 0 && index < activeSteps.length) {
      lastAdvanceTimestamp = Date.now();
      set({ currentStepIndex: index });
    }
  },

  skipSection: () => {
    const { currentStepIndex, activeSteps } = get();
    const currentStep = activeSteps[currentStepIndex];
    if (!currentStep) return;

    const nextSectionIndex = activeSteps.findIndex(
      (s, idx) => idx > currentStepIndex && s.section !== currentStep.section
    );

    if (nextSectionIndex !== -1) {
      lastAdvanceTimestamp = Date.now();
      set({ currentStepIndex: nextSectionIndex });
    } else {
      get().finishWalkthrough();
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

  setRole: (role: UserPlatformRole) =>
    set({
      userRole: role,
      activeSteps: getActiveTourSteps(role),
      currentStepIndex: 0,
    }),

  resetWalkthroughHistory: () => {
    localStorage.removeItem(STORAGE_KEY_COMPLETED);
    localStorage.removeItem(STORAGE_KEY_DISMISSED);
    set({
      hasCompletedWalkthrough: false,
      isWelcomeOpen: true,
      isWalkthroughActive: false,
      activeSteps: getActiveTourSteps(get().userRole),
      currentStepIndex: 0,
    });
  },
}));

// Backwards-compatible aliases
export const TOUR_STEPS = WALKTHROUGH_STEPS;
