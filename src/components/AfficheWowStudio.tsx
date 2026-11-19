import React, { useState } from 'react';
import { Copy, Check, Sparkles, Eye, Code2, RotateCcw } from 'lucide-react';
import { AfficheSection, CustomTeam, VipTier } from '../data/scpslDefaults';

interface AfficheWowStudioProps {
  serverNameRich: string;
  setServerNameRich: (val: string) => void;
  pastebinId: string;
  setPastebinId: (val: string) => void;
  discordInvite: string;
  setDiscordInvite: (val: string) => void;
  sections: AfficheSection[];
  setSections: React.Dispatch<React.SetStateAction<AfficheSection[]>>;
  customTeams: CustomTeam[];
  vipTiers: VipTier[];
  onPushConsoleLog: (msg: string) => void;
}

const PRESET_THEMES = [
  {
    id: 'crimson-site19',
    name: 'Fondation Site-19 (Rouge & Or)',
    serverTitle: '<color=#DC143C><b>[FR/QC] SITE-19 COMMAND</b></color> <color=#FAFF86>│ TEAMS CUSTOMS │ EVENTS │ VIP</color>',
    sections: [
      {
        id: 'sec-1',
        title: '━━━ ★ BIENVENUE SUR SITE-19 COMMAND ★ ━━━',
        titleColor: '#DC143C',
        accentColor: '#FAFF86',
        content: 'Serveur SCP:SL Semi-RP & Fun propulsé sous EXILED 9.x.\nStaff actif 24/7 · Détection anti-triche · Événements quotidiens à 21h00.'
      },
      {
        id: 'sec-2',
        title: '━━━ ⚔ ÉQUIPES & FACTIONS EXCLUSIVES ━━━',
        titleColor: '#00B7EB',
        accentColor: '#50C878',
        content: '• La Main du Serpent (Alliée aux SCPs)\n• Unité Fédérale U.I.U. (Renfort MTF)\n• Coalition Mondiale Occulte G.O.C. (Armement lourd 3-X)\n• FIM Alpha-1 "Bras Droit Rouge" (Garde du Conseil O5)'
      },
      {
        id: 'sec-3',
        title: '━━━ 📜 RÈGLEMENT ESSENTIEL DU COMPLEXE ━━━',
        titleColor: '#FF9966',
        accentColor: '#FFFFFF',
        content: '1. Respect obligatoire envers tous les joueurs et le Staff.\n2. Soundboard autorisé uniquement en Intercom (sans saturation).\n3. Teamkill et alliances interdites (sauf reddition Classe-D menotté).\n4. Camp abusif en Surface ou blocage de manche sanctionné.'
      }
    ]
  },
  {
    id: 'cyber-exiled',
    name: 'Néon Tactique (Cyan & Magenta)',
    serverTitle: '<color=#00FFFF><b>⚡ [FR] OMEGA LABS SCP:SL</b></color> <color=#FF0090><b>[MAIN DU SERPENT / GOC]</b></color> <color=#98FB98>60 TPS</color>',
    sections: [
      {
        id: 'sec-1',
        title: '╔═══ ⚡ OMEGA LABS — SERVEUR HAUTE PERFORMANCE ═══╗',
        titleColor: '#00FFFF',
        accentColor: '#FF0090',
        content: 'Infrastructure dédiée Pterodactyl Ryzen 9 · 0 Rollback · Plugins sur-mesure.\nSystème de niveaux XP, Tags VIP personnalisés et Mode Event automatisé.'
      },
      {
        id: 'sec-2',
        title: '╠═══ 💎 AVANTAGES VIP & NITRO BOOSTER ═══╣',
        titleColor: '#FF1493',
        accentColor: '#FAFF86',
        content: 'Boostez notre serveur Discord pour débloquer instantanément votre tag [♦ NITRO BOOSTER] en jeu via notre Bot Discord relié au panel !'
      },
      {
        id: 'sec-3',
        title: '╚═══ 🛡️ MODÉRATION & TICKETS DISCORD ═══╝',
        titleColor: '#4DFFB8',
        accentColor: '#FFFFFF',
        content: 'Un problème en jeu ? Ouvrez un ticket sur Discord ou utilisez la commande !report dans le chat console (~).'
      }
    ]
  }
];

export const AfficheWowStudio: React.FC<AfficheWowStudioProps> = ({
  serverNameRich,
  setServerNameRich,
  pastebinId,
  setPastebinId,
  discordInvite,
  setDiscordInvite,
  sections,
  setSections,
  customTeams,
  vipTiers,
  onPushConsoleLog
}) => {
  const [copiedType, setCopiedType] = useState<'pastebin' | 'gameplay' | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [gradientWord, setGradientWord] = useState('SITE-19 FR');
  const [gradStart, setGradStart] = useState('#DC143C');
  const [gradEnd, setGradEnd] = useState('#FAFF86');

  // Generates character-by-character Unity Rich Text gradient
  const generateUnityGradient = (text: string, hex1: string, hex2: string) => {
    const clean = text.trim();
    if (!clean) return '';
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);

    return clean
      .split('')
      .map((char, idx) => {
        if (char === ' ') return ' ';
        const ratio = clean.length > 1 ? idx / (clean.length - 1) : 0;
        const r = Math.round(r1 + (r2 - r1) * ratio)
          .toString(16)
          .padStart(2, '0');
        const g = Math.round(g1 + (g2 - g1) * ratio)
          .toString(16)
          .padStart(2, '0');
        const b = Math.round(b1 + (b2 - b1) * ratio)
          .toString(16)
          .padStart(2, '0');
        return `<color=#${r}${g}${b}>${char}</color>`;
      })
      .join('');
  };

  const applyGradientToServerName = () => {
    const gradCode = generateUnityGradient(gradientWord, gradStart, gradEnd);
    setServerNameRich(`<b>${gradCode}</b> <color=#00FFFF>│ CUSTOM TEAMS │</color> <color=#FAFF86>EVENTS 21H</color>`);
    onPushConsoleLog(`[AFFICHE WOW] Nouveau dégradé Unity Rich Text appliqué au nom du serveur.`);
  };

  const generateFullPastebinCode = () => {
    const teamLines = customTeams
      .map((t) => `<color=#50C878>▸ <b>${t.name}</b></color> (${t.hp} HP · Spawn ${t.spawnChance}%) : ${t.subtitle}`)
      .join('\n');

    const vipLines = vipTiers
      .map((v) => `<color=#FAFF86>★ <b>${v.badgeText}</b></color> (${v.priceLabel}) — ${v.perks[0] || 'Avantages VIP'}`)
      .join('\n');

    const customSectionBlocks = sections
      .map(
        (s) =>
          `<size=28><color=${s.titleColor}><b>${s.title}</b></color></size>\n<size=20><color=${s.accentColor}>${s.content}</color></size>`
      )
      .join('\n\n');

    return `<align=center>
<size=38><b>${serverNameRich}</b></size>
<size=22><color=#A0A0A0>Serveur Francophone Officiel · Panel Pterodactyl & Bot Discord</color></size>

${customSectionBlocks}

<size=26><color=#00B7EB><b>━━━ 🛡️ NOS ÉQUIPES CUSTOMS ACTIVES ━━━</b></color></size>
<size=19>${teamLines}</size>

<size=26><color=#FAFF86><b>━━━ 👑 GRADES & TAGS VIP DISPONIBLES ━━━</b></color></size>
<size=19>${vipLines}</size>

<size=26><color=#5865F2><b>━━━ 💬 REJOIGNEZ NOTRE DISCORD ━━━</b></color></size>
<size=22><color=#FFFFFF>Lien d'invitation : <b><color=#00FFFF>${discordInvite}</color></b></color></size>
</align>`;
  };

  const handleCopy = (type: 'pastebin' | 'gameplay') => {
    const text =
      type === 'pastebin'
        ? generateFullPastebinCode()
        : `server_name: ${serverNameRich}\npastebin_info_id: ${pastebinId}\nserverinfo_pastebin_id: ${pastebinId}`;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    onPushConsoleLog(
      type === 'pastebin'
        ? `[PASTEBIN] Code Unity Rich Text de l'affiche copié dans le presse-papiers.`
        : `[CONFIG] Paramètres server_name & pastebin_info_id (${pastebinId}) copiés.`
    );
    setTimeout(() => setCopiedType(null), 2200);
  };

  const handleUpdateSection = (id: string, field: keyof AfficheSection, value: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Helper to strip Unity tags for clean fallback or parse basic color tags for visual preview
  const renderRichTitlePreview = (raw: string) => {
    const cleaned = raw.replace(/<\/?b>/g, '').replace(/<\/?i>/g, '');
    const regex = /<color=(#[0-9a-fA-F]{6}|[a-zA-Z]+)>(.*?)<\/color>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cleaned.slice(lastIndex, match.index));
      }
      parts.push(
        <span key={match.index} style={{ color: match[1] }} className="font-bold">
          {match[2]}
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < cleaned.length) {
      parts.push(cleaned.slice(lastIndex));
    }
    return parts.length > 0 ? parts : raw;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Generated Facility Image */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono text-amber-400">
                STUDIO PASTEBIN & UNITY RICH TEXT · CONFIG_GAMEPLAY.TXT
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Créateur d’Affiche Serveur "WOW" & Bannière In-Game
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                Concevez l’affiche Pastebin de votre serveur SCP:SL avec dégradés Unity Rich Text,
                synchronisation automatique de vos équipes personnalisées et aperçu fidèle de la liste des serveurs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {PRESET_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setServerNameRich(theme.serverTitle);
                    setSections(theme.sections);
                    onPushConsoleLog(`[AFFICHE WOW] Thème "${theme.name}" chargé.`);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Charger le thème : {theme.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[180px] bg-slate-950 overflow-hidden">
            <img
              src="/src/assets/images/scpsl_facility_banner_1795030579763.jpg"
              alt="Couloir de confinement haute sécurité Site-19"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent" />
            <div className="absolute bottom-3 right-4 text-right">
              <div className="text-xs font-mono text-slate-300">APERÇU CLIENT SCP:SL 14.0</div>
              <div className="text-xs text-amber-400 font-mono">Pastebin ID : {pastebinId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Editor Left, Live SCP:SL Client Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Rich Text Controls & Section Editor */}
        <div className="lg:col-span-6 space-y-5">
          {/* Server Title & Gradient Generator */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
            <h3 className="text-base font-semibold text-white">
              01. Nom du Serveur & Générateur de Dégradé Unity
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Code server_name (Unity Rich Text)
              </label>
              <input
                type="text"
                value={serverNameRich}
                onChange={(e) => setServerNameRich(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Gradient Generator Box */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="text-xs font-medium text-slate-300">
                Générateur automatique de texte dégradé lettre par lettre
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={gradientWord}
                    onChange={(e) => setGradientWord(e.target.value)}
                    placeholder="Nom du serveur"
                    className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-800 text-white"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <input
                    type="color"
                    value={gradStart}
                    onChange={(e) => setGradStart(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    title="Couleur de départ"
                  />
                  <span className="text-xs font-mono text-slate-400">→</span>
                  <input
                    type="color"
                    value={gradEnd}
                    onChange={(e) => setGradEnd(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                    title="Couleur de fin"
                  />
                </div>
                <div className="sm:col-span-5 flex justify-end">
                  <button
                    onClick={applyGradientToServerName}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Insérer le dégradé
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ID Pastebin (config_gameplay.txt)
                </label>
                <input
                  type="text"
                  value={pastebinId}
                  onChange={(e) => setPastebinId(e.target.value)}
                  placeholder="Ex: K9xLm2pQ"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lien Discord Officiel
                </label>
                <input
                  type="text"
                  value={discordInvite}
                  onChange={(e) => setDiscordInvite(e.target.value)}
                  placeholder="discord.gg/site19fr"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-cyan-300"
                />
              </div>
            </div>
          </div>

          {/* Sections Editor */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
            <h3 className="text-base font-semibold text-white">
              02. Blocs de l’Affiche Pastebin
            </h3>

            <div className="space-y-4">
              {sections.map((sec, index) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      BLOC 0{index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400">
                        Titre
                        <input
                          type="color"
                          value={sec.titleColor}
                          onChange={(e) => handleUpdateSection(sec.id, 'titleColor', e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400">
                        Texte
                        <input
                          type="color"
                          value={sec.accentColor}
                          onChange={(e) => handleUpdateSection(sec.id, 'accentColor', e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                        />
                      </label>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => handleUpdateSection(sec.id, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 border border-slate-800 text-white"
                  />

                  <textarea
                    rows={3}
                    value={sec.content}
                    onChange={(e) => handleUpdateSection(sec.id, 'content', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live In-Game SCP:SL Server Browser & Pastebin Window Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Aperçu Direct Client SCP:SL
                </h3>
                <p className="text-xs text-slate-400">
                  Rendu simultané de la barre de liste des serveurs et de la fenêtre d’information Pastebin
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('visual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    viewMode === 'visual'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Rendu En Jeu
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    viewMode === 'code'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Code Pastebin Brut
                </button>
              </div>
            </div>

            {/* Simulated SCP:SL Server Browser Row */}
            <div className="p-3.5 rounded-lg bg-[#0d111a] border border-slate-800 flex items-center justify-between gap-4">
              <div className="text-sm leading-snug break-words">
                {renderRichTitlePreview(serverNameRich)}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono tabular-nums text-emerald-400">28/32</span>
                <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  INFO
                </span>
              </div>
            </div>

            {viewMode === 'visual' ? (
              /* Simulated SCP:SL Pastebin Modal Popup */
              <div className="p-6 rounded-xl bg-[#070a10] border border-slate-800 text-center space-y-5 max-h-[560px] overflow-y-auto">
                <div className="space-y-1">
                  <div className="text-lg font-bold tracking-wide">
                    {renderRichTitlePreview(serverNameRich)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Serveur Francophone Officiel · Panel Pterodactyl & Bot Discord
                  </div>
                </div>

                {sections.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    <div
                      className="text-sm font-bold tracking-wide"
                      style={{ color: s.titleColor }}
                    >
                      {s.title}
                    </div>
                    <div
                      className="text-xs whitespace-pre-line leading-relaxed max-w-xl mx-auto"
                      style={{ color: s.accentColor }}
                    >
                      {s.content}
                    </div>
                  </div>
                ))}

                {/* Dynamic Custom Teams Preview inside Affiche */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-sm font-bold text-cyan-400">
                    ━━━ 🛡️ NOS ÉQUIPES CUSTOMS ACTIVES ({customTeams.length}) ━━━
                  </div>
                  <div className="space-y-1 text-xs text-slate-300 max-w-lg mx-auto text-left">
                    {customTeams.map((team) => (
                      <div key={team.id} className="truncate">
                        <span className="text-emerald-400 font-semibold">▸ {team.name}</span>{' '}
                        <span className="text-slate-400 font-mono">
                          ({team.hp} HP · {team.spawnChance}%)
                        </span>{' '}
                        — {team.subtitle}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic VIP Tags Preview inside Affiche */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-sm font-bold text-amber-300">
                    ━━━ 👑 GRADES & TAGS VIP DISPONIBLES ━━━
                  </div>
                  <div className="space-y-1 text-xs text-slate-300 max-w-lg mx-auto">
                    {vipTiers.map((vip) => (
                      <div key={vip.id}>
                        <span className="text-amber-400 font-bold">{vip.badgeText}</span> ·{' '}
                        <span className="font-mono text-slate-400">{vip.priceLabel}</span> —{' '}
                        {vip.perks[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Discord Invite Footer */}
                <div className="pt-3 border-t border-slate-800/80 space-y-1">
                  <div className="text-xs font-bold text-indigo-400">
                    ━━━ 💬 REJOIGNEZ NOTRE DISCORD ━━━
                  </div>
                  <div className="text-sm font-mono font-bold text-cyan-300">
                    {discordInvite}
                  </div>
                </div>
              </div>
            ) : (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[560px] whitespace-pre-wrap">
                {generateFullPastebinCode()}
              </pre>
            )}

            {/* Export / Copy Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleCopy('pastebin')}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
              >
                {copiedType === 'pastebin' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Code Pastebin Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier le Code Pastebin
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopy('gameplay')}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
              >
                {copiedType === 'gameplay' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    config_gameplay.txt Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier Lignes config_gameplay.txt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
