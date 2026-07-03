import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "./lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [

    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.password) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return user;
      }
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;

        // Map the default 'name' and 'image' to Sadeem's fields if needed
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
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
