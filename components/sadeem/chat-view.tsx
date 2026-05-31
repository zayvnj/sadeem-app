"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Search, Send, ArrowRight, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"

const aiAssistant = {
  name: "مساعد سديم الذكي",
  last: "كيف يمكنني مساعدتك اليوم؟",
  time: "الآن",
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
}

export function ChatView() {
  const [chats, setChats] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const currentUser = auth?.currentUser

  useEffect(() => {
    fetchChats()

    // Realtime subscription for global chats update
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        // Refresh chats if a new message arrives and we are not in an active chat
        if (!activeChat) {
          fetchChats()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChat])

  const fetchChats = async () => {
    if (!currentUser) return
    try {
      // Fetch distinct chats for the user (mock logic: just fetching users as "chats" for now)
      // Ideally, there should be a `chats` or `conversations` table
      const { data, error } = await supabase
        .from('users') // Updated to match new schema
        .select('*')
        .neq('id', currentUser.uid)
        .limit(5)

      if (error && error.code !== '42P01') console.error(error)
      setChats(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingChats(false)
    }
  }

  const openChat = async (chatUser: any) => {
    setActiveChat(chatUser)
    setLoadingMessages(true)

    // Fetch messages between currentUser and chatUser
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser?.uid},receiver_id.eq.${chatUser.id}),and(sender_id.eq.${chatUser.id},receiver_id.eq.${currentUser?.uid})`)
        .order('created_at', { ascending: true })

      if (error && error.code !== '42P01') console.error(error)
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMessages(false)
    }

    // Subscribe to realtime messages for this specific chat
    const messageChannel = supabase
      .channel(`chat:${chatUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${currentUser?.uid}`
      }, (payload) => {
        if (payload.new.sender_id === chatUser.id) {
          setMessages((prev) => [...prev, payload.new])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUser) return

    const tempMessage = {
      id: Date.now().toString(),
      sender_id: currentUser.uid,
      receiver_id: activeChat.id,
      text: newMessage,
      created_at: new Date().toISOString()
    }

    setMessages((prev) => [...prev, tempMessage])
    setNewMessage("")

    try {
      await supabase.from('messages').insert({
        sender_id: currentUser.uid,
        receiver_id: activeChat.id,
        text: tempMessage.text
      })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  // Fallback UI if no chats
  const fallbackChats = [
    { name: "نورة الشمري", last: "تمام، نتقابل بكرة 👍", time: "٩:٤١", unread: 2, id: '1' },
    { name: "مجموعة العائلة", last: "سالم: تم إرسال الصور", time: "٨:١٥", unread: 5, id: '2' },
  ]
  const displayChats = chats.length > 0 ? chats : fallbackChats

  if (activeChat) {
    return (
      <div className="flex flex-col h-full bg-background relative pb-20">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <button onClick={() => setActiveChat(null)} className="p-2 -mr-2 rounded-full hover:bg-secondary">
            <ArrowRight className="size-5" />
          </button>
          <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
            {(activeChat.name || activeChat.id || "م").charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{activeChat.name || `مستخدم ${activeChat.id?.substring(0,4)}`}</span>
            <span className="text-xs text-green-500">متصل الآن</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none]">
          {loadingMessages ? (
            <div className="flex justify-center py-4"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.uid
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-foreground text-background rounded-tl-sm' : 'bg-secondary text-foreground rounded-tr-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-sm text-muted-foreground pt-10">ابدأ المحادثة الآن</div>
          )}
        </div>

        <form onSubmit={sendMessage} className="sticky bottom-0 bg-background p-3 border-t border-border flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالة..."
            className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-foreground"
          />
          <button type="submit" disabled={!newMessage.trim()} className="size-10 rounded-full bg-foreground flex items-center justify-center text-background disabled:opacity-50 shrink-0">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="ابحث في المحادثات"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* AI assistant pinned */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 flex w-full items-center gap-3 px-4 py-3 text-right"
      >
        <span className="relative flex size-12 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="size-5" />
        </span>
        <span className="flex-1 border-b border-border pb-3">
          <span className="flex items-center justify-between">
            <span className="text-sm font-semibold">{aiAssistant.name}</span>
            <span className="text-xs text-muted-foreground">{aiAssistant.time}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground truncate">{aiAssistant.last}</span>
        </span>
      </motion.button>

      {loadingChats ? (
        <div className="flex justify-center py-10"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.ul variants={container} initial="hidden" animate="show">
          {displayChats.map((chat) => {
            const name = chat.name || `مستخدم ${chat.id?.substring(0,4)}`
            return (
              <motion.li key={chat.id} variants={item}>
                <button onClick={() => openChat(chat)} className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                    {name.charAt(0)}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{name}</span>
                      <span className="text-xs text-muted-foreground">{chat.time || "الآن"}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="block text-xs text-muted-foreground truncate">{chat.last || "انقر لبدء المحادثة"}</span>
                      {chat.unread > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                          {chat.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
