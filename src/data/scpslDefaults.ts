export interface ScpColorOption {
  id: string;
  label: string;
  hex: string;
}

export const SCPSL_BADGE_COLORS: ScpColorOption[] = [
  { id: 'crimson', label: 'Crimson (Rouge Sang)', hex: '#DC143C' },
  { id: 'red', label: 'Red (Rouge Admin)', hex: '#C50000' },
  { id: 'tomato', label: 'Tomato (Corail)', hex: '#FF6448' },
  { id: 'orange', label: 'Orange (Classe-D)', hex: '#FF9966' },
  { id: 'pumpkin', label: 'Pumpkin (Citrouille)', hex: '#EE7600' },
  { id: 'yellow', label: 'Yellow (Or / VIP)', hex: '#FAFF86' },
  { id: 'lime', label: 'Lime (Vert Vif)', hex: '#BFFF00' },
  { id: 'light_green', label: 'Light Green (Vert Clair)', hex: '#32CD32' },
  { id: 'emerald', label: 'Emerald (Émeraude)', hex: '#50C878' },
  { id: 'green', label: 'Green (Chaos)', hex: '#228B22' },
  { id: 'mint', label: 'Mint (Menthe)', hex: '#98FB98' },
  { id: 'blue_green', label: 'Blue Green (Turquoise)', hex: '#4DFFB8' },
  { id: 'aqua', label: 'Aqua (Bleu Eau)', hex: '#00FFFF' },
  { id: 'cyan', label: 'Cyan (MTF)', hex: '#00B7EB' },
  { id: 'deep_pink', label: 'Deep Pink (Rose Foncé)', hex: '#FF1493' },
  { id: 'magenta', label: 'Magenta (Néons)', hex: '#FF0090' },
  { id: 'pink', label: 'Pink (Rose Clair)', hex: '#FF96DE' },
  { id: 'silver', label: 'Silver (Argent)', hex: '#A0A0A0' },
  { id: 'nickel', label: 'Nickel (Acier)', hex: '#727472' },
  { id: 'army_green', label: 'Army Green (Militaire)', hex: '#4B5320' }
];

export interface ScpItemOption {
  id: string;
  label: string;
  category: 'Keycard' | 'Weapon' | 'Medical' | 'Armor' | 'Special';
  isStaffItem?: boolean;
}

export const SCPSL_ITEMS: ScpItemOption[] = [
  // Cartes d'accès (toutes les cartes officielles)
  { id: 'KeycardO5', label: '★ Carte Conseil O5 (Accès Total Staff)', category: 'Keycard', isStaffItem: true },
  { id: 'KeycardFacilityManager', label: 'Carte Directeur de Site', category: 'Keycard', isStaffItem: true },
  { id: 'KeycardMTFCaptain', label: 'Carte Capitaine MTF', category: 'Keycard' },
  { id: 'KeycardMTFOperative', label: 'Carte Opérateur MTF', category: 'Keycard' },
  { id: 'KeycardMTFPrivate', label: 'Carte Soldat MTF', category: 'Keycard' },
  { id: 'KeycardChaosInsurgency', label: 'Décodeur Insurrection du Chaos', category: 'Keycard' },
  { id: 'KeycardContainmentEngineer', label: 'Carte Ingénieur de Confinement', category: 'Keycard' },
  { id: 'KeycardResearchCoordinator', label: 'Carte Coordinateur de Recherche', category: 'Keycard' },
  { id: 'KeycardZoneManager', label: 'Carte Gestionnaire de Zone', category: 'Keycard' },
  { id: 'KeycardGuard', label: 'Carte Garde du Complexe', category: 'Keycard' },
  { id: 'KeycardScientist', label: 'Carte Scientifique', category: 'Keycard' },
  { id: 'KeycardJanitor', label: 'Carte Concierge', category: 'Keycard' },

  // Armes à feu & Armes Secrètes / Staff
  { id: 'GunCOM45', label: '★ Pistolet COM-45 (Arme Secrète Admin)', category: 'Weapon', isStaffItem: true },
  { id: 'GunA7', label: '★ Fusil AK-74 A7 (Arme Secrète Event)', category: 'Weapon', isStaffItem: true },
  { id: 'GunFRMG0', label: 'Mitrailleuse Lourde MTF FR-MG-0', category: 'Weapon', isStaffItem: true },
  { id: 'GunE11SR', label: 'Fusil Tactique MTF E-11 SR', category: 'Weapon' },
  { id: 'GunLogicer', label: 'Mitrailleuse Chaos Logicer', category: 'Weapon' },
  { id: 'GunAK', label: 'Fusil d’Assaut AK-47', category: 'Weapon' },
  { id: 'GunCrossvec', label: 'PM MTF Crossvec', category: 'Weapon' },
  { id: 'GunFSP9', label: 'PM Garde FSP-9', category: 'Weapon' },
  { id: 'GunShotgun', label: 'Fusil à Pompe Tactique', category: 'Weapon' },
  { id: 'GunRevolver', label: 'Revolver .44 Magnum', category: 'Weapon' },
  { id: 'GunCOM18', label: 'Pistolet COM-18', category: 'Weapon' },
  { id: 'GunCOM15', label: 'Pistolet COM-15', category: 'Weapon' },

  // Armes Spéciales, Expérimentales & Outils Staff
  { id: 'Jailbird', label: '★ Jailbird (Bâton Électrique Admin / Event)', category: 'Special', isStaffItem: true },
  { id: 'ParticleDisruptor', label: '★ 3-X Désintégrateur de Particules', category: 'Special', isStaffItem: true },
  { id: 'MicroHID', label: '★ Canon Électrique Micro H.I.D.', category: 'Special', isStaffItem: true },
  { id: 'SCP268', label: '★ SCP-268 (Casquette d’Invisibilité Staff)', category: 'Special', isStaffItem: true },
  { id: 'SCP1344', label: '★ SCP-1344 (Lunettes Vision Wallhack Staff)', category: 'Special', isStaffItem: true },
  { id: 'SCP018', label: '★ SCP-018 (Balle Rebondissante Mortelle)', category: 'Special', isStaffItem: true },
  { id: 'SCP1576', label: '★ SCP-1576 (Gramophone Spectateurs)', category: 'Special', isStaffItem: true },
  { id: 'SCP244a', label: 'SCP-244-A (Vase Cryogénique)', category: 'Special' },
  { id: 'SCP244b', label: 'SCP-244-B (Vase Cryogénique Antique)', category: 'Special' },
  { id: 'GrenadeHE', label: 'Grenade Frag HE', category: 'Special' },
  { id: 'GrenadeFlash', label: 'Grenade Flashbang', category: 'Special' },
  { id: 'Radio', label: '★ Radio Longue Portée Staff', category: 'Special', isStaffItem: true },
  { id: 'Flashlight', label: 'Lampe Torche Tactique', category: 'Special' },
  { id: 'Lantern', label: 'Lanterne Ancienne', category: 'Special' },
  { id: 'Coin', label: 'Pièce de la Fondation', category: 'Special' },

  // Objets SCP Médicaux & Soins
  { id: 'SCP500', label: '★ SCP-500 (Panacée Soin Complet)', category: 'Medical', isStaffItem: true },
  { id: 'AntiSCP207', label: '★ Anti-SCP-207 (Cola Régénération Immortelle)', category: 'Medical', isStaffItem: true },
  { id: 'SCP207', label: '★ SCP-207 (Cola Vitesse x1.5)', category: 'Medical', isStaffItem: true },
  { id: 'SCP1853', label: 'SCP-1853 (Sérum Réflexes & Précision)', category: 'Medical', isStaffItem: true },
  { id: 'SCP330', label: 'SCP-330 (Bonbons Anomaux)', category: 'Medical' },
  { id: 'Medkit', label: 'Trousse de Soin', category: 'Medical' },
  { id: 'Adrenaline', label: 'Injection Adrénaline', category: 'Medical' },
  { id: 'Painkillers', label: 'Antidouleurs', category: 'Medical' },

  // Armures
  { id: 'ArmorHeavy', label: '★ Armure Lourde Tactique', category: 'Armor', isStaffItem: true },
  { id: 'ArmorCombat', label: 'Armure de Combat', category: 'Armor' },
  { id: 'ArmorLight', label: 'Armure Légère', category: 'Armor' }
];

export interface StaffItemPack {
  id: string;
  label: string;
  description: string;
  items: string[];
}

export const STAFF_ITEM_PACKS: StaffItemPack[] = [
  {
    id: 'pack-o5-admin',
    label: 'Pack O5 Admin Complet',
    description: 'Accès total + armes secrètes + invisibilité + soin total',
    items: ['KeycardO5', 'GunCOM45', 'Jailbird', 'SCP268', 'SCP1344', 'SCP500', 'ArmorHeavy', 'Radio']
  },
  {
    id: 'pack-secret-weapons',
    label: 'Armes Secrètes & Event',
    description: 'COM-45, Jailbird, 3-X Désintégrateur, Micro H.I.D. et A7',
    items: ['KeycardO5', 'GunCOM45', 'Jailbird', 'ParticleDisruptor', 'MicroHID', 'GunA7', 'AntiSCP207', 'GrenadeHE']
  },
  {
    id: 'pack-stealth-mod',
    label: 'Pack Surveillance Modo',
    description: 'Invisibilité, vision à travers les murs, gramophone et accès O5',
    items: ['KeycardO5', 'SCP268', 'SCP1344', 'SCP1576', 'SCP500', 'Flashlight', 'Radio']
  },
  {
    id: 'pack-all-scp-items',
    label: 'Pack Objets SCP Anomaux',
    description: 'Tous les objets SCP principaux (500, 207, Anti-207, 268, 1344, 018)',
    items: ['SCP500', 'SCP207', 'AntiSCP207', 'SCP268', 'SCP1344', 'SCP018', 'SCP1853', 'SCP1576']
  }
];

export const REMOTEADMIN_PERMISSION_FLAGS: { id: string; label: string }[] = [
  { id: 'KickingAndShortTermBanning', label: 'Kick & Ban court' },
  { id: 'BanningUpToDay', label: 'Ban jusqu’à 24h' },
  { id: 'LongTermBanning', label: 'Ban longue durée / Perm' },
  { id: 'ForceclassSelf', label: 'Forceclass sur soi' },
  { id: 'ForceclassToSpectator', label: 'Forcer en Spectateur' },
  { id: 'ForceclassWithoutRestrictions', label: 'Forceclass tous joueurs' },
  { id: 'GivingItems', label: 'Donner Items (Give)' },
  { id: 'WarheadEvents', label: 'Contrôle Ogive Alpha' },
  { id: 'RespawnEvents', label: 'Spawn Vagues MTF / Chaos' },
  { id: 'RoundEvents', label: 'Restart / Lock Manche' },
  { id: 'SetGroup', label: 'Attribuer Rôles (SetGroup)' },
  { id: 'GameplayData', label: 'Données Gameplay' },
  { id: 'FacilityManagement', label: 'Portes / Lumières / Teslas' },
  { id: 'PlayersManagement', label: 'Heal / God / TP Joueurs' },
  { id: 'PermissionsManagement', label: 'Gestion Permissions' },
  { id: 'ServerConsoleCommands', label: 'Commandes Console' },
  { id: 'ViewHiddenBadges', label: 'Voir Badges Cachés' },
  { id: 'ServerConfigs', label: 'Reload Configs' },
  { id: 'Broadcasting', label: 'Broadcasts & Annonces' },
  { id: 'PlayerSensitiveDataAccess', label: 'Voir IP / SteamID' },
  { id: 'Noclip', label: 'Noclip (Vol Staff)' },
  { id: 'AFKImmunity', label: 'Immunité Anti-AFK' },
  { id: 'Overwatch', label: 'Mode Overwatch (Spectate)' },
  { id: 'Effects', label: 'Effets Joueurs' },
  { id: 'AdminChat', label: 'Chat Admin' },
  { id: 'Announcer', label: 'Annonces C.A.S.S.I.E.' }
];

export type WebPanelRole = string;

export interface WebPanelRolePermissionMatrix {
  roleId: WebPanelRole;
  label: string;
  badgeText: string;
  badgeColorId: string;
  badgeColorHex: string;
  kickPower: number;
  requiredKickPower: number;
  description: string;
  isBuiltIn?: boolean;
  canAccessInGameControl: boolean;
  canUseHeavyInGameActions: boolean;
  canAccessLogsAndProfiles: boolean;
  canBanPlayers: boolean;
  canUnbanPlayers: boolean;
  canManageStaffRa: boolean;
  canAccessEventsAndTeams: boolean;
  canAccessAdministrationTab: boolean;
  canAccessDeveloperTab: boolean;
  raPermissions: string[];
  staffItems: string[];
  autoEquipOnSpawn?: boolean;
  equipOnlyInTutorialMode?: boolean;
  clearInventoryBeforeEquip?: boolean;
}

export const INITIAL_PANEL_ROLE_PERMISSIONS: WebPanelRolePermissionMatrix[] = [
  {
    roleId: 'founder',
    label: 'Fondateur O5',
    badgeText: 'FONDATEUR O5',
    badgeColorId: 'crimson',
    badgeColorHex: '#DC143C',
    kickPower: 255,
    requiredKickPower: 255,
    isBuiltIn: true,
    description: 'Accès intégral 100% : Serveur, Modération, Administration, Avantages VIP et Section Développeur.',
    canAccessInGameControl: true,
    canUseHeavyInGameActions: true,
    canAccessLogsAndProfiles: true,
    canBanPlayers: true,
    canUnbanPlayers: true,
    canManageStaffRa: true,
    canAccessEventsAndTeams: true,
    canAccessAdministrationTab: true,
    canAccessDeveloperTab: true,
    raPermissions: REMOTEADMIN_PERMISSION_FLAGS.map((p) => p.id),
    staffItems: ['KeycardO5', 'GunCOM45', 'Jailbird', 'SCP268', 'SCP1344', 'SCP500', 'ArmorHeavy', 'Radio'],
    autoEquipOnSpawn: true,
    equipOnlyInTutorialMode: true,
    clearInventoryBeforeEquip: false
  },
  {
    roleId: 'developer',
    label: 'Développeur Système',
    badgeText: 'DÉVELOPPEUR SITE-19',
    badgeColorId: 'cyan',
    badgeColorHex: '#00B7EB',
    kickPower: 200,
    requiredKickPower: 200,
    isBuiltIn: true,
    description: 'Accès complet à la Section Développeur (Mega Egg, API Pterodactyl, Plugins C#, Bot Discord) et Administration.',
    canAccessInGameControl: true,
    canUseHeavyInGameActions: true,
    canAccessLogsAndProfiles: true,
    canBanPlayers: true,
    canUnbanPlayers: true,
    canManageStaffRa: true,
    canAccessEventsAndTeams: true,
    canAccessAdministrationTab: true,
    canAccessDeveloperTab: true,
    raPermissions: [
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
      'FacilityManagement',
      'PlayersManagement',
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
    ],
    staffItems: ['KeycardO5', 'GunCOM45', 'ParticleDisruptor', 'SCP268', 'SCP1344', 'SCP500', 'Radio'],
    autoEquipOnSpawn: true,
    equipOnlyInTutorialMode: true,
    clearInventoryBeforeEquip: false
  },
  {
    roleId: 'admin',
    label: 'Administrateur Site-19',
    badgeText: 'ADMIN SITE-19',
    badgeColorId: 'pumpkin',
    badgeColorHex: '#EE7600',
    kickPower: 100,
    requiredKickPower: 100,
    isBuiltIn: true,
    description: 'Gestion In-Game complète, Bans/Unbans, Events/Teams et Administration VIP. Aucun accès à la Section Développeur.',
    canAccessInGameControl: true,
    canUseHeavyInGameActions: true,
    canAccessLogsAndProfiles: true,
    canBanPlayers: true,
    canUnbanPlayers: true,
    canManageStaffRa: true,
    canAccessEventsAndTeams: true,
    canAccessAdministrationTab: true,
    canAccessDeveloperTab: false,
    raPermissions: [
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
      'FacilityManagement',
      'PlayersManagement',
      'ViewHiddenBadges',
      'Broadcasting',
      'PlayerSensitiveDataAccess',
      'Noclip',
      'AFKImmunity',
      'Overwatch',
      'Effects',
      'AdminChat',
      'Announcer'
    ],
    staffItems: ['KeycardO5', 'GunE11SR', 'Jailbird', 'SCP268', 'SCP500', 'ArmorHeavy', 'Radio'],
    autoEquipOnSpawn: true,
    equipOnlyInTutorialMode: true,
    clearInventoryBeforeEquip: false
  },
  {
    roleId: 'moderator',
    label: 'Modérateur',
    badgeText: 'MODÉRATEUR',
    badgeColorId: 'emerald',
    badgeColorHex: '#50C878',
    kickPower: 50,
    requiredKickPower: 50,
    isBuiltIn: true,
    description: 'Surveillance In-Game (Kick/Mute/Warn/Ban), Killfeed et Profils Online/Offline. Pas d’accès Développeur ni Administration.',
    canAccessInGameControl: true,
    canUseHeavyInGameActions: false,
    canAccessLogsAndProfiles: true,
    canBanPlayers: true,
    canUnbanPlayers: false,
    canManageStaffRa: false,
    canAccessEventsAndTeams: false,
    canAccessAdministrationTab: false,
    canAccessDeveloperTab: false,
    raPermissions: [
      'KickingAndShortTermBanning',
      'BanningUpToDay',
      'ForceclassToSpectator',
      'PlayersManagement',
      'ViewHiddenBadges',
      'Broadcasting',
      'Noclip',
      'AFKImmunity'
    ],
    staffItems: ['KeycardO5', 'SCP268', 'SCP1344', 'SCP1576', 'SCP500', 'Flashlight', 'Radio'],
    autoEquipOnSpawn: true,
    equipOnlyInTutorialMode: true,
    clearInventoryBeforeEquip: false
  },
  {
    roleId: 'helper',
    label: 'Helpeur / Staff Test',
    badgeText: 'HELPEUR',
    badgeColorId: 'silver',
    badgeColorHex: '#A0A0A0',
    kickPower: 20,
    requiredKickPower: 20,
    isBuiltIn: true,
    description: 'Consultation du Killfeed, des Logs et Warn/Mute uniquement. Aucune commande destructive.',
    canAccessInGameControl: true,
    canUseHeavyInGameActions: false,
    canAccessLogsAndProfiles: true,
    canBanPlayers: false,
    canUnbanPlayers: false,
    canManageStaffRa: false,
    canAccessEventsAndTeams: false,
    canAccessAdministrationTab: false,
    canAccessDeveloperTab: false,
    raPermissions: [
      'KickingAndShortTermBanning',
      'Broadcasting',
      'Noclip',
      'AFKImmunity'
    ],
    staffItems: ['KeycardFacilityManager', 'SCP268', 'SCP1576', 'Flashlight', 'Radio'],
    autoEquipOnSpawn: true,
    equipOnlyInTutorialMode: true,
    clearInventoryBeforeEquip: false
  }
];

export type VipFactionKey = 'ClassD' | 'Scientist' | 'FacilityGuard' | 'MTF' | 'Chaos' | 'CustomTeams';

export interface VipFactionLoadout {
  factionKey: VipFactionKey;
  factionLabel: string;
  bonusHp: number;
  bonusAhp: number;
  spawnChanceBoostPercent: number;
  extraItems: string[];
}

export interface StaffMember {
  id: string;
  username: string;
  steamId: string;
  discordTag: string;
  discordId: string;
  roleId: string;
  panelRole?: WebPanelRole;
  badgeText: string;
  badgeColor: string;
  permissions: string[];
  addedAt: string;
}

export interface SanctionRecord {
  id: string;
  targetName: string;
  targetSteamId: string;
  type: 'BAN' | 'KICK' | 'WARN' | 'MUTE';
  reason: string;
  duration: string;
  moderator: string;
  source: 'Bot Discord' | 'Panel Pterodactyl' | 'RemoteAdmin';
  timestamp: string;
  active: boolean;
}

export interface CustomTeam {
  id: string;
  name: string;
  roleKey: string;
  subtitle: string;
  badgeColor: string;
  hp: number;
  maxPlayersPerWave: number;
  spawnChance: number;
  spawnZone: 'Surface Gate A' | 'Surface Gate B' | 'Entrance Zone' | 'Heavy Containment';
  baseModel: 'Tutorial' | 'NtfSpecialist' | 'ChaosRifleman' | 'Scientist' | 'FacilityGuard';
  inventory: string[];
  cassieAnnouncement: string;
  cassieSubtitles: string;
  friendlyWith: ('SCPs' | 'MTF' | 'Chaos' | 'ClassD')[];
}

export interface VipTier {
  id: string;
  name: string;
  badgeText: string;
  badgeColor: string;
  priceLabel: string;
  reservedSlot?: boolean;
  priorityEventQueue?: boolean;
  customKillEffect?: boolean;
  perks: string[];
  factionLoadouts?: VipFactionLoadout[];
  assignedPlayers: {
    name: string;
    steamId: string;
    expiresAt: string;
  }[];
}

export interface EventPreset {
  id: string;
  title: string;
  category: 'Poursuite' | 'Combat' | 'Survie' | 'Fun';
  description: string;
  scpRole: string;
  humanRole: string;
  broadcastText: string;
  cassieStart: string;
  recommendedMutators: {
    friendlyFire: boolean;
    infiniteAmmo: boolean;
    disableTeslas: boolean;
    lockWarhead: boolean;
    lowGravity: boolean;
    speedBoost: boolean;
  };
}

export interface AfficheSection {
  id: string;
  title: string;
  titleColor: string;
  content: string;
  accentColor: string;
}

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st-1',
    username: 'evolumis [Fondateur O5]',
    steamId: '76561199376552343@steam',
    discordTag: 'evolumis',
    discordId: '985589556655054858',
    roleId: 'owner',
    panelRole: 'founder',
    badgeText: 'FONDATEUR O5',
    badgeColor: 'crimson',
    permissions: REMOTEADMIN_PERMISSION_FLAGS.map((p) => p.id),
    addedAt: '2026-11-18'
  }
];

export const INITIAL_SANCTIONS: SanctionRecord[] = [];

export const INITIAL_CUSTOM_TEAMS: CustomTeam[] = [
  {
    id: 'team-serpent',
    name: 'La Main du Serpent',
    roleKey: 'serpents_hand',
    subtitle: 'Alliés anomaux des SCPs chargés d’éliminer la Fondation',
    badgeColor: 'magenta',
    hp: 125,
    maxPlayersPerWave: 5,
    spawnChance: 35,
    spawnZone: 'Surface Gate A',
    baseModel: 'Tutorial',
    inventory: ['KeycardChaosInsurgency', 'GunE11SR', 'SCP500', 'Medkit', 'ArmorCombat', 'Radio'],
    cassieAnnouncement: 'pitch_0.92jam_050_3 warning . serpents hand incursion detected at gate a',
    cassieSubtitles: 'ALERTE : Incursion de La Main du Serpent détectée à la Porte A.',
    friendlyWith: ['SCPs']
  },
  {
    id: 'team-uiu',
    name: 'U.I.U. — FBI Paranormal',
    roleKey: 'uiu_squad',
    subtitle: 'Unité fédérale de secours appuyant les Forces Mobiles MTF',
    badgeColor: 'yellow',
    hp: 115,
    maxPlayersPerWave: 6,
    spawnChance: 40,
    spawnZone: 'Surface Gate B',
    baseModel: 'NtfSpecialist',
    inventory: ['KeycardMTFCaptain', 'GunCrossvec', 'Adrenaline', 'Medkit', 'ArmorCombat', 'GrenadeFlash', 'Radio'],
    cassieAnnouncement: 'unusual incidents unit squad designated Sierra 4 has entered the facility',
    cassieSubtitles: 'L’escouade fédérale U.I.U. Sierra-4 est entrée dans le complexe.',
    friendlyWith: ['MTF']
  },
  {
    id: 'team-goc',
    name: 'Coalition Mondiale Occulte (G.O.C.)',
    roleKey: 'goc_strike_team',
    subtitle: 'Escouade neutre hostile envers toutes les entités SCP et factions armées',
    badgeColor: 'aqua',
    hp: 140,
    maxPlayersPerWave: 4,
    spawnChance: 25,
    spawnZone: 'Surface Gate A',
    baseModel: 'NtfSpecialist',
    inventory: ['KeycardO5', 'ParticleDisruptor', 'GunE11SR', 'SCP500', 'ArmorHeavy', 'GrenadeHE'],
    cassieAnnouncement: 'pitch_0.85 danger . global occult coalition strike team deployed on surface',
    cassieSubtitles: 'DANGER : Équipe d’intervention de la Coalition Mondiale Occulte déployée en surface.',
    friendlyWith: []
  },
  {
    id: 'team-alpha1',
    name: 'FIM Alpha-1 "Bras Droit Rouge"',
    roleKey: 'alpha_one_red_right_hand',
    subtitle: 'Garde prétorienne directe du Conseil O5 dotée d’équipement expérimental',
    badgeColor: 'crimson',
    hp: 150,
    maxPlayersPerWave: 3,
    spawnChance: 20,
    spawnZone: 'Entrance Zone',
    baseModel: 'NtfSpecialist',
    inventory: ['KeycardO5', 'GunE11SR', 'MicroHID', 'SCP500', 'Adrenaline', 'ArmorHeavy', 'Radio'],
    cassieAnnouncement: 'mobile task force unit alpha 1 designated red right hand has entered the facility',
    cassieSubtitles: 'La Force d’Intervention Mobile Alpha-1 "Bras Droit Rouge" est entrée dans le site.',
    friendlyWith: ['MTF']
  }
];

export const INITIAL_VIP_TIERS: VipTier[] = [
  {
    id: 'vip-keter',
    name: 'VIP Keter Élite',
    badgeText: '★ VIP KETER ★',
    badgeColor: 'crimson',
    priceLabel: '9.99€ / mois',
    reservedSlot: true,
    priorityEventQueue: true,
    customKillEffect: true,
    perks: [
      'Tag exclusif ★ VIP KETER ★ rouge sang dans la liste Tab',
      'File d’attente prioritaire (Reserved Slot EXILED)',
      'Items bonus & HP supplémentaires selon la Team au spawn',
      'Priorité +25% d’apparition dans les Teams Customs (Alpha-1, GOC, Serpent)'
    ],
    factionLoadouts: [
      {
        factionKey: 'ClassD',
        factionLabel: 'Classe-D (Prisonniers)',
        bonusHp: 15,
        bonusAhp: 10,
        spawnChanceBoostPercent: 0,
        extraItems: ['KeycardFacilityManager', 'Painkillers', 'Adrenaline', 'Radio']
      },
      {
        factionKey: 'Scientist',
        factionLabel: 'Scientifiques',
        bonusHp: 15,
        bonusAhp: 15,
        spawnChanceBoostPercent: 20,
        extraItems: ['KeycardMTFCaptain', 'SCP500', 'GunCOM18', 'Medkit']
      },
      {
        factionKey: 'FacilityGuard',
        factionLabel: 'Gardes du Complexe',
        bonusHp: 20,
        bonusAhp: 20,
        spawnChanceBoostPercent: 15,
        extraItems: ['KeycardMTFCaptain', 'Adrenaline', 'GrenadeHE', 'ArmorCombat']
      },
      {
        factionKey: 'MTF',
        factionLabel: 'Forces Mobiles (MTF Nine-Tailed Fox)',
        bonusHp: 25,
        bonusAhp: 30,
        spawnChanceBoostPercent: 25,
        extraItems: ['KeycardO5', 'SCP500', 'Adrenaline', 'GrenadeHE']
      },
      {
        factionKey: 'Chaos',
        factionLabel: 'Insurrection du Chaos',
        bonusHp: 25,
        bonusAhp: 30,
        spawnChanceBoostPercent: 25,
        extraItems: ['SCP500', 'SCP207', 'GrenadeHE', 'ArmorHeavy']
      },
      {
        factionKey: 'CustomTeams',
        factionLabel: 'Teams Customs (Serpent, UIU, GOC, Alpha-1)',
        bonusHp: 35,
        bonusAhp: 40,
        spawnChanceBoostPercent: 30,
        extraItems: ['KeycardO5', 'SCP500', 'SCP207', 'Adrenaline']
      }
    ],
    assignedPlayers: []
  },
  {
    id: 'vip-euclid',
    name: 'VIP Euclide Or',
    badgeText: '⚡ VIP EUCLIDE',
    badgeColor: 'yellow',
    priceLabel: '4.99€ / mois',
    reservedSlot: true,
    priorityEventQueue: true,
    customKillEffect: false,
    perks: [
      'Tag doré ⚡ VIP EUCLIDE visible en jeu',
      'Équipement de survie bonus au spawn selon la Team',
      'Rôle synchronisé automatiquement avec le Bot Discord'
    ],
    factionLoadouts: [
      {
        factionKey: 'ClassD',
        factionLabel: 'Classe-D (Prisonniers)',
        bonusHp: 10,
        bonusAhp: 0,
        spawnChanceBoostPercent: 0,
        extraItems: ['Painkillers', 'Medkit', 'Radio']
      },
      {
        factionKey: 'Scientist',
        factionLabel: 'Scientifiques',
        bonusHp: 10,
        bonusAhp: 10,
        spawnChanceBoostPercent: 10,
        extraItems: ['Adrenaline', 'Medkit', 'ArmorLight']
      },
      {
        factionKey: 'FacilityGuard',
        factionLabel: 'Gardes du Complexe',
        bonusHp: 10,
        bonusAhp: 10,
        spawnChanceBoostPercent: 10,
        extraItems: ['Adrenaline', 'GrenadeFlash']
      },
      {
        factionKey: 'MTF',
        factionLabel: 'Forces Mobiles (MTF Nine-Tailed Fox)',
        bonusHp: 15,
        bonusAhp: 15,
        spawnChanceBoostPercent: 15,
        extraItems: ['Adrenaline', 'Medkit', 'GrenadeHE']
      },
      {
        factionKey: 'Chaos',
        factionLabel: 'Insurrection du Chaos',
        bonusHp: 15,
        bonusAhp: 15,
        spawnChanceBoostPercent: 15,
        extraItems: ['Adrenaline', 'Medkit', 'GrenadeFlash']
      },
      {
        factionKey: 'CustomTeams',
        factionLabel: 'Teams Customs (Serpent, UIU, GOC, Alpha-1)',
        bonusHp: 20,
        bonusAhp: 20,
        spawnChanceBoostPercent: 15,
        extraItems: ['SCP500', 'Adrenaline']
      }
    ],
    assignedPlayers: []
  },
  {
    id: 'vip-booster',
    name: 'Nitro Booster Site-19',
    badgeText: '♦ NITRO BOOSTER',
    badgeColor: 'deep_pink',
    priceLabel: 'Boost Discord',
    reservedSlot: false,
    priorityEventQueue: true,
    customKillEffect: false,
    perks: [
      'Tag rose ♦ NITRO BOOSTER attribué automatiquement par le Bot Discord',
      'Antidouleurs & Radio bonus au spawn Classe-D et Scientifique'
    ],
    factionLoadouts: [
      {
        factionKey: 'ClassD',
        factionLabel: 'Classe-D (Prisonniers)',
        bonusHp: 5,
        bonusAhp: 0,
        spawnChanceBoostPercent: 0,
        extraItems: ['Painkillers', 'Radio']
      },
      {
        factionKey: 'Scientist',
        factionLabel: 'Scientifiques',
        bonusHp: 5,
        bonusAhp: 0,
        spawnChanceBoostPercent: 5,
        extraItems: ['Painkillers', 'Adrenaline']
      },
      {
        factionKey: 'FacilityGuard',
        factionLabel: 'Gardes du Complexe',
        bonusHp: 5,
        bonusAhp: 5,
        spawnChanceBoostPercent: 5,
        extraItems: ['Painkillers']
      },
      {
        factionKey: 'MTF',
        factionLabel: 'Forces Mobiles (MTF Nine-Tailed Fox)',
        bonusHp: 10,
        bonusAhp: 0,
        spawnChanceBoostPercent: 5,
        extraItems: ['Painkillers', 'Medkit']
      },
      {
        factionKey: 'Chaos',
        factionLabel: 'Insurrection du Chaos',
        bonusHp: 10,
        bonusAhp: 0,
        spawnChanceBoostPercent: 5,
        extraItems: ['Painkillers', 'Medkit']
      },
      {
        factionKey: 'CustomTeams',
        factionLabel: 'Teams Customs (Serpent, UIU, GOC, Alpha-1)',
        bonusHp: 10,
        bonusAhp: 10,
        spawnChanceBoostPercent: 10,
        extraItems: ['Adrenaline']
      }
    ],
    assignedPlayers: []
  }
];

export const EVENT_PRESETS: EventPreset[] = [
  {
    id: 'ev-peanut-run',
    title: 'Course Cacahuète (SCP-173 Run)',
    category: 'Poursuite',
    description: '25 Classes-D doivent s’échapper de Light Containment jusqu’à la Surface pendant que 3 SCP-173 ultra-rapides les poursuivent.',
    scpRole: '3x SCP-173 (Vitesse x1.4)',
    humanRole: '25x Classe-D (Adrénaline + Carte Scientifique)',
    broadcastText: '<color=#FF9966><b>[EVENT EN COURS]</b></color> COURSE CACAHUÈTE — Fuyez vers la Surface sans cligner des yeux !',
    cassieStart: 'attention all personnel . special containment event initiated . run for your lives',
    recommendedMutators: {
      friendlyFire: false,
      infiniteAmmo: false,
      disableTeslas: true,
      lockWarhead: true,
      lowGravity: false,
      speedBoost: true
    }
  },
  {
    id: 'ev-hide-seek',
    title: 'Cache-Cache Sombre (Extinction des Feux)',
    category: 'Survie',
    description: 'Toutes les lumières du complexe sont éteintes. Les survivants disposent d’une lampe torche et d’un SCP-207 face à deux SCP-939.',
    scpRole: '2x SCP-939 (Vision Améliorée)',
    humanRole: 'Scientifiques (Lampe Torche + SCP-500)',
    broadcastText: '<color=#DC143C><b>[EVENT CACHE-CACHE]</b></color> Les lumières du Site-19 sont coupées. Ne faites aucun bruit.',
    cassieStart: 'facility power failure detected . all lights offline . good luck',
    recommendedMutators: {
      friendlyFire: false,
      infiniteAmmo: false,
      disableTeslas: true,
      lockWarhead: true,
      lowGravity: false,
      speedBoost: false
    }
  },
  {
    id: 'ev-total-war',
    title: 'Guerre Totale : Alpha-1 vs Main du Serpent',
    category: 'Combat',
    description: 'Affrontement tactique en Entrance Zone et Surface entre deux équipes personnalisées lourdement armées avec munitions illimitées.',
    scpRole: 'Escouade Main du Serpent (150 HP)',
    humanRole: 'FIM Alpha-1 Bras Droit Rouge (150 HP)',
    broadcastText: '<color=#00FFFF><b>[EVENT GUERRE TOTALE]</b></color> Alpha-1 contre La Main du Serpent — Munitions infinies activées !',
    cassieStart: 'all tactical units engage hostile forces immediately',
    recommendedMutators: {
      friendlyFire: false,
      infiniteAmmo: true,
      disableTeslas: true,
      lockWarhead: false,
      lowGravity: false,
      speedBoost: false
    }
  },
  {
    id: 'ev-micro-party',
    title: 'Arène Micro H.I.D. & Gravité Lunaire',
    category: 'Fun',
    description: 'Chaque joueur apparaît en Surface avec un Micro H.I.D. rechargé à l’infini, une grenade HE et une gravité réduite.',
    scpRole: 'Chacun pour soi (Chaos & MTF)',
    humanRole: 'Tous équipés de Micro H.I.D.',
    broadcastText: '<color=#FF0090><b>[EVENT ARÈNE MICRO H.I.D.]</b></color> Gravité réduite et surcharge électrique en Surface !',
    cassieStart: 'warning . high voltage anomaly detected on surface zone',
    recommendedMutators: {
      friendlyFire: true,
      infiniteAmmo: true,
      disableTeslas: true,
      lockWarhead: true,
      lowGravity: true,
      speedBoost: true
    }
  }
];
