// Briques de sécurité : mots de passe, jetons, TOTP, chiffrement, limitation de débit.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const now = () => Date.now() / 1000;
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const randomToken = (n = 32) => crypto.randomBytes(n).toString("base64url");
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y); };

// ---------- mots de passe : scrypt (N=2^16, r=8, p=1), paramètres stockés avec le hash ----------
const SCRYPT = { N: 1 << 16, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const scrypt = (pw, salt, o) => new Promise((ok, ko) =>
  crypto.scrypt(String(pw).normalize("NFKC"), salt, 64, o, (e, k) => (e ? ko(e) : ok(k.toString("hex")))));

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${await scrypt(pw, salt, SCRYPT)}` };
}
// Retourne { ok, rehash } ; les anciens hashs (format nu, N=16384) sont acceptés puis mis à niveau.
async function verifyPassword(pw, salt, stored) {
  if (!stored) return { ok: false };
  if (!stored.startsWith("scrypt$")) {
    const legacy = await new Promise((ok, ko) => crypto.scrypt(String(pw), salt, 64, (e, k) => (e ? ko(e) : ok(k.toString("hex")))));
    return { ok: safeEq(legacy, stored), rehash: true };
  }
  const [, N, r, p, h] = stored.split("$");
  const got = await scrypt(pw, salt, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return { ok: safeEq(got, h), rehash: +N < SCRYPT.N };
}
// Hash factice pour garder un temps de réponse constant quand le compte n'existe pas
let dummy; const dummyVerify = async (pw) => { dummy ||= await hashPassword("x".repeat(12)); await verifyPassword(pw, dummy.salt, dummy.hash); };

const COMMON = new Set(["password", "motdepasse", "azertyuiop", "qwertyuiop", "1234567890", "0123456789", "123456789a",
  "iloveyou12", "password12", "password123", "azerty1234", "soleil1234", "doudou1234", "loulou1234", "bonjour123",
  "chocolat12", "football12", "princesse1", "1q2w3e4r5t", "abcdefghij", "aaaaaaaaaa", "folio12345", "liseuse123"]);
// Vérifie la robustesse (retourne une clé de message, cf. i18n.js) ; consulte Have I Been Pwned par k-anonymat (seuls 5 caractères du SHA-1 partent).
async function passwordProblem(pw, email = "") {
  pw = String(pw || "");
  if (pw.length < 10) return "pw_short";
  if (pw.length > 256) return "pw_long";
  const low = pw.toLowerCase(), local = String(email).split("@")[0].toLowerCase();
  if (COMMON.has(low) || /^(.)\1+$/.test(pw)) return "pw_common";
  if (local.length >= 4 && low.includes(local)) return "pw_email";
  if (new Set(pw).size < 5) return "pw_repeat";
  try {
    const h = crypto.createHash("sha1").update(pw).digest("hex").toUpperCase();
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`,
      { headers: { "Add-Padding": "true", "User-Agent": "folio-server" }, signal: AbortSignal.timeout(3000) });
    if (r.ok) for (const line of (await r.text()).split("\n")) {
      const [suf, n] = line.trim().split(":");
      if (suf === h.slice(5) && +n > 0) return "pw_pwned";
    }
  } catch { /* service injoignable : on n'empêche pas l'inscription */ }
  return null;
}

// ---------- clé serveur (chiffrement des secrets 2FA) ----------
function loadKey(dataDir) {
  if (process.env.FOLIO_SECRET) return crypto.createHash("sha256").update(process.env.FOLIO_SECRET).digest();
  const f = path.join(dataDir, "secret.key");
  if (!fs.existsSync(f)) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(f, crypto.randomBytes(32), { mode: 0o600 }); }
  return fs.readFileSync(f);
}
const encrypt = (key, text) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const e = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), e.toString("base64url")].join("."); };
const decrypt = (key, blob) => { const [, iv, tag, e] = blob.split(".");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url")); d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(e, "base64url")), d.final()]).toString("utf8"); };

// ---------- TOTP (RFC 6238 : SHA-1, 30 s, 6 chiffres) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32encode = (buf) => { let bits = 0, v = 0, out = "";
  for (const b of buf) { v = (v << 8) | b; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += B32[(v << (5 - bits)) & 31]; return out; };
const b32decode = (s) => { let bits = 0, v = 0; const out = [];
  for (const ch of s.replace(/=+$/, "").toUpperCase()) { const i = B32.indexOf(ch); if (i < 0) continue;
    v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out); };
const hotp = (secret, counter) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(b).digest(), o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, "0"); };
const newTotpSecret = () => b32encode(crypto.randomBytes(20));
// Retourne le pas accepté (pour l'anti-rejeu) ou null. Tolère ±1 pas (dérive d'horloge).
function checkTotp(secret, code, lastStep = 0) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now() / 30);
  for (const s of [step, step - 1, step + 1]) if (s > lastStep && safeEq(hotp(secret, s), code)) return s;
  return null;
}
const newRecoveryCodes = () => Array.from({ length: 10 }, () => {
  const s = b32encode(crypto.randomBytes(7)).slice(0, 10).toLowerCase(); return `${s.slice(0, 5)}-${s.slice(5)}`; });
const normRecovery = (c) => String(c || "").toLowerCase().replace(/[^a-z2-7]/g, "");

// ---------- limitation de débit (mémoire) ----------
class Limiter {
  constructor() { this.m = new Map(); setInterval(() => { const t = Date.now();
    for (const [k, v] of this.m) if (v.reset < t) this.m.delete(k); }, 60_000).unref(); }
  // compte un essai ; true si la limite est dépassée
  hit(key, max, windowSec) { const t = Date.now(); let e = this.m.get(key);
    if (!e || e.reset < t) { e = { n: 0, reset: t + windowSec * 1000 }; this.m.set(key, e); }
    e.n++; return e.n > max; }
  peek(key, max) { const e = this.m.get(key); return !!e && e.reset > Date.now() && e.n >= max; }
  clear(key) { this.m.delete(key); }
}

module.exports = { now, sha256, randomToken, safeEq, hashPassword, verifyPassword, dummyVerify, passwordProblem,
  loadKey, encrypt, decrypt, newTotpSecret, checkTotp, newRecoveryCodes, normRecovery, Limiter, hotp };
