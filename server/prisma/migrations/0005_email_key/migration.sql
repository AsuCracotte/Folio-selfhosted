-- Une adresse = un compte : clé canonique (minuscules, sans +alias, points ignorés chez Gmail)
ALTER TABLE "User" ADD COLUMN "emailKey" TEXT;
CREATE UNIQUE INDEX "User_emailKey_key" ON "User"("emailKey");
