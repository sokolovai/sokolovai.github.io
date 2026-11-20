/* Настоящее преломление для «жидкого стекла».
   Обычное размытие фона (glassmorphism) не похоже на Apple: у настоящего Liquid Glass фон под стеклом
   искривляется у краёв, как под линзой. Здесь для каждого стеклянного элемента строится карта смещения,
   и SVG-фильтр feDisplacementMap гнёт фон под ним (работает в Chrome, Edge и других браузерах на Chromium).
   В Safari и Firefox остаётся мягкое стекло без преломления, но с тем же бликом по кромке. */
window.Lens = (() => {
  const ua = navigator.userAgent;
  const ok = /Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\//.test(ua) && window.CSS && CSS.supports && CSS.supports("backdrop-filter", "url(#x)");
  if (!ok) return { apply() {}, supported: false };

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;pointer-events:none";
  svg.setAttribute("aria-hidden", "true");
  const defs = document.createElementNS(NS, "defs");
  svg.append(defs);
  document.body.append(svg);
  let seq = 0;

  // карта смещения: у кромки стекла фон «подтягивается» с глубины, в центре смещения нет
  function mapURL(w, h, r, bezel) {
    const k = Math.min(1, Math.sqrt(160000 / (w * h)));
    const W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(W, H);
    const hx = W / 2, hy = H / 2, rr = Math.min(r * k, hx, hy), bz = Math.max(2, bezel * k);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const px = x + 0.5 - hx, py = y + 0.5 - hy;
        const qx = Math.abs(px) - (hx - rr), qy = Math.abs(py) - (hy - rr);
        let nx, ny, dist;
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * Math.sign(px); ny = (qy / l) * Math.sign(py); dist = rr - l; }
        else if (qx > qy) { nx = Math.sign(px); ny = 0; dist = -qx; }
        else { nx = 0; ny = Math.sign(py); dist = -qy; }
        const t = Math.min(1, Math.max(0, dist / bz));
        const mag = Math.pow(1 - t, 2.4); // сильно у кромки, плавно к нулю внутри
        const i = (y * W + x) * 4;
        img.data[i] = 128 - nx * mag * 127;     // внутрь: к центру
        img.data[i + 1] = 128 - ny * mag * 127;
        img.data[i + 2] = 128;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function apply(el, o = {}) {
    if (!el || el.__lens) return;
    const id = "lg" + ++seq;
    const f = document.createElementNS(NS, "filter");
    f.setAttribute("id", id);
    f.setAttribute("x", "0"); f.setAttribute("y", "0"); f.setAttribute("width", "100%"); f.setAttribute("height", "100%");
    f.setAttribute("color-interpolation-filters", "sRGB");
    const fi = document.createElementNS(NS, "feImage");
    fi.setAttribute("result", "m"); fi.setAttribute("preserveAspectRatio", "none");
    const fd = document.createElementNS(NS, "feDisplacementMap");
    fd.setAttribute("in", "SourceGraphic"); fd.setAttribute("in2", "m");
    fd.setAttribute("xChannelSelector", "R"); fd.setAttribute("yChannelSelector", "G");
    f.append(fi, fd);
    defs.append(f);
    el.__lens = true;

    let timer = 0, lastKey = "";
    const build = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) return;
      const key = w + "x" + h;
      if (key === lastKey) return;
      lastKey = key;
      let r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      if (/%/.test(getComputedStyle(el).borderTopLeftRadius)) r = Math.min(w, h) / 2;
      r = Math.min(r, Math.min(w, h) / 2);
      const bezel = o.bezel || Math.max(10, Math.min(30, Math.min(w, h) * 0.34));
      fi.setAttribute("x", "0"); fi.setAttribute("y", "0"); fi.setAttribute("width", w); fi.setAttribute("height", h);
      fi.setAttribute("href", mapURL(w, h, r, bezel));
      fd.setAttribute("scale", String(o.scale || Math.round(bezel * 1.5)));
      const val = `url(#${id}) blur(${o.blur ?? 1}px) saturate(${o.sat ?? 1.8}) brightness(${o.bright ?? 1.1})`;
      el.style.backdropFilter = val;
      el.style.webkitBackdropFilter = val;
    };
    build();
    if ("ResizeObserver" in window) new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(build, 120); }).observe(el);
  }
  return { apply, supported: true };
})();
