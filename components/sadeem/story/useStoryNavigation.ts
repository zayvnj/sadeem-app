import { useStoriesStore } from '@/lib/stores/useStoriesStore'
import { useNavigation } from '@/components/sadeem/navigation-context'

export const useStoryNavigation = () => {
  const { setStoryViewerData, setShowStoryUpload } = useNavigation()
  const { fetchStories, stories } = useStoriesStore()

  const handleAvatarTap = async (userId: string) => {
    // 1. Fetch latest stories for the user
    await fetchStories(userId)

    // 2. Check if there are active stories for this user
    // `useStoriesStore.getState().stories` could be used, but since we are in a hook,
    // it's better to just read from the store state using the hook itself to be reactive if needed,
    // however for a simple async callback, accessing the updated state via the hook's returned stories
    // might be stale. We use `useStoriesStore.getState().stories` directly to guarantee freshness.
    const activeStories = useStoriesStore.getState().stories.filter(
      (s) => s.user_id === userId
    )

    if (activeStories.length > 0) {
      // 3. Navigate to story viewer
      // We assume the viewer takes an array of stories grouped by user,
      // or we can pass the exact stories for this user.
      // Since HomeFeed expects an array of stories, we pass it.
      setStoryViewerData({
        stories: activeStories,
        initialIndex: 0 // Ideally we'd calculate first unseen
      })
    } else {
      // 4. Navigate to story editor (upload) if no story exists
      // Ensure we only open upload if we tap our own avatar
      import('@/lib/firebase').then(({ auth }) => {
        if (auth?.currentUser?.uid === userId) {
          setShowStoryUpload(true)
        }
      })
    }
  }

  return { handleAvatarTap }
}
