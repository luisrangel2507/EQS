"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { ROL_ETIQUETAS, ROL_ETIQUETAS_EN } from "@/lib/constants";
import { NOMBRE_APP } from "@/lib/branding";
import { motion } from "framer-motion";
import { BotonTema } from "@/components/ui/Tema";
import { BotonIdioma, useIdioma } from "@/components/ui/Idioma";
import ChatPanel from "./ChatPanel";
import PushToggle from "./PushToggle";
import PaletaComandos from "./PaletaComandos";
import TourBienvenida from "./TourBienvenida";
import { OrganizacionProvider } from "@/components/Organizacion";
import type { EmpresaEmisora } from "@/lib/branding";
import Icono from "@/components/ui/Icono";

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
  organizacion: EmpresaEmisora;
  superadmin: boolean;
  children: React.ReactNode;
};

const LIDERAZGO: Rol[] = ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"];

// "principal" va siempre visible en escritorio; el resto cae en el menú "Más"
const ENLACES: { href: string; label: string; en: string; roles: Rol[]; principal?: boolean }[] = [
  { href: "/estacion", label: "Mis inspecciones", en: "My inspections", roles: ["INSPECTOR"], principal: true },
  {
    href: "/dashboard",
    label: "Dashboard",
    en: "Dashboard",
    roles: [...LIDERAZGO, "RESIDENTE", "CLIENTE"],
    principal: true,
  },
  {
    href: "/inspecciones",
    label: "Inspecciones",
    en: "Inspections",
    roles: [...LIDERAZGO, "RESIDENTE", "CLIENTE"],
    principal: true,
  },
  { href: "/inspecciones", label: "Historial", en: "History", roles: ["INSPECTOR"], principal: true },
  { href: "/solicitudes", label: "Solicitudes", en: "Requests", roles: [...LIDERAZGO, "CLIENTE"], principal: true },
  { href: "/turnos", label: "Turnos", en: "Shifts", roles: [...LIDERAZGO, "RESIDENTE"], principal: true },
  { href: "/ranking", label: "Ranking", en: "Ranking", roles: [...LIDERAZGO, "INSPECTOR"], principal: true },
  {
    href: "/certificaciones",
    label: "Certificaciones",
    en: "Certifications",
    roles: ["INSPECTOR"],
    principal: true,
  },
  { href: "/auditorias", label: "Auditorías", en: "Audits", roles: ["RESIDENTE", "CLIENTE"], principal: true },
  { href: "/residentes", label: "Residentes", en: "Residents", roles: LIDERAZGO },
  { href: "/auditorias", label: "Auditorías", en: "Audits", roles: LIDERAZGO },
  { href: "/certificaciones", label: "Certificaciones", en: "Certifications", roles: LIDERAZGO },
  { href: "/asistencia", label: "Asistencia y horas", en: "Attendance & hours", roles: LIDERAZGO },
  { href: "/facturacion", label: "Facturación", en: "Billing", roles: ["ADMIN", "GERENTE"] },
];

export default function AppShell({ id, nombre, rol, organizacion, superadmin, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useIdioma();
  const enlaces = ENLACES.filter((e) => e.roles.includes(rol)).map((e) => ({ ...e, label: t(e.label, e.en) }));
  const inicio = rol === "INSPECTOR" ? "/estacion" : "/dashboard";
  const esOperativo = rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER";
  const [inmersivo, setInmersivo] = useState(false);

  useEffect(() => {
    // siempre activo (no solo con push): da el caché que permite abrir pantallas sin señal
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <OrganizacionProvider value={organizacion}>
      <OcultarHeaderContext.Provider value={setInmersivo}>
        <div className="min-h-screen bg-background print:bg-white">
          <header className="sticky top-0 z-20 border-b border-navy-100 bg-navy-900 text-white print:hidden">
            {inmersivo ? (
              <div className="flex items-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => router.push(inicio)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white"
                >
                  ← {t("Regresar", "Back")}
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-6">
                    <Link href={inicio} className="flex items-center">
                      <Image
                        src="/logo-header.png"
                        alt={NOMBRE_APP}
                        width={800}
                        height={266}
                        priority
                        className="h-[42px] w-auto sm:h-[52px]"
                      />
                    </Link>
                    <nav className="hidden gap-1 lg:flex" data-tour="nav">
                      {enlaces
                        .filter((e) => e.principal)
                        .map((enlace) => {
                          const activo = pathname?.startsWith(enlace.href);
                          return (
                            <Link
                              key={enlace.href + enlace.label}
                              href={enlace.href}
                              className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                                activo ? "text-yellow" : "text-white/80 hover:bg-white/5 hover:text-white"
                              }`}
                            >
                              {activo && (
                                <motion.span
                                  layoutId="nav-activo"
                                  className="absolute inset-0 rounded-md bg-white/10"
                                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                                />
                              )}
                              <span className="relative">{enlace.label}</span>
                            </Link>
                          );
                        })}
                      <MenuMas enlaces={enlaces.filter((e) => !e.principal)} pathname={pathname ?? ""} />
                    </nav>
                  </div>
                  <div className="flex items-center gap-3">
                    {esOperativo && (
                      <Link
                        href="/dashboard/ejecutivo"
                        data-tour="ejecutivo"
                        className="flex items-center gap-1.5 rounded-md bg-yellow px-3 py-1.5 text-xs font-bold text-navy-900 transition hover:bg-yellow-400"
                      >
                        <Icono nombre="grafica" className="h-4 w-4" />
                        <span className="hidden 2xl:inline">{t("Dashboard Ejecutivo", "Executive dashboard")}</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event("eqs-abrir-paleta"))}
                      className="flex h-9 items-center gap-2 rounded-full px-2.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white xl:border xl:border-white/15 xl:px-3"
                      aria-label={t("Buscar (Ctrl K)", "Search (Ctrl K)")}
                      data-tour="buscar"
                    >
                      <Icono nombre="buscar" className="h-4 w-4" />
                      <span className="hidden xl:inline">{t("Buscar", "Search")}</span>
                      <kbd className="hidden rounded bg-white/10 px-1.5 text-[10px] font-semibold xl:inline">Ctrl K</kbd>
                    </button>
                    <NotificacionesBell rol={rol} />
                    <PerfilMenu nombre={nombre} rol={rol} organizacion={organizacion.nombreCorto} superadmin={superadmin} />
                  </div>
                </div>
                <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 py-1 lg:hidden" data-tour="nav">
                  {enlaces.map((enlace) => {
                    const activo = pathname?.startsWith(enlace.href);
                    return (
                      <Link
                        key={enlace.href + enlace.label}
                        href={enlace.href}
                        className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
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
          <main className={inmersivo ? "px-4 pb-24 pt-4" : "mx-auto max-w-7xl px-4 pb-24 pt-6"}>{children}</main>
          <div className="print:hidden">
            <BurbujaChat rol={rol} miId={id} />
          </div>
          <PaletaComandos rol={rol} />
          <TourBienvenida rol={rol} nombre={nombre} usuarioId={id} />
        </div>
      </OcultarHeaderContext.Provider>
    </OrganizacionProvider>
  );
}

function MenuMas({ enlaces, pathname }: { enlaces: { href: string; label: string }[]; pathname: string }) {
  const [abierto, setAbierto] = useState(false);
  const { t } = useIdioma();
  if (enlaces.length === 0) return null;
  const activo = enlaces.some((e) => pathname.startsWith(e.href));
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
          activo ? "text-yellow" : "text-white/80 hover:bg-white/5 hover:text-white"
        }`}
      >
        {activo && <span className="absolute inset-0 rounded-md bg-white/10" />}
        <span className="relative">{t("Más", "More")} ▾</span>
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-navy-100 bg-white py-1 text-navy-900 shadow-lg"
          >
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                onClick={() => setAbierto(false)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold hover:bg-navy-50 ${
                  pathname.startsWith(e.href) ? "text-navy-900" : "text-navy-600"
                }`}
              >
                {e.label}
              </Link>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

type Notificacion = {
  id: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  creadoEn: string;
  inspeccion: { id: string; nombre: string; numeroParte: string | null } | null;
};

function NotificacionesBell({ rol }: { rol: Rol }) {
  const puedeVer = rol !== "INSPECTOR" && rol !== "RESIDENTE";
  const { t, locale } = useIdioma();
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
        aria-label={t("Notificaciones", "Notifications")}
        data-tour="notificaciones"
      >
        <Icono nombre="campana" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow ring-2 ring-navy-900">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-20 mt-2 max-h-96 w-80 origin-top-right overflow-y-auto rounded-lg border border-navy-100 bg-white py-1 text-navy-900 shadow-lg"
          >
            <p className="border-b border-navy-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
              {t("Notificaciones", "Notifications")}
            </p>
            {notificaciones.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-navy-400">
                {t("Sin notificaciones todavía.", "No notifications yet.")}
              </p>
            ) : (
              notificaciones.map((n) => (
                <Link
                  key={n.id}
                  href={n.url ?? (n.inspeccion ? `/inspecciones/${n.inspeccion.id}` : "#")}
                  onClick={() => setAbierto(false)}
                  className={`block border-b border-navy-50 px-4 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-navy-50 ${
                    n.leida ? "" : "bg-yellow-50"
                  }`}
                >
                  <p className="text-navy-800">{n.mensaje}</p>
                  <p className="mt-0.5 text-xs text-navy-400">
                    {new Date(n.creadoEn).toLocaleString(locale, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              ))
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

function PerfilMenu({
  nombre,
  rol,
  organizacion,
  superadmin,
}: {
  nombre: string;
  rol: Rol;
  organizacion: string;
  superadmin: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const { t } = useIdioma();
  const rolTexto = t(ROL_ETIQUETAS[rol], ROL_ETIQUETAS_EN[rol]);
  const iniciales =
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  function salir() {
    navigator.serviceWorker?.controller?.postMessage("limpiar-cache");
    try {
      localStorage.removeItem("eqs_cola_capturas");
    } catch {
      // nada que limpiar
    }
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
        aria-label={t("Perfil", "Profile")}
        data-tour="perfil"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow text-sm font-bold text-navy-900">
          {iniciales}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{nombre}</span>
          <span className="block text-xs leading-tight text-white/60">
            {rolTexto} · {organizacion}
          </span>
        </span>
        <span className={`text-xs text-white/50 transition ${abierto ? "rotate-180" : ""}`}>▼</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-20 mt-2 w-64 origin-top-right overflow-hidden rounded-lg border border-navy-100 bg-white py-1 text-navy-900 shadow-lg"
          >
            <div className="border-b border-navy-100 px-4 py-2 sm:hidden">
              <p className="text-sm font-semibold text-navy-900">{nombre}</p>
              <p className="text-xs text-navy-500">
                {rolTexto} · {organizacion}
              </p>
            </div>
            {superadmin && (
              <Link
                href="/plataforma"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                {t("Plataforma (empresas)", "Platform (companies)")}
              </Link>
            )}
            {rol === "ADMIN" && (
              <Link
                href="/usuarios"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                {t("Editar usuarios", "Manage users")}
              </Link>
            )}
            {rol === "ADMIN" && (
              <Link
                href="/empresas"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                {t("Empresas cliente", "Customer companies")}
              </Link>
            )}
            {rol === "ADMIN" && (
              <Link
                href="/salud"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                {t("Estado del sistema", "System status")}
              </Link>
            )}
            {rol !== "INSPECTOR" && rol !== "CLIENTE" && (
              <Link
                href="/tv"
                onClick={() => setAbierto(false)}
                className="block w-full px-4 py-2 text-left text-sm font-semibold text-navy-700 hover:bg-navy-50"
              >
                {t("Modo TV (piso)", "TV mode (floor)")}
              </Link>
            )}
            <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-navy-700">
              {t("Idioma", "Language")}
              <BotonIdioma />
            </div>
            <BotonTema />
            <PushToggle />
            <button
              type="button"
              onClick={salir}
              className="block w-full border-t border-navy-100 px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              {t("Salir", "Sign out")}
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}

function BurbujaChat({ rol, miId }: { rol: Rol; miId: string }) {
  const puedeChatear =
    rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE" || rol === "LIDER" || rol === "INSPECTOR" || rol === "RESIDENTE";
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
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onClick={() => {
            setAbierto(true);
            marcarLeido();
          }}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-2xl text-white shadow-lg ring-4 ring-white/40 transition hover:scale-105 hover:bg-navy-600"
          aria-label="Abrir chat del equipo"
          data-tour="chat"
        >
          <Icono nombre="chat" className="h-6 w-6" />
          {noLeidos > 0 && (
            <motion.span
              key={noLeidos}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 15 }}
              className="absolute -right-1 -top-1 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow ring-2 ring-white"
            >
              {noLeidos > 9 ? "9+" : noLeidos}
            </motion.span>
          )}
        </motion.button>
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
