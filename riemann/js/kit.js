/* RH kit: the shared chart kit. Every figure module draws through this so the page reads as one system.
   Modules register with RH.kit.mount(name, fn) and receive (body, kit, figureEl). */
(function () {
  'use strict';
  var RH = window.RH = window.RH || {};
  var kit = RH.kit = {};
  var registry = {}, redraws = [];

  /* ---------- theme ---------- */
  var TOKENS = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'ink-3', 'hair', 'axis', 'prime', 'zero', 'smooth', 'rmt', 'bad', 'ghost', 'glow'];
  var colorCache = null;
  function camel(s) { return s.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); }); }
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return 1;
    var n = parseInt(m[1], 16);
    return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255;
  }
  /* kit.colors() -> {bg, surface, surface2, ink, ink2, ink3, hair, axis, prime, zero, smooth, rmt, bad, ghost, glow, dark}
     Always read colours from here at draw time (never cache them in a module): values change with the theme. */
  kit.colors = function () {
    if (colorCache) return colorCache;
    var cs = getComputedStyle(document.documentElement), o = {};
    TOKENS.forEach(function (t) { o[camel(t)] = cs.getPropertyValue('--' + t).trim(); });
    o.dark = lum(o.bg) < 0.4;
    return (colorCache = o);
  };
  /* colour with alpha from a #rrggbb token value */
  kit.alpha = function (hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  var themeSubs = [];
  kit.onTheme = function (fn) { themeSubs.push(fn); };
  var redrawQueued = false;
  function redrawAll() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(function () {
      redrawQueued = false;
      colorCache = null;
      themeSubs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      redraws.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    });
  }
  kit.redrawAll = redrawAll;
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(redrawAll);
    new MutationObserver(redrawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    if (document.fonts) {
      document.fonts.ready.then(redrawAll);
      if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', redrawAll);
    }
  } catch (e) { /* older browsers: figures still draw once */ }

  /* ---------- fonts for canvas text ---------- */
  var SANS = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif';
  var MONO = '"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  var SERIF = '"STIX Two Text","Noto Serif SC","Songti SC",serif';
  kit.font = function (px, weight) { return (weight || 400) + ' ' + px + 'px ' + SANS; };
  kit.mono = function (px, weight) { return (weight || 400) + ' ' + px + 'px ' + MONO; };
  kit.serif = function (px, weight, italic) { return (italic ? 'italic ' : '') + (weight || 400) + ' ' + px + 'px ' + SERIF; };

  /* ---------- motion ---------- */
  var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  kit.reduced = function () { return !!rm.matches; };

  /* ---------- DOM helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  kit.el = el;

  /* kit.css(text): add module-scoped CSS once. Use only var(--token) colours and prefix every class with your figure name. */
  kit.css = function (text) { var st = el('style'); st.textContent = text; document.head.appendChild(st); };

  /* kit.layout(body) -> {controls, stage, legend, note}; appended in that order. Remove what you do not use with .remove(). */
  kit.layout = function (body) {
    var L = { controls: el('div', 'controls'), stage: el('div', 'stage'), legend: el('div', 'legend'), note: el('p', 'fig-note') };
    body.appendChild(L.controls); body.appendChild(L.stage); body.appendChild(L.legend); body.appendChild(L.note);
    return L;
  };

  /* kit.canvas(stage, {height: px | function(width)->px, draw: function(ctx, w, h)}) -> {el, ctx, w, h, redraw()}
     Units inside draw are CSS pixels; the kit handles device pixel ratio, resize, theme and late font loads. */
  kit.canvas = function (stage, opts) {
    var c = el('canvas', 'cv');
    c.setAttribute('role', 'img');
    if (opts.label) c.setAttribute('aria-label', opts.label);
    stage.appendChild(c);
    var ctx = c.getContext('2d');
    var api = { el: c, ctx: ctx, w: 0, h: 0, dpr: 1 };
    function size() {
      var w = Math.max(40, Math.floor(stage.clientWidth));
      var h = Math.round(typeof opts.height === 'function' ? opts.height(w) : (opts.height || 320));
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === api.w && h === api.h && dpr === api.dpr) return false;
      api.w = w; api.h = h; api.dpr = dpr;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      c.style.height = h + 'px';
      return true;
    }
    api.redraw = function () {
      size();
      ctx.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
      ctx.clearRect(0, 0, api.w, api.h);
      try { opts.draw(ctx, api.w, api.h); } catch (e) { console.error(e); }
    };
    if (window.ResizeObserver) new ResizeObserver(function () { if (size()) api.redraw(); }).observe(stage);
    else window.addEventListener('resize', api.redraw);
    redraws.push(api.redraw);
    api.redraw();
    return api;
  };

  /* ---------- scales & ticks ---------- */
  kit.lin = function (d0, d1, r0, r1) {
    var f = function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
    f.inv = function (p) { return d0 + (p - r0) / (r1 - r0) * (d1 - d0); };
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  };
  kit.log = function (d0, d1, r0, r1) {
    var a = Math.log(d0), b = Math.log(d1);
    var f = function (v) { return r0 + (Math.log(v) - a) / (b - a) * (r1 - r0); };
    f.inv = function (p) { return Math.exp(a + (p - r0) / (r1 - r0) * (b - a)); };
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  };
  kit.ticks = function (min, max, count) {
    var span = max - min;
    if (!(span > 0)) return [min];
    var step = Math.pow(10, Math.floor(Math.log10(span / (count || 5))));
    var err = span / (count || 5) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (; v <= max + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return out;
  };
  kit.logTicks = function (min, max, every) {
    var out = [], a = Math.ceil(Math.log10(min) - 1e-9), b = Math.floor(Math.log10(max) + 1e-9);
    for (var k = a; k <= b; k += (every || 1)) out.push(Math.pow(10, k));
    return out;
  };

  /* ---------- number formatting ---------- */
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  kit.fmt = {
    int: function (n) { return Math.round(n).toLocaleString('en-US'); },
    fixed: function (v, d) { return v.toFixed(d == null ? 2 : d); },
    pow10: function (k) { return '10' + String(k).split('').map(function (ch) { return SUP[ch] || ch; }).join(''); },
    /* compact Chinese magnitude: 12,000 -> 1.2 万, 3.4e8 -> 3.4 亿 */
    zh: function (n) {
      var a = Math.abs(n);
      if (a >= 1e12) return +(n / 1e12).toPrecision(3) + ' 万亿';
      if (a >= 1e8) return +(n / 1e8).toPrecision(3) + ' 亿';
      if (a >= 1e4) return +(n / 1e4).toPrecision(3) + ' 万';
      return String(Math.round(n));
    },
    /* axis label for a power-of-ten value */
    tick10: function (v) { var k = Math.round(Math.log10(v)); return k < 4 ? String(Math.round(v)) : kit.fmt.pow10(k); }
  };

  /* ---------- plot frame ----------
     kit.frame(ctx, {x0,y0,x1,y1}, {xs, ys, xTicks, yTicks, xFmt, yFmt, xLabel, yLabel, grid:'y'|'x'|'xy'|'none', baseline:true})
     Draws hairline grid, the baseline and tick labels. y1 is the bottom edge. */
  kit.frame = function (ctx, r, o) {
    var C = kit.colors();
    o = o || {};
    var grid = o.grid || 'y';
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = kit.font(11.5);
    ctx.fillStyle = C.ink3;
    var i, p;
    if (o.yTicks && o.ys) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (i = 0; i < o.yTicks.length; i++) {
        p = Math.round(o.ys(o.yTicks[i])) + 0.5;
        if (p < r.y0 - 1 || p > r.y1 + 1) continue;
        if (grid.indexOf('y') >= 0) { ctx.strokeStyle = C.hair; ctx.beginPath(); ctx.moveTo(r.x0, p); ctx.lineTo(r.x1, p); ctx.stroke(); }
        ctx.fillText(o.yFmt ? o.yFmt(o.yTicks[i]) : String(o.yTicks[i]), r.x0 - 8, p);
      }
    }
    if (o.xTicks && o.xs) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (i = 0; i < o.xTicks.length; i++) {
        p = Math.round(o.xs(o.xTicks[i])) + 0.5;
        if (p < r.x0 - 1 || p > r.x1 + 1) continue;
        if (grid.indexOf('x') >= 0) { ctx.strokeStyle = C.hair; ctx.beginPath(); ctx.moveTo(p, r.y0); ctx.lineTo(p, r.y1); ctx.stroke(); }
        ctx.fillText(o.xFmt ? o.xFmt(o.xTicks[i]) : String(o.xTicks[i]), p, r.y1 + 8);
      }
    }
    if (o.baseline !== false) {
      ctx.strokeStyle = C.axis; ctx.beginPath();
      ctx.moveTo(r.x0, Math.round(r.y1) + 0.5); ctx.lineTo(r.x1, Math.round(r.y1) + 0.5); ctx.stroke();
    }
    ctx.fillStyle = C.ink2; ctx.font = kit.font(12);
    if (o.xLabel) { ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(o.xLabel, r.x1, r.y1 + 26); }
    if (o.yLabel) { ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(o.yLabel, r.x0 - (o.yLabelDx == null ? 0 : o.yLabelDx), r.y0 - 10); }
    ctx.restore();
  };
  /* stroke a polyline from arrays of pixel coords; breaks on NaN */
  kit.polyline = function (ctx, xs, ys, n) {
    var pen = false;
    ctx.beginPath();
    for (var i = 0; i < (n == null ? xs.length : n); i++) {
      var x = xs[i], y = ys[i];
      if (x !== x || y !== y) { pen = false; continue; }
      if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
    }
    ctx.stroke();
  };
  /* a dot with the 2px surface ring */
  kit.dot = function (ctx, x, y, r, color, ring) {
    var C = kit.colors();
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 6.2832); ctx.fillStyle = ring || C.surface; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = color; ctx.fill();
  };
  /* small text label with a surface halo so it stays legible over marks */
  kit.label = function (ctx, text, x, y, o) {
    var C = kit.colors();
    o = o || {};
    ctx.save();
    ctx.font = o.font || kit.font(12, o.weight || 500);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = o.halo || C.surface;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = o.color || C.ink2;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  /* ---------- controls ---------- */
  /* kit.slider(parent, {id, label, min, max, step, value, format(v)->string}) -> {input, get(), set(v, silent), on(fn)} */
  kit.slider = function (parent, o) {
    var wrap = el('label', 'ctl ctl-slider');
    wrap.setAttribute('for', o.id);
    var lab = el('span', 'ctl-label', o.label);
    var input = el('input');
    input.type = 'range'; input.id = o.id; input.min = o.min; input.max = o.max; input.step = o.step == null ? 1 : o.step; input.value = o.value;
    var out = el('output', 'ctl-val');
    out.setAttribute('for', o.id);
    wrap.appendChild(lab); wrap.appendChild(input); wrap.appendChild(out);
    parent.appendChild(wrap);
    var subs = [];
    function paint() {
      var v = +input.value;
      out.textContent = o.format ? o.format(v) : String(v);
      var pct = (v - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', pct + '%');
    }
    input.addEventListener('input', function () { paint(); subs.forEach(function (f) { f(+input.value); }); });
    paint();
    return {
      el: wrap, input: input,
      get: function () { return +input.value; },
      set: function (v, silent) { input.value = v; paint(); if (!silent) subs.forEach(function (f) { f(+input.value); }); },
      on: function (f) { subs.push(f); }
    };
  };
  /* kit.button(parent, {id, label, kind:'primary'|'quiet', onClick}) -> button element (use .textContent to relabel) */
  kit.button = function (parent, o) {
    var b = el('button', 'btn' + (o.kind === 'primary' ? ' btn-primary' : ''), o.label);
    b.type = 'button'; if (o.id) b.id = o.id;
    if (o.onClick) b.addEventListener('click', o.onClick);
    parent.appendChild(b);
    return b;
  };
  /* kit.segmented(parent, {id, label, options:[{value,label}], value, onChange(value)}) -> {get(), set(v)} */
  kit.segmented = function (parent, o) {
    var wrap = el('div', 'ctl ctl-seg');
    wrap.setAttribute('role', 'group');
    if (o.label) { var lab = el('span', 'ctl-label', o.label); lab.id = o.id + '-label'; wrap.setAttribute('aria-labelledby', lab.id); wrap.appendChild(lab); }
    var box = el('div', 'seg'), cur = o.value, btns = [];
    o.options.forEach(function (op, i) {
      var b = el('button', 'seg-btn', op.label);
      b.type = 'button'; b.id = o.id + '-' + i;
      b.addEventListener('click', function () { set(op.value); if (o.onChange) o.onChange(op.value); });
      btns.push({ b: b, v: op.value }); box.appendChild(b);
    });
    function set(v) { cur = v; btns.forEach(function (x) { x.b.setAttribute('aria-pressed', x.v === v ? 'true' : 'false'); }); }
    set(cur);
    wrap.appendChild(box); parent.appendChild(wrap);
    return { el: wrap, get: function () { return cur; }, set: set };
  };
  /* kit.legend(parent, [{label, color:'prime'|'zero'|...|cssColor, kind:'line'|'dash'|'rect'|'dot'}]) ; identity never by colour alone */
  kit.legend = function (parent, items) {
    parent.textContent = '';
    items.forEach(function (it) {
      var row = el('span', 'lg');
      var key = el('i', 'lg-key lg-' + (it.kind || 'line'));
      var isToken = TOKENS.indexOf(it.color) >= 0;
      key.style.setProperty('--k', isToken ? 'var(--' + it.color + ')' : it.color);
      row.appendChild(key); row.appendChild(el('span', 'lg-text', it.label));
      parent.appendChild(row);
    });
  };
  /* kit.readout(parent, cls) -> element with .set(text); monospace instrument-style read-out */
  kit.readout = function (parent, cls) {
    var r = el('div', 'readout' + (cls ? ' ' + cls : ''));
    r.setAttribute('aria-live', 'off');
    r.set = function (t) { r.textContent = t; };
    parent.appendChild(r);
    return r;
  };

  /* ---------- tooltip ----------
     var tip = kit.tooltip(stage); tip.show(x, y, {title, rows:[{label, value, color:'prime'|css, kind:'line'|'dot'}]}); tip.hide(); */
  kit.tooltip = function (stage) {
    var t = el('div', 'tip');
    t.hidden = true;
    stage.appendChild(t);
    return {
      show: function (x, y, d) {
        t.textContent = '';
        if (d.title) t.appendChild(el('div', 'tip-title', d.title));
        (d.rows || []).forEach(function (r) {
          var row = el('div', 'tip-row');
          if (r.color) {
            var k = el('i', 'lg-key lg-' + (r.kind || 'line'));
            k.style.setProperty('--k', TOKENS.indexOf(r.color) >= 0 ? 'var(--' + r.color + ')' : r.color);
            row.appendChild(k);
          }
          row.appendChild(el('b', 'tip-v', r.value));
          row.appendChild(el('span', 'tip-k', r.label));
          t.appendChild(row);
        });
        t.hidden = false;
        var sw = stage.clientWidth, tw = t.offsetWidth, th = t.offsetHeight;
        var left = x + 14, top = y - th - 10;
        if (left + tw > sw - 4) left = x - tw - 14;
        if (left < 4) left = 4;
        if (top < 4) top = y + 16;
        t.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
      },
      hide: function () { t.hidden = true; }
    };
  };

  /* ---------- pointer ----------
     kit.pointer(el, {move(x,y,ev), leave(), down(x,y,ev), up(), drag(dx,dy,x,y,ev)}); coordinates are CSS px relative to el.
     Vertical touch scrolling of the page keeps working (touch-action: pan-y) unless opts.lock is true. */
  kit.pointer = function (target, h, opts) {
    target.style.touchAction = (opts && opts.lock) ? 'none' : 'pan-y';
    var down = false, lx = 0, ly = 0;
    function pos(e) { var r = target.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    target.addEventListener('pointerdown', function (e) {
      var p = pos(e); down = true; lx = p[0]; ly = p[1];
      try { target.setPointerCapture(e.pointerId); } catch (err) {}
      if (h.down) h.down(p[0], p[1], e);
      if (h.move) h.move(p[0], p[1], e);
    });
    target.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (down && h.drag) h.drag(p[0] - lx, p[1] - ly, p[0], p[1], e);
      lx = p[0]; ly = p[1];
      if (h.move) h.move(p[0], p[1], e);
    });
    function end(e) {
      if (down && h.up) h.up(e);
      down = false;
      if (e.type !== 'pointerup' || e.pointerType !== 'mouse') { if (h.leave) h.leave(); }
    }
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    target.addEventListener('pointerleave', function (e) { if (!down && h.leave) h.leave(); });
  };

  /* ---------- animation loop ----------
     var loop = kit.loop(el, function tick(dt, elapsed){...}); loop.start(); loop.stop(); loop.running
     Pauses automatically while el is off-screen or the tab is hidden. dt is in seconds (clamped to 0.05). */
  kit.loop = function (target, tick) {
    var api = { running: false }, raf = 0, last = 0, elapsed = 0, visible = true;
    function frame(ts) {
      raf = 0;
      if (!api.running) return;
      if (visible && !document.hidden) {
        var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
        elapsed += dt;
        try { tick(dt, elapsed); } catch (e) { console.error(e); api.running = false; return; }
      }
      last = ts;
      raf = requestAnimationFrame(frame);
    }
    api.start = function () { if (api.running) return; api.running = true; last = 0; raf = requestAnimationFrame(frame); };
    api.stop = function () { api.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(target);
    return api;
  };
  /* run fn once, the first time el comes near the viewport (for heavy set-up) */
  kit.whenNear = function (target, fn) {
    if (!window.IntersectionObserver) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { rootMargin: '600px' });
    io.observe(target);
  };

  /* ---------- registry ---------- */
  kit.mount = function (name, fn) { registry[name] = fn; };
  kit.boot = function () {
    var figs = document.querySelectorAll('[data-fig]');
    Array.prototype.forEach.call(figs, function (f) {
      var name = f.getAttribute('data-fig'), fn = registry[name];
      var body = f.querySelector('.fig-body') || f;
      if (!fn) return;
      try { fn(body, kit, f); f.setAttribute('data-ready', '1'); }
      catch (e) {
        console.error('figure "' + name + '" failed', e);
        body.textContent = '';
        body.appendChild(el('p', 'fig-error', '这张图没能加载。刷新页面可以重试。'));
      }
    });
  };
})();
