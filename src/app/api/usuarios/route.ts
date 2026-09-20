import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido"),
  usuario: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(ROLES).optional(),
  clienteNombre: z.string().trim().optional().nullable(),
  plantaResidente: z.string().trim().optional().nullable(),
});

export async function GET() {
  try {
    await requerirRol("ADMIN");
    const usuarios = await prisma.usuario.findMany({
      orderBy: { creadoEn: "asc" },
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
    return Response.json(usuarios);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const datos = crearUsuarioSchema.parse(body);

    const totalUsuarios = await prisma.usuario.count();
    const esBootstrap = totalUsuarios === 0;

    let rolFinal = datos.rol ?? "INSPECTOR";

    if (esBootstrap) {
      rolFinal = "ADMIN";
    } else {
      // Requiere sesión de administrador para dar de alta a cualquier otro usuario
      await requerirRol("ADMIN");
      if (!datos.rol) {
        throw new ErrorPermiso("El rol es requerido", 400);
      }
    }

    const existente = await prisma.usuario.findUnique({ where: { usuario: datos.usuario } });
    if (existente) {
      throw new ErrorPermiso("Ese nombre de usuario ya existe", 409);
    }

    if (rolFinal === "CLIENTE") {
      if (!datos.clienteNombre) {
        throw new ErrorPermiso("Selecciona la empresa del cliente", 400);
      }
      const empresa = await prisma.empresa.findUnique({ where: { nombre: datos.clienteNombre } });
      if (!empresa || !empresa.activa) {
        throw new ErrorPermiso("La empresa seleccionada no está registrada. Dala de alta primero.", 400);
      }
    }

    const passwordHash = await bcrypt.hash(datos.password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre: datos.nombre,
        usuario: datos.usuario,
        passwordHash,
        rol: rolFinal,
        clienteNombre: rolFinal === "CLIENTE" ? datos.clienteNombre ?? null : null,
        plantaResidente: rolFinal === "RESIDENTE" ? datos.plantaResidente ?? null : null,
      },
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

    return Response.json(usuario, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
