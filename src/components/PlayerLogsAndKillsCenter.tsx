import React, { useState } from 'react';
import {
  Crosshair,
  Search,
  RefreshCw,
  Gavel,
  UserCheck,
  Terminal,
  AlertTriangle,
  PlusCircle,
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
}

const INITIAL_LOGS: KillAndPlayerLog[] = [
  {
    id: 'LOG-1012',
    timestamp: '20:24:15',
    category: 'TEAMKILL',
    killerName: 'xX_DarkChaos_Xx',
    killerSteamId: '76561199102938471@steam',
    killerRole: 'Soldat MTF Nine-Tailed Fox',
    killerColor: '#00B7EB',
    victimName: 'Aurelien_92',
    victimSteamId: '76561198223344556@steam',
    victimRole: 'Scientifique Menotté / MTF',
    victimColor: '#FAFF86',
    weapon: 'Grenade Frag HE (Ascenseur)',
    zone: 'Ascenseur Gate B',
    details: 'ALERTE TEAMKILL : xX_DarkChaos_Xx a tué son allié Aurelien_92 avec une Grenade Frag HE dans Ascenseur Gate B.'
  },
  {
    id: 'LOG-1011',
    timestamp: '20:23:48',
    category: 'KILL',
    killerName: 'ShadowSlayer',
    killerSteamId: '76561198112233445@steam',
    killerRole: 'SCP-049 (Docteur de la Peste)',
    killerColor: '#C50000',
    victimName: 'Dr_Vance_FR',
    victimSteamId: '76561198998877665@steam',
    victimRole: 'Scientifique Superviseur',
    victimColor: '#FAFF86',
    weapon: 'Arrêt Cardiaque SCP-049',
    zone: 'Heavy Containment (Salle 049)',
    details: 'ShadowSlayer (SCP-049) a éliminé Dr_Vance_FR (Scientifique) et l’a transformé en SCP-049-2.'
  },
  {
    id: 'LOG-1010',
    timestamp: '20:23:10',
    category: 'KILL',
    killerName: 'Nathaniel Dagenais',
    killerSteamId: '76561198042198311@steam',
    killerRole: 'FIM Alpha-1 "Bras Droit Rouge"',
    killerColor: '#DC143C',
    victimName: 'Noxious_FR',
    victimSteamId: '76561198556677889@steam',
    victimRole: 'SCP-939',
    victimColor: '#C50000',
    weapon: 'Canon Électrique Micro H.I.D.',
    zone: 'Entrance Zone Checkpoint',
    details: 'Nathaniel Dagenais (FIM Alpha-1) a neutralisé Noxious_FR (SCP-939) au Micro H.I.D.'
  },
  {
    id: 'LOG-1009',
    timestamp: '20:22:35',
    category: 'ITEM',
    killerName: 'Luna_SCP',
    killerSteamId: '76561198667788990@steam',
    killerRole: 'Personnel Classe-D',
    killerColor: '#FF9966',
    weapon: 'Carte O5 + SCP-500',
    zone: 'Light Containment (SCP-914)',
    details: 'Luna_SCP (76561198667788990@steam) a amélioré une Carte Scientifique en Carte O5 dans SCP-914 (Réglage : Very Fine).'
  },
  {
    id: 'LOG-1008',
    timestamp: '20:22:02',
    category: 'ADMIN',
    killerName: 'Kaelen_MTF',
    killerSteamId: '76561198334455667@steam',
    killerRole: 'MODÉRATEUR',
    killerColor: '#00B7EB',
    zone: 'RemoteAdmin Panel',
    details: 'Kaelen_MTF a utilisé RemoteAdmin : Observation / Overwatch activé pour vérifier un signalement de Teamkill.'
  },
  {
    id: 'LOG-1007',
    timestamp: '20:21:54',
    category: 'CONNECT',
    killerName: 'ShadowSlayer',
    killerSteamId: '76561198112233445@steam',
    killerRole: '★ VIP KETER ★',
    killerColor: '#DC143C',
    zone: 'play.lumishost.com:1031',
    details: 'Connexion joueur : ShadowSlayer (76561198112233445@steam) a rejoint le serveur via play.lumishost.com:1031.'
  }
];

const INITIAL_PROFILES: PlayerProfileSummary[] = [
  // ONLINE PLAYERS
  {
    steamId: '76561198042198311@steam',
    username: 'Nathaniel Dagenais',
    discordHandle: 'nathaniel_dagenais',
    isOnline: true,
    currentRole: 'FIM Alpha-1 "Bras Droit Rouge"',
    roleColor: '#DC143C',
    kills: 142,
    deaths: 18,
    teamkills: 0,
    playtimeHours: 128.5,
    firstJoined: '12 Oct 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: 'FONDATEUR O5'
  },
  {
    steamId: '76561199102938471@steam',
    username: 'xX_DarkChaos_Xx',
    discordHandle: 'darkchaos_99',
    isOnline: true,
    currentRole: 'Soldat MTF Nine-Tailed Fox',
    roleColor: '#00B7EB',
    kills: 14,
    deaths: 19,
    teamkills: 3,
    playtimeHours: 11.5,
    firstJoined: '15 Nov 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: 'Aucun grade'
  },
  {
    steamId: '76561198112233445@steam',
    username: 'ShadowSlayer',
    discordHandle: 'shadowslayer_qc',
    isOnline: true,
    currentRole: 'SCP-049 (Docteur de la Peste)',
    roleColor: '#C50000',
    kills: 87,
    deaths: 31,
    teamkills: 0,
    playtimeHours: 64.2,
    firstJoined: '20 Oct 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: '★ VIP KETER ★'
  },
  {
    steamId: '76561198667788990@steam',
    username: 'Luna_SCP',
    discordHandle: 'luna.scp',
    isOnline: true,
    currentRole: 'La Main du Serpent',
    roleColor: '#FF0090',
    kills: 52,
    deaths: 28,
    teamkills: 0,
    playtimeHours: 48.0,
    firstJoined: '25 Oct 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: '♦ NITRO BOOSTER'
  },
  {
    steamId: '76561198223344556@steam',
    username: 'Aurelien_92',
    discordHandle: 'aurelien92',
    isOnline: true,
    currentRole: 'Personnel Classe-D',
    roleColor: '#FF9966',
    kills: 29,
    deaths: 34,
    teamkills: 1,
    playtimeHours: 27.4,
    firstJoined: '02 Nov 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: '⚡ VIP EUCLIDE'
  },
  {
    steamId: '76561198998877665@steam',
    username: 'Dr_Vance_FR',
    discordHandle: 'drvance_fr',
    isOnline: true,
    currentRole: 'Scientifique Superviseur',
    roleColor: '#FAFF86',
    kills: 18,
    deaths: 22,
    teamkills: 0,
    playtimeHours: 19.8,
    firstJoined: '08 Nov 2026',
    lastSeen: 'En ligne sur play.lumishost.com:1031',
    vipOrStaffTag: 'Joueur Vérifié'
  },
  // OFFLINE PLAYERS (HISTORICAL DATABASE)
  {
    steamId: '76561198776655443@steam',
    username: 'ShyGuy_Enjoyer',
    discordHandle: 'shyguy_toxic',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : SCP-079)',
    roleColor: '#64748B',
    kills: 41,
    deaths: 39,
    teamkills: 5,
    playtimeHours: 32.1,
    firstJoined: '19 Oct 2026',
    lastSeen: 'Hors-ligne · Vu le 17 Nov 2026 à 22:18',
    vipOrStaffTag: 'BANNI (30j)'
  },
  {
    steamId: '76561199001122334@steam',
    username: 'D-Boy_Speedrun',
    discordHandle: 'dboy_speed',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : Classe-D)',
    roleColor: '#64748B',
    kills: 23,
    deaths: 58,
    teamkills: 1,
    playtimeHours: 21.0,
    firstJoined: '01 Nov 2026',
    lastSeen: 'Hors-ligne · Vu aujourd’hui à 09:55',
    vipOrStaffTag: '1 Avertissement'
  },
  {
    steamId: '76561198445566778@steam',
    username: 'Ghost_Recon99',
    discordHandle: 'ghost_recon99',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : Sergent MTF)',
    roleColor: '#64748B',
    kills: 64,
    deaths: 45,
    teamkills: 0,
    playtimeHours: 53.7,
    firstJoined: '14 Oct 2026',
    lastSeen: 'Hors-ligne · Vu hier à 19:04',
    vipOrStaffTag: 'Joueur Régulier'
  },
  {
    steamId: '76561198192837465@steam',
    username: 'Valkyrie',
    discordHandle: 'valkyrie_scp',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : FIM Alpha-1)',
    roleColor: '#64748B',
    kills: 112,
    deaths: 40,
    teamkills: 0,
    playtimeHours: 94.6,
    firstJoined: '12 Oct 2026',
    lastSeen: 'Hors-ligne · Vu hier à 23:45',
    vipOrStaffTag: 'ADMIN SITE-19'
  },
  {
    steamId: '76561198987654321@steam',
    username: 'Dr_Bright_FR',
    discordHandle: 'bright_helper',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : Scientifique)',
    roleColor: '#64748B',
    kills: 37,
    deaths: 33,
    teamkills: 0,
    playtimeHours: 41.2,
    firstJoined: '05 Nov 2026',
    lastSeen: 'Hors-ligne · Vu aujourd’hui à 11:10',
    vipOrStaffTag: 'HELPEUR'
  },
  {
    steamId: '76561198554433221@steam',
    username: 'Keter_King_QC',
    discordHandle: 'keterking_qc',
    isOnline: false,
    currentRole: 'Hors-Ligne (Dernier rôle : SCP-106)',
    roleColor: '#64748B',
    kills: 76,
    deaths: 29,
    teamkills: 0,
    playtimeHours: 59.4,
    firstJoined: '22 Oct 2026',
    lastSeen: 'Hors-ligne · Vu le 16 Nov 2026 à 18:20',
    vipOrStaffTag: '★ VIP KETER ★'
  }
];

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
  onExecutePteroCommand
}) => {
  const [subView, setSubView] = useState<
    'player-profiles' | 'killfeed' | 'all-logs' | 'bans-staff' | 'raw-ptero'
  >('player-profiles');
  const [logs, setLogs] = useState<KillAndPlayerLog[]>(INITIAL_LOGS);
  const [profiles, setProfiles] = useState<PlayerProfileSummary[]>(INITIAL_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<PlayerProfileSummary>(INITIAL_PROFILES[6]); // Default to an offline profile or first profile

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
    'Teamkill répété / Déconnexion pour éviter une sanction (Offline Ban)'
  );

  // Add Staff Member Form (inside Bans & Staff tab)
  const [newModName, setNewModName] = useState('');
  const [newModSteam, setNewModSteam] = useState('');
  const [newModDiscord, setNewModDiscord] = useState('');
  const [newModRole, setNewModRole] = useState<'admin' | 'moderator' | 'helper'>('moderator');
  const [newModBadge, setNewModBadge] = useState('MODÉRATEUR');
  const [newModColor, setNewModColor] = useState('cyan');

  // Pterodactyl Raw LocalAdmin Logs state
  const [rawPteroLines, setRawPteroLines] = useState<string[]>([
    '[2026-11-18 20:21:22.586 +00:00] SCP: Secret Laboratory - LocalAdmin v. 2.5.16',
    '[2026-11-18 20:21:22.590 +00:00] Started new session on port 1031.',
    '[2026-11-18 20:21:26.587 +00:00] [INFO] [LabApi] [LOADER] Loading all dependencies',
    '[2026-11-18 20:21:26.608 +00:00] [INFO] [LabApi] [LOADER] Enabling all plugins',
    '[2026-11-18 20:21:28.409 +00:00] Game version: 14.2.9',
    '[2026-11-18 20:21:28.560 +00:00] Config files loaded from /home/container/.config/SCP Secret Laboratory/config/1031/',
    '[2026-11-18 20:21:28.884 +00:00] Done, your server IP address is 192.99.42.203',
    '[2026-11-18 20:21:49.125 +00:00] Scene Manager: Loaded scene Facility [Assets/_Scenes/Facility.unity]',
    '[2026-11-18 20:21:49.214 +00:00] Waiting for players...'
  ]);
  const [isSyncingRawLogs, setIsSyncingRawLogs] = useState(false);
  const [rawLogSyncStatus, setRawLogSyncStatus] = useState<string | null>(null);

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
      firstJoined: '18 Nov 2026',
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
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newRecord: SanctionRecord = {
      id: `SAN-${905 + sanctions.length}`,
      targetName,
      targetSteamId,
      type,
      reason,
      duration: type === 'BAN' ? duration : type === 'KICK' ? 'Instantané' : 'Avertissement',
      moderator: 'Nathaniel Dagenais (Panel Web)',
      source: 'Panel Pterodactyl',
      timestamp: `18 Nov 2026 · ${nowTime}`,
      active: type !== 'KICK'
    };

    setSanctions((prev) => [newRecord, ...prev]);

    const newLog: KillAndPlayerLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category: 'SANCTION',
      killerName: 'Nathaniel Dagenais [Staff]',
      victimName: targetName,
      victimSteamId: targetSteamId,
      weapon: `${isOfflineBan ? 'OFFLINE BAN (oban)' : type} (${newRecord.duration})`,
      zone: 'Panel Modération scpsl.lumishost.com',
      details: `[SANCTION ${isOfflineBan ? 'OFFLINE BAN' : type}] ${targetName} (${targetSteamId}) sanctionné pour : "${reason}" (${newRecord.duration}).`
    };
    setLogs((prev) => [newLog, ...prev]);

    const pteroCmd =
      type === 'BAN'
        ? isOfflineBan
          ? `oban ${targetSteamId} "${duration}" "${reason}"`
          : `ban ${targetSteamId} "${duration}" "${reason}"`
        : type === 'KICK'
        ? `kick ${targetSteamId} "${reason}"`
        : `bc 8 <color=#FAFF86><b>[WARN STAFF]</b></color> ${targetName} : ${reason}`;

    onExecutePteroCommand(pteroCmd, isOfflineBan ? 'OFFLINE BAN (OBAN)' : `MODÉRATION ${type}`);
  };

  const handleSimulateNewCombatLog = (isTeamkill: boolean) => {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const created: KillAndPlayerLog = isTeamkill
      ? {
          id: `LOG-${Date.now()}`,
          timestamp: now,
          category: 'TEAMKILL',
          killerName: 'xX_DarkChaos_Xx',
          killerSteamId: '76561199102938471@steam',
          killerRole: 'Garde du Complexe',
          killerColor: '#A0A0A0',
          victimName: 'Dr_Vance_FR',
          victimSteamId: '76561198998877665@steam',
          victimRole: 'Scientifique',
          victimColor: '#FAFF86',
          weapon: 'PM FSP-9 (Tir Allié)',
          zone: 'Entrance Zone Checkpoint',
          details: 'ALERTE TEAMKILL : xX_DarkChaos_Xx (Garde) a abattu Dr_Vance_FR (Scientifique désarmé).'
        }
      : {
          id: `LOG-${Date.now()}`,
          timestamp: now,
          category: 'KILL',
          killerName: 'Luna_SCP',
          killerSteamId: '76561198667788990@steam',
          killerRole: 'La Main du Serpent',
          killerColor: '#FF0090',
          victimName: 'Aurelien_92',
          victimSteamId: '76561198223344556@steam',
          victimRole: 'Lieut. MTF Nine-Tailed Fox',
          victimColor: '#00B7EB',
          weapon: 'Fusil MTF E-11 SR',
          zone: 'Surface Gate A',
          details: 'Luna_SCP (La Main du Serpent) a éliminé Aurelien_92 (Lieut. MTF) à Surface Gate A.'
        };

    setLogs((prev) => [created, ...prev]);
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.steamId === created.killerSteamId) {
          return {
            ...p,
            kills: p.kills + 1,
            teamkills: isTeamkill ? p.teamkills + 1 : p.teamkills
          };
        }
        if (p.steamId === created.victimSteamId) {
          return { ...p, deaths: p.deaths + 1 };
        }
        return p;
      })
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
      } else if (Array.isArray(data.lines) && data.lines.length > 0) {
        setRawPteroLines(data.lines);
        setRawLogSyncStatus(`Fichier ${data.fileName} synchronisé depuis /home/container/.config/SCP Secret Laboratory/LocalAdminLogs/${serverPort}/`);
      } else {
        setRawLogSyncStatus(data.message || 'Logs lus avec succès.');
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
    const formattedSteam = newModSteam.includes('@') ? newModSteam.trim() : `${newModSteam.trim()}@steam`;
    const created: StaffMember = {
      id: `st-${Date.now()}`,
      username: newModName.trim(),
      steamId: formattedSteam,
      discordTag: newModDiscord.trim() || newModName.trim().toLowerCase(),
      discordId: '749201938475610293',
      roleId: newModRole,
      badgeText: newModBadge.trim() || 'MODÉRATEUR',
      badgeColor: newModColor,
      permissions:
        newModRole === 'admin'
          ? ['KickingAndShortTermBanning', 'BanningUpToDay', 'LongTermBanning', 'ForceclassSelf', 'EventsMode', 'Broadcasting']
          : ['KickingAndShortTermBanning', 'BanningUpToDay', 'Broadcasting'],
      addedAt: '2026-11-18'
    };
    setStaffList((prev) => [...prev, created]);
    onExecutePteroCommand(`setgroup ${formattedSteam} ${newModRole}`, 'REMOTEADMIN');
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
                {filteredProfiles.map((prof) => {
                  const isSelected = prof.steamId === selectedProfile.steamId;
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
                })}
              </div>
            </div>

            {/* Right: Full 360° Dossier (Online OR Offline Player) */}
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
                      onExecutePteroCommand(`unban ${selectedProfile.steamId}`, 'REMOTEADMIN')
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
                onClick={() => handleSimulateNewCombatLog(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                Simuler un Kill
              </button>
              <button
                onClick={() => handleSimulateNewCombatLog(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Simuler un Teamkill (TK)
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
                {killLogsOnly.map((k) => {
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
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleQuickSanctionFromKill(
                                k.killerName || 'Joueur',
                                k.killerSteamId || '76561198000000000@steam',
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
                                k.killerSteamId || '76561198000000000@steam',
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
                                k.killerSteamId || '76561198000000000@steam',
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
                      </td>
                    </tr>
                  );
                })}
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
            {filteredLogs.map((entry) => (
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
            ))}
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
                              onExecutePteroCommand(`unban ${s.targetSteamId}`, 'REMOTEADMIN');
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
            {rawPteroLines.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};
