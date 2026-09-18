-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'SUPERVISOR', 'INSPECTOR', 'CLIENTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "clienteNombre" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspeccion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroParte" TEXT,
    "cliente" TEXT,
    "planta" TEXT,
    "meta" INTEGER NOT NULL DEFAULT 0,
    "fechaEntrega" TIMESTAMP(3),
    "instrucciones" TEXT,
    "piezasBuenas" INTEGER NOT NULL DEFAULT 0,
    "piezasMalas" INTEGER NOT NULL DEFAULT 0,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "cerradoPor" TEXT,
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspeccionInspector" (
    "id" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "InspeccionInspector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Captura" (
    "id" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "buenas" INTEGER NOT NULL DEFAULT 0,
    "malas" INTEGER NOT NULL DEFAULT 0,
    "defecto" TEXT,
    "fotoUrl" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Captura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectoResumen" (
    "id" TEXT NOT NULL,
    "inspeccionId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DefectoResumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoInspector" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoInspector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE INDEX "Inspeccion_cliente_idx" ON "Inspeccion"("cliente");

-- CreateIndex
CREATE INDEX "Inspeccion_cerrado_idx" ON "Inspeccion"("cerrado");

-- CreateIndex
CREATE UNIQUE INDEX "InspeccionInspector_inspeccionId_usuarioId_key" ON "InspeccionInspector"("inspeccionId", "usuarioId");

-- CreateIndex
CREATE INDEX "Captura_inspeccionId_creadoEn_idx" ON "Captura"("inspeccionId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "DefectoResumen_inspeccionId_tipo_key" ON "DefectoResumen"("inspeccionId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoInspector_usuarioId_key" ON "EstadoInspector"("usuarioId");

-- AddForeignKey
ALTER TABLE "InspeccionInspector" ADD CONSTRAINT "InspeccionInspector_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspeccionInspector" ADD CONSTRAINT "InspeccionInspector_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Captura" ADD CONSTRAINT "Captura_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Captura" ADD CONSTRAINT "Captura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectoResumen" ADD CONSTRAINT "DefectoResumen_inspeccionId_fkey" FOREIGN KEY ("inspeccionId") REFERENCES "Inspeccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstadoInspector" ADD CONSTRAINT "EstadoInspector_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
