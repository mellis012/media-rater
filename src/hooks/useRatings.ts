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
    parentImage: string | null
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
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,category,item_id' }
      )
      if (error) throw error
    } finally {
      setSaving(false)
    }
  }, [])

  const fetchUserRatings = useCallback(async (userId: string): Promise<Rating[]> => {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [])

  const fetchPublicRatings = useCallback(async (username?: string): Promise<Rating[]> => {
    let query = supabase
      .from('ratings')
      .select('*, profiles(username)')
      .order('updated_at', { ascending: false })

    if (username) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
      if (profile) query = query.eq('user_id', profile.id)
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
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

  return { saving, saveRating, fetchUserRatings, fetchPublicRatings, getUserRatingMap }
}
