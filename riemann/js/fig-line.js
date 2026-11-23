/* fig-line.js — chapter 4, "why the zeros must sit on the line".
   offline  : the real part of a zero is a volume knob (one zero off the line outgrows every zero on it)
   envelope : |li(x) − π(x)| up to 10^29 against the bound the hypothesis allows */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;
  var fmt = kit.fmt;
  var LN10 = Math.LN10, TAU = Math.PI * 2;

  kit.css([
    '.offline-inset{display:flex;align-items:center;gap:.75rem;flex:0 0 auto;min-width:0}',
    '.offline-strip{position:relative;flex:none;width:148px}',
    '.offline-strip .cv{cursor:ew-resize}',
    '.offline-cap{font-size:var(--t-xs);line-height:1.55;color:var(--ink-3);max-width:7.5em}',
    '.offline-stage .cv,.envelope-stage .cv{cursor:crosshair}',
    /* tooltips of these two figures read as small tables: key, name, value (right-aligned) */
    '.offline-stage .tip,.envelope-stage .tip{max-width:none}',
    '.offline-stage .tip-row,.envelope-stage .tip-row{display:grid;grid-template-columns:18px auto 1fr;column-gap:.45rem;align-items:center}',
    '.offline-stage .tip-row>.lg-key,.envelope-stage .tip-row>.lg-key{grid-column:1;grid-row:1;justify-self:center}',
    '.offline-stage .tip-k,.envelope-stage .tip-k{grid-column:2;grid-row:1}',
    '.offline-stage .tip-v,.envelope-stage .tip-v{grid-column:3;grid-row:1;text-align:right;white-space:pre;padding-left:.5rem}',
    /* the x column stays put while the wide table scrolls sideways */
    '.envelope-table th:first-child,.envelope-table td:first-child{position:sticky;left:0;background:var(--surface);padding-right:.75rem}'
  ].join('\n'));

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* 4.6 × 10¹² */
  function sci(v, d) {
    var e = Math.floor(Math.log10(v)), m = (v / Math.pow(10, e)).toFixed(d);
    if (+m >= 10) { e += 1; m = (1).toFixed(d); }
    return m + ' × ' + fmt.pow10(e);
  }
  /* thousands separators for an exact digit string */
  function group(digits) { return String(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function seg(ctx, x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }

  /* ================================================================== offline */
  kit.mount('offline', function (body, kit, figureEl) {
    var L = kit.layout(body);
    L.note.remove();
    L.stage.classList.add('offline-stage');

    var G = D.zeros[0];                      // 14.134725…, the first zero
    var RHO0 = Math.sqrt(0.25 + G * G);      // |ρ| of the zero on the line
    var PH0 = Math.atan2(G, 0.5);
    var U0 = Math.log(10), U1 = Math.log(1e12);
    var B_MIN = 0.5, B_MAX = 0.75, B_STEP = 0.005;
    var beta = 0.6, hover = null, geom = null;
    function onLine() { return beta <= B_MIN + 1e-9; }

    /* ---- controls: strip schematic + slider ---- */
    var inset = kit.el('div', 'offline-inset');
    var strip = kit.el('div', 'offline-strip');
    inset.appendChild(strip);
    inset.appendChild(kit.el('span', 'offline-cap', '偏离的零点总是成对出现'));
    L.controls.appendChild(inset);
    var slider = kit.slider(L.controls, {
      id: 'offline-beta', label: '假想零点的实部', min: B_MIN, max: B_MAX, step: B_STEP, value: beta,
      format: function (v) { return v.toFixed(3); }
    });

    var insetGeom = null;
    var insetCv = kit.canvas(strip, {
      height: 88,
      label: '临界带示意图：实部从 0 到 1 的竖直带，中间是临界线。金色圆点是线上的零点；红色实心圆点是假想的线外零点，红色空心圆点是它关于临界线对称的伙伴。左右拖动可以改变实部。',
      draw: function (ctx, w, h) {
        var C = kit.colors();
        var sx = kit.lin(0, 1, 18, w - 18), top = 7, bot = h - 25, mid = Math.round((top + bot) / 2);
        var xl = Math.round(sx(0.5));
        insetGeom = { sx: sx };
        ctx.fillStyle = C.surface2;
        ctx.fillRect(sx(0), top, sx(1) - sx(0), bot - top);
        ctx.lineWidth = 1; ctx.strokeStyle = C.axis;
        seg(ctx, Math.round(sx(0)) + 0.5, top, Math.round(sx(0)) + 0.5, bot + 4);
        seg(ctx, Math.round(sx(1)) - 0.5, top, Math.round(sx(1)) - 0.5, bot + 4);
        ctx.lineWidth = 2; ctx.strokeStyle = C.zero;
        seg(ctx, xl, top - 3, xl, bot + 4);
        ctx.font = kit.font(11); ctx.fillStyle = C.ink3; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('0', sx(0), bot + 8);
        ctx.fillText('½', xl, bot + 8);
        ctx.fillText('1', sx(1), bot + 8);
        /* the well-behaved zeros on the line */
        kit.dot(ctx, xl, top + 11, 4, C.zero, C.surface2);
        kit.dot(ctx, xl, bot - 11, 4, C.zero, C.surface2);
        if (onLine()) { kit.dot(ctx, xl, mid, 4, C.zero, C.surface2); return; }
        /* the hypothetical zero and its mirror partner */
        var xa = sx(beta), xb = sx(1 - beta);
        ctx.lineWidth = 1; ctx.strokeStyle = kit.alpha(C.bad, 0.6);
        seg(ctx, xb, mid + 0.5, xa, mid + 0.5);
        ctx.beginPath(); ctx.arc(xb, mid + 0.5, 5.5, 0, TAU); ctx.fillStyle = C.surface2; ctx.fill();
        ctx.beginPath(); ctx.arc(xb, mid + 0.5, 3.5, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = C.bad; ctx.stroke();
        kit.dot(ctx, xa, mid + 0.5, 4, C.bad, C.surface2);
      }
    });
    function dragInset(x) {
      if (!insetGeom) return;
      var s = insetGeom.sx.inv(x);
      var b = clamp(B_MIN + Math.abs(s - 0.5), B_MIN, B_MAX);
      b = Math.round(b / B_STEP) * B_STEP;
      if (Math.abs(b - beta) > 1e-9) slider.set(+b.toFixed(3));
    }
    kit.pointer(insetCv.el, {
      down: function (x) { dragInset(x); },
      drag: function (dx, dy, x) { dragInset(x); }
    });

    /* ---- main chart ---- */
    var cv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 280 : 340; },
      label: '折线图：横轴是 x，从 10 到 10 的 12 次方，对数刻度；纵轴是零点贡献的波的高度，已除以线上零点的音量。线上零点的波始终在固定高度的带内振荡；假想的线外零点的波随 x 增大越来越高。',
      draw: draw
    });
    var tip = kit.tooltip(L.stage);
    var readout = kit.readout(body);
    body.insertBefore(readout, L.legend);
    kit.legend(L.legend, [
      { label: '线上的零点（实部 ½）', color: 'zero', kind: 'line' },
      { label: '假想的线外零点', color: 'bad', kind: 'line' }
    ]);

    /* both waves in units of the on-line zero's amplitude 2/|ρ| */
    function waveOn(u) { return -Math.cos(G * u - PH0); }
    function ampOff(u) { return RHO0 / Math.sqrt(beta * beta + G * G) * Math.exp((beta - 0.5) * u); }
    function waveOff(u) { return -ampOff(u) * Math.cos(G * u - Math.atan2(G, beta)); }

    /* "15.8", "1,000", "10¹⁰", "3.2 × 10⁷" for a ratio 10^e */
    function times(e) {
      var v = Math.pow(10, e);
      if (v < 99.95) return v.toFixed(1);
      if (v < 99999.5) return fmt.int(v);
      var k = Math.round(e);
      return Math.abs(e - k) < 1e-6 ? fmt.pow10(k) : sci(v, 1);
    }

    var bufN = 0, bx, by0, by1, bEnv;
    function draw(ctx, w, h) {
      var C = kit.colors(), narrow = w < 520, on = onLine();
      var r = { x0: narrow ? 38 : 46, y0: 34, x1: w - 16, y1: h - 44 };
      var pw = r.x1 - r.x0, half = (r.y1 - r.y0) / 2;
      var R = ampOff(U1);                                      // loudness ratio at x = 10^12
      var ymax = Math.max(3, R / (1 - 30 / half));             // head-room for the end label
      var xu = kit.lin(U0, U1, r.x0, r.x1), ys = kit.lin(-ymax, ymax, r.y1, r.y0);
      geom = { r: r, xu: xu, ys: ys };

      kit.frame(ctx, r, {
        xs: function (x) { return xu(Math.log(x)); }, ys: ys,
        xTicks: [10, 1e3, 1e6, 1e9, 1e12],
        yTicks: kit.ticks(-ymax, ymax, narrow ? 4 : 6),
        xFmt: function (v) { var k = Math.round(Math.log10(v)); return k === 1 ? '10' : fmt.pow10(k); },
        yFmt: function (v) { return (v < 0 ? '−' : '') + fmt.int(Math.abs(v)); },
        xLabel: 'x（对数刻度）',
        yLabel: narrow ? '波的高度（线上零点的振幅 = 1）' : '波的高度（以线上零点的振幅为 1）',
        yLabelDx: r.x0, grid: 'xy'
      });

      /* samples */
      var n = Math.max(8, Math.ceil(pw * 4));
      if (n !== bufN) { bufN = n; bx = new Float64Array(n); by0 = new Float64Array(n); by1 = new Float64Array(n); bEnv = new Float64Array(n); }
      var phB = Math.atan2(G, beta), aB = RHO0 / Math.sqrt(beta * beta + G * G), i, u, e;
      for (i = 0; i < n; i++) {
        u = U0 + (U1 - U0) * i / (n - 1);
        bx[i] = r.x0 + pw * i / (n - 1);
        by0[i] = ys(-Math.cos(G * u - PH0));
        if (!on) { e = aB * Math.exp((beta - 0.5) * u); bEnv[i] = e; by1[i] = ys(-e * Math.cos(G * u - phB)); }
      }

      ctx.save();
      ctx.beginPath(); ctx.rect(r.x0, r.y0 - 3, pw, r.y1 - r.y0 + 6); ctx.clip();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      /* the constant band of a zero on the line */
      ctx.fillStyle = kit.alpha(C.zero, 0.1);
      ctx.fillRect(r.x0, ys(1), pw, ys(-1) - ys(1));
      ctx.lineWidth = 1; ctx.strokeStyle = C.axis;
      seg(ctx, r.x0, Math.round(ys(0)) + 0.5, r.x1, Math.round(ys(0)) + 0.5);
      var cycle = pw / ((U1 - U0) * G / TAU);                   // px per oscillation
      var lw = cycle < 9 ? 1.5 : 2;
      if (!on) {
        /* growing envelope of the off-line zero */
        ctx.lineWidth = 1.25; ctx.strokeStyle = kit.alpha(C.bad, 0.75);
        ctx.beginPath();
        for (i = 0; i < n; i += 4) { var yt = ys(bEnv[i]); if (i) ctx.lineTo(bx[i], yt); else ctx.moveTo(bx[i], yt); }
        ctx.lineTo(bx[n - 1], ys(bEnv[n - 1]));
        ctx.stroke();
        ctx.beginPath();
        for (i = 0; i < n; i += 4) { var yb = ys(-bEnv[i]); if (i) ctx.lineTo(bx[i], yb); else ctx.moveTo(bx[i], yb); }
        ctx.lineTo(bx[n - 1], ys(-bEnv[n - 1]));
        ctx.stroke();
        ctx.lineWidth = lw; ctx.strokeStyle = C.bad;
        kit.polyline(ctx, bx, by1, n);
      }
      ctx.lineWidth = lw; ctx.strokeStyle = C.zero;
      kit.polyline(ctx, bx, by0, n);
      ctx.restore();

      /* crosshair */
      if (hover != null) {
        var hx = xu(hover);
        ctx.lineWidth = 1; ctx.strokeStyle = C.ink3;
        seg(ctx, Math.round(hx) + 0.5, r.y0, Math.round(hx) + 0.5, r.y1);
        if (!on) kit.dot(ctx, hx, ys(waveOff(hover)), 4, C.bad);
        kit.dot(ctx, hx, ys(waveOn(hover)), 4, C.zero);
      }

      /* the one number the figure is about */
      var txt = on ? '在线上：和其他零点一样响'
        : (narrow ? '' : 'x = ') + fmt.pow10(12) + ' 处：响 ' + times(12 * (beta - 0.5)) + ' 倍';
      kit.label(ctx, txt, r.x1 - 4, ys(on ? 1 : R) - 9, { align: 'right', baseline: 'bottom', color: C.ink, font: kit.font(12.5, 600) });
    }

    function update() {
      var b = beta.toFixed(3);
      readout.set(onLine()
        ? '实部 ' + b + '：在线上，和其他零点一样响，x 再大也不会变。'
        : '实部 ' + b + '：在 x = ' + fmt.pow10(12) + ' 处，它的波比线上的零点响 ' + times(12 * (beta - 0.5)) +
          ' 倍；到 x = ' + fmt.pow10(100) + '，响 ' + times(100 * (beta - 0.5)) + ' 倍。');
      insetCv.redraw();
      cv.redraw();
    }
    slider.on(function (v) { beta = v; hover = null; tip.hide(); update(); });

    function xText(u) {
      var e = u / LN10;
      return e < 4 ? fmt.int(Math.exp(u)) : sci(Math.exp(u), 1);
    }
    function signed(v, d) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d); }
    kit.pointer(cv.el, {
      move: function (x, y) {
        if (!geom) return;
        var r = geom.r;
        if (x < r.x0 - 12 || x > r.x1 + 12) { if (hover != null) { hover = null; tip.hide(); cv.redraw(); } return; }
        var px = clamp(x, r.x0, r.x1);
        hover = geom.xu.inv(px);
        cv.redraw();
        var on = onLine(), a = ampOff(hover), rows = [{ label: '线上的零点', value: signed(waveOn(hover), 2), color: 'zero', kind: 'line' }];
        if (!on) {
          rows.push({ label: '假想的线外零点', value: signed(waveOff(hover), a < 100 ? 2 : 0), color: 'bad', kind: 'line' });
          rows.push({ label: '此处的音量之比', value: times(Math.log10(a)) + ' 倍' });
        }
        tip.show(px, clamp(y, r.y0 + 40, r.y1), { title: 'x ≈ ' + xText(hover), rows: rows });
      },
      leave: function () { if (hover != null) { hover = null; tip.hide(); cv.redraw(); } }
    });

    update();
  });

  /* ================================================================== envelope */
  kit.mount('envelope', function (body, kit, figureEl) {
    var L = kit.layout(body);
    L.controls.remove();
    L.stage.classList.add('envelope-stage');

    var X_START = 2657;                                         // the bound is only claimed from here on
    function boundLog(X) { return X / 2 + Math.log10(X * LN10 / (8 * Math.PI)); }   // log10 of √x·ln x/8π at x = 10^X
    var P = D.piPow10.map(function (d) {
      var err = Math.abs(d.liMinusPi), bl = boundLog(d.k), ok = Math.pow(10, d.k) >= X_START;
      return { k: d.k, pi: d.pi, err: err, el: Math.log10(err), bound: Math.pow(10, bl), bl: bl, ok: ok, share: err / Math.pow(10, bl) };
    });
    var last = P[P.length - 1];
    var X0 = 0.5, X1 = last.k + 1, XS = Math.log10(X_START);
    var YTOP = Math.ceil(boundLog(X1));
    var dense = null;                                           // {x: log10 x, y: log10 |li − π|} for 10 ≤ x ≤ 10^7
    var sel = null, geom = null, sticky = false;

    /* ---- formats ---- */
    function xName(k) { return k === 1 ? '10' : fmt.pow10(k); }
    function approx(v) { return v < 100 ? v.toFixed(2) : v < 1e7 ? fmt.int(v) : sci(v, 2); }
    function pct(s) { var p = s * 100; return (p < 10 ? p.toFixed(2) : p.toFixed(1)) + '%'; }

    var cv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 320 : 420; },
      label: '双对数坐标图：横轴 x 从 10 到 10 的 ' + X1 + ' 次方，纵轴是质数个数与 li(x) 的差距。蓝色圆点是 x 取 10 的各次幂时的真实误差，金线是黎曼猜想允许的上限，圆点始终在金线下方。聚焦后可用左右方向键逐点查看。',
      draw: draw
    });
    cv.el.tabIndex = 0;
    var tip = kit.tooltip(L.stage);
    var readout = kit.readout(body);
    body.insertBefore(readout, L.legend);
    kit.legend(L.legend, [
      { label: '黎曼猜想允许的上限 √x·ln x / 8π', color: 'zero', kind: 'line' },
      { label: '真实误差 |li(x) − π(x)|，逐点计算到 ' + fmt.pow10(7), color: 'prime', kind: 'line' },
      { label: 'x = 10、100、…、' + fmt.pow10(last.k) + ' 处的精确值', color: 'prime', kind: 'dot' },
      { label: '如果误差和 x 本身一样大', color: 'ghost', kind: 'dash' }
    ]);
    L.note.textContent = '上限只对 x ≥ ' + fmt.int(X_START) + ' 成立，金线从那里画起（起点有一个小刻度）。更小的 x 处，真实误差可以略高于这条公式。';

    function draw(ctx, w, h) {
      var C = kit.colors(), narrow = w < 520;
      var r = { x0: 44, y0: 34, x1: w - 16, y1: h - 44 };
      var xs = kit.lin(X0, X1, r.x0, r.x1), ys = kit.lin(0, YTOP, r.y1, r.y0);
      geom = { r: r, xs: xs, ys: ys };
      var i, p;

      var xt = [1];
      for (i = 5; i <= X1; i += 5) xt.push(i);
      var yt = [];
      for (i = 0; i <= YTOP; i += 3) yt.push(i);
      kit.frame(ctx, r, {
        xs: xs, ys: ys, xTicks: xt, yTicks: yt,
        xFmt: xName, yFmt: function (k) { return k === 0 ? '1' : fmt.pow10(k); },
        xLabel: 'x（对数刻度）', yLabel: '误差 |li(x) − π(x)|（对数刻度）', yLabelDx: r.x0, grid: 'xy'
      });

      /* selection guide (under the marks) */
      if (sel != null) {
        p = P[sel];
        ctx.lineWidth = 1; ctx.strokeStyle = C.ink3;
        seg(ctx, Math.round(xs(p.k)) + 0.5, r.y0, Math.round(xs(p.k)) + 0.5, r.y1);
      }

      ctx.save();
      ctx.beginPath(); ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); ctx.clip();
      ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
      /* scale reference: error as large as x itself */
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.ghost; ctx.setLineDash([6, 5]);
      seg(ctx, xs(1), ys(1), xs(YTOP + 1), ys(YTOP + 1));
      ctx.setLineDash([]);
      /* the bound under RH, from x = 2657: the allowed zone as a wash, the bound itself as the line */
      var steps = Math.max(40, Math.ceil((r.x1 - r.x0) / 6)), X;
      function boundPath() {
        ctx.beginPath();
        for (i = 0; i <= steps; i++) {
          X = XS + (X1 - XS) * i / steps;
          if (i) ctx.lineTo(xs(X), ys(boundLog(X))); else ctx.moveTo(xs(X), ys(boundLog(X)));
        }
      }
      boundPath();
      ctx.lineTo(r.x1, r.y1); ctx.lineTo(xs(XS), r.y1); ctx.closePath();
      ctx.fillStyle = kit.alpha(C.zero, 0.08); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.zero; ctx.lineCap = 'round';
      boundPath();
      ctx.stroke();
      seg(ctx, xs(XS), ys(boundLog(XS)) - 6, xs(XS), ys(boundLog(XS)) + 6);
      /* the actual error, densely, for x ≤ 10^7 */
      if (dense) {
        var n = dense.x.length, px = new Float64Array(n), py = new Float64Array(n);
        for (i = 0; i < n; i++) { px[i] = xs(dense.x[i]); py[i] = ys(Math.max(0, dense.y[i])); }
        ctx.lineWidth = 1.5; ctx.strokeStyle = C.prime;
        kit.polyline(ctx, px, py, n);
      }
      ctx.restore();

      /* ---- direct labels ---- */
      var LH = 17, f = kit.font(12, 500), tw, j;
      function width(lines, font) { ctx.font = font; var m = 0; lines.forEach(function (s) { m = Math.max(m, ctx.measureText(s).width); }); return m; }
      function stack(lines, xr, bottom, o) {
        for (var q = 0; q < lines.length; q++) {
          kit.label(ctx, lines[q], xr, bottom - (lines.length - 1 - q) * LH, { align: 'right', baseline: 'bottom', color: o.color, font: o.font });
        }
      }

      /* (1) "as large as x": inside the empty triangle above the dashed line */
      var ghostOpts = [['如果误差和 x 本身一样大'], ['如果误差和 x', '本身一样大']], gPlaced = false;
      for (j = 0; j < ghostOpts.length && !gPlaced; j++) {
        tw = width(ghostOpts[j], f);
        for (var Xa = 11; Xa <= YTOP - 0.5; Xa += 0.5) {
          var gr = xs(Xa) - 10, gb = ys(Xa) - 2;
          if (gr - tw < r.x0 + 8) continue;
          if (gb - ghostOpts[j].length * LH < r.y0 + 2) break;
          stack(ghostOpts[j], gr, gb, { color: C.ink3, font: f });
          gPlaced = true; break;
        }
      }

      /* (2) the bound: in the wedge between the dashed line and the gold line */
      var fb = kit.font(12.5, 600);
      var boundOpts = [['黎曼猜想允许的上限  √x·ln x / 8π'], ['黎曼猜想允许的上限', '√x·ln x / 8π'], ['黎曼猜想的上限'], ['上限']], bPlaced = false;
      for (j = 0; j < boundOpts.length && !bPlaced; j++) {
        tw = width(boundOpts[j], fb);
        for (var Xb = 19; Xb <= X1 - 1; Xb += 0.5) {
          var br = xs(Xb) - 4, bb = ys(boundLog(Xb)) - 8, btop = bb - boundOpts[j].length * LH;
          if (btop < r.y0 + 2) break;
          if (br - tw - xs(ys.inv(btop)) < 12) continue;       // keep clear of the dashed line
          stack(boundOpts[j], br, bb, { color: C.ink, font: fb });
          bPlaced = true; break;
        }
      }

      /* (3) the last check-point: call-out in the empty corner below the dots */
      var call = [fmt.pow10(last.k) + '：真实误差约 ' + sci(last.err, 1), '上限 ' + sci(last.bound, 1)];
      tw = width(call, fb);
      var lx = Math.round(xs(last.k)) + 0.5, cr = Math.min(r.x1 - 2, lx + 8), ctop = ys(last.el) + 26;
      for (i = 0; i < P.length - 1; i++) {
        var dx = xs(P[i].k);
        if (dx >= cr - tw - 10) ctop = Math.max(ctop, ys(P[i].el) + 16);
      }
      ctop = Math.min(ctop, r.y1 - call.length * LH - 6);
      ctx.lineWidth = 1; ctx.strokeStyle = C.ink3;
      seg(ctx, lx, ys(last.bl), lx, ctop - 3);                  // measuring line: bound -> actual -> label
      kit.dot(ctx, xs(last.k), ys(last.bl), 4, C.zero);

      /* exact values at powers of ten */
      for (i = 0; i < P.length; i++) kit.dot(ctx, xs(P[i].k), ys(P[i].el), 4, C.prime);
      for (i = 0; i < call.length; i++) {
        kit.label(ctx, call[i], cr, ctop + i * LH, { align: 'right', baseline: 'top', color: C.ink, font: kit.font(12.5, 500) });
      }

      /* selection marks (on top) */
      if (sel != null) {
        p = P[sel];
        if (p.ok) kit.dot(ctx, xs(p.k), ys(p.bl), 4, C.zero);
        ctx.beginPath(); ctx.arc(xs(p.k), ys(p.el), 8, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
        ctx.beginPath(); ctx.arc(xs(p.k), ys(p.el), 6, 0, TAU); ctx.fillStyle = C.prime; ctx.fill();
        ctx.beginPath(); ctx.arc(xs(p.k), ys(p.el), 2.25, 0, TAU); ctx.fillStyle = C.surface; ctx.fill();
      }
    }

    /* ---- read-out, tooltip, selection ---- */
    var checked = P.filter(function (p) { return p.ok; });
    var worst = checked.reduce(function (a, b) { return b.share > a.share ? b : a; }, checked[0]);
    function restText() {
      return checked.length + ' 个检查点（x = ' + xName(checked[0].k) + ' … ' + xName(last.k) + '）：真实误差最多用掉上限的 ' +
        pct(worst.share) + '（x = ' + xName(worst.k) + '），在 ' + xName(last.k) + ' 处只用掉 ' + pct(last.share) + '。';
    }
    function selText(p) {
      var s = 'x = ' + xName(p.k) + '　　li(x) − π(x) ≈ ' + approx(p.err);
      return p.ok ? s + '　　上限 ≈ ' + approx(p.bound) + '　　只用掉上限的 ' + pct(p.share)
        : s + '　　上限从 x ≥ ' + fmt.int(X_START) + ' 起才成立';
    }
    function tipData(p, narrow) {
      var digits = group(p.pi);
      if (narrow && digits.length > 24) {                       // two lines on phones, split at a comma
        var cut = digits.indexOf(',', Math.floor(digits.length / 2) - 2);
        digits = digits.slice(0, cut + 1) + '\n' + digits.slice(cut + 1);
      }
      var rows = [
        { label: 'π(x)', value: digits },
        { label: 'li(x) − π(x)', value: '≈ ' + (p.err < 100 ? p.err.toFixed(2) : fmt.int(p.err)), color: 'prime', kind: 'dot' }
      ];
      if (p.ok) {
        rows.push({ label: '允许的上限', value: '≈ ' + approx(p.bound), color: 'zero', kind: 'line' });
        rows.push({ label: '只用掉上限的', value: pct(p.share) });
      } else {
        rows.push({ label: '上限从 x ≥ ' + fmt.int(X_START) + ' 起才成立', value: '' });
      }
      return { title: 'x = ' + xName(p.k), rows: rows };
    }
    function select(i, showTip) {
      if (i === sel && !showTip) return;
      sel = i;
      cv.redraw();
      if (i == null) { readout.set(restText()); tip.hide(); return; }
      readout.set(selText(P[i]));
      if (showTip && geom) tip.show(geom.xs(P[i].k), geom.ys(P[i].el) - 6, tipData(P[i], cv.w < 520));
      else tip.hide();
    }
    kit.pointer(cv.el, {
      move: function (x, y) {
        if (!geom) return;
        var r = geom.r;
        if (x < r.x0 - 14 || x > r.x1 + 14 || y < r.y0 - 20 || y > r.y1 + 30) { if (sel != null) select(null); return; }
        var k = Math.round(geom.xs.inv(x)), i = clamp(k - P[0].k, 0, P.length - 1);
        if (i !== sel) select(i, true);
      },
      up: function (e) { sticky = !!(e && e.pointerType && e.pointerType !== 'mouse'); },
      leave: function () {
        var keep = sticky; sticky = false;
        if (keep && sel != null) { tip.hide(); return; }         // touch: keep the last point in the read-out
        if (sel != null) select(null);
      }
    });
    cv.el.addEventListener('keydown', function (e) {
      var n = P.length, i;
      if (e.key === 'ArrowRight') i = sel == null ? n - 1 : Math.min(n - 1, sel + 1);
      else if (e.key === 'ArrowLeft') i = sel == null ? n - 1 : Math.max(0, sel - 1);
      else if (e.key === 'Escape') { select(null); return; }
      else return;
      e.preventDefault();
      select(i, true);
    });
    cv.el.addEventListener('blur', function () { if (sel != null) select(null); });
    readout.set(restText());

    /* ---- data table ---- */
    var det = kit.el('details', 'table-view');
    det.appendChild(kit.el('summary', null, '查看数据表'));
    var sc = kit.el('div', 'table-scroll'), tb = kit.el('table', 'data envelope-table');
    var thead = kit.el('thead'), hr = kit.el('tr');
    ['x', 'π(x)', 'li(x) − π(x)', '猜想允许的上限', '用掉上限的'].forEach(function (t) {
      var th = kit.el('th', null, t); th.scope = 'col'; hr.appendChild(th);
    });
    thead.appendChild(hr); tb.appendChild(thead);
    var tbody = kit.el('tbody');
    P.forEach(function (p) {
      var tr = kit.el('tr');
      [xName(p.k), group(p.pi), fmt.int(p.err), p.ok ? fmt.int(p.bound) : '—', p.ok ? pct(p.share) : '—'].forEach(function (t) {
        tr.appendChild(kit.el('td', null, t));
      });
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); sc.appendChild(tb); det.appendChild(sc);
    body.appendChild(det);

    /* ---- dense |li − π| for 10 ≤ x ≤ 10^7: segmented sieve in small time slices ---- */
    kit.whenNear(figureEl, function () {
      var LIMIT = 1e7, NS = 600, SEG = 1 << 16;
      var base = M.sieve(Math.ceil(Math.sqrt(LIMIT)));
      var sx = new Float64Array(NS), lx = new Float64Array(NS), ly = new Float64Array(NS), i;
      for (i = 0; i < NS; i++) { lx[i] = 1 + 6 * i / (NS - 1); sx[i] = Math.pow(10, lx[i]); }
      var flags = new Uint8Array(SEG), lo = 2, count = 0, si = 0;
      var now = (window.performance && performance.now) ? function () { return performance.now(); } : Date.now;
      function put(c) { ly[si] = Math.log10(Math.abs(M.li(sx[si]) - c)); si++; }
      function slice() {
        var t0 = now();
        while (lo <= LIMIT && now() - t0 < 10) {
          var hi = Math.min(lo + SEG - 1, LIMIT), j, p, m, n;
          flags.fill(0);
          for (j = 0; j < base.length; j++) {
            p = base[j];
            if (p * p > hi) break;
            for (m = Math.max(p * p, Math.ceil(lo / p) * p); m <= hi; m += p) flags[m - lo] = 1;
          }
          for (n = lo; n <= hi; n++) {
            while (si < NS && sx[si] < n) put(count);            // π(x) for n − 1 ≤ x < n
            if (!flags[n - lo]) count++;
          }
          lo = hi + 1;
        }
        if (lo <= LIMIT) { setTimeout(slice, 0); return; }
        while (si < NS) put(count);
        dense = { x: lx, y: ly };
        window.__lineDbg = { pi1e7: count, y: ly, x: lx };
        cv.redraw();
      }
      setTimeout(slice, 0);
    });
  });
})();
