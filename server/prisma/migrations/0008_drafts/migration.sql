-- Manuscrits écrits dans l'éditeur
CREATE TABLE "Draft" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "rev" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("userId", "id"),
    CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
