import { HashRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import SearchPage from './pages/SearchPage'
import MyRatingsPage from './pages/MyRatingsPage'
import ExplorePage from './pages/ExplorePage'
import UserProfilePage from './pages/UserProfilePage'
import AuthPage from './pages/AuthPage'
import SetupProfilePage from './pages/SetupProfilePage'
import AuthCallbackPage from './pages/AuthCallbackPage'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/my-ratings" element={<MyRatingsPage />} />
            <Route path="/user/:username" element={<UserProfilePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/setup-profile" element={<SetupProfilePage />} />
            {/* Catch-all: handles Supabase email-verification redirects
                which put tokens in the hash (#access_token=…) instead of a path */}
            <Route path="*" element={<AuthCallbackPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
