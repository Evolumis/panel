import React, { useState } from 'react';
import {
  Flame,
  Play,
  Square,
  Volume2,
  Radio,
  Zap,
  Lock,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { EVENT_PRESETS, EventPreset } from '../data/scpslDefaults';

interface EventModeControllerProps {
  eventActive: boolean;
  setEventActive: (val: boolean) => void;
  activeEventTitle: string;
  setActiveEventTitle: (val: string) => void;
  onExecutePteroCommand: (cmd: string, origin?: string) => void;
}

export const EventModeController: React.FC<EventModeControllerProps> = ({
  eventActive,
  setEventActive,
  activeEventTitle,
  setActiveEventTitle,
  onExecutePteroCommand
}) => {
  const [mutators, setMutators] = useState({
    friendlyFire: false,
    infiniteAmmo: false,
    disableTeslas: true,
    lockWarhead: true,
    roundLock: false,
    facilityBlackout: false
  });

  const [broadcastMessage, setBroadcastMessage] = useState(
    '<color=#FAFF86><b>[EVENT SITE-19]</b></color> Rassemblement en Surface Gate A — Écoutez les consignes des Animateurs !'
  );
  const [broadcastDuration, setBroadcastDuration] = useState(12);

  const [cassieSentence, setCassieSentence] = useState(
    'pitch_0.95 attention all personnel . special containment event initiated by o5 command'
  );
  const [cassieSubtitles, setCassieSubtitles] = useState(
    'Attention à tout le personnel : événement spécial lancé par le Conseil O5.'
  );

  const handleLaunchPreset = (preset: EventPreset) => {
    setEventActive(true);
    setActiveEventTitle(preset.title);
    setMutators((prev) => ({
      ...prev,
      friendlyFire: preset.recommendedMutators.friendlyFire,
      infiniteAmmo: preset.recommendedMutators.infiniteAmmo,
      disableTeslas: preset.recommendedMutators.disableTeslas,
      lockWarhead: preset.recommendedMutators.lockWarhead
    }));

    onExecutePteroCommand(
      `roundlock true && bc 15 ${preset.broadcastText}`,
      'MODE EVENT'
    );
    onExecutePteroCommand(`cassie ${preset.cassieStart}`, 'C.A.S.S.I.E.');
  };

  const handleStopEvent = () => {
    setEventActive(false);
    setActiveEventTitle('Aucun événement actif (Rotation Classique)');
    setMutators({
      friendlyFire: false,
      infiniteAmmo: false,
      disableTeslas: false,
      lockWarhead: false,
      roundLock: false,
      facilityBlackout: false
    });
    onExecutePteroCommand(
      'roundlock false && ff off && bc 10 <color=#50C878><b>[FIN DU MODE EVENT]</b></color> Retour aux manches normales !',
      'MODE EVENT'
    );
  };

  const toggleMutator = (key: keyof typeof mutators, label: string, cmdOn: string, cmdOff: string) => {
    const nextVal = !mutators[key];
    setMutators((prev) => ({ ...prev, [key]: nextVal }));
    onExecutePteroCommand(nextVal ? cmdOn : cmdOff, `MUTATEUR (${label})`);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    onExecutePteroCommand(
      `bc ${broadcastDuration} ${broadcastMessage}`,
      'BROADCAST'
    );
  };

  const handleSendCassie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cassieSentence.trim()) return;
    onExecutePteroCommand(
      `cassie_sl ${cassieSentence} || ${cassieSubtitles}`,
      'C.A.S.S.I.E.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Event Status Control Banner */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-amber-400">
            CONTRÔLEUR DIRECT D’ÉVÉNEMENTS SCP:SL · EXILED EVENT MANAGER
          </div>
          <h2 className="text-2xl font-bold text-white">
            {eventActive ? `Mode Event Actif : ${activeEventTitle}` : 'Mode Event Prêt au Déploiement'}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Lancez des scénarios préconfigurés en un clic, modifiez les règles physiques de la manche en direct (Teslas, Ogive Alpha, Tir Allié, Blackout) et diffusez des alertes C.A.S.S.I.E.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {eventActive ? (
            <button
              onClick={handleStopEvent}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Arrêter l’Event & Relancer Manche Normale
            </button>
          ) : (
            <button
              onClick={() => handleLaunchPreset(EVENT_PRESETS[0])}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              Activer le Mode Event Maintenant
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Split: Event Presets Left, Mutators & Broadcaster Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 4 Event Scenarios */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-base font-semibold text-white">
            01. Scénarios d’Événements Prêts à Lancer
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {EVENT_PRESETS.map((preset) => {
              const isCurrent = eventActive && activeEventTitle === preset.title;
              return (
                <div
                  key={preset.id}
                  className={`p-5 rounded-xl border transition-colors space-y-3 ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
                        <span>SCÉNARIO {preset.category.toUpperCase()}</span>
                        {isCurrent && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400 font-bold">EN COURS SUR LE SERVEUR</span>
                          </>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {preset.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleLaunchPreset(preset)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isCurrent ? 'Relancer le Scénario' : 'Lancer cet Event'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {preset.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400">Camp SCP / Hostile : </span>
                      <span className="font-semibold text-rose-300">{preset.scpRole}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Camp Humains : </span>
                      <span className="font-semibold text-cyan-300">{preset.humanRole}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Mutators Matrix & Live Broadcaster */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Mutators */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                02. Mutateurs Physiques & Règles de Manche
              </h3>
              <p className="text-xs text-slate-400">
                Chaque bascule exécute instantanément la commande RemoteAdmin sur Pterodactyl
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  toggleMutator('friendlyFire', 'Friendly Fire', 'ff on', 'ff off')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.friendlyFire
                    ? 'bg-rose-500/20 border-rose-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Friendly Fire (Tir Allié)</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.friendlyFire ? 'ACTIF (ff on)' : 'DÉSACTIVÉ (ff off)'}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleMutator('infiniteAmmo', 'Munitions Infinies', 'infammo true', 'infammo false')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.infiniteAmmo
                    ? 'bg-amber-500/20 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Munitions Illimitées</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.infiniteAmmo ? 'ACTIF (infammo)' : 'NORMAL'}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleMutator('disableTeslas', 'Portes Tesla', 'tesla false', 'tesla true')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.disableTeslas
                    ? 'bg-cyan-500/20 border-cyan-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Portes Tesla Coupées</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.disableTeslas ? 'DÉSACTIVÉES' : 'ACTIVES'}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleMutator('lockWarhead', 'Ogive Alpha', 'warhead lock true', 'warhead lock false')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.lockWarhead
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Verrouillage Ogive Alpha</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.lockWarhead ? 'VERROUILLÉE' : 'DÉVERROUILLÉE'}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleMutator('roundLock', 'Round Lock', 'roundlock true', 'roundlock false')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.roundLock
                    ? 'bg-indigo-500/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Blocage Fin de Manche</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.roundLock ? 'ROUNDLOCK ON' : 'ROUNDLOCK OFF'}
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleMutator('facilityBlackout', 'Blackout Lumières', 'overcharge 300', 'overcharge 0')
                }
                className={`p-3 rounded-lg border text-left transition-colors ${
                  mutators.facilityBlackout
                    ? 'bg-purple-500/20 border-purple-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">Blackout Total Site-19</div>
                <div className="text-xs font-mono mt-0.5">
                  {mutators.facilityBlackout ? 'LUMIÈRES COUPÉES' : 'ÉCLAIRAGE NORMAL'}
                </div>
              </button>
            </div>
          </div>

          {/* Broadcast & CASSIE Transmitter */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900 space-y-4">
            <h3 className="text-base font-semibold text-white">
              03. Pupitre Broadcast & Synthétiseur C.A.S.S.I.E.
            </h3>

            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Bannière Broadcast Écran (Supporte &lt;color&gt; &amp; &lt;b&gt;)
                </label>
                <span className="text-xs font-mono text-amber-400">
                  Durée : {broadcastDuration}s
                </span>
              </div>
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-200"
              />
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={broadcastDuration}
                  onChange={(e) => setBroadcastDuration(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Diffuser le Broadcast
                </button>
              </div>
            </form>

            <form
              onSubmit={handleSendCassie}
              className="pt-3 border-t border-slate-800 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Voix C.A.S.S.I.E. (Mots phonétiques anglais + pitch_ / jam_)
                </label>
                <input
                  type="text"
                  value={cassieSentence}
                  onChange={(e) => setCassieSentence(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sous-titres Français affichés en bas de l’écran
                </label>
                <input
                  type="text"
                  value={cassieSubtitles}
                  onChange={(e) => setCassieSubtitles(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Lancer l’Annonce Vocale C.A.S.S.I.E.
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
