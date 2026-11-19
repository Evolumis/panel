import React, { useState } from 'react';
import {
  MapPin,
  Eye,
  Zap,
  Crosshair,
  Package,
  HeartPulse,
  Lock,
  Unlock,
  LightbulbOff,
  Flame,
  Volume2,
  MicOff
} from 'lucide-react';
import { ActiveInGamePlayer } from './InGameManagementPanel';
import { SCPSL_ITEMS } from '../data/scpslDefaults';

interface Site19GameInterfaceProps {
  players: ActiveInGamePlayer[];
  selectedPlayer: ActiveInGamePlayer;
  onSelectPlayer: (player: ActiveInGamePlayer) => void;
  warheadState: 'STANDBY' | 'COUNTDOWN' | 'LOCKED' | 'DETONATED';
  doorsLocked: boolean;
  blackoutActive: boolean;
  roundLocked: boolean;
  serverPort: string;
  lastBroadcastBanner: string;
  lastCassieSubtitle: string;
  canUseHeavyActions: boolean;
  onQuickZoneTeleport: (zone: ActiveInGamePlayer['zone'], cmdId: string) => void;
  onQuickFacilityCommand: (cmd: string, origin: string) => void;
  onQuickHealSelected: () => void;
}

interface SectorConfig {
  id: ActiveInGamePlayer['zone'];
  title: string;
  code: string;
  cmdId: string;
  accentBorder: string;
  accentText: string;
  rooms: string[];
}

const FACILITY_SECTORS: SectorConfig[] = [
  {
    id: 'Surface Zone',
    title: 'Surface Zone (Extérieur)',
    code: 'SURF-00',
    cmdId: 'Surface_GateA',
    accentBorder: 'border-sky-500/40',
    accentText: 'text-sky-400',
    rooms: ['Héliport MTF (Gate B)', 'Sortie Porte A (Gate A)', 'Tour Staff / Évacuation']
  },
  {
    id: 'Entrance Zone',
    title: 'Entrance Zone (Bureaux)',
    code: 'EZ-01',
    cmdId: 'EZ_Intercom',
    accentBorder: 'border-amber-500/40',
    accentText: 'text-amber-400',
    rooms: ['Salle Intercom', 'Checkpoint Gate A / B', 'Bureaux Administratifs']
  },
  {
    id: 'Heavy Containment',
    title: 'Heavy Containment (HCZ)',
    code: 'HCZ-02',
    cmdId: 'HCZ_Warhead',
    accentBorder: 'border-rose-500/40',
    accentText: 'text-rose-400',
    rooms: ['Silo Ogive Alpha', 'Armurerie Micro H.I.D.', 'Confinement 049 / 173 / 079']
  },
  {
    id: 'Light Containment',
    title: 'Light Containment (LCZ)',
    code: 'LCZ-03',
    cmdId: 'LCZ_914',
    accentBorder: 'border-orange-500/40',
    accentText: 'text-orange-400',
    rooms: ['Salle SCP-914', 'Cellules Classe-D', 'Armurerie LCZ & PC-15']
  }
];

export const Site19GameInterface: React.FC<Site19GameInterfaceProps> = ({
  players,
  selectedPlayer,
  onSelectPlayer,
  warheadState,
  doorsLocked,
  blackoutActive,
  roundLocked,
  serverPort,
  lastBroadcastBanner,
  lastCassieSubtitle,
  canUseHeavyActions,
  onQuickZoneTeleport,
  onQuickFacilityCommand,
  onQuickHealSelected
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'hud' | 'map'>('split');
  const [generatorsActive, setGeneratorsActive] = useState<[boolean, boolean, boolean]>([
    true,
    true,
    false
  ]);
  const [teslasDisabled, setTeslasDisabled] = useState(false);

  const activeGeneratorsCount = generatorsActive.filter(Boolean).length;

  const toggleGenerator = (index: number) => {
    if (!canUseHeavyActions) return;
    const next: [boolean, boolean, boolean] = [...generatorsActive] as [
      boolean,
      boolean,
      boolean
    ];
    next[index] = !next[index];
    setGeneratorsActive(next);
    onQuickFacilityCommand(
      `overcharge ${next[index] ? 'gen_on' : 'gen_off'}_${index + 1}`,
      'SITE-19 GENERATORS'
    );
  };

  const toggleTeslas = () => {
    if (!canUseHeavyActions) return;
    const next = !teslasDisabled;
    setTeslasDisabled(next);
    onQuickFacilityCommand(
      next ? 'tesla disable' : 'tesla enable',
      'SITE-19 TESLA GATES'
    );
  };

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-5">
      {/* Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400">
            INTERFACE DE JEU EN DIRECT · RADAR SITE-19 &amp; MONITEUR HUD SPECTATEUR (play.lumishost.com:{serverPort})
          </div>
          <h2 className="text-lg font-bold text-white">
            Interface Tactique En Jeu &amp; Aperçu Écran Joueur ({selectedPlayer.name})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'split'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Vue Mixte (HUD + Carte)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hud')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'hud'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Écran HUD Joueur
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'map'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Carte Radar Site-19
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* LEFT: LIVE IN-GAME PLAYER / SPECTATOR HUD VIEWPORT */}
        {(viewMode === 'split' || viewMode === 'hud') && (
          <div
            className={`${
              viewMode === 'hud' ? 'xl:col-span-12' : 'xl:col-span-6'
            } rounded-xl border border-slate-800 bg-[#05080f] p-4 flex flex-col justify-between min-h-[420px] relative overflow-hidden`}
            style={{
              backgroundImage: blackoutActive
                ? 'radial-gradient(circle at 50% 40%, rgba(30, 10, 45, 0.55), rgba(3, 5, 10, 0.98))'
                : warheadState === 'COUNTDOWN'
                ? 'radial-gradient(circle at 50% 40%, rgba(127, 29, 29, 0.35), rgba(5, 8, 15, 0.96))'
                : 'radial-gradient(circle at 50% 40%, rgba(15, 23, 42, 0.7), rgba(4, 7, 13, 0.98))'
            }}
          >
            {/* Top HUD Row: Server Tag, Round Timer, Spectators, Warhead Alert */}
            <div className="space-y-2.5 z-10">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <div className="px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800 text-slate-200 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    SPECTATE : <strong className="text-white">{selectedPlayer.name}</strong>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-emerald-400">{selectedPlayer.ping} ms</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800 text-slate-300 tabular-nums">
                    MANCHE 14:28 {roundLocked ? '· LOCKED' : ''}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded border font-bold ${
                      warheadState === 'COUNTDOWN'
                        ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                        : warheadState === 'LOCKED'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                        : 'bg-slate-950/90 border-slate-800 text-slate-400'
                    }`}
                  >
                    OGIVE : {warheadState}
                  </span>
                </div>
              </div>

              {/* In-Game Server Broadcast Banner */}
              <div className="p-2.5 rounded-lg bg-slate-950/90 border border-amber-500/30 text-center">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 mb-0.5">
                  Broadcast Écran En Jeu (bc)
                </div>
                <div className="text-xs font-semibold text-white">
                  {lastBroadcastBanner}
                </div>
              </div>
            </div>

            {/* Center HUD Crosshair & Live Tactical Overlay */}
            <div className="my-4 py-4 flex flex-col items-center justify-center text-center space-y-3 z-10">
              <div className="w-10 h-10 rounded-full border border-slate-700/80 flex items-center justify-center">
                <Crosshair className="w-4 h-4 text-slate-400" />
              </div>

              <div className="space-y-1">
                <div
                  className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 inline-block"
                  style={{ color: selectedPlayer.badgeHex }}
                >
                  [{selectedPlayer.badgeText}]
                </div>
                <div
                  className="text-base font-bold"
                  style={{ color: selectedPlayer.roleColor }}
                >
                  {selectedPlayer.role}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Position actuelle : <strong className="text-white">{selectedPlayer.zone}</strong>
                </div>
              </div>

              {/* Active Player Flags on HUD */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
                {selectedPlayer.godMode && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300">
                    GODMODE ACTIF
                  </span>
                )}
                {selectedPlayer.noclip && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300">
                    NOCLIP VOL
                  </span>
                )}
                {selectedPlayer.bypassMode && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                    BYPASS PORTES
                  </span>
                )}
                {selectedPlayer.voiceMuted && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 flex items-center gap-1">
                    <MicOff className="w-3 h-3" /> MUTE VOCAL
                  </span>
                )}
                {doorsLocked && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/50 text-rose-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> PORTES VERROUILLÉES
                  </span>
                )}
                {blackoutActive && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/50 text-purple-200 flex items-center gap-1">
                    <LightbulbOff className="w-3 h-3" /> BLACKOUT TOTAL
                  </span>
                )}
              </div>

              {/* C.A.S.S.I.E. Subtitle Box */}
              <div className="w-full max-w-md px-3 py-1.5 rounded bg-slate-950/85 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-center gap-2">
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">C.A.S.S.I.E. : {lastCassieSubtitle}</span>
              </div>
            </div>

            {/* Bottom HUD Row: Left = HP/AHP Vitals, Right = 8-Slot Inventory Hotbar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end z-10 pt-2 border-t border-slate-800/80">
              {/* Vitals */}
              <div className="sm:col-span-5 p-3 rounded-lg bg-slate-950/95 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" />
                    HP {selectedPlayer.hp} / {selectedPlayer.maxHp}
                  </span>
                  <button
                    type="button"
                    onClick={onQuickHealSelected}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[11px] border border-emerald-500/40"
                  >
                    + Heal 100%
                  </button>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((selectedPlayer.hp / Math.max(1, selectedPlayer.maxHp)) * 100)
                      )}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                  <span>Bouclier AHP : {selectedPlayer.ahp}</span>
                  <span>Stamina : 100%</span>
                </div>
              </div>

              {/* 8-Slot Inventory Grid */}
              <div className="sm:col-span-7 p-2.5 rounded-lg bg-slate-950/95 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-amber-400" />
                    Inventaire En Jeu ({selectedPlayer.inventory.length}/8)
                  </span>
                  <span className="text-slate-500">Touches [1-8]</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const itemId = selectedPlayer.inventory[idx];
                    const itemMeta = SCPSL_ITEMS.find((it) => it.id === itemId);
                    return (
                      <div
                        key={idx}
                        className={`px-2 py-1.5 rounded border text-[10px] font-mono truncate ${
                          itemId
                            ? 'bg-slate-900 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950 border-slate-800/80 text-slate-600'
                        }`}
                        title={itemMeta ? itemMeta.label : 'Emplacement vide'}
                      >
                        <span className="text-slate-500 mr-1">{idx + 1}.</span>
                        {itemId ? itemId.replace('Keycard', 'Key:').replace('Gun', '') : 'Vide'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: INTERACTIVE SITE-19 SECTOR RADAR MAP */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div
            className={`${
              viewMode === 'map' ? 'xl:col-span-12' : 'xl:col-span-6'
            } rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between space-y-4`}
          >
            {/* Facility Sub-Systems Status Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="text-xs font-mono text-slate-300">
                CARTE RADAR DES SECTEURS — Cliquez sur un joueur pour l’inspecter ou sur TP pour l’y téléporter
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  disabled={!canUseHeavyActions}
                  onClick={toggleTeslas}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    teslasDisabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  Teslas : {teslasDisabled ? 'OFF' : 'ACTIVES'}
                </button>
              </div>
            </div>

            {/* 4 Interactive Facility Sectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FACILITY_SECTORS.map((sector) => {
                const sectorPlayers = players.filter((p) => p.zone === sector.id);
                const isSelectedZone = selectedPlayer.zone === sector.id;

                return (
                  <div
                    key={sector.id}
                    className={`p-3.5 rounded-xl border bg-slate-900/80 space-y-2.5 transition-colors ${
                      isSelectedZone ? sector.accentBorder : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className={`text-[11px] font-mono font-bold ${sector.accentText}`}>
                          {sector.code} · {sectorPlayers.length} joueur(s)
                        </div>
                        <div className="text-xs font-bold text-white">{sector.title}</div>
                      </div>

                      <button
                        type="button"
                        disabled={!canUseHeavyActions}
                        onClick={() => onQuickZoneTeleport(sector.id, sector.cmdId)}
                        className={`px-2 py-1 text-[11px] font-mono font-semibold rounded bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-slate-700 transition-colors ${
                          !canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={`Téléporter ${selectedPlayer.name} ici`}
                      >
                        <MapPin className="w-3 h-3 inline mr-0.5" />
                        TP Ici
                      </button>
                    </div>

                    {/* Rooms list */}
                    <div className="flex flex-wrap gap-1">
                      {sector.rooms.map((rm) => (
                        <span
                          key={rm}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          {rm}
                        </span>
                      ))}
                    </div>

                    {/* Live Players currently in this Sector */}
                    <div className="space-y-1.5 pt-1">
                      {sectorPlayers.length === 0 ? (
                        <div className="text-[11px] font-mono text-slate-600 italic">
                          Aucun joueur détecté dans ce secteur
                        </div>
                      ) : (
                        sectorPlayers.map((pl) => {
                          const isCurrent = pl.id === selectedPlayer.id;
                          return (
                            <button
                              key={pl.id}
                              type="button"
                              onClick={() => onSelectPlayer(pl)}
                              className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                                isCurrent
                                  ? 'bg-amber-500/20 border-amber-500/60 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: pl.roleColor }}
                                />
                                <span className="font-semibold truncate">{pl.name}</span>
                              </div>
                              <span
                                className="text-[10px] font-mono shrink-0"
                                style={{ color: pl.roleColor }}
                              >
                                {pl.hp} HP
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* HCZ Generators + Quick Facility Overlays */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">
                  Générateurs HCZ ({activeGeneratorsCount}/3) :
                </span>
                <div className="flex items-center gap-1.5">
                  {generatorsActive.map((active, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={!canUseHeavyActions}
                      onClick={() => toggleGenerator(idx)}
                      className={`px-2 py-1 text-[11px] font-mono font-bold rounded border transition-colors ${
                        active
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      } ${!canUseHeavyActions ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      GEN-{idx + 1} {active ? 'ON' : 'OFF'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                {doorsLocked ? (
                  <span className="text-rose-400 font-bold">
                    <Lock className="w-3 h-3 inline mr-1" />
                    CONFINEMENT PORTES ACTIF
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    <Unlock className="w-3 h-3 inline mr-1" />
                    CIRCULATION PORTES OUVERTE
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
