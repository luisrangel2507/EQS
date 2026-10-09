import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { ROLES } from "@/lib/constants";
import { contrasenaSchema, errorContrasena } from "@/lib/password";
import { filaBitacora, leerMotivo, registrar } from "@/lib/bitacora";

export const dynamic = "force-dynamic";

const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  clienteNombre: z.string().trim().optional().nullable(),
  plantaResidente: z.string().trim().optional().nullable(),
  password: contrasenaSchema.optional(),
  desbloquear: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requerirRol("ADMIN");
    const body = await req.json();
    const datos = actualizarUsuarioSchema.parse(body);

    if (params.id === admin.id && datos.rol && datos.rol !== "ADMIN") {
      throw new ErrorPermiso("No puedes quitarte tu propio rol de administrador", 400);
    }
    if (params.id === admin.id && datos.activo === false) {
      throw new ErrorPermiso("No puedes desactivar tu propia cuenta", 400);
    }

    const existente = await prisma.usuario.findUnique({ where: { id: params.id } });
    if (!existente) throw new ErrorPermiso("Usuario no encontrado", 404);

    const rolResultante = datos.rol ?? existente.rol;
    if (rolResultante === "CLIENTE" && datos.clienteNombre) {
      const empresa = await prisma.empresa.findFirst({ where: { nombre: datos.clienteNombre } });
      if (!empresa || !empresa.activa) {
        throw new ErrorPermiso("La empresa seleccionada no está registrada. Dala de alta primero.", 400);
      }
    }

    const data: Record<string, unknown> = {};
    if (datos.nombre !== undefined) data.nombre = datos.nombre;
    if (datos.activo !== undefined) data.activo = datos.activo;
    if (datos.clienteNombre !== undefined) data.clienteNombre = datos.clienteNombre;
    if (datos.plantaResidente !== undefined) data.plantaResidente = datos.plantaResidente;

    if (datos.rol !== undefined) {
      data.rol = datos.rol;
      // Al cambiar de posición, limpiar los campos que ya no aplican
      if (datos.rol !== "CLIENTE") data.clienteNombre = null;
      if (datos.rol !== "RESIDENTE") data.plantaResidente = null;
    }

    if (datos.password) {
      const errorPw = errorContrasena(datos.password, existente.usuario);
      if (errorPw) throw new ErrorPermiso(errorPw, 400);
    }
    if (datos.desbloquear || datos.password) {
      data.intentosFallidos = 0;
      data.bloqueadoHasta = null;
    }
    if (datos.password) data.passwordHash = await bcrypt.hash(datos.password, 10);

    const usuario = await prisma.usuario.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        nombre: true,
        usuario: true,
        rol: true,
        clienteNombre: true,
        plantaResidente: true,
        activo: true,
        creadoEn: true,
      },
    });

    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    for (const campo of ["nombre", "rol", "activo", "clienteNombre", "plantaResidente"] as const) {
      if (campo in data && existente[campo] !== usuario[campo]) {
        antes[campo] = existente[campo];
        despues[campo] = usuario[campo];
      }
    }
    if (datos.desbloquear) despues.desbloqueada = true;
    if (datos.password) despues.contrasenaRestablecida = true; // nunca se guarda la contraseña
    if (Object.keys(despues).length) {
      await registrar(admin, {
        accion: datos.activo === false && existente.activo ? "DESACTIVAR" : datos.activo === true && !existente.activo ? "ACTIVAR" : "EDITAR",
        entidad: "Usuario",
        entidadId: params.id,
        resumen: `Modificó al usuario ${existente.usuario}`,
        antes,
        despues,
      });
    }

    return Response.json(usuario);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

// los usuarios no se borran (sus capturas y firmas deben conservar el autor): se desactivan
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requerirRol("ADMIN");
    if (params.id === admin.id) {
      throw new ErrorPermiso("No puedes desactivar tu propia cuenta", 400);
    }
    const motivo = await leerMotivo(req);
    const existente = await prisma.usuario.findUnique({ where: { id: params.id } });
    if (!existente) throw new ErrorPermiso("Usuario no encontrado", 404);
    await prisma.$transaction([
      prisma.usuario.update({ where: { id: params.id }, data: { activo: false } }),
      filaBitacora(admin, {
        accion: "DESACTIVAR",
        entidad: "Usuario",
        entidadId: params.id,
        resumen: `Desactivó al usuario ${existente.usuario}`,
        antes: { activo: existente.activo },
        despues: { activo: false },
        motivo,
      }),
    ]);
    return Response.json({ ok: true, desactivado: true });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
