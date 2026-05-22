import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useRatings } from '../hooks/useRatings'
import RatingListRow from '../components/ratings/RatingListRow'
import type { Rating, MediaCategory } from '../types'

const FILTER_OPTIONS: { value: 'all' | MediaCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv-season', label: 'TV Seasons' },
  { value: 'book', label: 'Books' },
  { value: 'game', label: 'Games' },
  { value: 'album', label: 'Albums' },
]

type SortKey = 'rating_desc' | 'rating_asc' | 'title_asc' | 'title_desc' | 'date_desc' | 'date_asc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating_desc', label: 'Rating: High → Low' },
  { value: 'rating_asc',  label: 'Rating: Low → High' },
  { value: 'title_asc',   label: 'Title: A → Z' },
  { value: 'title_desc',  label: 'Title: Z → A' },
  { value: 'date_desc',   label: 'Date Added: Newest' },
  { value: 'date_asc',    label: 'Date Added: Oldest' },
]

function sortRatings(ratings: Rating[], sort: SortKey): Rating[] {
  return [...ratings].sort((a, b) => {
    switch (sort) {
      case 'rating_desc': return b.rating - a.rating
      case 'rating_asc':  return a.rating - b.rating
      case 'title_asc':   return a.title.localeCompare(b.title)
      case 'title_desc':  return b.title.localeCompare(a.title)
      case 'date_desc':   return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date_asc':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
  })
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { fetchPublicRatings } = useRatings()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filter, setFilter] = useState<'all' | MediaCategory>('all')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setFilter('all')
    setSort('date_desc')
    fetchPublicRatings(username).then(data => {
      setNotFound(data.length === 0)
      setRatings(data)
      setLoading(false)
    })
  }, [username, fetchPublicRatings])

  const filtered = useMemo(
    () => filter === 'all' ? ratings : ratings.filter(r => r.category === filter),
    [ratings, filter]
  )
  const displayed = useMemo(() => sortRatings(filtered, sort), [filtered, sort])

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : '—'

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-slate-500">User not found or no ratings yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 border border-purple-500/30 flex items-center justify-center text-purple-200 font-bold text-xl shadow-lg shadow-purple-500/10 shrink-0">
            {username?.[0]?.toUpperCase()}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            @{username}
          </h1>
        </div>
        {/* Stat chips */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1">
            <span className="text-slate-400 text-xs">Rated</span>
            <span className="text-white text-sm font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/[0.06] border border-white/10 rounded-full px-3 py-1">
            <span className="text-slate-400 text-xs">Avg</span>
            <span className="text-white text-sm font-bold">{avg}<span className="text-slate-500 font-normal">/10</span></span>
          </div>
          {filter !== 'all' && (
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
              <span className="text-purple-300 text-xs capitalize">{filter}</span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                filter === opt.value
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/[0.06]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-[#111118]">{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="text-center py-24 text-slate-600">
          <p>No ratings in this category yet.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {displayed.map((r, i) => (
            <RatingListRow key={r.id} rating={r} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
