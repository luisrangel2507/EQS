"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import { IdiomaProvider } from "@/components/ui/Idioma";
import type { Idioma } from "@/lib/i18n";

export default function Providers({ children, idioma }: { children: React.ReactNode; idioma: Idioma }) {
  return (
    <SessionProvider>
      <MotionConfig reducedMotion="user">
        <IdiomaProvider inicial={idioma}>
          <ToastProvider>{children}</ToastProvider>
        </IdiomaProvider>
      </MotionConfig>
    </SessionProvider>
  );
}
