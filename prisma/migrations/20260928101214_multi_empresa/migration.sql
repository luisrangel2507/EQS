-- Multi-empresa: todo lo existente pasa a la organización principal.

-- CreateTable
CREATE TABLE "Organizacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCorto" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizacion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organizacion" ("id", "nombre", "nombreCorto") VALUES ('org_principal', 'Ethical Quality Services', 'EQS');

-- DropIndex
DROP INDEX "CriterioParte_numeroParte_key";

-- DropIndex
DROP INDEX "Empresa_nombre_key";

-- AlterTable (con default temporal para rellenar las filas existentes)
ALTER TABLE "CriterioParte" ADD COLUMN "organizacionId" TEXT NOT NULL DEFAULT 'org_principal';
ALTER TABLE "CriterioParte" ALTER COLUMN "organizacionId" DROP DEFAULT;

ALTER TABLE "Empresa" ADD COLUMN "organizacionId" TEXT NOT NULL DEFAULT 'org_principal';
ALTER TABLE "Empresa" ALTER COLUMN "organizacionId" DROP DEFAULT;

ALTER TABLE "Inspeccion" ADD COLUMN "organizacionId" TEXT NOT NULL DEFAULT 'org_principal';
ALTER TABLE "Inspeccion" ALTER COLUMN "organizacionId" DROP DEFAULT;

ALTER TABLE "Usuario" ADD COLUMN "organizacionId" TEXT NOT NULL DEFAULT 'org_principal',
ADD COLUMN "superadmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ALTER COLUMN "organizacionId" DROP DEFAULT;

-- Los Admin actuales son los dueños de la plataforma
UPDATE "Usuario" SET "superadmin" = true WHERE "rol" = 'ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "CriterioParte_organizacionId_numeroParte_key" ON "CriterioParte"("organizacionId", "numeroParte");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_organizacionId_nombre_key" ON "Empresa"("organizacionId", "nombre");

-- CreateIndex
CREATE INDEX "Inspeccion_organizacionId_idx" ON "Inspeccion"("organizacionId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspeccion" ADD CONSTRAINT "Inspeccion_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriterioParte" ADD CONSTRAINT "CriterioParte_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
