"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePolling } from "@/lib/usePolling";
import { Kpi } from "@/app/(app)/dashboard/shared";
import Modal from "@/components/ui/Modal";
import { SkeletonPagina } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useIdioma } from "@/components/ui/Idioma";

type Org = {
  id: string;
  nombre: string;
  nombreCorto: string;
  activa: boolean;
  creadoEn: string;
  _count: { usuarios: number; inspecciones: number; empresas: number };
  inspeccionesActivas: number;
  piezasMes: number;
  ultimaActividad: string | null;
  esLaMia: boolean;
};

type Credenciales = { nombre: string; usuario: string; password: string };

export default function PlataformaClient() {
  const { t, locale } = useIdioma();
  const toast = useToast();
  const { datos, cargando, recargar } = usePolling<Org[]>("/api/plataforma", 60000);
  const [nueva, setNueva] = useState(false);
  const [editando, setEditando] = useState<Org | null>(null);
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);

  if (cargando && !datos) return <SkeletonPagina />;
  if (!datos) return null;

  const activas = datos.filter((o) => o.activa);
  const piezas = datos.reduce((s, o) => s + o.piezasMes, 0);
  const usuarios = datos.reduce((s, o) => s + o._count.usuarios, 0);

  async function alternar(o: Org) {
    const res = await fetch(`/api/plataforma/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !o.activa }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? t("No se pudo actualizar", "Could not update"));
      return;
    }
    toast.info(
      o.activa
        ? t(`${o.nombreCorto} suspendida: sus usuarios ya no pueden entrar`, `${o.nombreCorto} suspended: its users can no longer sign in`)
        : t(`${o.nombreCorto} reactivada`, `${o.nombreCorto} reactivated`)
    );
    recargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">🌐 {t("Plataforma", "Platform")}</h1>
          <p className="text-sm text-navy-500">
            {t(
              "Cada organización ve solo sus usuarios, inspecciones y clientes. Aquí das de alta nuevas empresas de sorteo.",
              "Each organization only sees its own users, inspections and customers. Onboard new sorting companies here."
            )}
          </p>
        </div>
        <button className="btn-accent" onClick={() => setNueva(true)}>
          + {t("Nueva organización", "New organization")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta={t("Organizaciones activas", "Active organizations")} valor={activas.length} />
        <Kpi etiqueta={t("Usuarios", "Users")} valor={usuarios} indice={1} />
        <Kpi etiqueta={t("Piezas del mes", "Parts this month")} valor={piezas} indice={2} />
        <Kpi etiqueta={t("Suspendidas", "Suspended")} valor={datos.length - activas.length} indice={3} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {datos.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 9) * 0.04 }}
            className={`card flex flex-col gap-3 ${o.activa ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 font-display text-sm font-extrabold text-yellow">
                  {o.nombreCorto.slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-navy-900">{o.nombreCorto}</p>
                  <p className="truncate text-xs text-navy-500">{o.nombre}</p>
                </div>
              </div>
              {o.esLaMia ? (
                <span className="badge bg-yellow-100 text-navy-800">{t("Tu organización", "Yours")}</span>
              ) : (
                <span className={`badge ${o.activa ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                  {o.activa ? t("Activa", "Active") : t("Suspendida", "Suspended")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { v: o._count.usuarios, e: t("usuarios", "users") },
                { v: o.inspeccionesActivas, e: t("sorteos activos", "active sorts") },
                { v: o.piezasMes.toLocaleString(locale), e: t("pzas mes", "pcs month") },
              ].map((k) => (
                <div key={k.e} className="rounded-lg bg-navy-50 py-2">
                  <p className="font-display text-lg font-bold text-navy-900">{k.v}</p>
                  <p className="text-[10px] uppercase tracking-wide text-navy-500">{k.e}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-navy-400">
              {t("Alta", "Since")} {new Date(o.creadoEn).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
              {o.ultimaActividad
                ? `${t("última captura", "last entry")} ${new Date(o.ultimaActividad).toLocaleDateString(locale, { day: "2-digit", month: "short" })}`
                : t("sin capturas todavía", "no entries yet")}
            </p>
            <div className="mt-auto flex gap-2">
              <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => setEditando(o)}>
                {t("Editar", "Edit")}
              </button>
              {!o.esLaMia && (
                <button
                  className={`px-3 py-1.5 text-sm font-semibold ${o.activa ? "text-red-600 hover:underline" : "text-emerald-700 hover:underline"}`}
                  onClick={() => alternar(o)}
                >
                  {o.activa ? t("Suspender", "Suspend") : t("Reactivar", "Reactivate")}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal abierto={nueva} onCerrar={() => setNueva(false)} ancho="max-w-md">
        {nueva && (
          <FormularioOrg
            onCerrar={() => setNueva(false)}
            onHecho={(c) => {
              setNueva(false);
              setCredenciales(c);
              recargar();
            }}
          />
        )}
      </Modal>
      <Modal abierto={Boolean(editando)} onCerrar={() => setEditando(null)} ancho="max-w-md">
        {editando && (
          <FormularioOrg
            org={editando}
            onCerrar={() => setEditando(null)}
            onHecho={() => {
              setEditando(null);
              recargar();
            }}
          />
        )}
      </Modal>
      <Modal abierto={Boolean(credenciales)} onCerrar={() => setCredenciales(null)} ancho="max-w-md">
        <AnimatePresence>{credenciales && <Entrega c={credenciales} onCerrar={() => setCredenciales(null)} />}</AnimatePresence>
      </Modal>
    </div>
  );
}

function FormularioOrg({ org, onCerrar, onHecho }: { org?: Org; onCerrar: () => void; onHecho: (c: Credenciales) => void }) {
  const { t } = useIdioma();
  const toast = useToast();
  const [nombre, setNombre] = useState(org?.nombre ?? "");
  const [nombreCorto, setNombreCorto] = useState(org?.nombreCorto ?? "");
  const [adminNombre, setAdminNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const res = await fetch(org ? `/api/plataforma/${org.id}` : "/api/plataforma", {
      method: org ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(org ? { nombre, nombreCorto } : { nombre, nombreCorto, admin: { nombre: adminNombre, usuario } }),
    });
    setEnviando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error ?? t("No se pudo guardar", "Could not save"));
      return;
    }
    if (org) toast.exito(t("Organización actualizada", "Organization updated"));
    onHecho({ nombre: d.nombre ?? nombre, usuario: d.usuario, password: d.password });
  }

  return (
    <form onSubmit={guardar} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-navy-900">
        {org ? t("Editar organización", "Edit organization") : t("Nueva organización", "New organization")}
      </h2>
      <div>
        <label className="label">{t("Razón social", "Legal name")}</label>
        <input className="input" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sorteos del Bajío S.A. de C.V." />
        <p className="mt-1 text-xs text-navy-400">{t("Sale en reportes, PDF y en la verificación de etiquetas.", "Shown on reports, PDFs and label verification.")}</p>
      </div>
      <div>
        <label className="label">{t("Nombre corto / marca", "Short name / brand")}</label>
        <input className="input" required minLength={2} maxLength={30} value={nombreCorto} onChange={(e) => setNombreCorto(e.target.value)} placeholder="Ej. SDB" />
      </div>
      {!org && (
        <div className="space-y-3 rounded-xl bg-navy-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{t("Su primer Administrador", "Its first Administrator")}</p>
          <input className="input bg-white" required minLength={2} value={adminNombre} onChange={(e) => setAdminNombre(e.target.value)} placeholder={t("Nombre completo", "Full name")} />
          <input
            className="input bg-white"
            required
            minLength={3}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder={t("Usuario (ej. admin.sdb)", "Username (e.g. admin.sdb)")}
            autoCapitalize="none"
          />
          <p className="text-xs text-navy-400">{t("Se genera una contraseña temporal para entregarle.", "A temporary password is generated to hand over.")}</p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCerrar}>
          {t("Cancelar", "Cancel")}
        </button>
        <button className="btn-primary" disabled={enviando}>
          {enviando ? t("Guardando…", "Saving…") : org ? t("Guardar", "Save") : t("Crear organización", "Create organization")}
        </button>
      </div>
    </form>
  );
}

function Entrega({ c, onCerrar }: { c: Credenciales; onCerrar: () => void }) {
  const { t } = useIdioma();
  const toast = useToast();
  const texto = t(
    `Tu cuenta de ${c.nombre} está lista.\nEntra en ${window.location.origin}/login\nUsuario: ${c.usuario}\nContraseña temporal: ${c.password}`,
    `Your ${c.nombre} account is ready.\nSign in at ${window.location.origin}/login\nUsername: ${c.usuario}\nTemporary password: ${c.password}`
  );
  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
      <p className="text-4xl">🎉</p>
      <h2 className="font-display text-lg font-bold text-navy-900">{t("Organización creada", "Organization created")}</h2>
      <p className="text-sm text-navy-500">
        {t("Entrega estos datos a su Administrador. La contraseña no se vuelve a mostrar.", "Hand these to its Administrator. The password won’t be shown again.")}
      </p>
      <pre className="whitespace-pre-wrap rounded-xl bg-navy-50 p-3 font-mono text-sm text-navy-900">{texto}</pre>
      <div className="flex justify-end gap-2">
        <button
          className="btn-secondary"
          onClick={() =>
            navigator.clipboard
              .writeText(texto)
              .then(() => toast.exito(t("Copiado", "Copied")))
              .catch(() => toast.error(t("No se pudo copiar", "Could not copy")))
          }
        >
          📋 {t("Copiar", "Copy")}
        </button>
        <button className="btn-primary" onClick={onCerrar}>
          {t("Listo", "Done")}
        </button>
      </div>
    </motion.div>
  );
}
