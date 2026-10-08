"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { NOMBRE_APP } from "@/lib/branding";
import { BotonIdioma, guardarIdioma, useIdioma } from "@/components/ui/Idioma";

export default function RegistroClient({ abierto }: { abierto: boolean }) {
  const { t, idioma } = useIdioma();
  const router = useRouter();
  const [empresa, setEmpresa] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, nombreCorto, nombre, usuario, password }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? t("No se pudo crear la cuenta", "Could not create the account"));
      const r = await signIn("credentials", { usuario: d.usuario, password, redirect: false });
      if (r?.error) throw new Error(t("Cuenta creada; inicia sesión para entrar", "Account created; sign in to continue"));
      guardarIdioma(idioma);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Sin conexión, intenta de nuevo", "No connection, try again"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#233581_0%,_#0A163C_45%,_#060E28_100%)] px-4 py-10">
      <motion.div
        className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-yellow/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity }}
      />
      <BotonIdioma oscuro className="absolute right-4 top-4" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md space-y-5">
        <Link href="/" className="flex justify-center">
          <Image src="/logo-header.png" alt={NOMBRE_APP} width={1200} height={304} className="h-12 w-auto" priority />
        </Link>
        {!abierto ? (
          <div className="card space-y-3 text-center">
            <h1 className="font-display text-xl font-bold text-navy-900">{t("Registro por invitación", "Sign-up by invitation")}</h1>
            <p className="text-sm text-navy-500">
              {t(
                "Por ahora las cuentas nuevas las da de alta nuestro equipo. Solicita una demo y te dejamos tu empresa configurada.",
                "For now our team sets up new accounts. Request a demo and we'll get your company configured."
              )}
            </p>
            <Link href="/" className="btn-primary inline-flex">
              {t("Volver al inicio", "Back to home")}
            </Link>
          </div>
        ) : (
          <form onSubmit={registrar} className="card space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy-900">{t("Crea la cuenta de tu empresa", "Create your company account")}</h1>
              <p className="text-sm text-navy-500">
                {t("Tu equipo, tus clientes y tus inspecciones, separados de cualquier otra empresa.", "Your team, customers and inspections, kept separate from any other company.")}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label">{t("Empresa (razón social)", "Company (legal name)")}</label>
                <input className="input" required minLength={2} value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
              </div>
              <div>
                <label className="label">{t("Nombre corto", "Short name")}</label>
                <input className="input" required minLength={2} maxLength={30} value={nombreCorto} onChange={(e) => setNombreCorto(e.target.value)} placeholder="SDB" />
              </div>
            </div>
            <div>
              <label className="label">{t("Tu nombre", "Your name")}</label>
              <input className="input" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t("Usuario", "Username")}</label>
                <input className="input" required minLength={3} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" autoCorrect="off" />
              </div>
              <div>
                <label className="label">{t("Contraseña", "Password")}</label>
                <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-accent w-full" disabled={enviando}>
              {enviando ? t("Creando tu cuenta…", "Creating your account…") : t("Crear cuenta y entrar", "Create account & sign in")}
            </button>
            <p className="text-center text-sm text-navy-500">
              {t("¿Ya tienes cuenta?", "Already have an account?")}{" "}
              <Link href="/login" className="font-semibold text-navy underline">
                {t("Inicia sesión", "Sign in")}
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </main>
  );
}
