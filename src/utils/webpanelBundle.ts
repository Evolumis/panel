export function generateEmbeddedWebPanelServerJs(
  pteroUrl: string,
  pteroServerId: string
): string {
  const safePteroUrl = pteroUrl.replace(/\/+$/, '');
  return [
    "import express from 'express';",
    "import crypto from 'crypto';",
    "import fs from 'fs';",
    "import path from 'path';",
    "import { fileURLToPath } from 'url';",
    "const __dirname = path.dirname(fileURLToPath(import.meta.url));",
    "const app = express();",
    "app.set('trust proxy', true);",
    "const PORT = Number(process.env.PORT || process.env.WEB_PANEL_PORT || 1032);",
    `const PTERO_URL = (process.env.PTERO_URL || '${safePteroUrl}').replace(/\\/+$/, '');`,
    "const PTERO_API_KEY = (process.env.PTERO_CLIENT_API_KEY || '').trim();",
    `const PTERO_SERVER_ID = (process.env.PTERO_SERVER_ID || '${pteroServerId}').trim();`,
    "const GAME_PORT = (process.env.SERVER_PORT || '1031').trim();",
    "const FOUNDER_DISCORD_ID = (process.env.FOUNDER_DISCORD_ID || '985589556655054858').trim();",
    "const DISCORD_CLIENT_ID = (process.env.DISCORD_CLIENT_ID || '').trim();",
    "const DISCORD_CLIENT_SECRET = (process.env.DISCORD_CLIENT_SECRET || '').trim();",
    "const DISCORD_REDIRECT_URI = (process.env.DISCORD_REDIRECT_URI || '').trim();",
    "const DISCORD_WEBHOOK_URL = (process.env.DISCORD_WEBHOOK_URL || '').trim();",
    "const ROOT_DIR = process.env.SCPSL_ROOT || '/home/container';",
    "const CONFIG_DIR = path.join(ROOT_DIR, '.config');",
    "const DB_FILE = path.join(ROOT_DIR, 'lumishost-suite', 'panel-db.json');",
    "const sessions = new Map();",
    "const NATIVE_CMDS = new Set(['sr','roundrestart','list','players','p','config','forcestart','stop','exit','quit','help','seed','plugins','exiled','echo','idle','nextround']);",
    "let mysqlPool = null; let mysqlReady = false; let mysqlErr = null;",
    "app.use(express.json({ limit: '4mb' }));",
    "async function getDb() {",
    "  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) return null;",
    "  if (!mysqlPool) {",
    "    try {",
    "      const m = await import('mysql2/promise');",
    "      mysqlPool = m.default.createPool({ host: process.env.MYSQL_HOST.trim(), port: Number(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE.trim(), user: process.env.MYSQL_USER.trim(), password: process.env.MYSQL_PASSWORD || '', waitForConnections: true, connectionLimit: 5, connectTimeout: 5000 });",
    "    } catch (e) { mysqlErr = e.message; return null; }",
    "  }",
    "  if (!mysqlReady) {",
    "    try {",
    "      await mysqlPool.query('CREATE TABLE IF NOT EXISTS lumishost_sanctions (id VARCHAR(64) PRIMARY KEY, target_name VARCHAR(191), target_steam_id VARCHAR(128), sanction_type VARCHAR(32), reason TEXT, duration VARCHAR(64), moderator VARCHAR(191), source VARCHAR(64), timestamp_label VARCHAR(64), active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');",
    "      await mysqlPool.query('CREATE TABLE IF NOT EXISTS lumishost_telemetry (id VARCHAR(64) PRIMARY KEY, timestamp_label VARCHAR(64), category VARCHAR(32), details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');",
    "      mysqlReady = true; mysqlErr = null;",
    "    } catch (e) { mysqlErr = e.message; return null; }",
    "  }",
    "  return mysqlPool;",
    "}",
    "function readStore() { try { if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch {} return { sanctions: [], telemetryEvents: [] }; }",
    "function writeStore(s) { try { fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(s, null, 2), 'utf8'); } catch {} }",
    "function formatScpslCmd(raw) {",
    "  const t = String(raw || '').trim(); if (!t) return '';",
    "  if (t.startsWith('/') || t.startsWith('!') || t.startsWith('@') || t.startsWith('$')) return t;",
    "  const first = t.split(/\\s+/)[0].toLowerCase();",
    "  if (NATIVE_CMDS.has(first)) return t;",
    "  if (first === 'god' || first === 'noclip' || first === 'bypass') return '/' + t.replace(/\\s+on$/i,' 1').replace(/\\s+off$/i,' 0');",
    "  return '/' + t;",
    "}",
    "function normalizeDur(d) {",
    "  const c = String(d || '24h').trim().toLowerCase();",
    "  if (!c || c === '0' || c.includes('perm')) return '50y';",
    "  if (/^\\d+(s|m|h|d|w|mo|y)$/.test(c)) return c;",
    "  const n = (c.match(/(\\d+)/) || [0, '24'])[1];",
    "  if (c.includes('min')) return n + 'm'; if (c.includes('jour') || c.includes('day') || c.includes('j')) return n + 'd';",
    "  if (c.includes('sem') || c.includes('week')) return n + 'w'; if (c.includes('an') || c.includes('year')) return n + 'y';",
    "  return n + 'h';",
    "}",
    "function readLatestTxt(relDir, maxLines = 220) {",
    "  const dir = path.join(CONFIG_DIR, relDir);",
    "  if (!fs.existsSync(dir)) return { fileName: null, lines: [] };",
    "  const txts = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => a.t - b.t);",
    "  if (!txts.length) return { fileName: null, lines: [] };",
    "  const latest = txts[txts.length - 1].n;",
    "  return { fileName: latest, lines: fs.readFileSync(path.join(dir, latest), 'utf8').split(/\\r?\\n/).filter(Boolean).slice(-maxLines) };",
    "}",
    "function parsePlayersFromLogs() {",
    "  const la = readLatestTxt('SCP Secret Laboratory/LocalAdminLogs/' + GAME_PORT, 240);",
    "  const sv = readLatestTxt('SCP Secret Laboratory/ServerLogs/' + GAME_PORT, 240);",
    "  const map = new Map();",
    "  for (const ln of [...sv.lines, ...la.lines]) {",
    "    const sm = ln.match(/(\\d{17}@(?:steam|discord|northwood))/i); if (!sm) continue;",
    "    const sid = sm[1]; const lo = ln.toLowerCase();",
    "    const idm = ln.match(/\\[(\\d{1,4})\\]/) || ln.match(/\\bID[:\\s#]+(\\d{1,4})\\b/i) || ln.match(/\\((\\d{1,4})\\)\\s*[-–]/);",
    "    const nm = ln.match(/(?:\\]\\s*|[-–]\\s*|\\)\\s*)([^\\(\\[\\|]+?)\\s*\\(\\d{17}@/);",
    "    const prev = map.get(sid);",
    "    if (lo.includes('disconnected') || lo.includes('left the server') || lo.includes('kicked') || lo.includes('banned from')) { if (prev) map.set(sid, Object.assign({}, prev, { isOnline: false })); continue; }",
    "    const name = (nm && nm[1] ? nm[1].replace(/^[\\-\\*\\s:\\[\\]\\d]+/, '').trim() : '') || (prev && prev.name) || sid;",
    "    map.set(sid, { id: idm ? Number(idm[1]) : (prev ? prev.id : 0), name, steamId: sid, isOnline: true });",
    "  }",
    "  let li = -1; for (let i = la.lines.length - 1; i >= 0; i--) { if (/list of players|players\\s*\\(\\d+|no players connected/i.test(la.lines[i])) { li = i; break; } }",
    "  if (li !== -1) {",
    "    const set = new Set(); let empty = false;",
    "    for (const ln of la.lines.slice(li, li + 60)) {",
    "      if (/no players connected|0\\s*\\/\\s*\\d+\\s*players/i.test(ln)) empty = true;",
    "      const sm = ln.match(/(\\d{17}@(?:steam|discord|northwood))/i); if (!sm) continue;",
    "      set.add(sm[1]);",
    "      const idm = ln.match(/\\[(\\d{1,4})\\]/) || ln.match(/\\bID[:\\s#]+(\\d{1,4})\\b/i) || ln.match(/\\((\\d{1,4})\\)/);",
    "      const nm = ln.match(/(?:\\]\\s*|[-–]\\s*|\\)\\s*)([^\\(\\[\\|]+?)\\s*\\(\\d{17}@/);",
    "      const prev = map.get(sm[1]);",
    "      map.set(sm[1], { id: idm ? Number(idm[1]) : (prev ? prev.id : 1), name: (nm && nm[1] ? nm[1].replace(/^[\\-\\*\\s:\\[\\]\\d]+/, '').trim() : '') || (prev ? prev.name : sm[1]), steamId: sm[1], isOnline: true });",
    "    }",
    "    if (empty && set.size === 0) for (const [k, v] of map) map.set(k, Object.assign({}, v, { isOnline: false }));",
    "    else if (set.size > 0) for (const [k, v] of map) if (!set.has(k)) map.set(k, Object.assign({}, v, { isOnline: false }));",
    "  }",
    "  let seq = 1; const players = Array.from(map.values()).map((p) => p.id > 0 ? p : Object.assign({}, p, { id: seq++ }));",
    "  return { onlinePlayers: players.filter((p) => p.isOnline), allPlayers: players, laFile: la.fileName, svFile: sv.fileName, laLines: la.lines, svLines: sv.lines };",
    "}",
    "function getRedirectUri(req) {",
    "  if (DISCORD_REDIRECT_URI) return DISCORD_REDIRECT_URI.replace(/\\/+$/, '');",
    "  const fp = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();",
    "  const h = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:' + PORT).split(',')[0].trim();",
    "  const p = fp || (!/:\\d+$/.test(h) && !h.startsWith('localhost') ? 'https' : (req.protocol || 'http'));",
    "  return p + '://' + h + '/auth/callback';",
    "}",
    "function parseCookies(req) { const o = {}; (req.headers.cookie || '').split(';').forEach((s) => { const i = s.indexOf('='); if (i > 0) o[s.slice(0, i).trim()] = decodeURIComponent(s.slice(i + 1).trim()); }); return o; }",
    "function getSessionUser(req) { const s = parseCookies(req).lumishost_sid; return s ? sessions.get(s) || null : null; }",
    "function requireAuth(req, res, next) { const u = getSessionUser(req); if (!u) return res.status(401).json({ error: 'Authentification Discord requise.' }); req.user = u; next(); }",
    "function diagnosePteroError(st, d) {",
    "  const det = d && d.errors && d.errors[0] && d.errors[0].detail ? d.errors[0].detail : '';",
    "  if (st === 403 && det.includes('application API key')) return 'Cle ptla_ detectee. Utilisez une cle CLIENT API (ptlc_...) depuis Account -> API Credentials.';",
    "  if (st === 404) return 'Serveur introuvable (404) pour PTERO_SERVER_ID=' + PTERO_SERVER_ID;",
    "  return det || ('Erreur HTTP ' + st);",
    "}",
    "async function sendPteroCmd(rawCommand) {",
    "  const command = formatScpslCmd(rawCommand);",
    "  const r = await fetch(PTERO_URL + '/api/client/servers/' + PTERO_SERVER_ID + '/command', {",
    "    method: 'POST',",
    "    headers: { Authorization: 'Bearer ' + PTERO_API_KEY, Accept: 'Application/vnd.pterodactyl.v1+json', 'Content-Type': 'application/json' },",
    "    body: JSON.stringify({ command })",
    "  });",
    "  return { ok: r.ok, status: r.status, command };",
    "}",
    "async function pushWebhook(title, desc, color) {",
    "  if (!DISCORD_WEBHOOK_URL) return;",
    "  try { await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'LumisHost Site-19', embeds: [{ title, description: desc, color: color || 0xdc143c, timestamp: new Date().toISOString() }] }) }); } catch {}",
    "}",
    "function cfgMap() {",
    "  return {",
    "    'config_remoteadmin.txt': path.join(CONFIG_DIR, 'SCP Secret Laboratory/config', GAME_PORT, 'config_remoteadmin.txt'),",
    "    'config_gameplay.txt': path.join(CONFIG_DIR, 'SCP Secret Laboratory/config', GAME_PORT, 'config_gameplay.txt'),",
    "    'main_exiled.yml': path.join(CONFIG_DIR, 'EXILED/Configs', GAME_PORT + '-config.yml'),",
    "    'StaffLoadouts.yml': path.join(CONFIG_DIR, 'EXILED/Configs/StaffLoadouts.yml'),",
    "    'permissions.yml': path.join(CONFIG_DIR, 'EXILED/Configs/permissions.yml'),",
    "    'VipAdvantages.yml': path.join(CONFIG_DIR, 'EXILED/Configs/VipAdvantages.yml'),",
    "    'CustomTeams.yml': path.join(CONFIG_DIR, 'EXILED/Configs/CustomTeams.yml')",
    "  };",
    "}",
    "app.get('/api/auth/me', async (req, res) => { const db = await getDb(); res.json({ user: getSessionUser(req), oauthConfigured: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET), founderDiscordId: FOUNDER_DISCORD_ID, redirectUri: getRedirectUri(req), gamePort: GAME_PORT, serverId: PTERO_SERVER_ID, mysqlConnected: Boolean(db), mysqlErr }); });",
    "app.get('/auth/login', (req, res) => {",
    "  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) return res.status(400).send('DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET non configures dans Pterodactyl Startup.');",
    "  const p = new URLSearchParams({ client_id: DISCORD_CLIENT_ID, redirect_uri: getRedirectUri(req), response_type: 'code', scope: 'identify' });",
    "  res.redirect('https://discord.com/api/oauth2/authorize?' + p.toString());",
    "});",
    "app.get('/auth/callback', async (req, res) => {",
    "  const ru = getRedirectUri(req);",
    "  if (req.query.error) return res.status(400).send('Erreur Discord: ' + (req.query.error_description || req.query.error));",
    "  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) return res.status(400).send('OAuth2 non configure.');",
    "  if (!req.query.code) return res.redirect('/');",
    "  try {",
    "    const tr = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: ru }).toString() });",
    "    const td = await tr.json(); if (!tr.ok || !td.access_token) return res.status(400).send('Echec OAuth2: ' + (td.error_description || td.error || tr.status));",
    "    const ur = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + td.access_token } });",
    "    const du = await ur.json(); if (du.id !== FOUNDER_DISCORD_ID) return res.status(403).send('Acces refuse: ID ' + du.id + ' != ' + FOUNDER_DISCORD_ID);",
    "    const sid = crypto.randomBytes(24).toString('hex');",
    "    sessions.set(sid, { id: du.id, username: du.global_name || du.username, avatar: du.avatar ? 'https://cdn.discordapp.com/avatars/' + du.id + '/' + du.avatar + '.png' : null, role: 'Fondateur O5' });",
    "    res.setHeader('Set-Cookie', 'lumishost_sid=' + sid + '; Path=/; HttpOnly; SameSite=Lax'); res.redirect('/');",
    "  } catch (e) { res.status(500).send('Erreur OAuth2: ' + e.message); }",
    "});",
    "app.post('/api/auth/logout', (req, res) => { const s = parseCookies(req).lumishost_sid; if (s) sessions.delete(s); res.setHeader('Set-Cookie', 'lumishost_sid=; Path=/; Max-Age=0'); res.json({ ok: true }); });",
    "app.get('/api/status', requireAuth, async (_req, res) => {",
    "  if (!PTERO_API_KEY || !PTERO_API_KEY.startsWith('ptlc_')) return res.json({ connected: false, serverId: PTERO_SERVER_ID, gamePort: GAME_PORT, hint: 'Cle CLIENT API ptlc_... requise dans PTERO_CLIENT_API_KEY.' });",
    "  try {",
    "    const r = await fetch(PTERO_URL + '/api/client/servers/' + PTERO_SERVER_ID + '/resources', { headers: { Authorization: 'Bearer ' + PTERO_API_KEY, Accept: 'Application/vnd.pterodactyl.v1+json' } });",
    "    const d = await r.json();",
    "    res.json({ connected: r.ok, status: r.status, hint: r.ok ? 'Connecte au serveur SCP:SL!' : diagnosePteroError(r.status, d), data: d, serverId: PTERO_SERVER_ID, gamePort: GAME_PORT });",
    "  } catch (e) { res.status(502).json({ connected: false, error: e.message }); }",
    "});",
    "app.get('/api/players/live', requireAuth, async (req, res) => {",
    "  if (req.query.refresh === '1' && PTERO_API_KEY) { await sendPteroCmd('list'); await new Promise((r) => setTimeout(r, 550)); }",
    "  const parsed = parsePlayersFromLogs();",
    "  res.json({ ok: true, onlinePlayers: parsed.onlinePlayers, allPlayers: parsed.allPlayers, laFile: parsed.laFile, svFile: parsed.svFile });",
    "});",
    "app.get('/api/logs/live', requireAuth, (_req, res) => {",
    "  const parsed = parsePlayersFromLogs();",
    "  const store = readStore();",
    "  res.json({ ok: true, laFile: parsed.laFile, svFile: parsed.svFile, serverLines: parsed.svLines.slice(-80), localAdminLines: parsed.laLines.slice(-80), sanctions: store.sanctions || [], events: store.telemetryEvents || [] });",
    "});",
    "app.post('/api/power', requireAuth, async (req, res) => {",
    "  const signal = req.body && req.body.signal;",
    "  if (!['start', 'restart', 'stop', 'kill'].includes(signal)) return res.status(400).json({ error: 'Signal invalide' });",
    "  if (!PTERO_API_KEY) return res.status(400).json({ error: 'PTERO_CLIENT_API_KEY requise' });",
    "  try { const r = await fetch(PTERO_URL + '/api/client/servers/' + PTERO_SERVER_ID + '/power', { method: 'POST', headers: { Authorization: 'Bearer ' + PTERO_API_KEY, Accept: 'Application/vnd.pterodactyl.v1+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ signal }) }); res.status(r.ok ? 200 : r.status).json({ ok: r.ok, signal }); } catch (e) { res.status(502).json({ error: e.message }); }",
    "});",
    "app.post('/api/command', requireAuth, async (req, res) => {",
    "  const raw = req.body && req.body.command;",
    "  if (!raw || !PTERO_API_KEY) return res.status(400).json({ error: 'Commande ou cle API manquante' });",
    "  try {",
    "    const parts = String(raw).split(/\\r?\\n|\\s*&&\\s*/).map((s) => formatScpslCmd(s)).filter(Boolean);",
    "    const executed = [];",
    "    for (const c of parts) { const r = await sendPteroCmd(c); if (!r.ok) return res.status(r.status).json({ ok: false, error: 'Echec commande ' + r.command, executed }); executed.push(r.command); }",
    "    const store = readStore(); store.telemetryEvents.unshift({ id: 'CMD-' + Date.now(), time: new Date().toISOString(), category: 'CONSOLE', details: req.user.username + ': ' + executed.join(' ; ') }); store.telemetryEvents = store.telemetryEvents.slice(0, 200); writeStore(store);",
    "    res.json({ ok: true, command: executed.join(' ; '), executed });",
    "  } catch (e) { res.status(502).json({ error: e.message }); }",
    "});",
    "app.post('/api/sanction', requireAuth, async (req, res) => {",
    "  const { type = 'ban', target = '', duration = '1d', reason = 'Moderation Site-19' } = req.body || {};",
    "  if (!target.trim()) return res.status(400).json({ error: 'Cible requise (ID ou SteamID64)' });",
    "  const ct = target.trim(); const dur = normalizeDur(duration); const rs = String(reason).replace(/\"/g, \"'\").trim();",
    "  const parsed = parsePlayersFromLogs();",
    "  const matchOnline = parsed.onlinePlayers.find((p) => String(p.id) === ct || p.steamId.toLowerCase() === ct.toLowerCase());",
    "  const cmds = [];",
    "  if (type === 'ban') { if (matchOnline) cmds.push('/ban ' + matchOnline.id + ' ' + dur + ' ' + rs); if (ct.includes('@')) cmds.push('/oban ' + ct + ' ' + dur + ' ' + rs); else if (matchOnline) cmds.push('/oban ' + matchOnline.steamId + ' ' + dur + ' ' + rs); else if (!matchOnline) cmds.push('/oban ' + ct + '@steam ' + dur + ' ' + rs); }",
    "  else if (type === 'kick') { cmds.push('/kick ' + (matchOnline ? matchOnline.id : ct) + ' ' + rs); }",
    "  else if (type === 'unban') { const sid = ct.includes('@') ? ct : ct + '@steam'; cmds.push('/unban id ' + sid); }",
    "  const executed = [];",
    "  if (PTERO_API_KEY) { for (const c of cmds) { const r = await sendPteroCmd(c); if (r.ok) executed.push(r.command); } }",
    "  const rec = { id: 'SAN-' + Date.now().toString().slice(-6), targetName: matchOnline ? matchOnline.name : ct, targetSteamId: matchOnline ? matchOnline.steamId : ct, type: type.toUpperCase(), reason: rs, duration: dur, moderator: req.user.username, source: 'WebPanel', timestamp: new Date().toLocaleString('fr-FR'), active: type !== 'unban' && type !== 'kick' };",
    "  const store = readStore(); store.sanctions.unshift(rec); store.sanctions = store.sanctions.slice(0, 200); writeStore(store);",
    "  const db = await getDb(); if (db) { try { await db.query('INSERT INTO lumishost_sanctions (id,target_name,target_steam_id,sanction_type,reason,duration,moderator,source,timestamp_label,active) VALUES (?,?,?,?,?,?,?,?,?,?)', [rec.id, rec.targetName, rec.targetSteamId, rec.type, rec.reason, rec.duration, rec.moderator, rec.source, rec.timestamp, rec.active ? 1 : 0]); } catch {} }",
    "  await pushWebhook('Sanction ' + rec.type + ' Site-19', 'Cible: `' + rec.targetSteamId + '` | Duree: `' + dur + '` | Motif: ' + rs + '\\nCmd: `' + executed.join(' ; ') + '`', type === 'unban' ? 0x16a34a : 0xdc143c);",
    "  res.json({ ok: executed.length > 0, executed, sanction: rec });",
    "});",
    "app.post('/api/perms/grant', requireAuth, async (req, res) => {",
    "  const { targetId, role, persistInFile, playerLabel } = req.body || {};",
    "  if (!targetId || !role) return res.status(400).json({ error: 'targetId ou role manquant' });",
    "  try {",
    "    const ct = String(targetId).trim(); const cr = String(role).trim();",
    "    const fmt = ct.includes('@') || /^\\d{1,4}$/.test(ct) ? ct : ct + '@steam';",
    "    let savedInFile = false;",
    "    if (persistInFile && fmt.includes('@')) {",
    "      const rp = cfgMap()['config_remoteadmin.txt'];",
    "      if (fs.existsSync(rp)) {",
    "        let t = fs.readFileSync(rp, 'utf8');",
    "        const esc = fmt.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');",
    "        const re = new RegExp('^\\\\s*-\\\\s*' + esc + ':.*$', 'm');",
    "        if (re.test(t)) { t = t.replace(re, ' - ' + fmt + ': ' + cr); }",
    "        else if (/^Members:\\s*\\[\\]/m.test(t)) { t = t.replace(/^Members:\\s*\\[\\]/m, 'Members:\\n # ' + (playerLabel || fmt) + '\\n - ' + fmt + ': ' + cr); }",
    "        else if (t.includes('Members:')) { t = t.replace('Members:', 'Members:\\n # ' + (playerLabel || fmt) + '\\n - ' + fmt + ': ' + cr); }",
    "        else { t = 'Members:\\n # ' + (playerLabel || fmt) + '\\n - ' + fmt + ': ' + cr + '\\n\\n' + t; }",
    "        fs.writeFileSync(rp, t, 'utf8'); savedInFile = true;",
    "      }",
    "    }",
    "    let livePlayerId = /^\\d{1,4}$/.test(fmt) ? fmt : null;",
    "    if (!livePlayerId && fmt.includes('@')) {",
    "      if (PTERO_API_KEY) { await sendPteroCmd('list'); await new Promise((r) => setTimeout(r, 500)); }",
    "      const found = parsePlayersFromLogs().onlinePlayers.find((p) => p.steamId.toLowerCase() === fmt.toLowerCase());",
    "      if (found) livePlayerId = String(found.id);",
    "    }",
    "    let cmdRes = { ok: false, status: 0 };",
    "    if (PTERO_API_KEY) {",
    "      await sendPteroCmd('config reload');",
    "      if (livePlayerId) cmdRes = await sendPteroCmd('/setgroup ' + livePlayerId + ' ' + cr);",
    "    }",
    "    res.json({ ok: savedInFile || cmdRes.ok, savedInFile, livePlayerId, liveSetgroupSent: cmdRes.ok, configReloadSent: Boolean(PTERO_API_KEY), message: savedInFile ? ('config_remoteadmin.txt sauvegarde (' + fmt + ' -> ' + cr + ')' + (livePlayerId ? ' + /setgroup ' + livePlayerId + ' ' + cr : ' (reconnectez-vous pour charger le badge)')) : 'Echec ecriture config_remoteadmin.txt' });",
    "  } catch (e) { res.status(502).json({ error: e.message }); }",
    "});",
    "app.get('/api/configs', requireAuth, (_req, res) => { const files = {}; for (const [k, fp] of Object.entries(cfgMap())) files[k] = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '# Introuvable: ' + fp; res.json({ files }); });",
    "app.post('/api/configs/save', requireAuth, async (req, res) => { const { fileKey, content, reloadRa } = req.body || {}; const fp = cfgMap()[fileKey]; if (!fp || typeof content !== 'string') return res.status(400).json({ error: 'Invalide' }); fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, content, 'utf8'); if (reloadRa && PTERO_API_KEY) await sendPteroCmd('config reload'); res.json({ ok: true, fileKey }); });",
    "app.post('/api/staff-loadouts/save', requireAuth, async (req, res) => {",
    "  const { roles } = req.body || {}; if (!Array.isArray(roles)) return res.status(400).json({ error: 'Roles invalides' });",
    "  const mk = (r, ind) => { const p = ' '.repeat(ind); const ip = ' '.repeat(ind + 2); const its = Array.isArray(r.items) && r.items.length ? '\\n' + r.items.map((x) => ip + '  - \"' + String(x).trim() + '\"').join('\\n') : ' []'; return p + r.roleKey + ':\\n' + ip + 'display_name: \"' + (r.label || r.roleKey) + '\"\\n' + ip + 'auto_equip_on_spawn: ' + !!r.autoEquipOnSpawn + '\\n' + ip + 'equip_only_in_tutorial_mode: ' + !!r.equipOnlyInTutorialMode + '\\n' + ip + 'clear_inventory_before_equip: ' + !!r.clearInventoryBeforeEquip + '\\n' + ip + 'items:' + its; };",
    "  const hdr = 'lumishost_staff_loadouts:\\n  is_enabled: true\\n  debug: false\\n  give_delay_seconds: 0.6\\n  broadcast_on_equip: true\\n  broadcast_duration: 4\\n  broadcast_message: \"<color=#FAFF86><b>[STAFF SITE-19]</b></color> Kit <color=#00B7EB>{ROLE}</color> equipe ({COUNT} items).\"\\n  roles:\\n';",
    "  const yml = hdr + roles.map((r) => mk(r, 2)).join('\\n\\n') + '\\n';",
    "  const lp = cfgMap()['StaffLoadouts.yml']; fs.mkdirSync(path.dirname(lp), { recursive: true }); fs.writeFileSync(lp, yml, 'utf8');",
    "  const mp = cfgMap()['main_exiled.yml']; if (fs.existsSync(mp)) { const prev = fs.readFileSync(mp, 'utf8'); const i = prev.indexOf('lumishost_staff_loadouts:'); if (i !== -1) { const n = prev.indexOf('lumishost_vip_advantages:', i); const rep = hdr + roles.map((r) => mk(r, 4)).join('\\n') + '\\n\\n'; fs.writeFileSync(mp, n !== -1 ? prev.slice(0, i) + rep + prev.slice(n) : prev.slice(0, i) + rep, 'utf8'); } }",
    "  res.json({ ok: true, yml });",
    "});",
    "app.get('/api/telemetry/events', requireAuth, (_req, res) => { const s = readStore(); res.json({ events: s.telemetryEvents || [] }); });",
    "app.post('/api/telemetry/ingest', (req, res) => { const s = readStore(); const e = Object.assign({ id: 'EVT-' + Date.now(), time: new Date().toISOString() }, req.body || {}); s.telemetryEvents.unshift(e); s.telemetryEvents = s.telemetryEvents.slice(0, 200); writeStore(s); res.json({ ok: true }); });",
    "app.use(express.static(path.join(__dirname, 'public')));",
    "app.listen(PORT, '0.0.0.0', () => console.log('[LUMISHOST WEBPANEL] LumisHost RemoteAdmin v2.6.0 (MySQL + /RA) sur http://0.0.0.0:' + PORT));"
  ].join('\n');
}

export function generateEmbeddedWebPanelHtml(): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>LumisHost RemoteAdmin · Site-19 Command Center</title>
<style>*{box-sizing:border-box}body{margin:0;background:#070a11;color:#f1f5f9;font-family:Inter,system-ui,-apple-system,sans-serif;min-height:100vh}.hidden{display:none!important}
.login-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(circle at top,#172554 0%,#070a11 55%)}
.login-card{width:100%;max-width:480px;background:#0b1120;border:1px solid #1e293b;border-radius:16px;padding:30px;box-shadow:0 24px 60px rgba(0,0,0,.55)}
.topnav{position:sticky;top:0;z-index:30;background:#070a11;border-bottom:1px solid #1e293b;padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.nav-links{display:flex;align-items:center;gap:4px;overflow-x:auto}
.nav-tab{padding:8px 14px;border-radius:8px;border:none;background:transparent;color:#94a3b8;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.nav-tab:hover{color:#fff;background:#0f172a}.nav-tab.active{color:#fff;background:#1e293b}
.subbar{background:#0b1120;border-bottom:1px solid #1e293b;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:12px}
.wrap{max-width:1360px;margin:0 auto;padding:20px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:12px;margin-bottom:18px}
.kpi{background:#0b1120;border:1px solid #1e293b;border-radius:12px;padding:14px 16px}
.kpi-lbl{font-size:11px;color:#94a3b8;margin-bottom:4px}.kpi-val{font-size:20px;font-weight:800;color:#fff}.kpi-sub{font-size:11px;font-family:monospace;color:#38bdf8;margin-top:3px}
.card{background:#0b1120;border:1px solid #1e293b;border-radius:14px;padding:18px;margin-bottom:16px}
.grid-2{display:grid;grid-template-columns:1fr 1.15fr;gap:16px}
.zones-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:12px}
.zone-box{background:#070a11;border:1px solid #1e293b;border-radius:12px;padding:14px}
.hud-box{background:#05080f;border:1px solid #1e293b;border-radius:14px;padding:20px;min-height:330px;display:flex;flex-direction:column;justify-content:space-between}
.bc-banner{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:10px;padding:10px 14px;text-align:center;font-size:12px;color:#fde68a}
.cassie-bar{background:#0b1120;border:1px solid #1e293b;border-radius:8px;padding:8px 12px;font-family:monospace;font-size:11px;color:#94a3b8}
.player-row{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-radius:10px;background:#070a11;border:1px solid #1e293b;margin-top:6px;cursor:pointer}
.player-row:hover{border-color:#f59e0b}
h1,h2,h3{margin:0;color:#fff}h2{font-size:16px}h3{font-size:14px}
.sub{font-family:monospace;font-size:11px;color:#22d3ee}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input,select,textarea{padding:9px 12px;border-radius:8px;border:1px solid #334155;background:#020617;color:#f8fafc;font-family:monospace;font-size:12px}
.grow{flex:1;min-width:180px}textarea{width:100%;min-height:360px;line-height:1.45}
button{padding:8px 14px;border-radius:8px;border:none;font-weight:700;cursor:pointer;font-size:12px}
.btn-discord{background:#5865F2;color:#fff;width:100%;padding:13px;font-size:14px}.btn-indigo{background:#4f46e5;color:#fff}
.btn-amber{background:#f59e0b;color:#020617}.btn-cyan{background:#06b6d4;color:#020617}.btn-emerald{background:#10b981;color:#020617}.btn-rose{background:#e11d48;color:#fff}.btn-slate{background:#1e293b;color:#e2e8f0;border:1px solid #334155}
.pill-green{padding:3px 9px;border-radius:6px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.35);color:#34d399;font-size:11px;font-weight:700}
.items-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:8px;margin-top:12px}
.item-chip{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;background:#020617;border:1px solid #1e293b;font-size:12px;font-family:monospace;cursor:pointer}
pre{background:#020617;border:1px solid #1e293b;padding:12px;border-radius:10px;overflow:auto;font-size:12px;color:#34d399;margin:10px 0 0;max-height:280px}
@media(max-width:980px){.grid-2{grid-template-columns:1fr}.topnav{height:auto;padding:10px;flex-wrap:wrap}}</style></head>
<body>
<div id="loginView" class="login-shell"><div class="login-card">
<div class="sub">LUMISHOST REMOTEADMIN · SITE-19 COMMAND CENTER</div><h1 style="font-size:20px;margin-top:8px">Connexion Discord Requise</h1>
<p style="color:#94a3b8;font-size:13px;line-height:1.5">Acces securise par Discord OAuth2 pour le Fondateur O5 (ID : <span id="fid" style="color:#fff;font-family:monospace">985589556655054858</span>).</p>
<div id="oauthSection" class="hidden" style="margin-top:16px"><a href="/auth/login" style="text-decoration:none"><button class="btn-discord">Se connecter avec Discord</button></a></div>
<div id="oauthMissing" class="hidden" style="margin-top:14px;padding:12px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#fbbf24;font-size:12px">Configurez <b>DISCORD_CLIENT_ID</b> et <b>DISCORD_CLIENT_SECRET</b> dans Pterodactyl Startup.</div>
<div style="margin-top:12px;font-size:11px;font-family:monospace;color:#64748b">Redirect URI OAuth2 : <span id="ruri" style="color:#38bdf8"></span></div>
</div></div>

<div id="appView" class="hidden">
<header class="topnav">
  <div style="font-weight:800;font-size:16px;color:#fff">LumisHost RemoteAdmin</div>
  <nav class="nav-links">
    <button class="nav-tab active" onclick="switchTab('control',this)">Contrôle En Jeu</button>
    <button class="nav-tab" onclick="switchTab('players',this)">Joueurs, Logs &amp; Kills</button>
    <button class="nav-tab" onclick="switchTab('events',this)">Events &amp; Teams</button>
    <button class="nav-tab" onclick="switchTab('admin',this)">Administration</button>
    <button class="nav-tab" onclick="switchTab('dev',this)">Développeur</button>
  </nav>
  <div class="row">
    <button class="btn-indigo" id="discordBadge">Discord</button>
    <button class="btn-rose" onclick="logout()">Déconnexion</button>
  </div>
</header>
<div class="subbar">
  <div style="font-family:monospace;color:#94a3b8">Panel : <span style="color:#fff">scpsl.lumishost.com</span> · Serveur : <span style="color:#22d3ee">play.lumishost.com:1031</span> · Statut : <span id="topStatus" style="color:#34d399;font-weight:700">RUNNING</span> · DB : <span id="dbBadge" style="color:#38bdf8;font-weight:700">Disque</span></div>
  <div class="row">
    <span class="pill-green">Permission Active : Fondateur O5</span>
    <button class="btn-slate" onclick="switchTab('dev',document.querySelectorAll('.nav-tab')[4])">&lt;/&gt; Mega Egg &amp; Dev</button>
  </div>
</div>

<div class="wrap">
<section id="tab-control">
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-lbl">Joueurs Connectés (Live)</div><div class="kpi-val" id="kPlayers">0 / 32</div><div class="kpi-sub">Temps réel via list</div></div>
    <div class="kpi"><div class="kpi-lbl">CPU &amp; Charge</div><div class="kpi-val" id="kCpu">-</div><div class="kpi-sub">60.0 TPS · En cours</div></div>
    <div class="kpi"><div class="kpi-lbl">RAM Mémoire</div><div class="kpi-val" id="kRam">-</div><div class="kpi-sub" id="kState">RUNNING</div></div>
    <div class="kpi"><div class="kpi-lbl">Disque Serveur</div><div class="kpi-val" id="kDisk">-</div><div class="kpi-sub">EXILED 9.15.3 + LabApi</div></div>
    <div class="kpi"><div class="kpi-lbl">Ogive Alpha Warhead</div><div class="kpi-val" style="color:#34d399" id="warheadLbl">STANDBY</div><div class="row" style="margin-top:6px"><button class="btn-rose" style="padding:4px 8px;font-size:11px" onclick="quickCmd('/warhead detonate')">Déclencher</button><button class="btn-slate" style="padding:4px 8px;font-size:11px" onclick="quickCmd('/warhead cancel')">Annuler</button></div></div>
    <div class="kpi"><div class="kpi-lbl">Systèmes Complexe</div><div class="kpi-val" id="connText">NOMINAL</div><div class="kpi-sub">play.lumishost.com:1031</div></div>
  </div>

  <div class="card">
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <div><div class="sub">JOUEURS EN DIRECT (CLIQUEZ UN JOUEUR POUR LE CIBLER)</div><h2 style="margin-top:4px">Liste des Vrais Joueurs Connectés</h2></div>
      <button class="btn-cyan" onclick="loadPlayers(true)">Rafraîchir (list)</button>
    </div>
    <div id="livePlayersBox" style="font-size:12px;color:#94a3b8">Chargement des joueurs en direct...</div>
  </div>

  <div class="card">
    <div class="row" style="justify-content:space-between;margin-bottom:14px">
      <div><div class="sub">INTERFACE DE JEU EN DIRECT · COMMANDES REMOTEADMIN (/commande)</div><h2 style="margin-top:4px">Contrôle Joueur Ciblé &amp; Secteurs Site-19</h2></div>
      <div class="row"><button class="btn-amber" onclick="setHudMode('mix')">Vue Mixte</button><button class="btn-slate" onclick="setHudMode('hud')">HUD</button><button class="btn-slate" onclick="setHudMode('map')">Secteurs</button></div>
    </div>
    <div class="grid-2" id="tacticalGrid">
      <div class="hud-box" id="hudPanel">
        <div class="row" style="justify-content:space-between"><span class="pill-green" id="spectateBadge">CIBLE : ID #1</span><button class="btn-cyan" onclick="loadStatus()">Actualiser Stats</button></div>
        <div class="bc-banner"><div style="font-weight:700;color:#fbbf24;margin-bottom:6px">BROADCAST ÉCRAN EN JEU (/bc)</div>
          <div class="row"><input id="hudBcInput" class="grow" placeholder="[ANNONCE STAFF] Message sur play.lumishost.com:1031..."/><button class="btn-amber" onclick="sendHudBc()">Envoyer BC</button></div>
        </div>
        <div style="text-align:center;padding:12px 0">
          <div class="row" style="justify-content:center;margin-bottom:10px">
            <input id="quickTargetId" style="width:140px" placeholder="ID (ex: 1)" value="1"/>
            <select id="quickRoleSel"><option value="Tutorial">Tutorial (Staff)</option><option value="NtfCaptain">MTF Captain</option><option value="ChaosMarauder">Chaos</option><option value="Scp173">SCP-173</option><option value="Scp049">SCP-049</option><option value="Scp096">SCP-096</option><option value="ClassD">Class-D</option><option value="Scientist">Scientist</option></select>
            <button class="btn-amber" onclick="quickCmd('/forceclass '+(document.getElementById('quickTargetId').value||'1')+' '+document.getElementById('quickRoleSel').value)">Forceclass</button>
          </div>
          <div class="row" style="justify-content:center">
            <button class="btn-amber" onclick="runSelfCmd('/god','1')">GOD ON</button>
            <button class="btn-slate" onclick="runSelfCmd('/god','0')">GOD OFF</button>
            <button class="btn-emerald" onclick="runSelfCmd('/bypass','1')">BYPASS</button>
            <button class="btn-cyan" onclick="runSelfCmd('/noclip','1')">NOCLIP</button>
            <button class="btn-emerald" onclick="runSelfCmd('/give','KeycardO5')">Give O5</button>
          </div>
        </div>
        <div class="cassie-bar"><div class="row"><input id="hudCassieInput" class="grow" placeholder="C.A.S.S.I.E. : attention all personnel..."/><button class="btn-cyan" onclick="sendHudCassie()">/cassie</button></div></div>
      </div>

      <div class="card" style="margin:0;background:#070a11" id="mapPanel">
        <div class="row" style="justify-content:space-between"><h3>CARTE RADAR DES SECTEURS — Commandes Directes</h3><div class="row"><button class="btn-amber" onclick="quickCmd('!verify static')">!verify static</button><button class="btn-slate" onclick="quickCmd('config reload')">Config Reload</button></div></div>
        <div class="zones-grid">
          <div class="zone-box"><div style="font-weight:700;color:#38bdf8">SURF-00 · Surface</div><div class="sub" style="color:#94a3b8;margin:4px 0 10px">Héliport MTF · Gate A/B</div><div class="row"><button class="btn-slate" onclick="quickCmd('sr')">Restart Round</button><button class="btn-cyan" onclick="quickCmd('/respawn')">Respawn</button></div></div>
          <div class="zone-box"><div style="font-weight:700;color:#60a5fa">EZ-01 · Entrance</div><div class="sub" style="color:#94a3b8;margin:4px 0 10px">Intercom · Bureaux</div><div class="row"><button class="btn-slate" onclick="quickCmd('/intercom-reset')">Reset Intercom</button><button class="btn-cyan" onclick="quickCmd('/unlock all')">Unlock Portes</button></div></div>
          <div class="zone-box"><div style="font-weight:700;color:#f87171">HCZ-02 · Heavy</div><div class="sub" style="color:#94a3b8;margin:4px 0 10px">Ogive Alpha · Micro H.I.D.</div><div class="row"><button class="btn-rose" onclick="quickCmd('/warhead detonate')">Ogive Alpha</button><button class="btn-slate" onclick="quickCmd('/lock all')">Lock Portes</button></div></div>
          <div class="zone-box"><div style="font-weight:700;color:#fbbf24">LCZ-03 · Light</div><div class="sub" style="color:#94a3b8;margin:4px 0 10px">SCP-914 · Cellules</div><div class="row"><button class="btn-amber" onclick="quickCmd('/decontaminate')">Décontaminer</button><button class="btn-slate" onclick="quickCmd('/cleanup items')">Cleanup Items</button></div></div>
        </div>
        <div class="row" style="margin-top:12px"><input id="cmdInput" class="grow" placeholder="Commande libre (ex: /bc 10 Bonjour, /give 1 KeycardO5, list, sr)"/><button class="btn-amber" onclick="sendCmd()">Exécuter</button></div>
        <pre id="consoleOut">Prêt.</pre>
      </div>
    </div>
  </div>
</section>

<section id="tab-players" class="hidden">
  <div class="grid-2">
    <div class="card"><h2>Sanctions Rapides (/ban + /oban + /kick + /unban id + MySQL)</h2>
      <div class="row" style="margin-top:10px"><input id="modTarget" class="grow" placeholder="SteamID64 (76561199...@steam) ou ID joueur (ex: 1)"/></div>
      <div class="row" style="margin-top:8px"><input id="modDuration" placeholder="Durée (1h, 24h, 7d, perm)" value="7d"/><input id="modReason" class="grow" placeholder="Raison" value="Non-respect du règlement Site-19"/></div>
      <div class="row" style="margin-top:10px"><button class="btn-rose" onclick="runMod('ban')">Bannir</button><button class="btn-amber" onclick="runMod('kick')">Kick</button><button class="btn-emerald" onclick="runMod('unban')">Débannir</button></div>
      <pre id="modOut">Prêt pour modération.</pre>
    </div>
    <div class="card"><div class="row" style="justify-content:space-between"><h2>Logs Serveur Réels (ServerLogs &amp; LocalAdmin)</h2><button class="btn-cyan" onclick="loadLogs()">Rafraîchir Logs</button></div><pre id="logsOut" style="max-height:380px">Chargement...</pre></div>
  </div>
</section>

<section id="tab-events" class="hidden">
  <div class="card"><h2>Équipes Custom &amp; Événements Site-19</h2>
    <div class="row" style="margin-top:12px">
      <button class="btn-rose" onclick="quickCmd('/customteam spawn alpha1')">Déployer FIM Alpha-1</button>
      <button class="btn-cyan" onclick="quickCmd('/customteam spawn goc')">Déployer GOC</button>
      <button class="btn-emerald" onclick="quickCmd('/customteam spawn serpents_hand')">Déployer Main du Serpent</button>
      <button class="btn-amber" onclick="quickCmd('/roundlock')">Toggle RoundLock</button>
      <button class="btn-slate" onclick="quickCmd('/lobbylock')">Toggle LobbyLock</button>
    </div>
    <div class="row" style="margin-top:12px"><input id="bcText" class="grow" placeholder="Message d'événement ou annonce CASSIE..."/><button class="btn-cyan" onclick="sendBroadcast()">/bc 10</button><button class="btn-amber" onclick="sendCassie()">/cassie</button></div>
    <pre id="evOut">Prêt.</pre>
  </div>
</section>

<section id="tab-admin" class="hidden">
  <div class="card"><h2>1. Attribuer un Grade / Permissions Staff &amp; VIP (/setgroup + config_remoteadmin.txt)</h2>
    <div class="row" style="margin-top:10px"><input id="steamInput" class="grow" placeholder="SteamID64 (76561199...@steam) ou ID joueur (ex: 1)"/><input id="staffLabelInput" placeholder="Pseudo"/><select id="roleSelect"><option value="owner">owner (Fondateur O5)</option><option value="developer">developer (Développeur)</option><option value="admin">admin (Administrateur)</option><option value="moderator">moderator (Modérateur)</option><option value="helper">helper (Helpeur)</option><option value="vip-keter">vip-keter (VIP Keter)</option><option value="vip-euclid">vip-euclid (VIP Euclid)</option></select></div>
    <div class="row" style="margin-top:10px"><label style="display:flex;align-items:center;gap:8px;font-size:13px"><input id="persistCheck" type="checkbox" checked/>Enregistrer dans config_remoteadmin.txt</label><button class="btn-amber" onclick="grantPerms()">Appliquer Permissions &amp; Tag</button></div>
    <pre id="permOut">Prêt.</pre>
  </div>
  <div class="card"><h2>2. Items Staff Auto-Équipés EXILED 9 (StaffLoadouts.yml + 1031-config.yml)</h2>
    <div class="row" style="margin-top:10px"><select id="itemRoleSelect" onchange="renderStaffItemsEditor()"><option value="owner">owner — Fondateur O5</option><option value="developer">developer — Développeur</option><option value="admin">admin — Administrateur</option><option value="moderator">moderator — Modérateur</option><option value="helper">helper — Helpeur</option></select>
    <label class="item-chip"><input type="checkbox" id="chkAutoEquip" onchange="updateRoleFlag('autoEquipOnSpawn',this.checked)"/>Auto-Equip Spawn</label>
    <label class="item-chip"><input type="checkbox" id="chkTutorial" onchange="updateRoleFlag('equipOnlyInTutorialMode',this.checked)"/>Tutorial uniquement</label>
    <label class="item-chip"><input type="checkbox" id="chkClearInv" onchange="updateRoleFlag('clearInventoryBeforeEquip',this.checked)"/>Vider inventaire</label></div>
    <div id="itemsGrid" class="items-grid"></div>
    <div class="row" style="margin-top:14px"><button class="btn-emerald" onclick="saveStaffLoadouts()">Sauvegarder StaffLoadouts.yml + 1031-config.yml</button></div>
    <pre id="itemsOut">Modifiez puis sauvegardez.</pre>
  </div>
</section>

<section id="tab-dev" class="hidden">
  <div class="card"><h2>Contrôle Alimentation Pterodactyl &amp; Éditeur Configs Live</h2>
    <div class="row" style="margin-top:10px"><button class="btn-emerald" onclick="powerAction('start')">Démarrer</button><button class="btn-amber" onclick="powerAction('restart')">Redémarrer</button><button class="btn-rose" onclick="powerAction('stop')">Arrêter</button><button class="btn-cyan" onclick="loadStatus()">Tester API Pterodactyl</button></div>
    <div class="row" style="margin-top:12px"><select id="cfgFileSelect" class="grow" onchange="showSelectedConfig()"><option value="config_remoteadmin.txt">config_remoteadmin.txt</option><option value="config_gameplay.txt">config_gameplay.txt</option><option value="main_exiled.yml">EXILED/Configs/1031-config.yml</option><option value="StaffLoadouts.yml">EXILED/Configs/StaffLoadouts.yml</option><option value="permissions.yml">EXILED/Configs/permissions.yml</option><option value="VipAdvantages.yml">EXILED/Configs/VipAdvantages.yml</option><option value="CustomTeams.yml">EXILED/Configs/CustomTeams.yml</option></select><button class="btn-slate" onclick="loadConfigs()">Recharger</button><button class="btn-emerald" onclick="saveSelectedConfig()">Sauvegarder + Reload RA</button></div>
    <div style="margin-top:10px"><textarea id="cfgEditor"></textarea></div>
    <pre id="cfgOut">Prêt.</pre>
  </div>
</section>
</div></div>
<script>
const ITEMS=['KeycardO5','KeycardFacilityManager','KeycardMTFCaptain','KeycardChaosInsurgency','GunCOM45','GunE11SR','GunFRMG0','GunLogicer','GunCrossvec','GunShotgun','MicroHID','ParticleDisruptor','Jailbird','SCP268','SCP1344','SCP1576','SCP500','SCP207','SCP1853','SCP2176','SCP018','ArmorHeavy','ArmorCombat','Medkit','Adrenaline','Painkillers','Radio','Flashlight','GrenadeHE','GrenadeFlash'];
const st={owner:{label:'Fondateur O5',autoEquipOnSpawn:true,equipOnlyInTutorialMode:true,clearInventoryBeforeEquip:false,items:['KeycardO5','GunCOM45','Jailbird','SCP268','SCP500','Radio']},developer:{label:'Developpeur',autoEquipOnSpawn:true,equipOnlyInTutorialMode:true,clearInventoryBeforeEquip:false,items:['KeycardO5','GunFRMG0','SCP268','SCP1576','Radio']},admin:{label:'Administrateur',autoEquipOnSpawn:true,equipOnlyInTutorialMode:true,clearInventoryBeforeEquip:false,items:['KeycardO5','GunE11SR','Jailbird','SCP268','Medkit','Radio']},moderator:{label:'Moderateur',autoEquipOnSpawn:true,equipOnlyInTutorialMode:true,clearInventoryBeforeEquip:false,items:['KeycardO5','SCP268','SCP1344','SCP1576','Radio']},helper:{label:'Helpeur',autoEquipOnSpawn:true,equipOnlyInTutorialMode:true,clearInventoryBeforeEquip:false,items:['KeycardFacilityManager','SCP1576','Medkit','Radio']}};
let cfgs={};
async function init(){const d=await(await fetch('/api/auth/me')).json();document.getElementById('fid').textContent=d.founderDiscordId;document.getElementById('ruri').textContent=d.redirectUri;document.getElementById(d.oauthConfigured?'oauthSection':'oauthMissing').classList.remove('hidden');if(d.user){document.getElementById('loginView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');document.getElementById('discordBadge').textContent='Discord · '+d.user.username;document.getElementById('dbBadge').textContent=d.mysqlConnected?'MySQL Connecté':'Disque Local';renderStaffItemsEditor();loadStatus();loadPlayers(true);loadConfigs();loadLogs();setInterval(()=>loadPlayers(false),15000);}}
function switchTab(t,b){document.querySelectorAll('.wrap section').forEach(s=>s.classList.add('hidden'));document.getElementById('tab-'+t).classList.remove('hidden');document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));if(b)b.classList.add('active');}
function setHudMode(m){document.getElementById('hudPanel').classList.toggle('hidden',m==='map');document.getElementById('mapPanel').classList.toggle('hidden',m==='hud');document.getElementById('tacticalGrid').style.gridTemplateColumns=m==='mix'?'':'1fr';}
async function logout(){await fetch('/api/auth/logout',{method:'POST'});location.reload();}
async function loadStatus(){const d=await(await fetch('/api/status')).json();document.getElementById('consoleOut').textContent=JSON.stringify(d,null,2);if(d.connected&&d.data&&d.data.attributes){const a=d.data.attributes,r=a.resources||{},stxt=String(a.current_state||'running').toUpperCase();document.getElementById('topStatus').textContent=stxt;document.getElementById('kState').textContent=stxt;document.getElementById('kCpu').textContent=Number(r.cpu_absolute||0).toFixed(1)+' %';document.getElementById('kRam').textContent=(Number(r.memory_bytes||0)/1073741824).toFixed(2)+' Go';document.getElementById('kDisk').textContent=(Number(r.disk_bytes||0)/1073741824).toFixed(2)+' Go';document.getElementById('connText').textContent='NOMINAL';}else{document.getElementById('connText').textContent='API REQUISE';}}
async function loadPlayers(refresh){const d=await(await fetch('/api/players/live'+(refresh?'?refresh=1':''))).json();const list=d.onlinePlayers||[];document.getElementById('kPlayers').textContent=list.length+' / 32';const box=document.getElementById('livePlayersBox');if(!list.length){box.innerHTML='Aucun joueur connecté actuellement sur play.lumishost.com:1031.';return;}box.innerHTML='';list.forEach(p=>{const div=document.createElement('div');div.className='player-row';div.innerHTML='<div><b>#'+p.id+' · '+p.name+'</b> <span style="color:#38bdf8;font-family:monospace">('+p.steamId+')</span></div><div style="color:#34d399;font-size:11px;font-weight:700">EN LIGNE · Cliquer pour cibler</div>';div.onclick=()=>{document.getElementById('quickTargetId').value=p.id;document.getElementById('modTarget').value=p.steamId;document.getElementById('steamInput').value=p.steamId;document.getElementById('spectateBadge').textContent='CIBLE : #'+p.id+' '+p.name;};box.appendChild(div);});}
async function powerAction(signal){const r=await fetch('/api/power',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signal})});document.getElementById('cfgOut').textContent=JSON.stringify(await r.json(),null,2);setTimeout(loadStatus,1500);}
async function sendCmd(){const c=document.getElementById('cmdInput').value.trim();if(!c)return;document.getElementById('cmdInput').value='';await quickCmd(c);}
async function quickCmd(c){const r=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:c})});const t=JSON.stringify(await r.json(),null,2);['consoleOut','modOut','evOut'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=t;});}
function runSelfCmd(cmd,arg){const t=document.getElementById('quickTargetId').value.trim()||'1';quickCmd(cmd+' '+t+(arg?' '+arg:''));}
function sendHudBc(){const m=document.getElementById('hudBcInput').value.trim();if(m)quickCmd('/bc 10 '+m);}
function sendHudCassie(){const m=document.getElementById('hudCassieInput').value.trim();if(m)quickCmd('/cassie '+m);}
async function grantPerms(){const r=await fetch('/api/perms/grant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetId:document.getElementById('steamInput').value,playerLabel:document.getElementById('staffLabelInput').value,role:document.getElementById('roleSelect').value,persistInFile:document.getElementById('persistCheck').checked})});document.getElementById('permOut').textContent=JSON.stringify(await r.json(),null,2);}
function renderStaffItemsEditor(){const k=document.getElementById('itemRoleSelect').value,c=st[k];document.getElementById('chkAutoEquip').checked=c.autoEquipOnSpawn;document.getElementById('chkTutorial').checked=c.equipOnlyInTutorialMode;document.getElementById('chkClearInv').checked=c.clearInventoryBeforeEquip;const g=document.getElementById('itemsGrid');g.innerHTML='';ITEMS.forEach(it=>{const l=document.createElement('label');l.className='item-chip';const cb=document.createElement('input');cb.type='checkbox';cb.checked=c.items.includes(it);cb.onchange=()=>{if(cb.checked&&!c.items.includes(it))c.items.push(it);if(!cb.checked)c.items=c.items.filter(x=>x!==it);};const s=document.createElement('span');s.textContent=it;l.appendChild(cb);l.appendChild(s);g.appendChild(l);});}
function updateRoleFlag(f,v){st[document.getElementById('itemRoleSelect').value][f]=v;}
async function saveStaffLoadouts(){const roles=Object.entries(st).map(([roleKey,v])=>Object.assign({roleKey},v));const d=await(await fetch('/api/staff-loadouts/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roles})})).json();document.getElementById('itemsOut').textContent=d.ok?d.yml:JSON.stringify(d,null,2);loadConfigs();}
async function runMod(type){const target=document.getElementById('modTarget').value.trim();if(!target)return;const duration=document.getElementById('modDuration').value.trim()||'7d',reason=document.getElementById('modReason').value.trim()||'Moderation';const r=await fetch('/api/sanction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,target,duration,reason})});document.getElementById('modOut').textContent=JSON.stringify(await r.json(),null,2);loadLogs();}
function sendBroadcast(){const m=document.getElementById('bcText').value.trim();if(m)quickCmd('/bc 10 '+m);}
function sendCassie(){const m=document.getElementById('bcText').value.trim();if(m)quickCmd('/cassie '+m);}
async function loadConfigs(){const d=await(await fetch('/api/configs')).json();cfgs=d.files||{};showSelectedConfig();}
function showSelectedConfig(){document.getElementById('cfgEditor').value=cfgs[document.getElementById('cfgFileSelect').value]||'';}
async function saveSelectedConfig(){const fileKey=document.getElementById('cfgFileSelect').value,content=document.getElementById('cfgEditor').value;const d=await(await fetch('/api/configs/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fileKey,content,reloadRa:true})})).json();cfgs[fileKey]=content;document.getElementById('cfgOut').textContent=JSON.stringify(d,null,2);}
async function loadLogs(){const d=await(await fetch('/api/logs/live')).json();const out=[];if(d.serverLines&&d.serverLines.length)out.push('=== SERVER LOGS ('+(d.svFile||'')+') ===', ...d.serverLines.slice(-45));if(d.localAdminLines&&d.localAdminLines.length)out.push('\\n=== LOCALADMIN LOGS ('+(d.laFile||'')+') ===', ...d.localAdminLines.slice(-35));if(d.sanctions&&d.sanctions.length)out.push('\\n=== SANCTIONS ENREGISTRÉES ===', ...d.sanctions.slice(0,15).map(s=>s.timestamp+' ['+s.type+'] '+s.targetName+' ('+s.targetSteamId+') - '+s.duration+' - '+s.reason));document.getElementById('logsOut').textContent=out.length?out.join('\\n'):'Aucun log trouvé pour le moment.';}
init();
</script></body></html>`;
}
