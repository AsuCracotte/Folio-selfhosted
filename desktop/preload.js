// Pont minimal entre l'appli de bureau et la page Folio (aucun accès Node.js exposé à la page).
const { ipcRenderer, contextBridge } = require("electron");

// Livre ouvert depuis le système (double-clic, « Ouvrir avec ») : on le remet à la page
// comme s'il avait été glissé dans la fenêtre — la page sait déjà importer un dépôt de fichiers.
ipcRenderer.on("folio:file", (_e, { name, data }) => {
  const dt = new DataTransfer();
  dt.items.add(new File([data], name, { type: "application/epub+zip" }));
  window.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
});

contextBridge.exposeInMainWorld("folioDesktop", { retry: () => ipcRenderer.send("folio:retry") });
