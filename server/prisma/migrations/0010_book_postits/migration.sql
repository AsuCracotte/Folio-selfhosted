-- Post-it posés dans un livre (synchronisés comme les surlignages : le plus récent gagne, suppressions conservées)
ALTER TABLE "BookState" ADD COLUMN "postits" TEXT NOT NULL DEFAULT '[]';
