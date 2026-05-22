import type { Rating } from '../../types'
import { Link } from 'react-router-dom'

interface Props {
  rating: Rating
  showUser?: boolean
}

function ratingColor(r: number) {
  if (r >= 8) return 'text-green-400'
  if (r >= 6) return 'text-yellow-400'
  if (r >= 4) return 'text-orange-400'
  return 'text-red-400'
}

export default function RatingCard({ rating: r, showUser }: Props) {
  const image = r.image || r.parent_image

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-white/20 transition-colors">
      <div className="aspect-[2/3] bg-white/5 overflow-hidden relative">
        {image ? (
          <img src={image} alt={r.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4h16v16H4V4zm2 2v12h12V6H6z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <span className={`text-sm font-bold ${ratingColor(r.rating)}`}>{r.rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">{r.title}</p>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400 uppercase tracking-wide w-fit">
          {r.category}
        </span>
        {showUser && r.profiles?.username && (
          <Link
            to={`/user/${r.profiles.username}`}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors mt-0.5"
          >
            @{r.profiles.username}
          </Link>
        )}
      </div>
    </div>
  )
}
