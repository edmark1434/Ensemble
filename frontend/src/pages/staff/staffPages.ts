import { lazyWithPreload, type Preloadable } from '@/lib/lazyWithPreload';

export const AdminLayout = lazyWithPreload(() => import('@/pages/admin/AdminLayout'));
export const AdminDashboard = lazyWithPreload(() => import('@/pages/admin/AdminDashboard'));
export const AdminFeedbacksPage = lazyWithPreload(() => import('@/pages/admin/feedbacks/AdminFeedbacksPage'));
export const AdminBadgesPage = lazyWithPreload(() => import('@/pages/admin/badges/AdminBadgesPage'));
export const AdminWarningsPage = lazyWithPreload(() => import('@/pages/admin/warnings/AdminWarningsPage'));
export const UserTeamPage = lazyWithPreload(() => import('@/pages/admin/userTeam/UserTeamPage'));
export const CreditEconomyPage = lazyWithPreload(() => import('@/pages/admin/creditEconomy/CreditEconomyPage'));
export const ModerationPage = lazyWithPreload(() => import('@/pages/admin/moderation/ModerationPage'));
export const AnalyticsPage = lazyWithPreload(() => import('@/pages/admin/analytics/AnalyticsPage'));
export const TicketManagementPage = lazyWithPreload(() => import('@/pages/admin/ticketManagement/TicketManagementPage'));
export const SystemSettingsPage = lazyWithPreload(() => import('@/pages/admin/systemSettings/SystemSettingsPage'));
export const StaffPortalLayout = lazyWithPreload(() => import('@/pages/staff/StaffPortalLayout'));
export const StaffDashboard = lazyWithPreload(() => import('@/pages/staff/StaffDashboard'));
export const StaffPlatformPreviewPage = lazyWithPreload(() => import('@/pages/staff/StaffPlatformPreviewPage'));
export const ForumModeratorLayout = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/Layout'));
export const ForumModeratorDashboard = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/Dashboard'));
export const ForumDiscussion = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/ForumDiscussion'));
export const ForumTicketManagement = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/TicketManagement'));
export const ForumReports = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/Reports'));
export const ForumUserTeam = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/UserTeam'));
export const ForumDisputes = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/Disputes'));
export const ForumRestrictions = lazyWithPreload(() => import('@/pages/moderator/forum-moderator/Restrictions'));
export const MarketplaceModeratorLayout = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/Layout'));
export const MarketplaceModeratorDashboard = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/Dashboard'));
export const MarketplaceControl = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/MarketplaceControl'));
export const MarketplaceTicketManagement = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/TicketManagement'));
export const MarketplaceReports = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/Reports'));
export const MarketplaceUserTeam = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/UserTeam'));
export const MarketplaceDisputes = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/Disputes'));
export const MarketplaceRestrictions = lazyWithPreload(() => import('@/pages/moderator/marketplace-moderator/Restrictions'));
export const SupportModeratorLayout = lazyWithPreload(() => import('@/pages/moderator/support-moderator/Layout'));
export const SupportModeratorDashboard = lazyWithPreload(() => import('@/pages/moderator/support-moderator/Dashboard'));
export const SupportTicketManagement = lazyWithPreload(() => import('@/pages/moderator/support-moderator/TicketManagement'));
export const SupportDisputes = lazyWithPreload(() => import('@/pages/moderator/support-moderator/Disputes'));
export const SupportUserTeam = lazyWithPreload(() => import('@/pages/moderator/support-moderator/UserTeam'));
export const SupportReports = lazyWithPreload(() => import('@/pages/moderator/support-moderator/Reports'));
export const SupportRestrictions = lazyWithPreload(() => import('@/pages/moderator/support-moderator/Restrictions'));
export const JobsModeratorLayout = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/Layout'));
export const JobsModeratorDashboard = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/Dashboard'));
export const JobsGigsControl = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/JobsGigsControl'));
export const JobsTicketManagement = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/TicketManagement'));
export const JobsDisputes = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/Disputes'));
export const JobsReports = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/Reports'));
export const JobsUserTeam = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/UserTeam'));
export const JobsRestrictions = lazyWithPreload(() => import('@/pages/moderator/jobs-moderator/Restrictions'));

export type StaffConsole = 'admin' | 'staff' | 'forum' | 'marketplace' | 'support' | 'jobs';

const CONSOLE_PAGES: Record<StaffConsole, Preloadable[]> = {
  admin: [AdminDashboard, AdminFeedbacksPage, AdminBadgesPage, AdminWarningsPage, UserTeamPage, CreditEconomyPage, ModerationPage, AnalyticsPage, TicketManagementPage, SystemSettingsPage, StaffPlatformPreviewPage],
  staff: [StaffDashboard, StaffPlatformPreviewPage],
  forum: [ForumModeratorDashboard, ForumDiscussion, ForumTicketManagement, ForumReports, ForumUserTeam, ForumDisputes, ForumRestrictions, StaffPlatformPreviewPage],
  marketplace: [MarketplaceModeratorDashboard, MarketplaceControl, MarketplaceTicketManagement, MarketplaceReports, MarketplaceUserTeam, MarketplaceDisputes, MarketplaceRestrictions, StaffPlatformPreviewPage],
  support: [SupportModeratorDashboard, SupportTicketManagement, SupportDisputes, SupportUserTeam, SupportReports, SupportRestrictions, StaffPlatformPreviewPage],
  jobs: [JobsModeratorDashboard, JobsGigsControl, JobsTicketManagement, JobsDisputes, JobsReports, JobsUserTeam, JobsRestrictions, StaffPlatformPreviewPage],
};

/** Fetches every page chunk of a console so sidebar navigation never waits on a download. */
export function preloadStaffConsole(consoleId: StaffConsole) {
  for (const page of CONSOLE_PAGES[consoleId]) {
    void page.preload().catch(() => {
      // A failed preload is retried when the page is opened.
    });
  }
}
