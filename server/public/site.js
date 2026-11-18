"use strict";
// Site de Folio : langue (français / anglais), captures d'écran, liens de téléchargement.
(() => {
  // Ouvert comme appli (écran d'accueil, appli de bureau) ou depuis un lien reçu par mail : direction le lecteur
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone || window.folioDesktop;
  if (location.pathname === "/" && (standalone || /^#(verify|reset)=/.test(location.hash))) { location.replace("/app/" + location.hash); return; }

  const TX = {
    fr: {
      navFeatures: "Fonctionnalités", navDownload: "Télécharger", navOpen: "Ouvrir Folio", home: "Accueil",
      pillNew: "Nouveau", pill: "Collections, couvertures perso et appli Windows / Mac",
      h1: "Vos livres. Partout.<br><em>Magnifiquement.</em>",
      lead: "Folio est une liseuse EPUB élégante et sans publicité. Lisez dans votre navigateur, sur votre téléphone ou avec l’appli pour Windows, macOS et Linux : votre page, vos notes et vos collections vous suivent.",
      ctaRead: "Commencer à lire", ctaDl: "Télécharger l’appli", ctaDl2: "Télécharger",
      free: "Gratuit · rien à installer pour commencer · fonctionne hors ligne",
      fKicker: "Tout pour bien lire", fTitle: "Pensée pour la lecture, pas pour les distractions",
      fSub: "Une interface calme, des réglages fins et vos livres toujours à portée de main.",
      f1t: "Reprenez où vous étiez", f1p: "Commencez un chapitre sur l’ordinateur, finissez-le dans le métro : la page, les marque-pages et les surlignages se synchronisent.",
      f2t: "Collections", f2p: "Rangez vos livres par série, par genre ou par envie, et donnez-leur la couverture de votre choix — même une illustration du livre.",
      f3t: "Surlignages et notes", f3p: "Quatre couleurs, une carte du livre pour retrouver vos passages, et l’export de vos citations en un clic.",
      f4t: "Votre mise en page", f4p: "Sept thèmes dont sépia et nuit, polices de lecture, taille, interligne, marges, pages ou défilement continu.",
      f5t: "Même hors ligne", f5p: "Vos livres sont stockés sur l’appareil : l’avion, le train ou la plage ne vous arrêtent pas.",
      f6t: "Privé et sécurisé", f6p: "Ni publicité, ni pistage, ni revente de données. Votre compte est protégé par la double authentification.",
      s1k: "Lecture", s1t: "Une page qui ressemble à un livre", s1p: "Texte centré à la bonne largeur, typographie soignée, pages qui se tournent d’un geste.",
      s1a: "Balayez pour tourner, pincez pour changer la taille", s1b: "Polices pensées pour la lecture (Literata, Lora, Atkinson…)", s1c: "Thèmes clair, sépia, sombre, noir pour les écrans OLED",
      s2k: "Notes", s2t: "Retrouvez chaque passage marquant", s2p: "Toutes vos notes, classées par chapitre, avec leur place sur la carte du livre.",
      s2a: "Filtrez par couleur ou par type", s2b: "Copiez une citation avec son titre", s2c: "Exportez tous vos surlignages en Markdown",
      pK: "Sur tous vos appareils", pT: "Un compte, toutes vos plateformes",
      pS: "Installez l’appli sur votre ordinateur, ajoutez Folio à l’écran d’accueil de votre téléphone, ou lisez directement dans le navigateur.",
      pWin: "10 et 11", pMac: "Apple Silicon et Intel", pLin: "Debian, Ubuntu…", pPhoneT: "Téléphone", pWebT: "Navigateur", pWeb: "Rien à installer",
      shK: "Open source", shT: "Hébergez votre propre Folio",
      shP: "Le code est libre (licence MIT). Installez le serveur chez vous — un Raspberry Pi suffit — et gardez vos livres et vos notes sur votre propre machine.",
      sh1: "Installation en une commande avec Docker", sh2: "Site, lecteur et applis Windows, macOS et Linux inclus", sh3: "Vos données ne quittent jamais votre serveur",
      copy: "Copier", copied: "Copié !",
      shBtn: "Voir le code sur GitHub", selfLink: "Auto-hébergement", selfNote: "Vous préférez votre propre serveur ?", selfNoteLink: "Folio est open source et auto-hébergeable",
      ctaT: "Votre prochaine lecture vous attend", ctaP: "Glissez un fichier EPUB dans Folio et commencez tout de suite.",
      // téléchargements
      dlK: "Téléchargement", dlT: "Folio sur votre appareil",
      dlS: "Les applis utilisent le même compte que le site : connectez-vous et retrouvez vos livres, vos notes et vos collections.",
      winReq: "Windows 10 et 11, 64 bits", macReq: "macOS 13 Ventura ou plus récent", linReq: "Debian, Ubuntu, Mint, Kali… (paquet .deb, GTK 4)",
      phT: "Android et iPhone", phReq: "Depuis le navigateur, sans store", howInstall: "Comment installer",
      win1: "Lancez le fichier téléchargé.",
      win2: "Si Windows affiche « Windows a protégé votre ordinateur », cliquez sur <b>Informations complémentaires</b> puis <b>Exécuter quand même</b> (l’appli n’est pas encore signée).",
      win3: "Choisissez le dossier d’installation, puis ouvrez Folio depuis le menu Démarrer.",
      mac0: "Choisissez <b>Apple Silicon</b> pour un Mac M1, M2, M3 ou plus récent, <b>Intel</b> pour un Mac plus ancien (menu Pomme › À propos de ce Mac).",
      mac1: "Ouvrez le fichier .zip et glissez <b>Folio</b> dans le dossier <b>Applications</b>.",
      mac2: "L’appli n’est pas encore signée par Apple : avant la première ouverture, collez ces deux commandes dans le Terminal.",
      lin1: "Installez le paquet téléchargé avec apt (les dépendances sont ajoutées automatiquement) :", lin2: "Ouvrez Folio depuis le menu des applications.",
      ph1: "<b>Android (Chrome)</b> : ouvrez Folio, menu ⋮ › <b>Installer l’application</b> (ou « Ajouter à l’écran d’accueil »).",
      ph2: "<b>iPhone / iPad (Safari)</b> : ouvrez Folio, bouton Partager › <b>Sur l’écran d’accueil</b>.",
      ph3: "Folio s’ouvre alors en plein écran, comme une appli, et fonctionne hors ligne.",
      srcNote: "Pas envie d’installer quoi que ce soit ? Folio fonctionne aussi directement dans le navigateur.",
      dlWin: "Télécharger pour Windows", dlArm: "Apple Silicon", dlIntel: "Intel", dlDeb: "Télécharger le .deb", soon: "Bientôt disponible",
      recWin: "Folio pour Windows", recMac: "Folio pour macOS", recLin: "Folio pour Linux", recPhone: "Folio sur votre téléphone",
      recWinP: "Pour Windows 10 et 11.", recMacP: "Version Apple Silicon (M1 et suivants). Mac Intel : voir plus bas.", recLinP: "Paquet .deb pour Debian, Ubuntu et dérivées.",
      recPhoneP: "Ajoutez Folio à votre écran d’accueil : il s’ouvre comme une appli et fonctionne hors ligne.",
      recBtnPhone: "Ouvrir Folio", version: "Version {v} · {s}", mb: "{n} Mo", kb: "{n} Ko", latest: "Dernière version : {v}, publiée le {d}.",
    },
    en: {
      navFeatures: "Features", navDownload: "Download", navOpen: "Open Folio", home: "Home",
      pillNew: "New", pill: "Collections, custom covers and Windows / Mac apps",
      h1: "Your books. Everywhere.<br><em>Beautifully.</em>",
      lead: "Folio is an elegant, ad-free EPUB reader. Read in your browser, on your phone or with the app for Windows, macOS and Linux: your page, notes and collections follow you.",
      ctaRead: "Start reading", ctaDl: "Download the app", ctaDl2: "Download",
      free: "Free · nothing to install to get started · works offline",
      fKicker: "Everything for reading", fTitle: "Made for reading, not for distractions",
      fSub: "A calm interface, fine-grained settings and your books always at hand.",
      f1t: "Pick up where you left off", f1p: "Start a chapter on your computer, finish it on the train: your page, bookmarks and highlights stay in sync.",
      f2t: "Collections", f2p: "Group your books by series, genre or mood, and give them the cover you like — even an illustration from the book.",
      f3t: "Highlights and notes", f3p: "Four colours, a map of the book to find your passages again, and one-click export of your quotes.",
      f4t: "Your layout", f4p: "Seven themes including sepia and night, reading fonts, size, line spacing, margins, pages or continuous scrolling.",
      f5t: "Even offline", f5p: "Your books are stored on the device: planes, trains and beaches won’t stop you.",
      f6t: "Private and secure", f6p: "No ads, no tracking, no selling of data. Your account is protected by two-factor authentication.",
      s1k: "Reading", s1t: "A page that feels like a book", s1p: "Text centred at the right width, careful typography, pages that turn with a swipe.",
      s1a: "Swipe to turn pages, pinch to change the size", s1b: "Fonts designed for reading (Literata, Lora, Atkinson…)", s1c: "Light, sepia, dark and true-black themes for OLED screens",
      s2k: "Notes", s2t: "Find every memorable passage", s2p: "All your notes, sorted by chapter, with their place on the map of the book.",
      s2a: "Filter by colour or by type", s2b: "Copy a quote with its title", s2c: "Export all your highlights as Markdown",
      pK: "On all your devices", pT: "One account, all your platforms",
      pS: "Install the app on your computer, add Folio to your phone’s home screen, or read right in the browser.",
      pWin: "10 and 11", pMac: "Apple Silicon and Intel", pLin: "Debian, Ubuntu…", pPhoneT: "Phone", pWebT: "Browser", pWeb: "Nothing to install",
      shK: "Open source", shT: "Host your own Folio",
      shP: "The code is free (MIT licence). Run the server at home — a Raspberry Pi is enough — and keep your books and notes on your own machine.",
      sh1: "One-command install with Docker", sh2: "Website, reader and Windows, macOS and Linux apps included", sh3: "Your data never leaves your server",
      copy: "Copy", copied: "Copied!",
      shBtn: "View the code on GitHub", selfLink: "Self-hosting", selfNote: "Prefer your own server?", selfNoteLink: "Folio is open source and self-hostable",
      ctaT: "Your next read is waiting", ctaP: "Drop an EPUB file into Folio and start right away.",
      dlK: "Download", dlT: "Folio on your device",
      dlS: "The apps use the same account as the website: sign in to get your books, notes and collections.",
      winReq: "Windows 10 and 11, 64-bit", macReq: "macOS 13 Ventura or later", linReq: "Debian, Ubuntu, Mint, Kali… (.deb package, GTK 4)",
      phT: "Android and iPhone", phReq: "From the browser, no app store", howInstall: "How to install",
      win1: "Run the downloaded file.",
      win2: "If Windows shows “Windows protected your PC”, click <b>More info</b> then <b>Run anyway</b> (the app isn’t signed yet).",
      win3: "Choose the install folder, then open Folio from the Start menu.",
      mac0: "Choose <b>Apple Silicon</b> for an M1, M2, M3 or newer Mac, <b>Intel</b> for an older Mac (Apple menu › About This Mac).",
      mac1: "Open the .zip file and drag <b>Folio</b> into the <b>Applications</b> folder.",
      mac2: "The app isn’t signed by Apple yet: before opening it the first time, paste these two commands into Terminal.",
      lin1: "Install the downloaded package with apt (dependencies are added automatically):", lin2: "Open Folio from the applications menu.",
      ph1: "<b>Android (Chrome)</b>: open Folio, ⋮ menu › <b>Install app</b> (or “Add to Home screen”).",
      ph2: "<b>iPhone / iPad (Safari)</b>: open Folio, Share button › <b>Add to Home Screen</b>.",
      ph3: "Folio then opens full screen, like an app, and works offline.",
      srcNote: "Don’t want to install anything? Folio also works right in the browser.",
      dlWin: "Download for Windows", dlArm: "Apple Silicon", dlIntel: "Intel", dlDeb: "Download the .deb", soon: "Coming soon",
      recWin: "Folio for Windows", recMac: "Folio for macOS", recLin: "Folio for Linux", recPhone: "Folio on your phone",
      recWinP: "For Windows 10 and 11.", recMacP: "Apple Silicon version (M1 and later). Intel Mac: see below.", recLinP: ".deb package for Debian, Ubuntu and derivatives.",
      recPhoneP: "Add Folio to your home screen: it opens like an app and works offline.",
      recBtnPhone: "Open Folio", version: "Version {v} · {s}", mb: "{n} MB", kb: "{n} KB", latest: "Latest version: {v}, released on {d}.",
    },
  };
  let saved = "";
  try { saved = localStorage.folioLang || ""; } catch (e) {}
  const LANG = saved === "fr" || saved === "en" ? saved : /^fr/i.test(navigator.language || "") ? "fr" : "en";
  const t = (k, v = {}) => String(TX[LANG][k] ?? TX.fr[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
  document.documentElement.lang = LANG;
  if (LANG === "en") document.title = document.title.replace("Télécharger Folio", "Download Folio").replace("liseuse EPUB synchronisée", "the EPUB reader that syncs");
  const has = (k) => TX[LANG][k] != null || TX.fr[k] != null;
  document.querySelectorAll("[data-t]").forEach((e) => { if (has(e.dataset.t)) e.textContent = t(e.dataset.t); });
  document.querySelectorAll("[data-th]").forEach((e) => { if (has(e.dataset.th)) e.innerHTML = t(e.dataset.th); });
  document.querySelectorAll("[data-shot]").forEach((e) => { e.src = `img/${LANG}-${e.dataset.shot}.webp`; });
  document.querySelectorAll(".lang button").forEach((b) => {
    b.classList.toggle("on", b.dataset.l === LANG);
    b.onclick = () => { try { localStorage.folioLang = b.dataset.l; } catch (e) {} location.reload(); };
  });
  const cp = document.getElementById("shCopy");
  if (cp) cp.onclick = () => {
    const txt = document.getElementById("shCmd").textContent.replace(/^\$ /gm, "");
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
  fetch("/api/releases").then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list) => {
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
