/* Folio — post-it posés dans le livre : un petit carré dans la marge, en face de l'endroit choisi ; touché, il s'ouvre pour lire
   ou écrire la note. Partagé entre le site (PWA) et l'app Linux ; les variables CSS de l'hôte (--bg --fg --ac --line) sont utilisées.
   hôte = { root (élément posé sur le lecteur), get() → { rend }, list() → [post-it], save() (enregistre et synchronise), lang }
   post-it = { cfi, color, text, created, updated, deleted } */
window.FolioPostit = (() => {
  const COLORS = { yellow: "#fde68a", pink: "#fbc7d4", green: "#bbf0c5", blue: "#c3dcfb", orange: "#fed2a8", purple: "#ddd0fb" };
  const TX = {
    fr: { ph: "Votre note…", del: "Retirer le post-it", close: "Fermer", title: "Post-it", open: "Ouvrir le post-it" },
    en: { ph: "Your note…", del: "Remove the sticky note", close: "Close", title: "Sticky note", open: "Open the sticky note" },
  };
  const BLOCK = "p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,figcaption,pre,td,th,div";
  const CSS = `
.fp-layer{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}
.fp-dot{position:absolute;width:22px;height:22px;margin-top:-2px;border:0;padding:0;cursor:pointer;pointer-events:auto;border-radius:2px 2px 7px 2px;
 transform:rotate(4deg);box-shadow:0 2px 5px rgba(0,0,0,.25);transition:transform .15s}
.fp-dot::after{content:"";position:absolute;left:5px;right:5px;top:7px;height:7px;border-top:1.5px solid rgba(0,0,0,.28);border-bottom:1.5px solid rgba(0,0,0,.28)}
.fp-dot:hover,.fp-dot:focus-visible{transform:rotate(0) scale(1.15)}
.fp-card{position:fixed;z-index:60;width:min(300px,calc(100vw - 32px));padding:12px 12px 10px;border-radius:3px 3px 14px 3px;color:#2b2620;
 box-shadow:0 14px 34px -10px rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.15);transform:rotate(-1deg);font:15px/1.45 system-ui,sans-serif;animation:fpIn .18s ease}
@keyframes fpIn{from{opacity:0;transform:rotate(-1deg) scale(.94)}}
.fp-card textarea{display:block;width:100%;min-height:120px;max-height:50vh;border:0;background:transparent;resize:vertical;font:inherit;color:inherit;outline:none;padding:0}
.fp-card textarea::placeholder{color:rgba(43,38,32,.5)}
.fp-bar{display:flex;align-items:center;gap:6px;margin-top:8px}.fp-bar .sp{flex:1}
.fp-bar .c{width:20px;height:20px;border-radius:50%;border:1.5px solid rgba(0,0,0,.18);padding:0;cursor:pointer}.fp-bar .c.on{box-shadow:0 0 0 2px #2b2620}
.fp-bar .b{width:32px;height:32px;border:0;border-radius:50%;background:rgba(0,0,0,.07);color:inherit;display:grid;place-items:center;cursor:pointer}
.fp-bar .b:hover{background:rgba(0,0,0,.13)}.fp-bar svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:reduce){.fp-card{animation:none}.fp-dot{transition:none}}`;
  const ICON = { trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>' };
  const spineOf = (cfi) => { try { return new ePub.CFI(cfi).spinePos; } catch (e) { return -1; } };

  function create(host) {
    const L = host.lang === "en" ? "en" : "fr", t = (k) => TX[L][k];
    if (!document.getElementById("fp-css")) document.head.append(Object.assign(document.createElement("style"), { id: "fp-css", textContent: CSS }));
    const layer = document.createElement("div"); layer.className = "fp-layer"; host.root.append(layer);
    let card = null, raf = 0;
    const now = () => Date.now() / 1000;
    const live = () => (host.list() || []).filter((n) => !n.deleted);
    // la synchro peut remplacer la liste pendant qu'on écrit : on modifie toujours le post-it de la liste actuelle
    const fresh = (n) => (host.list() || []).find((x) => x.cfi === n.cfi) || n;

    // ---- les carrés dans la marge, recalculés quand la page bouge ----
    function draw() {
      raf = 0; layer.innerHTML = "";
      const r = host.get().rend, V = r?.manager?.container?.getBoundingClientRect(); if (!V) return;
      const R = layer.getBoundingClientRect(), ns = live(); if (!ns.length) return;
      for (const c of r.getContents()) {
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        for (const n of ns) {
          if (spineOf(n.cfi) !== c.sectionIndex) continue;
          let rg = null; try { rg = c.range(n.cfi); } catch (e) {} if (!rg) continue;
          const q = rg.getClientRects()[0] || rg.getBoundingClientRect(); if (!q || (!q.width && !q.height && !q.top)) continue;
          // en face de la ligne, juste à droite de la colonne de texte (en pages : la colonne où se trouve le passage)
          const node = rg.startContainer.nodeType === 1 ? rg.startContainer : rg.startContainer.parentElement;
          const bl = node?.closest?.(BLOCK) || node, col = [...(bl?.getClientRects() || [])].find((b) => q.left >= b.left - 2 && q.left <= b.right + 2) || bl?.getBoundingClientRect() || q;
          const y = f.top + q.top, x = Math.min(f.left + col.right + 6, V.right - 26);
          if (y < V.top - 4 || y > V.bottom - 12 || f.left + q.left < V.left - 2 || f.left + q.left >= V.right) continue;   // pas sur cette page
          const d = document.createElement("button"); d.type = "button"; d.className = "fp-dot"; d.dataset.cfi = n.cfi;
          d.style.cssText = `left:${x - R.left}px;top:${y - R.top}px;background:${COLORS[n.color] || COLORS.yellow}`;
          d.title = n.text ? n.text.slice(0, 80) : t("open"); d.setAttribute("aria-label", t("open"));
          d.onclick = (e) => { e.stopPropagation(); open(n, d.getBoundingClientRect()); };
          layer.append(d);
        }
      }
    }
    const redraw = () => { raf ||= requestAnimationFrame(draw); };
    let hooked = null;
    function hook() {
      const r = host.get().rend; if (!r || r === hooked) return; hooked = r;
      r.on("relocated", () => { redraw(); setTimeout(redraw, 350); }); r.on("rendered", () => setTimeout(redraw, 60));
      r.on("click", () => close());                    // un appui dans le texte (une autre page HTML) referme aussi la carte
      r.manager?.container?.addEventListener("scroll", redraw, { passive: true });
    }
    addEventListener("resize", redraw);

    // ---- la carte ouverte : écrire, changer la couleur, retirer ----
    function close() {
      if (!card) return; const { ta } = card, n = fresh(card.n); card.el.remove(); card = null;
      const txt = ta.value.trim();
      if (!txt && !n.text) { n.deleted = 1; n.updated = now(); host.save(); }     // post-it resté vide : on ne le garde pas
      else if (txt !== n.text) { n.text = txt; n.updated = now(); host.save(); }
      redraw();
    }
    function open(n, at) {
      close();
      const el = document.createElement("div"); el.className = "fp-card"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", t("title"));
      el.style.background = COLORS[n.color] || COLORS.yellow;
      el.innerHTML = `<textarea maxlength="5000"></textarea><div class="fp-bar">${Object.keys(COLORS).map((k) => `<button class="c" type="button" data-c="${k}" aria-label="${k}" style="background:${COLORS[k]}"></button>`).join("")}<span class="sp"></span>
<button class="b" type="button" data-a="del" title="${t("del")}"><svg viewBox="0 0 24 24">${ICON.trash}</svg></button><button class="b" type="button" data-a="x" title="${t("close")}"><svg viewBox="0 0 24 24">${ICON.x}</svg></button></div>`;
      const ta = el.querySelector("textarea"); ta.placeholder = t("ph"); ta.value = n.text || "";
      const paint = () => el.querySelectorAll(".c").forEach((b) => b.classList.toggle("on", b.dataset.c === (n.color || "yellow")));
      el.querySelector(".fp-bar").onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        n = fresh(n);
        if (b.dataset.c) { n.color = b.dataset.c; n.updated = now(); el.style.background = COLORS[n.color]; paint(); host.save(); redraw(); }
        else if (b.dataset.a === "del") { card.el.remove(); card = null; n.deleted = 1; n.updated = now(); host.save(); redraw(); }
        else close();
      };
      ta.onkeydown = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
      paint(); document.body.append(el); card = { el, n, ta };
      // près du carré, sans sortir de l'écran ; sur un petit écran, en haut (le clavier prend le bas)
      const w = el.offsetWidth, h = el.offsetHeight, small = innerWidth < 600;
      el.style.left = Math.max(16, Math.min(innerWidth - w - 16, small ? (innerWidth - w) / 2 : (at ? at.left - w - 10 : (innerWidth - w) / 2))) + "px";
      el.style.top = Math.max(16, Math.min(innerHeight - h - 16, small ? 70 : at ? at.top - 10 : innerHeight * .25)) + "px";
      ta.focus();
    }
    // un appui ailleurs referme la carte (et enregistre)
    addEventListener("pointerdown", (e) => { if (card && !card.el.contains(e.target) && !e.target.closest?.(".fp-dot")) close(); }, true);

    return {
      get isOpen() { return !!card; },
      // nouveau post-it à cet endroit du livre, ouvert pour écrire
      add(cfi, color = "yellow") {
        // un seul post-it par endroit (la synchro les reconnaît à leur place) : déjà là, on le rouvre ; retiré, il revient vide
        const all = host.list(), old = all.find((x) => x.cfi === cfi);
        if (old && !old.deleted) { hook(); draw(); return open(old, [...layer.children].find((d) => d.dataset.cfi === cfi)?.getBoundingClientRect()); }
        const n = old || { cfi, created: now() };
        Object.assign(n, { color, text: "", updated: now(), deleted: 0 }); if (!old) all.push(n);
        hook(); draw();
        const d = [...layer.children].find((x) => x.dataset.cfi === cfi); open(n, d ? d.getBoundingClientRect() : null);
      },
      open(cfi) { const n = live().find((x) => x.cfi === cfi); if (n) open(n, null); },
      draw() { hook(); redraw(); },
      close,
      clear() { close(); layer.innerHTML = ""; hooked = null; },
    };
  }
  return { create, COLORS };
})();
