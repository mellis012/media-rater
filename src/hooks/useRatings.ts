import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Rating, MediaCategory } from '../types'

export function useRatings() {
  const [saving, setSaving] = useState(false)

  const saveRating = useCallback(async (
    userId: string,
    category: MediaCategory,
    itemId: string,
    title: string,
    rating: number,
    image: string | null,
    parentImage: string | null,
    releaseYear: number | null = null
  ) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ratings').upsert(
        {
          user_id: userId,
          category,
          item_id: itemId,
          title,
          rating,
          image,
          parent_image: parentImage,
          release_year: releaseYear,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category,item_id' }
      )
      if (error) throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteRating = useCallback(async (ratingId: string) => {
    const { error } = await supabase.from('ratings').delete().eq('id', ratingId)
    if (error) throw error
  }, [])

  const fetchUserRatings = useCallback(async (userId: string): Promise<Rating[]> => {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .order('rating', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [])

  const fetchPublicRatings = useCallback(async (username?: string): Promise<Rating[]> => {
    let userIdFilter: string | undefined
    if (username) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (!profile) return []
      userIdFilter = profile.id
    }

    let query = supabase
      .from('ratings')
      .select('*')
      .order('updated_at', { ascending: false })

    if (userIdFilter) query = query.eq('user_id', userIdFilter)

    const { data: ratingsData, error } = await query
    if (error) throw error
    if (!ratingsData?.length) return []

    const uniqueIds = [...new Set(ratingsData.map(r => r.user_id))]
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueIds)

    const profileMap = new Map((profilesData ?? []).map(p => [p.id, p.username]))

    return ratingsData.map(r => ({
      ...r,
      profiles: profileMap.has(r.user_id) ? { username: profileMap.get(r.user_id)! } : undefined,
    }))
  }, [])

  const getUserRatingMap = useCallback(async (userId: string): Promise<Map<string, number>> => {
    const { data } = await supabase
      .from('ratings')
      .select('category, item_id, rating')
      .eq('user_id', userId)
    const map = new Map<string, number>()
    for (const r of data ?? []) {
      map.set(`${r.category}:${r.item_id}`, r.rating)
    }
    return map
  }, [])

  return { saving, saveRating, deleteRating, fetchUserRatings, fetchPublicRatings, getUserRatingMap }
}
