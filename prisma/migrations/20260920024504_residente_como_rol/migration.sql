-- Migrar usuarios marcados con el flag esResidente al nuevo rol RESIDENTE
UPDATE "Usuario" SET "rol" = 'RESIDENTE' WHERE "esResidente" = true;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "esResidente";
