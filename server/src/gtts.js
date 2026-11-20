// Voix Google Cloud Text-to-Speech (Chirp 3 HD) : très naturelles, intonation et respiration, ~0,5 s par phrase.
// La clé reste sur le serveur (GOOGLE_TTS_KEY dans .env) ; le texte lu est envoyé à Google pour être dit.
// Chaque phrase dite est gardée sur disque (data/tts-cache) : relire un passage, ou l'écouter sur un autre appareil, ne coûte rien.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { trimWav } = require("./trim");

const API = "https://texttospeech.googleapis.com/v1";
const LANGS = ["fr-FR", "en-US", "en-GB"];
const CACHE_MAX = 400 * 1048576, CACHE_KEEP = 300 * 1048576;

function GoogleTts(key, cacheDir) {
  let list = null, at = 0, writes = 0;
  const k = encodeURIComponent(key || "");

  async function voices() {
    if (!key) return [];
    if (list && Date.now() - at < 6 * 3600e3) return list;
    const out = [];
    for (const lc of LANGS) {
      const r = await fetch(`${API}/voices?languageCode=${lc}&key=${k}`, { signal: AbortSignal.timeout(10e3) });
      if (!r.ok) throw new Error("google voices " + r.status);
      for (const v of (await r.json()).voices || [])
        if (/-Chirp3-HD-[A-Za-z]+$/.test(v.name) && v.languageCodes.includes(lc))
          out.push({ id: "g:" + v.name, lang: lc.slice(0, 2), region: lc.slice(3), g: v.ssmlGender === "FEMALE" ? "f" : "m", name: v.name.split("-").pop(), hd: 1 });
    }
    list = out.sort((a, b) => a.lang.localeCompare(b.lang) || a.region.localeCompare(b.region) || a.g.localeCompare(b.g) || a.name.localeCompare(b.name));
    at = Date.now();
    return list;
  }

  // cache plein : on efface les phrases les plus anciennes
  function prune() {
    try {
      const fsz = fs.readdirSync(cacheDir).map((f) => { const p = path.join(cacheDir, f), st = fs.statSync(p); return { p, size: st.size, t: st.mtimeMs }; });
      let total = fsz.reduce((n, f) => n + f.size, 0);
      if (total <= CACHE_MAX) return;
      for (const f of fsz.sort((a, b) => a.t - b.t)) { if (total <= CACHE_KEEP) break; fs.rmSync(f.p, { force: true }); total -= f.size; }
    } catch { /* cache facultatif */ }
  }

  async function say(id, text) {
    const name = id.slice(2), lc = name.split("-").slice(0, 2).join("-");
    const file = cacheDir && path.join(cacheDir, crypto.createHash("sha256").update(name + "\n" + text).digest("hex") + ".wav");
    if (file && fs.existsSync(file)) { const t = new Date(); fs.utimesSync(file, t, t); return { data: fs.readFileSync(file), cached: true }; }
    const r = await fetch(`${API}/text:synthesize?key=${k}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20e3),
      body: JSON.stringify({ input: { text }, voice: { languageCode: lc, name }, audioConfig: { audioEncoding: "LINEAR16" } }),   // WAV : silences retirés avant la mise en cache
    });
    if (!r.ok) throw new Error("google " + r.status);
    const data = trimWav(Buffer.from((await r.json()).audioContent || "", "base64"));
    if (!data.length) throw new Error("google: audio vide");
    if (file) {
      try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(file, data); if (++writes % 50 === 1) prune(); } catch { /* disque plein : on sert quand même */ }
    }
    return { data, cached: false };
  }
  return { on: !!key, voices, say, has: async (id) => typeof id === "string" && id.startsWith("g:") && (await voices()).some((v) => v.id === id) };
}
module.exports = { GoogleTts };
