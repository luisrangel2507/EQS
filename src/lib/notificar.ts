import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enviarPush } from "@/lib/push";

type Aviso = { tipo: string; mensaje: string; titulo: string; url?: string; inspeccionId?: string };

/** Notificación en la campana + push a cada destinatario; un fallo de push no rompe la operación. */
export async function notificar(usuarioIds: string[], aviso: Aviso) {
  const unicos = Array.from(new Set(usuarioIds));
  if (unicos.length === 0) return;
  await prisma.notificacion.createMany({
    data: unicos.map((usuarioId) => ({
      usuarioId,
      tipo: aviso.tipo,
      mensaje: aviso.mensaje,
      url: aviso.url ?? null,
      inspeccionId: aviso.inspeccionId ?? null,
    })),
  });
  await Promise.all(
    unicos.map((id) =>
      enviarPush(id, { titulo: aviso.titulo, cuerpo: aviso.mensaje, url: aviso.url }).catch((e) =>
        console.error("No se pudo mandar push", e)
      )
    )
  );
}

export async function idsPorRol(...roles: Rol[]) {
  const usuarios = await prisma.usuario.findMany({ where: { activo: true, rol: { in: roles } }, select: { id: true } });
  return usuarios.map((u) => u.id);
}
