import React, { useState } from 'react';
import {
  ShieldAlert,
  UserPlus,
  Gavel,
  Terminal,
  Copy,
  Check,
  Trash2,
  Search,
  Send,
  RotateCcw
} from 'lucide-react';
import {
  CustomTeam,
  SCPSL_BADGE_COLORS,
  SanctionRecord,
  StaffMember,
  VipTier
} from '../data/scpslDefaults';
import { generateDiscordBotCode } from '../utils/configGenerators';

interface DiscordModerationCenterProps {
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  sanctions: SanctionRecord[];
  setSanctions: React.Dispatch<React.SetStateAction<SanctionRecord[]>>;
  vipTiers: VipTier[];
  customTeams: CustomTeam[];
  pteroUrl: string;
  pteroServerId: string;
  serverName: string;
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'KickingAndShortTermBanning', label: 'Kick & Ban Court Terme' },
  { id: 'BanningUpToDay', label: 'Ban Jusqu’à 24h' },
  { id: 'LongTermBanning', label: 'Ban Longue Durée / Perm' },
  { id: 'Broadcasting', label: 'Annonces Broadcast (BC)' },
  { id: 'ForceclassSelf', label: 'Forceclass Soi-Même' },
  { id: 'GivingItems', label: 'Give Items (Inventaire)' },
  { id: 'Overwatch', label: 'Mode Overwatch' },
  { id: 'ServerConsoleCommands', label: 'Commandes Console Serveur' }
];

interface SimulatedDiscordEmbed {
  id: string;
  command: string;
  title: string;
  description: string;
  accentHex: string;
  timestamp: string;
}

export const DiscordModerationCenter: React.FC<DiscordModerationCenterProps> = ({
  staffList,
  setStaffList,
  sanctions,
  setSanctions,
  vipTiers,
  customTeams,
  pteroUrl,
  pteroServerId,
  serverName,
  onExecutePteroCommand
}) => {
  const [subTab, setSubTab] = useState<'bot-live' | 'moderators' | 'sanctions' | 'bot-code'>('bot-live');

  // Slash Command Simulator state
  const [slashType, setSlashType] = useState<'/ban' | '/kick' | '/warn' | '/addmod' | '/givevip' | '/spawnteam'>('/ban');
  const [cmdTargetName, setCmdTargetName] = useState('');
  const [cmdSteamId, setCmdSteamId] = useState('');
  const [cmdDuration, setCmdDuration] = useState('7 jours');
  const [cmdReason, setCmdReason] = useState('');
  const [cmdModRole, setCmdModRole] = useState<'moderator' | 'admin' | 'helper'>('moderator');
  const [cmdVipId, setCmdVipId] = useState(vipTiers[0]?.id || 'vip-keter');
  const [cmdTeamKey, setCmdTeamKey] = useState(customTeams[0]?.roleKey || 'serpents_hand');

  const [discordFeed, setDiscordFeed] = useState<SimulatedDiscordEmbed[]>([]);

  // Add Moderator form state
  const [newModName, setNewModName] = useState('');
  const [newModSteam, setNewModSteam] = useState('');
  const [newModDiscord, setNewModDiscord] = useState('');
  const [newModRole, setNewModRole] = useState<'admin' | 'moderator' | 'helper'>('moderator');
  const [newModBadge, setNewModBadge] = useState('MODÉRATEUR');
  const [newModColor, setNewModColor] = useState('cyan');
  const [newModPerms, setNewModPerms] = useState<string[]>([
    'KickingAndShortTermBanning',
    'BanningUpToDay',
    'Broadcasting'
  ]);

  // Sanctions filter state
  const [sanctionFilter, setSanctionFilter] = useState<'ALL' | 'BAN' | 'WARN' | 'KICK'>('ALL');
  const [sanctionSearch, setSanctionSearch] = useState('');
  const [copiedBotCode, setCopiedBotCode] = useState(false);

  const handleRunSlashCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedSteam = cmdSteamId.includes('@') ? cmdSteamId : `${cmdSteamId}@steam`;

    if (slashType === '/ban' || slashType === '/kick' || slashType === '/warn') {
      const sType = slashType === '/ban' ? 'BAN' : slashType === '/kick' ? 'KICK' : 'WARN';
      const newSanction: SanctionRecord = {
        id: `SAN-${905 + sanctions.length}`,
        targetName: cmdTargetName || 'Joueur Inconnu',
        targetSteamId: formattedSteam,
        type: sType,
        reason: cmdReason,
        duration: sType === 'BAN' ? cmdDuration : sType === 'KICK' ? 'Instantané' : 'Avertissement',
        moderator: 'O5-1 [Fondateur] (via Bot Discord)',
        source: 'Bot Discord',
        timestamp: `${nowDate} · ${nowStr}`,
        active: sType !== 'KICK'
      };
      setSanctions((prev) => [newSanction, ...prev]);

      const rawConsoleCmd =
        sType === 'BAN'
          ? `ban ${formattedSteam} "${cmdDuration}" "${cmdReason}"`
          : sType === 'KICK'
          ? `kick ${formattedSteam} "${cmdReason}"`
          : `bc 8 <color=#FAFF86>[AVERTISSEMENT STAFF]</color> ${cmdTargetName} : ${cmdReason}`;

      onExecutePteroCommand(rawConsoleCmd, 'BOT DISCORD');

      setDiscordFeed((prev) => [
        {
          id: `emb-${Date.now()}`,
          command: `${slashType} joueur:${cmdTargetName} steamid:${formattedSteam}`,
          title: `Sanction SCP:SL (${sType}) transmise au Panel Pterodactyl`,
          description: `Cible : ${cmdTargetName} (${formattedSteam}) · Durée : ${newSanction.duration} · Motif : ${cmdReason}`,
          accentHex: sType === 'BAN' ? '#DC143C' : sType === 'WARN' ? '#D97706' : '#00B7EB',
          timestamp: `À l'instant · ${nowStr}`
        },
        ...prev
      ]);
    } else if (slashType === '/addmod') {
      const badgeMap = {
        admin: { text: 'ADMIN SITE-19', color: 'red' },
        moderator: { text: 'MODÉRATEUR', color: 'cyan' },
        helper: { text: 'HELPEUR', color: 'mint' }
      };
      const chosen = badgeMap[cmdModRole];
      const newStaff: StaffMember = {
        id: `st-${Date.now()}`,
        username: cmdTargetName || 'Nouveau_Staff',
        steamId: formattedSteam,
        discordTag: `${(cmdTargetName || 'staff').toLowerCase()}`,
        discordId: `${Math.floor(100000000000000000 + Math.random() * 900000000000000000)}`,
        roleId: cmdModRole,
        badgeText: chosen.text,
        badgeColor: chosen.color,
        permissions:
          cmdModRole === 'admin'
            ? ['KickingAndShortTermBanning', 'BanningUpToDay', 'LongTermBanning', 'Broadcasting', 'GivingItems', 'ForceclassSelf']
            : ['KickingAndShortTermBanning', 'BanningUpToDay', 'Broadcasting'],
        addedAt: new Date().toISOString().slice(0, 10)
      };
      setStaffList((prev) => [...prev, newStaff]);
      onExecutePteroCommand(`setgroup ${formattedSteam} ${cmdModRole}`, 'BOT DISCORD');

      setDiscordFeed((prev) => [
        {
          id: `emb-${Date.now()}`,
          command: `/addmod steamid:${formattedSteam} grade:${cmdModRole}`,
          title: 'Nouveau Membre Staff Ajouté dans RemoteAdmin',
          description: `${newStaff.username} (${formattedSteam}) possède désormais le badge [${chosen.text}] et les permissions ${cmdModRole}.`,
          accentHex: '#16A34A',
          timestamp: `À l'instant · ${nowStr}`
        },
        ...prev
      ]);
    } else if (slashType === '/givevip') {
      onExecutePteroCommand(`setgroup ${formattedSteam} ${cmdVipId}`, 'BOT DISCORD');
      setDiscordFeed((prev) => [
        {
          id: `emb-${Date.now()}`,
          command: `/givevip steamid:${formattedSteam} tier:${cmdVipId}`,
          title: 'Tag VIP Synchronisé en Jeu',
          description: `Le joueur ${cmdTargetName} (${formattedSteam}) a reçu le groupe VIP [${cmdVipId}] sur le serveur SCP:SL.`,
          accentHex: '#D97706',
          timestamp: `À l'instant · ${nowStr}`
        },
        ...prev
      ]);
    } else if (slashType === '/spawnteam') {
      onExecutePteroCommand(`customteam spawn ${cmdTeamKey}`, 'BOT DISCORD');
      setDiscordFeed((prev) => [
        {
          id: `emb-${Date.now()}`,
          command: `/spawnteam equipe:${cmdTeamKey}`,
          title: 'Déploiement d’Équipe Custom EXILED',
          description: `L’escouade personnalisée [${cmdTeamKey}] a été déployée en jeu avec annonce C.A.S.S.I.E.`,
          accentHex: '#00B7EB',
          timestamp: `À l'instant · ${nowStr}`
        },
        ...prev
      ]);
    }
  };

  const handleAddModeratorManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModName.trim() || !newModSteam.trim()) return;
    const formattedSteam = newModSteam.includes('@') ? newModSteam.trim() : `${newModSteam.trim()}@steam`;

    const created: StaffMember = {
      id: `st-${Date.now()}`,
      username: newModName.trim(),
      steamId: formattedSteam,
      discordTag: newModDiscord.trim() || `${newModName.trim().toLowerCase()}`,
      discordId: '749201938475610293',
      roleId: newModRole,
      badgeText: newModBadge.trim() || 'MODÉRATEUR',
      badgeColor: newModColor,
      permissions: newModPerms,
      addedAt: '2026-11-18'
    };

    setStaffList((prev) => [...prev, created]);
    onExecutePteroCommand(`setgroup ${formattedSteam} ${newModRole}`, 'REMOTEADMIN');
    setNewModName('');
    setNewModSteam('');
    setNewModDiscord('');
  };

  const togglePermission = (permId: string) => {
    setNewModPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleRevokeSanction = (id: string, steamId: string) => {
    setSanctions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: false } : s))
    );
    onExecutePteroCommand(`unban ${steamId}`, 'BOT DISCORD');
  };

  const filteredSanctions = sanctions.filter((s) => {
    const matchesType = sanctionFilter === 'ALL' || s.type === sanctionFilter;
    const matchesQuery =
      s.targetName.toLowerCase().includes(sanctionSearch.toLowerCase()) ||
      s.targetSteamId.toLowerCase().includes(sanctionSearch.toLowerCase()) ||
      s.reason.toLowerCase().includes(sanctionSearch.toLowerCase());
    return matchesType && matchesQuery;
  });

  const getHexForColorId = (colorId: string) =>
    SCPSL_BADGE_COLORS.find((c) => c.id === colorId)?.hex || '#00B7EB';

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900">
        <div>
          <h2 className="text-xl font-bold text-white">
            Bot Discord, Gestion des Modérateurs & Registre des Sanctions
          </h2>
          <p className="text-xs text-slate-400">
            Pilotez votre serveur SCP:SL depuis Discord : sanctions en temps réel, ajout de modérateurs dans config_remoteadmin.txt et code du bot Discord.js v14
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setSubTab('bot-live')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'bot-live'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Simulateur Commandes Discord
          </button>
          <button
            onClick={() => setSubTab('moderators')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'moderators'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Staff & Modérateurs ({staffList.length})
          </button>
          <button
            onClick={() => setSubTab('sanctions')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'sanctions'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Bans & Sanctions ({sanctions.filter((s) => s.active).length})
          </button>
          <button
            onClick={() => setSubTab('bot-code')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subTab === 'bot-code'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Code Bot Discord.js (Pterodactyl)
          </button>
        </div>
      </div>

      {/* TAB 1: Interactive Discord Slash Command Simulator */}
      {subTab === 'bot-live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Slash Command Launcher */}
          <form
            onSubmit={handleRunSlashCommand}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4"
          >
            <div className="space-y-1">
              <div className="text-xs font-mono text-indigo-400">
                PONT API DISCORD ↔ PTERODACTYL
              </div>
              <h3 className="text-base font-semibold text-white">
                Exécuter une Commande Slash Discord
              </h3>
              <p className="text-xs text-slate-400">
                Testez vos commandes de modération : chaque action met à jour la console Pterodactyl, la liste des bans et le fichier RemoteAdmin.
              </p>
            </div>

            {/* Command selector buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(['/ban', '/kick', '/warn', '/addmod', '/givevip', '/spawnteam'] as const).map(
                (cmd) => (
                  <button
                    type="button"
                    key={cmd}
                    onClick={() => setSlashType(cmd)}
                    className={`px-3 py-2 text-xs font-mono font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      slashType === cmd
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cmd}
                  </button>
                )
              )}
            </div>

            {slashType !== '/spawnteam' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pseudo du joueur
                  </label>
                  <input
                    type="text"
                    value={cmdTargetName}
                    onChange={(e) => setCmdTargetName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SteamID64 (@steam)
                  </label>
                  <input
                    type="text"
                    value={cmdSteamId}
                    onChange={(e) => setCmdSteamId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                    required
                  />
                </div>
              </div>
            )}

            {slashType === '/ban' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Durée du bannissement
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['2 heures', '24 heures', '7 jours', 'Permanent'].map((dur) => (
                    <button
                      type="button"
                      key={dur}
                      onClick={() => setCmdDuration(dur)}
                      className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                        cmdDuration === dur
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(slashType === '/ban' || slashType === '/kick' || slashType === '/warn') && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Motif de la sanction (affiché au joueur & salon #sanctions-logs)
                </label>
                <input
                  type="text"
                  value={cmdReason}
                  onChange={(e) => setCmdReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>
            )}

            {slashType === '/addmod' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Grade RemoteAdmin à attribuer
                </label>
                <select
                  value={cmdModRole}
                  onChange={(e) => setCmdModRole(e.target.value as 'moderator' | 'admin' | 'helper')}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="helper">Helpeur (Kick & Avertissement)</option>
                  <option value="moderator">Modérateur (Ban 24h, Broadcast, Kick)</option>
                  <option value="admin">Administrateur (Ban Long Terme, Forceclass, Mode Event)</option>
                </select>
              </div>
            )}

            {slashType === '/givevip' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tag VIP à attribuer
                </label>
                <select
                  value={cmdVipId}
                  onChange={(e) => setCmdVipId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {vipTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} — {tier.badgeText}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {slashType === '/spawnteam' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Équipe Custom EXILED à déployer
                </label>
                <select
                  value={cmdTeamKey}
                  onChange={(e) => setCmdTeamKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {customTeams.map((team) => (
                    <option key={team.id} value={team.roleKey}>
                      {team.name} ({team.hp} HP · {team.spawnZone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer la commande {slashType} au Bot Discord
            </button>
          </form>

          {/* Right: Live Discord Channel #logs-modération Feed */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-[#11131a] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-indigo-400">
                  SALON DISCORD · #logs-modération-scpsl
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Retours Automatiques du Bot Site-19
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                API Pterodactyl : Connectée
              </span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {discordFeed.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-indigo-300">
                      Site-19 Bot [APP]
                    </span>
                    <span className="font-mono">{item.timestamp}</span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800/70">
                    Commande exécutée : <span className="text-amber-300">{item.command}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <div
                      className="text-xs font-bold"
                      style={{ color: item.accentHex }}
                    >
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Staff & Moderators Management */}
      {subTab === 'moderators' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Add Moderator Form */}
          <form
            onSubmit={handleAddModeratorManual}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-white">
                Ajouter un Modérateur / Staff RemoteAdmin
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pseudo Staff
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Agent_Kovacs"
                  value={newModName}
                  onChange={(e) => setNewModName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pseudo Discord
                </label>
                <input
                  type="text"
                  placeholder="Ex: kovacs_scp"
                  value={newModDiscord}
                  onChange={(e) => setNewModDiscord(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SteamID64 (Format : 76561198...@steam)
              </label>
              <input
                type="text"
                required
                placeholder="76561198012345678@steam"
                value={newModSteam}
                onChange={(e) => setNewModSteam(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Groupe
                </label>
                <select
                  value={newModRole}
                  onChange={(e) => setNewModRole(e.target.value as 'admin' | 'moderator' | 'helper')}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="helper">helper</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Texte du Badge
                </label>
                <input
                  type="text"
                  value={newModBadge}
                  onChange={(e) => setNewModBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Couleur SCP:SL
                </label>
                <select
                  value={newModColor}
                  onChange={(e) => setNewModColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {SCPSL_BADGE_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-300">
                Permissions RemoteAdmin autorisées
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const checked = newModPerms.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-xs text-slate-300 hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.id)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span className="truncate">{perm.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
            >
              Enregistrer le Modérateur dans config_remoteadmin.txt
            </button>
          </form>

          {/* Right: Active Staff Table */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Équipe de Modération Active ({staffList.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Synchronisé automatiquement avec la section Members de config_remoteadmin.txt
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Membre & Discord</th>
                    <th className="py-2.5 px-3 font-medium">SteamID64</th>
                    <th className="py-2.5 px-3 font-medium">Badge En Jeu</th>
                    <th className="py-2.5 px-3 font-medium text-right">Permissions</th>
                    <th className="py-2.5 px-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{member.username}</div>
                        <div className="text-slate-400">@{member.discordTag}</div>
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {member.steamId}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="font-mono font-bold"
                          style={{ color: getHexForColorId(member.badgeColor) }}
                        >
                          [{member.badgeText}]
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-300">
                        {member.permissions.length} droits
                      </td>
                      <td className="py-3 px-3 text-right">
                        {member.roleId !== 'owner' ? (
                          <button
                            onClick={() => {
                              setStaffList((prev) => prev.filter((s) => s.id !== member.id));
                              onExecutePteroCommand(`setgroup ${member.steamId} none`, 'REMOTEADMIN');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Retirer du staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">Protégé</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Sanctions, Bans & Warns Register */}
      {subTab === 'sanctions' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-rose-400" />
              <h3 className="text-base font-semibold text-white">
                Registre Central des Bannissements, Kicks & Avertissements
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sanctionSearch}
                  onChange={(e) => setSanctionSearch(e.target.value)}
                  placeholder="Rechercher pseudo, SteamID, motif..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white w-64"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                {(['ALL', 'BAN', 'WARN', 'KICK'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSanctionFilter(f)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      sanctionFilter === f
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? 'Toutes' : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Réf · Type</th>
                  <th className="py-2.5 px-3 font-medium">Joueur & SteamID64</th>
                  <th className="py-2.5 px-3 font-medium">Motif de la Sanction</th>
                  <th className="py-2.5 px-3 font-medium">Durée</th>
                  <th className="py-2.5 px-3 font-medium">Modérateur · Source</th>
                  <th className="py-2.5 px-3 font-medium text-right">Statut / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredSanctions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <span className="text-slate-400">{item.id}</span> ·{' '}
                      <span
                        className={`font-bold ${
                          item.type === 'BAN'
                            ? 'text-rose-400'
                            : item.type === 'WARN'
                            ? 'text-amber-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{item.targetName}</div>
                      <div className="font-mono tabular-nums text-slate-400">
                        {item.targetSteamId}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-200 max-w-md">
                      {item.reason}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                      {item.duration}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      <span className="text-slate-200">{item.moderator}</span> · {item.source} ·{' '}
                      <span className="font-mono tabular-nums">{item.timestamp}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.active ? (
                        <button
                          onClick={() => handleRevokeSanction(item.id, item.targetSteamId)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Révoquer le ban
                        </button>
                      ) : (
                        <span className="text-slate-500">Expiré / Levé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Ready-to-run Discord.js v14 Bot Code */}
      {subTab === 'bot-code' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-amber-400">
                BOT DISCORD.JS V14 PRÊT À HÉBERGER · CONNEXION API CLIENT PTERODACTYL
              </div>
              <h3 className="text-base font-semibold text-white">
                Script Complet index.js de votre Bot Discord SCP:SL
              </h3>
              <p className="text-xs text-slate-400">
                Ce code inclut déjà vos grades VIP ({vipTiers.length}), vos équipes customs ({customTeams.length}) et vos commandes /ban, /kick, /addmod, /givevip, /spawnteam, /eventmode et /power.
              </p>
            </div>

            <button
              onClick={() => {
                const code = generateDiscordBotCode(
                  pteroUrl,
                  pteroServerId,
                  serverName,
                  vipTiers,
                  customTeams
                );
                navigator.clipboard.writeText(code);
                setCopiedBotCode(true);
                setTimeout(() => setCopiedBotCode(false), 2000);
              }}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              {copiedBotCode ? (
                <>
                  <Check className="w-4 h-4" />
                  Code du Bot Discord Copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copier le Code Complet du Bot (index.js)
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[520px]">
            {generateDiscordBotCode(pteroUrl, pteroServerId, serverName, vipTiers, customTeams)}
          </pre>
        </div>
      )}
    </div>
  );
};
