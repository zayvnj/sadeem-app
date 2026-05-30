"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

export function AuthView({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      onAuthSuccess()
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء المصادقة")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col justify-center px-6 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">سديم</h1>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "سجل دخولك لتتواصل مع أصدقائك" : "أنشئ حساباً جديداً للانضمام إلينا"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="البريد الإلكتروني"
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
              dir="ltr"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              required
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition-all"
              dir="ltr"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-500 font-medium text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : (isLogin ? "تسجيل الدخول" : "إنشاء حساب")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-foreground hover:underline"
          >
            {isLogin ? "سجل الآن" : "سجل الدخول"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
