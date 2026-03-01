import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

// Apply saved theme before first paint to avoid flash
const savedTheme = localStorage.getItem('theme') || 'phosphene'
document.documentElement.setAttribute('data-theme', savedTheme)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding.jsx'
import Session from './pages/Session.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/session" element={<Session />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
