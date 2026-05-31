"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Loader2, User, Camera, Trash2, BadgeCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { compressImage } from "@/lib/utils"
import { Preferences } from "@capacitor/preferences"

const tabs = [
  { icon: Grid3x3, key: "grid" },
  { icon: Film, key: "reels" },
  { icon: Bookmark, key: "saved" },
]

const settings = [
  { icon: Bell, label: "الإشعارات", key: "notifications" },
  { icon: Moon, label: "المظهر الداكن", key: "theme" },
  { icon: Shield, label: "الخصوصية والأمان", key: "security" },
  { icon: LogOut, label: "تسجيل الخروج", key: "logout" },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 22 } },
}

const VIP_EMAILS = ['sly86055r@gmail.com', 'zainalabdeensalman123@gmail.com']

export function ProfileView() {
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const currentUser = auth?.currentUser

  // Edit form state
  const [editFullName, setEditFullName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editAvatarRemoved, setEditAvatarRemoved] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfileData = async () => {
    if (!currentUser) return
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.uid)
        .single()

      if (profileError && profileError.code !== '42P01' && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError)
      }
      setProfile(profileData || null)

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

  // Populate edit form when sheet opens
  useEffect(() => {
    if (isEditSheetOpen) {
      const defaultUsername = currentUser?.email?.split('@')[0] || "مستخدم_سديم"
      setEditFullName(profile?.full_name || "")
      setEditUsername(profile?.username || defaultUsername)
      setEditBio(profile?.bio || "")
      setEditAvatarPreview(profile?.avatar_url || null)
      setEditAvatarFile(null)
      setEditAvatarRemoved(false)
      setEditError("")
    }
  }, [isEditSheetOpen, profile, currentUser])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const compressed = await compressImage(file)
      setEditAvatarFile(compressed)
      setEditAvatarPreview(URL.createObjectURL(compressed))
      setEditAvatarRemoved(false)
    }
  }

  const handleRemoveAvatar = () => {
    setEditAvatarFile(null)
    setEditAvatarPreview(null)
    setEditAvatarRemoved(true)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSaveProfile = async () => {
    if (!currentUser) return
    setEditError("")
    setEditLoading(true)

    try {
      const isVIP = currentUser.email ? VIP_EMAILS.includes(currentUser.email) : false

      // Username validation
      const uname = editUsername.trim()
      if (!isVIP && (uname.length < 4 || uname.length > 14)) {
         setEditError("يجب أن يكون اسم المستخدم بين 4 و 14 حرفاً")
         setEditLoading(false)
         return
      }
      if (isVIP && uname.length < 1) {
         setEditError("اسم المستخدم لا يمكن أن يكون فارغاً")
         setEditLoading(false)
         return
      }

      // Check username uniqueness
      if (!profile || uname !== profile.username) {
         const { data: existingUser, error: checkError } = await supabase
           .from('users')
           .select('id')
           .eq('username', uname)
           .neq('id', currentUser.uid)
           .maybeSingle()

         if (existingUser) {
           setEditError("اسم المستخدم هذا مأخوذ، يرجى اختيار اسم آخر")
           setEditLoading(false)
           return
         }
      }

      let avatarUrl = profile?.avatar_url

      if (editAvatarRemoved) {
        avatarUrl = null
      } else if (editAvatarFile) {
        const fileExt = editAvatarFile.name.split('.').pop()
        const fileName = `${currentUser.uid}-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, editAvatarFile, { upsert: true })

        if (uploadError) {
           console.error("Avatar upload error:", uploadError)
           setEditError("حدث خطأ أثناء رفع الصورة الشخصية")
           setEditLoading(false)
           return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        avatarUrl = publicUrl
      }

      const upsertData = {
        id: currentUser.uid,
        email: currentUser.email || "",
        username: uname,
        full_name: editFullName.trim(),
        bio: editBio.trim(),
        avatar_url: avatarUrl,
        is_verified: isVIP ? true : (profile?.is_verified || false)
      }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert(upsertData)

      if (upsertError) {
         console.error("Profile upsert error:", upsertError)
         setEditError("حدث خطأ أثناء حفظ الملف الشخصي: " + upsertError.message)
         setEditLoading(false)
         return
      }

      await fetchProfileData()
      setIsEditSheetOpen(false)
    } catch (e: any) {
      console.error(e)
      setEditError(e.message || "حدث خطأ غير متوقع")
    } finally {
      setEditLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      await Preferences.clear()
      localStorage.clear()
      // AppShell will automatically render AuthView when auth state changes to null
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
  const bio = profile?.bio || "لا يوجد بايو حتى الآن"

  const stats = [
    { label: "منشور", value: posts.length.toString() },
    { label: "متابِع", value: (profile?.followers_count || 0).toString() },
    { label: "يتابع", value: (profile?.following_count || 0).toString() },
  ]

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-lg font-bold flex items-center gap-1">
          @{username}
          {profile?.is_verified && <BadgeCheck className="size-5 text-blue-500" />}
        </h2>

        {/* Settings Dropdown/Sheet could go here, but for now just the icon */}
        <Sheet>
          <SheetTrigger asChild>
            <button aria-label="الإعدادات" className="text-foreground">
              <Settings className="size-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[auto] rounded-t-3xl pb-8" dir="rtl">
            <SheetHeader>
              <SheetTitle>الإعدادات</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-2">
              {settings.map((s, i) => (
                <button
                  key={s.label}
                  onClick={s.key === 'logout' ? handleLogout : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary rounded-xl ${s.key === 'logout' ? 'text-red-500' : ''}`}
                >
                  <s.icon className={`size-5 ${s.key === 'logout' ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 px-4 py-5"
      >
        <div className="rounded-full p-[3px] ring-2 ring-foreground shrink-0">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" />
            ) : (
              <User className="size-10" />
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
        <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 rounded-lg bg-foreground py-2 text-sm font-semibold text-background hover:opacity-90 active:scale-95 transition-all">
              تعديل الملف
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] rounded-t-3xl overflow-y-auto" dir="rtl">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-center">تعديل الملف الشخصي</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group">
                <div className="flex size-24 items-center justify-center rounded-full bg-muted border-2 border-border overflow-hidden">
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="Preview" className="size-full object-cover" />
                  ) : (
                    <User className="size-12 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-foreground text-background p-2 rounded-full shadow-lg"
                >
                  <Camera className="size-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>
              {editAvatarPreview && (
                <button
                  onClick={handleRemoveAvatar}
                  className="text-sm text-red-500 font-medium flex items-center gap-1"
                >
                  <Trash2 className="size-4" /> إزالة الصورة
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">الاسم الكامل</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground transition-all"
                  placeholder="اسمك الكامل"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">اسم المستخدم</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground transition-all"
                  placeholder="username"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">السيرة الذاتية (بايو)</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground transition-all resize-none h-24"
                  placeholder="اكتب شيئاً عن نفسك..."
                />
              </div>

              {editError && (
                <div className="text-sm text-red-500 text-center font-medium p-2 bg-red-500/10 rounded-lg">
                  {editError}
                </div>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="w-full mt-4 rounded-xl bg-foreground py-3.5 text-sm font-bold text-background hover:opacity-90 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {editLoading ? <Loader2 className="size-5 animate-spin" /> : "حفظ التغييرات"}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <button
          className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold hover:bg-secondary active:scale-95 transition-all"
          onClick={() => {
             // Fake share for now
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

      {/* Note: The inline settings list was moved to a sheet attached to the Settings icon on top for a cleaner look */}
    </div>
  )
}
