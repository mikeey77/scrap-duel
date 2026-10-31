// ---------- WebGL2 renderer: pass 1 = scene per character cell (MRT colour+glyph / emissive), pass 2 = glyphs + bloom ----------
const YS = 0.82, ZS = 0.72;
const DATA_W = 128, DATA_H = 10;
const Rn = {};

function initRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 niet beschikbaar');
  Rn.gl = gl;
  Rn.canvas = canvas;
  gl.getExtension('EXT_color_buffer_float');
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = fs => {
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const nm = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      u[nm] = gl.getUniformLocation(p, nm);
    }
    return { p, u };
  };
  Rn.scene = prog(SCENE_FS);
  Rn.comp = prog(COMP_FS);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = (filter = gl.NEAREST) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  Rn.tex = tex;
  Rn.hTex = tex(gl.LINEAR);
  Rn.bTex = tex(gl.NEAREST);
  Rn.dTex = tex(gl.NEAREST);
  Rn.sceneTex = tex(gl.NEAREST);
  Rn.emisTex = tex(gl.LINEAR_MIPMAP_LINEAR);
  Rn.atlasTex = tex(gl.NEAREST);
  Rn.fbo = gl.createFramebuffer();
  Rn.data = new Float32Array(DATA_W * DATA_H * 4);
  gl.bindTexture(gl.TEXTURE_2D, Rn.dTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, DATA_W, DATA_H, 0, gl.RGBA, gl.FLOAT, null);
}

function uploadWorld() {
  const gl = Rn.gl;
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.bindTexture(gl.TEXTURE_2D, Rn.hTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, W.h);
  gl.bindTexture(gl.TEXTURE_2D, Rn.bTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, W.b);
}

function resizeRenderer(cellCss) {
  const gl = Rn.gl, c = Rn.canvas;
  Rn.dpr = Math.min(window.devicePixelRatio || 1, 2);
  Rn.W = c.width = Math.floor(innerWidth * Rn.dpr);
  Rn.H = c.height = Math.floor(innerHeight * Rn.dpr);
  Rn.ch = Math.max(5, Math.round(cellCss * Rn.dpr));
  Rn.cw = Math.max(3, Math.round(Rn.ch * 0.6));
  Rn.cols = Math.ceil(Rn.W / Rn.cw);
  Rn.rows = Math.ceil(Rn.H / Rn.ch);
  gl.bindTexture(gl.TEXTURE_2D, Rn.sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Rn.cols, Rn.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindTexture(gl.TEXTURE_2D, Rn.emisTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Rn.cols, Rn.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindFramebuffer(gl.FRAMEBUFFER, Rn.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Rn.sceneTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, Rn.emisTex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // glyph atlas at exactly one cell per glyph, so sampling is pixel-perfect
  const a = document.createElement('canvas');
  a.width = Rn.cw * GLYPHS.length;
  a.height = Rn.ch;
  const x = a.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, a.width, a.height);
  x.fillStyle = '#fff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `bold ${Math.min(Rn.ch * 0.95, Rn.cw / 0.6)}px Consolas, Menlo, "DejaVu Sans Mono", "Courier New", monospace`;
  for (let i = 0; i < GLYPHS.length; i++) x.fillText(GLYPHS[i], i * Rn.cw + Rn.cw / 2, Rn.ch / 2 + 1);
  gl.bindTexture(gl.TEXTURE_2D, Rn.atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, a);
}

// world <-> screen helpers (camera position in screen-plane space)
function worldToScreen(x, y, z, cam) {
  const sx = x, sy = y * YS + z * ZS;
  const px = (sx - cam.sx) * cam.ppu + (Rn.cols * Rn.cw) / 2;
  const py = (sy - cam.sy) * cam.ppu + (Rn.rows * Rn.ch) / 2;
  return [px / Rn.dpr, (Rn.H - py) / Rn.dpr];
}

function renderFrame(st) {
  const gl = Rn.gl, D = Rn.data;
  D.fill(0);
  const put = (col, row, v) => D.set(v, (row * DATA_W + col) * 4);
  st.figures.slice(0, 64).forEach((f, i) => {
    put(i, 0, [f.x, f.y, f.z || 0, f.face]);
    put(i, 1, [f.type, f.phase, f.atk || 0, f.hurt || 0]);
    put(i, 2, [...f.c1, f.scale || 1]);
    put(i, 3, [...(f.c2 || [0, 0, 0]), f.weapon || 0]);
    put(i, 4, [...(f.wc || [0.7, 0.7, 0.7]), f.shield || 0]);
    put(i, 5, [f.move || 0, f.helm || 0, 0, 0]);
  });
  st.lights.slice(0, 32).forEach((l, i) => {
    put(i, 6, [l.x, l.y, l.z, l.r]);
    put(i, 7, [...l.col, l.type]);
  });
  st.particles.slice(0, 128).forEach((p, i) => {
    put(i, 8, [p.x, p.y, p.z, p.size]);
    put(i, 9, [...p.col, p.glyph]);
  });
  gl.bindTexture(gl.TEXTURE_2D, Rn.dTex);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, DATA_W, DATA_H, gl.RGBA, gl.FLOAT, D);

  const cam = st.cam;
  // snap the camera to whole cells so glyphs never swim
  const csx = (Math.round((cam.sx * cam.ppu) / Rn.cw) * Rn.cw) / cam.ppu;
  const csy = (Math.round((cam.sy * cam.ppu) / Rn.ch) * Rn.ch) / cam.ppu;
  cam.snapX = csx;
  cam.snapY = csy;
  const gw = Rn.cols * Rn.cw, gh = Rn.rows * Rn.ch;

  gl.bindFramebuffer(gl.FRAMEBUFFER, Rn.fbo);
  gl.viewport(0, 0, Rn.cols, Rn.rows);
  const s = Rn.scene, u = s.u;
  gl.useProgram(s.p);
  [Rn.hTex, Rn.bTex, Rn.dTex].forEach((t, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t);
  });
  gl.uniform1i(u.uH, 0);
  gl.uniform1i(u.uB, 1);
  gl.uniform1i(u.uD, 2);
  gl.uniform2f(u.uRes, gw, gh);
  gl.uniform2f(u.uCell, Rn.cw, Rn.ch);
  gl.uniform2f(u.uCamS, csx, csy);
  gl.uniform1f(u.uPPU, cam.ppu);
  gl.uniform1f(u.uTime, st.time);
  gl.uniform1f(u.uNight, st.env.night);
  gl.uniform1f(u.uRain, st.env.rain);
  gl.uniform1f(u.uWet, st.env.wet);
  gl.uniform1f(u.uCloud, st.env.cloud);
  gl.uniform1f(u.uExp, st.env.exposure);
  gl.uniform3fv(u.uSunDir, st.env.sunDir);
  gl.uniform3fv(u.uSunCol, st.env.sunCol);
  gl.uniform3fv(u.uAmb, st.env.amb);
  gl.uniform3fv(u.uSky, st.env.sky);
  gl.uniform1i(u.uSeed, W.seed);
  gl.uniform1i(u.uNF, Math.min(64, st.figures.length));
  const pls = (st.players || []).slice(0, 4);
  gl.uniform1i(u.uNPl, pls.length);
  if (pls.length) gl.uniform2fv(u.uPl, new Float32Array([0, 1, 2, 3].flatMap(i => (pls[i] ? [pls[i].x, pls[i].y] : [0, 0]))));
  gl.uniform1i(u.uNL, Math.min(32, st.lights.length));
  gl.uniform1i(u.uNP, Math.min(128, st.particles.length));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindTexture(gl.TEXTURE_2D, Rn.emisTex);
  gl.generateMipmap(gl.TEXTURE_2D);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, Rn.W, Rn.H);
  const c = Rn.comp, v = c.u;
  gl.useProgram(c.p);
  [Rn.sceneTex, Rn.emisTex, Rn.atlasTex].forEach((t, i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, t);
  });
  gl.uniform1i(v.uScene, 0);
  gl.uniform1i(v.uEmis, 1);
  gl.uniform1i(v.uAtlas, 2);
  gl.uniform2f(v.uRes, gw, gh);
  gl.uniform2f(v.uCell, Rn.cw, Rn.ch);
  gl.uniform2f(v.uGrid, Rn.cols, Rn.rows);
  gl.uniform2f(v.uCamS, csx, csy);
  gl.uniform1f(v.uPPU, cam.ppu);
  gl.uniform1f(v.uTime, st.time);
  gl.uniform1f(v.uRaw, st.raw ? 1 : 0);
  gl.uniform1f(v.uFlash, st.env.flash);
  gl.uniform1f(v.uMist, st.env.mist);
  gl.uniform1f(v.uNight, st.env.night);
  gl.uniform1f(v.uBloom, 1.0);
  gl.uniform3fv(v.uAmb, st.env.amb);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
