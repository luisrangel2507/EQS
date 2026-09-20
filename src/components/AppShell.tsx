"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ROL_ETIQUETAS } from "@/lib/constants";
import ChatPanel from "./ChatPanel";

const CLAVE_ULTIMA_LECTURA_CHAT = "eqs_chat_ultima_lectura";

type Props = {
  id: string;
  nombre: string;
  rol: Rol;
  children: React.ReactNode;
};

const ENLACES: { href: string; label: string; roles: Rol[] }[] = [
  { href: "/estacion", label: "Mis inspecciones", roles: ["INSPECTOR"] },
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "SUPERVISOR", "LIDER", "INSPECTOR", "CLIENTE"] },
  { href: "/inspecciones", label: "Inspecciones", roles: ["ADMIN", "SUPERVISOR", "LIDER", "INSPECTOR", "CLIENTE"] },
  { href: "/reportes", label: "Reportes", roles: ["ADMIN", "SUPERVISOR", "LIDER", "CLIENTE"] },
  { href: "/usuarios", label: "Usuarios", roles: ["ADMIN"] },
];

export default function AppShell({ id, nombre, rol, children }: Props) {
  const pathname = usePathname();
  const enlaces = ENLACES.filter((e) => e.roles.includes(rol));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-navy-100 bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow font-display text-lg font-extrabold text-navy-900">
                EQS
              </span>
              <span className="hidden font-display text-sm font-semibold sm:block">
                InspeccionApp
              </span>
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
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{nombre}</p>
              <p className="text-xs leading-tight text-white/60">{ROL_ETIQUETAS[rol]}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
            >
              Salir
            </button>
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
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <BurbujaChat rol={rol} miId={id} />
    </div>
  );
}

function BurbujaChat({ rol, miId }: { rol: Rol; miId: string }) {
  const puedeChatear = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "LIDER";
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
          aria-label="Abrir chat de liderazgo"
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
