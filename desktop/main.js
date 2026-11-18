// Folio pour Windows et macOS : une fenêtre de bureau autour de l'appli web Folio (même interface, même synchro).
const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

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
  // aucun accès caméra, micro, notifications…
  win.webContents.session.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === "clipboard-sanitized-write"));

  // hors ligne au tout premier lancement (pas encore de cache) : page d'attente avec « Réessayer »
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3 && url.startsWith(ORIGIN)) win.loadFile(path.join(__dirname, "offline.html"));
  });
  win.webContents.on("did-finish-load", () => setTimeout(flush, 600));
  win.loadURL(SITE);
}

ipcMain.on("folio:retry", () => win && win.loadURL(SITE));

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
