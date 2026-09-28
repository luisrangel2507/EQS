import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { NOMBRE_CORTO, DESCRIPCION_APP } from "@/lib/branding";
import { SCRIPT_TEMA } from "@/lib/tema";
import { idiomaServidor } from "@/lib/i18nServidor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: NOMBRE_CORTO,
  description: DESCRIPCION_APP,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: NOMBRE_CORTO,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const idioma = idiomaServidor();
  return (
    <html lang={idioma} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={`${inter.variable} ${manrope.variable} antialiased`}>
        <Providers idioma={idioma}>{children}</Providers>
      </body>
    </html>
  );
}
