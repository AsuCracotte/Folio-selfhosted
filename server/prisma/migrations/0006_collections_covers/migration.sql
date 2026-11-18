-- Collections (synchronisées), langue préférée, couvertures personnalisées
ALTER TABLE "User" ADD COLUMN "collections" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "User" ADD COLUMN "lang" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookState" ADD COLUMN "coverUpdated" REAL NOT NULL DEFAULT 0;
ALTER TABLE "BookState" ADD COLUMN "coverCustom" BOOLEAN NOT NULL DEFAULT false;
