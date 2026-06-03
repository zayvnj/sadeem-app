"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { auth } from "@/lib/firebase"
import { useQueryClient } from "@tanstack/react-query"

interface FollowButtonProps {
  userId: string
  initialIsFollowing: boolean
  onToggleSuccess?: (isFollowing: boolean) => void
  className?: string
}

import { useMutation } from "@tanstack/react-query"

export function FollowButton({ userId, initialIsFollowing, onToggleSuccess, className = "" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const queryClient = useQueryClient()
  const currentUser = auth?.currentUser

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) {
        throw new Error("يجب تسجيل الدخول")
      }

      console.log("Follow Payload being sent:", { followerId: currentUser.uid, followingId: userId })

      if (isFollowing) {
        // Unfollow request
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.uid)
          .eq("following_id", userId)

        if (error) throw error
        return false
      } else {
        // Follow request
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUser.uid, following_id: userId })

        if (error) throw error
        return true
      }
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
        isFollowing ? "إلغاء المتابعة" : "متابعة"
      )}
    </button>
  )
}
