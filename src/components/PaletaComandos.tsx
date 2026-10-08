"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Rol } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { alternarTema } from "@/components/ui/Tema";
import { useIdioma } from "@/components/ui/Idioma";
import Icono from "@/components/ui/Icono";

type Comando = {
  id: string;
  grupo: "Ir a" | "Acciones" | "Inspecciones";
  titulo: string;
  detalle?: string;
  claves?: string;
  ejecutar: () => void;
};

type InspeccionLigera = {
  id: string;
  nombre: string;
  numeroParte: string | null;
  cliente: string | null;
  planta: string | null;
  cerrado: boolean;
};

const GRUPOS_EN: Record<Comando["grupo"], string> = { "Ir a": "Go to", Acciones: "Actions", Inspecciones: "Inspections" };

const LIDERAZGO: Rol[] = ["ADMIN", "SUPERVISOR", "GERENTE", "LIDER"];

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function coincide(texto: string, consulta: string) {
  const base = normalizar(texto);
  return normalizar(consulta)
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => base.includes(palabra));
}

export default function PaletaComandos({ rol }: { rol: Rol }) {
  const router = useRouter();
  const { t } = useIdioma();
  const [abierta, setAbierta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);
  const [inspecciones, setInspecciones] = useState<InspeccionLigera[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierta((a) => !a);
      }
    };
    const abrir = () => setAbierta(true);
    window.addEventListener("keydown", tecla);
    window.addEventListener("ia-abrir-paleta", abrir);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("ia-abrir-paleta", abrir);
    };
  }, []);

  useEffect(() => {
    if (!abierta) {
      setConsulta("");
      setActivo(0);
      return;
    }
    fetch("/api/inspecciones")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInspecciones)
      .catch(() => setInspecciones([]));
  }, [abierta]);

  const comandos = useMemo<Comando[]>(() => {
    const ir = (href: string) => () => router.push(href);
    const lista: (Comando | false)[] = [
      rol === "INSPECTOR" && { id: "estacion", grupo: "Ir a", titulo: t("Mis inspecciones", "My inspections"), ejecutar: ir("/estacion") },
      rol !== "INSPECTOR" && { id: "dashboard", grupo: "Ir a", titulo: t("Dashboard", "Dashboard"), ejecutar: ir("/dashboard") },
      LIDERAZGO.includes(rol) && { id: "ejecutivo", grupo: "Ir a", titulo: t("Dashboard Ejecutivo", "Executive dashboard"), ejecutar: ir("/dashboard/ejecutivo") },
      { id: "inspecciones", grupo: "Ir a", titulo: rol === "INSPECTOR" ? t("Historial", "History") : t("Inspecciones", "Inspections"), ejecutar: ir("/inspecciones") },
      LIDERAZGO.includes(rol) && { id: "residentes", grupo: "Ir a", titulo: t("Residentes", "Residents"), ejecutar: ir("/residentes") },
      (LIDERAZGO.includes(rol) || rol === "CLIENTE") && { id: "solicitudes", grupo: "Ir a", titulo: t("Solicitudes de servicio", "Service requests"), ejecutar: ir("/solicitudes") },
      (LIDERAZGO.includes(rol) || rol === "RESIDENTE") && { id: "turnos", grupo: "Ir a", titulo: t("Turnos", "Shifts"), ejecutar: ir("/turnos") },
      (LIDERAZGO.includes(rol) || rol === "INSPECTOR") && { id: "ranking", grupo: "Ir a", titulo: t("Ranking", "Ranking"), ejecutar: ir("/ranking") },
      (LIDERAZGO.includes(rol) || rol === "INSPECTOR") && { id: "certificaciones", grupo: "Ir a", titulo: rol === "INSPECTOR" ? t("Mis certificaciones", "My certifications") : t("Certificaciones y matriz de habilidades", "Certifications & skills matrix"), ejecutar: ir("/certificaciones") },
      rol !== "INSPECTOR" && { id: "auditorias", grupo: "Ir a", titulo: t("Auditorías y checklists", "Audits & checklists"), ejecutar: ir("/auditorias") },
      (LIDERAZGO.includes(rol) || rol === "RESIDENTE") && { id: "nueva-auditoria", grupo: "Acciones", titulo: t("Nueva auditoría", "New audit"), ejecutar: ir("/auditorias?nueva=1") },
      LIDERAZGO.includes(rol) && { id: "asistencia", grupo: "Ir a", titulo: t("Asistencia y horas", "Attendance & hours"), ejecutar: ir("/asistencia") },
      (rol === "ADMIN" || rol === "SUPERVISOR" || rol === "GERENTE") && { id: "bitacora", grupo: "Ir a", titulo: t("Bitácora de cambios", "Change log"), ejecutar: ir("/bitacora") },
      (rol === "ADMIN" || rol === "GERENTE") && { id: "facturacion", grupo: "Ir a", titulo: t("Facturación", "Billing"), ejecutar: ir("/facturacion") },
      rol === "ADMIN" && { id: "usuarios", grupo: "Ir a", titulo: t("Usuarios", "Users"), ejecutar: ir("/usuarios") },
      rol === "ADMIN" && { id: "empresas", grupo: "Ir a", titulo: t("Empresas cliente", "Customer companies"), ejecutar: ir("/empresas") },
      rol === "ADMIN" && { id: "salud", grupo: "Ir a", titulo: t("Estado del sistema", "System status"), detalle: t("Base de datos y almacenamiento de fotos", "Database and photo storage"), ejecutar: ir("/salud") },
      (LIDERAZGO.includes(rol) || rol === "RESIDENTE") && { id: "tv", grupo: "Ir a", titulo: t("Modo TV (piso)", "TV mode (floor)"), ejecutar: ir("/tv") },
      (rol === "ADMIN" || rol === "SUPERVISOR") && { id: "nueva", grupo: "Acciones", titulo: t("Nueva inspección", "New inspection"), ejecutar: ir("/inspecciones?nueva=1") },
      (LIDERAZGO.includes(rol) || rol === "RESIDENTE") && { id: "entregar", grupo: "Acciones", titulo: t("Entregar turno", "Hand over shift"), ejecutar: ir("/turnos?entregar=1") },
      rol === "ADMIN" && { id: "alta-cliente", grupo: "Acciones", titulo: t("Dar de alta un cliente", "Onboard a customer"), ejecutar: ir("/empresas?alta=1") },
      (LIDERAZGO.includes(rol) || rol === "CLIENTE") && { id: "nueva-solicitud", grupo: "Acciones", titulo: t("Nueva solicitud de servicio", "New service request"), ejecutar: ir("/solicitudes?nueva=1") },
      { id: "tema", grupo: "Acciones", titulo: t("Cambiar modo claro / oscuro", "Toggle light / dark mode"), ejecutar: alternarTema },
      { id: "tour", grupo: "Acciones", titulo: t("Ver el recorrido de bienvenida", "Replay the welcome tour"), ejecutar: () => window.dispatchEvent(new Event("ia-iniciar-tour")) },
      {
        id: "salir",
        grupo: "Acciones",
        titulo: t("Cerrar sesión", "Sign out"),
        ejecutar: () => signOut({ callbackUrl: `${window.location.origin}/login` }),
      },
    ];
    return lista.filter(Boolean) as Comando[];
  }, [rol, router, t]);

  const resultados = useMemo(() => {
    const fijos = consulta ? comandos.filter((c) => coincide(`${c.titulo} ${c.detalle ?? ""}`, consulta)) : comandos;
    const deInspecciones: Comando[] = consulta
      ? (inspecciones ?? [])
          .filter((i) => coincide(`${i.numeroParte ?? ""} ${i.nombre} ${i.cliente ?? ""} ${i.planta ?? ""}`, consulta))
          .sort((a, b) => Number(a.cerrado) - Number(b.cerrado))
          .slice(0, 6)
          .map((i) => ({
            id: `insp-${i.id}`,
            grupo: "Inspecciones" as const,
            titulo: i.numeroParte ?? i.nombre,
            detalle: [i.numeroParte ? i.nombre : null, i.cliente, i.cerrado ? t("Cerrada", "Closed") : t("Activa", "Active")].filter(Boolean).join(" · "),
            ejecutar: () => router.push(`/inspecciones/${i.id}`),
          }))
      : [];
    return [...deInspecciones, ...fijos];
  }, [comandos, consulta, inspecciones, router, t]);

  useEffect(() => {
    setActivo(0);
  }, [consulta]);

  useEffect(() => {
    listaRef.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  function ejecutar(c: Comando | undefined) {
    if (!c) return;
    setAbierta(false);
    c.ejecutar();
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((a) => Math.min(resultados.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      ejecutar(resultados[activo]);
    } else if (e.key === "Escape") {
      setAbierta(false);
    }
  }

  let grupoPrevio: string | null = null;

  return (
    <AnimatePresence>
      {abierta && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-navy-950/60 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAbierta(false)}
        >
          <motion.div
            role="dialog"
            aria-label={t("Paleta de comandos", "Command palette")}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-navy-100 px-4">
              <Icono nombre="buscar" className="h-5 w-5 text-navy-400" />
              <input
                ref={inputRef}
                autoFocus
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                onKeyDown={teclas}
                placeholder={t("Busca una pieza, cliente, página o acción…", "Search a part, customer, page or action…")}
                className="h-14 flex-1 bg-transparent text-base text-navy-900 outline-none placeholder:text-navy-400"
              />
              <kbd className="rounded border border-navy-200 px-1.5 py-0.5 text-[10px] font-semibold text-navy-400">Esc</kbd>
            </div>
            <ul ref={listaRef} className="max-h-[55vh] overflow-y-auto p-2">
              {resultados.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-navy-400">
                  {inspecciones === null ? t("Buscando…", "Searching…") : t(`Nada coincide con "${consulta}"`, `Nothing matches "${consulta}"`)}
                </li>
              )}
              {resultados.map((c, i) => {
                const encabezado = c.grupo !== grupoPrevio ? c.grupo : null;
                grupoPrevio = c.grupo;
                return (
                  <li key={c.id}>
                    {encabezado && (
                      <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                        {t(encabezado, GRUPOS_EN[encabezado])}
                      </p>
                    )}
                    <button
                      data-indice={i}
                      onMouseMove={() => setActivo(i)}
                      onClick={() => ejecutar(c)}
                      className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        i === activo ? "text-navy-900" : "text-navy-700"
                      }`}
                    >
                      {i === activo && (
                        <motion.span
                          layoutId="paleta-activo"
                          className="absolute inset-0 rounded-xl bg-navy-50"
                          transition={{ type: "spring", stiffness: 600, damping: 40 }}
                        />
                      )}
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.titulo}</span>
                        {c.detalle && <span className="block truncate text-xs text-navy-400">{c.detalle}</span>}
                      </span>
                      {i === activo && <span className="relative text-xs text-navy-400">↵</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-navy-100 px-4 py-2 text-[11px] text-navy-400">
              <span>↑↓ {t("moverse", "move")}</span>
              <span>↵ {t("abrir", "open")}</span>
              <span className="ml-auto">Ctrl K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
