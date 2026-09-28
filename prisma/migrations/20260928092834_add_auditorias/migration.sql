-- CreateTable
CREATE TABLE "PlantillaChecklist" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombrePlantilla" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "respuestas" JSONB NOT NULL,
    "planta" TEXT,
    "cliente" TEXT,
    "area" TEXT,
    "auditorId" TEXT NOT NULL,
    "puntaje" DOUBLE PRECISION,
    "hallazgos" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadaEn" TIMESTAMP(3),

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auditoria_folio_key" ON "Auditoria"("folio");

-- CreateIndex
CREATE INDEX "Auditoria_creadoEn_idx" ON "Auditoria"("creadoEn");

-- CreateIndex
CREATE INDEX "Auditoria_cliente_idx" ON "Auditoria"("cliente");

-- AddForeignKey
ALTER TABLE "PlantillaChecklist" ADD CONSTRAINT "PlantillaChecklist_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
