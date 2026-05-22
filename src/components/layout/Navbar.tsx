import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname, hash } = useLocation()
  const current = hash.replace('#', '') || '/'
  const active = current === to || (to !== '/' && current.startsWith(to))
  return (
    <Link
      to={to}
      className={`text-sm transition-colors px-1 py-0.5 ${
        active ? 'text-white font-medium' : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="border-b border-white/[0.06] bg-[#0a0a0f]/70 backdrop-blur-xl sticky top-0 z-50">
      {/* Subtle top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            MediaRater
          </span>
        </Link>

        <div className="flex-1" />

        {/* Nav links */}
        <div className="flex items-center gap-4">
          <NavLink to="/explore">Explore</NavLink>

          {user ? (
            <>
              <NavLink to="/my-ratings">My Ratings</NavLink>
              <Link
                to={profile?.username ? `/user/${profile.username}` : '/setup-profile'}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {profile?.username ?? 'Set up profile'}
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-all"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/auth">Sign in</NavLink>
              <Link
                to="/auth?mode=signup"
                className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-medium transition-all shadow-md shadow-purple-500/20 hover:shadow-purple-500/40"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
