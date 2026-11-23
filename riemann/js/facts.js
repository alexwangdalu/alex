/* Hand-maintained, research-backed tables used by figures. See the sources section of the page. */
(function () {
  var RH = window.RH = window.RH || {};
  RH.facts = {
    /* zeros numerically verified to lie on the critical line */
    verified: [
      { year: 1903, n: 15, who: '格拉姆', note: '纸笔手算' },
      { year: 1914, n: 79, who: '巴克隆德' },
      { year: 1925, n: 138, who: '哈钦森' },
      { year: 1936, n: 1041, who: '蒂奇马什', note: '借助穿孔卡片制表机' },
      { year: 1953, n: 1104, who: '图灵', note: '在曼彻斯特 Mark 1 电子计算机上完成，1953 年发表' },
      { year: 1956, n: 25000, who: '莱默' },
      { year: 1966, n: 250000, who: '莱曼' },
      { year: 1968, n: 3500000, who: '罗瑟、约埃、舍恩菲尔德' },
      { year: 1979, n: 81000001, who: '布伦特' },
      { year: 1986, n: 1500000001, who: '范德吕内、特里勒、温特' },
      { year: 2004, n: 1e13, who: '古尔东、德米歇尔', note: '前十万亿个零点；未经严格误差控制' },
      { year: 2021, n: 12363153437138, who: '普拉特、特鲁吉安', note: '用区间算术严格证明：高度 3×10¹² 以下的零点全部在线上' }
    ],

    /* results that rest on a Riemann-type hypothesis.
       tier: 'rh' needs RH for zeta; 'grh' needs GRH for Dirichlet L-functions (both covered by the November 2026 formal proof);
       'beyond' needs a Riemann hypothesis for wider families of L-functions (not covered); 'open' is unrelated and still open.
       saved: already proved unconditionally by other means. note: context shown in every state. */
    tower: [
      { tier: 'rh', title: '质数计数的误差只有 √x 量级', body: '用 li(x) 估计 x 以内的质数个数，误差小于 √x·ln x / 8π（x ≥ 2657）。', by: '冯·科赫 1901；舍恩菲尔德 1976' },
      { tier: 'rh', title: '相邻质数不会隔得太远', body: '质数 p 之后，最多再过 √p·ln p 的若干倍就会出现下一个质数。', by: '克拉默 1920' },
      { tier: 'rh', title: '正负号像抛硬币一样抵消', body: '默比乌斯函数 μ(n) 的前 x 项之和，增长不快于 x 的 ½+ε 次方。它与黎曼猜想等价。', by: '李特尔伍德 1912' },
      { tier: 'rh', title: '一条只用小学算术就能表述的不等式', body: '对所有 n > 5040，n 的全部因数之和小于 e^γ·n·ln ln n。它与黎曼猜想等价。', by: '罗宾 1984' },
      { tier: 'grh', title: '快速判定一个数是不是质数', body: '米勒检验只需试验 2(ln n)² 以内的底数，就能确定无疑地判定 n 是否为质数。', by: '米勒 1976；巴赫 1990', note: '“质数判定可以在多项式时间内完成”已在 2002 年由 AKS 算法无条件证明。这里多出来的是一个更快的确定性算法。' },
      { tier: 'grh', title: '最小的“二次非剩余”很小', body: '对质数 p，最小的那个不是任何平方数余数的数，不超过 2(ln p)²。', by: '安克尼 1952；巴赫 1990' },
      { tier: 'grh', title: '质数在各个余数类里分得一样均匀', body: '除以 q 余 a 的质数个数，与平均值的偏差同样只有 √x 量级。', by: '广义黎曼猜想的直接推论' },
      { tier: 'grh', title: '每个大于 5 的奇数都是三个质数之和', body: '1997 年在广义黎曼猜想下得到完整证明。', by: '德苏耶等 1997', saved: '2013 年，赫尔夫戈特给出了不依赖任何猜想的证明。' },
      { tier: 'beyond', title: '阿廷原根猜想', body: '例如：有无穷多个质数 p，使 1/p 的小数循环节长度恰好是 p − 1。', by: '胡利 1967', needs: '需要一族数域的戴德金 ζ 函数满足黎曼猜想' },
      { tier: 'beyond', title: '拉马努金的三元二次型', body: 'x² + y² + 10z² 表示不出的奇数只有有限的 18 个，最大的是 2719。', by: '小野、桑德拉拉金 1997', needs: '还需要模形式 L 函数的黎曼猜想' },
      { tier: 'open', title: '哥德巴赫猜想', body: '每个大于 2 的偶数都是两个质数之和。目前最好的结果仍是陈景润 1973 年发表的“1+2”。', by: '与黎曼猜想没有已知的推出关系' },
      { tier: 'open', title: '孪生质数猜想', body: '相差 2 的质数对有无穷多。张益唐 2013 年证明存在无穷多对相差不超过 7000 万的质数，这个界现已降到 246。', by: '与黎曼猜想没有已知的推出关系' }
    ]
  };
})();
