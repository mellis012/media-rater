import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Handles Supabase email-verification redirects.
 *
 * After a user clicks the confirmation link, Supabase redirects to:
 *   https://mellis012.github.io/media-rater/#access_token=xxx&type=signup
 *
 * HashRouter sees "access_token=xxx&type=signup" as an unknown path and
 * renders nothing. This catch-all page is matched instead, shows a friendly
 * message, waits for Supabase to finish processing the token, then sends
 * the user home.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase JS v2 auto-detects session tokens in window.location.hash
    // (detectSessionInUrl is true by default). Listen for the resulting event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        navigate('/', { replace: true })
      }
    })

    // Fallback: if the event never fires (e.g. link already used), redirect anyway
    const fallback = setTimeout(() => navigate('/', { replace: true }), 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
      <p className="text-slate-300 font-medium">Verifying your email…</p>
      <p className="text-slate-600 text-sm">You'll be redirected in a moment.</p>
    </div>
  )
}
