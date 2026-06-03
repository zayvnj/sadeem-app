"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, BadgeCheck, Play } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
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

  const { handleAvatarTap } = useStoryNavigation()
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

  // 1. Fetch current user context
  const { data: userContext } = useQuery({
    queryKey: ['userContext'],
    queryFn: async () => {
      const user = auth?.currentUser
      if (!user) return { user: null, followedIds: [] }

      const { data: userData } = await supabase.from('users').select('avatar_url').eq('id', user.uid).single()
      if (userData?.avatar_url) setCurrentUserAvatar(userData.avatar_url)

      const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', user.uid)
      const followedIds = followsData ? followsData.map(f => f.following_id) : []
      followedIds.push(user.uid)

      const { data: viewedData } = await supabase.from('story_views').select('story_id').eq('user_id', user.uid)
      if (viewedData) setViewedStoryIds(new Set(viewedData.map(v => v.story_id)))

      return { user, followedIds }
    },
    staleTime: 60000,
  })

  // 2. Fetch Stories
  const { data: stories = [], refetch: refetchStories } = useQuery({
    queryKey: ['feed', 'stories'],
    enabled: !!userContext,
    queryFn: async () => {
      const { user, followedIds } = userContext!
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      let storiesQuery = supabase
        .from('stories')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
        .gt('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: true })

      if (user && followedIds.length > 0) {
        storiesQuery = storiesQuery.in('user_id', followedIds)
      }

      const { data: storiesData, error } = await storiesQuery
      if (error && error.code !== '42P01') console.error('Stories fetch error:', error)

      const groupedStories: Record<string, any[]> = {}
      ;(storiesData || []).forEach(story => {
        if (!groupedStories[story.user_id]) groupedStories[story.user_id] = []
        groupedStories[story.user_id].push(story)
      })

      return Object.values(groupedStories).sort((a, b) => {
        const lastStoryA = a[a.length - 1]
        const lastStoryB = b[b.length - 1]
        return new Date(lastStoryB.created_at).getTime() - new Date(lastStoryA.created_at).getTime()
      })
    },
    staleTime: 60000,
  })

  // 3. Fetch Reels (Horizontal top bar)
  const { data: reels = [] } = useQuery({
    queryKey: ['feed', 'reels'],
    enabled: !!userContext,
    queryFn: async () => {
      const { user, followedIds } = userContext!
      let reelsQuery = supabase
        .from('posts')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
        .eq('type', 'reel')
        .order('created_at', { ascending: false })
        .limit(15)

      if (user && followedIds.length > 0) {
        reelsQuery = reelsQuery.in('user_id', followedIds)
      }

      const { data, error } = await reelsQuery
      if (error && error.code !== '42P01') console.error('Reels fetch error:', error)
      return data || []
    },
    staleTime: 60000,
  })

  // 4. Fetch Posts (Infinite Scroll)
  const fetchPostsPage = async ({ pageParam = 0 }) => {
    const { user, followedIds } = userContext!
    const limit = 10

    let postsQuery = supabase
        .from('posts')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified), post_likes(user_id)')
        .eq('type', 'post')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + limit - 1)

    if (user && followedIds.length > 0) {
      postsQuery = postsQuery.in('user_id', followedIds)
    }

    const { data, error } = await postsQuery
    if (error && error.code !== '42P01') console.error('Posts fetch error:', error)

    const formattedPosts = (data || []).map((post: any) => {
      const likesCount = post.post_likes ? post.post_likes.length : 0
      const isLiked = user ? post.post_likes?.some((like: any) => like.user_id === user.uid) : false
      return { ...post, likes_count: likesCount, isLiked }
    })

    return { data: formattedPosts, nextCursor: data?.length === limit ? pageParam + limit : null }
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
    enabled: !!userContext,
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
  const loading = !userContext || postsStatus === 'pending'

  const queryClient = useQueryClient()

  // --- Like Mutation with Optimistic Updates ---
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isNowLiked, user }: { postId: string; isNowLiked: boolean; user: any }) => {
      if (isNowLiked) {
        window.dispatchEvent(new CustomEvent('mascot-action', { detail: 'celebrate' }))
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.uid })
        if (error) throw error
      } else {
        const { error } = await supabase.from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.uid)
        if (error) throw error
      }
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
    const user = auth?.currentUser
    if (!user) {
      alert("يجب تسجيل الدخول للإعجاب")
      return
    }

    const post = posts.find(p => p.id === postId)
    if (!post) return

    const wasLiked = post.isLiked
    if (isDoubleTap && wasLiked) return

    toggleLikeMutation.mutate({ postId, isNowLiked: !wasLiked, user })
  }

  // --- Save Mutation with Optimistic Updates ---
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ postId, isNowSaved, user }: { postId: string; isNowSaved: boolean; user: any }) => {
      if (isNowSaved) {
        const { error } = await supabase.from('saves').insert({ post_id: postId, user_id: user.uid })
        if (error) throw error
      } else {
        const { error } = await supabase.from('saves')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.uid)
        if (error) throw error
      }
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
                (userGroup) => userGroup[0].user_id === storyViewerData.stories[0].user_id
              )

              if (currentUserStoriesIndex >= 0 && currentUserStoriesIndex < stories.length - 1) {
                // Auto-advance to the next user's stories
                const nextUserStories = stories[currentUserStoriesIndex + 1]
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

      {/* Stories */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <StoryUpload
          onUploadComplete={refetchStories}
          userAvatar={currentUserAvatar}
        />

        {stories.map((userStories) => {
          const firstStory = userStories[0]
          const name = firstStory.users?.username || firstStory.users?.full_name || 'مستخدم'

          // Check if all stories from this user are seen
          const allSeen = userStories.every((s: any) => viewedStoryIds.has(s.id))

          return (
            <motion.div
              key={firstStory.user_id}
              variants={item}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
              onClick={() => handleAvatarTap(firstStory.user_id)}
            >
              <div className={`rounded-full p-[3px] ${allSeen ? 'bg-muted' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'}`}>
                <div className="size-16 rounded-full bg-muted flex items-center justify-center overflow-hidden text-lg font-semibold text-muted-foreground border-2 border-background">
                  {firstStory.users?.avatar_url ? (
                    <img src={firstStory.users.avatar_url} alt="Story" className="size-full object-cover" />
                  ) : (
                    name.charAt(0)
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground max-w-16 truncate">{name}</span>
            </motion.div>
          )
        })}
      </motion.div>

      <div className="h-px bg-border" />

      {/* Reels Section (Horizontal UI) */}
      {!loading && reels.length > 0 && (
        <>
          <div className="py-4 pl-4 pr-4 border-b border-border">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Play className="size-4" />
              ريلز
            </h2>
            <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 pb-2">
              {reels.map((reel) => (
                <div
                  key={reel.id}
                  className="relative shrink-0 w-32 aspect-[9/16] rounded-xl overflow-hidden bg-muted cursor-pointer group"
                  onClick={() => {
                     // Normally you would navigate to the reel viewer or switch tabs
                     // Use a global event or another method to communicate tab changes since activeTab is in AppShell
                     window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'reels' }))
                  }}
                >
                  {reel.media_url?.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={reel.media_url} className="size-full object-cover" />
                  ) : (
                    <img src={reel.media_url || ''} alt="Reel thumbnail" className="size-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Play className="size-8 text-white fill-white drop-shadow-md" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                    {reel.users?.avatar_url ? (
                       <img src={reel.users.avatar_url} className="size-5 rounded-full border border-white/50" alt="" />
                    ) : (
                       <div className="size-5 rounded-full bg-white/20 border border-white/50" />
                    )}
                    <span className="text-[10px] text-white font-medium truncate drop-shadow-md">
                      {reel.users?.username || reel.users?.full_name || "مستخدم"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-2 bg-muted/30" />
        </>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col">
          {posts.length > 0 ? posts.map((post, index) => {
            // Apply stagger effect ONLY on the first page load (first 10 items)
            // For subsequent items (infinite scroll), apply a simple fade/slide without staggering
            const isFirstPageItem = index < 10
            return (
            <motion.article
              key={post.id}
              variants={isFirstPageItem ? item : undefined}
              initial={isFirstPageItem ? undefined : { opacity: 0, y: 20 }}
              animate={isFirstPageItem ? undefined : { opacity: 1, y: 0 }}
              transition={isFirstPageItem ? undefined : { type: "spring", stiffness: 260, damping: 26 }}
              className="border-b border-border px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="cursor-pointer"
                  onClick={() => post.user_id && setSelectedUserId(post.user_id)}
                >
                  {post.users?.avatar_url ? (
                    <img src={post.users.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden">
                      {(post.users?.full_name || post.users?.username || 'م').charAt(0)}
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => post.user_id && setSelectedUserId(post.user_id)}
                >
                  <p className="text-sm font-semibold leading-tight flex items-center gap-1">
                    {post.users?.full_name || post.users?.username || 'مستخدم سديم'}
                    {post.users?.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground">@{post.users?.username || post.user_id?.substring(0,6)} · الآن</p>
                </div>
                <button className="text-muted-foreground" aria-label="خيارات">
                  <MoreHorizontal className="size-5" />
                </button>
              </div>

              {post.text && <p className="mt-3 text-sm leading-relaxed text-pretty selectable-text">{post.text}</p>}

              {post.media_url ? (
                <motion.div
                  whileHover={{ opacity: 0.95 }}
                  onDoubleClick={() => handleDoubleTap(post.id)}
                  className="mt-3 aspect-[4/3] w-full rounded-xl border border-border overflow-hidden bg-muted relative select-none cursor-pointer"
                >
                  {post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                     <video src={post.media_url} controls className="size-full object-cover pointer-events-none" />
                  ) : (
                     <img src={post.media_url} alt="Post media" className="size-full object-cover pointer-events-none" />
                  )}

                  {/* Heart Explosion */}
                  <AnimatePresence>
                    {explodingPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.5, type: 'spring', damping: 15 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                      >
                        <Heart className="size-24 fill-white text-white drop-shadow-2xl" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                 <motion.div
                    whileHover={{ opacity: 0.95 }}
                    onDoubleClick={() => handleDoubleTap(post.id)}
                    className="mt-3 aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-muted to-secondary border border-border relative select-none cursor-pointer"
                 >
                   {/* Heart Explosion */}
                   <AnimatePresence>
                     {explodingPostId === post.id && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.5 }}
                         animate={{ opacity: 1, scale: 1.2 }}
                         exit={{ opacity: 0, scale: 1.5 }}
                         transition={{ duration: 0.5, type: 'spring', damping: 15 }}
                         className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                       >
                         <Heart className="size-24 fill-red-500 text-red-500 drop-shadow-2xl" />
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </motion.div>
              )}

              <div className="mt-3 flex items-center gap-5 text-foreground">
                <ActionButton
                  icon={
                    <motion.div
                      animate={post.isLiked ? { scale: [1, 1.2, 1] } : { scale: [1, 0.9, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      <Heart className={`size-5 transition-colors ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </motion.div>
                  }
                  label={post.likes_count?.toString() || "٠"}
                  onClick={() => handleLike(post.id)}
                />
                <ActionButton
                  icon={<MessageCircle className="size-5" />}
                  label={post.comments_count?.toString() || "٠"}
                  onClick={async () => {
                    const text = prompt("أدخل تعليقك:");
                    if (text && text.trim()) {
                      const user = auth?.currentUser;
                      if (!user) return alert("يجب تسجيل الدخول");
                      try {
                         await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.uid, text });
                         queryClient.invalidateQueries({ queryKey: ['feed', 'posts'] });
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
                    const user = auth?.currentUser;
                    if (!user) return alert("يجب تسجيل الدخول");
                    toggleSaveMutation.mutate({ postId: post.id, isNowSaved: !post.isSaved, user });
                  }}
                >
                  <motion.div animate={post.isSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
                    <Bookmark className={`size-5 ${post.isSaved ? 'fill-foreground' : ''}`} />
                  </motion.div>
                </motion.button>
              </div>
            </motion.article>
          )}) : (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد منشورات حتى الآن. كن أول من ينشر!
            </div>
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
