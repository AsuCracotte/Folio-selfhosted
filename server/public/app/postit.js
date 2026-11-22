/* Folio — post-it posés sur les pages d'un livre. Partagé entre le site (PWA) et l'app Linux.
   Un post-it s'accroche au texte le plus proche (at : un cfi) : il reste sur la même page, et sur un autre appareil
   (autre largeur, autre police) il retombe à côté du même passage. fx = position horizontale par rapport à la zone de lecture
   (0 = bord gauche, 1 = bord droit ; en dehors = dans la marge), dy = écart vertical avec la ligne d'accroche, w × h = taille ;
   sur téléphone tout est affiché plus petit. Tout se fait sur le post-it lui-même : on écrit dedans, on le glisse par sa bande
   du haut, on l'agrandit par son coin, ses outils (couleur, citation d'un passage surligné, retrait) apparaissent quand on écrit.
   hôte = { root, get() → { rend }, list() → [post-it], save(), highlights() → [{cfi,text,color}], hidden() → bool, unhide(), lang }
   post-it = { cfi (identifiant), at, fx, dy, w, h, color, text, refs: [cfi de surlignage], created, updated, deleted } */
window.FolioPostit = (() => {
  const COLORS = { yellow: "#fde68a", pink: "#fbc7d4", green: "#bbf0c5", blue: "#c3dcfb", orange: "#fed2a8", purple: "#ddd0fb" };
  const NAMES = { fr: { yellow: "Jaune", pink: "Rose", green: "Vert", blue: "Bleu", orange: "Orange", purple: "Violet" },
    en: { yellow: "Yellow", pink: "Pink", green: "Green", blue: "Blue", orange: "Orange", purple: "Purple" } };
  const TX = {
    fr: { ph: "Votre note…", del: "Retirer le post-it", move: "Déplacer le post-it", quote: "Citer un passage surligné",
      noHl: "Surlignez d’abord un passage du livre : vous pourrez ensuite le citer ici.", unquote: "Retirer la citation", resize: "Redimensionner", note: "Post-it" },
    en: { ph: "Your note…", del: "Remove the sticky note", move: "Move the sticky note", quote: "Quote a highlighted passage",
      noHl: "Highlight a passage of the book first: you can then quote it here.", unquote: "Remove the quote", resize: "Resize", note: "Sticky note" },
  };
  const W0 = 180, H0 = 150, WMIN = 110, HMIN = 80, WMAX = 520, HMAX = 520, FXMIN = -0.5, FXMAX = 1.5;
  const CSS = `
.fp-layer{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}.fp-layer[hidden]{display:none}
.fp-move{position:absolute;inset:0;will-change:transform}
.fp-note{position:absolute;pointer-events:auto;color:#2b2620;border-radius:2px 2px 12px 2px;transform:rotate(-1deg);
 box-shadow:0 6px 14px -6px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.15);font:var(--fs,13px)/1.35 system-ui,sans-serif;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s}
.fp-note:focus-within{transform:none;z-index:2;box-shadow:0 14px 30px -10px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.15)}
.fp-note.drag{opacity:.92;transition:none;box-shadow:0 18px 34px -10px rgba(0,0,0,.5)}
/* bande du haut, comme un ruban adhésif : on attrape le post-it par là */
.fp-grip{flex:none;height:14px;cursor:grab;touch-action:none;display:grid;place-items:center}.fp-note.drag .fp-grip{cursor:grabbing}
.fp-grip::before{content:"";width:34px;height:4px;border-radius:4px;background:rgba(0,0,0,.18)}
.fp-qs{flex:none;display:flex;flex-direction:column;gap:4px;padding:0 10px;max-height:45%;overflow:hidden}.fp-qs:empty{display:none}
.fp-q{display:flex;gap:4px;align-items:flex-start}
.fp-q span{flex:1;font-style:italic;border-left:3px solid var(--c,#f6d55c);padding-left:6px;opacity:.85;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.fp-q button{display:none;flex:none;width:20px;height:20px;border:0;border-radius:50%;background:rgba(0,0,0,.08);color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0}
.fp-note:focus-within .fp-q button{display:block}
.fp-ta{flex:1;min-height:0;width:100%;border:0;background:transparent;resize:none;outline:none;font:inherit;color:inherit;padding:4px 10px 16px;overflow:auto}
.fp-ta::placeholder{color:rgba(43,38,32,.5)}
/* outils, sur le post-it, visibles quand on écrit dedans */
.fp-tools{display:none;flex:none;align-items:center;gap:4px;padding:4px 22px 6px 8px;border-top:1px solid rgba(0,0,0,.08);flex-wrap:wrap}
.fp-note:focus-within .fp-tools{display:flex}.fp-note:focus-within .fp-ta{padding-bottom:4px}
.fp-tools .c{width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(0,0,0,.2);padding:0;cursor:pointer;flex:none}.fp-tools .c.on{box-shadow:0 0 0 2px #2b2620}
.fp-tools .sp{flex:1}
.fp-tools .b{width:26px;height:26px;border:0;border-radius:50%;background:rgba(0,0,0,.07);color:inherit;display:grid;place-items:center;cursor:pointer;padding:0;flex:none}
.fp-tools .b:hover{background:rgba(0,0,0,.14)}.fp-tools svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.fp-rz{position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;touch-action:none}
.fp-rz::after{content:"";position:absolute;right:4px;bottom:4px;width:9px;height:9px;border-right:2px solid rgba(0,0,0,.3);border-bottom:2px solid rgba(0,0,0,.3);border-radius:0 0 3px 0}
/* choix d'un passage surligné : sous le post-it */
.fp-pick{position:absolute;left:0;right:0;top:100%;margin-top:6px;max-height:220px;overflow:auto;padding:6px;border-radius:8px;background:#fffdf6;
 box-shadow:0 12px 28px -8px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:2px;z-index:3;font-size:13px}
.fp-pick button{text-align:left;border:0;background:transparent;font:inherit;color:inherit;padding:6px;border-radius:6px;cursor:pointer}.fp-pick button:hover{background:rgba(0,0,0,.06)}
.fp-pick button span{font-style:italic;border-left:3px solid var(--c);padding-left:6px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.fp-pick p{margin:4px;opacity:.75}
.fp-note.picking{overflow:visible}
@media (prefers-reduced-motion:reduce){.fp-note{transition:none}}`;
  const ICON = { trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>', quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6"/>' };
  const HLC = { yellow: "#f6d55c", green: "#7bd88f", blue: "#6cb6ff", pink: "#ff8fb1", orange: "#ffa94d", red: "#ff6b6b", purple: "#b197fc", teal: "#4fd1c5" };
  const spineOf = (cfi) => { try { return new ePub.CFI(cfi).spinePos; } catch (e) { return -1; } };
  const anchorOf = (n) => n.at || n.cfi;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const legacy = (n) => !(n.fx >= FXMIN && n.fx <= FXMAX);                   // post-it d'avant : pas de position, dans la marge de droite

  function create(host) {
    const L = host.lang === "en" ? "en" : "fr", t = (k) => TX[L][k];
    if (!document.getElementById("fp-css")) document.head.append(Object.assign(document.createElement("style"), { id: "fp-css", textContent: CSS }));
    // la couche (fixe, qui coupe ce qui sort de l'écran) et, dedans, le plan des post-it qu'on décale d'un bloc pendant le défilement
    const layer = document.createElement("div"); layer.className = "fp-layer"; host.root.append(layer);
    const plane = document.createElement("div"); plane.className = "fp-move"; layer.append(plane);
    let base = null;                             // défilement du livre au dernier placement (le plan suit l'écart)
    const els = new Map();                       // identifiant → élément affiché (gardé d'un dessin à l'autre : on peut écrire pendant que la page bouge)
    let raf = 0, busy = false, saveT = 0, leftAt = 0;
    const now = () => Date.now() / 1000;
    const live = () => (host.list() || []).filter((n) => !n.deleted);
    // la synchro peut remplacer la liste pendant qu'on écrit : on modifie toujours le post-it de la liste actuelle
    const fresh = (n) => (host.list() || []).find((x) => x.cfi === n.cfi) || n;
    const scale = () => (innerWidth < 600 ? 0.7 : 1);                     // plus petit sur téléphone
    const view = () => host.get().rend?.manager?.container?.getBoundingClientRect();
    const hl = (cfi) => (host.highlights?.() || []).find((h) => h.cfi === cfi && !h.deleted);
    const quote = (h) => { const s = document.createElement("span"); s.style.setProperty("--c", HLC[h.color] || h.color); s.textContent = h.text; return s; };
    const editing = () => layer.contains(document.activeElement);

    // ---- position à l'écran : null si le passage n'est pas sur la page affichée ----
    function where(n) {
      const r = host.get().rend, V = view(); if (!V) return null;
      const R = layer.getBoundingClientRect(), a = anchorOf(n), s = scale(), w = (n.w || W0) * s, h = (n.h || H0) * s;
      for (const c of r.getContents()) {
        if (spineOf(a) !== c.sectionIndex) continue;
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        let rg = null; try { rg = c.range(a); } catch (e) {} if (!rg) continue;
        const q = rg.getClientRects()[0] || rg.getBoundingClientRect(); if (!q) continue;
        const ax = f.left + q.left, ay = f.top + q.top;
        if (ax < V.left - 2 || ax >= V.right) return null;                     // en pages : le passage est sur une autre page
        const x = legacy(n) ? V.right - w - 10 : V.left + n.fx * V.width, y = ay + (n.dy || 0) * s;
        if (y + h < R.top - R.height || y > R.bottom + R.height) return null;   // gardé un écran avant et après : il arrive avec le texte
        return { x: clamp(x, R.left + 2, R.right - w - 2), y, w, h };           // marges comprises ; sur un écran étroit, ramené à l'écran
      }
      return null;
    }

    // ---- un post-it : bande pour le glisser, citations, zone d'écriture, outils, coin pour l'agrandir ----
    function build(n) {
      const d = document.createElement("div"); d.className = "fp-note"; d.dataset.k = n.cfi; d.setAttribute("role", "group"); d.setAttribute("aria-label", t("note"));
      d.innerHTML = `<div class="fp-grip" title="${t("move")}" aria-label="${t("move")}"></div><div class="fp-qs"></div><textarea class="fp-ta" maxlength="5000" aria-label="${t("note")}"></textarea>
<div class="fp-tools">${Object.keys(COLORS).map((k) => `<button class="c" type="button" data-c="${k}" title="${NAMES[L][k]}" aria-label="${NAMES[L][k]}" style="background:${COLORS[k]}"></button>`).join("")}<span class="sp"></span>
<button class="b" type="button" data-a="quote" title="${t("quote")}" aria-label="${t("quote")}"><svg viewBox="0 0 24 24">${ICON.quote}</svg></button><button class="b" type="button" data-a="del" title="${t("del")}" aria-label="${t("del")}"><svg viewBox="0 0 24 24">${ICON.trash}</svg></button></div>
<div class="fp-rz" title="${t("resize")}"></div>`;
      const ta = d.querySelector(".fp-ta"); ta.placeholder = t("ph");
      ta.oninput = () => { clearTimeout(saveT); saveT = setTimeout(() => commit(d), 600); };
      ta.onkeydown = (e) => { if (e.key === "Escape") { e.preventDefault(); ta.blur(); } };
      // on quitte le post-it : texte enregistré ; resté vide (sans texte ni citation), il disparaît
      d.addEventListener("focusout", () => { leftAt = Date.now(); setTimeout(() => { if (!d.contains(document.activeElement)) { d.querySelector(".fp-pick")?.remove(); d.classList.remove("picking"); commit(d, true); } }, 0); });
      d.querySelector(".fp-tools").onmousedown = (e) => e.preventDefault();      // garder le curseur dans le texte
      d.querySelector(".fp-tools").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return; const m = fresh(n);
        if (b.dataset.c) { m.color = b.dataset.c; m.updated = now(); host.save(); paint(d, m); }
        else if (b.dataset.a === "quote") pick(d, m);
        else if (b.dataset.a === "del") { clearTimeout(saveT); m.deleted = 1; m.updated = now(); els.delete(m.cfi); d.remove(); host.save(); }
      };
      gesture(d, n);
      return d;
    }
    // contenu affiché à partir des données (sans toucher à ce qu'on est en train d'écrire)
    function paint(d, n) {
      d.style.background = COLORS[n.color] || COLORS.yellow; d.style.setProperty("--fs", Math.round(13 * scale()) + "px");
      d.querySelectorAll(".fp-tools .c").forEach((b) => b.classList.toggle("on", b.dataset.c === (n.color || "yellow")));
      const ta = d.querySelector(".fp-ta"); if (document.activeElement !== ta && ta.value !== (n.text || "")) ta.value = n.text || "";
      const qs = d.querySelector(".fp-qs"); qs.innerHTML = "";
      (n.refs || []).forEach((cfi) => { const h = hl(cfi); if (!h) return;
        const row = document.createElement("div"); row.className = "fp-q"; const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.title = t("unquote");
        x.onmousedown = (e) => e.preventDefault();
        x.onclick = () => { const m = fresh(n); m.refs = (m.refs || []).filter((c) => c !== cfi); m.updated = now(); host.save(); paint(d, m); };
        row.append(quote(h), x); qs.append(row); });
    }
    function commit(d, leaving) {
      clearTimeout(saveT); const n = live().find((x) => x.cfi === d.dataset.k); if (!n) return;
      const txt = d.querySelector(".fp-ta").value.trim();
      if (leaving && !txt && !(n.refs || []).length) { n.deleted = 1; n.updated = now(); els.delete(n.cfi); d.remove(); host.save(); return; }
      if (txt !== (n.text || "")) { n.text = txt; n.updated = now(); host.save(); }
    }
    function pick(d, n) {
      const old = d.querySelector(".fp-pick"); if (old) { old.remove(); d.classList.remove("picking"); return; }
      const box = document.createElement("div"); box.className = "fp-pick"; box.onmousedown = (e) => e.preventDefault();
      const hs = (host.highlights?.() || []).filter((h) => !h.deleted && !(n.refs || []).includes(h.cfi));
      if (!hs.length) box.innerHTML = `<p>${t("noHl")}</p>`;
      hs.forEach((h) => { const b = document.createElement("button"); b.type = "button"; b.append(quote(h));
        b.onclick = () => { const m = fresh(n); m.refs = [...(m.refs || []), h.cfi].slice(0, 20); m.updated = now(); host.save(); box.remove(); d.classList.remove("picking"); paint(d, m); d.querySelector(".fp-ta").focus(); };
        box.append(b); });
      d.classList.add("picking"); d.append(box);
    }

    function draw() {
      raf = 0; if (busy) return; follow();
      layer.hidden = !!host.hidden?.(); if (layer.hidden) return;
      const C = host.get().rend?.manager?.container; base = C ? { x: C.scrollLeft, y: C.scrollTop } : null; plane.style.transform = "";
      const R = layer.getBoundingClientRect(), seen = new Set();
      for (const n of live()) {
        const p = where(n); let d = els.get(n.cfi);
        if (!p) { if (d && !d.contains(document.activeElement)) d.remove(); continue; }
        if (!d) { d = build(n); els.set(n.cfi, d); }
        if (!d.isConnected) plane.append(d);
        Object.assign(d.style, { left: p.x - R.left + "px", top: p.y - R.top + "px", width: p.w + "px", height: p.h + "px" });
        paint(d, n); seen.add(n.cfi);
      }
      for (const [k, d] of els) if (!seen.has(k) && !d.contains(document.activeElement)) { d.remove(); if (!live().some((n) => n.cfi === k)) els.delete(k); }
    }
    const redraw = () => { raf ||= requestAnimationFrame(draw); };

    // ---- poser : la ligne de texte la plus proche du coin haut-gauche devient l'accroche (même dans la marge) ----
    function caretAt(x, y) {
      const r = host.get().rend, V = view();
      for (const c of r.getContents()) {
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        const doc = c.document;
        for (const dy of [0, 14, -14, 30, -30, 60, -60, 120, -120]) for (const xx of [clamp(x, V.left + 30, V.right - 30), V.left + V.width * .25, V.left + V.width * .5, V.left + V.width * .75]) {
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
      n.fx = Math.round(clamp((x - V.left) / V.width, FXMIN, FXMAX) * 1000) / 1000; n.updated = now(); host.save();
    }

    // ---- glisser par la bande du haut (souris ou doigt), agrandir par le coin ----
    function gesture(d, n) {
      d.addEventListener("pointerdown", (e) => {
        const grip = e.target.closest(".fp-grip"), rz = e.target.closest(".fp-rz");
        if (e.button || (!grip && !rz)) return; e.preventDefault(); e.stopPropagation();
        const r0 = d.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, s = scale(), R = layer.getBoundingClientRect();
        let moved = false; busy = true; d.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const dx = ev.clientX - x0, dy = ev.clientY - y0; if (!moved && Math.hypot(dx, dy) < 4) return; moved = true; d.classList.add("drag");
          if (rz) { d.style.width = clamp(r0.width + dx, WMIN * s, WMAX * s) + "px"; d.style.height = clamp(r0.height + dy, HMIN * s, HMAX * s) + "px"; }
          else d.style.translate = `${clamp(dx, R.left - r0.left, R.right - r0.right)}px ${clamp(dy, R.top - r0.top, R.bottom - r0.top - 30)}px`;
        };
        const up = (ev) => {
          d.removeEventListener("pointermove", move); d.removeEventListener("pointerup", up); d.removeEventListener("pointercancel", up);
          busy = false; d.classList.remove("drag");
          if (!moved) { if (grip) d.querySelector(".fp-ta").focus(); return; }
          if (rz) { const m = fresh(n); m.w = Math.round(d.offsetWidth / s); m.h = Math.round(d.offsetHeight / s); m.updated = now(); host.save(); }
          else { const b = d.getBoundingClientRect(); d.style.translate = ""; place(n, b.left, b.top); }
          redraw();
        };
        d.addEventListener("pointermove", move); d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up);
      });
    }

    let hooked = null;
    function hook() {
      const r = host.get().rend; if (!r || r === hooked) return; hooked = r;
      r.on("relocated", () => { redraw(); setTimeout(redraw, 350); }); r.on("rendered", () => setTimeout(redraw, 60));
      r.on("click", () => { if (editing()) document.activeElement.blur(); });   // un appui dans le texte du livre : on quitte le post-it
    }
    // défilement : le plan suit tout de suite, d'un bloc (rien à recalculer) ; placement exact quand le défilement s'arrête.
    // La zone qui défile n'existe qu'une fois le livre affiché : on s'y branche dès qu'elle apparaît (et à chaque nouvelle)
    let scroller = null, still = 0;
    function follow() {
      const C = host.get().rend?.manager?.container; if (!C || C === scroller) return; scroller = C;
      C.addEventListener("scroll", () => {
        if (C !== scroller) return;
        if (base && !busy) plane.style.transform = `translate(${base.x - C.scrollLeft}px,${base.y - C.scrollTop}px)`;
        clearTimeout(still); still = setTimeout(redraw, 120);
      }, { passive: true });
    }
    addEventListener("resize", redraw);
    new ResizeObserver(redraw).observe(host.root);   // barres masquées ou affichées : la zone de lecture change de taille

    function focus(key) { draw(); const d = els.get(key); if (d?.isConnected) d.querySelector(".fp-ta").focus(); }

    return {
      // un post-it est en cours d'écriture : l'appui sur la page sert à le quitter, pas à tourner la page
      // (un appui dans le livre fait d'abord perdre le focus au post-it, puis arrive ici : on regarde aussi l'instant d'avant)
      get isOpen() { return editing() || Date.now() - leftAt < 500; },
      // nouveau post-it posé au point (x, y) de l'écran (par défaut : au milieu de la page affichée), prêt à écrire
      add(x, y) {
        const V = view(); if (!V) return; hook(); host.unhide?.();
        const s = scale(), R = layer.getBoundingClientRect();
        if (x == null) { x = V.left + V.width / 2 - W0 * s / 2; y = V.top + V.height * .3; }
        x = clamp(x, R.left + 2, R.right - W0 * s - 2); y = clamp(y, V.top + 2, V.bottom - H0 * s - 2);
        const n = { cfi: "pt:" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), color: "yellow", text: "", refs: [],
          fx: 0, dy: 0, w: W0, h: H0, created: now(), updated: now(), deleted: 0 };
        host.list().push(n); place(n, x, y);
        if (!fresh(n).at) { n.deleted = 1; host.save(); return; }       // aucun texte sur cette page
        focus(n.cfi);
      },
      open(key) { focus(key); },
      draw() { hook(); redraw(); },
      close() { if (editing()) document.activeElement.blur(); },
      clear() { if (editing()) document.activeElement.blur(); plane.innerHTML = ""; els.clear(); hooked = null; base = null; },
    };
  }
  return { create, COLORS, anchorOf };
})();
