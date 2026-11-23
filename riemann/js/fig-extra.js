/* Editor-built figures: profile (|zeta| along a vertical line), spikes (zeros -> primes signal),
   digits (how many leading digits li(x) gets right), tower (what rests on the hypothesis). */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;

  function isPrime(n) { if (n < 2) return false; for (var d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
  /* n = p^m with m >= 2 ? returns {p, m} */
  function primePower(n) {
    for (var p = 2; p * p <= n; p++) {
      if (n % p === 0) { var m = 0, v = n; while (v % p === 0) { v /= p; m++; } return v === 1 ? { p: p, m: m } : null; }
    }
    return null;
  }
  var SUPS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

  /* ------------------------------------------------------------------ profile */
  kit.mount('profile', function (body) {
    var L = kit.layout(body);
    var T0 = 0, T1 = 60, YMAX = 4.2, NS = 720;
    var ts = new Float64Array(NS + 1), ref = new Float64Array(NS + 1), cur = new Float64Array(NS + 1);
    var z = [0, 0], i;
    for (i = 0; i <= NS; i++) { ts[i] = T0 + (T1 - T0) * i / NS; M.zeta(0.5, ts[i], z); ref[i] = Math.hypot(z[0], z[1]); }
    var zeros = D.zeros.filter(function (g) { return g < T1; });
    var sigma = 0.5, minV = 0, minT = 0;
    function compute() {
      minV = Infinity;
      for (var i = 0; i <= NS; i++) {
        if (sigma === 0.5) cur[i] = ref[i]; else { M.zeta(sigma, ts[i], z); cur[i] = Math.hypot(z[0], z[1]); }
        if (ts[i] > 1 && cur[i] < minV) { minV = cur[i]; minT = ts[i]; }
      }
    }
    var slider = kit.slider(L.controls, { id: 'profile-sigma', label: '竖线的位置 Re(s) =', min: 0.5, max: 1, step: 0.01, value: 0.5, format: function (v) { return v.toFixed(2); } });
    var out = kit.readout(body);
    body.insertBefore(out, L.legend);
    kit.legend(L.legend, [
      { label: '当前竖线上 |ζ| 的大小', color: 'ink', kind: 'line' },
      { label: '临界线 Re(s) = ½ 上的 |ζ|（对照）', color: 'ghost', kind: 'line' },
      { label: '零点', color: 'zero', kind: 'dot' }
    ]);
    L.note.remove();
    var tip = kit.tooltip(L.stage), hover = -1, geo = null;
    var cv = kit.canvas(L.stage, {
      label: '沿一条竖线看 ζ 函数的大小：只有在实部等于二分之一的直线上，曲线才会反复降到零',
      height: function (w) { return w < 520 ? 260 : 320; },
      draw: function (ctx, w, h) {
        var C = kit.colors(), narrow = w < 520;
        var r = { x0: 40, y0: 18, x1: w - 12, y1: h - 46 };
        var xs = kit.lin(T0, T1, r.x0, r.x1), ys = kit.lin(0, YMAX, r.y1, r.y0);
        geo = { r: r, xs: xs, ys: ys };
        kit.frame(ctx, r, { xs: xs, ys: ys, xTicks: kit.ticks(T0, T1, narrow ? 6 : 12), yTicks: [0, 1, 2, 3, 4], xLabel: '沿竖线向上的高度 t', yLabel: '|ζ(s)|', yLabelDx: 28 });
        var px = new Float64Array(NS + 1), py = new Float64Array(NS + 1), k;
        ctx.save();
        ctx.beginPath(); ctx.rect(r.x0, r.y0 - 4, r.x1 - r.x0, r.y1 - r.y0 + 4); ctx.clip();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (sigma !== 0.5) {
          for (k = 0; k <= NS; k++) { px[k] = xs(ts[k]); py[k] = ys(Math.min(ref[k], YMAX * 1.5)); }
          ctx.strokeStyle = C.ghost; ctx.lineWidth = 1.5; kit.polyline(ctx, px, py);
        }
        for (k = 0; k <= NS; k++) { px[k] = xs(ts[k]); py[k] = ys(Math.min(cur[k], YMAX * 1.5)); }
        ctx.beginPath(); ctx.moveTo(px[0], r.y1);
        for (k = 0; k <= NS; k++) ctx.lineTo(px[k], py[k]);
        ctx.lineTo(px[NS], r.y1); ctx.closePath();
        ctx.fillStyle = kit.alpha(C.ink, 0.06); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; kit.polyline(ctx, px, py);
        ctx.restore();
        // zeros on the baseline
        zeros.forEach(function (g) {
          var x = xs(g);
          if (sigma === 0.5) kit.dot(ctx, x, r.y1, 4, C.zero);
          else { ctx.beginPath(); ctx.arc(x, r.y1, 4, 0, 6.2832); ctx.fillStyle = C.surface; ctx.fill(); ctx.strokeStyle = C.zero; ctx.lineWidth = 1.5; ctx.stroke(); }
        });
        if (sigma === 0.5) {
          var zx = Math.round(xs(14.1347)) + 0.5, ly = ys(3.05);
          ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(zx, ly + 10); ctx.lineTo(zx, r.y1 - 8); ctx.stroke();
          kit.label(ctx, '第一个零点 t ≈ 14.13', zx, ly, { color: C.ink2, align: w < 420 ? 'left' : 'center' });
        }
        if (hover >= 0) {
          var hx = Math.round(px[hover]) + 0.5;
          ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, r.y0); ctx.lineTo(hx, r.y1); ctx.stroke();
          kit.dot(ctx, px[hover], Math.max(r.y0, py[hover]), 4, C.ink);
        }
      }
    });
    function report() {
      if (sigma === 0.5) out.set('Re(s) = 0.50：在 t = 0 到 60 之间，|ζ| 有 ' + zeros.length + ' 次降到 0，第一次在 t ≈ 14.13。');
      else out.set('Re(s) = ' + sigma.toFixed(2) + '：|ζ| 的最小值是 ' + minV.toFixed(3) + '（在 t ≈ ' + minT.toFixed(1) + ' 处），碰不到 0。');
    }
    slider.on(function (v) { sigma = Math.round(v * 100) / 100; compute(); report(); cv.redraw(); });
    kit.pointer(cv.el, {
      move: function (x, y) {
        if (!geo) return;
        var t = geo.xs.inv(x), i = Math.round((t - T0) / (T1 - T0) * NS);
        if (i < 0 || i > NS) { hover = -1; tip.hide(); cv.redraw(); return; }
        hover = i; cv.redraw();
        var rows = [{ label: '|ζ(s)|', value: cur[i].toFixed(3), color: 'ink' }];
        if (sigma !== 0.5) rows.push({ label: '临界线上的 |ζ|', value: ref[i].toFixed(3), color: 'ghost' });
        tip.show(geo.xs(ts[i]), geo.ys(Math.min(cur[i], YMAX)), { title: 's = ' + sigma.toFixed(2) + ' + ' + ts[i].toFixed(2) + ' i', rows: rows });
      },
      leave: function () { hover = -1; tip.hide(); cv.redraw(); }
    });
    compute(); report(); cv.redraw();
  });

  /* ------------------------------------------------------------------ spikes */
  kit.mount('spikes', function (body) {
    var L = kit.layout(body);
    var X0 = 1.5, X1 = 32.5, NS = 2600, NMAX = Math.min(3000, D.zeroCount);
    var Z = D.allZeros();
    var lx = new Float64Array(NS + 1), xv = new Float64Array(NS + 1), norm = new Float64Array(NS + 1);
    var A = new Float64Array(NS + 1), B = new Float64Array(NS + 1), S = new Float64Array(NS + 1);
    for (var i = 0; i <= NS; i++) { xv[i] = X0 + (X1 - X0) * i / NS; lx[i] = Math.log(xv[i]); norm[i] = Math.sqrt(xv[i]) / lx[i]; }
    var have = 0, target = 300, raf = 0, playing = false, playT = 0, viewMax = 32;
    function nFromSlider(v) { return Math.max(5, Math.min(NMAX, Math.round(5 * Math.pow(NMAX / 5, v / 100)))); }
    function sliderFromN(n) { return 100 * Math.log(n / 5) / Math.log(NMAX / 5); }
    function addZeros(count) {
      var end = Math.min(target, have + count);
      for (var k = have; k < end; k++) {
        var g = Z[k];
        for (var i = 0; i <= NS; i++) { var c = Math.cos(g * lx[i]); A[i] += c; B[i] += g * c; }
      }
      have = end;
    }
    function finish() {
      // Fejer-weighted sum: sum (1 - g/T) cos(g ln x), scaled so that a prime gives height 1
      var T = Z[have - 1];
      // the last term is the smooth, zero-free part of the explicit formula (it contains no information about primes)
      for (var i = 0; i <= NS; i++) S[i] = -norm[i] * (4 * Math.PI / T) * (A[i] - B[i] / T) + (2 * Math.PI / T) * xv[i] / lx[i];
    }
    function reset() { have = 0; A.fill(0); B.fill(0); }
    var slider = kit.slider(L.controls, { id: 'spikes-n', label: '用多少个零点', min: 0, max: 100, step: 0.5, value: sliderFromN(300), format: function (v) { return kit.fmt.int(nFromSlider(v)) + ' 个'; } });
    var playBtn = kit.button(L.controls, { id: 'spikes-play', label: '播放', kind: 'primary', onClick: function () { playing ? stop() : play(); } });
    var out = kit.readout(body);
    body.insertBefore(out, L.legend);
    L.legend.remove(); L.note.remove();
    var tip = kit.tooltip(L.stage), hover = -1, geo = null;
    var cv = kit.canvas(L.stage, {
      label: '用零点的高度作频率合成的信号：尖峰恰好出现在质数 2、3、5、7、11 等处，质数的幂处有较矮的峰',
      height: function (w) { return w < 520 ? 270 : 340; },
      draw: function (ctx, w, h) {
        var C = kit.colors(), narrow = w < 520;
        var r = { x0: 34, y0: 16, x1: w - 10, y1: h - 52 };
        var vmax = narrow ? 20 : 32;
        if (vmax !== viewMax) { viewMax = vmax; report(); }
        var xs = kit.lin(X0, vmax + 0.5, r.x0, r.x1), ys = kit.lin(-0.3, 1.25, r.y1, r.y0);
        geo = { r: r, xs: xs, ys: ys };
        // grid + y labels
        ctx.font = kit.font(11.5); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
        [[0, '0'], [1 / 3, '⅓'], [0.5, '½'], [1, '1']].forEach(function (g) {
          var y = Math.round(ys(g[0])) + 0.5;
          ctx.strokeStyle = g[0] === 0 ? C.axis : C.hair; ctx.beginPath(); ctx.moveTo(r.x0, y); ctx.lineTo(r.x1, y); ctx.stroke();
          ctx.fillStyle = C.ink3; ctx.fillText(g[1], r.x0 - 8, y);
        });
        // integer axis: primes emphasised
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (var n = 2; n <= vmax; n++) {
          var x = xs(n), p = isPrime(n);
          if (p) {
            ctx.strokeStyle = kit.alpha(C.prime, 0.28); ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, r.y0); ctx.lineTo(Math.round(x) + 0.5, r.y1 + 6); ctx.stroke();
            ctx.font = kit.font(12.5, 700); ctx.fillStyle = C.ink; ctx.fillText(String(n), x, r.y1 + 10);
          } else { ctx.font = kit.font(narrow ? 10.5 : 11); ctx.fillStyle = C.ink3; ctx.fillText(String(n), x, r.y1 + 11); }
        }
        ctx.textAlign = 'right'; ctx.font = kit.font(12); ctx.fillStyle = C.ink2;
        ctx.fillText('横轴 x（粗体数字是质数）', r.x1, r.y1 + 32);
        // signal
        var px = new Float64Array(NS + 1), py = new Float64Array(NS + 1);
        for (var i = 0; i <= NS; i++) { px[i] = xs(xv[i]); py[i] = ys(Math.max(-0.45, Math.min(1.4, S[i]))); }
        ctx.save(); ctx.beginPath(); ctx.rect(r.x0, 0, r.x1 - r.x0, r.y1 + 2); ctx.clip();
        ctx.lineJoin = 'round'; ctx.strokeStyle = C.zero; ctx.lineWidth = 1.75; kit.polyline(ctx, px, py);
        ctx.restore();
        if (!narrow && have >= 60) {
          kit.label(ctx, '4 = 2²', xs(4), ys(0.5) - 14, { align: 'center', color: C.ink3, font: kit.font(11.5) });
          kit.label(ctx, '8 = 2³', xs(8), ys(1 / 3) - 14, { align: 'center', color: C.ink3, font: kit.font(11.5) });
          kit.label(ctx, '9 = 3²', xs(9) + 4, ys(0.5) - 14, { align: 'left', color: C.ink3, font: kit.font(11.5) });
        }
        if (hover >= 0) {
          var hx = Math.round(px[hover]) + 0.5;
          ctx.strokeStyle = C.axis; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, r.y0); ctx.lineTo(hx, r.y1); ctx.stroke();
          kit.dot(ctx, px[hover], py[hover], 4, C.zero);
        }
      }
    });
    function report() {
      if (!have) return;
      out.set('用了 ' + kit.fmt.int(have) + ' 个零点（高度到 t ≈ ' + Z[have - 1].toFixed(1) + '）。' +
        (have < 40 ? '轮廓还很模糊，继续加零点。' : viewMax < 32 ? '峰高为 1 的位置：2、3、5、7、11、13、17、19，正是 20 以内的全部质数。' : '峰高为 1 的位置：2、3、5、7、11、13、17、19、23、29、31，正是 32 以内的全部质数。'));
    }
    function pump() {
      raf = 0;
      if (have > target) reset();
      addZeros(have === 0 && target > 400 ? 400 : 160);
      finish(); report(); cv.redraw();
      if (have < target) raf = requestAnimationFrame(pump);
    }
    function setTarget(n) { target = n; if (!raf) raf = requestAnimationFrame(pump); }
    slider.on(function (v) { if (playing) stop(); setTarget(nFromSlider(v)); });
    var loop = kit.loop(cv.el, function (dt) {
      playT += dt;
      var v = Math.min(100, playT / 9 * 100);
      slider.set(v, true); setTarget(nFromSlider(v));
      if (v >= 100) stop();
    });
    function play() { playing = true; playT = 0; reset(); playBtn.textContent = '暂停'; loop.start(); }
    function stop() { playing = false; playBtn.textContent = '播放'; loop.stop(); }
    kit.pointer(cv.el, {
      move: function (x) {
        if (!geo) return;
        var xx = geo.xs.inv(x), i = Math.round((xx - X0) / (X1 - X0) * NS);
        if (i < 0 || i > NS || xx > viewMax + 0.5) { hover = -1; tip.hide(); cv.redraw(); return; }
        // snap to the nearest integer when close
        var n = Math.round(xv[i]);
        if (Math.abs(xv[i] - n) < 0.18 && n >= 2 && n <= viewMax) i = Math.round((n - X0) / (X1 - X0) * NS);
        hover = i; cv.redraw();
        var title = 'x = ' + xv[i].toFixed(2), nn = Math.round(xv[i]);
        if (Math.abs(xv[i] - nn) < 0.02) {
          var pp = primePower(nn);
          title = 'x = ' + nn + (isPrime(nn) ? '（质数）' : pp ? '（' + pp.p + ' 的 ' + pp.m + ' 次方）' : '（合数）');
        }
        tip.show(geo.xs(xv[i]), geo.ys(Math.min(1.25, S[i])), { title: title, rows: [{ label: '信号强度', value: S[i].toFixed(2), color: 'zero' }] });
      },
      leave: function () { hover = -1; tip.hide(); cv.redraw(); }
    });
    // first frame: compute synchronously (300 zeros x 2600 samples is ~10 ms)
    addZeros(300); finish(); report(); cv.redraw();
  });

  /* ------------------------------------------------------------------ digits */
  kit.mount('digits', function (body) {
    kit.css(
      '.digits-rows{display:grid;row-gap:.9rem;overflow-x:auto;padding-bottom:.25rem}' +
      '.digits-row{display:grid;row-gap:.1rem}' +
      '.digits-k{font-size:var(--t-sm);color:var(--ink-2)}' +
      '.digits-num{font-family:var(--font-data);font-variant-numeric:tabular-nums;font-size:clamp(.8rem,2.9vw,1.55rem);line-height:1.35;white-space:nowrap;letter-spacing:.01em}' +
      '.digits-same{color:var(--ink);font-weight:500}' +
      '.digits-diff{color:var(--ink-3);text-decoration:underline;text-decoration-color:var(--bad);text-decoration-thickness:2px;text-underline-offset:.28em}' +
      '.digits-meter{display:flex;height:8px;border-radius:4px;overflow:hidden;background:var(--surface-2);max-width:34rem}' +
      '.digits-meter i{display:block;height:100%;background:var(--zero)}' +
      '.digits-sum{font-size:var(--t-md);color:var(--ink-2);max-width:46rem;line-height:1.75}' +
      '.digits-sum b{color:var(--ink);font-weight:700}'
    );
    var controls = kit.el('div', 'controls');
    body.appendChild(controls);
    var slider = kit.slider(controls, { id: 'digits-k', label: '数到 x =', min: 1, max: 29, step: 1, value: 24, format: function (v) { return kit.fmt.pow10(v); } });
    var rows = kit.el('div', 'digits-rows'), meter = kit.el('div', 'digits-meter'), bar = kit.el('i'), sum = kit.el('p', 'digits-sum');
    meter.appendChild(bar);
    meter.setAttribute('role', 'img');
    body.appendChild(rows); body.appendChild(meter); body.appendChild(sum);
    function group(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function row(label, digits, same) {
      var r = kit.el('div', 'digits-row');
      r.appendChild(kit.el('span', 'digits-k', label));
      var num = kit.el('div', 'digits-num'), g = group(digits);
      // split the grouped string after `same` digits
      var cut = 0, seen = 0;
      while (cut < g.length && seen < same) { if (g[cut] !== ',') seen++; cut++; }
      num.appendChild(kit.el('span', 'digits-same', g.slice(0, cut)));
      num.appendChild(kit.el('span', 'digits-diff', g.slice(cut)));
      r.appendChild(num);
      return r;
    }
    function render(k) {
      var e = D.piPow10[k - 1];
      var pi = e.pi, li = (BigInt(pi) + BigInt(Math.round(e.liMinusPi))).toString();
      var same = 0;
      if (li.length === pi.length) { while (same < pi.length && pi[same] === li[same]) same++; }
      rows.textContent = '';
      rows.appendChild(row('真实的质数个数 π(x)', pi, same));
      rows.appendChild(row('对数积分的估计 li(x)', li, same));
      var total = pi.length;
      bar.style.width = (same / total * 100) + '%';
      meter.setAttribute('aria-label', '共 ' + total + ' 位数字，前 ' + same + ' 位一致');
      sum.textContent = '';
      var x = Math.pow(10, k), bound = Math.sqrt(x) * Math.log(x) / (8 * Math.PI);
      function b(t) { return kit.el('b', null, t); }
      sum.appendChild(document.createTextNode('这两个数都有 ' + total + ' 位，'));
      sum.appendChild(b('前 ' + same + ' 位完全相同'));
      sum.appendChild(document.createTextNode('，划线的部分才开始不同。'));
      if (k >= 4) {
        var used = e.liMinusPi / bound * 100;
        sum.appendChild(document.createTextNode('黎曼猜想允许的最大误差约为 ' + sci(bound) + '，实际误差约为 ' + sci(e.liMinusPi) + '，只用掉了上限的 ' + (used >= 10 ? used.toFixed(0) : used.toFixed(1)) + '%。'));
      } else {
        sum.appendChild(document.createTextNode('x 还太小，黎曼猜想给出的误差上限要到 x ≥ 2657 才开始生效。'));
      }
    }
    function sci(v) {
      if (v < 1e4) return kit.fmt.int(v);
      var ex = Math.floor(Math.log10(v)), m = v / Math.pow(10, ex);
      return m.toFixed(1) + ' × ' + kit.fmt.pow10(ex);
    }
    slider.on(render);
    render(24);
  });

  /* ------------------------------------------------------------------ tower */
  kit.mount('tower', function (body) {
    kit.css(
      '.tower-tiers{display:grid;row-gap:1.5rem}' +
      '.tower-tier{display:grid;row-gap:.75rem}' +
      '@media (min-width:62rem){.tower-tier{grid-template-columns:13.5rem minmax(0,1fr);column-gap:1.75rem;align-items:start}}' +
      '.tower-th{display:grid;row-gap:.3rem}' +
      '.tower-th b{font-family:var(--font-display);font-weight:900;font-size:var(--t-lg);line-height:1.35}' +
      '.tower-th span{font-size:var(--t-sm);color:var(--ink-3);line-height:1.6}' +
      '.tower-cards{display:grid;grid-template-columns:minmax(0,1fr);gap:.75rem}' +
      '@media (min-width:40rem){.tower-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
      '.tower-card{border:1px dashed var(--axis);border-radius:var(--radius);padding:.85rem .95rem;display:grid;row-gap:.4rem;align-content:start;background:transparent;transition:background-color .35s,border-color .35s}' +
      '.tower-card h4{margin:0;font-size:var(--t-md);font-weight:700;line-height:1.5}' +
      '.tower-card p{font-size:var(--t-sm);color:var(--ink-2);line-height:1.65}' +
      '.tower-card .tower-by{font-size:var(--t-xs);color:var(--ink-3)}' +
      '.tower-chip{justify-self:start;display:inline-flex;align-items:center;gap:.35rem;font-size:var(--t-xs);font-weight:500;line-height:1.3;padding:.14rem .55rem;border-radius:999px;border:1px solid var(--axis);color:var(--ink-2)}' +
      '.tower-chip::before{content:"";width:7px;height:7px;border-radius:50%;border:1.5px solid var(--ink-3)}' +
      '.tower-card[data-state="theorem"]{border:1px solid var(--zero);background:color-mix(in srgb,var(--zero) 8%,transparent)}' +
      '.tower-card[data-state="theorem"] .tower-chip{border-color:var(--zero);color:var(--ink)}' +
      '.tower-card[data-state="theorem"] .tower-chip::before{background:var(--zero);border-color:var(--zero)}' +
      '.tower-card[data-state="saved"]{border:1px solid var(--smooth)}' +
      '.tower-card[data-state="saved"] .tower-chip{border-color:var(--smooth);color:var(--ink)}' +
      '.tower-card[data-state="saved"] .tower-chip::before{background:var(--smooth);border-color:var(--smooth)}' +
      '.tower-count{font-size:var(--t-md);color:var(--ink-2)}' +
      '.tower-count b{color:var(--ink)}' +
      '@media (prefers-reduced-motion:reduce){.tower-card{transition:none}}'
    );
    var TIERS = [
      { key: 'rh', name: '只需要黎曼猜想', sub: '关于 ζ 函数本身。2026 年 11 月公布的证明覆盖这一层。' },
      { key: 'grh', name: '需要广义黎曼猜想', sub: '把 ζ 换成一族“狄利克雷 L 函数”。公布的证明声称一并覆盖。' },
      { key: 'beyond', name: '需要更广的黎曼猜想', sub: '涉及更一般的 L 函数。公布的证明没有涉及，它们仍是条件结论。' },
      { key: 'open', name: '与黎曼猜想无关', sub: '常被误以为会“顺带解决”的难题。它们原地不动。' }
    ];
    var controls = kit.el('div', 'controls');
    body.appendChild(controls);
    var state = 'before';
    var seg = kit.segmented(controls, { id: 'tower-state', label: '时间', options: [{ value: 'before', label: '证明公布之前' }, { value: 'after', label: '如果这份证明被确认' }], value: 'before', onChange: function (v) { state = v; paint(); } });
    var count = kit.el('p', 'tower-count');
    count.setAttribute('aria-live', 'polite');
    body.appendChild(count);
    var tiers = kit.el('div', 'tower-tiers');
    body.appendChild(tiers);
    var cards = [];
    TIERS.forEach(function (t) {
      var items = RH.facts.tower.filter(function (c) { return c.tier === t.key; });
      if (!items.length) return;
      var row = kit.el('section', 'tower-tier'), th = kit.el('div', 'tower-th');
      th.appendChild(kit.el('b', null, t.name)); th.appendChild(kit.el('span', null, t.sub));
      var box = kit.el('div', 'tower-cards');
      items.forEach(function (c) {
        var card = kit.el('article', 'tower-card'), chip = kit.el('span', 'tower-chip');
        card.appendChild(chip);
        card.appendChild(kit.el('h4', null, c.title));
        card.appendChild(kit.el('p', null, c.body));
        var extra = kit.el('p', 'tower-extra'); card.appendChild(extra);
        card.appendChild(kit.el('p', 'tower-by', c.by));
        box.appendChild(card);
        cards.push({ c: c, card: card, chip: chip, extra: extra });
      });
      row.appendChild(th); row.appendChild(box); tiers.appendChild(row);
    });
    function paint() {
      var flipped = 0, stay = 0;
      cards.forEach(function (x) {
        var c = x.c, st, label, extra = '';
        if (c.tier === 'open') { st = 'open'; label = '未解决'; }
        else if (c.saved) { st = 'saved'; label = '已另行证明'; extra = c.saved; }
        else if (c.tier === 'beyond') { st = 'cond'; label = '条件结论'; extra = c.needs || ''; stay++; }
        else if (state === 'after') { st = 'theorem'; label = '定理'; extra = c.note || ''; flipped++; }
        else { st = 'cond'; label = '条件结论：假设' + (c.tier === 'rh' ? '黎曼猜想' : '广义黎曼猜想'); extra = c.note || ''; }
        x.card.setAttribute('data-state', st);
        x.chip.textContent = label;
        x.extra.textContent = extra;
        x.extra.hidden = !extra;
      });
      count.textContent = '';
      if (state === 'after') {
        count.appendChild(kit.el('b', null, flipped + ' 张卡片'));
        count.appendChild(document.createTextNode('去掉了“假设”二字，变成定理。' + stay + ' 张仍是条件结论，2 张未解决的难题没有变化。'));
      } else {
        count.appendChild(document.createTextNode('虚线框表示结论依赖一个尚未证明的假设。切换上面的开关，看哪些会变。'));
      }
    }
    paint();
  });
})();
