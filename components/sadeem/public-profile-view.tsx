"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ChevronRight, Grid3x3, Film, Loader2, Heart, ShieldAlert, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-context"
import { getUserProfile, checkFollowStatus, toggleVerification } from "@/app/actions/user"
import { getUserPosts } from "@/app/actions/user"
import { findOrCreateChat } from "@/app/actions/chat"
import { useQueryClient } from "@tanstack/react-query"
import { FollowButton } from "./follow-button"
import { VerifiedBadge } from "./verified-badge"
import { useRouter } from "next/navigation"

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
  const [messageLoading, setMessageLoading] = useState(false)
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowedBy, setIsFollowedBy] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState("grid")
  const { data: session } = useSession()
  const currentUser = session?.user
  const queryClient = useQueryClient()

  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: containerRef })
  const coverY = useTransform(scrollY, [0, 200], [0, 80])

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true)

        // Fetch user profile
        const profileRes = await getUserProfile(userId)
        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data)
          setFollowersCount(profileRes.data.followersCount || 0)
          setFollowingCount(profileRes.data.followingCount || 0)
        }

        // Check if current user is following
        if (currentUser && currentUser.id !== userId) {
          const followRes = await checkFollowStatus(userId)
          if (followRes.success) {
            setIsFollowing(followRes.data!.isFollowing)
            if (followRes.data!.isFollowedBy !== undefined) {
              setIsFollowedBy(followRes.data!.isFollowedBy)
            }
          }
        }

        // Fetch user's posts
        const postsRes = await getUserPosts(userId)
        if (postsRes.success && postsRes.data) {
          setPosts(postsRes.data as any[])
        }

      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [userId, currentUser])

  if (loading) {
    return (
      <div className="absolute inset-0 z-[100] flex flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
            <ChevronRight className="size-6" />
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
      <div className="absolute inset-0 z-[100] flex flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
            <ChevronRight className="size-6" />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          المستخدم غير موجود
        </div>
      </div>
    )
  }

  const username = profile.username || "مستخدم"
  const fullName = profile.fullName || profile.full_name || "مستخدم سديم"
  const bio = profile.bio || ""
  const isVerified = profile.isVerified || profile.is_verified || false

  const handleToggleVerification = async () => {
    try {
      const res = await toggleVerification(userId)
      if (res.success) {
        setProfile((prev: any) => ({ ...prev, isVerified: res.data?.isVerified }))
        toast.success(res.data?.isVerified ? "تم توثيق الحساب" : "تم إلغاء التوثيق")
      } else {
        toast.error(res.error || "حدث خطأ")
      }
    } catch (error) {
      toast.error("حدث خطأ")
    }
  }

  const stats = [
    { label: "منشور", value: posts.length.toString() },
    { label: "متابِع", value: followersCount.toString() },
    { label: "يتابع", value: followingCount.toString() },
  ]

  const isOwnProfile = currentUser?.id === userId

  const handleMessageClick = async () => {
    if (!currentUser) return
    setMessageLoading(true)
    try {
      const res = await findOrCreateChat(userId)
      if (res.success && res.data) {
        // Go to chat tab and explicitly open this chat
        router.push(`?chatId=${res.data.chatId}`)
        window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'chat' }))
        onBack() // Close public profile overlay
      } else {
        toast.error("حدث خطأ أثناء محاولة بدء المحادثة")
      }
    } catch (error) {
      toast.error("حدث خطأ")
    } finally {
      setMessageLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-[100] flex flex-col bg-background overflow-hidden" dir="rtl"
    >

      {/* Scrollable Container with Parallax Cover inside */}
      <div ref={containerRef} className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden relative">

        {/* Parallax Cover Image Area */}
        <div className="absolute top-0 left-0 right-0 h-48 overflow-hidden z-0 pointer-events-none">
          <motion.div style={{ y: coverY }} className="w-full h-full">
            {profile?.coverImage ? (
              <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80" />
            )}
          </motion.div>
          {/* Dynamic Gradient Mask */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        <header className="flex h-14 shrink-0 items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-secondary/50 transition-colors drop-shadow-md bg-background/20 backdrop-blur-sm text-foreground">
              <ChevronRight className="size-6" />
            </button>
            <span className="font-bold flex items-center gap-1 drop-shadow-md">
              {username}
              {isVerified && <VerifiedBadge />}
            </span>
          </div>
          {(currentUser as any)?.role === 'ADMIN' && (
            <button
              onClick={handleToggleVerification}
              className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors drop-shadow-md bg-background/20 backdrop-blur-sm"
              title={isVerified ? "إلغاء التوثيق" : "توثيق الحساب"}
            >
              {isVerified ? <ShieldAlert className="size-5 text-red-500" /> : <ShieldCheck className="size-5 text-blue-500" />}
            </button>
          )}
        </header>

        <div className="flex items-center gap-5 px-4 py-6 relative z-10 mt-16">
          <div className="relative">
            <div className="rounded-full p-[3px] ring-2 ring-border shrink-0">
              <div className="flex size-20 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-foreground overflow-hidden">
                {profile.avatarUrl || profile.avatar_url ? (
                  <img src={profile.avatarUrl || profile.avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  (profile.fullName || profile.full_name || "م").charAt(0)
                )}
              </div>
            </div>
            {profile.lastActive && new Date().getTime() - new Date(profile.lastActive).getTime() < 5 * 60 * 1000 && (
              <div className="absolute bottom-1 left-1 size-4 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div className="flex flex-1 justify-around">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold leading-none text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <h2 className="text-sm font-bold text-foreground">{fullName}</h2>
          {bio && <p className="mt-1 text-sm text-muted-foreground leading-relaxed selectable-text">{bio}</p>}
        </div>

        {!isOwnProfile && (
          <div className="px-4 pb-6 flex gap-2">
            <FollowButton
              userId={userId}
              initialIsFollowing={isFollowing}
              initialIsFollowedBy={isFollowedBy}
              className="flex-1 py-2.5"
              onToggleSuccess={(following) => {
                setFollowersCount(prev => following ? prev + 1 : Math.max(0, prev - 1))
              }}
            />
            <button
              onClick={handleMessageClick}
              disabled={messageLoading}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {messageLoading ? <Loader2 className="size-4 animate-spin" /> : "مراسلة"}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-y border-border">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 justify-center py-3.5 relative transition-colors hover:bg-secondary/50 ${
                activeTab === t.key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <t.icon className={`size-5 transition-transform ${activeTab === t.key ? 'scale-110' : ''}`} />
              {activeTab === t.key && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
                />
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 min-h-[300px]">
          {posts.map((post) => (
            <div
              key={post.id}
              className="aspect-[4/5] rounded-2xl group relative cursor-pointer hover:scale-[0.98] transition-all duration-300 bg-gradient-to-br from-muted to-secondary border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:border-foreground/20"
            >
              {post.media_url && (
                post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={post.media_url} className="size-full object-cover" />
                ) : (
                  <img src={post.media_url} alt="Post" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                )
              )}
              {/* Optional: Add hover overlay with likes/comments count */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                 <span className="flex items-center gap-1"><Heart className="size-4 fill-white" /> {post.likesCount || 0}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="h-20" /> {/* Padding for bottom */}
      </div>
    </motion.div>
  )
}
