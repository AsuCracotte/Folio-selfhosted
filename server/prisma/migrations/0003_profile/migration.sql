-- Profil : pseudo + date de la photo (0 = pas de photo)
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "avatarUpdated" REAL NOT NULL DEFAULT 0;
