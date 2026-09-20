import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
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
    };
  }
  interface User {
    id: string;
    nombre: string;
    usuario: string;
    rol: Rol;
    clienteNombre: string | null;
    plantaResidente: string | null;
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
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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
        const usuario = await prisma.usuario.findUnique({
          where: { usuario: usuarioNormalizado },
        });

        if (!usuario || !usuario.activo) return null;

        const valido = await bcrypt.compare(credentials.password, usuario.passwordHash);
        if (!valido) return null;

        return {
          id: usuario.id,
          nombre: usuario.nombre,
          usuario: usuario.usuario,
          rol: usuario.rol,
          clienteNombre: usuario.clienteNombre,
          plantaResidente: usuario.plantaResidente,
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
      return session;
    },
  },
};
