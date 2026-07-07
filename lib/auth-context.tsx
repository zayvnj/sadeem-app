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
        handleAuthChange(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (supabaseUser: any) => {
    try {
      if (supabaseUser) {
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
          setUser({
            id: data.user.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
            username: data.user.username,
            fullName: data.user.fullName,
            avatarUrl: data.user.avatarUrl || supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
            role: data.user.role,
            isVerified: data.user.isVerified
          });
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
