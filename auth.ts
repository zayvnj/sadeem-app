import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "./lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Map the default 'name' and 'image' to Sadeem's fields if needed
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, fullName: true, avatarUrl: true }
        });
        if (dbUser) {
           (session.user as any).username = dbUser.username;
           (session.user as any).fullName = dbUser.fullName;
           (session.user as any).avatarUrl = dbUser.avatarUrl || session.user.image;
        }
      }
      return session;
    },
  },
  // Ensure that new users automatically get a username
  events: {
    async createUser({ user }) {
      if (user.email && !user.name) {
        const generatedUsername = user.email.split('@')[0] + Math.floor(Math.random() * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: generatedUsername,
            fullName: user.name || generatedUsername,
            avatarUrl: user.image
          }
        });
      }
    }
  }
})
