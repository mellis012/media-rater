import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRatings } from '../hooks/useRatings'
import RatingCard from '../components/ratings/RatingCard'
import type { Rating, MediaCategory } from '../types'

const FILTER_OPTIONS: { value: 'all' | MediaCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv-season', label: 'TV Seasons' },
  { value: 'book', label: 'Books' },
  { value: 'game', label: 'Games' },
  { value: 'album', label: 'Albums' },
]

export default function MyRatingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { fetchUserRatings } = useRatings()
  const navigate = useNavigate()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filter, setFilter] = useState<'all' | MediaCategory>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    fetchUserRatings(user.id).then(data => {
      setRatings(data)
      setLoading(false)
    })
  }, [user, fetchUserRatings])

  const filtered = filter === 'all' ? ratings : ratings.filter(r => r.category === filter)
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '—'

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">My Ratings</h1>
          <p className="text-slate-400">{ratings.length} rated · avg {avg}/10</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
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

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-slate-600">
          <p>No ratings here yet. <a href="/media-rater/" className="text-purple-400 hover:text-purple-300">Search for something</a> to rate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(r => (
            <RatingCard key={r.id} rating={r} />
          ))}
        </div>
      )}
    </div>
  )
}
