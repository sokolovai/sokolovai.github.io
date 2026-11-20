(() => {
  "use strict";
  const D = JSON.parse(document.getElementById("data").textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mk = (tag, cls = "", html = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const P = {
    img: (id) => `../media/img/${id}.jpg`,
    th: (id) => `../media/thumb/${id}.jpg`,
    poster: (id) => `../media/poster/${id}.jpg`,
    vid: (id) => `../media/video/${id}.mp4`,
  };
  const chars = Object.fromEntries(D.chars.map((c) => [c.id, c]));
  const groups = Object.fromEntries(D.groups.map((g) => [g.id, g]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── общие куски: заголовки мест, содержимое окон ───────── */
  // место: "hero:noah" | "vroot" | "vgroup:cars"
  const placeTitle = (loc) => {
    const [t, id] = loc.split(":");
    return t === "hero" ? chars[id].name : t === "vroot" ? "Видео" : groups[id].name;
  };
  // настоящая синяя папка macOS (рисуется один раз в defs страницы)
  const folderHTML = () => `<svg class="mfolder" viewBox="0 0 128 104" aria-hidden="true"><use href="#mfolder"/></svg>`;

  function contentHTML(loc, mode) {
    const [t, id] = loc.split(":");
    if (t === "hero") {
      const c = chars[id];
      return `<div class="grid g-photo">${c.imgs.map((im, i) => `<button class="th" type="button" data-photo="${c.id}:${i}" aria-label="Открыть кадр крупно: ${c.name}"><img src="${P.th(im)}" alt="${c.name}, кадр ${i + 1}" loading="lazy" decoding="async"></button>`).join("")}</div>`;
    }
    if (t === "vroot") {
      if (mode === "ios") {
        return `<div class="apps iapps">${D.groups.map((g) => `<button class="app" type="button" data-loc="vgroup:${g.id}"><span class="ifolder">${g.clips.slice(0, 9).map((c) => `<img src="${P.poster(c.id)}" alt="" style="object-position:50% 40%">`).join("")}</span><span class="lbl">${g.name}</span></button>`).join("")}</div>`;
      }
      return `<div class="grid g-folder">${D.groups.map((g) => `<button class="fo" type="button" data-loc="vgroup:${g.id}">${folderHTML(g.color, P.poster(g.clips[0].id))}<span class="lbl">${g.name}</span></button>`).join("")}</div>`;
    }
    const g = groups[id];
    return `<div class="grid g-video">${g.clips.map((c) => `<button class="th" type="button" data-clip="${g.id}:${c.id}" aria-label="Смотреть: ${c.title}"><img src="${P.poster(c.id)}" alt="Кадр из ролика «${c.title}»" loading="lazy" decoding="async"><i class="pl"></i></button>`).join("")}</div>`;
  }

  const clock = () => new Date().toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");
  const hhmm = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  /* ═════════ КОМПЬЮТЕР: экран MacBook ═════════ */
  function initMac() {
    const scr = $("#screen");
    const dock = $("#dock");
    const dsep = $("#dsep");
    const appname = $("#appname");
    const clk = $("#clock");
    let z = 20, cascade = 0, active = null;
    const wins = [];

    const tick = () => { clk.textContent = clock(); };
    tick(); setInterval(tick, 20000);

    const sw = () => scr.clientWidth, sh = () => scr.clientHeight;
    const menuH = () => $(".menubar", scr).offsetHeight;

    function focus(w) {
      active = w;
      wins.forEach((x) => x.el.classList.toggle("active", x === w));
      if (w) { w.el.style.zIndex = ++z; appname.textContent = w.title || "Портфолио"; } else appname.textContent = "Портфолио";
    }
    function topWin() {
      return wins.filter((w) => !w.el.classList.contains("min")).sort((a, b) => +b.el.style.zIndex - +a.el.style.zIndex)[0] || null;
    }
    function remove(w) {
      w.el.classList.add("closing");
      setTimeout(() => { w.el.remove(); }, reduce ? 0 : 260);
      wins.splice(wins.indexOf(w), 1);
      if (w.chip) { w.chip.remove(); if (!wins.some((x) => x.chip)) dsep.hidden = true; }
      if (active === w) focus(topWin());
    }
    function minimize(w) {
      w.el.classList.add("min");
      if (!w.chip) {
        const a = mk("button", "dk");
        a.type = "button";
        a.setAttribute("aria-label", "Показать окно: " + w.title);
        a.innerHTML = `<span class="dki" style="--c:${w.color || "#4a5568"}"><b style="font:800 1.1em var(--display)">${(w.title || "?")[0]}</b></span><i class="dot"></i>`;
        a.addEventListener("click", () => restore(w));
        dock.append(a); dsep.hidden = false; w.chip = a;
      }
      if (active === w) focus(topWin());
    }
    function restore(w) {
      w.el.classList.remove("min");
      if (w.chip) { w.chip.remove(); w.chip = null; if (!wins.some((x) => x.chip)) dsep.hidden = true; }
      focus(w);
    }

    // создать окно; size — доли экрана
    function makeWin({ title, color, fw = 0.62, fh = 0.72, aspectBody = 0, navbar = false }) {
      const el = mk("div", "win");
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", title);
      const tb = mk("div", "tb");
      const lights = mk("div", "lights");
      const bc = mk("button", "l c"); bc.type = "button"; bc.setAttribute("aria-label", "Закрыть");
      const bm = mk("button", "l m"); bm.type = "button"; bm.setAttribute("aria-label", "Свернуть");
      const bz = mk("button", "l z"); bz.type = "button"; bz.setAttribute("aria-label", "Развернуть");
      lights.append(bc, bm, bz);
      tb.append(lights);
      const w = { el, title, color, tb, navbar };
      if (navbar) {
        const nav = mk("div", "navb", `<button type="button" class="back" aria-label="Назад" disabled><svg viewBox="0 0 9 15"><path d="M7.5 1.5 2 7.5l5.5 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`);
        tb.append(nav);
        w.back = $(".back", nav);
      }
      const ttl = mk("div", "wtitle", title);
      tb.append(ttl);
      w.ttl = ttl;
      el.append(tb);
      const W = Math.round(sw() * fw), H = Math.round(sh() * fh);
      const off = (cascade++ % 5) * 26;
      const pc = (v, base) => (v / base * 100).toFixed(3) + "%";
      el.style.width = pc(W, sw()); el.style.height = pc(H, sh());
      el.style.left = pc((sw() - W) / 2 + off - 52, sw());
      el.style.top = pc(menuH() + (sh() - menuH() - H) / 2 + off - 30, sh());
      scr.append(el);
      wins.push(w);
      focus(w);

      bc.addEventListener("click", (e) => { e.stopPropagation(); remove(w); });
      bm.addEventListener("click", (e) => { e.stopPropagation(); minimize(w); });
      bz.addEventListener("click", (e) => { e.stopPropagation(); el.classList.toggle("max"); focus(w); });
      tb.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) el.classList.toggle("max"); });
      el.addEventListener("pointerdown", () => { if (active !== w) focus(w); }, true);

      // перетаскивание за заголовок
      tb.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button") || el.classList.contains("max")) return;
        const sr = scr.getBoundingClientRect();
        const ox = e.clientX - el.offsetLeft - sr.left, oy = e.clientY - el.offsetTop - sr.top;
        tb.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const x = Math.min(sw() - 120, Math.max(120 - el.offsetWidth, ev.clientX - sr.left - ox));
          const y = Math.min(sh() - 50, Math.max(menuH(), ev.clientY - sr.top - oy));
          el.style.left = (x / sw() * 100).toFixed(3) + "%"; el.style.top = (y / sh() * 100).toFixed(3) + "%";
        };
        const up = () => { tb.removeEventListener("pointermove", move); tb.removeEventListener("pointerup", up); tb.removeEventListener("pointercancel", up); };
        tb.addEventListener("pointermove", move); tb.addEventListener("pointerup", up); tb.addEventListener("pointercancel", up);
      });
      return w;
    }

    /* — окно папки (как Finder) — */
    function openFinder(loc) {
      const w = makeWin({ title: placeTitle(loc), color: ((loc.startsWith("hero") ? chars[loc.split(":")[1]] : loc.startsWith("vgroup") ? groups[loc.split(":")[1]] : null) || { color: "#5b78d8" }).color, navbar: true });
      w.hist = []; w.loc = null;
      const body = mk("div", "wbody");
      const side = mk("aside", "side");
      side.innerHTML =
        `<div class="sl">Герои</div>` + D.chars.map((c) => `<button class="si" type="button" data-loc="hero:${c.id}" ><svg class="sf" viewBox="0 0 128 104" aria-hidden="true"><use href="#mfolder"/></svg>${c.name}</button>`).join("") +
        `<div class="sl">Видео</div><button class="si" type="button" data-loc="vroot"><svg class="sf" viewBox="0 0 128 104" aria-hidden="true"><use href="#mfolder"/></svg>Все видео</button>` +
        D.groups.map((g) => `<button class="si" type="button" data-loc="vgroup:${g.id}" ><svg class="sf" viewBox="0 0 128 104" aria-hidden="true"><use href="#mfolder"/></svg>${g.name}</button>`).join("");
      const main = mk("section", "main");
      body.append(side, main);
      w.el.append(body);
      w.main = main; w.side = side;

      const show = (loc, push) => {
        if (push && w.loc && w.loc !== loc) w.hist.push(w.loc);
        w.loc = loc;
        w.title = placeTitle(loc);
        w.ttl.textContent = w.title;
        w.el.setAttribute("aria-label", w.title);
        main.innerHTML = contentHTML(loc, "mac");
        main.scrollTop = 0;
        $$(".si", side).forEach((b) => b.classList.toggle("on", b.dataset.loc === loc));
        w.back.disabled = !w.hist.length;
        if (active === w) appname.textContent = w.title;
      };
      w.back.addEventListener("click", () => { if (w.hist.length) show(w.hist.pop(), false); });
      side.addEventListener("click", (e) => { const b = e.target.closest("[data-loc]"); if (b) show(b.dataset.loc, true); });
      main.addEventListener("click", (e) => {
        const f = e.target.closest("[data-loc]"); if (f) return show(f.dataset.loc, true);
        const p = e.target.closest("[data-photo]"); if (p) { const [c, i] = p.dataset.photo.split(":"); return openPhoto(c, +i); }
        const v = e.target.closest("[data-clip]"); if (v) { const [g, c] = v.dataset.clip.split(":"); return openVideo(g, c); }
      });
      show(loc, false);
      return w;
    }

    /* — просмотр кадра — */
    function openPhoto(cid, idx) {
      const c = chars[cid];
      const w = makeWin({ title: c.name, color: c.color, fw: 0.46, fh: 0.78 });
      const view = mk("div", "view");
      const img = mk("img");
      const prev = mk("button", "vnav p glass", "←"); prev.type = "button"; prev.setAttribute("aria-label", "Предыдущий кадр");
      const next = mk("button", "vnav n glass", "→"); next.type = "button"; next.setAttribute("aria-label", "Следующий кадр");
      view.append(img, prev, next);
      w.el.append(view);
      requestAnimationFrame(() => lens(prev, next));
      let i = idx;
      const set = (n) => { i = (n + c.imgs.length) % c.imgs.length; img.src = P.img(c.imgs[i]); img.alt = `${c.name}, кадр ${i + 1}`; };
      prev.addEventListener("click", () => set(i - 1));
      next.addEventListener("click", () => set(i + 1));
      w.key = (k) => { if (k === "ArrowLeft") set(i - 1); if (k === "ArrowRight") set(i + 1); };
      set(i);
      return w;
    }

    /* — видеоплеер — */
    function openVideo(gid, cid) {
      const g = groups[gid];
      const c = g.clips.find((x) => x.id === cid);
      const tbH = 40;
      let fh, fw;
      if (c.ar < 1) { fh = 0.78; fw = ((sh() * fh - tbH) * c.ar) / sw(); }
      else { fw = 0.56; fh = (sw() * fw / c.ar + tbH) / sh(); }
      const w = makeWin({ title: c.title, color: g.color, fw: Math.min(fw, 0.9), fh: Math.min(fh, 0.9) });
      const view = mk("div", "view");
      const v = mk("video");
      v.src = P.vid(c.id); v.poster = P.poster(c.id); v.controls = true; v.autoplay = true; v.loop = true; v.playsInline = true;
      view.append(v);
      w.el.append(view);
      const orig = remove;
      w.onClose = () => { v.pause(); v.removeAttribute("src"); v.load(); };
      v.play().catch(() => {});
      return w;
    }

    // закрытие видео: остановить звук
    const _remove = remove;
    // (перехватываем через наблюдение за классом closing)
    new MutationObserver((ms) => ms.forEach((m) => {
      if (m.target.classList && m.target.classList.contains("closing")) { const v = $("video", m.target); if (v) v.pause(); }
    })).observe(scr, { subtree: true, attributes: true, attributeFilter: ["class"] });

    /* — запуск: значки на рабочем столе и в доке — */
    const openLoc = (loc) => {
      // если такая папка уже открыта — просто поднимаем окно
      const ex = wins.find((w) => w.loc === loc && !w.el.classList.contains("closing"));
      if (ex) { if (ex.el.classList.contains("min")) restore(ex); else focus(ex); return; }
      openFinder(loc);
    };
    $$(".dicon, #dock [data-loc]").forEach((b) => b.addEventListener("click", () => openLoc(b.dataset.loc)));
    scr.addEventListener("pointerdown", (e) => { if (e.target === scr || e.target.closest(".wall, .widget")) focus(null); });
    document.addEventListener("keydown", (e) => {
      if (!active) return;
      if (e.key === "Escape") remove(active);
      else if (active.key) active.key(e.key);
    });
  }

  /* ═════════ ТЕЛЕФОН: рабочий стол iPhone ═════════ */
  function initIos() {
    const home = $("#ihome");
    const app = $("#iapp"), body = $("#ibody"), title = $("#ititle"), back = $("#iback"), backL = $("#iback-l");
    const view = $("#iview"), track = $("#itrack"), closeBtn = $("#iclose");
    const t = $("#itime");
    const tick = () => { t.textContent = hhmm(); };
    tick(); setInterval(tick, 20000);
    let stack = [];

    const render = () => {
      const loc = stack[stack.length - 1];
      title.textContent = placeTitle(loc);
      backL.textContent = stack.length > 1 ? placeTitle(stack[stack.length - 2]) : "Домой";
      body.innerHTML = contentHTML(loc, "ios");
      body.scrollTop = 0;
      requestAnimationFrame(() => $$(".irow", body).forEach((r) => lens(r)));
    };
    const openApp = (loc, from) => {
      stack = [loc];
      if (from) {
        const r = from.getBoundingClientRect();
        app.style.setProperty("--ox", r.left + r.width / 2 + "px");
        app.style.setProperty("--oy", r.top + r.height / 2 + "px");
      }
      app.classList.remove("closing");
      app.hidden = false;
      render();
    };
    const closeApp = () => {
      if (reduce) { app.hidden = true; return; }
      app.classList.add("closing");
      setTimeout(() => { app.hidden = true; app.classList.remove("closing"); }, 340);
    };
    $$(".app").forEach((b) => b.addEventListener("click", () => openApp(b.dataset.loc, $(".aicon", b))));
    back.addEventListener("click", () => { if (stack.length > 1) { stack.pop(); render(); } else closeApp(); });
    body.addEventListener("click", (e) => {
      const f = e.target.closest("[data-loc]"); if (f) { stack.push(f.dataset.loc); return render(); }
      const p = e.target.closest("[data-photo]"); if (p) { const [c, i] = p.dataset.photo.split(":"); return openPhoto(c, +i); }
      const v = e.target.closest("[data-clip]"); if (v) { const [g, c] = v.dataset.clip.split(":"); return openVideo(g, c); }
    });
    $(".hbar").addEventListener("click", () => { if (!app.hidden) closeApp(); });

    function openViewer(slides, startIdx) {
      track.innerHTML = slides.join("");
      view.hidden = false;
      track.scrollLeft = startIdx * view.clientWidth;
      $$("video", track).forEach((v) => v.play().catch(() => {}));
    }
    const openPhoto = (cid, idx) => {
      const c = chars[cid];
      openViewer(c.imgs.map((im, i) => `<div class="slide"><img src="${P.img(im)}" alt="${c.name}, кадр ${i + 1}" ${Math.abs(i - idx) > 1 ? 'loading="lazy"' : ""}></div>`), idx);
    };
    const openVideo = (gid, cid) => {
      const g = groups[gid];
      const idx = g.clips.findIndex((x) => x.id === cid);
      openViewer(g.clips.map((c, i) => `<div class="slide"><video ${i === idx ? "autoplay" : ""} src="${P.vid(c.id)}" poster="${P.poster(c.id)}" controls playsinline loop preload="${Math.abs(i - idx) <= 1 ? "metadata" : "none"}"></video></div>`), idx);
    };
    closeBtn.addEventListener("click", () => { $$("video", track).forEach((v) => v.pause()); view.hidden = true; track.innerHTML = ""; });
    // при листании видео: играет только то, что на экране
    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      $$(".slide video", track).forEach((v, k) => { if (k === i) v.play().catch(() => {}); else v.pause(); });
    }, { passive: true });
  }

  /* ───────── фон «шёлк», преломляющее стекло и блик по кромке ───────── */
  function boot(mode) {
    const root = mode === "mac" ? $("#desktop-mode") : $("#ios");
    if (window.Silk) $$("canvas.silk", root).forEach((cv) => Silk.start(cv, cv.dataset.pal));
    const sels = mode === "mac" ? [".widget", ".dock"] : [".iwidget", ".idock", ".iclose"];
    requestAnimationFrame(() => requestAnimationFrame(() => sels.forEach((s) => $$(s, root).forEach((el) => window.Lens && Lens.apply(el)))));
    if (mode === "mac") {
      let raf = 0, px = 0, py = 0;
      const upd = () => {
        raf = 0;
        $$(".glass, .win", root).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width) return;
          const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
          el.style.setProperty("--a", ((Math.atan2(dx, -dy) * 180) / Math.PI + 180).toFixed(1) + "deg");
        });
      };
      root.addEventListener("pointermove", (e) => {
        px = e.clientX; py = e.clientY;
        root.classList.add("has-ptr");
        if (!raf) raf = requestAnimationFrame(upd);
      }, { passive: true });
    }
  }
  const lens = (...els) => { if (window.Lens) els.forEach((e) => e && Lens.apply(e)); };

  /* ───────── какой режим сейчас ───────── */
  const desktopQ = matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  let macOn = false, iosOn = false;
  const route = () => {
    const forceIos = document.documentElement.classList.contains("force-ios");
    if (desktopQ.matches && !forceIos) { if (!macOn) { macOn = true; initMac(); boot("mac"); } }
    else if (!iosOn) { iosOn = true; initIos(); boot("ios"); }
  };
  route();
  desktopQ.addEventListener("change", route);
})();
