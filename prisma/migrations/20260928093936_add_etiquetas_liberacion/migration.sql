-- CreateTable
CREATE TABLE "EtiquetaLiberacion" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "tanda" TEXT NOT NULL,
    "contenedor" INTEGER NOT NULL,
    "totalContenedores" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "lote" TEXT,
    "creadaPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "anuladaEn" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "escaneos" INTEGER NOT NULL DEFAULT 0,
    "ultimoEscaneo" TIMESTAMP(3),

    CONSTRAINT "EtiquetaLiberacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EtiquetaLiberacion_folio_key" ON "EtiquetaLiberacion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "EtiquetaLiberacion_codigo_key" ON "EtiquetaLiberacion"("codigo");

-- CreateIndex
CREATE INDEX "EtiquetaLiberacion_inspeccionId_idx" ON "EtiquetaLiberacion"("inspeccionId");

-- CreateIndex
CREATE INDEX "EtiquetaLiberacion_tanda_idx" ON "EtiquetaLiberacion"("tanda");

-- AddForeignKey
ALTER TABLE "EtiquetaLiberacion" ADD CONSTRAINT "EtiquetaLiberacion_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtiquetaLiberacion" ADD CONSTRAINT "EtiquetaLiberacion_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
