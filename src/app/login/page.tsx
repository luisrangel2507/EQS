"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BotonIdioma, guardarIdioma, useIdioma } from "@/components/ui/Idioma";
import { NOMBRE_APP } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const { t, idioma } = useIdioma();
  const [cargando, setCargando] = useState(true);
  const [requiereBootstrap, setRequiereBootstrap] = useState(false);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((d) => {
        setRequiereBootstrap(Boolean(d.requiereBootstrap));
        setRegistroAbierto(Boolean(d.registroAbierto));
      })
      .finally(() => setCargando(false));
  }, []);

  async function manejarEnvio(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      if (requiereBootstrap) {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, usuario, password }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? t("No se pudo crear el administrador", "Could not create the administrator"));
        }
      }

      const resultado = await signIn("credentials", {
        usuario,
        password,
        redirect: false,
      });

      if (resultado?.error) {
        throw new Error(t("Usuario o contraseña incorrectos", "Wrong username or password"));
      }

      // dentro de la app se sigue en el idioma con el que se vio el login
      guardarIdioma(idioma);
      const sesion = await getSession();
      router.push(sesion?.user.rol === "INSPECTOR" ? "/estacion" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Ocurrió un error", "Something went wrong"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-navy-950 lg:grid lg:grid-cols-[1.1fr_1fr]">
      <BotonIdioma oscuro className="absolute right-4 top-4 z-20" />
      {/* imagen: en celular se ajusta al ancho (para no cortar el logo) y se funde con el cielo;
          en computadora ocupa la mitad izquierda */}
      <div className="absolute inset-0 bg-[#1f4573] lg:relative lg:inset-auto lg:min-h-[100dvh] lg:bg-navy-950">
        <div className="absolute inset-x-0 bottom-0 aspect-[941/1671] [mask-image:linear-gradient(to_bottom,transparent,black_14%)] lg:inset-0 lg:aspect-auto lg:[mask-image:none]">
          <Image src="/login-bg.jpg" alt={NOMBRE_APP} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/75 via-transparent to-transparent lg:hidden" />
      </div>
      <div className="relative z-10 flex min-h-[100dvh] items-end justify-center px-4 pb-12 pt-24 lg:items-center lg:bg-[radial-gradient(ellipse_at_top,_#233581_0%,_#0A163C_60%,_#060E28_100%)] lg:pb-0">
        <div className="w-full max-w-sm">
        {cargando ? (
          <p className="text-center text-white/80">{t("Cargando…", "Loading…")}</p>
        ) : (
          <form onSubmit={manejarEnvio} className="card space-y-4">
            {requiereBootstrap && (
              <div className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-navy-800">
                {t("No hay usuarios registrados todavía. Crea la cuenta del primer", "There are no users yet. Create the first")}{" "}
                <strong>{t("Administrador", "Administrator")}</strong>.
              </div>
            )}

            {requiereBootstrap && (
              <div>
                <label className="label">{t("Nombre completo", "Full name")}</label>
                <input
                  className="input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  minLength={2}
                />
              </div>
            )}

            <div>
              <label className="label">{t("Usuario", "Username")}</label>
              <input
                className="input"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                minLength={3}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="label">{t("Contraseña", "Password")}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" className="btn-accent w-full" disabled={enviando}>
              {enviando
                ? t("Procesando…", "Processing…")
                : requiereBootstrap
                  ? t("Crear administrador e ingresar", "Create administrator and sign in")
                  : t("Ingresar", "Sign in")}
            </button>
            {registroAbierto && !requiereBootstrap && (
              <p className="text-center text-sm text-navy-500">
                {t("¿Tu empresa aún no tiene cuenta?", "Company not signed up yet?")}{" "}
                <Link href="/registro" className="font-semibold text-navy underline">
                  {t("Regístrala", "Sign it up")}
                </Link>
              </p>
            )}
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
