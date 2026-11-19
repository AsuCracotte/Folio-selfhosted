-- Étagère : livres numériques et papier, photos de tranches
ALTER TABLE "User" ADD COLUMN "shelf" TEXT NOT NULL DEFAULT '[]';
