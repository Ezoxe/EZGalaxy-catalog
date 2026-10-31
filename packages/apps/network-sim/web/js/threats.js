/* Network Sim — threats & defences, modelled at a conceptual level.
   Each threat is a labelled scenario used to teach how a network is exposed
   and which control stops it. No operational exploit detail: the simulator
   only decides, from the topology and the enabled defences, whether the
   threat succeeds, and produces a short explanation for the learner. */
(() => {
  'use strict';

  const NS = window.NS;
  const { engine } = NS;

  // Defences the learner can enable on the network as a whole.
  const DEFENCES = {
    firewall:     { label: 'Pare-feu', icon: '🧱', desc: 'Filtre le trafic entrant selon des règles (adresses, ports).' },
    ids:          { label: 'IDS / IPS', icon: '🔍', desc: 'Repère et bloque les schémas de trafic anormaux.' },
    tls:          { label: 'Chiffrement (TLS)', icon: '🔒', desc: 'Rend les échanges illisibles pour un tiers qui les capterait.' },
    vpn:          { label: 'VPN', icon: '🔐', desc: 'Tunnel chiffré pour le télétravail et les sites distants.' },
    ratelimit:    { label: 'Limitation de débit', icon: '⏱️', desc: 'Plafonne le nombre de requêtes par source.' },
    mfa:          { label: 'Double authentification', icon: '📱', desc: 'Exige un second facteur en plus du mot de passe.' },
    patch:        { label: 'Mises à jour', icon: '📦', desc: 'Corrige les failles connues des logiciels et objets connectés.' },
    segmentation: { label: 'Cloisonnement', icon: '🔀', desc: 'Sépare le réseau en zones (VLAN, DMZ) pour limiter la casse.' },
    backup:       { label: 'Sauvegardes', icon: '💾', desc: 'Copies hors ligne pour tout restaurer après incident.' },
    training:     { label: 'Sensibilisation', icon: '🎓', desc: 'Des utilisateurs formés repèrent les mails et appels piégés.' }
  };

  // Threats, each mitigated by one or more defences. `target` lists device
  // types a threat concerns, so the sim can tell if the network is exposed.
  const THREATS = {
    ddos: {
      label: 'Déni de service (DDoS)', icon: '💥', target: ['web', 'server', 'loadbalancer'],
      mitigatedBy: ['ratelimit', 'firewall'],
      what: 'Une foule de requêtes sature un service jusqu\'à le rendre indisponible.',
      defence: 'La limitation de débit et le pare-feu absorbent ou écartent le flot avant le serveur.'
    },
    intercept: {
      label: 'Interception du trafic', icon: '🕵️', target: ['web', 'server', 'pc'],
      mitigatedBy: ['tls', 'vpn'],
      what: 'Un tiers placé sur le chemin lit les échanges non chiffrés (mots de passe, mails).',
      defence: 'Le chiffrement TLS et le VPN rendent les données captées illisibles.'
    },
    scan: {
      label: 'Reconnaissance (scan)', icon: '🔭', target: ['server', 'web', 'router'],
      mitigatedBy: ['firewall', 'ids'],
      what: 'L\'attaquant liste les services ouverts pour préparer la suite.',
      defence: 'Le pare-feu ferme les ports inutiles ; l\'IDS repère le balayage.'
    },
    phishing: {
      label: 'Hameçonnage (phishing)', icon: '🎣', target: ['pc', 'laptop', 'phone'],
      mitigatedBy: ['training', 'mfa'],
      what: 'Un message piégé pousse un utilisateur à livrer ses identifiants.',
      defence: 'Des utilisateurs sensibilisés ne mordent pas ; la double authentification limite le vol.'
    },
    ransomware: {
      label: 'Rançongiciel', icon: '🔐', target: ['pc', 'server', 'database'],
      mitigatedBy: ['backup', 'segmentation', 'patch'],
      what: 'Un logiciel chiffre les fichiers et se propage de machine en machine.',
      defence: 'Le cloisonnement freine la propagation ; les sauvegardes permettent de tout restaurer.'
    },
    iot: {
      label: 'Objet connecté vulnérable', icon: '📟', target: ['iot', 'printer'],
      mitigatedBy: ['patch', 'segmentation'],
      what: 'Un objet non mis à jour sert de porte d\'entrée sur le réseau.',
      defence: 'Les mises à jour comblent la faille ; le cloisonnement isole l\'objet du reste.'
    }
  };

  // Is there at least one potential target of this threat on the network?
  function hasTarget(net, threat) {
    return net.devices.some(d => threat.target.includes(d.type));
  }

  // Evaluate a threat against the topology + enabled defences.
  // Returns { applicable, stopped, by:[defenceIds], weak:[reasons], explain }.
  function evaluate(net, threatId, defences) {
    const threat = THREATS[threatId];
    if (!threat) return { applicable: false };
    const applicable = hasTarget(net, threat);
    const active = threat.mitigatedBy.filter(d => defences[d]);
    const stopped = active.length > 0;

    // Topology-aware nuances (teaching points).
    const weak = [];
    if (threatId === 'intercept' && defences.tls) {
      const plainOnly = net.devices.some(d =>
        threat.target.includes(d.type) && d.services.includes(80) && !d.services.includes(443));
      if (plainOnly) weak.push('Un serveur n\'écoute qu\'en HTTP (port 80) : le TLS ne le protège pas.');
    }
    if (threatId === 'ransomware' && defences.segmentation) {
      const flat = engine.computeSegments(net).length <= 1;
      if (flat) weak.push('Le réseau est à plat : sans vraie séparation, le cloisonnement n\'aide pas.');
    }
    if (threatId === 'ddos' && defences.firewall) {
      const hasFw = net.devices.some(d => d.type === 'firewall');
      if (!hasFw) weak.push('Aucun pare-feu physique n\'est placé devant le service.');
    }

    const explain = !applicable
      ? 'Aucune cible de ce type sur le réseau.'
      : stopped && weak.length === 0
        ? threat.defence
        : stopped
          ? threat.defence + ' Mais : ' + weak.join(' ')
          : 'Rien ne s\'y oppose : ' + threat.what + ' Parade : ' + defenceNames(threat.mitigatedBy) + '.';

    return { applicable, stopped: stopped && weak.length === 0, by: active, weak, threat, explain };
  }

  function defenceNames(ids) {
    return ids.map(d => DEFENCES[d] ? DEFENCES[d].label : d).join(', ');
  }

  // Pick a plausible attacker and victim pair for the animation layer.
  function attackVector(net, threat) {
    const attacker = net.devices.find(d => d.type === 'attacker') || null;
    const victim = net.devices.find(d => threat.target.includes(d.type)) || null;
    return { attacker, victim };
  }

  NS.threats = { DEFENCES, THREATS, evaluate, hasTarget, attackVector, defenceNames };
})();
