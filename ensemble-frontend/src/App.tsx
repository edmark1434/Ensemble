import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import './App.css'

function App() {

  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path='*' element={<h1>404 Not Found</h1>} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route path='/dashboard' element={<h1>Dashboard</h1>} />
    </Routes>
  )
}

export default App
