import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Lock,
  Flame,
  Users,
  Sparkles,
  Code2
} from 'lucide-react';
import {
  AfficheSection,
  CustomTeam,
  INITIAL_CUSTOM_TEAMS,
  INITIAL_PANEL_ROLE_PERMISSIONS,
  INITIAL_SANCTIONS,
  INITIAL_STAFF,
  INITIAL_VIP_TIERS,
  SanctionRecord,
  StaffMember,
  VipTier,
  WebPanelRole,
  WebPanelRolePermissionMatrix
} from './data/scpslDefaults';
import { ConsoleLogEntry } from './components/PterodactylOverview';
import { InGameManagementPanel } from './components/InGameManagementPanel';
import { PlayerLogsAndKillsCenter } from './components/PlayerLogsAndKillsCenter';
import { TeamsAndVipStudio } from './components/TeamsAndVipStudio';
import { AfficheWowStudio } from './components/AfficheWowStudio';
import { EventModeController } from './components/EventModeController';
import { AdministrationCenter } from './components/AdministrationCenter';
import { DeveloperSection } from './components/DeveloperSection';
import {
  AuthenticatedDiscordUser,
  DiscordAuthAndDomainModal
} from './components/DiscordAuthAndDomainModal';
import {
  generateExiledCustomTeamsYaml,
  generateExiledMainPortConfigYaml,
  generateExiledPermissionsYaml,
  generateGameplayConfig,
  generateRemoteAdminConfig,
  generateStaffLoadoutsYaml,
  generateVipAdvantagesYaml
} from './utils/configGenerators';

type PrimaryNavTab = 'ingame' | 'logs' | 'content' | 'administration' | 'developer';

export default function App() {
  const [activeTab, setActiveTab] = useState<PrimaryNavTab>('ingame');
  const [contentSubTab, setContentSubTab] = useState<'events' | 'teams-vip' | 'affiche'>('events');

  // RBAC Panel Permissions State (Founder / Developer / Admin / Moderator / Helper)
  const [panelRoleMatrix, setPanelRoleMatrix] = useState<WebPanelRolePermissionMatrix[]>(
    INITIAL_PANEL_ROLE_PERMISSIONS
  );
  const [currentActiveRole, setCurrentActiveRole] = useState<WebPanelRole>('founder');

  const activeRolePermissions =
    panelRoleMatrix.find((r) => r.roleId === currentActiveRole) || panelRoleMatrix[0];

  // Discord OAuth2 Authentication & Domain Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [requireLoginGate, setRequireLoginGate] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedDiscordUser | null>({
    id: '985589556655054858',
    username: 'nathaniel_dagenais',
    globalName: 'Nathaniel Dagenais',
    avatarUrl: '',
    roleLabel: 'Fondateur O5 · scpsl.lumishost.com',
    authenticatedVia: 'staff_token',
    loggedInAt: '20:22'
  });

  // Listen for Discord OAuth2 Popup postMessage callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('lumishost.com')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.user) {
          setCurrentUser(event.data.user);
        } else {
          fetch('/api/auth/me')
            .then((r) => r.json())
            .then((d) => {
              if (d.user) setCurrentUser(d.user);
            })
            .catch(() => {});
        }
        setAuthModalOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Pterodactyl Server & Live API Bridge State (192.99.42.203:1031)
  const [serverState, setServerState] = useState<'running' | 'restarting' | 'offline'>('running');
  const [pteroUrl, setPteroUrl] = useState('https://panel.lumishost.com');
  const [pteroApiKey, setPteroApiKey] = useState('');
  const [pteroServerId, setPteroServerId] = useState('f8a9c41b');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [serverPort, setServerPort] = useState('1031');

  const [liveApiConnected, setLiveApiConnected] = useState(false);
  const [liveApiMetrics, setLiveApiMetrics] = useState<{
    cpuPercent: string;
    ramGb: string;
    serverTitle: string;
  } | null>(null);
  const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSyncingApi, setIsSyncingApi] = useState(false);

  // Shared Domain State
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [sanctions, setSanctions] = useState<SanctionRecord[]>(INITIAL_SANCTIONS);
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>(INITIAL_CUSTOM_TEAMS);
  const [vipTiers, setVipTiers] = useState<VipTier[]>(INITIAL_VIP_TIERS);

  // Affiche WOW & Pastebin State
  const [serverNameRich, setServerNameRich] = useState(
    '<color=#DC143C><b>[FR/QC] LUMISHOST SITE-19</b></color> <color=#FAFF86>│ PLAY.LUMISHOST.COM:1031 │ TEAMS CUSTOMS │ VIP</color>'
  );
  const [pastebinId, setPastebinId] = useState('K9xLm2pQ');
  const [discordInvite, setDiscordInvite] = useState('discord.gg/lumishost-scp');
  const [afficheSections, setAfficheSections] = useState<AfficheSection[]>([
    {
      id: 'sec-1',
      title: '━━━ ★ BIENVENUE SUR LUMISHOST SITE-19 ★ ━━━',
      titleColor: '#DC143C',
      accentColor: '#FAFF86',
      content:
        'Connexion directe : play.lumishost.com:1031 · Panel Web : scpsl.lumishost.com\nStaff actif 24/7 · Détection anti-Teamkill · Événements quotidiens à 21h00.'
    },
    {
      id: 'sec-2',
      title: '━━━ ⚔ ÉQUIPES & FACTIONS EXCLUSIVES ━━━',
      titleColor: '#00B7EB',
      accentColor: '#50C878',
      content:
        '• La Main du Serpent (Alliée aux SCPs)\n• Unité Fédérale U.I.U. (Renfort MTF)\n• Coalition Mondiale Occulte G.O.C. (Armement lourd 3-X)\n• FIM Alpha-1 "Bras Droit Rouge" (Garde du Conseil O5)'
    },
    {
      id: 'sec-3',
      title: '━━━ 📜 RÈGLEMENT ESSENTIEL DU COMPLEXE ━━━',
      titleColor: '#FF9966',
      accentColor: '#FFFFFF',
      content:
        '1. Respect obligatoire envers tous les joueurs et le Staff.\n2. Soundboard autorisé uniquement en Intercom (sans saturation).\n3. Teamkill et alliances interdites (sauf reddition Classe-D menotté).'
    }
  ]);

  // Event Mode State
  const [eventActive, setEventActive] = useState(false);
  const [activeEventTitle, setActiveEventTitle] = useState('Aucun événement actif');

  // Live Console Logs matching the user's real 192.99.42.203:1031 server
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'log-1',
      time: '20:21:26',
      origin: 'LABAPI 14.2.9',
      text: '[INFO] [LabApi] [LOADER] Loading all dependencies & plugins on port 1031.',
      level: 'exiled'
    },
    {
      id: 'log-2',
      time: '20:21:28',
      origin: 'LOCALADMIN',
      text: 'Config files loaded from /home/container/.config/SCP Secret Laboratory/config/1031/',
      level: 'info'
    },
    {
      id: 'log-3',
      time: '20:21:28',
      origin: 'NETWORK',
      text: 'Done, your server IP address is 192.99.42.203:1031 (play.lumishost.com:1031).',
      level: 'info'
    },
    {
      id: 'log-4',
      time: '20:21:49',
      origin: 'FACILITY',
      text: 'Scene Manager: Loaded scene Facility. Waiting for players... Server marked as running.',
      level: 'command'
    }
  ]);

  const appendLog = (text: string, origin = 'CONSOLE', level: ConsoleLogEntry['level'] = 'command') => {
    const time = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time,
        origin,
        text,
        level
      }
    ]);
  };

  const notifyDiscordWebhook = async (title: string, description: string, colorHex = '#DC143C') => {
    if (!discordWebhookUrl.trim()) return;
    try {
      await fetch('/api/discord/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl.trim(),
          title,
          description,
          colorHex
        })
      });
    } catch {
      // ignore webhook error quietly
    }
  };

  const handleTestLivePteroConnection = async () => {
    setApiError(null);
    setApiStatusMessage(null);

    if (!pteroApiKey.trim()) {
      setApiError(
        'Veuillez renseigner votre Clé API Client Pterodactyl (commençant par ptlc_...) générée dans Account → API Credentials sur LumisHost.'
      );
      return;
    }

    setIsSyncingApi(true);
    try {
      const resp = await fetch('/api/ptero/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelUrl: pteroUrl,
          apiKey: pteroApiKey,
          serverId: pteroServerId
        })
      });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        setLiveApiConnected(false);
        setApiError(data.error || 'Échec de connexion au panel LumisHost.');
        appendLog(`Échec liaison API Pterodactyl : ${data.error}`, 'API ERROR', 'warn');
      } else {
        setLiveApiConnected(true);
        const state = data.state === 'running' ? 'running' : data.state === 'offline' ? 'offline' : 'restarting';
        setServerState(state);

        const memBytes = data.resources?.memory_bytes || 0;
        const cpuAbs = data.resources?.cpu_absolute || 0;
        setLiveApiMetrics({
          cpuPercent: Number(cpuAbs).toFixed(1),
          ramGb: (memBytes / 1024 ** 3).toFixed(2),
          serverTitle: data.serverName || 'Site-19 SCP Secret Laboratory'
        });

        setApiStatusMessage(
          `Connecté en direct à "${data.serverName}" (${data.state.toUpperCase()}) sur LumisHost (192.99.42.203:${serverPort}) !`
        );
        appendLog(
          `Connexion API réussie au serveur "${data.serverName}" (État: ${data.state}, RAM: ${(memBytes / 1024 ** 3).toFixed(2)} Go).`,
          'API LUMISHOST',
          'info'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setApiError(`Erreur réseau lors du test Pterodactyl : ${msg}`);
    } finally {
      setIsSyncingApi(false);
    }
  };

  const handlePushAllConfigsToPterodactyl = async () => {
    setApiError(null);
    setApiStatusMessage(null);

    if (!pteroApiKey.trim()) {
      setApiError(
        'Entrez votre Clé API Client Pterodactyl (ptlc_...) pour écrire automatiquement les fichiers dans /home/container/.config/SCP Secret Laboratory/config/1031/.'
      );
      return;
    }

    setIsSyncingApi(true);
    try {
      const remoteAdminContent = generateRemoteAdminConfig(staffList, vipTiers, panelRoleMatrix);
      const gameplayContent = generateGameplayConfig(
        serverNameRich,
        pastebinId,
        32,
        false,
        'lloydgarmadon2231@gmail.com'
      );
      const customTeamsContent = generateExiledCustomTeamsYaml(customTeams);
      const vipAdvantagesContent = generateVipAdvantagesYaml(vipTiers);
      const staffLoadoutsContent = generateStaffLoadoutsYaml(panelRoleMatrix);
      const exiledMainConfigContent = generateExiledMainPortConfigYaml(
        panelRoleMatrix,
        vipTiers,
        customTeams,
        serverPort
      );
      const exiledPermissionsContent = generateExiledPermissionsYaml(panelRoleMatrix);

      const filesToPush = [
        {
          path: `/.config/SCP Secret Laboratory/config/${serverPort}/config_remoteadmin.txt`,
          content: remoteAdminContent
        },
        {
          path: `/.config/SCP Secret Laboratory/config/${serverPort}/config_gameplay.txt`,
          content: gameplayContent
        },
        {
          path: `/.config/EXILED/Configs/${serverPort}-config.yml`,
          content: exiledMainConfigContent
        },
        {
          path: '/.config/EXILED/Configs/permissions.yml',
          content: exiledPermissionsContent
        },
        {
          path: '/.config/EXILED/Configs/CustomTeams.yml',
          content: customTeamsContent
        },
        {
          path: '/.config/EXILED/Configs/VipAdvantages.yml',
          content: vipAdvantagesContent
        },
        {
          path: '/.config/EXILED/Configs/StaffLoadouts.yml',
          content: staffLoadoutsContent
        }
      ];

      for (const file of filesToPush) {
        const resp = await fetch('/api/ptero/files/write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panelUrl: pteroUrl,
            apiKey: pteroApiKey,
            serverId: pteroServerId,
            filePath: file.path,
            content: file.content
          })
        });

        if (!resp.ok) {
          const errData = await resp.json();
          throw new Error(errData.error || `Erreur sur ${file.path}`);
        }
        appendLog(`Fichier synchronisé sur LumisHost : ${file.path}`, 'API FILES', 'info');
      }

      await fetch('/api/ptero/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelUrl: pteroUrl,
          apiKey: pteroApiKey,
          serverId: pteroServerId,
          command: 'reload remoteadmin'
        })
      });

      setApiStatusMessage(
        `Synchronisation réussie sur le port ${serverPort} : config_remoteadmin.txt, config_gameplay.txt, CustomTeams.yml et VipAdvantages.yml écrits !`
      );
      await notifyDiscordWebhook(
        'Synchronisation Configurations SCP:SL → LumisHost',
        `Les fichiers config_remoteadmin.txt, config_gameplay.txt, CustomTeams.yml et VipAdvantages.yml ont été mis à jour sur play.lumishost.com:${serverPort}.`,
        '#16A34A'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setApiError(`Échec de l’écriture sur Pterodactyl : ${msg}`);
      appendLog(`Erreur écriture fichiers API : ${msg}`, 'API ERROR', 'warn');
    } finally {
      setIsSyncingApi(false);
    }
  };

  const pushConsoleCommand = async (cmd: string, origin = 'CONSOLE') => {
    appendLog(
      `Exécution -> ${cmd}`,
      origin,
      origin.includes('EXILED') || origin.includes('C.A.S.S.I.E.') ? 'exiled' : 'command'
    );

    if (pteroApiKey.trim()) {
      try {
        const resp = await fetch('/api/ptero/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panelUrl: pteroUrl,
            apiKey: pteroApiKey,
            serverId: pteroServerId,
            command: cmd
          })
        });
        if (!resp.ok) {
          const errData = await resp.json();
          appendLog(`Retour API Pterodactyl : ${errData.error}`, 'API WARN', 'warn');
        } else {
          appendLog(`Commande exécutée sur LumisHost (${pteroServerId}).`, 'API LUMISHOST', 'info');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau';
        appendLog(`Erreur API Pterodactyl : ${msg}`, 'API WARN', 'warn');
      }
    }

    if (discordWebhookUrl.trim()) {
      await notifyDiscordWebhook(
        `Action ${origin} sur play.lumishost.com:${serverPort}`,
        `Exécuté par **${currentUser?.globalName || 'Staff'}** :\n\`\`\`${cmd}\`\`\``,
        '#D97706'
      );
    }
  };

  const handlePowerAction = async (signal: 'start' | 'restart' | 'stop') => {
    if (pteroApiKey.trim()) {
      try {
        const resp = await fetch('/api/ptero/power', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panelUrl: pteroUrl,
            apiKey: pteroApiKey,
            serverId: pteroServerId,
            signal
          })
        });
        if (resp.ok) {
          appendLog(
            `Signal d'alimentation ${signal.toUpperCase()} exécuté sur LumisHost.`,
            'API LUMISHOST',
            'info'
          );
        } else {
          const errData = await resp.json();
          appendLog(`Erreur signal power API : ${errData.error}`, 'API WARN', 'warn');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau';
        appendLog(`Erreur connexion API Power : ${msg}`, 'API WARN', 'warn');
      }
    }

    if (signal === 'stop') {
      setServerState('offline');
      appendLog('Signal STOP envoyé au démon Pterodactyl Wings. Serveur arrêté.', 'PTERODACTYL', 'warn');
    } else if (signal === 'restart') {
      setServerState('restarting');
      appendLog('Redémarrage du conteneur SCP:SL (192.99.42.203:1031)...', 'PTERODACTYL', 'info');
      setTimeout(() => {
        setServerState('running');
        appendLog('Serveur SCP:SL en ligne (60 TPS). Waiting for players...', 'PTERODACTYL', 'info');
      }, 1200);
    } else {
      setServerState('running');
      appendLog(`Démarrage du conteneur SCP:SL terminé sur play.lumishost.com:${serverPort}.`, 'PTERODACTYL', 'info');
    }
  };

  // Strict RBAC check: only Founder & Developer can access Developer tab
  const canSeeDeveloperTab =
    (currentActiveRole === 'founder' || currentActiveRole === 'developer') &&
    activeRolePermissions.canAccessDeveloperTab;

  const canSeeAdministrationTab = activeRolePermissions.canAccessAdministrationTab;
  const canSeeEventsAndTeamsTab = activeRolePermissions.canAccessEventsAndTeams;

  // Full-Screen Discord Login Gate when user logs out or locks session
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-xl border border-slate-800 bg-slate-900 space-y-5 text-center">
          <div className="space-y-1">
            <div className="text-xs font-mono text-indigo-400">
              PORTAIL STAFF SÉCURISÉ · SCPSL.LUMISHOST.COM
            </div>
            <h1 className="text-2xl font-bold text-white">
              LumisHost SCP:SL Panel
            </h1>
            <p className="text-xs text-slate-400">
              Connectez-vous avec votre compte Discord autorisé pour accéder à la gestion en jeu, au killfeed et aux sanctions de <span className="font-mono text-amber-300">play.lumishost.com:{serverPort}</span>.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full px-4 py-3 text-xs font-semibold rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Se Connecter avec Discord (OAuth2)
            </button>

            <button
              onClick={() =>
                setCurrentUser({
                  id: '482910394819203112',
                  username: 'nathaniel_dagenais',
                  globalName: 'Nathaniel Dagenais',
                  avatarUrl: '',
                  roleLabel: 'Fondateur O5 · scpsl.lumishost.com',
                  authenticatedVia: 'staff_token',
                  loggedInAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                })
              }
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Accès Direct Fondateur (Nathaniel Dagenais)
            </button>
          </div>
        </div>

        <DiscordAuthAndDomainModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          currentUser={currentUser}
          onUserAuthenticated={(u) => {
            setCurrentUser(u);
            setAuthModalOpen(false);
          }}
          onLogout={() => setCurrentUser(null)}
          requireLoginGate={requireLoginGate}
          setRequireLoginGate={setRequireLoginGate}
          serverPort={serverPort}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-950/90 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#ingame"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('ingame');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          LumisHost RemoteAdmin
        </a>

        {/* Zone 2: RBAC-filtered single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-300 overflow-x-auto">
          <a
            href="#ingame"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('ingame');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'ingame'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Contrôle En Jeu
          </a>
          <a
            href="#logs"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('logs');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'logs'
                ? 'text-amber-400 underline underline-offset-8 decoration-2'
                : 'hover:text-white'
            }`}
          >
            Joueurs, Logs &amp; Kills
          </a>
          {canSeeEventsAndTeamsTab && (
            <a
              href="#content"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('content');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'content'
                  ? 'text-amber-400 underline underline-offset-8 decoration-2'
                  : 'hover:text-white'
              }`}
            >
              Events &amp; Teams
            </a>
          )}
          {canSeeAdministrationTab && (
            <a
              href="#administration"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('administration');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'administration'
                  ? 'text-amber-400 underline underline-offset-8 decoration-2'
                  : 'hover:text-white'
              }`}
            >
              Administration
            </a>
          )}
          {canSeeDeveloperTab && (
            <a
              href="#developer"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('developer');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                activeTab === 'developer'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'hover:text-white'
              }`}
            >
              Développeur
            </a>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#5865F2] rounded-lg hover:bg-[#4752C4] transition-colors whitespace-nowrap shrink-0"
          >
            Discord · {currentUser.globalName}
          </button>
        </div>
      </header>

      {/* Live Facility Context & Active RBAC Role Switcher Bar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 px-6 py-2">
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-300 font-mono">
            <span>Panel : <strong className="text-indigo-300">scpsl.lumishost.com</strong></span>
            <span className="text-slate-600">·</span>
            <span>Serveur : <strong className="text-emerald-400">play.lumishost.com:{serverPort}</strong></span>
            <span className="text-slate-600">·</span>
            <span>Statut : <strong className="text-white">{serverState.toUpperCase()}</strong></span>
            {eventActive && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-bold">EVENT : {activeEventTitle}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Active RBAC Role Simulator / Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 font-mono">Permission Active :</span>
              <select
                value={currentActiveRole}
                onChange={(e) => {
                  const nextRole = e.target.value as WebPanelRole;
                  setCurrentActiveRole(nextRole);
                  const nextPerms =
                    panelRoleMatrix.find((r) => r.roleId === nextRole) || panelRoleMatrix[0];
                  if (
                    activeTab === 'developer' &&
                    !(nextRole === 'founder' || nextRole === 'developer')
                  ) {
                    setActiveTab('ingame');
                  } else if (
                    activeTab === 'administration' &&
                    !nextPerms.canAccessAdministrationTab
                  ) {
                    setActiveTab('ingame');
                  } else if (activeTab === 'content' && !nextPerms.canAccessEventsAndTeams) {
                    setActiveTab('ingame');
                  }
                }}
                className="bg-transparent font-mono font-bold text-amber-300 focus:outline-none cursor-pointer"
              >
                {panelRoleMatrix.map((roleOpt) => (
                  <option key={roleOpt.roleId} value={roleOpt.roleId} className="bg-slate-950 text-white">
                    {roleOpt.label} ({roleOpt.badgeText})
                  </option>
                ))}
              </select>
            </div>

            {canSeeDeveloperTab && (
              <button
                onClick={() => setActiveTab('developer')}
                className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                Mega Egg &amp; Dev ({consoleLogs.length} logs)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container (1380px max-w) */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-6">
        {/* 1. IN-GAME REMOTEADMIN & FACILITY CONTROL */}
        {activeTab === 'ingame' && (
          <InGameManagementPanel
            serverState={serverState}
            serverPort={serverPort}
            customTeams={customTeams}
            vipTiers={vipTiers}
            staffList={staffList}
            sanctions={sanctions}
            setSanctions={setSanctions}
            activeRolePermissions={activeRolePermissions}
            onExecutePteroCommand={pushConsoleCommand}
            onPowerAction={handlePowerAction}
          />
        )}

        {/* 2. PROFILS JOUEURS (EN LIGNE & HORS-LIGNE / OFFLINE), KILLFEED, LOGS & SANCTIONS */}
        {activeTab === 'logs' && (
          <PlayerLogsAndKillsCenter
            sanctions={sanctions}
            setSanctions={setSanctions}
            staffList={staffList}
            setStaffList={setStaffList}
            customTeams={customTeams}
            vipTiers={vipTiers}
            pteroUrl={pteroUrl}
            pteroApiKey={pteroApiKey}
            pteroServerId={pteroServerId}
            serverPort={serverPort}
            onExecutePteroCommand={pushConsoleCommand}
          />
        )}

        {/* 3. IN-GAME EVENTS, CUSTOM TEAMS, VIP TAGS & AFFICHE */}
        {activeTab === 'content' && canSeeEventsAndTeamsTab && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 w-fit">
              <button
                onClick={() => setContentSubTab('events')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  contentSubTab === 'events'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                1. Mode Event, Mutateurs &amp; C.A.S.S.I.E.
              </button>
              <button
                onClick={() => setContentSubTab('teams-vip')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  contentSubTab === 'teams-vip'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                2. Équipes Customs &amp; Tags VIP
              </button>
              <button
                onClick={() => setContentSubTab('affiche')}
                className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  contentSubTab === 'affiche'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                3. Affiche Serveur "WOW" (Pastebin)
              </button>
            </div>

            {contentSubTab === 'events' && (
              <EventModeController
                eventActive={eventActive}
                setEventActive={setEventActive}
                activeEventTitle={activeEventTitle}
                setActiveEventTitle={setActiveEventTitle}
                onExecutePteroCommand={pushConsoleCommand}
              />
            )}

            {contentSubTab === 'teams-vip' && (
              <TeamsAndVipStudio
                customTeams={customTeams}
                setCustomTeams={setCustomTeams}
                vipTiers={vipTiers}
                setVipTiers={setVipTiers}
                staffList={staffList}
                onExecutePteroCommand={pushConsoleCommand}
              />
            )}

            {contentSubTab === 'affiche' && (
              <AfficheWowStudio
                serverNameRich={serverNameRich}
                setServerNameRich={setServerNameRich}
                pastebinId={pastebinId}
                setPastebinId={setPastebinId}
                discordInvite={discordInvite}
                setDiscordInvite={setDiscordInvite}
                sections={afficheSections}
                setSections={setAfficheSections}
                customTeams={customTeams}
                vipTiers={vipTiers}
                onPushConsoleLog={(msg) => pushConsoleCommand(msg, 'AFFICHE WOW')}
              />
            )}
          </div>
        )}

        {/* 4. ADMINISTRATION TAB (VIP EXTRA ITEMS PER TEAM & WEB PANEL PERMISSIONS MATRIX) */}
        {activeTab === 'administration' && (
          canSeeAdministrationTab ? (
            <AdministrationCenter
              panelRoleMatrix={panelRoleMatrix}
              setPanelRoleMatrix={setPanelRoleMatrix}
              currentActiveRole={currentActiveRole}
              setCurrentActiveRole={setCurrentActiveRole}
              staffList={staffList}
              setStaffList={setStaffList}
              vipTiers={vipTiers}
              setVipTiers={setVipTiers}
              onExecutePteroCommand={pushConsoleCommand}
              onPushAllConfigsToPterodactyl={handlePushAllConfigsToPterodactyl}
              serverPort={serverPort}
            />
          ) : (
            <div className="p-8 rounded-xl border border-rose-500/40 bg-slate-900 text-center space-y-3">
              <Lock className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">
                Accès Refusé — Section Administration Verrouillée
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Votre grade actuel (<strong className="text-amber-300">{activeRolePermissions.label}</strong>) ne dispose pas de la permission <span className="font-mono text-white">canAccessAdministrationTab</span>.
              </p>
            </div>
          )
        )}

        {/* 5. DEVELOPER SECTION (STRICTLY LOCKED TO FOUNDER & DEVELOPER ONLY) */}
        {activeTab === 'developer' && (
          canSeeDeveloperTab ? (
            <DeveloperSection
              serverState={serverState}
              onPowerAction={handlePowerAction}
              consoleLogs={consoleLogs}
              onExecutePteroCommand={pushConsoleCommand}
              pteroUrl={pteroUrl}
              setPteroUrl={setPteroUrl}
              pteroApiKey={pteroApiKey}
              setPteroApiKey={setPteroApiKey}
              pteroServerId={pteroServerId}
              setPteroServerId={setPteroServerId}
              discordWebhookUrl={discordWebhookUrl}
              setDiscordWebhookUrl={setDiscordWebhookUrl}
              serverPort={serverPort}
              setServerPort={setServerPort}
              liveApiConnected={liveApiConnected}
              liveApiMetrics={liveApiMetrics}
              apiStatusMessage={apiStatusMessage}
              apiError={apiError}
              isSyncingApi={isSyncingApi}
              onTestLivePteroConnection={handleTestLivePteroConnection}
              onPushAllConfigsToPterodactyl={handlePushAllConfigsToPterodactyl}
              staffList={staffList}
              staffRoles={panelRoleMatrix}
              vipTiers={vipTiers}
              customTeams={customTeams}
              serverNameRich={serverNameRich}
              pastebinId={pastebinId}
              onOpenAuthAndDnsModal={() => setAuthModalOpen(true)}
            />
          ) : (
            <div className="p-8 rounded-xl border border-rose-500/40 bg-slate-900 text-center space-y-3">
              <Lock className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">
                Accès Strictement Réservé au Fondateur O5 &amp; aux Développeurs
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Les Administrateurs, Modérateurs et Helpeurs n’ont pas accès à la Section Développeur (Mega Egg, clés API Pterodactyl, Console brute et code source).
              </p>
            </div>
          )
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 max-w-[1380px] w-full mx-auto">
        <div>
          scpsl.lumishost.com — Panel de Modération &amp; Gestion En Jeu (play.lumishost.com:{serverPort})
        </div>
        <div className="flex items-center gap-4">
          {canSeeAdministrationTab && (
            <>
              <button
                onClick={() => setActiveTab('administration')}
                className="hover:text-amber-300 transition-colors"
              >
                Administration &amp; VIP
              </button>
              <span>·</span>
            </>
          )}
          {canSeeDeveloperTab && (
            <>
              <button
                onClick={() => setActiveTab('developer')}
                className="hover:text-cyan-300 transition-colors"
              >
                Espace Développeur
              </button>
              <span>·</span>
            </>
          )}
          <button
            onClick={() => setAuthModalOpen(true)}
            className="hover:text-slate-300 transition-colors"
          >
            OAuth2 Discord &amp; DNS
          </button>
          <span>·</span>
          <button
            onClick={() => setCurrentUser(null)}
            className="text-rose-400 hover:text-rose-300 transition-colors"
          >
            Verrouiller Session
          </button>
        </div>
      </footer>

      {/* Discord OAuth2 & DNS Configuration Modal */}
      <DiscordAuthAndDomainModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserAuthenticated={(u) => {
          setCurrentUser(u);
          setAuthModalOpen(false);
        }}
        onLogout={() => {
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
          setCurrentUser(null);
          setAuthModalOpen(false);
        }}
        requireLoginGate={requireLoginGate}
        setRequireLoginGate={setRequireLoginGate}
        serverPort={serverPort}
      />
    </div>
  );
}
