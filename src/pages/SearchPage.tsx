import { useState, useEffect } from 'react'
import SearchBar from '../components/search/SearchBar'
import ResultCard from '../components/search/ResultCard'
import { searchMedia, getTvSeasons, getDiscography } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { useRatings } from '../hooks/useRatings'
import type { MediaItem, MediaCategory } from '../types'

export default function SearchPage() {
  const { user } = useAuth()
  const { saveRating, getUserRatingMap } = useRatings()
  const [results, setResults] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [drillParent, setDrillParent] = useState<MediaItem | null>(null)
  const [ratingMap, setRatingMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (user) getUserRatingMap(user.id).then(setRatingMap)
  }, [user, getUserRatingMap])

  async function handleSearch(q: string, category: string) {
    setLoading(true)
    setDrillParent(null)
    try {
      const items = await searchMedia(q, category)
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDrill(item: MediaItem) {
    setLoading(true)
    setDrillParent(item)
    try {
      let children: MediaItem[] = []
      if (item.type === 'tv') children = await getTvSeasons(item.id)
      else if (item.type === 'artist') children = await getDiscography(item.id)
      setResults(children)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRate(item: MediaItem, rating: number, parentImage?: string | null) {
    if (!user) return
    await saveRating(user.id, item.type as MediaCategory, item.id, item.title, rating, item.image, parentImage ?? null)
    setRatingMap(prev => new Map(prev).set(`${item.type}:${item.id}`, rating))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Search</h1>
        <p className="text-slate-400">Find movies, shows, books, games, and music to rate.</p>
      </div>

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {drillParent && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => { setDrillParent(null); setResults([]) }}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back
          </button>
          <span className="text-slate-500">/</span>
          <span className="text-sm text-slate-300">{drillParent.title}</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map(item => (
            <ResultCard
              key={item.id}
              item={item}
              userId={user?.id ?? null}
              existingRating={ratingMap.get(`${item.type}:${item.id}`)}
              onRate={handleRate}
              onDrill={handleDrill}
              parentImage={drillParent?.image ?? null}
            />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="text-center py-24 text-slate-600">
          <p className="text-lg">Search for something to get started.</p>
        </div>
      )}
    </div>
  )
}
