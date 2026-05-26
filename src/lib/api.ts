import type { MediaItem, Rating } from '../types'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY as string
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY as string

function yearFrom(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const y = parseInt(dateStr.split('-')[0], 10)
  return isNaN(y) ? null : y
}

/**
 * Look up the release year for a single rating via its source API.
 * Returns null if the year can't be determined.
 */
export async function fetchReleaseYear(r: Rating): Promise<number | null> {
  try {
    if (r.category === 'movie') {
      const data = await fetch(
        `https://api.themoviedb.org/3/movie/${r.item_id}?api_key=${TMDB_KEY}`
      ).then(res => res.json())
      return yearFrom(data.release_date)
    }

    if (r.category === 'tv-season') {
      // item_id format: "{showId}-season-{seasonNumber}"
      const [showId, seasonNum] = r.item_id.split('-season-')
      const data = await fetch(
        `https://api.themoviedb.org/3/tv/${showId}/season/${seasonNum}?api_key=${TMDB_KEY}`
      ).then(res => res.json())
      return yearFrom(data.air_date)
    }

    if (r.category === 'book') {
      // item_id is an OpenLibrary key like "/works/OL12345W"
      const data = await fetch(
        `https://openlibrary.org${r.item_id}.json`
      ).then(res => res.json()).catch(() => ({}))
      // first_publish_date can be "1982", "April 1982", etc.
      const raw: string = data.first_publish_date ?? ''
      const match = raw.match(/\d{4}/)
      return match ? parseInt(match[0], 10) : null
    }

    if (r.category === 'game') {
      const params = new URLSearchParams()
      if (RAWG_KEY) params.set('key', RAWG_KEY)
      const data = await fetch(
        `https://api.rawg.io/api/games/${r.item_id}?${params}`
      ).then(res => res.json())
      return yearFrom(data.released)
    }

    if (r.category === 'album') {
      const albumId = r.item_id.replace('album-', '')
      const data = await fetch(
        `https://www.theaudiodb.com/api/v1/json/2/album.php?m=${albumId}`
      ).then(res => res.json()).catch(() => ({}))
      const yr = data.album?.[0]?.intYearReleased
      return yr ? parseInt(yr, 10) : null
    }
  } catch {
    // Network error — skip this item
  }
  return null
}

export async function searchMedia(q: string, category: string): Promise<MediaItem[]> {
  if (category === 'movie') {
    // Fetch 2 pages concurrently for ~40 results
    const [d1, d2] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=2`).then(r => r.json()),
    ])
    const results = [...(d1.results ?? []), ...(d2.results ?? [])]
      .sort((a: any, b: any) => b.popularity - a.popularity)
    return results.map((m: any) => ({
      id: String(m.id),
      title: m.title,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      type: 'movie' as const,
      release_year: yearFrom(m.release_date),
    }))
  }

  if (category === 'tv') {
    const [d1, d2] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`).then(r => r.json()),
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=2`).then(r => r.json()),
    ])
    const results = [...(d1.results ?? []), ...(d2.results ?? [])]
      .sort((a: any, b: any) => b.popularity - a.popularity)
    return results.map((m: any) => ({
      id: String(m.id),
      title: m.name,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      type: 'tv' as const,
      release_year: yearFrom(m.first_air_date),
    }))
  }

  if (category === 'book') {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=40&fields=key,title,cover_i,first_publish_year`
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs ?? []).map((d: any) => ({
      id: d.key ?? '',
      title: d.title ?? 'Unknown',
      image: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      type: 'book' as const,
      release_year: d.first_publish_year ?? null,
    }))
  }

  if (category === 'game') {
    const params = new URLSearchParams({ search: q, page_size: '40' })
    if (RAWG_KEY) params.set('key', RAWG_KEY)
    const res = await fetch(`https://api.rawg.io/api/games?${params}`)
    const data = await res.json()
    return (data.results ?? []).map((g: any) => ({
      id: String(g.id),
      title: g.name,
      image: g.background_image ?? null,
      type: 'game' as const,
      release_year: yearFrom(g.released),
    }))
  }

  if (category === 'artist') {
    const res = await fetch(
      `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(q)}`
    )
    const data = await res.json().catch(() => ({}))
    return (data.artists ?? []).map((a: any) => ({
      id: `artist-${a.idArtist}`,
      title: a.strArtist,
      image: a.strArtistThumb ?? null,
      type: 'artist' as const,
      release_year: null,
    }))
  }

  return []
}

export async function getTvSeasons(tvId: string): Promise<MediaItem[]> {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_KEY}`)
  const data = await res.json()
  const name = data.name ?? 'Unknown Show'
  const showYear = yearFrom(data.first_air_date)
  return (data.seasons ?? [])
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      id: `${tvId}-season-${s.season_number}`,
      title: `${name} – Season ${s.season_number}`,
      image: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
      type: 'tv-season' as const,
      release_year: yearFrom(s.air_date) ?? showYear,
    }))
}

export async function getDiscography(artistId: string): Promise<MediaItem[]> {
  const id = artistId.replace('artist-', '')
  const res = await fetch(`https://www.theaudiodb.com/api/v1/json/2/album.php?i=${id}`)
  const data = await res.json().catch(() => ({}))
  return (data.album ?? []).map((a: any) => ({
    id: `album-${a.idAlbum}`,
    title: `${a.strAlbum} – ${a.strArtist}`,
    image: a.strAlbumThumb ?? null,
    type: 'album' as const,
    release_year: a.intYearReleased ? parseInt(a.intYearReleased, 10) : null,
  }))
}
