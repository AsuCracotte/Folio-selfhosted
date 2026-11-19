/* Folio — panneau « Sommaire & notes » partagé entre le site (PWA) et l'app Linux.
   Utilise les variables CSS de l'hôte : --bg --fg --ac --acfg --muted --line --soft --surface. */
window.FolioNotes = (() => {
  const COLORS = { yellow: "#f6d55c", green: "#7bd88f", blue: "#6cb6ff", pink: "#ff8fb1" };
  // textes en français / anglais ; la langue suit <html lang> (réglée par l'hôte) ou celle du navigateur
  const TX = {
    fr: { yellow: "Jaune", green: "Vert", blue: "Bleu", pink: "Rose", toc: "Sommaire", notes: "Notes",
      mapTip: "Cliquez pour aller à cet endroit du livre", bm: "Marque-page", here: "Vous êtes ici", start: "Début", end: "Fin",
      at: "Vous êtes à {p}", empty: "Pas encore de notes", emptyTxt: "Sélectionnez un passage pour le surligner, ou marquez la page avec le ruban.",
      all: "Tout", bms: "Marque-pages", hls: "Surlignages", exportTip: "Copier tous les surlignages (Markdown)", export: "Exporter",
      exported: "Surlignages copiés dans le presse-papiers", bookStart: "Début du livre", copyQuote: "Copier la citation",
      copied: "Citation copiée", delHl: "Supprimer le surlignage", pageAt: "Page à {p}", delBm: "Retirer le marque-page",
      noToc: "Ce livre n’a pas de sommaire.", q: ["« ", " »"] },
    en: { yellow: "Yellow", green: "Green", blue: "Blue", pink: "Pink", toc: "Contents", notes: "Notes",
      mapTip: "Click to jump to this point in the book", bm: "Bookmark", here: "You are here", start: "Start", end: "End",
      at: "You are at {p}", empty: "No notes yet", emptyTxt: "Select a passage to highlight it, or mark the page with the ribbon.",
      all: "All", bms: "Bookmarks", hls: "Highlights", exportTip: "Copy all highlights (Markdown)", export: "Export",
      exported: "Highlights copied to the clipboard", bookStart: "Start of the book", copyQuote: "Copy quote",
      copied: "Quote copied", delHl: "Delete highlight", pageAt: "Page at {p}", delBm: "Remove bookmark",
      noToc: "This book has no table of contents.", q: ["“", "”"] },
  };
  const lang = () => (/^fr/i.test(document.documentElement.lang || navigator.language || "") ? "fr" : "en");
  const T = (k, v = {}) => { const s = TX[lang()][k]; return typeof s === "string" ? s.replace(/\{(\w+)\}/g, (_, x) => v[x]) : s; };
  const NAMES = new Proxy({}, { get: (_, k) => T(k) });
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IC = {
    bm: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  };
  const ico = (n, cls = "") => `<svg class="fn-i ${cls}" viewBox="0 0 24 24">${IC[n]}</svg>`;

  // ---------- styles (injectés une seule fois) ----------
  const CSS = `
.fn-i{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.fn-tabs{display:flex;background:var(--soft);border-radius:999px;padding:3px;gap:2px;margin:0 0 14px;
 /* onglets toujours accessibles, même en bas d'un long sommaire ; l'ombre pleine masque la liste qui passe dessous */
 position:sticky;top:0;z-index:3;box-shadow:0 0 0 10px var(--bg)}
.fn-tabs button{flex:1;border:0;background:transparent;border-radius:999px;padding:8px 10px;font:600 14px/1.2 inherit;color:var(--muted);cursor:pointer;white-space:nowrap}
.fn-tabs button.on{background:var(--bg);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,.15)}
.fn-tabs b{font-weight:700;opacity:.6;margin-left:4px;font-size:12px}
/* carte du livre */
.fn-map{position:relative;height:46px;margin:2px 4px 6px;cursor:pointer;touch-action:none}
.fn-map .rail{position:absolute;left:0;right:0;top:21px;height:4px;border-radius:9px;background:var(--line)}
.fn-map .done{position:absolute;left:0;top:21px;height:4px;border-radius:9px;background:color-mix(in srgb,var(--ac) 55%,var(--line))}
.fn-map .ch{position:absolute;top:17px;width:1.5px;height:12px;background:color-mix(in srgb,var(--fg) 22%,transparent);border-radius:2px}
.fn-map .hl{position:absolute;top:18px;width:10px;height:10px;margin-left:-5px;border-radius:50%;box-shadow:0 0 0 2px var(--bg);transition:transform .15s}
.fn-map .bm{position:absolute;top:0;width:12px;height:16px;margin-left:-6px;background:var(--ac);clip-path:polygon(0 0,100% 0,100% 100%,50% 72%,0 100%);transition:transform .15s}
.fn-map .hl:hover,.fn-map .bm:hover{transform:scale(1.35)}
.fn-map .now{position:absolute;top:13px;width:3px;height:20px;margin-left:-1.5px;border-radius:3px;background:var(--fg)}
.fn-map .lbl{position:absolute;top:33px;font-size:11px;color:var(--muted);white-space:nowrap}
.fn-legend{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin:-2px 4px 12px}
/* filtres */
.fn-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 6px}
.fn-chip{border:1px solid var(--line);background:transparent;color:var(--fg);border-radius:999px;padding:6px 12px;font:600 13px/1.1 inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.fn-chip.on{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.fn-chip.c{padding:0;width:26px;height:26px;justify-content:center}
.fn-chip.c i{width:14px;height:14px;border-radius:50%}
.fn-chip.c.on{background:transparent;border-color:var(--fg);box-shadow:0 0 0 2px color-mix(in srgb,var(--fg) 25%,transparent)}
.fn-sp{flex:1}
.fn-act{border:0;background:transparent;color:var(--muted);border-radius:999px;padding:6px 8px;display:inline-flex;align-items:center;gap:6px;font:600 13px inherit;cursor:pointer}
.fn-act:hover{background:var(--soft);color:var(--fg)}
/* groupes par chapitre */
.fn-ch{display:flex;align-items:center;gap:10px;margin:18px 4px 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.fn-ch span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fn-ch em{font-style:normal;font-weight:600;opacity:.7}
.fn-ch.cur span{color:var(--ac)}
/* surlignage = citation */
.fn-q{position:relative;padding:12px 14px 10px 18px;margin:0 0 10px;border-radius:14px;background:var(--surface);border:1px solid var(--line);cursor:pointer;transition:border-color .15s,transform .1s}
.fn-q:hover{border-color:color-mix(in srgb,var(--fg) 22%,transparent)}
.fn-q:active{transform:scale(.995)}
.fn-q::before{content:"";position:absolute;left:6px;top:10px;bottom:10px;width:4px;border-radius:9px;background:var(--c)}
.fn-q p{margin:0;font:16px/1.5 Georgia,"Iowan Old Style","Palatino Linotype",serif;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.fn-q p mark{background:color-mix(in srgb,var(--c) 38%,transparent);color:inherit;border-radius:3px;padding:0 1px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.fn-q.open p{-webkit-line-clamp:unset}
.fn-meta{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;color:var(--muted)}
.fn-meta .fn-sp{flex:1}
.fn-dots{display:none;gap:5px;align-items:center}
.fn-q:hover .fn-dots,.fn-q.open .fn-dots{display:flex}
@media (hover:none){.fn-dots{display:flex}}
.fn-dots button{width:16px;height:16px;border-radius:50%;border:2px solid transparent;padding:0;cursor:pointer}
.fn-dots button.on{border-color:var(--fg)}
.fn-ib{width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer;flex:none}
.fn-ib:hover{background:var(--soft);color:var(--fg)}
.fn-ib .fn-i{width:16px;height:16px}
/* marque-page */
.fn-b{display:flex;gap:12px;align-items:flex-start;padding:12px 10px 12px 12px;margin:0 0 10px;border-radius:14px;cursor:pointer;border:1px dashed color-mix(in srgb,var(--ac) 45%,var(--line));background:color-mix(in srgb,var(--ac) 6%,var(--bg))}
.fn-b:hover{background:color-mix(in srgb,var(--ac) 11%,var(--bg))}
.fn-b>.fn-i{color:var(--ac);fill:var(--ac);margin-top:2px}
.fn-b .tx{flex:1;min-width:0}
.fn-b .tx b{display:block;font-size:14px}
.fn-b .tx i{display:block;margin-top:3px;color:var(--muted);font:italic 14px/1.45 Georgia,serif;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* sommaire */
.fn-toc{display:flex;align-items:center;gap:10px;padding:10px 10px;border-radius:12px;cursor:pointer;line-height:1.3}
.fn-toc:hover{background:var(--soft)}
.fn-toc.cur{color:var(--ac);font-weight:650;background:color-mix(in srgb,var(--ac) 10%,transparent)}
.fn-toc span{flex:1;min-width:0}
.fn-toc small{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.fn-toc.l0{font-weight:600}
.fn-toc span:first-child{font-family:var(--serif,Georgia,serif);font-size:15.5px}.fn-toc.l0 span:first-child{font-weight:500}
.fn-toc .n{display:inline-flex;gap:3px;align-items:center;flex:none}
.fn-toc .n i{width:7px;height:7px;border-radius:50%}
.fn-empty{text-align:center;color:var(--muted);padding:34px 16px 20px;line-height:1.5}
.fn-empty .fn-i{width:44px;height:44px;stroke-width:1.3;color:var(--ac);opacity:.75;display:block;margin:0 auto 10px}
/* repères dans la barre de progression du lecteur */
.fn-track{position:relative;flex:1;height:14px;cursor:pointer;display:flex;align-items:center}
.fn-track .rail{position:absolute;left:0;right:0;height:3px;border-radius:9px;background:var(--line);overflow:hidden}
.fn-track .rail i{display:block;height:100%;width:0;background:var(--ac);transition:width .3s}
.fn-track .m{position:absolute;width:6px;height:6px;margin-left:-3px;border-radius:50%;pointer-events:none}
.fn-track .m.b{width:7px;height:9px;margin-left:-3.5px;top:-3px;border-radius:0;background:var(--ac);clip-path:polygon(0 0,100% 0,100% 100%,50% 70%,0 100%)}
.fn-track .tip{position:absolute;bottom:18px;transform:translateX(-50%);background:var(--fg);color:var(--bg);font-size:11px;font-weight:700;padding:3px 7px;border-radius:7px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .12s}
.fn-track:hover .tip{opacity:1}
/* ruban « page marquée » */
.fn-ribbon{position:absolute;top:0;right:28px;width:22px;height:34px;background:var(--ac);clip-path:polygon(0 0,100% 0,100% 100%,50% 76%,0 100%);z-index:6;pointer-events:none;transform:translateY(-110%);transition:transform .25s cubic-bezier(.2,.8,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.fn-ribbon.on{transform:none}
`;
  function injectCss() {
    if (document.getElementById("fn-css")) return;
    const s = document.createElement("style"); s.id = "fn-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------- position d'une note dans le livre ----------
  const cmp = (a, b) => { try { return new ePub.CFI().compare(a, b); } catch (e) { return 0; } };
  const spineOf = (cfi) => { try { return new ePub.CFI(cfi).spinePos; } catch (e) { return -1; } };
  function pctOf(book, cfi) {
    if (!book) return null;
    try { if (book.locations.total > 0) return book.locations.percentageFromCfi(cfi); } catch (e) {}
    const n = book.spine.length || 1, i = spineOf(cfi);
    return i < 0 ? null : (i + 0.5) / n;
  }
  function chapterOf(toc, idx) {
    let best = null;
    for (const t of toc) if (t.idx >= 0 && t.idx <= idx && (!best || t.idx >= best.idx)) best = t;
    return best;
  }
  const pctTxt = (p) => (p == null ? "" : Math.round(p * 100) + (lang() === "fr" ? " %" : "%"));
  const dateTxt = (t) => {
    if (!t) return "";
    const d = new Date(t * 1000), now = new Date();
    return d.toLocaleDateString(lang() === "fr" ? "fr-FR" : "en-GB", d.getFullYear() === now.getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  };
  // extrait du texte qui suit un marque-page (mis en cache)
  const excerpts = new Map();
  function excerpt(book, cfi) {
    if (!excerpts.has(cfi)) excerpts.set(cfi, (async () => {
      try {
        const r = await book.getRange(cfi), doc = r.startContainer.ownerDocument || r.startContainer;
        // parcourt les nœuds texte à partir du marque-page ; espace entre deux blocs (titre puis paragraphe…)
        const B = /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|SECTION|ARTICLE|TD|TH|DT|DD|FIGCAPTION|PRE|HEADER|FOOTER|TR)$/i;
        const blockOf = (n) => { let e = n.parentNode; while (e && e.nodeType === 1 && !B.test(e.localName || e.nodeName)) e = e.parentNode; return e; };
        const w = doc.createTreeWalker(doc.body || doc.documentElement, 4);
        let n = r.startContainer;
        if (n.nodeType !== 3) { n = n.childNodes[r.startOffset] || n; w.currentNode = n; if (n.nodeType !== 3) n = w.nextNode(); }
        else w.currentNode = n;
        let out = "", last = null, first = true;
        while (n && out.length < 200) {
          let t = n.nodeValue; if (first && n === r.startContainer) t = t.slice(r.startOffset); first = false;
          const b = blockOf(n); if (last && b !== last) out += " "; last = b; out += t; n = w.nextNode();
        }
        return out.replace(/\s+/g, " ").trim().slice(0, 180);
      } catch (e) { return ""; }
    })());
    return excerpts.get(cfi);
  }

  // ---------- état de l'interface ----------
  let filter = "all";
  try { filter = localStorage.getItem("fnFilter") || "all"; } catch (e) {}
  const open = new Set();
  const setFilter = (f) => { filter = f; try { localStorage.setItem("fnFilter", f); } catch (e) {} };

  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

  /* o = { book, toc:[{label,href,level,idx}], bookmarks:[{cfi,label,created}], highlights:[{cfi,text,color,created}],
           cur:{cfi,pct}, tab, go(target), delBm(cfi), delHl(cfi), recolor(cfi,color), copy(text), toast(msg), onTab(tab) } */
  function render(root, o) {
    injectCss();
    const book = o.book, toc = o.toc || [];
    const bms = (o.bookmarks || []).slice().sort((a, b) => cmp(a.cfi, b.cfi));
    const hls = (o.highlights || []).slice().sort((a, b) => cmp(a.cfi, b.cfi));
    const curIdx = o.cur && o.cur.cfi ? spineOf(o.cur.cfi) : -1, curCh = chapterOf(toc, curIdx);
    root.innerHTML = "";
    const tabs = el(`<div class="fn-tabs"><button data-t="toc">${T("toc")}</button><button data-t="notes">${T("notes")}<b>${bms.length + hls.length || ""}</b></button></div>`);
    tabs.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", b.dataset.t === o.tab);
      b.onclick = () => o.onTab && o.onTab(b.dataset.t);
    });
    root.append(tabs);
    if (o.tab === "toc") return renderToc(root, o, toc, curCh, bms, hls);

    // carte du livre
    const map = el(`<div class="fn-map" title="${T("mapTip")}"><div class="rail"></div></div>`);
    const curPct = o.cur && o.cur.pct != null ? o.cur.pct : null;
    if (curPct != null) map.append(el(`<div class="done" style="width:${curPct * 100}%"></div>`));
    const n = book ? book.spine.length || 1 : 1;
    toc.filter((t) => t.level === 0 && t.idx > 0).forEach((t) => map.append(el(`<div class="ch" style="left:${(t.idx / n) * 100}%"></div>`)));
    hls.forEach((h) => { const p = pctOf(book, h.cfi); if (p == null) return;
      const d = el(`<div class="hl" style="left:${p * 100}%;background:${COLORS[h.color] || h.color}"></div>`); d.title = h.text.slice(0, 80);
      d.onclick = (e) => { e.stopPropagation(); o.go(h.cfi); }; map.append(d); });
    bms.forEach((b) => { const p = pctOf(book, b.cfi); if (p == null) return;
      const d = el(`<div class="bm" style="left:${p * 100}%"></div>`); d.title = b.label || T("bm");
      d.onclick = (e) => { e.stopPropagation(); o.go(b.cfi); }; map.append(d); });
    if (curPct != null) map.append(el(`<div class="now" style="left:${curPct * 100}%" title="${T("here")}"></div>`));
    map.onclick = (e) => {
      const r = map.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (book && book.locations.total > 0) o.go(book.locations.cfiFromPercentage(p));
      else if (book) { const s = book.spine.get(Math.min(n - 1, Math.floor(p * n))); s && o.go(s.href); }
    };
    root.append(map);
    root.append(el(`<div class="fn-legend"><span>${T("start")}</span><span>${curPct != null ? T("at", { p: pctTxt(curPct) }) : ""}</span><span>${T("end")}</span></div>`));

    if (!bms.length && !hls.length) {
      root.append(el(`<div class="fn-empty">${ico("quote")}<b>${T("empty")}</b><br>${T("emptyTxt")}</div>`));
      return;
    }
    // filtres
    const counts = { all: bms.length + hls.length, bm: bms.length, hl: hls.length };
    const bar = el(`<div class="fn-filters"></div>`);
    [["all", T("all")], ["bm", T("bms")], ["hl", T("hls")]].forEach(([k, l]) => {
      if (k !== "all" && !counts[k]) return;
      const b = el(`<button class="fn-chip">${l} <span style="opacity:.6">${counts[k]}</span></button>`);
      b.classList.toggle("on", filter === k); b.onclick = () => { setFilter(k); render(root, o); }; bar.append(b);
    });
    Object.keys(COLORS).forEach((c) => {
      if (!hls.some((h) => h.color === c)) return;
      const b = el(`<button class="fn-chip c" title="${NAMES[c]}"><i style="background:${COLORS[c]}"></i></button>`);
      b.classList.toggle("on", filter === c); b.onclick = () => { setFilter(filter === c ? "all" : c); render(root, o); }; bar.append(b);
    });
    bar.append(el(`<span class="fn-sp"></span>`));
    if (hls.length && o.copy) {
      const ex = el(`<button class="fn-act" title="${T("exportTip")}">${ico("share")}${T("export")}</button>`);
      ex.onclick = () => o.copy(markdown(o, hls), T("exported")); bar.append(ex);
    }
    root.append(bar);

    let items = [];
    if (filter === "all" || filter === "bm") items = items.concat(bms.map((b) => ({ k: "bm", ...b })));
    if (filter !== "bm") items = items.concat(hls.filter((h) => filter === "all" || filter === "hl" || h.color === filter).map((h) => ({ k: "hl", ...h })));
    if (!items.length) { const f = filter; setFilter("all"); if (f !== "all") return render(root, o); }
    items.sort((a, b) => cmp(a.cfi, b.cfi));

    let lastCh;
    items.forEach((it) => {
      const ch = chapterOf(toc, spineOf(it.cfi)), key = ch ? ch.href : "";
      if (key !== lastCh) {
        lastCh = key;
        const nIn = items.filter((x) => (chapterOf(toc, spineOf(x.cfi)) || {}).href === (ch || {}).href).length;
        const h = el(`<div class="fn-ch"><span></span><em>${nIn}</em></div>`);
        h.querySelector("span").textContent = ch ? ch.label : T("bookStart");
        h.classList.toggle("cur", !!(ch && curCh && ch.href === curCh.href)); root.append(h);
      }
      const p = pctOf(book, it.cfi);
      if (it.k === "hl") {
        const c = COLORS[it.color] || it.color;
        const q = el(`<div class="fn-q" style="--c:${c}"><p><mark></mark></p><div class="fn-meta"><span>${pctTxt(p)}${it.created ? " · " + dateTxt(it.created) : ""}</span><span class="fn-sp"></span><span class="fn-dots"></span></div></div>`);
        q.querySelector("mark").textContent = it.text;
        q.classList.toggle("open", open.has(it.cfi));
        const dots = q.querySelector(".fn-dots");
        Object.entries(COLORS).forEach(([k, v]) => {
          const d = el(`<button title="${NAMES[k]}" style="background:${v}"></button>`); d.classList.toggle("on", k === it.color);
          d.onclick = (e) => { e.stopPropagation(); if (k !== it.color) o.recolor(it.cfi, k); }; dots.append(d);
        });
        const meta = q.querySelector(".fn-meta");
        if (o.copy) { const cp = el(`<button class="fn-ib" title="${T("copyQuote")}">${ico("copy")}</button>`);
          cp.onclick = (e) => { e.stopPropagation(); o.copy(`${T("q")[0]}${it.text}${T("q")[1]}${o.title ? " — " + o.title : ""}`, T("copied")); }; meta.append(cp); }
        const rm = el(`<button class="fn-ib" title="${T("delHl")}">${ico("trash")}</button>`);
        rm.onclick = (e) => { e.stopPropagation(); o.delHl(it.cfi); }; meta.append(rm);
        q.onclick = () => o.go(it.cfi);
        q.ondblclick = (e) => { e.preventDefault(); open.has(it.cfi) ? open.delete(it.cfi) : open.add(it.cfi); q.classList.toggle("open"); };
        root.append(q);
      } else {
        const b = el(`<div class="fn-b">${ico("bm")}<div class="tx"><b></b><i></i></div></div>`);
        b.querySelector("b").textContent = T("pageAt", { p: pctTxt(p) || "?" }) + (it.created ? " · " + dateTxt(it.created) : "");
        const i = b.querySelector("i"); i.textContent = "…";
        if (book) excerpt(book, it.cfi).then((t) => { i.textContent = t ? t + "…" : (it.label || ""); });
        const rm = el(`<button class="fn-ib" title="${T("delBm")}">${ico("trash")}</button>`);
        rm.onclick = (e) => { e.stopPropagation(); o.delBm(it.cfi); }; b.append(rm);
        b.onclick = () => o.go(it.cfi);
        root.append(b);
      }
    });
  }

  function renderToc(root, o, toc, curCh, bms, hls) {
    if (!toc.length) { root.append(el(`<div class="fn-empty">${T("noToc")}</div>`)); return; }
    // nombre de notes par chapitre (pastilles)
    const per = new Map();
    const add = (cfi, color) => { const ch = chapterOf(toc, spineOf(cfi)); if (!ch) return;
      const a = per.get(ch.href) || []; a.push(color); per.set(ch.href, a); };
    bms.forEach((b) => add(b.cfi, "var(--ac)")); hls.forEach((h) => add(h.cfi, COLORS[h.color] || h.color));
    const n = o.book ? o.book.spine.length || 1 : 1;
    toc.forEach((t) => {
      const d = el(`<div class="fn-toc l${Math.min(t.level, 2)}" style="padding-left:${10 + t.level * 18}px"><span></span><span class="n"></span><small></small></div>`);
      d.querySelector("span").textContent = t.label || "…";
      const dots = per.get(t.href) || [];
      dots.slice(0, 5).forEach((c) => d.querySelector(".n").append(el(`<i style="background:${c}"></i>`)));
      if (t.idx >= 0 && t.level === 0) {
        const p = o.book && o.book.locations.total > 0 && o.book.spine.get(t.idx)
          ? safePct(o.book, t.idx) : t.idx / n;
        d.querySelector("small").textContent = p == null ? "" : pctTxt(p);
      }
      d.classList.toggle("cur", !!(curCh && t.href === curCh.href));
      d.onclick = () => o.go(t.href);
      root.append(d);
    });
    setTimeout(() => { const c = root.querySelector(".fn-toc.cur"); c && c.scrollIntoView({ block: "center" }); }, 30);
  }
  function safePct(book, idx) {
    try { const s = book.spine.get(idx); return book.locations.percentageFromCfi(`epubcfi(${s.cfiBase}!/4/1:0)`); } catch (e) { return null; }
  }

  function markdown(o, hls) {
    const toc = o.toc || []; let out = `# ${o.title || T("hls")}\n`, last;
    hls.forEach((h) => { const ch = chapterOf(toc, spineOf(h.cfi));
      if (ch && ch.href !== last) { last = ch.href; out += `\n## ${ch.label}\n`; }
      out += `\n> ${h.text.replace(/\n+/g, "\n> ")}\n`; });
    return out;
  }

  // repères dans la barre de progression ; renvoie une fonction de mise à jour de la progression
  function track(host, o) {
    injectCss();
    host.classList.add("fn-track"); host.innerHTML = `<div class="rail"><i></i></div><div class="tip"></div>`;
    const book = o.book;
    (o.highlights || []).forEach((h) => { const p = pctOf(book, h.cfi); if (p != null) host.append(el(`<div class="m" style="left:${p * 100}%;background:${COLORS[h.color] || h.color}"></div>`)); });
    (o.bookmarks || []).forEach((b) => { const p = pctOf(book, b.cfi); if (p != null) host.append(el(`<div class="m b" style="left:${p * 100}%"></div>`)); });
    const tip = host.querySelector(".tip");
    host.onmousemove = (e) => { const r = host.getBoundingClientRect(), p = (e.clientX - r.left) / r.width;
      tip.style.left = p * 100 + "%"; tip.textContent = pctTxt(p); };
    host.onclick = (e) => {
      if (!book || !(book.locations.total > 0)) return;
      const r = host.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      o.go(book.locations.cfiFromPercentage(p));
    };
    const bar = host.querySelector(".rail i");
    return (pct) => { bar.style.width = pct == null ? "0" : pct * 100 + "%"; };
  }

  return { render, track, COLORS, pctOf, injectCss };
})();
