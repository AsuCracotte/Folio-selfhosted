"use strict";
// ---------- langue ----------
const LANG=(()=>{let l;try{l=localStorage.folioLang}catch(e){}return l==="fr"||l==="en"?l:/^fr/i.test(navigator.language||"")?"fr":"en"})();
document.documentElement.lang=LANG;
const TX={
fr:{siteLink:"Site de Folio",sync:"Synchroniser",myAccount:"Mon compte",addBooks:"Ajouter des livres",add:"Ajouter",searchPh:"Rechercher un titre ou un auteur",dropHere:"Déposez vos fichiers EPUB",
 library:"Bibliothèque",bookmark:"Marque-page",tocNotes:"Sommaire et notes",appearance:"Apparence",customColors:"Couleurs perso",background:"Fond",text:"Texte",font:"Police",bookFont:"Police du livre",
 size:"Taille",lineHeight:"Interligne",margins:"Marges",justify:"Texte justifié",pages:"Pages",scroll:"Défilement",typography:"Typographie",paraSpace:"Espace entre paragraphes",weight:"Graisse",
 letterSpace:"Espacement des lettres",indent:"Retrait de première ligne",indBook:"Livre",indNone:"Aucun",indNormal:"Normal",indWide:"Large",resetLook:"Réinitialiser l’apparence",syncLook:"Synchronisation entre appareils",syncLookTxt:"Décochez ce que cet appareil doit garder pour lui : il ne l’enverra plus et ne recevra plus celui des autres.",sg_colors:"Thème et couleurs",sg_font:"Police",sg_size:"Taille du texte",sg_spacing:"Interligne et typographie",sg_margin:"Marges",sg_layout:"Justification, pages ou défilement",
 th_clair:"Clair",th_sepia:"Sépia",th_sombre:"Sombre",th_noir:"Noir",th_gris:"Gris",th_nuit:"Nuit",th_foret:"Forêt",
 w300:"Fine",w400:"Normale",w500:"Moyenne",w600:"Demi-grasse",w700:"Grasse",bookPara:"Livre",normal:"Normal",
 untitled:"Sans titre",finished:"Terminé",books1:"{n} livre",booksN:"{n} livres",emptyLib:"Votre bibliothèque est vide",emptyLibTxt:"Ajoutez des fichiers EPUB ou glissez-les ici.<br>Connectez-vous pour retrouver ceux de vos autres appareils.",
 addBook:"Ajouter un livre",resume:"Reprendre la lecture",noMatch:"Aucun livre ne correspond à cette recherche.",options:"Options",
 confirmRemove:"Retirer « {t} » de la bibliothèque ?\nSes marque-pages et surlignages seront aussi supprimés.",unreadable:"Fichier illisible : {f}",added1:"{n} livre ajouté",addedN:"{n} livres ajoutés",
 lookReset:"Apparence réinitialisée",tips:"Balayez pour tourner les pages · pincez pour la taille · glissez vers le haut pour vos notes",bmRemoved:"Marque-page retiré",bmAdded:"Marque-page ajouté",
 delHl:"Retirer le surlignage",copied:"Copié",copyFail:"Copie impossible sur ce navigateur",resumedOther:"Repris à la position de l’autre appareil",synced:"Synchronisé",syncFail:"Synchronisation impossible",
 noName:"Sans pseudo",mfaOnState:"<span class=\"ok\">Activée</span> · {n} code(s) de secours restant(s)",mfaOffState:"<span class=\"warn\">Désactivée</span> · fortement recommandée",
 justNow:"à l’instant",minAgo:"il y a {n} min",hAgo:"il y a {n} h",sessLine:"{ago} · IP {ip} · connecté le {d}",thisDevice:"Cet appareil",signOut:"Déconnecter",deviceOut:"Appareil déconnecté",
 expired:"Session expirée : reconnectez-vous",unreachable:"Serveur injoignable",badImage:"Image illisible",photoOk:"Photo de profil mise à jour",photoRemoved:"Photo retirée",nameSaved:"Pseudo enregistré",
 pwMismatch:"Les deux mots de passe ne correspondent pas",pwChanged:"Mot de passe changé, autres appareils déconnectés",devicesOut:"{n} appareil(s) déconnecté(s)",
 confirmDelAcc:"Supprimer définitivement votre compte ? Cette action est irréversible.",accDeleted:"Compte supprimé",
 mfaOnT:"Activer la double authentification",mfaOnTxt:"Confirmez votre mot de passe pour continuer.",codesT:"Nouveaux codes de secours",codesTxt:"Les anciens codes ne fonctionneront plus.",
 mfaOffT:"Désactiver la double authentification",mfaOffTxt:"Votre compte ne sera plus protégé que par le mot de passe.",mfaDisabled:"Double authentification désactivée",
 codesCopied:"Codes copiés",codesCopyFail:"Copie impossible : sélectionnez les codes",codesFile:"Codes de secours Folio ({e})\nChaque code ne fonctionne qu'une fois.",codesName:"folio-codes-de-secours.txt",
 error:"Erreur {s}",badCode:"Code incorrect",pwResetDone:"Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.",loggedOut:"Déconnecté",
 verified:"Adresse confirmée ! Vous pouvez maintenant vous connecter.",updated1:"{n} livre mis à jour",updatedN:"{n} livres mis à jour",syncError:"Échec de la synchro",accTitleIn:"Mon compte",accTitleOut:"Compte Folio",
 changePhoto:"Changer la photo",remove:"Retirer",syncedBooks:"livres synchronisés",memberSince:"membre depuis",profile:"Profil",pseudo:"Pseudo",pseudoPh:"Comment vous appeler ?",save:"Enregistrer",
 security:"Sécurité",mfa:"Double authentification",enable:"Activer",disable:"Désactiver",newCodes:"Nouveaux codes de secours",changePw:"Changer le mot de passe",curPw:"Mot de passe actuel",newPw:"Nouveau mot de passe",
 pwMin:"10 caractères minimum",confirm:"Confirmer",mfaCode:"Code de double authentification",devices:"Appareils connectés",logOthers:"Déconnecter les autres appareils",logout:"Se déconnecter",
 danger:"Zone sensible",delAccount:"Supprimer mon compte…",delAccountTxt:"Efface définitivement votre compte, vos livres synchronisés, votre progression et vos notes du serveur. Les livres déjà présents sur cet appareil sont conservés.",
 password:"Mot de passe",delForever:"Supprimer définitivement",loginIntro:"Connectez-vous pour retrouver vos livres, vos collections et votre progression sur tous vos appareils.",email:"Email",
 customServer:"Serveur personnalisé",serverAddr:"Adresse du serveur (vide = ce site)",login:"Se connecter",register:"Créer un compte",forgot:"Mot de passe oublié ?",
 unverified:"Votre adresse n’est pas encore confirmée : cliquez sur le lien reçu par mail.",resend:"Renvoyer le mail de confirmation",
 mfaIntro:"Ouvrez votre application d’authentification et entrez le code à 6 chiffres. Vous pouvez aussi utiliser un de vos codes de secours.",code:"Code",validate:"Valider",cancel:"Annuler",
 forgotIntro:"Entrez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.",sendLink:"Envoyer le lien",back:"Retour",
 resetIntro:"Choisissez un nouveau mot de passe (10 caractères minimum). Tous vos appareils seront déconnectés.",mfaOrRecovery:"Code de double authentification (ou code de secours)",backToLogin:"Retour à la connexion",
 language:"Langue",langAuto:"Automatique",onMobile:"Folio sur mobile",mobileT:"Folio sur votre téléphone",mobileTxt:"Scannez ce code avec votre téléphone pour ouvrir Folio, puis installez-le comme une appli :",
 mobileAndroid:"<b>Android (Chrome)</b> : menu ⋮ › <b>Installer l’application</b>",mobileIos:"<b>iPhone (Safari)</b> : bouton Partager › <b>Sur l’écran d’accueil</b>",
 mobileSync:"Connectez-vous avec le même compte : vos livres, vos notes et vos collections vous y attendent.",
 mfaStep1:"1. Scannez ce QR code avec une application d’authentification (Aegis, 2FAS, Google Authenticator, Bitwarden…).",orKey:"ou saisissez cette clé :",mfaStep2:"2. Entrez le code à 6 chiffres affiché par l’application.",
 recoveryCodes:"Codes de secours",recoveryTxt:"Chacun ne sert qu’une fois et remplace le code de l’application si vous perdez votre téléphone. Gardez-les en lieu sûr : ils ne seront plus affichés.",
 copy:"Copier",download:"Télécharger",codesSaved:"J’ai mis mes codes en lieu sûr",authTitle:"Confirmez votre identité",
 // collections et couvertures
 collections:"Collections",newCol:"Nouvelle collection",newColQ:"Nom de la nouvelle collection",renameColQ:"Renommer la collection",colName:"Ma collection",allBooks:"Tous les livres",
 colEmpty:"Cette collection est vide",colEmptyTxt:"Ajoutez-y des livres de votre bibliothèque.",addToCol:"Ajouter des livres",rename:"Renommer",deleteCol:"Supprimer la collection",
 deleteColTip:"Supprimer une collection ne supprime pas ses livres.",confirmDelCol:"Supprimer la collection « {t} » ? Les livres restent dans votre bibliothèque.",colDeleted:"Collection supprimée",
 addToColT:"Ajouter à « {t} »",done:"Terminé",ok:"OK",inCols:"Dans {n} collection(s)",noCols:"Aucune collection pour l’instant.",colCreated:"Collection « {t} » créée",
 cover:"Couverture",chooseImage:"Choisir une image…",origCover:"Couverture d’origine",coverTip:"Astuce : dans un livre, faites un clic droit (ou un appui long sur téléphone) sur une illustration pour en faire la couverture.",
 removeBook:"Retirer de la bibliothèque",readStatus:"Lecture",markDone:"Marquer comme terminé",markUnread:"Marquer comme non lu",
 autoReading:"En cours",autoUnread:"Non lus",autoDone:"Terminés",markedDone:"Rangé dans « Terminés »",markedUnread:"Rangé dans « Non lus »",autoTip:"Catégorie automatique",rack:"Étagère",rackAll:"Tout voir",addPaper:"Livre papier",addPaperT:"Ajouter un livre papier",editSpine:"Sur l’étagère",titleF:"Titre",authorF:"Auteur",
 takePhoto:"Photographier la tranche",camHint:"Placez la tranche du livre dans le cadre",camWidth:"Épaisseur",camNo:"Caméra indisponible : choisissez une photo",cropT:"Recadrer",cropHint:"Ajustez le cadre sur la tranche",useCrop:"Utiliser",importImg:"Importer une image",rotate:"Faire pivoter",removePhoto:"Retirer la photo",openBook:"Ouvrir le livre",removePaper:"Retirer de l’étagère",
 spineSet:"Tranche mise à jour",spinePhotoOff:"Photo retirée",paperAdded:"« {t} » rangé sur l’étagère",paperRemoved:"Livre retiré de l’étagère",needTitle:"Indiquez au moins le titre",
 confirmRemovePaper:"Retirer « {t} » de l’étagère ?",sortAuthor:"Auteur",sortTitle:"Titre",sortRecent:"Récents",kindBook:"Livre numérique",kindPaper:"Livre papier",
 decoT:"Décorations",decoT:"Decorations",rackTip:"Photographiez la tranche de vos livres, numériques ou papier : votre étagère se compose, et vous suit sur tous vos appareils.",spineTip:"Astuce : livre debout, tranche bien droite et cadrée serrée.",
 fold:"Replier",unfold:"Déplier",useAsCover:"Utiliser comme couverture",coverSet:"Couverture mise à jour",coverReset:"Couverture d’origine rétablie",customCover:"Couverture personnalisée",bookOptions:"Options du livre"},
en:{siteLink:"Folio website",sync:"Sync",myAccount:"My account",addBooks:"Add books",add:"Add",searchPh:"Search by title or author",dropHere:"Drop your EPUB files",
 library:"Library",bookmark:"Bookmark",tocNotes:"Contents and notes",appearance:"Appearance",customColors:"Custom colours",background:"Background",text:"Text",font:"Font",bookFont:"Book’s font",
 size:"Size",lineHeight:"Line spacing",margins:"Margins",justify:"Justified text",pages:"Pages",scroll:"Scrolling",typography:"Typography",paraSpace:"Paragraph spacing",weight:"Weight",
 letterSpace:"Letter spacing",indent:"First-line indent",indBook:"Book",indNone:"None",indNormal:"Normal",indWide:"Wide",resetLook:"Reset appearance",syncLook:"Sync across devices",syncLookTxt:"Untick what this device should keep to itself: it will no longer send it, nor receive the one from your other devices.",sg_colors:"Theme and colours",sg_font:"Font",sg_size:"Text size",sg_spacing:"Line height and typography",sg_margin:"Margins",sg_layout:"Justification, pages or scrolling",
 th_clair:"Light",th_sepia:"Sepia",th_sombre:"Dark",th_noir:"Black",th_gris:"Grey",th_nuit:"Night",th_foret:"Forest",
 w300:"Light",w400:"Regular",w500:"Medium",w600:"Semibold",w700:"Bold",bookPara:"Book",normal:"Normal",
 untitled:"Untitled",finished:"Finished",books1:"{n} book",booksN:"{n} books",emptyLib:"Your library is empty",emptyLibTxt:"Add EPUB files or drop them here.<br>Sign in to get the books from your other devices.",
 addBook:"Add a book",resume:"Continue reading",noMatch:"No book matches this search.",options:"Options",
 confirmRemove:"Remove “{t}” from the library?\nIts bookmarks and highlights will be deleted too.",unreadable:"Unreadable file: {f}",added1:"{n} book added",addedN:"{n} books added",
 lookReset:"Appearance reset",tips:"Swipe to turn pages · pinch to resize · swipe up for your notes",bmRemoved:"Bookmark removed",bmAdded:"Bookmark added",
 delHl:"Remove highlight",copied:"Copied",copyFail:"Copying isn’t possible in this browser",resumedOther:"Resumed at the other device’s position",synced:"Synced",syncFail:"Sync failed",
 noName:"No name",mfaOnState:"<span class=\"ok\">On</span> · {n} recovery code(s) left",mfaOffState:"<span class=\"warn\">Off</span> · strongly recommended",
 justNow:"just now",minAgo:"{n} min ago",hAgo:"{n} h ago",sessLine:"{ago} · IP {ip} · signed in on {d}",thisDevice:"This device",signOut:"Sign out",deviceOut:"Device signed out",
 expired:"Session expired: sign in again",unreachable:"Server unreachable",badImage:"Unreadable image",photoOk:"Profile photo updated",photoRemoved:"Photo removed",nameSaved:"Name saved",
 pwMismatch:"The two passwords don’t match",pwChanged:"Password changed, other devices signed out",devicesOut:"{n} device(s) signed out",
 confirmDelAcc:"Permanently delete your account? This cannot be undone.",accDeleted:"Account deleted",
 mfaOnT:"Turn on two-factor authentication",mfaOnTxt:"Confirm your password to continue.",codesT:"New recovery codes",codesTxt:"The old codes will stop working.",
 mfaOffT:"Turn off two-factor authentication",mfaOffTxt:"Your account will only be protected by its password.",mfaDisabled:"Two-factor authentication turned off",
 codesCopied:"Codes copied",codesCopyFail:"Copying isn’t possible: select the codes",codesFile:"Folio recovery codes ({e})\nEach code works only once.",codesName:"folio-recovery-codes.txt",
 error:"Error {s}",badCode:"Incorrect code",pwResetDone:"Password changed. Sign in with your new password.",loggedOut:"Signed out",
 verified:"Address confirmed! You can now sign in.",updated1:"{n} book updated",updatedN:"{n} books updated",syncError:"Sync failed",accTitleIn:"My account",accTitleOut:"Folio account",
 changePhoto:"Change photo",remove:"Remove",syncedBooks:"synced books",memberSince:"member since",profile:"Profile",pseudo:"Display name",pseudoPh:"What should we call you?",save:"Save",
 security:"Security",mfa:"Two-factor authentication",enable:"Turn on",disable:"Turn off",newCodes:"New recovery codes",changePw:"Change password",curPw:"Current password",newPw:"New password",
 pwMin:"10 characters minimum",confirm:"Confirm",mfaCode:"Two-factor code",devices:"Signed-in devices",logOthers:"Sign out other devices",logout:"Sign out",
 danger:"Danger zone",delAccount:"Delete my account…",delAccountTxt:"Permanently erases your account, synced books, progress and notes from the server. Books already on this device are kept.",
 password:"Password",delForever:"Delete permanently",loginIntro:"Sign in to get your books, collections and progress on all your devices.",email:"Email",
 customServer:"Custom server",serverAddr:"Server address (empty = this site)",login:"Sign in",register:"Create an account",forgot:"Forgot password?",
 unverified:"Your address isn’t confirmed yet: click the link you received by email.",resend:"Resend the confirmation email",
 mfaIntro:"Open your authenticator app and enter the 6-digit code. You can also use one of your recovery codes.",code:"Code",validate:"Confirm",cancel:"Cancel",
 forgotIntro:"Enter your address: you’ll receive a link to choose a new password.",sendLink:"Send the link",back:"Back",
 resetIntro:"Choose a new password (10 characters minimum). All your devices will be signed out.",mfaOrRecovery:"Two-factor code (or recovery code)",backToLogin:"Back to sign in",
 language:"Language",langAuto:"Automatic",onMobile:"Folio on mobile",mobileT:"Folio on your phone",mobileTxt:"Scan this code with your phone to open Folio, then install it like an app:",
 mobileAndroid:"<b>Android (Chrome)</b>: ⋮ menu › <b>Install app</b>",mobileIos:"<b>iPhone (Safari)</b>: Share button › <b>Add to Home Screen</b>",
 mobileSync:"Sign in with the same account: your books, notes and collections will be waiting.",
 mfaStep1:"1. Scan this QR code with an authenticator app (Aegis, 2FAS, Google Authenticator, Bitwarden…).",orKey:"or enter this key:",mfaStep2:"2. Enter the 6-digit code shown by the app.",
 recoveryCodes:"Recovery codes",recoveryTxt:"Each one works once and replaces the app’s code if you lose your phone. Keep them somewhere safe: they won’t be shown again.",
 copy:"Copy",download:"Download",codesSaved:"I’ve stored my codes safely",authTitle:"Confirm it’s you",
 collections:"Collections",newCol:"New collection",newColQ:"Name of the new collection",renameColQ:"Rename collection",colName:"My collection",allBooks:"All books",
 colEmpty:"This collection is empty",colEmptyTxt:"Add books from your library to it.",addToCol:"Add books",rename:"Rename",deleteCol:"Delete collection",
 deleteColTip:"Deleting a collection doesn’t delete its books.",confirmDelCol:"Delete the collection “{t}”? The books stay in your library.",colDeleted:"Collection deleted",
 addToColT:"Add to “{t}”",done:"Done",ok:"OK",inCols:"In {n} collection(s)",noCols:"No collections yet.",colCreated:"Collection “{t}” created",
 cover:"Cover",chooseImage:"Choose an image…",origCover:"Original cover",coverTip:"Tip: in a book, right-click (or long-press on a phone) an illustration to make it the cover.",
 removeBook:"Remove from library",readStatus:"Reading",markDone:"Mark as finished",markUnread:"Mark as unread",
 autoReading:"Reading",autoUnread:"Unread",autoDone:"Finished",markedDone:"Moved to “Finished”",markedUnread:"Moved to “Unread”",autoTip:"Automatic category",rack:"Bookshelf",rackAll:"See all",addPaper:"Paper book",addPaperT:"Add a paper book",editSpine:"On the shelf",titleF:"Title",authorF:"Author",
 takePhoto:"Photograph the spine",camHint:"Fit the book’s spine inside the frame",camWidth:"Thickness",camNo:"Camera unavailable: pick a photo instead",cropT:"Crop",cropHint:"Adjust the frame to the spine",useCrop:"Use",importImg:"Import an image",rotate:"Rotate",removePhoto:"Remove photo",openBook:"Open the book",removePaper:"Remove from the shelf",
 spineSet:"Spine updated",spinePhotoOff:"Photo removed",paperAdded:"“{t}” added to the shelf",paperRemoved:"Book removed from the shelf",needTitle:"Enter at least the title",
 confirmRemovePaper:"Remove “{t}” from the shelf?",sortAuthor:"Author",sortTitle:"Title",sortRecent:"Recent",kindBook:"Ebook",kindPaper:"Paper book",
 decoT:"Decorations",rackTip:"Photograph the spines of your books, digital or paper: your bookshelf builds itself and follows you on all your devices.",spineTip:"Tip: stand the book up, keep the spine straight and frame it tightly.",
 fold:"Collapse",unfold:"Expand",useAsCover:"Use as cover",coverSet:"Cover updated",coverReset:"Original cover restored",customCover:"Custom cover",bookOptions:"Book options"}};
const t=(k,v={})=>String(TX[LANG][k]??TX.fr[k]??k).replace(/\{(\w+)\}/g,(_,x)=>v[x]??"");
const tn=(n,one,many)=>t(n>1?many:one,{n});
const LOC=LANG==="fr"?"fr-FR":"en-GB";
document.querySelectorAll("[data-t]").forEach(e=>e.textContent=t(e.dataset.t));
document.querySelectorAll("[data-tp]").forEach(e=>e.placeholder=t(e.dataset.tp));
document.querySelectorAll("[data-tt]").forEach(e=>e.title=t(e.dataset.tt));
document.querySelectorAll("[data-th]").forEach(e=>e.innerHTML=t(e.dataset.th));

const $=id=>document.getElementById(id),THEMES={clair:["#fbfbfa","#222222"],sepia:["#f4ecd8","#5b4636"],sombre:["#1e1f24","#d6d6d6"],noir:["#000000","#b8b8b8"],gris:["#e8e8e6","#2b2b2b"],nuit:["#141a24","#c9d1dc"],foret:["#1c2420","#cdd8c4"]};
const WEBFONTS=["Literata","Merriweather","Lora","Source Serif 4","Atkinson Hyperlegible"];
const COLORS={yellow:"#f6d55c",green:"#7bd88f",blue:"#6cb6ff",pink:"#ff8fb1",orange:"#ffa94d",red:"#ff6b6b",purple:"#b197fc",teal:"#4fd1c5"},ico=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const SYNC_KEYS=["theme","bg","fg","font","size","line","margin","justify","flow","spread","para","indent","weight","letter"];
// Groupes de réglages qu'on peut choisir de garder sur cet appareil (S.nosync = liste locale, jamais envoyée)
const SYNC_GROUPS={colors:["theme","bg","fg"],font:["font"],size:["size"],spacing:["line","para","indent","weight","letter"],margin:["margin"],layout:["justify","flow","spread"]};
const synced=()=>SYNC_KEYS.filter(k=>!Object.entries(SYNC_GROUPS).some(([g,ks])=>(S.nosync||[]).includes(g)&&ks.includes(k)));
const DEFAULTS={theme:"clair",bg:"#fbfbfa",fg:"#222222",font:"",size:19,line:1.6,margin:28,justify:false,flow:"paginated",spread:false,para:0,indent:-1,weight:400,letter:0};
let db,S=Object.assign({...DEFAULTS,updated:0},JSON.parse(localStorage.folioS||"{}")),
 cur=null,book,rend,loc,toc=[],pct=null,chapter="",pending=null,tab="toc",timer;
const msg=s=>{const m=$("msg");m.textContent=s;m.classList.add("on");clearTimeout(msg.t);msg.t=setTimeout(()=>m.classList.remove("on"),2600)};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const now=()=>Date.now()/1000;
// ---------- stockage IndexedDB ----------
const open=()=>new Promise((ok,ko)=>{const r=indexedDB.open("folio",2);r.onupgradeneeded=()=>{const d=r.result,has=n=>d.objectStoreNames.contains(n);
 if(!has("books"))d.createObjectStore("books",{keyPath:"hash"});if(!has("files"))d.createObjectStore("files");if(!has("spines"))d.createObjectStore("spines")};r.onsuccess=()=>{db=r.result;ok()};r.onerror=ko});
const tx=(st,m="readonly")=>db.transaction(st,m).objectStore(st),rq=r=>new Promise((ok,ko)=>{r.onsuccess=()=>ok(r.result);r.onerror=ko});
const getB=h=>rq(tx("books").get(h)),putB=b=>rq(tx("books","readwrite").put(b)),allB=()=>rq(tx("books").getAll()),delB=h=>Promise.all([rq(tx("books","readwrite").delete(h)),rq(tx("files","readwrite").delete(h))]);
const getSp=id=>rq(tx("spines").get(id)),putSp=(id,b)=>rq(tx("spines","readwrite").put(b,id)),delSp=id=>rq(tx("spines","readwrite").delete(id));
const sha1=async buf=>[...new Uint8Array(await crypto.subtle.digest("SHA-1",buf))].map(b=>b.toString(16).padStart(2,"0")).join("");
async function addBuf(buf){const hash=await sha1(buf);if(await getB(hash))return hash;
 const bk=ePub(buf.slice(0));await bk.ready;const md=await bk.loaded.metadata;let cover=null;try{const u=await bk.coverUrl();if(u)cover=await loadImg(u).then(i=>toBlob(i,600,900))}catch(e){}
 await rq(tx("files","readwrite").put(buf,hash));
 await putB({hash,title:md.title||t("untitled"),author:md.creator||"",cover,cfi:"",progress:0,posUpdated:0,added:Date.now(),bookmarks:[],highlights:[]});bk.destroy();return hash}
// ---------- images (couvertures) ----------
const loadImg=src=>new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ko;i.src=src});
// redimensionne (sans agrandir) et encode en JPEG sur fond blanc (les PNG transparents restent lisibles)
function toBlob(img,mw=600,mh=900){const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!w||!h)return Promise.reject(new Error("img"));
 const k=Math.min(1,mw/w,mh/h),c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
 return new Promise((ok,ko)=>c.toBlob(b=>b?ok(b):ko(new Error("img")),"image/jpeg",.88))}
async function fileToCover(f){const u=URL.createObjectURL(f);try{return await toBlob(await loadImg(u))}finally{URL.revokeObjectURL(u)}}
// ---------- collections (synchronisées : la plus récente gagne, suppressions conservées) ----------
let COLS=(()=>{try{return JSON.parse(localStorage.folioCols||"[]")}catch(e){return[]}})();
const live=()=>COLS.filter(c=>!c.deleted);
const colById=id=>live().find(c=>c.id===id);
const statusOf=b=>{const p=b.progress||0;return p>.98?"done":(p>0||b.lastRead)?"reading":"unread"};
const AUTO=[["@reading","reading","autoReading"],["@unread","unread","autoUnread"],["@done","done","autoDone"]];
const autoCols=all=>AUTO.map(([id,st,k])=>({id,name:t(k),auto:true,books:all.filter(b=>statusOf(b)===st).map(b=>b.hash)}));
const newId=()=>[...crypto.getRandomValues(new Uint8Array(10))].map(b=>"abcdefghijklmnopqrstuvwxyz0123456789"[b%36]).join("");
let colT;function saveCols(){localStorage.folioCols=JSON.stringify(COLS);clearTimeout(colT);colT=setTimeout(()=>dav?.collections().catch(()=>{}),1500)}
function touchCol(c){c.updated=now();saveCols()}
function makeCol(name,books=[]){const c={id:newId(),name:name.trim().slice(0,80)||t("colName"),books:[...books],created:now(),updated:now(),deleted:0};COLS.push(c);saveCols();return c}
function toggleIn(c,hash,on){const has=c.books.includes(hash);if(on===has)return;c.books=on?[...c.books,hash]:c.books.filter(h=>h!==hash);touchCol(c)}
// ---------- étagère : livres numériques et papier, photo de tranche facultative (synchronisée) ----------
const jget=(k,d)=>{try{return JSON.parse(localStorage[k]||"null")??d}catch(e){return d}};
let RACK=jget("folioRack",[]);
const rackGet=id=>RACK.find(x=>x.id===id);
// date de la photo présente sur cet appareil / déjà envoyée au serveur
const spMap=k=>jget(k,{}),spSet=(k,id,v)=>{const m=spMap(k);v?m[id]=v:delete m[id];localStorage[k]=JSON.stringify(m)};
let rackT;function saveRack(){localStorage.folioRack=JSON.stringify(RACK);clearTimeout(rackT);rackT=setTimeout(()=>dav?.rack().then(ch=>ch&&rackRefresh()).catch(()=>{}),1500)}
function rackItem(id,base){let x=rackGet(id);if(!x){x={id,kind:"book",title:"",author:"",spine:0,created:now(),updated:now(),deleted:0,...base};RACK.push(x)}return x}
const spUrls=new Map();
async function spineUrl(id){if(spUrls.has(id))return spUrls.get(id);const b=spMap("folioSpineAt")[id]?await getSp(id):null;const u=b?URL.createObjectURL(b):null;spUrls.set(id,u);return u}
const dropUrl=id=>{const u=spUrls.get(id);if(u)URL.revokeObjectURL(u);spUrls.delete(id)};
async function setSpine(id,blob,base){const x=rackItem(id,base);Object.assign(x,base||{});x.deleted=0;dropUrl(id);
 if(blob){await putSp(id,blob);x.spine=now();spSet("folioSpineAt",id,x.spine)}else{await delSp(id);x.spine=0;spSet("folioSpineAt",id,0)}
 x.updated=now();saveRack()}
// livres de l'étagère : tous les livres numériques de la bibliothèque + les livres papier
function rackList(all){const out=all.map(b=>{const x=rackGet(b.hash);return{id:b.hash,kind:"book",title:b.title,author:b.author,at:b.added||0,spine:x&&!x.deleted?x.spine:0}});
 RACK.filter(x=>x.kind==="paper"&&!x.deleted).forEach(x=>out.push({id:x.id,kind:"paper",title:x.title,author:x.author,at:(x.created||0)*1000,spine:x.spine}));
 const k=localStorage.folioRackSort||"author",c=(a,b)=>String(a||"").localeCompare(String(b||""),LANG,{sensitivity:"base"});
 const last=a=>String(a||"").trim().split(/\s+/).pop();
 return out.sort(k==="recent"?(a,b)=>b.at-a.at:k==="title"?(a,b)=>c(a.title,b.title):(a,b)=>c(last(a.author),last(b.author))||c(a.title,b.title))}
const hn=s=>[...String(s)].reduce((a,ch)=>(a*31+ch.charCodeAt(0))>>>0,7);
// tranche : par défaut les premiers mots du titre ; avec photo, l'image (largeur selon ses proportions)
function spineEl(x,big){const d=document.createElement("button");d.type="button";const n=hn(x.id),H=(big?236:150+n%44);
 d.className="spine sp"+(n%7);d.style.setProperty("--h",H+"px");d.style.setProperty("--w",Math.round(Math.min(48,24+String(x.title).length*.45+n%6)*(big?1.4:1))+"px");
 let w="";for(const p of String(x.title||t("untitled")).split(/\s+/)){if((w+" "+p).trim().length>24&&w)break;w=(w+" "+p).trim()}
 d.innerHTML=`<span>${esc(w)}</span>`;d.title=x.title+(x.author?" — "+x.author:"");
 if(x.spine)spineUrl(x.id).then(u=>{if(!u)return;const i=new Image();i.onload=()=>{d.classList.add("photo");d.style.backgroundImage=`url("${u}")`;
  d.style.setProperty("--w",Math.round(Math.max(16,Math.min(110,H*i.naturalWidth/i.naturalHeight)))+"px")};i.src=u});
 if(!big)d.onclick=()=>spineMenu(x.id);return d}
// sections repliables (état propre à cet appareil)
let FOLD=jget("folioFold",{});
function foldHead(sect,key,...bodies){const h=sect.querySelector("h3"),b=document.createElement("button");b.type="button";b.className="fold";b.innerHTML=ico("chev");
 const apply=()=>{const f=!!FOLD[key];sect.classList.toggle("folded",f);b.setAttribute("aria-expanded",String(!f));b.title=t(f?"unfold":"fold");bodies.forEach(e=>e&&(e.hidden=f))};
 b.onclick=()=>{FOLD[key]=!FOLD[key];localStorage.folioFold=JSON.stringify(FOLD);apply()};h.onclick=b.onclick;h.classList.add("fh");sect.prepend(b);apply()}
let shelf=null;try{shelf=sessionStorage.folioShelf||null}catch(e){}
const setShelf=id=>{shelf=id;try{id?sessionStorage.folioShelf=id:sessionStorage.removeItem("folioShelf")}catch(e){};$("lib").scrollTop=0;render()};
// ---------- bibliothèque ----------
const urls=new Map(),curCover=b=>b.coverCustom&&b.customCover?b.customCover:b.cover;
const coverUrl=b=>{const bl=curCover(b);if(!bl)return null;const k=b.hash+":"+(b.coverCustom?b.coverUpdated:0);if(!urls.has(k))urls.set(k,URL.createObjectURL(bl));return urls.get(k)};
const gIdx=h=>parseInt(h.slice(0,4),16)%6;
function coverEl(b){const cv=document.createElement("div");cv.className="cover g"+gIdx(b.hash);const u=coverUrl(b);
 if(u){const i=document.createElement("img");i.src=u;i.alt="";i.loading="lazy";cv.append(i)}else cv.textContent=b.title;return cv}
const pctS=p=>Math.round(p*100)+(LANG==="fr"?" %":"%");
const progHtml=p=>`<div class="prog"><div class="tr"><i style="width:${Math.round(p*100)}%"></i></div><span>${p>.98?t("finished"):pctS(p)}</span></div>`;
// appui long (téléphone) / clic droit : ouvre les options du livre
function longPress(el,fn){let lp,at=0;el.addEventListener("touchstart",()=>{el.classList.add("press");lp=setTimeout(()=>{at=Date.now();el.classList.remove("press");navigator.vibrate?.(15);fn()},550)},{passive:true});
 ["touchend","touchmove","touchcancel"].forEach(x=>el.addEventListener(x,()=>{clearTimeout(lp);el.classList.remove("press")},{passive:true}));
 el.addEventListener("contextmenu",e=>{e.preventDefault();if(Date.now()-at>1200)fn()});return()=>Date.now()-at<800}
function card(b){const c=document.createElement("div");c.className="card";const p=b.progress||0;c.append(coverEl(b));
 if(p>.98)c.insertAdjacentHTML("afterbegin",`<span class="badge">${t("finished")}</span>`);
 c.insertAdjacentHTML("beforeend",`<button class="more" title="${t("bookOptions")}">${ico("dots")}</button><div class="t">${esc(b.title)}</div><div class="a">${esc(b.author)||"&nbsp;"}</div>${p>0&&p<=.98?progHtml(p):""}`);
 const pressed=longPress(c,()=>bookMenu(b.hash));c.onclick=()=>{if(pressed())return;openBook(b.hash)};
 c.querySelector(".more").onclick=e=>{e.stopPropagation();bookMenu(b.hash)};return c}
function colCard(c,all){const d=document.createElement("div");d.className="col"+(c.auto?" auto":"");if(c.auto)d.title=t("autoTip");const bs=c.books.map(h=>all.find(b=>b.hash===h)).filter(Boolean);
 const st=document.createElement("div");st.className="stack";bs.slice(0,3).reverse().forEach(b=>st.append(coverEl(b)));
 if(bs.length===2)st.prepend(document.createElement("i"));if(!bs.length)st.innerHTML=ico("stack");d.append(st);
 d.insertAdjacentHTML("beforeend",`<div class="t"></div><div class="a">${tn(bs.length,"books1","booksN")}</div>`);d.querySelector(".t").textContent=c.name;
 const pressed=longPress(d,()=>colMenu(c.id));d.onclick=()=>{if(!pressed())setShelf(c.id)};return d}
// aperçu de l'étagère dans la bibliothèque (aussi quand il n'y a que des livres papier)
function rackPreview(all){const items=rackList(all),w=$("rackWrap");w.innerHTML=`<div class="sect"><h3>${t("rack")}</h3><div class="tools"><span>${tn(items.length,"books1","booksN")}</span><button class="btn ghost" id="rkAll">${t("rackAll")}</button></div></div>`;
 const row=document.createElement("div");row.className="plank";items.slice(0,60).forEach(x=>row.append(spineEl(x)));
 const add=document.createElement("button");add.type="button";add.className="spine add";add.title=t("addPaperT");add.innerHTML=ico("plus");add.onclick=()=>spineMenu(null);row.append(add);
 w.append(row);foldHead(w.firstElementChild,"rack",row);$("rkAll").onclick=openRack}
async function render(){const all=(await allB()).sort((a,b)=>(b.lastRead||b.added)-(a.lastRead||a.added)),q=$("q").value.trim().toLowerCase(),g=$("grid"),S2=$("sect");
 let col=shelf&&(shelf[0]==="@"?autoCols(all).find(c=>c.id===shelf&&c.books.length):colById(shelf));if(shelf&&!col){shelf=null;try{sessionStorage.removeItem("folioShelf")}catch(e){}}
 const base=col?col.books.map(h=>all.find(b=>b.hash===h)).filter(Boolean):all;
 const bs=q?base.filter(b=>(b.title+" "+b.author).toLowerCase().includes(q)):base;g.innerHTML="";$("hero").innerHTML="";$("colsWrap").innerHTML="";$("rackWrap").innerHTML="";S2.innerHTML="";S2.classList.remove("folded");g.hidden=false;
 $("sbox").style.display=all.length>3?"flex":"none";
 if(!all.length){if(!q&&RACK.some(x=>x.kind==="paper"&&!x.deleted))rackPreview(all);S2.style.display="none";g.style.display="block";g.innerHTML=`<div class="empty"><svg class="i"><use href="#i-book"/></svg><h2>${t("emptyLib")}</h2><p>${t("emptyLibTxt")}</p><p><label class="btn pri" for="file">${ico("plus")}${t("addBook")}</label></p></div>`;return}
 S2.style.display="flex";g.style.display="grid";
 const count=base.length?(bs.length===base.length?"":bs.length+" / ")+tn(base.length,"books1","booksN"):"";
 if(col){S2.innerHTML=`<div class="sh"><button class="ib" id="shBack" title="${t("allBooks")}">${ico("back")}</button><h3></h3></div><div class="tools"><span style="margin-right:6px">${count}</span>${col.auto?"":`<button class="btn" id="shAdd">${ico("plus")}<span>${t("addToCol")}</span></button><button class="ib" id="shMenu" title="${t("options")}">${ico("dots")}</button>`}</div>`;
  S2.querySelector("h3").textContent=col.name;$("shBack").onclick=()=>setShelf(null);if(!col.auto){$("shAdd").onclick=()=>pickBooks(col.id);$("shMenu").onclick=()=>colMenu(col.id)}
  if(!base.length){g.style.display="block";g.innerHTML=`<div class="empty"><svg class="i"><use href="#i-stack"/></svg><h2>${t("colEmpty")}</h2><p>${t("colEmptyTxt")}</p><p><button class="btn pri" id="emptyAdd">${ico("plus")}${t("addToCol")}</button></p></div>`;$("emptyAdd").onclick=()=>pickBooks(col.id);return}}
 else{const last=!q&&all.find(b=>(b.lastRead||(b.progress||0)>0)&&(b.progress||0)<.98);
  if(last){const h=document.createElement("div");h.className="hero";h.append(coverEl(last));h.insertAdjacentHTML("beforeend",`<div class="meta"><div class="kicker">${t("resume")}</div><h2>${esc(last.title)}</h2><div class="by">${esc(last.author)}</div>${progHtml(last.progress||0)}</div>`);
   h.onclick=()=>openBook(last.hash);$("hero").append(h)}
  const newCol=async()=>{const name=await ask(t("newColQ"),"");if(name==null)return;const c=makeCol(name);msg(t("colCreated",{t:c.name}));setShelf(c.id);pickBooks(c.id)};
  const autos=autoCols(all).filter(c=>c.books.length);
  if(!q&&(live().length||autos.length)){const w=$("colsWrap");w.innerHTML=`<div class="sect"><h3>${t("collections")}</h3></div>`;const row=document.createElement("div");row.className="cols";
   autos.forEach(c=>row.append(colCard(c,all)));
   live().slice().sort((a,b)=>a.name.localeCompare(b.name,LANG)).forEach(c=>row.append(colCard(c,all)));
   const n=document.createElement("div");n.className="col new";n.innerHTML=`<div class="stack">${ico("plus")}</div><div class="t">${t("newCol")}</div><div class="a">&nbsp;</div>`;n.onclick=newCol;row.append(n);w.append(row);foldHead(w.firstElementChild,"cols",row)}
  if(!q)rackPreview(all)
  S2.innerHTML=`<h3>${t("library")}</h3><div class="tools"><span>${count}</span>${live().length||autos.length?"":`<button class="btn ghost" id="shNew">${ico("stack")}<span>${t("newCol")}</span></button>`}</div>`;
  if($("shNew"))$("shNew").onclick=newCol;foldHead(S2,"lib",g)}
 if(!bs.length)g.innerHTML=`<div class="hint" style="grid-column:1/-1">${t("noMatch")}</div>`;
 bs.forEach(b=>g.append(card(b)))}
$("q").oninput=()=>render();
// ---------- vue « étagère » ----------
// décorations dessinées (plantes, peluches : decor/*.svg, partagés avec l'appli Linux) posées entre les livres et sur les étagères vides
const DECO={succ:[70,100],snake:[60,150],stack:[92,96],bear:[80,92],bunny:[64,112],cat:[74,80]};
const DECO_K=["succ","bear","snake","stack","bunny","cat"],DECO_GAP=[6,9,5,8,7,10];
let DECO_ON=localStorage.folioRackDeco!=="0";
function decoEl(n,big){const k=DECO_K[n%DECO_K.length],[w,h]=DECO[k],z=big?1:.86;const d=document.createElement("div");d.className="slot deco";
 d.innerHTML=`<img src="decor/${k}.svg" width="${Math.round(w*z)}" height="${Math.round(h*z)}" alt="" draggable="false">`;return d}
async function renderRack(){const items=rackList(await allB()),c=$("rkCase");c.innerHTML="";$("rkCount").textContent=tn(items.length,"books1","booksN");
 document.querySelectorAll("#rkSort button").forEach(b=>b.classList.toggle("on",b.dataset.s===(localStorage.folioRackSort||"author")));
 $("rkDeco").classList.toggle("on",DECO_ON);$("rkDeco").setAttribute("aria-pressed",String(DECO_ON));
 let nd=0,next=DECO_GAP[0];
 items.forEach((x,i)=>{if(DECO_ON&&i===next){c.append(decoEl(nd++));next+=DECO_GAP[nd%DECO_GAP.length]}const s=document.createElement("div");s.className="slot";s.append(spineEl(x));c.append(s)});
 const s=document.createElement("div");s.className="slot";const add=document.createElement("button");add.type="button";add.className="spine add";add.title=t("addPaperT");add.innerHTML=ico("plus");add.onclick=()=>spineMenu(null);s.append(add);c.append(s);
 if(DECO_ON&&items.length<4)c.append(decoEl(nd++));
 // plusieurs étages même avec peu de livres : on complète par des étagères décorées
 const tops=new Set([...c.children].map(e=>e.offsetTop)),min=innerWidth<560?4:3;
 for(let r=tops.size;r<min;r++){const row=document.createElement("div");row.className="slot srow";
  if(DECO_ON){row.style.paddingLeft=(8+(r*29)%46)+"%";row.append(decoEl(nd++,true));if(r%2)row.append(decoEl(nd++,true))}c.append(row)}}
function openRack(){$("rack").hidden=false;renderRack()}
const rackRefresh=()=>{render();if(!$("rack").hidden)renderRack();if($("shSpine").classList.contains("on"))spineFill()};
$("rkBack").onclick=()=>{$("rack").hidden=true;render()};$("rkDeco").onclick=()=>{DECO_ON=!DECO_ON;localStorage.folioRackDeco=DECO_ON?"1":"0";renderRack()};
let rkRz;addEventListener("resize",()=>{clearTimeout(rkRz);rkRz=setTimeout(()=>{if(!$("rack").hidden)renderRack()},200)});$("rkAdd").onclick=()=>spineMenu(null);
document.querySelectorAll("#rkSort button").forEach(b=>b.onclick=()=>{localStorage.folioRackSort=b.dataset.s;renderRack()});
// fiche d'un livre de l'étagère (id null = nouveau livre papier)
let spId=null,spNew=null;           // spNew : brouillon d'un livre papier pas encore rangé { blob }
async function spineFill(){const all=await allB(),b=spId&&all.find(x=>x.hash===spId),x=spId&&rackGet(spId);
 const it=b?{id:b.hash,kind:"book",title:b.title,author:b.author,spine:x&&!x.deleted?x.spine:0}:x?{...x}:{id:"new",kind:"paper",title:$("spTitle").value,author:$("spAuthor").value,spine:0};
 $("spT").textContent=spId?(it.title||t("untitled")):t("addPaperT");$("spKind").textContent=t(it.kind==="book"?"kindBook":"kindPaper");
 $("spTitle").value=it.title||"";$("spAuthor").value=it.author||"";$("spTitle").disabled=$("spAuthor").disabled=it.kind==="book";
 const pv=$("spPrev");pv.innerHTML="";const el=spineEl(it,true);
 if(!spId&&spNew&&spNew.blob){const u=URL.createObjectURL(spNew.blob);el.classList.add("photo");el.style.backgroundImage=`url("${u}")`;const i=new Image();i.onload=()=>el.style.setProperty("--w",Math.round(Math.min(150,236*i.naturalWidth/i.naturalHeight))+"px");i.src=u}
 pv.append(el);const hasPh=spId?!!it.spine:!!(spNew&&spNew.blob);$("spPh").hidden=!hasPh;
 $("spOpen").hidden=it.kind!=="book";$("spDel").hidden=!(spId&&it.kind==="paper");$("spSave").hidden=!!spId}
function spineMenu(id){spId=id;spNew=id?null:{blob:null};if(!id){$("spTitle").value="";$("spAuthor").value=""}spineFill();show("shSpine");if(!id)setTimeout(()=>$("spTitle").focus(),300)}
// photo : redressée (une tranche est haute), réduite et compressée
async function spineBlob(file,turn){const u=URL.createObjectURL(file);try{const im=await loadImg(u);let w=im.naturalWidth,h=im.naturalHeight;const rot=turn??(w>h);
  const c=document.createElement("canvas"),k=Math.min(1,1400/Math.max(w,h),(rot?360/h:360/w)),W=Math.round(w*k),H=Math.round(h*k);c.width=rot?H:W;c.height=rot?W:H;
  const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);if(rot){g.translate(c.width,0);g.rotate(Math.PI/2)}g.drawImage(im,0,0,W,H);
  return await new Promise((ok,ko)=>c.toBlob(b=>b?ok(b):ko(new Error("img")),"image/jpeg",.86))}finally{URL.revokeObjectURL(u)}}
const paperBase=()=>({kind:"paper",title:$("spTitle").value.trim().slice(0,300),author:$("spAuthor").value.trim().slice(0,200)});
async function spineUse(src){let bl;try{bl=await spineBlob(src)}catch(x){msg(t("badImage"));return}
 if(!spId){spNew.blob=bl;spineFill();return}
 const b=(await allB()).find(x=>x.hash===spId);await setSpine(spId,bl,b?{kind:"book",title:b.title,author:b.author}:{});msg(t("spineSet"));rackRefresh()}
function spinePicked(e){const f=e.target.files[0];e.target.value="";if(f)cropOpen(f)}
$("spCam").onchange=spinePicked;$("spFile").onchange=spinePicked;
// prise de vue dans l'appli : la vidéo de la caméra arrière, un cadre en forme de tranche (largeur réglable)
let camS=null;
function camLayout(){const v=$("camV"),f=$("camF"),H=v.clientHeight,h=Math.round(Math.min(H*.66,H-250)),w=Math.max(28,Math.round(h*$("camW").value/100));
 f.style.height=h+"px";f.style.width=w+"px";f.style.top=Math.round(Math.max(70,(H-150-h)/2+30))+"px"}
function camStop(){camS?.getTracks().forEach(k=>k.stop());camS=null;$("camV").srcObject=null;$("cam").hidden=true}
async function camOpen(){if(!navigator.mediaDevices?.getUserMedia){$("spCam").click();return}
 try{camS=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}}})}
 catch(e){msg(t("camNo"));$("spFile").click();return}
 const v=$("camV");v.srcObject=camS;$("cam").hidden=false;camLayout();try{await v.play()}catch(e){}}
$("spShoot").onclick=camOpen;$("camX").onclick=camStop;$("camW").oninput=camLayout;$("camImp").onclick=()=>{camStop();$("spFile").click()};
$("camGo").onclick=async()=>{const v=$("camV"),vw=v.videoWidth,vh=v.videoHeight;if(!vw)return;
 // la vidéo est affichée en « cover » : on ramène le cadre à l'écran en pixels de l'image
 const W=v.clientWidth,H=v.clientHeight,k=Math.max(W/vw,H/vh),ox=(W-vw*k)/2,oy=(H-vh*k)/2,f=$("camF").getBoundingClientRect(),o=v.getBoundingClientRect();
 const c=document.createElement("canvas");c.width=vw;c.height=vh;c.getContext("2d").drawImage(v,0,0,vw,vh);
 const r={x:(f.left-o.left-ox)/k,y:(f.top-o.top-oy)/k,w:f.width/k,h:f.height/k};
 c.toBlob(b=>{camStop();if(b)cropOpen(b,r)},"image/jpeg",.92)};
// recadrage : un rectangle déplaçable, redimensionnable par ses coins et ses bords, en pixels de l'image ;
// après chaque geste, la vue se resserre sur le cadre (avec de la marge) pour garder de la précision sur un téléphone
let crImg=null,crR=null,crV=null,crK=1,crO=[0,0];
async function cropOpen(src,rect){let im;const u=URL.createObjectURL(src);try{im=await loadImg(u)}catch(e){URL.revokeObjectURL(u);msg(t("badImage"));return}
 if(crImg)URL.revokeObjectURL(crImg.src);crImg=im;$("crI").src=u;const w=im.naturalWidth,h=im.naturalHeight;
 crR=rect?crClamp({...rect},w,h):{x:0,y:0,w,h};crV=rect?crFit(crR):{x:0,y:0,w,h};$("crop").hidden=false;$("crop").classList.remove("anim");cropLayout()}
function crClamp(r,w,h){r.w=Math.min(Math.max(r.w,16),w);r.h=Math.min(Math.max(r.h,16),h);r.x=Math.min(Math.max(r.x,0),w-r.w);r.y=Math.min(Math.max(r.y,0),h-r.h);return r}
function crFit(r){const W=crImg.naturalWidth,H=crImg.naturalHeight,p=.12*Math.max(r.w,r.h),v={x:r.x-p,y:r.y-p,w:r.w+2*p,h:r.h+2*p};
 if(v.w>=W){v.x=0;v.w=W}else v.x=Math.min(Math.max(v.x,0),W-v.w);if(v.h>=H){v.y=0;v.h=H}else v.y=Math.min(Math.max(v.y,0),H-v.h);return v}
function cropLayout(){if(!crImg||$("crop").hidden)return;const s=$("crS"),w=crImg.naturalWidth,h=crImg.naturalHeight,SW=s.clientWidth,SH=s.clientHeight,v=crV;
 const k=crK=Math.min((SW-40)/v.w,(SH-20)/v.h,Math.max(2,Math.min((SW-40)/w,(SH-20)/h)));
 crO=[(SW-v.w*k)/2-v.x*k,(SH-v.h*k)/2-v.y*k];const i=$("crI");i.style.width=w*k+"px";i.style.height=h*k+"px";i.style.left=crO[0]+"px";i.style.top=crO[1]+"px";cropDraw()}
function cropDraw(){const b=$("crB").style;b.left=crO[0]+crR.x*crK+"px";b.top=crO[1]+crR.y*crK+"px";b.width=crR.w*crK+"px";b.height=crR.h*crK+"px"}
$("crB").onpointerdown=e=>{e.preventDefault();const hd=e.target.dataset.h||"m",s0={...crR},x0=e.clientX,y0=e.clientY,w=crImg.naturalWidth,h=crImg.naturalHeight,m=16;
 e.target.setPointerCapture(e.pointerId);$("crop").classList.remove("anim");
 const mv=ev=>{const dx=(ev.clientX-x0)/crK,dy=(ev.clientY-y0)/crK;let{x,y,w:rw,h:rh}=s0;
  if(hd==="m"){x+=dx;y+=dy}
  else{if(hd.includes("w")){const nx=Math.min(Math.max(0,x+dx),x+rw-m);rw+=x-nx;x=nx}if(hd.includes("e"))rw=Math.min(Math.max(m,rw+dx),w-x);
   if(hd.includes("n")){const ny=Math.min(Math.max(0,y+dy),y+rh-m);rh+=y-ny;y=ny}if(hd.includes("s"))rh=Math.min(Math.max(m,rh+dy),h-y)}
  crR=crClamp({x,y,w:rw,h:rh},w,h);cropDraw()};
 const up=()=>{e.target.removeEventListener("pointermove",mv);e.target.removeEventListener("pointerup",up);e.target.removeEventListener("pointercancel",up);
  crV=crFit(crR);$("crop").classList.add("anim");cropLayout()};
 e.target.addEventListener("pointermove",mv);e.target.addEventListener("pointerup",up);e.target.addEventListener("pointercancel",up)};
const cropClose=()=>{$("crop").hidden=true;if(crImg)URL.revokeObjectURL(crImg.src);crImg=null};
$("crX").onclick=cropClose;
$("crR").onclick=()=>{const w=crImg.naturalWidth,h=crImg.naturalHeight,c=document.createElement("canvas");c.width=h;c.height=w;const g=c.getContext("2d");
 g.translate(h,0);g.rotate(Math.PI/2);g.drawImage(crImg,0,0);const r={x:h-crR.y-crR.h,y:crR.x,w:crR.h,h:crR.w};c.toBlob(b=>b&&cropOpen(b,r),"image/jpeg",.92)};
$("crOk").onclick=()=>{const r=crR,c=document.createElement("canvas");c.width=Math.round(r.w);c.height=Math.round(r.h);
 c.getContext("2d").drawImage(crImg,r.x,r.y,r.w,r.h,0,0,c.width,c.height);c.toBlob(b=>{cropClose();if(b)spineUse(b);else msg(t("badImage"))},"image/jpeg",.92)};
$("spCrop").onclick=async()=>{const cur=spId?await getSp(spId):spNew&&spNew.blob;if(cur)cropOpen(cur)};
addEventListener("resize",()=>{if(!$("cam").hidden)camLayout();cropLayout()});
addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("crop").hidden){cropClose();e.stopImmediatePropagation()}else if(!$("cam").hidden){camStop();e.stopImmediatePropagation()}},true);
$("spRot").onclick=async()=>{const cur=spId?await getSp(spId):spNew&&spNew.blob;if(!cur)return;const r=await spineBlob(cur,true);
 if(!spId){spNew.blob=r;spineFill();return}const x=rackGet(spId);await setSpine(spId,r,x?{}:{});rackRefresh()};
$("spDelPh").onclick=async()=>{if(!spId){spNew.blob=null;spineFill();return}await setSpine(spId,null);msg(t("spinePhotoOff"));rackRefresh()};
$("spOpen").onclick=()=>{const id=spId;show(null);if(id)openBook(id)};
$("spSave").onclick=async()=>{const base=paperBase();if(!base.title){msg(t("needTitle"));$("spTitle").focus();return}
 const id=newId();rackItem(id,{...base,created:now()});await setSpine(id,spNew&&spNew.blob||null,base);if(!(spNew&&spNew.blob)){const x=rackGet(id);x.spine=0}
 show(null);msg(t("paperAdded",{t:base.title}));rackRefresh()};
const paperEdit=()=>{if(!spId)return;const x=rackGet(spId);if(!x||x.kind!=="paper")return;const base=paperBase();if(!base.title||base.title===x.title&&base.author===x.author)return;Object.assign(x,base,{updated:now()});saveRack();rackRefresh()};
$("spTitle").onchange=paperEdit;$("spAuthor").onchange=paperEdit;
$("spDel").onclick=async()=>{const x=rackGet(spId);if(!x||!confirm(t("confirmRemovePaper",{t:x.title})))return;x.deleted=1;x.spine=0;x.updated=now();await delSp(x.id);spSet("folioSpineAt",x.id,0);dropUrl(x.id);saveRack();show(null);msg(t("paperRemoved"));rackRefresh()};
// ---------- feuilles : options d'un livre, choix de livres, collection, saisie ----------
let askCb=null;function ask(title,value){return new Promise(ok=>{askCb=ok;$("askTitle").textContent=title;$("askIn").value=value||"";show("shAsk");setTimeout(()=>{$("askIn").focus();$("askIn").select()},300)})}
$("askOk").onclick=()=>{const cb=askCb;askCb=null;show(null);const v=$("askIn").value.trim();cb&&cb(v||null)};
$("askNo").onclick=()=>{const cb=askCb;askCb=null;show(null);cb&&cb(null)};$("askIn").onkeydown=e=>{if(e.key==="Enter")$("askOk").click()};
let menuHash=null;
async function bookMenu(hash){const b=await getB(hash);if(!b)return;menuHash=hash;const cv=$("bkCover");cv.innerHTML="";cv.append(coverEl(b));
 $("bkTitle").textContent=b.title;$("bkAuthor").textContent=b.author||"";$("bkCoverReset").style.display=b.coverCustom?"":"none";
 const st=statusOf(b);$("bkDone").style.display=st==="done"?"none":"";$("bkUnread").style.display=st==="unread"?"none":"";fillBookCols(hash);show("shBook")}
function fillBookCols(hash){const L=$("bkCols");L.innerHTML="";
 live().slice().sort((a,b)=>a.name.localeCompare(b.name,LANG)).forEach(c=>{const d=document.createElement("div");d.className="citem"+(c.books.includes(hash)?" on":"");
  d.innerHTML=`<span class="ck">${ico("check")}</span><span class="tx"><b></b></span><small>${c.books.length}</small>`;d.querySelector("b").textContent=c.name;
  d.onclick=()=>{toggleIn(c,hash,!c.books.includes(hash));fillBookCols(hash);render()};L.append(d)});
 const n=document.createElement("div");n.className="citem";n.style.color="var(--ac)";n.innerHTML=`<span class="ck" style="border-style:dashed;color:var(--ac)">${ico("plus")}</span><span class="tx"><b>${t("newCol")}</b></span>`;
 n.onclick=async()=>{const name=await ask(t("newColQ"),"");if(name!=null){makeCol(name,[hash]);render()}bookMenu(hash)};L.append(n)}
$("bkCoverFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f||!menuHash)return;try{await setCover(menuHash,await fileToCover(f));show(null);msg(t("coverSet"))}catch(x){msg(t("badImage"))}};
$("bkCoverReset").onclick=async()=>{if(!menuHash)return;await setCover(menuHash,null);show(null);msg(t("coverReset"))};
$("bkDel").onclick=async()=>{const b=await getB(menuHash);if(!b)return;if(!confirm(t("confirmRemove",{t:b.title})))return;show(null);await delB(b.hash);
 COLS.forEach(c=>{if(c.books.includes(b.hash)){c.books=c.books.filter(h=>h!==b.hash);c.updated=now()}});saveCols();await dav?.push(b,true);render()};
// terminé : progression à 100 % ; non lu : retour au début, sans « dernière lecture » (synchronisé comme une position)
async function markStatus(hash,st){const b=cur&&cur.hash===hash?cur:await getB(hash);if(!b)return;
 if(st==="done")b.progress=1;else{b.progress=0;b.cfi="";delete b.lastRead}b.posUpdated=now();await putB(b);show(null);render();
 msg(t(st==="done"?"markedDone":"markedUnread"));if(dav)dav.push(b).catch(()=>{})}
$("bkDone").onclick=()=>menuHash&&markStatus(menuHash,"done");$("bkUnread").onclick=()=>menuHash&&markStatus(menuHash,"unread");
async function pickBooks(id){const c=colById(id);if(!c)return;$("pickTitle").textContent=t("addToColT",{t:c.name});const L=$("pickList");L.innerHTML="";
 const all=(await allB()).sort((a,b)=>a.title.localeCompare(b.title,LANG));
 all.forEach(b=>{const d=document.createElement("div");d.className="citem"+(c.books.includes(b.hash)?" on":"");d.innerHTML=`<span class="ck">${ico("check")}</span><span class="mc"></span><span class="tx"><b></b><span></span></span>`;
  d.querySelector(".mc").append(coverEl(b));d.querySelector("b").textContent=b.title;d.querySelector(".tx span").textContent=b.author||"";
  d.onclick=()=>{const on=!c.books.includes(b.hash);toggleIn(c,b.hash,on);d.classList.toggle("on",on)};L.append(d)});show("shPick")}
$("pickDone").onclick=()=>{show(null);render()};
let menuCol=null;function colMenu(id){const c=colById(id);if(!c)return;menuCol=id;$("colMenuTitle").textContent=c.name;show("shCol")}
$("colAdd").onclick=()=>pickBooks(menuCol);
$("colRename").onclick=async()=>{const c=colById(menuCol);if(!c)return;const name=await ask(t("renameColQ"),c.name);if(name!=null){c.name=name.slice(0,80);touchCol(c);render()}};
$("colDelete").onclick=()=>{const c=colById(menuCol);if(!c)return;if(!confirm(t("confirmDelCol",{t:c.name})))return;Object.assign(c,{deleted:1,books:[],name:""});touchCol(c);show(null);if(shelf===c.id)shelf=null;render();msg(t("colDeleted"))};
// couverture personnalisée (null = revenir à celle du livre) ; synchronisée avec le compte
async function setCover(hash,blob){const b=cur&&cur.hash===hash?cur:await getB(hash);if(!b)return;
 Object.assign(b,{customCover:blob,coverCustom:!!blob,coverUpdated:now(),coverSent:false});await putB(b);render();if(dav)dav.push(b).catch(()=>{})}
async function addFiles(files){let n=0;const into=shelf&&colById(shelf);for(const f of files){if(!/\.epub$/i.test(f.name)&&f.type!=="application/epub+zip")continue;try{const h=await addBuf(await f.arrayBuffer());if(into)toggleIn(into,h,true);n++}catch(x){msg(t("unreadable",{f:f.name}))}}
 if(n)msg(tn(n,"added1","addedN"));render();dav?.syncAll().then(render).catch(()=>{})}
$("file").onchange=async e=>{await addFiles(e.target.files);e.target.value=""};
let dragN=0;addEventListener("dragenter",e=>{e.preventDefault();dragN++;document.body.classList.add("dragging")});addEventListener("dragover",e=>e.preventDefault());
addEventListener("dragleave",()=>{if(--dragN<=0){dragN=0;document.body.classList.remove("dragging")}});addEventListener("drop",e=>{e.preventDefault();dragN=0;document.body.classList.remove("dragging");addFiles(e.dataTransfer.files)});
// ---------- thème / réglages ----------
if(S.line>4)S.line/=10; // ancien format (16 = 1.6)
const save=()=>localStorage.folioS=JSON.stringify(S);
const dark=h=>{const n=parseInt(h.slice(1),16);return(.299*(n>>16)+.587*((n>>8)&255)+.114*(n&255))/255<.5};
// colonne de texte centrée : lignes d'environ 70 caractères, quelle que soit la largeur de l'écran
function outer(){const r=document.documentElement;r.style.setProperty("--bg",S.bg);r.style.setProperty("--fg",S.fg);r.classList.toggle("dark",dark(S.bg));
 r.style.setProperty("--mw",Math.round(S.size*50+2*S.margin)+"px");
 // barre système du téléphone (appli installée) : même couleur que la page
 const mf=document.querySelector("link[rel=manifest]");if(mf&&/^#[0-9a-f]{6}$/i.test(S.bg))mf.href="manifest.json?c="+S.bg.slice(1);
 document.querySelector('meta[name=theme-color]').content=S.bg}
const css=()=>{const f=S.font?`"${S.font}",serif`:"",sc=S.flow==="scrolled";return`html,body{background:${S.bg} !important;color:${S.fg} !important}html{font-size:${S.size}px !important}
body{font-size:1em !important;line-height:${S.line} !important;${sc?`padding:0 ${S.margin}px !important;box-sizing:border-box;`:""}}
body *{color:${S.fg} !important;background-color:transparent !important;${f?`font-family:${f} !important;`:""}}
p,li,div,blockquote{font-size:1em !important;line-height:${S.line} !important}${S.justify?"p{text-align:justify !important;hyphens:auto}":""}a,a *{color:${dark(S.bg)?"#a798ff":"#5a47c4"} !important}
::selection{background:${dark(S.bg)?"rgba(167,152,255,.35)":"rgba(109,91,208,.25)"}}img,svg{max-width:100% !important;height:auto}img{max-height:90vh !important}img,image{-webkit-touch-callout:none}
${S.para>0?`p{margin-top:0 !important;margin-bottom:${S.para}em !important}`:""}${S.indent>=0?`p{text-indent:${S.indent}em !important}`:""}
${S.weight&&S.weight!=400?`p,li,dd,blockquote,td{font-weight:${S.weight} !important}`:""}${S.letter?`body{letter-spacing:${S.letter}em !important;word-spacing:${(S.letter*2).toFixed(3)}em !important}`:""}`};
const fontLink=c=>{if(!WEBFONTS.includes(S.font)||c.document.getElementById("wf-"+S.font))return;const l=c.document.createElement("link");l.id="wf-"+S.font;l.rel="stylesheet";
 l.href="https://fonts.googleapis.com/css2?family="+encodeURIComponent(S.font).replace(/%20/g,"+")+":ital,wght@0,300..700;1,300..700&display=swap";c.document.head.appendChild(l)};
// page faite d'une seule illustration (souvent en position absolue, ce qui casse la pagination) : image centrée sur une page
const IMGPAGE=".fn-imgpage body,.fn-imgpage body *{position:static !important;height:auto !important;min-height:0 !important;overflow:visible !important;columns:auto !important}.fn-imgpage img{display:block !important;margin:0 auto !important;max-height:calc(100vh - 2.5em) !important;width:auto !important;object-fit:contain}";
const styleC=c=>{fontLink(c);const d=c.document;let s=d.getElementById("fs");if(!s){s=d.createElement("style");s.id="fs";d.head.appendChild(s)}
 if(d.body&&d.images.length===1&&!d.querySelector("svg")&&(d.body.textContent||"").trim().length<40)d.documentElement.classList.add("fn-imgpage");s.textContent=css()+IMGPAGE};
Object.entries(THEMES).forEach(([k,[b,f]])=>{const d=document.createElement("button");d.className="theme";d.dataset.k=k;d.style.cssText=`background:${b};color:${f}`;d.innerHTML=`<b>Aa</b>${t("th_"+k)}`;d.onclick=()=>{Object.assign(S,{theme:k,bg:b,fg:f});ctl();setS()};$("themes").append(d)});
$("cBg").oninput=e=>{S.bg=e.target.value;S.theme="perso";ctl();setS()};$("cFg").oninput=e=>{S.fg=e.target.value;S.theme="perso";ctl();setS()};
const ctl=()=>{$("size").value=S.size;$("line").value=Math.round(S.line*10);$("margin").value=S.margin;$("justify").checked=!!S.justify;
 $("para").value=Math.round(S.para*10);$("weight").value=S.weight;$("letter").value=Math.round(S.letter*100);
 $("oPara").textContent=S.para>0?S.para.toFixed(1)+" em":t("bookPara");$("oWeight").textContent=TX[LANG]["w"+S.weight]||S.weight;$("oLetter").textContent=S.letter?"+"+pctS(S.letter):t("normal");
 document.querySelectorAll("#indSeg button").forEach(b=>b.classList.toggle("on",+b.dataset.i===+S.indent));
 $("oSize").textContent=S.size+" px";$("oLine").textContent=(+S.line).toFixed(1);$("oMargin").textContent=S.margin;$("cBg").value=S.bg;$("cFg").value=S.fg;
 document.querySelectorAll(".theme").forEach(x=>x.classList.toggle("on",x.dataset.k===S.theme||(THEMES[x.dataset.k][0]===S.bg&&THEMES[x.dataset.k][1]===S.fg)));
 document.querySelectorAll("#flowSeg button").forEach(b=>b.classList.toggle("on",b.dataset.f===S.flow));
 const fs=$("font");if(S.font&&![...fs.options].some(o=>o.value===S.font))fs.add(new Option(S.font,S.font));fs.value=S.font;
 document.querySelectorAll("#shSet input[type=range]").forEach(r=>r.style.setProperty("--v",(r.value-r.min)/(r.max-r.min)*100+"%"))};ctl();
["size","margin"].forEach(k=>$(k).oninput=e=>{S[k]=+e.target.value;ctl();setS()});$("line").oninput=e=>{S.line=e.target.value/10;ctl();setS()};
$("justify").onchange=e=>{S.justify=e.target.checked;setS()};
$("para").oninput=e=>{S.para=e.target.value/10;ctl();setS()};$("weight").oninput=e=>{S.weight=+e.target.value;ctl();setS()};$("letter").oninput=e=>{S.letter=e.target.value/100;ctl();setS()};
document.querySelectorAll("#indSeg button").forEach(b=>b.onclick=()=>{S.indent=+b.dataset.i;ctl();setS()});
function syncUI(){$("syncGroups").innerHTML=Object.keys(SYNC_GROUPS).map(g=>`<div class="row"><label for="sg_${g}">${t("sg_"+g)}</label><span class="switch"><input type="checkbox" id="sg_${g}" data-g="${g}"${(S.nosync||[]).includes(g)?"":" checked"}><span></span></span></div>`).join("");
 $("syncGroups").querySelectorAll("input").forEach(i=>i.onchange=()=>{const g=i.dataset.g;S.nosync=(S.nosync||[]).filter(x=>x!==g);if(!i.checked)S.nosync.push(g);save();
  if(i.checked)dav?.pullKeys(SYNC_GROUPS[g]).catch(()=>{})})}
syncUI();
$("resetS").onclick=()=>{Object.assign(S,DEFAULTS);ctl();setS();msg(t("lookReset"))};$("font").onchange=e=>{S.font=e.target.value;setS()};
document.querySelectorAll("#flowSeg button").forEach(b=>b.onclick=()=>{S.flow=b.dataset.f;ctl();setS()});
let old={},setT;function setS(remote){if(!remote){S.updated=now();clearTimeout(setT);setT=setTimeout(()=>dav?.settings().catch(()=>{}),2000)}save();outer();if(!rend)return;const lay=["size","line","margin","font","flow","justify","para","indent","weight","letter"].some(k=>old[k]!==S[k]);old={...S};
 if(lay){clearTimeout(timer);timer=setTimeout(()=>build(cur_cfi()),300)}else rend.getContents().forEach(styleC)}
const cur_cfi=()=>cur.cfi; // = début de la page lue, ou la position exacte reçue tant qu’on n’a pas bougé
// langue de l'interface (rechargement : tous les textes sont posés au démarrage)
(()=>{let l="";try{l=localStorage.folioLang||""}catch(e){}document.querySelectorAll("#langSeg button").forEach(b=>{b.classList.toggle("on",b.dataset.l===l);
 b.onclick=()=>{try{b.dataset.l?localStorage.folioLang=b.dataset.l:localStorage.removeItem("folioLang")}catch(e){}if(dav)dav.setLang(b.dataset.l||LANG).catch(()=>{});location.reload()}})})();
// ---------- lecteur ----------
async function openBook(hash){try{await dav?.pullOne?.(hash)}catch(e){}cur=await getB(hash);if(!cur)return;cur.lastRead=Date.now();await putB(cur);
 const buf=await rq(tx("files").get(hash));$("rd").classList.add("on");$("rd").classList.remove("full");$("ttl").textContent=cur.title;$("chapTop").textContent=cur.author;outer();
 book=ePub(buf);toc=[];book.loaded.navigation.then(n=>{(function w(it,l){it.forEach(i=>{const s=book.spine.get(i.href);toc.push({label:i.label.trim(),href:i.href,l,idx:s?s.index:-1});i.subitems&&w(i.subitems,l+1)})})(n.toc,0)});
 book.spine.hooks.serialize.register((o,s)=>{s.output=String(s.output||o).replace(/<script\b[\s\S]*?<\/script\s*>/gi,"").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi,"")});
 old={...S};$("ribbon").classList.remove("on");await build(cur.cfi);refreshTrack();
 if(touchy&&!localStorage.folioTips){localStorage.folioTips=1;setTimeout(()=>msg(t("tips")),900)}
 const bk=book;bk.ready.then(()=>setTimeout(()=>book===bk&&bk.locations.generate(1500).then(()=>{if(book!==bk)return;report();refreshTrack();if($("shToc").classList.contains("on"))list()}),1200))}
const toggleBars=()=>$("rd").classList.toggle("full");
function build(cfi){anchor=cfi||null;if(rend){try{rend.destroy()}catch(e){}$("viewer").innerHTML=""}const sc=S.flow==="scrolled";$("rd").classList.toggle("scrolled",sc);
 rend=book.renderTo("viewer",sc?{manager:"continuous",flow:"scrolled",width:"100%",height:"100%",allowScriptedContent:true}:{manager:"default",flow:"paginated",width:"100%",height:"100%",allowScriptedContent:true,spread:"none",gap:Math.round(S.margin*2)});
 // défilement : epub.js compte deux fois la hauteur des chapitres insérés au-dessus de la cible et atterrit trop bas
 // (fin du chapitre ou chapitre suivant) → après chaque affichage, on recale sur le début du chapitre ou l'ancre visée
 if(sc){const disp=rend.display.bind(rend);rend.display=x=>disp(x).then(r=>{place(x);return r})}
 rend.hooks.content.register(c=>{styleC(c);gestures(c);imgMenu(c)});
 rend.on("relocated",l=>{loc=l;hideSel();hideImg();report()});rend.on("selected",onSel);
 rend.on("click",e=>{if(sel.style.display==="flex"){hideSel();return}if($("imgm").style.display==="block"){hideImg();return}if(Date.now()-G.at<450)return;const w=e.view;if(String(w?.getSelection?.()||"")||e.target.closest?.("a"))return;
  const x=(w.frameElement.getBoundingClientRect().left+e.clientX)/innerWidth;if(S.flow!=="scrolled"&&x<.25)turn(-1);else if(S.flow!=="scrolled"&&x>.75)turn(1);else toggleBars()});
 rend.on("keydown",keys);cur.highlights.filter(h=>!h.deleted).forEach(drawHl);return rend.display(cfi||undefined)}
function place(x){const m=rend?.manager,sec=x&&book?.spine.get(x),v=sec&&m?.views.find(sec);if(!v)return;
 let top=0;try{if(/#|^epubcfi\(/.test(x))top=v.locationOf(x).top||0}catch(e){}m.container.scrollTop=Math.max(0,v.element.offsetTop+top-4)} // 4 px : la ligne visée compte comme visible
function keys(e){if(!rend||!$("rd").classList.contains("on"))return;if(e.key==="ArrowRight"||e.key==="PageDown")rend.next();if(e.key==="ArrowLeft"||e.key==="PageUp")rend.prev();if(e.key==="Escape"){if(document.querySelector(".sheet.on"))show(null);else if($("imgm").style.display==="block")hideImg();else $("bBack").click()}}
addEventListener("keydown",keys);
// ---------- illustration du livre → couverture (clic droit, ou appui long au doigt) ----------
let imgSrc=null;
function imgMenu(c){const d=c.document;
 const srcOf=im=>im.localName==="image"?(im.getAttribute("href")||im.getAttributeNS("http://www.w3.org/1999/xlink","href")):(im.currentSrc||im.src);
 const showAt=(im,x,y)=>{const f=d.defaultView.frameElement.getBoundingClientRect();imgSrc={src:srcOf(im),el:im};const m=$("imgm");m.style.display="block";
  m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,f.left+x))+"px";m.style.top=Math.max(8,Math.min(innerHeight-m.offsetHeight-8,f.top+y))+"px";G.at=Date.now()};
 d.addEventListener("contextmenu",e=>{const im=e.target.closest?.("img,image");if(!im)return;e.preventDefault();showAt(im,e.clientX,e.clientY)});
 let lp=null;d.addEventListener("touchstart",e=>{const im=e.target.closest?.("img,image");if(!im||e.touches.length!==1)return;const p=e.touches[0];
  lp=setTimeout(()=>{lp=null;navigator.vibrate?.(15);showAt(im,p.clientX,p.clientY)},600)},{passive:true});
 ["touchmove","touchend","touchcancel"].forEach(x=>d.addEventListener(x,()=>{if(lp){clearTimeout(lp);lp=null}},{passive:true}))}
function hideImg(){$("imgm").style.display="none";imgSrc=null}
$("imgCover").onclick=async()=>{const s=imgSrc;hideImg();if(!s||!cur)return;
 try{let img;try{img=await loadImg(s.src)}catch(e){img=s.el.localName==="img"?s.el:null}if(!img)throw new Error("img");await setCover(cur.hash,await toBlob(img));msg(t("coverSet"))}catch(x){msg(t("badImage"))}};
addEventListener("pointerdown",e=>{if(!e.target.closest("#imgm"))hideImg()});
// ---------- gestes tactiles ----------
const G={at:0},touchy=matchMedia("(hover:none)").matches;
// tourne la page ; au doigt (ou sur écran tactile) la page glisse comme du papier
function turn(dir,animate=touchy,fromDrag){const V=$("viewer"),W=V.clientWidth||innerWidth,go=()=>dir>0?rend.next():rend.prev();
 if(!animate){V.style.transform="";return go()}
 V.style.transition="transform .18s ease-in";V.style.transform=`translateX(${-dir*W*(fromDrag?1:.25)}px)`;V.style.opacity=fromDrag?"":".4";
 setTimeout(async()=>{try{await go()}catch(e){}V.style.transition="none";V.style.transform=`translateX(${dir*W*.25}px)`;V.style.opacity=".4";void V.offsetWidth; // valide la position de départ, puis glisse jusqu'au centre
  V.style.transition="transform .24s cubic-bezier(.2,.8,.2,1),opacity .2s";V.style.transform="";V.style.opacity=""},170)}
function cancelDrag(){const V=$("viewer");V.style.transition="transform .2s cubic-bezier(.2,.8,.2,1)";V.style.transform=""}
function pinchTip(n){const p=$("pinch");if(n==null){p.classList.remove("on");return}p.textContent="Aa  "+n+" px";p.classList.add("on")}
function gestures(c){const d=c.document,V=$("viewer");let s=null;
 d.addEventListener("touchstart",e=>{if(e.touches.length===2){const[a,b]=e.touches;if(s&&s.mode==="h")cancelDrag();s={pinch:1,d0:Math.hypot(a.screenX-b.screenX,a.screenY-b.screenY)||1,size:S.size};return}
  if(e.touches.length!==1){s=null;return}const p=e.touches[0];s={x:p.screenX,y:p.screenY,t:Date.now(),mode:null,dx:0,dy:0}},{passive:true});
 d.addEventListener("touchmove",e=>{if(!s)return;
  if(s.pinch){if(e.touches.length<2)return;const[a,b]=e.touches,r=Math.hypot(a.screenX-b.screenX,a.screenY-b.screenY)/s.d0;
   s.n=Math.max(12,Math.min(40,Math.round(s.size*(1+(r-1)*.45))));pinchTip(s.n);if(e.cancelable)e.preventDefault();return}
  const p=e.touches[0],dx=p.screenX-s.x,dy=p.screenY-s.y;
  if(!s.mode){if(Math.abs(dx)<10&&Math.abs(dy)<10)return;if(String(c.window.getSelection()||"")||S.flow!=="paginated"){s=null;return}s.mode=Math.abs(dx)>Math.abs(dy)?"h":"v"}
  if(e.cancelable)e.preventDefault();
  if(s.mode==="h"){s.dx=dx;V.style.transition="none";V.style.transform=`translateX(${dx}px)`}else s.dy=dy},{passive:false});
 d.addEventListener("touchend",e=>{if(!s||e.touches.length)return;const g=s;s=null;
  if(g.pinch){pinchTip(null);G.at=Date.now();if(g.n&&g.n!==S.size){S.size=g.n;ctl();setS()}return}
  if(g.mode==="h"){G.at=Date.now();const v=Math.abs(g.dx)/Math.max(1,Date.now()-g.t);if(Math.abs(g.dx)>70||(v>.35&&Math.abs(g.dx)>25))turn(g.dx<0?1:-1,true,true);else cancelDrag()}
  else if(g.mode==="v"){G.at=Date.now();if(g.dy<-70){tab="notes";show("shToc");list()}else if(g.dy>70)toggleBars()}},{passive:true});
 d.addEventListener("touchcancel",()=>{if(s&&s.mode==="h")cancelDrag();s=null;pinchTip(null)},{passive:true})}
// fiches : glisser vers le bas pour fermer
document.querySelectorAll(".sheet").forEach(sh=>{let y0=null,dy=0;
 sh.addEventListener("touchstart",e=>{y0=(sh.scrollTop<=0||e.target.closest(".grab"))&&!e.target.closest("input,select,textarea,.fn-map,.seg")?e.touches[0].clientY:null;dy=0},{passive:true});
 sh.addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy<=0){sh.style.transition="";sh.style.removeProperty("--dy");return}
  if(e.cancelable)e.preventDefault();sh.style.transition="none";sh.style.setProperty("--dy",dy+"px")},{passive:false});
 sh.addEventListener("touchend",()=>{if(y0==null)return;y0=null;sh.style.transition="";sh.style.removeProperty("--dy");if(dy>90)show(null)},{passive:true})});
// bibliothèque : tirer vers le bas pour synchroniser
(()=>{const L=$("lib"),P=$("ptr");let y0=null,dy=0;
 L.addEventListener("touchstart",e=>{y0=L.scrollTop<=0&&dav?e.touches[0].clientY:null;dy=0},{passive:true});
 L.addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy<0){y0=null;P.style.cssText="";return}
  P.style.transition="none";P.style.opacity=Math.min(1,dy/90);P.style.transform=`translate(-50%,${Math.min(dy*.55,70)-50}px) rotate(${dy*2.5}deg)`},{passive:true});
 L.addEventListener("touchend",async()=>{if(y0==null)return;y0=null;P.style.transition="";
  if(dy>90){P.classList.add("busy");P.style.transform="translate(-50%,16px)";navigator.vibrate?.(10);
   try{await dav.syncAll();render();msg(t("synced"))}catch(e){msg(t("syncFail"))}P.classList.remove("busy")}
  P.style.transform="";P.style.opacity=""},{passive:true})})();
let anchor=null;
const cmp=(a,b)=>new ePub.CFI().compare(a,b),inPage=(c,l)=>cmp(c,l.start.cfi)>=0&&cmp(c,l.end.cfi)<=0;
function report(){if(!loc)return;pct=book.locations.total>0?book.locations.percentageFromCfi(loc.start.cfi):null;const sec=book.spine.get(loc.start.href);chapter="";toc.forEach(x=>{if(sec&&x.idx>=0&&x.idx<=sec.index)chapter=x.label});
 $("chap").textContent=chapter;$("chapTop").textContent=chapter||cur.author;$("pct").textContent=pct==null?"":pctS(pct);setPct(pct);
 // position affichée par programme (ouverture, autre appareil, nouvelle mise en page) : on garde la CFI exacte tant que la lectrice
 // n'a pas bougé ; sinon chaque appareil la remplacerait par le début de sa propre page et la position reculerait de synchro en synchro
 if(!(anchor&&inPage(anchor,loc))){anchor=null;cur.cfi=loc.start.cfi;cur.posUpdated=now()}if(pct!=null)cur.progress=pct;
 const on=cur.bookmarks.some(b=>!b.deleted&&inPage(b.cfi,loc));$("bBm").classList.toggle("on",on);$("bBm").innerHTML=ico(on?"bmf":"bm");$("ribbon").classList.toggle("on",on);putB(cur);pushSoon();
 if($("shToc").classList.contains("on"))list()}
let setPct=()=>{};
function refreshTrack(){if(!book||!cur)return;setPct=FolioNotes.track($("track"),{book,highlights:cur.highlights.filter(h=>!h.deleted),bookmarks:cur.bookmarks.filter(b=>!b.deleted),go:x=>rend.display(x)});setPct(pct)}
$("bBm").onclick=()=>{if(!loc)return;const ins=cur.bookmarks.filter(b=>!b.deleted&&inPage(b.cfi,loc)),n=now();
 if(ins.length)ins.forEach(b=>{b.deleted=1;b.updated=n});else cur.bookmarks.push({cfi:loc.start.cfi,label:(chapter||t("bookmark"))+(pct==null?"":" — "+pctS(pct)),created:n,updated:n,deleted:0});
 report();refreshTrack();navigator.vibrate?.(10);msg(ins.length?t("bmRemoved"):t("bmAdded"))};
// surlignages
const sel=$("sel");Object.entries(COLORS).forEach(([n,h])=>{const b=document.createElement("button");b.style.background=h;b.title=n;b.onclick=()=>{if(pending)addHl(pending.cfi,n,pending.text);hideSel()};sel.append(b)});
const del=document.createElement("button");del.className="x";del.innerHTML=ico("trash");del.title=t("delHl");del.onclick=()=>{if(pending)rmHl(pending.cfi);hideSel()};sel.append(del);
function showSel(x,y,d){pending=d;del.style.display=d.text?"none":"grid";sel.style.display="flex";sel.style.left=Math.max(8,Math.min(innerWidth-sel.offsetWidth-8,x-sel.offsetWidth/2))+"px";sel.style.top=Math.max(70,y-60)+"px"}
function hideSel(){sel.style.display="none";pending=null}
function onSel(cfi,c){const r=c.range(cfi),s=r.toString().trim();if(!s)return;const q=r.getBoundingClientRect(),f=c.document.defaultView.frameElement.getBoundingClientRect();showSel(f.left+q.left+q.width/2,f.top+q.top,{cfi,text:s})}
function drawHl(h){rend.annotations.highlight(h.cfi,{},e=>showSel(e.clientX,e.clientY,{cfi:h.cfi}),"hl",{fill:COLORS[h.color]||h.color,"fill-opacity":"0.4","mix-blend-mode":"multiply"})}
function addHl(cfi,color,text){const n=now();let h=cur.highlights.find(x=>x.cfi===cfi);if(h){try{rend.annotations.remove(cfi,"highlight")}catch(e){}Object.assign(h,{color,deleted:0,updated:n})}else cur.highlights.push(h={cfi,color,text,created:n,updated:n,deleted:0});drawHl(h);putB(cur);pushSoon();refreshTrack();rend.getContents().forEach(c=>c.window.getSelection().removeAllRanges())}
function rmHl(cfi){const h=cur.highlights.find(x=>x.cfi===cfi);if(!h)return;h.deleted=1;h.updated=now();try{rend.annotations.remove(cfi,"highlight")}catch(e){}putB(cur);pushSoon();refreshTrack()}
// panneaux
const sheets=["shSpine","shSet","shToc","shCfg","shMfa","shAuth","shBook","shPick","shCol","shAsk","shMobile"];function show(id){hideSel?.();const opening=id&&!$(id).classList.contains("on");sheets.forEach(s=>$(s).classList.toggle("on",opening&&s===id));$("scrim").classList.toggle("on",!!opening)}
if(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))document.documentElement.classList.add("phone");
$("mobileUrl").textContent=location.host+"/app";$("mobileFab").onclick=()=>show("shMobile");$("mobileOk").onclick=()=>show(null);
$("scrim").onclick=()=>{if(askCb){$("askNo").click();return}show(null)};
$("bSet").onclick=()=>{ctl();show("shSet")};$("bToc").onclick=()=>{show("shToc");list()};$("bCfg").onclick=()=>{show("shCfg");if(dav){loadProfile().catch(()=>{});loadSessions()}};
function list(){const L=$("list");if(!cur||!book){L.innerHTML="";return}const sh=$("shToc"),keep=sh.scrollTop;
 FolioNotes.render(L,{book,title:cur.title,tab,toc:toc.map(x=>({label:x.label,href:x.href,level:x.l,idx:x.idx})),
  bookmarks:cur.bookmarks.filter(b=>!b.deleted),highlights:cur.highlights.filter(h=>!h.deleted),cur:{cfi:loc&&loc.start.cfi,pct},
  go:x=>{rend.display(x);show(null)},
  delBm:cfi=>{const b=cur.bookmarks.find(x=>x.cfi===cfi);if(b){b.deleted=1;b.updated=now()}report();refreshTrack();list();msg(t("bmRemoved"))},
  delHl:cfi=>{rmHl(cfi);list()},
  recolor:(cfi,c)=>{const h=cur.highlights.find(x=>x.cfi===cfi);if(h)addHl(cfi,c,h.text);list()},
  copy:(s,m)=>{(navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(()=>msg(m||t("copied")),()=>msg(t("copyFail")))},
  onTab:x=>{tab=x;list();sh.scrollTop=0}});sh.scrollTop=keep}
$("bBack").onclick=async()=>{show(null);hideSel();hideImg();$("track").innerHTML="";setPct=()=>{};try{rend.destroy();book.destroy()}catch(e){}rend=book=loc=null;$("rd").classList.remove("on");clearTimeout(pushT);try{await dav?.push(cur)}catch(e){}cur=null;render()};
// ---------- synchro via le compte Folio (mêmes données que l'app Linux) ----------
let dav=null,pushT;
const pushSoon=()=>{if(!dav)return;clearTimeout(pushT);const b=cur;pushT=setTimeout(()=>dav.push(b).then(()=>refreshCur(false)).catch(()=>{}),3000)};
async function refreshCur(follow){if(!cur||!rend)return;const n=await getB(cur.hash);if(!n)return;
 const moved=follow&&n.cfi&&n.cfi!==cur.cfi&&(n.posUpdated||0)>(cur.posUpdated||0);
 cur.highlights.forEach(h=>{try{rend.annotations.remove(h.cfi,"highlight")}catch(e){}});
 Object.assign(cur,{bookmarks:n.bookmarks,highlights:n.highlights,customCover:n.customCover,coverCustom:n.coverCustom,coverUpdated:n.coverUpdated,coverSent:n.coverSent});if(moved)Object.assign(cur,{cfi:n.cfi,progress:n.progress,posUpdated:n.posUpdated});
 cur.highlights.filter(h=>!h.deleted).forEach(drawHl);refreshTrack();if(moved){anchor=n.cfi;rend.display(n.cfi);msg(t("resumedOther"))}}
async function autoSync(){if(!dav||document.hidden)return;try{if(cur&&rend){clearTimeout(pushT);await dav.push(cur);await dav.settings();await refreshCur(true)}else{await dav.syncAll();render()}}catch(e){console.error(e)}}
document.addEventListener("visibilitychange",autoSync);setInterval(autoSync,120000);
const merge=(l,rem)=>{const m=new Map(l.map(x=>[x.cfi,x]));let ch=false;(rem||[]).forEach(r=>{const x=m.get(r.cfi);if(!x||(x.updated||0)<(r.updated||0)){m.set(r.cfi,{...r,deleted:+!!r.deleted});ch=true}});return[[...m.values()],ch]};
function Api(c){const base=(c.server||"").replace(/\/$/,""),h={Authorization:"Bearer "+c.token,"X-Folio-Lang":LANG};
 const f=(p,o={})=>fetch(base+p,{...o,headers:{...h,...o.headers}});
 const jf=async(p,o)=>{const r=await f(p,o);if(!r.ok){let j={};try{j=await r.json()}catch(e){}const x=new Error(r.status);x.msg=j.error;x.code=j.code;if(r.status===401&&j.code==="session")expired();throw x}return r.json()};
 const P=(p,b,m="POST")=>jf(p,{method:m,headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})});
 return{list:()=>jf("/api/books"),
  async pullOne(hash){const d=(await this.list()).find(x=>x.hash===hash);return d?this.apply(hash,d):false},
  async apply(hash,d){if(d.removed){if(await getB(hash)){await delB(hash);return true}return false}
   let b=await getB(hash);if(!b){const r=await f(`/api/files/${hash}`);if(!r.ok)return false;await addBuf(await r.arrayBuffer());b=await getB(hash);if(!b)return false}
   let ch=false;const p=d.position||{};if((p.updated||0)>(b.posUpdated||0)){Object.assign(b,{cfi:p.cfi||"",progress:p.progress||0,posUpdated:p.updated});if(!p.cfi&&!p.progress)delete b.lastRead;ch=true}
   const cv=d.cover||{};if((cv.updated||0)>(b.coverUpdated||0)){
    if(!cv.custom){Object.assign(b,{customCover:null,coverCustom:false,coverUpdated:cv.updated,coverSent:true});ch=true}
    else{const r=await f(`/api/covers/${hash}`);if(r.ok){Object.assign(b,{customCover:await r.blob(),coverCustom:true,coverUpdated:cv.updated,coverSent:true});ch=true}}}
   const[bm,c1]=merge(b.bookmarks,d.bookmarks),[hl,c2]=merge(b.highlights,d.highlights);b.bookmarks=bm;b.highlights=hl;if(ch||c1||c2){await putB(b);return true}return false},
  async push(b,removed){if(!b)return;const hash=b.hash,J={"Content-Type":"application/json"};
   if(removed){await f(`/api/books/${hash}`,{method:"PUT",headers:J,body:JSON.stringify({removed:now()})});return}
   const m=await jf(`/api/books/${hash}`,{method:"PUT",headers:J,body:JSON.stringify({title:b.title,author:b.author,position:{cfi:b.cfi,progress:b.progress||0,updated:b.posUpdated||0},
    cover:{updated:b.coverUpdated||0,custom:!!b.coverCustom},bookmarks:b.bookmarks,highlights:b.highlights})});
   if(b.coverCustom&&b.customCover&&!b.coverSent){const r=await f(`/api/covers/${hash}`,{method:"PUT",headers:{"Content-Type":b.customCover.type||"image/jpeg"},body:b.customCover});
    if(r.ok){b.coverSent=true;const x=await getB(hash);if(x&&x.coverUpdated===b.coverUpdated){x.coverSent=true;await putB(x)}}}
   await this.apply(hash,m);if((await f(`/api/files/${hash}`,{method:"HEAD"})).status===404)await f(`/api/files/${hash}`,{method:"PUT",headers:{"Content-Type":"application/epub+zip"},body:await rq(tx("files").get(hash))})},
  // réglages : le serveur l'emporte s'il est plus récent, ou à égalité (jamais modifiés : horodatage 0)
  async settings(){const keys=synced(),mine={};keys.forEach(k=>mine[k]=S[k]);
   const r=await jf("/api/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({settings:mine,updated:S.updated||0})});
   const diff=keys.some(k=>k in r.settings&&r.settings[k]!==S[k]);
   if((r.updated||0)>=(S.updated||0)&&diff){keys.forEach(k=>{if(k in r.settings)S[k]=r.settings[k]});S.updated=r.updated||0;ctl();setS(true);return true}return false},
  async pullKeys(keys){const r=await jf("/api/settings");let ch=false;keys.forEach(k=>{if(k in r.settings&&r.settings[k]!==S[k]){S[k]=r.settings[k];ch=true}});if(ch){ctl();setS(true)}},
  // collections : envoi des nôtres, le serveur renvoie la fusion
  async collections(){const r=await P("/api/collections",{collections:COLS},"PUT");const before=JSON.stringify(COLS);COLS=r;localStorage.folioCols=JSON.stringify(COLS);return JSON.stringify(r)!==before},
  // étagère : on envoie la nôtre, le serveur renvoie la fusion ; puis photos à envoyer / à récupérer
  async rack(){const before=JSON.stringify(RACK),r=await P("/api/shelf",{items:RACK},"PUT");RACK=r;localStorage.folioRack=JSON.stringify(RACK);let ch=JSON.stringify(r)!==before;
   const at=spMap("folioSpineAt"),sent=spMap("folioSpineSent");
   for(const x of RACK){const id=x.id;
    if(x.deleted||!x.spine){if(at[id]){await delSp(id);spSet("folioSpineAt",id,0);dropUrl(id);ch=true}continue}
    if(at[id]===x.spine){if(sent[id]!==x.spine){const b=await getSp(id);if(b){const q=await f(`/api/spines/${id}`,{method:"PUT",headers:{"Content-Type":b.type||"image/jpeg"},body:b});if(q.ok)spSet("folioSpineSent",id,x.spine)}}}
    else{const q=await f(`/api/spines/${id}`);if(q.ok){await putSp(id,await q.blob());spSet("folioSpineAt",id,x.spine);spSet("folioSpineSent",id,x.spine);dropUrl(id);ch=true}}}
   return ch},
  me:()=>jf("/api/me"),
  setName:name=>jf("/api/me",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})}),
  setLang:lang=>jf("/api/me",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang})}),
  avatar:async()=>{const r=await f("/api/me/avatar");return r.ok?r.blob():null},
  putAvatar:blob=>jf("/api/me/avatar",{method:"PUT",headers:{"Content-Type":blob.type},body:blob}),
  delAvatar:()=>jf("/api/me/avatar",{method:"DELETE"}),
  password:(current,next,code)=>P("/api/me/password",{current,next,code}),
  logout:()=>P("/api/logout"),logoutOthers:()=>P("/api/logout-others"),
  remove:(password,code)=>P("/api/me",{password,code},"DELETE"),
  sessions:()=>jf("/api/me/sessions"),revoke:id=>jf("/api/me/sessions/"+encodeURIComponent(id),{method:"DELETE"}),
  mfaSetup:password=>P("/api/me/mfa/setup",{password}),mfaEnable:code=>P("/api/me/mfa/enable",{code}),
  mfaDisable:(password,code)=>P("/api/me/mfa/disable",{password,code}),mfaRecovery:(password,code)=>P("/api/me/mfa/recovery",{password,code}),
  async syncAll(){let n=0;await this.settings();loadProfile().catch(()=>{});for(const d of await this.list())if(await this.apply(d.hash,d))n++;for(const b of await allB())await this.push(b);
   try{await this.collections()}catch(e){}try{if(await this.rack())rackRefresh()}catch(e){}return n}}}
let ME=null,avUrl=null;
function paintProfile(){const c=JSON.parse(localStorage.folioAcc||"null"),name=ME?.name||"",init=(name||c?.email||"?")[0].toUpperCase();
 const img=avUrl?`<img src="${avUrl}" alt="">`:"";$("av").innerHTML=img||init;
 $("bCfg").innerHTML=c?`<span class="mini">${img||init}</span>`:ico("user");$("pName").textContent=name||t("noName");$("aInfo").textContent=c?.email||"";
 $("avDel").style.display=ME?.avatar?"":"none";if(ME){$("stBooks").textContent=ME.books;$("stSince").textContent=new Date(ME.createdAt).toLocaleDateString(LOC,{month:"short",year:"numeric"});
  $("mfaState").innerHTML=ME.mfaEnabled?t("mfaOnState",{n:ME.recoveryLeft}):t("mfaOffState")}
 const mfa=!!ME?.mfaEnabled;$("mfaOn").style.display=mfa?"none":"";$("mfaActs").style.display=mfa?"":"none";document.querySelectorAll(".mfaF").forEach(e=>e.style.display=mfa?"":"none")}
const ago=x=>{const d=now()-x;return d<120?t("justNow"):d<3600?t("minAgo",{n:Math.round(d/60)}):d<86400?t("hAgo",{n:Math.round(d/3600)}):new Date(x*1000).toLocaleDateString(LOC)};
async function loadSessions(){if(!dav)return;const L=$("sessList");try{const ss=await dav.sessions();L.innerHTML="";
 ss.forEach(x=>{const d=document.createElement("div");d.className="sess";d.innerHTML='<div class="tx"><b></b><small></small></div>';d.querySelector("b").textContent=x.device;
  d.querySelector("small").textContent=t("sessLine",{ago:ago(x.lastSeen),ip:x.ip||"?",d:new Date(x.createdAt*1000).toLocaleDateString(LOC)});
  if(x.current)d.insertAdjacentHTML("beforeend",`<span class="tag">${t("thisDevice")}</span>`);else{const b=document.createElement("button");b.className="btn ghost";b.textContent=t("signOut");
   b.onclick=async()=>{try{await dav.revoke(x.id);msg(t("deviceOut"));loadSessions()}catch(e){err(e)}};d.append(b)}L.append(d)})}catch(e){}}
async function loadProfile(){if(!dav)return;const prev=ME?.avatar;ME=await dav.me();localStorage.folioMe=JSON.stringify(ME);
 if(ME.avatar&&(ME.avatar!==prev||!avUrl)){const b=await dav.avatar();if(avUrl&&avUrl.startsWith("blob:"))URL.revokeObjectURL(avUrl);avUrl=b?URL.createObjectURL(b):null;if(b)try{localStorage.folioAv=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}catch(e){}}
 if(!ME.avatar){avUrl=null;localStorage.removeItem("folioAv")}if(document.activeElement!==$("pseudo"))$("pseudo").value=ME.name||"";paintProfile()}
function initDav(){const c=JSON.parse(localStorage.folioAcc||"null");dav=c&&c.token?Api(c):null;$("accIn").style.display=c?"block":"none";$("accOut").style.display=c?"none":"block";
 $("accTitle").textContent=c?t("accTitleIn"):t("accTitleOut");
 if(c){ME=JSON.parse(localStorage.folioMe||"null");avUrl=localStorage.folioAv||null;$("aSrv").value=c.server||"";$("aMail").value=c.email;$("pseudo").value=ME?.name||""}else{ME=null;avUrl=null}paintProfile()}
const err=(e,d)=>msg(e?.msg||d||(String(e?.message)==="401"?t("expired"):t("unreachable")));
function squareImage(file){return new Promise((ok,ko)=>{const i=new Image();i.onload=()=>{const s=Math.min(i.naturalWidth,i.naturalHeight),c=document.createElement("canvas");c.width=c.height=256;
 c.getContext("2d").drawImage(i,(i.naturalWidth-s)/2,(i.naturalHeight-s)/2,s,s,0,0,256,256);URL.revokeObjectURL(i.src);c.toBlob(b=>b?ok(b):ko(new Error("img")),"image/jpeg",.9)};i.onerror=ko;i.src=URL.createObjectURL(file)})}
$("avFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f||!dav)return;try{const b=await squareImage(f);await dav.putAvatar(b);avUrl=null;ME=null;await loadProfile();msg(t("photoOk"))}catch(x){err(x,t("badImage"))}};
$("avDel").onclick=async()=>{try{await dav.delAvatar();await loadProfile();msg(t("photoRemoved"))}catch(x){err(x)}};
$("pSave").onclick=async()=>{try{ME=await dav.setName($("pseudo").value);localStorage.folioMe=JSON.stringify(ME);paintProfile();msg(t("nameSaved"))}catch(x){err(x)}};
$("pseudo").onkeydown=e=>{if(e.key==="Enter")$("pSave").click()};
$("pwSave").onclick=async()=>{if($("pwNew").value!==$("pwConf").value)return msg(t("pwMismatch"));
 try{await dav.password($("pwCur").value,$("pwNew").value,$("pwCode").value);["pwCur","pwNew","pwConf","pwCode"].forEach(i=>$(i).value="");msg(t("pwChanged"));loadProfile();loadSessions()}catch(x){err(x)}};
$("logOthers").onclick=async()=>{try{const r=await dav.logoutOthers();msg(t("devicesOut",{n:r.closed}));loadProfile();loadSessions()}catch(x){err(x)}};
const forget=()=>["folioAcc","folioMe","folioAv","folioSpineSent"].forEach(k=>localStorage.removeItem(k));
$("delAcc").onclick=async()=>{if(!confirm(t("confirmDelAcc")))return;
 try{await dav.remove($("delPw").value,$("delCode").value);forget();initDav();show(null);msg(t("accDeleted"))}catch(x){err(x)}};
function expired(){if(!localStorage.folioAcc)return;forget();initDav();msg(t("expired"))}
// ---- confirmation d'identité (mot de passe + code 2FA) pour les actions sensibles
let authCb=null;function askAuth(title,txt,{pw=true,code=!!ME?.mfaEnabled}={}){return new Promise(ok=>{authCb=ok;$("authTitle").textContent=title;$("authTxt").textContent=txt||"";
 $("authPwF").style.display=pw?"":"none";$("authCodeF").style.display=code?"":"none";$("authPw").value=$("authCode").value="";show("shAuth");setTimeout(()=>$(pw?"authPw":"authCode").focus(),300)})}
$("authOk").onclick=()=>{const cb=authCb;authCb=null;show(null);cb&&cb({password:$("authPw").value,code:$("authCode").value})};
$("authNo").onclick=()=>{const cb=authCb;authCb=null;show("shCfg");cb&&cb(null)};
["authPw","authCode"].forEach(i=>$(i).onkeydown=e=>{if(e.key==="Enter")$("authOk").click()});
// ---- 2FA
function showCodes(l){$("codes").innerHTML="";l.forEach(c=>{const s=document.createElement("span");s.textContent=c;$("codes").append(s)});$("mfa1").hidden=true;$("mfa2").hidden=false;show("shMfa");showCodes.list=l}
$("mfaOn").onclick=async()=>{const a=await askAuth(t("mfaOnT"),t("mfaOnTxt"),{code:false});if(!a)return;
 try{const r=await dav.mfaSetup(a.password);$("qr").src=r.qr;$("secret").textContent=r.secret.replace(/(.{4})/g,"$1 ").trim();$("mfaSetCode").value="";$("mfa1").hidden=false;$("mfa2").hidden=true;show("shMfa")}catch(x){err(x);show("shCfg")}};
$("mfaEnable").onclick=async()=>{try{const r=await dav.mfaEnable($("mfaSetCode").value);showCodes(r.recovery);loadProfile()}catch(x){err(x)}};
$("mfaSetCode").onkeydown=e=>{if(e.key==="Enter")$("mfaEnable").click()};$("mfaCancel").onclick=()=>show("shCfg");
$("mfaCodes").onclick=async()=>{const a=await askAuth(t("codesT"),t("codesTxt"));if(!a)return;try{const r=await dav.mfaRecovery(a.password,a.code);showCodes(r.recovery);loadProfile()}catch(x){err(x);show("shCfg")}};
$("mfaOff").onclick=async()=>{const a=await askAuth(t("mfaOffT"),t("mfaOffTxt"));if(!a)return;
 try{await dav.mfaDisable(a.password,a.code);msg(t("mfaDisabled"));await loadProfile()}catch(x){err(x)}show("shCfg")};
$("cCopy").onclick=async()=>{try{await navigator.clipboard.writeText(showCodes.list.join("\n"));msg(t("codesCopied"))}catch(e){msg(t("codesCopyFail"))}};
$("cSave").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t("codesFile",{e:JSON.parse(localStorage.folioAcc||"{}").email||""})+"\n\n"+showCodes.list.join("\n")+"\n"],{type:"text/plain"}));a.download=t("codesName");a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$("cDone").onclick=()=>{showCodes.list=null;$("codes").innerHTML="";show("shCfg")};
// ---- connexion / inscription / mot de passe oublié
let ticket=null,resetTok=null;
const srv=()=>$("aSrv").value.trim().replace(/\/$/,"");
const view=v=>{["vLogin","vMfa","vForgot","vReset","vInfo"].forEach(x=>$(x).hidden=x!==v)};
const info=s=>{$("infoTxt").textContent=s;view("vInfo")};
async function pub(p,b){try{const r=await fetch(srv()+p,{method:"POST",headers:{"Content-Type":"application/json","X-Folio-Lang":LANG},body:JSON.stringify(b)});let j={};try{j=await r.json()}catch(e){}return{ok:r.ok,status:r.status,j}}catch(e){return{ok:false,j:{error:t("unreachable")}}}}
async function loggedIn(token){localStorage.folioAcc=JSON.stringify({server:srv(),email:$("aMail").value.trim().toLowerCase(),token});$("aPass").value="";$("mfaCode").value="";ticket=null;initDav();view("vLogin");show(null);await doSync()}
$("aLogin").onclick=async()=>{$("unver").hidden=true;const r=await pub("/api/login",{email:$("aMail").value,password:$("aPass").value});
 if(!r.ok){if(r.j.code==="unverified")$("unver").hidden=false;return msg(r.j.error||t("error",{s:r.status}))}
 if(r.j.mfa){ticket=r.j.ticket;view("vMfa");setTimeout(()=>$("mfaCode").focus(),50);return}loggedIn(r.j.token)};
$("mfaGo").onclick=async()=>{const r=await pub("/api/login/mfa",{ticket,code:$("mfaCode").value});if(!r.ok){msg(r.j.error||t("badCode"));if(r.j.code==="ticket")view("vLogin");return}loggedIn(r.j.token)};
$("mfaCode").onkeydown=e=>{if(e.key==="Enter")$("mfaGo").click()};
$("aReg").onclick=async()=>{const r=await pub("/api/register",{email:$("aMail").value,password:$("aPass").value});if(!r.ok)return msg(r.j.error||t("error",{s:r.status}));$("aPass").value="";info(r.j.message)};
$("resend").onclick=async()=>{const r=await pub("/api/verify/resend",{email:$("aMail").value});info(r.j.message||r.j.error)};
$("lnkForgot").onclick=()=>{$("fMail").value=$("aMail").value;view("vForgot")};
$("fGo").onclick=async()=>{const r=await pub("/api/password/forgot",{email:$("fMail").value});info(r.j.message||r.j.error)};
$("rGo").onclick=async()=>{if($("rNew").value!==$("rConf").value)return msg(t("pwMismatch"));
 const r=await pub("/api/password/reset",{token:resetTok,password:$("rNew").value,code:$("rCode").value||undefined});
 if(!r.ok){if(r.j.code==="mfa_required"||r.j.code==="mfa_invalid")$("rCodeF").hidden=false;return msg(r.j.error)}
 resetTok=null;["rNew","rConf","rCode"].forEach(i=>$(i).value="");forget();initDav();info(t("pwResetDone"))};
document.querySelectorAll("#accOut .back").forEach(b=>b.onclick=()=>{ticket=null;view("vLogin")});
$("aOut").onclick=async()=>{try{await dav?.logout()}catch(e){}forget();initDav();show(null);msg(t("loggedOut"))};
$("aPass").onkeydown=e=>{if(e.key==="Enter")$("aLogin").click()};$("aSyncNow").onclick=()=>{show(null);doSync()};
// liens reçus par mail : #verify=… / #reset=…
async function mailLinks(){const h=new URLSearchParams(location.hash.slice(1)),v=h.get("verify"),rs=h.get("reset");if(!v&&!rs)return;
 history.replaceState(null,"",location.pathname+location.search);$("accIn").style.display="none";$("accOut").style.display="block";show("shCfg");
 if(v){const r=await pub("/api/verify",{token:v});if(r.ok){$("aMail").value=r.j.email||"";info(t("verified"))}else info(r.j.error)}
 if(rs){resetTok=rs;$("rCodeF").hidden=true;view("vReset")}}
async function doSync(){if(!dav){show("shCfg");return}const ic=$("bSync").firstElementChild;ic.classList.add("spin");try{const n=await dav.syncAll();await render();msg(n?tn(n,"updated1","updatedN"):t("synced"))}
 catch(e){msg(String(e.message)==="401"?t("expired"):t("syncError"));console.error(e)}finally{ic.classList.remove("spin")}}
$("bSync").onclick=doSync;
addEventListener("hashchange",mailLinks);
(async()=>{initDav();outer();mailLinks();await open();render();if(navigator.serviceWorker)navigator.serviceWorker.register("sw.js",{updateViaCache:"none"});if(dav)doSync()})();
