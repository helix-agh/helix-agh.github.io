/* HELIX site — dependency-free.
   1. Hero landscape animation (decorative; paused off-screen and under reduced motion)
   2. News: content is pre-rendered in index.html for crawlers; this only appends
      announcements listed in announcements/index.json that are not yet in the HTML. */
(function () {
  "use strict";
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Landscape field ---------- */
  (function field() {
    var cv = document.getElementById("field");
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1, raf = 0, visible = true, frame = 0;
    var css = getComputedStyle(document.documentElement);
    var ink, accent;
    function colors() { ink = css.getPropertyValue("--ink").trim() || "#161614"; accent = css.getPropertyValue("--accent").trim() || "#2f5bd3"; }
    function size() {
      var r = cv.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr;
    }
    colors(); size();
    window.addEventListener("resize", function () { size(); if (REDUCE) draw(0); });
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { colors(); if (REDUCE) draw(0); });

    var peaks = [[.22,.35,.11,1],[.62,.62,.15,.85],[.82,.28,.08,.7],[.42,.78,.09,.6],[.12,.8,.07,.5]];
    function f(x, y, t) {
      var v = 0;
      for (var i = 0; i < peaks.length; i++) {
        var p = peaks[i];
        var px = p[0] + .05 * Math.sin(t * .00012 * (i + 1) + i), py = p[1] + .05 * Math.cos(t * .0001 * (i + 2) + i * 2);
        var dx = x - px, dy = (y - py) * (H / W) * 1.6;
        v += p[3] * Math.exp(-(dx * dx + dy * dy) / (2 * p[2] * p[2]));
      }
      return Math.min(1, v + .05 * Math.sin(x * 40) * Math.sin(y * 30));
    }
    function gauss() { var u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var agents = [];
    for (var k = 0; k < 22; k++) agents.push({ x: Math.random(), y: Math.random(), s: .06, age: 0, trail: [] });

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var step = W < 600 ? 11 : 14;
      ctx.fillStyle = ink;
      for (var gy = step / 2; gy < H; gy += step) {
        for (var gx = step / 2; gx < W; gx += step) {
          var v = f(gx / W, gy / H, t);
          ctx.globalAlpha = .08 + .55 * v;
          ctx.beginPath(); ctx.arc(gx, gy, .5 + 1.9 * v, 0, 6.283); ctx.fill();
        }
      }
      if (!REDUCE && frame % 2 === 0) agents.forEach(function (a) {
        var cur = f(a.x, a.y, t), nx = a.x + gauss() * a.s, ny = a.y + gauss() * a.s;
        if (nx > 0 && nx < 1 && ny > 0 && ny < 1 && f(nx, ny, t) > cur) { a.x = nx; a.y = ny; a.s = Math.min(.12, a.s * 1.5); }
        else a.s *= .92;
        a.trail.push([a.x, a.y]); if (a.trail.length > 40) a.trail.shift();
        a.age++;
        if (a.s < .004 && a.age > 160 && Math.random() < .02) { a.x = Math.random(); a.y = Math.random(); a.s = .06; a.age = 0; a.trail = []; }
      });
      ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 1;
      agents.forEach(function (a) {
        if (a.trail.length > 1) {
          ctx.globalAlpha = .45; ctx.beginPath();
          a.trail.forEach(function (p, i) { i ? ctx.lineTo(p[0] * W, p[1] * H) : ctx.moveTo(p[0] * W, p[1] * H); });
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(a.x * W, a.y * H, 3, 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
      frame++;
    }
    function loop(t) { draw(t); if (visible && !document.hidden) raf = requestAnimationFrame(loop); }
    function start() { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }

    if (REDUCE) { draw(0); return; }
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
