// Silences en tête et en queue d'un WAV PCM 16 bits retirés : entre deux morceaux lus à voix haute,
// plus de « trou » d'une demi-seconde (les moteurs ajoutent du silence avant et après chaque phrase).
// Tout autre format est rendu tel quel.
function trimWav(buf, { head = 0.02, tail = 0.15, thr = 500 } = {}) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return buf;
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4), n = buf.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { tag: buf.readUInt16LE(p + 8), ch: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === "data") { data = { at: p + 8, n: Math.min(n, buf.length - p - 8) }; break; }
    p += 8 + n + (n & 1);
  }
  if (!fmt || !data || fmt.tag !== 1 || fmt.bits !== 16 || !fmt.ch || !fmt.rate) return buf;
  const fr = fmt.ch * 2, frames = Math.floor(data.n / fr);
  const loud = (f) => { for (let c = 0; c < fmt.ch; c++) if (Math.abs(buf.readInt16LE(data.at + f * fr + c * 2)) > thr) return true; return false; };
  let a = 0; while (a < frames && !loud(a)) a++;
  if (a === frames) return buf;                       // tout est silencieux : on ne touche à rien
  let b = frames - 1; while (b > a && !loud(b)) b--;
  a = Math.max(0, a - Math.round(head * fmt.rate)); b = Math.min(frames - 1, b + Math.round(tail * fmt.rate));
  const body = buf.subarray(data.at + a * fr, data.at + (b + 1) * fr), h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii"); h.writeUInt32LE(36 + body.length, 4); h.write("WAVEfmt ", 8, "ascii"); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(fmt.ch, 22); h.writeUInt32LE(fmt.rate, 24); h.writeUInt32LE(fmt.rate * fr, 28);
  h.writeUInt16LE(fr, 32); h.writeUInt16LE(16, 34); h.write("data", 36, "ascii"); h.writeUInt32LE(body.length, 40);
  return Buffer.concat([h, body]);
}
module.exports = { trimWav };
