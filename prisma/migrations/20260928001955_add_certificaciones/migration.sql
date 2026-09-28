-- CreateTable
CREATE TABLE "CriterioParte" (
    "id" TEXT NOT NULL,
    "numeroParte" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotoOkUrl" TEXT,
    "fotoNgUrl" TEXT,
    "preguntas" JSONB NOT NULL DEFAULT '[]',
    "vigenciaDias" INTEGER NOT NULL DEFAULT 365,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CriterioParte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "numeroParte" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "calificacion" INTEGER,
    "otorgadaPorId" TEXT,
    "vence" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CriterioParte_numeroParte_key" ON "CriterioParte"("numeroParte");

-- CreateIndex
CREATE INDEX "Certificacion_numeroParte_idx" ON "Certificacion"("numeroParte");

-- CreateIndex
CREATE UNIQUE INDEX "Certificacion_usuarioId_numeroParte_key" ON "Certificacion"("usuarioId", "numeroParte");

-- AddForeignKey
ALTER TABLE "Certificacion" ADD CONSTRAINT "Certificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificacion" ADD CONSTRAINT "Certificacion_otorgadaPorId_fkey" FOREIGN KEY ("otorgadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
