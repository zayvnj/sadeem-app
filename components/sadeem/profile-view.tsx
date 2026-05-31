"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"

const tabs = [
  { icon: Grid3x3, key: "grid" },
  { icon: Film, key: "reels" },
  { icon: Bookmark, key: "saved" },
]

const settings = [
  { icon: Bell, label: "الإشعارات" },
  { icon: Moon, label: "المظهر الداكن" },
  { icon: Shield, label: "الخصوصية والأمان" },
  { icon: LogOut, label: "تسجيل الخروج" },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 22 } },
}

export function ProfileView() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentUser = auth?.currentUser

  const fetchProfileData = async () => {
    if (!currentUser) return
    try {
      // 1. Fetch Profile Info
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.uid)
        .single()

      if (profileError && profileError.code !== '42P01') console.error('Profile fetch error:', profileError)
      setProfile(profileData)

      // 2. Fetch User Posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', currentUser.uid)
        .order('created_at', { ascending: false })

      if (postsError && postsError.code !== '42P01') console.error('Posts fetch error:', postsError)
      setPosts(postsData || [])
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileData()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const username = profile?.username || currentUser?.email?.split('@')[0] || "مستخدم_سديم"
  const fullName = profile?.full_name || "مستخدم سديم"
  const bio = profile?.bio || "أهلاً بك في حسابي على سديم 🌌"

  const stats = [
    { label: "منشور", value: posts.length.toString() },
    { label: "متابِع", value: (profile?.followers_count || 0).toString() },
    { label: "يتابع", value: (profile?.following_count || 0).toString() },
  ]

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-lg font-bold">@{username}</h2>
        <button aria-label="الإعدادات" className="text-foreground">
          <Settings className="size-6" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 px-4 py-5"
      >
        <div className="rounded-full p-[3px] ring-2 ring-foreground">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
        </div>
        <div className="flex flex-1 justify-around">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="px-4">
        <p className="text-sm font-semibold">{fullName}</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {bio}
        </p>
      </div>

      <div className="flex gap-2 px-4 py-4">
        <button
          className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 active:scale-95 transition-all"
          onClick={async () => {
             const newName = prompt("أدخل الاسم الجديد:", profile?.full_name || "");
             const newBio = prompt("أدخل البايو الجديد:", profile?.bio || "");
             if (newName || newBio) {
                setLoading(true);
                try {
                  await supabase.from('users').update({
                    full_name: newName || profile?.full_name,
                    bio: newBio || profile?.bio
                  }).eq('id', currentUser?.uid);
                  fetchProfileData();
                } catch(e) {
                  console.error(e);
                  setLoading(false);
                }
             }
          }}
        >
          تعديل الملف
        </button>
        <button
          className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-secondary active:scale-95 transition-all"
          onClick={() => {
             navigator.clipboard.writeText(window.location.href);
             alert("تم نسخ رابط الملف الشخصي!");
          }}
        >
          مشاركة الملف
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-y border-border">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            className={`flex flex-1 justify-center py-3 ${i === 0 ? "border-b-2 border-foreground" : "text-muted-foreground"}`}
          >
            <t.icon className="size-5" />
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-0.5 p-0.5 min-h-[300px]">
        {posts.length > 0 ? (
          posts.map((post) => (
            <motion.div
              key={post.id}
              variants={item}
              className="aspect-square bg-gradient-to-br from-muted to-secondary border border-border overflow-hidden"
            >
              {post.media_url && (
                post.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={post.media_url} className="size-full object-cover" />
                ) : (
                  <img src={post.media_url} alt="Post" className="size-full object-cover" />
                )
              )}
            </motion.div>
          ))
        ) : (
          <div className="col-span-3 flex items-center justify-center text-sm text-muted-foreground py-10">
            لا توجد منشورات حتى الآن
          </div>
        )}
      </motion.div>

      {/* Settings list */}
      <div className="mt-4 px-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">الإعدادات</p>
        <div className="overflow-hidden rounded-2xl border border-border">
          {settings.map((s, i) => (
            <button
              key={s.label}
              onClick={s.key === 'logout' ? handleLogout : undefined}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-secondary ${i !== settings.length - 1 ? "border-b border-border" : ""} ${s.key === 'logout' ? 'text-red-500' : ''}`}
            >
              <s.icon className={`size-5 ${s.key === 'logout' ? 'text-red-500' : 'text-muted-foreground'}`} />
              <span className="text-sm">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
