// Scenes of the module « L'informatique en entreprise »
export default [
  {
    lesson: 0, at: 1,
    id: 'ent-it-service',
    title: 'Une journée (presque) normale au service informatique',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'compta', x: 100, y: 70, icon: 'users', label: 'Comptabilité' },
      { id: 'atelier', x: 100, y: 180, icon: 'gear', label: 'Atelier' },
      { id: 'accueil', x: 100, y: 290, icon: 'phone', label: 'Accueil' },
      { id: 'net', x: 330, y: 180, icon: 'switch', label: 'Réseau' },
      { id: 'server', x: 540, y: 110, icon: 'server', label: 'Serveurs' },
      { id: 'it', x: 540, y: 280, icon: 'users', label: 'Service IT', color: 'violet' },
      { id: 'fw', x: 720, y: 110, icon: 'shield', label: 'Pare-feu', color: 'green' },
    ],
    links: [
      { from: 'compta', to: 'net' }, { from: 'atelier', to: 'net' }, { from: 'accueil', to: 'net' },
      { from: 'net', to: 'server' }, { from: 'server', to: 'fw' }, { from: 'it', to: 'server', dashed: true }, { from: 'it', to: 'fw', dashed: true },
    ],
    steps: [
      {
        title: 'Tout le monde dépend de l\'informatique',
        text: {
          college: 'Comptabilité, atelier, accueil : chaque service de l\'entreprise utilise des ordinateurs reliés au même réseau et aux mêmes serveurs.',
          lycee: 'Postes de travail, réseau local, serveurs de fichiers et d\'applications forment le système d\'information (SI) de l\'entreprise.',
          but: 'Le SI regroupe postes, annuaire (Active Directory), serveurs applicatifs, stockage, réseau segmenté en VLAN et accès Internet filtré.',
        },
        actions: [{ do: 'flow', path: ['compta', 'net', 'server'] }, { do: 'flow', path: ['atelier', 'net'] }, { do: 'flow', path: ['accueil', 'net'] }, { do: 'travel', path: ['atelier', 'net', 'server'], count: 2 }],
      },
      {
        title: 'Le service IT veille',
        text: {
          college: 'Le service informatique installe, met à jour et surveille tout ce matériel pour que chacun puisse travailler tranquille.',
          lycee: 'Il gère le parc informatique, les licences, les sauvegardes, la sécurité (pare-feu, antivirus) et les comptes des utilisateurs.',
          but: 'Supervision et alertes, gestion de parc, déploiement des correctifs, politiques de sécurité, sauvegardes et plan de reprise d\'activité.',
        },
        actions: [{ do: 'travel', path: ['it', 'server'], color: 'violet', shape: 'dot', count: 2 }, { do: 'travel', path: ['it', 'fw'], color: 'violet', shape: 'dot', delay: 0.5 }, { do: 'pulse', node: 'it', color: 'violet' }],
      },
      {
        title: 'Panne !',
        text: {
          college: 'Si le serveur tombe en panne, plus personne ne peut travailler : les factures ne partent plus, l\'atelier s\'arrête !',
          lycee: 'La panne d\'un service central bloque tous les métiers qui en dépendent : c\'est un incident majeur.',
          but: 'Point unique de défaillance : chaque heure d\'indisponibilité coûte cher, d\'où la redondance et la haute disponibilité.',
        },
        actions: [{ do: 'shake', node: 'server', color: 'red' }, { do: 'label', node: 'server', text: 'serveur en panne', pos: 'top', offset: 58, color: 'red' }, { do: 'dim', nodes: ['compta', 'atelier', 'accueil'] }],
      },
      {
        title: 'Réparé, et mieux qu\'avant',
        text: {
          college: 'Le service IT intervient, répare et tout repart. Il prévoit aussi un serveur de secours pour que ça n\'arrive plus.',
          lycee: 'Une fois l\'incident résolu, on cherche sa cause pour éviter qu\'il se reproduise.',
          but: 'Rétablissement du service, puis analyse post-incident (cause racine) et actions correctives : redondance, supervision renforcée.',
        },
        actions: [
          { do: 'undim', nodes: ['compta', 'atelier', 'accueil'] },
          { do: 'travel', path: ['it', 'server'], color: 'green', count: 2 }, { do: 'highlight', node: 'server', color: 'green' },
          { do: 'travel', path: ['server', 'net', 'compta'], color: 'amber', delay: 1 },
          { do: 'travel', path: ['server', 'net', 'atelier'], color: 'amber', delay: 1.3 },
        ],
      },
    ],
    quiz: {
      question: 'Pourquoi le service informatique est-il indispensable dans une entreprise ?',
      options: ['Pour décorer les bureaux', 'Parce que presque tous les métiers dépendent de l\'informatique', 'Pour faire le café'],
      correct: 1,
      explanation: 'Sans informatique qui fonctionne, la plupart des services de l\'entreprise s\'arrêtent.',
    },
  },
  {
    lesson: 1, at: 2,
    id: 'ent-ticket-flow',
    title: 'La vie d\'un ticket, de la panne à la solution',
    stage: { w: 800, h: 340 },
    nodes: [
      { id: 'user', x: 80, y: 190, icon: 'user', label: 'Employé' },
      { id: 'l1', x: 300, y: 190, icon: 'users', label: 'Niveau 1', sub: 'helpdesk' },
      { id: 'l2', x: 500, y: 190, icon: 'gear', label: 'Niveau 2', sub: 'technicien' },
      { id: 'l3', x: 700, y: 190, icon: 'code', label: 'Niveau 3', sub: 'expert', color: 'violet' },
      { id: 'prio', kind: 'chip', x: 300, y: 70, text: 'Priorité : moyenne', hidden: true, color: 'amber' },
    ],
    links: [{ from: 'user', to: 'l1' }, { from: 'l1', to: 'l2' }, { from: 'l2', to: 'l3' }],
    steps: [
      {
        title: 'Un problème ? Un ticket !',
        text: {
          college: 'Un employé n\'arrive plus à imprimer. Il crée un ticket : une demande d\'aide enregistrée, avec un numéro.',
          lycee: 'Le ticket décrit le problème (quoi, depuis quand, sur quel poste) et permet de suivre la demande jusqu\'à sa résolution.',
          but: 'Outil ITSM (GLPI, ServiceNow…) : création, catégorisation, horodatage et traçabilité complète de la demande.',
        },
        actions: [{ do: 'travel', path: ['user', 'l1'], shape: 'mail', label: '#4821' }, { do: 'label', node: 'user', text: '« Impossible d\'imprimer »', pos: 'top', offset: 60 }],
      },
      {
        title: 'Le helpdesk trie',
        text: {
          college: 'Le niveau 1 lit le ticket, lui donne une priorité et essaie les solutions simples : redémarrer, vérifier les câbles…',
          lycee: 'Le niveau 1 qualifie la demande, fixe sa priorité selon l\'impact et l\'urgence, et résout les cas simples.',
          but: 'Qualification : impact × urgence = priorité ; utilisation de la base de connaissances ; le compteur du SLA démarre.',
        },
        actions: [{ do: 'show', nodes: ['prio'] }, { do: 'pulse', node: 'l1' }],
      },
      {
        title: 'Escalade au niveau 2',
        text: {
          college: 'Ça ne marche toujours pas ? Le ticket passe au niveau 2, un technicien plus spécialisé.',
          lycee: 'Si le niveau 1 ne trouve pas, il escalade le ticket vers le niveau 2 (réseau, systèmes, impression…).',
          but: 'Escalade fonctionnelle vers l\'équipe compétente, en transmettant le diagnostic déjà fait pour gagner du temps.',
        },
        actions: [{ do: 'travel', path: ['l1', 'l2'], shape: 'mail', label: '#4821' }, { do: 'pulse', node: 'l2' }],
      },
      {
        title: 'Le niveau 3 pour les cas difficiles',
        text: {
          college: 'Pour les problèmes vraiment compliqués, les experts du niveau 3 cherchent la cause profonde.',
          lycee: 'Le niveau 3 (ingénieurs, parfois l\'éditeur du logiciel) traite les problèmes complexes ou qui reviennent souvent.',
          but: 'Gestion des problèmes (ITIL) : recherche de la cause racine et correctif permanent, au-delà du simple contournement.',
        },
        actions: [{ do: 'travel', path: ['l2', 'l3'], shape: 'mail', label: '#4821' }, { do: 'label', node: 'l3', text: 'pilote d\'impression abîmé', pos: 'top', offset: 66, color: 'violet' }],
      },
      {
        title: 'Résolu !',
        text: {
          college: 'Le problème est réglé, le ticket est fermé et l\'employé peut imprimer. On note la solution pour la prochaine fois !',
          lycee: 'La solution est ajoutée à la base de connaissances : la prochaine fois, le niveau 1 pourra la résoudre tout seul.',
          but: 'Clôture après validation par l\'utilisateur, capitalisation dans la base de connaissances et mesure du respect du SLA.',
        },
        actions: [{ do: 'travel', path: ['l3', 'l2', 'l1', 'user'], color: 'green', duration: 2.4 }, { do: 'highlight', node: 'user', color: 'green' }, { do: 'label', node: 'user', text: 'ticket fermé', pos: 'top', offset: 60, color: 'green' }],
      },
    ],
    quiz: {
      question: 'Que fait le niveau 1 quand il n\'arrive pas à résoudre un ticket ?',
      options: ['Il le supprime', 'Il l\'escalade au niveau 2', 'Il éteint le serveur'],
      correct: 1,
      explanation: 'Le ticket est transmis (escaladé) à un niveau plus spécialisé, avec le diagnostic déjà fait.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'ent-jobs-project',
    title: 'Une appli, toute une équipe',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'ux', x: 90, y: 90, icon: 'eye', label: 'Designer UX', color: 'pink' },
      { id: 'dev', x: 250, y: 90, icon: 'code', label: 'Développeur' },
      { id: 'ops', x: 410, y: 90, icon: 'rocket', label: 'DevOps' },
      { id: 'admin', x: 570, y: 90, icon: 'server', label: 'Admin système' },
      { id: 'sec', x: 730, y: 90, icon: 'shield', label: 'Pentester', color: 'red' },
      { id: 'data', x: 250, y: 270, icon: 'chart', label: 'Data analyst', color: 'amber' },
      { id: 'chef', x: 410, y: 270, icon: 'map', label: 'Chef de projet', color: 'violet' },
      { id: 'support', x: 570, y: 270, icon: 'users', label: 'Support', color: 'green' },
    ],
    links: [
      { from: 'ux', to: 'dev' }, { from: 'dev', to: 'ops' }, { from: 'ops', to: 'admin' }, { from: 'admin', to: 'sec' },
      { from: 'chef', to: 'dev', dashed: true }, { from: 'chef', to: 'admin', dashed: true }, { from: 'chef', to: 'data', dashed: true }, { from: 'chef', to: 'support', dashed: true },
    ],
    steps: [
      {
        title: 'Imaginer',
        text: {
          college: 'Un projet d\'appli commence souvent par le designer UX : il imagine des écrans simples et agréables pour ceux qui vont l\'utiliser.',
          lycee: 'Le designer UX interroge les utilisateurs, dessine des maquettes et les teste avant qu\'on écrive la moindre ligne de code.',
          but: 'Recherche utilisateur, parcours, maquettes puis prototypes testés ; le design system garantit la cohérence et l\'accessibilité.',
        },
        actions: [{ do: 'pulse', node: 'ux', color: 'pink' }],
      },
      {
        title: 'Construire',
        text: {
          college: 'Le développeur écrit le code de l\'application, une fonctionnalité après l\'autre.',
          lycee: 'Les développeurs transforment les maquettes en code, frontend et backend, et écrivent des tests.',
          but: 'Développement itératif (sprints), revue de code, tests automatisés et gestion de versions avec Git.',
        },
        actions: [{ do: 'travel', path: ['ux', 'dev'], color: 'pink' }, { do: 'pulse', node: 'dev' }],
      },
      {
        title: 'Livrer et faire tourner',
        text: {
          college: 'Le DevOps automatise les tests et la mise en ligne ; l\'admin système s\'assure que les serveurs tiennent le coup.',
          lycee: 'DevOps : chaîne de livraison automatique. Administrateur système : serveurs, sauvegardes et disponibilité.',
          but: 'Pipeline CI/CD, infrastructure as code, supervision ; l\'admin garantit la capacité, les correctifs et les sauvegardes.',
        },
        actions: [{ do: 'travel', path: ['dev', 'ops', 'admin'], count: 2 }, { do: 'pulse', nodes: ['ops', 'admin'] }],
      },
      {
        title: 'Protéger',
        text: {
          college: 'Le pentester attaque l\'appli (avec l\'autorisation de l\'entreprise !) pour trouver les failles avant les vrais pirates.',
          lycee: 'Le test d\'intrusion simule une attaque réelle, dans un cadre défini, puis aboutit à un rapport de failles à corriger.',
          but: 'Pentest encadré par une lettre de mission : reconnaissance, exploitation, rapport avec la criticité et les recommandations (CVSS).',
        },
        actions: [{ do: 'travel', path: ['admin', 'sec'], color: 'red' }, { do: 'shake', node: 'sec', color: 'red' }],
      },
      {
        title: 'Accompagner et mesurer',
        text: {
          college: 'Le support aide les utilisateurs, la data analyst mesure ce qui marche, et le chef de projet coordonne toute l\'équipe.',
          lycee: 'L\'informatique, ce n\'est pas que du code : communication, organisation et analyse comptent autant.',
          but: 'Pilotage (planning, budget, risques), analyse d\'usage (indicateurs, tests A/B) et support : la boucle d\'amélioration continue.',
        },
        actions: [{ do: 'flow', from: 'chef', to: 'dev', color: 'violet' }, { do: 'flow', from: 'chef', to: 'data', color: 'violet' }, { do: 'flow', from: 'chef', to: 'support', color: 'violet' }, { do: 'pulse', nodes: ['data', 'chef', 'support'] }],
      },
    ],
    quiz: {
      question: 'Quel métier teste la sécurité d\'un système en l\'attaquant, avec autorisation ?',
      options: ['Le pentester', 'Le designer UX', 'Le chef de projet'],
      correct: 0,
      explanation: 'Le pentester réalise des tests d\'intrusion autorisés pour trouver les failles avant les attaquants.',
    },
  },
];
