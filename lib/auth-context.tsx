"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useRouter } from "next/navigation";

interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  role?: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  status: "loading",
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Initial fetch of session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleAuthChange(session?.user || null);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthChange(session?.user || null, session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (supabaseUser: any, sessionObj?: any) => {
    try {
      if (supabaseUser) {
        if (!sessionObj) {
          const { data } = await supabase.auth.getSession();
          sessionObj = data?.session;
        }

        // Here we sync with our backend (Prisma)
        const response = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uid: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
            emailVerified: supabaseUser.email_confirmed_at != null
          })
        });

        if (response.ok) {
          const data = await response.json();
          const mappedUser = {
            id: data.user.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            username: data.user.username,
            fullName: data.user.fullName,
            avatarUrl: data.user.avatarUrl || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
            role: data.user.role,
            isVerified: data.user.isVerified
          };
          setUser(mappedUser);

          // Save to local storage for quick account switching
          try {
            const savedAccounts = JSON.parse(localStorage.getItem('sadeem_saved_accounts') || '[]');
            const accountExists = savedAccounts.find((acc: any) => acc.id === mappedUser.id);
            const accountData = {
              id: mappedUser.id,
              username: mappedUser.username || mappedUser.name || mappedUser.email,
              avatarUrl: mappedUser.avatarUrl,
              access_token: sessionObj?.access_token,
              refresh_token: sessionObj?.refresh_token
            };

            if (!accountExists) {
              savedAccounts.push(accountData);
              localStorage.setItem('sadeem_saved_accounts', JSON.stringify(savedAccounts));
            } else {
              // Update existing
              const updatedAccounts = savedAccounts.map((acc: any) =>
                acc.id === mappedUser.id ? accountData : acc
              );
              localStorage.setItem('sadeem_saved_accounts', JSON.stringify(updatedAccounts));
            }
          } catch (e) {
            console.error("Failed to save account for switcher", e);
          }
        } else {
           // Fallback if sync fails but we are logged in
           setUser({
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          });
        }
      } else {
        // User is signed out
        setUser(null);
        // Optional: call a server route to clear any session cookies if we are using them
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
    } catch (error) {
      console.error("Auth sync error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, status: loading ? "loading" : user ? "authenticated" : "unauthenticated" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Backwards compatibility hook for components that still use `useSession`
export const useSession = () => {
  const { user, loading, status } = useAuth();
  return { data: user ? { user } : null, status, loading };
};
