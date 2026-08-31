import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ComponentType, useEffect } from 'react'
import {ToastProvider} from "@/components/utility/toast_provider.tsx";
import {ToastTestingWidget} from "@/components/utility/ToastTestingWidget.tsx";
import {DevModeWidget} from "@/components/utility/DevModeWidget.tsx";
import { GlobalLoader } from '@/components/ui/GlobalLoader';
import useGlobalState from '@/lib/global_state';
import RouteMiddleware from './lib/RouteMiddleware'
import StaffMiddleware from './lib/StaffMiddleware'
import CreditShop from '@/pages/user/13_creditsshop/CreditsShop.tsx'
import Checkout from '@/pages/payment/checkout.tsx'
import Profile from '@/pages/user/7_profile/Profile.tsx'
import ProfileRoute from '@/pages/user/7_profile/ProfileRoute.tsx'
import UserSettings from '@/components/nav/Settings/user_settings.tsx'
import Layout from './components/ui/Layout.tsx'
import Home from '@/pages/user/1_home/Home.tsx'
import Projects from '@/pages/user/2_projects/Projects.tsx'
import Projects_Selection from '@/pages/user/2_projects/Projects_Selection.tsx'
import Teams from '@/pages/user/3_teams/Teams.tsx'
import SelectedTeam from '@/pages/user/3_teams/SelectedTeam.tsx'
import TeamTaskWorkspace from '@/pages/user/3_teams/team_tasks/TeamTaskWorkspace.tsx'
import Forums from './pages/user/4_forums/Forums.tsx'
import SelectedGroup from '@/pages/user/4_forums/SelectedGroup.tsx'
import ExpandDiscussion from '@/pages/user/4_forums/ExpandDiscussion.tsx'
import InboxMain from '@/components/ui/inbox/inbox_main.tsx'
import SectionPlaceholder from '@/pages/user/0_misc/SectionPlaceholder.tsx'
import AssetsLibrary from '@/pages/user/5_assets/AssetsLibrary.tsx'
import AssetDetails from '@/pages/user/5_assets/AssetDetails.tsx'
import DashboardMain from './pages/user/8_dashboard/dashboard_main'
import { DashboardTaskDetail } from './pages/user/8_dashboard/dashboard_components/DashboardTaskDetail'
import JobMain from '@/pages/user/6_job_market/job_main.tsx'
import JobPostingPage from '@/pages/user/6_job_market/job_pages/job_posting_page.tsx'
import JobSavesPage from '@/pages/user/6_job_market/job_pages/job_saves_page.tsx'
import JobMyPostPage from '@/pages/user/6_job_market/job_pages/job_mypost_page.tsx'
import JobCreatePostPage from '@/pages/user/6_job_market/job_pages/job_createpost_page.tsx'
import JobEditPostPage from '@/pages/user/6_job_market/job_pages/job_editpost_page.tsx'
import ProposalsMain from '@/pages/user/6_job_market/job_proposals/proposals_main.tsx'
import ProposalsSelectJobPage from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_select_job_page.tsx'
import ProposalsIncomingPage from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_incoming_page.tsx'
import ProposalsSentPage from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_sent_page.tsx'
import ProposalsCreatePage from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_create_page.tsx'
import ProposalsEditPage from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_edit_page.tsx'
import ProposalsViewDetailsAsApplicant from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_view_details_as_applicant'
import ProposalsViewDetailsAsAuthor from '@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_view_details_as_author'
import GigMain from '@/pages/user/7_gigs/gig_main.tsx'
import GigServicesPage from '@/pages/user/7_gigs/gig_pages/gig_services_page.tsx'
import GigSavesPage from '@/pages/user/7_gigs/gig_pages/gig_saves_page.tsx'
import GigMyPostPage from '@/pages/user/7_gigs/gig_pages/gig_mypost_page.tsx'
import GigCreatePage from '@/pages/user/7_gigs/gig_pages/gig_create_page.tsx'
import GigEditPage from '@/pages/user/7_gigs/gig_pages/gig_edit_page.tsx'
import GigFullPage from '@/pages/user/7_gigs/gig_pages/gig_full_page.tsx'
import GigOrderPage from '@/pages/user/7_gigs/gig_pages/gig_order_page.tsx'
import OrdersMain from '@/pages/user/7_gigs/gig_orders/orders_main.tsx'
import OrdersSelectGigPage from '@/pages/user/7_gigs/gig_orders/orders_select_gig_page.tsx'
import IncomingOrders from '@/pages/user/7_gigs/gig_orders/incoming_orders.tsx'
import IncomingOrderDetail from '@/pages/user/7_gigs/gig_orders/incoming_order_detail.tsx'
import SentOrders from '@/pages/user/7_gigs/gig_orders/sent_orders.tsx'
import SentOrderDetail from '@/pages/user/7_gigs/gig_orders/sent_order_detail.tsx'
import Verification from '@/pages/user/9_verification/Verification.tsx'
import BusinessVerification from '@/pages/user/9_verification/BusinessVerification.tsx'
import TransactionHistoryMain from '@/pages/user/11_transactionhistory/main.tsx'
import TosMain from '@/pages/user/terms_of_service/tos_main.tsx'
import Contracts from '@/pages/user/contracts/contracts.tsx'
import UserProfilesList from '@/components/nav/user_profiles_list.tsx'
import { VerificationStatus } from '@/pages/user/7_profile/VerificationStatus/VerificationStatus.tsx'

import './App.css'

const lazyPage = (loader: () => Promise<{ default: ComponentType<any> }>) => lazy(loader);

const LandingPage = lazyPage(() => import('./pages/LandingPage'));
const LoginPage = lazyPage(() => import('./pages/auth/Loginpage'));
const AdminLoginPage = lazyPage(() => import('./pages/auth/AdminLoginPage'));
const StaffLoginPage = lazyPage(() => import('./pages/auth/StaffLoginPage'));
const SignupPage = lazyPage(() => import('./pages/auth/Signuppage'));
const EmailVerification = lazyPage(() => import('./pages/EmailVerification'));
const NotFound = lazyPage(() => import('@/pages/user/0_misc/NotFound.tsx'));
const ResetPasswordPage = lazyPage(() => import('@/pages/auth/ResetPasswordPage.tsx'));
const ForgotPasswordPage = lazyPage(() => import('@/pages/auth/ForgotPasswordPage.tsx'));
const NotificationsPage = lazyPage(() => import('@/pages/user/notifications/notifications_page.tsx'));
const AdminLayout = lazyPage(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'));
const UserTeamPage = lazyPage(() => import('./pages/admin/userTeam/UserTeamPage'));
const CreditEconomyPage = lazyPage(() => import('./pages/admin/creditEconomy/CreditEconomyPage'));
const ModerationPage = lazyPage(() => import('./pages/admin/moderation/ModerationPage'));
const AnalyticsPage = lazyPage(() => import('./pages/admin/analytics/AnalyticsPage'));
const TicketManagementPage = lazyPage(() => import('./pages/admin/ticketManagement/TicketManagementPage'));
const SystemSettingsPage = lazyPage(() => import('./pages/admin/systemSettings/SystemSettingsPage'));
const StaffPortalLayout = lazyPage(() => import('./pages/staff/StaffPortalLayout'));
const StaffDashboard = lazyPage(() => import('./pages/staff/StaffDashboard'));
const VerifyEmail = lazyPage(() => import('@/pages/setup_account/00_VerifyEmail.tsx'));
const PersonalDetails = lazyPage(() => import('@/pages/setup_account/01_PersonalDetails.tsx'));
const UploadImage = lazyPage(() => import('@/pages/setup_account/02_UploadImage.tsx'));
const Survey = lazyPage(() => import('@/pages/setup_account/04_Survey.tsx'));
const ForumModeratorLayout = lazyPage(() => import('./pages/moderator/forum-moderator/Layout'));
const ForumModeratorDashboard = lazyPage(() => import('./pages/moderator/forum-moderator/Dashboard'));
const ForumDiscussion = lazyPage(() => import('./pages/moderator/forum-moderator/ForumDiscussion'));
const ForumTicketManagement = lazyPage(() => import('./pages/moderator/forum-moderator/TicketManagement'));
const ForumReports = lazyPage(() => import('./pages/moderator/forum-moderator/Reports'));
const ForumUserTeam = lazyPage(() => import('./pages/moderator/forum-moderator/UserTeam'));
const ForumDisputes = lazyPage(() => import('./pages/moderator/forum-moderator/Disputes'));
const MarketplaceModeratorLayout = lazyPage(() => import('./pages/moderator/marketplace-moderator/Layout'));
const MarketplaceModeratorDashboard = lazyPage(() => import('./pages/moderator/marketplace-moderator/Dashboard'));
const MarketplaceControl = lazyPage(() => import('./pages/moderator/marketplace-moderator/MarketplaceControl'));
const MarketplaceTicketManagement = lazyPage(() => import('./pages/moderator/marketplace-moderator/TicketManagement'));
const MarketplaceReports = lazyPage(() => import('./pages/moderator/marketplace-moderator/Reports'));
const MarketplaceUserTeam = lazyPage(() => import('./pages/moderator/marketplace-moderator/UserTeam'));
const MarketplaceDisputes = lazyPage(() => import('./pages/moderator/marketplace-moderator/Disputes'));
const SupportModeratorLayout = lazyPage(() => import('./pages/moderator/support-moderator/Layout'));
const SupportModeratorDashboard = lazyPage(() => import('./pages/moderator/support-moderator/Dashboard'));
const SupportTicketManagement = lazyPage(() => import('./pages/moderator/support-moderator/TicketManagement'));
const SupportDisputes = lazyPage(() => import('./pages/moderator/support-moderator/Disputes'));
const SupportUserTeam = lazyPage(() => import('./pages/moderator/support-moderator/UserTeam'));
const SupportReports = lazyPage(() => import('./pages/moderator/support-moderator/Reports'));
const JobsModeratorLayout = lazyPage(() => import('./pages/moderator/jobs-moderator/Layout'));
const JobsModeratorDashboard = lazyPage(() => import('./pages/moderator/jobs-moderator/Dashboard'));
const JobsGigsControl = lazyPage(() => import('./pages/moderator/jobs-moderator/JobsGigsControl'));
const JobsTicketManagement = lazyPage(() => import('./pages/moderator/jobs-moderator/TicketManagement'));
const JobsDisputes = lazyPage(() => import('./pages/moderator/jobs-moderator/Disputes'));
const JobsReports = lazyPage(() => import('./pages/moderator/jobs-moderator/Reports'));
const JobsUserTeam = lazyPage(() => import('./pages/moderator/jobs-moderator/UserTeam'));
const PageAboutUs = lazyPage(() => import('@/pages/landing/pages/page_AboutUs.tsx'));
const PageAskOurChatbot = lazyPage(() => import('./pages/landing/pages/page_AskOurChatbot'));
const PageFAQ = lazyPage(() => import('./pages/landing/pages/page_FAQ'));
const PageHowToHire = lazyPage(() => import('./pages/landing/pages/page_HowToHire'));
const PageHowToWork = lazyPage(() => import('./pages/landing/pages/page_HowToWork'));
const PagePricing = lazyPage(() => import('./pages/landing/pages/page_Pricing'));
const PagePrivacyPolicy = lazyPage(() => import('@/pages/landing/pages/page_PrivacyPolicy.tsx'));
const PageTermsOfService = lazyPage(() => import('@/pages/landing/pages/page_TermsOfService.tsx'));
const PageSendAFeedback = lazyPage(() => import('./pages/landing/pages/page_SendAFeedback'));
const PageSubmitATicket = lazyPage(() => import('./pages/landing/pages/page_SubmitATicket'));
const PageSupportUs = lazyPage(() => import('./pages/landing/pages/page_SupportUs'));

function App() {
  const theme = useGlobalState((state) => state.theme);
  const setTheme = useGlobalState((state) => state.setTheme);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#080a12' : '#f9fafb';
  }, [theme]);

  return (
    <>
      <ToastProvider />
      <ToastTestingWidget />
      <DevModeWidget />
      <Suspense fallback={<GlobalLoader />}>
      <Routes>
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/staff" element={<StaffLoginPage />} />

        <Route path="/setup/verify-email" element={<VerifyEmail />} />

      <Route element={<RouteMiddleware />}>
        <Route path="/setup/personal-details" element={<PersonalDetails />} />
        <Route path="/setup/upload-image" element={<UploadImage />} />
        <Route path="/setup/survey" element={<Survey />} />
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<NotFound/>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/verify-email' element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Fullscreen Settings Route */}
        <Route path='/settings' element={<UserSettings />} />

        <Route path="/landing">
          <Route path="Pricing" element={<PagePricing />} />
          <Route path="HowToHire" element={<PageHowToHire />} />
          <Route path="HowToWork" element={<PageHowToWork />} />
          <Route path="AboutUs" element={<PageAboutUs />} />
          <Route path="FAQ" element={<PageFAQ />} />
          <Route path="AskOurChatbot" element={<PageAskOurChatbot />} />
          <Route path="SubmitATicket" element={<PageSubmitATicket />} />
          <Route path="SupportUs" element={<PageSupportUs />} />
          <Route path="SendAFeedback" element={<PageSendAFeedback />} />
          <Route path="TermsOfService" element={<PageTermsOfService />} />
          <Route path="PrivacyPolicy" element={<PagePrivacyPolicy />} />
        </Route>

        {/* User Dashboard Routes - All wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path='/home' element={<Home />} />
            <Route path='/credits' element={<CreditShop />} />
            <Route path='/credits-subscriptions' element={<CreditShop />} />
            <Route path='/credits/checkout' element={<Checkout />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/profile/:id' element={<ProfileRoute />} />
            <Route path='/account-verification-status' element={<VerificationStatus />} />
            <Route path='/search/user/:query' element={<UserProfilesList />} />

          <Route path='/projects' element={<Projects />} />
            <Route path='/projects/select' element={<Projects_Selection />} />

          <Route path='/forums'>
            <Route index element={<Forums />} />
            <Route path='group/:id' element={<SelectedGroup />} />
            <Route path='discussion/:postId' element={<ExpandDiscussion />} />
          </Route>

          {/* Wildcard path ensures /inbox/direct and /inbox/marketplace match */}
          <Route path='/inbox/*' element={<InboxMain />} />

          <Route path='/teams'>
            <Route index element={<Teams />} />
            <Route path=':id/business-verification' element={<BusinessVerification />} />
            <Route path=':id/tasks/:contractId' element={<TeamTaskWorkspace />} />
            <Route path=':id' element={<SelectedTeam />} />
          </Route>

          <Route path='/assets'>
            <Route index element={<AssetsLibrary />} />
            <Route path=':assetId' element={<AssetDetails />} />
          </Route>

          {/* Reworked Job Market Sub-Routes */}
          <Route path='/jobs' element={<JobMain />}>
            <Route index element={<Navigate to="/jobs/postings" replace />} />
            <Route path='postings' element={<JobPostingPage />} />
            <Route path='postings/:id' element={<JobPostingPage />} />
            <Route path='saved-posts' element={<JobSavesPage />} />
            <Route path='saved-posts/:id' element={<JobSavesPage />} />
            <Route path='my-job-post' element={<JobMyPostPage />} />
            <Route path='my-job-post/:id' element={<JobMyPostPage />} />
          </Route>

          {/* Proposals Layout & Sub-Routes */}
          <Route path='/jobs/proposals' element={<ProposalsMain />}>
            <Route index element={<ProposalsSelectJobPage />} />
            <Route path='incoming/:jobPostId' element={<ProposalsIncomingPage />} />
            <Route path='sent' element={<ProposalsSentPage />} />
          </Route>

          {/* Standalone Creation, Edit & View Details Pages */}
          <Route path='/jobs/create' element={<JobCreatePostPage />} />
          <Route path='/jobs/edit/:id' element={<JobEditPostPage />} />
          <Route path='/jobs/:id/make-proposal' element={<ProposalsCreatePage />} />
          <Route path='/jobs/proposals/edit/:proposalId' element={<ProposalsEditPage />} />
          <Route path='/jobs/proposals/received/:proposalId' element={<ProposalsViewDetailsAsAuthor />} />
          <Route path='/jobs/proposals/sent/:proposalId' element={<ProposalsViewDetailsAsApplicant />} />
          <Route path='/jobs/proposals/sent/:proposalId/offer/:contractId' element={<ProposalsViewDetailsAsApplicant />} />

          {/* Gigs Layout & Sub-Routes */}
          <Route path='/gigs' element={<GigMain />}>
            <Route index element={<Navigate to="/gigs/services" replace />} />
            <Route path='services' element={<GigServicesPage />} />
            <Route path='services/:id' element={<GigServicesPage />} />
            <Route path='saved-services' element={<GigSavesPage />} />
            <Route path='saved-services/:id' element={<GigSavesPage />} />
            <Route path='my-services' element={<GigMyPostPage />} />
            <Route path='my-services/:id' element={<GigMyPostPage />} />
          </Route>
          <Route path='/gigs/orders' element={<OrdersMain />}>
            <Route index element={<OrdersSelectGigPage />} />
            <Route path='incoming/:gigId' element={<IncomingOrders />} />
            <Route path='sent' element={<SentOrders />} />
          </Route>
          <Route path='/gigs/orders/incoming/:gigId/order/:orderId' element={<IncomingOrderDetail />} />
          <Route path='/gigs/orders/sent/:orderId' element={<SentOrderDetail />} />
          <Route path='/gigs/create' element={<GigCreatePage />} />
          <Route path='/gigs/edit/:id' element={<GigEditPage />} />
          <Route path='/gigs/services/:id/page' element={<GigFullPage />} />
          <Route path='/gigs/services/:id/order' element={<GigOrderPage />} />
          <Route path='/verification' element={<Verification />} />
          <Route path='/orders' element={<SectionPlaceholder title='INCOMING ORDERS' />} />
          <Route path='/my-orders' element={<SectionPlaceholder title='MY ORDERS' />} />
          <Route path='/terms-of-services' element={<TosMain />} />
          <Route path='/contracts' element={<Contracts />} />
          <Route path='/contracts/:id' element={<Contracts />} />
          <Route path='/dashboard' element={<DashboardMain />} />
          <Route path='/dashboard/tasks' element={<DashboardMain />} />
          <Route path='/dashboard/review' element={<DashboardMain />} />
          <Route path='/dashboard/archived' element={<DashboardMain />} />
          <Route path='/dashboard/tasks/:id' element={<DashboardTaskDetail />} />
          <Route path='/dashboard/review/:id' element={<DashboardTaskDetail />} />
          <Route path='/transactions' element={<TransactionHistoryMain />} />
          <Route path='/notifications' element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route element={<StaffMiddleware />}>
        <Route path='/staff' element={<StaffPortalLayout />}>
          <Route path='dashboard' element={<StaffDashboard />} />
        </Route>

        <Route path='/admin' element={<AdminLayout />}>
          <Route path='dashboard' element={<AdminDashboard />} />
          <Route path='user-team' element={<UserTeamPage />} />
          <Route path='user-team/teams' element={<Navigate to="/admin/user-team?tab=teams" replace />} />
          <Route path='user-team/users' element={<Navigate to="/admin/user-team?tab=users" replace />} />
          <Route path='credit-economy' element={<CreditEconomyPage />} />
          <Route path='moderation' element={<ModerationPage />} />
          <Route path='analytics' element={<AnalyticsPage />} />
          <Route path='ticket-management' element={<TicketManagementPage />} />
          <Route path='system-settings' element={<SystemSettingsPage />} />
        </Route>

        {/* Moderator Routes */}
        <Route path='/moderator/forum' element={<ForumModeratorLayout />}>
          <Route index element={<ForumModeratorDashboard />} />
          <Route path='forum-discussion' element={<ForumDiscussion />} />
          <Route path='ticket-management' element={<ForumTicketManagement />} />
          <Route path='disputes' element={<ForumDisputes />} />
          <Route path='reports' element={<ForumReports />} />
          <Route path='user-team' element={<ForumUserTeam />} />
        </Route>

        <Route path='/moderator/marketplace' element={<MarketplaceModeratorLayout />}>
          <Route index element={<MarketplaceModeratorDashboard />} />
          <Route path='marketplace-control' element={<MarketplaceControl />} />
          <Route path='ticket-management' element={<MarketplaceTicketManagement />} />
          <Route path='disputes' element={<MarketplaceDisputes />} />
          <Route path='reports' element={<MarketplaceReports />} />
          <Route path='user-team' element={<MarketplaceUserTeam />} />
        </Route>

        <Route path='/moderator/support' element={<SupportModeratorLayout />}>
          <Route index element={<SupportModeratorDashboard />} />
          <Route path='ticket-management' element={<SupportTicketManagement />} />
          <Route path='disputes' element={<SupportDisputes />} />
          <Route path='reports' element={<SupportReports />} />
          <Route path='user-team' element={<SupportUserTeam />} />
        </Route>

        <Route path='/moderator/jobs' element={<JobsModeratorLayout />}>
          <Route index element={<JobsModeratorDashboard />} />
          <Route path='control' element={<JobsGigsControl />} />
          <Route path='ticket-management' element={<JobsTicketManagement />} />
          <Route path='disputes' element={<JobsDisputes />} />
          <Route path='reports' element={<JobsReports />} />
          <Route path='user-team' element={<JobsUserTeam />} />
        </Route>
      </Route>
      </Routes>
      </Suspense>
    </>
  )
}

export default App