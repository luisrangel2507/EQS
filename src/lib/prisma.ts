import { PrismaClient } from "@prisma/client";
import { aislamiento } from "@/lib/tenant";

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

/** Sin aislamiento: solo para login, alta de empresas y el panel de plataforma. */
export const prismaGlobal =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaBase = prismaGlobal;

/** Cliente de uso general: cada consulta queda limitada a la organización de la sesión. */
export const prisma = prismaGlobal.$extends(aislamiento);
