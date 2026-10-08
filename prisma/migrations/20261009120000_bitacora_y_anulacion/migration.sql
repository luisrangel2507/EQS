-- Anulación con motivo en lugar de borrado
ALTER TABLE "Inspeccion" ADD COLUMN "anuladoEn" TIMESTAMP(3), ADD COLUMN "anuladoPorId" TEXT, ADD COLUMN "motivoAnulacion" TEXT;
ALTER TABLE "Captura" ADD COLUMN "anuladoEn" TIMESTAMP(3), ADD COLUMN "anuladoPorId" TEXT, ADD COLUMN "motivoAnulacion" TEXT;
ALTER TABLE "Auditoria" ADD COLUMN "anuladoEn" TIMESTAMP(3), ADD COLUMN "anuladoPorId" TEXT, ADD COLUMN "motivoAnulacion" TEXT;
ALTER TABLE "Reporte8D" ADD COLUMN "anuladoEn" TIMESTAMP(3), ADD COLUMN "anuladoPorId" TEXT, ADD COLUMN "motivoAnulacion" TEXT;
ALTER TABLE "RegistroAsistencia" ADD COLUMN "anuladoEn" TIMESTAMP(3), ADD COLUMN "anuladoPorId" TEXT, ADD COLUMN "motivoAnulacion" TEXT;

-- Bitácora de cambios (solo se inserta)
CREATE TABLE "BitacoraCambio" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "usuarioRol" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "motivo" TEXT,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BitacoraCambio_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BitacoraCambio_organizacionId_creadoEn_idx" ON "BitacoraCambio"("organizacionId", "creadoEn");
CREATE INDEX "BitacoraCambio_entidad_entidadId_idx" ON "BitacoraCambio"("entidad", "entidadId");
CREATE INDEX "BitacoraCambio_usuarioId_idx" ON "BitacoraCambio"("usuarioId");
ALTER TABLE "BitacoraCambio" ADD CONSTRAINT "BitacoraCambio_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inmutabilidad: la bitácora no admite UPDATE ni DELETE directos (el borrado en cascada de una organización sigue funcionando)
CREATE OR REPLACE FUNCTION bitacora_inmutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'La bitácora de cambios no se puede modificar';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER bitacora_sin_update BEFORE UPDATE ON "BitacoraCambio" FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable();
