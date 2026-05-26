import type { MediaItem, Rating } from '../types'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY as string
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY as string
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string

function yearFrom(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const y = parseInt(dateStr.split('-')[0], 10)
  return isNaN(y) ? null : y
}

/** Remove trailing volume indicators like "Vol. 1", "Book 2", "(Part 3)" */
function stripVolumeSuffix(title: string): string {
  return title
    .replace(/[,:]?\s+(book|vol\.?|volume|part)\s+\d+.*/i, '')
    .replace(/\s*\([^)]*(?:book|vol\.?|volume|part)\s+\d+[^)]*\)/i, '')
    .trim() || title
}

/**
 * Returns the longest common title prefix (≥ 2 words) shared by all titles,
 * stripping trailing stop/connector words. Returns '' if no meaningful prefix.
 */
function commonTitlePrefix(titles: string[]): string {
  if (titles.length < 2) return ''
  const stop = new Set(['a','an','the','and','or','of','in','on','at','for','to','by'])
  const wordArrays = titles.map(t => t.toLowerCase().split(/\s+/))
  const first = wordArrays[0]
  let prefixLen = 0
  for (let i = 0; i < first.length; i++) {
    if (wordArrays.every(w => w[i] === first[i])) prefixLen = i + 1
    else break
  }
  while (prefixLen > 0 && stop.has(first[prefixLen - 1])) prefixLen--
  if (prefixLen < 2) return ''
  return titles[0].split(/\s+/).slice(0, prefixLen).join(' ')
}

/** Parse a Google Books volumeInfo.publishedDate string into a year integer */
function yearFromGb(info: any): number | null {
  const s: string = info?.publishedDate ?? ''
  const y = parseInt(s.split('-')[0], 10)
  return isNaN(y) ? null : y
}

/** Build a MediaItem from a Google Books volume object */
function gbVolumeToItem(item: any): MediaItem {
  const info = item.volumeInfo ?? {}
  const title: string = (info.title ?? 'Unknown').trim()
  const author: string = (info.authors?.[0] ?? '').trim()
  const thumb: string | undefined = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail
  return {
    id: `gb-${item.id}`,
    title: author ? `${title} — ${author}` : title,
    image: thumb ? thumb.replace('http:', 'https:') : null,
    type: 'book' as const,
    release_year: yearFromGb(info),
  }
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
      if (r.item_id.startsWith('gb-')) {
        // Google Books ID
        const volumeId = r.item_id.slice(3)
        const keyParam = GOOGLE_BOOKS_KEY ? `?key=${GOOGLE_BOOKS_KEY}` : ''
        const data = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${volumeId}${keyParam}`
        ).then(res => res.json()).catch(() => ({}))
        const dateStr: string = data.volumeInfo?.publishedDate ?? ''
        const y = parseInt(dateStr.split('-')[0], 10)
        return isNaN(y) ? null : y
      } else {
        // Legacy OpenLibrary key like "/works/OL12345W"
        const data = await fetch(
          `https://openlibrary.org${r.item_id}.json`
        ).then(res => res.json()).catch(() => ({}))
        const raw: string = data.first_publish_date ?? ''
        const match = raw.match(/\d{4}/)
        return match ? parseInt(match[0], 10) : null
      }
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
    const makeParams = (query: string) => {
      const p = new URLSearchParams({ q: query, maxResults: '40', printType: 'books', orderBy: 'relevance' })
      if (GOOGLE_BOOKS_KEY) p.set('key', GOOGLE_BOOKS_KEY)
      return p
    }
    const empty = { items: [] as any[] }

    // Title-focused + general search in parallel
    const [titleData, generalData] = await Promise.all([
      fetch(`https://www.googleapis.com/books/v1/volumes?${makeParams(`intitle:${q}`)}`)
        .then(r => r.ok ? r.json() : empty).catch(() => empty),
      fetch(`https://www.googleapis.com/books/v1/volumes?${makeParams(q)}`)
        .then(r => r.ok ? r.json() : empty).catch(() => empty),
    ])

    // Bucket the intitle: results by author.
    // 2+ books by the same author matching the title search → series card.
    // (seriesInfo is not reliably present in search responses, so we detect
    //  series from the author+title pattern instead.)
    const authorBuckets = new Map<string, { items: any[]; infos: any[] }>()
    const seenInTitle = new Set<string>()

    for (const item of (titleData.items ?? [])) {
      const info = item.volumeInfo ?? {}
      const title: string = (info.title ?? 'Unknown').trim()
      const author: string = (info.authors?.[0] ?? '').trim()
      const key = `${title.toLowerCase()}||${author.toLowerCase()}`
      if (seenInTitle.has(key) || !author) continue
      seenInTitle.add(key)
      const bucket = authorBuckets.get(author.toLowerCase()) ?? { items: [], infos: [] }
      bucket.items.push(item)
      bucket.infos.push(info)
      authorBuckets.set(author.toLowerCase(), bucket)
    }

    const seriesItems: MediaItem[] = []
    const claimedIds = new Set<string>() // Google Books volume IDs absorbed into a series card

    for (const [, { items, infos }] of authorBuckets) {
      if (items.length < 2) continue
      const author: string = infos[0].authors?.[0] ?? ''
      const titles: string[] = infos.map(i => (i.title ?? '').trim())
      const seriesName = commonTitlePrefix(titles) || stripVolumeSuffix(titles[0]) || q
      const thumb: string | undefined = infos[0].imageLinks?.thumbnail ?? infos[0].imageLinks?.smallThumbnail

      seriesItems.push({
        id: `bookseries-${encodeURIComponent(author)}|||${encodeURIComponent(seriesName)}|||${encodeURIComponent(q)}`,
        title: `${seriesName} — ${author}`,
        image: thumb ? thumb.replace('http:', 'https:') : null,
        type: 'book-series' as const,
        release_year: null,
      })
      items.forEach(i => claimedIds.add(i.id))
    }

    // Remaining books not absorbed into a series card
    const seenAll = new Set<string>()
    const soloBooks: MediaItem[] = []
    for (const item of [...(titleData.items ?? []), ...(generalData.items ?? [])]) {
      if (claimedIds.has(item.id)) continue
      const info = item.volumeInfo ?? {}
      const title: string = (info.title ?? 'Unknown').trim()
      const author: string = (info.authors?.[0] ?? '').trim()
      const key = `${title.toLowerCase()}||${author.toLowerCase()}`
      if (seenAll.has(key)) continue
      seenAll.add(key)
      soloBooks.push(gbVolumeToItem(item))
    }

    return [...seriesItems, ...soloBooks]
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

export async function getBookVolumes(item: MediaItem): Promise<MediaItem[]> {
  // ID format: bookseries-{encodedAuthor}|||{encodedSeriesName}|||{encodedQuery}
  const withoutPrefix = item.id.slice('bookseries-'.length)
  const [encodedAuthor, , encodedQuery] = withoutPrefix.split('|||')
  const author = decodeURIComponent(encodedAuthor ?? '')
  const query = decodeURIComponent(encodedQuery ?? '')

  const q = `inauthor:"${author}" intitle:${query}`
  const params = new URLSearchParams({ q, maxResults: '40', printType: 'books', orderBy: 'newest' })
  if (GOOGLE_BOOKS_KEY) params.set('key', GOOGLE_BOOKS_KEY)

  const data = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
    .then(r => r.ok ? r.json() : { items: [] })
    .catch(() => ({ items: [] }))

  // Sort by volume number when available, otherwise keep API order
  const sorted = [...(data.items ?? [])].sort((a: any, b: any) => {
    const an = parseFloat(a.volumeInfo?.seriesInfo?.bookDisplayNumber ?? '999')
    const bn = parseFloat(b.volumeInfo?.seriesInfo?.bookDisplayNumber ?? '999')
    return an - bn
  })

  const seen = new Set<string>()
  const result: MediaItem[] = []
  for (const v of sorted) {
    const info = v.volumeInfo ?? {}
    const title: string = (info.title ?? 'Unknown').trim()
    const auth: string = (info.authors?.[0] ?? '').trim()
    const key = `${title.toLowerCase()}||${auth.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(gbVolumeToItem(v))
  }
  return result
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
