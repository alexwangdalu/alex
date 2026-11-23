/* fig-spectra.js
   "evidence" — how many zeros have been verified to lie on the critical line, over time (log scale).
   "spectra"  — level repulsion: five "barcodes" from random to rigid, and the nearest-neighbour spacing
                histogram of the zeros against the GUE Wigner surmise and the Poisson law. */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;
  var fmt = kit.fmt;
  var TAU = 2 * Math.PI;

  /* ---------- small shared helpers ---------- */
  function overlap(a, b, pad) {
    pad = pad || 0;
    return a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;
  }
  /* snap a CSS-pixel coordinate to the device pixel grid (crisp thin marks) */
  function snap(v) { var d = Math.min(window.devicePixelRatio || 1, 2); return Math.round(v * d) / d; }
  function hline(ctx, x0, x1, y) { var p = Math.round(y) + 0.5; ctx.beginPath(); ctx.moveTo(x0, p); ctx.lineTo(x1, p); ctx.stroke(); }
  function vline(ctx, x, y0, y1) { var p = Math.round(x) + 0.5; ctx.beginPath(); ctx.moveTo(p, y0); ctx.lineTo(p, y1); ctx.stroke(); }
  /* Chinese magnitude of a count, and whether that short form is exact */
  function zhCount(n) {
    var u = n >= 1e12 ? 1e12 : n >= 1e8 ? 1e8 : n >= 1e4 ? 1e4 : 1;
    var v = +(n / u).toPrecision(3);
    return { text: fmt.zh(n), exact: v * u === n };
  }

  /* =====================================================================================
     evidence
     ===================================================================================== */
  kit.mount('evidence', function (body, kit) {
    kit.css(
      'table.evidence-table th.evidence-txt,table.evidence-table td.evidence-txt{text-align:left;font-family:var(--font-body)}' +
      'table.evidence-table td.evidence-note{white-space:normal;min-width:15em;color:var(--ink-3)}' +
      '.evidence-tipnote{white-space:normal;opacity:.72;margin-top:.2rem;max-width:14rem}'
    );

    var recs = ((RH.facts && RH.facts.verified) || [])
      .filter(function (d) { return d && isFinite(+d.year) && +d.n > 0; })
      .map(function (d) { return { year: +d.year, n: +d.n, who: d.who || '', note: d.note || '' }; })
      .sort(function (a, b) { return a.year - b.year || a.n - b.n; });

    var L = kit.layout(body);
    L.controls.remove();
    L.note.remove();
    if (!recs.length) {
      L.legend.remove();
      L.stage.appendChild(kit.el('p', 'fig-note', '暂时没有可以显示的数据。'));
      return;
    }

    var last = recs.length - 1, iMax = 0, iTuring = -1, iJump = -1, jumpBest = 0;
    recs.forEach(function (d, i) {
      if (d.n >= recs[iMax].n) iMax = i;
      if (iTuring < 0 && d.who.indexOf('图灵') >= 0) iTuring = i;
      if (i > 0 && Math.log(d.n / recs[i - 1].n) > jumpBest) { jumpBest = Math.log(d.n / recs[i - 1].n); iJump = i; }
    });
    var X0 = Math.min(1850, Math.floor(recs[0].year / 10) * 10);
    var X1 = Math.max(2030, Math.ceil(recs[last].year / 10) * 10);
    var KMAX = Math.max(14, 2 * Math.ceil(Math.log10(recs[iMax].n) / 2 - 1e-9));
    /* the record still stands today: carry the last step to the present year */
    var endYear = Math.min(X1, Math.max(recs[last].year, new Date().getFullYear()));

    var hot = -1, sel = -1, geom = null, lastType = 'mouse';

    function shortN(n) { return n < 1e5 ? fmt.int(n) : fmt.zh(n); }

    function draw(ctx, w, h) {
      var C = kit.colors(), narrow = w < 520;
      var r = { x0: narrow ? 36 : 46, x1: w - (narrow ? 46 : 58), y0: 36, y1: h - 46 };
      var xs = kit.lin(X0, X1, r.x0, r.x1), ys = kit.log(1, Math.pow(10, KMAX), r.y1, r.y0);
      var i, k, obstacles = [];
      var yTitle = narrow ? '零点个数' : '已验证的零点个数（对数刻度）';

      /* the electronic-computer era (from Turing's run onward) as a quiet band */
      if (iTuring >= 0) {
        var ex = Math.round(xs(recs[iTuring].year));
        ctx.fillStyle = kit.alpha(C.surface2, C.dark ? 0.5 : 0.6);
        ctx.fillRect(ex, r.y0, r.x1 - ex, r.y1 - r.y0);
        var eraText = '电子计算机时代';
        ctx.font = kit.font(11.5);
        var ew = ctx.measureText(eraText).width;
        if (ew + 14 < r.x1 - ex) {
          ctx.fillStyle = C.ink3; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
          ctx.fillText(eraText, r.x1 - 7, r.y1 - 7);
          obstacles.push({ x0: r.x1 - 7 - ew, x1: r.x1 - 7, y0: r.y1 - 22, y1: r.y1 - 5 });
        }
      }

      /* one hairline per decade ("每一格是十倍"); labels on every second one */
      ctx.lineWidth = 1;
      ctx.strokeStyle = kit.alpha(C.hair, 0.75);
      for (k = 1; k < KMAX; k += 2) hline(ctx, r.x0, r.x1, ys(Math.pow(10, k)));
      var yT = [], xT = [], xStep = narrow ? 50 : 25;
      for (k = 0; k <= KMAX; k += 2) yT.push(Math.pow(10, k));
      for (var yr = Math.ceil(X0 / xStep) * xStep; yr <= X1; yr += xStep) xT.push(yr);
      kit.frame(ctx, r, {
        xs: xs, ys: ys, xTicks: xT, yTicks: yT, xFmt: String,
        yFmt: function (v) { var kk = Math.round(Math.log10(v)); return kk === 0 ? '1' : fmt.pow10(kk); },
        xLabel: '年份', yLabel: yTitle, yLabelDx: r.x0 - 1
      });
      ctx.strokeStyle = C.axis;
      for (i = 0; i < xT.length; i++) vline(ctx, xs(xT[i]), r.y1, r.y1 + 4);
      /* the same scale read in Chinese units, on the right */
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      [[4, '一万'], [8, '一亿'], [12, '一万亿'], [16, '一亿亿']].forEach(function (u) {
        if (u[0] <= KMAX) ctx.fillText(u[1], r.x1 + 7, Math.round(ys(Math.pow(10, u[0]))) + 0.5);
      });
      ctx.font = kit.font(12);
      obstacles.push({ x0: 0, x1: ctx.measureText(yTitle).width + 6, y0: r.y0 - 28, y1: r.y0 - 8 });

      /* step line (steps-after) */
      var pts = recs.map(function (d) { return { x: xs(d.year), y: ys(d.n) }; });
      var xEnd = xs(endYear);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (i = 1; i < pts.length; i++) { ctx.lineTo(pts[i].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); }
      ctx.lineTo(xEnd, pts[last].y);
      ctx.strokeStyle = C.zero; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
      for (i = 0; i < pts.length; i++) {
        var nx = i < last ? pts[i + 1].x : xEnd;
        obstacles.push({ x0: pts[i].x, x1: nx, y0: pts[i].y - 3, y1: pts[i].y + 3 });
        if (i < last) obstacles.push({ x0: nx - 3, x1: nx + 3, y0: Math.min(pts[i].y, pts[i + 1].y), y1: Math.max(pts[i].y, pts[i + 1].y) });
        obstacles.push({ x0: pts[i].x - 7, x1: pts[i].x + 7, y0: pts[i].y - 7, y1: pts[i].y + 7 });
      }

      /* hovered / selected record: guides to both axes */
      var cur = hot >= 0 ? hot : sel;
      if (cur >= 0) {
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        hline(ctx, r.x0, pts[cur].x, pts[cur].y);
        vline(ctx, pts[cur].x, pts[cur].y, r.y1);
      }
      for (i = 0; i < pts.length; i++) if (i !== cur) kit.dot(ctx, pts[i].x, pts[i].y, 4, C.zero);

      /* landmark labels: first, largest, Turing, the biggest single leap, then the record farthest from those */
      var maxLabels = Math.min(recs.length, narrow ? 3 : 5), order = [0];
      [iMax, iTuring, iJump].forEach(function (c) { if (c >= 0 && order.indexOf(c) < 0 && order.length < maxLabels) order.push(c); });
      while (order.length < maxLabels) {
        var best = -1, bd = -1;
        for (i = 0; i < pts.length; i++) {
          if (order.indexOf(i) >= 0) continue;
          var dm = Infinity;
          for (k = 0; k < order.length; k++) dm = Math.min(dm, Math.hypot(pts[i].x - pts[order[k]].x, pts[i].y - pts[order[k]].y));
          if (dm > bd) { bd = dm; best = i; }
        }
        if (best < 0) break;
        order.push(best);
      }

      var fA = kit.font(12, 500), fB = kit.font(12, 700), LH = 16, GAPX = 6;
      var placed = [];
      function free(box) {
        if (box.x0 < r.x0 + 3 || box.x1 > r.x1 - 3 || box.y0 < r.y0 - 14 || box.y1 > r.y1 - 3) return false;
        var q;
        for (q = 0; q < obstacles.length; q++) if (overlap(box, obstacles[q], 1)) return false;
        for (q = 0; q < placed.length; q++) if (overlap(box, placed[q], 5)) return false;
        return true;
      }
      order.forEach(function (idx) {
        var d = recs[idx], p = pts[idx];
        var a = d.year + ' ' + d.who, b = shortN(d.n);
        ctx.font = fA; var wa = ctx.measureText(a).width;
        ctx.font = fB; var wb = ctx.measureText(b).width;
        var shapes = [{ two: false, w: wa + GAPX + wb, h: LH }, { two: true, w: Math.max(wa, wb), h: LH * 2 }];
        var offs = [8, 20, 34, 50, 66], sides = ['NW', 'SE', 'NE', 'SW'], found = null;
        for (var oi = 0; oi < offs.length && !found; oi++) {
          for (var si = 0; si < sides.length && !found; si++) {
            for (var hi = 0; hi < shapes.length && !found; hi++) {
              var s = sides[si], off = offs[oi], sh = shapes[hi];
              var bx0 = s.charAt(1) === 'W' ? p.x - 7 - sh.w : p.x + 7;
              var by0 = s.charAt(0) === 'N' ? p.y - off - sh.h : p.y + off;
              var box = { x0: bx0, x1: bx0 + sh.w, y0: by0, y1: by0 + sh.h, side: s, off: off, two: sh.two };
              if (free(box)) found = box;
            }
          }
        }
        if (!found) return;
        placed.push(found);
        var west = found.side.charAt(1) === 'W', north = found.side.charAt(0) === 'N';
        if (found.off > 12) {   // leader for labels that had to move away from their dot
          var cx = west ? found.x1 - 2 : found.x0 + 2, cy = north ? found.y1 + 1 : found.y0 - 1;
          var len = Math.hypot(cx - p.x, cy - p.y) || 1;
          ctx.strokeStyle = C.ink3; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x + (cx - p.x) / len * 7, p.y + (cy - p.y) / len * 7); ctx.lineTo(cx, cy); ctx.stroke();
        }
        var al = west ? 'right' : 'left', ax = west ? found.x1 : found.x0, y1c = found.y0 + LH / 2;
        if (found.two) {
          kit.label(ctx, a, ax, y1c, { font: fA, color: C.ink2, align: al });
          kit.label(ctx, b, ax, y1c + LH, { font: fB, color: C.ink, align: al });
        } else if (west) {
          kit.label(ctx, b, ax, y1c, { font: fB, color: C.ink, align: 'right' });
          kit.label(ctx, a, ax - wb - GAPX, y1c, { font: fA, color: C.ink2, align: 'right' });
        } else {
          kit.label(ctx, a, ax, y1c, { font: fA, color: C.ink2, align: 'left' });
          kit.label(ctx, b, ax + wa + GAPX, y1c, { font: fB, color: C.ink, align: 'left' });
        }
      });

      /* context for the empty decades on the left: the conjecture itself dates from 1859 */
      if (!narrow && recs[0].year >= 1875 && X0 <= 1859) {
        var rx = xs(1859), rText = '1859 黎曼提出猜想';
        ctx.font = kit.font(11.5);
        var rBox = { x0: rx + 6, x1: rx + 6 + ctx.measureText(rText).width, y0: r.y1 - 22, y1: r.y1 - 4 };
        if (free(rBox)) {
          ctx.strokeStyle = C.axis; ctx.lineWidth = 1; vline(ctx, rx, r.y1 - 20, r.y1);
          ctx.fillStyle = C.ink3; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillText(rText, rBox.x0, r.y1 - 7);
        }
      }

      if (cur >= 0) {
        ctx.beginPath(); ctx.arc(pts[cur].x, pts[cur].y, 9, 0, TAU); ctx.fillStyle = kit.alpha(C.zero, 0.22); ctx.fill();
        kit.dot(ctx, pts[cur].x, pts[cur].y, 5, C.zero);
      }
      geom = { pts: pts, r: r };
    }

    var cv = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 300 : 380; },
      label: '阶梯图：' + recs[0].year + ' 年到 ' + recs[last].year + ' 年，被验证落在临界线上的零点个数从 ' +
        shortN(recs[0].n) + ' 个增加到 ' + shortN(recs[iMax].n) + ' 个。纵轴是对数刻度。',
      draw: draw
    });
    var tip = kit.tooltip(L.stage);

    kit.legend(L.legend, [
      { label: '已验证落在临界线上的零点个数', color: 'zero', kind: 'line' },
      { label: '每个圆点是一次新纪录', color: 'zero', kind: 'dot' }
    ]);
    var read = kit.readout(body);
    function setReadout() {
      var d = recs[hot >= 0 ? hot : sel >= 0 ? sel : iMax];
      read.set(d.year + ' 年　' + d.who + '　前 ' + fmt.int(d.n) + ' 个零点全部落在临界线上' + (d.note ? '　·　' + d.note : ''));
    }
    setReadout();

    function showTip(i) {
      var d = recs[i], p = geom.pts[i], z = zhCount(d.n);
      var x = p.x, y = p.y - 6;
      tip.show(x, y, {
        title: d.year + ' 年 · ' + d.who,
        rows: [{ value: fmt.int(d.n), label: '个零点' + (d.n >= 1e5 ? '（' + (z.exact ? '' : '约 ') + z.text + '）' : ''), color: 'zero', kind: 'dot' }]
      });
      if (!d.note) return;
      var t = L.stage.querySelector('.tip');
      if (!t) return;
      t.appendChild(kit.el('div', 'evidence-tipnote', d.note));
      /* the note changed the box: place it again with the kit's own rule */
      var sw = L.stage.clientWidth, tw = t.offsetWidth, th = t.offsetHeight;
      var left = x + 14, top = y - th - 10;
      if (left + tw > sw - 4) left = x - tw - 14;
      if (left < 4) left = 4;
      if (top < 4) top = y + 16;
      t.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
    }

    kit.pointer(cv.el, {
      move: function (x, y, ev) {
        if (!geom) return;
        if (ev && ev.pointerType) lastType = ev.pointerType;
        var best = -1, bd = 26 * 26;
        geom.pts.forEach(function (p, i) {
          var dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
          if (dd < bd) { bd = dd; best = i; }
        });
        if (best !== hot) {
          hot = best;
          if (best >= 0) sel = best;
          else if (lastType === 'mouse') sel = -1;
          cv.redraw(); setReadout();
        }
        if (hot >= 0) showTip(hot); else tip.hide();
      },
      leave: function () {
        tip.hide();
        var keep = lastType !== 'mouse';   // after a tap, the chosen record stays in the read-out
        if (hot !== -1 || (!keep && sel !== -1)) { hot = -1; if (!keep) sel = -1; cv.redraw(); setReadout(); }
      }
    });

    /* data table twin */
    var det = kit.el('details', 'table-view');
    det.appendChild(kit.el('summary', null, '查看数据表'));
    var sc = kit.el('div', 'table-scroll'), tb = kit.el('table', 'data evidence-table');
    var thead = kit.el('thead'), trh = kit.el('tr');
    [['年份', ''], ['验证者', 'evidence-txt'], ['零点个数', ''], ['备注', 'evidence-txt']].forEach(function (c) {
      var th = kit.el('th', c[1], c[0]); th.setAttribute('scope', 'col'); trh.appendChild(th);
    });
    thead.appendChild(trh); tb.appendChild(thead);
    var tbody = kit.el('tbody');
    recs.forEach(function (d) {
      var tr = kit.el('tr');
      tr.appendChild(kit.el('td', null, String(d.year)));
      tr.appendChild(kit.el('td', 'evidence-txt', d.who));
      tr.appendChild(kit.el('td', null, fmt.int(d.n)));
      tr.appendChild(kit.el('td', 'evidence-txt evidence-note', d.note || '—'));
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody); sc.appendChild(tb); det.appendChild(sc); body.appendChild(det);
  });

  /* =====================================================================================
     spectra
     ===================================================================================== */
  kit.mount('spectra', function (body, kit) {
    kit.css('.spectra-b{display:grid;row-gap:.85rem;min-width:0;margin-top:.35rem;padding-top:1.1rem;border-top:1px solid var(--hair)}.spectra-b>*{min-width:0}');

    /* ---------- data ---------- */
    var zs = D.allZeros(), NZ = zs.length, i;
    var wU = new Float64Array(NZ);                 // unfolded zeros: mean spacing 1
    for (i = 0; i < NZ; i++) wU[i] = zs[i] / TAU * Math.log(zs[i] / (TAU * Math.E)) + 0.875;
    var del = new Float64Array(Math.max(0, NZ - 1));
    for (i = 0; i < NZ - 1; i++) del[i] = wU[i + 1] - wU[i];

    var SPAN = 60, BINS = 30, XMAX = 3, BW = XMAX / BINS;
    function gue(s) { return 32 / (Math.PI * Math.PI) * s * s * Math.exp(-4 * s * s / Math.PI); }
    function simpson(f, a, b) { var n = 8, hh = (b - a) / n, s = 0; for (var j = 0; j <= n; j++) s += f(a + j * hh) * (j === 0 || j === n ? 1 : (j & 1) ? 4 : 2); return s * hh / 3; }
    var gueBin = [], poiBin = [];
    for (i = 0; i < BINS; i++) {
      gueBin.push(simpson(gue, i * BW, (i + 1) * BW) / BW);
      poiBin.push((Math.exp(-i * BW) - Math.exp(-(i + 1) * BW)) / BW);
    }

    /* row 1: uniform random points, fixed seed */
    function mulberry(seed) {
      return function () {
        seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    var rnd = mulberry(1859), rowRandom = [];
    for (i = 0; i < SPAN; i++) rowRandom.push(rnd() * SPAN);
    rowRandom.sort(function (a, b) { return a - b; });

    /* row 2: primes just above 10^6, rescaled by ln(10^6) (segmented sieve, < 1 ms) */
    var P0 = 1e6, LNP = Math.log(P0), PW = Math.ceil(SPAN * LNP), comp = new Uint8Array(PW + 1), rowPrimes = [];
    M.sieve(Math.ceil(Math.sqrt(P0 + PW)) + 1).forEach(function (p) {
      for (var m = Math.ceil(P0 / p) * p; m <= P0 + PW; m += p) comp[m - P0] = 1;
    });
    for (i = 0; i <= PW; i++) if (!comp[i] && i / LNP <= SPAN) rowPrimes.push(i / LNP);

    /* row 3: consecutive unfolded zeros */
    var zStart = Math.max(0, Math.min(2000, NZ - SPAN - 1)), rowZeros = [];
    for (i = zStart; i < NZ; i++) { var v = wU[i] - wU[zStart] + 0.5; if (v > SPAN) break; rowZeros.push(v); }

    /* row 4: unfolded GUE eigenvalues */
    var rowGue = [];
    (D.gueStrip || []).forEach(function (g) { if (g + 0.5 <= SPAN) rowGue.push(g + 0.5); });

    /* row 5: picket fence */
    var rowFence = [];
    for (i = 0; i < SPAN; i++) rowFence.push(i + 0.5);

    var rows = [
      { name: '完全随机的点', sub: '时而扎堆，时而留空', pts: rowRandom, color: 'ghost' },
      { name: '质数', sub: '100 万附近，疏密无常', pts: rowPrimes, color: 'ink2' },
      { name: '黎曼零点', sub: '第 ' + fmt.int(zStart + 1) + ' 个起，彼此排斥', pts: rowZeros, color: 'zero' },
      { name: '随机矩阵的本征值', sub: '同样彼此排斥', pts: rowGue, color: 'rmt' },
      { name: '等间距', sub: '完全规则', pts: rowFence, color: 'ghost' }
    ];

    /* ---------- part A: barcodes ---------- */
    var SH = 30, GAP_SIDE = 16, GAP_STACK = 10, LBL = 22;
    function isSide(w) { return w >= 640; }
    var stageA = kit.el('div', 'stage');
    body.appendChild(stageA);
    kit.canvas(stageA, {
      height: function (w) {
        return isSide(w) ? 8 + rows.length * SH + (rows.length - 1) * GAP_SIDE + 12 + 44
          : 2 + rows.length * (LBL + SH) + (rows.length - 1) * GAP_STACK + 12 + 44;
      },
      label: '五条“谱线”自上而下并排比较：完全随机的点、100 万附近的质数、黎曼零点、随机矩阵的本征值、等间距。每条约 60 根线，平均间距都调成 1。黎曼零点和随机矩阵本征值的疏密最为相像：都很少贴在一起。',
      draw: function (ctx, w, h) {
        var C = kit.colors(), side = isSide(w), k;
        var fName = kit.font(13, 500), fSub = kit.font(11.5);
        var labW = 0;
        if (side) {
          rows.forEach(function (row) {
            ctx.font = fName; labW = Math.max(labW, ctx.measureText(row.name).width);
            ctx.font = fSub; labW = Math.max(labW, ctx.measureText(row.sub).width);
          });
          labW = Math.ceil(labW) + 22;
        }
        var x0 = side ? labW : 4, x1 = w - 11;
        var xs = kit.lin(0, SPAN, x0, x1), top = 0;
        rows.forEach(function (row, ri) {
          top = side ? 8 + ri * (SH + GAP_SIDE) : 2 + ri * (LBL + SH + GAP_STACK) + LBL;
          ctx.fillStyle = kit.alpha(C.surface2, C.dark ? 0.55 : 0.6);
          ctx.fillRect(x0 - 4, top, x1 - x0 + 8, SH);
          ctx.fillStyle = C[row.color];
          for (k = 0; k < row.pts.length; k++) ctx.fillRect(snap(xs(row.pts[k]) - 0.75), top, 1.5, SH);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          if (side) {
            ctx.font = fName; ctx.fillStyle = C.ink; ctx.fillText(row.name, 0, top + 9);
            ctx.font = fSub; ctx.fillStyle = C.ink3; ctx.fillText(row.sub, 0, top + 24);
          } else {
            ctx.font = fName; ctx.fillStyle = C.ink; ctx.fillText(row.name, x0 - 4, top - 11);
            var nw = ctx.measureText(row.name).width;
            ctx.font = fSub; ctx.fillStyle = C.ink3; ctx.fillText(row.sub, x0 - 4 + nw + 10, top - 10.5);
          }
        });
        var ay = top + SH + 12, tk = [];
        for (k = 0; k <= SPAN; k += side ? 10 : 20) tk.push(k);
        kit.frame(ctx, { x0: x0, x1: x1, y0: 0, y1: ay }, { xs: xs, xTicks: tk, grid: 'none', xLabel: '位置（平均间距 = 1）' });
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        for (k = 0; k < tk.length; k++) vline(ctx, xs(tk[k]), ay - 4, ay);
      }
    });

    /* ---------- part B: spacing histogram ---------- */
    var partB = kit.el('div', 'spectra-b');
    body.appendChild(partB);
    var L = kit.layout(partB);
    L.note.remove();

    var NMIN = 100, NMAX = Math.max(NMIN, Math.floor(NZ / 100) * 100);
    /* a fixed y-range that fits every slider position, so the axis never jumps */
    var yTop = 1.5;
    (function () {
      var cnt = new Uint32Array(BINS), mx = 0;
      for (var j = 0; j < NZ - 1; j++) {
        var b = Math.floor(del[j] / BW);
        if (b >= 0 && b < BINS) cnt[b]++;
        if ((j + 2) % 100 === 0) { var m = 0; for (var q = 0; q < BINS; q++) if (cnt[q] > m) m = cnt[q]; mx = Math.max(mx, m / ((j + 1) * BW)); }
      }
      /* bars may poke up to 0.1 above the top gridline (there is head-room); beyond that the range grows */
      if (mx > yTop + 0.1) yTop = Math.ceil(mx * 4 - 1e-9) / 4;
    })();

    var st = { N: NMAX, dens: new Float64Array(BINS), cnt: new Uint32Array(BINS), total: 0, small: 0, mean: 0 };
    function compute(N) {
      N = Math.max(2, Math.min(NZ, Math.round(N)));
      var c = N - 1, cnt = new Uint32Array(BINS), small = 0, sum = 0;
      for (var j = 0; j < c; j++) {
        var d = del[j]; sum += d;
        if (d < 0.25) small++;
        var b = Math.floor(d / BW);
        if (b >= 0 && b < BINS) cnt[b]++;
      }
      st.N = N; st.cnt = cnt; st.total = c; st.small = small; st.mean = sum / c;
      for (j = 0; j < BINS; j++) st.dens[j] = cnt[j] / (c * BW);
    }
    compute(NMAX);

    var hotBin = -1, hg = null;

    function barPath(ctx, x, y, bw, bh, rad) {
      rad = Math.max(0, Math.min(rad, bw / 2, bh));
      ctx.beginPath();
      ctx.moveTo(x, y + bh); ctx.lineTo(x, y + rad);
      ctx.arcTo(x, y, x + rad, y, rad); ctx.lineTo(x + bw - rad, y);
      ctx.arcTo(x + bw, y, x + bw, y + rad, rad); ctx.lineTo(x + bw, y + bh);
      ctx.closePath();
    }

    function drawHist(ctx, w, h) {
      var C = kit.colors(), narrow = w < 520, k;
      var r = { x0: 34, x1: w - 12, y0: 32, y1: h - 46 };
      var xs = kit.lin(0, XMAX, r.x0, r.x1), ys = kit.lin(0, yTop, r.y1, r.y0);
      var xT = [], yT = [];
      for (k = 0; k <= XMAX + 1e-9; k += narrow ? 1 : 0.5) xT.push(k);
      for (k = 0; k <= yTop + 1e-9; k += 0.5) yT.push(k);

      /* the share of spacings below 1/4 that uncorrelated points would have */
      var qx = xs(0.25), n, s;
      ctx.beginPath(); ctx.moveTo(xs(0), r.y1);
      for (n = 0; n <= 20; n++) { s = 0.25 * n / 20; ctx.lineTo(xs(s), ys(Math.exp(-s))); }
      ctx.lineTo(qx, r.y1); ctx.closePath();
      ctx.fillStyle = kit.alpha(C.ghost, C.dark ? 0.3 : 0.22); ctx.fill();

      kit.frame(ctx, r, {
        xs: xs, ys: ys, xTicks: xT, yTicks: yT,
        xFmt: function (v) { return v % 1 ? v.toFixed(1) : String(v); },
        yFmt: function (v) { return v === 0 ? '0' : v.toFixed(1); },
        xLabel: '相邻间距（平均间距 = 1）', yLabel: '密度', yLabelDx: r.x0 - 1
      });
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      for (k = 0; k < xT.length; k++) vline(ctx, xs(xT[k]), r.y1, r.y1 + 4);
      vline(ctx, qx, r.y1, r.y1 + 4);
      ctx.font = kit.font(11.5); ctx.fillStyle = C.ink3; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('¼', Math.round(qx) + 0.5, r.y1 + 8);

      /* bars */
      for (k = 0; k < BINS; k++) {
        var bx0 = Math.round(xs(k * BW)) + 1, bx1 = Math.round(xs((k + 1) * BW)) - 1;
        var by = ys(st.dens[k]);
        if (r.y1 - by < 0.5) continue;
        barPath(ctx, bx0, by, Math.max(1, bx1 - bx0), r.y1 - by, 4);
        ctx.fillStyle = hotBin >= 0 && hotBin !== k ? kit.alpha(C.zero, 0.5) : C.zero;
        ctx.fill();
      }
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1; hline(ctx, r.x0, r.x1, r.y1);

      /* curves */
      var px = [], pg = [], pp = [], cnt = Math.max(60, Math.round(r.x1 - r.x0));
      for (n = 0; n <= cnt; n++) { s = XMAX * n / cnt; px.push(xs(s)); pg.push(ys(gue(s))); pp.push(ys(Math.exp(-s))); }
      ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
      ctx.strokeStyle = kit.alpha(C.surface, 0.6); ctx.lineWidth = 4; kit.polyline(ctx, px, pp);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = C.ghost; ctx.lineWidth = 1.5; kit.polyline(ctx, px, pp); ctx.setLineDash([]);
      ctx.strokeStyle = kit.alpha(C.surface, 0.75); ctx.lineWidth = 5; kit.polyline(ctx, px, pg);
      ctx.lineCap = 'round'; ctx.strokeStyle = C.rmt; ctx.lineWidth = 2; kit.polyline(ctx, px, pg);

      if (qx - xs(0) >= 46) kit.label(ctx, '22%', (xs(0) + qx) / 2, ys(0.42), { font: kit.mono(12, 500), align: 'center', color: C.ink2 });

      /* direct labels with short leaders */
      function tag(text, sa, ya, dx, dy) {
        var ax = xs(sa), ay = ys(ya);
        ctx.font = kit.font(12, 500);
        var tw = ctx.measureText(text).width, lx = ax + dx, ly = ay + dy;
        if (lx + tw > r.x1 - 2) lx = r.x1 - 2 - tw;
        var ex = Math.max(lx + 4, Math.min(ax + dx, lx + tw - 4)) , ey = ly + 9;
        ctx.strokeStyle = C.ink3; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax + (ex - ax) * 0.18, ay + (ey - ay) * 0.18); ctx.lineTo(ex, ey); ctx.stroke();
        kit.label(ctx, text, lx, ly, { align: 'left' });
      }
      tag('随机矩阵理论（GUE）', 1.3, gue(1.3), 24, -30);
      tag('互不相关的随机点', 2.1, Math.exp(-2.1), 18, -30);

      if (hotBin >= 0) {   // marker of the GUE value for the hovered bin
        kit.dot(ctx, xs((hotBin + 0.5) * BW), ys(gueBin[hotBin]), 4, C.rmt);
      }
      hg = { r: r, xs: xs, ys: ys };
    }

    var slider = kit.slider(L.controls, {
      id: 'spectra-n', label: '使用前多少个零点', min: NMIN, max: NMAX, step: 100, value: NMAX,
      format: function (v) { return fmt.int(v) + ' 个'; }
    });
    var cvB = kit.canvas(L.stage, {
      height: function (w) { return w < 520 ? 260 : 320; },
      label: '直方图：黎曼零点相邻间距的分布（平均间距为 1）。柱形紧贴随机矩阵理论的曲线，在间距接近 0 处几乎为零；互不相关的随机点则会在 0 附近最多。',
      draw: drawHist
    });
    var tip = kit.tooltip(L.stage);
    kit.legend(L.legend, [
      { label: '黎曼零点的间距', color: 'zero', kind: 'rect' },
      { label: '随机矩阵理论（GUE）', color: 'rmt', kind: 'line' },
      { label: '互不相关的随机点', color: 'ghost', kind: 'dash' }
    ]);
    var read = kit.readout(partB);
    function setReadout() {
      var share = st.small / st.total * 100, poi = Math.round((1 - Math.exp(-0.25)) * 100);
      read.set('前 ' + fmt.int(st.N) + ' 个零点：' +
        (st.small === 0 ? '没有哪一对的间距小于平均值的 1/4' : '间距小于平均值 1/4 的只占 ' + share.toFixed(1) + '%') +
        '；如果零点互不相关，应当有 ' + poi + '%。');
    }
    setReadout();

    function showTip(b) {
      var x = hg.xs((b + 0.5) * BW), y = hg.ys(Math.max(st.dens[b], gueBin[b]));
      tip.show(x, y, {
        title: '间距 ' + (b * BW).toFixed(1) + ' – ' + ((b + 1) * BW).toFixed(1),
        rows: [
          { value: st.dens[b].toFixed(2), label: '零点（' + fmt.int(st.cnt[b]) + ' 个间距）', color: 'zero', kind: 'rect' },
          { value: gueBin[b].toFixed(2), label: '随机矩阵理论', color: 'rmt', kind: 'line' },
          { value: poiBin[b].toFixed(2), label: '互不相关的随机点', color: 'ghost', kind: 'dash' }
        ]
      });
    }
    slider.on(function (v) {
      compute(v); setReadout(); cvB.redraw();
      if (hotBin >= 0) showTip(hotBin);
    });
    kit.pointer(cvB.el, {
      move: function (x, y) {
        if (!hg) return;
        var b = -1;
        if (x >= hg.r.x0 && x <= hg.r.x1 && y >= hg.r.y0 - 6 && y <= hg.r.y1 + 24) b = Math.max(0, Math.min(BINS - 1, Math.floor(hg.xs.inv(x) / BW)));
        if (b !== hotBin) { hotBin = b; cvB.redraw(); }
        if (b >= 0) showTip(b); else tip.hide();
      },
      leave: function () { tip.hide(); if (hotBin !== -1) { hotBin = -1; cvB.redraw(); } }
    });

    /* exposed for numeric checks */
    kit._spectra = { state: st, gue: gue, gueBin: gueBin, rows: rows, yTop: yTop };
  });
})();
