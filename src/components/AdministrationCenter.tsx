import React, { useState } from 'react';
import {
  ShieldCheck,
  Crown,
  Lock,
  Check,
  X,
  Plus,
  Trash2,
  Package,
  Copy,
  Download,
  UploadCloud,
  Users,
  UserPlus,
  Wrench
} from 'lucide-react';
import {
  REMOTEADMIN_PERMISSION_FLAGS,
  SCPSL_BADGE_COLORS,
  SCPSL_ITEMS,
  STAFF_ITEM_PACKS,
  StaffMember,
  VipFactionKey,
  VipFactionLoadout,
  VipTier,
  WebPanelRole,
  WebPanelRolePermissionMatrix
} from '../data/scpslDefaults';
import {
  generateExiledMainPortConfigYaml,
  generateExiledPermissionsYaml,
  generateRemoteAdminConfig,
  generateStaffLoadoutsYaml,
  generateVipAdvantagesYaml
} from '../utils/configGenerators';

type BooleanPanelPermField =
  | 'canAccessInGameControl'
  | 'canUseHeavyInGameActions'
  | 'canAccessLogsAndProfiles'
  | 'canBanPlayers'
  | 'canUnbanPlayers'
  | 'canManageStaffRa'
  | 'canAccessEventsAndTeams'
  | 'canAccessAdministrationTab'
  | 'canAccessDeveloperTab';

interface AdministrationCenterProps {
  panelRoleMatrix: WebPanelRolePermissionMatrix[];
  setPanelRoleMatrix: React.Dispatch<React.SetStateAction<WebPanelRolePermissionMatrix[]>>;
  currentActiveRole: WebPanelRole;
  setCurrentActiveRole: (role: WebPanelRole) => void;
  staffList: StaffMember[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  vipTiers: VipTier[];
  setVipTiers: React.Dispatch<React.SetStateAction<VipTier[]>>;
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
  onPushAllConfigsToPterodactyl: () => void;
  onGrantInGameRole?: (
    targetId: string,
    roleId: string,
    playerName: string,
    nextStaffList?: StaffMember[],
    nextVipTiers?: VipTier[],
    nextPanelRoleMatrix?: WebPanelRolePermissionMatrix[]
  ) => Promise<void> | void;
  serverPort?: string;
}

const DEFAULT_FACTIONS: { key: VipFactionKey; label: string }[] = [
  { key: 'ClassD', label: 'Classe-D (Prisonniers)' },
  { key: 'Scientist', label: 'Scientifiques' },
  { key: 'FacilityGuard', label: 'Gardes du Complexe' },
  { key: 'MTF', label: 'Forces Mobiles (MTF Nine-Tailed Fox)' },
  { key: 'Chaos', label: 'Insurrection du Chaos' },
  { key: 'CustomTeams', label: 'Teams Customs (Serpent, UIU, GOC, Alpha-1)' }
];

export const AdministrationCenter: React.FC<AdministrationCenterProps> = ({
  panelRoleMatrix,
  setPanelRoleMatrix,
  currentActiveRole,
  setCurrentActiveRole,
  staffList,
  setStaffList,
  vipTiers,
  setVipTiers,
  onExecutePteroCommand,
  onPushAllConfigsToPterodactyl,
  onGrantInGameRole,
  serverPort = '1031'
}) => {
  const [adminSubTab, setAdminSubTab] = useState<'vip-loadouts' | 'staff-roles' | 'panel-permissions'>('staff-roles');
  const [selectedVipTierId, setSelectedVipTierId] = useState<string>(vipTiers[0]?.id || 'vip-keter');
  const [selectedFactionKey, setSelectedFactionKey] = useState<VipFactionKey>('ClassD');
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Staff Roles Creator & Items Editor state
  const [selectedStaffRoleId, setSelectedStaffRoleId] = useState<string>(
    panelRoleMatrix[0]?.roleId || 'founder'
  );
  const [staffItemCategoryFilter, setStaffItemCategoryFilter] = useState<
    'ALL' | 'STAFF' | 'Keycard' | 'Weapon' | 'Special' | 'Medical' | 'Armor'
  >('ALL');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleBadgeText, setNewRoleBadgeText] = useState('');
  const [newRoleBadgeColorId, setNewRoleBadgeColorId] = useState('crimson');
  const [newRoleKickPower, setNewRoleKickPower] = useState(80);
  const [newRoleTemplate, setNewRoleTemplate] = useState<'admin' | 'moderator' | 'helper' | 'event'>('moderator');
  const [copiedStaffConfig, setCopiedStaffConfig] = useState(false);
  const [staffPreviewFile, setStaffPreviewFile] = useState<
    'staff-loadouts' | 'exiled-main' | 'exiled-perms' | 'remoteadmin'
  >('staff-loadouts');

  // New VIP Tier Creation State
  const [newVipName, setNewVipName] = useState('');
  const [newVipBadge, setNewVipBadge] = useState('');
  const [newVipColor, setNewVipColor] = useState('yellow');
  const [newVipPrice, setNewVipPrice] = useState('4.99€ / mois');

  // New VIP Player Assignment State
  const [assignPlayerName, setAssignPlayerName] = useState('');
  const [assignPlayerSteamId, setAssignPlayerSteamId] = useState('');

  // New Staff Member Creation State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffSteamId, setNewStaffSteamId] = useState('');
  const [newStaffDiscordTag, setNewStaffDiscordTag] = useState('');
  const [newStaffPanelRole, setNewStaffPanelRole] = useState<WebPanelRole>('moderator');

  // Quick Direct In-Game Grant State
  const [quickGrantTarget, setQuickGrantTarget] = useState('76561199376552343@steam');
  const [quickGrantName, setQuickGrantName] = useState('evolumis');
  const [quickGrantRole, setQuickGrantRole] = useState('owner');

  const selectedVipTier = vipTiers.find((t) => t.id === selectedVipTierId) || vipTiers[0];
  const selectedStaffRole =
    panelRoleMatrix.find((r) => r.roleId === selectedStaffRoleId) || panelRoleMatrix[0];

  const getFactionLoadout = (tier: VipTier, factionKey: VipFactionKey): VipFactionLoadout => {
    const existing = (tier.factionLoadouts || []).find((f) => f.factionKey === factionKey);
    if (existing) return existing;
    const def = DEFAULT_FACTIONS.find((d) => d.key === factionKey);
    return {
      factionKey,
      factionLabel: def?.label || factionKey,
      bonusHp: 0,
      bonusAhp: 0,
      spawnChanceBoostPercent: 0,
      extraItems: []
    };
  };

  const activeLoadout = selectedVipTier
    ? getFactionLoadout(selectedVipTier, selectedFactionKey)
    : null;

  const updateSelectedTierLoadout = (
    factionKey: VipFactionKey,
    updater: (prev: VipFactionLoadout) => VipFactionLoadout
  ) => {
    if (!selectedVipTier) return;
    setVipTiers((prevTiers) =>
      prevTiers.map((tier) => {
        if (tier.id !== selectedVipTier.id) return tier;
        const currentList = tier.factionLoadouts || [];
        const exists = currentList.some((f) => f.factionKey === factionKey);
        const base = getFactionLoadout(tier, factionKey);
        const updatedLoadout = updater(base);

        const nextLoadouts = exists
          ? currentList.map((f) => (f.factionKey === factionKey ? updatedLoadout : f))
          : [...currentList, updatedLoadout];

        return {
          ...tier,
          factionLoadouts: nextLoadouts
        };
      })
    );
  };

  const handleToggleExtraItem = (itemId: string) => {
    updateSelectedTierLoadout(selectedFactionKey, (prev) => {
      const hasItem = prev.extraItems.includes(itemId);
      const nextItems = hasItem
        ? prev.extraItems.filter((i) => i !== itemId)
        : [...prev.extraItems, itemId];
      return {
        ...prev,
        extraItems: nextItems
      };
    });
  };

  const handleToggleTierFlag = (field: 'reservedSlot' | 'priorityEventQueue' | 'customKillEffect') => {
    if (!selectedVipTier) return;
    setVipTiers((prev) =>
      prev.map((t) => (t.id === selectedVipTier.id ? { ...t, [field]: !t[field] } : t))
    );
  };

  const handleCreateVipTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVipName.trim() || !newVipBadge.trim()) return;
    const cleanId = `vip-${newVipName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')}`;

    const newTier: VipTier = {
      id: cleanId,
      name: newVipName.trim(),
      badgeText: newVipBadge.trim(),
      badgeColor: newVipColor,
      priceLabel: newVipPrice.trim() || 'VIP',
      reservedSlot: true,
      priorityEventQueue: true,
      customKillEffect: false,
      perks: [
        `Tag exclusif ${newVipBadge.trim()} en jeu`,
        'Équipement bonus & HP supplémentaires selon la Team au spawn'
      ],
      factionLoadouts: DEFAULT_FACTIONS.map((f) => ({
        factionKey: f.key,
        factionLabel: f.label,
        bonusHp: 10,
        bonusAhp: 10,
        spawnChanceBoostPercent: 10,
        extraItems: ['Painkillers', 'Adrenaline']
      })),
      assignedPlayers: []
    };

    setVipTiers((prev) => [...prev, newTier]);
    setSelectedVipTierId(newTier.id);
    setNewVipName('');
    setNewVipBadge('');
    onExecutePteroCommand(
      `echo "[ADMIN VIP] Nouveau grade VIP créé : ${newTier.name} (${newTier.id})"`,
      'ADMINISTRATION'
    );
  };

  const handleAssignVipPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVipTier || !assignPlayerName.trim() || !assignPlayerSteamId.trim()) return;
    const raw = assignPlayerSteamId.trim();
    const formattedSteam = raw.includes('@') || /^\d{1,4}$/.test(raw) ? raw : `${raw}@steam`;

    const nextVipTiers = vipTiers.map((t) =>
      t.id === selectedVipTier.id
        ? {
            ...t,
            assignedPlayers: [
              ...t.assignedPlayers.filter(
                (p) => p.steamId.toLowerCase() !== formattedSteam.toLowerCase()
              ),
              {
                name: assignPlayerName.trim(),
                steamId: formattedSteam,
                expiresAt: '2026-12-31'
              }
            ]
          }
        : t
    );

    setVipTiers(nextVipTiers);
    if (onGrantInGameRole) {
      onGrantInGameRole(formattedSteam, selectedVipTier.id, assignPlayerName.trim(), staffList, nextVipTiers);
    } else {
      onExecutePteroCommand(`setgroup ${formattedSteam} ${selectedVipTier.id}`, 'ADMIN VIP');
    }
    setAssignPlayerName('');
    setAssignPlayerSteamId('');
  };

  const handleToggleRolePermission = (
    roleId: WebPanelRole,
    permField: BooleanPanelPermField
  ) => {
    if (roleId === 'founder') return;

    setPanelRoleMatrix((prev) =>
      prev.map((row) => {
        if (row.roleId !== roleId) return row;
        if (permField === 'canAccessDeveloperTab' && roleId !== 'developer') {
          return { ...row, canAccessDeveloperTab: false };
        }
        return {
          ...row,
          [permField]: !row[permField]
        };
      })
    );
  };

  const handleCreateCustomStaffRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleLabel.trim()) return;

    const cleanKey = (
      newRoleKey.trim() ||
      newRoleLabel
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    );

    if (!cleanKey || panelRoleMatrix.some((r) => r.roleId === cleanKey)) {
      return;
    }

    const colorMeta =
      SCPSL_BADGE_COLORS.find((c) => c.id === newRoleBadgeColorId) || SCPSL_BADGE_COLORS[0];

    const templatePermsMap: Record<
      'admin' | 'moderator' | 'helper' | 'event',
      {
        raPerms: string[];
        items: string[];
        heavy: boolean;
        ban: boolean;
        unban: boolean;
        events: boolean;
        adminTab: boolean;
      }
    > = {
      admin: {
        raPerms: [
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
          'FacilityManagement',
          'PlayersManagement',
          'ViewHiddenBadges',
          'Broadcasting',
          'Noclip',
          'AFKImmunity',
          'EventsMode'
        ],
        items: ['KeycardO5', 'GunCOM45', 'Jailbird', 'SCP268', 'SCP1344', 'SCP500', 'ArmorHeavy', 'Radio'],
        heavy: true,
        ban: true,
        unban: true,
        events: true,
        adminTab: true
      },
      event: {
        raPerms: [
          'ForceclassSelf',
          'ForceclassToSpectator',
          'ForceclassWithoutRestrictions',
          'GiveItems',
          'RespawnEvents',
          'RoundEvents',
          'FacilityManagement',
          'PlayersManagement',
          'Broadcasting',
          'Noclip',
          'AFKImmunity',
          'EventsMode'
        ],
        items: ['KeycardO5', 'GunCOM45', 'Jailbird', 'ParticleDisruptor', 'MicroHID', 'SCP268', 'AntiSCP207', 'Radio'],
        heavy: true,
        ban: false,
        unban: false,
        events: true,
        adminTab: false
      },
      moderator: {
        raPerms: [
          'KickingAndShortTermBanning',
          'BanningUpToDay',
          'ForceclassToSpectator',
          'PlayersManagement',
          'ViewHiddenBadges',
          'Broadcasting',
          'Noclip',
          'AFKImmunity'
        ],
        items: ['KeycardO5', 'SCP268', 'SCP1344', 'SCP1576', 'SCP500', 'Flashlight', 'Radio'],
        heavy: false,
        ban: true,
        unban: false,
        events: false,
        adminTab: false
      },
      helper: {
        raPerms: ['KickingAndShortTermBanning', 'Broadcasting', 'Noclip', 'AFKImmunity'],
        items: ['KeycardFacilityManager', 'SCP268', 'SCP1576', 'Flashlight', 'Radio'],
        heavy: false,
        ban: false,
        unban: false,
        events: false,
        adminTab: false
      }
    };

    const tpl = templatePermsMap[newRoleTemplate];
    const createdRole: WebPanelRolePermissionMatrix = {
      roleId: cleanKey,
      label: newRoleLabel.trim(),
      badgeText: (newRoleBadgeText.trim() || newRoleLabel.trim()).toUpperCase(),
      badgeColorId: colorMeta.id,
      badgeColorHex: colorMeta.hex,
      kickPower: newRoleKickPower,
      requiredKickPower: newRoleKickPower,
      isBuiltIn: false,
      description: `Rôle Staff personnalisé (${cleanKey}) · Kick Power ${newRoleKickPower}.`,
      canAccessInGameControl: true,
      canUseHeavyInGameActions: tpl.heavy,
      canAccessLogsAndProfiles: true,
      canBanPlayers: tpl.ban,
      canUnbanPlayers: tpl.unban,
      canManageStaffRa: tpl.adminTab,
      canAccessEventsAndTeams: tpl.events,
      canAccessAdministrationTab: tpl.adminTab,
      canAccessDeveloperTab: false,
      raPermissions: tpl.raPerms,
      staffItems: tpl.items,
      autoEquipOnSpawn: true,
      equipOnlyInTutorialMode: true,
      clearInventoryBeforeEquip: false
    };

    setPanelRoleMatrix((prev) => [...prev, createdRole]);
    setSelectedStaffRoleId(createdRole.roleId);
    setNewRoleLabel('');
    setNewRoleKey('');
    setNewRoleBadgeText('');
    onExecutePteroCommand(
      `echo "[ADMIN STAFF] Nouveau rôle staff créé : ${createdRole.label} (${createdRole.roleId})"`,
      'ADMINISTRATION ROLES'
    );
  };

  const updateSelectedStaffRole = (
    updater: (prev: WebPanelRolePermissionMatrix) => WebPanelRolePermissionMatrix
  ) => {
    if (!selectedStaffRole) return;
    setPanelRoleMatrix((prev) =>
      prev.map((r) => (r.roleId === selectedStaffRole.roleId ? updater(r) : r))
    );
  };

  const handleToggleStaffRoleItem = (itemId: string) => {
    updateSelectedStaffRole((prev) => {
      const exists = prev.staffItems.includes(itemId);
      return {
        ...prev,
        staffItems: exists
          ? prev.staffItems.filter((it) => it !== itemId)
          : [...prev.staffItems, itemId]
      };
    });
  };

  const handleToggleStaffRaPermission = (permId: string) => {
    if (selectedStaffRole?.roleId === 'founder') return;
    updateSelectedStaffRole((prev) => {
      const exists = prev.raPermissions.includes(permId);
      return {
        ...prev,
        raPermissions: exists
          ? prev.raPermissions.filter((p) => p !== permId)
          : [...prev.raPermissions, permId]
      };
    });
  };

  const handleDeleteCustomStaffRole = (roleId: string) => {
    const target = panelRoleMatrix.find((r) => r.roleId === roleId);
    if (!target || target.isBuiltIn) return;
    setPanelRoleMatrix((prev) => prev.filter((r) => r.roleId !== roleId));
    if (selectedStaffRoleId === roleId) {
      setSelectedStaffRoleId('founder');
    }
    if (currentActiveRole === roleId) {
      setCurrentActiveRole('founder');
    }
  };

  const handleChangeStaffPanelRole = (staffId: string, nextRole: WebPanelRole) => {
    const roleMeta = panelRoleMatrix.find((r) => r.roleId === nextRole);
    const raRoleId = nextRole === 'founder' ? 'owner' : nextRole;

    const nextStaffList = staffList.map((s) =>
      s.id === staffId
        ? {
            ...s,
            panelRole: nextRole,
            roleId: raRoleId,
            badgeText: roleMeta ? roleMeta.badgeText : s.badgeText,
            badgeColor: roleMeta ? roleMeta.badgeColorId : s.badgeColor,
            permissions: roleMeta ? roleMeta.raPermissions : s.permissions
          }
        : s
    );
    setStaffList(nextStaffList);

    const target = nextStaffList.find((s) => s.id === staffId);
    if (target) {
      if (onGrantInGameRole) {
        onGrantInGameRole(target.steamId || target.username, raRoleId, target.username, nextStaffList, vipTiers);
      } else {
        onExecutePteroCommand(`setgroup ${target.steamId} ${raRoleId}`, 'ADMIN PERMS');
      }
    }
  };

  const handleAddStaffMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffSteamId.trim()) return;
    const raw = newStaffSteamId.trim();
    const formattedSteam = raw.includes('@') || /^\d{1,4}$/.test(raw) ? raw : `${raw}@steam`;

    const roleMeta =
      panelRoleMatrix.find((r) => r.roleId === newStaffPanelRole) || panelRoleMatrix[0];
    const raRoleId = newStaffPanelRole === 'founder' ? 'owner' : newStaffPanelRole;

    const created: StaffMember = {
      id: `st-${Date.now()}`,
      username: newStaffName.trim(),
      steamId: formattedSteam,
      discordTag: newStaffDiscordTag.trim() || newStaffName.trim().toLowerCase(),
      discordId: '985589556655054858',
      roleId: raRoleId,
      panelRole: newStaffPanelRole,
      badgeText: roleMeta.badgeText,
      badgeColor: roleMeta.badgeColorId,
      permissions: roleMeta.raPermissions,
      addedAt: new Date().toISOString().slice(0, 10)
    };

    const nextStaffList = [
      ...staffList.filter((s) => s.steamId.toLowerCase() !== formattedSteam.toLowerCase()),
      created
    ];
    setStaffList(nextStaffList);
    if (onGrantInGameRole) {
      onGrantInGameRole(formattedSteam, created.roleId, created.username, nextStaffList, vipTiers);
    } else {
      onExecutePteroCommand(`setgroup ${formattedSteam} ${created.roleId}`, 'ADMIN STAFF');
    }
    setNewStaffName('');
    setNewStaffSteamId('');
    setNewStaffDiscordTag('');
  };

  const handleQuickDirectGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickGrantTarget.trim();
    if (!raw) return;
    const formatted = raw.includes('@') || /^\d{1,4}$/.test(raw) ? raw : `${raw}@steam`;
    const isVip = vipTiers.some((t) => t.id === quickGrantRole);
    const label = quickGrantName.trim() || formatted;

    if (isVip) {
      const nextVipTiers = vipTiers.map((t) =>
        t.id === quickGrantRole
          ? {
              ...t,
              assignedPlayers: formatted.includes('@')
                ? [
                    ...t.assignedPlayers.filter(
                      (p) => p.steamId.toLowerCase() !== formatted.toLowerCase()
                    ),
                    { name: label, steamId: formatted, expiresAt: '2026-12-31' }
                  ]
                : t.assignedPlayers
            }
          : t
      );
      setVipTiers(nextVipTiers);
      if (onGrantInGameRole) {
        onGrantInGameRole(formatted, quickGrantRole, label, staffList, nextVipTiers);
      }
      return;
    }

    const panelRoleKey = quickGrantRole === 'owner' ? 'founder' : quickGrantRole;
    const roleMeta = panelRoleMatrix.find(
      (r) => r.roleId === panelRoleKey || r.roleId === quickGrantRole
    );
    const nextStaffList = formatted.includes('@')
      ? [
          ...staffList.filter((s) => s.steamId.toLowerCase() !== formatted.toLowerCase()),
          {
            id: `st-${Date.now()}`,
            username: label,
            steamId: formatted,
            discordTag: label.toLowerCase(),
            discordId: '985589556655054858',
            roleId: quickGrantRole,
            panelRole: panelRoleKey,
            badgeText: roleMeta ? roleMeta.badgeText : quickGrantRole.toUpperCase(),
            badgeColor: roleMeta ? roleMeta.badgeColorId : 'crimson',
            permissions: roleMeta ? roleMeta.raPermissions : [],
            addedAt: new Date().toISOString().slice(0, 10)
          }
        ]
      : staffList;
    setStaffList(nextStaffList);
    if (onGrantInGameRole) {
      onGrantInGameRole(formatted, quickGrantRole, label, nextStaffList, vipTiers);
    } else {
      onExecutePteroCommand(`setgroup ${formatted} ${quickGrantRole}`, 'REMOTEADMIN');
    }
  };

  const vipYamlPreview = generateVipAdvantagesYaml(vipTiers);
  const staffLoadoutsPreview = generateStaffLoadoutsYaml(panelRoleMatrix);
  const exiledMainPreview = generateExiledMainPortConfigYaml(
    panelRoleMatrix,
    vipTiers,
    [],
    serverPort
  );
  const exiledPermsPreview = generateExiledPermissionsYaml(panelRoleMatrix);
  const remoteAdminPreview = generateRemoteAdminConfig(staffList, vipTiers, panelRoleMatrix);

  const activeStaffPreviewContent =
    staffPreviewFile === 'staff-loadouts'
      ? staffLoadoutsPreview
      : staffPreviewFile === 'exiled-main'
      ? exiledMainPreview
      : staffPreviewFile === 'exiled-perms'
      ? exiledPermsPreview
      : remoteAdminPreview;

  const activeStaffPreviewFilename =
    staffPreviewFile === 'staff-loadouts'
      ? 'StaffLoadouts.yml'
      : staffPreviewFile === 'exiled-main'
      ? `${serverPort}-config.yml`
      : staffPreviewFile === 'exiled-perms'
      ? 'permissions.yml'
      : 'config_remoteadmin.txt';

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(vipYamlPreview);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleDownloadYaml = () => {
    const blob = new Blob([vipYamlPreview], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VipAdvantages.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadStaffFile = (content: string, filename: string) => {
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

  return (
    <div className="space-y-6">
      {/* Top Administration Header & Sub-Navigation */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              ADMINISTRATION SITE-19 · AVANTAGES VIP PAR TEAM &amp; PERMISSIONS DU PANEL WEB (RBAC)
            </div>
            <h2 className="text-xl font-bold text-white">
              Centre d’Administration : Avantages VIP par Équipe &amp; Permissions Staff
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setAdminSubTab('staff-roles')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminSubTab === 'staff-roles'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              1. Créer Rôles Staff &amp; Items Staff
            </button>
            <button
              onClick={() => setAdminSubTab('vip-loadouts')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminSubTab === 'vip-loadouts'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              2. Avantages &amp; Items VIP par Team
            </button>
            <button
              onClick={() => setAdminSubTab('panel-permissions')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                adminSubTab === 'panel-permissions'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              3. Matrice RBAC &amp; Équipe Staff
            </button>
          </div>
        </div>

        {/* Direct 1-Click Grant Permissions / Tag In-Game Bar */}
        <form
          onSubmit={handleQuickDirectGrant}
          className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center"
        >
          <div className="md:col-span-3">
            <input
              type="text"
              value={quickGrantTarget}
              onChange={(e) => setQuickGrantTarget(e.target.value)}
              placeholder="SteamID64 (@steam) ou ID en jeu (ex: 1)"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="text"
              value={quickGrantName}
              onChange={(e) => setQuickGrantName(e.target.value)}
              placeholder="Pseudo (ex: evolumis)"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={quickGrantRole}
              onChange={(e) => setQuickGrantRole(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 text-white"
            >
              {panelRoleMatrix.map((roleOpt) => {
                const raKey = roleOpt.roleId === 'founder' ? 'owner' : roleOpt.roleId;
                return (
                  <option key={roleOpt.roleId} value={raKey}>
                    Staff : {raKey} ({roleOpt.badgeText})
                  </option>
                );
              })}
              {vipTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>
                  VIP : {tier.id} ({tier.badgeText})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="w-full px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Appliquer Perm &amp; Tag En Jeu
            </button>
          </div>
        </form>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: CREATE STAFF ROLES + FULL STAFF ITEMS & RA PERMISSIONS    */}
      {/* ==================================================================== */}
      {adminSubTab === 'staff-roles' && selectedStaffRole && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Columns: List of Staff Roles + New Staff Role Creator */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Rôles Staff Configurés ({panelRoleMatrix.length})
                </h3>
                <span className="text-xs font-mono text-amber-400">RemoteAdmin</span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {panelRoleMatrix.map((role) => {
                  const isSelected = role.roleId === selectedStaffRole.roleId;
                  return (
                    <div
                      key={role.roleId}
                      className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStaffRoleId(role.roleId)}
                        className="flex-1 text-left space-y-1.5 min-w-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white truncate">
                            {role.label}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                            KP {role.kickPower}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                          <span style={{ color: role.badgeColorHex }} className="font-bold">
                            [{role.badgeText}]
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-emerald-400">
                            {role.staffItems.length} items staff
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-cyan-400">
                            {role.raPermissions.length} perms RA
                          </span>
                        </div>
                      </button>

                      {!role.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomStaffRole(role.roleId)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0"
                          title="Supprimer ce rôle personnalisé"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Form: Create a New Staff Role */}
              <form
                onSubmit={handleCreateCustomStaffRole}
                className="pt-4 border-t border-slate-800 space-y-3"
              >
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Créer un Nouveau Rôle Staff
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Nom du Rôle Staff
                  </label>
                  <input
                    type="text"
                    value={newRoleLabel}
                    onChange={(e) => setNewRoleLabel(e.target.value)}
                    placeholder="Ex: Responsable Staff, Gérant Event, Super-Admin..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Clé RemoteAdmin
                    </label>
                    <input
                      type="text"
                      value={newRoleKey}
                      onChange={(e) => setNewRoleKey(e.target.value)}
                      placeholder="auto (ex: resp_staff)"
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Badge Tab En Jeu
                    </label>
                    <input
                      type="text"
                      value={newRoleBadgeText}
                      onChange={(e) => setNewRoleBadgeText(e.target.value)}
                      placeholder="RESPONSABLE"
                      className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Couleur Badge SCP:SL
                    </label>
                    <select
                      value={newRoleBadgeColorId}
                      onChange={(e) => setNewRoleBadgeColorId(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                    >
                      {SCPSL_BADGE_COLORS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Kick Power (0-255)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={255}
                      value={newRoleKickPower}
                      onChange={(e) => setNewRoleKickPower(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Modèle de Permissions &amp; Items Staff de départ
                  </label>
                  <select
                    value={newRoleTemplate}
                    onChange={(e) =>
                      setNewRoleTemplate(
                        e.target.value as 'admin' | 'moderator' | 'helper' | 'event'
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="admin">Super-Admin / Responsable (Tous Pouvoirs + Pack O5)</option>
                    <option value="event">Gérant Event / Animateur (Events + Armes Secrètes)</option>
                    <option value="moderator">Modérateur Avancé (Ban/Mute + Pack Surveillance)</option>
                    <option value="helper">Helpeur / Modérateur Test (Warn/Mute + Base)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Créer ce Rôle Staff
                </button>
              </form>
            </div>
          </div>

          {/* Right 8 Columns: Selected Staff Role Editor (All Staff Items + RemoteAdmin Perms + Config) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-amber-400">ÉDITEUR DE RÔLE STAFF</span>
                    <span className="text-slate-600">·</span>
                    <span style={{ color: selectedStaffRole.badgeColorHex }} className="font-bold">
                      [{selectedStaffRole.badgeText}]
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">Clé: {selectedStaffRole.roleId}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {selectedStaffRole.label} — Kit Items Staff &amp; Permissions RemoteAdmin
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onPushAllConfigsToPterodactyl();
                    onExecutePteroCommand('config reload', 'ADMIN ROLES SYNC');
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Synchroniser sur LumisHost
                </button>
              </div>

              {/* Editable Role Properties (Badge, Color, Kick Power) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nom affiché
                  </label>
                  <input
                    type="text"
                    value={selectedStaffRole.label}
                    onChange={(e) =>
                      updateSelectedStaffRole((prev) => ({ ...prev, label: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Badge Tab en Jeu
                  </label>
                  <input
                    type="text"
                    value={selectedStaffRole.badgeText}
                    onChange={(e) =>
                      updateSelectedStaffRole((prev) => ({ ...prev, badgeText: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Couleur Badge
                  </label>
                  <select
                    value={selectedStaffRole.badgeColorId}
                    onChange={(e) => {
                      const c =
                        SCPSL_BADGE_COLORS.find((col) => col.id === e.target.value) ||
                        SCPSL_BADGE_COLORS[0];
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        badgeColorId: c.id,
                        badgeColorHex: c.hex
                      }));
                    }}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {SCPSL_BADGE_COLORS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Kick Power (0-255)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={selectedStaffRole.kickPower}
                    onChange={(e) => {
                      const val = Math.min(255, Math.max(0, Number(e.target.value) || 0));
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        kickPower: val,
                        requiredKickPower: val
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                  />
                </div>
              </div>

              {/* EXILED 9 Auto-Equip Behavior Toggles for Selected Role */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-cyan-300">
                    Comportement Équipement Automatique EXILED 9 ({selectedStaffRole.label})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Clé YAML : {selectedStaffRole.roleId === 'founder' ? 'owner' : selectedStaffRole.roleId}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        autoEquipOnSpawn: prev.autoEquipOnSpawn === false ? true : false
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                      selectedStaffRole.autoEquipOnSpawn !== false
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Équiper auto au spawn</span>
                    <span className="font-mono font-bold">
                      {selectedStaffRole.autoEquipOnSpawn !== false ? 'OUI' : 'NON'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        equipOnlyInTutorialMode:
                          prev.equipOnlyInTutorialMode === false ? true : false
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                      selectedStaffRole.equipOnlyInTutorialMode !== false
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Mode Staff (Tutorial) uniquement</span>
                    <span className="font-mono font-bold">
                      {selectedStaffRole.equipOnlyInTutorialMode !== false ? 'OUI' : 'TOUS'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        clearInventoryBeforeEquip: !prev.clearInventoryBeforeEquip
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-colors ${
                      selectedStaffRole.clearInventoryBeforeEquip
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Vider sac avant équipement</span>
                    <span className="font-mono font-bold">
                      {selectedStaffRole.clearInventoryBeforeEquip ? 'OUI' : 'NON'}
                    </span>
                  </button>
                </div>
              </div>

              {/* STAFF ITEMS PICKER + 1-CLICK STAFF PACKS */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-400" />
                      Catalogue Complet des Items Staff ({SCPSL_ITEMS.length} objets SCP:SL disponibles)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Inclut tous les items Staff/Admin : Carte O5, COM-45, Jailbird, 3-X Désintégrateur, Micro H.I.D., A7, SCP-268, SCP-1344, SCP-500, Anti-207, SCP-018, SCP-1576...
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                    {selectedStaffRole.staffItems.length} item(s) assigné(s)
                  </span>
                </div>

                {/* 1-Click Staff Item Packs */}
                <div className="flex flex-wrap items-center gap-2">
                  {STAFF_ITEM_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() =>
                        updateSelectedStaffRole((prev) => ({
                          ...prev,
                          staffItems: [...pack.items]
                        }))
                      }
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 transition-colors whitespace-nowrap shrink-0"
                      title={pack.description}
                    >
                      + {pack.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        staffItems: SCPSL_ITEMS.filter((it) => it.isStaffItem).map((it) => it.id)
                      }))
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-colors whitespace-nowrap shrink-0"
                  >
                    Tout Sélectionner (Tous Items Staff ★)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedStaffRole((prev) => ({
                        ...prev,
                        staffItems: []
                      }))
                    }
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    Vider
                  </button>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 w-fit">
                  {(
                    [
                      { id: 'ALL', label: `Tous (${SCPSL_ITEMS.length})` },
                      { id: 'STAFF', label: '★ Items Staff' },
                      { id: 'Keycard', label: 'Cartes O5 / Accès' },
                      { id: 'Weapon', label: 'Armes' },
                      { id: 'Special', label: 'Spécial & SCP' },
                      { id: 'Medical', label: 'Soins & Colas' },
                      { id: 'Armor', label: 'Armures' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setStaffItemCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        staffItemCategoryFilter === cat.id
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* All Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {SCPSL_ITEMS.filter((item) => {
                    if (staffItemCategoryFilter === 'ALL') return true;
                    if (staffItemCategoryFilter === 'STAFF') return Boolean(item.isStaffItem);
                    return item.category === staffItemCategoryFilter;
                  }).map((item) => {
                    const isChecked = selectedStaffRole.staffItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleStaffRoleItem(item.id)}
                        className={`p-2.5 rounded-lg border text-left transition-colors flex items-start justify-between gap-2 ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{item.label}</div>
                          <div className="text-[10px] font-mono opacity-75">{item.id}</div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RemoteAdmin Permissions Checkboxes */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    Permissions RemoteAdmin En Jeu (`config_remoteadmin.txt`)
                  </div>
                  <span className="text-xs font-mono text-cyan-400 tabular-nums">
                    {selectedStaffRole.raPermissions.length} / {REMOTEADMIN_PERMISSION_FLAGS.length} actives
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {REMOTEADMIN_PERMISSION_FLAGS.map((perm) => {
                    const active =
                      selectedStaffRole.roleId === 'founder' ||
                      selectedStaffRole.raPermissions.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        disabled={selectedStaffRole.roleId === 'founder'}
                        onClick={() => handleToggleStaffRaPermission(perm.id)}
                        className={`px-2.5 py-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        } ${selectedStaffRole.roleId === 'founder' ? 'opacity-75 cursor-not-allowed' : ''}`}
                      >
                        <span className="truncate font-medium">{perm.label}</span>
                        {active ? (
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Generated EXILED 9 YAML & config_remoteadmin.txt Preview */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Configuration YAML EXILED 9 &amp; RemoteAdmin Générée
                  </h4>
                  <p className="text-xs text-slate-400">
                    Prête pour `/home/container/.config/EXILED/Configs/` ({serverPort}-config.yml, StaffLoadouts.yml, permissions.yml) et le Mega Egg.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeStaffPreviewContent);
                      setCopiedStaffConfig(true);
                      setTimeout(() => setCopiedStaffConfig(false), 2000);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {copiedStaffConfig ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copier {activeStaffPreviewFilename}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadStaffFile(activeStaffPreviewContent, activeStaffPreviewFilename)
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger {activeStaffPreviewFilename}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setStaffPreviewFile('staff-loadouts')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    staffPreviewFile === 'staff-loadouts'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  StaffLoadouts.yml (Kits Staff)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffPreviewFile('exiled-main')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    staffPreviewFile === 'exiled-main'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {serverPort}-config.yml (Config EXILED 9)
                </button>
                <button
                  type="button"
                  onClick={() => setStaffPreviewFile('exiled-perms')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    staffPreviewFile === 'exiled-perms'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  permissions.yml
                </button>
                <button
                  type="button"
                  onClick={() => setStaffPreviewFile('remoteadmin')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    staffPreviewFile === 'remoteadmin'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  config_remoteadmin.txt
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#05070c] border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-72">
                {activeStaffPreviewContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 1: VIP ADVANTAGES & EXTRA ITEMS PER TEAM / FACTION           */}
      {/* ==================================================================== */}
      {adminSubTab === 'vip-loadouts' && selectedVipTier && activeLoadout && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Columns: VIP Tier Selector & New Tier Creator */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Grades VIP Configurés ({vipTiers.length})
                </h3>
                <span className="text-xs font-mono text-amber-400">EXILED / LabApi</span>
              </div>

              <div className="space-y-2.5">
                {vipTiers.map((tier) => {
                  const colorObj =
                    SCPSL_BADGE_COLORS.find((c) => c.id === tier.badgeColor) ||
                    SCPSL_BADGE_COLORS[0];
                  const isSelected = tier.id === selectedVipTier.id;
                  const totalExtraItems = (tier.factionLoadouts || []).reduce(
                    (acc, f) => acc + f.extraItems.length,
                    0
                  );

                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedVipTierId(tier.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors space-y-2 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">{tier.name}</span>
                        <span className="text-xs font-mono text-amber-300">{tier.priceLabel}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                          style={{ color: colorObj.hex }}
                        >
                          {tier.badgeText}
                        </span>
                        <span className="font-mono text-slate-400">
                          {totalExtraItems} items bonus · {tier.assignedPlayers.length} joueurs
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Create a new VIP Tier */}
              <form
                onSubmit={handleCreateVipTier}
                className="pt-3 border-t border-slate-800 space-y-2.5"
              >
                <div className="text-xs font-semibold text-slate-300">
                  + Créer un Nouveau Grade VIP
                </div>
                <input
                  type="text"
                  value={newVipName}
                  onChange={(e) => setNewVipName(e.target.value)}
                  placeholder="Nom du VIP (ex: VIP Thaumiel Suprême)"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newVipBadge}
                    onChange={(e) => setNewVipBadge(e.target.value)}
                    placeholder="Tag Tab (ex: ♛ VIP THAUMIEL)"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                  <select
                    value={newVipColor}
                    onChange={(e) => setNewVipColor(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
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
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter ce Grade VIP
                </button>
              </form>
            </div>

            {/* Assign VIP to Player */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Joueurs possédant {selectedVipTier.name} ({selectedVipTier.assignedPlayers.length})
              </h4>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedVipTier.assignedPlayers.map((pl) => (
                  <div
                    key={pl.steamId}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{pl.name}</div>
                      <div className="font-mono text-slate-400">{pl.steamId}</div>
                    </div>
                    <button
                      onClick={() =>
                        setVipTiers((prev) =>
                          prev.map((t) =>
                            t.id === selectedVipTier.id
                              ? {
                                  ...t,
                                  assignedPlayers: t.assignedPlayers.filter(
                                    (p) => p.steamId !== pl.steamId
                                  )
                                }
                              : t
                          )
                        )
                      }
                      className="text-rose-400 hover:text-rose-300 p-1"
                      title="Retirer VIP"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAssignVipPlayer} className="space-y-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={assignPlayerName}
                  onChange={(e) => setAssignPlayerName(e.target.value)}
                  placeholder="Pseudo du joueur..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={assignPlayerSteamId}
                    onChange={(e) => setAssignPlayerSteamId(e.target.value)}
                    placeholder="76561198...@steam"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shrink-0"
                  >
                    Attribuer VIP
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right 8 Columns: Team-by-Team Extra Items, HP/AHP & Spawn Boost Editor */}
          <div className="lg:col-span-8 space-y-5">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="text-xs font-mono text-amber-400">
                    CONFIGURATION DES AVANTAGES EN JEU · {selectedVipTier.name.toUpperCase()}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Items Bonus, HP &amp; Priorité de Spawn selon la Team du Joueur
                  </h3>
                </div>

                <button
                  onClick={() => {
                    onPushAllConfigsToPterodactyl();
                    onExecutePteroCommand(
                      'config reload',
                      'ADMIN VIP SYNC'
                    );
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Synchroniser `VipAdvantages.yml` sur LumisHost
                </button>
              </div>

              {/* Global VIP Privileges Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleTierFlag('reservedSlot')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                    selectedVipTier.reservedSlot
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Slot Réservé (Bypass File)</div>
                    <div className="text-[11px] opacity-80">Rejoint même à 32/32 joueurs</div>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {selectedVipTier.reservedSlot ? 'ACTIF' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleTierFlag('priorityEventQueue')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                    selectedVipTier.priorityEventQueue
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Priorité Rôles Mode Event</div>
                    <div className="text-[11px] opacity-80">Prioritaire lors des Events</div>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {selectedVipTier.priorityEventQueue ? 'ACTIF' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleTierFlag('customKillEffect')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-center justify-between ${
                    selectedVipTier.customKillEffect
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Broadcast &amp; Effet Spawn</div>
                    <div className="text-[11px] opacity-80">Message privé d’équipement VIP</div>
                  </div>
                  <span className="font-mono text-xs font-bold">
                    {selectedVipTier.customKillEffect ? 'ACTIF' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Team / Faction Selector Tabs */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  1. Choisissez la Team / Faction à configurer pour {selectedVipTier.name} :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_FACTIONS.map((fac) => {
                    const facLoadout = getFactionLoadout(selectedVipTier, fac.key);
                    const isSelected = selectedFactionKey === fac.key;
                    return (
                      <button
                        key={fac.key}
                        type="button"
                        onClick={() => setSelectedFactionKey(fac.key)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs truncate">{fac.label}</div>
                        <div
                          className={`text-[11px] font-mono mt-1 ${
                            isSelected ? 'text-slate-900 font-semibold' : 'text-amber-400'
                          }`}
                        >
                          +{facLoadout.bonusHp} HP · {facLoadout.extraItems.length} items bonus
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Numeric Advantages for Selected Faction */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-white">
                    Bonus de Statistiques au Spawn — <span className="text-amber-400">{activeLoadout.factionLabel}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Appliqué automatiquement au spawn de la manche
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bonus Santé (+HP au Spawn)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={activeLoadout.bonusHp}
                      onChange={(e) =>
                        updateSelectedTierLoadout(selectedFactionKey, (prev) => ({
                          ...prev,
                          bonusHp: Number(e.target.value) || 0
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-900 border border-slate-800 text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bouclier Artificiel (+AHP au Spawn)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={activeLoadout.bonusAhp}
                      onChange={(e) =>
                        updateSelectedTierLoadout(selectedFactionKey, (prev) => ({
                          ...prev,
                          bonusAhp: Number(e.target.value) || 0
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-900 border border-slate-800 text-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bonus Chance d’Apparition (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activeLoadout.spawnChanceBoostPercent}
                      onChange={(e) =>
                        updateSelectedTierLoadout(selectedFactionKey, (prev) => ({
                          ...prev,
                          spawnChanceBoostPercent: Number(e.target.value) || 0
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-900 border border-slate-800 text-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Items Picker for Selected Faction */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    2. Items Supplémentaires donnés au Spawn quand le joueur est{' '}
                    <span className="text-amber-400 underline">{activeLoadout.factionLabel}</span> :
                  </label>
                  <span className="text-xs font-mono text-emerald-400">
                    {activeLoadout.extraItems.length} item(s) sélectionné(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {SCPSL_ITEMS.map((item) => {
                    const isChecked = activeLoadout.extraItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleExtraItem(item.id)}
                        className={`p-2.5 rounded-lg border text-left transition-colors flex items-start justify-between gap-2 ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{item.label}</div>
                          <div className="text-[10px] font-mono opacity-75">{item.id}</div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                            isChecked ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Generated VipAdvantages.yml Preview */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Fichier généré : `/home/container/.config/EXILED/Configs/VipAdvantages.yml`
                  </h4>
                  <p className="text-xs text-slate-400">
                    Inclus automatiquement dans votre Gros Mega Egg Tout-En-Un et synchronisable via `POST /files/write`.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyYaml}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    {copiedYaml ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copier YAML
                  </button>
                  <button
                    onClick={handleDownloadYaml}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger VipAdvantages.yml
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-[#05070c] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-64">
                {vipYamlPreview}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: WEB PANEL RBAC PERMISSIONS MATRIX & STAFF ROLES           */}
      {/* ==================================================================== */}
      {adminSubTab === 'panel-permissions' && (
        <div className="space-y-6">
          {/* Live Role Simulator Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                CONTRÔLE D’ACCÈS STRICT (RBAC) — SECTION DÉVELOPPEUR RÉSERVÉE AU FONDATEUR &amp; AUX DÉVELOPPEURS
              </div>
              <p className="text-xs text-slate-300">
                Testez en direct la vue d’un Administrateur, d’un Modérateur ou d’un Helpeur : lorsque vous changez de grade actif, l’onglet <strong className="text-cyan-300">Développeur</strong> disparaît immédiatement pour les Admins, Modos et Helpeurs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {panelRoleMatrix.map((role) => (
                <button
                  key={role.roleId}
                  onClick={() => setCurrentActiveRole(role.roleId)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    currentActiveRole === role.roleId
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Simuler : {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permission Matrix Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Matrice des Permissions du Panel Web (`scpsl.lumishost.com`)
              </h3>
              <p className="text-xs text-slate-400">
                Cliquez sur une permission pour l’activer ou la retirer à un grade. La Section Développeur est verrouillée par sécurité uniquement pour <strong className="text-rose-400">Fondateur O5</strong> et <strong className="text-cyan-400">Développeur Système</strong>.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-3 px-3">Grade Panel Web</th>
                    <th className="py-3 px-2 text-center">Contrôle En Jeu</th>
                    <th className="py-3 px-2 text-center">Actions Lourdes (God/Items/Nuke)</th>
                    <th className="py-3 px-2 text-center">Profils Online &amp; Offline</th>
                    <th className="py-3 px-2 text-center">Bannir (`ban` / `oban`)</th>
                    <th className="py-3 px-2 text-center">Débannir (`unban`)</th>
                    <th className="py-3 px-2 text-center">Events &amp; Teams</th>
                    <th className="py-3 px-2 text-center">Onglet Administration</th>
                    <th className="py-3 px-2 text-center text-cyan-400">Onglet Développeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {panelRoleMatrix.map((row) => {
                    const isFounder = row.roleId === 'founder';
                    const isDevAllowed = row.roleId === 'founder' || row.roleId === 'developer';

                    const renderCell = (
                      field: BooleanPanelPermField,
                      locked = false
                    ) => {
                      const val = row[field];
                      return (
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            disabled={isFounder || locked}
                            onClick={() => handleToggleRolePermission(row.roleId, field)}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                              val
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            } ${isFounder || locked ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105'}`}
                          >
                            {val ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    };

                    return (
                      <tr key={row.roleId} className="hover:bg-slate-950/60">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: row.badgeColorHex }}
                            />
                            {row.label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                            {row.description}
                          </div>
                        </td>
                        {renderCell('canAccessInGameControl')}
                        {renderCell('canUseHeavyInGameActions')}
                        {renderCell('canAccessLogsAndProfiles')}
                        {renderCell('canBanPlayers')}
                        {renderCell('canUnbanPlayers')}
                        {renderCell('canAccessEventsAndTeams')}
                        {renderCell('canAccessAdministrationTab')}
                        {renderCell('canAccessDeveloperTab', !isDevAllowed)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staff Accounts & Role Assignment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Comptes Staff &amp; Attribution des Grades Panel Web ({staffList.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Modifiez le grade d’un membre du Staff pour lui donner ou retirer l’accès Administration ou Développeur.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{staff.username}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                          {staff.badgeText}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        SteamID: {staff.steamId} · Discord: {staff.discordTag}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={staff.panelRole || 'moderator'}
                        onChange={(e) =>
                          handleChangeStaffPanelRole(staff.id, e.target.value as WebPanelRole)
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 text-white"
                      >
                        {panelRoleMatrix.map((roleOpt) => (
                          <option key={roleOpt.roleId} value={roleOpt.roleId}>
                            {roleOpt.label} ({roleOpt.badgeText})
                          </option>
                        ))}
                      </select>

                      {staff.panelRole !== 'founder' && (
                        <button
                          onClick={() =>
                            setStaffList((prev) => prev.filter((s) => s.id !== staff.id))
                          }
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          title="Révoquer ce Staff"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Staff Member Form */}
            <div className="lg:col-span-4 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  + Ajouter un Membre au Staff
                </h3>
                <p className="text-xs text-slate-400">
                  Ajoute l’accès au Panel Web et synchronise `config_remoteadmin.txt`.
                </p>
              </div>

              <form onSubmit={handleAddStaffMember} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pseudo du Staff
                  </label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Ex: Agent_Kovacs"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SteamID64 (`@steam`)
                  </label>
                  <input
                    type="text"
                    value={newStaffSteamId}
                    onChange={(e) => setNewStaffSteamId(e.target.value)}
                    placeholder="76561198000000000@steam"
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pseudo Discord
                  </label>
                  <input
                    type="text"
                    value={newStaffDiscordTag}
                    onChange={(e) => setNewStaffDiscordTag(e.target.value)}
                    placeholder="kovacs_scp"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Grade &amp; Permissions sur le Panel
                  </label>
                  <select
                    value={newStaffPanelRole}
                    onChange={(e) => setNewStaffPanelRole(e.target.value as WebPanelRole)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {panelRoleMatrix.map((roleOpt) => (
                      <option key={roleOpt.roleId} value={roleOpt.roleId}>
                        {roleOpt.label} ({roleOpt.badgeText})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  Ajouter au Staff &amp; RemoteAdmin
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
