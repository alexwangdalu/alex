/* fig-stairs.js
   "stairs": the prime staircase pi(x) against the smooth laws Li(x) and x/ln x, zoomable from 30 to 10^7.
   "euler":  the sum over all integers and the product over primes only, both closing in on pi^2/6 (s = 2). */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth01(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function dec(v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var NB = ' ', GAP = '　　';

  kit.css(
    '.stairs-x .ctl-val{min-width:6.4em}' +
    '#stairs-zoom{min-width:6.4em;justify-content:center}'
  );

  /* ================================================================== stairs */
  kit.mount('stairs', function (body, kit, figureEl) {
    var L = kit.layout(body);
    L.note.remove();
    var readout = kit.readout(body);

    /* ---- primes: up to 1e5 right now, up to 1e7 in background slices ---- */
    var LIMIT = 1e7, V_MIN = 1.48, V_MAX = 7, V_START = Math.log10(30);
    var first = M.sieve(100000);
    var P = new Uint32Array(Math.ceil(1.26 * LIMIT / Math.log(LIMIT)));
    P.set(first);
    var nP = first.length, avail = 100000, view = P.subarray(0, nP);
    function count(x) { return M.primeCount(view, x); }

    var SEG = 1000000, flags = null;
    function sieveMore() {
      var lo = avail + 1;
      if (lo > LIMIT) return;
      var hi = Math.min(LIMIT, lo + SEG - 1), len = hi - lo + 1, i, j, p;
      if (!flags) flags = new Uint8Array(SEG); else flags.fill(0);
      for (i = 0; i < first.length; i++) {
        p = first[i];
        if (p * p > hi) break;
        j = Math.max(p * p, Math.ceil(lo / p) * p) - lo;
        for (; j < len; j += p) flags[j] = 1;
      }
      for (i = 0; i < len; i++) if (!flags[i]) P[nP++] = lo + i;
      var was = avail;
      avail = hi; view = P.subarray(0, nP);
      if (hi < LIMIT) setTimeout(sieveMore, 0); else flags = null;
      if (wanted() > was) sync();
    }
    kit.whenNear(figureEl, function () { setTimeout(sieveMore, 0); });

    /* ---- state ---- */
    var st = { X: 100, shown: 100, anim: false, blend: 0, hover: null };
    function roundSig3(x) {
      if (x < 1000) return Math.round(x);
      var m = Math.pow(10, Math.floor(Math.log10(x) + 1e-9) - 2);
      return Math.round(x / m) * m;
    }
    function xOfV(v) { return Math.min(roundSig3(Math.pow(10, v)), avail); }
    function wanted() { return st.anim ? Math.pow(10, st.v) : roundSig3(Math.pow(10, slider.get())); }

    /* ---- controls ---- */
    var slider = kit.slider(L.controls, {
      id: 'stairs-x', label: '数到', min: V_MIN, max: V_MAX, step: 0.01, value: 2,
      format: function (v) { return kit.fmt.int(st.anim ? st.shown : xOfV(v)); }
    });
    slider.el.classList.add('stairs-x');
    var btn = kit.button(L.controls, { id: 'stairs-zoom', label: '自动拉远', kind: 'primary', onClick: function () { if (st.anim) stopAnim(); else startAnim(); } });

    /* ---- axis ticks: 1-2-5 steps; while zooming, the outgoing and incoming tick sets cross-fade ---- */
    function niceUp(raw) {
      if (raw <= 1) return 1;
      var b = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / b;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * b;
    }
    function nextNice(s) {
      var b = Math.pow(10, Math.floor(Math.log10(s) + 1e-9)), m = Math.round(s / b);
      return (m === 1 ? 2 : m === 2 ? 5 : 10) * b;
    }
    function tickText(v, step) {
      if (v === 0) return '0';
      return step >= 1e4 ? kit.fmt.int(v / 1e4) + ' 万' : kit.fmt.int(v);
    }
    function isMult(v, s) { return Math.abs(v / s - Math.round(v / s)) < 1e-9; }
    /* -> [{v, a, text}] for an axis [0, max] that is len px long */
    function axisTicks(max, len, minSp, blend, skipZero) {
      var raw = max * minSp / len, s = niceUp(raw), s2 = nextNice(s), out = [], i, n, v, ta, tb;
      var b = blend > 0 ? blend * smooth01((raw / s - 0.8) / 0.2) : 0;
      if (b < 0.01) b = 0;
      n = Math.floor(max / s + 1e-9);
      for (i = skipZero ? 1 : 0; i <= n; i++) {
        v = i * s; ta = tickText(v, s);
        if (b && isMult(v, s2)) {
          tb = tickText(v, s2);
          if (ta === tb) out.push({ v: v, a: 1, text: ta });
          else { out.push({ v: v, a: 1 - b, text: ta }); out.push({ v: v, a: b, text: tb }); }
        } else out.push({ v: v, a: 1 - b, text: ta });
      }
      if (b) {
        n = Math.floor(max / s2 + 1e-9);
        for (i = 1; i <= n; i++) { v = i * s2; if (!isMult(v, s)) out.push({ v: v, a: b, text: tickText(v, s2) }); }
      }
      return out;
    }
    /* draw tick groups through kit.frame, one call per alpha level */
    function framed(ctx, rect, axis, ticks, scale) {
      var groups = {}, keys, k;
      ticks.forEach(function (t) { var key = t.a.toFixed(2); (groups[key] = groups[key] || []).push(t); });
      keys = Object.keys(groups);
      for (k = 0; k < keys.length; k++) {
        var arr = groups[keys[k]], map = {}, vals = [];
        if (+keys[k] <= 0) continue;
        arr.forEach(function (t) { map[t.v] = t.text; vals.push(t.v); });
        var fmt = (function (m) { return function (v) { return m[v]; }; })(map);
        ctx.globalAlpha = +keys[k];
        if (axis === 'y') kit.frame(ctx, rect, { ys: scale, yTicks: vals, yFmt: fmt, grid: 'y', baseline: false });
        else kit.frame(ctx, rect, { xs: scale, xTicks: vals, xFmt: fmt, grid: 'none', baseline: false });
      }
      ctx.globalAlpha = 1;
    }

    /* ---- geometry (cached per X and canvas size, so hovering only re-strokes) ---- */
    var EXACT_MAX = 3000, G = null;
    var F0 = Math.log10(400), F1 = Math.log10(2000);
    function stripFade(X) { return 1 - smooth01((Math.log10(X) - F0) / (F1 - F0)); }
    function geometry(w, h) {
      var X = st.X, key = X + '|' + w + '|' + h;
      if (G && G.key === key) return G;
      var mob = w < 520, g = { key: key, mob: mob, X: X, w: w, h: h }, i, xp;
      g.f = stripFade(X);
      g.stripH = 14 * g.f;
      g.x0 = mob ? 46 : 58; g.x1 = w - (mob ? 54 : 126);
      g.y0 = 30; g.y1 = h - 44 - g.stripH;
      var n = g.n = count(X);
      g.liX = M.Li(X); g.glX = X / Math.log(X);
      g.yMax = Math.max(n, g.liX) * 1.08;
      var xs = g.xs = kit.lin(0, X, g.x0, g.x1), ys = g.ys = kit.lin(0, g.yMax, g.y1, g.y0);
      /* the staircase: every prime is its own step while there are few enough, then one value per half pixel */
      var px = [g.x0], py = [g.y1];
      if (n <= EXACT_MAX) {
        for (i = 0; i < n; i++) { xp = xs(P[i]); px.push(xp, xp); py.push(ys(i), ys(i + 1)); }
        px.push(g.x1); py.push(ys(n));
      } else {
        var cols = Math.round((g.x1 - g.x0) * 2), prev = 0, c;
        for (i = 1; i <= cols; i++) {
          c = count(X * i / cols);
          if (c !== prev) { xp = g.x0 + (g.x1 - g.x0) * i / cols; px.push(xp, xp); py.push(ys(prev), ys(c)); prev = c; }
        }
        px.push(g.x1); py.push(ys(prev));
      }
      g.px = px; g.py = py;
      /* the smooth laws, sampled every 2 px from x = 2 */
      var m = Math.max(48, Math.ceil((g.x1 - g.x0) / 2));
      var lx = new Float64Array(m + 1), ly = new Float64Array(m + 1), gy = new Float64Array(m + 1), xv;
      for (i = 0; i <= m; i++) {
        xv = 2 + (X - 2) * i / m;
        lx[i] = xs(xv); ly[i] = ys(M.Li(xv)); gy[i] = ys(xv / Math.log(xv));
      }
      g.lx = lx; g.ly = ly; g.gy = gy;
      return (G = g);
    }

    /* keep end labels apart without changing their order (isotonic regression on y - i*gap) */
    function dodge(items, gap, lo, hi) {
      items.sort(function (a, b) { return a.y - b.y; });
      var blocks = [], i, k;
      for (i = 0; i < items.length; i++) {
        blocks.push({ s: items[i].y - i * gap, n: 1 });
        while (blocks.length > 1 && blocks[blocks.length - 2].s / blocks[blocks.length - 2].n > blocks[blocks.length - 1].s / blocks[blocks.length - 1].n) {
          var q = blocks.pop(); blocks[blocks.length - 1].s += q.s; blocks[blocks.length - 1].n += q.n;
        }
      }
      i = 0;
      blocks.forEach(function (bk) { for (k = 0; k < bk.n; k++, i++) items[i].ly = bk.s / bk.n + i * gap; });
      var shift = Math.max(0, lo - items[0].ly) - Math.max(0, items[items.length - 1].ly - hi);
      items.forEach(function (it) { it.ly += shift; });
    }

    function draw(ctx, w, h) {
      var C = kit.colors(), g = geometry(w, h), i;
      var blend = st.anim ? st.blend : 0;
      var plot = { x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1 };
      var below = { x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1 + g.stripH };

      /* frame: horizontal hairlines, tick labels, baseline, titles */
      framed(ctx, plot, 'y', axisTicks(g.yMax, g.y1 - g.y0, g.mob ? 38 : 46, blend, true), g.ys);
      framed(ctx, below, 'x', axisTicks(g.X, g.x1 - g.x0, g.mob ? 44 : 78, blend, false), g.xs);
      kit.frame(ctx, plot, { yLabel: '不超过 x 的质数个数', yLabelDx: g.x0 });
      kit.frame(ctx, below, { xLabel: '数轴 x', baseline: false });

      /* the primes themselves, one tick each, dissolving as the view widens */
      if (g.f > 0.004) {
        var th = 9 * Math.min(1, g.f * 1.6);
        ctx.fillStyle = kit.alpha(C.prime, 0.9 * g.f);
        for (i = 0; i < g.n; i++) ctx.fillRect(g.xs(P[i]) - 0.75, g.y1 + 4, 1.5, th);
        ctx.save();
        ctx.globalAlpha = g.f;
        ctx.font = kit.font(11); ctx.fillStyle = C.ink3; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('质数', g.x0 - 8, g.y1 + 4 + th / 2);
        ctx.restore();
      }

      ctx.save();
      ctx.lineJoin = 'round';
      /* wash under the staircase */
      ctx.beginPath();
      ctx.moveTo(g.px[0], g.py[0]);
      for (i = 1; i < g.px.length; i++) ctx.lineTo(g.px[i], g.py[i]);
      ctx.lineTo(g.x1, g.y1); ctx.closePath();
      ctx.fillStyle = kit.alpha(C.prime, 0.08); ctx.fill();
      /* x / ln x */
      ctx.lineCap = 'butt'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = C.ghost;
      kit.polyline(ctx, g.lx, g.gy);
      /* Li(x) */
      ctx.setLineDash([]); ctx.lineCap = 'round'; ctx.lineWidth = 2; ctx.strokeStyle = C.smooth;
      kit.polyline(ctx, g.lx, g.ly);
      /* pi(x) */
      ctx.strokeStyle = C.prime;
      kit.polyline(ctx, g.px, g.py);

      /* end labels in the right gutter, joined to their curves by a short stub of the curve's own colour */
      var labs = [
        { y: g.ys(g.liX), text: 'Li(x)', color: C.smooth },
        { y: g.ys(g.n), text: g.mob ? 'π(x)' : 'π(x) 质数个数', color: C.prime, main: true },
        { y: g.ys(g.glX), text: g.mob ? 'x/ln x' : 'x / ln x', color: C.ghost, dash: true }
      ];
      dodge(labs, g.mob ? 15 : 18, g.y0 + 2, g.y1 - 8);
      var e1 = g.mob ? 7 : 11, e2 = g.mob ? 11 : 18;
      labs.forEach(function (l) {
        ctx.strokeStyle = l.color; ctx.lineWidth = l.dash ? 1.5 : 2; ctx.lineCap = l.dash ? 'butt' : 'round';
        ctx.setLineDash(l.dash ? [3, 3] : []);
        ctx.beginPath(); ctx.moveTo(g.x1 + 3, l.y); ctx.lineTo(g.x1 + e1, l.ly); ctx.lineTo(g.x1 + e2, l.ly); ctx.stroke();
        ctx.setLineDash([]);
        kit.label(ctx, l.text, g.x1 + e2 + 4, l.ly, { font: kit.font(g.mob ? 11 : 12, 500), color: l.main ? C.ink : C.ink2 });
      });
      ctx.restore();

      /* crosshair */
      var hv = st.hover;
      if (hv && hv.x <= g.X) {
        var hx = g.xs(hv.x), cx = Math.round(hx) + 0.5;
        ctx.save();
        ctx.strokeStyle = C.ink3; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, g.y0); ctx.lineTo(cx, g.y1 + g.stripH); ctx.stroke();
        ctx.restore();
        if (hv.x >= 2) {
          kit.dot(ctx, hx, g.ys(hv.gl), 4, C.ghost);
          kit.dot(ctx, hx, g.ys(hv.li), 4, C.smooth);
        }
        kit.dot(ctx, hx, g.ys(hv.pi), 4, C.prime);
      }
    }

    var cv = kit.canvas(L.stage, {
      label: '质数阶梯 π(x) 与光滑曲线 Li(x)、x/ln x 的对比图',
      height: function (w) { return w < 520 ? 300 : 400; },
      draw: draw
    });
    var tip = kit.tooltip(L.stage);
    kit.legend(L.legend, [
      { label: 'π(x)：不超过 x 的质数个数', color: 'prime', kind: 'line' },
      { label: 'Li(x)：对数积分给出的估计', color: 'smooth', kind: 'line' },
      { label: 'x / ln x：更粗略的估计', color: 'ghost', kind: 'dash' }
    ]);

    function pct(r) {
      var v = Math.abs(r) * 100;
      return (v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3)) + '%';
    }
    function eq(a, op, b) { return a + NB + op + NB + b; }
    function report() {
      var X = st.shown, c = count(X), li = M.Li(X);
      readout.set(eq('x', '=', kit.fmt.int(X)) + GAP + eq('π(x)', '=', kit.fmt.int(c)) + GAP + eq('Li(x)', '≈', dec(li, 1)) + GAP + '相\u2060差' + NB + pct((li - c) / c));
      cv.el.setAttribute('aria-label', '质数阶梯 π(x) 与光滑曲线 Li(x)、x/ln x 的对比图，x 从 0 到 ' + kit.fmt.int(X) +
        '：π(x) = ' + kit.fmt.int(c) + '，Li(x) ≈ ' + dec(li, 1) + '，x/ln x ≈ ' + dec(X / Math.log(X), 1));
    }
    /* bring everything in line with the slider (or the running animation) */
    function sync() {
      if (st.anim) { st.X = Math.min(Math.pow(10, st.v), avail); st.shown = roundSig3(st.X); }
      else { st.X = st.shown = xOfV(slider.get()); }
      slider.set(slider.get(), true);
      report();
      cv.redraw();
    }
    function clearHover() { if (st.hover) { st.hover = null; tip.hide(); cv.redraw(); } else tip.hide(); }

    slider.on(function () {
      if (st.anim) { st.anim = false; loop.stop(); btn.textContent = '自动拉远'; }
      clearHover();
      sync();
    });

    /* ---- auto zoom-out ---- */
    var DUR = 7, T = 0;
    var loop = kit.loop(figureEl, function (dt) {
      T += dt;
      var u = clamp(T / DUR, 0, 1);
      st.v = V_START + (V_MAX - V_START) * smooth01(u);
      st.blend = clamp((DUR - T) / 0.7, 0, 1);
      slider.set(clamp(st.v, V_MIN, V_MAX).toFixed(2), true);
      sync();
      if (u >= 1) stopAnim();
    });
    function startAnim() {
      clearHover();
      T = 0; st.v = V_START; st.anim = true; st.blend = 1;
      btn.textContent = '停止';
      sync();
      loop.start();
    }
    function stopAnim() {
      loop.stop();
      st.anim = false; st.blend = 0;
      btn.textContent = '自动拉远';
      sync();
    }

    /* ---- crosshair + tooltip ---- */
    kit.pointer(cv.el, {
      move: function (mx, my) {
        var g = G;
        if (!g || st.anim) return;
        if (mx < g.x0 - 10 || mx > g.x1 + 10 || my < g.y0 - 14 || my > g.y1 + g.stripH + 26) { clearHover(); return; }
        var x = Math.round(clamp(g.xs.inv(mx), 0, g.X));
        if (st.hover && st.hover.x === x) return;
        var c = count(x), hv = { x: x, pi: c, li: x >= 2 ? M.Li(x) : 0, gl: x >= 2 ? x / Math.log(x) : 0 };
        st.hover = hv;
        cv.redraw();
        var isPrime = c > 0 && P[c - 1] === x;
        tip.show(g.xs(x), Math.min(g.ys(hv.pi), g.ys(hv.li)) - 4, {
          title: 'x = ' + kit.fmt.int(x) + (isPrime && g.X <= 2000 ? '（质数）' : ''),
          rows: [
            { value: kit.fmt.int(c), label: 'π(x) 质数个数', color: 'prime', kind: 'line' },
            { value: x >= 2 ? dec(hv.li, 1) : '—', label: 'Li(x)', color: 'smooth', kind: 'line' },
            { value: x >= 2 ? dec(hv.gl, 1) : '—', label: 'x / ln x', color: 'ghost', kind: 'dash' }
          ]
        });
      },
      leave: clearHover
    });

    sync();
  });

  /* ================================================================== euler */
  kit.mount('euler', function (body, kit, figureEl) {
    var L = kit.layout(body);
    L.legend.remove();
    var NMAX = 200, TARGET = Math.PI * Math.PI / 6, TICKS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7];
    var primes = M.sieve(NMAX), n, j;
    /* S[n] = sum_{k<=n} 1/k^2 ;  Q[j] = product over the first j primes of 1/(1 - p^-2) */
    var S = new Float64Array(NMAX + 1), Q = new Float64Array(primes.length + 1);
    for (n = 1; n <= NMAX; n++) S[n] = S[n - 1] + 1 / (n * n);
    Q[0] = 1;
    for (j = 0; j < primes.length; j++) Q[j + 1] = Q[j] / (1 - 1 / (primes[j] * primes[j]));

    var st = { N: 13, hover: null }, geo = null;
    var slider = kit.slider(L.controls, { id: 'euler-n', label: '用到的数不超过', min: 1, max: NMAX, step: 1, value: st.N, format: function (v) { return String(v); } });

    function rows(N) {
      var k = M.primeCount(primes, N), i, a = { label: '对整数求和', cum: [1], items: ['1'], sep: ' + ', tail: '（共 ' + N + ' 项）', value: S[N] },
        b = { label: '对质数求积', cum: [1], items: [], sep: '', tail: k ? '（共 ' + k + ' 个质数）' : '还没有用到质数，乘积就是 1', value: Q[k], prime: true };
      for (i = 2; i <= N; i++) { a.cum.push(S[i]); a.items.push('1/' + i * i); }
      for (i = 1; i <= k; i++) { b.cum.push(Q[i]); b.items.push('(' + primes[i - 1] + ')'); }
      return [a, b];
    }
    /* as many leading terms as fit, then an ellipsis and the last term */
    function fitTerms(ctx, row, maxW) {
      var it = row.items, K = it.length, i;
      if (!K) return '';
      var tailW = ctx.measureText(row.tail).width, full = it.join(row.sep);
      if (ctx.measureText(full).width + tailW <= maxW) return full;
      var sepW = ctx.measureText(row.sep).width, rest = row.sep + '…' + row.sep + it[K - 1];
      var budget = maxW - tailW - ctx.measureText(rest).width, acc = 0, keep = 0;
      for (i = 0; i < K - 1; i++) {
        acc += ctx.measureText(it[i]).width + (i ? sepW : 0);
        if (acc > budget) break;
        keep = i + 1;
      }
      keep = Math.max(1, keep);
      return it.slice(0, keep).join(row.sep) + rest;
    }

    function draw(ctx, w, h) {
      var C = kit.colors(), N = st.N, wide = w >= 560, i;
      var tx0 = wide ? 114 : 10, tx1 = wide ? w - 150 : w - 12;
      var top = 28, pitch = wide ? 60 : 86;
      var y1 = top + 2 * pitch - (wide ? 4 : 8);
      var xs = kit.lin(1, 1.7, tx0, tx1), xT = xs(TARGET);
      var R = rows(N);
      geo = { xs: xs, tx0: tx0, rows: R, bars: [] };

      kit.frame(ctx, { x0: tx0, y0: top - 4, x1: tx1, y1: y1 }, {
        xs: xs, xTicks: TICKS, xFmt: function (v) { return v.toFixed(1); },
        grid: 'none', baseline: true, xLabel: wide ? null : '算到目前的值'
      });
      ctx.save();
      if (wide) {
        ctx.font = kit.font(12); ctx.fillStyle = C.ink2; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('算到目前的值', 0, y1 + 8);
      }

      /* the number both sides are heading for */
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(xT) + 0.5, 20); ctx.lineTo(Math.round(xT) + 0.5, y1); ctx.stroke();
      ctx.font = kit.font(12, 500);
      var tl = 'π²/6 = 1.644934…', tw = ctx.measureText(tl).width;
      kit.label(ctx, tl, Math.min(xT + tw / 2, w - 1), 10, { align: 'right', font: kit.font(12, 500), color: C.ink });

      R.forEach(function (row, r) {
        var rt = top + r * pitch, labY = rt + (wide ? 8 : 31), barY = rt + (wide ? 23 : 46), termY = rt + (wide ? 43 : 66);
        var color = row.prime ? C.prime : C.ink2, barColor = row.prime ? C.prime : C.ink3, cum = row.cum, K = cum.length - 1, a, b;
        geo.bars.push(barY);
        /* track, with a ruler tick at every 0.1 */
        ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
        ctx.beginPath();
        for (i = 0; i < TICKS.length; i++) { a = Math.round(xs(TICKS[i])) + 0.5; ctx.moveTo(a, barY - 9); ctx.lineTo(a, barY + 9); }
        ctx.stroke();
        ctx.strokeStyle = C.ghost; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tx0, barY); ctx.lineTo(tx1, barY); ctx.stroke();
        /* one block per term; blocks too thin to separate merge into a solid run */
        var rects = [], run = null;
        for (i = 1; i <= K; i++) {
          a = xs(cum[i - 1]); b = xs(cum[i]);
          if (b - a >= 5) { if (run) { rects.push(run); run = null; } rects.push([a, b, i]); }
          else if (run) run[1] = b; else run = [a, b, 0];
        }
        if (run) rects.push(run);
        ctx.fillStyle = barColor;
        rects.forEach(function (q, qi) {
          var xa = q[0] + (qi ? 1 : 0), xb = q[1] - (qi < rects.length - 1 ? 1 : 0);
          ctx.fillRect(xa, barY - 3, Math.max(0.5, xb - xa), 6);
        });
        /* name the blocks that are wide enough to carry a name */
        ctx.font = kit.font(11); ctx.fillStyle = C.ink3; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        rects.forEach(function (q) {
          if (!q[2]) return;
          var s = row.items[row.prime ? q[2] - 1 : q[2]];
          if (q[1] - q[0] >= ctx.measureText(s).width + 10) ctx.fillText(s, (q[0] + q[1]) / 2, labY);
        });
        /* hovered block */
        if (st.hover && st.hover.r === r && st.hover.i <= K) {
          a = xs(cum[st.hover.i - 1]); b = xs(cum[st.hover.i]);
          ctx.fillStyle = C.surface; ctx.fillRect(a - 1, barY - 7, Math.max(2, b - a) + 2, 14);
          ctx.fillStyle = color; ctx.fillRect(a + (b - a >= 5 ? 1 : 0), barY - 6, Math.max(1.5, b - a - (b - a >= 5 ? 2 : 0)), 12);
        }
        kit.dot(ctx, xs(row.value), barY, 5, color);

        /* terms in use */
        ctx.font = kit.font(12); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        var tX = wide ? tx0 : 0, terms = fitTerms(ctx, row, xT - 10 - tX);
        ctx.fillStyle = C.ink2; ctx.fillText(terms, tX, termY);
        ctx.fillStyle = C.ink3; ctx.fillText(row.tail, tX + ctx.measureText(terms).width, termY);

        /* row name, current value, distance still to go */
        var val = row.value.toFixed(6), gap = (TARGET - row.value).toFixed(6), x;
        if (wide) {
          ctx.font = kit.font(13, 500); ctx.fillStyle = C.ink; ctx.fillText(row.label, 0, barY);
          x = tx1 + 22;
          ctx.font = kit.mono(15, 500); ctx.fillText(val, x, barY);
          ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.fillText('还差', x, termY);
          x += ctx.measureText('还差').width + 5;
          ctx.font = kit.mono(11.5); ctx.fillText(gap, x, termY);
        } else {
          var hy = rt + 10;
          ctx.font = kit.font(13, 500); ctx.fillStyle = C.ink; ctx.fillText(row.label, 0, hy);
          x = ctx.measureText(row.label).width + 12;
          ctx.font = kit.mono(13.5, 500); ctx.fillText(val, x, hy);
          x += ctx.measureText(val).width + 12;
          ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.fillText('还差', x, hy);
          x += ctx.measureText('还差').width + 4;
          ctx.font = kit.mono(11.5); ctx.fillText(gap, x, hy);
        }
      });
      ctx.restore();
    }

    var cv = kit.canvas(L.stage, {
      label: '取 s = 2：对整数求和与对质数求积，都逼近 π²/6',
      height: function (w) { return w >= 560 ? 172 : 236; },
      draw: draw
    });
    var tip = kit.tooltip(L.stage);
    L.note.textContent = '每一小段是新加入的一项带来的增量。(p) 表示质数 p 贡献的因子 1/(1 − 1/p²)，例如 (2) = 4/3。';

    function report() {
      var N = st.N, k = M.primeCount(primes, N);
      cv.el.setAttribute('aria-label', '取 s = 2，用到不超过 ' + N + ' 的数：对整数求和（' + N + ' 项）得到 ' + S[N].toFixed(6) +
        '，对质数求积（' + k + ' 个质数）得到 ' + Q[k].toFixed(6) + '，两者都逼近 π²/6 = 1.644934');
    }
    slider.on(function (v) { st.N = v; st.hover = null; tip.hide(); report(); cv.redraw(); });
    report();

    function leave() { if (st.hover) { st.hover = null; cv.redraw(); } tip.hide(); }
    kit.pointer(cv.el, {
      move: function (mx, my) {
        if (!geo) return;
        var r = Math.abs(my - geo.bars[0]) <= 18 ? 0 : Math.abs(my - geo.bars[1]) <= 18 ? 1 : -1;
        if (r < 0) { leave(); return; }
        var row = geo.rows[r], cum = row.cum, K = cum.length - 1, v = geo.xs.inv(mx), i;
        if (!K || mx < geo.tx0 - 6 || v > row.value + 0.012) { leave(); return; }
        for (i = 1; i < K && cum[i] < v; i++);
        if (st.hover && st.hover.r === r && st.hover.i === i) return;
        st.hover = { r: r, i: i };
        cv.redraw();
        var p = row.prime ? primes[i - 1] : i + 1, sq = p * p;
        tip.show(geo.xs((cum[i - 1] + cum[i]) / 2), geo.bars[r] - 10, row.prime ? {
          title: '质数 ' + p,
          rows: [{ value: '× ' + sq + '/' + (sq - 1), label: '它的因子 (' + p + ')' }, { value: cum[i].toFixed(6), label: '乘到这里', color: 'prime', kind: 'rect' }]
        } : {
          title: '第 ' + p + ' 项',
          rows: [{ value: '+ 1/' + sq, label: '这一项' }, { value: cum[i].toFixed(6), label: '加到这里', color: 'ink-2', kind: 'rect' }]
        });
      },
      leave: leave
    });
  });
})();
