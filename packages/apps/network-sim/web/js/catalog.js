/* Network Sim — device catalogue: kinds, defaults, icons, services. */
(() => {
  'use strict';

  const NS = window.NS;

  // 24x24 stroke icons (currentColor).
  const ICONS = {
    pc: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19l-2-4h-15z"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h5M12 17.5h5"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    dns: '<path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h6M18 8h2v11a2 2 0 0 1-2 2"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    router: '<rect x="3" y="12" width="18" height="7" rx="2"/><path d="M7 15.5h.01M11 15.5h.01M8 9a6 6 0 0 1 8 0M5.5 6.5a10 10 0 0 1 13 0"/>',
    box: '<rect x="3" y="11" width="18" height="8" rx="2.5"/><path d="M7 15h.01M10.5 15h.01M12 11V6M9 4.5a4 4 0 0 1 6 0"/>',
    switch: '<rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01"/>',
    ap: '<circle cx="12" cy="17" r="1.5"/><path d="M8.5 13.5a5 5 0 0 1 7 0M5.5 10.5a9 9 0 0 1 13 0M3 7.5a12.5 12.5 0 0 1 18 0"/>',
    firewall: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8 10h8M8 14h8M12 10v4"/>',
    internet: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.4A4 4 0 0 1 17.5 18z"/>',
    iot: '<circle cx="12" cy="11" r="4"/><path d="M12 15v6M8 21h8M5 6l2 2M19 6l-2 2"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    attacker: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6M9 8h6"/>',
    loadbalancer: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v10M11 7l-5 10M13 7l5 10"/>'
  };

  const SERVICES = {
    22: { name: 'ssh', label: 'SSH (administration à distance)', proto: 'tcp' },
    25: { name: 'smtp', label: 'SMTP (envoi de mails)', proto: 'tcp' },
    53: { name: 'dns', label: 'DNS (annuaire des noms)', proto: 'udp' },
    67: { name: 'dhcp', label: 'DHCP (distribution d\'adresses)', proto: 'udp' },
    80: { name: 'http', label: 'HTTP (site web non chiffré)', proto: 'tcp' },
    443: { name: 'https', label: 'HTTPS (site web chiffré)', proto: 'tcp' },
    445: { name: 'smb', label: 'SMB (partage de fichiers)', proto: 'tcp' },
    3306: { name: 'mysql', label: 'MySQL (base de données)', proto: 'tcp' },
    3389: { name: 'rdp', label: 'RDP (bureau à distance)', proto: 'tcp' },
    9100: { name: 'print', label: 'Impression réseau', proto: 'tcp' }
  };

  // kind: host = end device, router = forwards between networks, l2 = switch-like.
  const TYPES = {
    pc:           { label: 'Ordinateur', group: 'Postes', kind: 'host', color: '#38bdf8', ifaces: 1, services: [] },
    laptop:       { label: 'Portable', group: 'Postes', kind: 'host', color: '#38bdf8', ifaces: 1, services: [], wireless: true },
    phone:        { label: 'Smartphone', group: 'Postes', kind: 'host', color: '#f472b6', ifaces: 1, services: [], wireless: true },
    iot:          { label: 'Caméra IoT', group: 'Postes', kind: 'host', color: '#a3e635', ifaces: 1, services: [80] },
    printer:      { label: 'Imprimante', group: 'Postes', kind: 'host', color: '#94a3b8', ifaces: 1, services: [9100] },
    server:       { label: 'Serveur', group: 'Serveurs', kind: 'host', color: '#34d399', ifaces: 1, services: [22] },
    web:          { label: 'Serveur web', group: 'Serveurs', kind: 'host', color: '#34d399', ifaces: 1, services: [80, 443] },
    dns:          { label: 'Serveur DNS', group: 'Serveurs', kind: 'host', color: '#fb923c', ifaces: 1, services: [53] },
    database:     { label: 'Base de données', group: 'Serveurs', kind: 'host', color: '#818cf8', ifaces: 1, services: [3306] },
    loadbalancer: { label: 'Répartiteur', group: 'Serveurs', kind: 'host', color: '#c084fc', ifaces: 1, services: [80] },
    switch:       { label: 'Switch', group: 'Réseau', kind: 'l2', color: '#22d3ee', ifaces: 0 },
    ap:           { label: 'Borne Wi-Fi', group: 'Réseau', kind: 'l2', color: '#22d3ee', ifaces: 0 },
    router:       { label: 'Routeur', group: 'Réseau', kind: 'router', color: '#facc15', ifaces: 0 },
    box:          { label: 'Box Internet', group: 'Réseau', kind: 'router', color: '#facc15', ifaces: 0 },
    firewall:     { label: 'Pare-feu', group: 'Réseau', kind: 'router', color: '#f87171', ifaces: 0 },
    internet:     { label: 'Internet (FAI)', group: 'Réseau', kind: 'router', color: '#94a3b8', ifaces: 0 },
    attacker:     { label: 'Attaquant', group: 'Sécurité', kind: 'host', color: '#ef4444', ifaces: 1, services: [] }
  };

  const GROUPS = ['Postes', 'Serveurs', 'Réseau', 'Sécurité'];

  // What each device is for, in plain words (shown in the inspector).
  const ROLES = {
    pc: 'Un poste de travail. Il envoie et reçoit des données, mais ne fait jamais passer le trafic des autres.',
    laptop: 'Un ordinateur portable, souvent relié en Wi-Fi.',
    phone: 'Un smartphone relié en Wi-Fi.',
    iot: 'Un objet connecté (caméra). Souvent oublié dans les mises à jour : une cible facile.',
    printer: 'Une imprimante réseau.',
    server: 'Un serveur : une machine qui rend des services aux autres (fichiers, administration…).',
    web: 'Un serveur web : il répond aux navigateurs avec des pages.',
    dns: 'L\'annuaire du réseau : il traduit un nom (site.lan) en adresse IP.',
    database: 'Une base de données : elle stocke les informations des applications.',
    loadbalancer: 'Il répartit les visiteurs entre plusieurs serveurs web identiques.',
    switch: 'Le switch relie les appareils d\'un même réseau local. Il apprend où se trouve chaque adresse MAC.',
    ap: 'Une borne Wi-Fi : un switch sans fil.',
    router: 'Le routeur relie des réseaux différents et choisit la route de chaque paquet.',
    box: 'La box relie la maison à Internet. Elle distribue les adresses (DHCP) et partage une seule adresse publique (NAT).',
    firewall: 'Un routeur qui filtre : il laisse passer ou bloque le trafic selon des règles.',
    internet: 'Le réseau du fournisseur d\'accès : il relie les sites entre eux.',
    attacker: 'Une machine malveillante, pour voir les attaques et apprendre à s\'en protéger.'
  };

  function icon(type, size) {
    const s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[type] || ICONS.server) + '</svg>';
  }

  NS.TYPES = TYPES;
  NS.GROUPS = GROUPS;
  NS.ROLES = ROLES;
  NS.SERVICES = SERVICES;
  NS.ICONS = ICONS;
  NS.icon = icon;
})();
