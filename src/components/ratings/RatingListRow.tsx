import type { Rating } from '../../types'

interface Props {
  rating: Rating
  rank: number
  // Optional edit controls — only passed from MyRatingsPage
  isEditing?: boolean
  editValue?: number
  editSaving?: boolean
  onEditStart?: (current: number) => void
  onEditChange?: (v: number) => void
  onEditSave?: () => void
  onEditCancel?: () => void
}

export function ratingColor(r: number) {
  if (r >= 8) return 'text-green-400'
  if (r >= 6) return 'text-yellow-400'
  if (r >= 4) return 'text-orange-400'
  return 'text-red-400'
}

function accentBar(r: number) {
  if (r >= 8) return 'bg-green-400'
  if (r >= 6) return 'bg-yellow-400'
  if (r >= 4) return 'bg-orange-400'
  return 'bg-red-400'
}

export default function RatingListRow({
  rating: r, rank,
  isEditing, editValue, editSaving,
  onEditStart, onEditChange, onEditSave, onEditCancel,
}: Props) {
  const image = r.image || r.parent_image
  const displayRating = isEditing && editValue !== undefined ? editValue : r.rating

  return (
    <div className="group relative flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors">

      {/* Left accent bar */}
      <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${accentBar(r.rating)}`} />

      {/* Rank */}
      <span className="text-slate-700 text-xs w-5 text-right shrink-0 select-none tabular-nums">{rank}</span>

      {/* Thumbnail */}
      <div className="w-9 h-[52px] shrink-0 rounded-md overflow-hidden bg-white/5 shadow-md">
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
        <p className="text-white text-sm font-medium truncate leading-snug">{r.title}</p>
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">{r.category}</span>
      </div>

      {/* Edit mode: slider + buttons */}
      {isEditing ? (
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="range"
            min="0" max="10" step="0.5"
            value={editValue}
            onChange={e => onEditChange?.(Number(e.target.value))}
            className="w-28"
          />
          <span className={`text-sm font-bold w-8 text-center tabular-nums ${ratingColor(editValue ?? r.rating)}`}>
            {(editValue ?? r.rating).toFixed(1)}
          </span>
          <button
            onClick={onEditSave}
            disabled={editSaving}
            className="text-xs px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {editSaving ? '…' : 'Save'}
          </button>
          <button
            onClick={onEditCancel}
            className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          {/* Date */}
          <span className="text-xs text-slate-600 shrink-0 hidden md:block tabular-nums">
            {new Date(r.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>

          {/* Rating — clickable if editable */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-base font-bold w-10 text-right tabular-nums ${ratingColor(displayRating)}`}>
              {displayRating.toFixed(1)}
            </span>
            {onEditStart && (
              <button
                onClick={() => onEditStart(r.rating)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                title="Edit rating"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
