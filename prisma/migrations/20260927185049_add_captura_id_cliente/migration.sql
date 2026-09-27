-- AlterTable
ALTER TABLE "Captura" ADD COLUMN     "idCliente" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Captura_idCliente_key" ON "Captura"("idCliente");
