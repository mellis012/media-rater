import { useState, type KeyboardEvent } from 'react'
import type { MediaCategory } from '../../types'

const CATEGORIES: { value: MediaCategory | 'tv'; label: string }[] = [
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
  { value: 'book', label: 'Books' },
  { value: 'game', label: 'Games' },
  { value: 'artist', label: 'Artists' },
]

interface Props {
  onSearch: (q: string, category: string) => void
  loading?: boolean
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('movie')

  function handleSearch() {
    if (q.trim()) onSearch(q.trim(), category)
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 focus:outline-none focus:border-purple-500 transition-colors text-sm"
      >
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value} className="bg-[#1a1a2e]">
            {c.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search for anything…"
        className="flex-1 min-w-48 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
      />
      <button
        onClick={handleSearch}
        disabled={loading}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>
  )
}
