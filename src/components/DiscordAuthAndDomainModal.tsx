import React, { useState } from 'react';
import {
  ShieldCheck,
  Globe,
  KeyRound,
  Copy,
  Check,
  X,
  Lock,
  LogOut,
  ExternalLink
} from 'lucide-react';

export interface AuthenticatedDiscordUser {
  id: string;
  username: string;
  globalName: string;
  avatarUrl: string;
  roleLabel: string;
  authenticatedVia: 'discord_oauth' | 'staff_token';
  loggedInAt: string;
}

interface DiscordAuthAndDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthenticatedDiscordUser | null;
  onUserAuthenticated: (user: AuthenticatedDiscordUser) => void;
  onLogout: () => void;
  requireLoginGate: boolean;
  setRequireLoginGate: (val: boolean) => void;
  serverPort: string;
}

export const DiscordAuthAndDomainModal: React.FC<DiscordAuthAndDomainModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserAuthenticated,
  onLogout,
  requireLoginGate,
  setRequireLoginGate,
  serverPort
}) => {
  const [activeSection, setActiveSection] = useState<'discord-oauth' | 'domains-dns'>('discord-oauth');
  const [discordClientId, setDiscordClientId] = useState('');
  const [discordClientSecret, setDiscordClientSecret] = useState('');
  const [oauthStatus, setOauthStatus] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  if (!isOpen) return null;

  const devCallbackUrl = 'https://ais-dev-2qionetbryeiz3phsp3w7j-687447667343.us-east1.run.app/auth/callback';
  const prodCallbackUrl = 'https://ais-pre-2qionetbryeiz3phsp3w7j-687447667343.us-east1.run.app/auth/callback';
  const customDomainCallbackUrl = 'https://scpsl.lumishost.com/auth/callback';

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUri(label);
    setTimeout(() => setCopiedUri(null), 2000);
  };

  // Popup-based OAuth2 flow directly to Discord's authorization endpoint
  const handleStartDiscordOAuthPopup = async () => {
    setOauthStatus(null);
    try {
      if (discordClientId.trim() && discordClientSecret.trim()) {
        await fetch('/api/auth/discord/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: discordClientId.trim(),
            clientSecret: discordClientSecret.trim()
          })
        });
      }

      const redirectUri = `${window.location.origin}/auth/callback`;
      const query = new URLSearchParams({
        redirectUri,
        ...(discordClientId.trim() ? { clientId: discordClientId.trim() } : {})
      });

      const resp = await fetch(`/api/auth/discord/url?${query.toString()}`);
      const data = await resp.json();

      if (!data.configured || !data.url) {
        setOauthStatus(
          'Pour ouvrir la fenêtre officielle Discord OAuth2, renseignez votre DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET ci-dessous (ou utilisez la Connexion Staff Instantanée).'
        );
        return;
      }

      // Open Discord's OAuth2 provider URL directly in popup
      const popup = window.open(
        data.url,
        'discord_oauth_popup',
        'width=560,height=720'
      );

      if (!popup) {
        setOauthStatus('Veuillez autoriser les popups dans votre navigateur pour vous connecter avec Discord.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur OAuth';
      setOauthStatus(`Erreur lors de l'initialisation OAuth Discord : ${msg}`);
    }
  };

  const handleInstantStaffSession = async () => {
    const resp = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'evolumis',
        discordId: '985589556655054858',
        roleLabel: 'Fondateur O5 · LumisHost (scpsl.lumishost.com)'
      })
    });
    const data = await resp.json();
    if (data.user) {
      onUserAuthenticated(data.user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-mono text-indigo-400">
              AUTHENTIFICATION DISCORD OAUTH2 &amp; DOMAINES LUMISHOST
            </div>
            <h3 className="text-lg font-bold text-white">
              Connexion Discord au Panel (`scpsl.lumishost.com`) &amp; DNS Jeu (`play.lumishost.com`)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSection('discord-oauth')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSection === 'discord-oauth'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              1. Connexion Discord OAuth2 (Panel Web)
            </button>
            <button
              onClick={() => setActiveSection('domains-dns')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeSection === 'domains-dns'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              2. Domaines scpsl.lumishost.com &amp; play.lumishost.com
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={requireLoginGate}
              onChange={(e) => setRequireLoginGate(e.target.checked)}
              className="rounded border-slate-700 text-indigo-500"
            />
            <span>Exiger l’écran de connexion Discord à l’ouverture du panel</span>
          </label>
        </div>

        {activeSection === 'discord-oauth' ? (
          <div className="space-y-5">
            {/* Active user card */}
            {currentUser && (
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono text-indigo-300">
                    SESSION DISCORD ACTIVE SUR SCPSL.LUMISHOST.COM
                  </div>
                  <div className="text-base font-bold text-white">
                    {currentUser.globalName} (@{currentUser.username})
                  </div>
                  <div className="text-xs text-slate-300">
                    Grade : {currentUser.roleLabel} · Connecté à {currentUser.loggedInAt}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Se déconnecter
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: OAuth2 Credentials & Popup Launch */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Identifiants Application Discord OAuth2
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      DISCORD_CLIENT_ID (Portail Développeur Discord)
                    </label>
                    <input
                      type="text"
                      value={discordClientId}
                      onChange={(e) => setDiscordClientId(e.target.value)}
                      placeholder="Ex: 1294857192837465000"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      DISCORD_CLIENT_SECRET
                    </label>
                    <input
                      type="password"
                      value={discordClientSecret}
                      onChange={(e) => setDiscordClientSecret(e.target.value)}
                      placeholder="Votre Client Secret OAuth2 Discord..."
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-amber-300"
                    />
                  </div>
                </div>

                {oauthStatus && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    {oauthStatus}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleStartDiscordOAuthPopup}
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Se Connecter avec Discord (OAuth2 Popup)
                  </button>

                  <button
                    onClick={handleInstantStaffSession}
                    className="w-full px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Connexion Staff Rapide (evolumis · Fondateur O5)
                  </button>
                </div>
              </div>

              {/* Right: Exact Redirect URIs to add in Discord Developer Portal */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <h4 className="text-sm font-semibold text-white">
                  URLs de Redirection OAuth2 (Redirects Discord)
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Dans <b>discord.com/developers/applications → OAuth2 → Redirects</b>, ajoutez ces URLs de callback :
                </p>

                {[
                  { label: 'Domaine Officiel LumisHost', url: customDomainCallbackUrl },
                  { label: 'URL Développement AI Studio', url: devCallbackUrl },
                  { label: 'URL Partagée / Déployée', url: prodCallbackUrl }
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{item.label}</span>
                      <button
                        onClick={() => handleCopyText(item.url, item.label)}
                        className="text-indigo-300 hover:text-white flex items-center gap-1"
                      >
                        {copiedUri === item.label ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copié
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copier
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-indigo-300 break-all">{item.url}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* DNS & DOMAINS CONFIGURATION: scpsl.lumishost.com & play.lumishost.com */
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-xs font-mono text-amber-400">
                ENREGISTREMENTS DNS POUR VOTRE DOMAINE LUMISHOST.COM (CLOUDFLARE / OVH)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Votre serveur SCP:SL tourne actuellement sur <b>192.99.42.203:{serverPort}</b>. Ajoutez ces 3 entrées dans la zone DNS de <b>lumishost.com</b> :
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Nom (Sous-domaine)</th>
                      <th className="py-2 px-3">Valeur / Cible</th>
                      <th className="py-2 px-3">Proxy Cloudflare</th>
                      <th className="py-2 px-3">Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 text-amber-400 font-bold">A</td>
                      <td className="py-2.5 px-3 text-white">play</td>
                      <td className="py-2.5 px-3 text-emerald-400">192.99.42.203</td>
                      <td className="py-2.5 px-3 text-slate-300">DNS Only (Nuage Gris)</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Connexion en jeu : <code className="text-amber-300">connect play.lumishost.com:{serverPort}</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">SRV</td>
                      <td className="py-2.5 px-3 text-white">_scpsl._udp.play</td>
                      <td className="py-2.5 px-3 text-emerald-400">0 5 {serverPort} play.lumishost.com</td>
                      <td className="py-2.5 px-3 text-slate-300">DNS Only</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Redirection port UDP {serverPort} sur <code className="text-cyan-300">play.lumishost.com</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-indigo-400 font-bold">A / CNAME</td>
                      <td className="py-2.5 px-3 text-white">scpsl</td>
                      <td className="py-2.5 px-3 text-emerald-400">192.99.42.203 (Port 3000 via Nginx)</td>
                      <td className="py-2.5 px-3 text-slate-300">Proxied (Nuage Orange SSL)</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Accès à ce Panel Web : <code className="text-indigo-300">https://scpsl.lumishost.com</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-semibold text-white">
                Correction automatique de l’avertissement Public Server List (`contact_email`)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Votre console indiquait : <code className="text-amber-300">please set up your email in configuration file ("contact_email" value)</code>. J’ai ajouté automatiquement <code className="text-emerald-400">contact_email: lloydgarmadon2231@gmail.com</code> dans le générateur <code className="text-white">config_gameplay.txt</code> pour que votre serveur apparaisse dans la liste publique SCP:SL.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
