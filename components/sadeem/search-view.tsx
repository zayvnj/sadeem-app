"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Loader2, Play } from "lucide-react"
import { searchUsers } from "@/app/actions/user"
import { getExploreFeed } from "@/app/actions/post"
import { useNavigation } from "./navigation-context"
import { VerifiedBadge } from "./verified-badge"
import { useDebounce } from "use-debounce"
import { useSession } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export function SearchView() {
  const [query, setQuery] = useState("")
  const [debouncedQuery] = useDebounce(query, 500)
  const [results, setResults] = useState<any[]>([])
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingExplore, setLoadingExplore] = useState(true)
  const { setSelectedUserId } = useNavigation()
  const { data: session } = useSession()
  const currentUser = session?.user

  useEffect(() => {
    async function fetchExploreFeed() {
      try {
        const res = await getExploreFeed()
        if (res.success && res.data) {
          setExplorePosts(res.data)
        }
      } catch (error) {
        console.error("Explore feed error:", error)
      } finally {
        setLoadingExplore(false)
      }
    }
    fetchExploreFeed()
  }, [])

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const res = await searchUsers(debouncedQuery)
        if (res.success && res.data) {
          setResults(res.data)
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [debouncedQuery])

  return (
    <div className="flex flex-col h-full bg-background p-4">
      <div className="relative mb-6">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="size-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مستخدمين..."
          className="w-full bg-secondary rounded-xl py-3 pr-10 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-foreground transition-shadow"
        />
        {loading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-20">
        {!query.trim() ? (
          loadingExplore ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : explorePosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {explorePosts.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square cursor-pointer group bg-secondary"
                  onClick={() => {
                    // For now, simple console log or navigation.
                    // Ideally opens post modal or sets active tab based on media type.
                    // Given instructions we'll rely on the avatar click for routing mostly,
                    // but we can add post view if requested.
                  }}
                >
                  {post.media_url && (post.media_url.match(/\.(mp4|webm|ogg)$/i) || post.mediaType === 'REEL') ? (
                    <>
                      <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute top-1 right-1 bg-black/50 rounded p-0.5">
                        <Play className="size-4 text-white" />
                      </div>
                    </>
                  ) : post.media_url ? (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                  )}

                  {/* Overlay on hover for desktop, or tap target for mobile author routing */}
                  <div
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                    onClick={(e) => {
                       e.stopPropagation();
                       if (post.user_id === currentUser?.id) {
                         // We are simulating navigating to own profile.
                         // Normally we'd use a switch-tab event if available.
                         window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'profile' }))
                       } else {
                         setSelectedUserId(post.user_id)
                       }
                    }}
                  >
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      <div className="size-6 rounded-full overflow-hidden bg-secondary">
                        {post.user?.avatarUrl ? (
                          <img src={post.user.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-muted text-[10px] text-foreground font-bold">
                            {(post.user?.username || "م").charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-white text-xs font-semibold drop-shadow-md truncate max-w-[80px]">
                        {post.user?.username}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground space-y-4">
              <Search className="size-12 opacity-20" />
              <p className="text-sm">لا توجد منشورات للاستكشاف</p>
            </div>
          )
        ) : results.length > 0 ? (
          results.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-secondary/50 transition-colors"
              onClick={() => setSelectedUserId(user.id)}
            >
              <div className="size-12 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center font-bold text-foreground">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  (user.fullName || user.username || "م").charAt(0)
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm flex items-center gap-1">
                  {user.username}
                  {user.isVerified && <VerifiedBadge />}
                </span>
                {user.fullName && (
                  <span className="text-xs text-muted-foreground">{user.fullName}</span>
                )}
              </div>
            </motion.div>
          ))
        ) : !loading && query.trim() ? (
          <div className="text-center text-muted-foreground mt-10">
            لا توجد نتائج مطابقة لبحثك
          </div>
        ) : null}
      </div>
    </div>
  )
}
