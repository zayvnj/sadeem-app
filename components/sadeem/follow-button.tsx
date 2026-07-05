"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth-context"
import { toggleFollow } from "@/app/actions/user"
import { useQueryClient, useMutation } from "@tanstack/react-query"

interface FollowButtonProps {
  userId: string
  initialIsFollowing: boolean
  initialIsFollowedBy?: boolean
  onToggleSuccess?: (isFollowing: boolean) => void
  className?: string
}

export function FollowButton({ userId, initialIsFollowing, initialIsFollowedBy = false, onToggleSuccess, className = "" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const currentUser = session?.user

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error("يجب تسجيل الدخول")
      }

      const res = await toggleFollow(userId)
      if (!res.success) throw new Error(res.error)

      return res.data!.isFollowing
    },
    onSuccess: (newIsFollowing) => {
      setIsFollowing(newIsFollowing)
      onToggleSuccess?.(newIsFollowing)

      // Strict invalidation per requirements
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      queryClient.invalidateQueries({ queryKey: ['userContext'] }) // To update feed follows
    },
    onError: (error: any) => {
      console.error("SUPABASE FOLLOW ERROR:", error.message, error, error.details)
      toast.error(error.message || "حدث خطأ أثناء تغيير حالة المتابعة")
    }
  })

  const handleFollowToggle = () => {
    if (!currentUser) {
      alert("يجب تسجيل الدخول")
      return
    }
    followMutation.mutate()
  }

  const isFollowLoading = followMutation.isPending

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isFollowLoading}
      className={`flex items-center justify-center rounded-xl py-2 px-4 font-bold text-sm transition-colors ${
        isFollowing
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      } ${isFollowLoading ? "opacity-70 cursor-not-allowed" : ""} ${className}`}
    >
      {isFollowLoading ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        isFollowing ? "إلغاء المتابعة" : (initialIsFollowedBy ? "رد المتابعة" : "متابعة")
      )}
    </button>
  )
}
