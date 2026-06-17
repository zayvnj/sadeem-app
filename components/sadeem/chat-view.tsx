"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Sparkles, Search, Send, ArrowRight, Loader2, BadgeCheck, Reply, Copy, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/firebase"
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
      className={`flex flex-col border-r-4 bg-background/10 rounded-l-md px-2 py-1 -mx-2 -mt-1 mb-1 cursor-pointer hover:bg-background/20 transition-colors ${isMe ? 'border-background/50' : 'border-primary'}`}
    >
      <span className={`text-xs font-bold truncate ${isMe ? 'text-background/90' : 'text-primary'}`}>{replyName}</span>
      <span className="text-xs truncate opacity-80">{replyText}</span>
    </div>
  );
};

// Helper to extract clean message content for previews
const cleanMessagePreview = (content: string) => {
  const replyMatch = content.match(/^\[REPLY\|.*?\|.*?\|.*?\]\s*([\s\S]*)$/);
  if (replyMatch) {
    return replyMatch[1];
  }
  const legacyMatch = content.match(/^\[رد على: .*?\]\s*([\s\S]*)$/);
  if (legacyMatch) {
    return legacyMatch[1];
  }
  return content;
};

// Helper to parse reply messages
const parseReply = (content: string) => {
  const replyMatch = content.match(/^\[REPLY\|(.*?)\|(.*?)\|(.*?)\]\s*([\s\S]*)$/);
  if (replyMatch) {
    let [_, replyId, replyName, replyText, actualMessage] = replyMatch;
    if (!replyText || replyText.trim() === '') {
      replyText = 'مرفق أو رسالة محذوفة'; // Fallback for empty quoted text
    }
    return {
      isReply: true,
      replyId,
      replyName,
      replyText,
      actualMessage
    };
  }

  // Legacy format support
  const legacyMatch = content.match(/^\[رد على: (.*?)\]\s*([\s\S]*)$/);
  if (legacyMatch) {
    let [_, replyText, actualMessage] = legacyMatch;
    return {
      isReply: true,
      replyId: '',
      replyName: 'مستخدم',
      replyText,
      actualMessage
    };
  }

  return { isReply: false, actualMessage: content };
};


const MessageBubble = React.memo(({
  msg,
  isMe,
  isLongPressed,
  setActiveLongPressId,
  setReplyingTo,
  currentUser
}: {
  msg: any,
  isMe: boolean,
  isLongPressed: boolean,
  setActiveLongPressId: (id: string | null) => void,
  setReplyingTo: (msg: any) => void,
  currentUser: any
}) => {
  return (
    <motion.div
      key={msg.id}
      id={`msg-${msg.id}`}
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
          {(() => {
            const { isReply, replyId, replyName, replyText, actualMessage } = parseReply(msg.content);
            if (isReply) {
              return (
                <div className="flex flex-col">
                  <ReplyQuote
                    replyId={replyId}
                    replyName={replyName as string}
                    replyText={replyText as string}
                    isMe={isMe}
                  />
                  {actualMessage && actualMessage.trim() !== '' ? (
                    <span>{actualMessage}</span>
                  ) : (
                    <span className="italic opacity-80 text-xs">محتوى غير نصي</span>
                  )}
                </div>
              );
            }
            return msg.content;
          })()}
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
MessageBubble.displayName = "MessageBubble"

const ConversationItem = React.memo(({
  chat,
  openChat,
  setSelectedUserId
}: {
  chat: any,
  openChat: (id: string, user: any) => void,
  setSelectedUserId: (id: string | null) => void
}) => {
  const name = chat.user.full_name || chat.user.username || `مستخدم`
  const timeString = chat.lastMessageTime
    ? new Date(chat.lastMessageTime).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: 'numeric' })
    : "الآن"

  return (
    <motion.li variants={item}>
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
})
ConversationItem.displayName = "ConversationItem"

export function ChatView({ onChatOpenStateChange }: ChatViewProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const currentUser = auth?.currentUser
  const isOpeningRef = useRef(false)

  const [activeChat, setActiveChat] = useState<any | null>(null)
  const { setSelectedUserId } = useNavigation()
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [replyingTo, setReplyingTo] = useState<any | null>(null)
  const [activeLongPressId, setActiveLongPressId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch Chats with React Query
  const { data: chats = [], isLoading: loadingChats } = useQuery({
    queryKey: ['chats', currentUser?.uid],
    queryFn: async () => {
      if (!currentUser) return []

      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .contains('participant_ids', [currentUser.uid])

      if (chatsError && chatsError.code !== '42P01') console.error(chatsError)
      const activeChats = chatsData || []

      const enrichedChats = await Promise.all(activeChats.map(async (chat) => {
        const otherParticipantId = chat.participant_ids.find((id: string) => id !== currentUser.uid) || chat.participant_ids[0]

        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, username, avatar_url, is_verified')
          .eq('id', otherParticipantId)
          .single()

        const { data: msgData } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          id: chat.id,
          user: userData || { id: otherParticipantId, full_name: 'مستخدم غير معروف', username: '', avatar_url: '', is_verified: false },
          lastMessage: msgData ? cleanMessagePreview(msgData.content) : 'لا توجد رسائل',
          lastMessageTime: msgData?.created_at,
          unread: 0
        }
      }))

      enrichedChats.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      return enrichedChats
    },
    enabled: !!currentUser,
    staleTime: 60000,
  })

  // 2. Fetch Messages with React Query
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeChat?.id],
    queryFn: async () => {
      if (!activeChat?.id) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true })

      if (error && error.code !== '42P01') console.error(error)
      return data || []
    },
    enabled: !!activeChat?.id,
    staleTime: 60000,
  })

  // Listen to Global Messages for Chat List Updates
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (!activeChat) {
          queryClient.invalidateQueries({ queryKey: ['chats', currentUser.uid] })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChat, currentUser, queryClient])

  // Sync Search Query
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
        // Once URL finally updates to match, we can release the lock
        isOpeningRef.current = false
      }
      return
    }

    if (!chatIdParam && activeChat) {
      setActiveChat(null)
      if (onChatOpenStateChange) onChatOpenStateChange(false)
    }
  }, [searchParams, activeChat, onChatOpenStateChange])

  const closeChat = () => {
    router.back() // This handles URL state natively
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: messages.length > 0 ? 'smooth' : 'auto' })
    }
  }, [messages])

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
           queryClient.setQueryData(['messages', activeChat.id], (old: any) => {
             return [...(old || []), payload.new]
           })
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

    // New struct: [REPLY|msgId|senderId|quotedText] Actual message
    // senderName can be fetched or we store senderId.
    // However, to keep it simple and robust, we can just store the original text and sender name in the prefix
    const senderNameRaw = replyingTo?.sender_id === currentUser?.uid ? 'أنت' : (activeChat.user?.full_name || activeChat.user?.username || 'مستخدم')
    const senderName = senderNameRaw.replace(/\|/g, '')
    const quotedText = replyingTo ? replyingTo.content.replace(/\[REPLY\|.*?\]\s*/, '').substring(0, 50).replace(/\|/g, '') + '...' : ''
    const replyContent = replyingTo ? `[REPLY|${replyingTo.id}|${senderName}|${quotedText}] ${newMessage}` : newMessage

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

      queryClient.setQueryData(['messages', activeChat.id], (old: any) => {
        return [...(old || []), tempMessage]
      })
      setNewMessage("")
      setReplyingTo(null)
    } catch (error) {
      alert("Insert Error: " + JSON.stringify(error))
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
                messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.sender_id === currentUser?.uid}
                    isLongPressed={activeLongPressId === msg.id}
                    setActiveLongPressId={setActiveLongPressId}
                    setReplyingTo={setReplyingTo}
                    currentUser={currentUser}
                  />
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground pt-10">ابدأ المحادثة الآن</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md p-3 border-t border-border flex flex-col gap-2 safe-area-bottom">
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 10, height: 0 }}
                    className="flex items-center justify-between bg-primary/10 border-l-4 border-primary rounded-r-lg p-2.5 mx-1"
                  >
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-xs font-bold text-primary mb-0.5">
                        الرد على {replyingTo.sender_id === currentUser?.uid ? 'أنت' : (activeChat.user?.full_name || activeChat.user?.username || 'مستخدم')}
                      </span>
                      <span className="text-xs text-foreground/80 truncate">
                        {replyingTo.content.replace(/\[REPLY\|.*?\]\s*/, '').replace(/^\[رد على: (.*?)\]\s*/, '')}
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
              <button type="submit" disabled={!newMessage.trim()} className="size-[44px] rounded-full bg-foreground flex items-center justify-center text-background disabled:opacity-50 shrink-0 shadow-sm transition-transform active:scale-95">
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

      {!searchQuery && (
        loadingChats ? (
          <div className="flex justify-center py-10"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
        ) : chats.length > 0 ? (
          <motion.ul variants={container} initial="hidden" animate="show">
            {chats.map((chat) => (
              <ConversationItem
                key={chat.id}
                chat={chat}
                openChat={openChat}
                setSelectedUserId={setSelectedUserId}
              />
            ))}
          </motion.ul>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            لا توجد محادثات. ابحث عن مستخدمين لبدء الدردشة.
          </div>
        )
      )}
    </div>
    </>
  )
}
