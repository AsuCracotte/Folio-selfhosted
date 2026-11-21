/* FolioGLB — affiche un modèle 3D glTF binaire (.glb) en WebGL, sans dépendance (site, appli et appli Linux).
   Prend en charge : maillages en triangles, hiérarchie de nœuds, couleur et texture de base (pbrMetallicRoughness),
   transparence. Pas d'animations, de compression Draco ni de textures KTX (le modèle s'affiche alors sans elles ou est refusé).
   API : parse(ArrayBuffer) → Promise<scène> ; view(canvas, scène) → { yaw, pitch, draw(), dispose() } ;
         snapshot(scène, taille) → Promise<Blob PNG transparent, recadré au plus près du modèle> */
(function () {
  "use strict";
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const T = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NORM = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 };

  // ---- matrices 4×4 (colonnes) ----
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
    const [x, y, z, w] = q, xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
    return [(1 - 2 * (yy + zz)) * s[0], 2 * (xy + wz) * s[0], 2 * (xz - wy) * s[0], 0,
      2 * (xy - wz) * s[1], (1 - 2 * (xx + zz)) * s[1], 2 * (yz + wx) * s[1], 0,
      2 * (xz + wy) * s[2], 2 * (yz - wx) * s[2], (1 - 2 * (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
  }
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
  function persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }

  // ---- lecture du fichier ----
  async function parse(buf) {
    const dv = new DataView(buf);
    if (buf.byteLength < 20 || dv.getUint32(0, true) !== 0x46546c67 || dv.getUint32(4, true) !== 2) throw new Error("glb");
    let off = 12, json = null, bin = null;
    while (off + 8 <= buf.byteLength) {
      const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true), start = off + 8;
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len)));
      else if (type === 0x004e4942) bin = buf.slice(start, start + len);
      off = start + len + ((4 - len % 4) % 4);
    }
    if (!json) throw new Error("glb");
    if ((json.extensionsRequired || []).length) throw new Error("glb-ext");
    const views = json.bufferViews || [], accs = json.accessors || [];
    function acc(i) {
      const a = accs[i]; if (!a || !bin) return null;
      const n = N[a.type], C = T[a.componentType], v = views[a.bufferView]; if (!n || !C || !v) return null;
      const size = C.BYTES_PER_ELEMENT, stride = v.byteStride || n * size, base = (v.byteOffset || 0) + (a.byteOffset || 0);
      const out = new Float32Array(a.count * n), d = new DataView(bin), get = {
        5120: (o) => d.getInt8(o), 5121: (o) => d.getUint8(o), 5122: (o) => d.getInt16(o, true), 5123: (o) => d.getUint16(o, true),
        5125: (o) => d.getUint32(o, true), 5126: (o) => d.getFloat32(o, true) }[a.componentType];
      const k = a.normalized ? 1 / NORM[a.componentType] : 1;
      for (let i2 = 0; i2 < a.count; i2++) for (let j = 0; j < n; j++) out[i2 * n + j] = get(base + i2 * stride + j * size) * k;
      return out;
    }
    // images des textures (dans le binaire), décodées une seule fois
    const imgs = await Promise.all((json.images || []).map(async (im) => {
      try { const v = views[im.bufferView]; if (!v || !bin) return null;
        return await createImageBitmap(new Blob([new Uint8Array(bin, v.byteOffset || 0, v.byteLength)], { type: im.mimeType || "image/png" }));
      } catch (e) { return null; }
    }));
    const prims = [], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    function node(i, parent) {
      const nd = json.nodes[i]; if (!nd) return;
      const m = mul(parent, nd.matrix || trs(nd.translation, nd.rotation, nd.scale));
      const mesh = nd.mesh != null && json.meshes[nd.mesh];
      if (mesh) for (const p of mesh.primitives || []) {
        if ((p.mode ?? 4) !== 4 || p.attributes.POSITION == null) continue;
        const P = acc(p.attributes.POSITION); if (!P) continue;
        let Nm = p.attributes.NORMAL != null ? acc(p.attributes.NORMAL) : null;
        const UV = p.attributes.TEXCOORD_0 != null ? acc(p.attributes.TEXCOORD_0) : null;
        const count = P.length / 3;
        let idx = p.indices != null ? Uint32Array.from(acc(p.indices) || []) : Uint32Array.from({ length: count }, (_, k) => k);
        // positions et normales passées dans le repère du modèle (une seule matrice au rendu)
        for (let v = 0; v < count; v++) {
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          for (let r = 0; r < 3; r++) { const q = m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]; P[v * 3 + r] = q; lo[r] = Math.min(lo[r], q); hi[r] = Math.max(hi[r], q); }
        }
        if (!Nm) Nm = normals(P, idx);
        else for (let v = 0; v < count; v++) {
          const x = Nm[v * 3], y = Nm[v * 3 + 1], z = Nm[v * 3 + 2], o = [0, 0, 0];
          for (let r = 0; r < 3; r++) o[r] = m[r] * x + m[4 + r] * y + m[8 + r] * z;
          const l = Math.hypot(...o) || 1; Nm[v * 3] = o[0] / l; Nm[v * 3 + 1] = o[1] / l; Nm[v * 3 + 2] = o[2] / l;
        }
        const mat = (json.materials || [])[p.material] || {}, pbr = mat.pbrMetallicRoughness || {};
        const ti = pbr.baseColorTexture && (json.textures || [])[pbr.baseColorTexture.index];
        prims.push({ P, N: Nm, UV, idx, color: pbr.baseColorFactor || [1, 1, 1, 1], img: ti && ti.source != null ? imgs[ti.source] : null,
          blend: mat.alphaMode === "BLEND", cut: mat.alphaMode === "MASK" ? (mat.alphaCutoff ?? .5) : 0, both: !!mat.doubleSided });
      }
      for (const c of nd.children || []) node(c, m);
    }
    const sc = (json.scenes || [])[json.scene || 0];
    for (const r of sc ? sc.nodes || [] : (json.nodes || []).map((_, k) => k)) node(r, I());
    if (!prims.length) throw new Error("glb-empty");
    const c = [0, 1, 2].map((r) => (lo[r] + hi[r]) / 2), rad = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 || 1;
    return { prims, center: c, radius: rad };
  }
  function normals(P, idx) {
    const Nm = new Float32Array(P.length);
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], v = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      for (const k of [a, b, c]) for (let r = 0; r < 3; r++) Nm[k + r] += n[r];
    }
    for (let i = 0; i < Nm.length; i += 3) { const l = Math.hypot(Nm[i], Nm[i + 1], Nm[i + 2]) || 1; Nm[i] /= l; Nm[i + 1] /= l; Nm[i + 2] /= l; }
    return Nm;
  }

  // ---- rendu ----
  const VS = `attribute vec3 p;attribute vec3 n;attribute vec2 uv;uniform mat4 mvp;uniform mat4 rot;varying vec3 vn;varying vec2 vu;
void main(){vn=(rot*vec4(n,0.)).xyz;vu=uv;gl_Position=mvp*vec4(p,1.);}`;
  const FS = `precision mediump float;varying vec3 vn;varying vec2 vu;uniform vec4 col;uniform bool tex;uniform sampler2D s;uniform float cut;
void main(){vec4 c=col;if(tex)c*=texture2D(s,vu);if(cut>0.&&c.a<cut)discard;vec3 n=normalize(gl_FrontFacing?vn:-vn);
float l=.42+.5*max(dot(n,normalize(vec3(.4,.8,.6))),0.)+.22*max(dot(n,normalize(vec3(-.6,.2,-.5))),0.)+.12*(n.y*.5+.5);
gl_FragColor=vec4(c.rgb*min(l,1.15)*c.a,c.a);}`;
  function view(canvas, scene) {
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("webgl");
    const big = gl.getExtension("OES_element_index_uint");
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    const L = (k) => gl.getAttribLocation(pr, k), U = (k) => gl.getUniformLocation(pr, k);
    const buf = (data, t = gl.ARRAY_BUFFER) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, data, gl.STATIC_DRAW); return b; };
    const pot = (x) => (x & (x - 1)) === 0;
    const items = scene.prims.map((p) => {
      let idx = p.idx;
      if (!big && p.P.length / 3 > 65535) return null;                  // très gros maillage sans l'extension : ignoré
      idx = big ? idx : Uint16Array.from(idx);
      let tex = null;
      if (p.img) {
        tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, p.img);
        if (pot(p.img.width) && pot(p.img.height)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
      }
      return { p, P: buf(p.P), N: buf(p.N), UV: p.UV && buf(p.UV), I: buf(idx, gl.ELEMENT_ARRAY_BUFFER), n: idx.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, tex };
    }).filter(Boolean);
    const v = { yaw: -.45, pitch: .18, draw, dispose };
    function draw() {
      const w = canvas.width, h = canvas.height; gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.useProgram(pr);
      const k = 1 / scene.radius, c = scene.center;
      const model = mul([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, -c[0] * k, -c[1] * k, -c[2] * k, 1], I());
      const rot = mul(rotX(v.pitch), rotY(v.yaw)), cam = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -3.9, 1];
      const mvp = mul(persp(.52, w / h, .1, 20), mul(cam, mul(rot, model)));
      gl.uniformMatrix4fv(U("mvp"), false, mvp); gl.uniformMatrix4fv(U("rot"), false, rot);
      for (const pass of [false, true]) for (const it of items) {          // opaques d'abord, puis les transparents
        if (it.p.blend !== pass) continue;
        if (pass) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); } else { gl.disable(gl.BLEND); gl.depthMask(true); }
        if (it.p.both) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
        gl.bindBuffer(gl.ARRAY_BUFFER, it.P); gl.enableVertexAttribArray(L("p")); gl.vertexAttribPointer(L("p"), 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, it.N); gl.enableVertexAttribArray(L("n")); gl.vertexAttribPointer(L("n"), 3, gl.FLOAT, false, 0, 0);
        if (it.UV) { gl.bindBuffer(gl.ARRAY_BUFFER, it.UV); gl.enableVertexAttribArray(L("uv")); gl.vertexAttribPointer(L("uv"), 2, gl.FLOAT, false, 0, 0); }
        else { gl.disableVertexAttribArray(L("uv")); gl.vertexAttrib2f(L("uv"), 0, 0); }
        gl.uniform4fv(U("col"), it.p.color); gl.uniform1i(U("tex"), it.tex && it.UV ? 1 : 0); gl.uniform1f(U("cut"), it.p.cut);
        if (it.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, it.tex); gl.uniform1i(U("s"), 0); }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, it.I); gl.drawElements(gl.TRIANGLES, it.n, it.type, 0);
      }
      gl.depthMask(true);
    }
    function dispose() { const e = gl.getExtension("WEBGL_lose_context"); if (e) e.loseContext(); }
    return v;
  }
  // aperçu pour l'étagère : fond transparent, recadré au modèle
  function snapshot(scene, size = 512) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const v = view(c, scene); v.draw();
    const o = document.createElement("canvas"); o.width = o.height = size; const x = o.getContext("2d"); x.drawImage(c, 0, 0); v.dispose();
    const d = x.getImageData(0, 0, size, size).data; let l = size, t = size, r = -1, b = -1;
    for (let y = 0; y < size; y++) for (let k = 0; k < size; k++) if (d[(y * size + k) * 4 + 3] > 8) { if (k < l) l = k; if (k > r) r = k; if (y < t) t = y; if (y > b) b = y; }
    if (r < 0) return Promise.reject(new Error("glb-empty"));
    const w = r - l + 1, h = b - t + 1, f = document.createElement("canvas"); f.width = w; f.height = h; f.getContext("2d").drawImage(o, l, t, w, h, 0, 0, w, h);
    return new Promise((ok, ko) => f.toBlob((bl) => (bl ? ok(bl) : ko(new Error("png"))), "image/png"));
  }
  window.FolioGLB = { parse, view, snapshot };
})();
