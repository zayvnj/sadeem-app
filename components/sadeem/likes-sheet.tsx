import { useEffect, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { getLikes } from "@/app/actions/post"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FollowButton } from "./follow-button"
import { useSession } from "next-auth/react"
import { useNavigation } from "./navigation-context"
import { useInView } from "react-intersection-observer"
import { VerifiedBadge } from "./verified-badge"

interface LikesSheetProps {
  postId: string | null
  isOpen: boolean
  onClose: () => void
}

export function LikesSheet({ postId, isOpen, onClose }: LikesSheetProps) {
  const { data: session } = useSession()
  const { setSelectedUserId } = useNavigation()
  const { ref, inView } = useInView()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['likes', postId],
    queryFn: async ({ pageParam = undefined }) => {
      if (!postId) return { users: [], nextCursor: null }
      const res = await getLikes(postId, pageParam)
      if (!res.success) throw new Error(res.error)
      return res.data!
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isOpen && !!postId,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const users = data?.pages.flatMap((page) => page.users) || []

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border flex flex-col p-0">
        <SheetHeader className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-xl z-10">
          <SheetTitle className="text-center font-bold">الإعجابات</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {status === 'pending' ? (
            <div className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : status === 'error' ? (
            <div className="text-center text-muted-foreground p-4">
              حدث خطأ أثناء تحميل الإعجابات
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              لا توجد إعجابات حتى الآن
            </div>
          ) : (
            <>
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => {
                      onClose()
                      setSelectedUserId(user.id)
                    }}
                  >
                    <Avatar className="size-10 border border-border">
                      <AvatarImage src={user.avatarUrl || ''} />
                      <AvatarFallback>{user.fullName?.[0] || user.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm leading-tight flex items-center gap-1">
                        {user.username}
                        {user.isVerified && <VerifiedBadge />}
                      </span>
                      {user.fullName && (
                        <span className="text-xs text-muted-foreground">{user.fullName}</span>
                      )}
                    </div>
                  </div>

                  {session?.user?.id !== user.id && (
                    <FollowButton
                      userId={user.id}
                      initialIsFollowing={user.isFollowing}
                      className="py-1.5 px-3 text-xs"
                    />
                  )}
                </div>
              ))}
              <div ref={ref} className="py-2 flex justify-center">
                {isFetchingNextPage && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
