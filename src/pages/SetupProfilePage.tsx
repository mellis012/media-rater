import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function SetupProfilePage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // If they already have a profile, send them there
  useEffect(() => {
    if (!loading && !user) navigate('/auth')
    if (!loading && profile?.username) navigate(`/user/${profile.username}`)
  }, [user, profile, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase
        .from('profiles')
        .insert({ id: user!.id, username })
      if (err) {
        if (err.code === '23505') setError('That username is taken. Try another.')
        else setError(err.message)
        return
      }
      // Reload so useAuth picks up the new profile
      window.location.hash = `/user/${username}`
      window.location.reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/5 border border-white/10 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Choose a username</h1>
          <p className="text-slate-400 text-sm mb-6">
            This is your public handle. Letters, numbers, and underscores only.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="e.g. mellis012"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save username'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
