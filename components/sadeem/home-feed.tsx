"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, BadgeCheck, Play, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { getFeedPosts, getReels, toggleLike } from "@/app/actions/post"
import { getStories } from "@/app/actions/story"
import { useNavigation } from "./navigation-context"
import { StoryViewer } from "./story-viewer"
import { StoryUpload } from "./story-upload"
import { useStoryNavigation } from "./story/useStoryNavigation"
import { useInfiniteQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"

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
  const { setSelectedUserId, storyViewerData, setStoryViewerData } = useNavigation()

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

  // 3. Fetch Posts (Infinite Scroll emulation for local db)
  const fetchPostsPage = async ({ pageParam = 0 }) => {
    const res = await getFeedPosts()
    const allPosts = res.success && Array.isArray(res.data) ? res.data : []

    // Simulate pagination locally since Prisma returns all for now based on following
    const start = pageParam * 10
    const end = start + 10
    const pagedData = allPosts.slice(start, end)

    // Map to expected structure for UI compatibility
    const formattedPosts = pagedData.map(post => ({
      ...post,
      users: post.user,
      likes_count: post.likesCount,
      comments_count: post.commentsCount,
      isLiked: post.isLiked
    }))

    return {
      data: formattedPosts,
      nextCursor: formattedPosts.length === 10 ? pageParam + 10 : null
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
    initialPageParam: 0,
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
      // Placeholder for save mutation via server action if implemented later
      return Promise.resolve()
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

  // Exploding Heart Animation state
  const [explodingPostId, setExplodingPostId] = useState<string | null>(null)

  const handleDoubleTap = (postId: string) => {
    handleLike(postId, true)

    // Trigger animation
    setExplodingPostId(postId)
    setTimeout(() => {
      setExplodingPostId(null)
    }, 800)
  }

  return (
    <div className="pb-4">
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

      {/* Main Feed Content */}
      <div className="px-4 py-6">
        <h1 className="text-[28px] font-black tracking-tight flex flex-col leading-none">
          <span className="text-foreground">مرحباً بعودتك</span>
          {currentUser && (
            <span className="text-muted-foreground mt-1 text-xl flex items-center gap-2">
              <span className="inline-block w-8 h-1 bg-primary rounded-full"></span>
              {currentUser.name || (currentUser as any).fullName || "سديم"}
            </span>
          )}
        </h1>
      </div>

      {/* Stories horizontal scroll */}
      <div className="mb-8 w-full overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm border-2 border-background">
                <span className="text-lg leading-none mt-[-2px]">+</span>
              </div>
            </div>
            <span className="text-xs font-bold text-foreground">أنت</span>
          </button>

          {stories.map((userStories: any, i: number) => {
            const firstStory = userStories[0]
            const user = firstStory.users
            const hasUnseen = userStories.some((s: any) => !viewedStoryIds.has(s.id))

            return (
              <button
                key={i}
                onClick={() => handleAvatarTap(firstStory.user_id)}
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
                      {user?.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 font-medium">@{user?.username}</span>
                  </div>
                </button>
                <button className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
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
                  onDoubleClick={() => handleDoubleTap(post.id)}
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
                <ActionButton
                  icon={<Heart className={`size-6 ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />}
                  label={post.likes_count?.toString()}
                  onClick={() => handleLike(post.id)}
                />
                <ActionButton
                  icon={<MessageCircle className="size-6 text-foreground" />}
                  label={post.comments_count?.toString()}
                  onClick={async () => {
                    const text = prompt("أضف تعليقاً:");
                    if (text && text.trim()) {
                      try {
                         // Implement add comment via server action if needed later
                         alert("تم إضافة التعليق مؤقتا");
                      } catch (e) {
                         console.error(e);
                      }
                    }
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
                  onClick={() => {
                    if (!currentUser) return alert("يجب تسجيل الدخول");
                    toggleSaveMutation.mutate({ postId: post.id, isNowSaved: !post.isSaved, user: currentUser });
                  }}
                >
                  <motion.div animate={post.isSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
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
