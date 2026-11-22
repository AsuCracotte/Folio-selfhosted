/* Folio — post-it posés sur les pages d'un livre. Partagé entre le site (PWA) et l'app Linux.
   Un post-it s'accroche au texte qui se trouve sous lui (at : un cfi) : il reste sur la même page, et sur un autre appareil
   (autre largeur, autre police) il retombe à côté du même passage. fx = position horizontale (0 à 1 de la page),
   dy = écart vertical avec la ligne d'accroche, w × h = taille ; sur téléphone tout est affiché plus petit.
   On le glisse (souris ou doigt), on l'agrandit par son coin, on le touche pour écrire ; il peut citer des passages surlignés.
   hôte = { root, get() → { rend }, list() → [post-it], save(), highlights() → [{cfi,text,color}], hidden() → bool, unhide(), lang }
   post-it = { cfi (identifiant), at, fx, dy, w, h, color, text, refs: [cfi de surlignage], created, updated, deleted } */
window.FolioPostit = (() => {
  const COLORS = { yellow: "#fde68a", pink: "#fbc7d4", green: "#bbf0c5", blue: "#c3dcfb", orange: "#fed2a8", purple: "#ddd0fb" };
  const TX = {
    fr: { ph: "Votre note…", del: "Retirer le post-it", close: "Fermer", title: "Post-it", open: "Ouvrir le post-it", quote: "Citer un passage surligné",
      noHl: "Surlignez d’abord un passage du livre : vous pourrez ensuite le citer ici.", unquote: "Retirer la citation", resize: "Redimensionner" },
    en: { ph: "Your note…", del: "Remove the sticky note", close: "Close", title: "Sticky note", open: "Open the sticky note", quote: "Quote a highlighted passage",
      noHl: "Highlight a passage of the book first: you can then quote it here.", unquote: "Remove the quote", resize: "Resize" },
  };
  const W0 = 180, H0 = 150, WMIN = 90, HMIN = 64, WMAX = 520, HMAX = 520;
  const CSS = `
.fp-layer{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}.fp-layer[hidden]{display:none}
.fp-note{position:absolute;pointer-events:auto;touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none;overflow:hidden;color:#2b2620;
 border-radius:2px 2px 12px 2px;box-shadow:0 6px 14px -6px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.15);transform:rotate(-1deg);padding:8px 10px 14px;
 font:var(--fs,13px)/1.35 system-ui,sans-serif;display:flex;flex-direction:column;gap:5px}
.fp-note.drag{cursor:grabbing;opacity:.92;box-shadow:0 16px 30px -10px rgba(0,0,0,.5);transition:none}
.fp-note .q,.fp-card .q{font-style:italic;border-left:3px solid var(--c,#f6d55c);padding-left:6px;opacity:.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.fp-note .t{white-space:pre-wrap;overflow-wrap:anywhere;flex:1;min-height:0;overflow:hidden}
.fp-note .rz{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none}
.fp-note .rz::after{content:"";position:absolute;right:4px;bottom:4px;width:9px;height:9px;border-right:2px solid rgba(0,0,0,.3);border-bottom:2px solid rgba(0,0,0,.3);border-radius:0 0 3px 0}
.fp-card{position:fixed;z-index:60;width:min(320px,calc(100vw - 32px));padding:12px 12px 10px;border-radius:3px 3px 14px 3px;color:#2b2620;
 box-shadow:0 14px 34px -10px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.15);transform:rotate(-1deg);font:15px/1.45 system-ui,sans-serif;animation:fpIn .18s ease}
@keyframes fpIn{from{opacity:0;transform:rotate(-1deg) scale(.94)}}
.fp-card textarea{display:block;width:100%;min-height:110px;max-height:40vh;border:0;background:transparent;resize:vertical;font:inherit;color:inherit;outline:none;padding:0}
.fp-card textarea::placeholder{color:rgba(43,38,32,.5)}
.fp-card .qs{display:flex;flex-direction:column;gap:6px;margin:0 0 8px}.fp-card .qs:empty{display:none}
.fp-card .qi{display:flex;gap:6px;align-items:flex-start;font-size:14px}.fp-card .qi .q{flex:1}
.fp-card .qi button,.fp-pick button.x{border:0;background:rgba(0,0,0,.07);color:inherit;border-radius:50%;width:24px;height:24px;flex:none;cursor:pointer;font-size:15px;line-height:1}
.fp-pick{max-height:200px;overflow:auto;margin:8px 0 0;padding:6px;border-radius:8px;background:rgba(255,255,255,.55);display:flex;flex-direction:column;gap:4px}
.fp-pick button.h{text-align:left;border:0;background:transparent;font:inherit;font-size:14px;color:inherit;padding:6px;border-radius:6px;cursor:pointer}.fp-pick button.h:hover{background:rgba(0,0,0,.06)}
.fp-pick p{margin:4px;font-size:13.5px;opacity:.75}
.fp-bar{display:flex;align-items:center;gap:6px;margin-top:8px}.fp-bar .sp{flex:1}
.fp-bar .c{width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(0,0,0,.18);padding:0;cursor:pointer}.fp-bar .c.on{box-shadow:0 0 0 2px #2b2620}
.fp-bar .b{width:32px;height:32px;border:0;border-radius:50%;background:rgba(0,0,0,.07);color:inherit;display:grid;place-items:center;cursor:pointer;font-size:17px}
.fp-bar .b:hover{background:rgba(0,0,0,.13)}.fp-bar svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:reduce){.fp-card{animation:none}}`;
  const ICON = { trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>' };
  const HLC = { yellow: "#f6d55c", green: "#7bd88f", blue: "#6cb6ff", pink: "#ff8fb1", orange: "#ffa94d", red: "#ff6b6b", purple: "#b197fc", teal: "#4fd1c5" };
  const spineOf = (cfi) => { try { return new ePub.CFI(cfi).spinePos; } catch (e) { return -1; } };
  const anchorOf = (n) => n.at || n.cfi;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function create(host) {
    const L = host.lang === "en" ? "en" : "fr", t = (k) => TX[L][k];
    if (!document.getElementById("fp-css")) document.head.append(Object.assign(document.createElement("style"), { id: "fp-css", textContent: CSS }));
    const layer = document.createElement("div"); layer.className = "fp-layer"; host.root.append(layer);
    let card = null, raf = 0, busy = false;
    const now = () => Date.now() / 1000;
    const live = () => (host.list() || []).filter((n) => !n.deleted);
    // la synchro peut remplacer la liste pendant qu'on écrit : on modifie toujours le post-it de la liste actuelle
    const fresh = (n) => (host.list() || []).find((x) => x.cfi === n.cfi) || n;
    const scale = () => (innerWidth < 600 ? 0.7 : 1);                     // plus petit sur téléphone
    const view = () => host.get().rend?.manager?.container?.getBoundingClientRect();
    const hlText = (cfi) => (host.highlights?.() || []).find((h) => h.cfi === cfi && !h.deleted);
    const quoteEl = (cfi) => { const h = hlText(cfi); if (!h) return null;
      const q = document.createElement("div"); q.className = "q"; q.style.setProperty("--c", HLC[h.color] || h.color); q.textContent = h.text; return q; };

    // ---- position à l'écran (et page où il se trouve) ----
    function where(n) {
      const r = host.get().rend, V = view(); if (!V) return null;
      const a = anchorOf(n), s = scale(), w = (n.w || W0) * s, h = (n.h || H0) * s;
      for (const c of r.getContents()) {
        if (spineOf(a) !== c.sectionIndex) continue;
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        let rg = null; try { rg = c.range(a); } catch (e) {} if (!rg) continue;
        const q = rg.getClientRects()[0] || rg.getBoundingClientRect(); if (!q) continue;
        const ax = f.left + q.left, ay = f.top + q.top;
        if (ax < V.left - 2 || ax >= V.right) return null;                     // en pages : le passage n'est pas sur cette page
        const x = n.fx >= 0 ? V.left + n.fx * V.width : V.right - w - 10;      // post-it d'avant : dans la marge de droite
        const y = ay + (n.dy || 0) * s;
        if (y + h < V.top || y > V.bottom) return null;
        return { x: clamp(x, V.left + 2, V.right - w - 2), y, w, h };
      }
      return null;
    }
    function draw() {
      raf = 0; if (busy) return;
      layer.hidden = !!host.hidden?.(); layer.innerHTML = ""; if (layer.hidden) return;
      const R = layer.getBoundingClientRect();
      for (const n of live()) {
        const p = where(n); if (!p) continue;
        const d = document.createElement("div"); d.className = "fp-note"; d.dataset.k = n.cfi; d.tabIndex = 0; d.setAttribute("role", "button");
        d.setAttribute("aria-label", t("open") + (n.text ? " : " + n.text.slice(0, 60) : ""));
        d.style.cssText = `left:${p.x - R.left}px;top:${p.y - R.top}px;width:${p.w}px;height:${p.h}px;background:${COLORS[n.color] || COLORS.yellow};--fs:${Math.round(13 * scale())}px`;
        (n.refs || []).forEach((cfi) => { const q = quoteEl(cfi); if (q) d.append(q); });
        const tx = document.createElement("div"); tx.className = "t"; tx.textContent = n.text || ""; d.append(tx);
        const rz = document.createElement("div"); rz.className = "rz"; rz.title = t("resize"); d.append(rz);
        d.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(n, d.getBoundingClientRect()); } };
        gesture(d, n);
        layer.append(d);
      }
    }
    const redraw = () => { raf ||= requestAnimationFrame(draw); };

    // ---- poser : le texte sous le coin haut-gauche du post-it devient son accroche ----
    function caretAt(x, y) {
      const r = host.get().rend;
      for (const c of r.getContents()) {
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        const doc = c.document, V = view();
        // dans la marge ou entre deux paragraphes : on cherche le texte le plus proche, sur la même hauteur puis un peu plus bas/haut
        for (const dy of [0, 14, -14, 30, -30, 60, -60, 120]) for (const xx of [x, V.left + V.width * .25, V.left + V.width * .5, V.left + V.width * .75]) {
          const px = xx - f.left, py = y + dy - f.top; if (px < 0 || py < 0 || px > f.width || py > f.height) continue;
          const rg = doc.caretRangeFromPoint?.(px, py) || (() => { const p = doc.caretPositionFromPoint?.(px, py); if (!p) return null; const g = doc.createRange(); g.setStart(p.offsetNode, p.offset); return g; })();
          if (!rg || rg.startContainer.nodeType !== 3 || !/\S/.test(rg.startContainer.data)) continue;
          const g = rg.cloneRange(), node = rg.startContainer; g.setEnd(node, Math.min(node.data.length, rg.startOffset + 1));
          const q = g.getClientRects()[0] || g.getBoundingClientRect();
          if (!q || f.left + q.left < V.left - 2 || f.left + q.left >= V.right) continue;      // texte d'une autre page
          let cfi = null; try { cfi = c.cfiFromRange(rg); } catch (e) {}
          if (cfi) return { cfi, top: f.top + q.top };
        }
      }
      return null;
    }
    function place(n, x, y) {
      const V = view(); if (!V) return;
      const s = scale(), a = caretAt(x + 8, y + 6);
      n = fresh(n);
      if (a) { n.at = a.cfi; n.dy = Math.round((y - a.top) / s); }
      else { const p = where(n); if (p) n.dy = Math.round((n.dy || 0) + (y - p.y) / s); }   // page sans texte : on garde l'accroche
      n.fx = Math.round(clamp((x - V.left) / V.width, 0, .98) * 1000) / 1000; n.updated = now(); host.save();
    }

    // ---- glisser (souris ou doigt), agrandir par le coin, toucher pour ouvrir ----
    function gesture(d, n) {
      d.onpointerdown = (e) => {
        if (e.button) return; e.preventDefault(); e.stopPropagation();
        const rz = e.target.classList.contains("rz"), r0 = d.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, s = scale();
        let moved = false; busy = true; d.setPointerCapture(e.pointerId);
        d.onpointermove = (ev) => {
          const dx = ev.clientX - x0, dy = ev.clientY - y0; if (!moved && Math.hypot(dx, dy) < 5) return; moved = true; d.classList.add("drag");
          if (rz) { d.style.width = clamp(r0.width + dx, WMIN * s, WMAX * s) + "px"; d.style.height = clamp(r0.height + dy, HMIN * s, HMAX * s) + "px"; }
          else d.style.translate = `${dx}px ${dy}px`;
        };
        d.onpointerup = d.onpointercancel = (ev) => {
          d.onpointermove = d.onpointerup = d.onpointercancel = null; busy = false;
          if (!moved) { if (ev.type === "pointerup") open(n, r0); return; }
          if (rz) { const m = fresh(n); m.w = Math.round(d.offsetWidth / s); m.h = Math.round(d.offsetHeight / s); m.updated = now(); host.save(); }
          else place(n, r0.left + ev.clientX - x0, r0.top + ev.clientY - y0);
          redraw();
        };
      };
    }

    let hooked = null;
    function hook() {
      const r = host.get().rend; if (!r || r === hooked) return; hooked = r;
      r.on("relocated", () => { redraw(); setTimeout(redraw, 350); }); r.on("rendered", () => setTimeout(redraw, 60));
      r.on("click", () => close());                    // un appui dans le texte (une autre page HTML) referme la carte
      r.manager?.container?.addEventListener("scroll", redraw, { passive: true });
    }
    addEventListener("resize", redraw);

    // ---- la carte ouverte : écrire, citer, couleur, retirer ----
    function close() {
      if (!card) return; const { ta } = card, n = fresh(card.n); card.el.remove(); card = null;
      const txt = ta.value.trim();
      if (!txt && !n.text && !(n.refs || []).length) { n.deleted = 1; n.updated = now(); host.save(); }   // resté vide : pas gardé
      else if (txt !== (n.text || "")) { n.text = txt; n.updated = now(); host.save(); }
      redraw();
    }
    function open(n, at) {
      close();
      const el = document.createElement("div"); el.className = "fp-card"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t("title"));
      el.style.background = COLORS[n.color] || COLORS.yellow;
      el.innerHTML = `<div class="qs"></div><textarea maxlength="5000"></textarea><div class="fp-bar">${Object.keys(COLORS).map((k) => `<button class="c" type="button" data-c="${k}" aria-label="${k}" style="background:${COLORS[k]}"></button>`).join("")}<span class="sp"></span>
<button class="b" type="button" data-a="quote" title="${t("quote")}"><svg viewBox="0 0 24 24">${ICON.quote}</svg></button><button class="b" type="button" data-a="del" title="${t("del")}"><svg viewBox="0 0 24 24">${ICON.trash}</svg></button><button class="b" type="button" data-a="x" title="${t("close")}"><svg viewBox="0 0 24 24">${ICON.x}</svg></button></div>`;
      const ta = el.querySelector("textarea"), qs = el.querySelector(".qs"); ta.placeholder = t("ph"); ta.value = n.text || "";
      const paint = () => el.querySelectorAll(".c").forEach((b) => b.classList.toggle("on", b.dataset.c === (n.color || "yellow")));
      const quotes = () => { qs.innerHTML = ""; (fresh(n).refs || []).forEach((cfi) => { const q = quoteEl(cfi); if (!q) return;
        const row = document.createElement("div"); row.className = "qi"; const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.title = t("unquote");
        x.onclick = () => { const m = fresh(n); m.refs = (m.refs || []).filter((c) => c !== cfi); m.updated = now(); host.save(); quotes(); redraw(); };
        row.append(q, x); qs.append(row); }); };
      function pick() {
        const old = el.querySelector(".fp-pick"); if (old) return old.remove();
        const box = document.createElement("div"); box.className = "fp-pick";
        const hs = (host.highlights?.() || []).filter((h) => !h.deleted && !(fresh(n).refs || []).includes(h.cfi));
        if (!hs.length) box.innerHTML = `<p>${t("noHl")}</p>`;
        hs.forEach((h) => { const b = document.createElement("button"); b.type = "button"; b.className = "h"; const q = quoteEl(h.cfi); if (q) b.append(q);
          b.onclick = () => { const m = fresh(n); m.refs = [...(m.refs || []), h.cfi].slice(0, 20); m.updated = now(); host.save(); box.remove(); quotes(); redraw(); };
          box.append(b); });
        el.querySelector(".fp-bar").before(box);
      }
      el.querySelector(".fp-bar").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        n = fresh(n);
        if (b.dataset.c) { n.color = b.dataset.c; n.updated = now(); el.style.background = COLORS[n.color]; paint(); host.save(); redraw(); }
        else if (b.dataset.a === "quote") pick();
        else if (b.dataset.a === "del") { card.el.remove(); card = null; n.deleted = 1; n.updated = now(); host.save(); redraw(); }
        else close();
      };
      ta.onkeydown = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
      paint(); quotes(); document.body.append(el); card = { el, n, ta };
      // près du post-it, sans sortir de l'écran ; sur un petit écran, en haut (le clavier prend le bas)
      const w = el.offsetWidth, h = el.offsetHeight, small = innerWidth < 600;
      el.style.left = clamp(small || !at ? (innerWidth - w) / 2 : at.right + 12 + w < innerWidth ? at.right + 12 : at.left - w - 12, 16, innerWidth - w - 16) + "px";
      el.style.top = clamp(small ? 70 : at ? at.top : innerHeight * .25, 16, innerHeight - h - 16) + "px";
      ta.focus();
    }
    // un appui ailleurs referme la carte (et enregistre)
    addEventListener("pointerdown", (e) => { if (card && !card.el.contains(e.target) && !e.target.closest?.(".fp-note")) close(); }, true);

    return {
      get isOpen() { return !!card; },
      // nouveau post-it posé au point (x, y) de l'écran (par défaut : au milieu de la page affichée), ouvert pour écrire
      add(x, y) {
        const V = view(); if (!V) return; hook(); host.unhide?.();
        const s = scale();
        if (x == null) { x = V.left + V.width / 2 - W0 * s / 2; y = V.top + V.height * .3; }
        x = clamp(x, V.left + 2, V.right - W0 * s - 2); y = clamp(y, V.top + 2, V.bottom - H0 * s - 2);
        const n = { cfi: "pt:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), color: "yellow", text: "", refs: [],
          fx: -1, dy: 0, w: W0, h: H0, created: now(), updated: now(), deleted: 0 };
        host.list().push(n); place(n, x, y);
        if (!fresh(n).at) { n.deleted = 1; host.save(); return; }       // aucun texte sur cette page
        draw(); const d = layer.querySelector(`[data-k="${n.cfi}"]`); open(n, d ? d.getBoundingClientRect() : null);
      },
      open(key) { const n = live().find((x) => x.cfi === key); if (n) open(n, layer.querySelector(`[data-k="${key}"]`)?.getBoundingClientRect() || null); },
      draw() { hook(); redraw(); },
      close,
      clear() { close(); layer.innerHTML = ""; hooked = null; },
    };
  }
  return { create, COLORS, anchorOf };
})();
