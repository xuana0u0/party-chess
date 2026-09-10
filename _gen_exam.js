/* 按套路枚举生成数字推理题：参数化生成 + 歧义检测 + 干扰项按错误思路设计 */
const fs = require('fs');

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20260910);
const ri = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
const pick = a => a[Math.floor(R() * a.length)];

const PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131];
const COMPOSITE = [4,6,8,9,10,12,14,15,16,18,20,21,22,24,25,26,27,28,30,32,33,34,35,36,38,39,40,42,44,45,46,48,49,50];

const P = [];
const def = (name, count, fn) => P.push({ name, count, fn });

/* ---------- 套路定义：每个返回 { arr, wrongs } ---------- */

def('一级等差', 3, () => {
  const a = ri(1, 12), d = ri(2, 9);
  const arr = [0,1,2,3,4,5].map(i => a + i * d);
  const ans = arr[5];
  return { arr, wrongs: [ans + d, ans - d, Math.round(arr[4] * arr[4] / arr[3])], kind: 'arith1' };
});

def('二级等差', 4, () => {
  const a = ri(1, 10), d = ri(1, 6), k = ri(2, 5);
  const arr = [a]; let cur = a, diff = d;
  for (let i = 0; i < 5; i++) { cur += diff; arr.push(cur); diff += k; }
  const ans = arr[5], lastD = arr[4] - arr[3];
  return { arr, wrongs: [arr[4] + lastD, ans + k, ans - k, ans + 2 * k] };
});

def('三级等差', 2, () => {
  const a = ri(1, 6), d0 = ri(1, 4), s1 = ri(2, 6), k = ri(1, 3);
  const arr = [a]; let cur = a, d = d0, s = s1;
  for (let i = 0; i < 5; i++) { cur += d; arr.push(cur); d += s; s += k; }
  const ans = arr[5], lastD = arr[4] - arr[3];
  return { arr, wrongs: [arr[4] + lastD, arr[4] + lastD + s1, ans - lastD, ans + s1] };
});

def('等比', 3, () => {
  const a = ri(1, 4), r = ri(2, 3);
  const arr = [0,1,2,3,4,5].map(i => a * Math.pow(r, i));
  if (arr[5] > 2000) return null;
  const ans = arr[5];
  return { arr, wrongs: [arr[4] + (arr[4] - arr[3]), ans + a * 3, arr[4] * 2 + arr[3]], kind: 'geo' };
});

def('差后等比', 3, () => {
  const a = ri(1, 5), d = ri(1, 3), m = ri(2, 3);
  const arr = [a]; let cur = a;
  for (let i = 0; i < 5; i++) { cur += d * Math.pow(m, i); arr.push(cur); }
  if (arr[5] > 3000) return null;
  const ans = arr[5], lastD = arr[4] - arr[3];
  return { arr, wrongs: [arr[4] + lastD, arr[4] + lastD * m * m, arr[4] + lastD * 2] };
});

def('平方数列', 3, () => {
  const p = ri(2, 6);
  const arr = [0,1,2,3,4,5].map(i => (i + p) * (i + p));
  const ans = arr[5], n = 5 + p;
  return { arr, wrongs: [ans + n, ans - n, (n + 1) * (n + 1), n * n + n] };
});

def('平方修正', 4, () => {
  const p = ri(2, 5); let c = ri(-4, 6); if (c === 0) c = 3;
  const arr = [0,1,2,3,4,5].map(i => (i + p) * (i + p) + c);
  if (arr.some(x => x <= 0)) return null;
  const ans = arr[5], n = 5 + p;
  return { arr, wrongs: [n * n, ans + n, ans - n, n * n - c] };
});

def('立方数列', 2, () => {
  const p = ri(1, 3);
  const arr = [0,1,2,3,4,5].map(i => Math.pow(i + p, 3));
  if (arr[5] > 2000) return null;
  const ans = arr[5], n = 5 + p;
  return { arr, wrongs: [n * n, ans + n * n, ans - n * n, n * n * n + n] };
});

def('立方修正', 3, () => {
  const p = ri(1, 2); const c = ri(1, 6);
  const arr = [0,1,2,3,4,5].map(i => Math.pow(i + p, 3) + c);
  if (arr[5] > 2000) return null;
  const ans = arr[5], n = 5 + p;
  return { arr, wrongs: [n * n * n, ans + c, ans - c, n * n + c] };
});

def('递推和', 4, () => {
  const a = ri(1, 4), b = ri(2, 7);
  const arr = [a, b];
  for (let i = 2; i < 6; i++) arr.push(arr[i - 1] + arr[i - 2]);
  const ans = arr[5];
  return { arr, wrongs: [arr[4] * 2, arr[4] + arr[3] + arr[2], arr[4] + arr[3] + 1, ans - arr[2]] };
});

def('三项递推和', 3, () => {
  const arr = [ri(1, 3), ri(1, 4), ri(1, 5)];
  for (let i = 3; i < 7; i++) arr.push(arr[i - 1] + arr[i - 2] + arr[i - 3]);
  if (arr[6] > 3000) return null;
  const ans = arr[6];
  return { arr, wrongs: [arr[5] + arr[4], arr[5] * 2, arr[5] + arr[4] - arr[3], ans - arr[5]] };
});

def('倍数递推', 4, () => {
  const a = ri(1, 3), k = ri(2, 3), c = ri(1, 6);
  const arr = [a];
  for (let i = 1; i < 6; i++) arr.push(arr[i - 1] * k + c);
  if (arr[5] > 2000) return null;
  const ans = arr[5];
  return { arr, wrongs: [arr[4] * k, arr[4] * k + 2 * c, arr[4] + (arr[4] - arr[3]), ans - c] };
});

def('混合递推', 3, () => {
  const arr = [ri(1, 3), ri(1, 3)], k = ri(2, 3);
  for (let i = 2; i < 6; i++) arr.push(arr[i - 1] + arr[i - 2] * k);
  if (arr[5] > 2000) return null;
  const ans = arr[5];
  return { arr, wrongs: [arr[4] + arr[3], arr[4] * 2 + arr[3], arr[4] + arr[3] * k - arr[2], ans - arr[2]] };
});

def('质数列', 2, () => {
  const st = ri(0, 14);
  const arr = PRIMES.slice(st, st + 6);
  if (arr.length < 6) return null;
  const ans = arr[5];
  return { arr, wrongs: [ans - 2, arr[4] + 2, ans + 4, arr[4] + 1] };
});

def('合数列', 2, () => {
  const st = ri(0, 20);
  const arr = COMPOSITE.slice(st, st + 6);
  if (arr.length < 6) return null;
  const ans = arr[5];
  return { arr, wrongs: [ans - 2, arr[4] + 2, ans + 3, arr[4] + 1] };
});

def('间隔数列', 3, () => {
  const a = ri(1, 6), b = ri(12, 24), d1 = ri(2, 5), d2 = ri(2, 5);
  const arr = [];
  for (let i = 0; i < 3; i++) { arr.push(a + i * d1); arr.push(b + i * d2); }
  const ans = arr[5];
  return { arr, wrongs: [a + 3 * d1, ans + d2, arr[4] + d2, ans - d2] };
});

def('分组数列', 3, () => {
  const a = ri(2, 5), m = ri(2, 3), s = ri(1, 4);
  const arr = [a, a * m, a + s, (a + s) * m, a + 2 * s, (a + 2 * s) * m];
  const ans = arr[5];
  return { arr, wrongs: [arr[4] + m, (a + 3 * s) * m, ans + s, arr[4] * m - s] };
});

def('幂次修正', 3, () => {
  const base = pick([2, 3]), sign = pick([1, -1]);
  const arr = [1,2,3,4,5,6].map(n => Math.pow(base, n) + sign * n);
  if (arr.some(x => x <= 0) || arr[5] > 2000) return null;
  const ans = arr[5], p6 = Math.pow(base, 6);
  return { arr, wrongs: [p6, p6 - sign * 6, p6 + sign * 5, p6 + sign * 12] };
});

def('乘积分解', 3, () => {
  const p = ri(1, 4);
  const arr = [1,2,3,4,5,6].map(n => n * (n + p));
  const ans = arr[5];
  return { arr, wrongs: [36 + p, 6 * (7 + p), 6 * (5 + p), ans - 6] };
});

/* ---------- 组装 + 歧义检测 ---------- */

function hasSimplerRule(arr, kind) {
  const s = arr.slice(0, arr.length - 1);
  const d = [];
  for (let i = 1; i < s.length; i++) d.push(s[i] - s[i - 1]);
  const isArith = d.every(x => x === d[0]) && d[0] !== 0;
  let isGeo = false;
  if (s[0] !== 0 && !s.some(x => x === 0)) {
    const r = [];
    for (let i = 1; i < s.length; i++) r.push(s[i] / s[i - 1]);
    isGeo = r.every(x => Math.abs(x - r[0]) < 1e-9) && Math.abs(r[0] - 1) > 1e-9;
  }
  if (kind !== 'arith1' && isArith) return true;   // 其实是一级等差
  if (kind !== 'geo' && isGeo) return true;        // 其实是等比
  if (isArith && isGeo) return true;
  return false;
}

function build(name, arr, wrongsRaw, kind) {
  const ans = arr[arr.length - 1];
  const shown = arr.slice(0, arr.length - 1);
  if (!Number.isFinite(ans)) return null;
  if (shown.some(x => !Number.isFinite(x) || x <= 0)) return null;
  if (new Set(shown).size !== shown.length) return null;
  if (shown.length < 5) return null;
  if (hasSimplerRule(arr, kind)) return null;

  let ws = [];
  for (const w of (wrongsRaw || [])) {
    if (!Number.isFinite(w)) continue;
    const v = Math.round(w);
    if (v <= 0 || v === ans) continue;
    if (shown.indexOf(v) >= 0 || ws.indexOf(v) >= 0) continue;
    ws.push(v);
  }
  const pool = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans - 3, ans + 4, ans - 4,
                ans + 5, ans - 5, Math.round(ans * 1.5), Math.round(ans * 0.6), ans + 7, ans - 7, ans + 9];
  let i = 0;
  while (ws.length < 3 && i < pool.length) {
    const v = pool[i++];
    if (v <= 0 || v === ans || shown.indexOf(v) >= 0 || ws.indexOf(v) >= 0) continue;
    ws.push(v);
  }
  if (ws.length < 3) return null;
  ws = ws.slice(0, 3);

  const opts = [ans, ...ws];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  const ai = opts.indexOf(ans);
  return { c: '数字推理', q: shown.join('，') + '，（ ）', o: opts.map(String), a: ai, t: name };
}

/* 与老题库（前 90 题）去重：题干相同的新题一律丢弃重生成 */
const OLD_Q = new Set(JSON.parse(fs.readFileSync('_old_qs.json', 'utf8')));

const out = [];
for (const p of P) {
  let got = 0, tries = 0;
  while (got < p.count && tries < 6000) {
    tries++;
    const r = p.fn();
    if (!r) continue;
    const q = build(p.name, r.arr, r.wrongs, r.kind);
    if (!q) continue;
    if (out.some(x => x.q === q.q)) continue;
    if (OLD_Q.has(q.q)) continue;
    out.push(q); got++;
  }
  if (got < p.count) console.error('!! 不足:', p.name, got, '/', p.count);
}

/* ---------- 手写题（其他分类 + 分数型数字推理） ---------- */
const MANUAL = [
  // 数字推理：分数型 / 小数型（脚本不便生成，手工补）
  { c:'数字推理', q:'1/2，2/3，3/4，4/5，（ ）', o:['5/6','6/7','4/6','7/8'], a:0, t:'分数数列' },
  { c:'数字推理', q:'1/2，1/6，1/12，1/20，（ ）', o:['1/24','1/30','1/32','1/40'], a:1, t:'分数数列' },
  { c:'数字推理', q:'0.5，1.5，4.5，13.5，（ ）', o:['27','36','40.5','45'], a:2, t:'倍数递推' },

  /* ---- 数学运算（应用题，答案已手算校验） ---- */
  { c:'数学运算', q:'一项工程，甲单独做 10 天完成，乙单独做 15 天完成。两人合作需要多少天完成？', o:['5','6','7','8'], a:1, t:'工程问题' },
  { c:'数学运算', q:'甲乙两地相距 240 千米，两车同时相向而行，速度分别为 60 千米/小时和 40 千米/小时，几小时后相遇？', o:['2','2.4','3','4'], a:1, t:'行程问题' },
  { c:'数学运算', q:'某商品进价 80 元，标价 120 元，打八折出售，其利润率是多少？', o:['15%','20%','25%','30%'], a:1, t:'利润问题' },
  { c:'数学运算', q:'含盐 20% 的盐水 100 克，加入 100 克水后，盐水的浓度是多少？', o:['10%','12%','15%','20%'], a:0, t:'浓度问题' },
  { c:'数学运算', q:'从 5 个人中选出 3 人排成一排，共有多少种不同的排法？', o:['20','30','60','120'], a:2, t:'排列组合' },
  { c:'数学运算', q:'父亲今年 40 岁，儿子 10 岁，几年后父亲的年龄是儿子的 3 倍？', o:['3','5','8','10'], a:1, t:'年龄问题' },
  { c:'数学运算', q:'一条 100 米长的路，每隔 5 米种一棵树，两端都种，共需种多少棵树？', o:['19','20','21','22'], a:2, t:'植树问题' },
  { c:'数学运算', q:'某班 40 人，参加数学竞赛 25 人，参加英语竞赛 20 人，两项都参加 10 人。两项都没参加的有多少人？', o:['3','5','8','10'], a:1, t:'容斥原理' },
  { c:'数学运算', q:'鸡兔同笼，共 20 个头，56 只脚，兔子有多少只？', o:['6','8','10','12'], a:1, t:'鸡兔同笼' },
  { c:'数学运算', q:'一本书共 200 页，从第 1 页开始编页码，一共用了多少个数字？', o:['489','492','495','500'], a:1, t:'页码问题' },

  /* ---- 言语理解 ---- */
  { c:'言语理解', q:'他在会上________，条理清晰地阐述了自己的观点，令人信服。最适合填入横线的是：', o:['夸夸其谈','侃侃而谈','振振有词','喋喋不休'], a:1, t:'成语辨析' },
  { c:'言语理解', q:'为了________房价过快上涨，政府出台了一系列调控政策。最适合填入横线的是：', o:['遏止','遏制','制止','禁止'], a:1, t:'近义词辨析' },
  { c:'言语理解', q:'下列句子中，没有语病的一句是：', o:['通过这次活动，使我明白了团结的重要','能否成功取决于我们付出了努力','他那认真学习的精神值得大家学习','为了防止不再发生类似事故，学校加强了管理'], a:2, t:'病句辨析' },
  { c:'言语理解', q:'“这件事的________很复杂，不是三言两语能说清楚的。”最适合填入横线的是：', o:['委屈','委曲','原委','婉转'], a:2, t:'实词辨析' },
  { c:'言语理解', q:'“他的设计方案独树一帜，在众多参赛作品中________，最终获得一等奖。”最适合填入横线的是：', o:['脱颖而出','崭露头角','鹤立鸡群','出类拔萃'], a:0, t:'成语辨析' },

  /* ---- 判断推理 ---- */
  { c:'判断推理', q:'医生：病人　（职业与其服务对象）　相当于　（ ）', o:['教师：学生','钢笔：墨水','汽车：汽油','书本：纸张'], a:0, t:'类比推理' },
  { c:'判断推理', q:'车轮：汽车　（部分与整体）　相当于　（ ）', o:['房屋：门窗','树叶：树枝','心脏：人体','章节：标题'], a:2, t:'类比推理' },
  { c:'判断推理', q:'“凡是对当事人有利的证言都不可信。”以下哪项最能削弱这一论断？', o:['有些对当事人有利的证言有物证佐证，应当采信','证人都与案件有利害关系','法官应当审慎判断证言','证言的可信度取决于证人品行'], a:0, t:'逻辑判断' },
  { c:'判断推理', q:'所有的天鹅都是白色的，有些白色的动物是鸟类。由此可以推出：', o:['有些鸟类是天鹅','所有的天鹅都是鸟类','有些天鹅是白色的','所有白色的动物都是天鹅'], a:2, t:'逻辑判断' },
  { c:'判断推理', q:'“行政复议是指公民认为行政行为侵犯其合法权益，向行政机关提出复查申请的活动。”下列属于行政复议的是：', o:['甲因不服罚款向上一级机关申请复查','乙向法院起诉要求撤销处罚','丙向监察机关举报官员受贿','丁向仲裁机构申请劳动仲裁'], a:0, t:'定义判断' },

  /* ---- 常识判断 ---- */
  { c:'常识判断', q:'我国现行宪法是新中国成立后颁布的第几部宪法？', o:['第二部','第三部','第四部','第五部'], a:2, t:'法律常识' },
  { c:'常识判断', q:'《中华人民共和国民法典》自何时起施行？', o:['2020年5月28日','2021年1月1日','2021年7月1日','2020年10月1日'], a:1, t:'法律常识' },
  { c:'常识判断', q:'我国刑法规定，已满多少周岁的人犯罪，应当负完全刑事责任？', o:['14周岁','16周岁','18周岁','20周岁'], a:1, t:'法律常识' },
  { c:'常识判断', q:'我国民法规定，几周岁以上的未成年人为限制民事行为能力人？', o:['6周岁','8周岁','10周岁','12周岁'], a:1, t:'法律常识' },
  { c:'常识判断', q:'正当防卫明显超过必要限度造成重大损害的，应当：', o:['不负刑事责任','负刑事责任，但应减轻或免除处罚','按故意犯罪处理','按过失犯罪处理'], a:1, t:'法律常识' },
  { c:'常识判断', q:'我国面积最大的淡水湖是：', o:['洞庭湖','鄱阳湖','太湖','洪泽湖'], a:1, t:'地理常识' },
  { c:'常识判断', q:'我国地势的总特征是：', o:['东高西低，呈阶梯状分布','西高东低，呈三级阶梯状分布','中间高、四周低','南高北低'], a:1, t:'地理常识' },
  { c:'常识判断', q:'我国面积最大的省级行政区是：', o:['西藏自治区','内蒙古自治区','新疆维吾尔自治区','青海省'], a:2, t:'地理常识' },
  { c:'常识判断', q:'世界上最高的山峰是：', o:['乔戈里峰','干城章嘉峰','珠穆朗玛峰','洛子峰'], a:2, t:'地理常识' },
  { c:'常识判断', q:'我国最大的岛屿是：', o:['海南岛','台湾岛','崇明岛','舟山岛'], a:1, t:'地理常识' },
  { c:'常识判断', q:'五岳中的“东岳”指的是：', o:['泰山','华山','衡山','嵩山'], a:0, t:'地理常识' },
  { c:'常识判断', q:'地球自转产生的自然现象是：', o:['四季更替','昼夜交替','五带划分','正午太阳高度变化'], a:1, t:'地理常识' },
  { c:'常识判断', q:'光在真空中的传播速度约为：', o:['3万千米/秒','30万千米/秒','300万千米/秒','3亿米/秒'], a:1, t:'科技常识' },
  { c:'常识判断', q:'人体最大的器官是：', o:['肝脏','皮肤','肺','大脑'], a:1, t:'科技常识' },
  { c:'常识判断', q:'血液中负责运输氧气的是：', o:['白细胞','血小板','红细胞','血浆蛋白'], a:2, t:'科技常识' },
  { c:'常识判断', q:'健康成年人的正常体温约为：', o:['35℃','36～37℃','38℃','39℃'], a:1, t:'科技常识' },
  { c:'常识判断', q:'植物进行光合作用释放的气体是：', o:['二氧化碳','氧气','氮气','水蒸气'], a:1, t:'科技常识' },
  { c:'常识判断', q:'在计算机存储单位中，1 GB 等于：', o:['1000 MB','1024 MB','1000 KB','1024 KB'], a:1, t:'科技常识' },
  { c:'常识判断', q:'在标准大气压下，水的沸点是：', o:['90℃','100℃','110℃','120℃'], a:1, t:'科技常识' },
  { c:'常识判断', q:'全球定位系统（GPS）是由哪个国家建设的？', o:['中国','俄罗斯','美国','欧盟'], a:2, t:'科技常识' },
  { c:'常识判断', q:'中国古代四大发明不包括：', o:['造纸术','指南针','地动仪','火药'], a:2, t:'历史常识' },
  { c:'常识判断', q:'中国历史上第一个统一的中央集权的封建国家建立于：', o:['公元前221年','公元前206年','公元221年','公元前202年'], a:0, t:'历史常识' },
  { c:'常识判断', q:'辛亥革命爆发于哪一年？', o:['1898年','1911年','1919年','1921年'], a:1, t:'历史常识' },
  { c:'常识判断', q:'五四运动爆发于哪一年？', o:['1911年','1919年','1921年','1927年'], a:1, t:'历史常识' },
  { c:'常识判断', q:'被鲁迅誉为“史家之绝唱，无韵之离骚”的史书是：', o:['《汉书》','《资治通鉴》','《史记》','《后汉书》'], a:2, t:'历史常识' },
  { c:'常识判断', q:'《史记》的作者是：', o:['班固','司马迁','司马光','陈寿'], a:1, t:'历史常识' },
  { c:'常识判断', q:'“贞观之治”出现在哪位皇帝在位期间？', o:['唐高祖','唐太宗','唐玄宗','武则天'], a:1, t:'历史常识' },
  { c:'常识判断', q:'我国现行宪法规定，中华人民共和国的一切权力属于：', o:['全国人民代表大会','人民','国务院','中国共产党'], a:1, t:'法律常识' },
];

const all = out.concat(MANUAL);

/* ---------- 自检 ---------- */
let bad = 0;
const seenQ = new Set();
for (const q of all) {
  if (!q.c || !q.q || !Array.isArray(q.o) || q.o.length !== 4) { console.error('格式错误', q); bad++; continue; }
  if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) { console.error('答案索引错误', q); bad++; continue; }
  if (new Set(q.o).size !== 4) { console.error('选项重复', q); bad++; continue; }
  if (seenQ.has(q.q)) { console.error('题干重复', q.q); bad++; continue; }
  if (OLD_Q.has(q.q)) { console.error('与老题库重复', q.q); bad++; continue; }
  seenQ.add(q.q);
}
const byCat = {};
all.forEach(q => { byCat[q.c] = (byCat[q.c] || 0) + 1; });

/* ---------- 输出 ---------- */
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
const lines = all.map(q =>
  `  { c:'${q.c}', q:'${esc(q.q)}', o:['${q.o.map(esc).join("','")}'], a:${q.a}, t:'${esc(q.t)}' }`
);
fs.writeFileSync('_exam_new.txt', lines.join(',\n'), 'utf8');
console.log('总题数:', all.length, ' 错题:', bad);
console.log(JSON.stringify(byCat, null, 0));
const tags = {};
all.filter(q => q.c === '数字推理').forEach(q => { tags[q.t] = (tags[q.t] || 0) + 1; });
console.log('数字推理套路分布:', JSON.stringify(tags));
