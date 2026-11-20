"use strict";
// Folio — animations de la page d'accueil.
// Performances : une image n'est calculée que si quelque chose a bougé (défilement, pointeur, animation en cours),
// seules les parties visibles sont mises à jour, toutes les mesures sont lues avant d'écrire quoi que ce soit,
// et les déplacements passent par transform/opacity. Tout est désactivé si l'utilisateur préfère réduire les animations.
(() => {
  const site = window.FolioSite || { t: (k) => k, LANG: "fr" };
  const { t, LANG } = site;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  // ---------- boucle à la demande ----------
  let queued = false;
  const tasks = new Set();                      // fonctions rappelées tant qu'elles renvoient true (animation en cours)
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };

  // ne mettre à jour que ce qui est à l'écran
  const visible = new Set();
  const vis = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    tasks.add(scrollTask); request();
  }, { rootMargin: "100px 0px" });

  // ---------- lettres ----------
  let idx = 0;
  function splitLetters(el) {
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    const walk = (node) => {
      for (const c of [...node.childNodes]) {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of c.textContent) {
            const s = document.createElement("span");
            s.className = "ch"; s.textContent = ch; s.setAttribute("aria-hidden", "true"); s.style.setProperty("--i", idx++);
            frag.append(s);
          }
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      }
    };
    walk(el);
    return $$(".ch", el);
  }
  const title = $("#inkTitle"), fin = $("#finWord");
  idx = 0; const letters = splitLetters(title);
  idx = 0; splitLetters(fin);

  // titre : les lettres prennent de la graisse près du pointeur (souris seulement), puis se reposent
  const live = letters.map((el) => ({ el, base: el.closest("em") ? 360 : 420, w: 0, s: 0, x: 0, y: 0 }));
  live.forEach((L) => (L.w = L.base));
  let mouse = null, inkReady = false;
  const measureInk = () => live.forEach((L) => { const r = L.el.getBoundingClientRect(); L.x = r.left + r.width / 2; L.y = r.top + r.height / 2 + scrollY; });
  if (reduce) title.classList.add("live");
  else {
    requestAnimationFrame(() => title.classList.add("go"));
    setTimeout(() => { title.classList.remove("go"); title.classList.add("live"); if (finePointer) { measureInk(); inkReady = true; } }, 100 + letters.length * 30 + 1300);
  }
  function inkTask() {
    if (!inkReady || !visible.has(title)) return false;
    let moving = false;
    for (const L of live) {
      let k = 0;
      if (mouse) { const dx = mouse.x - L.x, dy = (mouse.y - L.y) * 1.3; k = Math.exp(-(dx * dx + dy * dy) / 45000); }
      const tw = L.base + k * 300, ts = k * 100;
      const nw = L.w + (tw - L.w) * 0.14, ns = L.s + (ts - L.s) * 0.14;
      if (Math.abs(nw - L.w) > 0.4 || Math.abs(ns - L.s) > 0.2) {
        moving = true; L.w = nw; L.s = ns;
        L.el.style.setProperty("--w", nw.toFixed(0)); L.el.style.setProperty("--s", ns.toFixed(0));
      }
    }
    return moving;
  }
  if (finePointer && !reduce) {
    addEventListener("pointermove", (e) => { if (!inkReady || !visible.has(title)) return; mouse = { x: e.clientX, y: e.clientY + scrollY }; tasks.add(inkTask); request(); }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { mouse = null; tasks.add(inkTask); request(); });
    addEventListener("resize", () => inkReady && measureInk());
  }

  // « Fin. » s'encre quand on arrive au bout
  if (reduce) fin.classList.add("live");
  else new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { fin.classList.add("go"); o.disconnect(); } }), { threshold: 0.6 }).observe(fin);

  // ---------- apparitions ----------
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { threshold: 0.25 });
  $$("[data-rv]").forEach((e) => rv.observe(e));

  // ---------- éléments pilotés par le défilement ----------
  const book = $("#book"), cover = $(".cover", book);
  const sync = $("#sync"), read = $("#readText"), trackEl = $("#track"), pctEl = $("#pct"), devNames = $$("#track span");
  const tilts = $$(".frame.tilt,.duo"), tiltCache = tilts.map(() => ({}));

  // le texte de la synchro, mot par mot
  const words = (() => {
    const txt = read.textContent.trim(); read.setAttribute("aria-label", txt); read.textContent = "";
    return txt.split(/\s+/).map((w, i, a) => { const s = document.createElement("span"); s.className = "w"; s.setAttribute("aria-hidden", "true"); s.textContent = w; read.append(s, i < a.length - 1 ? " " : ""); return s; });
  })();

  const setVar = (el, cache, k, v) => { if (cache[k] !== v) { cache[k] = v; el.style.setProperty(k, v); } };
  const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };

  const ribbon = $(".ribbon"), pageNo = $("#pageNo");
  const bookCache = {}, misc = {};
  let lastWord = -1, lastDev = -1, lastPage = 0;

  function scrollTask() {
    // 1) lectures (aucune écriture avant la fin de ce bloc : pas de recalcul de mise en page forcé)
    const vh = innerHeight, sy = scrollY, max = document.documentElement.scrollHeight - vh;
    const rBook = visible.has(book) ? book.getBoundingClientRect() : null;
    const rSync = visible.has(sync) ? sync.getBoundingClientRect() : null;
    const rTilts = tilts.map((e) => (visible.has(e) ? e.getBoundingClientRect() : null));

    // 2) écritures
    setVar(ribbon, misc, "--p", clamp(sy / Math.max(1, max)).toFixed(3));
    const page = Math.floor(sy / (vh * 0.9)) + 1;
    if (page !== lastPage) { lastPage = page; pageNo.textContent = page; }

    if (rBook || reduce) {
      const p = reduce ? 1 : clamp((vh * 0.62 - rBook.top) / (vh * 0.5));
      const o = ease(p) * 165;
      setVar(book, bookCache, "--p", p.toFixed(3));
      setVar(book, bookCache, "--o", o.toFixed(1));
      setVar(book, bookCache, "--co", clamp((150 - o) / 30).toFixed(2));
      cover.classList.toggle("moving", p > 0 && p < 1);
      cover.classList.toggle("gone", o >= 150);
    }

    if (rSync || reduce) {
      const p = reduce ? 1 : clamp(-rSync.top / Math.max(1, rSync.height - vh));
      const pr = clamp(p * 1.08);
      const n = Math.round(pr * words.length);
      if (n !== lastWord) {                                   // seuls les mots qui changent d'état sont touchés
        const [a, b] = lastWord < 0 ? [0, words.length] : [Math.min(n, lastWord), Math.max(n, lastWord)];
        for (let i = a; i < b; i++) words[i].classList.toggle("on", i < n);
        lastWord = n;
      }
      setVar(trackEl, misc, "--p", pr.toFixed(3));
      setText(pctEl, Math.round(pr * 100) + " %");
      const dev = Math.min(2, Math.floor(p * 3));
      if (dev !== lastDev) { lastDev = dev; devNames.forEach((d, i) => d.classList.toggle("on", i === dev)); }
    }

    rTilts.forEach((r, i) => { if (r) setVar(tilts[i], tiltCache[i], "--t", reduce ? "0" : clamp((r.top - vh * 0.25) / (vh * 0.6)).toFixed(3)); });
    return false;
  }

  function frame() {
    queued = false;
    for (const f of [...tasks]) if (!f()) tasks.delete(f);
    if (tasks.size) request();
  }
  const onScroll = () => { tasks.add(scrollTask); request(); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  [title, book, sync, ...tilts].forEach((e) => vis.observe(e));
  onScroll();

  // ---------- plateforme qui défile (seulement quand elle est visible) ----------
  const roll = $("#roll"), track = roll.firstElementChild;
  const items = [...track.children];
  track.append(items[0].cloneNode(true));
  let ri = 0, rollOn = false;
  const fit = () => (roll.style.width = items[ri % items.length].getBoundingClientRect().width + "px");
  fit(); addEventListener("resize", fit);
  new IntersectionObserver((es) => (rollOn = es[0].isIntersecting)).observe(roll);
  if (!reduce) setInterval(() => {
    if (document.hidden || !rollOn) return;
    ri++;
    track.style.transition = "";
    track.style.transform = `translateY(${-ri * 1.15}em)`;
    roll.style.width = items[ri % items.length].getBoundingClientRect().width + "px";
    if (ri === items.length) setTimeout(() => { track.style.transition = "none"; ri = 0; track.style.transform = "none"; }, 750);
  }, 2200);

  // ---------- commandes tapées dans le terminal ----------
  const pre = $("#shCmd");
  const lines = pre.textContent.split("\n").map((l) => l.replace(/^\$ /, ""));
  pre.dataset.full = lines.join("\n");
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  if (!reduce) {
    pre.innerHTML = '<b>$</b> <span class="caret"></span>';
    new IntersectionObserver((es, o) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      let li = 0, ci = 0;
      const step = () => {
        const done = lines.slice(0, li).map((l) => "<b>$</b> " + esc(l));
        const curr = li < lines.length ? "<b>$</b> " + esc(lines[li].slice(0, ci)) : "<b>$</b> ";
        pre.innerHTML = [...done, curr].join("\n") + '<span class="caret"></span>';
        if (li >= lines.length) return;
        if (ci < lines[li].length) { ci++; setTimeout(step, 18 + Math.random() * 40); }
        else { li++; ci = 0; setTimeout(step, 380); }
      };
      setTimeout(step, 300);
    }), { threshold: 0.5 }).observe(pre);
  }

  // =====================================================================================================
  // La page se lit comme un livre dans Folio : réglages de mise en page, surlignage, reprise de la lecture
  // (tout reste dans ce navigateur : localStorage, rien n'est envoyé)
  // =====================================================================================================
  const store = {
    get: (k, d) => { try { const v = JSON.parse(localStorage[k] || "null"); return v ?? d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage[k] = JSON.stringify(v); } catch (e) {} },
  };
  const root = document.documentElement;
  const mk = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
  const SVG = (p) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const IC = { aa: '<path d="m3 18 5-12 5 12M4.8 14h6.4M15 18v-5.5a3 3 0 0 1 6 0V18M15 15h6"/>', pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>', bm: '<path d="M6 3h12v18l-6-4.5L6 21z"/>' };

  // ---------- 1) mise en page : thème, police, taille (posés sur <html> ; le <head> les réapplique avant l'affichage) ----------
  const LOOK = { theme: ["", "clair", "sepia", "nuit"], font: ["", "literata", "atkinson"], size: ["0.9", "", "1.15"] };
  const FONTS = { "": "Fraunces", literata: "Literata", atkinson: "Atkinson" };
  let look = Object.assign({ theme: "", font: "", size: "" }, store.get("folioSiteLook", {}));
  const panels = [];
  function applyLook() {
    for (const k of ["theme", "font"]) look[k] ? (root.dataset[k] = look[k]) : delete root.dataset[k];
    look.size ? root.style.setProperty("--ts", look.size) : root.style.removeProperty("--ts");
    store.set("folioSiteLook", look);
    panels.forEach((f) => f());
    requestAnimationFrame(() => {                       // la page s'est recomposée : on remesure
      const m = $("meta[name=theme-color]"); if (m) m.content = getComputedStyle(document.body).backgroundColor;
      if (inkReady) measureInk(); fit(); onScroll(); placeAll();
    });
  }
  function buildPanel(el) {
    const groups = [
      ["theme", t("tsTheme"), LOOK.theme.map((v) => [v, v ? t("th_" + v) : t("tsAuto")])],
      ["font", t("tsFont"), LOOK.font.map((v) => [v, FONTS[v]])],
      ["size", t("tsSize"), LOOK.size.map((v, i) => [v, "A", [t("tsS"), t("tsM"), t("tsL")][i]])],
    ];
    el.innerHTML = groups.map(([k, lbl, opts]) => `<div class="tg"><span class="tl">${lbl}</span><div class="chips" role="radiogroup" aria-label="${lbl}">` +
      opts.map(([v, txt, aria], i) => `<button type="button" role="radio" data-k="${k}" data-v="${v}"${aria ? ` aria-label="${aria}"` : ""} class="c-${k}-${v || "def"} s${i}">${txt}</button>`).join("") +
      `</div></div>`).join("") + `<button type="button" class="tset-reset">${t("tsReset")}</button>`;
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("tset-reset")) look = { theme: "", font: "", size: "" }; else look[b.dataset.k] = b.dataset.v;
      applyLook();
    });
    const sync = () => el.querySelectorAll("[data-k]").forEach((b) => { const on = look[b.dataset.k] === b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    panels.push(sync); sync();
  }
  buildPanel($("#tset"));

  // ---------- barre flottante : mise en page + notes ----------
  const dock = mk(`<div class="dock" id="dock"><button type="button" class="dk" id="dAa" aria-expanded="false" aria-controls="aaPop">${SVG(IC.aa)}<span>${t("dockAa")}</span></button>` +
    `<button type="button" class="dk" id="dNotes" aria-controls="nd">${SVG(IC.pen)}<span>${t("dockNotes")}</span><b id="dCount">0</b></button></div>`);
  const aaPop = mk(`<div class="aapop tset" id="aaPop" role="dialog" aria-label="${t("dockAa")}" hidden></div>`);
  const nd = mk(`<aside class="nd" id="nd" aria-label="${t("notesT")}" hidden><header><h3>${t("notesT")}</h3><button type="button" class="ndx" aria-label="${t("close")}">${SVG(IC.x)}</button></header>` +
    `<div class="nd-list"></div><footer><button type="button" class="btn pri sm" id="ndMd">${t("notesMd")}</button><p>${t("notesLocal")}</p></footer></aside>`);
  const resume = mk(`<button type="button" class="resume" hidden>${SVG(IC.bm)}<span></span></button>`);
  document.body.append(dock, aaPop, nd, resume);
  buildPanel(aaPop);
  const setAa = (open) => { aaPop.hidden = !open; $("#dAa").setAttribute("aria-expanded", open); };
  const setNd = (open) => { nd.hidden = !open; if (open) { renderNotes(); setAa(false); requestAnimationFrame(() => nd.classList.add("on")); } else nd.classList.remove("on"); };
  $("#dAa").onclick = () => setAa(aaPop.hidden);
  $("#dNotes").onclick = () => setNd(nd.hidden);
  $(".ndx", nd).onclick = () => setNd(false);
  addEventListener("keydown", (e) => { if (e.key === "Escape") { setAa(false); setNd(false); hidePop(); } });
  addEventListener("pointerdown", (e) => { if (!aaPop.hidden && !e.target.closest("#aaPop,#dAa")) setAa(false); });
  // la barre apparaît une fois la couverture passée
  let dockOn = null;
  const dockCheck = () => { const on = scrollY > innerHeight * 0.55; if (on !== dockOn) { dockOn = on; dock.classList.toggle("on", on); if (!on) setAa(false); } };
  addEventListener("scroll", dockCheck, { passive: true }); dockCheck();

  // ---------- 2) surlignage : n'importe quelle phrase de la page ----------
  const COLORS = ["y", "g", "b", "p"];
  let notes = store.get("folioSiteNotes", []).filter((n) => n && n.text && n.id);
  const saveNotes = () => { store.set("folioSiteNotes", notes); updateCount(); if (!nd.hidden) renderNotes(); };
  const sections = () => $$("main > section[id]");
  const NO = "h1.ink,.fin-w,button,a,pre,.tset,.shbox,.track,.roll,.book,.frame,nav,.dock,.aapop,.nd,.hlpop";
  const usable = (n) => { const el = n.nodeType === 1 ? n : n.parentElement; return !!el && !el.closest(NO); };
  const textNodes = (sec) => {
    const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (usable(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const out = []; let n; while ((n = w.nextNode())) out.push(n); return out;
  };
  const secLabel = (sec) => (sec.id === "top" ? t("secTop") : sec.id === "fin" ? t("secFin") : ($(".label", sec) || {}).textContent || sec.id);
  // borne d'un Range → (index du nœud texte, décalage) dans la liste de la section
  function boundary(nodes, container, offset, isEnd) {
    if (container.nodeType === 3) { const i = nodes.indexOf(container); return i < 0 ? null : [i, offset]; }
    const r = document.createRange(); r.setStart(container, offset);
    if (!isEnd) { for (let i = 0; i < nodes.length; i++) if (r.comparePoint(nodes[i], 0) >= 0) return [i, 0]; return null; }
    for (let i = nodes.length - 1; i >= 0; i--) if (r.comparePoint(nodes[i], nodes[i].length) <= 0) return [i, nodes[i].length];
    return null;
  }
  function wrap(nodes, si, so, ei, eo, n) {
    for (let i = si; i <= ei; i++) {
      let node = nodes[i]; const a = i === si ? so : 0, b = i === ei ? eo : node.data.length;
      if (b <= a || !node.data.slice(a, b).trim() && !(i > si && i < ei)) continue;
      if (b < node.data.length) node.splitText(b);
      if (a > 0) node = node.splitText(a);
      const m = document.createElement("mark"); m.className = "hl u " + n.c; m.dataset.n = n.id;
      node.replaceWith(m); m.append(node);
    }
  }
  // retrouve la k-ième occurrence d'un passage dans la section et le surligne
  function place(n) {
    const sec = document.getElementById(n.sec); if (!sec || $(`mark[data-n="${n.id}"]`)) return true;
    const nodes = textNodes(sec), text = nodes.map((x) => x.data).join("");
    let at = -1; for (let k = 0; k <= (n.k || 0); k++) { at = text.indexOf(n.text, at + 1); if (at < 0) return false; }
    const end = at + n.text.length; let acc = 0, si, so, ei, eo;
    nodes.forEach((x, i) => { const L = x.data.length; if (si == null && at < acc + L) { si = i; so = at - acc; } if (ei == null && end <= acc + L) { ei = i; eo = end - acc; } acc += L; });
    if (si == null || ei == null) return false;
    wrap(nodes, si, so, ei, eo, n); return true;
  }
  const mine = () => notes.filter((n) => n.lang === LANG);
  function placeAll() { mine().forEach(place); }
  function unwrap(id) { $$(`mark[data-n="${id}"]`).forEach((m) => { const p = m.parentNode; m.replaceWith(...m.childNodes); p.normalize(); }); }

  const pop = mk(`<div class="hlpop" role="toolbar" hidden>` + COLORS.map((c) => `<button type="button" class="sw ${c}" data-c="${c}" aria-label="${t("hlColor", { c: t("c_" + c) })}"></button>`).join("") +
    `<button type="button" class="del" aria-label="${t("hlDel")}">${SVG(IC.trash)}</button></div>`);
  document.body.append(pop);
  let popFor = null;                                    // { range } pour une sélection, { id } pour un surlignage existant
  function showPop(rect, target) {
    popFor = target; pop.hidden = false; pop.classList.toggle("edit", !!target.id);
    const touch = matchMedia("(pointer: coarse)").matches, w = pop.offsetWidth, h = pop.offsetHeight;
    const x = Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
    let y = touch ? rect.bottom + 14 : rect.top - h - 10; if (y < 70) y = rect.bottom + 12; if (y + h > innerHeight - 8) y = rect.top - h - 10;
    pop.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  function hidePop() { pop.hidden = true; popFor = null; }
  pop.addEventListener("pointerdown", (e) => e.preventDefault());       // garde la sélection
  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !popFor) return;
    if (popFor.id) {                                    // surlignage existant : recolorer ou retirer
      const n = notes.find((x) => x.id === popFor.id);
      if (b.classList.contains("del")) { unwrap(popFor.id); notes = notes.filter((x) => x !== n); }
      else if (n) { n.c = b.dataset.c; $$(`mark[data-n="${n.id}"]`).forEach((m) => (m.className = "hl u " + n.c)); }
      saveNotes(); hidePop(); return;
    }
    if (!b.dataset.c) return;
    const r = popFor.range, sec = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement).closest("main > section[id]");
    if (!sec) return hidePop();
    const nodes = textNodes(sec), s0 = boundary(nodes, r.startContainer, r.startOffset, false), e0 = boundary(nodes, r.endContainer, r.endOffset, true);
    if (!s0 || !e0) return hidePop();
    const before = nodes.slice(0, s0[0]).reduce((a, x) => a + x.data.length, 0) + s0[1];
    const text = nodes.map((x) => x.data).join("").slice(before, nodes.slice(0, e0[0]).reduce((a, x) => a + x.data.length, 0) + e0[1]);
    if (!text.trim()) return hidePop();
    const all = nodes.map((x) => x.data).join(""); let k = 0, i = -1; while ((i = all.indexOf(text, i + 1)) >= 0 && i < before) k++;
    const n = { id: Math.random().toString(36).slice(2, 10), lang: LANG, sec: sec.id, text, k, o: before, c: b.dataset.c, at: Date.now() };
    wrap(nodes, s0[0], s0[1], e0[0], e0[1], n);
    notes.push(n); getSelection().removeAllRanges(); saveNotes(); hidePop();
    $("#dNotes").classList.remove("pulse"); void $("#dNotes").offsetWidth; $("#dNotes").classList.add("pulse");
  });
  let selT;
  const onSel = () => {
    clearTimeout(selT);
    selT = setTimeout(() => {
      const sel = getSelection();
      if (!sel.rangeCount || sel.isCollapsed) { if (popFor && popFor.range) hidePop(); return; }
      const r = sel.getRangeAt(0), a = r.startContainer, b = r.endContainer;
      const sa = (a.nodeType === 1 ? a : a.parentElement).closest("main > section[id]"), sb = (b.nodeType === 1 ? b : b.parentElement).closest("main > section[id]");
      if (!sa || sa !== sb || !String(sel).trim() || !usable(a) || !usable(b)) return hidePop();
      const rect = r.getBoundingClientRect(); if (!rect.width && !rect.height) return hidePop();
      showPop(rect, { range: r.cloneRange() });
    }, 180);
  };
  document.addEventListener("selectionchange", onSel);
  document.addEventListener("click", (e) => {
    const m = e.target.closest("mark.u");
    if (m && getSelection().isCollapsed) { showPop(m.getBoundingClientRect(), { id: m.dataset.n }); return; }
    if (!e.target.closest(".hlpop") && getSelection().isCollapsed) hidePop();
  });
  addEventListener("scroll", () => { if (popFor && popFor.id) hidePop(); }, { passive: true });

  function updateCount() { const n = mine().length; $("#dCount").textContent = n; dock.classList.toggle("has", n > 0); }
  function renderNotes() {
    const list = $(".nd-list", nd), order = sections().map((s) => s.id), ns = mine().sort((a, b) => order.indexOf(a.sec) - order.indexOf(b.sec) || a.o - b.o);
    $("#ndMd").disabled = !ns.length;
    if (!ns.length) { list.innerHTML = `<p class="nd-empty">${t("notesEmpty")}</p>`; return; }
    let html = "", last = "";
    for (const n of ns) {
      if (n.sec !== last) { last = n.sec; const s = document.getElementById(n.sec); html += `<h4>${esc(s ? secLabel(s) : n.sec)}</h4>`; }
      html += `<div class="nq ${n.c}" data-n="${n.id}" tabindex="0"><p>${esc(n.text.trim())}</p><button type="button" class="nqx" aria-label="${t("hlDel")}">${SVG(IC.x)}</button></div>`;
    }
    list.innerHTML = html;
  }
  $(".nd-list", nd).addEventListener("click", (e) => {
    const q = e.target.closest(".nq"); if (!q) return;
    const id = q.dataset.n;
    if (e.target.closest(".nqx")) { unwrap(id); notes = notes.filter((x) => x.id !== id); saveNotes(); return; }
    const m = $(`mark[data-n="${id}"]`); if (!m) return;
    if (innerWidth < 760) setNd(false);
    m.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    $$(`mark[data-n="${id}"]`).forEach((x) => { x.classList.remove("flash"); void x.offsetWidth; x.classList.add("flash"); });
  });
  $("#ndMd").onclick = () => {
    const order = sections().map((s) => s.id), ns = mine().sort((a, b) => order.indexOf(a.sec) - order.indexOf(b.sec) || a.o - b.o);
    let md = "# Folio\n", last = "";
    for (const n of ns) { if (n.sec !== last) { last = n.sec; const s = document.getElementById(n.sec); md += `\n## ${s ? secLabel(s) : n.sec}\n`; } md += `\n> ${n.text.trim().replace(/\s+/g, " ")}\n`; }
    navigator.clipboard.writeText(md).then(() => { const b = $("#ndMd"), o = b.textContent; b.textContent = t("notesCopied"); setTimeout(() => (b.textContent = o), 1500); }, () => {});
  };
  placeAll(); updateCount();

  // ---------- 3) reprendre la lecture où on l'avait laissée ----------
  const was = store.get("folioSitePos", null);
  if (was && !location.hash && was.y > innerHeight && Date.now() - was.at < 30 * 864e5 && scrollY < 40) {
    $("span", resume).textContent = t("resumeAt", { n: was.page || 2 }); resume.hidden = false;
    requestAnimationFrame(() => resume.classList.add("on"));
    const bye = () => { resume.classList.remove("on"); setTimeout(() => (resume.hidden = true), 400); removeEventListener("scroll", far); };
    const far = () => { if (scrollY > innerHeight * 0.5) bye(); };
    resume.onclick = () => { scrollTo({ top: was.y, behavior: reduce ? "auto" : "smooth" }); bye(); };
    addEventListener("scroll", far, { passive: true }); setTimeout(bye, 12000);
  }
  let posT;
  addEventListener("scroll", () => { clearTimeout(posT); posT = setTimeout(() => store.set("folioSitePos", { y: Math.round(scrollY), page: lastPage, at: Date.now() }), 500); }, { passive: true });
  if (Object.values(look).some(Boolean)) applyLook();
})();
