"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2, BadgeCheck, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { useNavigation } from "./navigation-context"
import { StoryViewer } from "./story-viewer"

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
  const [storyViews, setStoryViews] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; initialIndex: number }>({ isOpen: false, initialIndex: 0 })
  const { setSelectedUserId } = useNavigation()

  const fetchFeedData = async () => {
    try {
      const user = auth?.currentUser

      let followedIds: string[] = []

      if (user) {
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

      // Fetch Stories (last 24 hours only)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      let storiesQuery = supabase
        .from('stories')
        .select('*, users:user_id(id, full_name, username, avatar_url, is_verified)')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })

      if (user && followedIds.length > 0) {
        storiesQuery = storiesQuery.in('user_id', followedIds)
      }

      const { data: storiesData, error: storiesError } = await storiesQuery
      if (storiesError && storiesError.code !== '42P01') console.error('Stories fetch error:', storiesError)

      let viewsData: any[] = []
      if (user && storiesData && storiesData.length > 0) {
        const { data: vData } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('viewer_id', user.uid)
          .in('story_id', storiesData.map(s => s.id))
        viewsData = vData || []
      }

      setPosts(formattedPosts)
      setStories(storiesData || [])
      setStoryViews(new Set(viewsData.map(v => v.story_id)))
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
      fetchFeedData()
    }
  }

  const handleStoryUpload = async () => {
    const user = auth?.currentUser
    if (!user) return alert("يجب تسجيل الدخول")

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `stories/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        const { error: insertError } = await supabase.from('stories').insert({
          user_id: user.uid,
          media_url: urlData.publicUrl
        })

        if (insertError) throw insertError

        fetchFeedData() // Refresh stories
      } catch (error) {
        console.error('Error uploading story:', error)
        alert('حدث خطأ أثناء رفع القصة')
      }
    }
    input.click()
  }

  // Keep the viewer logic separated from the reshuffling Home Feed array by freezing the current viewer data context
  // Group stories by user
  const groupedStories = useMemo(() => {
    const user = auth?.currentUser
    const groups = new Map<string, any[]>()

    stories.forEach(story => {
      if (!groups.has(story.user_id)) {
        groups.set(story.user_id, [])
      }
      groups.get(story.user_id)!.push(story)
    })

    const finalGroups: { user_id: string, user: any, stories: any[], allSeen: boolean, latestDate: number }[] = []

    groups.forEach((userStories, userId) => {
      // Check if all stories for this user are seen
      const allSeen = userId === user?.uid ? true : userStories.every(s => storyViews.has(s.id))
      // Sort stories for this user oldest to newest (to view in order)
      const sortedStories = [...userStories].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      finalGroups.push({
        user_id: userId,
        user: sortedStories[0].users,
        stories: sortedStories,
        allSeen,
        latestDate: new Date(sortedStories[sortedStories.length - 1].created_at).getTime()
      })
    })

    // Sort groups: Current user first -> Unseen -> Seen (newest to oldest within groups)
    return finalGroups.sort((a, b) => {
      if (user && a.user_id === user.uid) return -1
      if (user && b.user_id === user.uid) return 1
      if (a.allSeen === b.allSeen) return b.latestDate - a.latestDate
      return a.allSeen ? 1 : -1
    })
  }, [stories, storyViews])

  // Flatten for viewer
  const viewerStories = useMemo(() => {
    return groupedStories.flatMap(g => g.stories)
  }, [groupedStories])

  const [frozenViewerStories, setFrozenViewerStories] = useState<any[]>([])

  const openStoryViewer = (userId: string) => {
    // Freeze the current state of stories so it doesn't shuffle around while the user is viewing
    const currentStories = viewerStories;
    setFrozenViewerStories(currentStories)
    const index = currentStories.findIndex(s => s.user_id === userId)
    if (index !== -1) {
      setViewerState({ isOpen: true, initialIndex: index })
    }
  }

  const currentUserGroup = groupedStories.find(g => g.user_id === auth?.currentUser?.uid)

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
      <AnimatePresence>
        {viewerState.isOpen && (
          <StoryViewer
            stories={frozenViewerStories}
            initialIndex={viewerState.initialIndex}
            onClose={() => setViewerState({ isOpen: false, initialIndex: 0 })}
            onStoryViewed={(storyId) => {
              setStoryViews(prev => {
                const newSet = new Set(prev)
                newSet.add(storyId)
                return newSet
              })
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
        {/* Current User Story Bubble */}
        <motion.div variants={item} className="flex flex-col items-center gap-1.5 shrink-0 relative cursor-pointer">
          <div
             className={`rounded-full p-[2px] ${currentUserGroup ? 'bg-gradient-to-tr from-muted to-muted-foreground' : ''}`}
             onClick={() => currentUserGroup ? openStoryViewer(currentUserGroup.user_id) : handleStoryUpload()}
          >
            <div className="size-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-background">
              {auth?.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Your Story" className="size-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">أنت</span>
              )}
            </div>
          </div>
          {!currentUserGroup && (
             <div
               className="absolute bottom-5 right-0 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-background cursor-pointer shadow-sm"
               onClick={handleStoryUpload}
             >
               <Plus className="size-3" />
             </div>
          )}
          <span className="text-xs text-muted-foreground">قصتك</span>
        </motion.div>

        {groupedStories.filter(g => g.user_id !== auth?.currentUser?.uid).map((group) => {
          const name = group.user?.username || group.user?.full_name || 'مستخدم'
          const ringClass = group.allSeen
             ? 'bg-muted'
             : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500'

          return (
            <motion.div
              key={group.user_id}
              variants={item}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
              onClick={() => openStoryViewer(group.user_id)}
            >
              <div className={`rounded-full p-[2px] ${ringClass}`}>
                <div className="size-16 rounded-full bg-background flex items-center justify-center overflow-hidden border-2 border-background">
                  {group.user?.avatar_url ? (
                    <img src={group.user.avatar_url} alt={name} className="size-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">{name.charAt(0)}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs max-w-16 truncate ${group.allSeen ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                {name}
              </span>
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

              {post.text && <p className="mt-3 text-sm leading-relaxed text-pretty">{post.text}</p>}

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
