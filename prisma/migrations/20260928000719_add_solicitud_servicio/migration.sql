-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN     "url" TEXT;

-- CreateTable
CREATE TABLE "SolicitudServicio" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "cliente" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numeroParte" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER,
    "planta" TEXT,
    "urgencia" TEXT NOT NULL DEFAULT 'normal',
    "fotoUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "respuesta" TEXT,
    "atendidaPorId" TEXT,
    "atendidaEn" TIMESTAMP(3),
    "inspeccionId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudServicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudServicio_folio_key" ON "SolicitudServicio"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudServicio_inspeccionId_key" ON "SolicitudServicio"("inspeccionId");

-- CreateIndex
CREATE INDEX "SolicitudServicio_cliente_creadoEn_idx" ON "SolicitudServicio"("cliente", "creadoEn");

-- CreateIndex
CREATE INDEX "SolicitudServicio_estado_idx" ON "SolicitudServicio"("estado");

-- AddForeignKey
ALTER TABLE "SolicitudServicio" ADD CONSTRAINT "SolicitudServicio_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudServicio" ADD CONSTRAINT "SolicitudServicio_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudServicio" ADD CONSTRAINT "SolicitudServicio_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
