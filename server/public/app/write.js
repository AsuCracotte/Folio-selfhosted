/* Folio — éditeur de livres, partagé entre le site (PWA, Windows/Mac) et l'app Linux (WebKit).
   L'hôte fournit stockage et synchro : FolioWriter.mount(racine, hôte), cf. « hôte » plus bas.
   Utilise les variables CSS de l'hôte : --bg --fg --ac --acfg --muted --line --soft --surface --serif. */
window.FolioWriter = (() => {
  const TX = {
    fr: { mine: "Mes manuscrits", newBook: "Nouveau livre", import: "Importer un texte", importTip: "Fichier .txt, .md ou .html : un chapitre par titre",
      empty: "Votre premier livre commence ici", emptyTxt: "Écrivez chapitre par chapitre ; tout est enregistré à chaque frappe, sur cet appareil et sur votre compte.",
      untitled: "Sans titre", chapter: "Chapitre {n}", chapters: "Chapitres", addChapter: "Ajouter un chapitre", chTitle: "Titre du chapitre",
      words: "{n} mots", word: "{n} mot", chars: "{n} signes", read: "{n} min de lecture", total: "{n} mots au total", edited: "Modifié {d}",
      saving: "Enregistrement…", savedLocal: "Enregistré sur cet appareil", synced: "Enregistré et synchronisé", offline: "Hors ligne : enregistré sur cet appareil",
      back: "Mes manuscrits", toc: "Chapitres", undo: "Annuler (Ctrl+Z)", redo: "Rétablir (Ctrl+Maj+Z)", find: "Rechercher et remplacer (Ctrl+F)",
      focus: "Mode concentration (Ctrl+Maj+F)", book: "Le livre : titre, couverture, export…", exportEpub: "Exporter en EPUB",
      para: "Paragraphe", h2: "Titre", h3: "Sous-titre", quote: "Citation", bold: "Gras (Ctrl+B)", italic: "Italique (Ctrl+I)", under: "Souligné (Ctrl+U)", strike: "Barré",
      ul: "Liste à puces", ol: "Liste numérotée", left: "Aligner à gauche", center: "Centrer", right: "Aligner à droite", justify: "Justifier",
      scene: "Changement de scène (* * *)", link: "Lien", image: "Image", clear: "Effacer la mise en forme", linkUrl: "Adresse du lien (https://…)",
      findPh: "Rechercher", replPh: "Remplacer par", replace: "Remplacer", replaceAll: "Tout remplacer", matchCase: "Respecter la casse",
      replacedN: "{n} remplacements dans le livre", noMatch: "Aucun résultat",
      moveUp: "Monter", moveDown: "Descendre", delChapter: "Supprimer le chapitre", confirmDelCh: "Supprimer le chapitre « {t} » ? Il reste dans l'historique du livre.",
      bookT: "Le livre", title: "Titre", author: "Auteur·rice", lang: "Langue", desc: "Résumé", cover: "Couverture", pickCover: "Choisir une image", removeCover: "Retirer",
      autoCover: "Sans image, une couverture est créée avec le titre et l'auteur·rice.",
      toLibrary: "Ajouter à ma bibliothèque", inLibrary: "Livre ajouté à votre bibliothèque", exported: "EPUB créé",
      history: "Historique", historyTip: "Une version est gardée à l'ouverture du livre et toutes les 5 minutes d'écriture.", restore: "Restaurer",
      noHistory: "Pas encore de version enregistrée", confirmRestore: "Revenir à la version du {d} ? La version actuelle est d'abord gardée dans l'historique.", restored: "Version restaurée",
      prefs: "Écriture", typo: "Typographie automatique", typoTip: "Apostrophes et guillemets typographiques, points de suspension, tirets, espaces insécables",
      spell: "Correcteur orthographique", size: "Taille du texte", delBook: "Supprimer le livre", confirmDelBook: "Supprimer définitivement « {t} » ? Cette action ne peut pas être annulée.",
      deleted: "Livre supprimé", ok: "OK", cancel: "Annuler", close: "Fermer", open: "Ouvrir", more: "Plus d'actions",
      imported: "« {t} » importé : {n} chapitres", badFile: "Fichier illisible", badImage: "Image illisible", by: "par {a}", exportFail: "Export impossible : {e}",
      rename: "Renommer", duplicate: "Dupliquer", copySuffix: "(copie)", cut: "Couper", copy: "Copier", paste: "Coller",
      pasteKeys: "Collez avec {k}", fmt: "Mise en forme", boldL: "Gras", italicL: "Italique", underL: "Souligné",
      blockT: "Paragraphe", alignT: "Alignement", insertT: "Insérer",
      justNow: "à l'instant", minAgo: "il y a {n} min", hAgo: "il y a {n} h", saveNow: "Enregistré" },
    en: { mine: "My manuscripts", newBook: "New book", import: "Import a text", importTip: ".txt, .md or .html file: one chapter per heading",
      empty: "Your first book starts here", emptyTxt: "Write chapter by chapter; everything is saved as you type, on this device and to your account.",
      untitled: "Untitled", chapter: "Chapter {n}", chapters: "Chapters", addChapter: "Add a chapter", chTitle: "Chapter title",
      words: "{n} words", word: "{n} word", chars: "{n} characters", read: "{n} min read", total: "{n} words in total", edited: "Edited {d}",
      saving: "Saving…", savedLocal: "Saved on this device", synced: "Saved and synced", offline: "Offline: saved on this device",
      back: "My manuscripts", toc: "Chapters", undo: "Undo (Ctrl+Z)", redo: "Redo (Ctrl+Shift+Z)", find: "Find and replace (Ctrl+F)",
      focus: "Focus mode (Ctrl+Shift+F)", book: "The book: title, cover, export…", exportEpub: "Export as EPUB",
      para: "Paragraph", h2: "Heading", h3: "Subheading", quote: "Quote", bold: "Bold (Ctrl+B)", italic: "Italic (Ctrl+I)", under: "Underline (Ctrl+U)", strike: "Strikethrough",
      ul: "Bulleted list", ol: "Numbered list", left: "Align left", center: "Center", right: "Align right", justify: "Justify",
      scene: "Scene break (* * *)", link: "Link", image: "Image", clear: "Clear formatting", linkUrl: "Link address (https://…)",
      findPh: "Find", replPh: "Replace with", replace: "Replace", replaceAll: "Replace all", matchCase: "Match case",
      replacedN: "{n} replacements in the book", noMatch: "No results",
      moveUp: "Move up", moveDown: "Move down", delChapter: "Delete chapter", confirmDelCh: "Delete the chapter “{t}”? It stays in the book's history.",
      bookT: "The book", title: "Title", author: "Author", lang: "Language", desc: "Blurb", cover: "Cover", pickCover: "Choose an image", removeCover: "Remove",
      autoCover: "Without an image, a cover is made from the title and author.",
      toLibrary: "Add to my library", inLibrary: "Book added to your library", exported: "EPUB created",
      history: "History", historyTip: "A version is kept when the book is opened and every 5 minutes of writing.", restore: "Restore",
      noHistory: "No saved version yet", confirmRestore: "Go back to the version from {d}? The current version is kept in the history first.", restored: "Version restored",
      prefs: "Writing", typo: "Smart typography", typoTip: "Curly quotes and apostrophes, ellipses, dashes",
      spell: "Spell check", size: "Text size", delBook: "Delete the book", confirmDelBook: "Permanently delete “{t}”? This cannot be undone.",
      deleted: "Book deleted", ok: "OK", cancel: "Cancel", close: "Close", open: "Open", more: "More actions",
      imported: "“{t}” imported: {n} chapters", badFile: "Unreadable file", badImage: "Unreadable image", by: "by {a}", exportFail: "Export failed: {e}",
      rename: "Rename", duplicate: "Duplicate", copySuffix: "(copy)", cut: "Cut", copy: "Copy", paste: "Paste",
      pasteKeys: "Paste with {k}", fmt: "Formatting", boldL: "Bold", italicL: "Italic", underL: "Underline",
      blockT: "Paragraph", alignT: "Alignment", insertT: "Insert",
      justNow: "just now", minAgo: "{n} min ago", hAgo: "{n} h ago", saveNow: "Saved" },
  };
  let L = "fr";
  const t = (k, v = {}) => String((TX[L] || TX.fr)[k] ?? TX.fr[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
  const now = () => Date.now() / 1000;
  const newId = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (n) => n.toLocaleString(L === "fr" ? "fr-FR" : "en-GB");
  const countWords = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}’'\-]*/gu) || []).length;
  const textOf = (html) => new DOMParser().parseFromString(`<body>${html}`, "text/html").body.textContent || "";

  // ---------- fusion (identique au serveur, src/merge.js) ----------
  function merge(cur, inc) {
    if (!cur) return inc;
    const meta = (inc.updated || 0) > (cur.updated || 0) ? { ...inc, cover: inc.cover ?? cur.cover } : cur;
    const m = new Map(cur.chapters.map((c) => [c.id, c]));
    for (const c of inc.chapters || []) { const l = m.get(c.id); if (!l || (l.updated || 0) < (c.updated || 0)) m.set(c.id, c); }
    return { ...meta, chapters: meta.deleted ? [] : [...m.values()] };
  }
  const stamp = (d) => Math.max(d.updated || 0, ...d.chapters.map((c) => c.updated || 0));
  const ordered = (d) => {
    const live = d.chapters.filter((c) => !c.deleted), byId = new Map(live.map((c) => [c.id, c]));
    const out = (d.order || []).map((id) => byId.get(id)).filter(Boolean);
    return out.concat(live.filter((c) => !out.includes(c)).sort((a, b) => (a.created || 0) - (b.created || 0)));
  };

  // ---------- nettoyage du HTML (collé, importé, synchronisé) : seule une mise en forme de livre est gardée ----------
  const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH", "TEMPLATE", "META", "LINK", "TITLE", "NOSCRIPT", "HEAD", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "CANVAS", "VIDEO", "AUDIO", "FORM"]);
  const MAP = { DIV: "P", H1: "H2", H4: "H3", H5: "H3", H6: "H3", STRONG: "B", EM: "I", STRIKE: "S", DEL: "S", PRE: "P", ARTICLE: "P", SECTION: "P", FIGCAPTION: "P", TD: "P", DT: "P", DD: "P" };
  const KEEP = new Set(["P", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "LI", "HR", "B", "I", "U", "S", "BR", "A", "IMG", "SUP", "SUB"]);
  const BLOCKS = new Set(["P", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "HR"]);
  const ALIGN = /^(left|center|right|justify)$/;
  function cleanNode(src, doc) {
    const out = doc.createDocumentFragment();
    for (const n of [...src.childNodes]) {
      if (n.nodeType === 3) { out.append(doc.createTextNode(n.data)); continue; }
      if (n.nodeType !== 1 || DROP.has(n.tagName)) continue;
      const tag = MAP[n.tagName] || n.tagName;
      if (!KEEP.has(tag)) {
        // gras / italique écrits en CSS (Google Docs, Word…) : gardés comme balises
        const st = n.getAttribute("style") || "", inner = cleanNode(n, doc);
        let w = inner;
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) { const b = doc.createElement("b"); b.append(w); w = b; }
        if (/font-style:\s*italic/.test(st)) { const i = doc.createElement("i"); i.append(w); w = i; }
        out.append(w); continue;
      }
      const e = doc.createElement(tag);
      if (tag === "A") { const h = n.getAttribute("href") || ""; if (/^(https?:|mailto:)/i.test(h)) e.setAttribute("href", h); }
      if (tag === "IMG") {
        const s = n.getAttribute("src") || "";
        if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(s)) continue;     // pas d'image distante : le livre doit tenir seul
        e.setAttribute("src", s); e.setAttribute("alt", n.getAttribute("alt") || "");
      }
      if (BLOCKS.has(tag) || tag === "LI") {
        const a = (n.style?.textAlign || n.getAttribute("align") || "").toLowerCase();
        if (ALIGN.test(a) && a !== "left") e.style.textAlign = a;
      }
      if (tag !== "IMG" && tag !== "HR" && tag !== "BR") e.append(cleanNode(n, doc));
      out.append(e);
    }
    return out;
  }
  // texte ou éléments en ligne au premier niveau → paragraphes (un livre n'a pas de texte « nu »)
  function clean(html) {
    const doc = new DOMParser().parseFromString(`<body>${html || ""}`, "text/html"), body = doc.createElement("body");
    let p = null;
    for (const n of [...cleanNode(doc.body, doc).childNodes]) {
      if (n.nodeType === 1 && BLOCKS.has(n.tagName)) { p = null; body.append(n); continue; }
      if (n.nodeType === 1 && n.tagName === "LI") { const u = doc.createElement("ul"); u.append(n); body.append(u); p = null; continue; }
      if (n.nodeType === 3 && !n.data.trim() && !p) continue;
      if (!p) { p = doc.createElement("p"); body.append(p); }
      p.append(n);
    }
    body.querySelectorAll("p").forEach((x) => { if (x.querySelector("p,ul,ol,blockquote,h2,h3")) x.replaceWith(...x.childNodes); });
    return body.innerHTML || "<p><br></p>";
  }

  // ---------- couverture générée (titre + auteur·rice) ----------
  function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  function wrapText(x, s, w) {
    const out = []; let line = "";
    for (const word of String(s).split(/\s+/)) { const tst = line ? line + " " + word : word; if (line && x.measureText(tst).width > w) { out.push(line); line = word; } else line = tst; }
    if (line) out.push(line); return out;
  }
  function makeCover(d) {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 1800;
    const x = c.getContext("2d"), h = hue(d.id), g = x.createLinearGradient(0, 0, 1200, 1800);
    g.addColorStop(0, `hsl(${h},42%,30%)`); g.addColorStop(1, `hsl(${(h + 40) % 360},48%,16%)`);
    x.fillStyle = g; x.fillRect(0, 0, 1200, 1800);
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 3; x.strokeRect(70, 70, 1060, 1660);
    x.fillStyle = "#fff"; x.textAlign = "center";
    let size = 118; x.font = `500 ${size}px Georgia, serif`;
    let lines = wrapText(x, d.title || t("untitled"), 900);
    while (lines.length > 4 && size > 60) { size -= 10; x.font = `500 ${size}px Georgia, serif`; lines = wrapText(x, d.title || t("untitled"), 900); }
    lines.forEach((l, i) => x.fillText(l, 600, 640 + i * size * 1.15 - (lines.length - 1) * size * .57));
    x.fillRect(560, 1000, 80, 3);
    if (d.author) { x.font = "italic 60px Georgia, serif"; x.fillStyle = "rgba(255,255,255,.85)"; wrapText(x, d.author, 900).slice(0, 2).forEach((l, i) => x.fillText(l, 600, 1500 + i * 70)); }
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", .9));
  }
  // image choisie → JPEG (sans agrandir) en data URL
  function imageData(file, mw, mh, q = .85) {
    return new Promise((ok, ko) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => {
        const k = Math.min(1, mw / i.naturalWidth, mh / i.naturalHeight), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(i.naturalWidth * k)); c.height = Math.max(1, Math.round(i.naturalHeight * k));
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u); ok(c.toDataURL("image/jpeg", q));
      };
      i.onerror = () => { URL.revokeObjectURL(u); ko(new Error("img")); };
      i.src = u;
    });
  }

  // ---------- export EPUB 3 (+ toc.ncx pour les vieilles liseuses) ----------
  const NS = "http://www.w3.org/1999/xhtml";
  const xesc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
  const page = (lang, title, body, cls = "") => `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="${NS}" xmlns:epub="http://www.idpf.org/2007/ops" lang="${lang}" xml:lang="${lang}"><head><meta charset="utf-8"/><title>${xesc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body${cls ? ` class="${cls}"` : ""}>${body}</body></html>`;
  const CSS = `body{margin:0 5%;font-family:serif;line-height:1.5}h1.ch{text-align:center;font-weight:normal;margin:3em 0 2em;font-size:1.6em}
h2{font-size:1.25em;margin:1.6em 0 .6em}h3{font-size:1.08em;margin:1.4em 0 .5em}p{margin:0;text-indent:1.3em;text-align:justify}
h1+p,h2+p,h3+p,p.scene+p,blockquote+p,ul+p,ol+p,p.first{text-indent:0}p.scene{text-indent:0;text-align:center;margin:1.2em 0}
blockquote{margin:1em 2em;font-style:italic}blockquote p{text-indent:0}img{max-width:100%}p.img{text-indent:0;text-align:center;margin:1em 0}
.title{text-align:center;margin-top:30%}.title h1{font-weight:normal;font-size:2em;margin:0 0 .6em}.title p{text-align:center;text-indent:0;font-style:italic}
.cover{margin:0;padding:0;text-align:center}.cover img{height:100%;max-height:100vh}`;
  async function toEpub(d) {
    const zip = new JSZip(), O = "OEBPS/", lang = d.lang || "fr", title = d.title || t("untitled"), id = `urn:folio:writer:${d.id}`;
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file("META-INF/container.xml", `<?xml version="1.0" encoding="utf-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    zip.file(O + "style.css", CSS);
    const items = [], spine = [], nav = [];
    let imgN = 0;
    const addImg = (dataUrl, name) => {
      const m = /^data:image\/(png|jpeg|gif|webp);base64,(.*)$/i.exec(dataUrl); if (!m) return null;
      const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase(), f = `images/${name || "i" + ++imgN}.${ext}`;
      zip.file(O + f, m[2], { base64: true });
      items.push(`<item id="${f.replace(/\W/g, "_")}" href="${f}" media-type="image/${m[1].toLowerCase()}"${name === "cover" ? ' properties="cover-image"' : ""}/>`);
      return f;
    };
    // couverture
    let cover = d.cover && addImg(d.cover, "cover");
    if (!cover) {
      const b = await makeCover(d);
      zip.file(O + "images/cover.jpg", b); cover = "images/cover.jpg";
      items.push('<item id="images_cover_jpg" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>');
    }
    zip.file(O + "cover.xhtml", page(lang, title, `<div class="cover"><img src="${cover}" alt="${xesc(title)}"/></div>`, "cover"));
    items.push('<item id="coverpage" href="cover.xhtml" media-type="application/xhtml+xml"/>'); spine.push('<itemref idref="coverpage" linear="no"/>');
    zip.file(O + "title.xhtml", page(lang, title, `<div class="title"><h1>${xesc(title)}</h1>${d.author ? `<p>${xesc(d.author)}</p>` : ""}</div>`));
    items.push('<item id="titlepage" href="title.xhtml" media-type="application/xhtml+xml"/>'); spine.push('<itemref idref="titlepage"/>');
    // chapitres : HTML nettoyé → XHTML (images extraites, changements de scène en « * * * »)
    const ser = new XMLSerializer();
    ordered(d).forEach((c, i) => {
      const xd = document.implementation.createDocument(NS, "html", null), body = xd.createElementNS(NS, "body");
      const hd = new DOMParser().parseFromString(`<body>${clean(c.html)}</body>`, "text/html");
      hd.querySelectorAll("img").forEach((im) => { const f = addImg(im.getAttribute("src")); if (!f) return im.remove(); im.setAttribute("src", f); const p = hd.createElement("p"); p.className = "img"; im.replaceWith(p); p.append(im); });
      hd.querySelectorAll("hr").forEach((h) => { const p = hd.createElement("p"); p.className = "scene"; p.textContent = "* * *"; h.replaceWith(p); });
      hd.querySelectorAll("p").forEach((p) => { if (!p.textContent.trim() && !p.querySelector("img")) p.remove(); });
      const ct = c.title || t("chapter", { n: i + 1 });
      body.appendChild(xd.importNode(Object.assign(hd.createElement("h1"), { className: "ch", textContent: ct }), true));
      for (const n of [...hd.body.childNodes]) body.appendChild(xd.importNode(n, true));
      const inner = ser.serializeToString(body).replace(/^<body[^>]*>|<\/body>$/g, "");
      const f = `c${String(i + 1).padStart(3, "0")}.xhtml`;
      zip.file(O + f, page(lang, ct, inner));
      items.push(`<item id="c${i + 1}" href="${f}" media-type="application/xhtml+xml"/>`); spine.push(`<itemref idref="c${i + 1}"/>`);
      nav.push([ct, f]);
    });
    zip.file(O + "nav.xhtml", page(lang, title, `<nav epub:type="toc" id="toc"><h1>${xesc(title)}</h1><ol>${nav.map(([l, f]) => `<li><a href="${f}">${xesc(l)}</a></li>`).join("")}</ol></nav>`));
    zip.file(O + "toc.ncx", `<?xml version="1.0" encoding="utf-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${xesc(id)}"/></head><docTitle><text>${xesc(title)}</text></docTitle><navMap>${nav.map(([l, f], i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${xesc(l)}</text></navLabel><content src="${f}"/></navPoint>`).join("")}</navMap></ncx>`);
    const mod = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    zip.file(O + "content.opf", `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${lang}"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">${xesc(id)}</dc:identifier><dc:title>${xesc(title)}</dc:title>${d.author ? `<dc:creator>${xesc(d.author)}</dc:creator>` : ""}<dc:language>${lang}</dc:language>
${d.desc ? `<dc:description>${xesc(d.desc)}</dc:description>` : ""}<meta property="dcterms:modified">${mod}</meta><meta name="cover" content="images_cover_${cover.split(".").pop()}"/></metadata>
<manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>${items.join("")}</manifest>
<spine toc="ncx">${spine.join("")}</spine></package>`);
    return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip", compression: "DEFLATE" });
  }

  // ---------- import d'un texte (.txt / .md / .html) : un chapitre par titre ----------
  function inlineMd(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>").replace(/_(.+?)_/g, "<i>$1</i>"); }
  function fromText(name, text, lang) {
    const n = now(), base = name.replace(/\.[^.]+$/, ""), chapters = [];
    let title = base, cur = null;
    const push = (tt) => { cur = { id: newId(), title: tt, html: "", created: n + chapters.length / 1000, updated: n, deleted: 0 }; chapters.push(cur); };
    if (/\.html?$/i.test(name)) {
      const doc = new DOMParser().parseFromString(text, "text/html");
      title = doc.querySelector("title")?.textContent.trim() || base;
      let buf = "";
      for (const el of [...doc.body.children]) {
        if (/^H[12]$/.test(el.tagName)) { if (cur || buf.trim()) { if (!cur) push(""); cur.html = clean(buf); } push(el.textContent.trim()); buf = ""; } else buf += el.outerHTML;
      }
      if (!cur) push(""); cur.html = clean(buf);
    } else {
      const md = /\.(md|markdown)$/i.test(name), head = /^(#{1,2})\s+(.+)$|^((chapitre|chapter|partie|part)\s+[\w\d]+.*)$/i;
      let paras = [], para = [];
      const endPara = () => { if (para.length) { paras.push(para.join(" ")); para = []; } };
      const endCh = () => { endPara(); if (!cur && !paras.length) return; if (!cur) push(""); cur.html = paras.map((p) => p === "⁂" ? "<hr>" : `<p>${md ? inlineMd(p) : esc(p)}</p>`).join("") || "<p><br></p>"; paras = []; };
      // paragraphes séparés par des lignes vides (lignes jointes), sinon une ligne = un paragraphe
      const src = text.replace(/\r\n?/g, "\n"), blank = md || /\n[ \t]*\n/.test(src.trim());
      for (const raw of src.split("\n")) {
        const line = raw.trim(), h = head.exec(line);
        if (h) { endCh(); push((h[2] || h[3]).replace(/#+$/, "").trim()); continue; }
        if (/^(\*\s*\*\s*\*|\*{3,}|-{3,}|#)$/.test(line)) { endPara(); paras.push("⁂"); continue; }
        if (!line) { endPara(); continue; }
        para.push(line); if (!blank) endPara();
      }
      endCh();
    }
    if (!chapters.length) push("");
    return { id: newId(), title, author: "", lang, desc: "", cover: "", coverAt: 0, order: chapters.map((c) => c.id), created: n, updated: n, deleted: 0, chapters };
  }

  // ---------- icônes ----------
  const P = {
    back: "M15 18l-6-6 6-6", plus: "M12 5v14M5 12h14", list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    undo: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11", redo: "M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13",
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35", focus: "M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5", dl: "M12 3v12M7 10l5 5 5-5M5 21h14",
    ul: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01", ol: "M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 4h3",
    left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10", right: "M4 6h16M10 10h10M4 14h16M10 18h10", justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
    quote: "M7 7h4v4c0 3-2 5-4 6M14 7h4v4c0 3-2 5-4 6", scene: "M6 12h.01M12 12h.01M18 12h.01", link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
    image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01", clear: "M6 4h12M12 4l-4 16M4 20l16-16", x: "M6 6l12 12M18 6L6 18", dots: "M5 12h.01M12 12h.01M19 12h.01",
    up: "M12 19V5M5 12l7-7 7 7", down: "M12 5v14M19 12l-7 7-7-7", trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3", grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
    hist: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2", lib: "M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-.8 3 15.6-3.5.8z", up2: "M12 15V3M7 8l5-5 5 5M5 21h14",
    chev: "M6 9l6 6 6-6", check: "M5 12l5 5L20 7", pen: "M4 20h4L19 9l-4-4L4 16z", copy: "M9 9h11v11H9zM5 15H4V4h11v1",
    cut: "M6 6a2.5 2.5 0 1 0 0 .01M6 18a2.5 2.5 0 1 0 0 .01M8 7.5 20 18M8 16.5 20 6", paste: "M9 4h6v3H9zM7 5H5v16h14V5h-2",
  };
  const ic = (n) => `<svg class="fw-i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

  const CSSUI = `
.fw{position:fixed;inset:0;z-index:40;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.fw[hidden],.fw [hidden]{display:none !important}
.fw-i{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.fw button{font:inherit;color:inherit;cursor:pointer}
.fw-ib{width:40px;height:40px;border:0;border-radius:50%;background:transparent;display:grid;place-items:center;flex:none;transition:background .15s}
.fw-ib:hover{background:var(--soft)}.fw-ib.on{background:color-mix(in srgb,var(--ac) 16%,var(--bg));color:var(--ac)}.fw-ib:disabled{opacity:.35;cursor:default}
.fw-btn{border:0;border-radius:999px;padding:9px 16px;background:var(--soft);font-weight:600;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;transition:filter .15s,transform .1s}
.fw-btn:active{transform:scale(.97)}.fw-btn.pri{background:var(--ac);color:var(--acfg)}.fw-btn.pri:hover{filter:brightness(1.08)}.fw-btn.danger{color:#d33}
.fw-sp{flex:1}
.fw-lh,.fw-top{display:flex;align-items:center;gap:6px;padding:calc(env(safe-area-inset-top) + 10px) 16px 10px;border-bottom:1px solid var(--line);flex:none}
.fw-lh h2{margin:0 0 0 4px;font:500 22px/1.2 var(--serif)}
.fw-list{flex:1;overflow:auto}
.fw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:26px 22px;padding:26px 28px 60px;max-width:1240px;margin:0 auto}
.fw-card{border:0;background:none;padding:0;text-align:left;position:relative;display:flex;flex-direction:column;align-self:start;min-width:0}
.fw-cv{aspect-ratio:2/3;border-radius:6px 10px 10px 6px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14%;
 color:#fff;font:500 17px/1.2 var(--serif);box-shadow:0 1px 2px rgba(0,0,0,.08),0 10px 26px -8px rgba(0,0,0,.3);transition:transform .25s}
.fw-card:hover .fw-cv{transform:translateY(-3px)}.fw-cv img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:inherit}
.fw-cv small{font:italic 13px/1.3 var(--serif);opacity:.85;margin-top:10px}
.fw-ct2{margin-top:10px;font:500 15.5px/1.25 var(--serif);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fw-meta{color:var(--muted);font-size:12.5px}
.fw-new .fw-cv{background:var(--surface);color:var(--muted);border:1.5px dashed var(--line);box-shadow:none;font:600 14px system-ui,sans-serif;gap:8px}
.fw-empty{text-align:center;max-width:440px;margin:8vh auto 0;padding:0 24px}.fw-empty h3{font:500 26px/1.2 var(--serif);margin:0 0 8px}.fw-empty p{color:var(--muted);margin:0 0 22px}
.fw-ed{flex:1;display:flex;flex-direction:column;min-height:0}
.fw-bt{min-width:0;flex:1;padding:0 6px;cursor:pointer}.fw-bt b{display:block;font:500 16px/1.2 var(--serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fw-bt small{color:var(--muted);font-size:12px;display:flex;align-items:center;gap:5px}.fw-bt small span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fw-bt small i{width:7px;height:7px;border-radius:50%;background:#3bb273;flex:none}
.fw-bt small.busy i{background:#e0a400}.fw-bt small.local i{background:var(--muted)}
.fw-body{flex:1;display:flex;min-height:0}
.fw-side{width:260px;flex:none;border-right:1px solid var(--line);display:flex;flex-direction:column;background:var(--surface);min-height:0}
.fw-sh{display:flex;align-items:center;justify-content:space-between;padding:14px 10px 6px 18px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
.fw-chs{list-style:none;margin:0;padding:4px 8px;overflow:auto;flex:1}
.fw-chs li{-webkit-touch-callout:none;display:flex;align-items:center;gap:6px;padding:8px 8px 8px 4px;border-radius:10px;cursor:pointer;user-select:none;touch-action:pan-y}
.fw-chs li:hover{background:var(--soft)}.fw-chs li.on{background:color-mix(in srgb,var(--ac) 14%,var(--bg))}.fw-chs li.drag{opacity:.6;background:var(--soft)}
.fw-chs .g{cursor:grab;color:var(--muted);opacity:.5;touch-action:none;display:grid;place-items:center;width:22px;height:28px}.fw-chs li:hover .g{opacity:1}
.fw-chs .n{flex:1;min-width:0}.fw-chs .n b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fw-chs .n small{color:var(--muted);font-size:12px}
.fw-tot{padding:10px 18px calc(env(safe-area-inset-bottom) + 12px);color:var(--muted);font-size:12.5px;border-top:1px solid var(--line)}
.fw-main{flex:1;display:flex;flex-direction:column;min-width:0;position:relative}
.fw-tools{display:flex;align-items:center;gap:2px;padding:6px 12px;border-bottom:1px solid var(--line);overflow-x:auto;flex:none;scrollbar-width:none}
.fw-tools::-webkit-scrollbar{display:none}
.fw-tools .fw-ib{width:36px;height:36px;border-radius:9px;font:600 16px/1 Georgia,serif}.fw-tools .sep{width:1px;height:22px;background:var(--line);margin:0 6px;flex:none}
.fw-tools select{border:0;background:var(--soft);border-radius:9px;padding:7px 10px;font:inherit;color:inherit;margin-right:4px}
.fw-find{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--surface)}
.fw-find input[type=text]{flex:1;min-width:130px;border:1px solid var(--line);background:var(--bg);color:inherit;border-radius:10px;padding:7px 10px;font:inherit}
.fw-find .c{color:var(--muted);font-size:12.5px;min-width:44px;text-align:center}.fw-find label{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:13px}
.fw-find .fw-btn{padding:7px 12px;font-size:13.5px}
.fw-scroll{flex:1;overflow:auto;overscroll-behavior:contain}
.fw-page{max-width:740px;margin:0 auto;padding:44px 32px 40vh}
.fw-cti{display:block;width:100%;border:0;background:transparent;color:inherit;font:500 32px/1.2 var(--serif);padding:0;margin:0 0 26px;outline:none}
.fw-cti::placeholder{color:var(--muted);opacity:.6}
.fw-txt{outline:none;font-family:Georgia,"Iowan Old Style","Palatino Linotype",serif;font-size:var(--fs,19px);line-height:1.7;min-height:50vh;caret-color:var(--ac);overflow-wrap:break-word}
.fw-txt p{margin:0 0 .9em}.fw-txt h2{font:500 1.35em/1.25 var(--serif);margin:1.4em 0 .6em}.fw-txt h3{font:600 1.1em/1.3 var(--serif);margin:1.2em 0 .5em}
.fw-txt blockquote{margin:1em 0;padding:.1em 0 .1em 1.2em;border-left:3px solid color-mix(in srgb,var(--ac) 55%,var(--bg));font-style:italic;color:color-mix(in srgb,var(--fg) 85%,var(--bg))}
.fw-txt hr{border:0;margin:1.6em 0;text-align:center;height:1.4em;overflow:visible}.fw-txt hr::after{content:"*  *  *";color:var(--muted);letter-spacing:.3em}
.fw-txt img{max-width:100%;height:auto;border-radius:6px;display:block;margin:1em auto}.fw-txt a{color:var(--ac)}
.fw-txt:empty::before{content:attr(data-ph);color:var(--muted);opacity:.6}
.fw-txt ::selection{background:color-mix(in srgb,var(--ac) 28%,transparent)}
::highlight(fw-find){background:color-mix(in srgb,#f6d55c 70%,transparent);color:inherit}
.fw-foot{display:flex;align-items:center;gap:14px;padding:6px 16px calc(env(safe-area-inset-bottom) + 6px);border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;flex:none;font-variant-numeric:tabular-nums}
.fw-foot .fw-ib{width:32px;height:32px}
.fw.focus .fw-side,.fw.focus .fw-foot{display:none}.fw.focus .fw-top,.fw.focus .fw-tools{opacity:.15;transition:opacity .3s}.fw.focus .fw-top:hover,.fw.focus .fw-tools:hover,.fw.focus .fw-tools:focus-within{opacity:1}
.fw-menu{position:fixed;z-index:60;background:var(--bg);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 34px -8px rgba(0,0,0,.3);padding:6px;min-width:200px}
.fw-menu button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:none;padding:9px 12px;border-radius:9px;text-align:left}.fw-menu button:hover{background:var(--soft)}
.fw-menu button:disabled{opacity:.4}.fw-menu{overflow:auto;min-width:250px}.fw-menu hr{border:0;border-top:1px solid var(--line);margin:5px 6px}
.fw-menu .h{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;padding:9px 12px 3px}
.fw-menu button{padding:7px 12px}.fw-menu .ic{width:22px;display:grid;place-items:center;flex:none}.fw-menu .l{flex:1}
.fw-menu kbd{font:12px system-ui,sans-serif;color:var(--muted);background:var(--soft);border-radius:6px;padding:1px 6px}.fw-menu .k{color:var(--ac);display:grid}
.fw-menu .gl{font:16px/1 Georgia,serif;width:20px;text-align:center}.fw-menu button:focus-visible{outline:2px solid var(--ac);outline-offset:-2px}
.fw-scrim{position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.28)}
.fw-sheet{position:fixed;z-index:56;right:0;top:0;bottom:0;width:min(440px,100%);background:var(--bg);overflow:auto;padding:calc(env(safe-area-inset-top) + 18px) 24px 30px;box-shadow:-20px 0 60px rgba(0,0,0,.18);overscroll-behavior:contain}
.fw-sheet h3{font:500 22px/1.2 var(--serif);margin:0;flex:1}.fw-sheet h4{margin:26px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.fw-shh{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.fw-f{display:block;margin:10px 0}.fw-f span{display:block;font-size:13px;color:var(--muted);margin:0 0 5px 2px}
.fw-f input,.fw-f textarea,.fw-f select{width:100%;border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:12px;padding:10px 12px;font:inherit}
.fw-f textarea{min-height:90px;resize:vertical}
.fw-cov{display:flex;gap:14px;align-items:flex-start}.fw-cov .fw-cv{width:96px;flex:none;font-size:11px;position:relative;padding:10%}.fw-cov .acts{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.fw-cov p{color:var(--muted);font-size:12.5px;margin:2px 0 0}
.fw-acts{display:flex;flex-direction:column;gap:8px;margin-top:14px}.fw-acts .fw-btn{justify-content:center}
.fw-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;border-top:1px solid var(--line)}.fw-row:first-of-type{border-top:0}
.fw-row small{display:block;color:var(--muted);font-size:12px}
.fw-seg{display:flex;background:var(--soft);border-radius:999px;padding:3px}.fw-seg button{border:0;background:none;border-radius:999px;padding:6px 12px;font-weight:600}.fw-seg button.on{background:var(--bg);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.fw-hist{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.fw-hist div{flex:1}.fw-hist small{color:var(--muted)}
.fw-modal{position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:rgba(0,0,0,.32);padding:20px}
.fw-modal>div{background:var(--bg);border-radius:20px;padding:22px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}.fw-modal p{margin:0 0 14px;line-height:1.5}
.fw-modal input{width:100%;border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:12px;padding:10px 12px;font:inherit;margin-bottom:14px}
.fw-modal .r{display:flex;gap:8px;justify-content:flex-end}
.fw-sw{position:relative;width:44px;height:26px;flex:none}.fw-sw input{opacity:0;position:absolute;inset:0;margin:0;cursor:pointer;z-index:1}
.fw-sw span{position:absolute;inset:0;border-radius:99px;background:var(--line);transition:background .2s}.fw-sw span::after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.fw-sw input:checked+span{background:var(--ac)}.fw-sw input:checked+span::after{transform:translateX(18px)}
.fw-tbtn{display:none}
@media (max-width:820px){
 .fw-tbtn{display:grid}.fw-side{position:fixed;z-index:50;left:0;top:0;bottom:0;width:min(300px,86%);transform:translateX(-102%);transition:transform .25s cubic-bezier(.2,.8,.2,1);box-shadow:20px 0 60px rgba(0,0,0,.2);padding-top:env(safe-area-inset-top)}
 .fw.side .fw-side{transform:none}.fw-page{padding:26px 20px 40vh}.fw-cti{font-size:26px}.fw-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:22px 16px;padding:20px 16px 60px}
 .fw-top .hide-s{display:none}.fw-lh .fw-btn span{display:none}.fw-lh .fw-btn{padding:9px 11px}
}`;

  /* hôte = {
       lang, msg(texte), close(),
       store: { list(), get(id), put(livre), snap(livre) (garde ~20 versions), snaps(id) → [{at, d}] du plus récent au plus ancien },
       changed(id) → Promise<true si synchronisé> (appelé après chaque enregistrement local),
       exportFile(blob, nom), toLibrary(blob, id) → Promise }
     Retourne { list(), open(id), remote(id) (après une synchro), flush() } */
  function mount(root, host) {
    L = host.lang === "en" ? "en" : "fr";
    const pref = (() => { try { return JSON.parse(localStorage.folioWr || "{}"); } catch (e) { return {}; } })();
    const P2 = Object.assign({ typo: true, spell: true, size: 19 }, pref);
    const savePref = () => { try { localStorage.folioWr = JSON.stringify(P2); } catch (e) {} };
    if (!document.getElementById("fw-css")) document.head.append(Object.assign(document.createElement("style"), { id: "fw-css", textContent: CSSUI }));
    root.innerHTML = `<div class="fw" hidden>
 <section class="fw-list"><header class="fw-lh"><button class="fw-ib" data-a="close" title="${t("close")}">${ic("back")}</button><h2>${t("mine")}</h2><span class="fw-sp"></span>
  <label class="fw-btn" title="${t("importTip")}">${ic("up2")}<span>${t("import")}</span><input type="file" accept=".txt,.md,.markdown,.html,.htm,text/plain,text/markdown,text/html" hidden></label>
  <button class="fw-btn pri" data-a="new">${ic("plus")}<span>${t("newBook")}</span></button></header><div class="fw-grid"></div></section>
 <section class="fw-ed" hidden>
  <header class="fw-top"><button class="fw-ib" data-a="list" title="${t("back")}">${ic("back")}</button><button class="fw-ib fw-tbtn" data-a="side" title="${t("toc")}">${ic("list")}</button>
   <div class="fw-bt" data-a="book"><b></b><small><i></i><span></span></small></div>
   <button class="fw-ib hide-s" data-a="undo" title="${t("undo")}">${ic("undo")}</button><button class="fw-ib hide-s" data-a="redo" title="${t("redo")}">${ic("redo")}</button>
   <button class="fw-ib" data-a="find" title="${t("find")}">${ic("search")}</button><button class="fw-ib hide-s" data-a="focus" title="${t("focus")}">${ic("focus")}</button>
   <button class="fw-ib" data-a="book" title="${t("book")}">${ic("book")}</button><button class="fw-btn pri" data-a="export" title="${t("exportEpub")}">${ic("dl")}<span class="hide-s">EPUB</span></button></header>
  <div class="fw-body">
   <aside class="fw-side"><div class="fw-sh"><span>${t("chapters")}</span><button class="fw-ib" data-a="addch" title="${t("addChapter")}">${ic("plus")}</button></div><ol class="fw-chs"></ol><div class="fw-tot"></div></aside>
   <div class="fw-main">
    <div class="fw-tools">
     <select data-c="block" title="${t("para")}"><option value="p">${t("para")}</option><option value="h2">${t("h2")}</option><option value="h3">${t("h3")}</option><option value="blockquote">${t("quote")}</option></select>
     <button class="fw-ib" data-c="bold" title="${t("bold")}"><b>B</b></button><button class="fw-ib" data-c="italic" title="${t("italic")}"><i>I</i></button>
     <button class="fw-ib" data-c="underline" title="${t("under")}"><u>U</u></button><button class="fw-ib" data-c="strikeThrough" title="${t("strike")}"><s>S</s></button><span class="sep"></span>
     <button class="fw-ib" data-c="insertUnorderedList" title="${t("ul")}">${ic("ul")}</button><button class="fw-ib" data-c="insertOrderedList" title="${t("ol")}">${ic("ol")}</button><span class="sep"></span>
     <button class="fw-ib" data-c="justifyLeft" title="${t("left")}">${ic("left")}</button><button class="fw-ib" data-c="justifyCenter" title="${t("center")}">${ic("center")}</button>
     <button class="fw-ib" data-c="justifyRight" title="${t("right")}">${ic("right")}</button><button class="fw-ib" data-c="justifyFull" title="${t("justify")}">${ic("justify")}</button><span class="sep"></span>
     <button class="fw-ib" data-c="scene" title="${t("scene")}" style="font:600 15px Georgia,serif">⁂</button><button class="fw-ib" data-c="link" title="${t("link")}">${ic("link")}</button>
     <label class="fw-ib" title="${t("image")}" style="cursor:pointer">${ic("image")}<input type="file" accept="image/*" hidden data-c="image"></label>
     <button class="fw-ib" data-c="clear" title="${t("clear")}">${ic("clear")}</button></div>
    <div class="fw-find" hidden><input type="text" data-f="q" placeholder="${t("findPh")}"><span class="c"></span><button class="fw-ib" data-f="prev">${ic("up")}</button><button class="fw-ib" data-f="next">${ic("down")}</button>
     <input type="text" data-f="r" placeholder="${t("replPh")}"><button class="fw-btn" data-f="one">${t("replace")}</button><button class="fw-btn" data-f="all">${t("replaceAll")}</button>
     <label><input type="checkbox" data-f="case"> ${t("matchCase")}</label><button class="fw-ib" data-f="close" title="${t("close")}">${ic("x")}</button></div>
    <div class="fw-scroll"><article class="fw-page"><input class="fw-cti" placeholder="${t("chTitle")}" maxlength="300"><div class="fw-txt" contenteditable="true" role="textbox" aria-multiline="true"></div></article></div>
    <footer class="fw-foot"><span data-s="w"></span><span data-s="c" class="hide-s"></span><span data-s="r"></span><span class="fw-sp"></span><button class="fw-ib" data-a="chmenu" title="${t("more")}">${ic("dots")}</button></footer>
   </div></div></section></div>`;
    const W = root.firstElementChild, $ = (s) => W.querySelector(s), grid = $(".fw-grid"), ed = $(".fw-txt"), cti = $(".fw-cti"), chs = $(".fw-chs");
    let D = null, C = null, dirty = false, saveT = 0, lastSnap = 0, editsSinceSnap = false, counts = new Map(), syncN = 0;
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}

    // ---- petites fenêtres (confirmation, saisie) ----
    function modal(text, { input = null, ok = t("ok"), danger = false } = {}) {
      return new Promise((done) => {
        const m = document.createElement("div"); m.className = "fw-modal";
        m.innerHTML = `<div><p></p>${input != null ? "<input>" : ""}<div class="r"><button class="fw-btn" data-r="0">${t("cancel")}</button><button class="fw-btn ${danger ? "danger" : "pri"}" data-r="1">${esc(ok)}</button></div></div>`;
        m.querySelector("p").textContent = text; const inp = m.querySelector("input"); if (inp) inp.value = input;
        const end = (v) => { m.remove(); done(v); };
        m.onclick = (e) => { const r = e.target.closest("[data-r]"); if (r) end(r.dataset.r === "1" ? (inp ? inp.value : true) : null); else if (e.target === m) end(null); };
        m.onkeydown = (e) => { if (e.key === "Enter") end(inp ? inp.value : true); if (e.key === "Escape") end(null); };
        W.append(m); (inp || m.querySelector("[data-r='1']")).focus();
      });
    }
    // items : [icône, libellé, action, désactivé, raccourci, coché] | "-" (séparateur) | { head: "Titre de section" }
    function menu(anchor, items) {
      const s = document.createElement("div"); s.className = "fw-scrim"; s.style.background = "transparent";
      const m = document.createElement("div"); m.className = "fw-menu"; m.setAttribute("role", "menu");
      items.forEach((it) => {
        if (it === "-") return m.append(Object.assign(document.createElement("hr")));
        if (it.head) return m.append(Object.assign(document.createElement("div"), { className: "h", textContent: it.head }));
        const [icon, label, fn, off, key, on] = it, b = document.createElement("button"); b.setAttribute("role", "menuitem");
        b.innerHTML = `<span class="ic">${icon.startsWith("<") ? icon : ic(icon)}</span><span class="l">${esc(label)}</span>${on ? `<span class="k">${ic("check")}</span>` : key ? `<kbd>${esc(key)}</kbd>` : ""}`;
        b.disabled = !!off; b.onclick = () => { close(); fn(); }; m.append(b);
      });
      const close = () => { s.remove(); m.remove(); removeEventListener("keydown", esc2, true); };
      const esc2 = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
      s.onclick = close; s.oncontextmenu = (e) => { e.preventDefault(); close(); }; addEventListener("keydown", esc2, true); W.append(s, m);
      const pt = anchor.getBoundingClientRect ? null : anchor, r = pt ? { left: pt.x, right: pt.x, top: pt.y, bottom: pt.y } : anchor.getBoundingClientRect();
      m.style.maxHeight = innerHeight - 16 + "px";
      m.style.left = Math.max(8, Math.min(innerWidth - m.offsetWidth - 8, pt ? pt.x : r.right - m.offsetWidth)) + "px";
      m.style.top = Math.max(8, Math.min(innerHeight - m.offsetHeight - 8, pt ? pt.y : (r.top > innerHeight / 2 ? r.top - m.offsetHeight - 6 : r.bottom + 6))) + "px";
      m.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
    }
    function sheet(html, bind) {
      const s = document.createElement("div"); s.className = "fw-scrim";
      const p = document.createElement("div"); p.className = "fw-sheet"; p.innerHTML = html;
      const close = () => { s.remove(); p.remove(); };
      s.onclick = close; W.append(s, p); bind(p, close); return close;
    }

    // ---- liste des manuscrits ----
    const ago = (x) => { const d = now() - x; return d < 90 ? t("justNow") : d < 3600 ? t("minAgo", { n: Math.round(d / 60) }) : d < 86400 ? t("hAgo", { n: Math.round(d / 3600) }) : new Date(x * 1000).toLocaleDateString(L === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); };
    const coverHtml = (d) => d.cover ? `<img src="${esc(d.cover)}" alt="">`
      : `<span>${esc(d.title || t("untitled"))}</span>${d.author ? `<small>${esc(d.author)}</small>` : ""}`;
    const coverBg = (d) => d.cover ? "" : `background:linear-gradient(160deg,hsl(${hue(d.id)},42%,32%),hsl(${(hue(d.id) + 40) % 360},48%,17%))`;
    const bookWords = (d) => ordered(d).reduce((n, c) => n + countWords(textOf(c.html)), 0);
    async function list() {
      flush();
      D = null; C = null; $(".fw-ed").hidden = true; $(".fw-list").hidden = false; W.classList.remove("focus", "side");
      const all = (await host.store.list()).filter((d) => !d.deleted).sort((a, b) => stamp(b) - stamp(a));
      grid.innerHTML = "";
      if (!all.length) { grid.style.display = "block"; grid.innerHTML = `<div class="fw-empty"><h3>${t("empty")}</h3><p>${t("emptyTxt")}</p><button class="fw-btn pri" data-a="new">${ic("plus")}${t("newBook")}</button></div>`; return; }
      grid.style.display = "";
      for (const d of all) {
        const b = document.createElement("button"); b.className = "fw-card"; b.dataset.id = d.id;
        b.innerHTML = `<div class="fw-cv" style="${coverBg(d)}">${coverHtml(d)}</div><div class="fw-ct2"></div><div class="fw-meta">${t("words", { n: nf(bookWords(d)) })} · ${ago(stamp(d))}</div>`;
        b.querySelector(".fw-ct2").textContent = d.title || t("untitled");
        grid.append(b);
      }
      const nb = document.createElement("button"); nb.className = "fw-card fw-new"; nb.dataset.a = "new";
      nb.innerHTML = `<div class="fw-cv">${ic("plus")}<span>${t("newBook")}</span></div>`; grid.append(nb);
    }
    async function create(d) {
      const n = now();
      d = d || (() => { const c = { id: newId(), title: "", html: "<p><br></p>", created: n, updated: n, deleted: 0 };
        return { id: newId(), title: "", author: "", lang: L, desc: "", cover: "", coverAt: 0, order: [c.id], created: n, updated: n, deleted: 0, chapters: [c] }; })();
      await host.store.put(d); host.changed(d.id); return open(d.id, true);
    }

    // ---- éditeur ----
    const chap = (id) => D.chapters.find((c) => c.id === id);
    async function open(id, fresh) {
      const d = await host.store.get(id); if (!d || d.deleted) return list();
      D = d; $(".fw-list").hidden = true; $(".fw-ed").hidden = false;
      counts = new Map(D.chapters.map((c) => [c.id, countWords(textOf(c.html))]));
      ed.spellcheck = P2.spell; ed.lang = D.lang || L; W.style.setProperty("--fs", P2.size + "px");
      try { navigator.storage?.persist?.(); } catch (e) {}
      host.store.snap(D); lastSnap = Date.now(); editsSinceSnap = false;
      paintTop(); status("local"); showChapter(ordered(D)[0]?.id, fresh);
    }
    function paintTop() { $(".fw-bt b").textContent = D.title || t("untitled"); }
    function showChapter(id, focusTitle) {
      flush();
      C = id; const c = chap(id); if (!c) return;
      cti.value = c.title || ""; cti.placeholder = t("chapter", { n: ordered(D).indexOf(c) + 1 });
      ed.innerHTML = clean(c.html); ed.dataset.ph = "";
      $(".fw-scroll").scrollTop = 0; W.classList.remove("side");
      paintSide(); paintCount(); closeFind(true);
      if (focusTitle && matchMedia("(hover:hover)").matches) cti.focus();
    }
    function paintSide() {
      chs.innerHTML = "";
      ordered(D).forEach((c, i) => {
        const li = document.createElement("li"); li.dataset.id = c.id; li.className = c.id === C ? "on" : "";
        li.innerHTML = `<span class="g">${ic("grip")}</span><span class="n"><b></b><small>${t((counts.get(c.id) || 0) > 1 ? "words" : "word", { n: nf(counts.get(c.id) || 0) })}</small></span>`;
        li.querySelector("b").textContent = c.title || t("chapter", { n: i + 1 });
        chs.append(li);
      });
      const tot = [...ordered(D)].reduce((n, c) => n + (counts.get(c.id) || 0), 0);
      $(".fw-tot").textContent = t("total", { n: nf(tot) });
    }
    function paintCount() {
      const tx = ed.innerText || "", w = countWords(tx);
      counts.set(C, w);
      $("[data-s=w]").textContent = t(w > 1 ? "words" : "word", { n: nf(w) });
      $("[data-s=c]").textContent = t("chars", { n: nf(tx.replace(/\n/g, "").length) });
      $("[data-s=r]").textContent = t("read", { n: Math.max(1, Math.round(w / 230)) });
      const li = chs.querySelector(`li[data-id="${C}"] small`); if (li) li.textContent = t(w > 1 ? "words" : "word", { n: nf(w) });
      $(".fw-tot").textContent = t("total", { n: nf(ordered(D).reduce((n, c) => n + (counts.get(c.id) || 0), 0)) });
    }
    // statut d'enregistrement : pastille verte = synchronisé, grise = sur cet appareil, orange = en cours
    function status(s) {
      const el = $(".fw-bt small"); el.className = s === "saving" ? "busy" : s === "synced" ? "" : "local";
      el.querySelector("span").textContent = t(s === "saving" ? "saving" : s === "synced" ? "synced" : s === "offline" ? "offline" : "savedLocal");
    }
    function touched() { dirty = true; editsSinceSnap = true; status("saving"); clearTimeout(saveT); saveT = setTimeout(flush, 450); }
    function flush() {
      clearTimeout(saveT);
      if (!dirty || !D) return Promise.resolve();
      dirty = false; const d = D;
      if (editsSinceSnap && Date.now() - lastSnap > 300e3) { host.store.snap(d); lastSnap = Date.now(); editsSinceSnap = false; }
      return host.store.put(d).then(() => {
        if (D === d && !dirty) status("local");
        const n = ++syncN;
        // true : synchronisé, false : compte injoignable, autre : pas de compte (enregistré sur l'appareil seulement)
        return host.changed(d.id).then((ok) => { if (D === d && !dirty && n === syncN) status(ok === true ? "synced" : ok === false ? "offline" : "local"); });
      }, (e) => { console.error(e); status("offline"); });
    }
    ed.addEventListener("input", () => {
      const c = chap(C); if (!c) return;
      c.html = ed.innerHTML; c.updated = now(); touched();
      clearTimeout(ed.ct); ed.ct = setTimeout(paintCount, 250);
    });
    cti.addEventListener("input", () => {
      const c = chap(C); c.title = cti.value; c.updated = now(); touched();
      const b = chs.querySelector(`li[data-id="${C}"] b`); if (b) b.textContent = cti.value || cti.placeholder;
    });
    cti.addEventListener("keydown", (e) => { if (e.key === "Enter" || (e.key === "ArrowDown" && !e.shiftKey)) { e.preventDefault(); ed.focus(); } });
    addEventListener("pagehide", () => flush());
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });

    // ---- typographie automatique ----
    ed.addEventListener("beforeinput", (e) => {
      if (!P2.typo || e.inputType !== "insertText" || !e.data || e.data.length !== 1) return;
      const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return;
      const r = s.getRangeAt(0), n = r.startContainer, before = n.nodeType === 3 ? n.data.slice(0, r.startOffset) : "";
      const fr = (D.lang || L).startsWith("fr"), ch = e.data, prev = before.slice(-1);
      let rep = null, del = 0;
      if (ch === "'") rep = "’";
      else if (ch === '"') rep = !prev || /[\s(\[  —]/.test(prev) ? (fr ? "« " : "“") : (fr ? (/\s/.test(prev) ? "»" : " »") : "”");
      else if (ch === "." && before.endsWith("..")) { rep = "…"; del = 2; }
      else if (ch === "-" && prev === "-") { rep = "—"; del = 1; }
      // français : espace fine insécable avant ; ! ? (et : seulement après une espace tapée, pour garder 10:30 ou https://)
      else if (fr && /[;:!?]/.test(ch) && prev === " ") { rep = " " + ch; del = 1; }
      else if (fr && /[;!?]/.test(ch) && /[\p{L}\p{N}»)]/u.test(prev)) rep = " " + ch;
      if (rep == null) return;
      e.preventDefault();
      for (let i = 0; i < del; i++) document.execCommand("delete");
      document.execCommand("insertText", false, rep);
    });

    // ---- coller / déposer : HTML nettoyé, texte brut en paragraphes ----
    const textToHtml = (s) => s.replace(/\r\n?/g, "\n").split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
    async function insertImage(f) {
      try { const u = await imageData(f, 1400, 1800); ed.focus(); document.execCommand("insertHTML", false, `<img src="${u}" alt="">`); }
      catch (e) { host.msg(t("badImage")); }
    }
    ed.addEventListener("paste", (e) => {
      const cd = e.clipboardData; if (!cd) return;
      const img = [...cd.files].find((f) => f.type.startsWith("image/"));
      e.preventDefault();
      if (img) return insertImage(img);
      const h = cd.getData("text/html"), tx = cd.getData("text/plain");
      if (h) document.execCommand("insertHTML", false, clean(h));
      else if (tx && /\n/.test(tx.trim())) document.execCommand("insertHTML", false, textToHtml(tx));
      else if (tx) document.execCommand("insertText", false, tx);
    });
    ed.addEventListener("drop", (e) => {
      const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
      const h = e.dataTransfer?.getData("text/html");
      if (!f && !h) return;
      e.preventDefault(); e.stopPropagation();
      const pos = document.caretRangeFromPoint?.(e.clientX, e.clientY); if (pos) { const s = getSelection(); s.removeAllRanges(); s.addRange(pos); }
      if (f) insertImage(f); else document.execCommand("insertHTML", false, clean(h));
    });
    ed.addEventListener("dragover", (e) => e.stopPropagation());

    // ---- barre de mise en forme ----
    const tools = $(".fw-tools");
    tools.addEventListener("mousedown", (e) => { if (e.target.closest("button")) e.preventDefault(); });   // garde la sélection dans le texte
    tools.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-c]"); if (!b) return;
      const c = b.dataset.c; ed.focus();
      if (c === "scene") document.execCommand("insertHorizontalRule");
      else if (c === "link") {
        const s = getSelection(), r = s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
        const u = await modal(t("linkUrl"), { input: "https://" }); if (!u) return;
        ed.focus(); if (r) { s.removeAllRanges(); s.addRange(r); }
        if (/^(https?:\/\/|mailto:)\S+$/i.test(u.trim())) { if (s.isCollapsed) document.execCommand("insertHTML", false, `<a href="${esc(u.trim())}">${esc(u.trim())}</a>`); else document.execCommand("createLink", false, u.trim()); }
      } else if (c === "clear") { document.execCommand("removeFormat"); document.execCommand("unlink"); document.execCommand("formatBlock", false, "<p>"); }
      else document.execCommand(c);
      paintTools();
    });
    tools.querySelector("select").onchange = (e) => { ed.focus(); document.execCommand("formatBlock", false, `<${e.target.value}>`); paintTools(); };
    tools.querySelector("input[data-c=image]").onchange = (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) insertImage(f); };
    function paintTools() {
      if (!D || $(".fw-ed").hidden) return;
      tools.querySelectorAll("button[data-c]").forEach((b) => { let on = false; try { on = document.queryCommandState(b.dataset.c); } catch (e) {} b.classList.toggle("on", on); });
      let v = ""; try { v = String(document.queryCommandValue("formatBlock") || "").toLowerCase(); } catch (e) {}
      tools.querySelector("select").value = ["h2", "h3", "blockquote"].includes(v) ? v : "p";
    }
    document.addEventListener("selectionchange", () => { if (document.activeElement === ed) paintTools(); });

    // ---- chapitres : ajout, ordre (glisser), menu ----
    function addChapter() {
      flush();
      const n = now(), c = { id: newId(), title: "", html: "<p><br></p>", created: n, updated: n, deleted: 0 }, ids = ordered(D).map((x) => x.id);
      ids.splice(ids.indexOf(C) + 1, 0, c.id); D.chapters.push(c); D.order = ids; D.updated = n; counts.set(c.id, 0);
      touched(); showChapter(c.id, true);
    }
    function move(id, by) {
      const ids = ordered(D).map((x) => x.id), i = ids.indexOf(id), j = i + by; if (j < 0 || j >= ids.length) return;
      ids.splice(j, 0, ids.splice(i, 1)[0]); D.order = ids; D.updated = now(); touched(); paintSide();
    }
    async function delChapter(id) {
      const c = chap(id), list0 = ordered(D), i = list0.indexOf(c);
      if (!(await modal(t("confirmDelCh", { t: c.title || t("chapter", { n: i + 1 }) }), { ok: t("delChapter"), danger: true }))) return;
      flush(); host.store.snap(D);
      Object.assign(c, { deleted: 1, html: "", updated: now() }); D.order = ordered(D).map((x) => x.id); D.updated = now(); touched();
      const rest = ordered(D); if (!rest.length) return addChapter();
      showChapter(rest[Math.max(0, i - 1)].id);
    }
    chs.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li && !e.target.closest(".g") && li.dataset.id !== C) showChapter(li.dataset.id); else if (li) W.classList.remove("side"); });
    chs.addEventListener("pointerdown", (e) => {
      const g = e.target.closest(".g"); if (!g) return;
      e.preventDefault(); const li = g.closest("li"); li.classList.add("drag"); g.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        const items = [...chs.children].filter((x) => x !== li);
        const after = items.find((x) => { const r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
        after ? chs.insertBefore(li, after) : chs.append(li);
      };
      const up = () => {
        g.removeEventListener("pointermove", mv); li.classList.remove("drag");
        const ids = [...chs.children].map((x) => x.dataset.id);
        if (ids.join() !== ordered(D).map((x) => x.id).join()) { D.order = ids; D.updated = now(); touched(); }
        paintSide();
      };
      g.addEventListener("pointermove", mv); g.addEventListener("pointerup", up, { once: true }); g.addEventListener("pointercancel", up, { once: true });
    });

    // ---- rechercher / remplacer ----
    const F = $(".fw-find"), fq = F.querySelector("[data-f=q]"), fr = F.querySelector("[data-f=r]"), fcase = F.querySelector("[data-f=case]");
    let hits = [], hit = -1;
    const reOf = () => fq.value ? new RegExp(fq.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), fcase.checked ? "g" : "gi") : null;
    function scan() {
      hits = []; const re = reOf();
      if (re) { const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) for (const m of n.data.matchAll(re)) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); hits.push(r); } }
      try { if (window.Highlight && CSS.highlights) hits.length ? CSS.highlights.set("fw-find", new Highlight(...hits)) : CSS.highlights.delete("fw-find"); } catch (e) {}
      F.querySelector(".c").textContent = fq.value ? (hits.length ? `${Math.max(1, hit + 1)}/${hits.length}` : t("noMatch")) : "";
    }
    function go(by) {
      scan(); if (!hits.length) return;
      hit = (hit + by + hits.length) % hits.length; const r = hits[hit], s = getSelection(); s.removeAllRanges(); s.addRange(r);
      (r.startContainer.parentElement || ed).scrollIntoView({ block: "center", behavior: "smooth" });
      F.querySelector(".c").textContent = `${hit + 1}/${hits.length}`;
    }
    function openFind() { F.hidden = false; const s = String(getSelection() || "").trim(); if (s && s.length < 80 && !/\n/.test(s)) fq.value = s; fq.focus(); fq.select(); hit = -1; scan(); }
    function closeFind(quiet) { F.hidden = true; hits = []; hit = -1; try { CSS.highlights?.delete("fw-find"); } catch (e) {} if (!quiet) ed.focus(); }
    fq.addEventListener("input", () => { hit = -1; scan(); });
    fcase.onchange = () => { hit = -1; scan(); };
    fq.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(e.shiftKey ? -1 : 1); } if (e.key === "Escape") closeFind(); });
    fr.addEventListener("keydown", (e) => { if (e.key === "Escape") closeFind(); });
    F.addEventListener("click", (e) => {
      const a = e.target.closest("[data-f]")?.dataset.f;
      if (a === "next") go(1); else if (a === "prev") go(-1); else if (a === "close") closeFind();
      else if (a === "one") {
        scan(); if (!hits.length) return;
        const r = hits[Math.max(0, hit)], s = getSelection(); s.removeAllRanges(); s.addRange(r); ed.focus();
        document.execCommand("insertText", false, fr.value); hit = Math.max(0, hit) - 1; go(1);
      } else if (a === "all") replaceAll();
    });
    // tout le livre : version gardée dans l'historique d'abord
    function replaceAll() {
      const re = reOf(); if (!re) return;
      flush(); host.store.snap(D); let n = 0;
      const sub = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), ns = []; let x; while ((x = w.nextNode())) ns.push(x); ns.forEach((tn) => { const v = tn.data.replace(re, () => (n++, fr.value)); if (v !== tn.data) tn.data = v; }); };
      const tm = now();
      for (const c of ordered(D)) {
        const before = n;
        if (c.id === C) { sub(ed); if (n > before) c.html = ed.innerHTML; }
        else { const doc = new DOMParser().parseFromString(`<body>${c.html}`, "text/html"); sub(doc.body); if (n > before) c.html = doc.body.innerHTML; }
        if (n > before) { c.updated = tm; counts.set(c.id, countWords(textOf(c.html))); }
      }
      if (n) touched(); paintSide(); paintCount(); scan();
      host.msg(n ? t("replacedN", { n }) : t("noMatch"));
    }

    // ---- le livre : informations, couverture, export, historique, préférences ----
    const LANGS = [["fr", "Français"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"]];
    function bookSheet() {
      flush();
      sheet(`<div class="fw-shh"><h3>${t("bookT")}</h3><button class="fw-ib" data-k="x">${ic("x")}</button></div>
  <label class="fw-f"><span>${t("title")}</span><input data-k="title" maxlength="300"></label>
  <label class="fw-f"><span>${t("author")}</span><input data-k="author" maxlength="200"></label>
  <label class="fw-f"><span>${t("lang")}</span><select data-k="lang">${LANGS.map(([v, n]) => `<option value="${v}">${n}</option>`).join("")}</select></label>
  <label class="fw-f"><span>${t("desc")}</span><textarea data-k="desc" maxlength="4000"></textarea></label>
  <h4>${t("cover")}</h4><div class="fw-cov"><div class="fw-cv"></div><div class="acts"><label class="fw-btn">${ic("image")}${t("pickCover")}<input type="file" accept="image/*" hidden data-k="cover"></label>
   <button class="fw-btn" data-k="nocover">${t("removeCover")}</button><p>${t("autoCover")}</p></div></div>
  <div class="fw-acts"><button class="fw-btn pri" data-k="epub">${ic("dl")}${t("exportEpub")}</button><button class="fw-btn" data-k="lib">${ic("lib")}${t("toLibrary")}</button></div>
  <h4>${t("prefs")}</h4>
  <div class="fw-row"><div>${t("typo")}<small>${t("typoTip")}</small></div><span class="fw-sw"><input type="checkbox" data-k="typo"><span></span></span></div>
  <div class="fw-row"><div>${t("spell")}</div><span class="fw-sw"><input type="checkbox" data-k="spell"><span></span></span></div>
  <div class="fw-row"><div>${t("size")}</div><div class="fw-seg" data-k="size"><button data-v="17">A</button><button data-v="19" style="font-size:17px">A</button><button data-v="22" style="font-size:20px">A</button></div></div>
  <h4>${t("history")}</h4><p class="fw-meta">${t("historyTip")}</p><div data-k="hist"></div>
  <div class="fw-acts"><button class="fw-btn danger" data-k="del">${ic("trash")}${t("delBook")}</button></div>`, (p, close) => {
        const q = (k) => p.querySelector(`[data-k=${k}]`);
        ["title", "author", "lang", "desc"].forEach((k) => { const el = q(k); el.value = D[k] || (k === "lang" ? L : ""); el.oninput = el.onchange = () => { D[k] = el.value; D.updated = now(); if (k === "lang") ed.lang = el.value; touched(); paintTop(); paintCov(); }; });
        const paintCov = () => { const c = p.querySelector(".fw-cv"); c.setAttribute("style", coverBg(D)); c.innerHTML = coverHtml(D); q("nocover").hidden = !D.cover; };
        paintCov();
        q("cover").onchange = async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return;
          try { D.cover = await imageData(f, 1000, 1500, .85); D.coverAt = D.updated = now(); touched(); paintCov(); } catch (x) { host.msg(t("badImage")); } };
        q("nocover").onclick = () => { D.cover = ""; D.coverAt = D.updated = now(); touched(); paintCov(); };
        q("epub").onclick = () => doExport(); q("lib").onclick = () => doLibrary();
        q("x").onclick = close;
        q("typo").checked = P2.typo; q("typo").onchange = (e) => { P2.typo = e.target.checked; savePref(); };
        q("spell").checked = P2.spell; q("spell").onchange = (e) => { P2.spell = ed.spellcheck = e.target.checked; savePref(); };
        const seg = q("size"), paintSeg = () => seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.v === P2.size));
        paintSeg(); seg.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; P2.size = +b.dataset.v; W.style.setProperty("--fs", P2.size + "px"); savePref(); paintSeg(); };
        q("del").onclick = async () => {
          if (!(await modal(t("confirmDelBook", { t: D.title || t("untitled") }), { ok: t("delBook"), danger: true }))) return;
          Object.assign(D, { deleted: 1, chapters: [], updated: now() }); dirty = true; await flush(); close(); host.msg(t("deleted")); list();
        };
        host.store.snaps(D.id).then((ss) => {
          const h = q("hist");
          if (!ss.length) { h.innerHTML = `<p class="fw-meta">${t("noHistory")}</p>`; return; }
          ss.forEach((s) => {
            const r = document.createElement("div"); r.className = "fw-hist";
            const when = new Date(s.at).toLocaleString(L === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
            r.innerHTML = `<div><b></b><br><small>${t("words", { n: nf(bookWords(s.d)) })} · ${ordered(s.d).length} ${t("chapters").toLowerCase()}</small></div><button class="fw-btn">${ic("hist")}${t("restore")}</button>`;
            r.querySelector("b").textContent = when;
            r.querySelector("button").onclick = async () => {
              if (!(await modal(t("confirmRestore", { d: when }), { ok: t("restore") }))) return;
              restore(s.d); close(); host.msg(t("restored"));
            };
            h.append(r);
          });
        });
      });
    }
    // la version restaurée devient la plus récente (pour gagner la synchro) ; les chapitres ajoutés depuis passent en suppression
    function restore(old) {
      flush(); host.store.snap(D);
      const n = now(), keep = new Set(old.chapters.map((c) => c.id));
      D = { ...old, id: D.id, updated: n, coverAt: n, deleted: 0,
        chapters: [...old.chapters.map((c) => ({ ...c, updated: n })), ...D.chapters.filter((c) => !keep.has(c.id)).map((c) => ({ ...c, deleted: 1, html: "", updated: n }))] };
      counts = new Map(D.chapters.map((c) => [c.id, countWords(textOf(c.html))]));
      dirty = true; flush(); paintTop(); showChapter(ordered(D)[0]?.id);
    }
    const fileName = () => (D.title || t("untitled")).normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "").trim().slice(0, 80) + ".epub";
    async function doExport() { await flush(); try { await host.exportFile(await toEpub(D), fileName()); } catch (e) { console.error(e); host.msg(t("exportFail", { e: e.message })); } }
    async function doLibrary() { await flush(); try { await host.toLibrary(await toEpub(D), D.id); host.msg(t("inLibrary")); } catch (e) { console.error(e); host.msg(t("exportFail", { e: e.message })); } }
    function chMenu(anchor, id = C) {
      const ids = ordered(D).map((x) => x.id), i = ids.indexOf(id);
      menu(anchor, [["pen", t("rename"), () => { if (id !== C) showChapter(id); cti.focus(); cti.select(); }],
        ["up", t("moveUp"), () => move(id, -1), i <= 0], ["down", t("moveDown"), () => move(id, 1), i >= ids.length - 1],
        ["copy", t("duplicate"), () => dupChapter(id)], ["plus", t("addChapter"), addChapter], "-",
        ["trash", t("delChapter"), () => delChapter(id)]]);
    }
    function dupChapter(id) {
      flush();
      const c = chap(id), n = now(), d = { ...c, id: newId(), title: (c.title || "") + (c.title ? " " : "") + t("copySuffix"), created: n, updated: n, deleted: 0 }, ids = ordered(D).map((x) => x.id);
      ids.splice(ids.indexOf(id) + 1, 0, d.id); D.chapters.push(d); D.order = ids; D.updated = n; counts.set(d.id, counts.get(id) || 0);
      touched(); showChapter(d.id);
    }
    // clic droit (appui long au doigt) sur un chapitre de la liste
    let lpT = 0, lpAt = 0;     // Android envoie aussi « contextmenu » sur un appui long : un seul menu
    chs.addEventListener("contextmenu", (e) => { const li = e.target.closest("li"); if (!li) return; e.preventDefault(); clearTimeout(lpT);
      if (Date.now() - lpAt < 1000) return; lpAt = Date.now(); chMenu({ x: e.clientX, y: e.clientY }, li.dataset.id); });
    chs.addEventListener("touchstart", (e) => {
      const li = e.target.closest("li"); if (!li || e.target.closest(".g")) return;
      const p = e.touches[0]; lpT = setTimeout(() => { if (Date.now() - lpAt < 1000) return; lpAt = Date.now(); navigator.vibrate?.(15); chMenu({ x: p.clientX, y: p.clientY }, li.dataset.id); }, 550);
    }, { passive: true });
    ["touchmove", "touchend", "touchcancel"].forEach((ev) => chs.addEventListener(ev, () => clearTimeout(lpT), { passive: true }));
    chs.addEventListener("click", (e) => { if (Date.now() - lpAt < 700) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

    // clic droit dans le texte (ordinateur) : la barre d'outils en clair, avec les raccourcis ; au doigt, le menu du système reste
    const G = (ch, style = "") => `<b class="gl" style="${style}">${ch}</b>`;
    ed.addEventListener("contextmenu", (e) => {
      if (!matchMedia("(pointer:fine)").matches) return;
      e.preventDefault();
      const sel = getSelection(), has = !sel.isCollapsed && ed.contains(sel.anchorNode), mod = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
      const q = (c) => { try { return document.queryCommandState(c); } catch (x) { return false; } };
      let blk = ""; try { blk = String(document.queryCommandValue("formatBlock") || "").toLowerCase(); } catch (x) {}
      const run = (c, v) => () => { ed.focus(); document.execCommand(c, false, v); paintTools(); };
      const tool = (c) => () => tools.querySelector(`[data-c=${c}]`).click();
      menu({ x: e.clientX, y: e.clientY }, [
        ["cut", t("cut"), run("cut"), !has, mod + "X"], ["copy", t("copy"), run("copy"), !has, mod + "C"],
        ["paste", t("paste"), async () => { ed.focus(); try { const tx = await navigator.clipboard.readText(); document.execCommand(/\n/.test(tx.trim()) ? "insertHTML" : "insertText", false, /\n/.test(tx.trim()) ? textToHtml(tx) : tx); } catch (x) { host.msg(t("pasteKeys", { k: mod + "V" })); } }, false, mod + "V"],
        { head: t("fmt") },
        [G("B", "font-weight:800"), t("boldL"), run("bold"), false, mod + "B", q("bold")],
        [G("I", "font-style:italic"), t("italicL"), run("italic"), false, mod + "I", q("italic")],
        [G("U", "text-decoration:underline"), t("underL"), run("underline"), false, mod + "U", q("underline")],
        [G("S", "text-decoration:line-through"), t("strike"), run("strikeThrough"), false, "", q("strikeThrough")],
        { head: t("blockT") },
        [G("¶"), t("para"), run("formatBlock", "<p>"), false, "", !["h2", "h3", "blockquote"].includes(blk)],
        [G("T", "font-size:17px"), t("h2"), run("formatBlock", "<h2>"), false, "", blk === "h2"],
        [G("T", "font-size:13px"), t("h3"), run("formatBlock", "<h3>"), false, "", blk === "h3"],
        ["quote", t("quote"), run("formatBlock", "<blockquote>"), false, "", blk === "blockquote"],
        ["ul", t("ul"), run("insertUnorderedList"), false, "", q("insertUnorderedList")], ["ol", t("ol"), run("insertOrderedList"), false, "", q("insertOrderedList")],
        { head: t("alignT") },
        ["left", t("left"), run("justifyLeft")], ["center", t("center"), run("justifyCenter")], ["justify", t("justify"), run("justifyFull")],
        { head: t("insertT") },
        [G("⁂"), t("scene"), run("insertHorizontalRule")], ["link", t("link"), tool("link")], ["image", t("image"), () => tools.querySelector("input[data-c=image]").click()],
        "-", ["clear", t("clear"), tool("clear"), !has]]);
    });

    // ---- actions, raccourcis ----
    W.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
      if (a === "close") { await flush(); host.close(); }
      else if (a === "new") create();
      else if (a === "list") list();
      else if (a === "side") W.classList.toggle("side");
      else if (a === "undo" || a === "redo") { ed.focus(); document.execCommand(a); }
      else if (a === "find") F.hidden ? openFind() : closeFind();
      else if (a === "focus") W.classList.toggle("focus");
      else if (a === "book") bookSheet();
      else if (a === "export") doExport();
      else if (a === "addch") addChapter();
      else if (a === "chmenu") chMenu(e.target.closest("[data-a]"));
    });
    grid.addEventListener("click", (e) => { const c = e.target.closest(".fw-card[data-id]"); if (c) open(c.dataset.id); });
    $(".fw-lh input[type=file]").onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try { const d = fromText(f.name, await f.text(), L); await create(d); host.msg(t("imported", { t: d.title, n: d.chapters.length })); }
      catch (x) { console.error(x); host.msg(t("badFile")); }
    };
    W.addEventListener("keydown", (e) => {
      if (!D) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && k === "s") { e.preventDefault(); dirty = true; flush().then(() => host.msg(t("saveNow"))); }
      else if (mod && k === "f" && e.shiftKey) { e.preventDefault(); W.classList.toggle("focus"); }
      else if (mod && k === "f") { e.preventDefault(); openFind(); }
      else if (e.key === "Escape" && W.classList.contains("focus")) W.classList.remove("focus");
      e.stopPropagation();   // les raccourcis du lecteur (flèches, Échap) ne s'appliquent pas ici
    });

    return {
      el: W,
      show() { W.hidden = false; return list(); },
      hide() { flush(); W.hidden = true; },
      list, open, flush,
      // après une synchro : on garde ce qui est en cours de frappe (le plus récent gagne, chapitre par chapitre)
      async remote(id) {
        if (W.hidden) return;
        if (!D) { if (!$(".fw-list").hidden) list(); return; }
        if (D.id !== id) return;
        const s = await host.store.get(id); if (!s) return;
        if (s.deleted) { D = null; return list(); }
        const before = chap(C)?.html, m = merge(s, D);
        D = m; counts = new Map(D.chapters.map((c) => [c.id, countWords(textOf(c.html))])); paintTop();
        const c = chap(C);
        if (!c || c.deleted) return showChapter(ordered(D)[0]?.id);
        if (c.html !== before && document.activeElement !== ed) ed.innerHTML = clean(c.html);
        if (document.activeElement !== cti) cti.value = c.title || "";
        paintSide(); status("synced");
      },
    };
  }
  return { mount, merge, stamp, ordered, clean, toEpub, fromText };
})();
