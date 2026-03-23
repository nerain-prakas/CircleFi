import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Auction from './pages/Auction'
import Governance from './pages/Governance'
import Profile from './pages/Profile'
import Groups from './pages/Groups'
import Assistant from './pages/Assistant'
import { WalletProvider } from './context/WalletContext'
import './index.css'

function App() {
  return (
    <WalletProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="bg-black min-h-screen text-white overflow-x-hidden">
          <Routes>
            {/* Landing page - no navbar */}
            <Route path="/" element={<Landing />} />

            {/* App pages - with navbar */}
            <Route
              path="/*"
              element={
                <>
                  <Navbar />
                  <main className="pt-20">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/auction" element={<Auction />} />
                      <Route path="/governance" element={<Governance />} />
                      <Route path="/assistant" element={<Assistant />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default App