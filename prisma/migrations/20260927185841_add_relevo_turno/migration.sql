-- CreateTable
CREATE TABLE "RelevoTurno" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "planta" TEXT,
    "inicioTurno" TIMESTAMP(3) NOT NULL,
    "finTurno" TIMESTAMP(3) NOT NULL,
    "piezasBuenas" INTEGER NOT NULL DEFAULT 0,
    "piezasMalas" INTEGER NOT NULL DEFAULT 0,
    "novedades" TEXT NOT NULL,
    "pendientes" TEXT,
    "recibidoPorId" TEXT,
    "recibidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelevoTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelevoTurno_creadoEn_idx" ON "RelevoTurno"("creadoEn");

-- CreateIndex
CREATE INDEX "RelevoTurno_planta_creadoEn_idx" ON "RelevoTurno"("planta", "creadoEn");

-- AddForeignKey
ALTER TABLE "RelevoTurno" ADD CONSTRAINT "RelevoTurno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelevoTurno" ADD CONSTRAINT "RelevoTurno_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
