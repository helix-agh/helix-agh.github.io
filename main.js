/* HELIX site interactions — dependency-free, restrained, accessible.
   Sections:
   1. Preloader (once per session, CSS-driven fallback)
   2. Hero generative background (population converging on optima)
   3. Scroll reveal
   4. Animated counters
   All effects honor prefers-reduced-motion. */

(function () {
  "use strict";

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Preloader ---------- */
  (function preloader() {
    const el = document.querySelector(".preloader");
    if (!el) return;

    const dismiss = function () {
      el.classList.add("preloader--hide");
      window.setTimeout(function () {
        el.remove();
      }, 700);
    };

    // Already seen this session, or reduced motion: skip the reveal entirely.
    if (REDUCE || sessionStorage.getItem("helix-intro") === "1") {
      el.remove();
      return;
    }
    sessionStorage.setItem("helix-intro", "1");

    el.classList.add("preloader--active");
    el.addEventListener("click", dismiss);
    window.setTimeout(dismiss, 600);
  })();

  /* ---------- 2. Hero generative background ---------- */
  (function heroField() {
    const canvas = document.querySelector(".hero-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ACCENT = "56,189,248"; // --accent
    const NUM_POINTS = 90;
    const NUM_ATTRACTORS = 4;

    let w = 0,
      h = 0,
      dpr = 1,
      points = [],
      attractors = [],
      raf = null,
      onScreen = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      points = [];
      for (let i = 0; i < NUM_POINTS; i++) {
        points.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0 });
      }
      attractors = [];
      for (let i = 0; i < NUM_ATTRACTORS; i++) {
        attractors.push({
          x: Math.random() * w,
          y: Math.random() * h,
          tx: Math.random() * w,
          ty: Math.random() * h,
        });
      }
    }

    function step() {
      // Optima drift slowly toward a new target, then pick another.
      for (let i = 0; i < attractors.length; i++) {
        const a = attractors[i];
        a.x += (a.tx - a.x) * 0.004;
        a.y += (a.ty - a.y) * 0.004;
        if (Math.abs(a.tx - a.x) < 6 && Math.abs(a.ty - a.y) < 6) {
          a.tx = w * (0.12 + Math.random() * 0.76);
          a.ty = h * (0.12 + Math.random() * 0.76);
        }
      }
      // Population is pulled toward the nearest optimum, with a little noise.
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        let best = attractors[0];
        let bd = Infinity;
        for (let j = 0; j < attractors.length; j++) {
          const dx = attractors[j].x - p.x;
          const dy = attractors[j].y - p.y;
          const d = dx * dx + dy * dy;
          if (d < bd) {
            bd = d;
            best = attractors[j];
          }
        }
        const dx = best.x - p.x;
        const dy = best.y - p.y;
        const dist = Math.sqrt(bd) || 1;
        p.vx += (dx / dist) * 0.045 + (Math.random() - 0.5) * 0.07;
        p.vy += (dy / dist) * 0.045 + (Math.random() - 0.5) * 0.07;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 0;
        else if (p.x > w) p.x = w;
        if (p.y < 0) p.y = 0;
        else if (p.y > h) p.y = h;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // Candidate solutions.
      ctx.fillStyle = "rgba(" + ACCENT + ",0.5)";
      for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        ctx.arc(points[i].x, points[i].y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Optima — the only place the accent appears.
      for (let i = 0; i < attractors.length; i++) {
        const a = attractors[i];
        ctx.fillStyle = "rgba(" + ACCENT + ",0.45)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(" + ACCENT + ",0.13)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 11, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function loop() {
      step();
      draw();
      raf = requestAnimationFrame(loop);
    }

    function play() {
      if (raf === null && onScreen && !document.hidden) {
        raf = requestAnimationFrame(loop);
      }
    }
    function pause() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    resize();
    seed();

    if (REDUCE) {
      // Settle to a calm static frame, no animation loop.
      for (let i = 0; i < 220; i++) step();
      draw();
      return;
    }

    let resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        seed();
      }, 200);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
      else play();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) play();
        else pause();
      }).observe(canvas);
    }

    play();
  })();

  /* ---------- 3. Scroll reveal ---------- */
  (function reveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (REDUCE || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (el) {
      io.observe(el);
    });
  })();

  /* ---------- 4. Animated counters ---------- */
  (function counters() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;

    function run(el) {
      const target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (REDUCE) {
        el.textContent = String(target);
        return;
      }
      const dur = 1100;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        el.textContent = String(Math.round(eased * target));
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = String(target);
      }
      requestAnimationFrame(tick);
    }

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    nums.forEach(function (el) {
      io.observe(el);
    });
  })();
})();
