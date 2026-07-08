"use client"

import { motion, AnimatePresence } from "framer-motion"
import { User, Plus, X, LogIn } from "lucide-react"
import { useSession } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function AccountSwitcherSheet({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { data: session } = useSession()
  const currentUser = session?.user

  // Example for local saved sessions, though real implementation would load from localStorage
  const [savedAccounts, setSavedAccounts] = useState<any[]>([])

  useEffect(() => {
    try {
      const accounts = JSON.parse(localStorage.getItem('sadeem_saved_accounts') || '[]')
      setSavedAccounts(accounts.filter((acc: any) => acc.id !== currentUser?.id))
    } catch (e) {
      console.error(e)
    }
  }, [isOpen, currentUser])

  const handleSwitchAccount = async (account: any) => {
    toast.info("جاري التبديل إلى " + account.username)

    if (account.access_token && account.refresh_token) {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: account.access_token,
          refresh_token: account.refresh_token
        })

        if (error) {
          throw error
        }

        onClose()
        return
      } catch (err) {
        console.error("Failed to restore session for", account.username, err)
        toast.error("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً")
      }
    }

    // Fallback if tokens are invalid or missing
    await supabase.auth.signOut()
    onClose()
  }

  const handleAddAccount = async () => {
    // Keep current account in saved list, but sign out to show login screen
    await supabase.auth.signOut()
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-[120] pb-safe"
            dir="rtl"
          >
            <div className="w-12 h-1.5 bg-border rounded-full mx-auto my-3" />

            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold mb-6 text-center">تبديل الحساب</h2>

              <div className="space-y-4">
                {/* Current Account */}
                {currentUser && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-primary/20">
                    <div className="size-12 rounded-full bg-background overflow-hidden border-2 border-primary shrink-0 flex items-center justify-center font-bold text-foreground">
                       {currentUser.avatarUrl || currentUser.image ? (
                         <img src={currentUser.avatarUrl || currentUser.image as string} alt="" className="size-full object-cover" />
                       ) : (
                         (currentUser.name || "م").charAt(0)
                       )}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        {currentUser.name}
                      </span>
                      <span className="text-xs text-muted-foreground">حسابك الحالي</span>
                    </div>
                    <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    </div>
                  </div>
                )}

                {/* Saved Accounts */}
                {savedAccounts.map((account, i) => (
                  <button
                    key={i}
                    onClick={() => handleSwitchAccount(account)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors"
                  >
                    <div className="size-12 rounded-full bg-secondary overflow-hidden shrink-0 flex items-center justify-center font-bold text-foreground">
                       {account.avatarUrl ? (
                         <img src={account.avatarUrl} alt="" className="size-full object-cover" />
                       ) : (
                         (account.username || "م").charAt(0)
                       )}
                    </div>
                    <div className="flex flex-col flex-1 text-right">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        {account.username}
                      </span>
                    </div>
                  </button>
                ))}

                <div className="h-px w-full bg-border my-2" />

                {/* Actions */}
                <button
                  onClick={handleAddAccount}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors text-right"
                >
                  <div className="size-12 rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center shrink-0">
                    <Plus className="size-6 text-foreground" />
                  </div>
                  <span className="font-bold text-foreground">إضافة حساب جديد / تسجيل الدخول</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
