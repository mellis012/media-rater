import { type KeyboardEvent } from 'react'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'movie',       label: 'Movies' },
  { value: 'tv',          label: 'TV Shows' },
  { value: 'novel',       label: 'Novels' },
  { value: 'light-novel', label: 'Light Novels' },
  { value: 'manga',       label: 'Manga' },
  { value: 'manhwa',      label: 'Manhwa' },
  { value: 'webnovel',    label: 'Webnovels' },
  { value: 'game',        label: 'Games' },
  { value: 'artist',      label: 'Artists' },
]

interface Props {
  q: string
  category: string
  onQChange: (q: string) => void
  onCategoryChange: (c: string) => void
  onSearch: () => void
  loading?: boolean
}

export default function SearchBar({ q, category, onQChange, onCategoryChange, onSearch, loading }: Props) {
  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <select
        value={category}
        onChange={e => onCategoryChange(e.target.value)}
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
        onChange={e => onQChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search for anything…"
        className="flex-1 min-w-48 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-sm"
      />
      <button
        onClick={onSearch}
        disabled={loading}
        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>
  )
}
