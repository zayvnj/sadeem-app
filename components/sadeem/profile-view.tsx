"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Loader2, User, Camera, Trash2, BadgeCheck, X, ChevronLeft, UserX } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { getUserProfile, updateUserProfile, getUserPosts, deleteUserAccount, getSavedPosts } from "@/app/actions/user"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { compressImage } from "@/lib/utils"
import { Preferences } from "@capacitor/preferences"
import { useTheme } from "next-themes"
import { useStoryNavigation } from "./story/useStoryNavigation"

const tabs = [
  { icon: Grid3x3, key: "grid" },
  { icon: Film, key: "reels" },
  { icon: Bookmark, key: "saved" },
]


const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
}

export function ProfileView() {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("grid")
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  const [editFullName, setEditFullName] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editBio, setEditBio] = useState("")
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editAvatarRemoved, setEditAvatarRemoved] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState([
    { label: "منشور", value: 0 },
    { label: "متابِع", value: 0 },
    { label: "يتابع", value: 0 },
  ])

  const { handleAvatarTap } = useStoryNavigation()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: session } = useSession()
  const currentUser = session?.user

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser?.id) {
        setLoading(false)
        return
      }
      try {
        const profileRes = await getUserProfile(currentUser.id)
        if (profileRes.success && profileRes.data) {
          const profileData = profileRes.data
          setProfile(profileData)
          setStats(prev => prev.map(s => {
            if(s.label === "متابع") return { ...s, value: profileData.followersCount || 0 }
            if(s.label === "يتابع") return { ...s, value: profileData.followingCount || 0 }
            return s
          }))
        }

        const postsRes = await getUserPosts(currentUser.id)
        if (postsRes.success && postsRes.data) {
          setPosts(postsRes.data as any)
          setStats(prev => prev.map(s => s.label === "منشور" ? { ...s, value: postsRes.data.length } : s))
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [currentUser])

  useEffect(() => {
    if (activeTab === "saved" && savedPosts.length === 0) {
      setLoadingSaved(true)
      getSavedPosts().then(res => {
        if (res.success && res.data) {
          setSavedPosts(res.data)
        }
        setLoadingSaved(false)
      })
    }
  }, [activeTab])

  // Populate edit form when sheet opens
  useEffect(() => {
    if (isEditSheetOpen) {
      const defaultUsername = currentUser?.email?.split('@')[0] || "مستخدم_سديم"
      setEditFullName(profile?.fullName || profile?.full_name || "")
      setEditUsername(profile?.username || defaultUsername)
      setEditBio(profile?.bio || "")
      setEditAvatarPreview(profile?.avatarUrl || profile?.avatar_url || null)
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
      const isVIP = false // Simplified

      // Username validation
      const uname = editUsername.trim()
      if (!isVIP && (uname.length < 4 || uname.length > 14)) {
         setEditError("يجب أن يكون اسم المستخدم بين 4 و 14 حرفاً")
         setEditLoading(false)
         return
      }

      let avatarUrl = profile?.avatarUrl || profile?.avatar_url

      if (editAvatarRemoved) {
        avatarUrl = null
      } else if (editAvatarFile) {
        const formData = new FormData()
        formData.append('file', editAvatarFile)

        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          if (data.success) {
            avatarUrl = data.url
          } else {
            setEditError("حدث خطأ أثناء رفع الصورة الشخصية")
            setEditLoading(false)
            return
          }
        } catch (uploadError) {
           console.error("Avatar upload error:", uploadError)
           setEditError("حدث خطأ أثناء رفع الصورة الشخصية")
           setEditLoading(false)
           return
        }
      }

      const updates = {
        fullName: editFullName.trim(),
        username: uname,
        bio: editBio.trim(),
        avatarUrl
      }

      const res = await updateUserProfile(updates)

      if (!res.success) {
        console.error("Profile update error:", res.error)
        setEditError(res.error || "حدث خطأ أثناء حفظ الملف الشخصي")
        setEditLoading(false)
        return
      }

      setProfile({ ...profile, ...updates, full_name: updates.fullName, avatar_url: updates.avatarUrl })
      setIsEditSheetOpen(false)
      toast.success("تم حفظ الملف الشخصي بنجاح")
    } catch (e: any) {
      console.error(e)
      setEditError(e.message || "حدث خطأ غير متوقع")
    } finally {
      setEditLoading(false)
    }
  }

  const handleToggleSetting = async (key: string, value: boolean) => {
    // Left as placeholder for future local settings implementation
    toast.success("تم تحديث الإعدادات")
  }

  const handleLogout = async () => {
    try {
      await signOut()
      await Preferences.clear()
      localStorage.clear()
      toast.success("تم تسجيل الخروج")
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error("حدث خطأ أثناء تسجيل الخروج")
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const res = await deleteUserAccount()
      if (res.success) {
        await signOut()
        await Preferences.clear()
        localStorage.clear()
        toast.success("تم حذف الحساب بنجاح")
      } else {
        toast.error("فشل في حذف الحساب.")
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      toast.error("حدث خطأ أثناء محاولة حذف الحساب.")
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
  const fullName = profile?.fullName || profile?.full_name || "مستخدم سديم"
  const bio = profile?.bio || "لا يوجد بايو حتى الآن"

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border">
        <span className="font-bold text-lg flex items-center gap-1">
          {username}
          {profile?.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
        </span>

        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
              <Settings className="size-6 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] sm:h-[90vh] rounded-t-3xl border-t border-border overflow-y-auto" dir="rtl">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-center font-bold">الإعدادات</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 pb-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">الحساب</h3>

                <button onClick={() => setIsEditSheetOpen(true)} className="flex w-full items-center justify-between px-2 py-3 hover:bg-secondary rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="size-5 text-foreground" />
                    <span className="text-sm font-medium">تعديل الملف الشخصي</span>
                  </div>
                  <ChevronLeft className="size-5 text-muted-foreground opacity-50" />
                </button>

                <button onClick={handleLogout} className="flex w-full items-center justify-between px-2 py-3 hover:bg-secondary rounded-xl transition-colors">
                  <div className="flex items-center gap-3 text-red-500">
                    <LogOut className="size-5" />
                    <span className="text-sm font-medium">تسجيل الخروج</span>
                  </div>
                  <ChevronLeft className="size-5 text-red-500 opacity-50" />
                </button>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">تفضيلات التطبيق</h3>

                <div className="flex items-center justify-between px-2 py-3">
                  <div className="flex items-center gap-3">
                    <Moon className="size-5 text-foreground" />
                    <span className="text-sm font-medium">الوضع الليلي</span>
                  </div>
                  <Switch
                    dir="ltr"
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>

                <div className="flex items-center justify-between px-2 py-3">
                  <div className="flex items-center gap-3">
                    <Bell className="size-5 text-foreground" />
                    <span className="text-sm font-medium">الإشعارات</span>
                  </div>
                  <Switch dir="ltr" checked={profile?.notifications_enabled ?? true} onCheckedChange={(val) => handleToggleSetting('notifications_enabled', val)} />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">الخصوصية والأمان</h3>

                  <div className="flex items-center justify-between px-2 py-3 hover:bg-secondary rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Shield className="size-5 text-foreground" />
                      <span className="text-sm font-medium">الأمان</span>
                    </div>
                    <ChevronLeft className="size-5 text-muted-foreground opacity-50" />
                  </div>

                  <div className="h-px bg-border my-6" />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex w-full items-center gap-3 px-2 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-8">
                        <UserX className="size-5" />
                        <span className="text-sm font-bold">حذف الحساب نهائياً</span>
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من حذف الحساب؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك ومنشوراتك وإعجاباتك بشكل نهائي من خوادمنا.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row gap-2 sm:justify-start">
                        <AlertDialogCancel className="mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600">نعم، احذف حسابي</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 px-4 py-5"
      >
        <div
          className="rounded-full p-[3px] ring-2 ring-foreground shrink-0 cursor-pointer transition-transform active:scale-95"
          onClick={() => currentUser && handleAvatarTap(currentUser.id!)}
        >
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground overflow-hidden">
            {profile?.avatarUrl || profile?.avatar_url ? (
              <img src={profile.avatarUrl || profile.avatar_url} alt="Avatar" className="size-full object-cover pointer-events-none" />
            ) : (
              <User className="size-10 pointer-events-none" />
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
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed selectable-text">
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
             navigator.clipboard.writeText(window.location.href)
               .then(() => toast.success("تم نسخ رابط الملف الشخصي!"))
               .catch(() => toast.error("حدث خطأ أثناء النسخ"))
          }}
        >
          مشاركة الملف
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-y border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex flex-1 justify-center py-3 transition-colors ${activeTab === t.key ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}
          >
            <t.icon className="size-5" />
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-0.5 p-0.5 min-h-[300px]">
        {activeTab === "grid" && (
          posts.length > 0 ? (
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
          )
        )}

        {activeTab === "saved" && (
          loadingSaved ? (
            <div className="col-span-3 flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedPosts.length > 0 ? (
            savedPosts.map((post) => (
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
            <div className="col-span-3 flex flex-col items-center justify-center text-sm text-muted-foreground py-10 gap-2">
              <Bookmark className="size-8 opacity-20" />
              لا توجد محفوظات حتى الآن
            </div>
          )
        )}

        {activeTab === "reels" && (
          <div className="col-span-3 flex items-center justify-center text-sm text-muted-foreground py-10">
            مقاطع ريلز قريباً
          </div>
        )}
      </motion.div>
    </div>
  )
}
