"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ROL_ETIQUETAS } from "@/lib/constants";

type Props = {
  nombre: string;
  rol: Rol;
  children: React.ReactNode;
};

const ENLACES: { href: string; label: string; roles: Rol[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "SUPERVISOR", "INSPECTOR", "CLIENTE"] },
  { href: "/inspecciones", label: "Inspecciones", roles: ["ADMIN", "SUPERVISOR", "INSPECTOR", "CLIENTE"] },
  { href: "/reportes", label: "Reportes", roles: ["ADMIN", "SUPERVISOR", "CLIENTE"] },
  { href: "/usuarios", label: "Usuarios", roles: ["ADMIN"] },
];

export default function AppShell({ nombre, rol, children }: Props) {
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
                Control de Inspecciones
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
    </div>
  );
}
