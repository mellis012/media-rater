import type { MediaItem, Rating } from '../types'

const TMDB_KEY = import.meta.env.VITE_TMDB_KEY as string
const RAWG_KEY = import.meta.env.VITE_RAWG_KEY as string
const GOOGLE_BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string // kept for legacy gb- ratings
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function yearFrom(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const y = parseInt(dateStr.split('-')[0], 10)
  return isNaN(y) ? null : y
}

/** Execute a Hardcover GraphQL query via Supabase Edge Function proxy. Returns data or null on any error. */
async function hardcoverQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/hardcover-proxy`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json()
    if (json.errors) console.warn('[hardcover] errors:', JSON.stringify(json.errors).slice(0, 300))
    return json.data ?? null
  } catch (e) {
    console.error('[hardcover] fetch error:', e)
    return null
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
      if (r.item_id.startsWith('hcbook-')) {
        // Hardcover book ID
        const bookId = parseInt(r.item_id.replace('hcbook-', ''), 10)
        const data = await hardcoverQuery<{ books_by_pk: { release_date: string } | null }>(
          `query($id: Int!) { books_by_pk(id: $id) { release_date } }`,
          { id: bookId }
        )
        return yearFrom(data?.books_by_pk?.release_date)
      }
      if (r.item_id.startsWith('gb-')) {
        // Legacy Google Books ID
        const volumeId = r.item_id.slice(3)
        const keyParam = GOOGLE_BOOKS_KEY ? `?key=${GOOGLE_BOOKS_KEY}` : ''
        const data = await fetch(
          `https://www.googleapis.com/books/v1/volumes/${volumeId}${keyParam}`
        ).then(res => res.json()).catch(() => ({}))
        const dateStr: string = data.volumeInfo?.publishedDate ?? ''
        const y = parseInt(dateStr.split('-')[0], 10)
        return isNaN(y) ? null : y
      }
      // Legacy OpenLibrary key like "/works/OL12345W"
      const data = await fetch(
        `https://openlibrary.org${r.item_id}.json`
      ).then(res => res.json()).catch(() => ({}))
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

// ── Hardcover book / series search ──────────────────────────────────────────
// Shared by all book-like categories: novel, manga, manhwa, manhua,
// light-novel, webnovel, and the legacy generic "book" category.
//
// forceSeriesType:
//   'auto'         – run full manga-detection heuristics (legacy behaviour)
//   'manga-series' – treat every series as manga/manhwa/manhua; skip detection
//   'book-series'  – treat every series as prose; skip detection
async function searchHardcover(
  q: string,
  forceSeriesType: 'auto' | 'manga-series' | 'book-series'
): Promise<MediaItem[]> {
  const [seriesRes, bookRes] = await Promise.all([
    hardcoverQuery(`
      query($q: String!) {
        search(query: $q, query_type: "Series", per_page: 20) {
          results
        }
      }
    `, { q }),
    hardcoverQuery(`
      query($q: String!) {
        search(query: $q, query_type: "Book", per_page: 40) {
          results
        }
      }
    `, { q }),
  ])

  // Results are Typesense hits: { results: { hits: [{ document: {...} }] } }
  // Deduplicate series in three passes:
  //   1. ID-dedup: same series can appear once per author → merge authors.
  //   2. Name-dedup (Latin only): same real-world series can have multiple
  //      Hardcover records (e.g. one per author credit) → merge, track all ids.
  //   3. CJK absorption: Japanese/Chinese titles like "ブルーロック [Blue Lock]"
  //      have the Latin name in brackets. We absorb their IDs into the matching
  //      Latin entry so manga-detection and foundSeriesIds stay correct even
  //      though we don't display the CJK card.
  const NON_LATIN_SERIES = /[⺀-鿿가-힯豈-﫿぀-ヿ]/
  const rawSeriesHits: any[] = (seriesRes?.search?.results?.hits ?? []).map((h: any) => h.document)

  // Pass 1 — id dedup
  const seriesById = new Map<number, any>()
  for (const s of rawSeriesHits) {
    const sid = parseInt(s.id, 10)
    if (!seriesById.has(sid)) {
      seriesById.set(sid, { ...s, _mergedAuthors: s.author_name ? [s.author_name] : [] })
    } else if (s.author_name) {
      const e = seriesById.get(sid)!
      if (!e._mergedAuthors.includes(s.author_name)) e._mergedAuthors.push(s.author_name)
    }
  }

  // Pass 2 — name dedup (Latin entries only, for display)
  const seriesByName = new Map<string, { entry: any; ids: number[]; authors: string[] }>()
  for (const [sid, s] of seriesById) {
    if (NON_LATIN_SERIES.test(s.name ?? '')) continue
    const key = (s.name ?? '').toLowerCase().trim()
    if (!seriesByName.has(key)) {
      seriesByName.set(key, { entry: s, ids: [sid], authors: s._mergedAuthors })
    } else {
      const m = seriesByName.get(key)!
      if (!m.ids.includes(sid)) m.ids.push(sid)
      for (const a of s._mergedAuthors) if (!m.authors.includes(a)) m.authors.push(a)
    }
  }

  // Pass 3 — absorb CJK ids into matching Latin entries via bracket content
  // e.g. "ブルーロック [Blue Lock]" → bracket = "blue lock" → absorbed into Latin "Blue Lock"
  for (const [sid, s] of seriesById) {
    if (!NON_LATIN_SERIES.test(s.name ?? '')) continue
    const bracketMatch = (s.name ?? '').match(/\[([^\]]+)\]/)
    if (!bracketMatch) continue
    const bracketKey = bracketMatch[1].toLowerCase().trim()
    // exact match first, then fuzzy (spaces stripped) for "Bluelock" vs "Blue Lock"
    const targetKey = seriesByName.has(bracketKey)
      ? bracketKey
      : [...seriesByName.keys()].find(k => k.replace(/\s/g, '') === bracketKey.replace(/\s/g, ''))
    if (targetKey) {
      const m = seriesByName.get(targetKey)!
      if (!m.ids.includes(sid)) m.ids.push(sid)
    }
  }

  const seriesResults: any[] = Array.from(seriesByName.values()).map(({ entry, ids, authors }) => ({
    ...entry,
    _allIds: ids,
    author_name: authors.length > 0 ? authors.join(', ') : null,
  }))
  const bookResults: any[] = (bookRes?.search?.results?.hits ?? []).map((h: any) => h.document)

  // ── Manga detection — always runs ───────────────────────────────────────
  // Auto mode: result determines the series type (manga-series vs book-series).
  // Explicit modes: result drives filtering — novels mode hides manga series,
  // graphic-novel mode forces everything to manga-series regardless.
  //
  // Author propagation is skipped in book-series (Novels) mode: propagating
  // manga detection to same-author series would falsely exclude prose series
  // written by authors who also write manga.
  function primarySids(b: any): number[] {
    const pid: unknown = b.featured_series?.series?.id
    if (typeof pid === 'number' && pid > 0) return [pid]
    return ((b.series_ids ?? []) as number[]).filter(id => id > 0)
  }
  const mangaSeriesIds = new Set<number>()

  // Pass 1: collect series IDs from comics-genre books.
  for (const b of bookResults) {
    if ((b.genres ?? []).some((g: string) => /manga|manhwa|manhua|comics/i.test(g))) {
      for (const sid of primarySids(b)) mangaSeriesIds.add(sid)
    }
  }
  // Pass 2: disqualify any series that also has non-comics books (e.g. LotM novel).
  for (const b of bookResults) {
    if (!(b.genres ?? []).some((g: string) => /manga|manhwa|manhua|comics/i.test(g))) {
      for (const sid of primarySids(b)) mangaSeriesIds.delete(sid)
    }
  }
  // Demote adaptation series BEFORE author propagation: a series name with an
  // explicit format label like "(Manhwa)" is a secondary adaptation — remove it
  // so it can't seed mangaAuthors and accidentally tag the source novel as manga.
  const FORMAT_LABEL_RE = /\((manhwa|manhua|manga|webtoon|comic)/i
  for (const s of seriesResults) {
    if (FORMAT_LABEL_RE.test(s.name ?? '')) {
      for (const id of (s._allIds as number[])) mangaSeriesIds.delete(id)
    }
  }
  // Author propagation (skipped in Novels mode to avoid false exclusions).
  if (forceSeriesType !== 'book-series') {
    const mangaAuthors = new Set<string>()
    for (const s of seriesResults) {
      const isManga = (s._allIds as number[]).some((id: number) => mangaSeriesIds.has(id))
      if (isManga && s.author_name) {
        for (const a of (s.author_name as string).split(',')) mangaAuthors.add(a.toLowerCase().trim())
      }
    }
    for (const s of seriesResults) {
      if (s.author_name) {
        const parts = (s.author_name as string).split(',').map((a: string) => a.toLowerCase().trim())
        if (parts.some((a: string) => mangaAuthors.has(a))) {
          for (const id of (s._allIds as number[])) mangaSeriesIds.add(id)
        }
      }
    }
  }

  // Filter out omnibus / boxset / collection series — repackaged editions,
  // not the canonical reading order.
  const OMNIBUS_RE = /omnibus|box\s*set|boxed|deluxe|\d-in-\d|complete\s+series|collected/i
  const filteredSeries = seriesResults.filter((s: any) => !OMNIBUS_RE.test(s.name ?? ''))

  // foundSeriesIds stays FULLY inclusive (all series IDs, genre-unfiltered) so that
  // volumes belonging to hidden series are still suppressed as solo cards.
  const foundSeriesIds = new Set<number>()
  for (const s of filteredSeries) {
    for (const id of (s._allIds as number[])) foundSeriesIds.add(id)
  }
  // Transitively expand: if a book's primary series is already known, absorb all
  // its other series_ids too — catches volumes that cross-reference multiple series
  // records for the same real-world series (e.g. CJK variants without brackets).
  for (const b of bookResults) {
    const primary = primarySids(b)
    if (primary.some((id: number) => foundSeriesIds.has(id) || mangaSeriesIds.has(id))) {
      for (const sid of (b.series_ids ?? []) as number[]) foundSeriesIds.add(sid)
    }
  }

  // ── Display filter for explicit modes ───────────────────────────────────
  // Novels (book-series): hide any series the detection flagged as manga.
  // Graphic Novels (manga-series): show everything — user chose this explicitly,
  //   and we can't reliably detect "definitely prose" to exclude.
  // Auto: no filtering, detection drives the type field instead.
  const COMICS_RE = /manga|manhwa|manhua|comics/i

  const displaySeries = filteredSeries.filter((s: any) => {
    if (forceSeriesType !== 'book-series') return true
    const isManga = (s._allIds as number[]).some((id: number) => mangaSeriesIds.has(id))
    return !isManga
  })

  const seriesItems: MediaItem[] = displaySeries.map((s: any) => {
    const isManga =
      forceSeriesType === 'manga-series' ||
      (forceSeriesType === 'auto' && (s._allIds as number[]).some((id: number) => mangaSeriesIds.has(id)))
    return {
      id: `hcseries-${s.id}`,
      title: s.author_name ? `${s.name} — ${s.author_name}` : s.name,
      image: s.author?.image?.url ?? null,
      type: isManga ? 'manga-series' as const : 'book-series' as const,
      release_year: null,
    }
  })

  // Solo books: not part of any series in these results.
  // Deduplicate by title+author to avoid showing multiple editions.
  // For explicit categories, also filter by book genre.
  const seenBookKeys = new Set<string>()
  const soloBooks: MediaItem[] = bookResults
    .filter((b: any) => {
      if ((b.series_ids ?? []).some((id: number) => foundSeriesIds.has(id))) return false
      // Genre gate: in graphic-novel mode keep only comics books (books with no
      // genre info are kept — can't determine). In novel mode exclude comics books.
      if (forceSeriesType !== 'auto') {
        const genres = b.genres ?? []
        const isComics = genres.some((g: string) => COMICS_RE.test(g))
        if (forceSeriesType === 'manga-series' && genres.length > 0 && !isComics) return false
        if (forceSeriesType === 'book-series'  && isComics) return false
      }
      const key = `${(b.title ?? '').toLowerCase()}|${(b.author_names?.[0] ?? '').toLowerCase()}`
      if (seenBookKeys.has(key)) return false
      seenBookKeys.add(key)
      return true
    })
    .map((b: any) => ({
      id: `hcbook-${b.id}`,
      title: b.author_names?.[0]
        ? `${b.title} — ${b.author_names[0]}`
        : b.title,
      image: b.image?.url ?? null,
      type: 'book' as const,
      release_year: b.release_year ?? yearFrom(b.release_date),
    }))

  return [...seriesItems, ...soloBooks]
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

  // ── Book-like categories → Hardcover ─────────────────────────────────────
  // 'book' kept for backward compatibility (auto-detection).
  // Explicit categories bypass detection: the user's choice IS the signal.
  const HARDCOVER_SERIES_TYPE: Record<string, 'auto' | 'manga-series' | 'book-series'> = {
    book:            'auto',          // legacy
    novel:           'book-series',   // Novels (prose: novels, LNs, webnovels)
    'graphic-novel': 'manga-series',  // Graphic Novels (manga, manhwa, manhua, comics)
  }
  if (category in HARDCOVER_SERIES_TYPE) {
    return searchHardcover(q, HARDCOVER_SERIES_TYPE[category])
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
  // ID format: hcseries-{hardcover_series_id}
  const seriesId = parseInt(item.id.replace('hcseries-', ''), 10)

  const data = await hardcoverQuery(`
    query($id: Int!) {
      book_series(
        where: { series_id: { _eq: $id } }
        order_by: { position: asc }
      ) {
        position
        book {
          id
          title
          release_date
          users_count
          compilation
          image { url }
          cached_contributors
        }
      }
    }
  `, { id: seriesId })

  const allBooks: any[] = data?.book_series ?? []

  // Deduplicate: many editions/translations share the same position.
  // Priority: 1) skip compilations/omnibuses, 2) skip non-Latin titles
  // (Japanese, Chinese, Korean, Arabic), 3) prefer highest users_count.
  const NON_LATIN = /[⺀-鿿가-힯豈-﫿]/
  const positionMap = new Map<number, any>()
  for (const bs of allBooks) {
    const pos = bs.position
    if (pos == null || pos <= 0 || pos % 1 !== 0) continue
    if (bs.book.compilation === true) continue
    if (NON_LATIN.test(bs.book.title ?? '')) continue
    const existing = positionMap.get(pos)
    if (!existing || (bs.book.users_count ?? 0) > (existing.book.users_count ?? 0)) {
      positionMap.set(pos, bs)
    }
  }

  return Array.from(positionMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, bs]) => ({
      id: `hcbook-${bs.book.id}`,
      title: bs.book.cached_contributors?.[0]?.name
        ? `${bs.book.title} — ${bs.book.cached_contributors[0].name}`
        : bs.book.title,
      image: bs.book.image?.url ?? null,
      type: 'book' as const,
      release_year: yearFrom(bs.book.release_date),
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
