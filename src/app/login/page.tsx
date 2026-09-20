"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [requiereBootstrap, setRequiereBootstrap] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((d) => setRequiereBootstrap(Boolean(d.requiereBootstrap)))
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
          throw new Error(d.error ?? "No se pudo crear el administrador");
        }
      }

      const resultado = await signIn("credentials", {
        usuario,
        password,
        redirect: false,
      });

      if (resultado?.error) {
        throw new Error("Usuario o contraseña incorrectos");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Image
        src="/login-bg.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/80 via-navy-900/70 to-navy-900/90" />

      <div className="relative z-10 w-full max-w-sm">
        {cargando ? (
          <p className="text-center text-white/70">Cargando…</p>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-bold text-white drop-shadow">
                Control de Inspecciones
              </h1>
              <p className="text-sm text-white/70">Ethical Quality Services</p>
            </div>

            <form onSubmit={manejarEnvio} className="card space-y-4 bg-white/95 backdrop-blur">
              {requiereBootstrap && (
                <div className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-navy-800">
                  No hay usuarios registrados todavía. Crea la cuenta del primer{" "}
                  <strong>Administrador</strong>.
                </div>
              )}

              {requiereBootstrap && (
                <div>
                  <label className="label">Nombre completo</label>
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
                <label className="label">Usuario</label>
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
                <label className="label">Contraseña</label>
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
                  ? "Procesando…"
                  : requiereBootstrap
                    ? "Crear administrador e ingresar"
                    : "Ingresar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
