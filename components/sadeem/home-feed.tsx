"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, BadgeCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { useNavigation } from "./navigation-context"
import { StoryViewer } from "./story-viewer"
import { StoryUpload } from "./story-upload"
import { useStoryNavigation } from "./story/useStoryNavigation"

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
  const [posts, setPosts] = useState<any[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { setSelectedUserId, storyViewerData, setStoryViewerData } = useNavigation()

  const { handleAvatarTap } = useStoryNavigation()
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

  const fetchFeedData = async () => {
    try {
      const user = auth?.currentUser

      let followedIds: string[] = []

      if (user) {
        // Fetch current user avatar
        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', user.uid)
          .single()

        if (userData?.avatar_url) {
          setCurrentUserAvatar(userData.avatar_url)
        }

        // Fetch users the current user follows
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.uid)

        if (followsData) {
          followedIds = followsData.map(f => f.following_id)
        }
        // Include self
        followedIds.push(user.uid)

        // Fetch viewed stories
        const { data: viewedData } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('user_id', user.uid)

        if (viewedData) {
          setViewedStoryIds(new Set(viewedData.map(v => v.story_id)))
        }
      }

      // Fetch posts
      let postsQuery = supabase
        .from('posts')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified), post_likes(user_id)')
        .order('created_at', { ascending: false })
        .limit(20)

      // If user is logged in, only show their posts and posts of people they follow
      if (user && followedIds.length > 0) {
        postsQuery = postsQuery.in('user_id', followedIds)
      }

      const { data: postsData, error: postsError } = await postsQuery

      if (postsError && postsError.code !== '42P01') console.error('Posts fetch error:', postsError)

      const formattedPosts = (postsData || []).map((post: any) => {
        const likesCount = post.post_likes ? post.post_likes.length : 0
        const isLiked = user ? post.post_likes?.some((like: any) => like.user_id === user.uid) : false

        return {
          ...post,
          likes_count: likesCount,
          isLiked
        }
      })

      // Filter out expired stories (e.g. 24 hours old)
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      let storiesQuery = supabase
        .from('stories')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
        .gt('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: true }) // Grouping will handle recent ordering

      if (user && followedIds.length > 0) {
        storiesQuery = storiesQuery.in('user_id', followedIds)
      }

      const { data: storiesData, error: storiesError } = await storiesQuery

      if (storiesError && storiesError.code !== '42P01') console.error('Stories fetch error:', storiesError)

      // Group stories by user
      const groupedStories: Record<string, any[]> = {}
      ;(storiesData || []).forEach(story => {
        if (!groupedStories[story.user_id]) {
          groupedStories[story.user_id] = []
        }
        groupedStories[story.user_id].push(story)
      })

      // Sort users by their most recent story
      const userStoryGroups = Object.values(groupedStories).sort((a, b) => {
        const lastStoryA = a[a.length - 1]
        const lastStoryB = b[b.length - 1]
        return new Date(lastStoryB.created_at).getTime() - new Date(lastStoryA.created_at).getTime()
      })

      setPosts(formattedPosts)
      setStories(userStoryGroups)
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedData()
  }, [])

  const handleLike = async (postId: string, isDoubleTap = false) => {
    try {
      const user = auth?.currentUser
      if (!user) {
        alert("يجب تسجيل الدخول للإعجاب")
        return
      }

      const postIndex = posts.findIndex(p => p.id === postId)
      if (postIndex === -1) return

      const post = posts[postIndex]
      const wasLiked = post.isLiked

      // Prevent unliking on double-tap
      if (isDoubleTap && wasLiked) return

      const isNowLiked = !wasLiked

      // Optimistic UI Update
      setPosts(current =>
        current.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: isNowLiked,
              likes_count: isNowLiked ? (p.likes_count || 0) + 1 : Math.max(0, (p.likes_count || 1) - 1)
            }
          }
          return p
        })
      )

      if (isNowLiked) {
        // Only celebrate on new like
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

    } catch (error) {
      console.error('Error toggling like:', error)
      fetchFeedData() // Revert on failure by refetching actual state
    }
  }

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
              fetchFeedData() // Refresh to update seen states
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
                fetchFeedData()
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
          onUploadComplete={fetchFeedData}
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

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col">
          {posts.length > 0 ? posts.map((post) => (
            <motion.article key={post.id} variants={item} className="border-b border-border px-4 py-4">
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
                         fetchFeedData();
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
                <button
                  className={`mr-auto text-foreground ${post.isSaved ? 'fill-foreground' : ''}`}
                  aria-label="حفظ"
                  onClick={async () => {
                    const user = auth?.currentUser;
                    if (!user) return alert("يجب تسجيل الدخول");
                    setPosts(current => current.map(p => p.id === post.id ? { ...p, isSaved: !p.isSaved } : p));
                    try {
                      if (!post.isSaved) {
                        await supabase.from('saves').insert({ post_id: post.id, user_id: user.uid });
                      } else {
                        await supabase.from('saves').delete().eq('post_id', post.id).eq('user_id', user.uid);
                      }
                    } catch(e) {
                      console.error(e);
                      fetchFeedData();
                    }
                  }}
                >
                  <Bookmark className={`size-5 ${post.isSaved ? 'fill-foreground' : ''}`} />
                </button>
              </div>
            </motion.article>
          )) : (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد منشورات حتى الآن. كن أول من ينشر!
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
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm"
    >
      {icon}
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </motion.button>
  )
}
