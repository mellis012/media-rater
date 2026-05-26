import type { Rating } from '../../types'

interface Props {
  rating: Rating
  rank: number
  // Edit controls (MyRatingsPage only)
  isEditing?: boolean
  editValue?: number
  editSaving?: boolean
  onEditStart?: (current: number) => void
  onEditChange?: (v: number) => void
  onEditSave?: () => void
  onEditCancel?: () => void
  // Delete controls (MyRatingsPage only)
  isConfirmingDelete?: boolean
  deleteSaving?: boolean
  onDeleteStart?: () => void
  onDeleteConfirm?: () => void
  onDeleteCancel?: () => void
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
  isEditing, editValue, editSaving, onEditStart, onEditChange, onEditSave, onEditCancel,
  isConfirmingDelete, deleteSaving, onDeleteStart, onDeleteConfirm, onDeleteCancel,
}: Props) {
  const image = r.image || r.parent_image
  const displayRating = isEditing && editValue !== undefined ? editValue : r.rating
  const isInteracting = isEditing || isConfirmingDelete

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
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">{r.category}</span>
          {r.release_year && (
            <span className="text-[11px] text-slate-600">{r.release_year}</span>
          )}
        </div>
      </div>

      {/* — Edit mode — */}
      {isEditing && (
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="range" min="0" max="10" step="0.5"
            value={editValue}
            onChange={e => onEditChange?.(Number(e.target.value))}
            className="w-28"
          />
          <span className={`text-sm font-bold w-8 text-center tabular-nums ${ratingColor(editValue ?? r.rating)}`}>
            {(editValue ?? r.rating).toFixed(1)}
          </span>
          <button onClick={onEditSave} disabled={editSaving}
            className="text-xs px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium transition-colors">
            {editSaving ? '…' : 'Save'}
          </button>
          <button onClick={onEditCancel}
            className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* — Delete confirmation mode — */}
      {isConfirmingDelete && !isEditing && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">Remove this rating?</span>
          <button onClick={onDeleteConfirm} disabled={deleteSaving}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition-colors">
            {deleteSaving ? '…' : 'Delete'}
          </button>
          <button onClick={onDeleteCancel}
            className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* — Normal mode — */}
      {!isInteracting && (
        <>
          {/* Date */}
          <span className="text-xs text-slate-600 shrink-0 hidden md:block tabular-nums">
            {new Date(r.created_at).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </span>

          {/* Rating + action icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-base font-bold w-10 text-right tabular-nums ${ratingColor(displayRating)}`}>
              {displayRating.toFixed(1)}
            </span>

            {/* Edit icon */}
            {onEditStart && (
              <button onClick={() => onEditStart(r.rating)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-all"
                title="Edit rating">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}

            {/* Delete icon */}
            {onDeleteStart && (
              <button onClick={onDeleteStart}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                title="Delete rating">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
