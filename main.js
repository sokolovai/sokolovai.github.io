(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Появление при прокрутке: текст проявляется, кадры поднимаются на место ── */
  const rv = [...document.querySelectorAll(".rv, .rv-lift")];
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add("in"));
  }

  /* ── Ролики сами играют без звука, пока видны на экране ── */
  const vids = [...document.querySelectorAll(".frame video")];
  if ("IntersectionObserver" in window && !reduce) {
    const vio = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }),
      { threshold: 0.4 }
    );
    vids.forEach((v) => vio.observe(v));
  }

  /* ── Просмотр крупно ── */
  const lb = document.getElementById("lb");
  const stage = lb.querySelector(".lb-stage");
  const title = lb.querySelector(".lb-title");
  let list = [], idx = 0;

  const show = () => {
    const el = list[idx];
    stage.textContent = "";
    if (el.dataset.kind === "video") {
      const v = document.createElement("video");
      v.src = el.dataset.src; v.poster = el.dataset.poster || "";
      v.controls = true; v.autoplay = true; v.playsInline = true; v.loop = true;
      stage.append(v);
    } else {
      const im = new Image();
      im.src = el.dataset.src; im.alt = el.dataset.title || "";
      stage.append(im);
    }
    title.textContent = el.dataset.title || "";
    const multi = list.length > 1;
    lb.querySelector(".lb-prev").hidden = lb.querySelector(".lb-next").hidden = !multi;
  };
  const open = (el) => {
    list = [...document.querySelectorAll(`[data-group="${el.dataset.group}"]`)];
    idx = list.indexOf(el);
    show();
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    stage.textContent = "";
    document.body.style.overflow = "";
    if (lb.open) lb.close();
  };
  const step = (d) => { idx = (idx + d + list.length) % list.length; show(); };

  document.addEventListener("click", (e) => {
    const t = e.target.closest(".shot, .clip");
    if (t) open(t);
  });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => step(-1));
  lb.querySelector(".lb-next").addEventListener("click", () => step(1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  lb.addEventListener("close", () => { stage.textContent = ""; document.body.style.overflow = ""; });
  document.addEventListener("keydown", (e) => {
    if (!lb.open) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
})();
