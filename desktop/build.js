// Construit les paquets depuis Linux : node build.js win | mac | all
// Windows : le désinstalleur NSIS est extrait directement de l'installeur (comme electron-builder le fait déjà
// sur macOS) au lieu d'exécuter l'installeur sous Wine, qui demanderait un Wine 32 bits.
const path = require("node:path");
const fs = require("node:fs");

process.env.TMPDIR = process.env.TMPDIR || path.join(__dirname, ".tmp");   // /tmp est souvent trop petit
fs.mkdirSync(process.env.TMPDIR, { recursive: true });

const which = process.argv[2] || "all";
// l'appli ouvre le lecteur de votre serveur : FOLIO_URL=https://folio.example.org node build.js win
const url = process.env.FOLIO_URL;
if (!url || !/^https?:\/\//.test(url)) { console.error("Set FOLIO_URL to your server, e.g. FOLIO_URL=https://folio.example.org node build.js all"); process.exit(1); }
fs.writeFileSync(path.join(__dirname, "config.json"), JSON.stringify({ url }) + "\n");
const { build, Platform } = require("electron-builder");

async function main() {
  if (which === "win" || which === "all") {
    const mv = require("app-builder-lib/out/util/macosVersion");
    const orig = mv.isMacOsCatalina;
    mv.isMacOsCatalina = () => true;
    try { await build({ targets: Platform.WINDOWS.createTarget() }); } finally { mv.isMacOsCatalina = orig; }
  }
  if (which === "mac" || which === "all") {
    await build({ targets: Platform.MAC.createTarget() });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
