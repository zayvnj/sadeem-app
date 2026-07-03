"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Loader2 } from "lucide-react"
import { searchUsers } from "@/app/actions/user"
import { useNavigation } from "./navigation-context"
import { VerifiedBadge } from "./verified-badge"
import { useDebounce } from "use-debounce"

export function SearchView() {
  const [query, setQuery] = useState("")
  const [debouncedQuery] = useDebounce(query, 500)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { setSelectedUserId } = useNavigation()

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

      <div className="flex-1 overflow-y-auto space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!query.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <Search className="size-12 opacity-20" />
            <p className="text-sm">ابحث عن أصدقاء جدد</p>
          </div>
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
