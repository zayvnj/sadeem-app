import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { getUserStories } from '@/app/actions/story_store'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const capacitorStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key: name })
    return value
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await Preferences.set({ key: name, value })
  },
  removeItem: async (name: string): Promise<void> => {
    await Preferences.remove({ key: name })
  },
}

const storage = typeof window !== 'undefined' && !Capacitor.isNativePlatform()
  ? window.localStorage
  : capacitorStorage

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
          const res = await getUserStories(userId)

          if (!res.success) throw new Error(res.error)

          // Merge fetched stories with existing ones
          const currentStories = get().stories.filter(s => s.user_id !== userId)
          const newStories = res.data || []

          set({
            stories: [...(newStories as any[]), ...currentStories],
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
      name: 'sadeem-stories',
      storage: createJSONStorage(() => storage as any)
    }
  )
)
