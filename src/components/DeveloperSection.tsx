import React, { useState } from 'react';
import {
  Terminal,
  Code2,
  FileCode,
  Sliders,
  UploadCloud,
  Download,
  Copy,
  Check,
  Play,
  RotateCw,
  Square,
  Send,
  Activity,
  Webhook,
  KeyRound,
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  CustomTeam,
  StaffMember,
  VipTier,
  WebPanelRolePermissionMatrix
} from '../data/scpslDefaults';
import {
  generateDiscordBotCode,
  generateExiledCustomTeamsYaml,
  generateExiledMainPortConfigYaml,
  generateExiledPermissionsYaml,
  generateExiledStaffAutoEquipPluginCode,
  generateGameplayConfig,
  generatePterodactylMegaAllInOneEggJson,
  generateRemoteAdminConfig,
  generateStaffLoadoutsYaml,
  generateVipAdvantagesYaml
} from '../utils/configGenerators';
import { ConsoleLogEntry } from './PterodactylOverview';

interface DeveloperSectionProps {
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
  staffList: StaffMember[];
  staffRoles?: WebPanelRolePermissionMatrix[];
  vipTiers: VipTier[];
  customTeams: CustomTeam[];
  serverNameRich: string;
  pastebinId: string;
  onOpenAuthAndDnsModal: () => void;
}

function generateLabApiCSharpPluginCode(panelDomain = 'https://scpsl.lumishost.com'): string {
  return `// ============================================================================
// PLUGIN C# LABAPI / EXILED POUR SCP:SL 14.2.9 — LUMISHOST TELEMETRY BRIDGE
// Compilez en .dll ou placez dans /home/container/.config/SCP Secret Laboratory/LabAPI/plugins/1031/
// Envoie tous les Kills, Teamkills, Connexions et Logs vers ${panelDomain}/api/telemetry/ingest
// ============================================================================

using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using LabApi.Events.Arguments.PlayerEvents;
using LabApi.Events.Handlers;
using LabApi.Features.Console;
using LabApi.Loader.Features.Plugins;

namespace LumisHostTelemetry
{
    public class LumisHostTelemetryPlugin : Plugin
    {
        public override string Name => "LumisHostWebPanelBridge";
        public override string Author => "Nathaniel Dagenais - LumisHost";
        public override string Description => "Synchronise Kills, Teamkills, Logs Joueurs et Sanctions avec scpsl.lumishost.com";
        public override Version Version => new Version(1, 4, 2);
        public override Version RequiredApiVersion => new Version(1, 0, 0);

        private static readonly HttpClient Http = new HttpClient();
        private const string WebhookEndpoint = "${panelDomain}/api/telemetry/ingest";

        public override void Enable()
        {
            PlayerEvents.Joined += OnPlayerJoined;
            PlayerEvents.Left += OnPlayerLeft;
            PlayerEvents.Dying += OnPlayerDying;
            Logger.Info("[LumisHostBridge] Connecté au panel web scpsl.lumishost.com !");
        }

        public override void Disable()
        {
            PlayerEvents.Joined -= OnPlayerJoined;
            PlayerEvents.Left -= OnPlayerLeft;
            PlayerEvents.Dying -= OnPlayerDying;
        }

        private void OnPlayerJoined(PlayerJoinedEventArgs ev)
        {
            _ = PushTelemetryAsync(new
            {
                category = "CONNECT",
                killerName = ev.Player.Nickname,
                killerSteamId = ev.Player.UserId,
                zone = "play.lumishost.com:1031",
                details = $"Connexion : {ev.Player.Nickname} ({ev.Player.UserId}) a rejoint la manche."
            });
        }

        private void OnPlayerLeft(PlayerLeftEventArgs ev)
        {
            _ = PushTelemetryAsync(new
            {
                category = "DISCONNECT",
                killerName = ev.Player.Nickname,
                killerSteamId = ev.Player.UserId,
                zone = "play.lumishost.com:1031",
                details = $"Déconnexion : {ev.Player.Nickname} ({ev.Player.UserId}) a quitté le serveur."
            });
        }

        private void OnPlayerDying(PlayerDyingEventArgs ev)
        {
            if (ev.Player == null) return;
            string attackerName = ev.Attacker != null ? ev.Attacker.Nickname : "Environnement / SCP";
            string attackerId = ev.Attacker != null ? ev.Attacker.UserId : "SERVER";
            string attackerRole = ev.Attacker != null ? ev.Attacker.Role.ToString() : "Facility";
            string victimRole = ev.Player.Role.ToString();

            bool isTeamkill = ev.Attacker != null && ev.Attacker != ev.Player &&
                              ev.Attacker.Team == ev.Player.Team;

            _ = PushTelemetryAsync(new
            {
                category = isTeamkill ? "TEAMKILL" : "KILL",
                killerName = attackerName,
                killerSteamId = attackerId,
                killerRole = attackerRole,
                victimName = ev.Player.Nickname,
                victimSteamId = ev.Player.UserId,
                victimRole = victimRole,
                weapon = ev.DamageHandler.ToString(),
                zone = ev.Player.Room != null ? ev.Player.Room.Name.ToString() : "Facility",
                details = isTeamkill
                    ? $"ALERTE TEAMKILL : {attackerName} ({attackerRole}) a tué son allié {ev.Player.Nickname} ({victimRole})."
                    : $"KILL : {attackerName} ({attackerRole}) a éliminé {ev.Player.Nickname} ({victimRole})."
            });
        }

        private static async Task PushTelemetryAsync(object payload)
        {
            try
            {
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                await Http.PostAsync(WebhookEndpoint, content);
            }
            catch (Exception ex)
            {
                Logger.Error($"[LumisHostBridge] Erreur envoi télémétrie : {ex.Message}");
            }
        }
    }
}
`;
}

export const DeveloperSection: React.FC<DeveloperSectionProps> = ({
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
  staffList,
  staffRoles,
  vipTiers,
  customTeams,
  serverNameRich,
  pastebinId,
  onOpenAuthAndDnsModal
}) => {
  const [devSubTab, setDevSubTab] = useState<
    'api-console' | 'config-files' | 'plugins-bot' | 'webhook-tester'
  >('config-files');

  const [rawCommandInput, setRawCommandInput] = useState('');
  const [selectedConfigFile, setSelectedConfigFile] = useState<
    | 'mega-egg'
    | 'exiled-main'
    | 'exiled-perms'
    | 'vip-advantages'
    | 'staff-loadouts'
    | 'remoteadmin'
    | 'gameplay'
    | 'customteams'
  >('mega-egg');
  const [selectedCodeArtifact, setSelectedCodeArtifact] = useState<
    'csharp-plugin' | 'exiled-staff-plugin' | 'discord-bot'
  >('csharp-plugin');
  const [copiedCode, setCopiedCode] = useState(false);

  // Webhook Tester state
  const [testPayloadJson, setTestPayloadJson] = useState(
    JSON.stringify(
      {
        category: 'TEAMKILL',
        killerName: 'Test_Attacker_Dev',
        killerSteamId: '76561198000011111@steam',
        killerRole: 'NtfSergeant',
        victimName: 'Test_Victim_Dev',
        victimSteamId: '76561198000022222@steam',
        victimRole: 'Scientist',
        weapon: 'Grenade Frag HE',
        zone: 'Ascenseur Gate B',
        details: '[TEST API DEV] Teamkill détecté et transmis via POST /api/telemetry/ingest'
      },
      null,
      2
    )
  );
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);

  const handleRawCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCommandInput.trim()) return;
    onExecutePteroCommand(rawCommandInput.trim(), 'DEV CONSOLE');
    setRawCommandInput('');
  };

  const getMegaEggContent = () =>
    generatePterodactylMegaAllInOneEggJson(
      staffList,
      vipTiers,
      customTeams,
      serverNameRich,
      pastebinId,
      pteroUrl,
      pteroServerId,
      staffRoles,
      serverPort
    );

  const getActiveConfigFileContent = () => {
    if (selectedConfigFile === 'mega-egg') {
      return getMegaEggContent();
    }
    if (selectedConfigFile === 'exiled-main') {
      return generateExiledMainPortConfigYaml(staffRoles || [], vipTiers, customTeams, serverPort);
    }
    if (selectedConfigFile === 'exiled-perms') {
      return generateExiledPermissionsYaml(staffRoles || []);
    }
    if (selectedConfigFile === 'vip-advantages') {
      return generateVipAdvantagesYaml(vipTiers);
    }
    if (selectedConfigFile === 'staff-loadouts') {
      return generateStaffLoadoutsYaml(staffRoles || []);
    }
    if (selectedConfigFile === 'remoteadmin') {
      return generateRemoteAdminConfig(staffList, vipTiers, staffRoles);
    }
    if (selectedConfigFile === 'gameplay') {
      return generateGameplayConfig(
        serverNameRich,
        pastebinId,
        32,
        false,
        'lloydgarmadon2231@gmail.com'
      );
    }
    return generateExiledCustomTeamsYaml(customTeams);
  };

  const getActiveCodeArtifactContent = () => {
    if (selectedCodeArtifact === 'csharp-plugin') {
      return generateLabApiCSharpPluginCode('https://scpsl.lumishost.com');
    }
    if (selectedCodeArtifact === 'exiled-staff-plugin') {
      return generateExiledStaffAutoEquipPluginCode();
    }
    return generateDiscordBotCode(
      pteroUrl,
      pteroServerId,
      'LumisHost Site-19 FR',
      vipTiers,
      customTeams
    );
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestTelemetryIngest = async () => {
    setWebhookTestResult(null);
    try {
      const parsed = JSON.parse(testPayloadJson);
      const resp = await fetch('/api/telemetry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await resp.json();
      setWebhookTestResult(`HTTP ${resp.status} OK — Événement enregistré : ${JSON.stringify(data.event)}`);
      onExecutePteroCommand(
        `echo "[WEBHOOK DEV] Événement ${parsed.category} injecté dans l'API télémétrie"`,
        'DEV API'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'JSON invalide';
      setWebhookTestResult(`Erreur : ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Developer Header & Sub-Navigation */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              MEGA EGG TOUT-EN-UN PTERODACTYL 1.11.11 · SERVEUR SCP:SL 14.2 + EXILED + PANEL WEB + BOT DISCORD
            </div>
            <h2 className="text-xl font-bold text-white">
              Section Développeur &amp; Mega Egg Tout-En-Un LumisHost
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                handleDownload(
                  getMegaEggContent(),
                  'egg-lumishost-mega-tout-en-un.json'
                )
              }
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Télécharger le Mega Egg Tout-En-Un v2.3.0 (.json)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 w-fit">
          <button
            onClick={() => setDevSubTab('config-files')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              devSubTab === 'config-files'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            1. Mega Egg Tout-En-Un &amp; Fichiers Serveur
          </button>
          <button
            onClick={() => setDevSubTab('api-console')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              devSubTab === 'api-console'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            2. API Pterodactyl &amp; Console Brute
          </button>
          <button
            onClick={() => setDevSubTab('plugins-bot')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              devSubTab === 'plugins-bot'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            3. Plugin C# LabApi &amp; Code Bot Discord
          </button>
          <button
            onClick={() => setDevSubTab('webhook-tester')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              devSubTab === 'webhook-tester'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            4. Testeur API, OAuth2 &amp; DNS
          </button>
        </div>
      </div>

      {/* DEV TAB 1: PTERODACTYL API BRIDGE & RAW LOCALADMIN CONSOLE */}
      {devSubTab === 'api-console' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Raw LocalAdmin / LabApi Console */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Terminal Brut LocalAdmin 2.5.16 &amp; LabApi (192.99.42.203:{serverPort})
                </h3>
                <p className="text-xs text-slate-400">
                  Exécution bas-niveau vers `/api/client/servers/{pteroServerId}/command` et contrôle démon Wings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPowerAction('start')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  Start
                </button>
                <button
                  onClick={() => onPowerAction('restart')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Restart
                </button>
                <button
                  onClick={() => onPowerAction('stop')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#05070c] border border-slate-800 font-mono text-xs space-y-1.5 h-[360px] overflow-y-auto">
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

            <form onSubmit={handleRawCommandSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={rawCommandInput}
                onChange={(e) => setRawCommandInput(e.target.value)}
                placeholder="Commande brute LocalAdmin / LabApi (ex: reload config, plugins, seed, roundrestart, exit)..."
                className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                POST /command
              </button>
            </form>
          </div>

          {/* Right 5 Cols: Pterodactyl API Credentials & Sync */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  Identifiants API Client Pterodactyl (`LumisHost`)
                </h3>
              </div>
              <span
                className={`text-xs font-mono ${
                  liveApiConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'
                }`}
              >
                {liveApiConnected ? 'API CONNECTÉE' : 'ATTENTE CLÉ API'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endpoint Panel Pterodactyl
                </label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pteroUrl}
                    onChange={(e) => setPteroUrl(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clé API Client Pterodactyl (`ptlc_...`)
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={pteroApiKey}
                    onChange={(e) => setPteroApiKey(e.target.value)}
                    placeholder="ptlc_VotreCleApiClientLumisHost..."
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Server Identifier (8 car.)
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
                    Port Allocation (`192.99.42.203`)
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
                  Webhook Discord Logs Développeur &amp; Sanctions
                </label>
                <input
                  type="text"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-indigo-300"
                />
              </div>
            </div>

            {liveApiMetrics && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                <span className="text-slate-400">Télémétrie Conteneur :</span>
                <span className="text-emerald-400">
                  CPU {liveApiMetrics.cpuPercent}% · RAM {liveApiMetrics.ramGb} Go
                </span>
              </div>
            )}

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={onTestLivePteroConnection}
                disabled={isSyncingApi}
                className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                Tester GET /resources
              </button>
              <button
                onClick={onPushAllConfigsToPterodactyl}
                disabled={isSyncingApi}
                className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                POST /files/write
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEV TAB 2: MEGA ALL-IN-ONE EGG & SERVER CONFIG FILES */}
      {devSubTab === 'config-files' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <div className="text-sm font-bold text-amber-300">
              ★ EGG UNIQUE LUMISHOST v2.3.0 (`egg-lumishost-mega-tout-en-un.json`) — UTILISEZ CELUI-CI UNIQUEMENT
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Téléchargez-le avec le bouton jaune ci-dessus puis importez-le dans <span className="font-mono text-white">Admin → Nests → Update Egg</span> sur LumisHost (puis <span className="font-mono text-white">Settings → Reinstall Server</span>). Il inclut :
              <strong className="text-emerald-300"> 1. SCP:SL v14.2.9 + LabApi + EXILED 9.15.3</strong> ·
              <strong className="text-cyan-300"> 2. Configs Staff/Items/VIP</strong> ·
              <strong className="text-indigo-300"> 3. Bot Discord v14</strong> ·
              <strong className="text-amber-300"> 4. Panel Web v2.3.0 authentifié (`:1032`)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedConfigFile('mega-egg')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'mega-egg'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-amber-300 hover:text-white'
                }`}
              >
                ★ 1. GROS MEGA EGG TOUT-EN-UN (.json)
              </button>
              <button
                onClick={() => setSelectedConfigFile('remoteadmin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'remoteadmin'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. config_remoteadmin.txt
              </button>
              <button
                onClick={() => setSelectedConfigFile('gameplay')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'gameplay'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                3. config_gameplay.txt
              </button>
              <button
                onClick={() => setSelectedConfigFile('customteams')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'customteams'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                4. CustomTeams.yml
              </button>
              <button
                onClick={() => setSelectedConfigFile('exiled-main')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'exiled-main'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                5. {serverPort}-config.yml (EXILED 9)
              </button>
              <button
                onClick={() => setSelectedConfigFile('exiled-perms')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'exiled-perms'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                6. permissions.yml (EXILED)
              </button>
              <button
                onClick={() => setSelectedConfigFile('staff-loadouts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'staff-loadouts'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                7. StaffLoadouts.yml
              </button>
              <button
                onClick={() => setSelectedConfigFile('vip-advantages')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedConfigFile === 'vip-advantages'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                8. VipAdvantages.yml
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(selectedConfigFile === 'remoteadmin' ||
                selectedConfigFile === 'gameplay' ||
                selectedConfigFile === 'customteams' ||
                selectedConfigFile === 'exiled-main' ||
                selectedConfigFile === 'exiled-perms' ||
                selectedConfigFile === 'staff-loadouts' ||
                selectedConfigFile === 'vip-advantages') && (
                <button
                  onClick={onPushAllConfigsToPterodactyl}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Écrire sur `/home/container/.config/` via API
                </button>
              )}
              <button
                onClick={() => handleCopy(getActiveConfigFileContent())}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copier
              </button>
              {selectedConfigFile !== 'mega-egg' && (
                <button
                  onClick={() =>
                    handleDownload(
                      getActiveConfigFileContent(),
                      selectedConfigFile === 'exiled-main'
                        ? `${serverPort}-config.yml`
                        : selectedConfigFile === 'exiled-perms'
                        ? 'permissions.yml'
                        : selectedConfigFile === 'remoteadmin'
                        ? 'config_remoteadmin.txt'
                        : selectedConfigFile === 'gameplay'
                        ? 'config_gameplay.txt'
                        : selectedConfigFile === 'staff-loadouts'
                        ? 'StaffLoadouts.yml'
                        : selectedConfigFile === 'vip-advantages'
                        ? 'VipAdvantages.yml'
                        : 'CustomTeams.yml'
                    )
                  }
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger Fichier
                </button>
              )}
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#05070c] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[480px]">
            {getActiveConfigFileContent()}
          </pre>
        </div>
      )}

      {/* DEV TAB 3: C# LABAPI TELEMETRY PLUGIN & DISCORD.JS V14 BOT SOURCE CODE */}
      {devSubTab === 'plugins-bot' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedCodeArtifact('csharp-plugin')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedCodeArtifact === 'csharp-plugin'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                1. Plugin LabApi Télémétrie (`LumisHostTelemetryPlugin.cs`)
              </button>
              <button
                onClick={() => setSelectedCodeArtifact('exiled-staff-plugin')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedCodeArtifact === 'exiled-staff-plugin'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                2. Plugin EXILED 9 Kits Staff (`LumisHostStaffItemsPlugin.cs`)
              </button>
              <button
                onClick={() => setSelectedCodeArtifact('discord-bot')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedCodeArtifact === 'discord-bot'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                3. Bot Discord.js v14 (`bot-discord-scpsl.js`)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(getActiveCodeArtifactContent())}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copier le Code Source
              </button>
              <button
                onClick={() =>
                  handleDownload(
                    getActiveCodeArtifactContent(),
                    selectedCodeArtifact === 'csharp-plugin'
                      ? 'LumisHostTelemetryPlugin.cs'
                      : selectedCodeArtifact === 'exiled-staff-plugin'
                      ? 'LumisHostStaffItemsPlugin.cs'
                      : 'bot-discord-scpsl.js'
                  )
                }
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-[#05070c] border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[500px]">
            {getActiveCodeArtifactContent()}
          </pre>
        </div>
      )}

      {/* DEV TAB 4: TELEMETRY API PLAYGROUND, DISCORD OAUTH2 & DNS */}
      {devSubTab === 'webhook-tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: POST /api/telemetry/ingest Playground */}
          <div className="lg:col-span-7 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div>
              <div className="text-xs font-mono text-cyan-400">
                API REST PLAYGROUND · POST /api/telemetry/ingest
              </div>
              <h3 className="text-base font-semibold text-white">
                Simulateur de Payload Webhook (Kills, Teamkills, Connexions)
              </h3>
              <p className="text-xs text-slate-400">
                Testez l’endpoint HTTP utilisé par le plugin C# LabApi de votre serveur SCP:SL pour remonter les événements en direct
              </p>
            </div>

            <textarea
              rows={11}
              value={testPayloadJson}
              onChange={(e) => setTestPayloadJson(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300"
            />

            {webhookTestResult && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 break-all">
                {webhookTestResult}
              </div>
            )}

            <button
              onClick={handleTestTelemetryIngest}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Envoyer la requête POST /api/telemetry/ingest
            </button>
          </div>

          {/* Right: OAuth2 & DNS Quick Access */}
          <div className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">
                OAuth2 Discord &amp; Zones DNS LumisHost
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Gérez les URLs de redirection OAuth2 Discord (`/auth/callback`), vos clés `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`, ainsi que les enregistrements DNS `A` et `SRV` pour `play.lumishost.com:1031` et `scpsl.lumishost.com`.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-1.5">
              <div className="text-slate-400">Endpoints Backend Actifs :</div>
              <div className="text-emerald-400">POST /api/ptero/status</div>
              <div className="text-emerald-400">POST /api/ptero/command</div>
              <div className="text-emerald-400">POST /api/ptero/power</div>
              <div className="text-emerald-400">POST /api/ptero/files/write</div>
              <div className="text-emerald-400">POST /api/ptero/logs/sync</div>
              <div className="text-cyan-400">POST /api/telemetry/ingest</div>
              <div className="text-indigo-400">GET  /api/auth/discord/url</div>
              <div className="text-indigo-400">GET  /auth/callback</div>
            </div>

            <button
              onClick={onOpenAuthAndDnsModal}
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Ouvrir Configuration OAuth2 Discord &amp; DNS LumisHost
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
