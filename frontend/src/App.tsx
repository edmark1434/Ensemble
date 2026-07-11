import { Routes, Route, Navigate } from 'react-router-dom'
import {ToastProvider} from "@/components/utility/toast_provider.tsx";
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import StaffLoginPage from './pages/auth/StaffLoginPage'
import SignupPage from './pages/auth/Signuppage'
import EmailVerification from './pages/EmailVerification'

import NotFound from "@/pages/user/0_config/NotFound.tsx";

import ResetPasswordPage from "@/pages/auth/ResetPasswordPage.tsx";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage.tsx";

import CreditShop from "@/pages/user/0_config/CreditsShop.tsx";
import Checkout from "@/pages/payment/checkout.tsx";
import Profile from "@/pages/user/7_profile/Profile.tsx";

import Layout from './components/ui/Layout.tsx'

import Home from './pages/user/1_home/Home.tsx'

import Projects from "./pages/user/2_projects/Projects.tsx"
import Projects_Selection from "@/pages/user/2_projects/Projects_Selection.tsx";

import Teams from "@/pages/user/3_teams/Teams.tsx";
import SelectedTeam from "@/pages/user/3_teams/SelectedTeam.tsx";

import Forums from './pages/user/4_forums/Forums.tsx'
import SelectedGroup from "@/pages/user/4_forums/SelectedGroup.tsx";
import ExpandDiscussion from "@/pages/user/4_forums/ExpandDiscussion.tsx";

import Inbox from "@/pages/user/10_inbox/Main.tsx";

import SectionPlaceholder from './pages/user/0_config/SectionPlaceholder.tsx'

import JobPostingMain from "@/pages/user/6_jobs/Job_Posting/main.tsx";
import {CreateJobWizard} from "@/pages/user/6_jobs/Job_Posting/CreateJobWizard.tsx";

import GigMarketplace from "@/pages/user/7_gigs/Gig_Posting/main.tsx";
import {CreateGigWizard} from "@/pages/user/7_gigs/Gig_Posting/CreateGigWizard.tsx";

import Verification from "@/pages/user/9_verification/Verification.tsx";

import TransactionHistoryMain from "@/pages/user/11_transactionhistory/main.tsx";

import UserProfilesList from "@/components/nav/user_profiles_list.tsx";
import {VerificationStatus} from "@/pages/user/7_profile/VerificationStatus/VerificationStatus.tsx";

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
// import AdminSectionPlaceholder from './pages/admin/AdminSectionPlaceholder'
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
import MarketplaceModeratorLayout from './pages/moderator/marketplace-moderator/Layout'
import MarketplaceModeratorDashboard from './pages/moderator/marketplace-moderator/Dashboard'
import MarketplaceControl from './pages/moderator/marketplace-moderator/MarketplaceControl'
import MarketplaceTicketManagement from './pages/moderator/marketplace-moderator/TicketManagement'
import MarketplaceRestrictions from './pages/moderator/marketplace-moderator/Restrictions'
import SupportModeratorLayout from './pages/moderator/support-moderator/Layout'
import ModeratorSectionPlaceholder from './pages/moderator/SectionPlaceholder'
import RouteMiddleware from './lib/RouteMiddleware'
import StaffMiddleware from './lib/StaffMiddleware'

// ─── Landing Dropdown Pages Imports ──────────────────────────────────────────
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
      {/* Staff / admin portal logins (public; production: admin.ensemble / staff.ensemble) */}
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


        {/* Modular Public Dropdown Landing Pages */}
        {/* Nested structural grouping under the /landing prefix path */}
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

          <Route path='/inbox' element={<Inbox />} />

          {/* Teams Routes - Nested structure */}
          <Route path='/teams'>
            <Route index element={<Teams />} />
            <Route path=':id' element={<SelectedTeam />} />
          </Route>

          <Route path='/assets' element={<SectionPlaceholder title='ASSET LIBRARY' />} />

          <Route path='/jobs'>
            <Route index element={<JobPostingMain />} />
            <Route path='create' element={<CreateJobWizard />} />
            <Route path=':id' element={<JobPostingMain />} />
          </Route>
          <Route path='/gigs'>
            <Route index element={<GigMarketplace />} />
            <Route path='create' element={<CreateGigWizard />} />
            <Route path=':id' element={<GigMarketplace />} />
          </Route>
          <Route path='/verification' element={<Verification />} />
          <Route path='/proposals' element={<SectionPlaceholder title='INCOMING PROPOSALS' />} />
          <Route path='/my-proposals' element={<SectionPlaceholder title='MY PROPOSALS' />} />
          <Route path='/requests' element={<SectionPlaceholder title='INCOMING REQUESTS' />} />
          <Route path='/my-requests' element={<SectionPlaceholder title='MY REQUESTS' />} />
          <Route path='/contracts' element={<SectionPlaceholder title='MY CONTRACTS' />} />
          <Route path='/inbox' element={<Inbox />} />
          <Route path='/transactions' element={<TransactionHistoryMain />} />
        </Route>
      </Route>

      <Route element={<StaffMiddleware />}>

        {/* Staff portal dashboard — login is /staff */}
        <Route path='/staff' element={<StaffPortalLayout />}>
          <Route path='dashboard' element={<StaffDashboard />} />
        </Route>

        {/* Admin Routes — dashboard lives under /admin/dashboard; login is /admin */}
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
          <Route index element={<ModeratorSectionPlaceholder title='FORUM MODERATOR' />} />
          <Route path='forum-management' element={<ModeratorSectionPlaceholder title='FORUM MANAGEMENT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>

        <Route path='/moderator/marketplace' element={<MarketplaceModeratorLayout />}>
          <Route index element={<MarketplaceModeratorDashboard />} />
          <Route path='marketplace-control' element={<MarketplaceControl />} />
          <Route path='ticket-management' element={<MarketplaceTicketManagement />} />
          <Route path='restrictions' element={<MarketplaceRestrictions />} />
        </Route>

        <Route path='/moderator/support' element={<SupportModeratorLayout />}>
          <Route index element={<ModeratorSectionPlaceholder title='SUPPORT MODERATOR' />} />
          <Route path='chat-support' element={<ModeratorSectionPlaceholder title='CHAT SUPPORT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>
      </Route>
      </Routes>
    </>
  )
}

export default App