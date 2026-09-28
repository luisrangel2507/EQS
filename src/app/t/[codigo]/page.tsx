import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { codigoValido } from "@/lib/etiquetas";
import { NOMBRE_APP, NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";
import { ZONA_HORARIA } from "@/lib/turnos";
import { traductorServidor } from "@/lib/i18nServidor";
import { nombreDefecto } from "@/lib/i18n";
import { BotonIdioma } from "@/components/ui/Idioma";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const { t } = traductorServidor();
  return {
    title: `${t("Verificación de material", "Material verification")} · ${NOMBRE_APP}`,
    robots: { index: false, follow: false },
  };
}

const fechaEn = (locale: string) => (d: Date) =>
  d.toLocaleString(locale, {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const soloNombre = (n: string) => n.split(" ")[0];

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-navy-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{etiqueta}</p>
      <p className="font-display text-base font-bold text-navy-900">{valor}</p>
    </div>
  );
}

export default async function VerificacionPage({ params }: { params: { codigo: string } }) {
  const { t, idioma, locale } = traductorServidor();
  const fecha = fechaEn(locale);
  const miles = (n: number) => n.toLocaleString(locale);
  const codigo = params.codigo.toUpperCase();
  const etiqueta = codigoValido(codigo)
    ? await prisma.etiquetaLiberacion.findUnique({
        where: { codigo },
        include: {
          creadaPor: { select: { nombre: true } },
          inspeccion: {
            select: {
              id: true,
              nombre: true,
              numeroParte: true,
              cliente: true,
              planta: true,
              piezasBuenas: true,
              piezasMalas: true,
              piezasRetrabajadas: true,
              cerrado: true,
              cerradoEn: true,
              creadoEn: true,
              defectos: { orderBy: { cantidad: "desc" }, take: 3, select: { tipo: true, cantidad: true } },
            },
          },
        },
      })
    : null;

  if (!etiqueta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 p-6 text-center text-white">
        <div className="max-w-sm">
          <p className="text-6xl">❓</p>
          <h1 className="mt-3 font-display text-2xl font-bold">{t("Etiqueta no encontrada", "Label not found")}</h1>
          <p className="mt-2 text-white/70">
            {t("El código", "Code")} <span className="font-mono font-bold">{codigo}</span>{" "}
            {t(
              `no corresponde a material liberado por ${NOMBRE_EMPRESA}. Aparta el contenedor y confirma con tu contacto de calidad.`,
              `does not match any material released by ${NOMBRE_EMPRESA}. Set the container aside and check with your quality contact.`,
            )}
          </p>
        </div>
      </main>
    );
  }

  await prisma.etiquetaLiberacion.update({
    where: { id: etiqueta.id },
    data: { escaneos: { increment: 1 }, ultimoEscaneo: new Date() },
  });
  const session = await getServerSession(authOptions);

  const i = etiqueta.inspeccion;
  const inspeccionadas = i.piezasBuenas + i.piezasMalas;
  const scrap = i.piezasMalas - i.piezasRetrabajadas;
  const rechazo = inspeccionadas ? (scrap / inspeccionadas) * 100 : 0;
  const ok = !etiqueta.anulada;

  return (
    <main className="min-h-screen bg-navy-50 pb-10">
      <header className={`${ok ? "bg-navy-950" : "bg-red-700"} px-4 pb-16 pt-5 text-white`}>
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Image src="/logo-header.png" alt={NOMBRE_EMPRESA} width={800} height={266} className="h-9 w-auto" priority />
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-white/60">L-{String(etiqueta.folio).padStart(6, "0")}</span>
            <BotonIdioma oscuro />
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-12 max-w-lg space-y-4 px-4">
        <section className="animate-[aparecer_0.5s_ease-out] rounded-3xl bg-white p-6 text-center shadow-xl">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
              ok ? "bg-emerald-100" : "bg-red-100"
            }`}
          >
            {ok ? "✅" : "⛔"}
          </div>
          <h1 className={`mt-3 font-display text-2xl font-extrabold ${ok ? "text-emerald-700" : "text-red-700"}`}>
            {ok ? t("Material liberado", "Material released") : t("Etiqueta anulada", "Label voided")}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {ok
              ? t(
                  `Este contenedor fue inspeccionado y liberado por ${NOMBRE_LEGAL}.`,
                  `This container was inspected and released by ${NOMBRE_LEGAL}.`,
                )
              : t(
                  "No uses este material. Apártalo y contacta a calidad.",
                  "Do not use this material. Set it aside and contact quality.",
                )}
          </p>
          {!ok && etiqueta.motivoAnulacion && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {t("Motivo", "Reason")}: {etiqueta.motivoAnulacion}
              {etiqueta.anuladaEn && <span className="block text-xs text-red-600">{fecha(etiqueta.anuladaEn)}</span>}
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{t("Número de parte", "Part number")}</p>
          <p className="font-display text-3xl font-extrabold text-navy-900">{i.numeroParte ?? i.nombre}</p>
          {i.numeroParte && <p className="text-sm text-navy-500">{i.nombre}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Dato etiqueta={t("Piezas en contenedor", "Parts in container")} valor={miles(etiqueta.cantidad)} />
            <Dato
              etiqueta={t("Contenedor", "Container")}
              valor={`${etiqueta.contenedor} ${t("de", "of")} ${etiqueta.totalContenedores}`}
            />
            <Dato etiqueta={t("Lote", "Lot")} valor={etiqueta.lote ?? "—"} />
            <Dato etiqueta={t("Cliente", "Customer")} valor={i.cliente ?? "—"} />
            <Dato etiqueta={t("Liberado", "Released")} valor={fecha(etiqueta.creadoEn)} />
            <Dato etiqueta={t("Liberó", "Released by")} valor={soloNombre(etiqueta.creadaPor.nombre)} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-display font-bold text-navy-900">{t("Resumen de la inspección", "Inspection summary")}</h2>
          <p className="text-xs text-navy-400">
            {i.planta ? `${t("Planta", "Plant")} ${i.planta} · ` : ""}
            {i.cerrado && i.cerradoEn
              ? `${t("Cerrada", "Closed")} ${fecha(i.cerradoEn)}`
              : `${t("En proceso desde", "In progress since")} ${fecha(i.creadoEn)}`}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Dato etiqueta={t("Inspeccionadas", "Inspected")} valor={miles(inspeccionadas)} />
            <Dato etiqueta={t("Recuperadas", "Reworked OK")} valor={miles(i.piezasRetrabajadas)} />
            <Dato etiqueta={t("% Rechazo", "% Reject")} valor={`${rechazo.toFixed(1)}%`} />
          </div>
          {i.defectos.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
                {t("Defectos separados", "Defects contained")}
              </p>
              <ul className="space-y-1 text-sm">
                {i.defectos.map((d) => (
                  <li key={d.tipo} className="flex justify-between">
                    <span className="text-navy-700">{nombreDefecto(d.tipo, idioma)}</span>
                    <span className="font-semibold tabular-nums text-navy-900">{miles(d.cantidad)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {session && (
          <Link href={`/inspecciones/${i.id}`} className="btn-primary flex w-full justify-center py-3">
            {t("Abrir inspección en la app", "Open inspection in the app")}
          </Link>
        )}

        <p className="text-center text-xs text-navy-400">
          {t("Código", "Code")} {etiqueta.codigo} · {t("Verificado", "Verified")} {fecha(new Date())}
          <br />
          {NOMBRE_APP}
        </p>
      </div>
    </main>
  );
}
