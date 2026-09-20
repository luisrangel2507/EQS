-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "esResidente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plantaResidente" TEXT;

-- CreateTable
CREATE TABLE "NotaResidente" (
    "id" TEXT NOT NULL,
    "residenteId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaResidente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaResidente_residenteId_creadoEn_idx" ON "NotaResidente"("residenteId", "creadoEn");

-- AddForeignKey
ALTER TABLE "NotaResidente" ADD CONSTRAINT "NotaResidente_residenteId_fkey" FOREIGN KEY ("residenteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaResidente" ADD CONSTRAINT "NotaResidente_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
