import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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

export default function MyRatingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { fetchUserRatings, saveRating } = useRatings()
  const navigate = useNavigate()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [filter, setFilter] = useState<'all' | MediaCategory>('all')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [loading, setLoading] = useState(true)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(5)
  const [editSaving, setEditSaving] = useState(false)

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

  const filtered = useMemo(
    () => filter === 'all' ? ratings : ratings.filter(r => r.category === filter),
    [ratings, filter]
  )
  const displayed = useMemo(() => sortRatings(filtered, sort), [filtered, sort])

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : '—'

  async function handleEditSave(r: Rating) {
    if (!user) return
    setEditSaving(true)
    await saveRating(user.id, r.category, r.item_id, r.title, editValue, r.image, r.parent_image)
    setRatings(prev => prev.map(x => x.id === r.id ? { ...x, rating: editValue } : x))
    setEditingId(null)
    setEditSaving(false)
  }

  if (authLoading || loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">
          My Ratings
        </h1>
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
              onClick={() => { setFilter(opt.value); setEditingId(null) }}
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
            onChange={e => { setSort(e.target.value as SortKey); setEditingId(null) }}
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
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-slate-500">No ratings here yet.</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block transition-colors">
            Search for something to rate →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {displayed.map((r, i) => (
            <RatingListRow
              key={r.id}
              rating={r}
              rank={i + 1}
              isEditing={editingId === r.id}
              editValue={editingId === r.id ? editValue : undefined}
              editSaving={editSaving}
              onEditStart={(current) => { setEditingId(r.id); setEditValue(current) }}
              onEditChange={setEditValue}
              onEditSave={() => handleEditSave(r)}
              onEditCancel={() => setEditingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
