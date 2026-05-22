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

const PARENT_TYPES: MediaCategory[] = ['tv', 'artist']

export default function ResultCard({ item, userId, existingRating, onRate, onDrill, parentImage }: Props) {
  const [rating, setRating] = useState(existingRating ?? 5)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const isParent = PARENT_TYPES.includes(item.type)

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    await onRate(item, rating, parentImage)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-purple-500/40 transition-colors group">
      <div className="aspect-[2/3] bg-white/5 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8zm2 2v4h4v-4h-4z" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 uppercase tracking-wide">
            {item.type}
          </span>
        </div>

        {isParent ? (
          <button
            onClick={() => onDrill?.(item)}
            className="mt-auto text-xs px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition-colors"
          >
            {item.type === 'tv' ? 'View Seasons →' : 'View Discography →'}
          </button>
        ) : userId ? (
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <span className="text-sm font-bold text-purple-400 w-8 text-right">{rating}</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full text-xs py-1.5 rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-600/30 text-green-300 border border-green-500/30'
                  : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30'
              }`}
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : existingRating != null ? 'Update' : 'Rate'}
            </button>
          </div>
        ) : (
          <p className="mt-auto text-xs text-slate-600 text-center">Sign in to rate</p>
        )}
      </div>
    </div>
  )
}
