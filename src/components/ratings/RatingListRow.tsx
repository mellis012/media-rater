import type { Rating } from '../../types'

interface Props {
  rating: Rating
  rank: number
}

function ratingColor(r: number) {
  if (r >= 8) return 'text-green-400'
  if (r >= 6) return 'text-yellow-400'
  if (r >= 4) return 'text-orange-400'
  return 'text-red-400'
}

export default function RatingListRow({ rating: r, rank }: Props) {
  const image = r.image || r.parent_image
  return (
    <div className="flex items-center gap-4 py-3 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
      {/* Rank */}
      <span className="text-slate-700 text-sm w-6 text-right shrink-0 select-none">{rank}</span>

      {/* Thumbnail */}
      <div className="w-10 h-14 shrink-0 rounded overflow-hidden bg-white/5">
        {image ? (
          <img src={image} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title + category */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{r.title}</p>
        <span className="text-xs text-slate-500 uppercase tracking-wide">{r.category}</span>
      </div>

      {/* Date */}
      <span className="text-xs text-slate-600 shrink-0 hidden sm:block">
        {new Date(r.created_at).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </span>

      {/* Rating */}
      <span className={`text-lg font-bold shrink-0 w-12 text-right ${ratingColor(r.rating)}`}>
        {r.rating.toFixed(1)}
      </span>
    </div>
  )
}
