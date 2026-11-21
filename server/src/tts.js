// Lecture à voix haute : Piper (voix neuronales, calculées sur ce serveur, rien n'est envoyé ailleurs).
// Un seul modèle chargé à la fois (~250 Mo de RAM sur le Pi), libéré après 5 min sans demande.
// Protocole de Piper en --json-input : une ligne JSON par phrase sur stdin → le chemin du WAV écrit sur stdout.
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// id public → modèle Piper (+ locuteur pour les modèles à plusieurs voix). Les libellés sont côté client (voice.js).
const VOICES = [
  { id: "siwis", lang: "fr", g: "f", model: "fr_FR-siwis-medium" },
  { id: "jessica", lang: "fr", g: "f", model: "fr_FR-upmc-medium", speaker: 0 },
  { id: "pierre", lang: "fr", g: "m", model: "fr_FR-upmc-medium", speaker: 1 },
  { id: "tom", lang: "fr", g: "m", model: "fr_FR-tom-medium" },
  { id: "gilles", lang: "fr", g: "m", model: "fr_FR-gilles-low" },
  { id: "lessac", lang: "en", g: "f", model: "en_US-lessac-medium" },
  { id: "kristin", lang: "en", g: "f", model: "en_US-kristin-medium" },
  { id: "ryan", lang: "en", g: "m", model: "en_US-ryan-medium" },
  { id: "northern", lang: "en", g: "m", model: "en_GB-northern_english_male-medium" },
];
const IDLE = 5 * 60e3, TIMEOUT = 60e3, MAX_WAIT = 12;

function Tts(dir) {
  const bin = dir && path.join(dir, "piper", "piper");
  const ok = bin && fs.existsSync(bin) ? VOICES.filter((v) => fs.existsSync(path.join(dir, "voices", v.model + ".onnx"))) : [];
  let proc = null, model = "", buf = "", waiting = null, idle = null, chain = Promise.resolve(), queued = 0;

  const stop = () => { if (proc) { proc.kill(); proc = null; model = ""; } };
  function start(m) {
    stop();
    proc = spawn(bin, ["--model", path.join(dir, "voices", m + ".onnx"), "--json-input", "--quiet"], { stdio: ["pipe", "pipe", "ignore"] });
    model = m; buf = "";
    const p = proc;
    p.stdout.setEncoding("utf8");
    p.stdout.on("data", (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line && waiting) { const w = waiting; waiting = null; w.ok(line); } }
    });
    // arrêt imprévu du processus en cours (un ancien modèle qu'on vient de remplacer n'a plus personne en attente)
    p.on("exit", () => { if (proc !== p) return; proc = null; model = ""; if (waiting) { const w = waiting; waiting = null; w.ko(new Error("piper")); } });
    p.stdin.on("error", () => {});
  }
  function run(v, text) {
    return new Promise((ok, ko) => {
      if (!proc || model !== v.model) start(v.model);
      const out = path.join(os.tmpdir(), `tts-${crypto.randomBytes(8).toString("hex")}.wav`);
      const timer = setTimeout(() => { waiting = null; stop(); ko(new Error("timeout")); }, TIMEOUT);
      waiting = {
        ok: () => { clearTimeout(timer); try { const b = fs.readFileSync(out); fs.rmSync(out, { force: true }); ok(b); } catch (e) { ko(e); } },
        ko: (e) => { clearTimeout(timer); fs.rmSync(out, { force: true }); ko(e); },
      };
      proc.stdin.write(JSON.stringify({ text, output_file: out, ...(v.speaker != null && { speaker_id: v.speaker }) }) + "\n");
    });
  }
  return {
    voices: () => ok.map(({ id, lang, g }) => ({ id, lang, g })),
    has: (id) => ok.some((v) => v.id === id),
    // une phrase à la fois (Piper n'en traite qu'une) ; file d'attente bornée pour ne pas saturer le Pi
    // ouverture d'un livre : le modèle de la voix est chargé d'avance (le premier chargement prend plusieurs secondes sur le Pi)
    warm(id) {
      const v = ok.find((x) => x.id === id);
      if (!v || queued || (proc && model === v.model)) return false;
      start(v.model); clearTimeout(idle); idle = setTimeout(stop, IDLE); idle.unref?.();
      return true;
    },
    say(id, text) {
      const v = ok.find((x) => x.id === id);
      if (queued >= MAX_WAIT) return Promise.reject(Object.assign(new Error("busy"), { busy: true }));
      queued++;
      const p = chain.then(() => { clearTimeout(idle); return run(v, text); })
        .finally(() => { queued--; clearTimeout(idle); idle = setTimeout(stop, IDLE); idle.unref?.(); });
      chain = p.catch(() => {});
      return p;
    },
  };
}
module.exports = { Tts, VOICES };
