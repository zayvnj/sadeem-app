"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function registerUser({ email, password, fullName }: { email: string, password: string, fullName: string }) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return { success: false, error: "البريد الإلكتروني مسجل مسبقاً" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        username: generatedUsername,
      }
    });

    return { success: true, data: { id: user.id, email: user.email } };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "حدث خطأ أثناء إنشاء الحساب" };
  }
}
