"use strict";
// Folio — animations de la page d'accueil. Tout est piloté par le défilement (une seule boucle requestAnimationFrame)
// et désactivé si l'utilisateur préfère réduire les animations.
(() => {
  const site = window.FolioSite || { t: (k) => k, LANG: "fr" };
  const { t, LANG } = site;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  // avancement (0 → 1) d'une scène épinglée
  const sceneP = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };

  // ---------- encre : chaque lettre devient un élément animable ----------
  let idx = 0;
  function splitLetters(el) {
    const label = el.textContent.replace(/\s+/g, " ").trim();
    el.setAttribute("aria-label", label);
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

  const title = $("#inkTitle");
  idx = 0;
  const letters = splitLetters(title);
  const finLetters = (() => { idx = 0; return splitLetters($("#finWord")); })();

  // les lettres « respirent » : graisse et douceur suivent le pointeur (ou une vague lente sur écran tactile)
  const live = letters.map((el) => ({ el, base: el.closest("em") ? 360 : 420, w: 0, s: 0, x: 0, y: 0 }));
  let mouse = null, inkOn = false;
  const measure = () => live.forEach((L) => { const r = L.el.getBoundingClientRect(); L.x = r.left + r.width / 2; L.y = r.top + r.height / 2 + scrollY; });
  function startInk() {
    title.classList.remove("go"); title.classList.add("live");
    live.forEach((L) => { L.w = L.base; });
    measure(); inkOn = true;
  }
  if (reduce) title.classList.add("live");
  else {
    requestAnimationFrame(() => title.classList.add("go"));
    setTimeout(startInk, 100 + letters.length * 34 + 1400);
  }
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY + scrollY }; }, { passive: true });
  document.addEventListener("pointerleave", () => (mouse = null));
  addEventListener("resize", () => inkOn && measure());
  function inkFrame(time) {
    if (!inkOn) return;
    const r = title.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    for (let i = 0; i < live.length; i++) {
      const L = live[i];
      let k;
      if (mouse) { const d = Math.hypot(mouse.x - L.x, (mouse.y - L.y) * 1.3); k = Math.exp(-(d * d) / (2 * 150 * 150)); }
      else k = finePointer ? 0 : (Math.sin(time / 900 - i * 0.38) + 1) / 2 * 0.55;
      const tw = L.base + k * 330, ts = k * 100;
      L.w += (tw - L.w) * 0.12; L.s += (ts - L.s) * 0.12;
      L.el.style.setProperty("--w", L.w.toFixed(1)); L.el.style.setProperty("--s", L.s.toFixed(1));
    }
  }

  // « Fin. » s'encre quand on arrive au bout
  if (!reduce) new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("go"); o.disconnect(); } }), { threshold: 0.6 }).observe($("#finWord"));
  else $("#finWord").classList.add("live");
  void finLetters;

  // ---------- apparitions ----------
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } }), { threshold: 0.25 });
  $$("[data-rv]").forEach((e) => rv.observe(e));

  // ---------- couverture : le livre s'ouvre ----------
  const book = $("#book");
  function bookFrame() {
    const r = book.getBoundingClientRect();
    const p = reduce ? 1 : clamp((innerHeight * 0.62 - r.top) / (innerHeight * 0.5));
    const o = ease(p) * 165;
    book.style.setProperty("--p", p.toFixed(3));
    book.style.setProperty("--o", o.toFixed(2));
    book.style.setProperty("--co", clamp((150 - o) / 30).toFixed(3));
  }

  // ---------- I. la lecture avance, tous les appareils suivent ----------
  const sync = $("#sync"), read = $("#readText"), devs = $$("#devs .dev"), cap = $("#syncCap");
  const words = (() => {
    const txt = read.textContent.trim(); read.setAttribute("aria-label", txt); read.textContent = "";
    return txt.split(/\s+/).map((w, i, a) => { const s = document.createElement("span"); s.className = "w"; s.setAttribute("aria-hidden", "true"); s.textContent = w; read.append(s, i < a.length - 1 ? " " : ""); return s; });
  })();
  const caps = ["cap1", "cap2", "cap3"];
  let lastWord = -2, lastDev = -1;
  function syncFrame() {
    const p = reduce ? 1 : sceneP(sync);
    const pr = clamp(p * 1.08);
    const n = Math.round(pr * words.length);
    if (n !== lastWord) {
      words.forEach((w, i) => { w.classList.toggle("on", i < n); w.classList.toggle("cur", i === n - 1 && n < words.length); });
      lastWord = n;
    }
    const pct = Math.round(pr * 100) + " %";
    const active = Math.min(2, Math.floor(p * 3));
    devs.forEach((d, i) => {
      d.style.setProperty("--p", pr.toFixed(3));
      const pc = d.querySelector(".pc"); if (pc.textContent !== pct) pc.textContent = pct;
      d.classList.toggle("on", i === active);
    });
    if (active !== lastDev) {
      lastDev = active;
      devs.forEach((d, i) => (d.querySelector(".st").textContent = i === active ? t("stReading") : t("stSynced")));
      cap.classList.add("out");
      setTimeout(() => { cap.textContent = t(caps[active]); cap.classList.remove("out"); }, reduce ? 0 : 220);
    }
  }

  // ---------- II. la page se recompose ----------
  const layout = $("#layout"), paper = $("#paper"), body = $("#paperBody"), mini = $("#mini");
  const STATES = [
    { th: "th_clair", bg: "#fbfbfa", fg: "#222222", font: "Literata", size: 19, line: 1.6, margin: 44, just: false },
    { th: "th_sepia", bg: "#f4ecd8", fg: "#5b4636", font: "Literata", size: 22, line: 1.75, margin: 30, just: true },
    { th: "th_nuit", bg: "#141a24", fg: "#c9d1dc", font: "Atkinson Hyperlegible", size: 18, line: 1.95, margin: 36, just: false },
    { th: "th_noir", bg: "#000000", fg: "#b8b8b8", font: "Fraunces", size: 17, line: 1.5, margin: 16, just: true },
  ];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => "rgb(" + hex(a).map((v, i) => Math.round(lerp(v, hex(b)[i], k))).join(",") + ")";
  const spec = Object.fromEntries($$("#spec dd").map((d) => [d.dataset.k, d]));
  const setSpec = (k, v) => { const d = spec[k]; if (d.textContent !== v) { d.textContent = v; d.classList.remove("flash"); void d.offsetWidth; d.classList.add("flash"); } };
  const num = (v, dec) => v.toLocaleString(LANG === "fr" ? "fr-FR" : "en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  let curFont = "";
  function layoutFrame() {
    const p = reduce ? 0 : sceneP(layout);
    const seg = clamp(p * 1.1) * (STATES.length - 1);
    const i = Math.min(STATES.length - 2, Math.floor(seg)), k = ease(clamp(seg - i));
    const A = STATES[i], B = STATES[i + 1], N = k < 0.5 ? A : B;
    const size = lerp(A.size, B.size, k), line = lerp(A.line, B.line, k), margin = lerp(A.margin, B.margin, k);
    const s = paper.style;
    s.setProperty("--pbg", mix(A.bg, B.bg, k)); s.setProperty("--pfg", mix(A.fg, B.fg, k));
    s.setProperty("--ps", size.toFixed(2) + "px"); s.setProperty("--pl", line.toFixed(3)); s.setProperty("--pm", margin.toFixed(1) + "px");
    s.setProperty("--pj", N.just ? "justify" : "left");
    if (N.font !== curFont) {
      s.setProperty("--pf", `"${N.font}"`);
      if (curFont) { body.classList.remove("swap"); void body.offsetWidth; body.classList.add("swap"); }
      curFont = N.font;
    }
    setSpec("theme", t(N.th)); setSpec("font", N.font);
    setSpec("size", Math.round(size) + " px"); setSpec("line", num(Math.round(line * 10) / 10, 1)); setSpec("margin", Math.round(margin) + " px");
    // le nouveau réglage : les marges cessent d'être synchronisées sur la fin de la scène
    mini.classList.toggle("on", p < 0.66);
  }

  // ---------- IV. capture qui se redresse ----------
  const tilt = $(".frame.tilt");
  function tiltFrame() {
    const r = tilt.getBoundingClientRect();
    tilt.style.setProperty("--t", reduce ? 0 : clamp((r.top - innerHeight * 0.25) / (innerHeight * 0.6)).toFixed(3));
  }

  // ---------- marque-page, numéro de page et titre courant ----------
  const ribbon = $(".ribbon"), pageNo = $("#pageNo"), runhead = $("#runhead");
  const chapters = $$("[data-run]");
  let lastPage = 1, lastRun = null;
  function chromeFrame() {
    const max = document.documentElement.scrollHeight - innerHeight;
    ribbon.style.setProperty("--p", clamp(scrollY / Math.max(1, max)).toFixed(4));
    const page = Math.floor(scrollY / (innerHeight * 0.9)) + 1;
    if (page !== lastPage) { lastPage = page; pageNo.textContent = page; pageNo.classList.remove("tick"); void pageNo.offsetWidth; pageNo.classList.add("tick"); }
    let run = "";
    for (const c of chapters) { const r = c.getBoundingClientRect(); if (r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.4) run = (LANG === "en" && c.dataset.runEn) || c.dataset.run; }
    if (run !== lastRun) {
      lastRun = run; runhead.classList.remove("on");
      setTimeout(() => { runhead.textContent = run; runhead.classList.toggle("on", !!run); }, 200);
    }
  }

  // ---------- III. sommaire : aperçu qui suit le pointeur ----------
  const peek = $("#peek"), peekImg = $("img", peek);
  const pk = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, on: false };
  if (finePointer && !reduce) {
    $$("#toc li").forEach((li) => {
      li.addEventListener("pointerenter", (e) => {
        const shot = li.dataset.img;
        peekImg.src = `img/${LANG}-${shot}.webp`;
        peek.classList.toggle("tall", shot.startsWith("phone"));
        if (!pk.on) { pk.x = pk.tx = e.clientX; pk.y = pk.ty = e.clientY; }
        pk.on = true; peek.classList.add("on");
      });
      li.addEventListener("pointerleave", () => { pk.on = false; peek.classList.remove("on"); });
    });
    addEventListener("pointermove", (e) => { pk.tx = e.clientX; pk.ty = e.clientY; }, { passive: true });
  }
  function peekFrame() {
    if (!pk.on && !peek.classList.contains("on")) return;
    const nx = lerp(pk.x, pk.tx, 0.14), ny = lerp(pk.y, pk.ty, 0.14);
    pk.vx = lerp(pk.vx, nx - pk.x, 0.2); pk.x = nx; pk.y = ny;
    const w = peek.offsetWidth, h = peek.offsetHeight;
    const left = Math.min(innerWidth - w - 16, pk.x + 28), top = clamp(pk.y - h / 2, 80, innerHeight - h - 16);
    peek.style.transform = `translate3d(${left}px,${top}px,0) rotate(${clamp(pk.vx * 0.6, -8, 8)}deg)`;
  }

  // ---------- V. le nom de la plateforme défile ----------
  const roll = $("#roll"), track = roll.firstElementChild;
  const items = [...track.children];
  track.append(items[0].cloneNode(true));
  let ri = 0;
  const fit = () => (roll.style.width = items[ri % items.length].getBoundingClientRect().width + "px");
  fit();
  addEventListener("resize", fit);
  if (!reduce) setInterval(() => {
    if (document.hidden) return;
    ri++;
    track.style.transition = "";
    track.style.transform = `translateY(${-ri * 1.15}em)`;
    roll.style.width = items[ri % items.length].getBoundingClientRect().width + "px";
    if (ri === items.length) setTimeout(() => { track.style.transition = "none"; ri = 0; track.style.transform = "none"; }, 850);
  }, 2000);

  // ---------- VI. les commandes se tapent ----------
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

  // ---------- boucle ----------
  let dirty = true;
  const mark = () => (dirty = true);
  addEventListener("scroll", mark, { passive: true });
  addEventListener("resize", mark);
  function frame(time) {
    if (dirty) {
      dirty = false;
      bookFrame(); syncFrame(); layoutFrame(); tiltFrame(); chromeFrame();
    }
    inkFrame(time); peekFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
