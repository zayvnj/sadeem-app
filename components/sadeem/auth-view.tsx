
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Chrome, Mail, Lock, User, Loader2 } from "lucide-react"
import { Logo } from "./logo"
import { toast } from "sonner"
import { registerUser } from "@/app/actions/register"

export function AuthView() {
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        })

        if (result?.error) {
          toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة")
          setLoading(false)
          return
        }

        window.location.href = '/'
      } else {
        // Registration
        const res = await registerUser({ email, password, fullName })
        if (!res.success) {
          toast.error(res.error || "فشل إنشاء الحساب")
          setLoading(false)
          return
        }

        // Auto login after registration
        const loginResult = await signIn('credentials', {
          redirect: false,
          email,
          password,
        })

        if (loginResult?.error) {
          toast.error("تم إنشاء الحساب لكن فشل تسجيل الدخول التلقائي")
          setLoading(false)
          return
        }

        window.location.href = '/'
      }
    } catch (err) {
      console.error("Auth error:", err)
      toast.error("حدث خطأ غير متوقع")
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Logo className="w-24 h-24 mx-auto mb-4" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "تسجيل الدخول إلى حسابك" : "إنشاء حساب جديد"}
          </p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-4 mb-6">
          {!isLogin && (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute right-3 top-3 size-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-primary transition-colors"
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute right-3 top-3 size-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-primary transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute right-3 top-3 size-5 text-muted-foreground" />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-primary transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-70 flex items-center justify-center"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : (isLogin ? "تسجيل الدخول" : "إنشاء حساب")}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">أو</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-semibold transition-colors hover:bg-secondary active:scale-95 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Chrome className="size-5" />
              المتابعة باستخدام Google
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "ليس لديك حساب؟ قم بإنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
          </button>
        </div>
      </div>
    </div>
  )
}
