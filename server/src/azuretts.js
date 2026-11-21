// Voix neuronales Microsoft Azure Speech (API officielle, clé AZURE_TTS_KEY + région AZURE_TTS_REGION dans .env) :
// Denise, Henri, Vivienne, Rémy… très naturelles, ~0,3 s par phrase ; offre gratuite de 500 000 caractères par mois.
// Le texte lu est envoyé à Microsoft. Audio en WAV, silences retirés avant la mise en cache.
const { trimWav } = require("./trim");
const { TtsCache } = require("./ttscache");

const LANGS = ["fr-FR", "en-US", "en-GB"];
const esc = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

function AzureTts(key, region, cacheDir) {
  const on = !!(key && /^[a-z0-9]{3,30}$/.test(region || ""));
  const base = on && `https://${region}.tts.speech.microsoft.com/cognitiveservices`;
  const cached = TtsCache(cacheDir);
  let list = null, at = 0;

  async function voices() {
    if (!on) return [];
    if (list && Date.now() - at < 6 * 3600e3) return list;
    const r = await fetch(`${base}/voices/list`, { headers: { "Ocp-Apim-Subscription-Key": key }, signal: AbortSignal.timeout(10e3) });
    if (!r.ok) throw new Error("azure voices " + r.status);
    list = (await r.json())
      .filter((v) => LANGS.includes(v.Locale) && v.VoiceType === "Neural" && /^[A-Za-z-]+Neural$/.test(v.ShortName))
      .map((v) => ({ id: "a:" + v.ShortName, lang: v.Locale.slice(0, 2), region: v.Locale.slice(3), g: v.Gender === "Female" ? "f" : "m",
        name: v.DisplayName || v.LocalName, hd: 1 }))
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.region.localeCompare(b.region) || a.g.localeCompare(b.g) || a.name.localeCompare(b.name));
    at = Date.now();
    return list;
  }

  function say(id, text) {
    const name = id.slice(2), lc = name.split("-").slice(0, 2).join("-");
    return cached(id, text, async () => {
      const r = await fetch(`${base}/v1`, {
        method: "POST", signal: AbortSignal.timeout(20e3),
        headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "folio" },
        body: `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lc}"><voice name="${name}">${esc(text)}</voice></speak>`,
      });
      if (!r.ok) throw new Error("azure " + r.status);
      const data = trimWav(Buffer.from(await r.arrayBuffer()));
      if (data.length < 100) throw new Error("azure: audio vide");
      return data;
    });
  }
  return { on, voices, say, has: async (id) => typeof id === "string" && id.startsWith("a:") && (await voices()).some((v) => v.id === id) };
}
module.exports = { AzureTts };
