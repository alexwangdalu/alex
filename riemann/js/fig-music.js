/* Figure "music": Riemann's explicit formula. Add the zeros one by one and the smooth law grows the prime staircase.
   Three linked canvases: a "keyboard" of the 300 zeros, the main chart, and the wave of the zero just added. */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;

  kit.css([
    '.music-keys{display:grid;row-gap:.3rem}',
    '.music-cap{font-size:var(--t-xs);line-height:1.55;color:var(--ink-3)}',
    '.music-keys .cv{cursor:pointer}',
    '.music-plots .cv{cursor:crosshair}',
    '.music-wavehead{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 1.1rem;margin:.95rem 0 .3rem;font-size:var(--t-sm);line-height:1.6;color:var(--ink-2)}',
    '.music-wavehead b{font-weight:700;color:var(--ink)}',
    '.music-mono{font-family:var(--font-data);font-variant-numeric:tabular-nums;white-space:nowrap}'
  ].join('\n'));

  kit.mount('music', function (body, kit, figureEl) {
    var L = kit.layout(body);
    L.note.remove();

    var Z = D.zeros, NZ = Math.min(300, Z.length);
    var TMAX = Math.ceil((Z[NZ - 1] + 1) / 5) * 5;                 // keyboard axis: 0 -> 545
    var RANGES = [50, 100, 200];
    var YMAX = { 50: 17, 100: 28, 200: 50 };                       // main chart y extent per range
    var XT = { 50: [2, 10, 20, 30, 40, 50], 100: [2, 20, 40, 60, 80, 100], 200: [2, 50, 100, 150, 200] };
    var YW = 0.5, YWT = [-0.4, 0, 0.4];                            // fixed scale of the single-wave panel
    var T_SLOW = 3, T_END = 9;                                     // play: 0 -> 10 in 3 s, then 10 -> 300 in 6 s
    var MINUS = '−', GAP = '　　';
    var primes = M.sieve(RANGES[RANGES.length - 1] + 10), primeSet = {};
    primes.forEach(function (p) { primeSet[p] = true; });
    var RHO1 = Math.sqrt(0.25 + Z[0] * Z[0]);

    var st = { N: 30, Nf: 30, X: 100, hover: false, overWave: false, keyHover: -1 };

    /* ---------- controls ---------- */
    var slider = kit.slider(L.controls, {
      id: 'music-n', label: '加入的零点', min: 0, max: NZ, step: 1, value: st.N,
      format: function (v) { return v + ' 个'; }
    });
    slider.on(function (v) { stopPlay(); setN(v); });
    var playBtn = kit.button(L.controls, { id: 'music-play', label: '播放', kind: 'primary', onClick: togglePlay });
    kit.segmented(L.controls, {
      id: 'music-range', label: '横轴',
      options: RANGES.map(function (X) { return { value: X, label: '到 ' + X }; }),
      value: st.X, onChange: setRange
    });

    /* ---------- stages ---------- */
    var keysStage = kit.el('div', 'stage music-keys');
    body.insertBefore(keysStage, L.stage);
    keysStage.appendChild(kit.el('div', 'music-cap', '最初 ' + NZ + ' 个零点，按它们在临界线上的高度 t 排开；金色的已经加入。在这里点击或拖动也可以选择。'));
    L.stage.classList.add('music-plots');

    /* ---------- geometry shared by drawing and pointer code ---------- */
    function pad(w) { return { l: w < 520 ? 36 : 44, r: 16 }; }
    function gMain(w, h) { var p = pad(w); return { x0: p.l, x1: w - p.r, y0: 32, y1: h - 28 }; }
    function gWave(w, h) { var p = pad(w); return { x0: p.l, x1: w - p.r, y0: 8, y1: h - 28 }; }
    function gKeys(w) { var p = pad(w); return { x0: p.l, x1: w - p.r, y0: 11, y1: 39 }; }
    function xTick(v) { return v === 2 ? 'x = 2' : String(v); }
    function fmtX(x) { return x === Math.floor(x) ? String(x) : x.toFixed(1); }
    function signed(v, d) { return (v < 0 ? MINUS : '+') + Math.abs(v).toFixed(d); }

    /* ---------- background numerics: per-zero waves on the sample grid, kept as prefix sums ---------- */
    var jobs = {}, active = null, near = false, pumpQueued = false;
    function sampleCount(plotW) { return 2 * Math.ceil(plotW / 96) * 96 + 1; }   // >= 2 samples per CSS px
    function getJob(X, n) {
      var key = X + ':' + n, j = jobs[key];
      if (j) return j;
      Object.keys(jobs).forEach(function (k) { if (jobs[k].n !== n) delete jobs[k]; });   // width changed materially
      j = jobs[key] = {
        X: X, n: n, xs: new Float64Array(n), smooth: new Float64Array(n), si: 0,
        run: new Float64Array(n), P: [null], ready: 0, done: false, t0: 0, tHint: 0,
        px: new Float32Array(n), py: new Float32Array(n)
      };
      for (var i = 0; i < n; i++) j.xs[i] = 2 + (X - 2) * i / (n - 1);
      j.xs[n - 1] = X;
      return j;
    }
    function step(j) {
      var i, n = j.n;
      if (j.si < n) {                                   // the smooth law first
        var e = Math.min(n, j.si + 32);
        for (i = j.si; i < e; i++) j.smooth[i] = M.piSmooth(j.xs[i]);
        j.si = e;
        return;
      }
      if (j.ready < NZ) {                               // then one zero at a time
        var g = Z[j.ready], run = j.run, xs = j.xs, out = new Float32Array(n);
        for (i = 0; i < n; i++) { run[i] += M.zeroWave(xs[i], g); out[i] = run[i]; }
        j.P.push(out);
        j.ready++;
      }
      if (j.ready >= NZ) j.done = true;
    }
    function now() { return window.performance && performance.now ? performance.now() : Date.now(); }
    function schedule() { if (!pumpQueued && near) { pumpQueued = true; setTimeout(pump, 0); } }
    function pump() {
      pumpQueued = false;
      var j = active;
      if (!j || j.done || !near) return;
      var t = now();
      if (!j.t0) j.t0 = t;
      var readyBefore = j.ready, smoothBefore = j.si >= j.n, need = Math.ceil(st.Nf);
      while (!j.done && now() - t < 9) step(j);
      var changed = (!smoothBefore && j.si >= j.n) || (readyBefore < need && j.ready > readyBefore);
      var slow = now() - j.t0 > 150 && now() - j.tHint > 70;
      if (changed || slow || j.done) { j.tHint = now(); invalidate(MAIN); }
      if (!j.done) schedule();
    }

    /* ---------- the probe: exact values at one x (independent of the sample grid) ---------- */
    var probe = { x: NaN, smooth: 0, pre: new Float64Array(NZ + 1), pi: 0, prime: false };
    function setProbe(x) {
      if (x === probe.x) return;
      probe.x = x;
      probe.smooth = M.piSmooth(x);
      var s = 0;
      for (var k = 0; k < NZ; k++) { s += M.zeroWave(x, Z[k]); probe.pre[k + 1] = s; }
      probe.pi = M.primeCount(primes, x);
      probe.prime = x === Math.floor(x) && !!primeSet[x];
    }
    function snap(x) {
      var s = st.X > 100 ? 1 : 0.5;
      return Math.max(2, Math.min(st.X, Math.round(x / s) * s));
    }
    function formulaAt(nf) {
      var k = Math.floor(nf), f = nf - k;
      var v = probe.pre[k];
      if (f > 0 && k < NZ) v += f * (probe.pre[k + 1] - probe.pre[k]);
      return probe.smooth + v;
    }
    setProbe(50);

    /* ---------- one zero's wave, sampled evenly in ln x so that dense waves are never aliased ---------- */
    var waveCache = { cur: null, ref: null };
    function waveOf(slot, k, X, plotW) {
      var c = waveCache[slot];
      if (c && c.k === k && c.X === X && c.plotW === plotW) return c;
      var g = Z[k - 1], u0 = Math.LN2, u1 = Math.log(X);
      var periods = g * (u1 - u0) / (2 * Math.PI);
      var n = Math.min(9000, Math.max(2 * Math.ceil(plotW), Math.ceil(periods * 12))) + 1;
      c = { k: k, X: X, plotW: plotW, n: n, x: new Float64Array(n), v: new Float64Array(n), px: new Float32Array(n), py: new Float32Array(n) };
      for (var i = 0; i < n; i++) {
        var x = i === 0 ? 2 : i === n - 1 ? X : Math.exp(u0 + (u1 - u0) * i / (n - 1));
        c.x[i] = x; c.v[i] = M.zeroWave(x, g);
      }
      waveCache[slot] = c;
      return c;
    }

    /* ---------- drawing ---------- */
    function stairPath(ctx, xs, ys, X, close) {
      var c = 0;
      ctx.beginPath();
      ctx.moveTo(xs(2), ys(0));
      for (var i = 0; i < primes.length && primes[i] <= X; i++) {
        var px = xs(primes[i]);
        ctx.lineTo(px, ys(c)); c++; ctx.lineTo(px, ys(c));
      }
      ctx.lineTo(xs(X), ys(c));
      if (close) { ctx.lineTo(xs(X), ys(0)); ctx.closePath(); }
    }

    function drawMain(ctx, w, h) {
      var C = kit.colors(), r = gMain(w, h), X = st.X;
      var xs = kit.lin(2, X, r.x0, r.x1), ys = kit.lin(0, YMAX[X], r.y1, r.y0);
      var j = active = getJob(X, sampleCount(r.x1 - r.x0));
      if (!j.done) schedule();

      kit.frame(ctx, r, {
        xs: xs, ys: ys, xTicks: XT[X], yTicks: kit.ticks(0, YMAX[X], 4), xFmt: xTick,
        yLabel: '不超过 x 的质数个数', yLabelDx: r.x0, grid: 'y'
      });

      ctx.save();
      ctx.beginPath(); ctx.rect(r.x0 - 2, r.y0 - 8, r.x1 - r.x0 + 4, r.y1 - r.y0 + 9); ctx.clip();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      // the true staircase: a faint wash + exact 1.5px step line
      stairPath(ctx, xs, ys, X, true);
      ctx.fillStyle = kit.alpha(C.prime, 0.08); ctx.fill();
      stairPath(ctx, xs, ys, X, false);
      ctx.strokeStyle = C.prime; ctx.lineWidth = 1.5; ctx.stroke();

      if (j.si >= j.n) {
        var i, n = j.n, px = j.px, py = j.py, sm = j.smooth, jx = j.xs;
        var nf = st.Nf, k = Math.floor(nf), f = nf - k;
        if (k >= j.ready) { k = j.ready; f = 0; }
        for (i = 0; i < n; i++) { px[i] = xs(jx[i]); py[i] = ys(sm[i]); }
        // the smooth law (the whole formula while no zero has been added)
        ctx.strokeStyle = C.smooth; ctx.lineWidth = nf > 0 ? 1.5 : 2;
        kit.polyline(ctx, px, py, n);
        if (k > 0 || f > 0) {
          var a = k ? j.P[k] : null, b = f > 0 ? j.P[k + 1] : null, v;
          for (i = 0; i < n; i++) {
            v = a ? a[i] : 0;
            if (b) v += f * (b[i] - v);
            py[i] = ys(sm[i] + v);
          }
          ctx.strokeStyle = C.zero; ctx.lineWidth = 2;
          kit.polyline(ctx, px, py, n);
        }
      }
      ctx.restore();

      // probe: hairline, a ring on the true value, a dot on the formula's value
      var qx = xs(probe.x), qf = ys(formulaAt(st.Nf)), qp = ys(probe.pi);
      ctx.strokeStyle = st.hover ? C.ink3 : C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(qx) + 0.5, r.y0 - 4); ctx.lineTo(Math.round(qx) + 0.5, r.y1); ctx.stroke();
      ctx.beginPath(); ctx.arc(qx, qp, 8, 0, 6.2832); ctx.strokeStyle = C.surface; ctx.lineWidth = 5; ctx.stroke();
      ctx.beginPath(); ctx.arc(qx, qp, 8, 0, 6.2832); ctx.strokeStyle = C.prime; ctx.lineWidth = 2; ctx.stroke();
      kit.dot(ctx, qx, qf, 4, st.Nf > 0 ? C.zero : C.smooth);

      // progress hint (only when the numbers take noticeably long)
      if (!j.done && j.t0 && now() - j.t0 > 150) {
        var frac = (j.si / j.n * 0.15) + (j.ready / NZ * 0.85);
        ctx.fillStyle = C.hair; ctx.fillRect(r.x0, r.y0 - 9, r.x1 - r.x0, 2);
        ctx.fillStyle = C.zero; ctx.fillRect(r.x0, r.y0 - 9, (r.x1 - r.x0) * frac, 2);
        ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('正在计算零点的波 ' + j.ready + ' / ' + NZ, r.x1, r.y0 - 12);
      }
    }

    function drawWave(ctx, w, h) {
      var C = kit.colors(), r = gWave(w, h), X = st.X, plotW = r.x1 - r.x0;
      var xs = kit.lin(2, X, r.x0, r.x1), ys = kit.lin(-YW, YW, r.y1, r.y0);
      kit.frame(ctx, r, {
        xs: xs, ys: ys, xTicks: XT[X], yTicks: YWT, xFmt: xTick, grid: 'y', baseline: false,
        yFmt: function (v) { return v === 0 ? '0' : signed(v, 1); }
      });
      var y0 = Math.round(ys(0)) + 0.5;
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.x0, y0); ctx.lineTo(r.x1, y0); ctx.stroke();

      var k = Math.ceil(st.Nf - 1e-9);
      if (k < 1) {
        kit.label(ctx, w < 520 ? '加入零点后，这里画出它贡献的波' : '加入第 1 个零点后，这里会画出它单独贡献的那一列波', (r.x0 + r.x1) / 2, ys(0) - 16, { align: 'center', color: C.ink3, weight: 400 });
        return;
      }
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x0 - 1, r.y0 - 6, plotW + 2, r.y1 - r.y0 + 12); ctx.clip();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      var i, c;
      if (k > 1) {                                       // the first zero's wave as a quiet yardstick
        c = waveOf('ref', 1, X, plotW);
        for (i = 0; i < c.n; i++) { c.px[i] = xs(c.x[i]); c.py[i] = ys(c.v[i]); }
        ctx.strokeStyle = kit.alpha(C.ghost, 0.6); ctx.lineWidth = 1.5;
        kit.polyline(ctx, c.px, c.py, c.n);
      }
      c = waveOf('cur', k, X, plotW);
      for (i = 0; i < c.n; i++) { c.px[i] = xs(c.x[i]); c.py[i] = ys(c.v[i]); }
      ctx.strokeStyle = C.zero; ctx.lineWidth = 2;
      kit.polyline(ctx, c.px, c.py, c.n);
      ctx.restore();

      if (k > 1) {                                       // direct key for the yardstick
        var txt = w < 520 ? '第 1 个零点的波' : '灰线：第 1 个零点的波，作对比';
        ctx.font = kit.font(11.5);
        var tw = ctx.measureText(txt).width, kx = r.x1 - tw - 26, ky = r.y0 + 5;
        ctx.fillStyle = kit.alpha(C.surface, 0.88);
        ctx.fillRect(kx - 6, ky - 9, tw + 34, 18);
        ctx.strokeStyle = kit.alpha(C.ghost, 0.6); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + 18, ky); ctx.stroke();
        ctx.fillStyle = C.ink3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, kx + 24, ky);
      }
      if (st.hover) {
        var qx = xs(probe.x);
        ctx.strokeStyle = C.ink3; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(qx) + 0.5, r.y0 - 4); ctx.lineTo(Math.round(qx) + 0.5, r.y1 + 4); ctx.stroke();
        kit.dot(ctx, qx, ys(M.zeroWave(probe.x, Z[k - 1])), 4, C.zero);
      }
    }

    function drawKeys(ctx, w) {
      var C = kit.colors(), r = gKeys(w), narrow = w < 520;
      var ts = kit.lin(0, TMAX, r.x0, r.x1);
      var n = Math.ceil(st.Nf - 1e-9), tw = narrow ? 1 : 1.5, i, x;
      ctx.fillStyle = kit.alpha(C.surface2, 0.6);
      ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.fillStyle = C.ghost;
      for (i = n; i < NZ; i++) { x = ts(Z[i]); ctx.fillRect(x - tw / 2, r.y0 + 4, tw, r.y1 - r.y0 - 4); }
      ctx.fillStyle = C.zero;
      for (i = 0; i < n; i++) { x = ts(Z[i]); ctx.fillRect(x - tw / 2, r.y0, tw, r.y1 - r.y0); }
      // axis
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.x0, r.y1 + 0.5); ctx.lineTo(r.x1, r.y1 + 0.5); ctx.stroke();
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      var ticks = kit.ticks(0, TMAX, narrow ? 3 : 6);
      for (i = 0; i < ticks.length; i++) ctx.fillText(ticks[i] === 0 ? 't = 0' : String(ticks[i]), ts(ticks[i]), r.y1 + 7);
      // hovered key
      if (st.keyHover > 0 && st.keyHover !== n) {
        x = ts(Z[st.keyHover - 1]);
        ctx.fillStyle = C.ink2; ctx.fillRect(x - 0.75, r.y0 - 3, 1.5, r.y1 - r.y0 + 6);
      }
      // play head on the zero just added
      if (n > 0) {
        x = ts(Z[n - 1]);
        ctx.fillStyle = C.surface; ctx.fillRect(x - 2.5, r.y0 - 2, 5, r.y1 - r.y0 + 2);
        ctx.fillStyle = C.zero; ctx.fillRect(x - 1, r.y0 - 2, 2, r.y1 - r.y0 + 2);
        kit.dot(ctx, x, r.y0 - 3, 4, C.zero);
      }
    }

    var keysCv = kit.canvas(keysStage, {
      height: 58, draw: drawKeys,
      label: '最初 ' + NZ + ' 个黎曼零点的位置。横轴是零点的高度 t，从 0 到 ' + TMAX + '；金色竖线是已经加入公式的零点，灰色是尚未加入的。'
    });
    var mainCv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 290 : 380; }, draw: drawMain,
      label: '质数阶梯 π(x) 与黎曼显式公式给出的曲线。加入的零点越多，公式的曲线越贴近真实的阶梯。'
    });
    var head = kit.el('div', 'music-wavehead');
    var headLab = kit.el('span', 'music-mono'), headAmp = kit.el('span');
    head.appendChild(kit.el('b', null, '单个零点的波'));
    head.appendChild(headLab); head.appendChild(headAmp);
    L.stage.appendChild(head);
    var waveCv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 114 : 122; }, draw: drawWave,
      label: '最新加入的那一个零点单独贡献的波，横轴与上图相同。零点越高，波越密、振幅越小。'
    });
    var tip = kit.tooltip(L.stage), keysTip = kit.tooltip(keysStage);

    kit.legend(L.legend, [
      { label: 'π(x)：真实的质数阶梯', color: 'prime' },
      { label: '光滑规律（不含零点）', color: 'smooth' },
      { label: '公式：光滑规律 + 已加入零点的波', color: 'zero' }
    ]);
    var ro = kit.readout(body);

    /* ---------- redraw scheduling ---------- */
    var MAIN = 1, WAVE = 2, KEYS = 4, dirty = 0, raf = 0;
    function invalidate(mask) {
      dirty |= mask;
      if (!raf) raf = requestAnimationFrame(flush);
    }
    function flush() {
      raf = 0;
      var d = dirty; dirty = 0;
      if (d & KEYS) keysCv.redraw();
      if (d & MAIN) mainCv.redraw();
      if (d & WAVE) waveCv.redraw();
    }

    /* ---------- text ---------- */
    function updateHead() {
      var k = Math.ceil(st.Nf - 1e-9);
      if (k < 1) { headLab.textContent = '还没有加入零点'; headAmp.textContent = ''; return; }
      headLab.textContent = '第 ' + k + ' 个零点　t = ' + Z[k - 1].toFixed(6);
      if (k === 1) headAmp.textContent = '振幅最大、起伏最慢的一个';
      else {
        var pct = RHO1 / Math.sqrt(0.25 + Z[k - 1] * Z[k - 1]) * 100;
        headAmp.textContent = '振幅约为第 1 个的 ' + (pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)) + '%';
      }
    }
    function updateReadout() {
      var n = st.N, x = fmtX(probe.x), f = formulaAt(n).toFixed(2);
      var lead = n > 0 ? '用了 ' + n + ' 个零点' : '还没有加入零点';
      var who = n > 0 ? '公式给出 ' : '光滑规律给出 ';
      var truth = probe.prime
        ? '真实值正从 ' + (probe.pi - 1) + ' 跳到 ' + probe.pi + '（公式取台阶的中点 ' + (probe.pi - 0.5).toFixed(1) + '）'
        : '真实值 π(' + x + ') = ' + probe.pi;
      ro.set(lead + GAP + 'x = ' + x + ' 处：' + who + f + '，' + truth);
    }
    function showTip() {
      var r = gMain(mainCv.w, mainCv.h), X = st.X;
      var xs = kit.lin(2, X, r.x0, r.x1), ys = kit.lin(0, YMAX[X], r.y1, r.y0);
      var n = st.N, f = formulaAt(st.Nf), rows = [];
      if (n > 0) rows.push({ value: f.toFixed(2), label: '公式（' + n + ' 个零点）', color: 'zero' });
      rows.push({ value: probe.smooth.toFixed(2), label: '光滑规律', color: 'smooth' });
      rows.push({ value: String(probe.pi), label: probe.prime ? '真实值，在这里刚跳上一级' : '真实值 π(x)', color: 'prime' });
      if (st.overWave && n > 0) rows.push({ value: signed(M.zeroWave(probe.x, Z[n - 1]), 3), label: '第 ' + n + ' 个零点的波', color: 'zero', kind: 'dot' });
      tip.show(xs(probe.x), Math.min(ys(f), ys(probe.pi)) - 4, { title: 'x = ' + fmtX(probe.x), rows: rows });
    }

    /* ---------- state changes ---------- */
    function setN(v) {
      v = Math.max(0, Math.min(NZ, Math.round(v)));
      st.N = v; st.Nf = v;
      slider.set(v, true);
      updateHead(); updateReadout();
      invalidate(MAIN | WAVE | KEYS);
      if (st.hover) showTip();
    }
    function setRange(X) {
      st.X = X;
      var x = probe.x;
      if (!(x <= X)) x = X / 2;
      setProbe(snap(x));
      updateReadout();
      invalidate(MAIN | WAVE);
    }

    /* ---------- play ---------- */
    function nAt(t) {
      if (t <= T_SLOW) {                                // one by one, each wave eased in
        var u = 10 * t / T_SLOW, k = Math.floor(u), f = u - k;
        return k + f * f * (3 - 2 * f);
      }
      var s = t - T_SLOW;
      return Math.min(NZ, 10 + (10 / T_SLOW) * s + 7.5 * s * s);
    }
    function tOf(n) {
      if (n <= 10) return n * T_SLOW / 10;
      var a = 7.5, b = 10 / T_SLOW, c = 10 - n;
      return T_SLOW + (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    }
    var animT = 0, pausedN = -1;
    var loop = kit.loop(L.stage, function (dt) {
      var j = active, t = animT + dt;
      if (j && !j.done && Math.ceil(nAt(t)) > j.ready) { schedule(); return; }   // wait for the numbers
      animT = t;
      var nf = nAt(t);
      if (t >= T_END || nf >= NZ) { stopPlay(); setN(NZ); return; }
      st.Nf = nf;
      var n = Math.ceil(nf - 1e-9);
      if (n !== st.N) { st.N = n; slider.set(n, true); updateHead(); updateReadout(); invalidate(KEYS | WAVE); }
      invalidate(MAIN);
      if (st.hover) showTip();
    });
    function stopPlay() {
      if (!loop.running) return;
      loop.stop();
      playBtn.textContent = '播放';
      pausedN = -1;
    }
    function togglePlay() {
      if (loop.running) {                                // pause: settle on a whole number of zeros
        var n = st.N;
        stopPlay(); setN(n); pausedN = n;
        return;
      }
      animT = (pausedN === st.N && st.N < NZ) ? tOf(st.N) : 0;   // resume after a pause, otherwise from the top
      if (animT === 0) setN(0);
      near = true;
      playBtn.textContent = '暂停';
      loop.start();
    }

    /* ---------- pointer: shared crosshair over both plots ---------- */
    kit.pointer(L.stage, {
      move: function (x, y) {
        var r = gMain(mainCv.w, mainCv.h);
        var xv = snap(kit.lin(2, st.X, r.x0, r.x1).inv(x));
        st.hover = true;
        st.overWave = y >= waveCv.el.offsetTop;
        if (xv !== probe.x) { setProbe(xv); updateReadout(); }
        invalidate(MAIN | WAVE);
        showTip();
      },
      leave: function () {
        if (!st.hover) return;
        st.hover = false; tip.hide();
        invalidate(MAIN | WAVE);
      }
    });

    /* ---------- pointer: the keyboard ---------- */
    function keyAt(x) {
      var r = gKeys(keysCv.w), t = kit.lin(0, TMAX, r.x0, r.x1).inv(x);
      if (t < Z[0] / 2) return 0;
      var lo = 0, hi = NZ - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (Z[mid] < t) lo = mid + 1; else hi = mid; }
      if (lo > 0 && t - Z[lo - 1] < Z[lo] - t) lo--;
      return lo + 1;
    }
    var keysDown = false;
    kit.pointer(keysCv.el, {
      down: function () { keysDown = true; stopPlay(); },
      up: function () { keysDown = false; },
      move: function (x) {
        var k = keyAt(x), r = gKeys(keysCv.w);
        if (keysDown && k !== st.N) setN(k);
        st.keyHover = k;
        invalidate(KEYS);
        var tx = k > 0 ? kit.lin(0, TMAX, r.x0, r.x1)(Z[k - 1]) : r.x0;
        keysTip.show(tx, keysCv.el.offsetTop + r.y0 - 2, k > 0
          ? { title: '第 ' + k + ' 个零点', rows: [{ value: 't = ' + Z[k - 1].toFixed(6), label: '', color: 'zero', kind: 'dot' }] }
          : { title: '不加入零点', rows: [{ value: '只画光滑规律', label: '', color: 'smooth' }] });
      },
      leave: function () {
        st.keyHover = -1; keysTip.hide();
        invalidate(KEYS);
      }
    });

    updateHead(); updateReadout();
    kit.whenNear(figureEl, function () { near = true; schedule(); });
  });
})();
