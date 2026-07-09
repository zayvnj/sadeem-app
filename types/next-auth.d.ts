import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string | null
      fullName?: string | null
      avatarUrl?: string | null
      role?: string | null
      isVerified?: boolean | null
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}
