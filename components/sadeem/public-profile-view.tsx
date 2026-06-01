"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronRight, Grid3x3, Film, Loader2, BadgeCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { auth } from "@/lib/firebase"

interface PublicProfileViewProps {
  userId: string
  onBack: () => void
}

const tabs = [
  { icon: Grid3x3, key: "grid", label: "منشورات" },
  { icon: Film, key: "reels", label: "ريلز" },
]

export function PublicProfileView({ userId, onBack }: PublicProfileViewProps) {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState("grid")
  const currentUser = auth?.currentUser

  const fetchProfileData = async () => {
    try {
      setLoading(true)

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (userError) throw userError
      setProfile(userData)

      // Fetch follow stats
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)

      setFollowersCount(followers || 0)
      setFollowingCount(following || 0)

      // Check if current user is following
      if (currentUser && currentUser.uid !== userId) {
        const { data: followData, error: followError } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", currentUser.uid)
          .eq("following_id", userId)
          .maybeSingle()

        if (followError && followError.code !== "PGRST116") {
          console.error("Error fetching follow status:", followError)
        }

        setIsFollowing(!!followData)
      }

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (postsError && postsError.code !== "42P01") throw postsError
      setPosts(postsData || [])

    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [userId])

  const handleFollowToggle = async () => {
    if (!currentUser) {
      alert("يجب تسجيل الدخول")
      return
    }

    const previousIsFollowing = isFollowing
    const previousFollowersCount = followersCount

    // Optimistic UI update
    setIsFollowing(!previousIsFollowing)
    setFollowersCount(c => previousIsFollowing ? Math.max(0, c - 1) : c + 1)

    try {
      if (previousIsFollowing) {
        // Unfollow background request
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.uid)
          .eq("following_id", userId)

        if (error) throw error
      } else {
        // Follow background request
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUser.uid, following_id: userId })

        if (error) throw error
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      toast.error(error.message || "حدث خطأ أثناء تغيير حالة المتابعة")

      // Revert local state on error without triggering a full reload
      setIsFollowing(previousIsFollowing)
      setFollowersCount(previousFollowersCount)
    }
  }

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-background">
        <header className="flex shrink-0 items-center px-4 py-3 border-b border-border">
          <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors" aria-label="رجوع">
             <ChevronRight className="size-6 text-foreground" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-background">
        <header className="flex shrink-0 items-center px-4 py-3 border-b border-border">
          <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors" aria-label="رجوع">
             <ChevronRight className="size-6 text-foreground" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          المستخدم غير موجود
        </div>
      </div>
    )
  }

  const filteredPosts = posts.filter(post =>
    activeTab === "grid" ? post.type !== "reel" : post.type === "reel"
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex flex-col bg-background overflow-hidden"
    >
      <header className="flex shrink-0 items-center gap-4 px-4 py-3 border-b border-border">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors" aria-label="رجوع">
          <ChevronRight className="size-6 text-foreground" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-1">
          {profile.username || profile.full_name}
          {profile.is_verified && <BadgeCheck className="size-5 text-blue-500" />}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-20 rounded-full object-cover ring-2 ring-background" />
              ) : (
                <div className="size-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground ring-2 ring-background overflow-hidden">
                  {(profile.full_name || profile.username || 'م').charAt(0)}
                </div>
              )}
            </div>

            <div className="flex flex-1 items-center justify-around px-6 text-center">
              <div>
                <div className="text-xl font-bold">{posts.length}</div>
                <div className="text-xs text-muted-foreground">منشورات</div>
              </div>
              <div>
                <div className="text-xl font-bold">{followersCount}</div>
                <div className="text-xs text-muted-foreground">متابعون</div>
              </div>
              <div>
                <div className="text-xl font-bold">{followingCount}</div>
                <div className="text-xs text-muted-foreground">يتابع</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h2 className="font-bold text-foreground flex items-center gap-1">
              {profile.full_name}
              {profile.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
            </h2>
            {profile.bio && <p className="mt-1 text-sm text-foreground text-pretty">{profile.bio}</p>}
          </div>

          {currentUser?.uid !== userId && (
            <div className="mt-6">
              <button
                onClick={handleFollowToggle}
                className={`w-full py-2 px-4 rounded-xl font-bold text-sm transition-colors ${
                  isFollowing
                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isFollowing ? "إلغاء المتابعة" : "متابعة"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`size-5 ${isActive ? "fill-foreground" : ""}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 h-0.5 w-16 bg-foreground"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-0.5 mt-0.5 pb-20">
          {filteredPosts.map((post) => (
            <div key={post.id} className="aspect-square bg-muted relative">
              {post.media_url ? (
                post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={post.media_url} className="size-full object-cover" />
                ) : (
                  <img src={post.media_url} alt="" className="size-full object-cover" />
                )
              ) : (
                <div className="size-full flex flex-col p-2 text-xs text-muted-foreground overflow-hidden">
                  <p className="line-clamp-4">{post.text}</p>
                </div>
              )}
            </div>
          ))}
          {filteredPosts.length === 0 && (
            <div className="col-span-3 py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Grid3x3 className="size-12 opacity-20" />
              <p className="text-sm">لا توجد {activeTab === "grid" ? "منشورات" : "ريلز"} بعد</p>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  )
}
