import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import SignupPage from './pages/auth/Signuppage'
import EmailVerification from './pages/EmailVerification'
import Layout from './pages/user/Layout'
import Dashboard from './pages/user/Dashboard'
import Forums from './pages/user/Forums'
import SectionPlaceholder from './pages/user/SectionPlaceholder'
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
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<h1>404 Not Found</h1>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/verify-email' element={<EmailVerification />} />
        <Route path='/dashboard' element={<Layout />} >
          <Route index element={<Dashboard />} />
          <Route path='forums' element={<Forums />} />
          <Route path='projects' element={<SectionPlaceholder title='PROJECTS' />} />
          <Route path='teams' element={<SectionPlaceholder title='TEAMS' />} />
          <Route path='assets' element={<SectionPlaceholder title='ASSET LIBRARY' />} />
          <Route path='jobs' element={<SectionPlaceholder title='JOB POSTING' />} />
          <Route path='proposals/incoming' element={<SectionPlaceholder title='INCOMING PROPOSALS' />} />
          <Route path='proposals/mine' element={<SectionPlaceholder title='MY PROPOSALS' />} />
          <Route path='gigs' element={<SectionPlaceholder title='GIG POSTING' />} />
          <Route path='requests/incoming' element={<SectionPlaceholder title='INCOMING REQUESTS' />} />
          <Route path='requests/mine' element={<SectionPlaceholder title='MY REQUESTS' />} />
          <Route path='contracts' element={<SectionPlaceholder title='MY CONTRACTS' />} />
          <Route path='transactions' element={<SectionPlaceholder title='TRANSACTION HISTORY' />} />
          <Route path='inbox' element={<SectionPlaceholder title='INBOX' />} />
        </Route>
        <Route path='/admin' element={<AdminLayout />} >
          <Route index element={<AdminDashboard />} />
          <Route path='user-team' element={<AdminSectionPlaceholder title='USER & TEAM' />} />
          <Route path='credit-economy' element={<AdminSectionPlaceholder title='CREDIT & ECONOMY' />} />
          <Route path='moderation' element={<AdminSectionPlaceholder title='MODERATION' />} />
          <Route path='analytics' element={<AdminSectionPlaceholder title='ANALYTICS' />} />
          <Route path='ticket-management' element={<AdminSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='system-settings' element={<AdminSectionPlaceholder title='SYSTEM SETTINGS' />} />
        </Route>
        <Route path='/moderator/dispute' element={<DisputeModeratorLayout />} >
          <Route index element={<ModeratorSectionPlaceholder title='DISPUTE MODERATOR' />} />
          <Route path='dispute-management' element={<ModeratorSectionPlaceholder title='DISPUTE MANAGEMENT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>
        <Route path='/moderator/forum' element={<ForumModeratorLayout />} >
          <Route index element={<ModeratorSectionPlaceholder title='FORUM MODERATOR' />} />
          <Route path='forum-management' element={<ModeratorSectionPlaceholder title='FORUM MANAGEMENT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>
        <Route path='/moderator/marketplace' element={<MarketplaceModeratorLayout />} >
          <Route index element={<ModeratorSectionPlaceholder title='MARKETPLACE MODERATOR' />} />
          <Route path='marketplace-control' element={<ModeratorSectionPlaceholder title='MARKETPLACE CONTROL' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
        </Route>
        <Route path='/moderator/support' element={<SupportModeratorLayout />} >
          <Route index element={<ModeratorSectionPlaceholder title='SUPPORT MODERATOR' />} />
          <Route path='chat-support' element={<ModeratorSectionPlaceholder title='CHAT SUPPORT' />} />
          <Route path='ticket-management' element={<ModeratorSectionPlaceholder title='TICKET MANAGEMENT' />} />
          <Route path='user-team' element={<ModeratorSectionPlaceholder title='USER & TEAM' />} />
        </Route>
    </Routes>
  )
}

export default App
