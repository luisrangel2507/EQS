import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi } from "@/lib/permissions";
import { claveDiaLocal, inicioDiaLocal, mesActualLocal, rangoMes, turnoEn, TURNOS } from "@/lib/turnos";

export const dynamic = "force-dynamic";

const MIN_POR_DIA_MS = 15 * 60 * 1000;

function inicioPeriodo(periodo: string) {
  if (periodo === "hoy") return inicioDiaLocal();
  if (periodo === "semana") return inicioDiaLocal(new Date(), 6);
  const { anio, mes } = mesActualLocal();
  return rangoMes(anio, mes).inicio;
}

// Ranking por volumen y ritmo. A propósito no premia "más defectos" ni "menos rechazo":
// eso depende del material, y premiarlo invita a capturar mal.
export async function GET(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN", "SUPERVISOR", "GERENTE", "LIDER", "INSPECTOR");
    const periodo = ["hoy", "semana", "mes"].includes(req.nextUrl.searchParams.get("periodo") ?? "")
      ? req.nextUrl.searchParams.get("periodo")!
      : "semana";
    const desde = inicioPeriodo(periodo);

    const capturas = await prisma.captura.findMany({
      where: { creadoEn: { gte: desde }, usuario: { rol: "INSPECTOR" } },
      orderBy: { creadoEn: "asc" },
      select: {
        buenas: true,
        malas: true,
        fotoUrl: true,
        creadoEn: true,
        usuario: { select: { id: true, nombre: true } },
      },
    });

    type Acum = {
      id: string;
      nombre: string;
      piezas: number;
      malas: number;
      malasConFoto: number;
      dias: Map<string, { primera: number; ultima: number }>;
    };
    const porInspector = new Map<string, Acum>();
    const porTurno = new Map<string, number>(TURNOS.map((t) => [t.valor, 0]));

    for (const c of capturas) {
      const a =
        porInspector.get(c.usuario.id) ??
        { id: c.usuario.id, nombre: c.usuario.nombre, piezas: 0, malas: 0, malasConFoto: 0, dias: new Map() };
      const piezas = c.buenas + c.malas;
      a.piezas += piezas;
      a.malas += c.malas;
      if (c.malas > 0 && c.fotoUrl) a.malasConFoto += c.malas;
      const clave = claveDiaLocal(c.creadoEn);
      const t = c.creadoEn.getTime();
      const dia = a.dias.get(clave);
      a.dias.set(clave, dia ? { primera: dia.primera, ultima: t } : { primera: t, ultima: t });
      porInspector.set(c.usuario.id, a);
      const turno = turnoEn(c.creadoEn).turno.valor;
      porTurno.set(turno, (porTurno.get(turno) ?? 0) + piezas);
    }

    // días consecutivos con capturas, contando hacia atrás desde hoy
    const hoy = claveDiaLocal(new Date());
    const ayer = claveDiaLocal(inicioDiaLocal(new Date(), 1));
    const rachaDe = (dias: Set<string>) => {
      if (!dias.has(hoy) && !dias.has(ayer)) return 0;
      let racha = 0;
      for (let i = dias.has(hoy) ? 0 : 1; ; i++) {
        if (!dias.has(claveDiaLocal(inicioDiaLocal(new Date(), i)))) break;
        racha++;
      }
      return racha;
    };

    const inspectores = Array.from(porInspector.values())
      .map((a) => {
        let horasMs = 0;
        for (const d of Array.from(a.dias.values())) horasMs += Math.max(d.ultima - d.primera, 0) + MIN_POR_DIA_MS;
        const horas = horasMs / 3600000;
        return {
          id: a.id,
          nombre: a.nombre,
          piezas: a.piezas,
          ritmo: a.piezas / horas,
          horas,
          diasActivos: a.dias.size,
          racha: rachaDe(new Set(a.dias.keys())),
          evidencia: a.malas > 0 ? a.malasConFoto / a.malas : null,
          esYo: a.id === user.id,
        };
      })
      .sort((x, y) => y.piezas - x.piezas);

    return Response.json({
      periodo,
      desde: desde.toISOString(),
      inspectores,
      porTurno: TURNOS.map((t) => ({ turno: t.valor, piezas: porTurno.get(t.valor) ?? 0 })),
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
