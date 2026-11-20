"use strict";
// Site de Folio : langue (français / anglais), captures d'écran, liens de téléchargement.
(() => {
  // Ouvert comme appli (écran d'accueil, appli de bureau) ou depuis un lien reçu par mail : direction le lecteur
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone || window.folioDesktop;
  if (location.pathname === "/" && (standalone || /^#(verify|reset)=/.test(location.hash))) { location.replace("/app/" + location.hash); return; }

  const TX = {
    fr: {
      navFeatures: "Fonctionnalités", navToc: "Fonctionnalités", navDownload: "Télécharger", navOpen: "Ouvrir Folio", home: "Accueil", pillNew: "Nouveau",
      eyebrow: "Liseuse EPUB · sans publicité", h1a: "Vos livres.", h1b: "Partout.", h1c: "Magnifiquement.",
      lead: "Folio est une liseuse EPUB élégante et sans publicité. Lisez dans votre navigateur, sur votre téléphone ou avec l’appli pour Windows, macOS et Linux : votre page, vos notes et vos collections vous suivent.",
      ctaRead: "Commencer à lire", ctaDl: "Télécharger l’appli", ctaDl2: "Télécharger",
      free: "Gratuit · rien à installer pour commencer · fonctionne hors ligne",
      coverSub: "Tome I · Vos livres", coverHint: "Faites défiler pour ouvrir", exlibris: "Ce livre appartient à… vous.",
      c1k: "Synchronisation", c1t: "Reprenez où vous étiez.",
      c1text: "L’année 1866 fut marquée par un événement bizarre, un phénomène inexpliqué et inexplicable que personne n’a sans doute oublié. Sans parler des rumeurs qui agitaient les populations des ports, les gens de mer furent particulièrement émus.",
      dPc: "Ordinateur", pPhoneT: "Téléphone", pWebT: "Navigateur",
      c2k: "Mise en page", c2t: "Cette page se règle comme un livre.",
      c2p: "Changez le thème, la police ou la taille : c’est tout le site qui se recompose, comme vos livres dans Folio. Là-bas, il y a en plus sept thèmes, l’interligne, les marges, pages ou défilement continu.",
      tsTheme: "Thème", tsFont: "Police", tsSize: "Taille", tsReset: "Rétablir", tsAuto: "Auto", tsS: "Petit", tsM: "Moyen", tsL: "Grand",
      c4try: "Essayez : <b>sélectionnez</b> n’importe quelle phrase de cette page.",
      dockAa: "Mise en page", dockNotes: "Vos notes", notesT: "Vos notes", notesEmpty: "Sélectionnez une phrase de cette page pour la surligner : elle apparaîtra ici, rangée par section.",
      notesMd: "Copier en Markdown", notesCopied: "Copié", notesLocal: "Gardées sur cet appareil. Dans Folio, vos notes vous suivent sur tous vos appareils.",
      hlDel: "Retirer le surlignage", hlColor: "Surligner en {c}", c_y: "jaune", c_g: "vert", c_b: "bleu", c_p: "rose", close: "Fermer",
      resumeAt: "Reprendre à la page {n}", secTop: "Couverture", secFin: "Fin",
      spTheme: "Thème", spFont: "Police", spSize: "Taille", spLine: "Interligne", spMargin: "Marges",
      th_clair: "Clair", th_sepia: "Sépia", th_nuit: "Nuit", th_noir: "Noir",
      newNote: "<b>Nouveau</b> · Chaque appareil choisit ce qu’il synchronise : des marges larges sur l’ordinateur, serrées sur le téléphone.",
      sampleRh: "Du côté de chez Swann",
      sample: "Longtemps, je me suis couché de bonne heure. Parfois, à peine ma bougie éteinte, mes yeux se fermaient si vite que je n’avais pas le temps de me dire : « Je m’endors. » Et, une demi-heure après, la pensée qu’il était temps de chercher le sommeil m’éveillait ; je voulais poser le volume que je croyais avoir encore dans les mains et souffler ma lumière ; je n’avais pas cessé en dormant de faire des réflexions sur ce que je venais de lire, mais ces réflexions avaient pris un tour un peu particulier ; il me semblait que j’étais moi-même ce dont parlait l’ouvrage.",
      c3k: "Fonctionnalités", c3t: "Tout pour lire, rien de plus.",
      f1t: "Reprenez où vous étiez", f1p: "Commencez un chapitre sur l’ordinateur, finissez-le dans le métro : la page, les marque-pages et les surlignages se synchronisent.",
      f2t: "Collections", f2p: "Rangez vos livres par série, par genre ou par envie, et donnez-leur la couverture de votre choix — même une illustration du livre.",
      f3t: "Surlignages et notes", f3p: "Huit couleurs, une carte du livre pour retrouver vos passages, et l’export de vos citations en un clic.",
      f4t: "Votre mise en page", f4p: "Sept thèmes dont sépia et nuit, polices de lecture dont OpenDyslexic pour les personnes dyslexiques, taille, interligne, marges, défilement continu ou pages qui tournent.",
      f7t: "Chaque appareil à sa façon", f7p: "Choisissez ce qui se synchronise : thème, police, taille, marges… Gardez de grandes marges sur l’ordinateur et des marges serrées sur le téléphone.",
      f5t: "Même hors ligne", f5p: "Vos livres sont stockés sur l’appareil : l’avion, le train ou la plage ne vous arrêtent pas.",
      f10t: "Une vraie étagère", f10p: "Photographiez la tranche de vos livres, numériques ou papier : ils se rangent debout, de face ou en pile, entre plantes et peluches. Touchez-en un, il pivote en 3D pour montrer sa couverture.",
      f11t: "Toujours à jour", f11p: "Les applis Windows, macOS et Linux se mettent à jour d’elles-mêmes en un clic, sans réinstaller ; le site et l’appli du téléphone, à chaque ouverture.",
      f8t: "Écrivez votre livre", f8p: "Un éditeur chapitre par chapitre, typographie soignée, enregistrement à chaque frappe et historique des versions ; exportez-le en EPUB ou rangez-le dans votre bibliothèque.",
      f9t: "Écoutez vos livres", f9p: "Lecture à voix haute avec des voix naturelles, femmes et hommes, qui respirent et mettent le ton : la phrase lue est surlignée et la page tourne toute seule.",
      f6t: "Privé et sécurisé", f6p: "Ni publicité, ni pistage, ni revente de données. Votre compte est protégé par la double authentification.",
      wcBook: "Le Phare des Brumes", wcSaved: "Enregistré et synchronisé", wcCh1: "La lettre", wcCh2: "La marée", wcCh3: "Le gardien",
      wcText: "Le facteur ne montait jamais jusqu’au phare. Pourtant, ce matin-là, une enveloppe bleue attendait sur la troisième marche, coincée sous un galet pour que le vent ne l’emporte pas.",
      lcText: "Au loin, la corne de brume répondit. Margot glissa la lettre dans sa poche et monta les cent douze marches. Là-haut, la lanterne tournait encore. Elle déplia la feuille et lut la première phrase à voix haute, pour que la mer l’entende aussi.",
      lcV0: "Femme · chaleureuse", lcV1: "Homme · posé", lcV2: "Femme · claire",
      c6k: "Écrire", c6t: "Votre livre, chapitre après chapitre.", c7k: "Écouter", c7t: "Fermez les yeux, le livre continue.",
      c4k: "Notes",
      c4p: "Un bon livre se lit <mark class=\"hl y\">deux fois</mark> : la première pour l’histoire, la seconde pour <mark class=\"hl g\">tout ce qu’on avait souligné</mark>. Folio garde chaque passage, <mark class=\"hl b\">classé par chapitre</mark>, prêt à être copié ou <mark class=\"hl p\">exporté en Markdown</mark>.",
      c5k: "Partout", c5a: "Lisez sur", c5web: "le navigateur",
      c5p: "Un seul compte : votre page, vos notes et vos collections vous suivent d’un appareil à l’autre.",
      shK: "Open source", shT2: "Hébergez votre propre Folio.",
      shP: "Le code est libre (licence MIT). Installez le serveur chez vous — un Raspberry Pi suffit — et gardez vos livres et vos notes sur votre propre machine.",
      sh1: "Installation en une commande avec Docker", sh2: "Site, lecteur et applis Windows, macOS et Linux inclus", sh3: "Vos données ne quittent jamais votre serveur",
      copy: "Copier", copied: "Copié !",
      shBtn: "Voir le code sur GitHub", selfLink: "Auto-hébergement", selfNote: "Vous préférez votre propre serveur ?", selfNoteLink: "Folio est open source et auto-hébergeable",
      finW: "Fin.", finP: "…ou plutôt le début de votre prochaine lecture.",
      colophon: "Composé en Fraunces et Literata. Imprimé nulle part, lisible partout.",
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
      navFeatures: "Features", navToc: "Features", navDownload: "Download", navOpen: "Open Folio", home: "Home", pillNew: "New",
      eyebrow: "EPUB reader · no ads", h1a: "Your books.", h1b: "Everywhere.", h1c: "Beautifully.",
      lead: "Folio is an elegant, ad-free EPUB reader. Read in your browser, on your phone or with the app for Windows, macOS and Linux: your page, notes and collections follow you.",
      ctaRead: "Start reading", ctaDl: "Download the app", ctaDl2: "Download",
      free: "Free · nothing to install to get started · works offline",
      coverSub: "Volume I · Your books", coverHint: "Scroll to open", exlibris: "This book belongs to… you.",
      c1k: "Sync", c1t: "Pick up where you left off.",
      c1text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families.",
      dPc: "Computer", pPhoneT: "Phone", pWebT: "Browser",
      c2k: "Layout", c2t: "This page adjusts like a book.",
      c2p: "Change the theme, the font or the size: the whole site re-typesets itself, just like your books in Folio. There you also get seven themes, line spacing, margins, pages or continuous scrolling.",
      tsTheme: "Theme", tsFont: "Font", tsSize: "Size", tsReset: "Reset", tsAuto: "Auto", tsS: "Small", tsM: "Medium", tsL: "Large",
      c4try: "Try it: <b>select</b> any sentence on this page.",
      dockAa: "Layout", dockNotes: "Your notes", notesT: "Your notes", notesEmpty: "Select a sentence on this page to highlight it: it will show up here, sorted by section.",
      notesMd: "Copy as Markdown", notesCopied: "Copied", notesLocal: "Kept on this device. In Folio, your notes follow you on all your devices.",
      hlDel: "Remove highlight", hlColor: "Highlight in {c}", c_y: "yellow", c_g: "green", c_b: "blue", c_p: "pink", close: "Close",
      resumeAt: "Resume at page {n}", secTop: "Cover", secFin: "The End",
      spTheme: "Theme", spFont: "Font", spSize: "Size", spLine: "Line spacing", spMargin: "Margins",
      th_clair: "Light", th_sepia: "Sepia", th_nuit: "Night", th_noir: "Black",
      newNote: "<b>New</b> · Each device chooses what it syncs: wide margins on the computer, narrow ones on the phone.",
      sampleRh: "Moby-Dick",
      sample: "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; then, I account it high time to get to sea as soon as I can.",
      c3k: "Features", c3t: "Everything for reading, nothing more.",
      f1t: "Pick up where you left off", f1p: "Start a chapter on your computer, finish it on the train: your page, bookmarks and highlights stay in sync.",
      f2t: "Collections", f2p: "Group your books by series, genre or mood, and give them the cover you like — even an illustration from the book.",
      f3t: "Highlights and notes", f3p: "Eight colours, a map of the book to find your passages again, and one-click export of your quotes.",
      f4t: "Your layout", f4p: "Seven themes including sepia and night, reading fonts including OpenDyslexic for dyslexic readers, size, line spacing, margins, continuous scrolling or turning pages.",
      f7t: "Each device its own way", f7p: "Choose what syncs: theme, font, size, margins… Keep wide margins on the computer and narrow ones on the phone.",
      f5t: "Even offline", f5p: "Your books are stored on the device: planes, trains and beaches won’t stop you.",
      f10t: "A real bookshelf", f10p: "Photograph the spines of your books, digital or paper: they stand upright, face-out or in stacks, between plants and plush toys. Tap one and it turns in 3D to show its cover.",
      f11t: "Always up to date", f11p: "The Windows, macOS and Linux apps update themselves in one click, no reinstalling; the website and phone app on every launch.",
      f8t: "Write your own book", f8p: "A chapter-by-chapter editor with proper typography, saving on every keystroke and a version history; export it as EPUB or put it in your library.",
      f9t: "Listen to your books", f9p: "Read aloud with natural voices, women and men, that breathe and carry the tone: the sentence being read is highlighted and pages turn by themselves.",
      f6t: "Private and secure", f6p: "No ads, no tracking, no selling of data. Your account is protected by two-factor authentication.",
      wcBook: "The Lighthouse in the Fog", wcSaved: "Saved and synced", wcCh1: "The Letter", wcCh2: "The Tide", wcCh3: "The Keeper",
      wcText: "The postman never climbed as far as the lighthouse. Yet that morning a blue envelope was waiting on the third step, pinned under a pebble so the wind would not take it.",
      lcText: "Far off, the foghorn answered. Margot slipped the letter into her pocket and climbed the hundred and twelve steps. At the top, the lantern was still turning. She unfolded the page and read the first sentence aloud, so the sea could hear it too.",
      lcV0: "Woman · warm", lcV1: "Man · calm", lcV2: "Woman · bright",
      c6k: "Write", c6t: "Your book, one chapter at a time.", c7k: "Listen", c7t: "Close your eyes, the book goes on.",
      c4k: "Notes",
      c4p: "A good book is read <mark class=\"hl y\">twice</mark>: once for the story, and once for <mark class=\"hl g\">everything you underlined</mark>. Folio keeps every passage, <mark class=\"hl b\">sorted by chapter</mark>, ready to copy or <mark class=\"hl p\">export as Markdown</mark>.",
      c5k: "Everywhere", c5a: "Read on", c5web: "the web",
      c5p: "One account: your page, notes and collections follow you from one device to the next.",
      shK: "Open source", shT2: "Host your own Folio.",
      shP: "The code is free (MIT licence). Run the server at home — a Raspberry Pi is enough — and keep your books and notes on your own machine.",
      sh1: "One-command install with Docker", sh2: "Website, reader and Windows, macOS and Linux apps included", sh3: "Your data never leaves your server",
      copy: "Copy", copied: "Copied!",
      shBtn: "View the code on GitHub", selfLink: "Self-hosting", selfNote: "Prefer your own server?", selfNoteLink: "Folio is open source and self-hostable",
      finW: "The End.", finP: "…or rather, the beginning of your next read.",
      colophon: "Set in Fraunces and Literata. Printed nowhere, readable everywhere.",
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
  window.FolioSite = { t, LANG };
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
