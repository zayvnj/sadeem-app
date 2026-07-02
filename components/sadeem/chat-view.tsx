"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Sparkles, Search, Send, ArrowRight, Loader2, BadgeCheck, Reply, Copy, X } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { getChats, getMessages, sendMessage as sendMessageAction } from "@/app/actions/chat"
import { useNavigation } from "./navigation-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"

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

const ReplyQuote = ({ replyId, replyName, replyText, isMe }: { replyId?: string, replyName: string, replyText: string, isMe: boolean }) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (replyId) {
          const target = document.getElementById(`msg-${replyId}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.animate([
              { backgroundColor: 'rgba(59, 130, 246, 0.3)' },
              { backgroundColor: 'transparent' }
            ], { duration: 1500 });
          }
        }
      }}
      className={`relative mb-2 flex flex-col gap-1 overflow-hidden rounded-lg px-3 py-2 text-xs opacity-90 cursor-pointer hover:opacity-100 transition-opacity ${
        isMe
          ? "bg-primary-foreground/10 text-primary-foreground border-r-2 border-primary-foreground"
          : "bg-secondary/50 text-foreground border-r-2 border-foreground"
      }`}
    >
      <span className="font-bold flex items-center gap-1 opacity-80">
        <Reply className="size-3" />
        {replyName}
      </span>
      <span className="line-clamp-2 leading-relaxed opacity-90 break-words w-[200px] sm:w-auto overflow-hidden text-ellipsis whitespace-nowrap">
        {replyText}
      </span>
    </div>
  )
}

function cleanMessagePreview(text: string): string {
  if (!text) return 'لا توجد رسائل'
  return text.replace(/\[REPLY\|.*?\]\s*/, '')
}

export function ChatView({ onChatOpenStateChange }: ChatViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeChat, setActiveChat] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [replyingTo, setReplyingTo] = useState<any>(null)
  const isOpeningRef = useRef(false)
  const queryClient = useQueryClient()

  // Long press handling
  const [activeLongPressId, setActiveLongPressId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: session } = useSession()
  const currentUser = session?.user

  // 1. Fetch Chats with React Query
  const { data: chats = [], isLoading: loadingChats } = useQuery({
    queryKey: ['chats', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return []

      const res = await getChats()
      if (res.success && res.data) {
        return res.data.map(chat => ({
          ...chat,
          user: {
            ...chat.user,
            full_name: chat.user.fullName
          },
          lastMessage: chat.lastMessage?.text ? cleanMessagePreview(chat.lastMessage.text) : (chat.lastMessage?.mediaUrl ? 'صورة' : 'لا توجد رسائل'),
          lastMessageTime: chat.lastMessage?.createdAt,
        }))
      }
      return []
    },
    enabled: !!currentUser,
    staleTime: 60000,
  })

  // 2. Fetch Messages with React Query
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeChat?.user?.id],
    queryFn: async () => {
      if (!activeChat?.user?.id) return []
      const res = await getMessages(activeChat.user.id)
      if (res.success && res.data) {
        return res.data.map(m => ({
          ...m,
          content: m.text, // mapped for UI compatibility
          sender_id: m.senderId
        }))
      }
      return []
    },
    enabled: !!activeChat?.user?.id,
    staleTime: 60000,
  })

  // Simulate real-time by polling
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['chats', currentUser.id] })
      if (activeChat?.user?.id) {
         queryClient.invalidateQueries({ queryKey: ['messages', activeChat.user.id] })
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [currentUser, queryClient, activeChat])

  // Placeholder for local search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleUserSelect = async (selectedUser: any) => {
    if (!currentUser) return
    setSearchQuery("")
    setSearchResults([])

    // Use other user's ID as chat ID
    openChat(selectedUser.id, selectedUser)
  }

  const openChat = useCallback(async (chatId: string, chatUser: any) => {
    isOpeningRef.current = true
    setActiveChat({ id: chatId, user: chatUser })
    if (onChatOpenStateChange) onChatOpenStateChange(true)
    router.push(`?chatId=${chatId}`)
  }, [onChatOpenStateChange, router])

  useEffect(() => {
    const chatIdParam = searchParams.get('chatId')

    // If we just clicked openChat, ignore the first param check while URL is transitioning
    if (isOpeningRef.current) {
      if (chatIdParam) {
        isOpeningRef.current = false // url is now in sync
      }
      return
    }

    if (!chatIdParam && activeChat) {
      // Hardware back button or browser back popped the parameter
      setActiveChat(null)
      if (onChatOpenStateChange) onChatOpenStateChange(false)
    } else if (chatIdParam && !activeChat && chats.length > 0) {
       // Deep link or refresh, try to find the chat
       const existingChat = chats.find(c => c.id === chatIdParam)
       if (existingChat) {
         setActiveChat({ id: existingChat.id, user: existingChat.user })
         if (onChatOpenStateChange) onChatOpenStateChange(true)
       }
    }
  }, [searchParams, activeChat, chats, onChatOpenStateChange])

  const closeChat = () => {
    setActiveChat(null)
    if (onChatOpenStateChange) onChatOpenStateChange(false)
    router.back() // This handles popping the ?chatId param naturally
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: messages.length > 0 ? 'smooth' : 'auto' })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUser) return

    const senderNameRaw = replyingTo?.sender_id === currentUser?.id ? 'أنت' : (activeChat.user?.full_name || activeChat.user?.username || 'مستخدم')
    const senderName = senderNameRaw.replace(/\|/g, '')
    const quotedText = replyingTo ? replyingTo.content.replace(/\[REPLY\|.*?\]\s*/, '').substring(0, 50).replace(/\|/g, '') + '...' : ''
    const replyContent = replyingTo ? `[REPLY|${replyingTo.id}|${senderName}|${quotedText}] ${newMessage}` : newMessage

    const tempMessage = {
      id: Date.now().toString(),
      chat_id: activeChat.id,
      sender_id: currentUser.id,
      content: replyContent,
      created_at: new Date().toISOString()
    }

    try {
      // Optimistic update
      queryClient.setQueryData(['messages', activeChat.user.id], (old: any) => {
        return [...(old || []), tempMessage]
      })

      const res = await sendMessageAction(activeChat.user.id, replyContent)

      if (!res.success) {
        alert("Insert Error: " + res.error)
        return
      }

      setNewMessage("")
      setReplyingTo(null)
    } catch (error) {
      alert("Error sending message")
      console.error('Error sending message:', error)
    }
  }

  return (
    <>
      <AnimatePresence>
        {activeChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col bg-background absolute inset-0 z-[100] safe-area-top"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border sticky top-0 bg-background z-10 shadow-sm">
              <button onClick={closeChat} className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors">
                <ArrowRight className="size-5" />
              </button>

              <div
                className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-secondary/50 rounded-lg p-1 -ml-1 transition-colors"
                onClick={() => {
                  /* Navigate to user profile */
                }}
              >
                {activeChat.user?.avatar_url ? (
                  <img src={activeChat.user.avatar_url} alt="" className="size-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-secondary font-bold text-foreground shadow-sm">
                    {(activeChat.user?.full_name || activeChat.user?.username || "م").charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold flex items-center gap-1">
                    {activeChat.user?.full_name || activeChat.user?.username}
                    {activeChat.user?.is_verified && <BadgeCheck className="size-4 text-blue-500" />}
                  </span>
                  {activeChat.user?.is_online && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <span className="relative flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2 bg-green-500"></span>
                      </span>
                      متصل الآن
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-secondary/10 relative">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
                  <div className="size-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                    <Send className="size-8 opacity-50" />
                  </div>
                  <p>ابدأ المحادثة مع {activeChat.user?.full_name || activeChat.user?.username}</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMe = msg.sender_id === currentUser?.id
                  const isLongPressed = activeLongPressId === msg.id

                  // Parse Reply Metadata
                  // Pattern: [REPLY|msgId|senderName|quotedText] Actual text
                  let actualContent = msg.content
                  let replyData = null

                  const replyMatch = msg.content?.match(/^\[REPLY\|(.*?)\|(.*?)\|(.*?)\]\s*([\s\S]*)$/)

                  if (replyMatch) {
                    replyData = {
                      id: replyMatch[1],
                      name: replyMatch[2],
                      text: replyMatch[3],
                    }
                    actualContent = replyMatch[4]
                  } else if (msg.content?.startsWith('[رد على: ')) {
                      // Fallback for older format if needed
                      actualContent = msg.content
                  }

                  let pressTimer: NodeJS.Timeout
                  const handleTouchStart = () => {
                    pressTimer = setTimeout(() => {
                      setActiveLongPressId(msg.id)
                      if (navigator.vibrate) navigator.vibrate(50)
                    }, 500)
                  }
                  const handleTouchEnd = () => clearTimeout(pressTimer)

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex flex-col relative w-full ${isMe ? 'items-end' : 'items-start'}`}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onMouseDown={handleTouchStart}
                      onMouseUp={handleTouchEnd}
                      onMouseLeave={handleTouchEnd}
                    >
                      <div className="relative group max-w-[85%] sm:max-w-[75%]">
                        <div
                          className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm relative break-words min-w-0 selectable-text ${
                            isMe ? "bg-primary text-primary-foreground rounded-tl-sm" : "bg-card border border-border text-foreground rounded-tr-sm"
                          } ${isLongPressed ? 'ring-2 ring-blue-500 scale-[0.98] transition-transform' : ''}`}
                        >
                          {replyData && (
                            <ReplyQuote
                              replyId={replyData.id}
                              replyName={replyData.name}
                              replyText={replyData.text}
                              isMe={isMe}
                            />
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed min-w-[20px] max-w-full overflow-hidden break-words">{actualContent}</p>
                          <span className={`text-[10px] block mt-1 opacity-70 flex-shrink-0 ${isMe ? "text-primary-foreground text-left" : "text-muted-foreground text-right"}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Action Menu (Desktop hover or Mobile long press) */}
                        <AnimatePresence>
                          {(isLongPressed || false) && ( // Simplified for mobile focus
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              className={`absolute top-full mt-2 z-50 flex items-center gap-1 bg-background border border-border rounded-xl shadow-xl p-1.5 ${isMe ? 'right-0' : 'left-0'}`}
                            >
                              <button
                                onClick={() => {
                                  setReplyingTo(msg)
                                  setActiveLongPressId(null)
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                              >
                                <Reply className="size-4" />
                                رد
                              </button>
                              <div className="w-px h-6 bg-border mx-1" />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(actualContent)
                                  setActiveLongPressId(null)
                                  toast.success("تم النسخ")
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                              >
                                <Copy className="size-4" />
                                نسخ
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Click outside to close action menu */}
            {activeLongPressId && (
               <div
                 className="absolute inset-0 z-40 bg-black/5"
                 onClick={() => setActiveLongPressId(null)}
               />
            )}

            <form onSubmit={handleSendMessage} className="p-3 bg-background border-t border-border flex flex-col gap-2 relative z-50">
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 10 }}
                    className="flex items-center justify-between bg-secondary/50 rounded-xl p-3 border-l-4 border-foreground"
                  >
                    <div className="flex flex-col overflow-hidden min-w-0 pr-2">
                      <span className="text-xs font-bold flex items-center gap-1 mb-1">
                        <Reply className="size-3 text-foreground" />
                        الرد على {replyingTo.sender_id === currentUser?.id ? 'نفسك' : (activeChat.user?.full_name || activeChat.user?.username)}
                      </span>
                      <span className="text-sm text-muted-foreground truncate w-[250px] sm:w-[350px]">
                        {replyingTo.content.replace(/\[REPLY\|.*?\]\s*/, '')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1.5 hover:bg-background/50 rounded-full transition-colors ml-1"
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
              <button onClick={handleSendMessage} type="submit" disabled={!newMessage.trim()} className="size-[44px] rounded-full bg-foreground flex items-center justify-center text-background disabled:opacity-50 shrink-0 shadow-sm transition-transform active:scale-95">
                <Send className="size-5 -ml-1" />
              </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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

      <motion.div variants={container} initial="hidden" animate="show" className="mt-4 flex flex-col gap-1 px-3">
        {loadingChats ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length > 0 ? (
          chats.map((chat) => (
            <motion.button
              key={chat.id}
              variants={item}
              whileTap={{ scale: 0.98 }}
              onClick={() => openChat(chat.id, chat.user)}
              className="flex items-center gap-3 rounded-2xl p-3 text-right hover:bg-secondary/60 transition-colors relative"
            >
              <div className="relative shrink-0">
                {chat.user?.avatar_url ? (
                  <img src={chat.user.avatar_url} alt="" className="size-14 rounded-full object-cover shadow-sm border border-border/50" />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full bg-secondary font-bold text-foreground shadow-sm border border-border/50 text-xl">
                    {(chat.user?.full_name || chat.user?.username || "م").charAt(0)}
                  </div>
                )}
                {chat.user?.is_online && (
                  <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-green-500 border-2 border-background ring-1 ring-green-500/20" />
                )}
              </div>
              <div className="flex flex-1 flex-col overflow-hidden min-w-0 pr-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[15px] truncate flex items-center gap-1">
                    {chat.user?.full_name || chat.user?.username}
                    {chat.user?.is_verified && <BadgeCheck className="size-4 text-blue-500 shrink-0" />}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 font-medium opacity-80 whitespace-nowrap">
                    {chat.lastMessageTime && new Date(chat.lastMessageTime).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <p className={`truncate text-sm opacity-90 leading-relaxed ${chat.unread > 0 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        ) : !searchQuery && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-70">
            <Sparkles className="size-12 mb-4 text-primary opacity-50" />
            <p className="font-semibold">لا توجد محادثات</p>
            <p className="text-sm mt-1">ابحث عن أصدقائك لبدء الدردشة</p>
          </div>
        )}
      </motion.div>
      </div>
    </>
  )
}
