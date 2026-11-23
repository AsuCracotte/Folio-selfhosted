"use strict";
// Site de Novelia : langue (français / anglais), captures d'écran, liens de téléchargement.
(() => {
  // Ouvert comme appli (écran d'accueil, appli de bureau) ou depuis un lien reçu par mail : direction le lecteur
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone || window.folioDesktop;
  if (location.pathname === "/" && (standalone || /^#(verify|reset)=/.test(location.hash))) { location.replace("/app/" + location.hash); return; }

  const TX = window.SITE_TX;
  let saved = "";
  try { saved = localStorage.folioLang || ""; } catch (e) {}
  // langue : celle de l'adresse (?lang=, une adresse par langue pour les moteurs de recherche), sinon celle choisie, sinon celle du navigateur
  const q = new URLSearchParams(location.search).get("lang");
  const LANG = q === "fr" || q === "en" ? q : saved === "fr" || saved === "en" ? saved : /^fr/i.test(navigator.language || "") ? "fr" : "en";
  const t = (k, v = {}) => String(TX[LANG][k] ?? TX.fr[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
  document.documentElement.lang = LANG;
  if (LANG === "en") document.title = document.title.replace("Télécharger Novelia", "Download Novelia").replace("liseuse EPUB synchronisée", "the EPUB reader that syncs");
  window.FolioSite = { t, LANG };
  const has = (k) => TX[LANG][k] != null || TX.fr[k] != null;
  document.querySelectorAll("[data-t]").forEach((e) => { if (has(e.dataset.t)) e.textContent = t(e.dataset.t); });
  document.querySelectorAll("[data-th]").forEach((e) => { if (has(e.dataset.th)) e.innerHTML = t(e.dataset.th); });
  document.querySelectorAll("[data-shot]").forEach((e) => { e.src = `img/${LANG}-${e.dataset.shot}.webp`; });
  document.querySelectorAll("[data-alt]").forEach((e) => { if (has(e.dataset.alt)) e.alt = t(e.dataset.alt); });
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("on", b.dataset.l === LANG);
    b.onclick = () => { try { localStorage.folioLang = b.dataset.l; } catch (e) {} const u = new URL(location.href); u.searchParams.set("lang", b.dataset.l); location.href = u; };
  });
  const cp = document.getElementById("shCopy");
  if (cp) cp.onclick = () => {
    const txt = (document.getElementById("shCmd").dataset.full || document.getElementById("shCmd").textContent.replace(/^\$ /gm, ""));
    navigator.clipboard.writeText(txt).then(() => { cp.textContent = t("copied"); setTimeout(() => (cp.textContent = t("copy")), 1600); }, () => {});
  };
  const host = document.getElementById("host"); if (host) host.textContent = location.host;
  const nav = document.querySelector(".nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });

  // ---------- page de téléchargement ----------
  if (!document.getElementById("rec")) return;
  const ua = navigator.userAgent, plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
  const os = /Android|iPhone|iPad|iPod/i.test(ua) || (/Mac/.test(plat) && navigator.maxTouchPoints > 1) ? "phone"
    : /Win/i.test(plat) || /Windows/.test(ua) ? "win" : /Mac/i.test(plat) || /Mac OS/.test(ua) ? "mac" : /Linux|X11|CrOS/i.test(plat + ua) ? "linux" : "";
  const ver = (n) => (n.match(/(\d+\.\d+\.\d+)/) || [])[1] || "";
  const size = (b) => (b < 1048576 ? t("kb", { n: Math.max(1, Math.round(b / 1024)) }) : t("mb", { n: Math.round(b / 1048576) }));
  const KINDS = { win: /Setup.*\.exe$/i, arm: /mac-arm64\.zip$/i, intel: /mac-x64\.zip$/i, linux: /\.deb$/i };
  const btn = (f, label, pri) => `<a class="btn ${pri ? "pri" : "ghost"}" href="/dl/${encodeURIComponent(f.name)}" download><svg class="i"><use href="#i-dl"/></svg><span>${label}</span></a>`;
  fetch("/api/releases?lite=1").then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => {
    const pick = {}; for (const [k, re] of Object.entries(KINDS)) pick[k] = list.find((f) => re.test(f.name));
    const box = (k) => document.querySelector(`[data-files="${k}"]`);
    const meta = (f) => (f ? `<div class="meta" style="width:100%">${t("version", { v: ver(f.name), s: size(f.size) })}</div>` : "");
    const soon = `<span class="soon">${t("soon")}</span>`;
    box("win").innerHTML = pick.win ? btn(pick.win, t("dlWin"), true) + meta(pick.win) : soon;
    box("mac").innerHTML = pick.arm || pick.intel ? (pick.arm ? btn(pick.arm, t("dlArm"), true) : "") + (pick.intel ? btn(pick.intel, t("dlIntel"), false) : "") + meta(pick.arm || pick.intel) : soon;
    box("linux").innerHTML = pick.linux ? btn(pick.linux, t("dlDeb"), true) + meta(pick.linux) : soon;
    if (pick.linux) document.getElementById("aptCmd").textContent = `sudo apt install ./${pick.linux.name}`;
    // carte mise en avant : le système détecté
    const R = { win: ["i-win", "recWin", "recWinP", pick.win, "dlWin"], mac: ["i-mac", "recMac", "recMacP", pick.arm, "dlArm"],
      linux: ["i-linux", "recLin", "recLinP", pick.linux, "dlDeb"], phone: ["i-phone", "recPhone", "recPhoneP", null, "recBtnPhone"] }[os];
    if (R && (R[3] || os === "phone")) {
      document.getElementById("recIc").setAttribute("href", "#" + R[0]);
      document.getElementById("recT").textContent = t(R[1]); document.getElementById("recP").textContent = t(R[2]);
      const b = document.getElementById("recBtn"); document.getElementById("recL").textContent = os === "phone" ? t(R[4]) : t(R[4]);
      if (os === "phone") { b.href = "/app/"; b.querySelector("use").setAttribute("href", "#i-arrow"); }
      else { b.href = "/dl/" + encodeURIComponent(R[3].name); b.setAttribute("download", ""); document.getElementById("recM").textContent = t("version", { v: ver(R[3].name), s: size(R[3].size) }); }
      document.getElementById("rec").hidden = false;
      const card = document.querySelector(`[data-os="${os}"]`); if (card) card.classList.add("hl");
    }
    const newest = list[0];
    if (newest) document.getElementById("vers").textContent = t("latest", { v: ver(newest.name),
      d: new Date(newest.date * 1000).toLocaleDateString(LANG === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) });
  });
})();
