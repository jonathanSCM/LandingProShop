-- DropTable (el constructor de paginas multiples se reemplazo por el editor de la landing)
DROP TABLE IF EXISTS "paginas";

-- AlterTable
ALTER TABLE "contenido_landing" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
