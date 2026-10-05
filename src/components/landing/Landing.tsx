"use client";

import Image from "next/image";
import Link from "next/link";
import { BotonIdioma, useIdioma } from "@/components/ui/Idioma";
import type { Traductor } from "@/lib/i18n";
import { CONTACTO_EMAIL, CONTACTO_WHATSAPP, NOMBRE_APP, NOMBRE_CORTO, NOMBRE_EMPRESA, NOMBRE_LEGAL } from "@/lib/branding";

const urlDemo = (t: Traductor) =>
  CONTACTO_WHATSAPP
    ? `https://wa.me/${CONTACTO_WHATSAPP}?text=${encodeURIComponent(
        t(`Hola, me interesa una demo de ${NOMBRE_APP}.`, `Hi, I'm interested in a demo of ${NOMBRE_APP}.`)
      )}`
    : CONTACTO_EMAIL
      ? `mailto:${CONTACTO_EMAIL}?subject=${encodeURIComponent(t(`Demo de ${NOMBRE_APP}`, `${NOMBRE_APP} demo`))}`
      : null;

type Texto = [es: string, en: string];

// Lo que incluye, agrupado por quién lo usa. Sin íconos: texto corto y concreto.
const GRUPOS: { titulo: Texto; items: [Texto, Texto][] }[] = [
  {
    titulo: ["En la estación", "At the station"],
    items: [
      [
        ["Captura por pieza o por lote", "Count by piece or by batch"],
        ["Botones grandes, deshacer y foto del defecto.", "Large buttons, undo and a photo of the defect."],
      ],
      [
        ["Sin señal, sigue funcionando", "Keeps working with no signal"],
        ["Lo capturado se envía solo al volver la red.", "Entries are sent automatically when the network returns."],
      ],
      [
        ["Criterio de aceptación a la mano", "Acceptance criteria at hand"],
        ["Instrucción de trabajo y examen por número de parte.", "Work instruction and a per-part-number exam."],
      ],
      [
        ["Retrabajo y llamado al líder", "Rework and call the lead"],
        ["Piezas recuperadas aparte y apoyo con un botón.", "Recovered parts tracked separately; help with one button."],
      ],
    ],
  },
  {
    titulo: ["Para supervisión", "For supervisors"],
    items: [
      [
        ["Estado de cada sorteo", "Status of every sort"],
        ["Avance, % de rechazo y fecha estimada de término.", "Progress, reject rate and estimated finish date."],
      ],
      [
        ["Gráfica p por hora", "Hourly p-chart"],
        ["Aviso cuando una hora sale de control.", "Alert when an hour goes out of control."],
      ],
      [
        ["Turnos, asistencia y auditorías", "Shifts, attendance and audits"],
        ["Entrega de turno, horas por inspector, LPA y 5S.", "Shift handover, hours per inspector, LPA and 5S."],
      ],
      [
        ["Facturación del mes", "Monthly billing"],
        ["Por pieza o por hora, con estado de cuenta en PDF.", "Per piece or per hour, with a PDF statement."],
      ],
    ],
  },
  {
    titulo: ["Para tu cliente", "For your customer"],
    items: [
      [
        ["Portal en vivo", "Live portal"],
        ["Avance, Pareto y fotos, sin pedir reportes por WhatsApp.", "Progress, Pareto and photos, no chasing reports."],
      ],
      [
        ["Etiqueta por contenedor", "A label per container"],
        ["Su QR muestra qué se inspeccionó, cuándo y quién lo liberó.", "Its QR shows what was inspected, when and who released it."],
      ],
      [
        ["Reportes 8D y de cierre", "8D and closing reports"],
        ["En PDF, en español o inglés.", "As PDF, in English or Spanish."],
      ],
      [
        ["Solicitudes de servicio", "Service requests"],
        ["Pide un sorteo o retrabajo y lo sigue desde ahí.", "Requests a sort or rework and follows it from there."],
      ],
    ],
  },
];

function Botones({ registro, oscuro = true }: { registro: boolean; oscuro?: boolean }) {
  const { t } = useIdioma();
  const demo = urlDemo(t);
  const secundario = oscuro
    ? "border border-white/30 text-white hover:bg-white/10"
    : "border border-navy-200 text-navy-900 hover:bg-navy-50";
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/login"
        className="inline-flex items-center rounded-md bg-yellow px-5 py-3 font-semibold text-navy-900 transition hover:bg-yellow-400 active:scale-[0.98]"
      >
        {t("Iniciar sesión", "Sign in")}
      </Link>
      {demo && (
        <a href={demo} target="_blank" rel="noreferrer" className={`inline-flex items-center rounded-md px-5 py-3 font-semibold transition ${secundario}`}>
          {t("Solicitar demo", "Request a demo")}
        </a>
      )}
      {registro && (
        <Link href="/registro" className={`inline-flex items-center rounded-md px-5 py-3 font-semibold transition ${secundario}`}>
          {t("Crear cuenta", "Create account")}
        </Link>
      )}
    </div>
  );
}

function Captura({ src, alt, ancho, alto, className = "" }: { src: string; alt: string; ancho: number; alto: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={ancho}
      height={alto}
      className={`h-auto w-full rounded-lg border border-slate-200 shadow-sm ${className}`}
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}

export default function Landing({ registro = false }: { registro?: boolean }) {
  const { t } = useIdioma();

  return (
    <div className="min-h-screen bg-background text-navy-900">
      <header className="bg-navy-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Image src="/logo-header.png" alt={NOMBRE_APP} width={800} height={266} className="h-9 w-auto sm:h-10" priority />
          <div className="flex items-center gap-3">
            <BotonIdioma oscuro />
            <Link href="/login" className="hidden text-sm font-semibold text-white/90 hover:text-white sm:inline">
              {t("Iniciar sesión", "Sign in")}
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-navy-950 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-10 md:grid-cols-[1fr_1.15fr] md:items-center md:pb-20 md:pt-14">
          <div>
            <p className="text-sm text-navy-200">
              {NOMBRE_LEGAL} · {t("sorteo e inspección automotriz", "automotive sorting & inspection")}
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              {t("Cada pieza del sorteo, registrada en el momento.", "Every part in the sort, recorded as it happens.")}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-navy-100 sm:text-lg">
              {t(
                `${NOMBRE_CORTO} es la app con la que nuestros inspectores capturan en la estación, supervisión ve el avance de cada planta y el cliente recibe sus reportes sin tener que pedirlos.`,
                `${NOMBRE_CORTO} is the app our inspectors use to log at the station, supervisors use to follow every plant, and customers use to get their reports without asking.`
              )}
            </p>
            <div className="mt-8">
              <Botones registro={registro} />
            </div>
          </div>
          <Captura
            src="/landing/supervision.webp"
            alt={t("Detalle de una inspección: piezas, Pareto y gráfica de control", "Inspection detail: counts, Pareto and control chart")}
            ancho={1600}
            alto={1335}
            className="border-white/10"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_280px] md:items-start lg:gap-16">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("Hecha para la estación de sorteo", "Built for the sorting station")}
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              {t(
                "El inspector escanea la etiqueta del contenedor y registra buenas y malas desde el celular. Si la pieza sale mal, reporta el defecto con foto. Si se cae la señal, sigue capturando y la app envía todo cuando regresa.",
                "The inspector scans the container label and logs good and rejected parts from the phone. A bad part gets reported with a photo. If the signal drops, they keep going and the app sends everything once it's back."
              )}
            </p>
            <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {GRUPOS[0].items.map(([titulo, texto]) => (
                <div key={titulo[0]} className="grid gap-1 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="font-semibold">{t(...titulo)}</dt>
                  <dd className="text-slate-600">{t(...texto)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Captura
            src="/landing/captura.webp"
            alt={t("Pantalla de captura del inspector", "Inspector capture screen")}
            ancho={780}
            alto={1440}
            className="mx-auto max-w-[280px]"
          />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[280px_1fr] md:items-start md:py-20 lg:gap-16">
          <Captura
            src="/landing/verificacion.webp"
            alt={t("Verificación pública de un contenedor liberado", "Public verification of a released container")}
            ancho={780}
            alto={1560}
            className="order-last mx-auto max-w-[280px] md:order-first"
          />
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("Tu cliente ve lo mismo que tú", "Your customer sees what you see")}
            </h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              {t(
                "Cada contenedor liberado sale con una etiqueta y un código QR. Quien lo reciba, en tu cliente o en el suyo, lo escanea y ve qué se inspeccionó, cuándo, cuántas piezas lleva y quién lo liberó.",
                "Every released container ships with a label and a QR code. Whoever receives it, at your customer or theirs, scans it and sees what was inspected, when, how many parts it holds and who released it."
              )}
            </p>
            <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {GRUPOS[2].items.map(([titulo, texto]) => (
                <div key={titulo[0]} className="grid gap-1 py-4 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="font-semibold">{t(...titulo)}</dt>
                  <dd className="text-slate-600">{t(...texto)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <h2 className="max-w-xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {t("Y para quien lleva la operación", "And for whoever runs the operation")}
        </h2>
        <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
          {t(
            "Todas las plantas en una sola pantalla, con los números que se necesitan para decidir y para cobrar.",
            "Every plant on one screen, with the numbers you need to make decisions and to invoice."
          )}
        </p>
        <dl className="mt-8 grid gap-x-10 border-t border-slate-200 sm:grid-cols-2">
          {GRUPOS[1].items.map(([titulo, texto]) => (
            <div key={titulo[0]} className="border-b border-slate-200 py-4">
              <dt className="font-semibold">{t(...titulo)}</dt>
              <dd className="mt-1 text-slate-600">{t(...texto)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-navy-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {t("¿Quieres verla con un sorteo tuyo?", "Want to see it with one of your sorts?")}
            </h2>
            <p className="mt-2 text-navy-100">
              {t(
                "Te la mostramos en 20 minutos y dejamos configurada tu primera planta.",
                "We'll walk you through it in 20 minutes and set up your first plant."
              )}
            </p>
          </div>
          <Botones registro={registro} />
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-navy-500">
          <p>
            © {new Date().getFullYear()} {NOMBRE_LEGAL} · {NOMBRE_EMPRESA}
          </p>
          <div className="flex gap-4">
            {CONTACTO_EMAIL && (
              <a href={`mailto:${CONTACTO_EMAIL}`} className="hover:text-navy-900">
                {CONTACTO_EMAIL}
              </a>
            )}
            <Link href="/login" className="hover:text-navy-900">
              {t("Iniciar sesión", "Sign in")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
