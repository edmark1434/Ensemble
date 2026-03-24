import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'

function App() {

  return (
    <Routes>
        <Route path="/" element={<><h1>Welcome to the App</h1></>} />
    </Routes>
  )
}

export default App
