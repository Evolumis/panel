export interface ParsedLivePlayer {
  id: number;
  name: string;
  steamId: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface ParsedTelemetryEvent {
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

// Native SCP:SL LocalAdmin Server Console commands that MUST NOT have a leading slash
const NATIVE_LOCALADMIN_COMMANDS = new Set([
  'sr',
  'roundrestart',
  'list',
  'players',
  'p',
  'config',
  'forcestart',
  'stop',
  'exit',
  'quit',
  'help',
  'seed',
  'plugins',
  'exiled',
  'echo',
  'idle',
  'nextround',
  'license',
  'saveconfig',
  'heartbeat',
  'showtag',
  'hidetag'
]);

/**
 * Formats a command for SCP:SL LocalAdmin Server Console (Pterodactyl /command endpoint).
 * In SCP:SL LocalAdmin, native console commands (list, sr, config reload, forcestart, exit...)
 * run WITHOUT '/', while ALL RemoteAdmin commands (/bc, /ban, /oban, /unban, /kick, /god,
 * /forceclass, /give, /setgroup, /warhead, /lock, /unlock, /pbc, /cassie, etc.) MUST start with '/'.
 */
export function formatScpslConsoleCommand(rawCmd: string): string {
  const trimmed = String(rawCmd || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') || trimmed.startsWith('!') || trimmed.startsWith('@') || trimmed.startsWith('$')) {
    return trimmed;
  }

  const firstToken = trimmed.split(/\s+/)[0].toLowerCase();
  if (NATIVE_LOCALADMIN_COMMANDS.has(firstToken)) {
    return trimmed;
  }

  // Normalize common boolean syntax for god / noclip / bypass in SCP:SL RemoteAdmin
  if (firstToken === 'god' || firstToken === 'noclip' || firstToken === 'bypass') {
    const normalized = trimmed
      .replace(/\s+on$/i, ' 1')
      .replace(/\s+off$/i, ' 0')
      .replace(/\s+true$/i, ' 1')
      .replace(/\s+false$/i, ' 0');
    return `/${normalized}`;
  }

  return `/${trimmed}`;
}

/**
 * Splits chained commands (newlines or &&) into individual SCP:SL console commands.
 */
export function splitAndFormatScpslCommands(rawCmd: string): string[] {
  return String(rawCmd || '')
    .split(/\r?\n|\s*&&\s*/)
    .map((part) => formatScpslConsoleCommand(part))
    .filter(Boolean);
}

/**
 * Converts French or human-readable ban durations into valid SCP:SL RemoteAdmin duration syntax.
 * Examples: "2 heures" -> "2h", "24 heures" -> "24h", "7 jours" -> "7d", "Permanent" -> "50y".
 */
export function normalizeScpslDuration(rawDuration: string): string {
  const clean = String(rawDuration || '').trim().toLowerCase();
  if (!clean) return '24h';
  if (
    clean === '0' ||
    clean.includes('perm') ||
    clean.includes('definitif') ||
    clean.includes('définitif') ||
    clean.includes('infini')
  ) {
    return '50y';
  }

  // Already valid SCP:SL duration (e.g. 30m, 2h, 7d, 1w, 1mo, 50y)
  if (/^\d+(s|m|h|d|w|mo|y)$/.test(clean)) {
    return clean;
  }

  const numMatch = clean.match(/(\d+)/);
  const amount = numMatch ? numMatch[1] : '24';

  if (clean.includes('min')) return `${amount}m`;
  if (clean.includes('heur') || clean.includes('hour') || clean.includes('h')) return `${amount}h`;
  if (clean.includes('jour') || clean.includes('day') || clean.includes('j')) return `${amount}d`;
  if (clean.includes('sem') || clean.includes('week')) return `${amount}w`;
  if (clean.includes('mois') || clean.includes('month')) return `${amount}mo`;
  if (clean.includes('an') || clean.includes('year')) return `${amount}y`;

  return `${amount}h`;
}

/**
 * Parses real active players from SCP:SL LocalAdminLogs & ServerLogs lines.
 * Supports:
 *  - LocalAdmin `list` output:
 *      - [1] evolumis (76561199376552343@steam)
 *      - evolumis (1) - 76561199376552343@steam
 *      - Player [1] evolumis (76561199376552343@steam)
 *      - (1) evolumis (76561199376552343@steam)
 *  - Connection / Disconnection log lines in ServerLogs & LocalAdminLogs
 */
export function parseLivePlayersFromLogs(
  localAdminLines: string[],
  serverLogLines: string[] = []
): { players: ParsedLivePlayer[]; rawListLines: string[] } {
  const activeMap = new Map<string, ParsedLivePlayer>();
  const rawListLines: string[] = [];

  // 1. Walk server logs + localAdmin logs chronologically for joins, role changes, and disconnects
  const combined = [...serverLogLines, ...localAdminLines];

  const extractTimestamp = (line: string): string => {
    const m = line.match(/(\d{2}:\d{2}:\d{2})/);
    return m ? m[1] : new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  let lastListStartIdx = -1;
  for (let i = localAdminLines.length - 1; i >= 0; i--) {
    if (/list of players|players\s*\(\d+\s*\/\s*\d+\)|connected players|no players connected/i.test(localAdminLines[i])) {
      lastListStartIdx = i;
      break;
    }
  }

  for (const line of combined) {
    const steamMatch = line.match(/(\d{17}@(?:steam|discord|northwood))/i);
    if (!steamMatch) continue;
    const steamId = steamMatch[1];
    const ts = extractTimestamp(line);
    const lower = line.toLowerCase();

    // Try to find numeric PlayerID near name or steamId
    const idMatch =
      line.match(/\[(\d{1,4})\]/) ||
      line.match(/\bID[:\s#]+(\d{1,4})\b/i) ||
      line.match(/\((\d{1,4})\)\s*[-–]/i) ||
      line.match(/^\s*[-*]\s*\(?(\d{1,4})\)?[\s:.-]+/);
    const parsedId = idMatch ? Number(idMatch[1]) : undefined;

    // Extract player name
    let name = '';
    const nameBeforeParen = line.match(/\]\s*([^\(\[\|]+?)\s*\(\d{17}@/);
    const nameBeforeSteam = line.match(/(?:Player|player|joined:|connected:|\-\s*(?:\[\d+\]\s*)?|\(\d+\)\s*)\s*([^\(\[\|:]+?)\s*\(\d{17}@/);
    const genericName = line.match(/([A-Za-z0-9_\-\.\s]{2,32}?)\s*\(\d{17}@/);
    if (nameBeforeParen && nameBeforeParen[1].trim()) {
      name = nameBeforeParen[1].trim();
    } else if (nameBeforeSteam && nameBeforeSteam[1].trim()) {
      name = nameBeforeSteam[1].trim();
    } else if (genericName && genericName[1].trim()) {
      name = genericName[1].trim();
    }
    name = name.replace(/^[\-\*\s:\[\]\d]+/, '').trim();
    if (!name || name.toLowerCase() === 'player' || name.toLowerCase() === 'client') {
      name = activeMap.get(steamId)?.name || `Joueur_${steamId.slice(-5, -6) || steamId.slice(12, 17)}`;
    }

    if (
      lower.includes('disconnected') ||
      lower.includes('left the server') ||
      lower.includes('has disconnected') ||
      lower.includes('kicked') ||
      lower.includes('banned from')
    ) {
      const prev = activeMap.get(steamId);
      if (prev) {
        activeMap.set(steamId, { ...prev, isOnline: false, lastSeen: ts });
      }
      continue;
    }

    // Role detection from ServerLogs (e.g. "changed role to ClassD" or "spawned as NtfCaptain")
    let detectedRole = activeMap.get(steamId)?.role || 'Connecté';
    const roleMatch = line.match(/(?:spawned as|changed role to|role(?:\s+is)?[:\s]+)\s*([A-Za-z0-9_\-]+)/i);
    if (roleMatch && roleMatch[1]) {
      detectedRole = roleMatch[1];
    }

    const prev = activeMap.get(steamId);
    activeMap.set(steamId, {
      id: parsedId ?? prev?.id ?? 0,
      name: name || prev?.name || steamId,
      steamId,
      role: detectedRole,
      isOnline: true,
      lastSeen: ts
    });
  }

  // 2. If a fresh `list` block exists at the end of LocalAdminLogs, treat it as authoritative for online players!
  if (lastListStartIdx !== -1) {
    const listWindow = localAdminLines.slice(lastListStartIdx, lastListStartIdx + 65);
    const listBlockSteamIds = new Set<string>();
    let foundNoPlayers = false;

    for (const line of listWindow) {
      if (/no players connected|0\s*\/\s*\d+\s*players/i.test(line)) {
        foundNoPlayers = true;
        rawListLines.push(line);
        continue;
      }
      const sm = line.match(/(\d{17}@(?:steam|discord|northwood))/i);
      if (sm) {
        rawListLines.push(line);
        const steamId = sm[1];
        listBlockSteamIds.add(steamId);
        const idM =
          line.match(/\[(\d{1,4})\]/) ||
          line.match(/\bID[:\s#]+(\d{1,4})\b/i) ||
          line.match(/\((\d{1,4})\)/) ||
          line.match(/^\s*[-*]\s*(\d{1,4})\b/);
        const idNum = idM ? Number(idM[1]) : activeMap.get(steamId)?.id || 0;
        const nameM = line.match(/(?:\]\s*|[-–]\s*|\)\s*)([^\(\[\|]+?)\s*\(\d{17}@/);
        const cleanedName = (nameM?.[1] || activeMap.get(steamId)?.name || steamId)
          .replace(/^[\-\*\s:\[\]\d]+/, '')
          .trim();

        const prev = activeMap.get(steamId);
        activeMap.set(steamId, {
          id: idNum || prev?.id || 0,
          name: cleanedName || prev?.name || steamId,
          steamId,
          role: prev?.role || 'En Jeu (list)',
          isOnline: true,
          lastSeen: extractTimestamp(line)
        });
      }
    }

    if (foundNoPlayers && listBlockSteamIds.size === 0) {
      for (const [k, v] of activeMap.entries()) {
        activeMap.set(k, { ...v, isOnline: false });
      }
    } else if (listBlockSteamIds.size > 0) {
      for (const [k, v] of activeMap.entries()) {
        if (!listBlockSteamIds.has(k)) {
          activeMap.set(k, { ...v, isOnline: false });
        }
      }
    }
  }

  // Assign sequential fallback IDs only if player is online and ID wasn't printed in logs
  let nextFallbackId = 1;
  const usedIds = new Set(Array.from(activeMap.values()).map((p) => p.id).filter((id) => id > 0));
  const players = Array.from(activeMap.values()).map((p) => {
    if (p.id > 0) return p;
    while (usedIds.has(nextFallbackId)) nextFallbackId++;
    usedIds.add(nextFallbackId);
    return { ...p, id: nextFallbackId };
  });

  // Online players first, sorted by numeric ID
  players.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.id - b.id;
  });

  return { players, rawListLines };
}

/**
 * Parses real gameplay events (kills, teamkills, connects, disconnects, bans, RemoteAdmin commands)
 * from SCP:SL ServerLogs and LocalAdminLogs.
 */
export function parseGameplayEventsFromLogs(lines: string[]): ParsedTelemetryEvent[] {
  const events: ParsedTelemetryEvent[] = [];
  const seenKeys = new Set<string>();

  for (let idx = lines.length - 1; idx >= 0 && events.length < 150; idx--) {
    const line = lines[idx].trim();
    if (!line) continue;

    const tsMatch = line.match(/(\d{2}:\d{2}:\d{2})/);
    const timestamp = tsMatch ? tsMatch[1] : 'LIVE';
    const lower = line.toLowerCase();

    const steamMatches = [...line.matchAll(/([^\(\|\[\]]{1,32}?)\s*\((\d{17}@(?:steam|discord|northwood))\)/gi)];

    let category: ParsedTelemetryEvent['category'] | null = null;
    if (lower.includes('teamkill') || lower.includes('friendly fire')) {
      category = 'TEAMKILL';
    } else if (lower.includes(' killed ') || lower.includes('has been killed by') || lower.includes('died to')) {
      category = 'KILL';
    } else if (lower.includes('banned') || lower.includes('kicked') || lower.includes('muted')) {
      category = 'SANCTION';
    } else if (lower.includes('remoteadmin') || lower.includes('executed command') || lower.includes('setgroup')) {
      category = 'ADMIN';
    } else if (lower.includes('connected') && !lower.includes('disconnected') && steamMatches.length > 0) {
      category = 'CONNECT';
    } else if (lower.includes('disconnected') && steamMatches.length > 0) {
      category = 'DISCONNECT';
    }

    if (!category) continue;

    const dedupKey = `${timestamp}|${category}|${line.slice(-80)}`;
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);

    const first = steamMatches[0];
    const second = steamMatches[1];

    const cleanName = (raw?: string) =>
      (raw || '')
        .replace(/^.*[\]|:]\s*/, '')
        .replace(/^[\-\*\s]+/, '')
        .trim();

    let killerName = first ? cleanName(first[1]) : undefined;
    let killerSteamId = first ? first[2] : undefined;
    let victimName = second ? cleanName(second[1]) : undefined;
    let victimSteamId = second ? second[2] : undefined;

    // Handle "Victim (steam1) has been killed by Attacker (steam2)"
    if (lower.includes('has been killed by') && first && second) {
      victimName = cleanName(first[1]);
      victimSteamId = first[2];
      killerName = cleanName(second[1]);
      killerSteamId = second[2];
    }

    const weaponMatch = line.match(/(?:using|with|by)\s+([A-Za-z0-9_\-\s]{2,32}?)(?:\.|\||$)/i);

    events.push({
      id: `SLOG-${idx}-${timestamp.replace(/:/g, '')}`,
      timestamp,
      category,
      killerName: killerName || undefined,
      killerSteamId: killerSteamId || undefined,
      victimName: victimName || undefined,
      victimSteamId: victimSteamId || undefined,
      weapon: weaponMatch ? weaponMatch[1].trim() : undefined,
      zone: 'play.lumishost.com',
      details: line.slice(0, 260)
    });
  }

  return events;
}
