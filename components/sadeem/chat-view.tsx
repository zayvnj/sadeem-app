"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Sparkles, Search, Send, ArrowRight, Loader2, BadgeCheck, Reply, Copy, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
import { useNavigation } from "./navigation-context"

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } },
}

interface ChatViewProps {
  onChatOpenStateChange?: (isOpen: boolean) => void;
}

export function ChatView({ onChatOpenStateChange }: ChatViewProps = {}) {
  const [chats, setChats] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const { setSelectedUserId } = useNavigation()
  const [newMessage, setNewMessage] = useState("")
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const currentUser = auth?.currentUser
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [activeLongPressId, setActiveLongPressId] = useState<string | null>(null)

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
    setLoadingChats(true)
    try {
      // Step 1: Fetch chats where current user is a participant
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .contains('participant_ids', [currentUser.uid])

      if (chatsError && chatsError.code !== '42P01') console.error(chatsError)

      const activeChats = chatsData || []

      // Step 2: For each chat, fetch the other participant's details and the latest message
      const enrichedChats = await Promise.all(activeChats.map(async (chat) => {
        // Find the other participant ID
        const otherParticipantId = chat.participant_ids.find((id: string) => id !== currentUser.uid) || chat.participant_ids[0]

        // Fetch user details
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', otherParticipantId)
          .single()

        // Fetch latest message
        const { data: msgData } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          id: chat.id,
          user: userData || { id: otherParticipantId, full_name: 'مستخدم غير معروف' },
          lastMessage: msgData?.content || 'لا توجد رسائل',
          lastMessageTime: msgData?.created_at,
          unread: 0 // Mock for now
        }
      }))

      // Sort by latest message time
      enrichedChats.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setChats(enrichedChats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingChats(false)
    }
  }

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url, is_verified')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', currentUser?.uid)
        .limit(5)

      if (error) {
        console.error("Error searching users:", error)
      } else {
        setSearchResults(data || [])
      }
    }

    const debounce = setTimeout(() => {
      searchUsers()
    }, 300)

    return () => clearTimeout(debounce)
  }, [searchQuery, currentUser?.uid])

  const handleUserSelect = async (selectedUser: any) => {
    if (!currentUser) return
    setSearchQuery("")
    setSearchResults([])

    // Check if chat already exists
    const { data: existingChats, error: checkError } = await supabase
      .from('chats')
      .select('id')
      .contains('participant_ids', [currentUser.uid, selectedUser.id])

    let chatId = null

    if (existingChats && existingChats.length > 0) {
      // Use existing chat
      chatId = existingChats[0].id
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          participant_ids: [currentUser.uid, selectedUser.id],
        })
        .select('id')
        .single()

      if (createError) {
        alert("Insert Error: " + JSON.stringify(createError))
        console.error("Error creating chat:", createError)
        return
      }
      chatId = newChat.id
    }

    // Open the chat
    openChat(chatId, selectedUser)
  }

  const openChat = async (chatId: string, chatUser: any) => {
    setActiveChat({ id: chatId, user: chatUser })
    if (onChatOpenStateChange) onChatOpenStateChange(true)
    setLoadingMessages(true)

    // Fetch messages for this chat_id
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error && error.code !== '42P01') console.error(error)
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMessages(false)
    }

  }

  useEffect(() => {
    if (!activeChat?.id) return;

    // Subscribe to realtime messages for this specific chat
    const messageChannel = supabase
      .channel(`chat:${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${activeChat.id}`
      }, (payload) => {
        // Only add if we didn't just send it (to avoid double adding optimistic UI messages)
        if (payload.new.sender_id !== currentUser?.uid) {
           setMessages((prev) => [...prev, payload.new])
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
    }
  }, [activeChat?.id, currentUser?.uid]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUser) return

    if (!activeChat.id || typeof activeChat.id !== 'string' || activeChat.id.length < 10) {
      alert("Invalid chat_id: " + activeChat.id);
      return;
    }

    const replyContent = replyingTo ? `[رد على: ${replyingTo.content.substring(0, 30)}...] ${newMessage}` : newMessage

    const tempMessage = {
      id: Date.now().toString(),
      chat_id: activeChat.id,
      sender_id: currentUser.uid,
      content: replyContent,
      created_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: activeChat.id,
        sender_id: currentUser.uid,
        content: replyContent,
        // In a real app we would have a reply_to_id column, but using content prefix for now
      })

      if (error) {
        alert("Insert Error: " + JSON.stringify(error))
        return
      }

      setMessages((prev) => [...prev, tempMessage])
      setNewMessage("")
      setReplyingTo(null)
    } catch (error) {
      alert("Insert Error: " + JSON.stringify(error))
      console.error('Error sending message:', error)
    }
  }

  if (activeChat) {
    return (
      <div className="flex flex-col bg-background fixed inset-0 z-[100] safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background z-10 shadow-sm">
          <button onClick={() => { setActiveChat(null); if (onChatOpenStateChange) onChatOpenStateChange(false); }} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowRight className="size-5" />
          </button>

          <div
            className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-secondary/50 rounded-lg p-1 -ml-1 transition-colors"
            onClick={() => activeChat.user?.id && setSelectedUserId(activeChat.user.id)}
          >
            {activeChat.user?.avatar_url ? (
              <img src={activeChat.user.avatar_url} alt="" className="size-10 rounded-full object-cover" />
            ) : (
              <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                {(activeChat.user?.full_name || activeChat.user?.username || "م").charAt(0)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sm flex items-center gap-1">
                {activeChat.user?.full_name || activeChat.user?.username || `مستخدم`}
                {activeChat.user?.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
              </span>
              <span className="text-xs text-green-500">متصل الآن</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none] pb-32" onClick={() => setActiveLongPressId(null)}>
          {loadingMessages ? (
            <div className="flex justify-center py-4"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.uid
              const isLongPressed = activeLongPressId === msg.id

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}
                >
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.15}
                    onDragEnd={(e, info) => {
                      // Swipe right to reply (RTL layout)
                      if (info.offset.x > 50) {
                        setReplyingTo(msg)
                      }
                    }}
                    className="max-w-[75%] relative"
                  >
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm selectable-text cursor-pointer transition-transform ${isMe ? 'bg-foreground text-background rounded-tl-sm' : 'bg-secondary text-foreground rounded-tr-sm'}`}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setActiveLongPressId(isLongPressed ? null : msg.id)
                      }}
                      onTouchStart={(e) => {
                        const timer = setTimeout(() => {
                           setActiveLongPressId(msg.id)
                        }, 500)
                        e.currentTarget.dataset.timer = timer.toString()
                      }}
                      onTouchEnd={(e) => {
                        const timer = e.currentTarget.dataset.timer
                        if (timer) clearTimeout(parseInt(timer))
                      }}
                      onTouchMove={(e) => {
                        const timer = e.currentTarget.dataset.timer
                        if (timer) clearTimeout(parseInt(timer))
                      }}
                    >
                      {msg.content}
                    </div>

                    <AnimatePresence>
                      {isLongPressed && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: isMe ? 10 : -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`absolute z-20 flex gap-2 p-1.5 rounded-xl bg-background border border-border shadow-lg ${isMe ? '-top-12 right-0' : '-top-12 left-0'}`}
                        >
                           <button
                             onClick={() => { setReplyingTo(msg); setActiveLongPressId(null); }}
                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary text-xs font-semibold transition-colors"
                           >
                              <Reply className="size-3.5" />
                              رد
                           </button>
                           <div className="w-px bg-border my-1" />
                           <button
                             onClick={() => {
                               navigator.clipboard.writeText(msg.content)
                               setActiveLongPressId(null)
                             }}
                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-secondary text-xs font-semibold transition-colors"
                           >
                              <Copy className="size-3.5" />
                              نسخ
                           </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
              )
            })
          ) : (
            <div className="text-center text-sm text-muted-foreground pt-10">ابدأ المحادثة الآن</div>
          )}
        </div>

        <form onSubmit={sendMessage} className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md p-3 border-t border-border flex flex-col gap-2 safe-area-bottom">
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="flex items-center justify-between bg-secondary/50 rounded-lg p-2.5 mx-1"
              >
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-xs font-bold text-foreground mb-0.5">الرد على رسالة</span>
                  <span className="text-xs text-muted-foreground truncate">{replyingTo.content}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1.5 hover:bg-background rounded-full transition-colors ml-1"
                >
                  <X className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2 w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالة..."
            className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground transition-colors shadow-sm"
          />
          <button type="submit" disabled={!newMessage.trim()} className="size-[44px] rounded-full bg-foreground flex items-center justify-center text-background disabled:opacity-50 shrink-0 shadow-sm transition-transform active:scale-95">
            <Send className="size-5 -ml-1" />
          </button>
          </div>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مستخدمين بالاسم..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {searchQuery && searchResults.length > 0 && (
        <div className="px-4 mt-2">
          <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right hover:bg-secondary transition-colors"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                    {(user.full_name || user.username || "م").charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold flex items-center gap-1">
                    {user.full_name || user.username}
                    {user.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
                  </span>
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!searchQuery && (
        loadingChats ? (
          <div className="flex justify-center py-10"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
        ) : chats.length > 0 ? (
          <motion.ul variants={container} initial="hidden" animate="show">
            {chats.map((chat) => {
              const name = chat.user.full_name || chat.user.username || `مستخدم`

              // Format time simple
              const timeString = chat.lastMessageTime
                ? new Date(chat.lastMessageTime).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: 'numeric' })
                : "الآن"

              return (
                <motion.li key={chat.id} variants={item}>
                  <button onClick={() => openChat(chat.id, chat.user)} className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-secondary">
                    <div
                      onClick={(e) => { e.stopPropagation(); chat.user?.id && setSelectedUserId(chat.user.id); }}
                    >
                      {chat.user.avatar_url ? (
                        <img src={chat.user.avatar_url} alt="" className="size-12 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                          {name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">
                      <span className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold flex items-center gap-1 hover:underline"
                          onClick={(e) => { e.stopPropagation(); chat.user?.id && setSelectedUserId(chat.user.id); }}
                        >
                          {name}
                          {chat.user.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeString}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="block text-xs text-muted-foreground truncate">{chat.lastMessage}</span>
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
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            لا توجد محادثات. ابحث عن مستخدمين لبدء الدردشة.
          </div>
        )
      )}
    </div>
  )
}
