/* HELIX site interactions — dependency-free, restrained, accessible.
   Sections:
   1. Preloader (once per session, CSS-driven fallback)
   2. Scroll reveal
   3. Animated counters
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

  /* ---------- 2. Scroll reveal ---------- */
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

  /* ---------- 3. Animated counters ---------- */
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
