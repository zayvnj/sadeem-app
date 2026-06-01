"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, User, ArrowRight, Chrome } from "lucide-react"
import { Capacitor } from "@capacitor/core"
import { toast } from "sonner"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import { auth } from "../../lib/firebase"
import { supabase } from "../../lib/supabase"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  updateProfile
} from "firebase/auth"

type AuthMode = "login" | "register" | "forgot"

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>("login")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password)
      } else if (mode === "register") {
        const userCred = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCred.user, { displayName: name })
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email)
        setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.")
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ ما")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError("")
    console.log("[Google Auth] Step 1: Starting Google Sign-In process");
    try {
      let userCred;
      if (Capacitor.isNativePlatform()) {
        console.log("[Google Auth] Step 2a: Running in native platform (Capacitor)");
        const result = await FirebaseAuthentication.signInWithGoogle({ clientId: "555021067416-rc294q6e039nbbe1r02ueeub4o3jnk7d.apps.googleusercontent.com" })
        console.log("[Google Auth] Step 3a: Result from FirebaseAuthentication plugin:", result);
        if (result.credential?.idToken) {
          console.log("[Google Auth] Step 4a: Using idToken to create Google credential");
          const credential = GoogleAuthProvider.credential(result.credential.idToken)
          console.log("[Google Auth] Step 5a: Signing in with credential");
          userCred = await signInWithCredential(auth, credential)
          console.log("[Google Auth] Step 6a: Successfully signed in with credential", userCred.user?.uid);
        } else {
          throw new Error("لم يتم إرجاع Token صالح من تسجيل دخول Google")
        }
      } else {
        console.log("[Google Auth] Step 2b: Running in web platform");
        const provider = new GoogleAuthProvider()
        console.log("[Google Auth] Step 3b: GoogleAuthProvider instantiated");
        userCred = await signInWithPopup(auth, provider)
        console.log("[Google Auth] Step 4b: Successfully signed in with popup", userCred.user?.uid);
      }

      console.log("[Google Auth] Step 7: Starting Supabase sync");
      // Sync user with Supabase
      if (userCred && userCred.user) {
        const { user } = userCred;
        const { data, error } = await supabase.from('users').select('id').eq('id', user.uid).single();

        if (error && error.code === 'PGRST116') {
          console.log("[Google Auth] Step 8: User doesn't exist in Supabase, inserting");
          // User doesn't exist, insert
          const isVip = ['sly86055r@gmail.com', 'zainalabdeensalman123@gmail.com'].includes(user.email || '');
          const usernameBase = (user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 14);

          const insertResult = await supabase.from('users').insert({
            id: user.uid,
            full_name: user.displayName || 'مستخدم',
            username: usernameBase,
            email: user.email,
            avatar_url: user.photoURL,
            is_verified: isVip
          });
          console.log("[Google Auth] Step 9: Insert result:", insertResult);
        } else {
           console.log("[Google Auth] Step 8: User exists or other Supabase error:", error);
        }
        console.log("[Google Auth] Step 10: Sync complete");
      }

    } catch (err: any) {
      console.error("[Google Auth] Catch Block Error:", err)
      const errorCode = err.code || "UNKNOWN_CODE"
      const errorMessage = err.message || "An unknown error occurred"

      toast.error(`Google Auth Error: ${errorCode} - ${errorMessage}`)
      setError(errorMessage)
    } finally {
      console.log("[Google Auth] Finally Block: Process finished");
      setLoading(false)
    }
  }

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError("")
    setMessage("")
  }

  return (
    <div className="flex h-full min-h-dvh w-full flex-col items-center justify-center bg-background p-6" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">سديم</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" && "مرحباً بك مجدداً"}
            {mode === "register" && "إنشاء حساب جديد"}
            {mode === "forgot" && "إعادة تعيين كلمة المرور"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
            {message}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <User className="size-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm focus:border-foreground focus:outline-none"
                  required={mode === "register"}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <div className="absolute inset-y-0 right-3 flex items-center">
              <Mail className="size-5 text-muted-foreground" />
            </div>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm focus:border-foreground focus:outline-none"
              required
            />
          </div>

          <AnimatePresence mode="popLayout">
            {(mode === "login" || mode === "register") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <Lock className="size-5 text-muted-foreground" />
                </div>
                <input
                  type="password"
                  placeholder="كلمة المرور"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm focus:border-foreground focus:outline-none"
                  required={mode === "login" || mode === "register"}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-right text-xs text-muted-foreground hover:text-foreground"
            >
              نسيت كلمة المرور؟
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-transform active:scale-95 disabled:opacity-70"
          >
            {loading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <>
                {mode === "login" && "تسجيل الدخول"}
                {mode === "register" && "إنشاء حساب"}
                {mode === "forgot" && "إرسال رابط إعادة التعيين"}
                <ArrowRight className="size-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {(mode === "login" || mode === "register") && (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">أو</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-semibold transition-colors hover:bg-secondary active:scale-95 disabled:opacity-70"
            >
              <Chrome className="size-5" />
              المتابعة باستخدام Google
            </button>
          </>
        )}

        <div className="mt-8 text-center text-sm">
          {mode === "login" ? (
            <p className="text-muted-foreground">
              ليس لديك حساب؟{" "}
              <button onClick={() => switchMode("register")} className="font-semibold text-foreground hover:underline">
                سجل الآن
              </button>
            </p>
          ) : (
            <p className="text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <button onClick={() => switchMode("login")} className="font-semibold text-foreground hover:underline">
                تسجيل الدخول
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
