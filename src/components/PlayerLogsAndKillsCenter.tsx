import React, { useEffect, useState } from 'react';
import {
  Crosshair,
  Search,
  RefreshCw,
  Gavel,
  UserCheck,
  Terminal,
  FileText,
  UserPlus,
  Trash2,
  RotateCcw,
  Wifi,
  WifiOff
} from 'lucide-react';
import {
  CustomTeam,
  SCPSL_BADGE_COLORS,
  SanctionRecord,
  StaffMember,
  VipTier
} from '../data/scpslDefaults';

export interface KillAndPlayerLog {
  id: string;
  timestamp: string;
  category: 'KILL' | 'TEAMKILL' | 'CONNECT' | 'ADMIN' | 'ITEM' | 'SANCTION';
  killerName?: string;
  killerSteamId?: string;
  killerRole?: string;
  killerColor?: string;
  victimName?: string;
  victimSteamId?: string;
  victimRole?: string;
  victimColor?: string;
  weapon?: string;
  zone?: string;
  details: string;
}

export interface PlayerProfileSummary {
  steamId: string;
  username: string;
  discordHandle: string;
  isOnline: boolean;
  currentRole: string;
  roleColor: string;
  kills: number;
  deaths: number;
  teamkills: number;
  playtimeHours: number;
  firstJoined: string;
  lastSeen: string;
  vipOrStaffTag: string;
}

interface PlayerLogsAndKillsCenterProps {
  sanctions: SanctionRecord[];
  setSanctions: React.Dispatch<React.SetStateAction<SanctionRecord[]>>;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  customTeams: CustomTeam[];
  vipTiers: VipTier[];
  pteroUrl: string;
  pteroApiKey: string;
  pteroServerId: string;
  serverPort: string;
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
  onExecuteSanction?: (params: {
    type: 'BAN' | 'KICK' | 'WARN' | 'MUTE' | 'UNBAN';
    targetName: string;
    targetSteamId: string;
    playerId?: number | string;
    duration?: string;
    reason: string;
  }) => Promise<void> | void;
  onGrantInGameRole?: (
    targetId: string,
    roleId: string,
    playerName: string,
    nextStaffList: StaffMember[]
  ) => Promise<void> | void;
}

const INITIAL_LOGS: KillAndPlayerLog[] = [];

const INITIAL_PROFILES: PlayerProfileSummary[] = [];

export const PlayerLogsAndKillsCenter: React.FC<PlayerLogsAndKillsCenterProps> = ({
  sanctions,
  setSanctions,
  staffList,
  setStaffList,
  customTeams,
  pteroUrl,
  pteroApiKey,
  pteroServerId,
  serverPort,
  onExecutePteroCommand,
  onExecuteSanction,
  onGrantInGameRole
}) => {
  const [subView, setSubView] = useState<
    'player-profiles' | 'killfeed' | 'all-logs' | 'bans-staff' | 'raw-ptero'
  >('player-profiles');
  const [logs, setLogs] = useState<KillAndPlayerLog[]>(INITIAL_LOGS);
  const [profiles, setProfiles] = useState<PlayerProfileSummary[]>(INITIAL_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfileSummary | null>(null);

  // Online / Offline Filter & Search
  const [presenceFilter, setPresenceFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [profileSearch, setProfileSearch] = useState('');
  const [lookupSteamId, setLookupSteamId] = useState('');
  const [lookupNickname, setLookupNickname] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | KillAndPlayerLog['category']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Sanction Form for a selected player (works both Online & Offline via oban!)
  const [sanctionDuration, setSanctionDuration] = useState('7 jours');
  const [sanctionReason, setSanctionReason] = useState(
    'Non-respect du règlement Site-19'
  );

  // Add Staff Member Form (inside Bans & Staff tab)
  const [newModName, setNewModName] = useState('');
  const [newModSteam, setNewModSteam] = useState('');
  const [newModDiscord, setNewModDiscord] = useState('');
  const [newModRole, setNewModRole] = useState<'admin' | 'moderator' | 'helper'>('moderator');
  const [newModBadge, setNewModBadge] = useState('MODÉRATEUR');
  const [newModColor, setNewModColor] = useState('cyan');

  // Pterodactyl Raw LocalAdmin Logs state
  const [rawPteroLines, setRawPteroLines] = useState<string[]>([]);
  const [isSyncingRawLogs, setIsSyncingRawLogs] = useState(false);
  const [rawLogSyncStatus, setRawLogSyncStatus] = useState<string | null>(null);

  const loadRealTelemetry = async () => {
    try {
      const resp = await fetch('/api/telemetry/events');
      if (!resp.ok) return;
      const data = await resp.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const mappedLogs: KillAndPlayerLog[] = events.map((ev: {
        id?: string;
        timestamp?: string;
        category?: string;
        killerName?: string;
        killerSteamId?: string;
        killerRole?: string;
        victimName?: string;
        victimSteamId?: string;
        victimRole?: string;
        weapon?: string;
        zone?: string;
        details?: string;
      }) => ({
        id: ev.id || `LOG-${Math.random()}`,
        timestamp: ev.timestamp || '',
        category: (['KILL', 'TEAMKILL', 'CONNECT', 'ADMIN', 'ITEM', 'SANCTION'].includes(String(ev.category))
          ? ev.category
          : 'ADMIN') as KillAndPlayerLog['category'],
        killerName: ev.killerName,
        killerSteamId: ev.killerSteamId,
        killerRole: ev.killerRole,
        killerColor: ev.category === 'TEAMKILL' ? '#FB7185' : '#38BDF8',
        victimName: ev.victimName,
        victimSteamId: ev.victimSteamId,
        victimRole: ev.victimRole,
        victimColor: '#CBD5E1',
        weapon: ev.weapon,
        zone: ev.zone,
        details: ev.details || ''
      }));
      setLogs(mappedLogs);

      const profileMap = new Map<string, PlayerProfileSummary>();
      [...events].reverse().forEach((ev: {
        category?: string;
        timestamp?: string;
        killerName?: string;
        killerSteamId?: string;
        killerRole?: string;
        victimName?: string;
        victimSteamId?: string;
        victimRole?: string;
      }) => {
        if (ev.killerSteamId) {
          const prev = profileMap.get(ev.killerSteamId);
          const isDisconnect = ev.category === 'DISCONNECT';
          profileMap.set(ev.killerSteamId, {
            steamId: ev.killerSteamId,
            username: ev.killerName || prev?.username || ev.killerSteamId,
            discordHandle: prev?.discordHandle || 'Non lié',
            isOnline: isDisconnect ? false : ev.category === 'CONNECT' ? true : (prev?.isOnline ?? true),
            currentRole: isDisconnect ? 'Hors-Ligne' : ev.killerRole || prev?.currentRole || 'Joueur',
            roleColor: isDisconnect ? '#64748B' : '#38BDF8',
            kills: (prev?.kills || 0) + (ev.category === 'KILL' ? 1 : 0),
            deaths: prev?.deaths || 0,
            teamkills: (prev?.teamkills || 0) + (ev.category === 'TEAMKILL' ? 1 : 0),
            playtimeHours: prev?.playtimeHours || 0,
            firstJoined: prev?.firstJoined || new Date().toLocaleDateString('fr-FR'),
            lastSeen: isDisconnect ? `Hors-ligne · ${ev.timestamp || ''}` : `En ligne · ${ev.timestamp || ''}`,
            vipOrStaffTag: prev?.vipOrStaffTag || 'Joueur'
          });
        }
        if (ev.victimSteamId) {
          const prev = profileMap.get(ev.victimSteamId);
          profileMap.set(ev.victimSteamId, {
            steamId: ev.victimSteamId,
            username: ev.victimName || prev?.username || ev.victimSteamId,
            discordHandle: prev?.discordHandle || 'Non lié',
            isOnline: prev?.isOnline ?? true,
            currentRole: ev.victimRole || prev?.currentRole || 'Joueur',
            roleColor: prev?.roleColor || '#CBD5E1',
            kills: prev?.kills || 0,
            deaths: (prev?.deaths || 0) + 1,
            teamkills: prev?.teamkills || 0,
            playtimeHours: prev?.playtimeHours || 0,
            firstJoined: prev?.firstJoined || new Date().toLocaleDateString('fr-FR'),
            lastSeen: prev?.lastSeen || `En ligne · ${ev.timestamp || ''}`,
            vipOrStaffTag: prev?.vipOrStaffTag || 'Joueur'
          });
        }
      });

      const realProfiles = Array.from(profileMap.values());
      if (realProfiles.length > 0) {
        setProfiles((prev) => {
          const merged = new Map<string, PlayerProfileSummary>();
          prev.forEach((p) => merged.set(p.steamId.toLowerCase(), p));
          realProfiles.forEach((p) => merged.set(p.steamId.toLowerCase(), p));
          return Array.from(merged.values());
        });
        setSelectedProfile((prev) => prev || realProfiles[0]);
      }
    } catch {
      // ignore error
    }
  };

  useEffect(() => {
    loadRealTelemetry();
    handleSyncLiveLocalAdminLogs();
  }, [pteroServerId, serverPort]);

  const handleLookupOrAddOfflineProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupSteamId.trim()) return;
    const formattedSteam = lookupSteamId.includes('@')
      ? lookupSteamId.trim()
      : `${lookupSteamId.trim()}@steam`;

    const existing = profiles.find((p) => p.steamId.toLowerCase() === formattedSteam.toLowerCase());
    if (existing) {
      setSelectedProfile(existing);
      setLookupSteamId('');
      setLookupNickname('');
      return;
    }

    const createdOffline: PlayerProfileSummary = {
      steamId: formattedSteam,
      username: lookupNickname.trim() || `Joueur_${formattedSteam.slice(8, 13)}`,
      discordHandle: 'Non lié',
      isOnline: false,
      currentRole: 'Hors-Ligne (Recherche Base SteamID64)',
      roleColor: '#64748B',
      kills: 0,
      deaths: 0,
      teamkills: 0,
      playtimeHours: 0.5,
      firstJoined: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastSeen: 'Hors-ligne · Profil chargé par SteamID64',
      vipOrStaffTag: 'Hors-Ligne'
    };

    setProfiles((prev) => [createdOffline, ...prev]);
    setSelectedProfile(createdOffline);
    setLookupSteamId('');
    setLookupNickname('');
  };

  const handleQuickSanctionFromKill = (
    targetName: string,
    targetSteamId: string,
    type: 'BAN' | 'WARN' | 'KICK',
    reason: string,
    duration = '7 jours',
    isOfflineBan = false
  ) => {
    const newLog: KillAndPlayerLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category: 'SANCTION',
      killerName: 'evolumis [Staff]',
      victimName: targetName,
      victimSteamId: targetSteamId,
      weapon: `${isOfflineBan ? 'OFFLINE BAN (/oban)' : type} (${type === 'BAN' ? duration : type})`,
      zone: `play.lumishost.com:${serverPort}`,
      details: `[SANCTION ${isOfflineBan ? 'OFFLINE BAN' : type}] ${targetName} (${targetSteamId}) sanctionné pour : "${reason}" (${duration}).`
    };
    setLogs((prev) => [newLog, ...prev]);

    if (onExecuteSanction) {
      onExecuteSanction({
        type,
        targetName,
        targetSteamId,
        duration: type === 'BAN' ? duration : undefined,
        reason
      });
      return;
    }

    onExecutePteroCommand(
      type === 'BAN'
        ? `/oban ${targetSteamId} 7d ${reason}`
        : type === 'KICK'
        ? `/kick ${targetSteamId} ${reason}`
        : `/bc 8 <color=#FAFF86><b>[WARN STAFF]</b></color> ${targetName} : ${reason}`,
      `MODÉRATION ${type}`
    );
  };

  const handleSyncLiveLocalAdminLogs = async () => {
    setIsSyncingRawLogs(true);
    setRawLogSyncStatus(null);
    try {
      const resp = await fetch('/api/ptero/logs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelUrl: pteroUrl,
          apiKey: pteroApiKey,
          serverId: pteroServerId,
          port: serverPort
        })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setRawLogSyncStatus(
          data.error || 'Connectez votre Clé API Client (ptlc_...) dans l’onglet Développeur pour lire les fichiers de logs en direct.'
        );
      } else {
        const combinedLines: string[] = [
          ...(Array.isArray(data.serverLogLines) ? data.serverLogLines : []),
          ...(Array.isArray(data.lines) ? data.lines : [])
        ];
        if (combinedLines.length > 0) {
          setRawPteroLines(combinedLines.slice(-180));
        }
        setRawLogSyncStatus(
          data.message || `Logs synchronisés (${data.fileName || data.serverLogFile || 'OK'})`
        );

        // Merge structured gameplay events parsed from ServerLogs & LocalAdminLogs
        if (Array.isArray(data.parsedEvents) && data.parsedEvents.length > 0) {
          const parsedMapped: KillAndPlayerLog[] = data.parsedEvents.map(
            (ev: {
              id: string;
              timestamp: string;
              category: string;
              killerName?: string;
              killerSteamId?: string;
              victimName?: string;
              victimSteamId?: string;
              weapon?: string;
              zone?: string;
              details: string;
            }) => ({
              id: ev.id,
              timestamp: ev.timestamp,
              category: (['KILL', 'TEAMKILL', 'CONNECT', 'ADMIN', 'ITEM', 'SANCTION'].includes(ev.category)
                ? ev.category
                : 'ADMIN') as KillAndPlayerLog['category'],
              killerName: ev.killerName,
              killerSteamId: ev.killerSteamId,
              killerColor: ev.category === 'TEAMKILL' ? '#FB7185' : '#38BDF8',
              victimName: ev.victimName,
              victimSteamId: ev.victimSteamId,
              victimColor: '#CBD5E1',
              weapon: ev.weapon,
              zone: ev.zone,
              details: ev.details
            })
          );
          setLogs((prev) => {
            const seen = new Set(prev.map((l) => l.id));
            const fresh = parsedMapped.filter((l) => !seen.has(l.id));
            return [...fresh, ...prev].slice(0, 250);
          });
        }

        // Merge real players detected from LocalAdminLogs + ServerLogs
        if (Array.isArray(data.players) && data.players.length > 0) {
          const parsedProfiles: PlayerProfileSummary[] = data.players.map(
            (p: { id: number; name: string; steamId: string; role: string; isOnline: boolean; lastSeen: string }) => ({
              steamId: p.steamId,
              username: p.name || p.steamId,
              discordHandle: 'Non lié',
              isOnline: Boolean(p.isOnline),
              currentRole: p.isOnline ? `${p.role} (ID #${p.id})` : 'Hors-Ligne',
              roleColor: p.isOnline ? '#34D399' : '#64748B',
              kills: 0,
              deaths: 0,
              teamkills: 0,
              playtimeHours: 0,
              firstJoined: new Date().toLocaleDateString('fr-FR'),
              lastSeen: p.isOnline ? `En ligne · ${p.lastSeen}` : `Vu à ${p.lastSeen}`,
              vipOrStaffTag: 'Joueur Réel'
            })
          );
          setProfiles((prev) => {
            const map = new Map<string, PlayerProfileSummary>();
            prev.forEach((pr) => map.set(pr.steamId.toLowerCase(), pr));
            parsedProfiles.forEach((pr) => {
              const old = map.get(pr.steamId.toLowerCase());
              map.set(pr.steamId.toLowerCase(), old ? { ...old, ...pr, kills: old.kills, deaths: old.deaths, teamkills: old.teamkills } : pr);
            });
            return Array.from(map.values());
          });
          setSelectedProfile((prev) => prev || parsedProfiles[0]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setRawLogSyncStatus(`Erreur lors de la lecture des logs Pterodactyl : ${msg}`);
    } finally {
      setIsSyncingRawLogs(false);
    }
  };

  const handleAddModerator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim() || !newModSteam.trim()) return;
    const raw = newModSteam.trim();
    const formattedSteam = raw.includes('@') || /^\d{1,4}$/.test(raw) ? raw : `${raw}@steam`;
    const created: StaffMember = {
      id: `st-${Date.now()}`,
      username: newModName.trim(),
      steamId: formattedSteam,
      discordTag: newModDiscord.trim() || newModName.trim().toLowerCase(),
      discordId: '985589556655054858',
      roleId: newModRole,
      badgeText: newModBadge.trim() || 'MODÉRATEUR',
      badgeColor: newModColor,
      permissions:
        newModRole === 'admin'
          ? ['KickingAndShortTermBanning', 'BanningUpToDay', 'LongTermBanning', 'ForceclassSelf', 'GivingItems', 'Broadcasting']
          : ['KickingAndShortTermBanning', 'BanningUpToDay', 'Broadcasting'],
      addedAt: new Date().toISOString().slice(0, 10)
    };
    const nextStaffList = [
      ...staffList.filter((s) => s.steamId.toLowerCase() !== formattedSteam.toLowerCase()),
      created
    ];
    setStaffList(nextStaffList);
    if (onGrantInGameRole) {
      onGrantInGameRole(formattedSteam, newModRole, created.username, nextStaffList);
    } else {
      onExecutePteroCommand(`setgroup ${formattedSteam} ${newModRole}`, 'REMOTEADMIN');
    }
    setNewModName('');
    setNewModSteam('');
    setNewModDiscord('');
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchPresence =
      presenceFilter === 'ALL' ||
      (presenceFilter === 'ONLINE' && p.isOnline) ||
      (presenceFilter === 'OFFLINE' && !p.isOnline);
    const q = profileSearch.toLowerCase();
    const matchSearch =
      !q ||
      p.username.toLowerCase().includes(q) ||
      p.steamId.toLowerCase().includes(q) ||
      p.discordHandle.toLowerCase().includes(q) ||
      p.vipOrStaffTag.toLowerCase().includes(q);
    return matchPresence && matchSearch;
  });

  const filteredLogs = logs.filter((item) => {
    const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchText =
      !q ||
      item.details.toLowerCase().includes(q) ||
      (item.killerName && item.killerName.toLowerCase().includes(q)) ||
      (item.killerSteamId && item.killerSteamId.toLowerCase().includes(q)) ||
      (item.victimName && item.victimName.toLowerCase().includes(q)) ||
      (item.victimSteamId && item.victimSteamId.toLowerCase().includes(q)) ||
      (item.weapon && item.weapon.toLowerCase().includes(q)) ||
      (item.zone && item.zone.toLowerCase().includes(q));
    return matchCategory && matchText;
  });

  const killLogsOnly = logs.filter((l) => l.category === 'KILL' || l.category === 'TEAMKILL');
  const onlineCount = profiles.filter((p) => p.isOnline).length;
  const offlineCount = profiles.filter((p) => !p.isOnline).length;

  return (
    <div className="space-y-6">
      {/* Top Bar: Sub-views & Metrics */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              BASE DE DONNÉES JOUEURS (ONLINE &amp; OFFLINE) · KILLFEED · LOGS · CASIERS DE SANCTIONS
            </div>
            <h2 className="text-xl font-bold text-white">
              Profils Joueurs (En Ligne &amp; Hors-Ligne), Kills, Teamkills &amp; Modération
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setSubView('player-profiles')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'player-profiles'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Profils Online &amp; Offline ({profiles.length})
            </button>
            <button
              onClick={() => setSubView('killfeed')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'killfeed'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Kills &amp; Teamkills ({killLogsOnly.length})
            </button>
            <button
              onClick={() => setSubView('all-logs')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'all-logs'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Tous les Logs ({logs.length})
            </button>
            <button
              onClick={() => setSubView('bans-staff')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'bans-staff'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              Registre Bans &amp; Staff ({sanctions.filter((s) => s.active).length})
            </button>
            <button
              onClick={() => setSubView('raw-ptero')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                subView === 'raw-ptero'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Logs LocalAdmin
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: 360° PLAYER PROFILES (ONLINE & OFFLINE) */}
      {subView === 'player-profiles' && (
        <div className="space-y-4">
          {/* Search & Offline SteamID64 Lookup Bar */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setPresenceFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    presenceFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tous ({profiles.length})
                </button>
                <button
                  onClick={() => setPresenceFilter('ONLINE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    presenceFilter === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  En Ligne ({onlineCount})
                </button>
                <button
                  onClick={() => setPresenceFilter('OFFLINE')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    presenceFilter === 'OFFLINE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  Hors-Ligne / Offline ({offlineCount})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  placeholder="Filtrer pseudo, SteamID64, Discord..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white w-60"
                />
              </div>
            </div>

            {/* Lookup Any Offline Player by SteamID64 */}
            <form onSubmit={handleLookupOrAddOfflineProfile} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={lookupNickname}
                onChange={(e) => setLookupNickname(e.target.value)}
                placeholder="Pseudo (optionnel)"
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white w-36"
              />
              <input
                type="text"
                value={lookupSteamId}
                onChange={(e) => setLookupSteamId(e.target.value)}
                placeholder="Chercher SteamID64 Offline (76561198...@steam)"
                className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300 w-72"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
              >
                Ouvrir Profil Offline
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Online + Offline Players List */}
            <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  Annuaire Joueurs ({filteredProfiles.length})
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {onlineCount} Online · {offlineCount} Offline
                </span>
              </div>

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredProfiles.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-800 bg-slate-950 text-center space-y-2">
                    <div className="text-sm font-semibold text-slate-300">
                      Aucun vrai joueur enregistré pour le moment
                    </div>
                    <p className="text-xs text-slate-500">
                      Utilisez la recherche SteamID64 ci-dessus ou synchronisez vos logs LocalAdmin pour afficher les vrais joueurs.
                    </p>
                  </div>
                ) : (
                  filteredProfiles.map((prof) => {
                    const isSelected = prof.steamId === selectedProfile?.steamId;
                    return (
                      <button
                        key={prof.steamId}
                        onClick={() => setSelectedProfile(prof)}
                        className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {prof.username}
                            </span>
                            <span
                              className={`text-xs font-mono font-semibold ${
                                prof.isOnline ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {prof.isOnline ? '· EN LIGNE' : '· OFFLINE'}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-400 truncate">
                            {prof.steamId} · @{prof.discordHandle}
                          </div>
                          <div className="text-xs truncate" style={{ color: prof.roleColor }}>
                            {prof.currentRole}
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums text-xs shrink-0 space-y-0.5">
                          <div className="text-emerald-400">{prof.kills} Kills</div>
                          <div className="text-slate-400">{prof.playtimeHours}h jeu</div>
                          {prof.teamkills > 0 && (
                            <div className="text-rose-400 font-bold">{prof.teamkills} TK</div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Full 360° Dossier (Online OR Offline Player) */}
            {selectedProfile ? (
            <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={
                        selectedProfile.isOnline
                          ? 'text-emerald-400 font-bold'
                          : 'text-amber-400 font-bold'
                      }
                    >
                      {selectedProfile.isOnline
                        ? 'JOUEUR CONNECTÉ EN DIRECT'
                        : 'PROFIL JOUEUR HORS-LIGNE (OFFLINE)'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-300">{selectedProfile.vipOrStaffTag}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-0.5">
                    {selectedProfile.username}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    SteamID64 : {selectedProfile.steamId} · Discord : @{selectedProfile.discordHandle}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Première connexion : {selectedProfile.firstJoined} · {selectedProfile.lastSeen}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedProfile.isOnline ? (
                    <button
                      onClick={() =>
                        onExecutePteroCommand(
                          `forceclass ${selectedProfile.steamId} "${customTeams[0]?.roleKey || 'serpents_hand'}"`,
                          'REMOTEADMIN'
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                    >
                      Spawn Team Custom
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        onExecutePteroCommand(
                          `setgroup ${selectedProfile.steamId} vip-keter`,
                          'REMOTEADMIN OFFLINE'
                        )
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
                    >
                      Attribuer VIP (Offline)
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onExecuteSanction
                        ? onExecuteSanction({
                            type: 'UNBAN',
                            targetName: selectedProfile.username,
                            targetSteamId: selectedProfile.steamId,
                            reason: 'Débannissement depuis le dossier joueur'
                          })
                        : onExecutePteroCommand(`/unban id ${selectedProfile.steamId}`, 'REMOTEADMIN')
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors"
                  >
                    Débannir SteamID
                  </button>
                </div>
              </div>

              {/* Combat & Historical Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Kills Cumulés</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    {selectedProfile.kills}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Morts Cumulées</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                    {selectedProfile.deaths}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Teamkills (TK)</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-0.5">
                    {selectedProfile.teamkills}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-400">Temps de Jeu Total</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-amber-300 mt-0.5">
                    {selectedProfile.playtimeHours}h
                  </div>
                </div>
              </div>

              {/* Direct Sanction Executor (Supports Online Ban AND Offline Ban oban!) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                    <Gavel className="w-4 h-4" />
                    {selectedProfile.isOnline
                      ? `Sanctionner ${selectedProfile.username} en Direct`
                      : `Bannir ou Sanctionner ${selectedProfile.username} Hors-Ligne (Commande oban)`}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedProfile.isOnline ? 'Mode : Online' : 'Mode : Offline Ban (oban)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Motif de la sanction
                    </label>
                    <input
                      type="text"
                      value={sanctionReason}
                      onChange={(e) => setSanctionReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Durée du Bannissement
                    </label>
                    <select
                      value={sanctionDuration}
                      onChange={(e) => setSanctionDuration(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                    >
                      <option value="2 heures">2 heures</option>
                      <option value="24 heures">24 heures</option>
                      <option value="7 jours">7 jours</option>
                      <option value="30 jours">30 jours</option>
                      <option value="Permanent">Permanent</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      handleQuickSanctionFromKill(
                        selectedProfile.username,
                        selectedProfile.steamId,
                        'WARN',
                        sanctionReason,
                        'Avertissement',
                        !selectedProfile.isOnline
                      )
                    }
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                  >
                    Ajouter Warn au Casier
                  </button>
                  {selectedProfile.isOnline && (
                    <button
                      onClick={() =>
                        handleQuickSanctionFromKill(
                          selectedProfile.username,
                          selectedProfile.steamId,
                          'KICK',
                          sanctionReason
                        )
                      }
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                    >
                      Expulser (Kick)
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleQuickSanctionFromKill(
                        selectedProfile.username,
                        selectedProfile.steamId,
                        'BAN',
                        sanctionReason,
                        sanctionDuration,
                        !selectedProfile.isOnline
                      )
                    }
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                  >
                    {selectedProfile.isOnline
                      ? `Bannir en Direct (${sanctionDuration})`
                      : `Bannir Hors-Ligne / oban (${sanctionDuration})`}
                  </button>
                </div>
              </div>

              {/* Player's Sanction History */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Casier Judiciaire de {selectedProfile.username} ({selectedProfile.steamId}) :
                </div>
                {sanctions.filter((s) => s.targetSteamId === selectedProfile.steamId).length === 0 ? (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-emerald-400">
                    Casier vierge — Aucune sanction enregistrée pour ce joueur.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sanctions
                      .filter((s) => s.targetSteamId === selectedProfile.steamId)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-rose-400">{s.type}</span> ·{' '}
                            <span className="text-white">{s.reason}</span>
                            <div className="text-slate-400 font-mono mt-0.5">
                              Durée : {s.duration} · Par {s.moderator} ({s.timestamp})
                            </div>
                          </div>
                          <span className="font-mono text-slate-400">
                            {s.active ? 'Actif' : 'Expiré'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="lg:col-span-7 p-8 rounded-xl border border-slate-800 bg-slate-900 text-center space-y-2">
                <div className="text-base font-bold text-white">Aucun profil sélectionné</div>
                <p className="text-xs text-slate-400">
                  Entrez un SteamID64 dans la barre ci-dessus ou attendez la connexion d’un vrai joueur sur play.lumishost.com:{serverPort}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: KILLFEED & TEAMKILLS WITH 1-CLICK SANCTION */}
      {subView === 'killfeed' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Historique des Kills &amp; Détecteur Automatique de Teamkills (TK)
              </h3>
              <p className="text-xs text-slate-400">
                Sanctionnez immédiatement un Teamkill en un clic (Bannissement, Avertissement ou Expulsion directe sur LumisHost)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadRealTelemetry}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser Télémétrie Live
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Heure · Type</th>
                  <th className="py-2.5 px-3 font-medium">Tueur (Attaquant)</th>
                  <th className="py-2.5 px-3 font-medium">Arme / Capacité</th>
                  <th className="py-2.5 px-3 font-medium">Victime</th>
                  <th className="py-2.5 px-3 font-medium">Zone du Complexe</th>
                  <th className="py-2.5 px-3 font-medium text-right">Sanction Immédiate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {killLogsOnly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                      Aucun kill ou teamkill réel enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  killLogsOnly.map((k) => {
                  const isTk = k.category === 'TEAMKILL';
                  return (
                    <tr
                      key={k.id}
                      className={isTk ? 'bg-rose-950/25 hover:bg-rose-950/40' : 'hover:bg-slate-800/40'}
                    >
                      <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                        <span className="text-slate-400">{k.timestamp}</span> ·{' '}
                        <span className={isTk ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                          {isTk ? 'TEAMKILL (TK)' : 'KILL'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{k.killerName}</div>
                        <div className="text-slate-400 font-mono tabular-nums">
                          {k.killerSteamId} ·{' '}
                          <span style={{ color: k.killerColor }}>{k.killerRole}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-amber-300">
                        {k.weapon}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{k.victimName}</div>
                        <div className="text-slate-400 font-mono tabular-nums">
                          {k.victimSteamId} ·{' '}
                          <span style={{ color: k.victimColor }}>{k.victimRole}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {k.zone}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {k.killerSteamId ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleQuickSanctionFromKill(
                                  k.killerName || 'Joueur',
                                  k.killerSteamId!,
                                  'WARN',
                                  `Tir allié / Kill sur ${k.victimName} (${k.weapon})`
                                )
                              }
                              className="px-2.5 py-1 text-xs font-medium rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() =>
                                handleQuickSanctionFromKill(
                                  k.killerName || 'Joueur',
                                  k.killerSteamId!,
                                  'KICK',
                                  `Teamkill sur ${k.victimName} (${k.weapon})`
                                )
                              }
                              className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                            >
                              Kick
                            </button>
                            <button
                              onClick={() =>
                                handleQuickSanctionFromKill(
                                  k.killerName || 'Joueur',
                                  k.killerSteamId!,
                                  'BAN',
                                  `Teamkill volontaire sur ${k.victimName} avec ${k.weapon}`,
                                  '7 jours'
                                )
                              }
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                            >
                              Bannir 7j
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">SteamID requis</span>
                        )}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: ALL PLAYER & SERVER LOGS */}
      {subView === 'all-logs' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un joueur, SteamID64, arme, SCP-914, zone..."
                className="pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white w-80"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              {(['ALL', 'KILL', 'TEAMKILL', 'CONNECT', 'ITEM', 'ADMIN', 'SANCTION'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950">
            {filteredLogs.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-slate-400">
                Aucun log réel reçu pour le moment.
              </div>
            ) : (
              filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-900/60"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 tabular-nums">[{entry.timestamp}]</span>
                    <span
                      className={`font-bold ${
                        entry.category === 'TEAMKILL' || entry.category === 'SANCTION'
                          ? 'text-rose-400'
                          : entry.category === 'KILL'
                          ? 'text-amber-400'
                          : entry.category === 'ADMIN'
                          ? 'text-cyan-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {entry.category}
                    </span>
                    {entry.zone && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-400">{entry.zone}</span>
                      </>
                    )}
                  </div>
                  <div className="text-slate-200 leading-relaxed">{entry.details}</div>
                </div>

                {entry.killerSteamId && (
                  <button
                    onClick={() => {
                      const found = profiles.find((p) => p.steamId === entry.killerSteamId);
                      if (found) {
                        setSelectedProfile(found);
                        setSubView('player-profiles');
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Ouvrir Profil ({entry.killerName})
                  </button>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: BANS REGISTER & STAFF REMOTEADMIN ROLES */}
      {subView === 'bans-staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Active Sanctions & Bans Table */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Registre Central des Bannissements, Kicks &amp; Warns ({sanctions.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Joueur &amp; SteamID64</th>
                    <th className="py-2 px-3">Motif &amp; Durée</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {sanctions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">
                        {s.type}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{s.targetName}</div>
                        <div className="font-mono text-slate-400">{s.targetSteamId}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200">{s.reason}</div>
                        <div className="font-mono text-slate-400">
                          {s.duration} · {s.timestamp}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {s.active ? (
                          <button
                            onClick={() => {
                              setSanctions((prev) =>
                                prev.map((item) =>
                                  item.id === s.id ? { ...item, active: false } : item
                                )
                              );
                              if (onExecuteSanction) {
                                onExecuteSanction({
                                  type: 'UNBAN',
                                  targetName: s.targetName,
                                  targetSteamId: s.targetSteamId,
                                  reason: 'Sanction révoquée depuis le registre'
                                });
                              } else {
                                onExecutePteroCommand(`/unban id ${s.targetSteamId}`, 'REMOTEADMIN');
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Révoquer
                          </button>
                        ) : (
                          <span className="text-slate-500">Levé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 5 Cols: Staff & Moderators List + Add Moderator */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white">
                Staff &amp; Modérateurs (`config_remoteadmin.txt`)
              </h3>
            </div>

            <form onSubmit={handleAddModerator} className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  placeholder="Pseudo Staff"
                  className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                />
                <input
                  type="text"
                  required
                  value={newModSteam}
                  onChange={(e) => setNewModSteam(e.target.value)}
                  placeholder="76561198...@steam"
                  className="px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-800 text-amber-300"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={newModRole}
                  onChange={(e) => setNewModRole(e.target.value as 'admin' | 'moderator' | 'helper')}
                  className="px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                >
                  <option value="helper">helper</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
                <input
                  type="text"
                  value={newModBadge}
                  onChange={(e) => setNewModBadge(e.target.value)}
                  placeholder="Badge"
                  className="px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                />
                <select
                  value={newModColor}
                  onChange={(e) => setNewModColor(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                >
                  {SCPSL_BADGE_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                Ajouter au Staff RemoteAdmin
              </button>
            </form>

            <div className="divide-y divide-slate-800/70 text-xs">
              {staffList.map((st) => (
                <div key={st.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {st.username} <span className="text-amber-400 font-mono">[{st.badgeText}]</span>
                    </div>
                    <div className="font-mono text-slate-400">{st.steamId}</div>
                  </div>
                  {st.roleId !== 'owner' && (
                    <button
                      onClick={() => setStaffList((prev) => prev.filter((item) => item.id !== st.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: RAW LOCALADMIN LOGS SYNCED FROM PTERODACTYL CONTAINER */}
      {subView === 'raw-ptero' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                Fichiers de Logs LocalAdmin &amp; LabApi en Direct (`/home/container/.config/SCP Secret Laboratory/LocalAdminLogs/{serverPort}`)
              </h3>
              <p className="text-xs text-slate-400">
                Récupère le dernier fichier `.txt` généré par votre serveur SCP:SL (v14.2.9) sur votre Node LumisHost (`192.99.42.203:{serverPort}`)
              </p>
            </div>

            <button
              onClick={handleSyncLiveLocalAdminLogs}
              disabled={isSyncingRawLogs}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRawLogs ? 'animate-spin' : ''}`} />
              {isSyncingRawLogs ? 'Lecture sur LumisHost...' : 'Synchroniser les Logs depuis LumisHost'}
            </button>
          </div>

          {rawLogSyncStatus && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
              {rawLogSyncStatus}
            </div>
          )}

          <pre className="p-4 rounded-xl bg-[#05070c] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px] space-y-1">
            {rawPteroLines.length > 0
              ? rawPteroLines.join('\n')
              : 'Cliquez sur "Synchroniser les Logs depuis LumisHost" pour afficher les logs LocalAdmin réels de votre serveur.'}
          </pre>
        </div>
      )}
    </div>
  );
};
