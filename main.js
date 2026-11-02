/* HELIX site — dependency-free.
   1. Hero gradient-flow animation (decorative; paused off-screen and under reduced motion)
   2. News: content is pre-rendered in index.html for crawlers; this only appends
      announcements listed in announcements/index.json that are not yet in the HTML. */
(function () {
  "use strict";
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Gradient flow field ---------- */
  (function field() {
    var cv = document.getElementById("field");
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1, raf = 0, visible = true, ps = [];
    var css = getComputedStyle(document.documentElement);
    var ink, accent, panel;
    function colors() {
      ink = css.getPropertyValue("--ink").trim() || "#161614";
      accent = css.getPropertyValue("--accent").trim() || "#2f5bd3";
      panel = css.getPropertyValue("--panel").trim() || "#efede7";
    }

    /* Sum of Gaussian peaks in aspect-true coords: x in [0,1], y in [0,H/W]. */
    var peaks = [[.15,.3,.1,.8],[.4,.7,.12,.7],[.62,.35,.11,1],[.85,.68,.09,.8],[.9,.18,.07,.5],[.1,.85,.08,.5]];
    var home = peaks.map(function (p) { return p.slice(); });
    function f(x, y) {
      var v = 0, A = H / W;
      for (var i = 0; i < peaks.length; i++) {
        var p = peaks[i], dx = x - p[0], dy = y - p[1] * A;
        v += p[3] * Math.exp(-(dx * dx + dy * dy) / (2 * p[2] * p[2]));
      }
      return v;
    }
    function grad(x, y) { var h = 1e-4; return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)]; }

    function spawn(p) {
      p.x = Math.random(); p.y = Math.random() * H / W; p.age = 0;
      p.max = 120 + Math.random() * 200; p.a = Math.random() < .08;
      return p;
    }
    /* Move one particle uphill (with a slight swirl) and draw the segment. */
    function advance(p, alpha) {
      var g = grad(p.x, p.y), n = Math.hypot(g[0], g[1]) + 1e-9;
      var vx = g[0] / n, vy = g[1] / n, sp = Math.min(1.4, .3 + n * .05) / W;
      var nx = p.x + sp * (vx - .35 * vy), ny = p.y + sp * (vy + .35 * vx);
      ctx.strokeStyle = p.a ? accent : ink;
      ctx.globalAlpha = (p.a ? .7 : .28) * alpha * (p.a ? 1 : Math.sin(Math.PI * p.age / p.max));
      ctx.beginPath(); ctx.moveTo(p.x * W, p.y * W); ctx.lineTo(nx * W, ny * W); ctx.stroke();
      p.x = nx; p.y = ny; p.age++;
      return !(p.age > p.max || n < .05);
    }
    function clear() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.fillStyle = panel; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.lineCap = "round";
    }
    function seed() {
      ps = [];
      var n = W < 600 ? 260 : 650;
      for (var i = 0; i < n; i++) { var p = spawn({}); p.age = Math.random() * p.max; ps.push(p); }
    }
    /* Reduced motion: one static frame of full streamlines. */
    function still() {
      clear();
      var n = W < 600 ? 160 : 380;
      for (var i = 0; i < n; i++) { var p = spawn({}); while (advance(p, .55)); }
      ctx.globalAlpha = 1;
    }
    function size() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
      if (!W || !H) return;
      if (REDUCE) still(); else { clear(); seed(); }
    }
    colors(); size();
    window.addEventListener("resize", size);
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { colors(); size(); });

    function draw(t) {
      for (var i = 0; i < peaks.length; i++) {
        peaks[i][0] = home[i][0] + .04 * Math.sin(t * .00011 * (i + 1) + i);
        peaks[i][1] = home[i][1] + .04 * Math.cos(t * .00009 * (i + 2) + i);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = .07; ctx.fillStyle = panel; ctx.fillRect(0, 0, W, H);
      for (var k = 0; k < ps.length; k++) if (!advance(ps[k], 1)) spawn(ps[k]);
      ctx.globalAlpha = 1;
    }
    function loop(t) { draw(t); if (visible && !document.hidden) raf = requestAnimationFrame(loop); }
    function start() { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

    if (REDUCE) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(cv);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden && visible) start(); });
    start();
  })();

  /* ---------- 2. News enhancement ---------- */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function mdToHtml(md) {
    var codes = [];
    md = md.replace(/```[\w-]*\n([\s\S]*?)```/g, function (_, c) { codes.push("<pre><code>" + esc(c.replace(/\n$/, "")) + "</code></pre>"); return "@@CB" + (codes.length - 1) + "@@"; });
    function inline(t) {
      return esc(t)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    return md.split(/\n{2,}/).map(function (b) {
      b = b.trim();
      if (!b) return "";
      if (/^@@CB\d+@@$/.test(b)) return codes[+b.replace(/[^\d]/g, "")];
      return "<p>" + inline(b).replace(/\n/g, " ") + "</p>";
    }).join("").replace(/@@CB(\d+)@@/g, function (_, i) { return codes[+i]; });
  }
  (function news() {
    var list = document.getElementById("news-list");
    if (!list || !window.fetch) return;
    fetch("announcements/index.json").then(function (r) { return r.json(); }).then(function (posts) {
      var have = {};
      list.querySelectorAll("[data-file]").forEach(function (el) { have[el.getAttribute("data-file")] = 1; });
      var fresh = posts.filter(function (p) { return !have[p.file]; });
      return Promise.all(fresh.map(function (p) {
        return fetch("announcements/" + p.file).then(function (r) { return r.text(); }).then(function (md) { return { p: p, md: md }; });
      }));
    }).then(function (items) {
      (items || []).reverse().forEach(function (it) {
        var li = document.createElement("li");
        li.className = "row";
        li.setAttribute("data-file", it.p.file);
        li.innerHTML = '<time class="row-date" datetime="' + esc(it.p.date) + '">' + esc(it.p.date) + "</time>" +
          '<article class="news-body"><h3 class="row-title">' + esc(it.p.title) + "</h3>" + mdToHtml(it.md) + "</article>";
        list.insertBefore(li, list.firstChild);
      });
    }).catch(function () {});
  })();
})();
