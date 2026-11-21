// Cache disque des phrases dites par une voix en ligne (data/tts-cache) : relire un passage, ou l'écouter sur un autre appareil,
// ne coûte rien et répond tout de suite. Plein : on efface les phrases les plus anciennes.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const CACHE_MAX = 400 * 1048576, CACHE_KEEP = 300 * 1048576;

function TtsCache(dir) {
  let writes = 0;
  function prune() {
    try {
      const fsz = fs.readdirSync(dir).map((f) => { const p = path.join(dir, f), st = fs.statSync(p); return { p, size: st.size, t: st.mtimeMs }; });
      let total = fsz.reduce((n, f) => n + f.size, 0);
      if (total <= CACHE_MAX) return;
      for (const f of fsz.sort((a, b) => a.t - b.t)) { if (total <= CACHE_KEEP) break; fs.rmSync(f.p, { force: true }); total -= f.size; }
    } catch { /* cache facultatif */ }
  }
  // produce() → Buffer ; la clé couvre la voix et le texte
  return async function cached(voice, text, produce) {
    const file = dir && path.join(dir, crypto.createHash("sha256").update(voice + "\n" + text).digest("hex") + ".wav");
    if (file && fs.existsSync(file)) { const t = new Date(); fs.utimesSync(file, t, t); return { data: fs.readFileSync(file), cached: true }; }
    const data = await produce();
    if (file) {
      try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, data); if (++writes % 50 === 1) prune(); } catch { /* disque plein : on sert quand même */ }
    }
    return { data, cached: false };
  };
}
module.exports = { TtsCache };
