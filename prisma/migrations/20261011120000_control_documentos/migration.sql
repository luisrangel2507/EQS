-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numeroParte" TEXT,
    "descripcion" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoVersion" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "cambios" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'en_revision',
    "creadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoPorId" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "motivoDecision" TEXT,
    "vigenteDesde" TIMESTAMP(3),
    "obsoletaEn" TIMESTAMP(3),

    CONSTRAINT "DocumentoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoLectura" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "leidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoLectura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Documento_organizacionId_codigo_key" ON "Documento"("organizacionId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoVersion_documentoId_version_key" ON "DocumentoVersion"("documentoId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoLectura_versionId_usuarioId_key" ON "DocumentoLectura"("versionId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVersion" ADD CONSTRAINT "DocumentoVersion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVersion" ADD CONSTRAINT "DocumentoVersion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoVersion" ADD CONSTRAINT "DocumentoVersion_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoLectura" ADD CONSTRAINT "DocumentoLectura_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DocumentoVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoLectura" ADD CONSTRAINT "DocumentoLectura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

