import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="text-lg font-bold tracking-tight text-white hover:text-purple-400 transition-colors">
          MediaRater
        </Link>

        <div className="flex-1" />

        <Link
          to="/explore"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Explore
        </Link>

        {user ? (
          <>
            <Link
              to="/my-ratings"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              My Ratings
            </Link>
            {profile?.username && (
              <Link
                to={`/user/${profile.username}`}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {profile.username}
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/auth"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="text-sm px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
