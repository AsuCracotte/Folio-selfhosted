/* Folio — lecture à voix haute, partagée entre le site (PWA, Windows/Mac) et l'app Linux.
   Les voix (Piper) sont calculées par le serveur Folio du compte ; la phrase lue est surlignée et la page suit.
   FolioVoice.create(hôte) : voir « hôte » plus bas. Utilise les variables CSS --bg --fg --ac --acfg --muted --line --soft. */
window.FolioVoice = (() => {
  const TX = {
    fr: { listen: "Lecture à voix haute", play: "Lire", pause: "Pause", prev: "Phrase précédente", next: "Phrase suivante", close: "Arrêter la lecture",
      voice: "Voix", speed: "Vitesse", loading: "Préparation de la voix…", needAccount: "La lecture à voix haute utilise les voix de votre serveur Folio : connectez-vous à votre compte.",
      login: "Se connecter", noVoices: "Aucune voix installée sur votre serveur Folio.", fail: "Voix indisponible pour le moment", end: "Fin du livre", tap: "Touchez un paragraphe pour lire à partir de là",
      fr: "Français", en: "English", f: "femme", m: "homme", natural: "voix naturelles", local: "voix de secours (Piper)",
      siwis: "Élise", jessica: "Jessica", pierre: "Pierre", tom: "Tom", gilles: "Gilles", lessac: "Linda", kristin: "Kristin", ryan: "Ryan", northern: "Oliver",
      d_siwis: "claire", d_jessica: "douce", d_pierre: "posé", d_tom: "chaleureux", d_gilles: "grave", d_lessac: "expressive", d_kristin: "douce", d_ryan: "neutre", d_northern: "chaleureux, accent anglais" },
    en: { listen: "Read aloud", play: "Play", pause: "Pause", prev: "Previous sentence", next: "Next sentence", close: "Stop reading",
      voice: "Voice", speed: "Speed", loading: "Preparing the voice…", needAccount: "Read aloud uses the voices of your Folio server: sign in to your account.",
      login: "Sign in", noVoices: "No voice installed on your Folio server.", fail: "Voice unavailable right now", end: "End of the book", tap: "Tap a paragraph to read from there",
      fr: "Français", en: "English", f: "woman", m: "man", natural: "natural voices", local: "backup voices (Piper)",
      siwis: "Élise", jessica: "Jessica", pierre: "Pierre", tom: "Tom", gilles: "Gilles", lessac: "Linda", kristin: "Kristin", ryan: "Ryan", northern: "Oliver",
      d_siwis: "clear", d_jessica: "soft", d_pierre: "calm", d_tom: "warm", d_gilles: "deep", d_lessac: "expressive", d_kristin: "soft", d_ryan: "neutral", d_northern: "warm, British accent" },
  };
  const ICON = { play: "M7 4.5v15l12-7.5z", pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z", prev: "M6 6h2.2v12H6zM19 6v12L9.5 12z", next: "M15.8 6H18v12h-2.2zM5 6v12l9.5-6z", x: "M6 6l12 12M18 6L6 18" };
  const ic = (n, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="fv-i${fill ? " fill" : ""}"><path d="${ICON[n]}"/></svg>`;
  const CSS = `.fv{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 54px);transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:4px;
 background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:6px 8px;box-shadow:0 10px 30px -8px rgba(0,0,0,.35);max-width:calc(100% - 24px);font:14px system-ui,sans-serif}
.fv[hidden]{display:none}.fv button{width:38px;height:38px;border:0;border-radius:50%;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;flex:none}
.fv button:hover{background:var(--soft)}.fv .pp{background:var(--ac);color:var(--acfg);width:44px;height:44px}.fv .pp:hover{background:var(--ac);filter:brightness(1.08)}
.fv-i{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.fv-i.fill{fill:currentColor;stroke:none}
.fv select{border:0;background:var(--soft);color:inherit;border-radius:999px;padding:8px 10px;font:inherit;min-width:0;max-width:220px}
.fv .msg{padding:0 10px;max-width:340px;line-height:1.35;font-size:13px}.fv .msg button{display:inline;width:auto;height:auto;border-radius:999px;padding:6px 12px;margin-left:6px;background:var(--ac);color:var(--acfg);font-weight:600}
.fv .st{font-size:12px;color:var(--muted);padding:0 6px;white-space:nowrap}.fv .st:not(:empty){position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis;padding:6px 12px;border-radius:99px;background:var(--card,#fff);color:var(--fg,#222);box-shadow:0 4px 14px rgba(0,0,0,.15)}
.fv.busy .pp{animation:fvp 1s ease-in-out infinite}@keyframes fvp{50%{opacity:.55}}
@media (max-width:600px){.fv{bottom:calc(env(safe-area-inset-bottom) + 50px)}.fv select{max-width:46vw}.fv .sp{display:none}}`;
  const BLOCK = "p,h1,h2,h3,h4,h5,h6,li,blockquote,dd,dt,figcaption,pre,td,th,div";
  const MAXC = 260, MERGE = 150;   // phrases courtes regroupées (~2 s de voix) : la voix démarre vite et le serveur garde de l'avance

  /* hôte = { root (élément où poser la barre), get() → { book, rend, title, author },
              voices() → Promise<[{id, lang, g}] | null (pas de compte)>, speak(voix, texte) → Promise<Blob>,
              login() (ouvre le compte), lang } */
  function create(host) {
    const L = host.lang === "en" ? "en" : "fr", t = (k) => TX[L][k] ?? TX.fr[k] ?? k;
    if (!document.getElementById("fv-css")) document.head.append(Object.assign(document.createElement("style"), { id: "fv-css", textContent: CSS }));
    const bar = document.createElement("div"); bar.className = "fv"; bar.hidden = true; host.root.append(bar);
    const au = new Audio(); au.preservesPitch = true;
    let on = false, playing = false, paused = null, voices = null, voice = "", speed = 1, pos = null, cache = new Map(), gen = 0, url = null;
    try { const p = JSON.parse(localStorage.folioVoice || "{}"); speed = +p.speed || 1; voice = p.voice || ""; } catch (e) {}
    const savePref = () => { try { localStorage.folioVoice = JSON.stringify({ voice, speed }); } catch (e) {} };

    // ---- texte du livre : blocs (paragraphes, titres…) découpés en morceaux de phrases ----
    const R = () => host.get().rend, B = () => host.get().book;
    const contentsOf = (idx) => (R()?.getContents() || []).find((c) => c.sectionIndex === idx);
    function blocks(doc) {
      return [...doc.body.querySelectorAll(BLOCK)].filter((el) => !el.querySelector(BLOCK) && /[\p{L}\p{N}]/u.test(el.textContent));
    }
    function chunks(text) {
      const out = [], re = /[^.!?…;:]*[.!?…;:]+[»”"')\]\s]*|[^.!?…;:]+$/g;
      let m, cur = null;
      while ((m = re.exec(text)) && m[0]) {
        let s = m.index, e = m.index + m[0].length;
        // phrase trop longue : coupée aux virgules ou aux espaces
        while (e - s > MAXC) {
          const part = text.slice(s, s + MAXC), cut = Math.max(part.lastIndexOf(", "), part.lastIndexOf(" ")) + 1 || MAXC;
          if (cur) { out.push(cur); cur = null; } out.push([s, s + cut]); s += cut;
        }
        if (cur && e - cur[0] <= MERGE) cur[1] = e; else { if (cur) out.push(cur); cur = [s, e]; }
      }
      if (cur) out.push(cur);
      return out.filter(([s, e]) => /[\p{L}\p{N}]/u.test(text.slice(s, e)));
    }
    function rangeOf(el, s, e) {
      const w = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = el.ownerDocument.createRange();
      let n, at = 0, started = false;
      while ((n = w.nextNode())) {
        const len = n.data.length;
        if (!started && s <= at + len) { r.setStart(n, Math.max(0, s - at)); started = true; }
        if (started && e <= at + len) { r.setEnd(n, Math.max(0, e - at)); return r; }
        at += len;
      }
      if (started) r.setEndAfter(el.lastChild || el); return started ? r : null;
    }
    // position = { sec, b (bloc), k (morceau) } ; elle donne le texte et le Range dans la page affichée
    function item(p) {
      const c = contentsOf(p.sec); if (!c) return null;
      const bl = blocks(c.document)[p.b]; if (!bl) return null;
      const text = bl.textContent, ch = chunks(text)[p.k]; if (!ch) return null;
      return { c, el: bl, s: ch[0], e: ch[1], text: text.slice(ch[0], ch[1]).replace(/\s+/g, " ").trim() };
    }
    function step(p, by) {
      const c = contentsOf(p.sec); if (!c) return null;
      const bs = blocks(c.document);
      let { b, k } = p; k += by;
      while (b >= 0 && b < bs.length) {
        const n = chunks(bs[b].textContent).length;
        if (k >= 0 && k < n) return { sec: p.sec, b, k };
        if (by > 0) { b++; k = 0; } else { b--; k = b >= 0 ? chunks(bs[b].textContent).length - 1 : 0; }
      }
      return { sec: p.sec + (by > 0 ? 1 : -1), b: by > 0 ? 0 : -1, k: 0, cross: true };
    }
    // départ : le premier morceau de phrase réellement visible à l'écran (défilement ou pages) ; à défaut, la position du lecteur
    function seen() {
      const r = R(), V = r?.manager?.container?.getBoundingClientRect(); if (!V) return null;
      for (const c of r.getContents()) {
        const f = c.window.frameElement?.getBoundingClientRect(); if (!f) continue;
        const bs = blocks(c.document);
        for (let b = 0; b < bs.length; b++) {
          const q = bs[b].getBoundingClientRect();
          if (f.top + q.bottom <= V.top + 8 || f.top + q.top >= V.bottom - 8 || f.left + q.right <= V.left || f.left + q.left >= V.right) continue;
          const ch = chunks(bs[b].textContent);
          let k = ch.findIndex(([s, e]) => { const x = rangeOf(bs[b], s, e)?.getClientRects()[0]; return x && f.top + x.top >= V.top - 2 && f.left + x.left >= V.left - 2 && f.left + x.left < V.right; });
          return { sec: c.sectionIndex, b, k: Math.max(0, k) };
        }
      }
      return null;
    }
    // un paragraphe touché pendant la lecture : on lit à partir de la phrase touchée
    let hooked = null, hinted = false;
    function onTap(e) {
      if (!on || !voices?.length) return;
      const doc = e.target?.ownerDocument, c = (R()?.getContents() || []).find((x) => x.document === doc); if (!c) return;
      if (String(c.window.getSelection?.() || "").trim() || e.target.closest?.("a")) return;
      const bs = blocks(doc), el = e.target.closest?.(BLOCK), b = bs.indexOf(el); if (b < 0) return;
      let k = 0;
      try { const cr = doc.caretRangeFromPoint?.(e.clientX, e.clientY); if (cr && el.contains(cr.startContainer)) {
        const pre = doc.createRange(); pre.setStart(el, 0); pre.setEnd(cr.startContainer, cr.startOffset); const off = pre.toString().length;
        k = Math.max(0, chunks(el.textContent).findIndex(([, x]) => x > off)); } } catch (err) {}
      paused = null; playing = true; paint(); playAt({ sec: c.sectionIndex, b, k });
    }
    function here() {
      const r = R(), l = r?.currentLocation?.(); if (!l?.start) return null;
      const c = contentsOf(l.start.index) || r.getContents()[0]; if (!c) return null;
      let node = null; try { node = c.range(l.start.cfi).startContainer; } catch (e) {}
      const bs = blocks(c.document);
      let b = node ? bs.findIndex((el) => el.contains(node) || !!(node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) : 0;
      if (b < 0) b = 0;
      let k = 0;
      if (node && bs[b]?.contains(node)) {
        try { const pre = c.document.createRange(); pre.setStart(bs[b], 0); pre.setEnd(node, c.range(l.start.cfi).startOffset); const off = pre.toString().length;
          k = Math.max(0, chunks(bs[b].textContent).findIndex(([, e]) => e > off)); } catch (e) {}
      }
      return { sec: c.sectionIndex, b, k };
    }
    // chapitre suivant / précédent : affiché puis on continue (les sections sans texte sont sautées)
    async function cross(p) {
      const book = B(), n = book.spine.spineItems.length;
      for (let i = p.sec; i >= 0 && i < n; i += p.b < 0 ? -1 : 1) {
        const sec = book.spine.get(i); if (!sec || sec.linear === false || sec.linear === "no") continue;
        await R().display(sec.href);
        const c = contentsOf(i); if (!c) continue;
        const bs = blocks(c.document); if (!bs.length) continue;
        if (p.b < 0) { const b = bs.length - 1; return { sec: i, b, k: chunks(bs[b].textContent).length - 1 }; }
        return { sec: i, b: 0, k: 0 };
      }
      return null;
    }

    // ---- audio : morceau courant + 4 d'avance, demandés au serveur ----
    const key = (p) => `${voice}|${p.sec}|${p.b}|${p.k}`;
    function fetchAudio(p) {
      const it = item(p); if (!it) return null;
      const k = key(p);
      if (!cache.has(k)) { const pr = host.speak(voice, it.text); pr.catch(() => cache.delete(k)); cache.set(k, pr); }
      return cache.get(k);
    }
    function prefetch(p) {
      let q = p;
      for (let i = 0; i < 4; i++) { q = step(q, 1); if (!q || q.cross) break; fetchAudio(q); }
      if (cache.size > 40) [...cache.keys()].slice(0, cache.size - 40).forEach((k) => cache.delete(k));
    }
    function mark(it) {
      const w = it.c.window, d = it.c.document;
      if (!d.getElementById("fv-hl")) d.head.append(Object.assign(d.createElement("style"), { id: "fv-hl", textContent: "::highlight(fv){background-color:rgba(124,104,230,.3);color:inherit}" }));
      const r = rangeOf(it.el, it.s, it.e); if (!r) return;
      try { if (w.Highlight && w.CSS?.highlights) w.CSS.highlights.set("fv", new w.Highlight(r)); } catch (e) {}
      // la page suit la voix
      const rend = R(), V = rend.manager?.container?.getBoundingClientRect(), f = w.frameElement.getBoundingClientRect(), q = r.getClientRects()[0] || r.getBoundingClientRect();
      if (!V) return;
      const x = f.left + q.left, y = f.top + q.top;
      if (rend.settings.flow === "scrolled" || rend.settings.flow === "scrolled-doc") {
        if (y < V.top || y + q.height > V.bottom - 40) rend.manager.container.scrollBy({ top: y - V.top - V.height * .3, behavior: "smooth" });
      } else if (x < V.left - 2 || x >= V.right - 2) { try { rend.display(it.c.cfiFromRange(r)); } catch (e) {} }
    }
    function unmark() { (R()?.getContents() || []).forEach((c) => { try { c.window.CSS?.highlights?.delete("fv"); } catch (e) {} }); }

    async function playAt(p) {
      const g = ++gen;
      if (p && p.cross) p = await cross(p);
      if (g !== gen) return;
      if (!p) { stopAudio(); playing = false; paint(); unmark(); status(t("end")); return; }
      pos = p;
      const it = item(p);
      if (!it) { return playAt(step(p, 1)); }
      bar.classList.add("busy");
      let blob;
      try { blob = await fetchAudio(p); }
      catch (e) { try { cache.delete(key(p)); blob = await fetchAudio(p); } catch (e2) { if (g === gen) { playing = false; bar.classList.remove("busy"); paint(); status(t("fail")); } return; } }
      if (g !== gen || !playing) return;
      bar.classList.remove("busy"); status(hinted ? "" : t("tap")); if (!hinted) { hinted = true; setTimeout(() => status(""), 6000); }
      mark(it); prefetch(p);
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob); au.src = url; au.playbackRate = speed;
      // paragraphe suivant : courte respiration (les silences des moteurs sont retirés côté serveur) ; même paragraphe : enchaîné
      au.onended = () => { if (g !== gen || !playing) return; const n = step(pos, 1);
        if (n && !n.cross && n.b === pos.b) playAt(n); else setTimeout(() => { if (g === gen && playing) playAt(n); }, 160); };
      try { await au.play(); } catch (e) { playing = false; paint(); }
    }
    function stopAudio() { gen++; au.pause(); au.removeAttribute("src"); try { au.load(); } catch (e) {} }

    // ---- barre ----
    const label = (v) => v.hd ? `${v.name} · ${t(v.g)}${v.region && v.lang === "en" ? " (" + v.region + ")" : ""}` : `${t(v.id)} · ${t(v.g)}, ${t("d_" + v.id)}`;
    function status(s) { const el = bar.querySelector(".st"); if (el) el.textContent = s; }
    function paint() {
      const pp = bar.querySelector(".pp"); if (!pp) return;
      pp.innerHTML = ic(playing ? "pause" : "play", true); pp.title = t(playing ? "pause" : "play");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
    async function render() {
      bar.innerHTML = `<span class="msg">${t("loading")}</span>`;
      try { voices = await host.voices(); } catch (e) { voices = []; }
      if (!on) return;
      if (voices == null) {
        bar.innerHTML = `<span class="msg">${t("needAccount")}<button class="lg">${t("login")}</button></span><button class="x" title="${t("close")}">${ic("x")}</button>`;
        bar.querySelector(".lg").onclick = () => { api.stop(); host.login?.(); };
        bar.querySelector(".x").onclick = () => api.stop(); return;
      }
      if (!voices.length) { bar.innerHTML = `<span class="msg">${t("noVoices")}</span><button class="x">${ic("x")}</button>`; bar.querySelector(".x").onclick = () => api.stop(); return; }
      const bl = String(B()?.packaging?.metadata?.language || L).slice(0, 2).toLowerCase();
      // voix choisie si elle parle la langue du livre, sinon une voix naturelle (femme d'abord) de cette langue
      if (!voices.some((v) => v.id === voice && v.lang === bl))
        voice = (voices.find((v) => v.lang === bl && v.hd && v.g === "f") || voices.find((v) => v.lang === bl) || voices.find((v) => v.id === voice) || voices[0]).id;
      const groups = [];
      for (const v of voices) { const k = v.lang + (v.hd ? "1" : "0"); let g = groups.find((x) => x.k === k); if (!g) groups.push(g = { k, label: `${t(v.lang)} — ${t(v.hd ? "natural" : "local")}`, list: [] }); g.list.push(v); }
      bar.innerHTML = `<button class="pv" title="${t("prev")}">${ic("prev", true)}</button><button class="pp"></button><button class="nx" title="${t("next")}">${ic("next", true)}</button>
<select class="vo" title="${t("voice")}">${groups.map((g) => `<optgroup label="${g.label}">${g.list.map((v) => `<option value="${v.id}">${label(v)}</option>`).join("")}</optgroup>`).join("")}</select>
<select class="sp" title="${t("speed")}">${[0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75].map((s) => `<option value="${s}">${String(s).replace(".", L === "fr" ? "," : ".")}×</option>`).join("")}</select>
<span class="st"></span><button class="x" title="${t("close")}">${ic("x")}</button>`;
      const vo = bar.querySelector(".vo"), sp = bar.querySelector(".sp");
      vo.value = voice; sp.value = String(speed); if (sp.value !== String(speed)) { speed = 1; sp.value = "1"; }
      vo.onchange = () => { voice = vo.value; savePref(); cache.clear(); if (playing) playAt(pos); };
      sp.onchange = () => { speed = +sp.value; au.playbackRate = speed; savePref(); };
      bar.querySelector(".pp").onclick = () => api.toggle();
      bar.querySelector(".pv").onclick = () => { if (pos) { playing = true; paint(); playAt(step(pos, -1)); } };
      bar.querySelector(".nx").onclick = () => { if (pos) { playing = true; paint(); playAt(step(pos, 1)); } };
      bar.querySelector(".x").onclick = () => api.stop();
      paint(); api.toggle();
    }
    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession, h = (a, f) => { try { ms.setActionHandler(a, () => on && f()); } catch (e) {} };
      h("play", () => !playing && api.toggle()); h("pause", () => playing && api.toggle());
      h("nexttrack", () => pos && playAt(step(pos, 1))); h("previoustrack", () => pos && playAt(step(pos, -1)));
    }

    const api = {
      get on() { return on; },
      get pos() { return pos; },
      // ouvre la barre et lit depuis la page affichée ; rappelé : lecture / pause
      open() {
        if (on) return api.toggle(); on = true; bar.hidden = false; pos = null; hinted = false;
        const r = R(); if (r && r !== hooked) { r.on("click", onTap); hooked = r; }
        render();
      },
      toggle() {
        if (!on) return api.open();
        if (!voices || !voices.length) return;
        if (playing) { playing = false; au.pause(); gen++; paused = R()?.currentLocation?.()?.start?.cfi || null; paint(); return; }
        playing = true; paint();
        const { title, author } = host.get();
        if ("mediaSession" in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: title || "", artist: author || "" });
        // reprise au même endroit si la page n'a pas changé, sinon depuis la page affichée
        if (pos && paused && paused === R()?.currentLocation?.()?.start?.cfi && au.currentTime > 0 && !au.ended) {
          const g = ++gen; au.onended = () => { if (g === gen && playing) playAt(step(pos, 1)); }; au.play().catch(() => {}); paused = null; return;
        }
        paused = null; playAt(seen() || here() || pos || { sec: 0, b: 0, k: 0 });
      },
      stop() { on = false; playing = false; stopAudio(); unmark(); bar.hidden = true; pos = null; cache.clear(); if ("mediaSession" in navigator) navigator.mediaSession.metadata = null; },
    };
    return api;
  }
  return { create };
})();
