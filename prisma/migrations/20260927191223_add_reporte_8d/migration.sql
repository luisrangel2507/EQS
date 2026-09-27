-- CreateTable
CREATE TABLE "Reporte8D" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "defecto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "creadoPorId" TEXT NOT NULL,
    "d1Equipo" TEXT,
    "d2Problema" TEXT,
    "d3Contencion" TEXT,
    "d4CausaRaiz" TEXT,
    "d5Acciones" TEXT,
    "d6Implementacion" TEXT,
    "d7Prevencion" TEXT,
    "d8Cierre" TEXT,
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reporte8D_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reporte8D_folio_key" ON "Reporte8D"("folio");

-- CreateIndex
CREATE INDEX "Reporte8D_inspeccionId_idx" ON "Reporte8D"("inspeccionId");

-- AddForeignKey
ALTER TABLE "Reporte8D" ADD CONSTRAINT "Reporte8D_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reporte8D" ADD CONSTRAINT "Reporte8D_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
