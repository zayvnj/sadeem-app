import { useStoriesStore } from '@/lib/stores/useStoriesStore'
import { useNavigation } from '@/components/sadeem/navigation-context'
import { useSession } from 'next-auth/react'

export const useStoryNavigation = () => {
  const { setStoryViewerData, setShowStoryUpload } = useNavigation()
  const { fetchStories, stories } = useStoriesStore()
  const { data: session } = useSession()

  const handleAvatarTap = async (userId: string) => {
    // 1. Fetch latest stories for the user (Using React Query from home-feed if possible, but fallback to store here)
    const { getStories } = await import('@/app/actions/story')
    const res = await getStories()

    if (res.success && res.data) {
      const userGroup = res.data.find((g: any) => g.id === userId)

      if (userGroup && userGroup.stories && userGroup.stories.length > 0) {
        // Map stories to match component expected structure
        const formattedStories = userGroup.stories.map((s: any) => ({
          ...s,
          user_id: userId,
          media_url: s.mediaUrl,
          created_at: s.createdAt,
          users: userGroup.user
        }))

        setStoryViewerData({
          stories: formattedStories,
          initialIndex: 0 // Ideally this would be the first unseen index
        })
        return
      }
    }

    // If no stories found
    if (session?.user?.id === userId) {
      setShowStoryUpload(true)
    }
  }

  return { handleAvatarTap }
}
