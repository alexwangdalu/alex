/* RH core: numerics shared by every figure on the page.
   - zeta(s) for complex s (Borwein's alternating-series algorithm + reflection)
   - primes (sieve), li / Ei, Riemann's explicit formula for pi(x)
   Everything is plain double precision; accuracy targets are "plot-exact" (>= 8 digits where it matters). */
(function (root) {
  'use strict';
  var RH = root.RH = root.RH || {};
  var LN2 = Math.LN2, PI = Math.PI;
  var EULER = 0.5772156649015329;

  /* ---------- Borwein coefficients ---------- */
  var coeffCache = {};
  function borwein(n) {
    if (coeffCache[n]) return coeffCache[n];
    // d_k = n * sum_{i=0..k} (n+i-1)! 4^i / ((n-i)! (2i)!)
    var d = new Float64Array(n + 1);
    var term = 1 / n, sum = term;
    d[0] = n * sum;
    for (var i = 1; i <= n; i++) {
      term *= (n + i - 1) * (n - i + 1) * 4 / ((2 * i) * (2 * i - 1));
      sum += term;
      d[i] = n * sum;
    }
    var e = new Float64Array(n), ln = new Float64Array(n);
    for (var k = 0; k < n; k++) {
      e[k] = ((k & 1) ? -1 : 1) * (d[k] - d[n]) / d[n];
      ln[k] = Math.log(k + 1);
    }
    return (coeffCache[n] = { n: n, e: e, ln: ln });
  }
  function termsFor(t) { return Math.min(420, Math.ceil(26 + 0.92 * Math.abs(t))); }

  /* zeta for Re(s) >= 0 (direct). Writes into out[0], out[1]. */
  function zetaDirect(sig, t, out, n) {
    var c = borwein(n || termsFor(t)), e = c.e, ln = c.ln, N = c.n;
    var re = 0, im = 0;
    for (var k = 0; k < N; k++) {
      var m = e[k] * Math.exp(-sig * ln[k]), a = t * ln[k];
      re += m * Math.cos(a);
      im -= m * Math.sin(a);
    }
    // divide by -(1 - 2^(1-s))
    var pm = Math.exp((1 - sig) * LN2), pa = -t * LN2;
    var dr = -(1 - pm * Math.cos(pa)), di = pm * Math.sin(pa);
    var den = dr * dr + di * di;
    out[0] = (re * dr + im * di) / den;
    out[1] = (im * dr - re * di) / den;
    return out;
  }

  /* ---------- complex log-gamma (Lanczos g=7) for Re(z) > 0 ---------- */
  var LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function logGamma(zr, zi, out) {
    zr -= 1;
    var xr = LG[0], xi = 0;
    for (var i = 1; i < 9; i++) {
      var dr = zr + i, den = dr * dr + zi * zi;
      xr += LG[i] * dr / den;
      xi -= LG[i] * zi / den;
    }
    var tr = zr + 7.5, ti = zi;
    var lt_r = 0.5 * Math.log(tr * tr + ti * ti), lt_i = Math.atan2(ti, tr);
    // (z+0.5)*log(t) - t + 0.5*log(2pi) + log(x)
    var a = zr + 0.5;
    out[0] = a * lt_r - zi * lt_i - tr + 0.9189385332046727 + 0.5 * Math.log(xr * xr + xi * xi);
    out[1] = a * lt_i + zi * lt_r - ti + Math.atan2(xi, xr);
    return out;
  }

  var tmpA = [0, 0], tmpB = [0, 0];
  /* chi(s) = 2^s pi^(s-1) sin(pi s/2) Gamma(1-s), valid for Re(s) < 1 */
  function chi(sig, t, out) {
    logGamma(1 - sig, -t, tmpA);
    // log(2^s pi^(s-1)) = s ln2 + (s-1) ln pi
    var lr = sig * LN2 + (sig - 1) * Math.log(PI) + tmpA[0];
    var li = t * LN2 + t * Math.log(PI) + tmpA[1];
    // sin(pi s/2) = sin(a) cosh(b) + i cos(a) sinh(b), a = pi sig/2, b = pi t/2
    var a = PI * sig / 2, b = PI * t / 2;
    // factor e^{|b|} out of cosh/sinh to stay finite for large |t|
    var eb = Math.exp(-2 * Math.abs(b)), sg = b < 0 ? -1 : 1;
    var ch = 0.5 * (1 + eb), sh = sg * 0.5 * (1 - eb);
    var sr = Math.sin(a) * ch, si = Math.cos(a) * sh;
    var mag = Math.exp(lr + Math.abs(b));
    var cr = mag * Math.cos(li), ci = mag * Math.sin(li);
    out[0] = cr * sr - ci * si;
    out[1] = cr * si + ci * sr;
    return out;
  }

  /* zeta(s) anywhere (s != 1). */
  function zeta(sig, t, out) {
    out = out || [0, 0];
    if (sig >= 0) return zetaDirect(sig, t, out);
    // reflection: zeta(s) = chi(s) * zeta(1-s);  zeta(1-sig - i t) = conj(zeta(1-sig + i t))
    zetaDirect(1 - sig, t, tmpB);
    var zr = tmpB[0], zi = -tmpB[1];
    chi(sig, t, tmpA);
    var cr = tmpA[0], ci = tmpA[1];
    out[0] = cr * zr - ci * zi;
    out[1] = cr * zi + ci * zr;
    return out;
  }

  /* Fast evaluation on a rectangular grid: sigma in cols, t in rows.
     Returns {re, im} Float32Arrays of size W*H (row-major, row 0 = tTop). */
  function zetaGrid(sig0, sig1, tTop, tBot, W, H) {
    var tMax = Math.max(Math.abs(tTop), Math.abs(tBot));
    var c = borwein(termsFor(tMax)), e = c.e, ln = c.ln, N = c.n;
    var re = new Float32Array(W * H), im = new Float32Array(W * H);
    // per-column magnitude tables for the "effective" sigma (reflected when sigma < 0)
    var mags = new Float64Array(W * N), sigs = new Float64Array(W), refl = new Uint8Array(W);
    var x, y, k;
    for (x = 0; x < W; x++) {
      var s = sig0 + (sig1 - sig0) * (x + 0.5) / W;
      sigs[x] = s;
      refl[x] = s < 0 ? 1 : 0;
      var se = s < 0 ? 1 - s : s;
      for (k = 0; k < N; k++) mags[x * N + k] = e[k] * Math.exp(-se * ln[k]);
    }
    var cs = new Float64Array(N), sn = new Float64Array(N), tmp = [0, 0];
    for (y = 0; y < H; y++) {
      var t = tTop + (tBot - tTop) * (y + 0.5) / H;
      for (k = 0; k < N; k++) { var a = t * ln[k]; cs[k] = Math.cos(a); sn[k] = Math.sin(a); }
      var c2 = Math.cos(t * LN2), s2 = Math.sin(t * LN2);
      for (x = 0; x < W; x++) {
        var o = x * N, sr = 0, si = 0;
        for (k = 0; k < N; k++) { var m = mags[o + k]; sr += m * cs[k]; si -= m * sn[k]; }
        var sg = sigs[x], se2 = refl[x] ? 1 - sg : sg;
        var pm = Math.exp((1 - se2) * LN2);
        var dr = -(1 - pm * c2), di = -pm * s2;
        var den = dr * dr + di * di;
        var zr = (sr * dr + si * di) / den, zi = (si * dr - sr * di) / den;
        if (refl[x]) {
          chi(sg, t, tmp);
          var qr = zr, qi = -zi; // conj -> zeta(1-s)
          zr = tmp[0] * qr - tmp[1] * qi;
          zi = tmp[0] * qi + tmp[1] * qr;
        }
        var idx = y * W + x;
        re[idx] = zr; im[idx] = zi;
      }
    }
    return { re: re, im: im, W: W, H: H };
  }

  /* ---------- primes ---------- */
  function sieve(limit) {
    var comp = new Uint8Array(limit + 1), primes = [];
    for (var i = 2; i <= limit; i++) {
      if (!comp[i]) {
        primes.push(i);
        for (var j = i * i; j <= limit; j += i) comp[j] = 1;
      }
    }
    return primes;
  }
  /* number of primes <= x given a sorted prime list */
  function primeCount(primes, x) {
    var lo = 0, hi = primes.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (primes[mid] <= x) lo = mid + 1; else hi = mid; }
    return lo;
  }

  /* ---------- real Ei / li ---------- */
  function EiReal(u) {
    if (u === 0) return -Infinity;
    var au = Math.abs(u);
    if (au > 40) { // asymptotic
      var s = 1, term = 1;
      for (var k = 1; k < 60; k++) { var nt = term * k / u; if (Math.abs(nt) > Math.abs(term)) break; term = nt; s += term; }
      return Math.exp(u) / u * s;
    }
    var sum = 0, p = 1;
    for (var j = 1; j < 200; j++) {
      p *= u / j;
      var add = p / j;
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return EULER + Math.log(au) + sum;
  }
  function li(x) { return x <= 0 ? NaN : EiReal(Math.log(x)); }
  var LI2 = 1.0451637801174927;
  function Li(x) { return li(x) - LI2; }

  /* ---------- complex Ei for |z| >~ 5 away from the positive real axis ----------
     E1(w) by the even continued fraction (modified Lentz); Ei(z) = -E1(-z) + i*pi*sign(Im z). */
  function EiComplex(zr, zi, out) {
    var wr = -zr, wi = -zi;
    var tiny = 1e-300;
    // b0 = w + 1
    var br = wr + 1, bi = wi;
    var cr = 1 / tiny, ci = 0;
    var den = br * br + bi * bi;
    var dr = br / den, di = -bi / den;
    var hr = dr, hi = di;
    for (var i = 1; i < 400; i++) {
      var an = -i * i;
      br += 2;
      // d = 1/(an*d + b)
      var tr = an * dr + br, ti = an * di + bi;
      den = tr * tr + ti * ti;
      dr = tr / den; di = -ti / den;
      // c = b + an/c
      den = cr * cr + ci * ci;
      var ncr = br + an * cr / den, nci = bi - an * ci / den;
      cr = ncr; ci = nci;
      // del = c*d
      var er = cr * dr - ci * di, ei = cr * di + ci * dr;
      var nhr = hr * er - hi * ei, nhi = hr * ei + hi * er;
      hr = nhr; hi = nhi;
      if (Math.abs(er - 1) + Math.abs(ei) < 1e-15) break;
    }
    // E1(w) = h * exp(-w)
    var em = Math.exp(-wr), ec = Math.cos(-wi), es = Math.sin(-wi);
    var e1r = em * (hr * ec - hi * es), e1i = em * (hr * es + hi * ec);
    out[0] = -e1r;
    out[1] = -e1i + (zi > 0 ? PI : zi < 0 ? -PI : 0);
    return out;
  }

  /* ---------- Riemann's explicit formula ----------
     J(y) = li(y) - sum_rho li(y^rho) - ln 2 + int_y^inf dt / (t (t^2-1) ln t),   y >= 2
     pi0(x) = sum_{n<=log2 x} mu(n)/n * J(x^(1/n)) */
  var MU = [0, 1, -1, -1, 0, -1, 1, -1, 0, 0, 1, -1, 0, -1, 1, 1, 0, -1, 0, -1, 0, 1, 1, -1, 0, 0, 1, 0, 0, -1, -1];
  function tailIntegral(y) {
    // int_{ln y}^{inf} du / (u (e^{2u} - 1)), Simpson
    var a = Math.log(y), b = a + 18, n = 400, h = (b - a) / n, s = 0;
    function f(u) { return 1 / (u * Math.expm1(2 * u)); }
    for (var i = 0; i <= n; i++) s += f(a + i * h) * (i === 0 || i === n ? 1 : (i & 1) ? 4 : 2);
    return s * h / 3;
  }
  /* smooth part of pi0 (no zeros): sum mu(n)/n [li(x^(1/n)) - ln2 + tail] */
  function piSmooth(x) {
    if (x < 2) return 0;
    var s = 0, nmax = Math.floor(Math.log(x) / LN2 + 1e-12);
    for (var n = 1; n <= nmax; n++) {
      if (!MU[n]) continue;
      var y = Math.pow(x, 1 / n);
      s += MU[n] / n * (li(y) - LN2 + tailIntegral(y));
    }
    return s;
  }
  /* contribution of the conjugate pair 1/2 +- i*gamma to pi0(x):  -sum mu(n)/n * 2 Re Ei(rho ln(x)/n) */
  var tmpE = [0, 0];
  function zeroWave(x, gamma, beta) {
    if (x < 2) return 0;
    if (beta === undefined) beta = 0.5;
    var L = Math.log(x), s = 0, nmax = Math.floor(L / LN2 + 1e-12);
    for (var n = 1; n <= nmax; n++) {
      if (!MU[n]) continue;
      EiComplex(beta * L / n, gamma * L / n, tmpE);
      s -= MU[n] / n * 2 * tmpE[0];
    }
    return s;
  }

  /* Riemann-Siegel theta and Hardy Z (via zeta on the line) */
  function theta(t) {
    logGamma(0.25, t / 2, tmpA);
    return tmpA[1] - t / 2 * Math.log(PI);
  }
  function hardyZ(t) {
    var z = zetaDirect(0.5, t, [0, 0]), th = theta(t);
    return z[0] * Math.cos(th) - z[1] * Math.sin(th);
  }

  RH.math = {
    zeta: zeta, zetaGrid: zetaGrid, chi: chi, logGamma: logGamma, termsFor: termsFor,
    sieve: sieve, primeCount: primeCount, EiReal: EiReal, li: li, Li: Li, LI2: LI2,
    EiComplex: EiComplex, piSmooth: piSmooth, zeroWave: zeroWave, tailIntegral: tailIntegral,
    theta: theta, hardyZ: hardyZ, MU: MU, EULER: EULER
  };
})(typeof window !== 'undefined' ? window : globalThis);
