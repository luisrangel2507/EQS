-- AlterTable
ALTER TABLE "Inspeccion" ADD COLUMN     "modoCobro" TEXT NOT NULL DEFAULT 'pieza',
ADD COLUMN     "precioPorHora" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RegistroAsistencia" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "inspeccionId" TEXT,
    "entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salida" TIMESTAMP(3),
    "cerradaAuto" BOOLEAN NOT NULL DEFAULT false,
    "automatica" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAsistencia_usuarioId_entrada_idx" ON "RegistroAsistencia"("usuarioId", "entrada");

-- CreateIndex
CREATE INDEX "RegistroAsistencia_inspeccionId_entrada_idx" ON "RegistroAsistencia"("inspeccionId", "entrada");

-- CreateIndex
CREATE INDEX "RegistroAsistencia_salida_idx" ON "RegistroAsistencia"("salida");

-- AddForeignKey
ALTER TABLE "RegistroAsistencia" ADD CONSTRAINT "RegistroAsistencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAsistencia" ADD CONSTRAINT "RegistroAsistencia_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
