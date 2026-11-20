// Folio pour Windows et macOS : une fenêtre de bureau autour de l'appli web Folio (même interface, même synchro).
const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme, systemPreferences, net } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

// Adresse du lecteur : FOLIO_URL au lancement, sinon celle choisie à la construction (config.json, cf. build.js)
let built = {};
try { built = require("./config.json"); } catch {}
const SITE = (process.env.FOLIO_URL || built.url || "http://localhost:8787").replace(/\/(app\/?)?$/, "") + "/app/";
const ORIGIN = new URL(SITE).origin;
const STATE = path.join(app.getPath("userData"), "window.json");
const isMac = process.platform === "darwin";

let win = null;
let pending = [];               // fichiers .epub reçus avant que la page soit prête

// une seule instance : un double-clic sur un .epub l'envoie à la fenêtre déjà ouverte
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", (_e, argv) => {
  queue(epubsIn(argv));
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.on("open-file", (e, file) => { e.preventDefault(); queue([file]); });   // macOS : « Ouvrir avec »

const epubsIn = (argv) => argv.slice(1).filter((a) => /\.epub$/i.test(a) && fs.existsSync(a));

function queue(files) {
  if (!files.length) return;
  pending.push(...files);
  flush();
}
function flush() {
  if (!win || win.webContents.isLoading() || !win.webContents.getURL().startsWith(ORIGIN)) return;
  const files = pending.splice(0);
  for (const f of files) {
    try {
      win.webContents.send("folio:file", { name: path.basename(f), data: fs.readFileSync(f) });
    } catch (e) { /* fichier illisible : ignoré */ }
  }
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; }
}
function saveState() {
  if (!win || win.isDestroyed()) return;
  const s = { maximized: win.isMaximized(), bounds: win.isMaximized() ? loadState().bounds : win.getNormalBounds() };
  try { fs.writeFileSync(STATE, JSON.stringify(s)); } catch {}
}

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: 1180, height: 800, minWidth: 380, minHeight: 500, ...(st.bounds || {}),
    title: "Folio", show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1e1f24" : "#fbfbfa",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false,
    },
  });
  if (st.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());
  ["resize", "move", "close"].forEach((ev) => win.on(ev, saveState));

  // liens externes (aide, mails…) : navigateur par défaut ; la fenêtre reste sur Folio
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    // le lecteur reste dans la fenêtre ; le reste du site (accueil, téléchargements…) s'ouvre dans le navigateur
    if (url.startsWith(ORIGIN + "/app/") || url.startsWith("file:")) return;
    e.preventDefault();
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
  });
  // seule la caméra est accordée, à Folio lui-même (photo de la tranche d'un livre) ; jamais le micro, la position, les notifications…
  win.webContents.session.setPermissionRequestHandler(async (_wc, perm, cb, details) => {
    if (perm === "clipboard-sanitized-write") return cb(true);
    const types = (details && details.mediaTypes) || [];
    const own = details && typeof details.requestingUrl === "string" && details.requestingUrl.startsWith(ORIGIN + "/");
    if (perm !== "media" || !own || !types.length || types.some((t) => t !== "video")) return cb(false);
    if (isMac && systemPreferences.getMediaAccessStatus("camera") !== "granted") {
      try { return cb(await systemPreferences.askForMediaAccess("camera")); } catch (e) { return cb(false); }
    }
    cb(true);
  });

  // hors ligne au tout premier lancement (pas encore de cache) : page d'attente avec « Réessayer »
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3 && url.startsWith(ORIGIN)) win.loadFile(path.join(__dirname, "offline.html"));
  });
  win.webContents.on("did-finish-load", () => setTimeout(flush, 600));
  win.loadURL(SITE);
}

ipcMain.on("folio:retry", () => win && win.loadURL(SITE));

// ---------- mise à jour de l'appli elle-même ----------
// Le serveur Folio liste ses installeurs (/api/releases, avec leur SHA-256). Si une version plus récente existe pour ce système,
// la page propose « Mettre à jour » : téléchargement, vérification de l'empreinte, installation, redémarrage.
const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const PAT = process.platform === "win32" ? /^Folio-Setup-(\d+\.\d+\.\d+)\.exe$/
  : isMac ? new RegExp(`^Folio-(\\d+\\.\\d+\\.\\d+)-mac-${process.arch}\\.zip$`) : null;
let found = null;
async function checkUpdate() {
  if (!PAT || !app.isPackaged) return null;
  const r = await net.fetch(ORIGIN + "/api/releases", { cache: "no-store" });
  if (!r.ok) return null;
  found = null;
  for (const x of await r.json()) {
    const m = PAT.exec(x.name);
    if (m && /^[0-9a-f]{64}$/.test(x.sha256 || "") && newer(m[1], app.getVersion()) && (!found || newer(m[1], found.version))) found = { ...x, version: m[1] };
  }
  return found && { version: found.version, size: found.size };
}
async function installUpdate(e) {
  if (!found) throw new Error("aucune mise à jour");
  const u = found, dir = fs.mkdtempSync(path.join(app.getPath("temp"), "folio-upd-")), file = path.join(dir, u.name);
  const r = await net.fetch(ORIGIN + "/dl/" + encodeURIComponent(u.name));
  if (!r.ok || !r.body) throw new Error("téléchargement " + r.status);
  const h = crypto.createHash("sha256"), out = fs.createWriteStream(file), reader = r.body.getReader();
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    h.update(value); got += value.length; out.write(value);
    e.sender.send("folio:progress", u.size ? got / u.size : 0);
  }
  await new Promise((ok) => out.end(ok));
  if (h.digest("hex") !== u.sha256) { fs.rmSync(dir, { recursive: true, force: true }); throw new Error("empreinte invalide"); }
  if (process.platform === "win32") {
    // installeur NSIS en silencieux (même dossier que l'installation actuelle), puis relance de Folio
    spawn(file, ["/S", "--force-run"], { detached: true, stdio: "ignore" }).unref();
  } else {
    // macOS : on remplace Folio.app par la nouvelle version une fois l'appli fermée, puis on la rouvre
    const appDir = path.resolve(path.dirname(process.execPath), "../../..");
    if (!/\.app$/.test(appDir)) throw new Error("emplacement inattendu");
    const sh = `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done
ditto -x -k "$1" "$2/new" && [ -d "$2/new/Folio.app" ] && rm -rf "$3" && mv "$2/new/Folio.app" "$3"; open "$3"; rm -rf "$2"`;
    spawn("/bin/sh", ["-c", sh, "sh", file, dir, appDir], { detached: true, stdio: "ignore" }).unref();
  }
  setTimeout(() => app.quit(), 300);
}
ipcMain.handle("folio:checkUpdate", () => checkUpdate().catch(() => null));
ipcMain.handle("folio:installUpdate", (e) => installUpdate(e));

// menus en français ou en anglais, selon la langue du système
const M = {
  fr: { edit: "Édition", undo: "Annuler", redo: "Rétablir", cut: "Couper", copy: "Copier", paste: "Coller", all: "Tout sélectionner",
    view: "Affichage", reload: "Recharger", reset: "Taille réelle", zin: "Zoom avant", zout: "Zoom arrière", full: "Plein écran",
    about: "À propos de Folio", hide: "Masquer Folio", others: "Masquer les autres", show: "Tout afficher", quitApp: "Quitter Folio",
    win: "Fenêtre", min: "Réduire", zoom: "Agrandir", close: "Fermer", file: "Fichier", quit: "Quitter" },
  en: { edit: "Edit", undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste", all: "Select All",
    view: "View", reload: "Reload", reset: "Actual Size", zin: "Zoom In", zout: "Zoom Out", full: "Toggle Full Screen",
    about: "About Folio", hide: "Hide Folio", others: "Hide Others", show: "Show All", quitApp: "Quit Folio",
    win: "Window", min: "Minimize", zoom: "Zoom", close: "Close", file: "File", quit: "Quit" },
};
function buildMenu() {
  const t = M[/^fr/i.test(app.getLocale()) ? "fr" : "en"];
  const edit = { label: t.edit, submenu: [
    { role: "undo", label: t.undo }, { role: "redo", label: t.redo }, { type: "separator" },
    { role: "cut", label: t.cut }, { role: "copy", label: t.copy }, { role: "paste", label: t.paste },
    { role: "selectAll", label: t.all }] };
  const view = { label: t.view, submenu: [
    { role: "reload", label: t.reload }, { type: "separator" },
    { role: "resetZoom", label: t.reset }, { role: "zoomIn", label: t.zin }, { role: "zoomOut", label: t.zout },
    { type: "separator" }, { role: "togglefullscreen", label: t.full }] };
  const tpl = isMac
    ? [{ label: "Folio", submenu: [{ role: "about", label: t.about }, { type: "separator" },
        { role: "hide", label: t.hide }, { role: "hideOthers", label: t.others }, { role: "unhide", label: t.show },
        { type: "separator" }, { role: "quit", label: t.quitApp }] },
       edit, view, { label: t.win, submenu: [{ role: "minimize", label: t.min }, { role: "zoom", label: t.zoom }, { role: "close", label: t.close }] }]
    : [{ label: t.file, submenu: [{ role: "quit", label: t.quit }] }, edit, view];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  queue(epubsIn(process.argv));
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on("window-all-closed", () => { if (!isMac) app.quit(); });
