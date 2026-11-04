-- CreateTable
CREATE TABLE "paginas" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "doc" JSONB NOT NULL DEFAULT '{}',
    "creada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paginas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes_subidas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "datos" BYTEA NOT NULL,
    "creada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_subidas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paginas_slug_key" ON "paginas"("slug");
