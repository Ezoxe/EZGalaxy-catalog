// Scenes of the module « Cybersécurité »
export default [
  {
    lesson: 0, at: 1,
    id: 'sec-phishing',
    title: 'Anatomie d\'une arnaque par phishing',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'hacker', x: 90, y: 90, icon: 'hacker', label: 'Arnaqueur', color: 'red' },
      { id: 'you', x: 400, y: 90, icon: 'user', label: 'Toi' },
      { id: 'real', x: 710, y: 90, icon: 'building', label: 'Vraie banque', color: 'green' },
      { id: 'fake', x: 400, y: 270, icon: 'globe', label: 'Faux site « banque »', color: 'red', hidden: true },
    ],
    links: [{ from: 'hacker', to: 'you' }, { from: 'you', to: 'fake', hidden: true }, { from: 'fake', to: 'hacker', hidden: true }, { from: 'you', to: 'real', dashed: true }],
    steps: [
      {
        title: 'L\'appât',
        text: {
          college: 'Tu reçois un e-mail qui ressemble à celui de ta banque : « Votre compte va être bloqué, cliquez vite ici ! »',
          lycee: 'Le phishing imite un expéditeur de confiance et crée un sentiment d\'urgence pour te pousser à agir sans réfléchir.',
          but: 'Usurpation de marque, domaine ressemblant (typosquatting), expéditeur falsifié : l\'urgence court-circuite la vigilance.',
        },
        actions: [{ do: 'travel', path: ['hacker', 'you'], shape: 'mail', color: 'red', count: 2 }, { do: 'label', node: 'you', text: '« Compte bloqué ! Cliquez vite »', pos: 'bottom', offset: 62, color: 'red' }],
      },
      {
        title: 'Le faux site',
        text: {
          college: 'Le lien t\'emmène sur un faux site, copie parfaite du vrai. Mais regarde bien l\'adresse : ce n\'est pas celle de ta banque !',
          lycee: 'Le faux site reproduit le design officiel ; seule l\'adresse (le nom de domaine) trahit l\'arnaque.',
          but: 'Clone de la page de connexion, souvent servi en HTTPS : le cadenas prouve que la connexion est chiffrée, pas que le site est légitime.',
        },
        actions: [{ do: 'show', nodes: ['fake'], links: [1] }, { do: 'travel', path: ['you', 'fake'] }, { do: 'label', node: 'fake', text: 'banque-verif-securite.com', pos: 'right', offset: 140, color: 'red' }],
      },
      {
        title: 'Les identifiants sont volés',
        text: {
          college: 'Si tu tapes ton mot de passe, il part directement chez l\'arnaqueur, qui peut se connecter à ta place.',
          lycee: 'Les identifiants saisis sont envoyés à l\'attaquant, qui les utilise aussitôt ou les revend.',
          but: 'Exfiltration des identifiants (parfois des codes 2FA relayés en temps réel par un proxy de phishing), puis prise de contrôle du compte.',
        },
        actions: [{ do: 'show', links: [2] }, { do: 'travel', path: ['fake', 'hacker'], color: 'red', shape: 'dot', label: 'mot de passe', count: 2 }, { do: 'pulse', node: 'hacker', color: 'red' }],
      },
      {
        title: 'Le bon réflexe',
        text: {
          college: 'Le bon réflexe : ne clique pas. Va toi-même sur le site ou l\'appli officielle, et signale l\'e-mail.',
          lycee: 'Vérifie l\'expéditeur et l\'adresse, ne saisis jamais tes identifiants depuis un lien reçu, et signale le message (par exemple sur signal-spam.fr).',
          but: 'Accès direct au service, vérification du domaine et signalement ; côté entreprise : SPF, DKIM, DMARC et clés FIDO2 résistantes au phishing.',
        },
        actions: [{ do: 'dim', nodes: ['fake', 'hacker'] }, { do: 'travel', path: ['you', 'real'], color: 'green' }, { do: 'highlight', node: 'real', color: 'green' }, { do: 'label', node: 'you', text: 'je vérifie, je ne clique pas', pos: 'bottom', offset: 62, color: 'green' }],
      },
    ],
    quiz: {
      question: 'Un e-mail te demande de cliquer vite pour « débloquer ton compte ». Que fais-tu ?',
      options: ['Je clique et je me connecte', 'Je ne clique pas et je vais moi-même sur le site officiel', 'Je réponds avec mon mot de passe'],
      correct: 1,
      explanation: 'On ne se connecte jamais depuis un lien reçu : on passe par le site ou l\'appli officielle.',
    },
  },
  {
    lesson: 1, at: 2,
    id: 'sec-passwords',
    title: 'Combien de temps pour deviner ton mot de passe ?',
    stage: { w: 800, h: 370 },
    nodes: [
      { id: 'p1', kind: 'chip', x: 170, y: 60, text: 'azerty', fontSize: 15, color: 'slate' },
      { id: 'p2', kind: 'chip', x: 170, y: 160, text: 'Soleil2009', fontSize: 15, color: 'slate' },
      { id: 'p3', kind: 'chip', x: 170, y: 260, text: 'MonChatMange3Pizzas!', fontSize: 15, color: 'slate' },
      { id: 'b1', kind: 'bar', x: 540, y: 60, w: 300, label: 'Résistance', hideValue: true },
      { id: 'b2', kind: 'bar', x: 540, y: 160, w: 300, label: 'Résistance', hideValue: true },
      { id: 'b3', kind: 'bar', x: 540, y: 260, w: 300, label: 'Résistance', hideValue: true },
      { id: 't1', kind: 'text', x: 540, y: 92, text: '', fontSize: 14 },
      { id: 't2', kind: 'text', x: 540, y: 192, text: '', fontSize: 14 },
      { id: 't3', kind: 'text', x: 540, y: 292, text: '', fontSize: 14 },
      { id: 'mfa', kind: 'chip', x: 400, y: 340, text: 'Code reçu sur ton téléphone : 482 913', hidden: true, color: 'green' },
    ],
    links: [],
    steps: [
      {
        title: 'Un programme qui devine',
        text: {
          college: 'Un pirate utilise un programme qui essaie des milliards de mots de passe par seconde, en commençant par les plus courants. « azerty » est trouvé tout de suite !',
          lycee: 'Attaque par dictionnaire : les mots de passe les plus fréquents sont testés en premier, puis leurs variantes.',
          but: 'Attaque hors ligne sur des empreintes volées : dictionnaires, règles de mutation et GPU qui testent des milliards de candidats par seconde.',
        },
        actions: [{ do: 'fill', node: 'b1', to: 3, color: 'red' }, { do: 'text', node: 't1', text: 'trouvé instantanément' }, { do: 'shake', node: 'p1', color: 'red' }],
      },
      {
        title: 'Mieux… mais prévisible',
        text: {
          college: '« Soleil2009 » : un mot du dictionnaire et une date. Le programme connaît ces astuces, il finit par le trouver.',
          lycee: 'Un mot courant suivi d\'une date est un motif prévisible : les règles de mutation le testent très vite.',
          but: 'Les règles classiques (majuscule initiale, suffixe numérique) couvrent ce motif : l\'entropie réelle est faible.',
        },
        actions: [{ do: 'fill', node: 'b2', to: 20, color: 'amber' }, { do: 'text', node: 't2', text: 'trouvé en peu de temps' }],
      },
      {
        title: 'La phrase de passe',
        text: {
          college: 'Une phrase longue et bizarre comme « MonChatMange3Pizzas! » prendrait des milliers d\'années à deviner. La longueur, c\'est la force !',
          lycee: 'Chaque caractère en plus multiplie le nombre de combinaisons : 20 caractères variés, c\'est hors de portée.',
          but: 'Entropie ≈ longueur × log2(taille de l\'alphabet) ; au-delà d\'environ 80 bits, une recherche exhaustive devient irréaliste.',
        },
        actions: [{ do: 'fill', node: 'b3', to: 100, color: 'green', duration: 2 }, { do: 'text', node: 't3', text: 'des milliers d\'années' }, { do: 'highlight', node: 'p3', color: 'green' }],
      },
      {
        title: 'En plus : la double authentification',
        text: {
          college: 'Même si ton mot de passe fuite, la double authentification demande un code reçu sur ton téléphone : le pirate reste bloqué dehors.',
          lycee: 'La 2FA combine ce que tu sais (le mot de passe) et ce que tu possèdes (ton téléphone ou une clé de sécurité).',
          but: 'Authentification multifacteur : préférer une appli TOTP ou une clé FIDO2 au SMS, vulnérable à l\'usurpation de carte SIM.',
        },
        actions: [{ do: 'show', nodes: ['mfa'] }, { do: 'pulse', node: 'mfa', color: 'green' }],
      },
    ],
    quiz: {
      question: 'Quel mot de passe est le plus solide ?',
      options: ['azerty', 'Soleil2009', 'MonChatMange3Pizzas!'],
      correct: 2,
      explanation: 'Une phrase de passe longue et inattendue résiste bien mieux qu\'un mot court ou prévisible.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'sec-update-shield',
    title: 'Mises à jour et sauvegardes : tes boucliers',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'virus', x: 90, y: 100, icon: 'bug', label: 'Logiciel malveillant', color: 'red' },
      { id: 'pc', x: 400, y: 180, icon: 'laptop', label: 'Ton ordinateur', size: 84 },
      { id: 'update', x: 710, y: 90, icon: 'cloud', label: 'Mise à jour', color: 'green' },
      { id: 'backup', x: 710, y: 280, icon: 'disk', label: 'Sauvegarde', color: 'violet' },
    ],
    links: [{ from: 'virus', to: 'pc', dashed: true }, { from: 'update', to: 'pc' }, { from: 'pc', to: 'backup' }],
    steps: [
      {
        title: 'Une faille',
        text: {
          college: 'Les logiciels ont parfois des failles, comme une fenêtre mal fermée. Des logiciels malveillants essaient d\'entrer par là.',
          lycee: 'Une vulnérabilité est une erreur de conception ou de code qu\'un attaquant peut exploiter.',
          but: 'Vulnérabilité référencée (CVE) exploitable à distance : exécution de code, élévation de privilèges…',
        },
        actions: [{ do: 'travel', path: ['virus', 'pc'], color: 'red' }, { do: 'shake', node: 'pc', color: 'red' }, { do: 'label', node: 'pc', text: 'faille de sécurité !', pos: 'top', offset: 72, color: 'red' }],
      },
      {
        title: 'La mise à jour referme la faille',
        text: {
          college: 'La mise à jour corrige la faille : la fenêtre est refermée. C\'est pour ça qu\'il faut l\'installer vite !',
          lycee: 'Le correctif supprime la vulnérabilité ; tant qu\'il n\'est pas installé, l\'appareil reste exposé.',
          but: 'Entre la publication du correctif et son installation s\'ouvre une fenêtre d\'exposition : les attaquants analysent les patchs pour l\'exploiter.',
        },
        actions: [{ do: 'travel', path: ['update', 'pc'], color: 'green', count: 2 }, { do: 'highlight', node: 'pc', color: 'green' }],
      },
      {
        title: 'L\'attaque échoue',
        text: {
          college: 'Le logiciel malveillant essaie encore… et rebondit. Avec des mots de passe différents et la double authentification, tes comptes sont protégés eux aussi.',
          lycee: 'Système à jour, compte utilisateur sans droits d\'administrateur, 2FA : chaque couche bloque une partie des attaques.',
          but: 'Défense en profondeur : correctifs, moindre privilège, MFA, filtrage ; aucune mesure seule ne suffit, mais leur cumul est efficace.',
        },
        actions: [{ do: 'highlight', node: 'pc', color: 'green' }, { do: 'travel', path: ['virus', 'pc', 'virus'], color: 'red', duration: 1.6 }, { do: 'label', node: 'pc', text: 'bloqué', pos: 'top', offset: 72, color: 'green' }],
      },
      {
        title: 'La sauvegarde, ton filet de sécurité',
        text: {
          college: 'Fais des sauvegardes régulières : même en cas de rançongiciel ou de panne, tu récupères tes fichiers.',
          lycee: 'Règle 3-2-1 : 3 copies, sur 2 supports différents, dont 1 gardée ailleurs ou débranchée.',
          but: 'Sauvegardes 3-2-1 avec une copie hors ligne ou immuable : la seule vraie parade face au chiffrement par rançongiciel.',
        },
        actions: [{ do: 'travel', path: ['pc', 'backup'], color: 'violet', count: 3 }, { do: 'pulse', node: 'backup', color: 'violet' }],
      },
    ],
    quiz: {
      question: 'Pourquoi faut-il installer rapidement les mises à jour ?',
      options: ['Pour changer les couleurs', 'Parce qu\'elles corrigent des failles de sécurité', 'Pour vider la batterie'],
      correct: 1,
      explanation: 'Les mises à jour de sécurité referment des failles que des attaquants connaissent déjà.',
    },
  },
];
