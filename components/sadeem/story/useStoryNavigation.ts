import { useStoriesStore } from '@/lib/stores/useStoriesStore'
import { useNavigation } from '@/components/sadeem/navigation-context'
import { useSession } from 'next-auth/react'

export const useStoryNavigation = () => {
  const { setStoryViewerData, setShowStoryUpload } = useNavigation()
  const { fetchStories, stories } = useStoriesStore()
  const { data: session } = useSession()

  const handleAvatarTap = async (userId: string) => {
    // 1. Fetch latest stories for the user
    await fetchStories(userId)

    const activeStories = useStoriesStore.getState().stories.filter(
      (s) => s.user_id === userId
    )

    if (activeStories.length > 0) {
      setStoryViewerData({
        stories: activeStories as any[],
        initialIndex: 0
      })
    } else {
      if (session?.user?.id === userId) {
        setShowStoryUpload(true)
      }
    }
  }

  return { handleAvatarTap }
}
