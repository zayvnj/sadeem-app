"use client";

import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/sadeem/app-shell";

export default function Page() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  );
}