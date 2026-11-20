-- Livre renommé par l'utilisateur (synchronisé : le plus récent gagne)
ALTER TABLE "BookState" ADD COLUMN "nameTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BookState" ADD COLUMN "nameUpdated" REAL NOT NULL DEFAULT 0;
