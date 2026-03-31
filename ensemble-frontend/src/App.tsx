import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import SignupPage from './pages/auth/Signuppage'
import EmailVerification from './pages/EmailVerification'
import Home from './pages/Home'
import VideoEditor from './pages/videoediting/VideoEditor'
import './App.css'

function App() {

  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<h1>404 Not Found</h1>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/verify-email' element={<EmailVerification />} />
        <Route path='/dashboard' element={<Home />} />
        <Route path='/editor' element={<VideoEditor />} />
    </Routes>
  )
}

export default App
