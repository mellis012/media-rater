import type { MediaItem } from '../types'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY as string
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY as string

export async function searchMedia(q: string, category: string): Promise<MediaItem[]> {
  if (category === 'movie') {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`
    )
    const data = await res.json()
    const results = (data.results ?? []).sort((a: any, b: any) => b.popularity - a.popularity)
    return results.map((m: any) => ({
      id: String(m.id),
      title: m.title,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      type: 'movie' as const,
    }))
  }

  if (category === 'tv') {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`
    )
    const data = await res.json()
    const results = (data.results ?? []).sort((a: any, b: any) => b.popularity - a.popularity)
    return results.map((m: any) => ({
      id: String(m.id),
      title: m.name,
      image: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
      type: 'tv' as const,
    }))
  }

  if (category === 'book') {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=20&fields=key,title,cover_i`
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs ?? []).map((d: any) => ({
      id: d.key ?? '',
      title: d.title ?? 'Unknown',
      image: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
      type: 'book' as const,
    }))
  }

  if (category === 'game') {
    const params = new URLSearchParams({ search: q })
    if (RAWG_KEY) params.set('key', RAWG_KEY)
    const res = await fetch(`https://api.rawg.io/api/games?${params}`)
    const data = await res.json()
    return (data.results ?? []).map((g: any) => ({
      id: String(g.id),
      title: g.name,
      image: g.background_image ?? null,
      type: 'game' as const,
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
    }))
  }

  return []
}

export async function getTvSeasons(tvId: string): Promise<MediaItem[]> {
  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_KEY}`
  )
  const data = await res.json()
  const name = data.name ?? 'Unknown Show'
  return (data.seasons ?? [])
    .filter((s: any) => s.season_number > 0)
    .map((s: any) => ({
      id: `${tvId}-season-${s.season_number}`,
      title: `${name} – Season ${s.season_number}`,
      image: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
      type: 'tv-season' as const,
    }))
}

export async function getDiscography(artistId: string): Promise<MediaItem[]> {
  const id = artistId.replace('artist-', '')
  const res = await fetch(
    `https://www.theaudiodb.com/api/v1/json/2/album.php?i=${id}`
  )
  const data = await res.json().catch(() => ({}))
  return (data.album ?? []).map((a: any) => ({
    id: `album-${a.idAlbum}`,
    title: `${a.strAlbum} – ${a.strArtist}`,
    image: a.strAlbumThumb ?? null,
    type: 'album' as const,
  }))
}
