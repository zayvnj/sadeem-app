import { BadgeCheck } from "lucide-react"

export function VerifiedBadge({ className = "size-4" }: { className?: string }) {
  return (
    <BadgeCheck className={`text-blue-500 flex-shrink-0 ${className}`} aria-label="Verified User" />
  )
}
