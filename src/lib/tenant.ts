import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";

/*
 * Aislamiento multi-empresa. Solo 4 tablas guardan organizacionId (Usuario,
 * Inspeccion, Empresa y CriterioParte); las demás se filtran a través de su
 * relación con alguna de ellas. La extensión de Prisma de abajo agrega ese
 * filtro a TODA consulta, así ninguna ruta puede olvidarlo.
 *
 * De dónde sale la organización:
 *  - dentro de una petición con sesión → la de la sesión;
 *  - dentro de una petición SIN sesión → ninguna (las consultas no regresan
 *    nada); las páginas públicas por código/token usan sinOrganizacion();
 *  - fuera de una petición (scripts) → sin filtro.
 */

const RAIZ = new Set(["Usuario", "Inspeccion", "Empresa", "CriterioParte"]);

// modelo → relación que lleva a una tabla raíz
const RUTA: Record<string, string> = {
  NotaResidente: "residente",
  InspeccionInspector: "inspeccion",
  Captura: "inspeccion",
  DefectoResumen: "inspeccion",
  EstadoInspector: "usuario",
  MensajeChat: "autor",
  SolicitudApoyo: "usuario",
  Notificacion: "usuario",
  SuscripcionPush: "usuario",
  RelevoTurno: "autor",
  EnlaceCompartido: "inspeccion",
  Reporte8D: "inspeccion",
  SolicitudServicio: "solicitante",
  RegistroAsistencia: "usuario",
  Certificacion: "usuario",
  PlantillaChecklist: "creadoPor",
  Auditoria: "auditor",
  EtiquetaLiberacion: "inspeccion",
};

const SIN_SESION = "__sin_sesion__";

const almacen = new AsyncLocalStorage<{ org: string | null }>();

/** Ejecuta fn con una organización fija (alta de empresa, scripts). */
export const conOrganizacion = <T>(org: string, fn: () => Promise<T>) => almacen.run({ org }, fn);

/** Ejecuta fn sin filtro de organización: páginas públicas por código y panel de plataforma. */
export const sinOrganizacion = <T>(fn: () => Promise<T>) => almacen.run({ org: null }, fn);

// una lectura de sesión por petición (headers() es el mismo objeto durante toda la petición)
const porPeticion = new WeakMap<object, Promise<string>>();

async function organizacionDeSesion(): Promise<string> {
  try {
    const [{ getServerSession }, { authOptions }] = await Promise.all([import("next-auth"), import("@/lib/auth")]);
    const sesion = await getServerSession(authOptions);
    return sesion?.user?.organizacionId ?? SIN_SESION;
  } catch {
    return SIN_SESION;
  }
}

export async function organizacionActual(): Promise<string | null> {
  const fija = almacen.getStore();
  if (fija) return fija.org;
  let peticion: object;
  try {
    const { headers } = await import("next/headers");
    peticion = headers();
  } catch {
    return null; // fuera de una petición de Next (scripts, seed)
  }
  let org = porPeticion.get(peticion);
  if (!org) {
    org = organizacionDeSesion();
    porPeticion.set(peticion, org);
  }
  return org;
}

function filtroDe(modelo: string, org: string): Record<string, unknown> | null {
  if (RAIZ.has(modelo)) return { organizacionId: org };
  const rel = RUTA[modelo];
  return rel ? { [rel]: { organizacionId: org } } : null;
}

const conFiltro = (where: Record<string, unknown> | undefined, filtro: Record<string, unknown>) => {
  const actual = where ?? {};
  const and = actual.AND === undefined ? [] : Array.isArray(actual.AND) ? actual.AND : [actual.AND];
  return { ...actual, AND: [...and, filtro] };
};

const CON_WHERE = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

export const aislamiento = Prisma.defineExtension({
  name: "aislamiento-multiempresa",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const org = await organizacionActual();
        if (org === null) return query(args);
        const filtro = filtroDe(model, org);
        if (!filtro) return query(args);

        const a = { ...(args as Record<string, unknown>) };
        if (CON_WHERE.has(operation)) a.where = conFiltro(a.where as Record<string, unknown> | undefined, filtro);

        // las tablas raíz nacen en la organización de quien las crea
        if (RAIZ.has(model)) {
          const conOrg = (d: Record<string, unknown>) => (d.organizacion || d.organizacionId ? d : { ...d, organizacionId: org });
          if (operation === "create") a.data = conOrg(a.data as Record<string, unknown>);
          if (operation === "createMany" || operation === "createManyAndReturn") {
            const d = a.data as Record<string, unknown> | Record<string, unknown>[];
            a.data = Array.isArray(d) ? d.map(conOrg) : conOrg(d);
          }
          if (operation === "upsert") a.create = conOrg(a.create as Record<string, unknown>);
        }
        return query(a as typeof args);
      },
    },
  },
});
