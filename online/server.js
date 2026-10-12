/* 派对飞行棋 · 联机版房间服务器（纯 Node 内置模块，零依赖）
 * 只做三件事：房间码分配、成员管理（含换房主）、事件转发。不含任何游戏逻辑。
 *   下行 = SSE（服务端推送），上行 = POST JSON。
 *
 * ⚠ online/ 是自包含的部署单元：
 *     index.html = 联机版页面 · zpix.ttf = 像素字体 · 本文件 = 房间服务器。
 *     整个 online/ 目录拷到任意一台装了 Node 的机器上，`node server.js` 即可跑。
 *   启动： node server.js   →  http://localhost:8787/
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT  = process.env.PORT || 8787;
const ROOT  = __dirname;
const MAX_SEAT = 4;           // 与游戏四阵营一致
const KEEP_EVENTS = 400;      // 每房间保留的事件条数（供断线重连补发）
const OFFLINE_GRACE = 45000;  // SSE 断开后多久才真的踢人（防刷新页面被误踢）

/* v144：房间容量 = 房主在「玩法设置」里配的玩家数（2/3/4）。
   原先是硬顶 4 人 —— 房主配 3 人局，第 4 个人照样能挤进来，人数上限形同虚设。 */
function clampCap(n) {
  n = parseInt(n, 10);
  if (!(n >= 2) || n > MAX_SEAT) return MAX_SEAT;   // 没给 / 给了非法值 → 退回 4 人
  return n;
}
function pushMembers(r) {
  push(r, { type: 'members', members: memberList(r), host: hostSeat(r), cap: r.cap });
}

/* ---------------- 房间 ---------------- */
/** code -> { code, members:[{seat,name,res,lastSeen,gone}], events:[], seq, created } */
const rooms = new Map();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉易混的 I O 0 1
function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0]).join(''); }
  while (rooms.has(c));
  return c;
}
function getRoom(code) {
  code = String(code || '').toUpperCase().trim();
  return rooms.get(code) || null;
}
function memberList(r) {
  return r.members.filter(m => !m.gone).map(m => ({ seat: m.seat, name: m.name }));
}
function hostSeat(r) {
  const alive = r.members.filter(m => !m.gone).sort((a, b) => a.seat - b.seat);
  return alive.length ? alive[0].seat : -1;      // 换房主规则：还在房间里的最小座位号
}
function sweep(r) {                               // 超时未重连的成员摘除
  const now = Date.now();
  r.members.forEach(m => { if (m.gone && now - m.lastSeen > OFFLINE_GRACE) m.dead = true; });
  r.members = r.members.filter(m => !m.dead);
}

/* ---------------- 广播 ---------------- */
function push(r, evt) {
  evt.seq = ++r.seq;
  r.events.push(evt);
  if (r.events.length > KEEP_EVENTS) r.events.shift();
  const payload = 'data: ' + JSON.stringify(evt) + '\n\n';
  r.members.forEach(m => {
    if (m.gone || !m.res) return;
    try { m.res.write(payload); } catch (e) { m.res = null; m.gone = true; m.lastSeen = Date.now(); }
  });
}

/* ---------------- HTTP ---------------- */
function readBody(req) {
  return new Promise(res => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { res(b ? JSON.parse(b) : {}); } catch (e) { res({}); } });
  });
}
function json(res, obj, code = 200) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(s);
}
/* v0.151：按扩展名给 Content-Type；字体走长缓存。
   ⚠ 原来无论什么文件都写 text/html + no-store，而静态路由又是白名单，
     于是同目录下那个 7 MB 的 zpix.ttf 永远拿不到 —— 页面只能靠 jsDelivr CDN 兜底。
     这正是「部署后 CDN 一断，全站掉成微软雅黑、像素风尽失」的根因。 */
function serveFile(res, file) {
  const p = path.join(ROOT, file);
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 ' + file); return; }
    const font = /\.ttf$/i.test(file);
    res.writeHead(200, {
      'Content-Type': font ? 'font/ttf' : 'text/html; charset=utf-8',
      /* 字体是 7 MB 级的大件 → 长缓存；页面本身不缓存（改完一刷新就生效） */
      'Cache-Control': font ? 'public, max-age=604800' : 'no-store',
    });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  // 允许 file:// 直接打开页面时也能连本地服务器
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (p === '/' || p === '/index.html'))            return serveFile(res, 'index.html');
  /* 兼容旧链接：联机版从前叫 index-online.html、挂在 /online 上；现在它就是本目录的 index.html */
  if (req.method === 'GET' && (p === '/online' || p === '/index-online.html')) return serveFile(res, 'index.html');
  /* v0.151：本地像素字体（7 MB）。带上它就不必再依赖 jsDelivr —— CDN 不可达时全站不会掉雅黑。 */
  if (req.method === 'GET' && p === '/zpix.ttf')                             return serveFile(res, 'zpix.ttf');

  /* 创建房间 */
  if (req.method === 'POST' && p === '/api/create') {
    const { name, cap } = await readBody(req);
    const code = newCode();
    const r = { code, cap: clampCap(cap), members: [{ seat: 0, name: name || '房主', res: null, gone: false, lastSeen: Date.now() }], events: [], seq: 0, created: Date.now() };
    rooms.set(code, r);
    console.log(`[room ${code}] created by ${name || '房主'}（${r.cap} 人局）`);
    return json(res, { ok: true, code, seat: 0, cap: r.cap, seq: r.seq });
  }

  /* 加入房间 */
  if (req.method === 'POST' && p === '/api/join') {
    const { code, name } = await readBody(req);
    const r = getRoom(code);
    if (!r) return json(res, { ok: false, err: '房间不存在' });
    sweep(r);
    const used = new Set(r.members.filter(m => !m.gone).map(m => m.seat));
    /* v144：按房主配的容量卡人（原来只看 MAX_SEAT=4，3 人局也能进来 4 个） */
    const aliveN = r.members.filter(m => !m.gone).length;
    if (aliveN >= r.cap) return json(res, { ok: false, err: `房间已满（本局 ${r.cap} 人）` });
    let seat = -1;
    for (let i = 0; i < r.cap; i++) if (!used.has(i)) { seat = i; break; }
    if (seat < 0) {
      // 满员但有掉线坑位 → 复用最早掉线的那个座位
      const g = r.members.filter(m => m.gone).sort((a, b) => a.lastSeen - b.lastSeen)[0];
      if (g) seat = g.seat; else return json(res, { ok: false, err: `房间已满（本局 ${r.cap} 人）` });
    }
    const old = r.members.find(m => m.seat === seat && m.gone);
    const m = old || { seat, res: null, gone: false };
    m.name = name || ('玩家' + (seat + 1));
    m.gone = false; m.lastSeen = Date.now();
    if (!old) r.members.push(m);
    console.log(`[room ${r.code}] +seat${seat} ${m.name}`);
    pushMembers(r);
    return json(res, { ok: true, code: r.code, seat, host: hostSeat(r), members: memberList(r), cap: r.cap, seq: r.seq });
  }

  /* v144：房主改「玩法设置」里的玩家数 → 同步房间容量（房间已存在也能改） */
  if (req.method === 'POST' && p === '/api/cap') {
    const b = await readBody(req);
    const r = getRoom(b.code);
    if (!r) return json(res, { ok: false, err: 'no room' });
    if (parseInt(b.seat, 10) !== hostSeat(r)) return json(res, { ok: false, err: '只有房主能改人数' });
    const aliveN = r.members.filter(m => !m.gone).length;
    const want = clampCap(b.cap);
    if (want < aliveN) return json(res, { ok: false, err: `房间里有 ${aliveN} 人，不能少于这个数` });
    r.cap = want;
    console.log(`[room ${r.code}] cap → ${r.cap}`);
    pushMembers(r);
    return json(res, { ok: true, cap: r.cap });
  }

  /* SSE 长连接 */
  if (req.method === 'GET' && p === '/api/stream') {
    const r = getRoom(u.searchParams.get('code'));
    if (!r) { res.writeHead(404); res.end('no room'); return; }
    const seat = parseInt(u.searchParams.get('seat'), 10);
    const m = r.members.find(x => x.seat === seat);
    if (!m) { res.writeHead(404); res.end('no seat'); return; }
    let lastSeq = parseInt(u.searchParams.get('lastSeq') || '0', 10);
    /* v150：全新的页面（刚打开 / 刷新过）没有棋局状态，**绝不能**把历史事件流重放给它 ——
       那会在一个空页面上跑出「决斗面板开着 / 轮到别人 / 棋子位置全错」的垃圾状态，
       正是用户实测「刷新重进房间卡死在别人的页面上」的根因。
       带 fresh=1 时直接对齐到当前头部（相当于「从此刻开始订阅」）。
       ⚠ 只在**首次**连接带 fresh；断线重连走 lastSeq 补发（见前端 _stream 的手动重连）。 */
    if (u.searchParams.get('fresh')) lastSeq = r.seq;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    m.res = res; m.gone = false; m.lastSeen = Date.now();

    // 断线重连补发
    /* v150：先看缺口还在不在保留窗口里。客户端要的 lastSeq 比最老的一条还旧 →
       中间那些事件已经被 shift 掉了，**这段缺口永远补不回来**（本端已经永久掉队）。
       与其悄悄喂半截事件流让人继续错下去，不如明确告诉客户端「你掉队了」。 */
    const fresh = !!u.searchParams.get('fresh');
    const oldest = r.events.length ? r.events[0].seq : 0;
    if (!fresh && lastSeq > 0 && oldest > lastSeq + 1) {
      try { res.write('data: ' + JSON.stringify({ type: 'desync', lost: oldest - lastSeq - 1 }) + '\n\n'); } catch (e) {}
    }
    r.events.filter(e => e.seq > lastSeq).forEach(e => { try { res.write('data: ' + JSON.stringify(e) + '\n\n'); } catch (e2) {} });
    pushMembers(r);

    const hb = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { clearInterval(hb); } }, 20000);
    const bye = () => {
      clearInterval(hb);
      m.res = null; m.gone = true; m.lastSeen = Date.now();
      sweep(r);
      const alive = memberList(r);
      pushMembers(r);
      if (!alive.length) { console.log(`[room ${r.code}] empty → 销毁`); rooms.delete(r.code); }
      else if (hostSeat(r) === seat) push(r, { type: 'host-changed', host: hostSeat(r) });
      else console.log(`[room ${r.code}] -seat${seat}（剩 ${alive.length} 人）`);
    };
    req.on('close', bye);
    req.on('error', bye);
    return;
  }

  /* 上行事件（游戏内的一切同步都走这里，服务器不解读内容） */
  if (req.method === 'POST' && p === '/api/evt') {
    const b = await readBody(req);
    const r = getRoom(b.code);
    if (!r) return json(res, { ok: false, err: 'no room' });
    /* v150：客户端为每条动作带一个 cid，重试时复用同一个 ——
       网络抖动导致「以为失败其实已到」时，这里按 cid 去重，避免同一手被应用两遍。
       只保留最近 300 个（Set 保持插入序，超了删最老的）。 */
    if (b.cid) {
      r.cids = r.cids || new Set();
      if (r.cids.has(b.cid)) return json(res, { ok: true, dup: true });
      r.cids.add(b.cid);
      while (r.cids.size > 300) r.cids.delete(r.cids.values().next().value);
    }
    push(r, { type: b.type, from: b.seat, data: b.data || {} });
    return json(res, { ok: true });
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
});

server.listen(PORT, () => {
  console.log(`派对飞行棋 · 联机版房间服务器已启动：http://localhost:${PORT}`);
  console.log(`  联机版页面：http://localhost:${PORT}/`);
  console.log(`  （热座版在 ../hotseat/index.html，纯静态单文件，不需要本服务）`);
});
