import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

export interface Story {
  id: string
  user_id: string // Using user_id to match db schema
  media_url: string
  created_at: string
  users?: {
    id: string
    full_name: string
    username: string
    avatar_url: string
  }
}

interface StoriesState {
  stories: Story[]
  isLoading: boolean
  error: string | null
  fetchStories: (userId: string) => Promise<void>
  addStory: (story: Story) => void
  clearError: () => void
}

export const useStoriesStore = create<StoriesState>()(
  persist(
    (set, get) => ({
      stories: [],
      isLoading: false,
      error: null,
      fetchStories: async (userId) => {
        set({ isLoading: true, error: null })
        try {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data, error } = await supabase
            .from('stories')
            .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
            .eq('user_id', userId)
            .gt('created_at', oneDayAgo)
            .order('created_at', { ascending: false })

          if (error) throw error

          // Merge fetched stories with existing ones (replace logic depending on exact needs, here we just update for the specific user)
          const currentStories = get().stories.filter(s => s.user_id !== userId)
          const newStories = data || []

          set({
            stories: [...newStories, ...currentStories],
            isLoading: false
          })
        } catch (e: any) {
          set({ error: e.message, isLoading: false })
        }
      },
      addStory: (story) => set((s) => ({ stories: [story, ...s.stories] })),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'sadeem-stories'
    }
  )
)
