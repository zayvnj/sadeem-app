"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-secondary", className)} />
}

/**
 * Blur-up image: shows a pulsing placeholder + blurred image until fully loaded,
 * then fades in sharply. Modern replacement for spinners on media.
 */
export function BlurImage({
  src,
  alt = "",
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative size-full overflow-hidden bg-secondary">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-secondary" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "transition-[filter,opacity,transform] duration-500 ease-out",
          loaded ? "opacity-100 blur-0 scale-100" : "opacity-60 blur-lg scale-105",
          className
        )}
        {...props}
      />
    </div>
  )
}

export function StoryBarSkeleton() {
  return (
    <div className="mb-8 mt-6 w-full overflow-hidden px-4 pb-2">
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-[72px]">
            <Skeleton className="size-[72px] rounded-full" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PostSkeleton() {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex items-center gap-3 px-4">
        <Skeleton className="size-11 rounded-full shrink-0" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-32 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="aspect-square w-full sm:rounded-3xl rounded-none" />
      <div className="flex items-center gap-5 px-4">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="size-6 rounded-full" />
      </div>
    </div>
  )
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: 3 }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" dir="rtl" aria-busy="true">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="flex items-center gap-5 px-4 py-5">
        <Skeleton className="size-20 rounded-full shrink-0" />
        <div className="flex flex-1 justify-around">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-8 rounded-full" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-3 w-64 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-1.5 mt-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
