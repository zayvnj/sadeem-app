"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { auth } from "../../lib/firebase"

type Post = {
  id: string
  user_id: string
  user_name: string
  user_handle: string
  text: string
  image_url: string | null
  likes: number
  comments: number
  created_at: string
}

type Comment = {
  id: string
  post_id: string
  user_name: string
  text: string
  created_at: string
}

type Story = {
  id: string
  user_id: string
  user_name: string
  image_url: string | null
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 26 } },
}

export function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)

  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newCommentText, setNewCommentText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

      const { data: storiesData, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false })

      if (postsError) throw postsError; if (postsData) setPosts(postsData)
      if (storiesError) throw storiesError; if (storiesData) setStories(storiesData)
    } catch (error) {
      console.error("Error fetching feed:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeed()
  }, [])

  const handleLike = async (postId: string, currentLikes: number) => {
    const user = auth.currentUser
    if (!user) return

    try {
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: currentLikes + 1 } : p))

      const { error } = await supabase
        .from("posts")
        .update({ likes: currentLikes + 1 })
        .eq("id", postId)

      if (error) throw error
    } catch (err) {
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: currentLikes } : p))
    }
  }

  const openComments = async (postId: string) => {
    setActiveCommentPost(postId)
    setLoadingComments(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error && error.code !== '42P01') throw error // Ignore table not found if newly created
      if (data) {
        setComments(prev => ({ ...prev, [postId]: data }))
      }
    } catch (err) {
      console.error("Error fetching comments:", err)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCommentPost || !newCommentText.trim()) return

    const user = auth.currentUser
    if (!user) return

    const userName = user.displayName || "مستخدم"

    try {
       const newComment = {
         post_id: activeCommentPost,
         user_name: userName,
         text: newCommentText
       }

       const { data, error } = await supabase
         .from("comments")
         .insert(newComment)
         .select()
         .single()

       if (error) throw error

       if (data) {
         setComments(prev => ({
           ...prev,
           [activeCommentPost]: [...(prev[activeCommentPost] || []), data]
         }))
         setNewCommentText("")

         const post = posts.find(p => p.id === activeCommentPost)
         if (post) {
           await supabase.from("posts").update({ comments: post.comments + 1 }).eq("id", post.id)
           setPosts(posts.map(p => p.id === post.id ? { ...p, comments: p.comments + 1 } : p))
         }
       }
    } catch (err) {
       console.error("Error adding comment:", err)
    }
  }

  const handleShare = async (text: string, url: string | null) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'منشور سديم',
          text: text,
          url: url || window.location.href,
        })
      } catch (err) {
        console.error("Error sharing:", err)
      }
    } else {
      navigator.clipboard.writeText(url || window.location.href)
      alert("تم نسخ الرابط للمشاركة!")
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
    </div>
  }

  return (
    <div className="pb-4 relative">
      {/* Stories */}
      {stories.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex gap-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <motion.div variants={item} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="rounded-full p-[2px] ring-2 ring-muted">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground relative overflow-hidden">
                {auth.currentUser?.photoURL ? (
                   <img src={auth.currentUser.photoURL} alt="أنت" className="size-full object-cover" />
                ) : "+"}
              </div>
            </div>
            <span className="text-xs text-muted-foreground max-w-16 truncate">قصتك</span>
          </motion.div>

          {stories.map((story) => (
            <motion.div key={story.id} variants={item} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="rounded-full p-[2px] ring-2 ring-foreground">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground overflow-hidden">
                  {story.image_url ? (
                    <img src={story.image_url} alt={story.user_name} className="size-full object-cover" />
                  ) : story.user_name.charAt(0)}
                </div>
              </div>
              <span className="text-xs text-muted-foreground max-w-16 truncate">{story.user_name}</span>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد قصص</div>
      )}

      <div className="h-px bg-border" />

      {/* Posts */}
      {posts.length > 0 ? (
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col">
          {posts.map((post) => (
            <motion.article key={post.id} variants={item} className="border-b border-border px-4 py-4 relative">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden">
                  {post.user_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight">{post.user_name}</p>
                  <p className="text-xs text-muted-foreground">{post.user_handle}</p>
                </div>
                <button className="text-muted-foreground" aria-label="خيارات">
                  <MoreHorizontal className="size-5" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-pretty">{post.text}</p>

              {post.image_url && (
                <motion.div
                  whileHover={{ opacity: 0.95 }}
                  className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted border border-border"
                >
                  <img src={post.image_url} alt="صورة المنشور" className="size-full object-cover" />
                </motion.div>
              )}

              <div className="mt-3 flex items-center gap-5 text-foreground">
                <ActionButton
                  icon={<Heart className="size-5" />}
                  label={post.likes.toString()}
                  onClick={() => handleLike(post.id, post.likes)}
                />
                <ActionButton
                  icon={<MessageCircle className="size-5" />}
                  label={post.comments.toString()}
                  onClick={() => openComments(post.id)}
                />
                <ActionButton
                  icon={<Send className="size-5" />}
                  onClick={() => handleShare(post.text, post.image_url)}
                />
                <button className="mr-auto text-foreground" aria-label="حفظ">
                  <Bookmark className="size-5" />
                </button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      ) : (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">لا توجد منشورات حالياً</div>
      )}

      {/* Comments Modal Overlay */}
      <AnimatePresence>
        {activeCommentPost && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 z-50 bg-background flex flex-col"
          >
             <div className="flex items-center justify-between p-4 border-b border-border bg-card">
               <h3 className="font-bold">التعليقات</h3>
               <button onClick={() => setActiveCommentPost(null)} className="p-1 rounded-full hover:bg-muted">
                 <X className="size-5" />
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
               {loadingComments ? (
                 <div className="flex justify-center py-8">
                   <div className="size-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                 </div>
               ) : (comments[activeCommentPost] || []).length > 0 ? (
                 (comments[activeCommentPost] || []).map(comment => (
                   <div key={comment.id} className="flex gap-3">
                     <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                       {comment.user_name.charAt(0)}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm font-bold">{comment.user_name}</p>
                       <p className="text-sm text-muted-foreground">{comment.text}</p>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-8 text-sm text-muted-foreground">لا توجد تعليقات بعد. كن أول من يعلق!</div>
               )}
             </div>

             <div className="p-4 border-t border-border bg-card">
               <form onSubmit={handleAddComment} className="flex gap-2">
                 <input
                   type="text"
                   value={newCommentText}
                   onChange={(e) => setNewCommentText(e.target.value)}
                   placeholder="اكتب تعليقاً..."
                   className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:border-foreground"
                 />
                 <button
                   type="submit"
                   disabled={!newCommentText.trim()}
                   className="flex items-center justify-center px-4 rounded-full bg-foreground text-background font-semibold text-sm disabled:opacity-50"
                 >
                   إرسال
                 </button>
               </form>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label?: string; onClick?: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.85 }} className="flex items-center gap-1.5 text-sm">
      {icon}
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </motion.button>
  )
}
