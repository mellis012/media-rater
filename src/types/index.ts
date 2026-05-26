export type MediaCategory = 'movie' | 'tv' | 'book' | 'game' | 'artist' | 'tv-season' | 'album'

export interface MediaItem {
  id: string
  title: string
  image: string | null
  type: MediaCategory
  parentImage?: string | null
  release_year?: number | null
}

export interface Rating {
  id: string
  user_id: string
  category: MediaCategory
  item_id: string
  title: string
  rating: number
  image: string | null
  parent_image: string | null
  release_year?: number | null
  created_at: string
  updated_at: string
  profiles?: { username: string }
}

export interface Profile {
  id: string
  username: string | null
  created_at: string
}
