import { gzipSync, strToU8 } from 'fflate';
import {
  CustomTeam,
  StaffMember,
  VipTier,
  WebPanelRolePermissionMatrix
} from '../data/scpslDefaults';
import {
  generateEmbeddedWebPanelHtml,
  generateEmbeddedWebPanelServerJs
} from './webpanelBundle';

function toBase64Gzip(text: string): string {
  const compressed = gzipSync(strToU8(text));
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < compressed.length; i += chunkSize) {
    binary += String.fromCharCode(...compressed.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const mapPanelRoleToRaKey = (roleId: string): string =>
  roleId === 'founder' ? 'owner' : roleId;

export function generateRemoteAdminConfig(
  staffList: StaffMember[],
  vipTiers: VipTier[],
  staffRoles?: WebPanelRolePermissionMatrix[]
): string {
  const memberLines: string[] = [];
  staffList.forEach((s) => {
    memberLines.push(` - ${s.steamId}: ${s.roleId} # ${s.username} (Discord: ${s.discordTag})`);
  });
  vipTiers.forEach((tier) => {
    tier.assignedPlayers.forEach((player) => {
      memberLines.push(` - ${player.steamId}: ${tier.id} # VIP: ${player.name} (${tier.name})`);
    });
  });

  const roleDefs: string[] = [];
  const addedRoles = new Set<string>();
  const rolePermissionsMap = new Map<string, string[]>();

  if (staffRoles && staffRoles.length > 0) {
    staffRoles.forEach((role) => {
      const raKey = mapPanelRoleToRaKey(role.roleId);
      if (!addedRoles.has(raKey)) {
        addedRoles.add(raKey);
        rolePermissionsMap.set(raKey, role.raPermissions || []);
        roleDefs.push(
          `${raKey}_badge: ${role.badgeText}\n${raKey}_color: ${role.badgeColorId}\n${raKey}_cover: true\n${raKey}_hidden: false\n${raKey}_kick_power: ${role.kickPower}\n${raKey}_required_kick_power: ${role.requiredKickPower}`
        );
      }
    });
  }

  staffList.forEach((s) => {
    if (!addedRoles.has(s.roleId)) {
      addedRoles.add(s.roleId);
      rolePermissionsMap.set(s.roleId, s.permissions || []);
      roleDefs.push(
        `${s.roleId}_badge: ${s.badgeText}\n${s.roleId}_color: ${s.badgeColor}\n${s.roleId}_cover: true\n${s.roleId}_hidden: false\n${s.roleId}_kick_power: ${s.roleId === 'owner' ? 255 : s.roleId === 'admin' ? 100 : 50}\n${s.roleId}_required_kick_power: ${s.roleId === 'owner' ? 255 : s.roleId === 'admin' ? 100 : 50}`
      );
    }
  });

  vipTiers.forEach((tier) => {
    roleDefs.push(
      `${tier.id}_badge: ${tier.badgeText}\n${tier.id}_color: ${tier.badgeColor}\n${tier.id}_cover: true\n${tier.id}_hidden: false\n${tier.id}_kick_power: 0\n${tier.id}_required_kick_power: 1`
    );
  });

  const allRoleKeys = [
    ...Array.from(addedRoles),
    ...vipTiers.map((t) => t.id)
  ];

  const allPermissions = [
    'KickingAndShortTermBanning',
    'BanningUpToDay',
    'LongTermBanning',
    'ForceclassSelf',
    'ForceclassToSpectator',
    'ForceclassWithoutRestrictions',
    'GiveItems',
    'WarheadEvents',
    'RespawnEvents',
    'RoundEvents',
    'SetGroup',
    'GameplayData',
    'FacilityManagement',
    'PlayersManagement',
    'PermissionsManagement',
    'ServerConsoleCommands',
    'ViewHiddenBadges',
    'ServerConfigs',
    'Broadcasting',
    'PlayerSensitiveDataAccess',
    'Noclip',
    'AFKImmunity',
    'EventsMode'
  ];

  const permLines = allPermissions.map((perm) => {
    const rolesWithPerm = Array.from(addedRoles).filter((rId) => {
      if (rId === 'owner') return true;
      const rolePerms = rolePermissionsMap.get(rId);
      if (rolePerms && rolePerms.includes(perm)) return true;
      const staff = staffList.find((s) => s.roleId === rId);
      return staff ? staff.permissions.includes(perm) : false;
    });
    return ` - ${perm}: [${rolesWithPerm.join(', ')}]`;
  });

  return `# ====================================================================
# SCP: SECRET LABORATORY - CONFIG_REMOTEADMIN.TXT
# Chemin Pterodactyl : /home/container/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt
# ====================================================================

Members:
${memberLines.join('\n')}

enable_staff_access: true
enable_manager_access: true
enable_banteam_access: true
enable_banteam_reserved_slots: true
enable_banteam_bypass_geoblocking: true

# Définition des badges Staff & Tags VIP
${roleDefs.join('\n\n')}

Roles:
${allRoleKeys.map((k) => ` - ${k}`).join('\n')}

Permissions:
${permLines.join('\n')}
`;
}

export function generateGameplayConfig(
  serverNameRich: string,
  pastebinId: string,
  maxPlayers = 32,
  friendlyFire = false,
  contactEmail = 'lloydgarmadon2231@gmail.com'
): string {
  return `# ====================================================================
# SCP: SECRET LABORATORY - CONFIG_GAMEPLAY.TXT
# Serveur : play.lumishost.com:1031 · Panel Web : scpsl.lumishost.com
# Chemin Pterodactyl : /home/container/.config/SCP Secret Laboratory/config/1031/config_gameplay.txt
# ====================================================================

server_name: ${serverNameRich}
contact_email: ${contactEmail}
pastebin_info_id: ${pastebinId}
serverinfo_pastebin_id: ${pastebinId}
maximum_players: ${maxPlayers}
friendly_fire: ${friendlyFire}
friendly_fire_multiplier: 0.4
player_list_title: <color=#DC143C><b>LUMISHOST SITE-19</b></color> — <color=#FAFF86>PLAY.LUMISHOST.COM:1031</color>
intercom_cooldown: 120
intercom_max_speech_time: 20
spawn_protect_disable: false
spawn_protect_time: 8
auto_round_restart_time: 10
`;
}

export function generateExiledCustomTeamsYaml(teams: CustomTeam[]): string {
  const teamBlocks = teams.map((t, index) => {
    return `  - id: ${100 + index}
    name: "${t.name}"
    role_key: "${t.roleKey}"
    description: "${t.subtitle}"
    custom_info: "${t.name.toUpperCase()}"
    badge_color: "${t.badgeColor}"
    max_health: ${t.hp}
    base_role: "${t.baseModel}"
    spawn_chance_percent: ${t.spawnChance}
    max_players_per_wave: ${t.maxPlayersPerWave}
    spawn_location: "${t.spawnZone}"
    friendly_factions: [${t.friendlyWith.map((f) => `"${f}"`).join(', ')}]
    cassie_announcement: "${t.cassieAnnouncement}"
    cassie_translation: "${t.cassieSubtitles}"
    inventory:
${t.inventory.map((item) => `      - "${item}"`).join('\n')}`;
  });

  return `# ====================================================================
# EXILED PLUGIN: CustomRoles & CustomTeams Configuration
# Chemin Pterodactyl : /home/container/.config/EXILED/Configs/CustomTeams.yml
# ====================================================================

custom_teams_system:
  is_enabled: true
  debug: false
  enable_custom_respawn_waves: true
  display_spawn_broadcast: true
  spawn_broadcast_duration: 8
  teams:
${teamBlocks.join('\n\n')}
`;
}

export function generateVipAdvantagesYaml(vipTiers: VipTier[]): string {
  const tierBlocks = vipTiers.map((tier) => {
    const loadoutBlocks = (tier.factionLoadouts || []).map((loadout) => {
      const itemsList =
        loadout.extraItems.length > 0
          ? `\n${loadout.extraItems.map((it) => `          - "${it}"`).join('\n')}`
          : ' []';
      return `      ${loadout.factionKey}:
        label: "${loadout.factionLabel}"
        bonus_hp: ${loadout.bonusHp}
        bonus_ahp: ${loadout.bonusAhp}
        spawn_chance_boost_percent: ${loadout.spawnChanceBoostPercent}
        extra_items:${itemsList}`;
    });

    const playersList =
      tier.assignedPlayers.length > 0
        ? `\n${tier.assignedPlayers.map((p) => `      - "${p.steamId}" # ${p.name} (Exp: ${p.expiresAt})`).join('\n')}`
        : ' []';

    return `  ${tier.id}:
    display_name: "${tier.name}"
    badge_text: "${tier.badgeText}"
    badge_color: "${tier.badgeColor}"
    reserved_slot: ${tier.reservedSlot ? 'true' : 'false'}
    priority_event_queue: ${tier.priorityEventQueue ? 'true' : 'false'}
    custom_kill_effect: ${tier.customKillEffect ? 'true' : 'false'}
    assigned_steam_ids:${playersList}
    team_loadouts:
${loadoutBlocks.join('\n')}`;
  });

  return `# ====================================================================
# EXILED / LABAPI PLUGIN: VipAdvantages & Team Spawn Loadouts
# Chemin Pterodactyl : /home/container/.config/EXILED/Configs/VipAdvantages.yml
# Donne automatiquement des items bonus, HP/AHP et priorite spawn selon la Team !
# ====================================================================

vip_advantages_system:
  is_enabled: true
  debug: false
  broadcast_on_vip_spawn: true
  broadcast_duration: 5
  broadcast_message: "<color=#FAFF86><b>[AVANTAGE VIP]</b></color> Équipement bonus <color=#DC143C>{TIER}</color> reçu pour votre équipe ({TEAM}) !"
  tiers:
${tierBlocks.join('\n\n')}
`;
}

export function generateStaffLoadoutsYaml(
  staffRoles: WebPanelRolePermissionMatrix[]
): string {
  const blocks = staffRoles.map((role) => {
    const raKey = mapPanelRoleToRaKey(role.roleId);
    const itemsBlock =
      role.staffItems.length > 0
        ? `\n${role.staffItems.map((it) => `      - ${it}`).join('\n')}`
        : ' []';
    const autoEquip = role.autoEquipOnSpawn !== false;
    const onlyTutorial = role.equipOnlyInTutorialMode !== false;
    const clearInv = Boolean(role.clearInventoryBeforeEquip);

    return `  ${raKey}:
    display_name: "${role.label}"
    badge_text: "${role.badgeText}"
    badge_color: "${role.badgeColorId}"
    kick_power: ${role.kickPower}
    auto_equip_on_spawn: ${autoEquip ? 'true' : 'false'}
    equip_only_in_tutorial_mode: ${onlyTutorial ? 'true' : 'false'}
    clear_inventory_before_equip: ${clearInv ? 'true' : 'false'}
    items:${itemsBlock}`;
  });

  return `# ====================================================================
# EXILED 9 PLUGIN: LumisHostStaffItems (Équipement Auto par Rôle Staff)
# Chemin Pterodactyl : /home/container/.config/EXILED/Configs/StaffLoadouts.yml
# Donne automatiquement les Items Staff configurés selon le rôle RemoteAdmin
# ====================================================================

lumishost_staff_loadouts:
  is_enabled: true
  debug: false
  give_delay_seconds: 0.6
  broadcast_on_equip: true
  broadcast_duration: 4
  broadcast_message: "<color=#FAFF86><b>[STAFF SITE-19]</b></color> Kit <color=#00B7EB>{ROLE}</color> équipé automatiquement ({COUNT} items)."
  roles:
${blocks.join('\n\n')}
`;
}

export function generateExiledPermissionsYaml(
  staffRoles: WebPanelRolePermissionMatrix[]
): string {
  const roleBlocks = staffRoles.map((role) => {
    const raKey = mapPanelRoleToRaKey(role.roleId);
    if (role.roleId === 'founder' || role.roleId === 'developer') {
      return `${raKey}:
  inheritance: []
  permissions:
    - '.*'`;
    }
    const perms: string[] = ['lumishost.staff.kit', 'exiled.noclip'];
    if (role.canAccessEventsAndTeams) {
      perms.push('customteams.*', 'lumishost.events.*');
    }
    if (role.canBanPlayers) {
      perms.push('exiled.ban', 'exiled.kick');
    }
    if (role.canManageStaffRa) {
      perms.push('exiled.admin.*');
    }
    return `${raKey}:
  inheritance: []
  permissions:
${perms.map((p) => `    - '${p}'`).join('\n')}`;
  });

  return `# ====================================================================
# EXILED 9 PERMISSIONS CONFIG
# Chemin Pterodactyl : /home/container/.config/EXILED/Configs/permissions.yml
# Synchronisé avec config_remoteadmin.txt (Admin / Modo / Rôles Customs)
# ====================================================================

${roleBlocks.join('\n\n')}
`;
}

export function generateExiledMainPortConfigYaml(
  staffRoles: WebPanelRolePermissionMatrix[],
  vipTiers: VipTier[],
  customTeams: CustomTeam[],
  serverPort = '1031'
): string {
  const staffRoleBlocks = staffRoles.map((role) => {
    const raKey = mapPanelRoleToRaKey(role.roleId);
    const itemsList =
      role.staffItems.length > 0
        ? `\n${role.staffItems.map((it) => `      - ${it}`).join('\n')}`
        : ' []';
    return `    ${raKey}:
      display_name: "${role.label}"
      auto_equip_on_spawn: ${role.autoEquipOnSpawn !== false ? 'true' : 'false'}
      equip_only_in_tutorial_mode: ${role.equipOnlyInTutorialMode !== false ? 'true' : 'false'}
      clear_inventory_before_equip: ${Boolean(role.clearInventoryBeforeEquip) ? 'true' : 'false'}
      items:${itemsList}`;
  });

  const vipSummaryBlocks = vipTiers.map((tier) => {
    return `    ${tier.id}:
      display_name: "${tier.name}"
      reserved_slot: ${tier.reservedSlot ? 'true' : 'false'}
      assigned_players_count: ${tier.assignedPlayers.length}`;
  });

  const teamSummaryBlocks = customTeams.map((team, idx) => {
    return `    - id: ${100 + idx}
      role_key: "${team.roleKey}"
      name: "${team.name}"
      max_health: ${team.hp}
      spawn_chance_percent: ${team.spawnChance}`;
  });

  return `# ====================================================================
# EXILED 9 CONFIGURATION PRINCIPALE DU SERVEUR (PORT ${serverPort})
# Chemin Pterodactyl : /home/container/.config/EXILED/Configs/${serverPort}-config.yml
# Compatible SCP: Secret Laboratory v14.2.9 + LabApi + EXILED 9
# ====================================================================

exiled_loader:
  is_enabled: true
  should_load_outdated_plugins: true
  check_for_updates: false
  testing_mode: false
  debug: false

exiled_events:
  is_enabled: true
  debug: false
  log_errors: true
  should_log_server_output: true
  use_dynamic_patching: true
  can_scp079_open_doors_during_lockdown: true
  should_drop_blood_on_damage: true

exiled_permissions:
  is_enabled: true
  debug: false
  folder: /home/container/.config/EXILED/Configs
  full_path: /home/container/.config/EXILED/Configs/permissions.yml

exiled_custom_items:
  is_enabled: true
  debug: false

exiled_custom_roles:
  is_enabled: true
  debug: false

lumishost_staff_loadouts:
  is_enabled: true
  debug: false
  give_delay_seconds: 0.6
  broadcast_on_equip: true
  broadcast_duration: 4
  broadcast_message: "<color=#FAFF86><b>[STAFF SITE-19]</b></color> Kit <color=#00B7EB>{ROLE}</color> équipé automatiquement ({COUNT} items)."
  roles:
${staffRoleBlocks.join('\n')}

lumishost_vip_advantages:
  is_enabled: true
  debug: false
  config_file: /home/container/.config/EXILED/Configs/VipAdvantages.yml
  tiers:
${vipSummaryBlocks.join('\n')}

lumishost_custom_teams:
  is_enabled: true
  debug: false
  config_file: /home/container/.config/EXILED/Configs/CustomTeams.yml
  teams:
${teamSummaryBlocks.join('\n')}
`;
}

export function generateExiledStaffAutoEquipPluginCode(): string {
  return `// ============================================================================
// PLUGIN EXILED 9 C# : LumisHostStaffItems — Auto-Équipement Staff par Rôle
// Déployez le .dll compilé dans : /home/container/.config/EXILED/Plugins/
// Lit la section lumishost_staff_loadouts depuis EXILED/Configs/1031-config.yml
// ============================================================================

using System;
using System.Collections.Generic;
using System.ComponentModel;
using Exiled.API.Enums;
using Exiled.API.Features;
using Exiled.API.Interfaces;
using Exiled.Events.EventArgs.Player;
using MEC;
using PlayerRoles;

namespace LumisHostStaffItems
{
    public class StaffRoleLoadoutConfig
    {
        public string DisplayName { get; set; } = "Staff";
        public bool AutoEquipOnSpawn { get; set; } = true;
        public bool EquipOnlyInTutorialMode { get; set; } = true;
        public bool ClearInventoryBeforeEquip { get; set; } = false;
        public List<ItemType> Items { get; set; } = new List<ItemType>
        {
            ItemType.KeycardO5,
            ItemType.SCP268,
            ItemType.Radio
        };
    }

    public class Config : IConfig
    {
        public bool IsEnabled { get; set; } = true;
        public bool Debug { get; set; } = false;

        [Description("Délai (en secondes) après le spawn avant de donner les items staff.")]
        public float GiveDelaySeconds { get; set; } = 0.6f;

        public bool BroadcastOnEquip { get; set; } = true;
        public ushort BroadcastDuration { get; set; } = 4;
        public string BroadcastMessage { get; set; } =
            "<color=#FAFF86><b>[STAFF SITE-19]</b></color> Kit <color=#00B7EB>{ROLE}</color> équipé ({COUNT} items).";

        [Description("Liste des kits staff indexés par la clé exacte de config_remoteadmin.txt (owner, admin, moderator, etc.).")]
        public Dictionary<string, StaffRoleLoadoutConfig> Roles { get; set; } = new Dictionary<string, StaffRoleLoadoutConfig>
        {
            ["owner"] = new StaffRoleLoadoutConfig
            {
                DisplayName = "Fondateur O5",
                AutoEquipOnSpawn = true,
                EquipOnlyInTutorialMode = true,
                Items = new List<ItemType> { ItemType.KeycardO5, ItemType.GunCOM45, ItemType.Jailbird, ItemType.SCP268, ItemType.Radio }
            },
            ["admin"] = new StaffRoleLoadoutConfig
            {
                DisplayName = "Administrateur Site-19",
                AutoEquipOnSpawn = true,
                EquipOnlyInTutorialMode = true,
                Items = new List<ItemType> { ItemType.KeycardO5, ItemType.GunE11SR, ItemType.Jailbird, ItemType.SCP268, ItemType.Radio }
            },
            ["moderator"] = new StaffRoleLoadoutConfig
            {
                DisplayName = "Modérateur",
                AutoEquipOnSpawn = true,
                EquipOnlyInTutorialMode = true,
                Items = new List<ItemType> { ItemType.KeycardO5, ItemType.SCP268, ItemType.SCP1344, ItemType.SCP1576, ItemType.Radio }
            }
        };
    }

    public class LumisHostStaffItemsPlugin : Plugin<Config>
    {
        public override string Name => "LumisHostStaffItems";
        public override string Prefix => "lumishost_staff_loadouts";
        public override string Author => "LumisHost Site-19";
        public override Version Version => new Version(1, 0, 0);
        public override Version RequiredExiledVersion => new Version(9, 0, 0);

        public override void OnEnabled()
        {
            Exiled.Events.Handlers.Player.Spawned += OnPlayerSpawned;
            base.OnEnabled();
            Log.Info("[LumisHostStaffItems] Auto-équipement des kits Staff activé via EXILED 9.");
        }

        public override void OnDisabled()
        {
            Exiled.Events.Handlers.Player.Spawned -= OnPlayerSpawned;
            base.OnDisabled();
        }

        private void OnPlayerSpawned(SpawnedEventArgs ev)
        {
            if (ev.Player == null || !ev.Player.IsAlive) return;
            string groupKey = ev.Player.GroupName;
            if (string.IsNullOrWhiteSpace(groupKey)) return;

            if (!Config.Roles.TryGetValue(groupKey, out StaffRoleLoadoutConfig loadout)) return;
            if (!loadout.AutoEquipOnSpawn || loadout.Items == null || loadout.Items.Count == 0) return;
            if (loadout.EquipOnlyInTutorialMode && ev.Player.Role.Type != RoleTypeId.Tutorial) return;

            Timing.CallDelayed(Config.GiveDelaySeconds, () =>
            {
                if (ev.Player == null || !ev.Player.IsAlive) return;

                if (loadout.ClearInventoryBeforeEquip)
                    ev.Player.ClearInventory();

                int added = 0;
                foreach (ItemType item in loadout.Items)
                {
                    if (item == ItemType.None) continue;
                    ev.Player.AddItem(item);
                    added++;
                }

                if (Config.BroadcastOnEquip && added > 0)
                {
                    string msg = Config.BroadcastMessage
                        .Replace("{ROLE}", loadout.DisplayName)
                        .Replace("{COUNT}", added.ToString());
                    ev.Player.Broadcast(Config.BroadcastDuration, msg);
                }
            });
        }
    }
}
`;
}

export function generatePterodactylMegaAllInOneEggJson(
  staffList: StaffMember[],
  vipTiers: VipTier[],
  customTeams: CustomTeam[],
  serverNameRich: string,
  pastebinId: string,
  pteroUrl = 'https://panel.lumishost.com',
  pteroServerId = 'f8a9c41b',
  staffRoles?: WebPanelRolePermissionMatrix[],
  serverPort = '1031'
): string {
  const remoteAdminTxt = generateRemoteAdminConfig(staffList, vipTiers, staffRoles);
  const gameplayTxt = generateGameplayConfig(
    serverNameRich,
    pastebinId,
    32,
    false,
    'lloydgarmadon2231@gmail.com'
  );
  const customTeamsYml = generateExiledCustomTeamsYaml(customTeams);
  const vipAdvantagesYml = generateVipAdvantagesYaml(vipTiers);
  const effectiveRoles = staffRoles || [];
  const staffLoadoutsYml = generateStaffLoadoutsYaml(effectiveRoles);
  const exiledMainConfigYml = generateExiledMainPortConfigYaml(
    effectiveRoles,
    vipTiers,
    customTeams,
    serverPort || '1031'
  );
  const exiledPermissionsYml = generateExiledPermissionsYaml(effectiveRoles);
  const exiledStaffPluginCs = generateExiledStaffAutoEquipPluginCode();
  const discordBotJs = generateDiscordBotCode(
    pteroUrl,
    pteroServerId,
    'LumisHost Site-19 FR',
    vipTiers,
    customTeams
  );
  const embeddedServerMjs = generateEmbeddedWebPanelServerJs(
    pteroUrl,
    pteroServerId
  );
  const embeddedIndexHtml = generateEmbeddedWebPanelHtml();

  const installScript = `#!/bin/bash
# ==============================================================================
# MEGA EGG TOUT-EN-UN LUMISHOST v2.0 (PTERODACTYL v1.11.11)
# 1. Serveur SCP: Secret Laboratory v14.2.9 (AppID 996560) + LabApi + EXILED 9
# 2. Configs EXILED 9 completes ({PORT}-config.yml, permissions.yml, StaffLoadouts.yml, VipAdvantages.yml, CustomTeams.yml)
# 3. Configs SCP:SL (config_gameplay.txt, config_remoteadmin.txt) + Plugin Auto-Equip Staff C#
# 4. Panel Web (scpsl.lumishost.com) + API Telemetrie + Bot Discord v14
# ==============================================================================

apt -y update
apt -y --no-install-recommends install curl lib32gcc-s1 ca-certificates tar xz-utils git

# Installation portable de Node.js 20 LTS dans /mnt/server/lumishost-suite/node (persiste dans steamcmd:dotnet)
mkdir -p /mnt/server/lumishost-suite/node
if [ ! -x "/mnt/server/lumishost-suite/node/bin/node" ]; then
    echo "--- [LUMISHOST] Installation Node.js 20 LTS portable ---"
    curl -sSL -o /tmp/node20.tar.xz https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz
    tar -xJf /tmp/node20.tar.xz --strip-components=1 -C /mnt/server/lumishost-suite/node
    rm -f /tmp/node20.tar.xz
fi
export PATH="/mnt/server/lumishost-suite/node/bin:$PATH"

# 1. Installation SteamCMD & Serveur Dedie SCP:SL (AppID 996560)
mkdir -p /tmp/steamcmd /mnt/server/steamapps
curl -sSL -o /tmp/steamcmd/steamcmd.tar.gz https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xzf /tmp/steamcmd/steamcmd.tar.gz -C /tmp/steamcmd
rm -f /tmp/steamcmd/steamcmd.tar.gz
rm -rf /mnt/server/steamapps/downloading /mnt/server/steamapps/temp
chmod -R u+rwX /mnt/server/steamapps 2>/dev/null || true
cd /tmp/steamcmd

if ! ./steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update 996560 validate +quit; then
    echo "--- [LUMISHOST] Retry SteamCMD sans validate apres nettoyage cache ---"
    rm -rf /root/Steam/appcache /root/.steam/appcache /mnt/server/steamapps/downloading /mnt/server/steamapps/temp
    chmod -R u+rwX /mnt/server 2>/dev/null || true
    ./steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update 996560 +quit || echo "--- [LUMISHOST] ATTENTION: SteamCMD a rencontre une erreur, poursuite de l'installation ---"
fi
rm -rf /tmp/steamcmd

cd /mnt/server
chmod +x /mnt/server/LocalAdmin /mnt/server/SCPSL.x86_64 2>/dev/null || true

# 2. Installation directe et 100% non-interactive de EXILED 9 + LabApi via Exiled.tar.gz
mkdir -p /mnt/server/.config
rm -f /mnt/server/Exiled.Installer-Linux
if [ "\${INSTALL_EXILED}" == "true" ] || [ "\${INSTALL_EXILED}" == "1" ]; then
    echo "--- [LUMISHOST] Telechargement direct de EXILED 9 + LabApi (Exiled.tar.gz) ---"
    EXILED_URL="https://github.com/ExMod-Team/EXILED/releases/latest/download/Exiled.tar.gz"
    if [ "\${EXILED_PRE_RELEASE}" == "true" ]; then
        PRE_URL=$(curl -sSL https://api.github.com/repos/ExMod-Team/EXILED/releases | grep -o '"browser_download_url": *"[^"]*Exiled\\.tar\\.gz"' | head -n 1 | cut -d'"' -f4)
        if [ -n "\${PRE_URL}" ]; then EXILED_URL="\${PRE_URL}"; fi
    fi
    rm -rf /tmp/exiled-dl /tmp/Exiled.tar.gz
    mkdir -p /tmp/exiled-dl
    curl -sSL -o /tmp/Exiled.tar.gz "\${EXILED_URL}"
    tar -xzf /tmp/Exiled.tar.gz -C /tmp/exiled-dl
    if [ -d "/tmp/exiled-dl/.config" ]; then
        cp -rf /tmp/exiled-dl/.config/* /mnt/server/.config/
    else
        cp -rf /tmp/exiled-dl/* /mnt/server/.config/
    fi
    rm -rf /tmp/Exiled.tar.gz /tmp/exiled-dl
    if [ -f "/mnt/server/.config/SCP Secret Laboratory/LabAPI/plugins/global/Exiled.Loader.dll" ]; then
        echo "--- [LUMISHOST] EXILED 9 + LabApi installe avec succes ---"
    else
        echo "--- [LUMISHOST] ATTENTION: Exiled.Loader.dll introuvable apres extraction ---"
    fi
fi

# 3. Creation de l'arborescence complete SCP:SL, LabApi & EXILED 9
ACTIVE_PORT="\${SERVER_PORT:-1031}"
mkdir -p "/mnt/server/.config/SCP Secret Laboratory/config/\${ACTIVE_PORT}"
mkdir -p "/mnt/server/.config/SCP Secret Laboratory/config/1031"
mkdir -p "/mnt/server/.config/SCP Secret Laboratory/LabAPI/plugins/global"
mkdir -p "/mnt/server/.config/SCP Secret Laboratory/LabAPI/configs/\${ACTIVE_PORT}"
mkdir -p "/mnt/server/.config/EXILED/Configs"
mkdir -p "/mnt/server/.config/EXILED/Plugins/dependencies"
mkdir -p "/mnt/server/lumishost-suite/plugins-src"

# 4. Ecriture automatique de config_gameplay.txt (avec contact_email & Affiche WOW Pastebin)
cat << 'EOF_GAMEPLAY' > "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_gameplay.txt"
${gameplayTxt}
EOF_GAMEPLAY
cp "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_gameplay.txt" "/mnt/server/.config/SCP Secret Laboratory/config/\${ACTIVE_PORT}/config_gameplay.txt" 2>/dev/null || true

# 5. Ecriture automatique de config_remoteadmin.txt (Staff O5, Rôles Customs & Tags VIP)
cat << 'EOF_RA' > "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt"
${remoteAdminTxt}
EOF_RA
cp "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt" "/mnt/server/.config/SCP Secret Laboratory/config/\${ACTIVE_PORT}/config_remoteadmin.txt" 2>/dev/null || true

# 6. Ecriture complete des configurations EXILED 9 ({PORT}-config.yml + permissions.yml + plugins)
cat << 'EOF_EXILED_MAIN' > "/mnt/server/.config/EXILED/Configs/1031-config.yml"
${exiledMainConfigYml}
EOF_EXILED_MAIN
if [ "\${ACTIVE_PORT}" != "1031" ]; then
    cp -f "/mnt/server/.config/EXILED/Configs/1031-config.yml" "/mnt/server/.config/EXILED/Configs/\${ACTIVE_PORT}-config.yml"
fi

cat << 'EOF_EXILED_PERMS' > "/mnt/server/.config/EXILED/Configs/permissions.yml"
${exiledPermissionsYml}
EOF_EXILED_PERMS

cat << 'EOF_TEAMS' > "/mnt/server/.config/EXILED/Configs/CustomTeams.yml"
${customTeamsYml}
EOF_TEAMS

cat << 'EOF_VIP' > "/mnt/server/.config/EXILED/Configs/VipAdvantages.yml"
${vipAdvantagesYml}
EOF_VIP

cat << 'EOF_STAFF_ITEMS' > "/mnt/server/.config/EXILED/Configs/StaffLoadouts.yml"
${staffLoadoutsYml}
EOF_STAFF_ITEMS

# 7. Sauvegarde des sources C# du plugin Auto-Equip Staff EXILED 9 & Bot Discord v14
cat << 'EOF_PLUGIN_STAFF_GZ' | base64 -d | gunzip > "/mnt/server/lumishost-suite/plugins-src/LumisHostStaffItemsPlugin.cs"
${toBase64Gzip(exiledStaffPluginCs)}
EOF_PLUGIN_STAFF_GZ

cat << 'EOF_BOT_GZ' | base64 -d | gunzip > "/mnt/server/lumishost-suite/discord-bot.mjs"
${toBase64Gzip(discordBotJs)}
EOF_BOT_GZ

cat << 'EOF_PKG' > "/mnt/server/lumishost-suite/package.json"
{
  "name": "lumishost-scpsl-bot",
  "version": "2.1.0",
  "type": "module",
  "dependencies": {
    "axios": "^1.7.7",
    "discord.js": "^14.16.3",
    "dotenv": "^16.4.5"
  }
}
EOF_PKG

(cd /mnt/server/lumishost-suite && /mnt/server/lumishost-suite/node/bin/npm install --omit=dev --no-audit --no-fund)

# 7b. Deploiement automatique du Panel Web integre (http://192.99.42.203:1032 / scpsl.lumishost.com)
mkdir -p /mnt/server/webpanel
if [ -n "\${WEB_PANEL_GIT_URL}" ]; then
    echo "--- [LUMISHOST] Clonage du Panel Web depuis Git ---"
    rm -rf /mnt/server/webpanel
    git clone "\${WEB_PANEL_GIT_URL}" /mnt/server/webpanel || mkdir -p /mnt/server/webpanel
    if [ -f "/mnt/server/webpanel/package.json" ]; then
        (cd /mnt/server/webpanel && NODE_ENV=development /mnt/server/lumishost-suite/node/bin/npm install --legacy-peer-deps --no-audit --no-fund && /mnt/server/lumishost-suite/node/bin/npm run build)
    fi
fi

if [ -z "\${WEB_PANEL_GIT_URL}" ]; then
    echo "--- [LUMISHOST] Mise a jour / installation du Panel Web Complet v2.4.0 sur le port 1032 ---"
    mkdir -p /mnt/server/webpanel/public
    cat << 'EOF_WP_PKG' > "/mnt/server/webpanel/package.json"
{
  "name": "lumishost-scpsl-webpanel",
  "version": "2.4.0",
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  },
  "dependencies": {
    "express": "^4.21.2"
  }
}
EOF_WP_PKG

    cat << 'EOF_WP_SRV_GZ' | base64 -d | gunzip > "/mnt/server/webpanel/server.mjs"
${toBase64Gzip(embeddedServerMjs)}
EOF_WP_SRV_GZ

    cat << 'EOF_WP_HTML_GZ' | base64 -d | gunzip > "/mnt/server/webpanel/public/index.html"
${toBase64Gzip(embeddedIndexHtml)}
EOF_WP_HTML_GZ

    (cd /mnt/server/webpanel && /mnt/server/lumishost-suite/node/bin/npm install --omit=dev --no-audit --no-fund)
fi

# 8. Creation du lanceur unifie start-all.sh (Serveur SCP:SL + EXILED 9 + Panel Web + Bot Discord)
cat << 'EOF_START' > "/mnt/server/start-all.sh"
#!/bin/bash
export PATH="/home/container/lumishost-suite/node/bin:\$PATH"

echo "======================================================================"
echo "  LUMISHOST MEGA EGG TOUT-EN-UN v2.2 : SCP:SL + EXILED 9 + BOT + PANEL"
echo "  Serveur Jeu : play.lumishost.com:\${SERVER_PORT}"
echo "  Panel Web   : scpsl.lumishost.com (Port Web : \${WEB_PANEL_PORT:-1032})"
echo "======================================================================"

# Synchronisation des dossiers port SCP:SL & EXILED 9 ({SERVER_PORT}-config.yml)
mkdir -p "/home/container/.config/SCP Secret Laboratory/config/\${SERVER_PORT}"
mkdir -p "/home/container/.config/EXILED/Configs"
mkdir -p "/home/container/.config/EXILED/Plugins/dependencies"
mkdir -p "/home/container/.config/SCP Secret Laboratory/LabAPI/plugins/global"

if [ ! -f "/home/container/.config/SCP Secret Laboratory/config/\${SERVER_PORT}/config_gameplay.txt" ]; then
    cp -f "/home/container/.config/SCP Secret Laboratory/config/1031/"* "/home/container/.config/SCP Secret Laboratory/config/\${SERVER_PORT}/" 2>/dev/null || true
fi

if [ -n "\${CONTACT_EMAIL}" ] && [ -f "/home/container/.config/SCP Secret Laboratory/config/\${SERVER_PORT}/config_gameplay.txt" ]; then
    sed -i "s|^contact_email:.*|contact_email: \${CONTACT_EMAIL}|g" "/home/container/.config/SCP Secret Laboratory/config/\${SERVER_PORT}/config_gameplay.txt" 2>/dev/null || true
fi

if [ ! -f "/home/container/.config/EXILED/Configs/\${SERVER_PORT}-config.yml" ] && [ -f "/home/container/.config/EXILED/Configs/1031-config.yml" ]; then
    cp -f "/home/container/.config/EXILED/Configs/1031-config.yml" "/home/container/.config/EXILED/Configs/\${SERVER_PORT}-config.yml" 2>/dev/null || true
fi

# Demarrage du Panel Web en arriere-plan sur 0.0.0.0:WEB_PANEL_PORT (1032)
if [ "\${ENABLE_WEB_PANEL}" == "true" ] && [ -f "/home/container/webpanel/package.json" ]; then
    echo "[LUMISHOST] Demarrage du Panel Web scpsl.lumishost.com sur le port \${WEB_PANEL_PORT:-1032}..."
    (cd /home/container/webpanel && NODE_ENV=production PORT=\${WEB_PANEL_PORT:-1032} /home/container/lumishost-suite/node/bin/npm run start &)
fi

# Demarrage du Bot Discord v14 en arriere-plan si DISCORD_TOKEN est renseigne
if [ "\${ENABLE_DISCORD_BOT}" == "true" ] && [ -n "\${DISCORD_TOKEN}" ]; then
    echo "[LUMISHOST] Demarrage du Bot Discord SCP:SL en arriere-plan..."
    (cd /home/container/lumishost-suite && /home/container/lumishost-suite/node/bin/node discord-bot.mjs &)
fi

# Demarrage principal de LocalAdmin v2.5.16 en mode headless (--useDefault evite la boucle [edit/keep] tout en gardant la console interactive)
echo "[LUMISHOST] Lancement de LocalAdmin sur le port \${SERVER_PORT} (EXILED 9 + LabApi)..."
exec ./LocalAdmin \${SERVER_PORT} --acceptEULA --useDefault
EOF_START

chmod +x /mnt/server/start-all.sh
echo "--- [LUMISHOST] Installation du MEGA EGG TOUT-EN-UN v2.1 terminee avec succes ! ---"`;

  const egg = {
    _comment:
      'MEGA EGG TOUT-EN-UN LUMISHOST v2.0 POUR PTERODACTYL 1.11.11 (SERVEUR SCP:SL 14.2.9 + LABAPI + EXILED 9 COMPLET + PANEL WEB + BOT DISCORD + CONFIGS)',
    meta: {
      version: 'PTDL_v2',
      update_url: null
    },
    exported_at: '2026-11-18T21:00:00+00:00',
    name: 'LUMISHOST MEGA EGG TOUT-EN-UN v2 (SCP:SL 14.2 + EXILED 9 + Panel Web + Bot Discord)',
    author: 'admin@lumishost.com',
    description:
      'MEGA EGG v2 COMPLET : Serveur SCP:SL 14.2.9 (996560), LabApi, EXILED 9 entièrement configuré ({PORT}-config.yml, permissions.yml, StaffLoadouts.yml, VipAdvantages.yml, CustomTeams.yml, Plugin C# Auto-Equip Staff), LocalAdmin Auto-Wizard, Bot Discord v14 et Panel Web scpsl.lumishost.com.',
    features: ['steam_disk_space'],
    docker_images: {
      'ghcr.io/parkervcp/steamcmd:dotnet': 'ghcr.io/parkervcp/steamcmd:dotnet',
      'ghcr.io/parkervcp/yolks:debian': 'ghcr.io/parkervcp/yolks:debian'
    },
    file_denylist: [],
    startup: './start-all.sh',
    config: {
      files: '{}',
      startup: '{"done": "Waiting for players..."}',
      logs: '{}',
      stop: 'exit'
    },
    scripts: {
      installation: {
        script: installScript,
        container: 'ghcr.io/parkervcp/installers:debian',
        entrypoint: 'bash'
      }
    },
    variables: [
      {
        name: 'Installer EXILED 9 + Configs automatiquement',
        description:
          'Installe automatiquement EXILED 9, LabApi et injecte toutes les configs (1031-config.yml, permissions.yml, StaffLoadouts.yml, VipAdvantages.yml, CustomTeams.yml).',
        env_variable: 'INSTALL_EXILED',
        default_value: 'true',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string|in:true,false',
        field_type: 'text'
      },
      {
        name: 'Utiliser EXILED Pre-Release (Bêta SCP:SL)',
        description:
          'Passez à true uniquement si une nouvelle mise à jour SCP:SL nécessite une version pré-release d’EXILED.',
        env_variable: 'EXILED_PRE_RELEASE',
        default_value: 'false',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string|in:true,false',
        field_type: 'text'
      },
      {
        name: 'Email de Contact Public (Liste Serveurs SCP:SL)',
        description:
          'Email obligatoire dans config_gameplay.txt pour afficher play.lumishost.com:1031 dans la liste publique SCP:SL.',
        env_variable: 'CONTACT_EMAIL',
        default_value: 'lloydgarmadon2231@gmail.com',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'Activer le Panel Web Integre (scpsl.lumishost.com)',
        description:
          'Demarre automatiquement le Panel Web de moderation In-Game sur le 2e port alloue au conteneur (ex: 1032).',
        env_variable: 'ENABLE_WEB_PANEL',
        default_value: 'true',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string|in:true,false',
        field_type: 'text'
      },
      {
        name: 'Port du Panel Web (Allocation Secondaire)',
        description:
          'Port secondaire alloue sur Pterodactyl pour ouvrir le Panel Web (ex: 1032 sur 192.99.42.203:1032).',
        env_variable: 'WEB_PANEL_PORT',
        default_value: '1032',
        user_viewable: true,
        user_editable: true,
        rules: 'required|numeric',
        field_type: 'text'
      },
      {
        name: 'Activer le Bot Discord v14 Integre',
        description:
          'Lance automatiquement le Bot Discord (/ban, /kick, /addmod, /givevip, /spawnteam, /eventmode) en meme temps que le serveur SCP:SL.',
        env_variable: 'ENABLE_DISCORD_BOT',
        default_value: 'true',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string|in:true,false',
        field_type: 'text'
      },
      {
        name: 'Token du Bot Discord (DISCORD_TOKEN)',
        description:
          'Token de votre Bot Discord (depuis Discord Developer Portal) pour activer les commandes Slash.',
        env_variable: 'DISCORD_TOKEN',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'ID Serveur Discord (GUILD_ID - Optionnel)',
        description:
          'ID de votre serveur Discord (clic droit > Copier identifiant) pour enregistrer instantanement les commandes Slash.',
        env_variable: 'DISCORD_GUILD_ID',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Discord ID Fondateur O5 (Connexion Panel Web)',
        description:
          'Votre ID Discord autorise a acceder au Panel Web et a gerer les permissions (Fondateur O5).',
        env_variable: 'FOUNDER_DISCORD_ID',
        default_value: '985589556655054858',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'Discord OAuth2 Client ID (Optionnel)',
        description:
          'Client ID de votre application Discord pour activer le bouton Se connecter avec Discord sur le Panel Web.',
        env_variable: 'DISCORD_CLIENT_ID',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Discord OAuth2 Client Secret (Optionnel)',
        description:
          'Client Secret de votre application Discord pour le Panel Web.',
        env_variable: 'DISCORD_CLIENT_SECRET',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Discord OAuth2 Redirect URI (Optionnel)',
        description:
          'Ex: https://scpsl.lumishost.com/auth/callback (laisser vide pour detection automatique).',
        env_variable: 'DISCORD_REDIRECT_URI',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Cle API Client Pterodactyl (ptlc_...)',
        description:
          'Votre cle API CLIENT (ptlc_... depuis Account -> API Credentials, PAS ptla_...) pour piloter la console en direct.',
        env_variable: 'PTERO_CLIENT_API_KEY',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Depot Git Panel Web Complet (Optionnel)',
        description:
          'Laissez vide pour utiliser le Panel Web LumisHost integre pret-a-l-emploi, ou mettez votre URL Git pour deployer le panel React complet.',
        env_variable: 'WEB_PANEL_GIT_URL',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'ID Serveur Pterodactyl (8 caracteres)',
        description: 'Identifiant court de votre serveur sur LumisHost (ex: f8a9c41b).',
        env_variable: 'PTERO_SERVER_ID',
        default_value: pteroServerId,
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'App ID Steam',
        description: 'Steam AppID officiel pour SCP:SL Dedicated Server (996560).',
        env_variable: 'SRCDS_APPID',
        default_value: '996560',
        user_viewable: false,
        user_editable: false,
        rules: 'required|numeric',
        field_type: 'text'
      }
    ]
  };

  return JSON.stringify(egg, null, 2);
}

export function generatePterodactylScpslEggJson(): string {
  const egg = {
    _comment: 'DO NOT EDIT: FILE GENERATED BY LUMISHOST COMMAND FOR PTERODACTYL 1.11.11',
    meta: {
      version: 'PTDL_v2',
      update_url: null
    },
    exported_at: '2026-11-18T12:45:00+00:00',
    name: 'SCP: Secret Laboratory (LabApi 14.2 + EXILED + LocalAdmin)',
    author: 'admin@lumishost.com',
    description:
      'Serveur dedie SCP: Secret Laboratory (AppID 996560) pre-configure pour LumisHost avec LabApi, EXILED, LocalAdmin auto-keep et liaison telemetrie scpsl.lumishost.com.',
    features: ['steam_disk_space'],
    docker_images: {
      'ghcr.io/parkervcp/steamcmd:dotnet': 'ghcr.io/parkervcp/steamcmd:dotnet',
      'ghcr.io/parkervcp/yolks:debian': 'ghcr.io/parkervcp/yolks:debian'
    },
    file_denylist: [],
    startup: './LocalAdmin {{SERVER_PORT}} --acceptEULA --useDefault',
    config: {
      files: '{}',
      startup: '{"done": "Waiting for players..."}',
      logs: '{}',
      stop: 'exit'
    },
    scripts: {
      installation: {
        script: `#!/bin/bash
# Script d'installation Pterodactyl : SCP:SL 14.2.9 (996560) + EXILED + LocalAdmin Auto-Config
apt -y update
apt -y --no-install-recommends install curl lib32gcc-s1 ca-certificates tar xz-utils

cd /tmp
mkdir -p /mnt/server/steamcmd
curl -sSL -o steamcmd.tar.gz https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xzvf steamcmd.tar.gz -C /mnt/server/steamcmd
cd /mnt/server/steamcmd

./steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update 996560 validate +quit

cd /mnt/server
mkdir -p "/mnt/server/.config/SCP Secret Laboratory/config"

if [ "\${INSTALL_EXILED}" == "true" ] || [ "\${INSTALL_EXILED}" == "1" ]; then
    echo "--- Installation directe de EXILED via Exiled.tar.gz ---"
    mkdir -p /mnt/server/.config /tmp/exiled-dl
    curl -sSL -o /tmp/Exiled.tar.gz https://github.com/ExMod-Team/EXILED/releases/latest/download/Exiled.tar.gz
    tar -xzf /tmp/Exiled.tar.gz -C /tmp/exiled-dl
    cp -rf /tmp/exiled-dl/* /mnt/server/.config/
    rm -rf /tmp/Exiled.tar.gz /tmp/exiled-dl
fi

chmod +x /mnt/server/LocalAdmin
echo "--- Installation SCP:SL + LabApi + EXILED terminee pour LumisHost ---"`,
        container: 'ghcr.io/parkervcp/installers:debian',
        entrypoint: 'bash'
      }
    },
    variables: [
      {
        name: 'Installer EXILED automatiquement',
        description: 'Activez (true) pour installer automatiquement EXILED en plus de LabApi.',
        env_variable: 'INSTALL_EXILED',
        default_value: 'true',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string|in:true,false',
        field_type: 'text'
      },
      {
        name: 'URL Panel Web Telemetry',
        description: 'URL du panel web scpsl.lumishost.com pour remonter les Kills, Teamkills et Logs joueurs.',
        env_variable: 'WEBPANEL_URL',
        default_value: 'https://scpsl.lumishost.com',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'App ID Steam',
        description: 'Steam AppID pour SCP:SL Dedicated Server (996560)',
        env_variable: 'SRCDS_APPID',
        default_value: '996560',
        user_viewable: false,
        user_editable: false,
        rules: 'required|numeric',
        field_type: 'text'
      }
    ]
  };

  return JSON.stringify(egg, null, 2);
}

export function generatePterodactylWebPanelEggJson(): string {
  const egg = {
    _comment: 'DO NOT EDIT: EGG PTERODACTYL 1.11.11 POUR HEBERGER LE PANEL WEB SCPSL.LUMISHOST.COM',
    meta: {
      version: 'PTDL_v2',
      update_url: null
    },
    exported_at: '2026-11-18T12:45:00+00:00',
    name: 'LumisHost SCP:SL Web Panel & Bot Discord (scpsl.lumishost.com)',
    author: 'admin@lumishost.com',
    description:
      'Heberge le Panel Web complet de moderation In-Game (RemoteAdmin Web, Killfeed, Profils Joueurs Online/Offline, OAuth2 Discord et Bot Discord) directement sur votre Pterodactyl LumisHost.',
    features: [],
    docker_images: {
      'ghcr.io/parkervcp/yolks:nodejs_20': 'ghcr.io/parkervcp/yolks:nodejs_20',
      'ghcr.io/parkervcp/yolks:nodejs_22': 'ghcr.io/parkervcp/yolks:nodejs_22'
    },
    file_denylist: [],
    startup: 'NODE_ENV=production PORT={{SERVER_PORT}} npm run start',
    config: {
      files: '{}',
      startup: '{"done": "listening on"}',
      logs: '{}',
      stop: '^C'
    },
    scripts: {
      installation: {
        script: `#!/bin/bash
apt -y update
apt -y install git curl
mkdir -p /mnt/server
cd /mnt/server
if [ -n "\${GIT_ADDRESS}" ]; then
    git clone \${GIT_ADDRESS} .
fi
if [ -f /mnt/server/package.json ]; then
    npm install
    npm run build
fi
echo "--- Installation du Panel Web scpsl.lumishost.com terminee ---"`,
        container: 'ghcr.io/parkervcp/installers:debian',
        entrypoint: 'bash'
      }
    },
    variables: [
      {
        name: 'URL Panel Pterodactyl LumisHost',
        description: 'URL de votre panel Pterodactyl (ex: https://panel.lumishost.com)',
        env_variable: 'PTERO_URL',
        default_value: 'https://panel.lumishost.com',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'Cle API Client Pterodactyl',
        description: 'Cle API Client ptlc_... pour piloter le serveur SCP:SL (192.99.42.203:1031)',
        env_variable: 'PTERO_CLIENT_API_KEY',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'ID Serveur SCP:SL',
        description: 'Identifiant court (8 caracteres) du serveur SCP:SL sur LumisHost',
        env_variable: 'PTERO_SERVER_ID',
        default_value: 'f8a9c41b',
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'Discord OAuth2 Client ID',
        description: 'Client ID de votre application Discord pour la connexion au panel web',
        env_variable: 'DISCORD_CLIENT_ID',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Discord OAuth2 Client Secret',
        description: 'Client Secret de votre application Discord pour la connexion au panel web',
        env_variable: 'DISCORD_CLIENT_SECRET',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Depot Git du Panel (Optionnel)',
        description: 'URL Git si vous souhaitez cloner automatiquement le code du panel web',
        env_variable: 'GIT_ADDRESS',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      }
    ]
  };

  return JSON.stringify(egg, null, 2);
}

export function generateDiscordBotCode(
  pteroUrl: string,
  serverId: string,
  serverName: string,
  vipTiers: VipTier[],
  customTeams: CustomTeam[]
): string {
  const cleanUrl = pteroUrl.replace(/\/$/, '') || 'https://panel.votre-domaine.fr';
  const cleanId = serverId || 'a1b2c3d4';

  return `/**
 * BOT DISCORD OFFICIEL SCP:SL <-> PANEL PTERODACTYL
 * Serveur : ${serverName}
 * Ce bot peut être hébergé directement sur votre Panel Pterodactyl (Egg Node.js) ou sur un VPS.
 * Installation : npm install discord.js axios dotenv
 */

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import axios from 'axios';
import 'dotenv/config';

const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  GUILD_ID: process.env.DISCORD_GUILD_ID,
  PTERO_URL: process.env.PTERO_URL || '${cleanUrl}',
  PTERO_API_KEY: process.env.PTERO_CLIENT_API_KEY, // Clé API Client Pterodactyl (ptlc_...)
  PTERO_SERVER_ID: process.env.PTERO_SERVER_ID || '${cleanId}',
};

const pteroHeaders = () => ({
  'Authorization': \`Bearer \${CONFIG.PTERO_API_KEY}\`,
  'Content-Type': 'application/json',
  'Accept': 'Application/vnd.pterodactyl.v1+json',
});

// Envoi de commande console au serveur SCP:SL sur Pterodactyl
async function sendPterodactylCommand(command) {
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/command\`;
  await axios.post(url, { command }, { headers: pteroHeaders() });
}

// Contrôle d'alimentation (start, restart, stop, kill)
async function sendPowerSignal(signal) {
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/power\`;
  await axios.post(url, { signal }, { headers: pteroHeaders() });
}

// Récupération de l'état RAM / CPU / Statut en temps réel
async function getServerResources() {
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/resources\`;
  const res = await axios.get(url, { headers: pteroHeaders() });
  return res.data.attributes;
}

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Afficher l’état en direct du serveur SCP:SL (RAM, CPU, Uptime) depuis Pterodactyl'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un joueur du serveur SCP:SL via SteamID64')
    .addStringOption(opt => opt.setName('steamid').setDescription('Ex: 76561198000000000@steam').setRequired(true))
    .addStringOption(opt => opt.setName('duree').setDescription('Durée (ex: 1h, 1d, 7d, 30d, perm)').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Motif de la sanction').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un SteamID64 du serveur SCP:SL')
    .addStringOption(opt => opt.setName('steamid').setDescription('Ex: 76561198000000000@steam').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser immédiatement un joueur du serveur SCP:SL')
    .addStringOption(opt => opt.setName('steamid').setDescription('SteamID64 ou ID Joueur').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Motif de l’expulsion').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  new SlashCommandBuilder()
    .setName('addmod')
    .setDescription('Ajouter un modérateur ou staff dans RemoteAdmin SCP:SL')
    .addStringOption(opt => opt.setName('steamid').setDescription('76561198...@steam').setRequired(true))
    .addStringOption(opt => opt.setName('grade').setDescription('Grade RemoteAdmin (moderator, admin, helper)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('givevip')
    .setDescription('Attribuer un Tag VIP personnalisé à un joueur en jeu')
    .addStringOption(opt => opt.setName('steamid').setDescription('76561198...@steam').setRequired(true))
    .addStringOption(opt => opt.setName('tier').setDescription('Grade VIP (${vipTiers.map(v => v.id).join(', ')})').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName('spawnteam')
    .setDescription('Forcer l’apparition d’une équipe custom EXILED en jeu')
    .addStringOption(opt => opt.setName('equipe').setDescription('Clé équipe (${customTeams.map(t => t.roleKey).join(', ')})').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('eventmode')
    .setDescription('Activer/Désactiver le Mode Event et lancer une annonce C.A.S.S.I.E.')
    .addBooleanOption(opt => opt.setName('actif').setDescription('Activer (true) ou Désactiver (false)').setRequired(true))
    .addStringOption(opt => opt.setName('nom_event').setDescription('Nom de l’événement à diffuser en Broadcast').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  new SlashCommandBuilder()
    .setName('console')
    .setDescription('Envoyer n’importe quelle commande RemoteAdmin / LocalAdmin à la console Pterodactyl')
    .addStringOption(opt => opt.setName('cmd').setDescription('Ex: sr, bc 10 Bonjour, cassie_sl ...').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('power')
    .setDescription('Contrôler l’alimentation du serveur Pterodactyl (start, restart, stop)')
    .addStringOption(opt => opt.setName('action').setDescription('start | restart | stop').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

if (!CONFIG.DISCORD_TOKEN) {
  console.log('[BOT SCP:SL] Aucun DISCORD_TOKEN renseigné. Bot en veille.');
  process.exit(0);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  console.log(\`[BOT SCP:SL] Connecté en tant que \${client.user.tag}\`);
  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
  const appId = CONFIG.CLIENT_ID || client.user.id;
  try {
    if (CONFIG.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(appId, CONFIG.GUILD_ID), {
        body: commands.map(c => c.toJSON()),
      });
      console.log(\`[BOT SCP:SL] Commandes Slash enregistrées sur la guilde \${CONFIG.GUILD_ID}.\`);
    } else {
      await rest.put(Routes.applicationCommands(appId), {
        body: commands.map(c => c.toJSON()),
      });
      console.log('[BOT SCP:SL] Commandes Slash globales enregistrées.');
    }
  } catch (err) {
    console.error(\`[BOT SCP:SL] Impossible d'enregistrer les commandes sur la guilde \${CONFIG.GUILD_ID} (\${err.message}). Vérifiez que le bot est bien invité avec les scopes "bot" + "applications.commands". Fallback en mode commandes globales...\`);
    try {
      await rest.put(Routes.applicationCommands(appId), {
        body: commands.map(c => c.toJSON()),
      });
      console.log('[BOT SCP:SL] Commandes Slash globales enregistrées en fallback.');
    } catch (globalErr) {
      console.error('[BOT SCP:SL] Erreur commandes globales:', globalErr.message);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'status') {
      const stats = await getServerResources();
      const ramGb = (stats.resources.memory_bytes / (1024 ** 3)).toFixed(2);
      const cpuPct = stats.resources.cpu_absolute.toFixed(1);
      const embed = new EmbedBuilder()
        .setTitle('État du Serveur SCP:SL — Panel Pterodactyl')
        .setColor(stats.current_state === 'running' ? 0x16A34A : 0xDC143C)
        .addFields(
          { name: 'Statut', value: stats.current_state.toUpperCase(), inline: true },
          { name: 'Charge CPU', value: \`\${cpuPct}%\`, inline: true },
          { name: 'Mémoire RAM', value: \`\${ramGb} Go\`, inline: true }
        )
        .setTimestamp();
      return await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'ban') {
      const steamid = interaction.options.getString('steamid', true);
      const duree = interaction.options.getString('duree', true);
      const raison = interaction.options.getString('raison', true);
      await sendPterodactylCommand(\`ban \${steamid} \${duree} "\${raison} (Par \${interaction.user.username})"\`);

      const embed = new EmbedBuilder()
        .setTitle('Sanction SCP:SL — Bannissement Exécuté')
        .setColor(0xDC143C)
        .addFields(
          { name: 'Cible', value: \`\\\`\${steamid}\\\`\`, inline: true },
          { name: 'Durée', value: duree, inline: true },
          { name: 'Modérateur', value: interaction.user.tag, inline: true },
          { name: 'Motif', value: raison }
        )
        .setTimestamp();
      return await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'unban') {
      const steamid = interaction.options.getString('steamid', true);
      await sendPterodactylCommand(\`unban \${steamid}\`);
      return await interaction.reply({ content: \`Le joueur **\${steamid}** a été débanni du serveur SCP:SL.\` });
    }

    if (interaction.commandName === 'kick') {
      const steamid = interaction.options.getString('steamid', true);
      const raison = interaction.options.getString('raison', true);
      await sendPterodactylCommand(\`kick \${steamid} "\${raison}"\`);
      return await interaction.reply({ content: \`Joueur **\${steamid}** expulsé du serveur SCP:SL. Motif : *\${raison}*\` });
    }

    if (interaction.commandName === 'addmod') {
      const steamid = interaction.options.getString('steamid', true);
      const grade = interaction.options.getString('grade', true);
      await sendPterodactylCommand(\`setgroup \${steamid} \${grade}\`);
      await sendPterodactylCommand('reload remoteadmin');
      return await interaction.reply({ content: \`Le joueur **\${steamid}** a reçu le grade staff **\${grade}** sur le serveur.\` });
    }

    if (interaction.commandName === 'givevip') {
      const steamid = interaction.options.getString('steamid', true);
      const tier = interaction.options.getString('tier', true);
      await sendPterodactylCommand(\`setgroup \${steamid} \${tier}\`);
      return await interaction.reply({ content: \`Tag VIP **\${tier}** attribué à **\${steamid}** en direct !\` });
    }

    if (interaction.commandName === 'spawnteam') {
      const equipe = interaction.options.getString('equipe', true);
      await sendPterodactylCommand(\`customteam spawn \${equipe}\`);
      return await interaction.reply({ content: \`Escouade personnalisée **\${equipe}** déployée sur le serveur !\` });
    }

    if (interaction.commandName === 'eventmode') {
      const actif = interaction.options.getBoolean('actif', true);
      const nomEvent = interaction.options.getString('nom_event') || 'Événement Spécial';
      if (actif) {
        await sendPterodactylCommand(\`bc 10 <color=#FAFF86><b>[MODE EVENT ACTIVÉ]</b></color> \${nomEvent}\`);
        await sendPterodactylCommand('cassie attention all personnel . special event mode activated');
      } else {
        await sendPterodactylCommand('bc 8 <color=#50C878><b>[FIN D’EVENT]</b></color> Retour au mode normal.');
      }
      return await interaction.reply({ content: \`Mode Event **\${actif ? 'ACTIVÉ' : 'DÉSACTIVÉ'}** (\${nomEvent}).\` });
    }

    if (interaction.commandName === 'console') {
      const cmd = interaction.options.getString('cmd', true);
      await sendPterodactylCommand(cmd);
      return await interaction.reply({ content: \`Commande envoyée à la console Pterodactyl : \\\`\${cmd}\\\`\` });
    }

    if (interaction.commandName === 'power') {
      const action = interaction.options.getString('action', true);
      await sendPowerSignal(action);
      return await interaction.reply({ content: \`Signal d'alimentation **\${action.toUpperCase()}** envoyé au panel Pterodactyl.\` });
    }
  } catch (err) {
    return await interaction.reply({ content: \`Erreur API Pterodactyl : \${err.message}\`, ephemeral: true });
  }
});

client.login(CONFIG.DISCORD_TOKEN);
`;
}
