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
  const layout = $("#layout"), paper = $("#paper"), body = $("#paperBody"), mini = $("#mini");
  const tilt = $(".frame.tilt");

  // le texte de la synchro, mot par mot
  const words = (() => {
    const txt = read.textContent.trim(); read.setAttribute("aria-label", txt); read.textContent = "";
    return txt.split(/\s+/).map((w, i, a) => { const s = document.createElement("span"); s.className = "w"; s.setAttribute("aria-hidden", "true"); s.textContent = w; read.append(s, i < a.length - 1 ? " " : ""); return s; });
  })();

  const STATES = [
    { th: "th_clair", bg: "#fbfbfa", fg: "#222222", font: "Literata", size: 19, line: 1.6, margin: 44, just: false },
    { th: "th_sepia", bg: "#f4ecd8", fg: "#5b4636", font: "Literata", size: 22, line: 1.75, margin: 30, just: true },
    { th: "th_nuit", bg: "#141a24", fg: "#c9d1dc", font: "Atkinson Hyperlegible", size: 18, line: 1.95, margin: 36, just: false },
    { th: "th_noir", bg: "#000000", fg: "#b8b8b8", font: "Fraunces", size: 17, line: 1.5, margin: 16, just: true },
  ].map((s) => ({ ...s, rgb: [s.bg, s.fg].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) }));
  const mixRGB = (a, b, k) => "rgb(" + a.map((v, i) => Math.round(lerp(v, b[i], k))).join(",") + ")";
  const spec = Object.fromEntries($$("#spec dd").map((d) => [d.dataset.k, d]));
  const num = (v) => v.toLocaleString(LANG === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const setVar = (el, cache, k, v) => { if (cache[k] !== v) { cache[k] = v; el.style.setProperty(k, v); } };
  const setText = (el, v) => { if (el.textContent !== v) el.textContent = v; };

  const ribbon = $(".ribbon"), pageNo = $("#pageNo");
  const bookCache = {}, paperCache = {}, misc = {};
  let lastWord = -1, lastDev = -1, curFont = "", lastPage = 0;

  function scrollTask() {
    // 1) lectures (aucune écriture avant la fin de ce bloc : pas de recalcul de mise en page forcé)
    const vh = innerHeight, sy = scrollY, max = document.documentElement.scrollHeight - vh;
    const rBook = visible.has(book) ? book.getBoundingClientRect() : null;
    const rSync = visible.has(sync) ? sync.getBoundingClientRect() : null;
    const rLay = visible.has(layout) ? layout.getBoundingClientRect() : null;
    const rTilt = visible.has(tilt) ? tilt.getBoundingClientRect() : null;

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

    if (rLay || reduce) {
      const p = reduce ? 0 : clamp(-rLay.top / Math.max(1, rLay.height - vh));
      const seg = clamp(p * 1.1) * (STATES.length - 1);
      const i = Math.min(STATES.length - 2, Math.floor(seg)), k = ease(clamp(seg - i));
      const A = STATES[i], B = STATES[i + 1], N = k < 0.5 ? A : B;
      // valeurs arrondies : la page n'est recomposée que lorsqu'une valeur visible change vraiment
      const size = Math.round(lerp(A.size, B.size, k) * 2) / 2, line = Math.round(lerp(A.line, B.line, k) * 40) / 40, margin = Math.round(lerp(A.margin, B.margin, k));
      setVar(paper, paperCache, "--pbg", mixRGB(A.rgb[0], B.rgb[0], k));
      setVar(paper, paperCache, "--pfg", mixRGB(A.rgb[1], B.rgb[1], k));
      setVar(paper, paperCache, "--ps", size + "px");
      setVar(paper, paperCache, "--pl", String(line));
      setVar(paper, paperCache, "--pm", margin + "px");
      setVar(paper, paperCache, "--pj", N.just ? "justify" : "left");
      if (N.font !== curFont) {
        paper.style.setProperty("--pf", `"${N.font}"`);
        if (curFont) { body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap"); }
        curFont = N.font;
      }
      setText(spec.theme, t(N.th)); setText(spec.font, N.font);
      setText(spec.size, Math.round(size) + " px"); setText(spec.line, num(Math.round(line * 10) / 10)); setText(spec.margin, margin + " px");
      mini.classList.toggle("on", p < 0.66);                 // en fin de scène, les marges ne sont plus synchronisées
    }

    if (rTilt) setVar(tilt, misc, "--t", reduce ? "0" : clamp((rTilt.top - vh * 0.25) / (vh * 0.6)).toFixed(3));
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
  [title, book, sync, layout, tilt].forEach((e) => vis.observe(e));
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
})();
