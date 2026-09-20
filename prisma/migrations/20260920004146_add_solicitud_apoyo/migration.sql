-- CreateTable
CREATE TABLE "SolicitudApoyo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estacion" TEXT,
    "inspeccionId" TEXT,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "atendidaPorId" TEXT,
    "atendidaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudApoyo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudApoyo_atendida_idx" ON "SolicitudApoyo"("atendida");

-- AddForeignKey
ALTER TABLE "SolicitudApoyo" ADD CONSTRAINT "SolicitudApoyo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudApoyo" ADD CONSTRAINT "SolicitudApoyo_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudApoyo" ADD CONSTRAINT "SolicitudApoyo_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
