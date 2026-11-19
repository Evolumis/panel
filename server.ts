import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';

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

interface TelemetryEvent {
  id: string;
  timestamp: string;
  category: 'KILL' | 'TEAMKILL' | 'CONNECT' | 'DISCONNECT' | 'ADMIN' | 'DAMAGE' | 'ITEM' | 'SANCTION';
  killerName?: string;
  killerSteamId?: string;
  killerRole?: string;
  victimName?: string;
  victimSteamId?: string;
  victimRole?: string;
  weapon?: string;
  zone?: string;
  details: string;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', true);
  app.use(express.json({ limit: '5mb' }));

  // In-memory store for Discord OAuth session & ingested SCP:SL telemetry events
  let currentDiscordUser: DiscordSessionUser | null = null;
  let runtimeDiscordClientId = process.env.DISCORD_CLIENT_ID || '';
  let runtimeDiscordClientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  let lastRedirectUri = '';

  const liveTelemetryEvents: TelemetryEvent[] = [];

  const cleanPteroUrl = (rawUrl: string) => rawUrl.trim().replace(/\/+$/, '');
  const resolvePteroConfig = (body: Record<string, unknown>) => ({
    panelUrl: String(body.panelUrl || process.env.PTERO_URL || 'https://panel.lumishost.com').trim(),
    apiKey: String(body.apiKey || process.env.PTERO_CLIENT_API_KEY || '').trim(),
    serverId: String(body.serverId || process.env.PTERO_SERVER_ID || '').trim()
  });

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
  // 1. DISCORD OAUTH2 AUTHENTICATION (POPUP FLOW FOR IFRAME ENVIRONMENT)
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
      return res.json({
        configured: false,
        url: null,
        redirectUri
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds'
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    return res.json({
      configured: true,
      url: authUrl,
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
  <head>
    <meta charset="utf-8" />
    <title>Authentification Discord Réussie</title>
  </head>
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

  app.get('/api/auth/me', (_req, res) => {
    return res.json({
      user: currentDiscordUser,
      oauthConfigured: Boolean(
        (runtimeDiscordClientId || process.env.DISCORD_CLIENT_ID) &&
          (runtimeDiscordClientSecret || process.env.DISCORD_CLIENT_SECRET)
      ),
      pteroConfigured: Boolean(process.env.PTERO_CLIENT_API_KEY),
      pteroServerId: process.env.PTERO_SERVER_ID || '',
      pteroUrl: process.env.PTERO_URL || ''
    });
  });

  app.post('/api/auth/session', (req, res) => {
    const { username, discordId, roleLabel } = req.body;
    currentDiscordUser = {
      id: discordId || process.env.FOUNDER_DISCORD_ID || '985589556655054858',
      username: username || 'nathaniel_dagenais',
      globalName: username || 'Nathaniel Dagenais',
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
  // 2. PTERODACTYL CLIENT API PROXY (STATUS, POWER, COMMAND, FILES, LOGS SYNC)
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

  app.post('/api/ptero/command', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    const { command } = req.body || {};
    if (!panelUrl || !apiKey || !serverId || !command) {
      return res.status(400).json({ error: 'Paramètres requis manquants pour la commande console.' });
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
        body: JSON.stringify({ command })
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          error: `Le serveur doit être en ligne pour recevoir une commande console (${response.status}).`,
          details: text.slice(0, 300)
        });
      }

      return res.json({ ok: true, command });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau';
      return res.status(502).json({ error: `Erreur lors de l'envoi de la commande : ${message}` });
    }
  });

  app.post('/api/ptero/files/write', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    const { filePath, content } = req.body || {};
    if (!panelUrl || !apiKey || !serverId || !filePath || typeof content !== 'string') {
      return res.status(400).json({ error: 'Paramètres manquants pour l’écriture du fichier sur Pterodactyl.' });
    }

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

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          error: `Impossible d'écrire ${filePath} sur Pterodactyl (${response.status})`,
          details: text.slice(0, 300)
        });
      }

      return res.json({ ok: true, filePath });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur réseau';
      return res.status(502).json({ error: `Erreur API Fichiers Pterodactyl : ${message}` });
    }
  });

  // Read live LocalAdmin logs from Pterodactyl container (/home/container/.config/SCP Secret Laboratory/LocalAdminLogs/1031)
  app.post('/api/ptero/logs/sync', async (req, res) => {
    const { panelUrl, apiKey, serverId } = resolvePteroConfig(req.body || {});
    const { port = '1031' } = req.body || {};
    if (!panelUrl || !apiKey || !serverId) {
      return res.status(400).json({ error: 'Clé API Pterodactyl requise pour lire les fichiers de logs du conteneur.' });
    }

    const baseUrl = cleanPteroUrl(panelUrl);
    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: 'Application/vnd.pterodactyl.v1+json'
    };

    const logDir = `/.config/SCP Secret Laboratory/LocalAdminLogs/${port}`;
    try {
      const listResp = await fetch(
        `${baseUrl}/api/client/servers/${serverId.trim()}/files/list?directory=${encodeURIComponent(logDir)}`,
        { headers }
      );

      if (!listResp.ok) {
        return res.status(listResp.status).json({
          error: `Impossible de lister ${logDir} (${listResp.status})`
        });
      }

      const listData = await listResp.json();
      const files = (listData?.data || [])
        .map((item: { attributes?: { name?: string; modified_at?: string } }) => item.attributes)
        .filter((f: { name?: string } | undefined) => f && f.name && f.name.endsWith('.txt'));

      if (files.length === 0) {
        return res.json({ lines: [], message: 'Aucun fichier de log trouvé pour ce port.' });
      }

      const latestFile = files[files.length - 1].name;
      const contentResp = await fetch(
        `${baseUrl}/api/client/servers/${serverId.trim()}/files/contents?file=${encodeURIComponent(`${logDir}/${latestFile}`)}`,
        { headers }
      );

      if (!contentResp.ok) {
        return res.status(contentResp.status).json({ error: 'Impossible de lire le dernier fichier de log.' });
      }

      const rawText = await contentResp.text();
      const lines = rawText.split('\n').filter(Boolean).slice(-120);
      return res.json({
        fileName: latestFile,
        lines
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      return res.status(502).json({ error: `Erreur synchronisation logs Pterodactyl : ${msg}` });
    }
  });

  // ============================================================================
  // 3. TELEMETRY INGESTION (KILLS, PLAYER LOGS, SANCTIONS) & DISCORD WEBHOOK
  // ============================================================================

  app.get('/api/telemetry/events', (_req, res) => {
    return res.json({ events: liveTelemetryEvents });
  });

  app.post('/api/telemetry/ingest', (req, res) => {
    const evt = req.body as Partial<TelemetryEvent>;
    const created: TelemetryEvent = {
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
    liveTelemetryEvents.unshift(created);
    if (liveTelemetryEvents.length > 200) liveTelemetryEvents.pop();
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
