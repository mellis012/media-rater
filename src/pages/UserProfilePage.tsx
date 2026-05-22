import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { fetchPublicRatings } = useRatings()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filter, setFilter] = useState<'all' | MediaCategory>('all')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    fetchPublicRatings(username).then(data => {
      if (data.length === 0) setNotFound(true)
      setRatings(data)
      setLoading(false)
    })
  }, [username, fetchPublicRatings])

  const filtered = filter === 'all' ? ratings : ratings.filter(r => r.category === filter)
  const avg = ratings.length ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : '—'

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
  }

  if (notFound && ratings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>User not found or no ratings yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-lg">
            {username?.[0]?.toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold text-white">@{username}</h1>
        </div>
        <p className="text-slate-400 ml-13">{ratings.length} rated · avg {avg}/10</p>
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
          <p>No ratings in this category yet.</p>
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
