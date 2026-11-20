const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSQLite3 } = require("@prisma/adapter-better-sqlite3");
const { build, emailKey } = require("./app");
const { createMailer } = require("./mailer");

const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const url = process.env.DATABASE_URL || `file:${path.join(dataDir, "folio.db")}`;
const db = new PrismaClient({ adapter: new PrismaBetterSQLite3({ url }) });
const mailer = createMailer();
// comptes antérieurs à la clé canonique : on la calcule (un éventuel doublon est signalé, pas fusionné)
(async () => {
  for (const u of await db.user.findMany({ where: { emailKey: null }, orderBy: { createdAt: "asc" } })) {
    try { await db.user.update({ where: { id: u.id }, data: { emailKey: emailKey(u.email) } }); }
    catch { console.warn("[comptes] doublon d'adresse ignoré pour l'utilisateur", u.id); }
  }
})();
const app = build(db, {
  dataDir,
  publicDir: process.env.PWA_DIR || path.join(__dirname, "..", "public"),
  downloadsDir: process.env.DOWNLOADS_DIR || path.join(__dirname, "..", "downloads"),
  allowSignup: process.env.ALLOW_SIGNUP !== "false",
  publicUrl: process.env.PUBLIC_URL || "http://127.0.0.1:8787",
  quotaMB: +(process.env.QUOTA_MB || 2048),
  ttsDir: process.env.TTS_DIR || path.join(__dirname, "..", "tts"),
  mailer,
});
app.listen({ host: process.env.HOST || "0.0.0.0", port: +(process.env.PORT || 8787) })
  .then((a) => console.log("Folio server sur", a));
if (mailer.configured) mailer.verify().then(() => console.log("[mail] SMTP OK"), (e) => console.error("[mail] SMTP KO :", e.message));
