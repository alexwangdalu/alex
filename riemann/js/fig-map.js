/* map: domain colouring of zeta(s). Hue = direction (argument), brightness = size; zeros are dark pinwheels. */
(function () {
  'use strict';
  var RH = window.RH, kit = RH.kit, M = RH.math, D = RH.data;

  /* 360-entry hue wheel in OKLCH (even lightness), as linear-ish sRGB 0..255 */
  var LUT = new Float32Array(360 * 3);
  (function () {
    function gam(u) { u = Math.max(0, Math.min(1, u)); return u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055; }
    for (var h = 0; h < 360; h++) {
      var L = 0.76, C = 0.125, a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180);
      var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
      LUT[h * 3] = 255 * gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
      LUT[h * 3 + 1] = 255 * gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
      LUT[h * 3 + 2] = 255 * gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
    }
  })();
  function shade(re, im, out, o) {
    var m = Math.sqrt(re * re + im * im);
    var h = Math.atan2(im, re) * 57.29577951; if (h < 0) h += 360;
    var hi = (h | 0) % 360, ln = Math.log(m + 1e-12), v = 0.5 + Math.atan(0.6 * ln) / Math.PI;
    var lg = ln * 1.4427; lg -= Math.floor(lg);
    var k = (0.08 + 1.0 * v) * (0.965 + 0.07 * lg);
    var r = LUT[hi * 3] * k, g = LUT[hi * 3 + 1] * k, b = LUT[hi * 3 + 2] * k;
    out[o] = r > 255 ? 255 : r; out[o + 1] = g > 255 ? 255 : g; out[o + 2] = b > 255 ? 255 : b; out[o + 3] = 255;
  }

  kit.mount('map', function (body) {
    kit.css(
      '.map-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:1.25rem}' +
      '@media (min-width:52rem){.map-grid{grid-template-columns:minmax(0,460px) minmax(0,1fr);gap:2.25rem;align-items:start}}' +
      '.map-side{display:grid;row-gap:1.1rem;align-content:start;font-size:var(--t-md);color:var(--ink-2);line-height:1.75}' +
      '.map-key{display:flex;gap:1rem;align-items:center}.map-key canvas{flex:none;border-radius:50%}' +
      '.map-key b{color:var(--ink);font-weight:700}' +
      '.map-side .readout{font-size:var(--t-md);color:var(--ink);border-left:2px solid var(--zero);padding-left:.9rem}' +
      '.map-stage canvas{border-radius:4px}'
    );
    var controls = kit.el('div', 'controls'); body.appendChild(controls);
    var grid = kit.el('div', 'map-grid'); body.appendChild(grid);
    var stage = kit.el('div', 'stage map-stage'), side = kit.el('div', 'map-side');
    grid.appendChild(stage); grid.appendChild(side);

    var zoom = 'full', tPan = 12, walking = false, hover = null;
    var img = null, imgKey = '', refineTimer = 0;
    var off = document.createElement('canvas');
    function view(w, h) {
      var s0 = zoom === 'full' ? -6 : -1.5, s1 = zoom === 'full' ? 7 : 2.5;
      var ppu = w / (s1 - s0), tBot = tPan - (zoom === 'full' ? 2 : 1.2);
      return { s0: s0, s1: s1, ppu: ppu, tBot: tBot, tTop: tBot + h / ppu };
    }
    function render(w, h, step) {
      var v = view(w, h), W = Math.ceil(w / step), H = Math.ceil(h / step);
      var g = M.zetaGrid(v.s0, v.s1, v.tTop, v.tBot, W, H);
      off.width = W; off.height = H;
      var c2 = off.getContext('2d'), id = c2.createImageData(W, H), d = id.data;
      for (var i = 0, n = W * H; i < n; i++) shade(g.re[i], g.im[i], d, i * 4);
      c2.putImageData(id, 0, 0);
      img = off;
    }
    var slider = kit.slider(controls, { id: 'map-t', label: '向上走到 t =', min: 0, max: 100, step: 0.5, value: 12, format: function (v) { return v.toFixed(1); } });
    var walkBtn = kit.button(controls, { id: 'map-walk', label: '沿着直线向上走', kind: 'primary', onClick: function () { walking ? stop() : walk(); } });
    kit.segmented(controls, { id: 'map-zoom', label: '视野', options: [{ value: 'full', label: '全景' }, { value: 'strip', label: '临界带特写' }], value: 'full', onChange: function (v) { zoom = v; imgKey = ''; cv.redraw(); } });

    var cv = kit.canvas(stage, {
      label: 'ζ 函数在复平面上的着色图：零点是所有颜色汇聚的暗点，非平凡零点全部排在实部为二分之一的竖线上',
      height: function (w) { return Math.min(660, Math.round(w * (w < 420 ? 1.35 : 1.45))); },
      draw: function (ctx, w, h) {
        var step = walking ? 3 : 2, key = [w, h, zoom, tPan, step].join('|');
        if (key !== imgKey && !(img && imgKey === [w, h, zoom, tPan, 1].join('|'))) { render(w, h, step); imgKey = key; }
        if (!walking) { clearTimeout(refineTimer); if (imgKey.slice(-2) !== '|1') refineTimer = setTimeout(function () { var k1 = [cv.w, cv.h, zoom, tPan, 1].join('|'); render(cv.w, cv.h, 1); imgKey = k1; cv.redraw(); }, 220); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        var v = view(w, h);
        function X(s) { return (s - v.s0) * v.ppu; } function Y(t) { return h - (t - v.tBot) * v.ppu; }
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.38)';
        [0, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(Math.round(X(s)) + 0.5, 0); ctx.lineTo(Math.round(X(s)) + 0.5, h); ctx.stroke(); });
        ctx.beginPath(); ctx.moveTo(0, Math.round(Y(0)) + 0.5); ctx.lineTo(w, Math.round(Y(0)) + 0.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(240,179,67,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0.5), 0); ctx.lineTo(X(0.5), h); ctx.stroke();
        // zero markers
        var count = 0;
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        D.zeros.forEach(function (g) {
          if (g < v.tBot || g > v.tTop) return; count++;
          ctx.beginPath(); ctx.arc(X(0.5), Y(g), zoom === 'full' ? 5 : 8, 0, 6.2832); ctx.stroke();
        });
        if (zoom === 'full') for (var k = -2; k >= -4; k -= 2) { ctx.beginPath(); ctx.arc(X(k), Y(0), 5, 0, 6.2832); ctx.stroke(); }
        // labels (white text with dark halo reads on every hue)
        function lab(t, x, y, al) { ctx.font = kit.font(11.5, 500); ctx.textAlign = al || 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.8)'; ctx.strokeText(t, x, y); ctx.fillStyle = '#fff'; ctx.fillText(t, x, y); }
        lab('Re(s) = ½', X(0.5) + 7, 12);
        if (Y(14.1347) > 20 && Y(14.1347) < h) lab('第一个零点 t ≈ 14.13', X(0.5) + (zoom === 'full' ? 10 : 14), Y(14.1347));
        if (Y(0) > 0 && Y(0) < h) { lab('极点 s = 1', X(1) + 8, Y(0) - 12); if (zoom === 'full') lab('平凡零点 −2, −4, …', X(-5.7), Y(0) + 14); }
        var tt = kit.ticks(v.tBot, v.tTop, 6);
        tt.forEach(function (t) { var y = Y(t); if (y > 10 && y < h - 10 && t !== 0) lab('t = ' + t, 6, y); });
        if (hover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hover.x, hover.y, 6, 0, 6.2832); ctx.stroke(); }
        if (cnt) cnt.textContent = '当前窗口里有 ' + count + ' 个非平凡零点，全部在 Re(s) = ½ 上。';
      }
    });
    // side panel
    var keyRow = kit.el('div', 'map-key'), wheel = document.createElement('canvas');
    wheel.width = 144; wheel.height = 144; wheel.style.width = '72px'; wheel.style.height = '72px'; wheel.setAttribute('aria-hidden', 'true');
    (function () {
      var c = wheel.getContext('2d'), id = c.createImageData(144, 144), d = id.data;
      for (var y = 0; y < 144; y++) for (var x = 0; x < 144; x++) {
        var dx = (x - 71.5) / 72, dy = (71.5 - y) / 72, r = Math.hypot(dx, dy);
        if (r <= 1) shade(dx * 2.2, dy * 2.2, d, (y * 144 + x) * 4);
      }
      c.putImageData(id, 0, 0);
    })();
    var keyText = kit.el('p');
    keyText.appendChild(kit.el('b', null, '怎么读这张图'));
    keyText.appendChild(document.createTextNode(' 颜色表示 ζ(s) 指向哪个方向，明暗表示它有多大。越暗越接近 0。绕零点一圈，所有颜色各出现一次。'));
    keyRow.appendChild(wheel); keyRow.appendChild(keyText); side.appendChild(keyRow);
    var out = kit.readout(side);
    var cnt = kit.el('p'); side.appendChild(cnt);
    side.appendChild(kit.el('p', null, '把滑块拉回 0 还能看到：横轴负半边的平凡零点 −2、−4、−6……，以及 s = 1 处唯一的极点（最亮的那一点）。'));
    function fmtC(re, im, d) { return re.toFixed(d) + (im < 0 ? ' − ' : ' + ') + Math.abs(im).toFixed(d) + ' i'; }
    function report(s, t) {
      var z = M.zeta(s, t);
      out.set('s = ' + fmtC(s, t, 3) + '\nζ(s) = ' + fmtC(z[0], z[1], 4) + '\n|ζ(s)| = ' + Math.hypot(z[0], z[1]).toFixed(4));
    }
    report(0.5, 14.134725);
    kit.pointer(cv.el, {
      move: function (x, y) { var v = view(cv.w, cv.h); hover = { x: x, y: y }; report(v.s0 + x / v.ppu, v.tBot + (cv.h - y) / v.ppu); cv.redraw(); },
      leave: function () { hover = null; cv.redraw(); }
    });
    slider.on(function (v) { if (walking) stop(); tPan = v; cv.redraw(); });
    var loop = kit.loop(cv.el, function (dt) {
      tPan = Math.min(100, tPan + dt * 7);
      slider.set(Math.round(tPan * 2) / 2, true); cv.redraw();
      if (tPan >= 100) stop();
    });
    function walk() { if (tPan >= 99.5) { tPan = 0; } walking = true; walkBtn.textContent = '停'; loop.start(); }
    function stop() { walking = false; walkBtn.textContent = '沿着直线向上走'; loop.stop(); cv.redraw(); }
    cv.redraw();
  });
})();
