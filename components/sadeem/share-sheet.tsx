"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Search, Loader2, Check } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getChats, sendMessage } from "@/app/actions/chat"
import { toast } from "sonner"

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  sharedType: 'POST' | 'REEL' | 'STORY'
  sharedId: string | null
  previewUrl?: string | null
}

/**
 * Universal share sheet: share a Post, Reel, or Story into any direct chat.
 * The receiving chat renders it as a tappable preview (deep link).
 */
export function ShareSheet({ isOpen, onClose, sharedType, sharedId, previewUrl }: ShareSheetProps) {
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const { data: chats = [], isPending } = useQuery({
    queryKey: ['chats'],
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const res = await getChats()
      return res.success && res.data ? res.data : []
    },
  })

  const filtered = (chats as any[]).filter((c: any) =>
    !search.trim() ||
    c.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.fullName?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSend = async (otherUserId: string) => {
    if (!sharedId || sendingTo) return
    setSendingTo(otherUserId)
    try {
      const res = await sendMessage(otherUserId, undefined, undefined, { sharedType, sharedId })
      if (res.success) {
        setSentTo(prev => new Set(prev).add(otherUserId))
        toast.success("تمت المشاركة بنجاح")
      } else {
        toast.error(res.error || "فشل في المشاركة")
      }
    } catch {
      toast.error("حدث خطأ أثناء المشاركة")
    } finally {
      setSendingTo(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[111] max-h-[70vh] rounded-t-3xl bg-background border-t border-border flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 className="font-bold text-base">مشاركة مع...</h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X className="size-5" />
              </button>
            </div>

            {previewUrl && !previewUrl.match(/\.(mp4|webm|ogg)$/i) && (
              <div className="px-5 pb-3">
                <img src={previewUrl} alt="" className="h-16 w-16 rounded-xl object-cover border border-border" />
              </div>
            )}

            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن محادثة..."
                  className="bg-transparent outline-none text-sm flex-1"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {isPending ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  لا توجد محادثات بعد. ابدأ محادثة أولاً لمشاركة المحتوى.
                </p>
              ) : (
                filtered.map((chat: any) => {
                  const wasSent = sentTo.has(chat.user?.id)
                  return (
                    <button
                      key={chat.id}
                      onClick={() => !wasSent && handleSend(chat.user?.id)}
                      disabled={sendingTo === chat.user?.id}
                      className="flex w-full items-center gap-3 px-2 py-2.5 hover:bg-secondary rounded-xl transition-colors"
                    >
                      <div className="size-11 rounded-full bg-secondary overflow-hidden border border-border flex items-center justify-center font-bold shrink-0">
                        {chat.user?.avatarUrl ? (
                          <img src={chat.user.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                          (chat.user?.fullName || chat.user?.username || "م").charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="text-sm font-bold truncate">{chat.user?.fullName || chat.user?.username}</span>
                        <span className="text-xs text-muted-foreground truncate">@{chat.user?.username}</span>
                      </div>
                      <div className="shrink-0">
                        {sendingTo === chat.user?.id ? (
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : wasSent ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                            <Check className="size-4" /> تم الإرسال
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold bg-foreground text-background px-3 py-1.5 rounded-full">
                            <Send className="size-3.5" /> إرسال
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
