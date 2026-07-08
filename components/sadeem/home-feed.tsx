"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, BadgeCheck, Play, Sparkles } from "lucide-react"
import { useSession } from "@/lib/auth-context"
import { getFeedPosts, getExploreFeed, getReels, toggleLike } from "@/app/actions/post"
import { getStories } from "@/app/actions/story"
import { useNavigation } from "./navigation-context"
import { StoryViewer } from "./story-viewer"
import { StoryUpload } from "./story-upload"
import { useStoryNavigation } from "./story/useStoryNavigation"
import { LikesSheet } from "./likes-sheet"
import { CommentsSheet } from "./comments-sheet"
import { PostOptionsSheet } from "./post-options-sheet"
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { VerifiedBadge } from "./verified-badge"
import { useInView } from "react-intersection-observer"
import { toast } from "sonner"
import { FullScreenImageViewer } from "./full-screen-image-viewer"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 26 } },
}

export function HomeFeed() {
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set())
  const { setSelectedUserId, storyViewerData, setStoryViewerData, setShowStoryUpload, setShowMediaStudio } = useNavigation()

  const { data: session } = useSession()
  const currentUser = session?.user

  const { handleAvatarTap } = useStoryNavigation()
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.image) {
      setCurrentUserAvatar(currentUser.image as string)
    }
  }, [currentUser])

  // 1. Fetch Stories
  const { data: stories = [], refetch: refetchStories } = useQuery({
    queryKey: ['feed', 'stories'],
    enabled: !!currentUser,
    queryFn: async () => {
      const res = await getStories()
      return res.success ? res.data : []
    },
    staleTime: 60000,
  })

  // 2. Fetch Reels (Horizontal top bar)
  const { data: reels = [] } = useQuery({
    queryKey: ['feed', 'reels'],
    enabled: !!currentUser,
    queryFn: async () => {
      const res = await getReels()
      return res.success ? res.data : []
    },
    staleTime: 60000,
  })

  // 3. Fetch Posts (Infinite Scroll DB Pagination)
  const fetchPostsPage = async ({ pageParam }: { pageParam?: string }) => {
    // If we are already paginating the fallback explore feed, just fetch explore feed
    const isFetchingExplore = pageParam?.startsWith('explore_');
    const actualCursor = isFetchingExplore ? pageParam.replace('explore_', '') : pageParam;

    let res = isFetchingExplore ? await getExploreFeed(actualCursor) : await getFeedPosts(actualCursor)
    let allPosts = res.success && Array.isArray(res.data) ? res.data : []
    let nextCursor = res.success ? (res as any).nextCursor : null

    // If the feed is empty (on first page), fallback to explore feed
    if (allPosts.length === 0 && !pageParam) {
      res = await getExploreFeed(actualCursor)
      allPosts = res.success && Array.isArray(res.data) ? res.data : []
      nextCursor = res.success ? (res as any).nextCursor : null
      // Note: we can add a flag to indicate these are suggested posts
      allPosts = allPosts.map(post => ({ ...post, isSuggested: true }))
    } else if (isFetchingExplore) {
      allPosts = allPosts.map(post => ({ ...post, isSuggested: true }))
    }

    // Wrap cursor to indicate it belongs to the explore feed if we are in fallback mode
    if (nextCursor && (isFetchingExplore || (allPosts.length > 0 && allPosts[0].isSuggested))) {
        nextCursor = `explore_${nextCursor}`
    }

    // Map to expected structure for UI compatibility
    const formattedPosts = allPosts.map(post => ({
      ...post,
      users: post.user,
      likes_count: post.likesCount,
      comments_count: post.commentsCount,
      isLiked: post.isLiked
    }))

    return {
      data: formattedPosts,
      nextCursor: nextCursor
    }
  }

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: postsStatus
  } = useInfiniteQuery({
    queryKey: ['feed', 'posts'],
    queryFn: fetchPostsPage,
    enabled: !!currentUser,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 60000,
  })

  const { ref: loadMoreRef, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  const posts = postsData?.pages.flatMap(page => page.data) || []
  const loading = !currentUser || postsStatus === 'pending'

  const queryClient = useQueryClient()

  // --- Like Mutation with Optimistic Updates ---
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isNowLiked, user }: { postId: string; isNowLiked: boolean; user: any }) => {
      if (isNowLiked) {
        window.dispatchEvent(new CustomEvent('mascot-action', { detail: 'celebrate' }))
      }
      const res = await toggleLike(postId)
      if (!res.success) throw new Error(res.error)
    },
    onMutate: async ({ postId, isNowLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed', 'posts'] })
      const previousPosts = queryClient.getQueryData(['feed', 'posts'])

      queryClient.setQueryData(['feed', 'posts'], (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) => {
              if (post.id === postId) {
                return {
                  ...post,
                  isLiked: isNowLiked,
                  likes_count: isNowLiked ? (post.likes_count || 0) + 1 : Math.max(0, (post.likes_count || 1) - 1)
                }
              }
              return post
            })
          }))
        }
      })
      return { previousPosts }
    },
    onError: (err, variables, context: any) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['feed', 'posts'], context.previousPosts)
      }
      console.error('Error toggling like:', err)
    },
    onSettled: () => {
      // Background re-fetch to ensure sync without disrupting UI
      queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] })
    }
  })

  const handleLike = (postId: string, isDoubleTap = false) => {
    if (!currentUser) {
      alert("يجب تسجيل الدخول للإعجاب")
      return
    }

    const post = posts.find(p => p.id === postId)
    if (!post) return

    const wasLiked = post.isLiked
    if (isDoubleTap && wasLiked) return

    toggleLikeMutation.mutate({ postId, isNowLiked: !wasLiked, user: currentUser })
  }

  // --- Save Mutation with Optimistic Updates ---
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ postId, isNowSaved, user }: { postId: string; isNowSaved: boolean; user: any }) => {
      const { toggleSave } = await import("@/app/actions/post")
      const res = await toggleSave(postId)
      if (!res.success) throw new Error(res.error)
    },
    onMutate: async ({ postId, isNowSaved }) => {
      await queryClient.cancelQueries({ queryKey: ['feed', 'posts'] })
      const previousPosts = queryClient.getQueryData(['feed', 'posts'])

      queryClient.setQueryData(['feed', 'posts'], (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) => {
              if (post.id === postId) {
                return { ...post, isSaved: isNowSaved }
              }
              return post
            })
          }))
        }
      })
      return { previousPosts }
    },
    onError: (err, variables, context: any) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['feed', 'posts'], context.previousPosts)
      }
      console.error('Error toggling save:', err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] })
    }
  })

  const handleSave = (e: React.MouseEvent, postId: string) => {
    e.stopPropagation()
    if (!currentUser) {
      toast.error("يجب تسجيل الدخول للحفظ")
      return
    }
    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      toggleSaveMutation.mutate({ postId, isNowSaved: !post.isSaved, user: currentUser })
      if (!post.isSaved) {
        toast.success("تم الحفظ بنجاح")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("حدث خطأ أثناء الحفظ")
    }
  }

  // Exploding Heart Animation state
  const [explodingPostId, setExplodingPostId] = useState<string | null>(null)

  // Likes Sheet State
  const [activeLikesPostId, setActiveLikesPostId] = useState<string | null>(null)
  const likesPressTimer = useRef<NodeJS.Timeout | null>(null)

  const handleLikePointerDown = (postId: string) => {
    likesPressTimer.current = setTimeout(() => {
      setActiveLikesPostId(postId)
      likesPressTimer.current = null
    }, 500) // 500ms for long press
  }

  const handleLikePointerUp = (postId: string) => {
    if (likesPressTimer.current) {
      clearTimeout(likesPressTimer.current)
      likesPressTimer.current = null
      handleLike(postId)
    }
  }

  // Comments Sheet State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null)
  const [activeCommentsPostOwnerId, setActiveCommentsPostOwnerId] = useState<string | null>(null)

  // Options Sheet State
  const [activeOptionsPost, setActiveOptionsPost] = useState<any | null>(null)

  // Lightbox State
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null)

  // Debounce click handler state
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleImageTap = (postId: string, mediaUrl: string) => {
    if (clickTimeoutRef.current) {
      // Double tap detected
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null

      handleLike(postId, true)
      setExplodingPostId(postId)
      setTimeout(() => {
        setExplodingPostId(null)
      }, 800)
    } else {
      // First tap detected, wait to see if it's a double tap
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null
        // Single tap action
        setActiveLightboxImage(mediaUrl)
      }, 300) // 300ms delay for double tap detection
    }
  }

  // Pull to refresh
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dragY, setDragY] = useState(0)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] }),
      queryClient.invalidateQueries({ queryKey: ['feed', 'stories'] }),
      queryClient.invalidateQueries({ queryKey: ['feed', 'reels'] })
    ])
    setIsRefreshing(false)
    setDragY(0)
  }

  return (
    <div className="pb-4 h-full relative overflow-hidden flex flex-col">
      <StoryUpload
        onUploadComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['feed', 'stories'] })
        }}
        userAvatar={currentUserAvatar}
      />
      <FullScreenImageViewer
        imageUrl={activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
      />

      {/* Story Viewer Overlay */}
      <AnimatePresence>
        {storyViewerData && (
          <StoryViewer
            stories={storyViewerData.stories}
            initialStoryIndex={storyViewerData.initialIndex}
            onClose={() => {
              setStoryViewerData(null)
              refetchStories() // Refresh to update seen states
            }}
            onComplete={() => {
              // Find the index of the current user's stories in the main stories array
              const currentUserStoriesIndex = stories.findIndex(
                (userGroup: any) => userGroup[0].user_id === storyViewerData.stories[0].user_id
              )

              if (currentUserStoriesIndex >= 0 && currentUserStoriesIndex < stories.length - 1) {
                // Auto-advance to the next user's stories
                const nextUserStories = stories[currentUserStoriesIndex + 1] as any[]
                const firstUnseenIndex = nextUserStories.findIndex((s: any) => !viewedStoryIds.has(s.id))

                setStoryViewerData({
                  stories: nextUserStories,
                  initialIndex: firstUnseenIndex >= 0 ? firstUnseenIndex : 0
                })
              } else {
                // We reached the end of all stories, close viewer
                setStoryViewerData(null)
                refetchStories()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Pull to refresh indicator - Moved z-index logic so it doesn't block interactions when idle */}
      <motion.div
        className={`absolute top-0 left-0 right-0 flex justify-center pointer-events-none ${
          isRefreshing || dragY > 0 ? 'z-50 opacity-100' : '-z-10 opacity-0'
        }`}
        animate={{ y: isRefreshing ? 20 : (dragY > 0 ? Math.max(0, dragY - 40) : -40) }}
        initial={{ y: -40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="bg-background shadow-md rounded-full p-2 mt-4">
          <Loader2 className={`size-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${dragY * 2}deg)` }} />
        </div>
      </motion.div>

      {/* Main Feed Content */}
      <motion.div
        className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDrag={(e, info) => {
          // Only allow dragging down when at the top of the scroll container
          const target = e.target as HTMLElement;
          const scrollContainer = target.closest('.overflow-y-auto');

          if (scrollContainer && scrollContainer.scrollTop === 0 && info.offset.y > 0) {
             setDragY(info.offset.y)
          } else {
             setDragY(0)
          }
        }}
        onDragEnd={(e, info) => {
          if (dragY > 100 && !isRefreshing) {
            handleRefresh()
          } else {
            setDragY(0)
          }
        }}
        animate={{ y: isRefreshing ? 60 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >

      {/* Stories horizontal scroll */}
      <div className="mb-8 mt-6 w-full overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-4">
          <button
            onClick={() => handleAvatarTap(currentUser?.id || '')}
            className="flex flex-col items-center gap-2 shrink-0 group w-[72px]"
          >
            <div className="relative">
              <div className="flex size-[72px] items-center justify-center rounded-full bg-secondary transition-transform group-hover:scale-95 group-active:scale-90 border-2 border-border overflow-hidden">
                {currentUserAvatar ? (
                  <img src={currentUserAvatar} alt="My Avatar" className="size-full object-cover" />
                ) : (
                  <Heart className="size-8 text-muted-foreground" />
                )}
              </div>
              <div
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm border-2 border-background cursor-pointer z-20 pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMediaStudio(true);
                }}
              >
                <span className="text-lg leading-none mt-[-2px]">+</span>
              </div>
            </div>
            <span className="text-xs font-bold text-foreground">أنت</span>
          </button>

          {stories.map((userGroup: any, i: number) => {
            const firstStory = userGroup.stories?.[0] || userGroup[0] // handle potential nested structure
            if (!firstStory) return null;

            const user = userGroup.user || firstStory.users

            // Check both local seen state and backend state
            const hasUnseen = userGroup.hasUnseen !== undefined
              ? userGroup.hasUnseen && !userGroup.stories.every((s:any) => viewedStoryIds.has(s.id))
              : userGroup.some((s: any) => !viewedStoryIds.has(s.id))

            return (
              <button
                key={i}
                onClick={() => handleAvatarTap(userGroup.id || firstStory.user_id)}
                className="flex flex-col items-center gap-2 shrink-0 group w-[72px]"
              >
                <div
                  className={`rounded-full p-[3px] transition-transform group-hover:scale-95 group-active:scale-90 ${
                    hasUnseen ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500" : "bg-border"
                  }`}
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-background overflow-hidden border-2 border-background">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full bg-secondary flex items-center justify-center font-bold text-foreground text-xl">
                        {(user?.full_name || user?.username || "م").charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold text-foreground truncate w-full px-1">
                  {user?.full_name?.split(' ')[0] || user?.username}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">

          {/* Inline Reels Bar (if available) */}
          {reels.length > 0 && (
             <div className="mb-2">
               <div className="px-4 mb-3 flex items-center justify-between">
                 <h2 className="font-bold text-lg flex items-center gap-2">
                   <Play className="size-5 text-primary fill-primary" /> ريلز
                 </h2>
                 <button className="text-sm text-primary font-semibold hover:underline">عرض الكل</button>
               </div>
               <div className="w-full overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                 <div className="flex gap-3">
                   {reels.map((reel: any) => (
                     <div key={reel.id} className="relative w-[140px] h-[220px] rounded-2xl overflow-hidden shrink-0 bg-secondary group cursor-pointer shadow-sm border border-border/50">
                        {reel.media_url && (
                          <video src={reel.media_url} className="size-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute bottom-2 left-2 right-2 text-white flex flex-col gap-1">
                          <span className="text-xs font-bold truncate">@{reel.users?.username}</span>
                          <span className="text-[10px] flex items-center gap-1 opacity-90">
                            <Play className="size-3" /> {reel.likes_count || 0}
                          </span>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
          )}

          {posts.length > 0 && posts[0]?.isSuggested && (
            <div className="px-4 pb-2 mb-2">
              <div className="bg-secondary/50 rounded-xl p-4 flex flex-col items-center text-center gap-2 border border-border">
                <Sparkles className="size-8 text-primary" />
                <h3 className="font-bold text-foreground">مرحباً بك في سديم!</h3>
                <p className="text-sm text-muted-foreground">أنت لا تتابع أحداً بعد. إليك بعض المنشورات المقترحة لك، قم بمتابعة بعض الأشخاص لملء يومياتك.</p>
              </div>
            </div>
          )}
          {posts.length > 0 ? posts.map((post: any) => {
            const user = post.users

            return (
            <motion.article key={post.id} variants={item} className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between px-4">
                <button
                  className="flex items-center gap-3 group text-right"
                  onClick={() => setSelectedUserId(post.user_id)}
                >
                  <div className="size-11 rounded-full bg-secondary overflow-hidden border border-border group-active:scale-95 transition-transform flex items-center justify-center font-bold text-foreground">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      (user?.full_name || user?.username || "م").charAt(0)
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] leading-none group-hover:underline flex items-center gap-1">
                      {user?.full_name || user?.username}
                      {user?.isVerified && <VerifiedBadge />}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 font-medium">@{user?.username}</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveOptionsPost(post)}
                  className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors"
                >
                  <MoreHorizontal className="size-5 text-muted-foreground" />
                </button>
              </div>

              {post.text && (
                <p className="px-4 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap selectable-text">
                  {post.text}
                </p>
              )}

              {post.media_url && (
                <div
                  className="relative aspect-square w-full sm:rounded-3xl overflow-hidden bg-secondary border-y sm:border border-border cursor-pointer select-none"
                  onClick={() => handleImageTap(post.id, post.media_url)}
                >
                  <AnimatePresence>
                    {explodingPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                        animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                        exit={{ opacity: 0, scale: 2, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, type: 'spring', damping: 12 }}
                        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                      >
                        <Heart className="size-32 text-white drop-shadow-2xl fill-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {post.type === 'gallery' && post.gallery ? (
                    <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {post.gallery.map((img: string, i: number) => (
                         <img key={i} src={img} alt="" className="w-full h-full object-cover shrink-0 snap-center" loading="lazy" />
                      ))}
                      <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-md font-bold">
                        1/{post.gallery.length}
                      </div>
                    </div>
                  ) : post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={post.media_url} className="size-full object-cover" controls preload="metadata" />
                  ) : (
                    <img src={post.media_url} alt="Post media" className="size-full object-cover pointer-events-none" loading="lazy" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-5 px-4 pt-1 pb-2">
                <div
                  className="flex items-center gap-1.5 active:opacity-50 transition-opacity touch-none cursor-pointer"
                  onPointerDown={() => handleLikePointerDown(post.id)}
                  onPointerUp={() => handleLikePointerUp(post.id)}
                  onPointerLeave={() => {
                    if (likesPressTimer.current) {
                      clearTimeout(likesPressTimer.current)
                      likesPressTimer.current = null
                    }
                  }}
                >
                  <Heart className={`size-6 ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
                  <span className="text-sm font-bold text-foreground">
                    {post.likes_count || 0}
                  </span>
                </div>

                <ActionButton
                  icon={<MessageCircle className="size-6 text-foreground" />}
                  label={post.comments_count?.toString()}
                  onClick={() => {
                    setActiveCommentsPostId(post.id)
                    setActiveCommentsPostOwnerId(post.user_id)
                  }}
                />
                <ActionButton
                  icon={<Send className="size-5" />}
                  onClick={() => {
                     alert("تمت المشاركة بنجاح!");
                     // In a real app, open a share sheet or copy link
                     navigator.clipboard.writeText(window.location.href).catch(() => {});
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  className={`mr-auto text-foreground ${post.isSaved ? 'fill-foreground' : ''}`}
                  aria-label="حفظ"
                  onClick={(e: React.MouseEvent) => handleSave(e, post.id)}
                >
                  <motion.div animate={post.isSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                    <Bookmark className={`size-5 ${post.isSaved ? 'fill-foreground' : ''}`} />
                  </motion.div>
                </motion.button>
              </div>
            </motion.article>
          )}) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', damping: 20 }}
              className="py-24 flex flex-col items-center justify-center text-center px-6"
            >
              <div className="size-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <Sparkles className="size-10 text-primary animate-pulse" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">لا توجد منشورات.</h3>
              <p className="text-muted-foreground max-w-sm">
                ابدأ بمتابعة الأشخاص أو انشر شيئاً جديداً!
              </p>
            </motion.div>
          )}

          {/* Infinite Scroll trigger area */}
          {!loading && hasNextPage && (
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <div className="h-6" /> /* Spacing for the observer */
              )}
            </div>
          )}
        </motion.div>
      )}

        <LikesSheet
          postId={activeLikesPostId}
          isOpen={!!activeLikesPostId}
          onClose={() => setActiveLikesPostId(null)}
        />

        <CommentsSheet
          postId={activeCommentsPostId}
          postOwnerId={activeCommentsPostOwnerId}
          isOpen={!!activeCommentsPostId}
          onClose={() => {
            setActiveCommentsPostId(null)
            setActiveCommentsPostOwnerId(null)
          }}
        />

      <PostOptionsSheet
        post={activeOptionsPost}
        isOpen={!!activeOptionsPost}
        onClose={() => setActiveOptionsPost(null)}
      />
      </motion.div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label?: string; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm"
    >
      {icon}
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </motion.button>
  )
}
