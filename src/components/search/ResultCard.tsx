import { useState } from 'react'
import type { MediaItem, MediaCategory } from '../../types'

interface Props {
  item: MediaItem
  userId: string | null
  existingRating?: number
  onRate: (item: MediaItem, rating: number, parentImage?: string | null) => Promise<void>
  onDrill?: (item: MediaItem) => void
  parentImage?: string | null
}

const PARENT_TYPES: MediaCategory[] = ['tv', 'artist', 'book-series']

const TYPE_LABELS: Partial<Record<MediaCategory, string>> = {
  'tv': 'tv show',
  'tv-season': 'tv season',
  'book-series': 'series',
}

export default function ResultCard({ item, userId, existingRating, onRate, onDrill, parentImage }: Props) {
  const [rating, setRating] = useState(existingRating ?? 7)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const isParent = PARENT_TYPES.includes(item.type)

  async function handleSave() {
    if (!userId) return
    setStatus('saving')
    await onRate(item, rating, parentImage)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2000)
  }

  function ratingBg(r: number) {
    if (r >= 8) return 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-300'
    if (r >= 6) return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-300'
    if (r >= 4) return 'from-orange-500/20 to-orange-500/5 border-orange-500/30 text-orange-300'
    return 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-300'
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col hover:border-purple-500/40 hover:bg-white/[0.06] transition-all duration-200 group">
      {/* Poster */}
      <div className="aspect-[2/3] bg-white/5 overflow-hidden relative">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8z" />
            </svg>
          </div>
        )}
        {/* Existing rating badge */}
        {existingRating != null && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            <span className="text-xs font-bold text-white">{existingRating.toFixed(1)}</span>
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-semibold text-white line-clamp-2 leading-tight text-[13px]">{item.title}</p>
          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-slate-500 uppercase tracking-wider border border-white/5">
            {TYPE_LABELS[item.type] ?? item.type}
          </span>
        </div>

        {isParent ? (
          <button
            onClick={() => onDrill?.(item)}
            className="mt-auto text-xs px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20 transition-colors font-medium"
          >
            {item.type === 'tv' ? 'View Seasons →' : item.type === 'book-series' ? 'View Books →' : 'View Discography →'}
          </button>
        ) : userId ? (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0" max="10" step="0.5"
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="flex-1"
              />
              <span className={`text-xs font-bold w-7 text-right tabular-nums bg-gradient-to-b border rounded-md px-1 py-0.5 ${ratingBg(rating)}`}>
                {rating.toFixed(1)}
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className={`w-full text-xs py-1.5 rounded-lg font-medium transition-all ${
                status === 'saved'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20'
              }`}
            >
              {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : existingRating != null ? 'Update' : 'Rate'}
            </button>
          </div>
        ) : (
          <p className="mt-auto text-[11px] text-slate-600 text-center">Sign in to rate</p>
        )}
      </div>
    </div>
  )
}
