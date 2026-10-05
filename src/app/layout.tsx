import type { Metadata } from "next";
import { Barlow_Semi_Condensed, IBM_Plex_Sans, Inter, Manrope } from "next/font/google";
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
// tipografías de la portada: titular condensado tipo señalética industrial y texto en Plex
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
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
      <body className={`${inter.variable} ${manrope.variable} ${barlow.variable} ${plex.variable} antialiased`}>
        <Providers idioma={idioma}>{children}</Providers>
      </body>
    </html>
  );
}
