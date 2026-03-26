import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/Loginpage'
import SignupPage from './pages/auth/Signuppage'
import './App.css'

function App() {

  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<h1>404 Not Found</h1>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
    </Routes>
  )
}

export default App
