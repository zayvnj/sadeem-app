"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, Grid, PlaySquare, BadgeCheck, Loader2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface PublicProfileViewProps {
  userId: string
  onBack: () => void
}

export function PublicProfileView({ userId, onBack }: PublicProfileViewProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts")
  const [posts, setPosts] = useState<any[]>([])
  const [reels, setReels] = useState<any[]>([])
  const [mediaLoading, setMediaLoading] = useState(true)

  const currentUserId = auth?.currentUser?.uid

  useEffect(() => {
    fetchProfileData()
  }, [userId])

  useEffect(() => {
    fetchMediaData()
  }, [userId, activeTab])

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

      // Fetch follows count
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
      if (currentUserId && currentUserId !== userId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUserId)
          .eq("following_id", userId)
          .maybeSingle()

        setIsFollowing(!!followData)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("حدث خطأ أثناء جلب بيانات المستخدم")
    } finally {
      setLoading(false)
    }
  }

  const fetchMediaData = async () => {
    try {
      setMediaLoading(true)
      if (activeTab === "posts") {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .eq("type", "post")
          .order("created_at", { ascending: false })
        if (error) throw error
        setPosts(data || [])
      } else {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .eq("type", "reel")
          .order("created_at", { ascending: false })
        if (error) throw error
        setReels(data || [])
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    } finally {
      setMediaLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      toast.error("يجب تسجيل الدخول أولاً")
      return
    }

    if (currentUserId === userId) return

    const previousState = isFollowing
    setIsFollowing(!previousState)
    setFollowersCount(prev => (previousState ? Math.max(0, prev - 1) : prev + 1))

    try {
      if (previousState) {
        // Unfollow
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", userId)

        if (error) throw error
      } else {
        // Follow
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: userId })

        if (error) throw error
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("فشلت العملية، حاول مرة أخرى")
      // Revert state
      setIsFollowing(previousState)
      setFollowersCount(prev => (previousState ? prev + 1 : Math.max(0, prev - 1)))
    }
  }

  if (loading) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-background">
        <header className="flex h-14 items-center px-4 border-b border-border">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary">
            <ChevronRight className="size-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">المستخدم غير موجود</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">لم يتم العثور على هذا المستخدم.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center bg-background/80 px-4 backdrop-blur-md border-b border-border">
        <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-secondary">
          <ChevronRight className="size-6" />
        </button>
        <h1 className="text-lg font-semibold flex-1 truncate text-center ml-10">
          {profile.username || "مستخدم"}
        </h1>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="size-20 rounded-full object-cover ring-2 ring-border" />
            ) : (
              <div className="size-20 rounded-full bg-secondary flex items-center justify-center text-3xl font-semibold ring-2 ring-border">
                {(profile.full_name || profile.username || 'م').charAt(0)}
              </div>
            )}
            {profile.is_verified && (
              <BadgeCheck className="absolute bottom-0 right-0 size-6 text-blue-500 bg-background rounded-full" />
            )}
          </div>

          <div className="flex flex-1 justify-around text-center">
            <div className="flex flex-col">
              <span className="text-lg font-bold">{posts.length + reels.length}</span>
              <span className="text-xs text-muted-foreground">منشورات</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">{followersCount}</span>
              <span className="text-xs text-muted-foreground">متابعون</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold">{followingCount}</span>
              <span className="text-xs text-muted-foreground">يتابع</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="font-bold">{profile.full_name || profile.username}</h2>
          {profile.bio && <p className="text-sm mt-1 text-pretty">{profile.bio}</p>}
        </div>

        {/* Action Button */}
        {currentUserId !== userId && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleFollowToggle}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                isFollowing
                  ? "bg-secondary text-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isFollowing ? "إلغاء المتابعة" : "متابعة"}
            </button>
            {/* Optional Message Button */}
            <button className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80">
              رسالة
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 flex justify-center py-3 ${activeTab === "posts" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
        >
          <Grid className="size-6" />
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={`flex-1 flex justify-center py-3 ${activeTab === "reels" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
        >
          <PlaySquare className="size-6" />
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 pb-20">
        {mediaLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {activeTab === "posts" && posts.map(post => (
              <div key={post.id} className="aspect-square bg-secondary relative overflow-hidden group">
                {post.media_url ? (
                   post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video src={post.media_url} className="size-full object-cover" />
                  ) : (
                    <img src={post.media_url} alt="" className="size-full object-cover" />
                  )
                ) : (
                  <div className="size-full flex items-center justify-center p-2 text-xs text-center text-muted-foreground line-clamp-3 break-words">
                    {post.text}
                  </div>
                )}
              </div>
            ))}

            {activeTab === "reels" && reels.map(reel => (
              <div key={reel.id} className="aspect-[9/16] bg-black relative overflow-hidden group">
                <video src={reel.media_url} className="size-full object-cover" />
                <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs font-semibold shadow-black drop-shadow-md">
                   <PlaySquare className="size-3 fill-white" />
                   {reel.views_count || 0}
                </div>
              </div>
            ))}

            {((activeTab === "posts" && posts.length === 0) || (activeTab === "reels" && reels.length === 0)) && (
              <div className="col-span-3 py-12 text-center text-sm text-muted-foreground">
                لا يوجد محتوى هنا بعد
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
