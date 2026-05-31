"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"

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
  const [loading, setLoading] = useState(true)

  const fetchFeedData = async () => {
    try {
      // Fetch posts (mock joined with user data for now if tables aren't perfectly set up)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (postsError && postsError.code !== '42P01') console.error('Posts fetch error:', postsError)

      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (storiesError && storiesError.code !== '42P01') console.error('Stories fetch error:', storiesError)

      // Fallback to empty if table doesn't exist yet (42P01 error code)
      setPosts(postsData || [])
      setStories(storiesData || [])
    } catch (error) {
      console.error('Error fetching feed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedData()
  }, [])

  const handleLike = async (postId: string) => {
    try {
      const user = auth?.currentUser
      if (!user) return

      // Optimistic update
      setPosts(current =>
        current.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1, isLiked: true } : p)
      )

      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.uid })
    } catch (error) {
      console.error('Error liking post:', error)
      fetchFeedData() // Revert on failure
    }
  }

  // Generate fallback UI for when there's no data
  const fallbackStories = ["قصتك", "نورة", "سالم", "ليان", "تركي"]
  const displayStories = stories.length > 0 ? stories : fallbackStories

  return (
    <div className="pb-4">
      {/* Stories */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {displayStories.map((story, i) => {
          const name = typeof story === 'string' ? story : 'مستخدم'
          return (
            <motion.div key={typeof story === 'string' ? name : story.id} variants={item} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="rounded-full p-[2px] ring-2 ring-foreground">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center overflow-hidden text-lg font-semibold text-muted-foreground">
                  {typeof story !== 'string' && story.media_url ? (
                    <img src={story.media_url} alt="Story" className="size-full object-cover" />
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
                <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden">
                   {post.user_id?.charAt(0) || 'م'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight">مستخدم سديم</p>
                  <p className="text-xs text-muted-foreground">@{post.user_id?.substring(0,6) || 'user'} · الآن</p>
                </div>
                <button className="text-muted-foreground" aria-label="خيارات">
                  <MoreHorizontal className="size-5" />
                </button>
              </div>

              {post.text && <p className="mt-3 text-sm leading-relaxed text-pretty">{post.text}</p>}

              {post.media_url ? (
                <motion.div
                  whileHover={{ opacity: 0.95 }}
                  className="mt-3 aspect-[4/3] w-full rounded-xl border border-border overflow-hidden bg-muted"
                >
                  {post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                     <video src={post.media_url} controls className="size-full object-cover" />
                  ) : (
                     <img src={post.media_url} alt="Post media" className="size-full object-cover" />
                  )}
                </motion.div>
              ) : (
                 <motion.div
                    whileHover={{ opacity: 0.95 }}
                    className="mt-3 aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-muted to-secondary border border-border"
                 />
              )}

              <div className="mt-3 flex items-center gap-5 text-foreground">
                <ActionButton
                  icon={<Heart className={`size-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />}
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
