import { Routes, Route } from 'react-router-dom'
import {ToastProvider} from "@/components/utility/toast_provider.tsx";
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import SignupPage from './pages/auth/Signuppage'
import EmailVerification from './pages/EmailVerification'

import NotFound from "@/pages/user/0_config/NotFound.tsx";

import ResetPasswordPage from "@/pages/auth/ResetPasswordPage.tsx";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage.tsx";

import CreditShop from "@/pages/user/0_config/CreditsShop.tsx";

import Layout from './components/ui/Layout.tsx'

import Home from './pages/user/1_home/Home.tsx'

import Projects from "./pages/user/2_projects/Projects.tsx"
import Projects_Selection from "@/pages/user/2_projects/Projects_Selection.tsx";

import Teams from "@/pages/user/3_teams/Teams.tsx";
import SelectedTeam from "@/pages/user/3_teams/SelectedTeam.tsx";

import Forums from './pages/user/4_forums/Forums.tsx'
import SelectedGroup from "@/pages/user/4_forums/SelectedGroup.tsx";
import ExpandDiscussion from "@/pages/user/4_forums/ExpandDiscussion.tsx";

import SectionPlaceholder from './pages/user/0_config/SectionPlaceholder.tsx'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSectionPlaceholder from './pages/admin/AdminSectionPlaceholder'

import DisputeModeratorLayout from './pages/moderator/dispute-moderator/Layout'
import ForumModeratorLayout from './pages/moderator/forum-moderator/Layout'
import MarketplaceModeratorLayout from './pages/moderator/marketplace-moderator/Layout'
import SupportModeratorLayout from './pages/moderator/support-moderator/Layout'
import ModeratorSectionPlaceholder from './pages/moderator/SectionPlaceholder'
import './App.css'

function App() {

  return (
    <>
      <ToastProvider />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<NotFound/>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/verify-email' element={<EmailVerification />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* User Dashboard Routes - All wrapped in Layout */}
        <Route element={<Layout />}>
          <Route path='/home' element={<Home />} />
            <Route path='/credits' element={<CreditShop />} />

          <Route path='/projects' element={<Projects />} />
            <Route path='/projects/select' element={<Projects_Selection />} />

          <Route path='/forums'>
            <Route index element={<Forums />} />
            <Route path='group/:id' element={<SelectedGroup />} />
            <Route path='discussion/:postId' element={<ExpandDiscussion />} />
          </Route>

          {/* Teams Routes - Nested structure */}
          <Route path='/teams'>
            <Route index element={<Teams />} />
            <Route path=':id' element={<SelectedTeam />} />
          </Route>

          <Route path='/assets' element={<SectionPlaceholder title='ASSET LIBRARY' />} />
          <Route path='/jobs' element={<SectionPlaceholder title='JOB POSTING' />} />
          <Route path='/proposals' element={<SectionPlaceholder title='INCOMING PROPOSALS' />} />
          <Route path='/my-proposals' element={<SectionPlaceholder title='MY PROPOSALS' />} />
          <Route path='/gigs' element={<SectionPlaceholder title='GIG POSTING' />} />
          <Route path='/requests' element={<SectionPlaceholder title='INCOMING REQUESTS' />} />
          <Route path='/my-requests' element={<SectionPlaceholder title='MY REQUESTS' />} />
          <Route path='/contracts' element={<SectionPlaceholder title='MY CONTRACTS' />} />
          <Route path='/transactions' element={<SectionPlaceholder title='TRANSACTION HISTORY' />} />
          <Route path='/inbox' element={<SectionPlaceholder title='INBOX' />} />
        </Route>

        {/* Admin Routes */}
        <Route path='/admin' element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path='user-team' element={<AdminSectionPlaceholder title='USER & TEAM' />} />
          <Route path='credit-economy' element={<AdminSectionPlaceholder title='CREDIT & ECONOMY' />} />
          <Route path='moderation' element={<AdminSectionPlaceholder title='MODERATION' />} />
          <Route path='analytics' element={<AdminSectionPlaceholder title='ANALYTICS' />} />
          <Route path='ticket-management' element={<AdminSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='system-settings' element={<AdminSectionPlaceholder title='SYSTEM SETTINGS' />} />
        </Route>

        {/* Moderator Routes */}
        <Route path='/moderator/dispute' element={<DisputeModeratorLayout />}>
          <Route index element={<ModeratorSectionPlaceholder title='DISPUTE MODERATOR' />} />
          <Route path='dispute-management' element={<ModeratorSectionPlaceholder title='DISPUTE MANAGEMENT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>

        <Route path='/moderator/forum' element={<ForumModeratorLayout />}>
          <Route index element={<ModeratorSectionPlaceholder title='FORUM MODERATOR' />} />
          <Route path='forum-management' element={<ModeratorSectionPlaceholder title='FORUM MANAGEMENT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>

        <Route path='/moderator/marketplace' element={<MarketplaceModeratorLayout />}>
          <Route index element={<ModeratorSectionPlaceholder title='MARKETPLACE MODERATOR' />} />
          <Route path='marketplace-control' element={<ModeratorSectionPlaceholder title='MARKETPLACE CONTROL' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
        </Route>

        <Route path='/moderator/support' element={<SupportModeratorLayout />}>
          <Route index element={<ModeratorSectionPlaceholder title='SUPPORT MODERATOR' />} />
          <Route path='chat-support' element={<ModeratorSectionPlaceholder title='CHAT SUPPORT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>
      </Routes>
    </>
  )
}

export default App