"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "./firebase";
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // If the email is not verified, we consider them unauthenticated in our app flow
          // (They must verify email first, except maybe if they are just registering)
          // We will handle the check in the login form, but for context we can let it pass
          // or we can optionally check firebaseUser.emailVerified here.

          // Here we would typically sync with our backend (Prisma)
          // We'll call an API route to sync the user and return the Prisma user data
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified
            })
          });

          if (response.ok) {
            const data = await response.json();
            setUser({
              id: data.user.id,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              username: data.user.username,
              fullName: data.user.fullName,
              avatarUrl: data.user.avatarUrl || firebaseUser.photoURL,
              role: data.user.role,
              isVerified: data.user.isVerified
            });
          } else {
             // Fallback if sync fails but we are logged in
             setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName,
              avatarUrl: firebaseUser.photoURL,
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
    });

    return () => unsubscribe();
  }, []);

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
