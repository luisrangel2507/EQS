import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prismaGlobal } from "@/lib/prisma";
import type { Rol } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nombre: string;
      usuario: string;
      rol: Rol;
      clienteNombre: string | null;
      plantaResidente: string | null;
      organizacionId: string;
      organizacionNombre: string;
      superadmin: boolean;
    };
  }
  interface User {
    id: string;
    nombre: string;
    usuario: string;
    rol: Rol;
    clienteNombre: string | null;
    plantaResidente: string | null;
    organizacionId: string;
    organizacionNombre: string;
    superadmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nombre: string;
    usuario: string;
    rol: Rol;
    clienteNombre: string | null;
    plantaResidente: string | null;
    organizacionId: string;
    organizacionNombre: string;
    superadmin: boolean;
  }
}

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

/** Asienta en la bitácora un evento de acceso (bloqueo) sin que un fallo tire el login. */
async function bitacoraAcceso(u: { id: string; nombre: string; rol: Rol; organizacionId: string }, resumen: string) {
  await prismaGlobal.bitacoraCambio
    .create({
      data: {
        organizacionId: u.organizacionId,
        usuarioId: u.id,
        usuarioNombre: u.nombre,
        usuarioRol: u.rol,
        accion: "BLOQUEAR",
        entidad: "Usuario",
        entidadId: u.id,
        resumen,
      },
    })
    .catch((e) => console.error("No se pudo escribir en la bitácora", e));
}

export const authOptions: NextAuthOptions = {
  // la sesión caduca sola a las 12 h (un turno); además la app cierra por inactividad
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.password) return null;

        const usuarioNormalizado = credentials.usuario.trim().toLowerCase();
        // el login busca en todas las organizaciones: el nombre de usuario es único en la plataforma
        const usuario = await prismaGlobal.usuario.findUnique({
          where: { usuario: usuarioNormalizado },
          include: { organizacion: { select: { nombreCorto: true, activa: true } } },
        });

        if (!usuario || !usuario.activo || !usuario.organizacion.activa) return null;

        if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) return null;

        const valido = await bcrypt.compare(credentials.password, usuario.passwordHash);
        if (!valido) {
          const intentos = usuario.intentosFallidos + 1;
          const bloquear = intentos >= MAX_INTENTOS;
          await prismaGlobal.usuario.update({
            where: { id: usuario.id },
            data: bloquear
              ? { intentosFallidos: 0, bloqueadoHasta: new Date(Date.now() + MINUTOS_BLOQUEO * 60000) }
              : { intentosFallidos: intentos },
          });
          if (bloquear) {
            await bitacoraAcceso(usuario, `Cuenta de ${usuario.usuario} bloqueada ${MINUTOS_BLOQUEO} min por ${MAX_INTENTOS} intentos fallidos`);
          }
          return null;
        }
        if (usuario.intentosFallidos > 0 || usuario.bloqueadoHasta) {
          await prismaGlobal.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
        }

        return {
          id: usuario.id,
          nombre: usuario.nombre,
          usuario: usuario.usuario,
          rol: usuario.rol,
          clienteNombre: usuario.clienteNombre,
          plantaResidente: usuario.plantaResidente,
          organizacionId: usuario.organizacionId,
          organizacionNombre: usuario.organizacion.nombreCorto,
          superadmin: usuario.superadmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nombre = user.nombre;
        token.usuario = user.usuario;
        token.rol = user.rol;
        token.clienteNombre = user.clienteNombre;
        token.plantaResidente = user.plantaResidente;
        token.organizacionId = user.organizacionId;
        token.organizacionNombre = user.organizacionNombre;
        token.superadmin = user.superadmin;
      } else if (token.id && !token.organizacionId) {
        // sesiones abiertas antes de multi-empresa: se completan sin pedir login otra vez
        const u = await prismaGlobal.usuario.findUnique({
          where: { id: token.id },
          select: { organizacionId: true, superadmin: true, organizacion: { select: { nombreCorto: true } } },
        });
        if (u) {
          token.organizacionId = u.organizacionId;
          token.organizacionNombre = u.organizacion.nombreCorto;
          token.superadmin = u.superadmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.nombre = token.nombre;
      session.user.usuario = token.usuario;
      session.user.rol = token.rol;
      session.user.clienteNombre = token.clienteNombre;
      session.user.plantaResidente = token.plantaResidente;
      session.user.organizacionId = token.organizacionId;
      session.user.organizacionNombre = token.organizacionNombre;
      session.user.superadmin = token.superadmin;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Si NEXTAUTH_URL está mal configurada en el hosting (ej. apuntando a
      // localhost), no forzamos baseUrl: si nos pasan una URL absoluta cuyo
      // path es uno de los nuestros, la respetamos tal cual (el cliente la
      // calcula con window.location.origin, que sí es el dominio real).
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const destino = new URL(url);
        if (destino.pathname === "/login" || destino.pathname === "/") return url;
      } catch {
        // URL inválida: cae al valor por defecto
      }
      return baseUrl;
    },
  },
};
