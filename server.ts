import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import {
  formatScpslConsoleCommand,
  normalizeScpslDuration,
  parseGameplayEventsFromLogs,
  parseLivePlayersFromLogs,
  splitAndFormatScpslCommands,
  type ParsedLivePlayer,
  type ParsedTelemetryEvent
} from './src/server/scpslConsole';
import {
  appendTelemetryEvents,
  getStorageStatus,
  loadKnownPlayers,
  loadPanelState,
  loadTelemetryEvents,
  revokeSanctionBySteamId,
  savePanelState,
  saveSanctionRecord,
  upsertPlayers,
  type StoredSanction
} from './src/server/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DiscordSessionUser {
  id: string;
  username: string;
  globalName: string;
  avatarUrl: string;
  roleLabel: string;
  authenticatedVia: 'discord_oauth' | 'staff_token';
  loggedInAt: string;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', true);
  app.use(express.json({ limit: '5mb' }));

  let currentDiscordUser: DiscordSessionUser | null = null;
  let runtimeDiscordClientId = process.env.DISCORD_CLIENT_ID || '';
  let runtimeDiscordClientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  let lastRedirectUri = '';

  // Live cache of connected players (SteamID -> ParsedLivePlayer)
  const livePlayersCache = new Map<string, ParsedLivePlayer>();

  const CONTAINER_ROOT = process.env.SCPSL_ROOT || '/home/container';
  const hasLocalContainer = fs.existsSync(path.join(CONTAINER_ROOT, '.config'));

  const resolveLocalContainerFile = (filePath: string): string | null => {
    if (!hasLocalContainer) return null;
    const cleaned = filePath.replace(/^\/+/, '');
    if (!cleaned.startsWith('.config/')) return null;
    return path.join(CONTAINER_ROOT, cleaned);
  };

  const cleanPteroUrl = (rawUrl: string) => rawUrl.trim().replace(/\/+$/, '');
  const resolvePteroConfig = (body: Record<string, unknown>) => ({
    panelUrl: String(body.panelUrl || process.env.PTERO_URL || 'https://panel.lumishost.com').trim(),
    apiKey: String(body.apiKey || process.env.PTERO_CLIENT_API_KEY || '').trim(),
    serverId: String(body.serverId || process.env.PTERO_SERVER_ID || '283ba3e0').trim(),
    port: String(body.port || process.env.SERVER_PORT || '1031').trim()
  });

  const sendPteroConsoleCommand = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    rawCommand: string
  ): Promise<{ ok: boolean; status: number; formattedCommand: string; error?: string }> => {
    const formattedCommand = formatScpslConsoleCommand(rawCommand);
    if (!panelUrl || !apiKey || !serverId || !formattedCommand) {
      return {
        ok: false,
        status: 400,
        formattedCommand,
        error: 'Paramètres Pterodactyl ou commande manquants.'
      };
    }
    const baseUrl = cleanPteroUrl(panelUrl);
    try {
      const response = await fetch(`${baseUrl}/api/client/servers/${serverId.trim()}/command`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: formattedCommand })
      });
      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          status: response.status,
          formattedCommand,
          error: `Le serveur doit être en ligne ou la clé API (ptlc_...) est invalide (${response.status}). ${text.slice(0, 180)}`
        };
      }
      return { ok: true, status: response.status, formattedCommand };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 502,
        formattedCommand,
        error: err instanceof Error ? err.message : 'Erreur réseau Pterodactyl'
      };
    }
  };

  const writeConfigFileBoth = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    filePath: string,
    content: string
  ): Promise<{ wroteLocal: boolean; wrotePtero: boolean; error?: string }> => {
    let wroteLocal = false;
    let wrotePtero = false;
    let pteroErr: string | undefined;

    const localTarget = resolveLocalContainerFile(filePath);
    if (localTarget) {
      try {
        fs.mkdirSync(path.dirname(localTarget), { recursive: true });
        fs.writeFileSync(localTarget, content, 'utf8');
        wroteLocal = true;
      } catch (err: unknown) {
        pteroErr = err instanceof Error ? err.message : 'Erreur écriture locale';
      }
    }

    if (panelUrl && apiKey && serverId) {
      const baseUrl = cleanPteroUrl(panelUrl);
      const url = `${baseUrl}/api/client/servers/${serverId.trim()}/files/write?file=${encodeURIComponent(filePath)}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            Accept: 'Application/vnd.pterodactyl.v1+json',
            'Content-Type': 'text/plain'
          },
          body: content
        });
        if (response.ok) {
          wrotePtero = true;
        } else {
          const txt = await response.text();
          pteroErr = `Impossible d'écrire ${filePath} via API Pterodactyl (${response.status}): ${txt.slice(0, 180)}`;
        }
      } catch (err: unknown) {
        pteroErr = err instanceof Error ? err.message : 'Erreur réseau API Fichiers Pterodactyl';
      }
    } else if (!wroteLocal) {
      pteroErr = 'Clé API Client Pterodactyl (ptlc_...) requise pour écrire les fichiers de configuration à distance.';
    }

    return { wroteLocal, wrotePtero, error: wroteLocal || wrotePtero ? undefined : pteroErr };
  };

  const readLatestTxtFromDir = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    containerRelDir: string,
    maxLines = 220
  ): Promise<{ fileName?: string; lines: string[]; error?: string }> => {
    const localLogDir = resolveLocalContainerFile(containerRelDir);
    if (localLogDir && fs.existsSync(localLogDir)) {
      try {
        const txts = fs
          .readdirSync(localLogDir)
          .filter((f) => f.endsWith('.txt'))
          .map((name) => ({
            name,
            mtime: fs.statSync(path.join(localLogDir, name)).mtimeMs
          }))
          .sort((a, b) => a.mtime - b.mtime);

        if (txts.length > 0) {
          const latest = txts[txts.length - 1].name;
          const raw = fs.readFileSync(path.join(localLogDir, latest), 'utf8');
          return {
            fileName: latest,
            lines: raw.split(/\r?\n/).filter(Boolean).slice(-maxLines)
          };
        }
      } catch {
        // fallback to API
      }
    }

    if (!panelUrl || !apiKey || !serverId) {
      return { lines: [], error: 'Clé API Pterodactyl requise pour lire les logs à distance.' };
    }

    const baseUrl = cleanPteroUrl(panelUrl);
    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: 'Application/vnd.pterodactyl.v1+json'
    };

    try {
      const listResp = await fetch(
        `${baseUrl}/api/client/servers/${serverId.trim()}/files/list?directory=${encodeURIComponent(containerRelDir)}`,
        { headers }
      );
      if (!listResp.ok) {
        return { lines: [], error: `Dossier introuvable : ${containerRelDir} (${listResp.status})` };
      }
      const listData = await listResp.json();
      const files = (listData?.data || [])
        .map((item: { attributes?: { name?: string; modified_at?: string } }) => item.attributes)
        .filter((f: { name?: string } | undefined) => f && f.name && f.name.endsWith('.txt'))
        .sort((a: { modified_at?: string; name?: string }, b: { modified_at?: string; name?: string }) => {
          const ta = a.modified_at ? Date.parse(a.modified_at) : 0;
          const tb = b.modified_at ? Date.parse(b.modified_at) : 0;
          return ta !== tb ? ta - tb : String(a.name || '').localeCompare(String(b.name || ''));
        });

      if (files.length === 0) {
        return { lines: [] };
      }

      const latestFile = files[files.length - 1].name;
      const contentResp = await fetch(
        `${baseUrl}/api/client/servers/${serverId.trim()}/files/contents?file=${encodeURIComponent(`${containerRelDir}/${latestFile}`)}`,
        { headers }
      );
      if (!contentResp.ok) {
        return { lines: [], error: `Impossible de lire ${latestFile}.` };
      }
      const rawText = await contentResp.text();
      return {
        fileName: latestFile,
        lines: rawText.split(/\r?\n/).filter(Boolean).slice(-maxLines)
      };
    } catch (err: unknown) {
      return { lines: [], error: err instanceof Error ? err.message : 'Erreur lecture logs' };
    }
  };

  const fetchBothScpslLogs = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    port = '1031'
  ) => {
    const [localAdmin, serverLogs] = await Promise.all([
      readLatestTxtFromDir(panelUrl, apiKey, serverId, `/.config/SCP Secret Laboratory/LocalAdminLogs/${port}`, 240),
      readLatestTxtFromDir(panelUrl, apiKey, serverId, `/.config/SCP Secret Laboratory/ServerLogs/${port}`, 240)
    ]);
    return { localAdmin, serverLogs };
  };

  const refreshLivePlayers = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    port = '1031',
    triggerListCmd = true
  ): Promise<{
    players: ParsedLivePlayer[];
    rawListLines: string[];
    localLogFile?: string;
    serverLogFile?: string;
    error?: string;
  }> => {
    if (triggerListCmd && apiKey && serverId) {
      await sendPteroConsoleCommand(panelUrl, apiKey, serverId, 'list');
      await new Promise((r) => setTimeout(r, 550));
    }

    const { localAdmin, serverLogs } = await fetchBothScpslLogs(panelUrl, apiKey, serverId, port);
    const parsed = parseLivePlayersFromLogs(localAdmin.lines, serverLogs.lines);

    for (const p of parsed.players) {
      livePlayersCache.set(p.steamId.toLowerCase(), p);
    }

    if (parsed.players.length > 0) {
      await upsertPlayers(parsed.players);
    }

    const events = parseGameplayEventsFromLogs([...serverLogs.lines, ...localAdmin.lines]);
    if (events.length > 0) {
      await appendTelemetryEvents(events);
    }

    return {
      players: parsed.players,
      rawListLines: parsed.rawListLines,
      localLogFile: localAdmin.fileName,
      serverLogFile: serverLogs.fileName,
      error:
        localAdmin.lines.length === 0 && serverLogs.lines.length === 0
          ? localAdmin.error || serverLogs.error
          : undefined
    };
  };

  const resolveOnlinePlayerNumericId = async (
    panelUrl: string,
    apiKey: string,
    serverId: string,
    port: string,
    target: string
  ): Promise<string | null> => {
    const clean = target.trim();
    if (/^\d{1,4}$/.test(clean)) return clean;

    const cached = livePlayersCache.get(clean.toLowerCase());
    if (cached && cached.isOnline && cached.id > 0) {
      return String(cached.id);
    }

    if (clean.includes('@')) {
      const refreshed = await refreshLivePlayers(panelUrl, apiKey, serverId, port, true);
      const found = refreshed.players.find(
        (p) => p.steamId.toLowerCase() === clean.toLowerCase() && p.isOnline && p.id > 0
      );
      if (found) return String(found.id);
    }

    return null;
  };

  const postDiscordEmbed = async (
    webhookUrl: string,
    title: string,
    description: string,
    colorHex = '#DC143C',
    fields: Array<{ name: string; value: string; inline?: boolean }> = []
  ) => {
    const url = (webhookUrl || process.env.DISCORD_WEBHOOK_URL || '').trim();
    if (
      !url ||
      (!url.startsWith('https://discord.com/api/webhooks/') &&
        !url.startsWith('https://discordapp.com/api/webhooks/'))
    ) {
      return;
    }
    const numericColor = parseInt(colorHex.replace('#', ''), 16) || 0xdc143c;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'LumisHost SCP:SL — Site-19 Logs & Modération',
          embeds: [
            {
              title,
              description,
              color: numericColor,
              fields,
              timestamp: new Date().toISOString(),
              footer: { text: 'scpsl.lumishost.com · play.lumishost.com:1031' }
            }
          ]
        })
      });
    } catch {
      // non-blocking webhook
    }
  };

  const getRedirectUri = (req: express.Request): string => {
    if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI.trim();
    if (typeof req.query.redirectUri === 'string' && req.query.redirectUri.trim()) {
      return req.query.redirectUri.trim();
    }
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    if (host) {
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || '';
      const isLocalOrIp = /^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/i.test(host);
      const proto = forwardedProto.split(',')[0].trim() || (isLocalOrIp ? req.protocol || 'http' : 'https');
      return `${proto}://${host}/auth/callback`;
    }
    return `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
  };

  // ============================================================================
  // 1. PERSISTENCE (MYSQL + LOCAL DISK FALLBACK)
  // ============================================================================

  app.get('/api/db/status', async (_req, res) => {
    const status = await getStorageStatus();
    return res.json(status);
  });

  app.get('/api/state', async (_req, res) => {
    try {
      const [{ state, storageEngine }, dbStatus, knownPlayers] = await Promise.all([
        loadPanelState(),
        getStorageStatus(),
        loadKnownPlayers()
      ]);
      return res.json({
        state,
        storageEngine,
        dbStatus,
        knownPlayers
      });
    } catch (err: unknown) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Erreur chargement état panel'
      });
    }
  });

  app.put('/api/state', async (req, res) => {
    try {
      const result = await savePanelState(req.body || {});
      return res.json({ ok: true, ...result });
    } catch (err: unknown) {
      return res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur sauvegarde état panel'
      });
    }
  });

  // ============================================================================
  // 2. DISCORD OAUTH2 AUTHENTICATION (POPUP FLOW FOR IFRAME ENVIRONMENT)
  // ============================================================================

  app.post('/api/auth/discord/config', (req, res) => {
    const { clientId, clientSecret } = req.body;
    if (clientId) runtimeDiscordClientId = clientId.trim();
    if (clientSecret) runtimeDiscordClientSecret = clientSecret.trim();
    return res.json({
      configured: Boolean(runtimeDiscordClientId && runtimeDiscordClientSecret),
      clientId: runtimeDiscordClientId
    });
  });

  app.get('/api/auth/discord/url', (req, res) => {
    const clientId = (req.query.clientId as string) || runtimeDiscordClientId || process.env.DISCORD_CLIENT_ID || '';
    const redirectUri = getRedirectUri(req);
    lastRedirectUri = redirectUri;

    if (!clientId) {
      return res.json({ configured: false, url: null, redirectUri });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds'
    });

    return res.json({
      configured: true,
      url: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
      redirectUri
    });
  });

  const handleOAuthCallback = async (req: express.Request, res: express.Response) => {
    const code = req.query.code as string | undefined;
    const clientId = runtimeDiscordClientId || process.env.DISCORD_CLIENT_ID || '';
    const clientSecret = runtimeDiscordClientSecret || process.env.DISCORD_CLIENT_SECRET || '';
    const redirectUri = lastRedirectUri || getRedirectUri(req);

    if (!code) {
      return res.status(400).send('Code OAuth2 Discord manquant.');
    }

    try {
      if (clientId && clientSecret) {
        const tokenParams = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        });

        const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString()
        });

        if (tokenResp.ok) {
          const tokenData = await tokenResp.json();
          const userResp = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          });

          if (userResp.ok) {
            const dUser = await userResp.json();
            const founderId = process.env.FOUNDER_DISCORD_ID || '985589556655054858';
            const isFounder = dUser.id === founderId;
            currentDiscordUser = {
              id: dUser.id,
              username: dUser.username,
              globalName: dUser.global_name || dUser.username,
              avatarUrl: dUser.avatar
                ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
                : '',
              roleLabel: isFounder
                ? 'Fondateur O5 · Accès Total LumisHost'
                : 'Staff / Membre · LumisHost',
              authenticatedVia: 'discord_oauth',
              loggedInAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            };
          }
        }
      }

      const payloadJson = JSON.stringify({
        type: 'OAUTH_AUTH_SUCCESS',
        user: currentDiscordUser
      });

      res.setHeader(
        'Set-Cookie',
        `scpsl_session=authenticated; Path=/; SameSite=None; Secure; HttpOnly`
      );

      return res.send(`<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8" /><title>Authentification Discord Réussie</title></head>
  <body style="background:#090d16;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <script>
      if (window.opener) {
        window.opener.postMessage(${payloadJson}, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <p>Authentification Discord validée. Fermeture de la fenêtre...</p>
  </body>
</html>`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur OAuth';
      return res.status(500).send(`Erreur lors de l'échange OAuth Discord : ${msg}`);
    }
  };

  app.get(['/auth/callback', '/auth/callback/'], handleOAuthCallback);

  app.get('/api/auth/me', async (_req, res) => {
    const dbStatus = await getStorageStatus();
    return res.json({
      user: currentDiscordUser,
      oauthConfigured: Boolean(
        (runtimeDiscordClientId || process.env.DISCORD_CLIENT_ID) &&
          (runtimeDiscordClientSecret || process.env.DISCORD_CLIENT_SECRET)
      ),
      pteroConfigured: Boolean(process.env.PTERO_CLIENT_API_KEY),
      hasLocalContainer,
      pteroServerId: process.env.PTERO_SERVER_ID || '283ba3e0',
      pteroUrl: process.env.PTERO_URL || 'https://panel.lumishost.com',
      serverPort: process.env.SERVER_PORT || '1031',
      mysqlConnected: dbStatus.mysqlConnected,
      mysqlConfigured: dbStatus.mysqlConfigured
    });
  });

  app.post('/api/auth/session', (req, res) => {
    const { username, discordId, roleLabel } = req.body;
    currentDiscordUser = {
      id: discordId || process.env.FOUNDER_DISCORD_ID || '985589556655054858',
      username: username || 'evolumis',
      globalName: username || 'evolumis',
      avatarUrl: '',
      roleLabel: roleLabel || 'Fondateur O5 · LumisHost',
      authenticatedVia: 'staff_token',
      loggedInAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    return res.json({ user: currentDiscordUser });
  });

  app.post('/api/auth/logout', (_req, res) => {
    currentDiscordUser = null;
    return res.json({ ok: true });
  });

  // ============================================================================
  // 3. PTERODACTYL CLIENT API PROXY (LIVE PLAYERS, COMMANDS WITH '/', SANCTIONS, LOGS)
  // ============================================================================

  app.post('/api/ptero/status', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    if (!panelUrl || !apiKey || !serverId) {
      return res.status(400).json({ error: 'Paramètres Pterodactyl manquants (URL, Clé API ou Server ID).' });
    }

    const baseUrl = cleanPteroUrl(panelUrl);
    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json'
    };

    try {
      const [resourcesResp, detailsResp] = await Promise.all([
        fetch(`${baseUrl}/api/client/servers/${serverId.trim()}/resources`, { headers }),
        fetch(`${baseUrl}/api/client/servers/${serverId.trim()}`, { headers })
      ]);

      if (!resourcesResp.ok) {
        const errText = await resourcesResp.text();
        return res.status(resourcesResp.status).json({
          error: `Erreur Pterodactyl (${resourcesResp.status}): Vérifiez votre clé API Client (ptlc_...) et l'ID du serveur.`,
          details: errText.slice(0, 300)
        });
      }

      const resourcesData = await resourcesResp.json();
      const detailsData = detailsResp.ok ? await detailsResp.json() : null;

      return res.json({
        connected: true,
        state: resourcesData?.attributes?.current_state || 'offline',
        resources: resourcesData?.attributes?.resources || {},
        serverName: detailsData?.attributes?.name || 'Site-19 SCP Secret Laboratory',
        node: detailsData?.attributes?.node || 'Node 1 (192.99.42.203)',
        limits: detailsData?.attributes?.limits || {}
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau inconnue';
      return res.status(502).json({
        error: `Impossible de joindre le panel Pterodactyl (${baseUrl}) : ${message}`
      });
    }
  });

  app.post('/api/ptero/power', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    const { signal } = req.body || {};
    if (!panelUrl || !apiKey || !serverId || !signal) {
      return res.status(400).json({ error: 'Paramètres requis manquants pour le signal power.' });
    }

    const baseUrl = cleanPteroUrl(panelUrl);
    try {
      const response = await fetch(`${baseUrl}/api/client/servers/${serverId.trim()}/power`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: 'Application/vnd.pterodactyl.v1+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ signal })
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          error: `Échec du signal ${signal} (${response.status})`,
          details: text.slice(0, 300)
        });
      }

      return res.json({ ok: true, signal });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau';
      return res.status(502).json({ error: `Erreur de connexion Pterodactyl : ${message}` });
    }
  });

  // Execute SCP:SL LocalAdmin / RemoteAdmin command(s) with automatic '/' prefix & SteamID->PlayerID resolution
  app.post('/api/ptero/command', async (req, res) => {
    const { panelUrl, apiKey, serverId, port } = resolvePteroConfig(req.body || {});
    const { command } = req.body || {};
    if (!panelUrl || !apiKey || !serverId || !command) {
      return res.status(400).json({ error: 'Paramètres requis manquants pour la commande console.' });
    }

    const commands = splitAndFormatScpslCommands(String(command));
    if (commands.length === 0) {
      return res.status(400).json({ error: 'Commande vide.' });
    }

    const executed: string[] = [];
    for (let cmd of commands) {
      // Auto-resolve SteamID64 to numeric PlayerID for player-targeted RemoteAdmin commands
      const raSteamTargetMatch = cmd.match(
        /^\/(god|noclip|bypass|forceclass|forcerole|give|clear|hp|heal|goto|tp|mute|unmute|imute|iunmute|pbc|kick|setgroup)\s+(\d{17}@(?:steam|discord|northwood))(.*)$/i
      );
      if (raSteamTargetMatch) {
        const [, verb, steamId, rest] = raSteamTargetMatch;
        const resolvedId = await resolveOnlinePlayerNumericId(panelUrl, apiKey, serverId, port, steamId);
        if (resolvedId) {
          cmd = `/${verb} ${resolvedId}${rest}`;
        }
      }

      const result = await sendPteroConsoleCommand(panelUrl, apiKey, serverId, cmd);
      if (!result.ok) {
        return res.status(result.status || 502).json({
          error: result.error || `Échec d'exécution de la commande (${cmd})`,
          executed
        });
      }
      executed.push(result.formattedCommand);
    }

    await appendTelemetryEvents([
      {
        id: `CMD-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: 'ADMIN',
        killerName: currentDiscordUser?.globalName || 'Staff Web',
        zone: `play.lumishost.com:${port}`,
        details: `Commande exécutée : ${executed.join(' ; ')}`
      }
    ]);

    return res.json({ ok: true, command: executed.join(' ; '), executed });
  });

  // Live Real Players fetcher: runs `list`, parses LocalAdminLogs + ServerLogs + MySQL cache
  app.post('/api/ptero/players/live', async (req, res) => {
    const { panelUrl, apiKey, serverId, port } = resolvePteroConfig(req.body || {});
    const triggerList = req.body?.triggerList !== false;

    const [liveRes, knownPlayers] = await Promise.all([
      refreshLivePlayers(panelUrl, apiKey, serverId, port, triggerList),
      loadKnownPlayers()
    ]);

    const mergedMap = new Map<string, ParsedLivePlayer>();
    for (const kp of knownPlayers) {
      mergedMap.set(kp.steamId.toLowerCase(), { ...kp, isOnline: false });
    }
    for (const lp of liveRes.players) {
      mergedMap.set(lp.steamId.toLowerCase(), lp);
    }

    const allPlayers = Array.from(mergedMap.values()).sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.id - b.id;
    });

    return res.json({
      ok: true,
      onlinePlayers: allPlayers.filter((p) => p.isOnline),
      allPlayers,
      rawListLines: liveRes.rawListLines,
      localLogFile: liveRes.localLogFile,
      serverLogFile: liveRes.serverLogFile,
      error: liveRes.error
    });
  });

  // Dedicated Sanction Executor: BAN (/ban + /oban), KICK (/kick), WARN (/pbc or /bc), MUTE (/mute), UNBAN (/unban id)
  app.post('/api/ptero/sanction', async (req, res) => {
    const { panelUrl, apiKey, serverId, port } = resolvePteroConfig(req.body || {});
    const {
      type = 'BAN',
      targetName = '',
      targetSteamId = '',
      playerId,
      duration = '24 heures',
      reason = 'Non-respect du règlement Site-19',
      moderator = currentDiscordUser?.globalName || 'evolumis (Panel Web)',
      webhookUrl = ''
    } = req.body || {};

    const cleanType = String(type).toUpperCase() as 'BAN' | 'KICK' | 'WARN' | 'MUTE' | 'UNBAN';
    const cleanSteam = String(targetSteamId || '').trim();
    const cleanReason = String(reason || 'Sanction Staff').replace(/"/g, "'").trim();
    const scpslDur = normalizeScpslDuration(String(duration || '24h'));

    let numericId = playerId && /^\d{1,4}$/.test(String(playerId)) ? String(playerId) : null;
    if (!numericId && cleanSteam && apiKey && serverId) {
      numericId = await resolveOnlinePlayerNumericId(panelUrl, apiKey, serverId, port, cleanSteam);
    }

    const commandsToSend: string[] = [];

    if (cleanType === 'BAN') {
      if (numericId) {
        commandsToSend.push(`/ban ${numericId} ${scpslDur} ${cleanReason}`);
      }
      if (cleanSteam && cleanSteam.includes('@')) {
        commandsToSend.push(`/oban ${cleanSteam} ${scpslDur} ${cleanReason}`);
      } else if (!numericId && cleanSteam) {
        commandsToSend.push(`/oban ${cleanSteam}@steam ${scpslDur} ${cleanReason}`);
      }
    } else if (cleanType === 'UNBAN') {
      const idToUnban = cleanSteam.includes('@') ? cleanSteam : `${cleanSteam}@steam`;
      commandsToSend.push(`/unban id ${idToUnban}`);
    } else if (cleanType === 'KICK') {
      const targetRef = numericId || cleanSteam;
      if (targetRef) {
        commandsToSend.push(`/kick ${targetRef} ${cleanReason}`);
      }
    } else if (cleanType === 'MUTE') {
      const targetRef = numericId || cleanSteam;
      if (targetRef) {
        commandsToSend.push(`/mute ${targetRef}`);
      }
    } else if (cleanType === 'WARN') {
      if (numericId) {
        commandsToSend.push(
          `/pbc ${numericId} 10 <color=#DC143C><b>[AVERTISSEMENT STAFF]</b></color> ${cleanReason}`
        );
      } else {
        commandsToSend.push(
          `/bc 8 <color=#FAFF86><b>[AVERTISSEMENT STAFF]</b></color> ${targetName || cleanSteam} : ${cleanReason}`
        );
      }
    }

    const executed: string[] = [];
    let pteroError: string | undefined;

    if (apiKey && serverId && commandsToSend.length > 0) {
      for (const cmd of commandsToSend) {
        const r = await sendPteroConsoleCommand(panelUrl, apiKey, serverId, cmd);
        if (r.ok) {
          executed.push(r.formattedCommand);
        } else {
          pteroError = r.error;
        }
      }
    } else if (commandsToSend.length > 0) {
      pteroError = 'Clé API Client Pterodactyl (ptlc_...) non configurée.';
    }

    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

    let savedRecord: StoredSanction | null = null;
    if (cleanType === 'UNBAN') {
      if (cleanSteam) await revokeSanctionBySteamId(cleanSteam);
    } else {
      savedRecord = {
        id: `SAN-${Date.now().toString().slice(-6)}`,
        targetName: targetName || cleanSteam || `Joueur #${numericId}`,
        targetSteamId: cleanSteam || (numericId ? `ID#${numericId}` : 'Inconnu'),
        type: cleanType,
        reason: cleanReason,
        duration: cleanType === 'BAN' ? `${duration} (${scpslDur})` : cleanType === 'KICK' ? 'Instantané' : 'Avertissement',
        moderator: String(moderator),
        source: 'Panel Web MySQL',
        timestamp: `${nowDate} · ${nowTime}`,
        active: cleanType !== 'KICK'
      };
      await saveSanctionRecord(savedRecord);
    }

    await appendTelemetryEvents([
      {
        id: `SANLOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: 'SANCTION',
        killerName: String(moderator),
        victimName: targetName || cleanSteam,
        victimSteamId: cleanSteam || undefined,
        weapon: `${cleanType}${cleanType === 'BAN' ? ` (${scpslDur})` : ''}`,
        zone: `play.lumishost.com:${port}`,
        details: `[${cleanType}] ${targetName || cleanSteam} (${cleanSteam || `#${numericId}`}) — ${cleanReason} · Cmd: ${executed.join(' ; ') || commandsToSend.join(' ; ')}`
      }
    ]);

    const colorMap: Record<string, string> = {
      BAN: '#DC143C',
      KICK: '#F97316',
      WARN: '#F59E0B',
      MUTE: '#8B5CF6',
      UNBAN: '#16A34A'
    };

    await postDiscordEmbed(
      webhookUrl,
      `🛡️ Sanction SCP:SL — ${cleanType}`,
      `Action exécutée depuis le panel **scpsl.lumishost.com**.`,
      colorMap[cleanType] || '#DC143C',
      [
        { name: '👤 Joueur', value: `${targetName || 'Inconnu'} (\`${cleanSteam || `#${numericId}`}\`)`, inline: true },
        { name: '⏱️ Durée', value: cleanType === 'BAN' ? `${duration} (\`${scpslDur}\`)` : cleanType, inline: true },
        { name: '👮 Modérateur', value: String(moderator), inline: true },
        { name: '📝 Motif', value: cleanReason, inline: false },
        { name: '⚙️ Commandes Exécutées', value: `\`${executed.join(' ; ') || 'En attente API'}\``, inline: false }
      ]
    );

    return res.json({
      ok: executed.length > 0 || !pteroError,
      executed,
      scpslDuration: scpslDur,
      resolvedPlayerId: numericId,
      sanction: savedRecord,
      error: executed.length === 0 ? pteroError : undefined,
      message:
        executed.length > 0
          ? `Sanction ${cleanType} exécutée en jeu (${executed.join(' ; ')}) et enregistrée.`
          : pteroError || 'Sanction enregistrée en base de données (serveur hors ligne ou clé API manquante).'
    });
  });

  app.post('/api/ptero/files/write', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    const { filePath, content } = req.body || {};
    if (!filePath || typeof content !== 'string') {
      return res.status(400).json({ error: 'Paramètres manquants (filePath / content).' });
    }

    const result = await writeConfigFileBoth(panelUrl, apiKey, serverId, filePath, content);
    if (!result.wroteLocal && !result.wrotePtero) {
      return res.status(400).json({ error: result.error || 'Échec écriture fichier.' });
    }

    return res.json({
      ok: true,
      filePath,
      wroteLocal: result.wroteLocal,
      wrotePtero: result.wrotePtero
    });
  });

  // Grant RemoteAdmin / VIP role permanently in config_remoteadmin.txt + live /setgroup if online
  app.post('/api/ptero/grant-role', async (req, res) => {
    const { panelUrl, apiKey, serverId, port } = resolvePteroConfig(req.body || {});
    const {
      targetId = '',
      roleId = 'owner',
      playerName = '',
      remoteAdminContent,
      vipAdvantagesContent
    } = req.body || {};

    const cleanTarget = String(targetId).trim();
    const cleanRole = String(roleId).trim() || 'owner';
    if (!cleanTarget && !remoteAdminContent) {
      return res.status(400).json({ error: 'SteamID64 ou ID joueur requis.' });
    }

    const raPath = `/.config/SCP Secret Laboratory/config/${port}/config_remoteadmin.txt`;
    let wroteLocal = false;
    let wrotePtero = false;
    let writeErr: string | undefined;

    if (typeof remoteAdminContent === 'string' && remoteAdminContent.trim()) {
      const resRa = await writeConfigFileBoth(panelUrl, apiKey, serverId, raPath, remoteAdminContent);
      wroteLocal = wroteLocal || resRa.wroteLocal;
      wrotePtero = wrotePtero || resRa.wrotePtero;
      if (resRa.error) writeErr = resRa.error;
      if (String(port) !== '1031') {
        await writeConfigFileBoth(
          panelUrl,
          apiKey,
          serverId,
          '/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt',
          remoteAdminContent
        );
      }
    }

    if (typeof vipAdvantagesContent === 'string' && vipAdvantagesContent.trim()) {
      await writeConfigFileBoth(
        panelUrl,
        apiKey,
        serverId,
        '/.config/EXILED/Configs/VipAdvantages.yml',
        vipAdvantagesContent
      );
    }

    let configReloadSent = false;
    let livePlayerId: string | null = /^\d{1,4}$/.test(cleanTarget) ? cleanTarget : null;
    let liveSetgroupSent = false;

    if (apiKey && serverId) {
      const reloadRes = await sendPteroConsoleCommand(panelUrl, apiKey, serverId, 'config reload');
      configReloadSent = reloadRes.ok;

      if (!livePlayerId && cleanTarget.includes('@')) {
        livePlayerId = await resolveOnlinePlayerNumericId(panelUrl, apiKey, serverId, port, cleanTarget);
      }

      if (livePlayerId) {
        const sgRes = await sendPteroConsoleCommand(
          panelUrl,
          apiKey,
          serverId,
          `/setgroup ${livePlayerId} ${cleanRole}`
        );
        liveSetgroupSent = sgRes.ok;
      }
    }

    if (!wroteLocal && !wrotePtero && !liveSetgroupSent) {
      return res.status(400).json({
        ok: false,
        error:
          writeErr ||
          'Impossible de joindre le serveur Pterodactyl : configurez PTERO_CLIENT_API_KEY (ptlc_...) dans l’onglet Développeur ou les variables Startup.'
      });
    }

    const parts: string[] = [];
    if (wroteLocal || wrotePtero) {
      parts.push(`config_remoteadmin.txt mis à jour (${cleanTarget || playerName} → ${cleanRole})`);
    }
    if (configReloadSent) {
      parts.push('config reload exécuté');
    }
    if (liveSetgroupSent && livePlayerId) {
      parts.push(`/setgroup ${livePlayerId} ${cleanRole} appliqué en direct`);
    } else if (cleanTarget.includes('@')) {
      parts.push('reconnectez-vous ou redémarrez si le joueur n’était pas encore dans list');
    }

    return res.json({
      ok: true,
      wroteLocal,
      wrotePtero,
      configReloadSent,
      livePlayerId,
      liveSetgroupSent,
      message: parts.join(' · ')
    });
  });

  // Read live LocalAdminLogs AND ServerLogs from Pterodactyl container + parse structured events & players
  app.post('/api/ptero/logs/sync', async (req, res) => {
    const { panelUrl, apiKey, serverId, port } = resolvePteroConfig(req.body || {});
    const { localAdmin, serverLogs } = await fetchBothScpslLogs(panelUrl, apiKey, serverId, port);

    if (localAdmin.lines.length === 0 && serverLogs.lines.length === 0 && (localAdmin.error || serverLogs.error)) {
      return res.status(400).json({ error: localAdmin.error || serverLogs.error });
    }

    const combinedLines = [...serverLogs.lines, ...localAdmin.lines];
    const parsedEvents = parseGameplayEventsFromLogs(combinedLines);
    const parsedPlayers = parseLivePlayersFromLogs(localAdmin.lines, serverLogs.lines);

    if (parsedEvents.length > 0) await appendTelemetryEvents(parsedEvents);
    if (parsedPlayers.players.length > 0) await upsertPlayers(parsedPlayers.players);

    return res.json({
      fileName: localAdmin.fileName || serverLogs.fileName,
      serverLogFile: serverLogs.fileName,
      lines: localAdmin.lines.length > 0 ? localAdmin.lines : serverLogs.lines,
      serverLogLines: serverLogs.lines,
      parsedEvents,
      players: parsedPlayers.players,
      message:
        combinedLines.length === 0
          ? 'Aucun fichier de log trouvé pour ce port.'
          : `${localAdmin.lines.length} lignes LocalAdmin + ${serverLogs.lines.length} lignes ServerLogs synchronisées.`
    });
  });

  // ============================================================================
  // 4. TELEMETRY INGESTION (KILLS, PLAYER LOGS, SANCTIONS) & DISCORD WEBHOOK
  // ============================================================================

  app.get('/api/telemetry/events', async (_req, res) => {
    const events = await loadTelemetryEvents();
    return res.json({ events });
  });

  app.post('/api/telemetry/ingest', async (req, res) => {
    const evt = req.body as Partial<ParsedTelemetryEvent>;
    const created: ParsedTelemetryEvent = {
      id: `EVT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category: evt.category || 'KILL',
      killerName: evt.killerName,
      killerSteamId: evt.killerSteamId,
      killerRole: evt.killerRole,
      victimName: evt.victimName,
      victimSteamId: evt.victimSteamId,
      victimRole: evt.victimRole,
      weapon: evt.weapon,
      zone: evt.zone,
      details: evt.details || 'Événement serveur enregistré'
    };
    await appendTelemetryEvents([created]);

    if (created.killerSteamId && (created.category === 'CONNECT' || created.category === 'DISCONNECT')) {
      await upsertPlayers([
        {
          id: 0,
          name: created.killerName || created.killerSteamId,
          steamId: created.killerSteamId,
          role: created.killerRole || 'Connecté',
          isOnline: created.category === 'CONNECT',
          lastSeen: created.timestamp
        }
      ]);
    }

    if (created.category === 'TEAMKILL' || created.category === 'SANCTION') {
      await postDiscordEmbed(
        process.env.DISCORD_WEBHOOK_URL || '',
        created.category === 'TEAMKILL' ? '🚨 ALERTE TEAMKILL DÉTECTÉ' : '🛡️ SANCTION SERVEUR',
        created.details,
        '#DC143C',
        [
          { name: 'Auteur', value: `${created.killerName || 'Inconnu'} (\`${created.killerSteamId || '-'}\`)`, inline: true },
          { name: 'Victime', value: `${created.victimName || '-'} (\`${created.victimSteamId || '-'}\`)`, inline: true },
          { name: 'Arme / Zone', value: `${created.weapon || '-'} · ${created.zone || 'Site-19'}`, inline: true }
        ]
      );
    }

    return res.json({ ok: true, event: created });
  });

  app.post('/api/discord/webhook', async (req, res) => {
    const { webhookUrl, title, description, colorHex, fields } = req.body;
    if (
      !webhookUrl ||
      (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.startsWith('https://discordapp.com/api/webhooks/'))
    ) {
      return res.status(400).json({ error: 'URL de Webhook Discord invalide.' });
    }

    const numericColor = colorHex ? parseInt(colorHex.replace('#', ''), 16) : 0xdc143c;

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'LumisHost SCP:SL — Logs & Modération',
          embeds: [
            {
              title: title || 'Notification Serveur SCP:SL',
              description: description || '',
              color: numericColor,
              fields: Array.isArray(fields) ? fields : [],
              timestamp: new Date().toISOString(),
              footer: { text: 'scpsl.lumishost.com · play.lumishost.com:1031' }
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Erreur Webhook Discord: ${errText.slice(0, 200)}` });
      }

      return res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau';
      return res.status(502).json({ error: `Impossible d'envoyer au Webhook Discord : ${message}` });
    }
  });

  const distPath = path.join(__dirname, 'dist');

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Site-19 LumisHost Panel & Discord OAuth Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
