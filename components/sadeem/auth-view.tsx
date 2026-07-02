"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Chrome } from "lucide-react"
import { Logo } from "./logo"
import { toast } from "sonner"

export function AuthView() {
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (err: any) {
      console.error("[Google Auth] Catch Block Error:", err)
      toast.error("حدث خطأ أثناء تسجيل الدخول")
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Logo className="w-24 h-24 mx-auto mb-4" />
          <p className="mt-2 text-sm text-muted-foreground">
            تسجيل الدخول إلى سديم
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-semibold transition-colors hover:bg-secondary active:scale-95 disabled:opacity-70"
        >
          {loading ? (
            <span className="size-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          ) : (
            <>
              <Chrome className="size-5" />
              المتابعة باستخدام Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}
