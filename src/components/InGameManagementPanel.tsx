import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  CustomTeam,
  SCPSL_ITEMS,
  STAFF_ITEM_PACKS,
  SanctionRecord,
  StaffMember,
  VipTier,
  WebPanelRolePermissionMatrix
} from '../data/scpslDefaults';
import { Site19GameInterface } from './Site19GameInterface';

export interface ActiveInGamePlayer {
  id: number;
  name: string;
  steamId: string;
  role: string;
  faction: 'SCP' | 'MTF' | 'CHAOS' | 'CLASSD' | 'SCIENTIST' | 'CUSTOM' | 'STAFF';
  roleColor: string;
  hp: number;
  maxHp: number;
  ahp: number;
  zone: 'Light Containment' | 'Heavy Containment' | 'Entrance Zone' | 'Surface Zone' | 'Pocket Dimension';
  badgeText: string;
  badgeHex: string;
  ping: number;
  godMode: boolean;
  noclip: boolean;
  bypassMode: boolean;
  voiceMuted: boolean;
  intercomMuted: boolean;
  inventory: string[];
}

interface InGameManagementPanelProps {
  serverState: 'running' | 'restarting' | 'offline';
  serverPort: string;
  pteroUrl: string;
  pteroApiKey: string;
  pteroServerId: string;
  customTeams: CustomTeam[];
  vipTiers: VipTier[];
  staffList: StaffMember[];
  sanctions: SanctionRecord[];
  setSanctions: React.Dispatch<React.SetStateAction<SanctionRecord[]>>;
  activeRolePermissions?: WebPanelRolePermissionMatrix;
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
  onExecuteSanction: (params: {
    type: 'BAN' | 'KICK' | 'WARN' | 'MUTE' | 'UNBAN';
    targetName: string;
    targetSteamId: string;
    playerId?: number | string;
    duration?: string;
    reason: string;
  }) => Promise<void> | void;
  onPowerAction: (signal: 'start' | 'restart' | 'stop') => void;
}

const INITIAL_INGAME_PLAYERS: ActiveInGamePlayer[] = [];

const VANILLA_ROLES = [
  { id: 'Scp173', label: 'SCP-173 (La Sculpture)', faction: 'SCP' as const, color: '#C50000', hp: 4000 },
  { id: 'Scp049', label: 'SCP-049 (Docteur de la Peste)', faction: 'SCP' as const, color: '#C50000', hp: 2200 },
  { id: 'Scp096', label: 'SCP-096 (L’Homme Timide)', faction: 'SCP' as const, color: '#C50000', hp: 2500 },
  { id: 'Scp106', label: 'SCP-106 (Le Vieil Homme)', faction: 'SCP' as const, color: '#C50000', hp: 2300 },
  { id: 'Scp939', label: 'SCP-939 (Aux Mille Voix)', faction: 'SCP' as const, color: '#C50000', hp: 2700 },
  { id: 'Scp079', label: 'SCP-079 (Vieille IA)', faction: 'SCP' as const, color: '#C50000', hp: 100 },
  { id: 'NtfCaptain', label: 'Capitaine MTF Nine-Tailed Fox', faction: 'MTF' as const, color: '#00B7EB', hp: 120 },
  { id: 'NtfSergeant', label: 'Sergent MTF Nine-Tailed Fox', faction: 'MTF' as const, color: '#00B7EB', hp: 110 },
  { id: 'FacilityGuard', label: 'Garde du Complexe Site-19', faction: 'MTF' as const, color: '#A0A0A0', hp: 100 },
  { id: 'ChaosMarauder', label: 'Maraudeur Insurrection du Chaos', faction: 'CHAOS' as const, color: '#228B22', hp: 115 },
  { id: 'ChaosRepressor', label: 'Répresseur Insurrection du Chaos', faction: 'CHAOS' as const, color: '#228B22', hp: 125 },
  { id: 'ClassD', label: 'Personnel Classe-D', faction: 'CLASSD' as const, color: '#FF9966', hp: 100 },
  { id: 'Scientist', label: 'Scientifique de la Fondation', faction: 'SCIENTIST' as const, color: '#FAFF86', hp: 100 },
  { id: 'Tutorial', label: 'Mode Staff / Tutoriel (Tour)', faction: 'STAFF' as const, color: '#FF1493', hp: 100 },
  { id: 'Spectator', label: 'Spectateur', faction: 'STAFF' as const, color: '#727472', hp: 0 }
];

const TELEPORT_LOCATIONS = [
  { id: 'Surface_GateA', label: 'Surface — Porte A (Tour Staff)', zone: 'Surface Zone' as const },
  { id: 'Surface_GateB', label: 'Surface — Porte B (Héliport MTF)', zone: 'Surface Zone' as const },
  { id: 'LCZ_914', label: 'Light Containment — Salle SCP-914', zone: 'Light Containment' as const },
  { id: 'LCZ_Armory', label: 'Light Containment — Armurerie', zone: 'Light Containment' as const },
  { id: 'HCZ_Warhead', label: 'Heavy Containment — Silo Ogive Alpha', zone: 'Heavy Containment' as const },
  { id: 'HCZ_MicroHID', label: 'Heavy Containment — Armurerie Micro H.I.D.', zone: 'Heavy Containment' as const },
  { id: 'EZ_Intercom', label: 'Entrance Zone — Salle Intercom', zone: 'Entrance Zone' as const }
];

export const InGameManagementPanel: React.FC<InGameManagementPanelProps> = ({
  serverState,
  serverPort,
  pteroUrl,
  pteroApiKey,
  pteroServerId,
  customTeams,
  staffList,
  activeRolePermissions,
  onExecutePteroCommand,
  onExecuteSanction
}) => {
  const canUseHeavyActions = activeRolePermissions
    ? activeRolePermissions.canUseHeavyInGameActions
    : true;
  const canBanPlayers = activeRolePermissions ? activeRolePermissions.canBanPlayers : true;

  const [players, setPlayers] = useState<ActiveInGamePlayer[]>(INITIAL_INGAME_PLAYERS);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
  const [manualTargetSteamId, setManualTargetSteamId] = useState('');
  const [factionFilter, setFactionFilter] = useState<'ALL' | ActiveInGamePlayer['faction']>('ALL');
  const [isRefreshingPlayers, setIsRefreshingPlayers] = useState(false);

  const inferFactionFromRole = (roleName: string): { faction: ActiveInGamePlayer['faction']; color: string } => {
    const r = roleName.toLowerCase();
    if (r.includes('scp')) return { faction: 'SCP', color: '#F43F5E' };
    if (r.includes('ntf') || r.includes('mtf') || r.includes('guard')) return { faction: 'MTF', color: '#38BDF8' };
    if (r.includes('chaos')) return { faction: 'CHAOS', color: '#22C55E' };
    if (r.includes('classd') || r.includes('class-d')) return { faction: 'CLASSD', color: '#FB923C' };
    if (r.includes('scient')) return { faction: 'SCIENTIST', color: '#FACC15' };
    if (r.includes('tutorial')) return { faction: 'STAFF', color: '#EC4899' };
    return { faction: 'STAFF', color: '#38BDF8' };
  };

  const syncRealPlayersFromServer = async (triggerList = true) => {
    setIsRefreshingPlayers(true);
    try {
      const resp = await fetch('/api/ptero/players/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelUrl: pteroUrl,
          apiKey: pteroApiKey,
          serverId: pteroServerId,
          port: serverPort,
          triggerList
        })
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const online = Array.isArray(data.onlinePlayers) ? data.onlinePlayers : [];

      const mapped: ActiveInGamePlayer[] = online.map(
        (p: { id: number; name: string; steamId: string; role?: string }) => {
          const staffEntry = staffList.find(
            (s) => s.steamId.toLowerCase() === String(p.steamId || '').toLowerCase()
          );
          const roleStr = p.role || 'Connecté';
          const { faction, color } = inferFactionFromRole(roleStr);
          return {
            id: Number(p.id) || 1,
            name: p.name || p.steamId,
            steamId: p.steamId,
            role: roleStr,
            faction,
            roleColor: color,
            hp: 100,
            maxHp: 100,
            ahp: 0,
            zone: 'Surface Zone',
            badgeText: staffEntry ? staffEntry.badgeText : 'JOUEUR RÉEL',
            badgeHex: staffEntry ? '#F59E0B' : '#38BDF8',
            ping: 24,
            godMode: false,
            noclip: false,
            bypassMode: false,
            voiceMuted: false,
            intercomMuted: false,
            inventory: []
          };
        }
      );

      setPlayers((prev) =>
        mapped.map((fresh) => {
          const old = prev.find((o) => o.steamId === fresh.steamId);
          return old
            ? {
                ...fresh,
                godMode: old.godMode,
                noclip: old.noclip,
                bypassMode: old.bypassMode,
                voiceMuted: old.voiceMuted,
                intercomMuted: old.intercomMuted,
                inventory: old.inventory.length ? old.inventory : fresh.inventory,
                zone: old.zone
              }
            : fresh;
        })
      );

      if (mapped.length > 0 && !mapped.some((p) => p.id === selectedPlayerId)) {
        setSelectedPlayerId(mapped[0].id);
      }
    } catch {
      // ignore fetch error
    } finally {
      setIsRefreshingPlayers(false);
    }
  };

  useEffect(() => {
    syncRealPlayersFromServer(true);
    const timer = window.setInterval(() => {
      syncRealPlayersFromServer(false);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [pteroServerId, serverPort]);

  // Facility live state
  const [warheadState, setWarheadState] = useState<'STANDBY' | 'COUNTDOWN' | 'LOCKED' | 'DETONATED'>('STANDBY');
  const [doorsLocked, setDoorsLocked] = useState(false);
  const [blackoutActive, setBlackoutActive] = useState(false);
  const [roundLocked, setRoundLocked] = useState(false);

  // Selected Player Controls state
  const [chosenRoleId, setChosenRoleId] = useState('NtfCaptain');
  const [chosenCustomTeamKey, setChosenCustomTeamKey] = useState(customTeams[0]?.roleKey || 'serpents_hand');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<
    'ALL' | 'STAFF' | 'Keycard' | 'Weapon' | 'Special' | 'Medical' | 'Armor'
  >('ALL');
  const [chosenItemId, setChosenItemId] = useState('KeycardO5');
  const [chosenTeleportId, setChosenTeleportId] = useState('Surface_GateA');
  const [customHpInput, setCustomHpInput] = useState(100);

  // Quick Sanction / Broadcast state
  const [quickSanctionReason, setQuickSanctionReason] = useState('Non-respect des règles du serveur / Teamkill');
  const [quickBanDuration, setQuickBanDuration] = useState('24 heures');
  const [privateHintText, setPrivateHintText] = useState('Attention : Vous êtes observé par un Modérateur.');
  const [globalBcText, setGlobalBcText] = useState(
    '<color=#DC143C><b>[ANNONCE STAFF]</b></color> Bon jeu sur play.lumishost.com:1031 !'
  );
  const [lastBroadcastBanner, setLastBroadcastBanner] = useState(
    'Aucun broadcast actif sur play.lumishost.com:1031'
  );
  const [lastCassieSubtitle, setLastCassieSubtitle] = useState(
    'Systèmes du Site-19 en veille — En attente d’événements.'
  );

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || players[0] || null;

  const updatePlayer = (id: number, updater: (p: ActiveInGamePlayer) => ActiveInGamePlayer) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  };

  // 1. Forceclass Vanilla Role (uses numeric PlayerID + '/' prefix for SCP:SL LocalAdmin)
  const handleForceVanillaRole = () => {
    if (!canUseHeavyActions) return;
    const roleObj = VANILLA_ROLES.find((r) => r.id === chosenRoleId);
    if (!roleObj || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({
      ...p,
      role: roleObj.label,
      faction: roleObj.faction,
      roleColor: roleObj.color,
      hp: roleObj.hp,
      maxHp: roleObj.hp
    }));
    onExecutePteroCommand(
      `/forceclass ${selectedPlayer.id} ${roleObj.id}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  // 2. Forceclass Custom Team
  const handleForceCustomTeam = () => {
    if (!canUseHeavyActions) return;
    const team = customTeams.find((t) => t.roleKey === chosenCustomTeamKey);
    if (!team || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({
      ...p,
      role: `${team.name} (Custom)`,
      faction: 'CUSTOM',
      roleColor: '#FF0090',
      hp: team.hp,
      maxHp: team.hp,
      inventory: [...team.inventory]
    }));
    onExecutePteroCommand(
      `/customteam spawnplayer ${selectedPlayer.id} ${team.roleKey}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  // 3. Give Item to Player
  const handleGiveItem = () => {
    if (!canUseHeavyActions || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({
      ...p,
      inventory: p.inventory.length < 8 ? [...p.inventory, chosenItemId] : p.inventory
    }));
    onExecutePteroCommand(
      `/give ${selectedPlayer.id} ${chosenItemId}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  const handleClearInventory = () => {
    if (!canUseHeavyActions || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({ ...p, inventory: [] }));
    onExecutePteroCommand(`/clear ${selectedPlayer.id}`, 'REMOTEADMIN IN-GAME');
  };

  const handleGiveStaffPack = (items: string[], packLabel: string) => {
    if (!canUseHeavyActions || !selectedPlayer || items.length === 0) return;
    const sliced = items.slice(0, 8);
    updatePlayer(selectedPlayer.id, (p) => ({
      ...p,
      inventory: sliced
    }));
    const cmdBatch = [
      `/clear ${selectedPlayer.id}`,
      ...sliced.map((it) => `/give ${selectedPlayer.id} ${it}`)
    ].join('\n');
    onExecutePteroCommand(cmdBatch, `KIT STAFF (${packLabel})`);
  };

  // 4. Player Toggles (Godmode, Noclip, Bypass, Heal, Set HP, Teleport, Mute)
  const handleTogglePlayerFlag = (
    flag: 'godMode' | 'noclip' | 'bypassMode' | 'voiceMuted' | 'intercomMuted',
    cmdName: string
  ) => {
    if (!selectedPlayer) return;
    if (flag !== 'voiceMuted' && flag !== 'intercomMuted' && !canUseHeavyActions) return;
    const nextVal = !selectedPlayer[flag];
    updatePlayer(selectedPlayer.id, (p) => ({ ...p, [flag]: nextVal }));

    if (flag === 'voiceMuted') {
      onExecutePteroCommand(
        nextVal ? `/mute ${selectedPlayer.id}` : `/unmute ${selectedPlayer.id}`,
        'REMOTEADMIN IN-GAME'
      );
      return;
    }
    if (flag === 'intercomMuted') {
      onExecutePteroCommand(
        nextVal ? `/imute ${selectedPlayer.id}` : `/iunmute ${selectedPlayer.id}`,
        'REMOTEADMIN IN-GAME'
      );
      return;
    }
    onExecutePteroCommand(
      `/${cmdName} ${selectedPlayer.id} ${nextVal ? '1' : '0'}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  const handleSetCustomHp = () => {
    if (!canUseHeavyActions || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({
      ...p,
      hp: customHpInput,
      maxHp: Math.max(p.maxHp, customHpInput)
    }));
    onExecutePteroCommand(
      `/hp ${selectedPlayer.id} ${customHpInput}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  const handleTeleportPlayer = () => {
    if (!canUseHeavyActions || !selectedPlayer) return;
    const loc = TELEPORT_LOCATIONS.find((l) => l.id === chosenTeleportId);
    if (!loc) return;
    updatePlayer(selectedPlayer.id, (p) => ({ ...p, zone: loc.zone }));
    onExecutePteroCommand(
      `/goto ${selectedPlayer.id} ${loc.id}`,
      'REMOTEADMIN IN-GAME'
    );
  };

  const handleQuickZoneTeleport = (zone: ActiveInGamePlayer['zone'], cmdId: string) => {
    if (!canUseHeavyActions || !selectedPlayer) return;
    updatePlayer(selectedPlayer.id, (p) => ({ ...p, zone }));
    onExecutePteroCommand(`/goto ${selectedPlayer.id} ${cmdId}`, 'RADAR SITE-19');
  };

  // 5. Direct In-Game Sanctions via /api/ptero/sanction (/ban + /oban + /kick + /pbc + MySQL)
  const handleInGameSanction = (type: 'WARN' | 'KICK' | 'BAN') => {
    if (!selectedPlayer) return;
    if (type === 'BAN' && !canBanPlayers) return;

    onExecuteSanction({
      type,
      targetName: selectedPlayer.name,
      targetSteamId: selectedPlayer.steamId,
      playerId: selectedPlayer.id,
      duration: type === 'BAN' ? quickBanDuration : undefined,
      reason: quickSanctionReason
    });

    if (type === 'BAN' || type === 'KICK') {
      setPlayers((prev) => prev.filter((p) => p.id !== selectedPlayer.id));
      if (players.length > 1) {
        const remaining = players.filter((p) => p.id !== selectedPlayer.id);
        setSelectedPlayerId(remaining[0].id);
      }
    } else {
      setLastBroadcastBanner(`[AVERTISSEMENT -> ${selectedPlayer.name}] ${quickSanctionReason}`);
    }
  };

  const filteredPlayers = players.filter(
    (p) => factionFilter === 'ALL' || p.faction === factionFilter
  );

  return (
    <div className="space-y-6">
      {/* Live Facility & Round Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">État du Serveur</div>
          <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
            {serverState === 'running' ? 'EN LIGNE' : serverState.toUpperCase()}
          </div>
          <div className="text-xs font-mono text-emerald-400">
            {roundLocked ? 'RoundLock Actif' : '60 TPS · SCP:SL 14.2.9'}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">Entités SCP en Vie</div>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-0.5">
            {players.filter((p) => p.faction === 'SCP').length} SCPs
          </div>
          <div className="text-xs text-slate-400 truncate">Télémétrie en direct</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">Forces Fondation (MTF)</div>
          <div className="text-lg font-bold font-mono tabular-nums text-cyan-400 mt-0.5">
            {players.filter((p) => p.faction === 'MTF' || p.faction === 'SCIENTIST').length} Agents
          </div>
          <div className="text-xs text-slate-400">Vagues MTF automatiques</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">Chaos &amp; Teams Customs</div>
          <div className="text-lg font-bold font-mono tabular-nums text-purple-400 mt-0.5">
            {players.filter((p) => p.faction === 'CHAOS' || p.faction === 'CUSTOM').length} Unités
          </div>
          <div className="text-xs text-slate-400">{customTeams.length} équipes configurées</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">Ogive Alpha Warhead</div>
          <div
            className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
              warheadState === 'COUNTDOWN'
                ? 'text-rose-400'
                : warheadState === 'LOCKED'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {warheadState}
          </div>
          <div className="text-xs text-slate-400">Contrôle à distance</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900">
          <div className="text-xs text-slate-400">Systèmes Complexe</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {doorsLocked ? 'LOCKDOWN PORTES' : blackoutActive ? 'BLACKOUT ACTIF' : 'NOMINAL'}
          </div>
          <div className="text-xs font-mono text-slate-400">
            play.lumishost.com:{serverPort}
          </div>
        </div>
      </div>

      {/* RBAC Restriction Banner when Moderator / Helper has limited permissions */}
      {(!canUseHeavyActions || !canBanPlayers) && (
        <div className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Mode RBAC Actif (<strong>{activeRolePermissions?.label}</strong>) :{' '}
              {!canUseHeavyActions && 'Actions lourdes (Forceclass, Give, Warhead, Lockdown) verrouillées. '}
              {!canBanPlayers && 'Bannissement direct désactivé.'}
            </span>
          </div>
          <span className="font-mono text-amber-300">Warn / Mute / Inspection autorisés</span>
        </div>
      )}

      {/* Live In-Game Interface: Spectator HUD + Interactive Site-19 Radar Map */}
      <Site19GameInterface
        players={players}
        selectedPlayer={selectedPlayer}
        onSelectPlayer={(pl) => {
          setSelectedPlayerId(pl.id);
          setCustomHpInput(pl.hp);
        }}
        warheadState={warheadState}
        doorsLocked={doorsLocked}
        blackoutActive={blackoutActive}
        roundLocked={roundLocked}
        serverPort={serverPort}
        lastBroadcastBanner={lastBroadcastBanner}
        lastCassieSubtitle={lastCassieSubtitle}
        canUseHeavyActions={canUseHeavyActions}
        onQuickZoneTeleport={handleQuickZoneTeleport}
        onQuickFacilityCommand={(cmd, origin) => {
          onExecutePteroCommand(cmd, origin);
          if (origin === 'SITE-19 TESLA GATES') {
            setLastCassieSubtitle(
              cmd.includes('disable')
                ? 'Portes Tesla désactivées par le commandement.'
                : 'Système de défense Tesla réactivé dans Heavy Containment.'
            );
          } else if (origin === 'SITE-19 GENERATORS') {
            setLastCassieSubtitle('Mise à jour de l’alimentation des générateurs HCZ.');
          }
        }}
        onQuickHealSelected={() => {
          if (!canUseHeavyActions || !selectedPlayer) return;
          updatePlayer(selectedPlayer.id, (p) => ({ ...p, hp: p.maxHp }));
          onExecutePteroCommand(`/heal ${selectedPlayer.id}`, 'HUD IN-GAME');
        }}
      />

      {/* Main 2-Column Split: Left = Live Players List (RemoteAdmin Table), Right = Selected Player In-Game Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Live In-Game Players List */}
        <div className="lg:col-span-6 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-amber-400">
                REMOTEADMIN WEB · GESTION JOUEURS EN DIRECT
              </div>
              <h2 className="text-base font-bold text-white">
                Joueurs en Manche ({players.length} / 32)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isRefreshingPlayers}
                onClick={() => syncRealPlayersFromServer(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingPlayers ? 'animate-spin' : ''}`} />
                {isRefreshingPlayers ? 'Lecture list...' : 'Rafraîchir (list)'}
              </button>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                {(['ALL', 'SCP', 'MTF', 'CUSTOM', 'CHAOS', 'CLASSD'] as const).map((fac) => (
                  <button
                    key={fac}
                    onClick={() => setFactionFilter(fac)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      factionFilter === fac
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fac === 'ALL' ? 'Tous' : fac}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredPlayers.length === 0 ? (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-950 text-center space-y-2">
                <div className="text-sm font-semibold text-slate-300">
                  Aucun joueur réel connecté actuellement
                </div>
                <p className="text-xs text-slate-500">
                  Dès qu’un vrai joueur rejoint <span className="font-mono text-cyan-400">play.lumishost.com:{serverPort}</span> ou qu’un événement télémétrie arrive, il apparaîtra ici automatiquement.
                </p>
              </div>
            ) : (
              filteredPlayers.map((p) => {
                const isSelected = p.id === selectedPlayer?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setCustomHpInput(p.hp);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{p.id}</span>
                        <span className="text-sm font-bold text-white truncate">{p.name}</span>
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: p.badgeHex }}
                        >
                          [{p.badgeText}]
                        </span>
                      </div>
                      <div className="text-xs font-semibold truncate" style={{ color: p.roleColor }}>
                        {p.role}
                      </div>
                      <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <span>{p.zone}</span>
                        <span>·</span>
                        <span>{p.ping} ms</span>
                        {p.godMode && <span className="text-amber-400 font-bold">· GOD</span>}
                        {p.noclip && <span className="text-cyan-400 font-bold">· NOCLIP</span>}
                        {p.voiceMuted && <span className="text-rose-400 font-bold">· MUTE</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="text-xs font-mono tabular-nums font-bold text-emerald-400">
                        {p.hp} / {p.maxHp} HP
                      </div>
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, Math.round((p.hp / Math.max(1, p.maxHp)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        {p.inventory.length}/8 items
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Global Wave Spawner Strip */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Déploiement Immédiat de Vagues de Renforts (Respawn Waves) :
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  setLastCassieSubtitle('Unité Mobile Task Force Nine-Tailed Fox entrée dans le complexe.');
                  onExecutePteroCommand('respawn mtf', 'RESPAWN WAVE');
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Spawn Vague MTF
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  setLastCassieSubtitle('Alerte : Intrusion de l’Insurrection du Chaos détectée à la Surface.');
                  onExecutePteroCommand('respawn chaos', 'RESPAWN WAVE');
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Spawn Vague Chaos
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  setLastCassieSubtitle('Escouade La Main du Serpent déployée sur Site-19.');
                  onExecutePteroCommand(
                    `customteam spawn ${customTeams[0]?.roleKey || 'serpents_hand'}`,
                    'RESPAWN WAVE'
                  );
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Spawn Main Serpent
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => onExecutePteroCommand('sr', 'ROUND CONTROL')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors flex items-center justify-center gap-1 ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restart Manche
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: RemoteAdmin Player Inspector & In-Game Action Deck */}
        {selectedPlayer ? (
          <div className="lg:col-span-6 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-5">
            {/* Selected Player Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400">
                    CIBLE SÉLECTIONNÉE #{selectedPlayer.id}
                  </span>
                  <span className="text-xs text-slate-600">·</span>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: selectedPlayer.badgeHex }}
                  >
                    [{selectedPlayer.badgeText}]
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {selectedPlayer.name}
                </h3>
                <div className="text-xs font-mono text-slate-400">
                  {selectedPlayer.steamId} · Zone : {selectedPlayer.zone}
                </div>
              </div>

              <div className="text-right">
                <div
                  className="text-sm font-bold"
                  style={{ color: selectedPlayer.roleColor }}
                >
                  {selectedPlayer.role}
                </div>
                <div className="text-xs font-mono text-emerald-400 mt-0.5">
                  {selectedPlayer.hp} / {selectedPlayer.maxHp} HP (AHP: {selectedPlayer.ahp})
                </div>
              </div>
            </div>

            {/* 1. Quick Admin Flags (GodMode, Noclip, Bypass, Heal, Mute) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                01. Pouvoirs &amp; États du Joueur en Direct
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  disabled={!canUseHeavyActions}
                  onClick={() => handleTogglePlayerFlag('godMode', 'god')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedPlayer.godMode
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  GodMode {selectedPlayer.godMode ? 'ON' : 'OFF'}
                </button>
                <button
                  disabled={!canUseHeavyActions}
                  onClick={() => handleTogglePlayerFlag('noclip', 'noclip')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedPlayer.noclip
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Noclip {selectedPlayer.noclip ? 'ON' : 'OFF'}
                </button>
                <button
                  disabled={!canUseHeavyActions}
                  onClick={() => handleTogglePlayerFlag('bypassMode', 'bypass')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedPlayer.bypassMode
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Bypass Portes
                </button>
                <button
                  onClick={() => handleTogglePlayerFlag('voiceMuted', 'mute')}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                    selectedPlayer.voiceMuted
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {selectedPlayer.voiceMuted ? 'Unmute Vocal' : 'Mute Vocal'}
                </button>
                <button
                  disabled={!canUseHeavyActions}
                  onClick={() => {
                    if (!canUseHeavyActions) return;
                    updatePlayer(selectedPlayer.id, (p) => ({ ...p, hp: p.maxHp }));
                    onExecutePteroCommand(`/heal ${selectedPlayer.id}`, 'REMOTEADMIN IN-GAME');
                  }}
                  className={`py-2 px-2.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors ${
                    !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Soigner 100%
                </button>
              </div>
            </div>

            {/* 2. Forceclass (Vanilla SCP/MTF/Chaos OR Custom Teams) */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-white">
                02. Changer la Classe (Forceclass) ou Spawner en Équipe Custom
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  value={chosenRoleId}
                  onChange={(e) => setChosenRoleId(e.target.value)}
                  className="sm:col-span-8 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                >
                  {VANILLA_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.hp} HP)
                    </option>
                  ))}
                </select>
                <button
                  disabled={!canUseHeavyActions}
                  onClick={handleForceVanillaRole}
                  className={`sm:col-span-4 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors ${
                    !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Forcer Classe
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  value={chosenCustomTeamKey}
                  onChange={(e) => setChosenCustomTeamKey(e.target.value)}
                  className="sm:col-span-8 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-800 text-purple-300"
                >
                  {customTeams.map((t) => (
                    <option key={t.id} value={t.roleKey}>
                      [TEAM CUSTOM] {t.name} ({t.hp} HP · {t.spawnZone})
                    </option>
                  ))}
                </select>
                <button
                  disabled={!canUseHeavyActions}
                  onClick={handleForceCustomTeam}
                  className={`sm:col-span-4 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors ${
                    !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Forcer Team Custom
                </button>
              </div>
            </div>

            {/* 3. Inventory Manager & Teleportation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Give Items & All Staff Packs */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">03. Donner Objets &amp; Items Staff</span>
                  <span className="font-mono text-amber-400">
                    {selectedPlayer.inventory.length}/8 slots
                  </span>
                </div>

                {/* Quick Item Category Filter */}
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'ALL', label: 'Tous' },
                      { id: 'STAFF', label: '★ Staff' },
                      { id: 'Keycard', label: 'Cartes' },
                      { id: 'Weapon', label: 'Armes' },
                      { id: 'Special', label: 'SCP/Spécial' },
                      { id: 'Medical', label: 'Soins' },
                      { id: 'Armor', label: 'Armure' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setItemCategoryFilter(cat.id);
                        const firstMatch = SCPSL_ITEMS.find((it) =>
                          cat.id === 'ALL'
                            ? true
                            : cat.id === 'STAFF'
                            ? Boolean(it.isStaffItem)
                            : it.category === cat.id
                        );
                        if (firstMatch) setChosenItemId(firstMatch.id);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                        itemCategoryFilter === cat.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <select
                  value={chosenItemId}
                  onChange={(e) => setChosenItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                >
                  {SCPSL_ITEMS.filter((item) => {
                    if (itemCategoryFilter === 'ALL') return true;
                    if (itemCategoryFilter === 'STAFF') return Boolean(item.isStaffItem);
                    return item.category === itemCategoryFilter;
                  }).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!canUseHeavyActions}
                    onClick={handleGiveItem}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap ${
                      !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    + Donner Objet
                  </button>
                  <button
                    disabled={!canUseHeavyActions}
                    onClick={handleClearInventory}
                    className={`py-1.5 px-2.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap ${
                      !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Vider Sac
                  </button>
                </div>

                {/* 1-Click Staff Item Packs */}
                <div className="pt-1.5 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-amber-300">
                    Kits Items Staff (1-Clic) :
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRolePermissions && activeRolePermissions.staffItems.length > 0 && (
                      <button
                        type="button"
                        disabled={!canUseHeavyActions}
                        onClick={() =>
                          handleGiveStaffPack(
                            activeRolePermissions.staffItems,
                            activeRolePermissions.label
                          )
                        }
                        className={`px-2 py-1 text-[10px] font-semibold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors whitespace-nowrap ${
                          !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Kit {activeRolePermissions.label}
                      </button>
                    )}
                    {STAFF_ITEM_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        disabled={!canUseHeavyActions}
                        onClick={() => handleGiveStaffPack(pack.items, pack.label)}
                        className={`px-2 py-1 text-[10px] font-medium rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap ${
                          !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={pack.description}
                      >
                        {pack.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-400 truncate">
                  Sac : {selectedPlayer.inventory.length > 0 ? selectedPlayer.inventory.join(', ') : 'Vide'}
                </div>
              </div>

              {/* Teleport & Custom HP */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-white">
                  04. Téléportation &amp; Points de Vie
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={chosenTeleportId}
                    onChange={(e) => setChosenTeleportId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                  >
                    {TELEPORT_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!canUseHeavyActions}
                    onClick={handleTeleportPlayer}
                    className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors ${
                      !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    TP
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={customHpInput}
                    onChange={(e) => setCustomHpInput(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-white"
                  />
                  <button
                    disabled={!canUseHeavyActions}
                    onClick={handleSetCustomHp}
                    className={`flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors ${
                      !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Définir HP
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Direct Sanction & Private Hint to Player */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-rose-300">
                05. Sanctionner ou Envoyer un Message Écran à {selectedPlayer.name}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={privateHintText}
                  onChange={(e) => setPrivateHintText(e.target.value)}
                  placeholder="Message privé affiché au milieu de l'écran du joueur..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                />
                <button
                  onClick={() => {
                    setLastBroadcastBanner(`[MESSAGE STAFF -> ${selectedPlayer.name}] ${privateHintText}`);
                    onExecutePteroCommand(
                      `/pbc ${selectedPlayer.id} 8 <color=#00FFFF><b>[MESSAGE STAFF]</b></color> ${privateHintText}`,
                      'REMOTEADMIN IN-GAME'
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Message Écran
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <input
                  type="text"
                  value={quickSanctionReason}
                  onChange={(e) => setQuickSanctionReason(e.target.value)}
                  placeholder="Motif du Warn / Kick / Ban..."
                  className="sm:col-span-8 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                />
                <select
                  value={quickBanDuration}
                  onChange={(e) => setQuickBanDuration(e.target.value)}
                  className="sm:col-span-4 px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white"
                >
                  <option value="2 heures">Ban 2 heures</option>
                  <option value="24 heures">Ban 24 heures</option>
                  <option value="7 jours">Ban 7 jours</option>
                  <option value="30 jours">Ban 30 jours</option>
                  <option value="Permanent">Ban Permanent</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleInGameSanction('WARN')}
                  className="py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                >
                  Avertir (Warn)
                </button>
                <button
                  onClick={() => handleInGameSanction('KICK')}
                  className="py-2 px-3 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                >
                  Expulser (Kick)
                </button>
                <button
                  disabled={!canBanPlayers}
                  onClick={() => handleInGameSanction('BAN')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors ${
                    !canBanPlayers ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Bannir ({quickBanDuration})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-6 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="text-xs font-mono text-amber-400">
              INSPECTEUR REMOTEADMIN · CIBLAGE DIRECT PAR STEAMID64 OU ID
            </div>
            <h3 className="text-base font-bold text-white">
              Aucun joueur sélectionné — Cibler un vrai joueur manuellement
            </h3>
            <p className="text-xs text-slate-400">
              Entrez un vrai SteamID64 (`76561198...@steam`) ou son ID en jeu (`1`, `2`...) pour exécuter des commandes RemoteAdmin en direct.
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={manualTargetSteamId}
                  onChange={(e) => setManualTargetSteamId(e.target.value)}
                  placeholder="ID numérique (ex: 1) ou SteamID64 (76561199...@steam)"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                />
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim() || !canUseHeavyActions}
                  onClick={() => onExecutePteroCommand(`/god ${manualTargetSteamId.trim()} 1`, 'REMOTEADMIN IN-GAME')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950"
                >
                  GodMode
                </button>
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim() || !canUseHeavyActions}
                  onClick={() => onExecutePteroCommand(`/give ${manualTargetSteamId.trim()} ${chosenItemId}`, 'REMOTEADMIN IN-GAME')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950"
                >
                  Give {chosenItemId}
                </button>
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim() || !canUseHeavyActions}
                  onClick={() => onExecutePteroCommand(`/forceclass ${manualTargetSteamId.trim()} ${chosenRoleId}`, 'REMOTEADMIN IN-GAME')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950"
                >
                  Forceclass
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim() || !canBanPlayers}
                  onClick={() =>
                    onExecuteSanction({
                      type: 'BAN',
                      targetName: manualTargetSteamId.trim(),
                      targetSteamId: manualTargetSteamId.trim(),
                      playerId: /^\d{1,4}$/.test(manualTargetSteamId.trim()) ? manualTargetSteamId.trim() : undefined,
                      duration: quickBanDuration,
                      reason: quickSanctionReason
                    })
                  }
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white"
                >
                  Bannir (/ban + /oban · {quickBanDuration})
                </button>
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim()}
                  onClick={() =>
                    onExecuteSanction({
                      type: 'KICK',
                      targetName: manualTargetSteamId.trim(),
                      targetSteamId: manualTargetSteamId.trim(),
                      playerId: /^\d{1,4}$/.test(manualTargetSteamId.trim()) ? manualTargetSteamId.trim() : undefined,
                      reason: quickSanctionReason
                    })
                  }
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-cyan-300 border border-slate-700"
                >
                  Kick
                </button>
                <button
                  type="button"
                  disabled={!manualTargetSteamId.trim() || !canBanPlayers}
                  onClick={() =>
                    onExecuteSanction({
                      type: 'UNBAN',
                      targetName: manualTargetSteamId.trim(),
                      targetSteamId: manualTargetSteamId.trim(),
                      reason: 'Débannissement manuel'
                    })
                  }
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white"
                >
                  Débannir (/unban id)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: Site-19 Facility Control Deck (Doors, Lights, Alpha Warhead, Global Broadcast) */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              CONTRÔLE PHYSIQUE DU COMPLEXE SITE-19 (FACILITY MANAGEMENT)
            </div>
            <h3 className="text-base font-bold text-white">
              Portes, Éclairage, Ogive Nucléaire Alpha Warhead &amp; Annonces Générales
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Doors & Lockdown */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white">
              Système des Portes &amp; Confinement
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!canUseHeavyActions}
                onClick={() => onExecutePteroCommand('open all', 'FACILITY DOORS')}
                className={`py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Ouvrir Toutes Portes
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => onExecutePteroCommand('close all', 'FACILITY DOORS')}
                className={`py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Fermer Toutes Portes
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  const next = !doorsLocked;
                  setDoorsLocked(next);
                  setLastCassieSubtitle(
                    next
                      ? 'Alerte de confinement : Toutes les portes du complexe sont verrouillées.'
                      : 'Verrouillage général des portes levé.'
                  );
                  onExecutePteroCommand(next ? 'lock all' : 'unlock all', 'FACILITY DOORS');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  doorsLocked
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {doorsLocked ? 'Déverrouiller Portes' : 'Lockdown Complexe'}
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  const next = !blackoutActive;
                  setBlackoutActive(next);
                  setLastCassieSubtitle(
                    next
                      ? 'Surcharge électrique détectée : Blackout général sur le Site-19.'
                      : 'Alimentation principale rétablie dans tous les secteurs.'
                  );
                  onExecutePteroCommand(next ? 'overcharge 120' : 'overcharge 0', 'FACILITY LIGHTS');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  blackoutActive
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-slate-800'
                } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {blackoutActive ? 'Rétablir Lumières' : 'Blackout Total (120s)'}
              </button>
            </div>
          </div>

          {/* Alpha Warhead & Round Control */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white">
              Ogive Nucléaire Alpha Warhead &amp; Manche
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  setWarheadState('COUNTDOWN');
                  setLastCassieSubtitle(
                    'Séquence de détonation de l’Ogive Alpha activée. Évacuez immédiatement vers la Surface.'
                  );
                  onExecutePteroCommand('warhead start', 'ALPHA WARHEAD');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Lancer Ogive Alpha
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  setWarheadState('STANDBY');
                  setLastCassieSubtitle('Détonation de l’Ogive Alpha annulée. Reprise du protocole standard.');
                  onExecutePteroCommand('warhead cancel', 'ALPHA WARHEAD');
                }}
                className={`py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Arrêter Décompte
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  const next = warheadState === 'LOCKED' ? 'STANDBY' : 'LOCKED';
                  setWarheadState(next);
                  onExecutePteroCommand(
                    `warhead lock ${next === 'LOCKED' ? 'true' : 'false'}`,
                    'ALPHA WARHEAD'
                  );
                }}
                className={`py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 transition-colors ${
                  !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {warheadState === 'LOCKED' ? 'Débloquer Levier' : 'Verrouiller Ogive'}
              </button>
              <button
                disabled={!canUseHeavyActions}
                onClick={() => {
                  const next = !roundLocked;
                  setRoundLocked(next);
                  onExecutePteroCommand(`roundlock ${next ? 'true' : 'false'}`, 'ROUND CONTROL');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  roundLocked
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-800'
                } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {roundLocked ? 'RoundLock : ACTIF' : 'Bloquer Fin Manche'}
              </button>
            </div>
          </div>

          {/* Global Broadcast */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-white">
              Diffusion Broadcast Serveur (Tous les Joueurs)
            </div>
            <input
              type="text"
              value={globalBcText}
              onChange={(e) => setGlobalBcText(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-amber-200"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLastBroadcastBanner(globalBcText.replace(/<[^>]+>/g, ''));
                  onExecutePteroCommand(`bc 10 ${globalBcText}`, 'BROADCAST');
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
              >
                Diffuser Broadcast (10s)
              </button>
              <button
                onClick={() => {
                  setLastBroadcastBanner('Aucun broadcast actif');
                  onExecutePteroCommand('clearbc', 'BROADCAST');
                }}
                className="py-2 px-2.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
