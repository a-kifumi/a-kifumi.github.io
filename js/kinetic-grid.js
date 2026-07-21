/**
 * Kinetic Grid — vanilla JS port
 * Reactive dot grid pulled toward the cursor with a trailing line.
 */
(function () {
  "use strict";

  var CONFIG = {
    background: "#0f1115",
    dotColor: "#ffffff",
    lineColor: "#80acff",
    trailColor: "#2664eb",
    spacing: 30,
    radius: 400,
    strength: 4,
    trail: true,
  };

  function init() {
    var host = document.getElementById("kinetic-grid");
    if (!host) return;

    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var GAP = Math.max(8, CONFIG.spacing);
    var R = Math.max(1, CONFIG.radius);
    var PULL = (Math.max(1, Math.min(10, CONFIG.strength)) / 10) * 4;

    var W = 1, H = 1;
    var cols = [], dots = [];
    var mouse = { x: -9999, y: -9999, active: false };
    var trailArr = [];

    function build(mw, mh) {
      W = Math.max(1, Math.floor(mw || window.innerWidth));
      H = Math.max(1, Math.floor(mh || window.innerHeight));
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = [];
      dots = [];
      var nCols = Math.floor(W / GAP) + 2;
      var nRows = Math.floor(H / GAP) + 2;
      for (var c = 0; c < nCols; c++) {
        var col = [];
        for (var r = 0; r < nRows; r++) {
          var hx = c * GAP;
          var hy = r * GAP;
          var d = { hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0 };
          col.push(d);
          dots.push(d);
        }
        cols.push(col);
      }
    }

    build();

    var ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(function (entries) {
          var cr = entries[0] && entries[0].contentRect;
          build(cr ? cr.width : undefined, cr ? cr.height : undefined);
        })
      : null;
    if (ro) ro.observe(host);

    function setMouse(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      var mx = clientX - r.left;
      var my = clientY - r.top;
      mouse.x = mx;
      mouse.y = my;
      mouse.active = true;
      var now = performance.now();
      trailArr.push({ x: mx, y: my, t: now });
      if (trailArr.length > 80) trailArr.shift();
    }

    function onMove(e) { setMouse(e.clientX, e.clientY); }
    function onLeave(e) {
      if (!e || !e.relatedTarget) {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
      }
    }
    function onTouch(e) {
      var t = e.touches[0];
      if (t) setMouse(t.clientX, t.clientY);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave);

    var raf = 0;
    function frame() {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var ax = (d.hx - d.x) * 0.08;
        var ay = (d.hy - d.y) * 0.08;
        if (mouse.active) {
          var dx = mouse.x - d.x;
          var dy = mouse.y - d.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R && dist > 0.001) {
            var f = (1 - dist / R) * PULL;
            ax += (dx / dist) * f;
            ay += (dy / dist) * f;
          }
        }
        d.vx = (d.vx + ax) * 0.82;
        d.vy = (d.vy + ay) * 0.82;
        d.x += d.vx;
        d.y += d.vy;
      }

      for (var c = 0; c < cols.length; c++) {
        for (var r = 0; r < cols[c].length; r++) {
          var dd = cols[c][r];
          var right = cols[c + 1] && cols[c + 1][r];
          var down = cols[c] && cols[c][r + 1];
          var prox = mouse.active
            ? Math.max(0, 1 - Math.sqrt((mouse.x - dd.x) * (mouse.x - dd.x) + (mouse.y - dd.y) * (mouse.y - dd.y)) / R)
            : 0;
          if (right) {
            ctx.globalAlpha = 0.06 + prox * 0.7;
            ctx.strokeStyle = CONFIG.lineColor;
            ctx.lineWidth = 0.5 + prox * 1.5;
            ctx.beginPath();
            ctx.moveTo(dd.x, dd.y);
            ctx.lineTo(right.x, right.y);
            ctx.stroke();
          }
          if (down) {
            ctx.globalAlpha = 0.06 + prox * 0.7;
            ctx.strokeStyle = CONFIG.lineColor;
            ctx.lineWidth = 0.5 + prox * 1.5;
            ctx.beginPath();
            ctx.moveTo(dd.x, dd.y);
            ctx.lineTo(down.x, down.y);
            ctx.stroke();
          }
        }
      }

      for (var j = 0; j < dots.length; j++) {
        var dt = dots[j];
        var px = mouse.active
          ? Math.max(0, 1 - Math.sqrt((mouse.x - dt.x) * (mouse.x - dt.x) + (mouse.y - dt.y) * (mouse.y - dt.y)) / R)
          : 0;
        ctx.globalAlpha = 0.22 + px * 0.78;
        ctx.fillStyle = CONFIG.dotColor;
        ctx.beginPath();
        ctx.arc(dt.x, dt.y, 0.8 + px * 2.2, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (CONFIG.trail) {
        var now = performance.now();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (var k = 1; k < trailArr.length; k++) {
          var a = trailArr[k - 1];
          var b = trailArr[k];
          var age = now - b.t;
          if (age > 260) continue;
          ctx.globalAlpha = Math.max(0, 1 - age / 260) * 0.85;
          ctx.strokeStyle = CONFIG.trailColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Cleanup on page unload
    window.addEventListener("pagehide", function () {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
