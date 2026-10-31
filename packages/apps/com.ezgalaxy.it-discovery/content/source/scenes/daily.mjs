// Scenes of the module « Le Numérique au Quotidien »
export default [
  {
    lesson: 0, at: 1,
    id: 'daily-phone-sensors',
    title: 'Ton smartphone, un ordinateur bourré de capteurs',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'phone', x: 400, y: 175, icon: 'phone', label: 'Ton smartphone', size: 84, color: 'violet' },
      { id: 'sat', x: 120, y: 70, icon: 'satellite', label: 'Satellites GPS' },
      { id: 'net', x: 680, y: 70, icon: 'wifi', label: 'Wi-Fi · 4G · 5G' },
      { id: 'cam', x: 120, y: 285, icon: 'camera', label: 'Caméra + IA' },
      { id: 'nfc', x: 680, y: 285, icon: 'signal', label: 'Terminal NFC', color: 'green' },
    ],
    links: [
      { from: 'sat', to: 'phone', dashed: true }, { from: 'net', to: 'phone', dashed: true },
      { from: 'cam', to: 'phone' }, { from: 'phone', to: 'nfc', dashed: true },
    ],
    steps: [
      {
        title: 'Un ordinateur dans ta poche',
        text: {
          college: 'Ton smartphone contient un processeur, de la mémoire et du stockage, comme un ordinateur. Il est même bien plus puissant que l\'ordinateur des missions Apollo vers la Lune !',
          lycee: 'Un smartphone embarque un SoC (System on Chip) qui regroupe processeur, puce graphique et puce d\'IA, avec 4 à 16 Go de RAM et du stockage flash.',
          but: 'Le SoC ARM intègre des cœurs hétérogènes (performance et efficacité), un GPU, un NPU, le modem et les contrôleurs de mémoire LPDDR sur une seule puce.',
        },
        actions: [{ do: 'pulse', node: 'phone', color: 'violet' }, { do: 'label', node: 'phone', text: 'processeur + RAM + stockage', pos: 'bottom', offset: 82, color: 'violet' }],
      },
      {
        title: 'Il sait où tu es',
        text: {
          college: 'Le GPS écoute les signaux de plusieurs satellites. En comparant le temps qu\'ils mettent à arriver, le téléphone calcule ta position à quelques mètres près.',
          lycee: 'Le récepteur GPS mesure le temps de trajet des signaux d\'au moins 4 satellites et en déduit sa position par trilatération.',
          but: 'Trilatération sur au moins 4 satellites (x, y, z et biais d\'horloge du récepteur) ; l\'A-GPS accélère le premier calcul grâce aux données du réseau mobile.',
        },
        actions: [{ do: 'travel', path: ['sat', 'phone'], count: 3, shape: 'dot', color: 'amber' }, { do: 'flow', from: 'sat', to: 'phone', color: 'amber' }],
      },
      {
        title: 'Il reste connecté',
        text: {
          college: 'Le Wi-Fi ou la 4G/5G relient ton téléphone à Internet grâce à des ondes radio invisibles.',
          lycee: 'Le téléphone passe tout seul du Wi-Fi au réseau mobile (4G/5G) selon la qualité du signal.',
          but: 'Le modem gère la 4G/5G et le Wi-Fi 802.11ax ; l\'OS choisit l\'interface réseau et maintient les connexions pendant les changements.',
        },
        actions: [{ do: 'travel', path: ['net', 'phone'], count: 2 }, { do: 'travel', path: ['phone', 'net'], count: 2, color: 'amber', delay: 0.6 }],
      },
      {
        title: 'Il voit et il comprend',
        text: {
          college: 'La caméra prend la photo, puis une petite IA dans le téléphone l\'améliore : elle repère les visages, éclaircit l\'image et floute le fond.',
          lycee: 'La photo est retouchée en direct par des algorithmes (photographie computationnelle) : fusion de plusieurs clichés, détection des visages…',
          but: 'Le pipeline ISP + NPU fusionne plusieurs expositions (HDR), segmente la scène pour le mode portrait et applique un débruitage par réseau de neurones.',
        },
        actions: [{ do: 'travel', path: ['cam', 'phone'], count: 3, color: 'pink' }, { do: 'label', node: 'cam', text: 'visage détecté', pos: 'right', offset: 44, color: 'pink' }],
      },
      {
        title: 'Il paie sans contact',
        text: {
          college: 'Le NFC ne marche qu\'à quelques centimètres : c\'est ce qui permet de payer en approchant ton téléphone du terminal.',
          lycee: 'Le NFC est une communication radio à très courte portée (quelques centimètres), utilisée pour le paiement sans contact et les badges.',
          but: 'NFC à 13,56 MHz, portée inférieure à 10 cm ; le paiement s\'appuie sur un élément sécurisé et sur un jeton qui remplace le vrai numéro de carte.',
        },
        actions: [{ do: 'travel', path: ['phone', 'nfc'], color: 'green', shape: 'dot', count: 2 }, { do: 'pulse', node: 'nfc', color: 'green' }],
      },
    ],
    quiz: {
      question: 'Quelle technologie permet de payer sans contact avec un téléphone ?',
      options: ['Le GPS', 'Le NFC', 'La 5G'],
      correct: 1,
      explanation: 'Le NFC fonctionne à quelques centimètres seulement : parfait pour un paiement volontaire et sécurisé.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'daily-reco',
    title: 'Comment l\'appli devine ce que tu vas aimer',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'you', x: 100, y: 180, icon: 'user', label: 'Toi' },
      { id: 'feed', x: 320, y: 180, icon: 'phone', label: 'Ton fil de vidéos' },
      { id: 'algo', x: 640, y: 180, icon: 'brain', label: 'L\'algorithme', size: 76, color: 'violet' },
      { id: 's1', kind: 'chip', x: 480, y: 70, text: 'temps de visionnage', hidden: true, color: 'amber' },
      { id: 's2', kind: 'chip', x: 480, y: 290, text: 'likes · partages · revisionnages', hidden: true, color: 'amber' },
    ],
    links: [{ from: 'you', to: 'feed' }, { from: 'feed', to: 'algo', curve: -60 }, { from: 'algo', to: 'feed', curve: -60 }],
    steps: [
      {
        title: 'Tu regardes une vidéo',
        text: {
          college: 'Tu ouvres l\'appli et tu regardes une vidéo, sans rien demander de spécial.',
          lycee: 'L\'appli affiche une première sélection de vidéos, souvent les plus populaires du moment.',
          but: 'Démarrage à froid : sans historique, la plateforme propose du contenu populaire ou proche de ton profil déclaré.',
        },
        actions: [{ do: 'travel', path: ['feed', 'you'], color: 'amber', count: 2 }],
      },
      {
        title: 'L\'appli t\'observe',
        text: {
          college: 'Pendant ce temps, l\'appli note tout : combien de temps tu regardes, si tu likes, si tu revois la vidéo, si tu passes vite à la suivante.',
          lycee: 'Chaque geste devient un signal : durée de visionnage, revisionnage, partage, ou au contraire abandon rapide.',
          but: 'Collecte de signaux implicites (temps de visionnage, taux de complétion, replays) et explicites (likes, abonnements), enregistrés pour entraîner le modèle.',
        },
        actions: [{ do: 'show', nodes: ['s1', 's2'] }, { do: 'travel', path: ['you', 'feed', 'algo'], count: 3, shape: 'dot' }],
      },
      {
        title: 'L\'algorithme apprend',
        text: {
          college: 'L\'algorithme compare tes réactions à celles de millions d\'autres personnes et devine ce qui va te plaire.',
          lycee: 'Un modèle de recommandation calcule pour chaque vidéo un score : la probabilité que tu la regardes jusqu\'au bout.',
          but: 'Filtrage collaboratif et réseaux de neurones : vecteurs (embeddings) pour les utilisateurs et les contenus, prédiction de l\'engagement, puis classement des candidats.',
        },
        actions: [{ do: 'pulse', node: 'algo', color: 'violet' }, { do: 'label', node: 'algo', text: 'tu aimes : jeux vidéo, chats', pos: 'bottom', offset: 82, color: 'violet' }],
      },
      {
        title: 'La boucle recommence',
        text: {
          college: 'Il te propose des vidéos du même genre… et la boucle recommence. C\'est pour ça qu\'on a du mal à décrocher !',
          lycee: 'Plus tu regardes, plus le modèle s\'affine : c\'est une boucle qui peut t\'enfermer dans une « bulle » de contenus toujours pareils.',
          but: 'Boucle de rétroaction : les recommandations influencent les données futures (biais d\'exposition, bulle de filtres). Les plateformes ajoutent de l\'exploration pour diversifier.',
        },
        actions: [{ do: 'travel', path: ['algo', 'feed', 'you'], count: 3, color: 'amber' }, { do: 'flow', from: 'algo', to: 'feed', curve: -60, color: 'amber' }],
      },
    ],
    quiz: {
      question: 'Qu\'utilise surtout l\'algorithme pour choisir tes prochaines vidéos ?',
      options: ['Le hasard', 'Ton comportement : temps de visionnage, likes, partages', 'L\'heure qu\'il est'],
      correct: 1,
      explanation: 'Ce que tu regardes (et combien de temps) est le meilleur indice pour l\'algorithme.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'daily-data-trail',
    title: 'Le voyage de tes données personnelles',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'you', x: 90, y: 180, icon: 'phone', label: 'Toi' },
      { id: 'pos', kind: 'chip', x: 300, y: 70, text: 'position GPS', color: 'cyan' },
      { id: 'search', kind: 'chip', x: 300, y: 180, text: 'recherches', color: 'cyan' },
      { id: 'photo', kind: 'chip', x: 300, y: 290, text: 'photo + lieu + date', color: 'cyan' },
      { id: 'company', x: 540, y: 180, icon: 'building', label: 'Entreprise', size: 72 },
      { id: 'ad', x: 720, y: 180, icon: 'screen', label: 'Pub ciblée', color: 'amber' },
      { id: 'rgpd', x: 540, y: 310, icon: 'shieldcheck', label: 'RGPD', hidden: true, color: 'green' },
    ],
    links: [
      { from: 'you', to: 'pos' }, { from: 'you', to: 'search' }, { from: 'you', to: 'photo' },
      { from: 'pos', to: 'company' }, { from: 'search', to: 'company' }, { from: 'photo', to: 'company' },
      { from: 'company', to: 'ad' },
    ],
    steps: [
      {
        title: 'Tu laisses des traces',
        text: {
          college: 'Chaque appli ouverte, chaque recherche, chaque photo laisse une trace numérique : ce sont tes données personnelles.',
          lycee: 'Une donnée personnelle, c\'est toute information qui permet de t\'identifier, directement ou en croisant plusieurs infos.',
          but: 'Donnée à caractère personnel (RGPD, art. 4) : toute information se rapportant à une personne identifiée ou identifiable, y compris par recoupement.',
        },
        actions: [{ do: 'travel', path: ['you', 'pos'], shape: 'dot' }, { do: 'travel', path: ['you', 'search'], shape: 'dot', delay: 0.3 }, { do: 'travel', path: ['you', 'photo'], shape: 'dot', delay: 0.6 }],
      },
      {
        title: 'Elles sont collectées',
        text: {
          college: 'Ces données partent vers les serveurs des entreprises. Une photo contient même l\'endroit et l\'heure où elle a été prise !',
          lycee: 'Les métadonnées d\'une photo (EXIF : date, GPS, modèle d\'appareil) voyagent avec elle ; les applis collectent aussi ta position et ton usage.',
          but: 'Collecte via les SDK tiers intégrés aux applis, les cookies et l\'identifiant publicitaire, puis croisement des sources pour construire un profil.',
        },
        actions: [{ do: 'travel', path: ['pos', 'company'], color: 'amber' }, { do: 'travel', path: ['search', 'company'], color: 'amber', delay: 0.3 }, { do: 'travel', path: ['photo', 'company'], color: 'amber', delay: 0.6 }, { do: 'pulse', node: 'company' }],
      },
      {
        title: 'Elles valent de l\'argent',
        text: {
          college: 'Avec ton profil, l\'entreprise vend de la publicité ciblée. C\'est pour ça que beaucoup d\'applis sont gratuites : ce qui est vendu, ce sont un peu tes données.',
          lycee: 'Le profil sert au ciblage publicitaire : des annonceurs paient pour toucher précisément les personnes qui te ressemblent.',
          but: 'Enchères publicitaires en temps réel (RTB) : en quelques millisecondes, des annonceurs enchérissent pour t\'afficher une pub selon ton profil.',
        },
        actions: [{ do: 'travel', path: ['company', 'ad'], color: 'amber', count: 2 }, { do: 'label', node: 'ad', text: '« Nouvelles baskets ! »', pos: 'top', offset: 62, color: 'amber' }],
      },
      {
        title: 'Tu as des droits',
        text: {
          college: 'En Europe, le RGPD te protège : tu peux demander à voir tes données, les corriger ou les faire effacer. Et tu peux refuser des autorisations dans tes applis !',
          lycee: 'Le RGPD impose ton consentement pour beaucoup d\'usages et te donne des droits d\'accès, de rectification, d\'effacement et d\'opposition.',
          but: 'RGPD : une base légale est obligatoire (consentement, contrat, intérêt légitime…), droits des personnes (art. 15 à 21), amendes jusqu\'à 4 % du chiffre d\'affaires mondial.',
        },
        actions: [{ do: 'show', nodes: ['rgpd'] }, { do: 'pulse', node: 'rgpd', color: 'green' }, { do: 'dim', nodes: ['ad'] }],
      },
    ],
    quiz: {
      question: 'Que peux-tu demander à une entreprise grâce au RGPD ?',
      options: ['L\'effacement de tes données', 'Un forfait gratuit', 'Un nouveau téléphone'],
      correct: 0,
      explanation: 'Le RGPD te donne notamment le droit d\'accès, de rectification et d\'effacement de tes données.',
    },
  },
];
