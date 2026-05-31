"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Settings, Grid3x3, Film, Bookmark, Bell, Moon, Shield, LogOut, Loader2, BadgeCheck, Camera } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { Preferences } from '@capacitor/preferences'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const tabs = [
  { icon: Grid3x3, key: "grid" },
  { icon: Film, key: "reels" },
  { icon: Bookmark, key: "saved" },
]

const settings = [
  { icon: Bell, label: "الإشعارات", key: "notifications" },
  { icon: Moon, label: "المظهر الداكن", key: "dark_mode" },
  { icon: Shield, label: "الخصوصية والأمان", key: "privacy" },
  { icon: LogOut, label: "تسجيل الخروج", key: "logout" },
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
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', bio: '', username: '' })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
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

      if (profileError && profileError.code === 'PGRST116') {
        // Profile not found
      } else if (profileError && profileError.code !== '42P01') {
        console.error('Profile fetch error:', profileError)
      }
      setProfile(profileData)
      if (profileData) {
        setEditForm({
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          username: profileData.username || ''
        })
      }

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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async () => {
    if (!currentUser) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editForm.username && editForm.username !== profile?.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', editForm.username)
          .neq('id', currentUser.uid)
          .single()

        if (existingUser) {
          throw new Error('اسم المستخدم محجوز مسبقاً، يرجى اختيار اسم آخر.')
        }
      }

      const isVip = ['sly86055r@gmail.com', 'zainalabdeensalman123@gmail.com'].includes(currentUser.email || '')
      let finalAvatarUrl = profile?.avatar_url

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${currentUser.uid}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (uploadError) throw new Error('فشل رفع الصورة: ' + uploadError.message)
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        finalAvatarUrl = publicUrlData.publicUrl
      }

      const updateData = {
        ...editForm,
        avatar_url: finalAvatarUrl,
        is_verified: isVip ? true : profile?.is_verified || false
      }

      const { error: updateError } = await supabase
        .from('users')
        .upsert({ id: currentUser.uid, email: currentUser.email, ...updateData })

      if (updateError) throw new Error('فشل حفظ البيانات: ' + updateError.message)

      await fetchProfileData()
      setIsEditSheetOpen(false)
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoading(true)
      await signOut(auth)
      await Preferences.clear()
      localStorage.clear()
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const username = profile?.username || currentUser?.email?.split('@')[0] || ""
  const fullName = profile?.full_name || "مستخدم سديم"
  const bio = profile?.bio || "لا يوجد بايو حتى الآن"
  const isVerified = profile?.is_verified || false
  const displayUsername = username ? `@${username}` : "لا يوجد اسم مستخدم"

  const stats = [
    { label: "منشور", value: posts.length.toString() },
    { label: "متابِع", value: (profile?.followers_count || 0).toString() },
    { label: "يتابع", value: (profile?.following_count || 0).toString() },
  ]

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-bold" dir="ltr">{displayUsername}</h2>
          {isVerified && <BadgeCheck className="size-5 text-blue-500 fill-blue-50" />}
        </div>
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
              (username.charAt(0) || fullName.charAt(0) || 'U').toUpperCase()
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
          <SheetContent side="bottom" className="rounded-t-3xl h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-6 mt-2">
              <SheetTitle className="text-center text-lg font-bold">تعديل الملف الشخصي</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-2 pb-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative size-24 rounded-full bg-muted overflow-hidden">
                  <img
                    src={avatarPreview || profile?.avatar_url || ''}
                    alt="Preview"
                    className="size-full object-cover"
                    style={{ display: avatarPreview || profile?.avatar_url ? 'block' : 'none' }}
                  />
                  <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 text-white hover:bg-black/50 transition-colors">
                    <Camera className="size-6" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                  </label>
                </div>
                <span className="text-xs text-muted-foreground">تغيير الصورة الشخصية</span>
              </div>

              {saveError && (
                <p className="text-sm font-medium text-red-500 text-center bg-red-500/10 p-2 rounded-md">
                  {saveError}
                </p>
              )}

              <div className="space-y-4 text-right">
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    name="username"
                    value={editForm.username}
                    onChange={handleEditChange}
                    placeholder="username"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">البايو</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={editForm.bio}
                    onChange={handleEditChange}
                    placeholder="اكتب شيئاً عن نفسك..."
                    className="resize-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="mt-4 w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-50"
              >
                {saving ? <Loader2 className="mx-auto size-5 animate-spin" /> : "حفظ التغييرات"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
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
