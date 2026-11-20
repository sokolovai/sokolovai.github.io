/* «Шёлк»: дорогой анимированный фон на WebGL. Текучие складки ткани с тонкими бликами шампань,
   зерно и виньетка. Считается на видеокарте в половинном разрешении, поэтому лёгкий.
   Если WebGL недоступен, остаётся обычный тёмный фон из CSS. */
window.Silk = (() => {
  const PAL = {
    // за ноутбуком: глубокий синий, бордо, блики шампань
    room: { c0: "#04071a", c1: "#0f2146", c2: "#6a1d33", c3: "#f0d59a", c4: "#8fb8ff", i: 0.9 },
    // обои MacBook: тёплый «закат», гладкие цветные поля как у обоев Apple
    screen: { shader: "bloom", c0: "#1a2a7a", c1: "#3f6cf2", c2: "#ff6f91", c3: "#ffb56b", c4: "#ffffff", i: 1.0 },
    // обои iPhone: холодные мятно-бирюзовые волны
    ios: { shader: "bloom", c0: "#0c2a5e", c1: "#12b5c8", c2: "#4f7dff", c3: "#a4efb0", c4: "#ffffff", i: 1.0 },
  };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }";
  const FS = `precision mediump float;
uniform vec2 uR; uniform float uT; uniform vec2 uM; uniform float uI;
uniform vec3 c0, c1, c2, c3, c4;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 4; i++){ s += a * n(p); p = p * 2.02 + vec2(5.2, 1.3); a *= .5; } return s; }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uR) / min(uR.x, uR.y);
  float t = uT * .05;
  vec2 q = uv * 1.15 + (uM - .5) * .14;
  vec2 w = vec2(fbm(q * 1.2 + vec2(0., t)), fbm(q * 1.2 + vec2(4.7, -t)));
  q += (w - .5) * .85;
  float f = q.x * .95 + q.y * .6 + fbm(q * 1.0 + t) * .95;
  float fold = sin(f * 3.2 + t * 2.4) * .5 + .5;
  float sheen = pow(1. - abs(sin(f * 2.1 + t * 2.4 + .6)), 3.2);
  float sheen2 = pow(1. - abs(sin(f * 3.4 - t * 1.6 + 2.)), 6.);
  vec3 col = mix(c0, c1, smoothstep(0., 1., fbm(q * .8 + t) + .25 * fold));
  col = mix(col, c2, smoothstep(.45, .95, fbm(q * .9 + vec2(3., t * 1.3))) * .7);
  col = mix(col, col * 1.45 + c1 * .15, fold * .32);
  col += c3 * sheen * .2 * uI;
  col += c4 * sheen2 * .1 * uI;
  col += c3 * pow(sheen, 7.) * .12 * uI;
  float v = smoothstep(1.4, .15, length(uv));
  col *= .5 + .7 * v;
  col += (h(gl_FragCoord.xy + fract(uT)) - .5) * .03;
  gl_FragColor = vec4(col, 1.);
}`;

  // «Цветение»: гладкие плавные цветные поля и мягкий блик-лента, как у обоев Apple
  const FS_BLOOM = `precision mediump float;
uniform vec2 uR; uniform float uT; uniform vec2 uM; uniform float uI;
uniform vec3 c0, c1, c2, c3, c4;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 3; i++){ s += a * n(p); p = p * 2.02 + vec2(5.2, 1.3); a *= .5; } return s; }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uR) / min(uR.x, uR.y);
  float t = uT * .045;
  vec2 p = uv * 1.05 + (uM - .5) * .1;
  p += .42 * vec2(sin(p.y * 1.9 + t * 1.3), cos(p.x * 1.7 - t));
  p += .2 * vec2(sin(p.y * 3.1 - t * 1.7 + 1.), cos(p.x * 2.7 + t * 1.4 + 2.));
  float a = fbm(p * .85 + vec2(t, 0.));
  float b = fbm(p * .7 - vec2(0., t) + 4.);
  float c = smoothstep(.25, .8, fbm(p * .6 + 8. - t));
  vec3 col = mix(c0, c1, smoothstep(.44, .68, a));
  col = mix(col, c2, smoothstep(.34, .56, b));
  col = mix(col, c3, smoothstep(.40, .66, fbm(p * .75 + vec2(7., -t))) * (.45 + .55 * c));
  float rib = pow(1. - abs(sin(p.x * 1.6 + p.y * 1.1 + a * 2.4 + t * 1.5)), 6.);
  col += c4 * rib * .14 * uI;
  col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, 1.45);
  col *= .92 + .12 * smoothstep(1.4, .2, length(uv));
  col += (h(gl_FragCoord.xy + fract(uT)) - .5) * .02;
  gl_FragColor = vec4(col, 1.);
}`;

  function start(canvas, key) {
    const pal = PAL[key] || PAL.screen;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, pal.shader === "bloom" ? FS_BLOOM : FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const uR = U("uR"), uT = U("uT"), uM = U("uM"), uI = U("uI");
    ["c0", "c1", "c2", "c3", "c4"].forEach((k) => gl.uniform3fv(U(k), rgb(pal[k])));
    gl.uniform1f(uI, pal.i);

    let m = [0.5, 0.5], tm = [0.5, 0.5], visible = true, raf = 0, last = 0, t0 = performance.now();
    const resize = () => {
      const w = Math.max(160, Math.round(canvas.clientWidth * 0.5)), h = Math.max(120, Math.round(canvas.clientHeight * 0.5));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    };
    const draw = (t) => {
      resize();
      m[0] += (tm[0] - m[0]) * 0.05; m[1] += (tm[1] - m[1]) * 0.05;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform2f(uM, m[0], m[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < 34) return;
      last = now;
      draw((now - t0) / 1000 + 20);
    };
    if (reduce) { draw(26); } else { raf = requestAnimationFrame(loop); }
    window.addEventListener("pointermove", (e) => { tm = [e.clientX / innerWidth, 1 - e.clientY / innerHeight]; }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(canvas);
    window.addEventListener("resize", () => { if (reduce) draw(26); });
    return { stop() { cancelAnimationFrame(raf); } };
  }
  return { start };
})();
