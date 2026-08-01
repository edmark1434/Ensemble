import { Routes, Route, Navigate } from 'react-router-dom'
import {ToastProvider} from "@/components/utility/toast_provider.tsx";
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import StaffLoginPage from './pages/auth/StaffLoginPage'
import SignupPage from './pages/auth/Signuppage'
import EmailVerification from './pages/EmailVerification'

import NotFound from "@/pages/user/0_misc/NotFound.tsx";

import ResetPasswordPage from "@/pages/auth/ResetPasswordPage.tsx";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage.tsx";

import CreditShop from "@/pages/user/13_creditsshop/CreditsShop.tsx";
import Checkout from "@/pages/payment/checkout.tsx";
import Profile from "@/pages/user/7_profile/Profile.tsx";
import UserSettings from "@/components/nav/Settings/user_settings.tsx";

import Layout from './components/ui/Layout.tsx'

import Home from '@/pages/user/1_home/Home.tsx'

import Projects from "@/pages/user/2_projects/Projects.tsx"
import Projects_Selection from "@/pages/user/2_projects/Projects_Selection.tsx";

import Teams from "@/pages/user/3_teams/Teams.tsx";
import SelectedTeam from "@/pages/user/3_teams/SelectedTeam.tsx";

import Forums from './pages/user/4_forums/Forums.tsx'
import SelectedGroup from "@/pages/user/4_forums/SelectedGroup.tsx";
import ExpandDiscussion from "@/pages/user/4_forums/ExpandDiscussion.tsx";

// Updated Inbox Root Import
import InboxMain from "@/components/ui/inbox/inbox_main.tsx";

import SectionPlaceholder from '@/pages/user/0_misc/SectionPlaceholder.tsx'

// Job Market Core Imports
import JobMain from "@/pages/user/6_job_market/job_main.tsx";
import JobPostingPage from "@/pages/user/6_job_market/job_pages/job_posting_page.tsx";
import JobSavesPage from "@/pages/user/6_job_market/job_pages/job_saves_page.tsx";
import JobMyPostPage from "@/pages/user/6_job_market/job_pages/job_mypost_page.tsx";
import JobCreatePostPage from "@/pages/user/6_job_market/job_pages/job_createpost_page.tsx";
import JobEditPostPage from "@/pages/user/6_job_market/job_pages/job_editpost_page.tsx";

// Job Proposals Imports
import ProposalsMain from "@/pages/user/6_job_market/job_proposals/proposals_main.tsx";
import ProposalsSelectJobPage from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_select_job_page.tsx";
import ProposalsIncomingPage from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_incoming_page.tsx";
import ProposalsSentPage from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_sent_page.tsx";
import ProposalsCreatePage from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_create_page.tsx";
import ProposalsEditPage from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_edit_page.tsx";
import ProposalsViewDetailsAsApplicant from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_view_details_as_applicant";
import ProposalsViewDetailsAsAuthor from "@/pages/user/6_job_market/job_proposals/proposals_pages/proposals_view_details_as_author";

import GigMarketplace from "@/pages/user/7_gigs/Gig_Posting/main.tsx";
import {CreateGigWizard} from "@/pages/user/7_gigs/Gig_Posting/CreateGigWizard.tsx";

import Verification from "@/pages/user/9_verification/Verification.tsx";

import TransactionHistoryMain from "@/pages/user/11_transactionhistory/main.tsx";
import TosMain from "@/pages/user/terms_of_service/tos_main.tsx";
import Contracts from "@/pages/user/contracts/contracts.tsx";

import UserProfilesList from "@/components/nav/user_profiles_list.tsx";
import {VerificationStatus} from "@/pages/user/7_profile/VerificationStatus/VerificationStatus.tsx";

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import UserTeamPage from './pages/admin/userTeam/UserTeamPage'
import CreditEconomyPage from './pages/admin/creditEconomy/CreditEconomyPage'
import ModerationPage from './pages/admin/moderation/ModerationPage'
import AnalyticsPage from './pages/admin/analytics/AnalyticsPage'
import TicketManagementPage from './pages/admin/ticketManagement/TicketManagementPage'
import SystemSettingsPage from './pages/admin/systemSettings/SystemSettingsPage'
import StaffPortalLayout from './pages/staff/StaffPortalLayout'
import StaffDashboard from './pages/staff/StaffDashboard'

// Account Setup Routes
import VerifyEmail from "@/pages/setup_account/00_VerifyEmail.tsx";
import PersonalDetails from "@/pages/setup_account/01_PersonalDetails.tsx";
import UploadImage from "@/pages/setup_account/02_UploadImage.tsx";
import Survey from "@/pages/setup_account/04_Survey.tsx";

import ForumModeratorLayout from './pages/moderator/forum-moderator/Layout'
import ForumModeratorDashboard from './pages/moderator/forum-moderator/Dashboard'
import ForumDiscussion from './pages/moderator/forum-moderator/ForumDiscussion'
import ForumTicketManagement from './pages/moderator/forum-moderator/TicketManagement'
import ForumReports from './pages/moderator/forum-moderator/Reports'
import MarketplaceModeratorLayout from './pages/moderator/marketplace-moderator/Layout'
import MarketplaceModeratorDashboard from './pages/moderator/marketplace-moderator/Dashboard'
import MarketplaceControl from './pages/moderator/marketplace-moderator/MarketplaceControl'
import MarketplaceTicketManagement from './pages/moderator/marketplace-moderator/TicketManagement'
import MarketplaceReports from './pages/moderator/marketplace-moderator/Reports'
import SupportModeratorLayout from './pages/moderator/support-moderator/Layout'
import SupportModeratorDashboard from './pages/moderator/support-moderator/Dashboard'
import SupportTicketManagement from './pages/moderator/support-moderator/TicketManagement'
import SupportDisputes from './pages/moderator/support-moderator/Disputes'
import SupportUserTeam from './pages/moderator/support-moderator/UserTeam'
import SupportReports from './pages/moderator/support-moderator/Reports'
import JobsModeratorLayout from './pages/moderator/jobs-moderator/Layout'
import JobsModeratorDashboard from './pages/moderator/jobs-moderator/Dashboard'
import JobsGigsControl from './pages/moderator/jobs-moderator/JobsGigsControl'
import JobsTicketManagement from './pages/moderator/jobs-moderator/TicketManagement'
import JobsDisputes from './pages/moderator/jobs-moderator/Disputes'
import JobsReports from './pages/moderator/jobs-moderator/Reports'
import ModeratorSectionPlaceholder from './pages/moderator/SectionPlaceholder'
import RouteMiddleware from './lib/RouteMiddleware'
import StaffMiddleware from './lib/StaffMiddleware'

// Landing Dropdown Pages Imports
import PageAboutUs from "@/pages/landing/pages/page_AboutUs.tsx";
import PageAskOurChatbot from './pages/landing/pages/page_AskOurChatbot';
import PageFAQ from './pages/landing/pages/page_FAQ';
import PageHowToHire from './pages/landing/pages/page_HowToHire';
import PageHowToWork from './pages/landing/pages/page_HowToWork';
import PagePricing from './pages/landing/pages/page_Pricing';
import PagePrivacyPolicy from "@/pages/landing/pages/page_PrivacyPolicy.tsx";
import PageTermsOfService from "@/pages/landing/pages/page_TermsOfService.tsx";
import PageSendAFeedback from './pages/landing/pages/page_SendAFeedback';
import PageSubmitATicket from './pages/landing/pages/page_SubmitATicket';
import PageSupportUs from './pages/landing/pages/page_SupportUs';

import './App.css'

function App() {

  return (
    <>
      <ToastProvider />
      <Routes>
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/staff" element={<StaffLoginPage />} />

        <Route path="/setup">
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="personal-details" element={<PersonalDetails />} />
          <Route path="upload-image" element={<UploadImage />} />
          <Route path="survey" element={<Survey />} />
        </Route>

      <Route element={<RouteMiddleware />}>
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
            <Route path='/profile/:id?' element={<Profile />} />
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
            <Route path=':id' element={<SelectedTeam />} />
          </Route>

          <Route path='/assets' element={<SectionPlaceholder title='ASSET LIBRARY' />} />

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

          <Route path='/gigs'>
            <Route index element={<GigMarketplace />} />
            <Route path='create' element={<CreateGigWizard />} />
            <Route path=':id' element={<GigMarketplace />} />
          </Route>
          <Route path='/verification' element={<Verification />} />
          <Route path='/requests' element={<SectionPlaceholder title='INCOMING REQUESTS' />} />
          <Route path='/my-requests' element={<SectionPlaceholder title='MY REQUESTS' />} />
          <Route path='/terms-of-services' element={<TosMain />} />
          <Route path='/contracts' element={<Contracts />} />
          <Route path='/transactions' element={<TransactionHistoryMain />} />
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
          <Route path='reports' element={<ForumReports />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' subtitle='User account management is centralized in the Admin console.' />} />
        </Route>

        <Route path='/moderator/marketplace' element={<MarketplaceModeratorLayout />}>
          <Route index element={<MarketplaceModeratorDashboard />} />
          <Route path='marketplace-control' element={<MarketplaceControl />} />
          <Route path='ticket-management' element={<MarketplaceTicketManagement />} />
          <Route path='reports' element={<MarketplaceReports />} />
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
        </Route>
      </Route>
      </Routes>
    </>
  )
}

export default App