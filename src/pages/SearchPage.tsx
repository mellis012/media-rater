import { useState, useEffect } from 'react'
import SearchBar from '../components/search/SearchBar'
import ResultCard from '../components/search/ResultCard'
import { searchMedia, getTvSeasons, getDiscography, getBookVolumes } from '../lib/api'
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
      else if (item.type === 'book-series') children = await getBookVolumes(item)
      setResults(children)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleRate(item: MediaItem, rating: number, parentImage?: string | null) {
    if (!user) return
    await saveRating(user.id, item.type as MediaCategory, item.id, item.title, rating, item.image, parentImage ?? null, item.release_year ?? null)
    setRatingMap(prev => new Map(prev).set(`${item.type}:${item.id}`, rating))
  }

  const hasResults = results.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero — collapses once results appear */}
      {!hasResults && (
        <div className="pt-16 pb-10 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-300 to-blue-400 bg-clip-text text-transparent mb-3 leading-tight">
            Rate everything.
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Movies, TV, books, games, music — all in one place.
          </p>
          <div className="max-w-xl mx-auto">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>
        </div>
      )}

      {/* Compact search bar when results are visible */}
      {hasResults && (
        <div className="py-4">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>
      )}

      {/* Drill breadcrumb */}
      {drillParent && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={() => { setDrillParent(null); setResults([]) }}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back
          </button>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400 truncate">{drillParent.title}</span>
        </div>
      )}

      {/* Results grid */}
      {hasResults && (
        <div className="pb-10">
          <p className="text-xs text-slate-600 mb-3">{results.length} results</p>
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
        </div>
      )}

      {/* Empty state (after a search returned nothing) */}
      {!loading && !hasResults && drillParent && (
        <div className="text-center py-16 text-slate-600">
          <p>No results found.</p>
        </div>
      )}
    </div>
  )
}
