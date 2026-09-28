import { NextRequest } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, prismaGlobal } from "@/lib/prisma";
import { requerirRol, manejarErrorApi, ErrorPermiso } from "@/lib/permissions";
import { PLANTAS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const altaSchema = z.object({
  empresa: z.string().trim().min(2, "Escribe el nombre de la empresa"),
  contactos: z
    .array(
      z.object({
        nombre: z.string().trim().min(2, "Cada contacto necesita nombre"),
        usuario: z
          .string()
          .trim()
          .min(3, "El usuario debe tener al menos 3 caracteres")
          .regex(/^[a-z0-9._-]+$/i, "El usuario solo puede tener letras, números, punto, guion o guion bajo")
          .transform((v) => v.toLowerCase()),
      })
    )
    .min(1, "Agrega al menos un contacto")
    .max(10),
  inspeccion: z
    .object({
      nombre: z.string().trim().min(2),
      numeroParte: z.string().trim().optional().nullable(),
      planta: z.enum(PLANTAS).optional().nullable(),
      precioPorPieza: z.coerce.number().min(0).optional(),
      meta: z.coerce.number().int().min(0).optional(),
    })
    .nullable()
    .optional(),
});

// sin caracteres que se confunden al dictarlos o leerlos (0/O, 1/l/I)
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function contrasena() {
  const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `${bloque()}-${bloque()}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requerirRol("ADMIN");
    const datos = altaSchema.parse(await req.json());
    const organizacionId = user.organizacionId;

    if (await prisma.empresa.findFirst({ where: { nombre: datos.empresa } })) {
      throw new ErrorPermiso("Ya existe una empresa con ese nombre", 409);
    }

    // resuelve usuarios repetidos agregando un número, en lugar de rechazar el alta
    const usados = new Set<string>();
    const usuarioLibre = async (base: string) => {
      let candidato = base;
      // el usuario es único en toda la plataforma, no solo en esta organización
      for (let n = 2; usados.has(candidato) || (await prismaGlobal.usuario.findUnique({ where: { usuario: candidato } })); n++) {
        candidato = `${base}${n}`;
      }
      usados.add(candidato);
      return candidato;
    };
    const contactos: { nombre: string; usuario: string; password: string; passwordHash: string }[] = [];
    for (const c of datos.contactos) {
      const password = contrasena();
      contactos.push({
        nombre: c.nombre,
        usuario: await usuarioLibre(c.usuario),
        password,
        passwordHash: await bcrypt.hash(password, 10),
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({ data: { nombre: datos.empresa, organizacionId } });
      for (const c of contactos) {
        await tx.usuario.create({
          data: {
            nombre: c.nombre,
            usuario: c.usuario,
            passwordHash: c.passwordHash,
            rol: "CLIENTE",
            clienteNombre: empresa.nombre,
            organizacionId,
          },
        });
      }
      const inspeccion = datos.inspeccion
        ? await tx.inspeccion.create({
            data: {
              nombre: datos.inspeccion.nombre,
              numeroParte: datos.inspeccion.numeroParte || null,
              planta: datos.inspeccion.planta || null,
              precioPorPieza: datos.inspeccion.precioPorPieza ?? 0,
              meta: datos.inspeccion.meta ?? 0,
              cliente: empresa.nombre,
              organizacionId,
            },
          })
        : null;
      return { empresa, inspeccion };
    });

    return Response.json(
      {
        empresa: resultado.empresa.nombre,
        inspeccionId: resultado.inspeccion?.id ?? null,
        // la contraseña en claro solo sale en esta respuesta; en la base queda solo el hash
        credenciales: contactos.map(({ nombre, usuario, password }) => ({ nombre, usuario, password })),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }
    return manejarErrorApi(error);
  }
}
