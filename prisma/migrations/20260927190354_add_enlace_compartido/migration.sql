-- CreateTable
CREATE TABLE "EnlaceCompartido" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3),
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "ultimaVista" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnlaceCompartido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnlaceCompartido_token_key" ON "EnlaceCompartido"("token");

-- CreateIndex
CREATE INDEX "EnlaceCompartido_inspeccionId_idx" ON "EnlaceCompartido"("inspeccionId");

-- AddForeignKey
ALTER TABLE "EnlaceCompartido" ADD CONSTRAINT "EnlaceCompartido_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnlaceCompartido" ADD CONSTRAINT "EnlaceCompartido_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
