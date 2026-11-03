-- CreateTable
CREATE TABLE "contenido_landing" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "textos" JSONB NOT NULL DEFAULT '{}',
    "ocultos" JSONB NOT NULL DEFAULT '[]',
    "proyectos" JSONB NOT NULL DEFAULT '{}',
    "actualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contenido_landing_pkey" PRIMARY KEY ("id")
);
