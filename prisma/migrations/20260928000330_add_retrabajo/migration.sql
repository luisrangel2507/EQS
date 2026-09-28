-- AlterTable
ALTER TABLE "Captura" ADD COLUMN     "retrabajadas" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DefectoResumen" ADD COLUMN     "recuperadas" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Inspeccion" ADD COLUMN     "piezasRetrabajadas" INTEGER NOT NULL DEFAULT 0;
