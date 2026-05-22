import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useRatings } from '../hooks/useRatings'
import RatingCard from '../components/ratings/RatingCard'
import { supabase } from '../lib/supabase'
import type { Rating, MediaCategory, Profile } from '../types'

const FILTER_OPTIONS: { value: 'all' | MediaCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv-season', label: 'TV Seasons' },
  { value: 'book', label: 'Books' },
  { value: 'game', label: 'Games' },
  { value: 'album', label: 'Albums' },
]

export default function ExplorePage() {
  const { fetchPublicRatings } = useRatings()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filter, setFilter] = useState<'all' | MediaCategory>('all')
  const [loading, setLoading] = useState(true)

  // User search state
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<Profile[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchPublicRatings().then(data => {
      setRatings(data)
      setLoading(false)
    })
  }, [fetchPublicRatings])

  // Debounced username search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!userQuery.trim()) { setUserResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setUserSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .ilike('username', `%${userQuery.trim()}%`)
        .not('username', 'is', null)
        .limit(8)
      setUserResults((data ?? []) as Profile[])
      setUserSearching(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [userQuery])

  const filtered = filter === 'all' ? ratings : ratings.filter(r => r.category === filter)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Explore</h1>
        <p className="text-slate-400">Search for users or browse recent ratings.</p>
      </div>

      {/* User search */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Find a user</h2>
        <div className="relative max-w-sm">
          <input
            type="text"
            value={userQuery}
            onChange={e => setUserQuery(e.target.value)}
            placeholder="Search by username…"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm pr-10"
          />
          {userSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">…</span>
          )}
        </div>

        {userResults.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {userResults.map(u => (
              <Link
                key={u.id}
                to={`/user/${u.username}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/40 rounded-full transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-purple-600/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                  {u.username?.[0]?.toUpperCase()}
                </span>
                <span className="text-sm text-slate-300">@{u.username}</span>
              </Link>
            ))}
          </div>
        )}

        {userQuery.trim() && !userSearching && userResults.length === 0 && (
          <p className="mt-3 text-sm text-slate-600">No users found for "{userQuery}".</p>
        )}
      </div>

      {/* Recent ratings */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent ratings</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filter === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <p>No ratings yet. Be the first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(r => (
              <RatingCard key={r.id} rating={r} showUser />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
