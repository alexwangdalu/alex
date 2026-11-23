/* fig-hero: the opening picture ("hero") and the page-wide critical-line ornament ("rail").
   hero — walk up the critical line; every time the output curve zeta(1/2 + it) passes through the origin, that is a zero.
   rail — a thin vertical line at the left page edge whose marker follows scroll progress past the first 29 zeros. */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;

  /* ---------- small colour helpers (inputs are always theme tokens, never literals) ---------- */
  function rgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  /* opaque blend of two [r,g,b] triples: k = 0 -> a, k = 1 -> b */
  function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function css3(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  /* =====================================================================================
     hero
     ===================================================================================== */
  kit.mount('hero', function (body, kit) {
    var T_MAX = 60, STEP = 0.01, REST_T = 30.6, SPEED = 2.4;
    var HOLD = 1.5, FADE_OUT = 0.6, FADE_IN = 0.5, RING = 0.6;
    var Z = D.zeros;

    kit.css([
      '.hero-bar{display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem 1rem;min-width:0}',
      '.hero-btn{min-height:2rem;padding:0.2rem 0.85rem 0.2rem 0.7rem;gap:0.45rem;flex:none}',
      '.hero-btn::before{content:"";flex:none;box-sizing:border-box;width:9px;height:10px;border-style:solid;border-color:transparent transparent transparent currentColor;border-width:5px 0 5px 9px}',
      '.hero-btn[data-on="1"]::before{border-style:double;border-color:currentColor;border-width:0 0 0 9px}',
      '.hero-ro{display:flex;flex-wrap:wrap;gap:0 1.6em;flex:1 1 12rem;min-width:0}',
      '.hero-ro span{white-space:nowrap}'
    ].join('\n'));

    var L = kit.layout(body);
    L.controls.remove(); L.legend.remove(); L.note.remove();
    var bar = kit.el('div', 'hero-bar');
    body.appendChild(bar);

    /* ---------- the curve: zeta(1/2 + it) on a fine grid, once ---------- */
    var N = Math.round(T_MAX / STEP);
    var zr = new Float64Array(N + 1), zi = new Float64Array(N + 1);
    var B = { r0: Infinity, r1: -Infinity, i0: Infinity, i1: -Infinity };
    (function () {
      var o = [0, 0];
      for (var i = 0; i <= N; i++) {
        M.zeta(0.5, i * STEP, o);
        zr[i] = o[0]; zi[i] = o[1];
        if (o[0] < B.r0) B.r0 = o[0];
        if (o[0] > B.r1) B.r1 = o[0];
        if (o[1] < B.i0) B.i0 = o[1];
        if (o[1] > B.i1) B.i1 = o[1];
      }
    })();

    /* ---------- state ---------- */
    var t = REST_T;            // current height on the critical line
    var playing = false;
    var phase = 'run';         // run -> hold -> out -> in -> run
    var timer = 0;
    var dyn = 1;               // opacity of everything that depends on t (used for the restart fade)
    var view0 = 0;             // t at the bottom of the left window
    var easing = false;        // window is gliding back to the follow rule after a scrub
    var rings = [];            // [{i: zero index, age: seconds}]
    var scrub = { active: false, resume: false, edge: 0, y: 0 };
    var head = [0, 0];
    var G = null;              // geometry of the last draw

    function passedCount(tt) { var n = 0; while (n < Z.length && Z[n] <= tt) n++; return n; }
    function nearestZero(tt) {
      var n = passedCount(tt);
      if (n === 0) return 0;
      if (n >= Z.length) return Z.length - 1;
      return (tt - Z[n - 1] <= Z[n] - tt) ? n - 1 : n;
    }

    /* ---------- geometry ---------- */
    function geom(w, h) {
      if (G && G.w === w && G.h === h) return G;
      var narrow = w < 520;
      var y0 = 30, y1 = h - 24, plotH = y1 - y0;
      var S = Math.max(30, Math.min(40, plotH / 7.5));     // t-units visible in the left window
      var labelCol = 26;                                   // t tick labels left of the strip
      var zlabW = narrow ? 0 : 46;                         // zero heights right of the strip (wide only)
      var gap = narrow ? 12 : 22;
      var pad = narrow ? 9 : 13;
      var ext = 27;                                        // the real axis runs on past the curve to carry its title
      var leftMin = Math.max(84, Math.round(w * (narrow ? 0.24 : 0.26)));
      var bw = B.r1 - B.r0, bh = B.i1 - B.i0;
      var sc = Math.min((w - leftMin - gap - 2 * pad - ext) / bw, (h - 2 * pad - 10) / bh);
      var planeW = bw * sc + 2 * pad + ext, planeH = bh * sc + 2 * pad;
      var leftBlock = w - planeW - gap;
      var bandW = clamp(leftBlock - labelCol - zlabW, 40, narrow ? 84 : 104);
      var total = labelCol + bandW + zlabW + gap + planeW;
      var x0 = Math.max(0, (w - total) / 2);
      var bx0 = Math.round(x0 + labelCol), bx1 = Math.round(bx0 + bandW);
      var px0 = bx1 + zlabW + gap, yc = (y0 + y1) / 2;
      var py0 = Math.max(4, yc - planeH / 2);
      G = {
        w: w, h: h, narrow: narrow, y0: y0, y1: y1, plotH: plotH, S: S, tBase: -0.06 * S,
        x0: x0, bx0: bx0, bx1: bx1, cx: Math.round((bx0 + bx1) / 2), zlab: zlabW > 0,
        hitX: bx1 + zlabW + gap / 2,
        px0: px0, px1: px0 + planeW, py0: py0, py1: py0 + planeH, sc: sc, pad: pad,
        ox: px0 + pad - B.r0 * sc, oy: py0 + pad + B.i1 * sc
      };
      return G;
    }
    function follow(tt, g) { return clamp(tt - 0.7 * g.S, g.tBase, T_MAX - 0.7 * g.S); }
    function ty(tt, g) { return g.y1 - (tt - view0) / g.S * g.plotH; }

    /* mixed upright / italic maths label; y is the alphabetic baseline */
    function rich(ctx, parts, x, y, align, color, halo) {
      var i, tw = 0, ws = [];
      for (i = 0; i < parts.length; i++) { ctx.font = parts[i][1]; ws[i] = ctx.measureText(parts[i][0]).width; tw += ws[i]; }
      var px = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      for (i = 0; i < parts.length; i++) {
        ctx.font = parts[i][1];
        if (halo) { ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = halo; ctx.strokeText(parts[i][0], px, y); }
        ctx.fillStyle = color;
        ctx.fillText(parts[i][0], px, y);
        px += ws[i];
      }
      return tw;
    }
    /* the "you are here" marker, identical in both panels */
    function cursor(ctx, C, x, y) {
      ctx.beginPath(); ctx.arc(x, y, 9.5, 0, 6.2832);
      ctx.strokeStyle = kit.alpha(C.zero, 0.45); ctx.lineWidth = 1.5; ctx.stroke();
      kit.dot(ctx, x, y, 5, C.zero, C.bg);
    }

    /* ---------- drawing ---------- */
    function draw(ctx, w, h) {
      var C = kit.colors(), g = geom(w, h), i, y, x;
      if (!scrub.active && !easing) view0 = follow(t, g);
      var nPassed = passedCount(t);
      var up = kit.serif(13.5), it = kit.serif(14, 400, true);

      /* ===== left: the critical strip ===== */
      ctx.save();
      ctx.beginPath(); ctx.rect(0, g.y0 - 7, g.px0 - 4, g.plotH + 14); ctx.clip();
      // strip 0 < Re(s) < 1
      ctx.fillStyle = C.surface2;
      ctx.fillRect(g.bx0, g.y0 - 7, g.bx1 - g.bx0, g.plotH + 14);
      // imaginary axis = left edge of the strip, with t ticks
      ctx.lineWidth = 1; ctx.strokeStyle = C.axis;
      ctx.beginPath(); ctx.moveTo(g.bx0 + 0.5, g.y0 - 7); ctx.lineTo(g.bx0 + 0.5, g.y1 + 7); ctx.stroke();
      ctx.globalAlpha = dyn;
      var y00 = ty(0, g);
      if (y00 < g.y1 + 8) { // the real axis t = 0
        ctx.beginPath(); ctx.moveTo(g.bx0, Math.round(y00) + 0.5); ctx.lineTo(g.bx1, Math.round(y00) + 0.5); ctx.stroke();
      }
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var tk0 = Math.max(0, Math.ceil((view0 - 2) / 10) * 10);
      for (var tk = tk0; tk <= view0 + g.S + 2; tk += 10) {
        y = Math.round(ty(tk, g)) + 0.5;
        ctx.beginPath(); ctx.moveTo(g.bx0 - 4, y); ctx.lineTo(g.bx0, y); ctx.stroke();
        ctx.fillText(String(tk), g.bx0 - 8, y);
      }
      ctx.globalAlpha = 1;
      // the critical line
      ctx.strokeStyle = C.zero; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(g.cx, g.y0 - 7); ctx.lineTo(g.cx, g.y1 + 7); ctx.stroke();
      // zeros: hollow until reached, filled once passed
      ctx.globalAlpha = dyn;
      for (i = 0; i < Z.length; i++) {
        if (Z[i] < view0 - 2) continue;
        if (Z[i] > view0 + g.S + 2) break;
        y = ty(Z[i], g);
        if (i < nPassed) {
          kit.dot(ctx, g.cx, y, 4, C.zero, C.bg);
          if (g.zlab) {
            ctx.globalAlpha = dyn * clamp(0.35 + (t - Z[i]) / 0.15, 0, 1);
            ctx.font = kit.mono(11); ctx.fillStyle = C.ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(Z[i].toFixed(2), g.bx1 + 8, y + 0.5);
            ctx.globalAlpha = dyn;
          }
        } else {
          kit.dot(ctx, g.cx, y, 4, C.bg, C.bg);
          ctx.beginPath(); ctx.arc(g.cx, y, 3.25, 0, 6.2832);
          ctx.strokeStyle = C.zero; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // soft ends: the strip runs on above and below the window
      var fadeH = 22, gr;
      gr = ctx.createLinearGradient(0, g.y0 - 7, 0, g.y0 - 7 + fadeH);
      gr.addColorStop(0, kit.alpha(C.bg, 1)); gr.addColorStop(1, kit.alpha(C.bg, 0));
      ctx.fillStyle = gr; ctx.fillRect(0, g.y0 - 8, g.px0, fadeH + 1);
      gr = ctx.createLinearGradient(0, g.y1 + 7 - fadeH, 0, g.y1 + 7);
      gr.addColorStop(0, kit.alpha(C.bg, 0)); gr.addColorStop(1, kit.alpha(C.bg, 1));
      ctx.fillStyle = gr; ctx.fillRect(0, g.y1 + 7 - fadeH, g.px0, fadeH + 1);
      ctx.restore();

      // fixed labels of the strip
      rich(ctx, [['Re(', up], ['s', it], [') = ½', up]], g.cx, 16, 'center', C.ink2);
      rich(ctx, [['t', kit.serif(15, 400, true)]], g.bx0 - 8, 16, 'right', C.ink2);
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('0', g.bx0, g.y1 + 14); ctx.fillText('½', g.cx, g.y1 + 14); ctx.fillText('1', g.bx1, g.y1 + 14);

      /* ===== right: the plane of zeta(1/2 + it) ===== */
      var ox = g.ox, oy = g.oy, sc = g.sc;
      var oxr = Math.round(ox) + 0.5, oyr = Math.round(oy) + 0.5;
      ctx.lineWidth = 1; ctx.strokeStyle = C.axis;
      ctx.beginPath();
      ctx.moveTo(g.px0, oyr); ctx.lineTo(g.px1, oyr);
      ctx.moveTo(oxr, g.py0); ctx.lineTo(oxr, g.py1);
      var u;
      for (u = Math.ceil(B.r0); u <= Math.floor(B.r1); u++) { if (!u) continue; x = Math.round(ox + u * sc) + 0.5; ctx.moveTo(x, oyr - 3); ctx.lineTo(x, oyr + 3); }
      for (u = Math.ceil(B.i0); u <= Math.floor(B.i1); u++) { if (!u) continue; y = Math.round(oy - u * sc) + 0.5; ctx.moveTo(oxr - 3, y); ctx.lineTo(oxr + 3, y); }
      ctx.stroke();
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3;
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('实部', g.px1, oyr - 5);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('虚部', oxr + 7, g.py0);
      rich(ctx, [['−1', kit.serif(13)]], ox - sc, oyr + 17, 'center', C.ink3);   // one labelled tick sets the unit

      // the trail, oldest first; older parts recede towards the ground
      M.zeta(0.5, t, head);
      var hx = ox + head[0] * sc, hy = oy - head[1] * sc;
      var n = Math.min(N, Math.floor(t / STEP + 1e-9));
      var cBg = rgb(C.bg) || [128, 128, 128], cInk = rgb(C.ink) || cBg, cOld = lerp3(rgb(C.ink3) || cInk, cBg, 0.5);
      var faint = css3(cOld), RUN = 16, a, b, k, j, lastK = -1;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (dyn > 0.01) {
        for (a = 0; a <= n; a += RUN) {
          b = Math.min(a + RUN, n);
          k = Math.round(smooth(2.5, 22, t - (a + b) * 0.5 * STEP) * 24) / 24;
          if (k !== lastK) {
            lastK = k;
            ctx.strokeStyle = css3(lerp3(lerp3(cInk, cOld, k), cBg, 1 - dyn));
            ctx.lineWidth = 2 - 0.5 * k;
          }
          ctx.beginPath();
          ctx.moveTo(ox + zr[a] * sc, oy - zi[a] * sc);
          for (j = a + 1; j <= b; j++) ctx.lineTo(ox + zr[j] * sc, oy - zi[j] * sc);
          if (b === n) ctx.lineTo(hx, hy);
          ctx.stroke();
        }
        // where the walk starts: zeta(1/2)
        ctx.globalAlpha = dyn;
        ctx.beginPath(); ctx.arc(ox + zr[0] * sc, oy, 2.5, 0, 6.2832); ctx.fillStyle = faint; ctx.fill();
        rich(ctx, [['t', it], [' = 0', up]], ox + zr[0] * sc - 2, oyr - 9, 'left', C.ink3);
        ctx.globalAlpha = 1;
      }

      // the origin
      kit.dot(ctx, ox, oy, 3.5, C.bg, C.bg);
      ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 6.2832); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
      kit.label(ctx, '0', ox - 8, oy + 12, { font: kit.serif(14), align: 'right', color: C.ink, halo: C.bg });

      // rings: one from the origin and one from the matching dot each time a zero is passed
      for (i = 0; i < rings.length; i++) {
        var p = rings[i].age / RING, e = 1 - (1 - p) * (1 - p);
        ctx.strokeStyle = kit.alpha(C.zero, 0.95 * (1 - p)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(ox, oy, 5 + 26 * e, 0, 6.2832); ctx.stroke();
        y = ty(Z[rings[i].i], g);
        if (y > g.y0 && y < g.y1) { ctx.beginPath(); ctx.arc(g.cx, y, 5 + 11 * e, 0, 6.2832); ctx.stroke(); }
      }

      // the moving point s and its image zeta(s)
      ctx.globalAlpha = dyn;
      y = ty(t, g);
      cursor(ctx, C, g.cx, y);
      rich(ctx, [['s', kit.serif(15, 400, true)]], g.cx + 15, y + 4.5, 'left', C.ink, C.surface2);
      cursor(ctx, C, hx, hy);
      var dx = head[0], dy = -head[1], dl = Math.sqrt(dx * dx + dy * dy);
      if (dl < 0.05) { dx = 0.7; dy = -0.7; } else { dx /= dl; dy /= dl; }
      var lx = clamp(hx + dx * 26, g.px0 + 18, g.px1 - 18), ly = clamp(hy + dy * 22, g.py0 + 12, g.py1 - 8);
      rich(ctx, [['ζ', kit.serif(15, 400, true)], ['(', up], ['s', it], [')', up]], lx, ly + 4.5, 'center', C.ink, C.bg);
      ctx.globalAlpha = 1;
    }
    var cv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? w * 0.92 : Math.min(460, w * 0.62); },
      label: '左边是临界带，中间的竖线是临界线 Re(s) = ½，线上的圆点是 ζ 函数的零点，一个点 s 沿着直线向上移动；右边是 ζ(s) 的值在复平面上画出的曲线，它每穿过原点一次，对应左边的一个零点。',
      draw: draw
    });

    /* ---------- read-out + button ---------- */
    var btn = kit.button(bar, { id: 'hero-play', label: '播放', kind: 'quiet', onClick: function () { setPlaying(!playing, true); } });
    btn.className += ' hero-btn';
    var ro = kit.readout(bar, 'hero-ro');
    var roT = kit.el('span'), roN = kit.el('span'), roZ = kit.el('span');
    ro.appendChild(roT); ro.appendChild(roN); ro.appendChild(roZ);
    function put(el, s) { if (el.textContent !== s) el.textContent = s; }
    function readout() {
      put(roT, 't = ' + t.toFixed(3));
      put(roN, '已穿过原点 ' + passedCount(t) + ' 次');
      put(roZ, '最近的零点 t = ' + Z[nearestZero(t)].toFixed(6));
    }
    readout();

    /* ---------- time ---------- */
    function setT(nt) {
      var a = Math.min(t, nt), b = Math.max(t, nt), hits = [], i;
      for (i = 0; i < Z.length && Z[i] <= b; i++) if (Z[i] > a) hits.push(i);
      t = nt;
      if (hits.length && hits.length <= 2 && (playing || !kit.reduced())) {
        for (i = 0; i < hits.length; i++) rings.push({ i: hits[i], age: 0 });
      }
      readout();
    }
    function resetPhase() { phase = 'run'; timer = 0; dyn = 1; }

    var loop = kit.loop(cv.el, function (dt) {
      var g = G, busy = false, i;
      if (playing) {
        busy = true;
        if (phase === 'run' || phase === 'in') {
          if (phase === 'in') { timer -= dt; dyn = clamp(1 - timer / FADE_IN, 0, 1); if (timer <= 0) { phase = 'run'; dyn = 1; } }
          var nt = t + SPEED * dt;
          if (nt >= T_MAX) { nt = T_MAX; phase = 'hold'; timer = HOLD; dyn = 1; }
          setT(nt);
        } else if (phase === 'hold') {
          timer -= dt;
          if (timer <= 0) { phase = 'out'; timer = FADE_OUT; }
        } else if (phase === 'out') {
          timer -= dt; dyn = clamp(timer / FADE_OUT, 0, 1);
          if (timer <= 0) { rings.length = 0; t = 0; readout(); phase = 'in'; timer = FADE_IN; dyn = 0; easing = false; }
        }
      }
      if (scrub.active && scrub.edge && g) {
        var v0 = clamp(view0 + scrub.edge * 14 * dt, g.tBase, T_MAX - 0.7 * g.S);
        if (v0 !== view0) { view0 = v0; scrubAt(scrub.y); busy = true; }
      }
      if (easing && g) {
        var target = follow(t, g), d = target - view0, stepMax = dt * Math.max(8, Math.abs(d) * 7);
        if (Math.abs(d) <= stepMax) { view0 = target; easing = false; } else { view0 += d > 0 ? stepMax : -stepMax; busy = true; }
      }
      for (i = rings.length - 1; i >= 0; i--) { rings[i].age += dt; if (rings[i].age >= RING) rings.splice(i, 1); }
      if (rings.length) busy = true;
      cv.redraw();
      if (!busy) loop.stop();
    });
    function kick() { if (loop.running) return; cv.redraw(); if (playing || rings.length || easing || (scrub.active && scrub.edge)) loop.start(); }

    function setPlaying(on, byUser) {
      playing = on;
      btn.textContent = on ? '暂停' : '播放';
      btn.setAttribute('data-on', on ? '1' : '0');
      if (on) {
        if (scrub.active) { scrub.active = false; scrub.edge = 0; }
        if (G && Math.abs(view0 - follow(t, G)) > 1e-6) easing = true;
        if (phase === 'run' && t >= T_MAX) { phase = 'hold'; timer = byUser ? 0.4 : HOLD; }
      } else if (phase !== 'run') {
        if (phase === 'out') { rings.length = 0; t = T_MAX; readout(); }
        resetPhase();
      }
      kick();
    }

    /* ---------- scrubbing on the left panel ---------- */
    function scrubAt(y) {
      var g = G; if (!g) return;
      var tt = clamp(view0 + (g.y1 - y) / g.plotH * g.S, 0, T_MAX);
      var k = nearestZero(tt);
      if (Z[k] <= T_MAX && Math.abs(ty(Z[k], g) - y) <= 4.5) tt = Z[k];   // zeros are magnetic
      setT(tt);
    }
    function scrubStart(pin) {
      if (!scrub.active) {
        scrub.active = true;
        scrub.resume = playing;
        if (playing) setPlaying(false);
        else if (phase !== 'run') resetPhase();
        easing = false;
        scrub.active = true;
      }
      if (pin) scrub.resume = false;
    }
    function scrubEnd() {
      if (!scrub.active) return;
      scrub.active = false; scrub.edge = 0;
      cv.el.style.cursor = '';
      if (scrub.resume) setPlaying(true); else { easing = !kit.reduced(); kick(); }
    }
    var dragging = false, tap = null;
    kit.pointer(cv.el, {
      down: function (x, y, ev) {
        if (!G || x > G.hitX) return;
        if (ev.pointerType === 'touch') { tap = { x: x, y: y }; return; }   // decided on release: a swipe scrolls the page
        dragging = true;
        scrubStart(true);
      },
      move: function (x, y, ev) {
        if (!G || ev.pointerType === 'touch') return;
        var inside = x <= G.hitX && x >= 0 && y >= 0 && y <= G.h;
        if (!dragging && !inside) { scrubEnd(); return; }
        scrubStart(false);
        cv.el.style.cursor = 'ns-resize';
        scrub.y = clamp(y, G.y0, G.y1);
        var zone = G.plotH * 0.1;
        scrub.edge = y < G.y0 + zone ? 1 : y > G.y1 - zone ? -1 : 0;
        scrubAt(scrub.y);
        kick();
      },
      up: function (ev) {
        dragging = false;
        if (tap && ev && ev.type === 'pointerup' && G) {
          scrubStart(true);
          scrubAt(clamp(tap.y, G.y0, G.y1));
          scrubEnd();
        }
        tap = null;
      },
      leave: function () { if (!dragging) scrubEnd(); }
    });

    setPlaying(!kit.reduced());
  });

  /* =====================================================================================
     rail
     ===================================================================================== */
  kit.mount('rail', function (rail, kit) {
    var T_TOP = 100;
    var zs = [];
    for (var i = 0; i < D.zeros.length && D.zeros[i] < T_TOP; i++) zs.push(D.zeros[i]);

    kit.css([
      '.rail-track{position:absolute;left:14px;top:12vh;height:76vh;width:0}',
      '.rail-line{position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--zero);opacity:0.4}',
      '.rail-tick{position:absolute;left:0;width:7px;height:1px;margin-top:-0.5px;background:var(--zero);opacity:0.4;transition:opacity 0.25s,width 0.25s}',
      '.rail-tick[data-on="1"]{opacity:1;width:10px}',
      '.rail-mark{position:absolute;left:0;top:0;width:0;height:0;will-change:transform}',
      '.rail-dot{position:absolute;left:-4px;top:-4.5px;width:9px;height:9px;border-radius:50%;background:var(--zero);box-shadow:0 0 0 2px var(--bg)}',
      '.rail-lab{position:absolute;left:17px;top:-0.8em;line-height:1.6;font-family:var(--font-data);font-size:11px;font-variant-numeric:tabular-nums;color:var(--ink-3);white-space:nowrap}',
      '@media (prefers-reduced-motion: reduce){.rail-tick{transition:none}}'
    ].join('\n'));

    var track = kit.el('div', 'rail-track');
    track.appendChild(kit.el('div', 'rail-line'));
    var ticks = zs.map(function (g) {
      var k = kit.el('i', 'rail-tick');
      k.style.top = (g / T_TOP * 100).toFixed(3) + '%';
      track.appendChild(k);
      return k;
    });
    var mark = kit.el('div', 'rail-mark');
    mark.appendChild(kit.el('i', 'rail-dot'));
    var lab = kit.el('span', 'rail-lab', 't = 0.0');
    mark.appendChild(lab);
    track.appendChild(mark);
    rail.appendChild(track);

    var wide = window.matchMedia ? window.matchMedia('(min-width: 86rem)') : { matches: true };
    var queued = false, on = 0, lastText = '';
    function update() {
      queued = false;
      if (!wide.matches) return;
      var de = document.documentElement;
      var max = Math.max(1, de.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, (window.pageYOffset || de.scrollTop || 0) / max));
      var t = p * T_TOP;
      mark.style.transform = 'translate3d(0,' + (p * 76).toFixed(3) + 'vh,0)';
      var s = 't = ' + t.toFixed(1);
      if (s !== lastText) { lab.textContent = s; lastText = s; }
      var n = 0;
      while (n < zs.length && zs[n] <= t) n++;
      while (on < n) ticks[on++].setAttribute('data-on', '1');
      while (on > n) ticks[--on].setAttribute('data-on', '0');
    }
    function request() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    if (wide.addEventListener) wide.addEventListener('change', request);
    else if (wide.addListener) wide.addListener(request);
    update();
  });
})();
