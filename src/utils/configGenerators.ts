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
    if (s.steamId && s.steamId.trim()) {
      memberLines.push(` # ${s.username} (Discord: ${s.discordTag})`);
      memberLines.push(` - ${s.steamId.trim()}: ${s.roleId}`);
    }
  });
  vipTiers.forEach((tier) => {
    tier.assignedPlayers.forEach((player) => {
      if (player.steamId && player.steamId.trim()) {
        memberLines.push(` # VIP: ${player.name} (${tier.name})`);
        memberLines.push(` - ${player.steamId.trim()}: ${tier.id}`);
      }
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
    'GivingItems',
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
    'Overwatch',
    'Effects',
    'AdminChat',
    'Announcer'
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

${memberLines.length > 0 ? `Members:\n${memberLines.join('\n')}` : 'Members: []'}

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
  pteroServerId = '283ba3e0',
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

# Installation portable de Node.js 22 LTS dans /mnt/server/lumishost-suite/node (requis par Vite 8 / Rolldown)
mkdir -p /mnt/server/lumishost-suite/node
NODE_VER=$(/mnt/server/lumishost-suite/node/bin/node -v 2>/dev/null || echo "")
if [ ! -x "/mnt/server/lumishost-suite/node/bin/node" ] || [[ "\${NODE_VER}" != v22.* ]]; then
    echo "--- [LUMISHOST] Installation Node.js 22.14.0 LTS portable ---"
    rm -rf /mnt/server/lumishost-suite/node/*
    curl -sSL -o /tmp/node22.tar.xz https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz
    tar -xJf /tmp/node22.tar.xz --strip-components=1 -C /mnt/server/lumishost-suite/node
    rm -f /tmp/node22.tar.xz
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
cat << 'EOF_GAMEPLAY_GZ' | base64 -d | gunzip > "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_gameplay.txt"
${toBase64Gzip(gameplayTxt)}
EOF_GAMEPLAY_GZ
cp "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_gameplay.txt" "/mnt/server/.config/SCP Secret Laboratory/config/\${ACTIVE_PORT}/config_gameplay.txt" 2>/dev/null || true

# 5. Ecriture automatique de config_remoteadmin.txt (Staff O5, Roles Customs & Tags VIP)
cat << 'EOF_RA_GZ' | base64 -d | gunzip > "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt"
${toBase64Gzip(remoteAdminTxt)}
EOF_RA_GZ
cp "/mnt/server/.config/SCP Secret Laboratory/config/1031/config_remoteadmin.txt" "/mnt/server/.config/SCP Secret Laboratory/config/\${ACTIVE_PORT}/config_remoteadmin.txt" 2>/dev/null || true

# 6. Ecriture complete des configurations EXILED 9 ({PORT}-config.yml + permissions.yml + plugins)
cat << 'EOF_EXILED_MAIN_GZ' | base64 -d | gunzip > "/mnt/server/.config/EXILED/Configs/1031-config.yml"
${toBase64Gzip(exiledMainConfigYml)}
EOF_EXILED_MAIN_GZ
if [ "\${ACTIVE_PORT}" != "1031" ]; then
    cp -f "/mnt/server/.config/EXILED/Configs/1031-config.yml" "/mnt/server/.config/EXILED/Configs/\${ACTIVE_PORT}-config.yml"
fi

cat << 'EOF_EXILED_PERMS_GZ' | base64 -d | gunzip > "/mnt/server/.config/EXILED/Configs/permissions.yml"
${toBase64Gzip(exiledPermissionsYml)}
EOF_EXILED_PERMS_GZ

cat << 'EOF_TEAMS_GZ' | base64 -d | gunzip > "/mnt/server/.config/EXILED/Configs/CustomTeams.yml"
${toBase64Gzip(customTeamsYml)}
EOF_TEAMS_GZ

cat << 'EOF_VIP_GZ' | base64 -d | gunzip > "/mnt/server/.config/EXILED/Configs/VipAdvantages.yml"
${toBase64Gzip(vipAdvantagesYml)}
EOF_VIP_GZ

cat << 'EOF_STAFF_ITEMS_GZ' | base64 -d | gunzip > "/mnt/server/.config/EXILED/Configs/StaffLoadouts.yml"
${toBase64Gzip(staffLoadoutsYml)}
EOF_STAFF_ITEMS_GZ

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
  "version": "2.6.0",
  "type": "module",
  "dependencies": {
    "axios": "^1.7.7",
    "discord.js": "^14.16.3",
    "dotenv": "^16.4.5",
    "mysql2": "^3.11.4"
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
        (cd /mnt/server/webpanel && rm -f package-lock.json && NODE_ENV=development /mnt/server/lumishost-suite/node/bin/npm install --legacy-peer-deps --include=optional --no-audit --no-fund && /mnt/server/lumishost-suite/node/bin/npm run build)
    fi
fi

if [ -z "\${WEB_PANEL_GIT_URL}" ]; then
    echo "--- [LUMISHOST] Mise a jour / installation du Panel Web Complet v2.6.0 sur le port 1032 ---"
    mkdir -p /mnt/server/webpanel/public
    cat << 'EOF_WP_PKG' > "/mnt/server/webpanel/package.json"
{
  "name": "lumishost-scpsl-webpanel",
  "version": "2.6.0",
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  },
  "dependencies": {
    "express": "^4.21.2",
    "mysql2": "^3.11.4"
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
        description: 'Identifiant court de votre serveur sur LumisHost (ex: 283ba3e0).',
        env_variable: 'PTERO_SERVER_ID',
        default_value: pteroServerId,
        user_viewable: true,
        user_editable: true,
        rules: 'required|string',
        field_type: 'text'
      },
      {
        name: 'Salon Discord Logs En Direct (Channel ID)',
        description: 'ID du salon Discord pour recevoir les logs automatiques (Connexions, Kills, Teamkills, Admin).',
        env_variable: 'DISCORD_LOG_CHANNEL_ID',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Salon Discord Sanctions (Channel ID)',
        description: 'ID du salon Discord pour recevoir tous les embeds de Bans, Kicks, Warns et Unbans.',
        env_variable: 'DISCORD_SANCTION_CHANNEL_ID',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'Webhook Discord Logs (Optionnel)',
        description: 'URL Webhook Discord pour envoyer les sanctions et alertes Teamkill depuis le Panel Web.',
        env_variable: 'DISCORD_WEBHOOK_URL',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'MySQL Host (Base Pterodactyl)',
        description: 'Adresse IP ou hostname de votre base MySQL (onglet Databases sur Pterodactyl).',
        env_variable: 'MYSQL_HOST',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'MySQL Port',
        description: 'Port MySQL (par defaut 3306).',
        env_variable: 'MYSQL_PORT',
        default_value: '3306',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|numeric',
        field_type: 'text'
      },
      {
        name: 'MySQL Database Name',
        description: 'Nom de la base MySQL (ex: s12_scpsl).',
        env_variable: 'MYSQL_DATABASE',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'MySQL Username',
        description: 'Utilisateur MySQL fourni dans Pterodactyl -> Databases.',
        env_variable: 'MYSQL_USER',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
        field_type: 'text'
      },
      {
        name: 'MySQL Password',
        description: 'Mot de passe MySQL fourni dans Pterodactyl -> Databases.',
        env_variable: 'MYSQL_PASSWORD',
        default_value: '',
        user_viewable: true,
        user_editable: true,
        rules: 'nullable|string',
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
        default_value: '283ba3e0',
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
  const cleanUrl = pteroUrl.replace(/\/$/, '') || 'https://panel.lumishost.com';
  const cleanId = serverId || '283ba3e0';

  return `/**
 * BOT DISCORD OFFICIEL LUMISHOST SITE-19 v2.6.0 (SCP:SL 14.2.9 + EXILED 9 + PTERODACTYL + MYSQL)
 * Serveur : ${serverName} (play.lumishost.com:1031) · Panel : https://scpsl.lumishost.com
 * Fonctionnalités : Statut Live rotatif (joueurs, CPU, RAM), 18 commandes Slash complètes,
 * préfixe '/' LocalAdmin automatique, Embeds haute qualité, Watcher Logs temps réel sur Discord & MySQL.
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActivityType
} from 'discord.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const CONFIG = {
  DISCORD_TOKEN: (process.env.DISCORD_TOKEN || '').trim(),
  CLIENT_ID: (process.env.DISCORD_CLIENT_ID || '').trim(),
  GUILD_ID: (process.env.DISCORD_GUILD_ID || '1234962559791140896').trim(),
  LOG_CHANNEL_ID: (process.env.DISCORD_LOG_CHANNEL_ID || '').trim(),
  SANCTION_CHANNEL_ID: (process.env.DISCORD_SANCTION_CHANNEL_ID || process.env.DISCORD_LOG_CHANNEL_ID || '').trim(),
  PTERO_URL: (process.env.PTERO_URL || '${cleanUrl}').replace(/\\/+$/, ''),
  PTERO_API_KEY: (process.env.PTERO_CLIENT_API_KEY || '').trim(),
  PTERO_SERVER_ID: (process.env.PTERO_SERVER_ID || '${cleanId}').trim(),
  GAME_PORT: (process.env.SERVER_PORT || '1031').trim(),
  CONFIG_DIR: path.join(process.env.SCPSL_ROOT || '/home/container', '.config'),
  PANEL_URL: 'https://scpsl.lumishost.com',
  CONNECT_ADDR: 'play.lumishost.com:' + (process.env.SERVER_PORT || '1031')
};

const NATIVE_LOCALADMIN_CMDS = new Set([
  'sr', 'roundrestart', 'list', 'players', 'p', 'config', 'forcestart',
  'stop', 'exit', 'quit', 'help', 'seed', 'plugins', 'exiled', 'echo'
]);

function formatScpslCmd(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (t.startsWith('/') || t.startsWith('!') || t.startsWith('@') || t.startsWith('$')) return t;
  const first = t.split(/\\s+/)[0].toLowerCase();
  if (NATIVE_LOCALADMIN_CMDS.has(first)) return t;
  if (first === 'god' || first === 'noclip' || first === 'bypass') {
    return '/' + t.replace(/\\s+on$/i, ' 1').replace(/\\s+off$/i, ' 0');
  }
  return '/' + t;
}

function normalizeDuration(raw) {
  const c = String(raw || '24h').trim().toLowerCase();
  if (!c || c === '0' || c.includes('perm')) return '50y';
  if (/^\\d+(s|m|h|d|w|mo|y)$/.test(c)) return c;
  const n = (c.match(/(\\d+)/) || [0, '24'])[1];
  if (c.includes('min')) return n + 'm';
  if (c.includes('jour') || c.includes('day') || c.includes('j')) return n + 'd';
  if (c.includes('sem') || c.includes('week')) return n + 'w';
  if (c.includes('an') || c.includes('year')) return n + 'y';
  return n + 'h';
}

function makeBar(pct, size = 10) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const filled = Math.round((clamped / 100) * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled) + \` \${clamped.toFixed(1)}%\`;
}

function formatUptime(ms) {
  const sec = Math.floor((Number(ms) || 0) / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return (d > 0 ? \`\${d}j \` : '') + \`\${h}h \${m}m\`;
}

const pteroHeaders = () => ({
  Authorization: \`Bearer \${CONFIG.PTERO_API_KEY}\`,
  'Content-Type': 'application/json',
  Accept: 'Application/vnd.pterodactyl.v1+json'
});

let mysqlPool = null;
async function recordSanctionMysql(rec) {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) return;
  try {
    if (!mysqlPool) {
      const m = await import('mysql2/promise');
      mysqlPool = m.default.createPool({
        host: process.env.MYSQL_HOST.trim(),
        port: Number(process.env.MYSQL_PORT || 3306),
        database: process.env.MYSQL_DATABASE.trim(),
        user: process.env.MYSQL_USER.trim(),
        password: process.env.MYSQL_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 3
      });
      await mysqlPool.query(
        'CREATE TABLE IF NOT EXISTS lumishost_sanctions (id VARCHAR(64) PRIMARY KEY, target_name VARCHAR(191), target_steam_id VARCHAR(128), sanction_type VARCHAR(32), reason TEXT, duration VARCHAR(64), moderator VARCHAR(191), source VARCHAR(64), timestamp_label VARCHAR(64), active TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
      );
    }
    await mysqlPool.query(
      'INSERT INTO lumishost_sanctions (id,target_name,target_steam_id,sanction_type,reason,duration,moderator,source,timestamp_label,active) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [rec.id, rec.targetName, rec.targetSteamId, rec.type, rec.reason, rec.duration, rec.moderator, 'Bot Discord', rec.timestamp, rec.active ? 1 : 0]
    );
  } catch (e) {
    console.error('[BOT MYSQL]', e.message);
  }
}

async function sendPterodactylCommand(rawCommand) {
  const command = formatScpslCmd(rawCommand);
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/command\`;
  await axios.post(url, { command }, { headers: pteroHeaders() });
  return command;
}

async function sendPowerSignal(signal) {
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/power\`;
  await axios.post(url, { signal }, { headers: pteroHeaders() });
}

async function getServerResources() {
  const url = \`\${CONFIG.PTERO_URL}/api/client/servers/\${CONFIG.PTERO_SERVER_ID}/resources\`;
  const res = await axios.get(url, { headers: pteroHeaders() });
  return res.data.attributes;
}

function readLocalLogs(subDir, maxLines = 180) {
  const dir = path.join(CONFIG.CONFIG_DIR, 'SCP Secret Laboratory', subDir, CONFIG.GAME_PORT);
  if (!fs.existsSync(dir)) return { file: null, lines: [] };
  const txts = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.txt'))
    .map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs }))
    .sort((a, b) => a.t - b.t);
  if (!txts.length) return { file: null, lines: [] };
  const latest = txts[txts.length - 1].n;
  const raw = fs.readFileSync(path.join(dir, latest), 'utf8');
  return { file: latest, lines: raw.split(/\\r?\\n/).filter(Boolean).slice(-maxLines) };
}

function parseOnlinePlayersFromLocalLogs() {
  const la = readLocalLogs('LocalAdminLogs', 220);
  const sv = readLocalLogs('ServerLogs', 220);
  const map = new Map();

  for (const ln of [...sv.lines, ...la.lines]) {
    const sm = ln.match(/(\\d{17}@(?:steam|discord|northwood))/i);
    if (!sm) continue;
    const sid = sm[1];
    const lo = ln.toLowerCase();
    const idm = ln.match(/\\[(\\d{1,4})\\]/) || ln.match(/\\bID[:\\s#]+(\\d{1,4})\\b/i) || ln.match(/\\((\\d{1,4})\\)\\s*[-–]/);
    const nm = ln.match(/(?:\\]\\s*|[-–]\\s*|\\)\\s*)([^\\(\\[\\|]+?)\\s*\\(\\d{17}@/);
    const prev = map.get(sid);
    if (lo.includes('disconnected') || lo.includes('left the server') || lo.includes('kicked') || lo.includes('banned from')) {
      if (prev) map.set(sid, { ...prev, isOnline: false });
      continue;
    }
    const name = (nm && nm[1] ? nm[1].replace(/^[\\-\\*\\s:\\[\\]\\d]+/, '').trim() : '') || (prev && prev.name) || sid;
    map.set(sid, { id: idm ? Number(idm[1]) : (prev ? prev.id : 0), name, steamId: sid, isOnline: true });
  }

  let li = -1;
  for (let i = la.lines.length - 1; i >= 0; i--) {
    if (/list of players|players\\s*\\(\\d+|no players connected/i.test(la.lines[i])) { li = i; break; }
  }
  if (li !== -1) {
    const seen = new Set();
    let empty = false;
    for (const ln of la.lines.slice(li, li + 60)) {
      if (/no players connected|0\\s*\\/\\s*\\d+\\s*players/i.test(ln)) empty = true;
      const sm = ln.match(/(\\d{17}@(?:steam|discord|northwood))/i);
      if (!sm) continue;
      seen.add(sm[1]);
      const idm = ln.match(/\\[(\\d{1,4})\\]/) || ln.match(/\\bID[:\\s#]+(\\d{1,4})\\b/i) || ln.match(/\\((\\d{1,4})\\)/);
      const nm = ln.match(/(?:\\]\\s*|[-–]\\s*|\\)\\s*)([^\\(\\[\\|]+?)\\s*\\(\\d{17}@/);
      const prev = map.get(sm[1]);
      map.set(sm[1], {
        id: idm ? Number(idm[1]) : (prev ? prev.id : 1),
        name: (nm && nm[1] ? nm[1].replace(/^[\\-\\*\\s:\\[\\]\\d]+/, '').trim() : '') || (prev ? prev.name : sm[1]),
        steamId: sm[1],
        isOnline: true
      });
    }
    if (empty && seen.size === 0) for (const [k, v] of map) map.set(k, { ...v, isOnline: false });
    else if (seen.size > 0) for (const [k, v] of map) if (!seen.has(k)) map.set(k, { ...v, isOnline: false });
  }

  let seq = 1;
  return Array.from(map.values())
    .filter((p) => p.isOnline)
    .map((p) => (p.id > 0 ? p : { ...p, id: seq++ }));
}

function addMemberToRemoteAdminFile(steamId, role, label) {
  const raPath = path.join(CONFIG.CONFIG_DIR, 'SCP Secret Laboratory/config', CONFIG.GAME_PORT, 'config_remoteadmin.txt');
  if (!fs.existsSync(raPath)) return false;
  let txt = fs.readFileSync(raPath, 'utf8');
  const esc = steamId.replace(/[.*+?^$()|[\\]\\\\]/g, '\\\\$&');
  const re = new RegExp('^\\\\s*-\\\\s*' + esc + ':.*$', 'm');
  if (re.test(txt)) txt = txt.replace(re, \` - \${steamId}: \${role}\`);
  else if (/^Members:\\s*\\[\\]/m.test(txt)) txt = txt.replace(/^Members:\\s*\\[\\]/m, \`Members:\\n # \${label}\\n - \${steamId}: \${role}\`);
  else if (txt.includes('Members:')) txt = txt.replace('Members:', \`Members:\\n # \${label}\\n - \${steamId}: \${role}\`);
  else txt = \`Members:\\n # \${label}\\n - \${steamId}: \${role}\\n\\n\` + txt;
  fs.writeFileSync(raPath, txt, 'utf8');
  return true;
}

function baseEmbed(title, color = 0x06B6D4) {
  return new EmbedBuilder()
    .setAuthor({ name: 'LUMISHOST SITE-19 · SCP:SL 14.2.9', url: CONFIG.PANEL_URL })
    .setTitle(title)
    .setColor(color)
    .setFooter({ text: \`\${CONFIG.CONNECT_ADDR} · Panel Web: scpsl.lumishost.com\` })
    .setTimestamp();
}

async function sendToChannel(channelId, embed) {
  if (!channelId) return;
  try {
    const ch = await client.channels.fetch(channelId);
    if (ch && ch.isTextBased()) await ch.send({ embeds: [embed] });
  } catch (e) {
    console.error('[BOT LOG CHANNEL]', e.message);
  }
}

const commands = [
  new SlashCommandBuilder().setName('status').setDescription('Tableau de bord complet du serveur SCP:SL (Joueurs, CPU, RAM, Disque, Uptime)'),
  new SlashCommandBuilder().setName('players').setDescription('Afficher la liste des vrais joueurs connectés en direct (ID + Pseudo + SteamID64)'),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un joueur en ligne ou hors-ligne (/ban + /oban + MySQL + Log Discord)')
    .addStringOption(o => o.setName('cible').setDescription('SteamID64 (76561199...@steam) ou ID numérique').setRequired(true))
    .addStringOption(o => o.setName('duree').setDescription('Durée (ex: 1h, 24h, 7d, 30d, perm)').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Motif de la sanction').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un SteamID64 du serveur SCP:SL (/unban id)')
    .addStringOption(o => o.setName('steamid').setDescription('76561199...@steam').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser immédiatement un joueur connecté du serveur SCP:SL')
    .addStringOption(o => o.setName('cible').setDescription('ID joueur (ex: 1) ou SteamID64').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Motif de l’expulsion').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un joueur directement sur son écran en jeu (/pbc) et enregistrer au casier')
    .addStringOption(o => o.setName('cible').setDescription('ID joueur ou SteamID64').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Message d’avertissement').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Diffuser un message staff à tous les joueurs en jeu (/bc)')
    .addStringOption(o => o.setName('message').setDescription('Texte à afficher en haut de l’écran').setRequired(true))
    .addIntegerOption(o => o.setName('duree').setDescription('Durée en secondes (défaut: 10)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName('cassie')
    .setDescription('Faire parler l’IA C.A.S.S.I.E. dans tout le complexe Site-19 (/cassie)')
    .addStringOption(o => o.setName('texte').setDescription('Texte anglais C.A.S.S.I.E. (ex: attention all personnel)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName('addmod')
    .setDescription('Ajouter un Staff dans config_remoteadmin.txt + config reload + /setgroup')
    .addStringOption(o => o.setName('steamid').setDescription('76561199...@steam').setRequired(true))
    .addStringOption(o => o.setName('grade').setDescription('owner | developer | admin | moderator | helper').setRequired(true))
    .addStringOption(o => o.setName('pseudo').setDescription('Pseudo du staff').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('givevip')
    .setDescription('Attribuer un Tag VIP dans config_remoteadmin.txt + /setgroup')
    .addStringOption(o => o.setName('steamid').setDescription('76561199...@steam').setRequired(true))
    .addStringOption(o => o.setName('tier').setDescription('Grade VIP (${vipTiers.map(v => v.id).join(', ')})').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('forceclass')
    .setDescription('Changer la classe d’un joueur en jeu (/forceclass)')
    .addStringOption(o => o.setName('cible').setDescription('ID joueur ou SteamID64').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('Ex: Scp173, Scp049, NtfCaptain, ChaosMarauder, Tutorial').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('give')
    .setDescription('Donner un objet ou une arme à un joueur en jeu (/give)')
    .addStringOption(o => o.setName('cible').setDescription('ID joueur ou SteamID64').setRequired(true))
    .addStringOption(o => o.setName('item').setDescription('Ex: KeycardO5, GunCOM45, MicroHID, Jailbird, SCP268').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('spawnteam')
    .setDescription('Déployer une équipe custom EXILED en jeu')
    .addStringOption(o => o.setName('equipe').setDescription('Clé (${customTeams.map(t => t.roleKey).join(', ')})').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('eventmode')
    .setDescription('Activer/Désactiver le Mode Event avec Broadcast & C.A.S.S.I.E.')
    .addBooleanOption(o => o.setName('actif').setDescription('true = activer, false = désactiver').setRequired(true))
    .addStringOption(o => o.setName('nom_event').setDescription('Nom de l’événement').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  new SlashCommandBuilder()
    .setName('round')
    .setDescription('Contrôler la manche en cours (restart, lock, unlock, forcestart)')
    .addStringOption(o => o.setName('action').setDescription('restart | lock | unlock | forcestart').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('warhead')
    .setDescription('Contrôler l’Ogive Nucléaire Alpha Warhead (detonate, cancel, lock, unlock)')
    .addStringOption(o => o.setName('action').setDescription('detonate | cancel | lock | unlock').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Afficher les 15 dernières lignes de logs réels (ServerLogs / LocalAdmin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder()
    .setName('console')
    .setDescription('Envoyer n’importe quelle commande (préfixe / géré automatiquement)')
    .addStringOption(o => o.setName('cmd').setDescription('Ex: /bc 10 Salut, /god 1 1, sr, config reload').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('power')
    .setDescription('Contrôler l’alimentation du serveur Pterodactyl (start, restart, stop)')
    .addStringOption(o => o.setName('action').setDescription('start | restart | stop').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

if (!CONFIG.DISCORD_TOKEN) {
  console.log('[BOT SCP:SL] Aucun DISCORD_TOKEN renseigné. Bot en veille.');
  process.exit(0);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let presenceStep = 0;
async function updateLivePresence() {
  if (!client.user) return;
  try {
    const stats = CONFIG.PTERO_API_KEY ? await getServerResources() : null;
    const online = parseOnlinePlayersFromLocalLogs();
    const state = stats ? String(stats.current_state || 'offline').toUpperCase() : 'EN LIGNE';
    const ramGb = stats ? (stats.resources.memory_bytes / (1024 ** 3)).toFixed(2) : '0.00';
    const cpuPct = stats ? Number(stats.resources.cpu_absolute || 0).toFixed(1) : '0.0';

    const statuses = [
      { name: \`\${state === 'RUNNING' ? '🟢' : '🔴'} \${online.length}/32 joueurs · \${CONFIG.CONNECT_ADDR}\`, type: ActivityType.Watching },
      { name: \`⚡ CPU \${cpuPct}% · RAM \${ramGb} Go · Site-19\`, type: ActivityType.Watching },
      { name: \`🛡️ Panel: scpsl.lumishost.com · EXILED 9\`, type: ActivityType.Playing }
    ];
    const picked = statuses[presenceStep % statuses.length];
    presenceStep++;

    client.user.setPresence({
      status: state === 'RUNNING' ? 'online' : 'dnd',
      activities: [{ name: picked.name, type: picked.type }]
    });
  } catch {
    client.user.setPresence({
      status: 'idle',
      activities: [{ name: \`Site-19 · \${CONFIG.CONNECT_ADDR}\`, type: ActivityType.Watching }]
    });
  }
}

// Live ServerLogs & LocalAdminLogs watcher -> automatic Discord log embeds
const seenLogHashes = new Set();
let logWatcherBootstrapped = false;

async function pollLiveLogsToDiscord() {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  const sv = readLocalLogs('ServerLogs', 60);
  const la = readLocalLogs('LocalAdminLogs', 40);
  const all = [...sv.lines, ...la.lines];

  if (!logWatcherBootstrapped) {
    all.forEach((l) => seenLogHashes.add(l));
    logWatcherBootstrapped = true;
    return;
  }

  for (const line of all) {
    if (seenLogHashes.has(line)) continue;
    seenLogHashes.add(line);
    if (seenLogHashes.size > 1500) {
      const first = seenLogHashes.values().next().value;
      seenLogHashes.delete(first);
    }

    const lo = line.toLowerCase();
    let title = null;
    let color = 0x38BDF8;
    let targetChan = CONFIG.LOG_CHANNEL_ID;

    if (lo.includes('teamkill') || lo.includes('friendly fire')) {
      title = '🚨 ALERTE TEAMKILL DÉTECTÉ';
      color = 0xDC143C;
      targetChan = CONFIG.SANCTION_CHANNEL_ID || CONFIG.LOG_CHANNEL_ID;
    } else if (lo.includes('banned') || lo.includes('kicked')) {
      title = '🔨 SANCTION EN JEU';
      color = 0xF97316;
      targetChan = CONFIG.SANCTION_CHANNEL_ID || CONFIG.LOG_CHANNEL_ID;
    } else if (lo.includes(' killed ') || lo.includes('has been killed by')) {
      title = '⚔️ ÉLIMINATION (KILL)';
      color = 0xF59E0B;
    } else if (lo.includes('remoteadmin') || lo.includes('executed command')) {
      title = '🛠️ ACTION REMOTEADMIN';
      color = 0x8B5CF6;
    } else if (lo.includes('connected') && !lo.includes('disconnected') && /\\d{17}@/.test(line)) {
      title = '🟢 CONNEXION JOUEUR';
      color = 0x10B981;
    } else if (lo.includes('disconnected') && /\\d{17}@/.test(line)) {
      title = '🔴 DÉCONNEXION JOUEUR';
      color = 0x64748B;
    }

    if (title) {
      const embed = baseEmbed(title, color).setDescription(\`\\\`\\\`\\\`\\n\${line.slice(0, 350)}\\n\\\`\\\`\\\`\`);
      await sendToChannel(targetChan, embed);
    }
  }
}

client.once('clientReady', async () => {
  console.log(\`[BOT SCP:SL] Connecté en tant que \${client.user.tag}\`);
  const rest = new REST({ version: '10' }).setToken(CONFIG.DISCORD_TOKEN);
  const appId = CONFIG.CLIENT_ID || client.user.id;
  try {
    if (CONFIG.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(appId, CONFIG.GUILD_ID), { body: commands.map(c => c.toJSON()) });
      console.log(\`[BOT SCP:SL] \${commands.length} commandes Slash enregistrées sur la guilde \${CONFIG.GUILD_ID}.\`);
    } else {
      await rest.put(Routes.applicationCommands(appId), { body: commands.map(c => c.toJSON()) });
      console.log(\`[BOT SCP:SL] \${commands.length} commandes Slash globales enregistrées.\`);
    }
  } catch (err) {
    console.error('[BOT SCP:SL] Erreur guilde, fallback global:', err.message);
    await rest.put(Routes.applicationCommands(appId), { body: commands.map(c => c.toJSON()) }).catch(() => {});
  }

  await updateLivePresence();
  setInterval(updateLivePresence, 25000);
  setInterval(pollLiveLogsToDiscord, 12000);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'status') {
      await interaction.deferReply();
      const stats = await getServerResources();
      const online = parseOnlinePlayersFromLocalLogs();
      const isUp = stats.current_state === 'running';
      const ramGb = (stats.resources.memory_bytes / (1024 ** 3)).toFixed(2);
      const diskGb = (stats.resources.disk_bytes / (1024 ** 3)).toFixed(2);
      const cpuPct = Number(stats.resources.cpu_absolute || 0);
      const embed = baseEmbed(isUp ? '🟢 Site-19 EN LIGNE — État Temps Réel' : '🔴 Site-19 HORS LIGNE', isUp ? 0x10B981 : 0xDC143C)
        .setDescription(\`**Connexion Directe :** \\\`\${CONFIG.CONNECT_ADDR}\\\`\\n**Panel Web RemoteAdmin :** \${CONFIG.PANEL_URL}\`)
        .addFields(
          { name: '👥 Joueurs En Ligne', value: \`**\${online.length} / 32**\`, inline: true },
          { name: '📡 État Serveur', value: \`**\${String(stats.current_state).toUpperCase()}**\`, inline: true },
          { name: '⏱️ Uptime', value: formatUptime(stats.resources.uptime), inline: true },
          { name: '⚡ Processeur (CPU)', value: \`\\\`\${makeBar(Math.min(100, cpuPct))}\\\`\`, inline: false },
          { name: '🧠 Mémoire RAM', value: \`**\${ramGb} Go**\`, inline: true },
          { name: '💾 Stockage Disque', value: \`**\${diskGb} Go**\`, inline: true },
          { name: '⚙️ Version', value: 'SCP:SL 14.2.9 · EXILED 9', inline: true }
        );
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'players') {
      await interaction.deferReply();
      if (CONFIG.PTERO_API_KEY) {
        await sendPterodactylCommand('list');
        await new Promise((r) => setTimeout(r, 600));
      }
      const online = parseOnlinePlayersFromLocalLogs();
      const embed = baseEmbed(\`👥 Joueurs Connectés sur Site-19 (\${online.length}/32)\`, online.length > 0 ? 0x10B981 : 0x64748B);
      if (online.length === 0) {
        embed.setDescription(\`Aucun joueur actuellement connecté sur \\\`\${CONFIG.CONNECT_ADDR}\\\`.\`);
      } else {
        embed.setDescription(online.map((p) => \`**#\${p.id}** · **\${p.name}** — \\\`\${p.steamId}\\\`\`).join('\\n'));
      }
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'ban') {
      await interaction.deferReply();
      const cible = interaction.options.getString('cible', true).trim();
      const dureeRaw = interaction.options.getString('duree', true).trim();
      const raison = interaction.options.getString('raison', true).trim();
      const dur = normalizeDuration(dureeRaw);

      const online = parseOnlinePlayersFromLocalLogs();
      const found = online.find((p) => String(p.id) === cible || p.steamId.toLowerCase() === cible.toLowerCase());
      const executed = [];
      if (found) executed.push(await sendPterodactylCommand(\`/ban \${found.id} \${dur} \${raison} (Par \${interaction.user.username})\`));
      const steamId = found ? found.steamId : (cible.includes('@') ? cible : \`\${cible}@steam\`);
      executed.push(await sendPterodactylCommand(\`/oban \${steamId} \${dur} \${raison} (Par \${interaction.user.username})\`));

      await recordSanctionMysql({
        id: 'SAN-' + Date.now().toString().slice(-6),
        targetName: found ? found.name : steamId,
        targetSteamId: steamId,
        type: 'BAN',
        reason: raison,
        duration: \`\${dureeRaw} (\${dur})\`,
        moderator: interaction.user.tag,
        timestamp: new Date().toLocaleString('fr-FR'),
        active: true
      });

      const embed = baseEmbed('🔨 Bannissement Exécuté — Site-19', 0xDC143C)
        .addFields(
          { name: '👤 Joueur / SteamID', value: \`\${found ? found.name + ' · ' : ''}\\\`\${steamId}\\\`\`, inline: true },
          { name: '⏱️ Durée', value: \`**\${dureeRaw}** (\\\`\${dur}\\\`)\`, inline: true },
          { name: '👮 Modérateur', value: \`<@\${interaction.user.id}>\`, inline: true },
          { name: '📝 Motif', value: raison, inline: false },
          { name: '⚙️ Console Exécutée', value: \`\\\`\${executed.join(' ; ')}\\\`\`, inline: false }
        );
      await sendToChannel(CONFIG.SANCTION_CHANNEL_ID, embed);
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'unban') {
      await interaction.deferReply();
      const raw = interaction.options.getString('steamid', true).trim();
      const sid = raw.includes('@') ? raw : \`\${raw}@steam\`;
      const cmd = await sendPterodactylCommand(\`/unban id \${sid}\`);
      const embed = baseEmbed('✅ Débannissement Exécuté', 0x16A34A)
        .addFields(
          { name: '👤 SteamID64', value: \`\\\`\${sid}\\\`\`, inline: true },
          { name: '👮 Modérateur', value: \`<@\${interaction.user.id}>\`, inline: true },
          { name: '⚙️ Commande', value: \`\\\`\${cmd}\\\`\`, inline: false }
        );
      await sendToChannel(CONFIG.SANCTION_CHANNEL_ID, embed);
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'kick') {
      await interaction.deferReply();
      const cible = interaction.options.getString('cible', true).trim();
      const raison = interaction.options.getString('raison', true).trim();
      const found = parseOnlinePlayersFromLocalLogs().find((p) => String(p.id) === cible || p.steamId.toLowerCase() === cible.toLowerCase());
      const targetRef = found ? String(found.id) : cible;
      const cmd = await sendPterodactylCommand(\`/kick \${targetRef} \${raison}\`);
      const embed = baseEmbed('👢 Expulsion (Kick) Exécutée', 0xF97316)
        .addFields(
          { name: '👤 Cible', value: found ? \`**\${found.name}** (#\${found.id} · \\\`\${found.steamId}\\\`)\` : \`\\\`\${cible}\\\`\`, inline: true },
          { name: '👮 Modérateur', value: \`<@\${interaction.user.id}>\`, inline: true },
          { name: '📝 Motif', value: raison, inline: false },
          { name: '⚙️ Commande', value: \`\\\`\${cmd}\\\`\`, inline: false }
        );
      await sendToChannel(CONFIG.SANCTION_CHANNEL_ID, embed);
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'warn') {
      await interaction.deferReply();
      const cible = interaction.options.getString('cible', true).trim();
      const raison = interaction.options.getString('raison', true).trim();
      const found = parseOnlinePlayersFromLocalLogs().find((p) => String(p.id) === cible || p.steamId.toLowerCase() === cible.toLowerCase());
      const cmd = found
        ? await sendPterodactylCommand(\`/pbc \${found.id} 10 <color=#DC143C><b>[AVERTISSEMENT STAFF]</b></color> \${raison}\`)
        : await sendPterodactylCommand(\`/bc 8 <color=#FAFF86><b>[WARN STAFF]</b></color> \${cible} : \${raison}\`);
      const embed = baseEmbed('⚠️ Avertissement En Jeu Envoyé', 0xF59E0B)
        .addFields(
          { name: '👤 Cible', value: found ? \`**\${found.name}** (#\${found.id})\` : \`\\\`\${cible}\\\`\`, inline: true },
          { name: '👮 Modérateur', value: \`<@\${interaction.user.id}>\`, inline: true },
          { name: '📝 Message', value: raison, inline: false },
          { name: '⚙️ Commande', value: \`\\\`\${cmd}\\\`\`, inline: false }
        );
      await sendToChannel(CONFIG.SANCTION_CHANNEL_ID, embed);
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'broadcast') {
      const msg = interaction.options.getString('message', true);
      const dur = interaction.options.getInteger('duree') || 10;
      const cmd = await sendPterodactylCommand(\`/bc \${dur} <color=#FAFF86><b>[ANNONCE DISCORD]</b></color> \${msg}\`);
      const embed = baseEmbed('📢 Broadcast Envoyé En Jeu', 0xF59E0B)
        .addFields(
          { name: '⏱️ Durée', value: \`\${dur} secondes\`, inline: true },
          { name: '👮 Auteur', value: \`<@\${interaction.user.id}>\`, inline: true },
          { name: '💬 Message', value: msg, inline: false }
        );
      return await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'cassie') {
      const texte = interaction.options.getString('texte', true);
      const cmd = await sendPterodactylCommand(\`/cassie \${texte}\`);
      const embed = baseEmbed('🔊 Annonce C.A.S.S.I.E. Diffusée', 0x06B6D4)
        .addFields({ name: '🎙️ Texte Vocal', value: \`\\\`\${texte}\\\`\` }, { name: '⚙️ Commande', value: \`\\\`\${cmd}\\\`\` });
      return await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === 'addmod' || interaction.commandName === 'givevip') {
      await interaction.deferReply();
      const rawSid = interaction.options.getString('steamid', true).trim();
      const steamId = rawSid.includes('@') ? rawSid : \`\${rawSid}@steam\`;
      const role = interaction.commandName === 'addmod'
        ? interaction.options.getString('grade', true).trim()
        : interaction.options.getString('tier', true).trim();
      const pseudo = interaction.options.getString('pseudo') || steamId;

      const savedFile = addMemberToRemoteAdminFile(steamId, role, pseudo);
      await sendPterodactylCommand('config reload');
      const found = parseOnlinePlayersFromLocalLogs().find((p) => p.steamId.toLowerCase() === steamId.toLowerCase());
      let liveCmd = 'En attente de connexion (déjà écrit dans config_remoteadmin.txt)';
      if (found) liveCmd = await sendPterodactylCommand(\`/setgroup \${found.id} \${role}\`);

      const embed = baseEmbed(interaction.commandName === 'addmod' ? '🛡️ Grade Staff Appliqué' : '⭐ Tag VIP Appliqué', 0x8B5CF6)
        .addFields(
          { name: '👤 Joueur', value: \`\${pseudo} (\\\`\${steamId}\\\`)\`, inline: true },
          { name: '🏷️ Rôle RemoteAdmin', value: \`**\${role}**\`, inline: true },
          { name: '💾 config_remoteadmin.txt', value: savedFile ? '✅ Mis à jour' : '⚠️ Non trouvé', inline: true },
          { name: '⚡ Application Live', value: \`\\\`\${liveCmd}\\\`\`, inline: false }
        );
      await sendToChannel(CONFIG.SANCTION_CHANNEL_ID, embed);
      return await interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === 'forceclass') {
      const cible = interaction.options.getString('cible', true).trim();
      const role = interaction.options.getString('role', true).trim();
      const found = parseOnlinePlayersFromLocalLogs().find((p) => String(p.id) === cible || p.steamId.toLowerCase() === cible.toLowerCase());
      const cmd = await sendPterodactylCommand(\`/forceclass \${found ? found.id : cible} \${role}\`);
      return await interaction.reply({ embeds: [baseEmbed('🎭 Forceclass Exécuté', 0x06B6D4).setDescription(\`Commande envoyée : \\\`\${cmd}\\\`\`)] });
    }

    if (interaction.commandName === 'give') {
      const cible = interaction.options.getString('cible', true).trim();
      const item = interaction.options.getString('item', true).trim();
      const found = parseOnlinePlayersFromLocalLogs().find((p) => String(p.id) === cible || p.steamId.toLowerCase() === cible.toLowerCase());
      const cmd = await sendPterodactylCommand(\`/give \${found ? found.id : cible} \${item}\`);
      return await interaction.reply({ embeds: [baseEmbed('🎒 Objet Donné En Jeu', 0x10B981).setDescription(\`Commande envoyée : \\\`\${cmd}\\\`\`)] });
    }

    if (interaction.commandName === 'spawnteam') {
      const equipe = interaction.options.getString('equipe', true).trim();
      const cmd = await sendPterodactylCommand(\`/customteam spawn \${equipe}\`);
      return await interaction.reply({ embeds: [baseEmbed('🪖 Équipe Custom Déployée', 0x8B5CF6).setDescription(\`Escouade **\${equipe}** lancée (\\\`\${cmd}\\\`).\`)] });
    }

    if (interaction.commandName === 'eventmode') {
      const actif = interaction.options.getBoolean('actif', true);
      const nomEvent = interaction.options.getString('nom_event') || 'Événement Spécial Site-19';
      if (actif) {
        await sendPterodactylCommand(\`/bc 12 <color=#FAFF86><b>[MODE EVENT ACTIVÉ]</b></color> \${nomEvent}\`);
        await sendPterodactylCommand('/cassie attention all personnel . special event mode activated');
      } else {
        await sendPterodactylCommand('/bc 8 <color=#50C878><b>[FIN D’EVENT]</b></color> Retour au mode normal.');
      }
      return await interaction.reply({ embeds: [baseEmbed(actif ? '🔥 Mode Event ACTIVÉ' : '✅ Mode Event DÉSACTIVÉ', actif ? 0xF59E0B : 0x10B981).setDescription(\`**Événement :** \${nomEvent}\`)] });
    }

    if (interaction.commandName === 'round') {
      const act = interaction.options.getString('action', true).toLowerCase();
      const map = { restart: 'sr', lock: '/roundlock true', unlock: '/roundlock false', forcestart: 'forcestart' };
      const cmd = await sendPterodactylCommand(map[act] || 'sr');
      return await interaction.reply({ embeds: [baseEmbed('🔄 Contrôle Manche Exécuté', 0x06B6D4).setDescription(\`Action **\${act.toUpperCase()}** → \\\`\${cmd}\\\`\`)] });
    }

    if (interaction.commandName === 'warhead') {
      const act = interaction.options.getString('action', true).toLowerCase();
      const cmd = await sendPterodactylCommand(\`/warhead \${act}\`);
      return await interaction.reply({ embeds: [baseEmbed('☢️ Alpha Warhead — ' + act.toUpperCase(), 0xDC143C).setDescription(\`Commande envoyée : \\\`\${cmd}\\\`\`)] });
    }

    if (interaction.commandName === 'logs') {
      const sv = readLocalLogs('ServerLogs', 15);
      const la = readLocalLogs('LocalAdminLogs', 15);
      const lines = sv.lines.length > 0 ? sv.lines : la.lines;
      const body = lines.length ? lines.join('\\n').slice(-1800) : 'Aucun fichier de log trouvé pour ce port.';
      return await interaction.reply({ embeds: [baseEmbed(\`📜 Derniers Logs (\${sv.file || la.file || 'Live'})\`, 0x38BDF8).setDescription(\`\\\`\\\`\\\`\\n\${body}\\n\\\`\\\`\\\`\`)], ephemeral: true });
    }

    if (interaction.commandName === 'console') {
      const raw = interaction.options.getString('cmd', true);
      const cmd = await sendPterodactylCommand(raw);
      return await interaction.reply({ embeds: [baseEmbed('💻 Commande Console Exécutée', 0xF59E0B).setDescription(\`Envoyé à LocalAdmin : \\\`\${cmd}\\\`\`)] });
    }

    if (interaction.commandName === 'power') {
      const action = interaction.options.getString('action', true).toLowerCase();
      await sendPowerSignal(action);
      return await interaction.reply({ embeds: [baseEmbed(\`⚡ Signal Alimentation : \${action.toUpperCase()}\`, action === 'stop' ? 0xDC143C : 0x10B981).setDescription(\`Signal **\${action}** transmis au conteneur Pterodactyl \\\`\${CONFIG.PTERO_SERVER_ID}\\\`.\`)] });
    }
  } catch (err) {
    const errEmbed = baseEmbed('❌ Erreur d’Exécution', 0xDC143C).setDescription(\`\\\`\${err.message}\\\`\`);
    if (interaction.deferred || interaction.replied) return await interaction.editReply({ embeds: [errEmbed] });
    return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
  }
});

client.login(CONFIG.DISCORD_TOKEN);
`;
}

