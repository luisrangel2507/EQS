"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ROL_ETIQUETAS } from "@/lib/constants";
import ChatPanel from "./ChatPanel";
import PushToggle from "./PushToggle";

const CLAVE_ULTIMA_LECTURA_CHAT = "eqs_chat_ultima_lectura";

// Permite que una pantalla (ej. la captura activa del inspector) le pida al
// AppShell que se achique a solo una flecha de regreso, para ganar espacio.
const OcultarHeaderContext = createContext<(oculto: boolean) => void>(() => {});

export function useModoInmersivo(activo: boolean) {
  const set = useContext(OcultarHeaderContext);
  useEffect(() => {
    if (!activo) return;
    set(true);
    return () => set(false);
  }, [activo, set]);
}

type Props = {
  id: string;
  nombre: string;
  rol: Rol;
  children: React.ReactNode;
};

const ENLACES: { href: string; label: string; roles: Rol[] }[] = [
  { href: "/estacion", label: "Mis inspecciones", roles: ["INSPECTOR"] },
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE", "CLIENTE"] },
  { href: "/inspecciones", label: "Inspecciones", roles: ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "RESIDENTE", "CLIENTE"] },
  { href: "/inspecciones", label: "Historial", roles: ["INSPECTOR"] },
  { href: "/residentes", label: "Residentes", roles: ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"] },
  { href: "/empresas", label: "Empresas", roles: ["ADMIN"] },
];

export default function AppShell({ id, nombre, rol, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const enlaces = ENLACES.filter((e) => e.roles.includes(rol));
  const inicio = rol === "INSPECTOR" ? "/estacion" : "/dashboard";
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER";
  const [inmersivo, setInmersivo] = useState(false);

  return (
    <OcultarHeaderContext.Provider value={setInmersivo}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b border-navy-100 bg-navy-900 text-white">
          {inmersivo ? (
            <div className="flex items-center px-4 py-3">
              <button
                type="button"
                onClick={() => router.push(inicio)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white"
              >
                ← Regresar
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-6 py-3">
                <div className="flex items-center gap-6">
                  <Link href={inicio} className="flex items-center">
                    <Image
                      src="/logo-header.png"
                      alt="EQS InspeccionAPP"
                      width={800}
                      height={266}
                      priority
                      className="h-[42px] w-auto sm:h-[52px]"
                    />
                  </Link>
                  <nav className="hidden gap-1 md:flex">
                    {enlaces.map((enlace) => {
                      const activo = pathname?.startsWith(enlace.href);
                      return (
                        <Link
                          key={enlace.href}
                          href={enlace.href}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            activo
                              ? "bg-white/10 text-yellow"
                              : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {enlace.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  {esOperativo && (
                    <Link
                      href="/dashboard/ejecutivo"
                      className="flex items-center gap-1.5 rounded-md bg-yellow px-3 py-1.5 text-xs font-bold text-navy-900 transition hover:bg-yellow-400"
                    >
                      📊 <span className="hidden sm:inline">Dashboard Ejecutivo</span>
                    </Link>
                  )}
                  <NotificacionesBell rol={rol} />
                  <PerfilMenu nombre={nombre} rol={rol} />
                </div>
              </div>
              <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 py-1 md:hidden">
                {enlaces.map((enlace) => {
                  const activo = pathname?.startsWith(enlace.href);
                  return (
                    <Link
                      key={enlace.href}
                      href={enlace.href}
                      className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                        activo ? "bg-white/10 text-yellow" : "text-white/80"
                      }`}
                    >
                      {enlace.label}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </header>
        <main className={inmersivo ? "px-4 pb-24 pt-4" : "mx-auto max-w-7xl px-4 pb-24 pt-6"}>
          {children}
        </main>
        <BurbujaChat rol={rol} miId={id} />
      </div>
    </OcultarHeaderContext.Provider>
  );
}

type Notificacion = {
  id: string;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
  inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
};

function NotificacionesBell({ rol }: { rol: Rol }) {
  const puedeVer = rol === "CLIENTE" || rol === "LIDER";
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!puedeVer) return;

    function consultar() {
      fetch("/api/notificaciones")
        .then((r) => r.json())
        .then((d) => {
          setNotificaciones(d.notificaciones ?? []);
          setNoLeidas(d.noLeidas ?? 0);
        })
        .catch(() => {});
    }

    consultar();
    const intervalo = setInterval(consultar, 15000);
    return () => clearInterval(intervalo);
  }, [puedeVer]);

  async function alternar() {
    const abrir = !abierto;
    setAbierto(abrir);
    if (abrir && noLeidas > 0) {
      setNoLeidas(0);
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      await fetch("/api/notificaciones", { method: "PATCH" }).catch(() => {});
    }
  }

  if (!puedeVer) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-white/10"
        aria-label="Notificaciones"
      >
        🔔
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow ring-2 ring-navy-900">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-navy-100 bg-white py-1 text-navy-900 shadow-lg">
            <p className="border-b border-navy-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
              Notificaciones
            </p>
            {notificaciones.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-navy-400">
                Sin notificaciones todavía.
              </p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-navy-50 px-4 py-2.5 text-sm last:border-b-0 ${
                    n.leida ? "" : "bg-yellow-50"
                  }`}
                >
                  <p className="text-navy-800">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {new Date(n.creadoEn).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PerfilMenu({ nombre, rol }: { nombre: string; rol: Rol }) {
  const [abierto, setAbierto] = useState(false);
  const iniciales =
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  function salir() {
    signOut({
      callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/login` : "/login",
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/10"
        aria-label="Perfil"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow text-sm font-bold text-navy-900">
          {iniciales}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{nombre}</span>
          <span className="block text-xs leading-tight text-white/60">{ROL_ETIQUETAS[rol]}</span>
        </span>
        <span className={`text-xs text-white/50 transition ${abierto ? "rotate-180" : ""}`}>▼</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-navy-100 bg-white py-1 text-navy-900 shadow-lg">
            <div className="border-b border-navy-100 px-4 py-2 sm:hidden">
              <p className="text-sm font-semibold text-navy-900">{nombre}</p>
              <p className="text-xs text-navy-500">{ROL_ETIQUETAS[rol]}</p>
            </div>
            {rol === "ADMIN" && (
              <Link
                href="/usuarios"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                👤 Editar usuarios
              </Link>
            )}
            <PushToggle />
            <button
              type="button"
              onClick={salir}
              className="block w-full border-t border-navy-100 px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Salir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BurbujaChat({ rol, miId }: { rol: Rol; miId: string }) {
  const puedeChatear =
    rol === "ADMIN" ||
    rol === "SUPERVISOR" ||
    rol === "GERENTE" ||
    rol === "LIDER" ||
    rol === "INSPECTOR" ||
    rol === "RESIDENTE";
  const [noLeidos, setNoLeidos] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!puedeChatear) return;

    let desde: string;
    try {
      desde = localStorage.getItem(CLAVE_ULTIMA_LECTURA_CHAT) ?? "";
    } catch {
      desde = "";
    }
    if (!desde) {
      desde = new Date().toISOString();
      try {
        localStorage.setItem(CLAVE_ULTIMA_LECTURA_CHAT, desde);
      } catch {
        // localStorage no disponible (modo privado, etc.): seguimos sin persistir
      }
    }

    function consultar() {
      fetch(`/api/chat/no-leidos?desde=${encodeURIComponent(desde)}`)
        .then((r) => r.json())
        .then((d) => setNoLeidos(d.noLeidos ?? 0))
        .catch(() => {});
    }

    consultar();
    const intervalo = setInterval(consultar, 8000);
    return () => clearInterval(intervalo);
  }, [puedeChatear]);

  function marcarLeido() {
    const ahora = new Date().toISOString();
    try {
      localStorage.setItem(CLAVE_ULTIMA_LECTURA_CHAT, ahora);
    } catch {
      // ignorar si no hay localStorage disponible
    }
    setNoLeidos(0);
  }

  if (!puedeChatear) return null;

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            marcarLeido();
          }}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-2xl text-white shadow-lg ring-4 ring-white/40 transition hover:scale-105 hover:bg-navy-600"
          aria-label="Abrir chat del equipo"
        >
          💬
          {noLeidos > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow ring-2 ring-white">
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
        </button>
      )}
      <ChatPanel
        miId={miId}
        abierto={abierto}
        onCerrar={() => {
          setAbierto(false);
          marcarLeido();
        }}
      />
    </>
  );
}
