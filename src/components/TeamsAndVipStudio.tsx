import React, { useState } from 'react';
import {
  Users,
  Crown,
  Plus,
  Play,
  Volume2,
  Trash2,
  Copy,
  Check,
  Shield
} from 'lucide-react';
import {
  CustomTeam,
  SCPSL_BADGE_COLORS,
  SCPSL_ITEMS,
  StaffMember,
  VipTier
} from '../data/scpslDefaults';
import {
  generateExiledCustomTeamsYaml,
  generateRemoteAdminConfig
} from '../utils/configGenerators';

interface TeamsAndVipStudioProps {
  customTeams: CustomTeam[];
  setCustomTeams: React.Dispatch<React.SetStateAction<CustomTeam[]>>;
  vipTiers: VipTier[];
  setVipTiers: React.Dispatch<React.SetStateAction<VipTier[]>>;
  staffList: StaffMember[];
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
}

export const TeamsAndVipStudio: React.FC<TeamsAndVipStudioProps> = ({
  customTeams,
  setCustomTeams,
  vipTiers,
  setVipTiers,
  staffList,
  onExecutePteroCommand
}) => {
  const [activeMode, setActiveMode] = useState<'teams' | 'vip'>('teams');

  // Custom Team form state
  const [teamName, setTeamName] = useState('FIM Tau-5 "Samsara"');
  const [teamKey, setTeamKey] = useState('tau5_samsara');
  const [teamSubtitle, setTeamSubtitle] = useState(
    'Unité cyborg immortelle déployée pour neutraliser les brèches Keter critiques'
  );
  const [teamColor, setTeamColor] = useState('orange');
  const [teamHp, setTeamHp] = useState(165);
  const [teamMaxPlayers, setTeamMaxPlayers] = useState(4);
  const [teamChance, setTeamChance] = useState(30);
  const [teamZone, setTeamZone] = useState<CustomTeam['spawnZone']>('Surface Gate B');
  const [teamModel, setTeamModel] = useState<CustomTeam['baseModel']>('NtfSpecialist');
  const [teamItems, setTeamItems] = useState<string[]>([
    'KeycardO5',
    'GunE11SR',
    'ParticleDisruptor',
    'SCP500',
    'ArmorHeavy',
    'Radio'
  ]);
  const [teamCassie, setTeamCassie] = useState(
    'mobile task force unit tau 5 designated samsara has entered the facility'
  );
  const [teamCassieSub, setTeamCassieSub] = useState(
    'La Force d’Intervention Mobile cyborg Tau-5 "Samsara" est entrée dans le complexe.'
  );
  const [teamFriendly, setTeamFriendly] = useState<CustomTeam['friendlyWith']>(['MTF']);
  const [copiedYaml, setCopiedYaml] = useState(false);

  // VIP Creator state
  const [vipName, setVipName] = useState('VIP Conseil O5');
  const [vipBadge, setVipBadge] = useState('👑 VIP CONSEIL O5');
  const [vipColor, setVipColor] = useState('emerald');
  const [vipPrice, setVipPrice] = useState('14.99€ / mois');
  const [vipPerkInput, setVipPerkInput] = useState(
    'Accès slot réservé + Tag Émeraude + Vote Event doublé'
  );

  // Assign VIP to Player state
  const [selectedVipTierId, setSelectedVipTierId] = useState(vipTiers[0]?.id || 'vip-keter');
  const [playerVipName, setPlayerVipName] = useState('');
  const [playerVipSteam, setPlayerVipSteam] = useState('');
  const [copiedRemoteAdmin, setCopiedRemoteAdmin] = useState(false);

  const getHex = (colorId: string) =>
    SCPSL_BADGE_COLORS.find((c) => c.id === colorId)?.hex || '#00B7EB';

  const toggleItemInLoadout = (itemId: string) => {
    setTeamItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((i) => i !== itemId);
      }
      if (prev.length >= 8) return prev; // SCP:SL max 8 inventory slots
      return [...prev, itemId];
    });
  };

  const toggleFriendly = (faction: 'SCPs' | 'MTF' | 'Chaos' | 'ClassD') => {
    setTeamFriendly((prev) =>
      prev.includes(faction) ? prev.filter((f) => f !== faction) : [...prev, faction]
    );
  };

  const handleCreateCustomTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    const created: CustomTeam = {
      id: `team-${Date.now()}`,
      name: teamName.trim(),
      roleKey: teamKey.trim() || teamName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      subtitle: teamSubtitle.trim(),
      badgeColor: teamColor,
      hp: Number(teamHp) || 120,
      maxPlayersPerWave: Number(teamMaxPlayers) || 4,
      spawnChance: Number(teamChance) || 25,
      spawnZone: teamZone,
      baseModel: teamModel,
      inventory: teamItems,
      cassieAnnouncement: teamCassie,
      cassieSubtitles: teamCassieSub,
      friendlyWith: teamFriendly
    };

    setCustomTeams((prev) => [created, ...prev]);
    onExecutePteroCommand(
      `exiled reload customroles && echo "Équipe ${created.name} enregistrée"`,
      'EXILED'
    );
  };

  const handleCreateVipTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vipName.trim() || !vipBadge.trim()) return;
    const tierId = `vip_${vipName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 16)}_${Date.now().toString().slice(-3)}`;

    const newTier: VipTier = {
      id: tierId,
      name: vipName.trim(),
      badgeText: vipBadge.trim(),
      badgeColor: vipColor,
      priceLabel: vipPrice.trim() || '5.00€ / mois',
      perks: vipPerkInput
        .split('+')
        .map((s) => s.trim())
        .filter(Boolean),
      assignedPlayers: []
    };

    setVipTiers((prev) => [...prev, newTier]);
    setSelectedVipTierId(newTier.id);
    onExecutePteroCommand(`reload remoteadmin`, 'REMOTEADMIN');
  };

  const handleAssignVipPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerVipName.trim() || !playerVipSteam.trim()) return;
    const formattedSteam = playerVipSteam.includes('@')
      ? playerVipSteam.trim()
      : `${playerVipSteam.trim()}@steam`;

    setVipTiers((prev) =>
      prev.map((tier) =>
        tier.id === selectedVipTierId
          ? {
              ...tier,
              assignedPlayers: [
                ...tier.assignedPlayers,
                {
                  name: playerVipName.trim(),
                  steamId: formattedSteam,
                  expiresAt: '2026-12-31'
                }
              ]
            }
          : tier
      )
    );
    onExecutePteroCommand(`setgroup ${formattedSteam} ${selectedVipTierId}`, 'VIP MANAGER');
    setPlayerVipName('');
    setPlayerVipSteam('');
  };

  return (
    <div className="space-y-6">
      {/* Header switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900">
        <div>
          <h2 className="text-xl font-bold text-white">
            Architecte d’Équipes Customs EXILED & Créateur de Tags VIP
          </h2>
          <p className="text-xs text-slate-400">
            Configurez vos factions personnalisées (inventaire 8 slots, HP, annonces C.A.S.S.I.E.) et créez vos badges VIP synchronisés avec RemoteAdmin
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveMode('teams')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === 'teams'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Équipes Customs EXILED ({customTeams.length})
          </button>
          <button
            onClick={() => setActiveMode('vip')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeMode === 'vip'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Tags VIP & Grades Joueurs ({vipTiers.length})
          </button>
        </div>
      </div>

      {activeMode === 'teams' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Create Custom Team Form */}
          <form
            onSubmit={handleCreateCustomTeam}
            className="lg:col-span-5 p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Créer une Nouvelle Équipe Custom
              </h3>
              <span className="text-xs font-mono text-amber-400">
                EXILED CustomRoles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nom de l’Escouade / Faction
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clé Technique (role_key)
                </label>
                <input
                  type="text"
                  required
                  value={teamKey}
                  onChange={(e) => setTeamKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description affichée au joueur lors du spawn
              </label>
              <input
                type="text"
                value={teamSubtitle}
                onChange={(e) => setTeamSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Points de Vie (HP)
                </label>
                <input
                  type="number"
                  min={50}
                  max={1000}
                  value={teamHp}
                  onChange={(e) => setTeamHp(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chance Spawn (%)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={teamChance}
                  onChange={(e) => setTeamChance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Joueurs Max / Vague
                </label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={teamMaxPlayers}
                  onChange={(e) => setTeamMaxPlayers(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Couleur du Tag
                </label>
                <select
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {SCPSL_BADGE_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Zone d’Apparition
                </label>
                <select
                  value={teamZone}
                  onChange={(e) => setTeamZone(e.target.value as CustomTeam['spawnZone'])}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Surface Gate A">Surface Gate A</option>
                  <option value="Surface Gate B">Surface Gate B</option>
                  <option value="Entrance Zone">Entrance Zone</option>
                  <option value="Heavy Containment">Heavy Containment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Modèle 3D de Base
                </label>
                <select
                  value={teamModel}
                  onChange={(e) => setTeamModel(e.target.value as CustomTeam['baseModel'])}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Tutorial">Tutorial (Main du Serpent)</option>
                  <option value="NtfSpecialist">NtfSpecialist (MTF)</option>
                  <option value="ChaosRifleman">ChaosRifleman (Chaos)</option>
                  <option value="FacilityGuard">FacilityGuard (Garde)</option>
                  <option value="Scientist">Scientist (Chercheur)</option>
                </select>
              </div>
            </div>

            {/* Friendly Factions */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-300">
                Factions Alliées (Pas de dégâts / Victoire partagée)
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['SCPs', 'MTF', 'Chaos', 'ClassD'] as const).map((fac) => {
                  const active = teamFriendly.includes(fac);
                  return (
                    <button
                      type="button"
                      key={fac}
                      onClick={() => toggleFriendly(fac)}
                      className={`py-1.5 px-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {fac}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8-Slot Inventory Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">
                  Inventaire de Départ (Max 8 emplacements SCP:SL)
                </span>
                <span className="font-mono tabular-nums text-amber-400">
                  {teamItems.length} / 8 slots
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-2 rounded-lg bg-slate-950 border border-slate-800">
                {SCPSL_ITEMS.map((item) => {
                  const selected = teamItems.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleItemInLoadout(item.id)}
                      className={`px-2.5 py-1.5 text-left text-xs rounded border transition-colors truncate ${
                        selected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASSIE Announcement */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Annonce Vocale C.A.S.S.I.E. (Phonétique Anglaise)
                </label>
                <input
                  type="text"
                  value={teamCassie}
                  onChange={(e) => setTeamCassie(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sous-titres Français affichés à l’écran
                </label>
                <input
                  type="text"
                  value={teamCassieSub}
                  onChange={(e) => setTeamCassieSub(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter l’Équipe Custom au Serveur
            </button>
          </form>

          {/* Right: Active Custom Teams Grid & EXILED YAML Export */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Escouades & Factions Configurées ({customTeams.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Cliquez sur "Forcer le Spawn" pour faire apparaître l’équipe en jeu ou copiez la configuration EXILED
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateExiledCustomTeamsYaml(customTeams));
                  setCopiedYaml(true);
                  setTimeout(() => setCopiedYaml(false), 2000);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                {copiedYaml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    CustomTeams.yml Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copier CustomTeams.yml (EXILED)
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {customTeams.map((team) => (
                <div
                  key={team.id}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-base font-bold"
                          style={{ color: getHex(team.badgeColor) }}
                        >
                          {team.name}
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs font-mono text-slate-400">
                          {team.roleKey}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{team.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onExecutePteroCommand(
                            `cassie ${team.cassieAnnouncement}`,
                            'C.A.S.S.I.E.'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Tester C.A.S.S.I.E.
                      </button>
                      <button
                        onClick={() =>
                          onExecutePteroCommand(
                            `customteam spawn ${team.roleKey} && cassie ${team.cassieAnnouncement}`,
                            'PTERODACTYL'
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Forcer le Spawn
                      </button>
                      <button
                        onClick={() =>
                          setCustomTeams((prev) => prev.filter((t) => t.id !== team.id))
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Supprimer cette équipe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Clean unboxed metadata row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums pt-1 border-t border-slate-800/70">
                    <span className="text-white font-semibold">{team.hp} HP</span>
                    <span>·</span>
                    <span>Chance Vague : {team.spawnChance}%</span>
                    <span>·</span>
                    <span>Max {team.maxPlayersPerWave} joueurs</span>
                    <span>·</span>
                    <span>Zone : {team.spawnZone}</span>
                    <span>·</span>
                    <span>
                      Alliés : {team.friendlyWith.length > 0 ? team.friendlyWith.join(', ') : 'Aucun (Neutre Hostile)'}
                    </span>
                  </div>

                  {/* Inventory items list */}
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Équipement ({team.inventory.length}/8) : </span>
                    <span className="font-mono text-amber-300">
                      {team.inventory.join(' · ')}
                    </span>
                  </div>

                  {/* CASSIE Subtitles */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                    <span className="font-mono text-cyan-400">C.A.S.S.I.E. : </span>
                    <span className="text-slate-300">{team.cassieSubtitles}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIP TAGS & REMOTEADMIN STUDIO */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Create VIP Tag & Assign to Player */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={handleCreateVipTier}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  01. Créer un Nouveau Tag VIP
                </h3>
                <span className="text-xs font-mono text-amber-400">
                  config_remoteadmin.txt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom de l’Offre VIP
                  </label>
                  <input
                    type="text"
                    required
                    value={vipName}
                    onChange={(e) => setVipName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tarif ou Condition
                  </label>
                  <input
                    type="text"
                    value={vipPrice}
                    onChange={(e) => setVipPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Texte Exact du Tag en Jeu
                  </label>
                  <input
                    type="text"
                    required
                    value={vipBadge}
                    onChange={(e) => setVipBadge(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Couleur Officielle SCP:SL
                  </label>
                  <select
                    value={vipColor}
                    onChange={(e) => setVipColor(e.target.value)}
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

              {/* Live In-Game Scoreboard Row Preview */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-xs text-slate-400">
                  Aperçu dans la liste des joueurs SCP:SL (Touche N / Tab) :
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded bg-[#121722] border border-slate-800">
                  <span className="text-xs font-semibold text-white">
                    VotrePseudo_FR
                  </span>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: getHex(vipColor) }}
                  >
                    {vipBadge}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Avantages (séparés par le signe +)
                </label>
                <input
                  type="text"
                  value={vipPerkInput}
                  onChange={(e) => setVipPerkInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
              >
                Créer le Grade & Tag VIP
              </button>
            </form>

            {/* Assign VIP to Player */}
            <form
              onSubmit={handleAssignVipPlayer}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4"
            >
              <h3 className="text-base font-semibold text-white">
                02. Attribuer un Tag VIP à un Joueur (SteamID64)
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sélectionner le Grade VIP
                </label>
                <select
                  value={selectedVipTierId}
                  onChange={(e) => setSelectedVipTierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {vipTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.badgeText})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pseudo du Joueur
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SkyLord_FR"
                    value={playerVipName}
                    onChange={(e) => setPlayerVipName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SteamID64 (@steam)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="76561198...@steam"
                    value={playerVipSteam}
                    onChange={(e) => setPlayerVipSteam(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors whitespace-nowrap shrink-0"
              >
                Activer le Tag VIP en Direct sur le Serveur
              </button>
            </form>
          </div>

          {/* Right: VIP Tiers List & Generated config_remoteadmin.txt */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Tags VIP Actifs & Joueurs Abonnés
                </h3>
                <p className="text-xs text-slate-400">
                  Chaque attribution met à jour le fichier config_remoteadmin.txt de votre serveur Pterodactyl
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    generateRemoteAdminConfig(staffList, vipTiers)
                  );
                  setCopiedRemoteAdmin(true);
                  setTimeout(() => setCopiedRemoteAdmin(false), 2000);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                {copiedRemoteAdmin ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    config_remoteadmin.txt Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copier config_remoteadmin.txt
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {vipTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                          {tier.name}
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs font-mono text-amber-400">
                          {tier.priceLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Clé RemoteAdmin : {tier.id} · Couleur : {tier.badgeColor}
                      </div>
                    </div>

                    <div
                      className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono font-bold"
                      style={{ color: getHex(tier.badgeColor) }}
                    >
                      {tier.badgeText}
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-slate-300">
                    {tier.perks.map((perk, idx) => (
                      <li key={idx}>• {perk}</li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="text-xs font-medium text-slate-400">
                      Joueurs possédant ce Tag ({tier.assignedPlayers.length}) :
                    </div>
                    {tier.assignedPlayers.length === 0 ? (
                      <div className="text-xs text-slate-500">
                        Aucun joueur assigné pour le moment. Utilisez le formulaire à gauche ou /givevip sur Discord.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {tier.assignedPlayers.map((p, i) => (
                          <div
                            key={i}
                            className="py-1.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-white">{p.name}</span>{' '}
                              <span className="text-slate-500">·</span>{' '}
                              <span className="font-mono tabular-nums text-slate-400">
                                {p.steamId}
                              </span>
                            </div>
                            <span className="font-mono tabular-nums text-slate-400">
                              Validité : {p.expiresAt}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
