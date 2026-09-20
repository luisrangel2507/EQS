-- AlterTable: agrega campos de Punto Limpio a Inspeccion
ALTER TABLE "Inspeccion"
ADD COLUMN "puntoLimpio" TEXT,
ADD COLUMN "puntoLimpioFotoUrl" TEXT,
ADD COLUMN "puntoLimpioReportadoPor" TEXT,
ADD COLUMN "puntoLimpioReportadoEn" TIMESTAMP(3),
ADD COLUMN "puntoLimpioOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "puntoLimpioOkPor" TEXT,
ADD COLUMN "puntoLimpioOkEn" TIMESTAMP(3);
