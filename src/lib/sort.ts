import type { Rating } from '../types'

export type SortKey =
  | 'rating_desc' | 'rating_asc'
  | 'title_asc'   | 'title_desc'
  | 'date_desc'   | 'date_asc'
  | 'release_desc'| 'release_asc'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating_desc',  label: 'Rating: High → Low' },
  { value: 'rating_asc',   label: 'Rating: Low → High' },
  { value: 'title_asc',    label: 'Title: A → Z' },
  { value: 'title_desc',   label: 'Title: Z → A' },
  { value: 'release_desc', label: 'Release Year: Newest' },
  { value: 'release_asc',  label: 'Release Year: Oldest' },
  { value: 'date_desc',    label: 'Date Added: Newest' },
  { value: 'date_asc',     label: 'Date Added: Oldest' },
]

export function sortRatings(ratings: Rating[], sort: SortKey): Rating[] {
  return [...ratings].sort((a, b) => {
    switch (sort) {
      case 'rating_desc':  return b.rating - a.rating
      case 'rating_asc':   return a.rating - b.rating
      case 'title_asc':    return a.title.localeCompare(b.title)
      case 'title_desc':   return b.title.localeCompare(a.title)
      case 'release_desc': return (b.release_year ?? 0) - (a.release_year ?? 0)
      case 'release_asc':  return (a.release_year ?? 9999) - (b.release_year ?? 9999)
      case 'date_desc':    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date_asc':     return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
  })
}
