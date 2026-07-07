"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Chrome, Mail, Lock, User, Loader2, ArrowRight } from "lucide-react"
import { Logo } from "./logo"
import { toast } from "sonner"
type AuthState = "LOGIN" | "REGISTER" | "FORGOT_PASSWORD";
export function AuthView() {
  const [loading, setLoading] = useState(false)
  const [authState, setAuthState] = useState<AuthState>("LOGIN")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  // Strict email regex validation
  const validateEmail = (emailStr: string) => {
    return String(emailStr)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
  const getSupabaseErrorMessage = (error: any) => {
    switch (error.message) {
      case 'User already registered':
        return 'البريد الإلكتروني مستخدم بالفعل';
      case 'Invalid email':
        return 'البريد الإلكتروني غير صالح';
      case 'Password should be at least 6 characters':
        return 'كلمة المرور ضعيفة جداً';
      case 'Invalid login credentials':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      case 'Too many requests':
        return 'محاولات كثيرة جداً. حاول مرة أخرى لاحقاً';
      default:
        return error.message || 'حدث خطأ غير متوقع';
    }
  };
  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
      // AuthContext will handle the sync and state update automatically
    } catch (err: any) {
      console.error("[Google Auth] Catch Block Error:", err)
      toast.error(getSupabaseErrorMessage(err))
      setLoading(false)
    }
  }
  const handleRegister = async () => {
    if (!validateEmail(email)) {
      toast.error("الرجاء إدخال بريد إلكتروني صالح")
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return;
    }
    if (!fullName.trim()) {
      toast.error("الرجاء إدخال الاسم الكامل")
      return;
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      })
      if (error) throw error

      toast.success("تم إنشاء الحساب بنجاح!")

      // Auto-login if session was not automatically applied
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          console.error("Auto-login error after registration:", signInError)
        }
      } else {
        // Explicitly set the session to ensure onAuthStateChange triggers and AuthContext updates
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        })
      }
    } catch (err: any) {
      console.error("Registration error:", err)
      toast.error(getSupabaseErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  const handleLogin = async () => {
    if (!validateEmail(email)) {
      toast.error("الرجاء إدخال بريد إلكتروني صالح")
      return;
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Successful login will be picked up by AuthContext
    } catch (err: any) {
      console.error("Login error:", err)
      toast.error(getSupabaseErrorMessage(err))
      setLoading(false)
    }
  }
  const handleForgotPassword = async () => {
    if (!validateEmail(email)) {
      toast.error("الرجاء إدخال بريد إلكتروني صالح")
      return;
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      toast.success("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني")
      setAuthState("LOGIN")
    } catch (err: any) {
      console.error("Forgot password error:", err)
      toast.error(getSupabaseErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authState === "LOGIN") {
      await handleLogin();
    } else if (authState === "REGISTER") {
      await handleRegister();
    } else if (authState === "FORGOT_PASSWORD") {
      await handleForgotPassword();
    }
  }
  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden">
        {/* Header section with optional back button */}
        <div className="mb-8 text-center flex flex-col items-center relative">
          {authState !== "LOGIN" && (
            <button
              onClick={() => setAuthState("LOGIN")}
              className="absolute right-0 top-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
              type="button"
            >
              <ArrowRight className="size-5" />
            </button>
          )}
          <Logo className="text-5xl mb-4" />
          <p className="mt-2 text-sm text-muted-foreground font-medium">
            {authState === "LOGIN" && "تسجيل الدخول إلى حسابك"}
            {authState === "REGISTER" && "إنشاء حساب جديد"}
            {authState === "FORGOT_PASSWORD" && "استعادة كلمة المرور"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {authState === "REGISTER" && (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute right-3 top-3 size-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm outline-none focus:border-primary transition-colors"
                  required
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
                dir="ltr"
              />
            </div>
          </div>
          {authState !== "FORGOT_PASSWORD" && (
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
                  dir="ltr"
                />
              </div>
              {authState === "LOGIN" && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthState("FORGOT_PASSWORD")}
                    disabled={loading}
                    className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background transition-all hover:opacity-90 active:scale-95 disabled:opacity-70 flex items-center justify-center mt-2 shadow-md"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : (
              authState === "LOGIN" ? "تسجيل الدخول" :
              authState === "REGISTER" ? "إنشاء حساب" :
              "إرسال رابط الاستعادة"
            )}
          </button>
        </form>
        {authState === "LOGIN" && (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground font-medium">أو</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-bold transition-all hover:bg-secondary active:scale-95 disabled:opacity-70 shadow-sm"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Chrome className="size-5 text-blue-500" />
                  المتابعة باستخدام Google
                </>
              )}
            </button>
            <div className="mt-6 text-center text-sm">
              <button
                type="button"
                onClick={() => setAuthState("REGISTER")}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground font-semibold transition-colors"
              >
                ليس لديك حساب؟ <span className="text-primary">سجل الآن</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
