-- Réglages d'apparence synchronisés (JSON) + horodatage de la dernière modification
ALTER TABLE "User" ADD COLUMN "settings" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "settingsUpdated" REAL NOT NULL DEFAULT 0;
