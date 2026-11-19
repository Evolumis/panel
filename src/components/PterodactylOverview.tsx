import React, { useState } from 'react';
import {
  Play,
  RotateCw,
  Square,
  Terminal,
  Send,
  Users,
  Cpu,
  Activity,
  Flame,
  Sliders,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Server,
  Webhook
} from 'lucide-react';
import { CustomTeam, StaffMember, VipTier } from '../data/scpslDefaults';
import { generatePterodactylScpslEggJson } from '../utils/configGenerators';

export interface ConsoleLogEntry {
  id: string;
  time: string;
  origin: string;
  text: string;
  level: 'info' | 'command' | 'warn' | 'exiled';
}

export interface LivePlayer {
  id: number;
  name: string;
  steamId: string;
  role: string;
  teamColor: string;
  hp: number;
  badgeText: string;
  badgeHex: string;
}

interface PterodactylOverviewProps {
  serverState: 'running' | 'restarting' | 'offline';
  onPowerAction: (signal: 'start' | 'restart' | 'stop') => void;
  consoleLogs: ConsoleLogEntry[];
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
  pteroUrl: string;
  setPteroUrl: (val: string) => void;
  pteroApiKey: string;
  setPteroApiKey: (val: string) => void;
  pteroServerId: string;
  setPteroServerId: (val: string) => void;
  discordWebhookUrl: string;
  setDiscordWebhookUrl: (val: string) => void;
  serverPort: string;
  setServerPort: (val: string) => void;
  liveApiConnected: boolean;
  liveApiMetrics: {
    cpuPercent: string;
    ramGb: string;
    serverTitle: string;
  } | null;
  apiStatusMessage: string | null;
  apiError: string | null;
  isSyncingApi: boolean;
  onTestLivePteroConnection: () => void;
  onPushAllConfigsToPterodactyl: () => void;
  eventActive: boolean;
  activeEventTitle: string;
  customTeams: CustomTeam[];
  vipTiers: VipTier[];
  staffList: StaffMember[];
  onQuickNavigate: (tab: 'panel' | 'discord' | 'teams' | 'affiche' | 'events') => void;
}

const INITIAL_LIVE_PLAYERS: LivePlayer[] = [
  {
    id: 1,
    name: 'O5-1 [Fondateur]',
    steamId: '76561198042198311@steam',
    role: 'FIM Alpha-1 "Bras Droit Rouge"',
    teamColor: '#DC143C',
    hp: 150,
    badgeText: 'FONDATEUR O5',
    badgeHex: '#DC143C'
  },
  {
    id: 2,
    name: 'ShadowSlayer',
    steamId: '76561198112233445@steam',
    role: 'SCP-049 (Docteur de la Peste)',
    teamColor: '#C50000',
    hp: 2200,
    badgeText: '★ VIP KETER ★',
    badgeHex: '#DC143C'
  },
  {
    id: 3,
    name: 'Kaelen_MTF',
    steamId: '76561198334455667@steam',
    role: 'Capitaine MTF Nine-Tailed Fox',
    teamColor: '#00B7EB',
    hp: 120,
    badgeText: 'MODÉRATEUR',
    badgeHex: '#00B7EB'
  },
  {
    id: 4,
    name: 'Luna_SCP',
    steamId: '76561198667788990@steam',
    role: 'La Main du Serpent (Custom)',
    teamColor: '#FF0090',
    hp: 125,
    badgeText: '♦ NITRO BOOSTER',
    badgeHex: '#FF1493'
  },
  {
    id: 5,
    name: 'Aurelien_92',
    steamId: '76561198223344556@steam',
    role: 'Personnel Classe-D',
    teamColor: '#FF9966',
    hp: 100,
    badgeText: '⚡ VIP EUCLIDE',
    badgeHex: '#FAFF86'
  },
  {
    id: 6,
    name: 'Dr_Vance_FR',
    steamId: '76561198998877665@steam',
    role: 'Scientifique Superviseur',
    teamColor: '#FAFF86',
    hp: 100,
    badgeText: 'JOUEUR',
    badgeHex: '#A0A0A0'
  }
];

export const PterodactylOverview: React.FC<PterodactylOverviewProps> = ({
  serverState,
  onPowerAction,
  consoleLogs,
  onExecutePteroCommand,
  pteroUrl,
  setPteroUrl,
  pteroApiKey,
  setPteroApiKey,
  pteroServerId,
  setPteroServerId,
  discordWebhookUrl,
  setDiscordWebhookUrl,
  serverPort,
  setServerPort,
  liveApiConnected,
  liveApiMetrics,
  apiStatusMessage,
  apiError,
  isSyncingApi,
  onTestLivePteroConnection,
  onPushAllConfigsToPterodactyl,
  eventActive,
  activeEventTitle,
  customTeams,
  vipTiers,
  staffList,
  onQuickNavigate
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [players, setPlayers] = useState<LivePlayer[]>(INITIAL_LIVE_PLAYERS);
  const [showHostGuide, setShowHostGuide] = useState(true);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    onExecutePteroCommand(commandInput.trim(), 'CONSOLE PTERODACTYL');
    setCommandInput('');
  };

  const handleDownloadEggJson = () => {
    const json = generatePterodactylScpslEggJson();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'egg-scp-secret-laboratory-exiled.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExecutePteroCommand(
      'Egg Pterodactyl SCP:SL + EXILED (egg-scp-secret-laboratory-exiled.json) téléchargé.',
      'INSTALLATION EGG'
    );
  };

  const handleForceClassPlayer = (player: LivePlayer, newRoleName: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id ? { ...p, role: newRoleName, teamColor: '#50C878' } : p
      )
    );
    onExecutePteroCommand(
      `forceclass ${player.steamId} "${newRoleName}"`,
      'REMOTEADMIN'
    );
  };

  return (
    <div className="space-y-6">
      {/* Step-by-Step Banner: Host SCP:SL on Your Existing Pterodactyl Panel */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-amber-400">
              HÉBERGEMENT SUR VOTRE PANEL PTERODACTYL EXISTANT · EGG OFFICIEL STEAMCMD 996560 + EXILED
            </div>
            <h2 className="text-xl font-bold text-white">
              Installer SCP:SL sur votre Pterodactyl &amp; Relier ce Panel en Direct
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadEggJson}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              1. Télécharger l’Egg SCP:SL + EXILED (.json)
            </button>
            <button
              onClick={() => setShowHostGuide(!showHostGuide)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              {showHostGuide ? 'Masquer les étapes' : 'Afficher les étapes d’installation'}
            </button>
          </div>
        </div>

        {showHostGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="font-mono font-bold text-amber-400">
                ÉTAPE 1 · IMPORTER L’EGG SUR PTERODACTYL
              </div>
              <p className="text-slate-300 leading-relaxed">
                Téléchargez le fichier <code className="text-amber-300">egg-scp-secret-laboratory-exiled.json</code> ci-dessus. Dans votre panel Pterodactyl, allez dans <b>Admin → Nests → Import Egg</b>, puis créez un serveur avec <b>6 Go RAM min.</b> et le port <b>7777 (UDP/TCP)</b>.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="font-mono font-bold text-cyan-400">
                ÉTAPE 2 · CONNECTER VOTRE CLÉ API CLIENT
              </div>
              <p className="text-slate-300 leading-relaxed">
                Sur votre Pterodactyl, allez dans <b>Account → API Credentials</b> et créez une clé (<code className="text-cyan-300">ptlc_...</code>). Entrez l’URL de votre panel, la clé API et l’ID du serveur à droite pour piloter le serveur en direct d’ici.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="font-mono font-bold text-emerald-400">
                ÉTAPE 3 · SYNCHRONISER CONFIGS &amp; BOT DISCORD
              </div>
              <p className="text-slate-300 leading-relaxed">
                Cliquez sur <b>Pousser toutes les configs sur Pterodactyl</b> : vos modérateurs, tags VIP, équipes customs EXILED et votre affiche Pastebin sont écrits directement dans <code className="text-emerald-300">/home/container/.config/</code>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top 4-Column Telemetry & Server Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Statut Conteneur Pterodactyl</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-white">
            {serverState === 'running'
              ? 'EN LIGNE · 59.8 TPS'
              : serverState === 'restarting'
              ? 'REDÉMARRAGE...'
              : 'HORS LIGNE'}
          </div>
          <div className="text-xs font-mono text-slate-400">
            {liveApiConnected ? 'API Pterodactyl Connectée' : 'Mode Studio & Préparation'} · ID : {pteroServerId}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Joueurs &amp; Slots VIP</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-white">
            28 / 32 Joueurs
          </div>
          <div className="text-xs text-slate-400">
            {staffList.length} Staffs · {vipTiers.reduce((acc, v) => acc + v.assignedPlayers.length, 0)} VIPs configurés
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Charge CPU &amp; RAM Dédiée</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums text-white">
            {liveApiMetrics
              ? `${liveApiMetrics.cpuPercent}% · ${liveApiMetrics.ramGb} Go`
              : '34.2% · 5.4 / 8.0 Go'}
          </div>
          <div className="text-xs font-mono text-slate-400">
            EXILED 9.5.1 · LocalAdmin Port {serverPort}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mode de Jeu &amp; Équipes</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {eventActive ? activeEventTitle : 'Rotation Normale + Teams'}
          </div>
          <div className="text-xs text-amber-400 font-mono">
            {customTeams.length} équipes customs chargées
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Live Pterodactyl Console Left, Real API Bridge Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Pterodactyl Live Console */}
        <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <div>
                <h2 className="text-base font-semibold text-white">
                  Console Serveur SCP:SL (API Pterodactyl Directe)
                </h2>
                <p className="text-xs text-slate-400">
                  Envoie vos commandes à `/api/client/servers/{pteroServerId}/command` et affiche les retours
                </p>
              </div>
            </div>

            {/* Power Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPowerAction('start')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Démarrer
              </button>
              <button
                onClick={() => onPowerAction('restart')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Redémarrer
              </button>
              <button
                onClick={() => onPowerAction('stop')}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                Arrêter
              </button>
            </div>
          </div>

          {/* Terminal Output Window */}
          <div className="p-4 rounded-xl bg-[#06080e] border border-slate-800 font-mono text-xs space-y-1.5 h-[360px] overflow-y-auto">
            {consoleLogs.map((log) => (
              <div key={log.id} className="leading-relaxed break-words">
                <span className="text-slate-500 tabular-nums">[{log.time}]</span>{' '}
                <span
                  className={`font-semibold ${
                    log.level === 'command'
                      ? 'text-amber-400'
                      : log.level === 'warn'
                      ? 'text-rose-400'
                      : log.level === 'exiled'
                      ? 'text-cyan-400'
                      : 'text-emerald-400'
                  }`}
                >
                  [{log.origin}]
                </span>{' '}
                <span className="text-slate-200">{log.text}</span>
              </div>
            ))}
          </div>

          {/* Command Input Bar */}
          <form onSubmit={handleConsoleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Entrer une commande serveur (ex: sr, bc 10 Bienvenue, cassie_sl, ban, reload remoteadmin)..."
              className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer à Pterodactyl
            </button>
          </form>

          {/* Quick Console Macros */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Actions Rapides :</span>
            {[
              { label: 'Restart Manche (sr)', cmd: 'sr' },
              { label: 'Recharger RemoteAdmin', cmd: 'reload remoteadmin' },
              { label: 'Recharger Plugins EXILED', cmd: 'exiled reload all' },
              { label: 'Déverrouiller Portes', cmd: 'unlock all' },
              { label: 'Lancer Ogive Alpha', cmd: 'warhead start' }
            ].map((macro) => (
              <button
                key={macro.cmd}
                type="button"
                onClick={() => onExecutePteroCommand(macro.cmd, 'MACRO CONSOLE')}
                className="px-2.5 py-1 text-xs font-mono rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                {macro.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Real Pterodactyl API & Discord Webhook Connection Bridge */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Connexion API Directe à votre Pterodactyl
                </h3>
              </div>
              <span
                className={`text-xs font-mono ${
                  liveApiConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'
                }`}
              >
                {liveApiConnected ? 'LIÉ EN DIRECT' : 'PRÊT À CONNECTER'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL de votre Panel Pterodactyl
                </label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pteroUrl}
                    onChange={(e) => setPteroUrl(e.target.value)}
                    placeholder="https://panel.votre-domaine.fr"
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clé API Client Pterodactyl (Account → API Credentials → ptlc_...)
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={pteroApiKey}
                    onChange={(e) => setPteroApiKey(e.target.value)}
                    placeholder="ptlc_VotreCleApiClientPterodactyl..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Server ID Court (ex: f8a9c41b)
                  </label>
                  <input
                    type="text"
                    value={pteroServerId}
                    onChange={(e) => setPteroServerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Port Serveur SCP:SL
                  </label>
                  <input
                    type="text"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Webhook Discord (Optionnel — Envoie les logs Bans/Events sur votre Discord)
                </label>
                <div className="relative">
                  <Webhook className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={discordWebhookUrl}
                    onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-indigo-300"
                  />
                </div>
              </div>
            </div>

            {apiError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            {apiStatusMessage && !apiError && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{apiStatusMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onTestLivePteroConnection}
                disabled={isSyncingApi}
                className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                {isSyncingApi ? 'Connexion...' : 'Tester Connexion API'}
              </button>

              <button
                type="button"
                onClick={onPushAllConfigsToPterodactyl}
                disabled={isSyncingApi}
                className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Pousser Configs sur Pterodactyl
              </button>
            </div>

            {/* Module Navigation Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => onQuickNavigate('discord')}
                className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-indigo-300">
                  Bot Discord &amp; Sanctions
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Modérateurs, Bans &amp; Code Bot
                </div>
              </button>

              <button
                onClick={() => onQuickNavigate('teams')}
                className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-emerald-300">
                  Équipes &amp; Tags VIP
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {customTeams.length} Teams · {vipTiers.length} Grades VIP
                </div>
              </button>

              <button
                onClick={() => onQuickNavigate('affiche')}
                className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-amber-300">
                  Créer l’Affiche WOW
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Pastebin Rich Text &amp; Dégradés
                </div>
              </button>

              <button
                onClick={() => onQuickNavigate('events')}
                className="p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-rose-300">
                  Contrôler Mode Event
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Scénarios, Mutateurs &amp; CASSIE
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Connected Players Table with Direct Actions */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Contrôle Rapide des Joueurs en Manche (Commandes RemoteAdmin Directes)
            </h3>
            <p className="text-xs text-slate-400">
              Cliquez sur une action pour envoyer la commande correspondante (`forceclass`, `give`, `kick`) à votre serveur Pterodactyl
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3 font-medium">ID · Pseudo</th>
                <th className="py-2.5 px-3 font-medium">SteamID64</th>
                <th className="py-2.5 px-3 font-medium">Classe / Équipe Actuelle</th>
                <th className="py-2.5 px-3 font-medium">Tag Actif</th>
                <th className="py-2.5 px-3 font-medium text-right">HP</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions Directes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <span className="font-mono tabular-nums text-slate-400">#{p.id}</span> ·{' '}
                    <span className="font-semibold text-white">{p.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-400">
                    {p.steamId}
                  </td>
                  <td className="py-3 px-3 font-semibold" style={{ color: p.teamColor }}>
                    {p.role}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="font-mono font-bold"
                      style={{ color: p.badgeHex }}
                    >
                      [{p.badgeText}]
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-200">
                    {p.hp} HP
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleForceClassPlayer(
                            p,
                            customTeams[0]?.name || 'La Main du Serpent'
                          )
                        }
                        className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
                      >
                        Spawn Team Custom
                      </button>
                      <button
                        onClick={() =>
                          onExecutePteroCommand(
                            `give ${p.steamId} KeycardO5 SCP500`,
                            'REMOTEADMIN'
                          )
                        }
                        className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
                      >
                        Donner Carte O5
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
