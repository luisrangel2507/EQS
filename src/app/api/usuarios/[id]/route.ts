import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  rol: z.enum(ROLES).optional(),
  activo: z.boolean().optional(),
  clienteNombre: z.string().trim().optional().nullable(),
  plantaResidente: z.string().trim().optional().nullable(),
  password: z.string().min(6).optional(),
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
      const empresa = await prisma.empresa.findUnique({ where: { nombre: datos.clienteNombre } });
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

    return Response.json(usuario);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requerirRol("ADMIN");
    if (params.id === admin.id) {
      throw new ErrorPermiso("No puedes eliminar tu propia cuenta", 400);
    }

    try {
      await prisma.usuario.delete({ where: { id: params.id } });
      return Response.json({ ok: true });
    } catch {
      // Tiene registros relacionados (capturas, asignaciones): se desactiva en vez de borrar
      await prisma.usuario.update({ where: { id: params.id }, data: { activo: false } });
      return Response.json({ ok: true, desactivado: true });
    }
  } catch (error) {
    return manejarErrorApi(error);
  }
}
