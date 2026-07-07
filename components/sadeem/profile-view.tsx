"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Loader2, User, Camera, Trash2, BadgeCheck, X, ChevronLeft, UserX, BarChart3, TrendingUp, Users, Eye } from "lucide-react"
import { useSession } from "@/lib/auth-context"
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
import { ThemeToggle } from "./theme-toggle"

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

  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState([
    { label: "منشور", value: 0 },
    { label: "متابِع", value: 0 },
    { label: "يتابع", value: 0 },
  ])

  const { handleAvatarTap } = useStoryNavigation()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: containerRef })
  const coverY = useTransform(scrollY, [0, 200], [0, 80])

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
      setCoverPreview(profile?.coverImage || null)
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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const compressed = await compressImage(file)
        const previewUrl = URL.createObjectURL(compressed)
        setCoverPreview(previewUrl)
        setIsUploadingCover(true)

        // Mock upload delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        // In reality we would hit an upload API and then updateUserProfile
        // For now, update local profile state
        setProfile((prev: any) => prev ? { ...prev, coverImage: previewUrl } : prev)
        toast.success("تم تحديث صورة الغلاف بنجاح")
      } catch (error) {
        toast.error("حدث خطأ أثناء تغيير صورة الغلاف")
      } finally {
        setIsUploadingCover(false)
      }
    }
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
      await supabase.auth.signOut()
      // Auth context and AppShell will handle redirection to AuthView
    } catch (error) {
      console.error("Logout error:", error)
    }
  }


  const handleDeleteAccount = async () => {
    try {
      const res = await deleteUserAccount()
      if (res.success) {
        await signOut(auth)
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
    <div ref={containerRef} className="flex h-full flex-col overflow-y-auto pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-background relative" dir="rtl">

      {/* Parallax Cover Image Area */}
      <div className="absolute top-0 left-0 right-0 h-48 overflow-hidden z-0 pointer-events-none">
        <motion.div style={{ y: coverY }} className="w-full h-full relative">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-black opacity-80" />
          )}
        </motion.div>
        {/* Dynamic Gradient Mask */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Edit Cover Button - pointer events auto so it can be clicked */}
      <div className="absolute top-36 left-4 z-10">
        <button
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploadingCover}
          className="flex items-center justify-center p-2 rounded-full bg-background/30 hover:bg-background/50 backdrop-blur-md border border-white/20 shadow-lg transition-all text-white active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="تغيير الغلاف"
        >
          {isUploadingCover ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </button>
        <input
          type="file"
          ref={coverInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleCoverChange}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10">
        <span className="font-bold text-lg flex items-center gap-1 drop-shadow-md">
          {username}
          {profile?.isVerified && <BadgeCheck className="size-4 text-blue-500" />}
        </span>

        <div className="flex items-center gap-2">
          <ThemeToggle className="drop-shadow-md bg-background/20 backdrop-blur-sm" />
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 rounded-full hover:bg-secondary/50 transition-colors drop-shadow-md bg-background/20 backdrop-blur-sm">
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 px-4 py-5 relative z-10 mt-16"
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

      {profile?.isProfessional && (
        <div className="px-4 py-2 mt-2">
          <div className="bg-secondary/60 rounded-2xl backdrop-blur-xl border border-white/10 shadow-[0_0_15px_rgba(124,58,237,0.1)] p-3 cursor-pointer hover:bg-secondary transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="size-4 text-blue-500" />
                لوحة التحكم الاحترافية
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {profile.professionalCategory || "منشئ محتوى"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              تم الوصول إلى 4.2 ألف حساب في آخر 30 يوماً. اضغط لعرض المزيد من الرؤى والأدوات.
            </p>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <TrendingUp className="size-3.5 text-green-500" />
                  +12% تفاعل
               </div>
               <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Users className="size-3.5 text-blue-500" />
                  +45 متابع
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 px-4 py-4">
        <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 rounded-lg bg-secondary py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 active:scale-95 transition-all border border-border/50">
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
          className="flex-1 rounded-lg bg-secondary py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 active:scale-95 transition-all border border-border/50"
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
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-1.5 p-1.5 min-h-[300px]">
        {activeTab === "grid" && (
          posts.length > 0 ? (
            posts.map((post) => (
              <motion.div
                key={post.id}
                variants={item}
                className="aspect-[4/5] rounded-2xl group relative cursor-pointer hover:scale-[0.98] transition-all duration-300 bg-gradient-to-br from-muted to-secondary border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:border-foreground/20"
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
            <div className="col-span-3 flex flex-col items-center justify-center text-sm text-muted-foreground py-16 gap-4 px-8 text-center">
              <div className="size-20 rounded-full border-2 border-foreground flex items-center justify-center mb-2">
                 <Camera className="size-10 text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">لا توجد منشورات</h3>
              <p className="text-muted-foreground/80 leading-relaxed text-sm">
                 عندما تشارك صوراً ومقاطع فيديو، ستظهر على ملفك الشخصي هنا.
              </p>
              <button className="text-blue-500 font-bold mt-2 hover:text-blue-600 transition-colors">
                مشاركة أول منشور
              </button>
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
                className="aspect-[4/5] rounded-2xl group relative cursor-pointer hover:scale-[0.98] transition-all duration-300 bg-gradient-to-br from-muted to-secondary border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:border-foreground/20"
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
          <div className="col-span-3 flex flex-col items-center justify-center text-sm text-muted-foreground py-16 gap-4 px-8 text-center">
            <div className="size-20 rounded-full border-2 border-foreground flex items-center justify-center mb-2">
               <Film className="size-10 text-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground">مقاطع ريلز</h3>
            <p className="text-muted-foreground/80 leading-relaxed text-sm">
               شارك لحظاتك الممتعة عبر مقاطع فيديو قصيرة.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
