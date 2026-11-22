const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const Fastify = require("fastify");
const QRCode = require("qrcode");
const { mergeState, mergeDraft } = require("./merge");
const { trimWav } = require("./trim");
const { Tts } = require("./tts");
const { GoogleTts } = require("./gtts");
const { AzureTts } = require("./azuretts");
const S = require("./security");
const { esc } = require("./mailer");
const { langOf, t, pick } = require("./i18n");

const HASH = /^[0-9a-f]{40}$/;
const EMAIL = /^[^@\s"<>]{1,64}@[^@\s"<>]+\.[^@\s"<>]{2,}$/;
const SESSION_TTL = 30 * 86400;        // inactivité max d'une session
const SESSION_MAX = 365 * 86400;       // durée de vie absolue
const CID = /^[a-z0-9]{6,32}$/;
const CTRL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/g;

function toState(r) {
  if (r.removed) return { hash: r.hash, removed: r.removed };
  return { hash: r.hash, title: r.title, author: r.author,
    position: { cfi: r.cfi, progress: r.progress, updated: r.posUpdated },
    cover: { updated: r.coverUpdated || 0, custom: !!r.coverCustom },
    name: { title: r.nameTitle || "", updated: r.nameUpdated || 0 },
    bookmarks: JSON.parse(r.bookmarks), highlights: JSON.parse(r.highlights), postits: JSON.parse(r.postits || "[]") };
}
const normEmail = (e) => String(e || "").normalize("NFKC").trim().toLowerCase();
// Forme canonique d'une adresse : « a.b+x@gmail.com » et « ab@googlemail.com » désignent la même boîte
function emailKey(mail) {
  const at = mail.lastIndexOf("@");
  let local = mail.slice(0, at).split("+")[0], domain = mail.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}
function uaName(ua = "", lang = "fr") {
  const b = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : t(lang, "browser");
  const o = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return o ? `${b} ${t(lang, "on")} ${o}` : b;
}
// Ne garde que les champs attendus des marque-pages / surlignages (aucune donnée arbitraire stockée)
const COLORS = new Set(["yellow", "green", "blue", "pink", "orange", "red", "purple", "teal"]);
const num = (x) => (Number.isFinite(+x) ? +x : 0);
const cleanItems = (a) => (Array.isArray(a) ? a : []).filter((x) => x && typeof x.cfi === "string" && x.cfi.length <= 2000)
  .map((x) => ({ cfi: x.cfi, label: String(x.label ?? "").slice(0, 300), color: COLORS.has(x.color) ? x.color : "yellow",
    text: String(x.text ?? "").slice(0, 5000), created: num(x.created), updated: num(x.updated), deleted: x.deleted ? 1 : 0 }));
// post-it : un mot laissé à un endroit du livre (cfi), sa couleur, son texte
const cleanPostits = (a) => (Array.isArray(a) ? a : []).filter((x) => x && typeof x.cfi === "string" && x.cfi.length <= 2000)
  .map((x) => ({ cfi: x.cfi, color: COLORS.has(x.color) ? x.color : "yellow", text: String(x.text ?? "").slice(0, 5000),
    // place sur la page : accroche dans le texte (at), position (fx de 0 à 1, dy en px), taille ; passages surlignés cités (refs)
    at: typeof x.at === "string" ? x.at.slice(0, 2000) : "", fx: x.fx >= 0 && x.fx <= 1 ? num(x.fx) : -1,
    dy: Math.max(-3000, Math.min(3000, num(x.dy))), w: Math.max(0, Math.min(800, num(x.w))), h: Math.max(0, Math.min(800, num(x.h))),
    refs: (Array.isArray(x.refs) ? x.refs : []).filter((r) => typeof r === "string" && r.length <= 2000).slice(0, 20),
    created: num(x.created), updated: num(x.updated), deleted: x.deleted ? 1 : 0 }));
// Collections : on ne garde que les champs attendus ; les suppressions sont des pierres tombales (deleted=1)
const cleanCollections = (a) => (Array.isArray(a) ? a : []).filter((c) => c && CID.test(String(c.id))).slice(0, 500)
  .map((c) => ({ id: c.id, name: String(c.name ?? "").normalize("NFKC").replace(CTRL, "").trim().slice(0, 80),
    books: [...new Set((Array.isArray(c.books) ? c.books : []).filter((h) => HASH.test(h)))].slice(0, 5000),
    created: num(c.created), updated: num(c.updated), deleted: c.deleted ? 1 : 0 }));
function mergeCollections(cur, inc) {
  const m = new Map(cur.map((c) => [c.id, c]));
  for (const c of inc) { const l = m.get(c.id); if (!l || (l.updated || 0) < (c.updated || 0)) m.set(c.id, c); }
  return [...m.values()];
}
// Étagère : livres numériques (id = empreinte du fichier) et livres papier (id aléatoire) ;
// « spine » = date de la photo de tranche en vigueur (0 = pas de photo). Fusion par livre : le plus récent gagne.
const SID = /^(?:[0-9a-f]{40}|[a-z0-9]{6,32})$/;
const txt = (s, n) => String(s ?? "").normalize("NFKC").replace(CTRL, "").trim().slice(0, n);
// décorations (kind "deco") : dessin intégré (deco), ou photo / aperçu d'un modèle 3D (spine) et fichier .glb (model) ;
// pos = place parmi les livres triés (2.5 = entre le 3e et le 4e), size = échelle
const DECO_KEY = /^[a-z]{2,16}$/;
const cleanShelf = (a) => (Array.isArray(a) ? a : []).filter((x) => x && SID.test(String(x.id))).slice(0, 10000)
  .map((x) => {
    const kind = x.kind === "paper" || x.kind === "deco" ? x.kind : "book";
    const o = { id: x.id, kind, title: txt(x.title, 300), author: txt(x.author, 200),
      spine: num(x.spine), front: num(x.front), back: num(x.back), created: num(x.created), updated: num(x.updated), deleted: x.deleted ? 1 : 0 };
    if (kind === "deco") Object.assign(o, { deco: DECO_KEY.test(x.deco) ? x.deco : "", pos: Math.max(-1e5, Math.min(1e5, num(x.pos))),
      size: Math.max(.5, Math.min(2, num(x.size) || 1)), model: num(x.model), front: 0, back: 0 });
    return o;
  })
  .filter((x) => x.kind !== "book" || HASH.test(x.id));
// Manuscrits : HTML gardé tel quel (jamais affiché par le serveur ; les clients le nettoient avant affichage et export)
const COVER = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const cleanDraft = (id, d) => ({ id, title: txt(d.title, 300), author: txt(d.author, 200),
  lang: /^[a-z]{2,3}(?:-[A-Za-z]{2})?$/.test(d.lang) ? d.lang : "fr", desc: String(d.desc ?? "").slice(0, 4000),
  cover: d.cover === undefined ? undefined : typeof d.cover === "string" && d.cover.length < 3e6 && COVER.test(d.cover) ? d.cover : "",
  order: (Array.isArray(d.order) ? d.order : []).filter((x) => CID.test(String(x))).slice(0, 2000),
  created: num(d.created), updated: num(d.updated), deleted: d.deleted ? 1 : 0,
  chapters: d.deleted ? [] : (Array.isArray(d.chapters) ? d.chapters : []).filter((c) => c && CID.test(String(c.id))).slice(0, 2000)
    .map((c) => ({ id: c.id, title: txt(c.title, 300), html: c.deleted ? "" : String(c.html ?? "").slice(0, 4e6),
      created: num(c.created), updated: num(c.updated), deleted: c.deleted ? 1 : 0 })) });
function dirSize(d) {
  try { return fs.readdirSync(d).reduce((n, f) => n + fs.statSync(path.join(d, f)).size, 0); } catch { return 0; }
}

function build(db, { dataDir, publicDir, downloadsDir = "", allowSignup = true, publicUrl = "", mailer, quotaMB = 2048, ttsDir = "", googleKey = "", azureKey = "", azureRegion = "", ttsDailyChars = 200000 }) {
  const app = Fastify({ bodyLimit: 2 * 1024 * 1024 });
  const key = S.loadKey(dataDir);
  const RL = new S.Limiter();
  const tickets = new Map();             // tickets 2FA en attente : sha256(ticket) → { userId, exp, tries }
  const base = (publicUrl || "").replace(/\/$/, "");
  const tts = Tts(ttsDir), gtts = GoogleTts(googleKey, path.join(dataDir, "tts-cache"));
  const atts = AzureTts(azureKey, azureRegion, path.join(dataDir, "tts-cache"));
  const cloud = [gtts, atts];                       // voix en ligne, dans l'ordre de la liste
  const ttsUse = new Map();            // caractères envoyés à Google aujourd'hui, par compte (protège la facture)

  app.addContentTypeParser("application/epub+zip", { parseAs: "buffer", bodyLimit: 300 * 1024 * 1024 }, (_r, b, done) => done(null, b));
  app.addContentTypeParser(["image/png", "image/jpeg", "image/webp"], { parseAs: "buffer", bodyLimit: 3 * 1024 * 1024 }, (_r, b, done) => done(null, b));
  app.addContentTypeParser("model/gltf-binary", { parseAs: "buffer", bodyLimit: 20 * 1024 * 1024 }, (_r, b, done) => done(null, b));

  // Le serveur n'écoute que derrière Cloudflare Tunnel : l'IP réelle est dans CF-Connecting-IP
  const ipOf = (req) => String(req.headers["cf-connecting-ip"] || req.ip || "").slice(0, 64);
  const L = (req) => langOf(req);
  const deviceOf = (req) => String(req.headers["x-folio-device"] || uaName(req.headers["user-agent"], L(req)))
    .replace(/[^\p{L}\p{N} ._()\-·–]/gu, "").slice(0, 80) || t(L(req), "unknown_device");
  // les messages d'erreur sont des clés traduites dans la langue de la requête (cf. i18n.js)
  const fail = (reply, code, key, extra = {}, vars) => reply.code(code).send({ error: t(L(reply.request), key, vars), ...extra });
  const tooMany = (reply, key = "too_many") => fail(reply, 429, key);

  // ---------- en-têtes de sécurité ----------
  let csp = "";
  if (publicDir && fs.existsSync(publicDir)) {
    // empreintes des éventuels scripts en ligne de toutes les pages
    const html = fs.readdirSync(publicDir, { recursive: true }).filter((f) => /\.html$/.test(f))
      .map((f) => fs.readFileSync(path.join(publicDir, f), "utf8")).join("\n");
    const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((m) => `'sha256-${crypto.createHash("sha256").update(m[1]).digest("base64")}'`).join(" ");
    csp = ["default-src 'self'", `script-src 'self' ${hashes}`, "style-src 'self' 'unsafe-inline' blob: https://fonts.googleapis.com",
      "font-src 'self' data: blob: https://fonts.gstatic.com", "img-src 'self' data: blob:", "connect-src 'self'",
      "frame-src 'self' blob: about:", "worker-src 'self'", "manifest-src 'self'", "media-src 'self' blob: data:",
      "object-src 'none'", "base-uri 'self'", "form-action 'none'", "frame-ancestors 'none'"].join("; ");
  }
  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=()");
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Resource-Policy", "same-origin");
    reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
    if (csp && String(reply.getHeader("content-type") || "").startsWith("text/html")) reply.header("Content-Security-Policy", csp);
    return payload;
  });
  app.setErrorHandler((err, _req, reply) => {
    const code = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (code === 500) console.error(err);
    fail(reply, code, code === 413 ? "too_big" : code === 500 ? "internal" : "bad_request");
  });

  // ---------- sessions ----------
  async function createSession(req, userId) {
    const token = S.randomToken(32), t = S.now();
    await db.session.create({ data: { tokenHash: S.sha256(token), userId, createdAt: t, lastSeen: t,
      expiresAt: t + SESSION_TTL, ip: ipOf(req), device: deviceOf(req) } });
    return token;
  }
  // langue des mails : celle de l'appli qui fait la demande, sinon celle enregistrée pour le compte
  const mlang = (req, u) => pick(req.headers["x-folio-lang"]) || (u && pick(u.lang)) || L(req);
  const fmtDate = (s, lang) => new Date(s * 1000).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" });
  // mail traduit : m = préfixe des clés (m_xxx_s / _t / _b), vars = valeurs déjà échappées
  function mail(req, u, m, vars = {}, button) {
    const lg = mlang(req, u);
    return mailer.send(u.email, t(lg, `m_${m}_s`), t(lg, `m_${m}_t`), t(lg, `m_${m}_b`, vars), button && { label: t(lg, button.label), url: button.url }, lg);
  }
  async function alert(req, u, m, vars = {}) {
    const lg = mlang(req, u);
    await mailer.send(u.email, t(lg, `m_${m}_s`), t(lg, `m_${m}_t`),
      `${t(lg, `m_${m}_b`, vars)}<p style="color:#666;font-size:13px">${t(lg, "m_not_you")}</p>`, null, lg);
  }
  async function finishLogin(req, u, recovery = false) {
    const token = await createSession(req, u.id);
    const lg = mlang(req, u);
    if (pick(req.headers["x-folio-lang"]) && u.lang !== lg) db.user.update({ where: { id: u.id }, data: { lang: lg } }).catch(() => {});
    alert(req, u, "login", { via: recovery ? t(lg, "m_via", { x: t(lg, "m_via_recovery") }) : "",
      device: esc(deviceOf(req)), ip: esc(ipOf(req)), date: fmtDate(S.now(), lg) });
    return { token };
  }

  // ---------- liens envoyés par mail ----------
  const findByMail = async (mail) => (await db.user.findUnique({ where: { emailKey: emailKey(mail) } }))
    || db.user.findUnique({ where: { email: mail } });
  async function emailToken(userId, kind, ttl) {
    const t = S.randomToken(32);
    await db.emailToken.deleteMany({ where: { userId, kind, usedAt: null } });
    await db.emailToken.create({ data: { userId, kind, hash: S.sha256(t), expiresAt: S.now() + ttl } });
    return t;
  }
  async function findToken(t, kind) {
    if (typeof t !== "string" || t.length < 20 || t.length > 100) return null;
    const r = await db.emailToken.findUnique({ where: { hash: S.sha256(t) } });
    return r && r.kind === kind && !r.usedAt && r.expiresAt > S.now() ? r : null;
  }
  const consume = (r) => db.emailToken.update({ where: { id: r.id }, data: { usedAt: S.now() } });
  async function sendVerify(req, u) {
    const tok = await emailToken(u.id, "verify", 24 * 3600);
    await mail(req, u, "verify", {}, { label: "m_verify_btn", url: `${base}/app/#verify=${tok}` });
  }

  // ---------- second facteur ----------
  async function checkSecondFactor(req, u, code) {
    const step = S.checkTotp(S.decrypt(key, u.mfaSecret), code, u.mfaLastStep);
    if (step) { await db.user.update({ where: { id: u.id }, data: { mfaLastStep: step } }); return "totp"; }
    const c = S.normRecovery(code);
    if (c.length !== 10) return null;
    const codes = await db.recoveryCode.findMany({ where: { userId: u.id, usedAt: null } });
    const hit = codes.find((r) => S.safeEq(r.hash, S.sha256(c)));
    if (!hit) return null;
    await db.recoveryCode.update({ where: { id: hit.id }, data: { usedAt: S.now() } });
    alert(req, u, "rec", { n: codes.length - 1 });
    return "recovery";
  }
  // Vérifie mot de passe (+ code 2FA si activée) pour les actions sensibles
  async function reauth(req, reply, { needPassword = true } = {}) {
    if (RL.hit(`sens:${req.userId}`, 10, 900)) { tooMany(reply); return null; }
    const u = await db.user.findUnique({ where: { id: req.userId } });
    const { password, code } = req.body || {};
    if (needPassword && !(await S.verifyPassword(password, u.salt, u.hash)).ok) { fail(reply, 403, "bad_password"); return null; }
    if (u.mfaEnabled) {
      if (!code) { fail(reply, 403, "mfa_required", { code: "mfa_required" }); return null; }
      if (!(await checkSecondFactor(req, u, code))) { fail(reply, 403, "mfa_invalid", { code: "mfa_invalid" }); return null; }
    }
    return u;
  }

  // ========== routes publiques ==========
  app.get("/api/config", async () => ({ signup: allowSignup, mail: mailer.configured }));

  app.post("/api/register", async (req, reply) => {
    if (!allowSignup) return fail(reply, 403, "signup_closed");
    if (RL.hit(`reg:${ipOf(req)}`, 5, 3600)) return tooMany(reply);
    const { email, password } = req.body || {};
    const mail = normEmail(email);
    if (!EMAIL.test(mail) || mail.length > 254) return fail(reply, 400, "bad_email");
    const prob = await S.passwordProblem(password, mail);
    if (prob) return fail(reply, 400, prob);
    const ex = await findByMail(mail);
    if (ex && ex.emailVerified) return fail(reply, 409, "taken");
    const { salt, hash } = await S.hashPassword(password);
    // compte non confirmé : le dernier à s'inscrire l'emporte (seul le vrai propriétaire de l'adresse pourra le confirmer)
    const data = { email: mail, emailKey: emailKey(mail), salt, hash, pwChanged: S.now(), lang: mlang(req) };
    let u;
    try {
      u = ex ? await db.user.update({ where: { id: ex.id }, data }) : await db.user.create({ data });
    } catch (e) {
      if (e.code === "P2002") return fail(reply, 409, "taken");   // inscription simultanée
      throw e;
    }
    if (!RL.hit(`verifymail:${mail}`, 3, 3600)) sendVerify(req, u);
    return { ok: true, message: t(L(req), "signup_sent") };
  });

  app.post("/api/verify", async (req, reply) => {
    if (RL.hit(`verify:${ipOf(req)}`, 20, 3600)) return tooMany(reply);
    const r = await findToken((req.body || {}).token, "verify");
    if (!r) return fail(reply, 400, "bad_verify");
    await consume(r);
    const u = await db.user.update({ where: { id: r.userId }, data: { emailVerified: true } });
    return { ok: true, email: u.email };
  });
  app.post("/api/verify/resend", async (req, reply) => {
    if (RL.hit(`resend:${ipOf(req)}`, 5, 3600)) return tooMany(reply);
    const mail = normEmail((req.body || {}).email);
    const u = EMAIL.test(mail) && (await findByMail(mail));
    if (u && !u.emailVerified && !RL.hit(`verifymail:${mail}`, 3, 3600)) await sendVerify(req, u);
    return { ok: true, message: t(L(req), "mail_sent") };
  });

  app.post("/api/password/forgot", async (req, reply) => {
    if (RL.hit(`forgot:${ipOf(req)}`, 5, 3600)) return tooMany(reply);
    const mail = normEmail((req.body || {}).email);
    const u = EMAIL.test(mail) && (await findByMail(mail));
    if (u && !RL.hit(`forgotmail:${mail}`, 3, 3600)) {
      const tok = await emailToken(u.id, "reset", 3600);
      await mail(req, u, "forgot", { device: esc(deviceOf(req)), ip: esc(ipOf(req)) }, { label: "m_forgot_btn", url: `${base}/app/#reset=${tok}` });
    }
    return { ok: true, message: t(L(req), "mail_sent") };
  });
  app.post("/api/password/reset", async (req, reply) => {
    if (RL.hit(`reset:${ipOf(req)}`, 10, 3600)) return tooMany(reply);
    const { token, password, code } = req.body || {};
    const r = await findToken(token, "reset");
    if (!r) return fail(reply, 400, "bad_reset");
    const u = await db.user.findUnique({ where: { id: r.userId } });
    const prob = await S.passwordProblem(password, u.email);
    if (prob) return fail(reply, 400, prob);
    if (u.mfaEnabled) {     // l'accès à la boîte mail ne suffit pas quand la 2FA est active
      if (!code) return fail(reply, 403, "mfa_required", { code: "mfa_required" });
      if (RL.hit(`resetmfa:${u.id}`, 5, 900)) return tooMany(reply);
      if (!(await checkSecondFactor(req, u, code))) return fail(reply, 403, "bad_code", { code: "mfa_invalid" });
    }
    await consume(r);
    const { salt, hash } = await S.hashPassword(password);
    await db.user.update({ where: { id: u.id }, data: { salt, hash, pwChanged: S.now(), emailVerified: true } });
    await db.session.deleteMany({ where: { userId: u.id } });
    alert(req, u, "pwreset");
    return { ok: true };
  });

  app.post("/api/login", async (req, reply) => {
    const { email, password } = req.body || {};
    const mail = normEmail(email);
    if (RL.hit(`login:${ipOf(req)}`, 30, 900)) return tooMany(reply);
    if (RL.peek(`loginfail:${mail}`, 8)) return tooMany(reply, "too_many_account");
    const u = mail && (await findByMail(mail));
    if (!u) { await S.dummyVerify(password || ""); RL.hit(`loginfail:${mail}`, 8, 900); return fail(reply, 401, "bad_login"); }
    const v = await S.verifyPassword(password || "", u.salt, u.hash);
    if (!v.ok) { RL.hit(`loginfail:${mail}`, 8, 900); return fail(reply, 401, "bad_login"); }
    if (v.rehash) { const h = await S.hashPassword(password); await db.user.update({ where: { id: u.id }, data: h }); }
    if (!u.emailVerified)
      return fail(reply, 403, "unverified", { code: "unverified" });
    RL.clear(`loginfail:${mail}`);
    if (u.mfaEnabled) {
      const ticket = S.randomToken(24);
      tickets.set(S.sha256(ticket), { userId: u.id, exp: S.now() + 300, tries: 0 });
      return { mfa: true, ticket };
    }
    return finishLogin(req, u);
  });
  app.post("/api/login/mfa", async (req, reply) => {
    if (RL.hit(`mfa:${ipOf(req)}`, 30, 900)) return tooMany(reply);
    const { ticket, code } = req.body || {};
    const k = S.sha256(String(ticket || "")), tk = tickets.get(k);
    if (!tk || tk.exp < S.now()) { tickets.delete(k); return fail(reply, 401, "ticket_expired", { code: "ticket" }); }
    if (++tk.tries > 5) { tickets.delete(k); return fail(reply, 429, "ticket_tries", { code: "ticket" }); }
    const u = await db.user.findUnique({ where: { id: tk.userId } });
    const how = u && u.mfaEnabled && (await checkSecondFactor(req, u, code));
    if (!how) return fail(reply, 401, "bad_code");
    tickets.delete(k);
    return finishLogin(req, u, how === "recovery");
  });
  setInterval(() => { const t = S.now(); for (const [k, v] of tickets) if (v.exp < t) tickets.delete(k); }, 60_000).unref();

  // ========== routes authentifiées ==========
  app.register(async (api) => {
    api.addHook("preHandler", async (req, reply) => {
      const tok = (req.headers.authorization || "").replace(/^Bearer /, "");
      if (!tok || tok.length > 128) return fail(reply, 401, "not_logged", { code: "session" });
      const s = await db.session.findUnique({ where: { tokenHash: S.sha256(tok) } });
      const n = S.now();
      if (!s || s.expiresAt < n) {
        if (s) await db.session.delete({ where: { id: s.id } }).catch(() => {});
        return fail(reply, 401, "session_expired", { code: "session" });
      }
      if (n - s.lastSeen > 3600)
        await db.session.update({ where: { id: s.id }, data: { lastSeen: n, ip: ipOf(req),
          expiresAt: Math.min(n + SESSION_TTL, s.createdAt + SESSION_MAX) } });
      req.userId = s.userId; req.sessionId = s.id;
    });

    // ---------- profil ----------
    const avatarFile = (id) => path.join(dataDir, "avatars", id);
    const coverFile = (id, hash) => path.join(dataDir, "covers", id, hash);
    const imgType = (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? "image/png"
      : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "image/jpeg"
      : b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP" ? "image/webp" : null;
    const me = async (id) => {
      const u = await db.user.findUnique({ where: { id } });
      const [books, sessions, recoveryLeft] = await Promise.all([
        db.bookState.count({ where: { userId: id, removed: null } }), db.session.count({ where: { userId: id } }),
        db.recoveryCode.count({ where: { userId: id, usedAt: null } })]);
      return { email: u.email, name: u.name || "", avatar: u.avatarUpdated || 0, createdAt: u.createdAt, books, sessions,
        emailVerified: u.emailVerified, mfaEnabled: u.mfaEnabled, recoveryLeft, storageMB: Math.round(dirSize(path.join(dataDir, "files", id)) / 1048576), quotaMB };
    };
    api.get("/api/me", async (req) => me(req.userId));
    api.patch("/api/me", async (req, reply) => {
      const b = req.body || {}, data = {};
      if ("name" in b) {
        data.name = String(b.name ?? "").normalize("NFKC").replace(CTRL, "").trim().replace(/\s+/g, " ");
        if (data.name.length > 40) return fail(reply, 400, "name_long");
      }
      if ("lang" in b) data.lang = pick(b.lang) || "";
      await db.user.update({ where: { id: req.userId }, data });
      return me(req.userId);
    });
    api.get("/api/me/avatar", async (req, reply) => {
      const f = avatarFile(req.userId);
      if (!fs.existsSync(f)) return fail(reply, 404, "no_photo");
      const b = fs.readFileSync(f);
      return reply.type(imgType(b) || "application/octet-stream").header("Content-Disposition", "inline; filename=avatar").send(b);
    });
    api.put("/api/me/avatar", async (req, reply) => {
      if (RL.hit(`avatar:${req.userId}`, 20, 3600)) return tooMany(reply);
      if (!Buffer.isBuffer(req.body) || !imgType(req.body)) return fail(reply, 400, "image_expected");
      fs.mkdirSync(path.dirname(avatarFile(req.userId)), { recursive: true });
      fs.writeFileSync(avatarFile(req.userId), req.body);
      await db.user.update({ where: { id: req.userId }, data: { avatarUpdated: S.now() } });
      return me(req.userId);
    });
    api.delete("/api/me/avatar", async (req) => {
      fs.rmSync(avatarFile(req.userId), { force: true });
      await db.user.update({ where: { id: req.userId }, data: { avatarUpdated: 0 } });
      return me(req.userId);
    });

    // ---------- mot de passe / sessions ----------
    api.post("/api/me/password", async (req, reply) => {
      const { current, next } = req.body || {};
      req.body = { ...(req.body || {}), password: current };
      const u = await reauth(req, reply); if (!u) return;
      const prob = await S.passwordProblem(next, u.email);
      if (prob) return fail(reply, 400, prob);
      const h = await S.hashPassword(next);
      await db.user.update({ where: { id: u.id }, data: { ...h, pwChanged: S.now() } });
      await db.session.deleteMany({ where: { userId: u.id, NOT: { id: req.sessionId } } });
      alert(req, u, "pw", { device: esc(deviceOf(req)) });
      return { ok: true };
    });
    api.get("/api/me/sessions", async (req) =>
      (await db.session.findMany({ where: { userId: req.userId }, orderBy: { lastSeen: "desc" } }))
        .map((s) => ({ id: s.id, device: s.device, ip: s.ip, createdAt: s.createdAt, lastSeen: s.lastSeen, current: s.id === req.sessionId })));
    api.delete("/api/me/sessions/:id", async (req) => {
      const r = await db.session.deleteMany({ where: { id: String(req.params.id), userId: req.userId } });
      return { ok: true, closed: r.count };
    });
    api.post("/api/logout", async (req) => { await db.session.deleteMany({ where: { id: req.sessionId } }); return { ok: true }; });
    api.post("/api/logout-others", async (req) => {
      const r = await db.session.deleteMany({ where: { userId: req.userId, NOT: { id: req.sessionId } } });
      return { ok: true, closed: r.count };
    });

    // ---------- double authentification ----------
    api.post("/api/me/mfa/setup", async (req, reply) => {
      const u = await reauth(req, reply); if (!u) return;
      if (u.mfaEnabled) return fail(reply, 409, "mfa_already");
      const secret = S.newTotpSecret();
      await db.user.update({ where: { id: u.id }, data: { mfaSecret: S.encrypt(key, secret), mfaLastStep: 0 } });
      const uri = `otpauth://totp/${encodeURIComponent("Folio:" + u.email)}?secret=${secret}&issuer=Folio&algorithm=SHA1&digits=6&period=30`;
      return { secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 260, errorCorrectionLevel: "M" }) };
    });
    api.post("/api/me/mfa/enable", async (req, reply) => {
      if (RL.hit(`mfaenable:${req.userId}`, 10, 900)) return tooMany(reply);
      const u = await db.user.findUnique({ where: { id: req.userId } });
      if (u.mfaEnabled) return fail(reply, 409, "mfa_already_short");
      if (!u.mfaSecret) return fail(reply, 400, "mfa_start");
      const step = S.checkTotp(S.decrypt(key, u.mfaSecret), (req.body || {}).code, 0);
      if (!step) return fail(reply, 400, "mfa_bad_setup");
      const codes = S.newRecoveryCodes();
      await db.recoveryCode.deleteMany({ where: { userId: u.id } });
      await db.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, hash: S.sha256(S.normRecovery(c)) })) });
      await db.user.update({ where: { id: u.id }, data: { mfaEnabled: true, mfaLastStep: step } });
      alert(req, u, "mfaon");
      return { ok: true, recovery: codes };
    });
    api.post("/api/me/mfa/disable", async (req, reply) => {
      const u = await reauth(req, reply); if (!u) return;
      await db.user.update({ where: { id: u.id }, data: { mfaEnabled: false, mfaSecret: "", mfaLastStep: 0 } });
      await db.recoveryCode.deleteMany({ where: { userId: u.id } });
      alert(req, u, "mfaoff", { device: esc(deviceOf(req)) });
      return { ok: true };
    });
    api.post("/api/me/mfa/recovery", async (req, reply) => {
      const u = await reauth(req, reply); if (!u) return;
      if (!u.mfaEnabled) return fail(reply, 400, "mfa_off");
      const codes = S.newRecoveryCodes();
      await db.recoveryCode.deleteMany({ where: { userId: u.id } });
      await db.recoveryCode.createMany({ data: codes.map((c) => ({ userId: u.id, hash: S.sha256(S.normRecovery(c)) })) });
      return { ok: true, recovery: codes };
    });

    api.delete("/api/me", async (req, reply) => {
      const u = await reauth(req, reply); if (!u) return;
      await db.user.delete({ where: { id: u.id } });   // sessions, livres, codes : suppression en cascade
      fs.rmSync(path.join(dataDir, "files", u.id), { recursive: true, force: true });
      fs.rmSync(avatarFile(u.id), { force: true });
      fs.rmSync(path.join(dataDir, "covers", u.id), { recursive: true, force: true }); fs.rmSync(path.join(dataDir, "spines", u.id), { recursive: true, force: true });
      mail(req, u, "del");
      return { ok: true };
    });

    // ---------- réglages d'apparence (le plus récent gagne) ----------
    const settingsOf = (u) => ({ settings: JSON.parse(u.settings || "{}"), updated: u.settingsUpdated || 0 });
    api.get("/api/settings", async (req) => settingsOf(await db.user.findUnique({ where: { id: req.userId } })));
    api.put("/api/settings", async (req, reply) => {
      const { settings, updated } = req.body || {};
      if (!settings || typeof settings !== "object" || Array.isArray(settings) || typeof updated !== "number" || !isFinite(updated))
        return fail(reply, 400, "bad_settings");
      const u = await db.user.findUnique({ where: { id: req.userId } });
      // fusion : un appareil peut garder certains réglages pour lui et ne pas les envoyer
      const json = JSON.stringify({ ...JSON.parse(u.settings || "{}"), ...settings });
      if (json.length > 8192) return fail(reply, 413, "settings_big");
      if (updated > (u.settingsUpdated || 0) || u.settings === "{}")
        return settingsOf(await db.user.update({ where: { id: req.userId }, data: { settings: json, settingsUpdated: updated } }));
      return settingsOf(u);
    });

    // ---------- livres ----------
    api.get("/api/books", async (req) => (await db.bookState.findMany({ where: { userId: req.userId } })).map(toState));
    api.put("/api/books/:hash", async (req, reply) => {
      const { hash } = req.params;
      if (!HASH.test(hash)) return fail(reply, 400, "bad_hash");
      const b = req.body || {};
      if ((b.bookmarks && (!Array.isArray(b.bookmarks) || b.bookmarks.length > 5000)) || (b.highlights && (!Array.isArray(b.highlights) || b.highlights.length > 5000))
          || (b.postits && (!Array.isArray(b.postits) || b.postits.length > 5000)))
        return fail(reply, 400, "bad_data");
      if (!(await db.bookState.findUnique({ where: { userId_hash: { userId: req.userId, hash } } }))
          && (await db.bookState.count({ where: { userId: req.userId } })) >= 5000) return fail(reply, 403, "max_books");
      const where = { userId_hash: { userId: req.userId, hash } };
      const old = await db.bookState.findUnique({ where });
      const cover = b.cover && typeof b.cover === "object" ? { updated: num(b.cover.updated), custom: !!b.cover.custom } : undefined;
      const name = b.name && typeof b.name === "object" ? { title: txt(b.name.title, 500), updated: num(b.name.updated) } : undefined;
      const m = mergeState(old ? toState(old) : null, { ...b, hash, bookmarks: cleanItems(b.bookmarks), highlights: cleanItems(b.highlights), postits: cleanPostits(b.postits),
        title: String(b.title || "").slice(0, 500), author: String(b.author || "").slice(0, 300), cover, name });
      const data = m.removed
        ? { removed: m.removed, bookmarks: "[]", highlights: "[]", postits: "[]", coverUpdated: 0, coverCustom: false }
        : { title: m.title, author: m.author, cfi: String(m.position.cfi || "").slice(0, 2000), progress: Number(m.position.progress) || 0,
            posUpdated: Number(m.position.updated) || 0, removed: null,
            bookmarks: JSON.stringify(m.bookmarks), highlights: JSON.stringify(m.highlights), postits: JSON.stringify(m.postits),
            coverUpdated: m.cover.updated, coverCustom: m.cover.custom, nameTitle: m.name.title, nameUpdated: m.name.updated };
      await db.bookState.upsert({ where, create: { userId: req.userId, hash, ...data }, update: data });
      if (m.removed) fs.rmSync(path.join(dataDir, "files", req.userId, `${hash}.epub`), { force: true });
      if (m.removed || !m.cover.custom) fs.rmSync(coverFile(req.userId, hash), { force: true });
      return m;
    });

    const file = (req) => path.join(dataDir, "files", req.userId, `${req.params.hash}.epub`);
    const P = { schema: { params: { type: "object", properties: { hash: { type: "string", pattern: "^[0-9a-f]{40}$" } } } } };

    // ---------- couvertures personnalisées (l'état « cover » du livre dit si elle est en vigueur) ----------
    api.get("/api/covers/:hash", P, async (req, reply) => {
      const f = coverFile(req.userId, req.params.hash);
      if (!fs.existsSync(f)) return fail(reply, 404, "no_cover");
      const b = fs.readFileSync(f);
      return reply.type(imgType(b) || "application/octet-stream").header("Content-Disposition", "inline; filename=cover").send(b);
    });
    api.put("/api/covers/:hash", P, async (req, reply) => {
      if (RL.hit(`cover:${req.userId}`, 120, 3600)) return tooMany(reply);
      if (!Buffer.isBuffer(req.body) || !imgType(req.body)) return fail(reply, 400, "image_expected");
      if (!(await db.bookState.findUnique({ where: { userId_hash: { userId: req.userId, hash: req.params.hash } } })))
        return fail(reply, 404, "bad_hash");
      fs.mkdirSync(path.dirname(coverFile(req.userId, req.params.hash)), { recursive: true });
      fs.writeFileSync(coverFile(req.userId, req.params.hash), req.body);
      return { ok: true };
    });

    // ---------- collections (fusion par collection : la plus récente gagne) ----------
    const collOf = async (id) => JSON.parse((await db.user.findUnique({ where: { id } })).collections || "[]");
    api.get("/api/collections", async (req) => collOf(req.userId));
    api.put("/api/collections", async (req, reply) => {
      const inc = (req.body || {}).collections;
      if (!Array.isArray(inc)) return fail(reply, 400, "bad_collections");
      const merged = mergeCollections(await collOf(req.userId), cleanCollections(inc));
      const json = JSON.stringify(merged);
      if (json.length > 1.5 * 1048576) return fail(reply, 413, "too_big");
      await db.user.update({ where: { id: req.userId }, data: { collections: json } });
      return merged;
    });
    // ---------- étagère et photos de tranches ----------
    // photos d'un livre de l'étagère : tranche (id), couverture (id.front) et dos (id.back) pour le rendu 3D
    const FACES = ["spine", "front", "back"];
    const faceOf = (req) => (FACES.includes((req.query || {}).face) ? req.query.face : "spine");
    const spineFile = (uid, id, face = "spine") => path.join(dataDir, "spines", uid, face === "spine" ? id : `${id}.${face}`);
    const modelFile = (uid, id) => path.join(dataDir, "spines", uid, `${id}.glb`);
    const SP = { schema: { params: { type: "object", properties: { id: { type: "string", pattern: SID.source } } } } };
    const shelfOf = async (id) => JSON.parse((await db.user.findUnique({ where: { id } })).shelf || "[]");
    api.get("/api/shelf", async (req) => shelfOf(req.userId));
    api.put("/api/shelf", async (req, reply) => {
      const inc = (req.body || {}).items;
      if (!Array.isArray(inc)) return fail(reply, 400, "bad_shelf");
      const merged = mergeCollections(await shelfOf(req.userId), cleanShelf(inc));
      const json = JSON.stringify(merged);
      if (json.length > 3 * 1048576) return fail(reply, 413, "too_big");
      await db.user.update({ where: { id: req.userId }, data: { shelf: json } });
      for (const x of merged) {
        for (const f of FACES) if (x.deleted || !x[f]) fs.rmSync(spineFile(req.userId, x.id, f), { force: true });
        if (x.deleted || !x.model) fs.rmSync(modelFile(req.userId, x.id), { force: true });
      }
      return merged;
    });
    api.get("/api/spines/:id", SP, async (req, reply) => {
      const f = spineFile(req.userId, req.params.id, faceOf(req));
      if (!fs.existsSync(f)) return fail(reply, 404, "no_spine");
      const b = fs.readFileSync(f);
      return reply.type(imgType(b) || "application/octet-stream").header("Content-Disposition", "inline; filename=spine").send(b);
    });
    api.put("/api/spines/:id", SP, async (req, reply) => {
      if (RL.hit(`spine:${req.userId}`, 300, 3600)) return tooMany(reply);
      if (!Buffer.isBuffer(req.body) || !imgType(req.body)) return fail(reply, 400, "image_expected");
      const it = (await shelfOf(req.userId)).find((x) => x.id === req.params.id), face = faceOf(req);
      if (!it || it.deleted || !it[face]) return fail(reply, 404, "no_spine");      // l'étagère est envoyée d'abord
      const dir = path.dirname(spineFile(req.userId, req.params.id));
      if (dirSize(dir) + req.body.length > 200 * 1048576) return fail(reply, 413, "quota", {}, { n: 200 });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(spineFile(req.userId, req.params.id, face), req.body);
      return { ok: true };
    });
    // modèle 3D d'une décoration (glTF binaire) : envoyé après l'étagère, comme les photos
    api.get("/api/models/:id", SP, async (req, reply) => {
      const f = modelFile(req.userId, req.params.id);
      if (!fs.existsSync(f)) return fail(reply, 404, "no_model");
      return reply.type("model/gltf-binary").header("Content-Disposition", "attachment; filename=model.glb").send(fs.readFileSync(f));
    });
    api.put("/api/models/:id", { ...SP, bodyLimit: 20 * 1048576 }, async (req, reply) => {
      if (RL.hit(`spine:${req.userId}`, 300, 3600)) return tooMany(reply);
      const b = req.body;
      if (!Buffer.isBuffer(b) || b.length < 20 || b.toString("ascii", 0, 4) !== "glTF" || b.readUInt32LE(4) !== 2) return fail(reply, 400, "bad_model");
      const it = (await shelfOf(req.userId)).find((x) => x.id === req.params.id);
      if (!it || it.deleted || it.kind !== "deco" || !it.model) return fail(reply, 404, "no_model");
      const dir = path.dirname(modelFile(req.userId, req.params.id));
      if (dirSize(dir) + b.length > 200 * 1048576) return fail(reply, 413, "quota", {}, { n: 200 });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(modelFile(req.userId, req.params.id), b);
      return { ok: true };
    });
    // ---------- manuscrits (fusion par chapitre, cf. merge.js) ----------
    // révision du serveur : chaque envoi l'incrémente, chaque chapitre retient celle de sa dernière modification (r) ;
    // la réponse ne contient que ce que le client n'a pas encore (chapitres plus récents que ?since=, couverture si elle a changé)
    const DP = { schema: { params: { type: "object", properties: { id: { type: "string", pattern: CID.source } } } } };
    api.get("/api/drafts", async (req) => db.draft.findMany({ where: { userId: req.userId }, select: { id: true, rev: true } }));
    api.get("/api/drafts/:id", DP, async (req, reply) => {
      const r = await db.draft.findUnique({ where: { userId_id: { userId: req.userId, id: req.params.id } } });
      return r ? reply.type("application/json").send(r.data) : fail(reply, 404, "bad_request");
    });
    api.put("/api/drafts/:id", { ...DP, bodyLimit: 12 * 1048576 }, async (req, reply) => {
      if (RL.hit(`draft:${req.userId}`, 2400, 3600)) return tooMany(reply);
      const b = req.body;
      if (!b || typeof b !== "object" || Array.isArray(b)) return fail(reply, 400, "bad_data");
      const where = { userId_id: { userId: req.userId, id: req.params.id } };
      const old = await db.draft.findUnique({ where });
      if (!old && (await db.draft.count({ where: { userId: req.userId } })) >= 200) return fail(reply, 403, "bad_data");
      const cur = old ? JSON.parse(old.data) : null, inc = cleanDraft(req.params.id, b), rev = (cur?.rev || 0) + 1;
      const m = mergeDraft(cur, inc), fresh = new Set(inc.chapters), metaIn = !cur || (inc.updated || 0) > (cur.updated || 0);
      m.chapters.forEach((c) => { if (fresh.has(c)) c.r = rev; });
      m.rev = rev; m.mr = metaIn ? rev : cur.mr || 0;
      const data = JSON.stringify(m);
      if (data.length > 12 * 1048576) return fail(reply, 413, "too_big");
      await db.draft.upsert({ where, create: { userId: req.userId, id: req.params.id, data, rev }, update: { data, rev } });
      const since = Math.max(0, Math.floor(+(req.query || {}).since || 0));
      return { ...m, cover: m.mr > since && !metaIn ? m.cover : undefined, chapters: m.chapters.filter((c) => c.r > since && !fresh.has(c)) };
    });

    // ---------- lecture à voix haute (Piper, sur ce serveur) ----------
    // voix naturelles de Google si une clé est configurée, puis les voix Piper calculées sur ce serveur (secours, hors connexion de Google)
    api.get("/api/tts/voices", async () => [
      ...(await Promise.all(cloud.map((c) => c.voices().catch((e) => { console.error("[tts]", e.message); return []; })))).flat(), ...tts.voices()]);
    api.post("/api/tts/warm", async (req) => ({ ok: tts.warm(String((req.body || {}).voice || "")) }));
    api.post("/api/tts", async (req, reply) => {
      const { voice, text } = req.body || {};
      const s = String(text ?? "").replace(CTRL, " ").trim();
      if (!s || s.length > 1000 || !/\p{L}|\p{N}/u.test(s)) return fail(reply, 400, "bad_request");
      if (RL.hit(`tts:${req.userId}`, 3000, 3600)) return tooMany(reply);
      for (const c of cloud) {
        if (!(await c.has(voice))) continue;
        const day = new Date().toISOString().slice(0, 10), u = ttsUse.get(req.userId);
        const used = u && u.day === day ? u.n : 0;
        if (used + s.length > ttsDailyChars) return tooMany(reply);
        try {
          const r = await c.say(voice, s);
          if (!r.cached) ttsUse.set(req.userId, { day, n: used + s.length });
          return reply.type("audio/wav").send(r.data);
        } catch (e) { console.error("[tts]", e.message); return fail(reply, 502, "internal"); }
      }
      if (!tts.has(voice)) return fail(reply, 400, "bad_request");
      try { return reply.type("audio/wav").send(trimWav(await tts.say(voice, s))); }
      catch (e) { return fail(reply, e.busy ? 503 : 500, e.busy ? "too_many" : "internal"); }
    });

    api.head("/api/files/:hash", P, async (req, reply) => reply.code(fs.existsSync(file(req)) ? 200 : 404).send());
    api.get("/api/files/:hash", P, async (req, reply) =>
      fs.existsSync(file(req)) ? reply.type("application/epub+zip").header("Content-Disposition", "attachment").send(fs.createReadStream(file(req))) : reply.code(404).send());
    api.put("/api/files/:hash", P, async (req, reply) => {
      if (!Buffer.isBuffer(req.body) || req.body.slice(0, 4).toString("latin1") !== "PK\u0003\u0004") return fail(reply, 400, "epub_expected");
      // le nom du fichier est son SHA-1 : on vérifie l'intégrité
      if (crypto.createHash("sha1").update(req.body).digest("hex") !== req.params.hash) return fail(reply, 400, "corrupt");
      const dir = path.dirname(file(req));
      if (dirSize(dir) + req.body.length > quotaMB * 1048576) return fail(reply, 413, "quota", {}, { n: quotaMB });
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file(req), req.body);
      return { ok: true };
    });
  });

  // ---------- ménage : comptes jamais confirmés, sessions et liens expirés ----------
  const purge = async () => {
    try {
      const n = S.now();
      const stale = await db.user.findMany({ where: { emailVerified: false, createdAt: { lt: new Date(Date.now() - 48 * 3600e3) } } });
      for (const u of stale) {
        await db.user.delete({ where: { id: u.id } });
        fs.rmSync(path.join(dataDir, "files", u.id), { recursive: true, force: true }); fs.rmSync(path.join(dataDir, "avatars", u.id), { force: true });
        fs.rmSync(path.join(dataDir, "covers", u.id), { recursive: true, force: true }); fs.rmSync(path.join(dataDir, "spines", u.id), { recursive: true, force: true });
      }
      await db.session.deleteMany({ where: { expiresAt: { lt: n } } });
      await db.emailToken.deleteMany({ where: { OR: [{ expiresAt: { lt: n } }, { usedAt: { not: null } }] } });
    } catch (e) { console.error("[purge]", e.message); }
  };
  setTimeout(purge, 5000).unref(); setInterval(purge, 3600e3).unref();

  // ---------- téléchargements des applis (dossier monté en lecture seule) ----------
  const DL = /^Folio[\w.-]*\.(exe|zip|deb|dmg|AppImage)$/;
  // empreinte SHA-256 de chaque installeur (les applis la vérifient avant de se mettre à jour) ; calculée une fois par fichier
  const sums = new Map();
  const sha = (f, st) => {
    const k = `${f}:${st.mtimeMs}:${st.size}`;
    if (!sums.has(k)) sums.set(k, new Promise((ok, ko) => {         // en flux : un installeur de 120 Mo ne passe pas en mémoire
      const h = crypto.createHash("sha256");
      fs.createReadStream(path.join(downloadsDir, f)).on("data", (d) => h.update(d)).on("end", () => ok(h.digest("hex"))).on("error", ko);
    }).catch(() => { sums.delete(k); return ""; }));
    return sums.get(k);
  };
  const releases = () => {
    if (!downloadsDir || !fs.existsSync(downloadsDir)) return [];
    return fs.readdirSync(downloadsDir).filter((f) => DL.test(f)).map((f) => {
      const st = fs.statSync(path.join(downloadsDir, f));
      return { name: f, size: st.size, date: st.mtimeMs / 1000, sha256: sha(f, st) };
    }).sort((a, b) => b.date - a.date);
  };
  app.get("/api/releases", async () => Promise.all(releases().map(async (r) => ({ ...r, sha256: await r.sha256 }))));
  app.get("/dl/:file", async (req, reply) => {
    const f = String(req.params.file);
    if (!DL.test(f) || !releases().some((r) => r.name === f)) return reply.code(404).send({ error: t(L(req), "bad_request") });
    const st = fs.statSync(path.join(downloadsDir, f));
    return reply.type(f.endsWith(".deb") ? "application/vnd.debian.binary-package" : "application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${f}"`).header("Content-Length", st.size)
      .header("Cache-Control", "public, max-age=3600").send(fs.createReadStream(path.join(downloadsDir, f)));
  });

  if (publicDir && fs.existsSync(publicDir)) {
    app.register(require("@fastify/static"), { root: publicDir, redirect: true,
      setHeaders: (res, p) => { if (/\.(js|html|json|css)$/.test(p)) res.setHeader("Cache-Control", "no-cache"); } });
    app.get("/download", (_req, reply) => reply.sendFile("download.html"));
    // QR code vers le lecteur (fiche « Folio sur mobile »), à l'adresse publique du serveur
    app.get("/app/qr.svg", async (req, reply) => {
      const url = `${base || `${req.protocol}://${req.headers.host}`}/app/`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1d1d22", light: "#ffffff" } });
      return reply.type("image/svg+xml").header("Cache-Control", "public, max-age=86400").send(svg);
    });
    // manifeste du lecteur aux couleurs du thème choisi (barres système de l'appli installée sur téléphone)
    const mfPath = path.join(publicDir, "app", "manifest.json");
    app.get("/app/manifest.json", async (req, reply) => {
      const m = JSON.parse(fs.readFileSync(mfPath, "utf8"));
      const c = String((req.query || {}).c || "");
      if (/^[0-9a-f]{6}$/i.test(c)) m.theme_color = m.background_color = "#" + c.toLowerCase();
      return reply.type("application/manifest+json").header("Cache-Control", "no-cache").send(JSON.stringify(m));
    });
  }
  return app;
}
module.exports = { emailKey, build, cleanPostits };
