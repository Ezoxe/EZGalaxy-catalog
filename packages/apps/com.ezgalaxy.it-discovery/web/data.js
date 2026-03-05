/**
 * IT Discovery — Module Data (v2)
 * 11 modules, 40+ lessons, 85+ quiz questions, 30 badges, 8 levels
 * Tier-based progression system with prerequisites
 */
(() => {
  'use strict';

  const Data = {};

  /* ───────── Levels (expanded to 8) ───────── */
  Data.LEVELS = [
    { min: 0,    title: 'Stagiaire',       icon: '🐣' },
    { min: 50,   title: 'Initié',          icon: '🌱' },
    { min: 150,  title: 'Technicien',      icon: '🔧' },
    { min: 300,  title: 'Expert',          icon: '🚀' },
    { min: 500,  title: 'Hacker Éthique',  icon: '🎯' },
    { min: 750,  title: 'Architecte IT',   icon: '👑' },
    { min: 1000, title: 'CTO',             icon: '🏆' },
    { min: 1500, title: 'Légende',         icon: '💎' }
  ];

  /* ───────── Badges (30 total) ───────── */
  Data.BADGES = [
    // Progress badges
    { id: 'first-step',    title: 'Premier Pas',       icon: '👣', desc: 'Compléter ta première leçon' },
    { id: 'curious',       title: 'Curieux',            icon: '🔍', desc: 'Compléter 5 leçons' },
    { id: 'encyclopedia',  title: 'Encyclopédie',       icon: '📚', desc: 'Compléter toutes les leçons' },
    // Quiz badges
    { id: 'quiz-master',   title: 'Quiz Master',        icon: '🏆', desc: 'Obtenir un score parfait à un quiz' },
    { id: 'flawless',      title: 'Sans Faute',         icon: '💎', desc: 'Obtenir 3 scores parfaits aux quiz' },
    { id: 'perfectionist', title: 'Perfectionniste',    icon: '🌟', desc: 'Obtenir 5 scores parfaits aux quiz' },
    // Streak badges
    { id: 'unstoppable',   title: 'Inarrêtable',        icon: '🔥', desc: 'Streak de 5 bonnes réponses consécutives' },
    { id: 'streak-10',     title: 'Flamme Éternelle',   icon: '🔥', desc: 'Streak de 10 bonnes réponses consécutives' },
    { id: 'streak-20',     title: 'Machine',            icon: '🤖', desc: 'Streak de 20 bonnes réponses consécutives' },
    // XP badges
    { id: 'xp-100',        title: 'Centurion',          icon: '💯', desc: 'Atteindre 100 XP' },
    { id: 'xp-500',        title: 'Demi-Millier',       icon: '⭐', desc: 'Atteindre 500 XP' },
    { id: 'xp-1000',       title: 'Millionnaire',       icon: '💰', desc: 'Atteindre 1000 XP' },
    // Speed badges
    { id: 'speed-demon',   title: 'Speed Demon',        icon: '⚡', desc: 'Finir un quiz en moins de 30 secondes' },
    // Tier badges
    { id: 'tier-2-unlocked', title: 'Explorateur',      icon: '🗺️', desc: 'Débloquer le Tier 2' },
    { id: 'tier-3-unlocked', title: 'Aventurier',       icon: '⛰️', desc: 'Débloquer le Tier 3' },
    { id: 'tier-4-unlocked', title: 'Maître IT',        icon: '🏔️', desc: 'Débloquer le Tier 4' },
    // Completion badge
    { id: 'completionist', title: 'Complétiste',        icon: '🏅', desc: 'Compléter tous les modules' },
    // Mini-game badges
    { id: 'speedrun-50',   title: 'Speedrunner',        icon: '🏃', desc: 'Atteindre 50 points en mode Speedrun' },
    { id: 'survivor-10',   title: 'Survivant',          icon: '🛡️', desc: 'Atteindre 10 rounds en mode Survie' },
    { id: 'daily-3',       title: 'Régulier',           icon: '📅', desc: 'Compléter 3 défis quotidiens' },
    { id: 'daily-7',       title: 'Assidu',             icon: '🔁', desc: 'Compléter 7 défis quotidiens' },
    // Login badge
    { id: 'first-login',   title: 'Bienvenue',          icon: '👋', desc: 'Se connecter pour la première fois' },
    // Per-module badges
    { id: 'hardware-hero',   title: 'Hardware Hero',    icon: '🖥️', desc: 'Module "C\'est quoi l\'informatique" complété' },
    { id: 'network-ninja',   title: 'Network Ninja',    icon: '🌐', desc: 'Module "Réseaux & Internet" complété' },
    { id: 'cyber-guardian',  title: 'Cyber Guardian',   icon: '🛡️', desc: 'Module "Cybersécurité" complété' },
    { id: 'code-wizard',    title: 'Code Wizard',       icon: '🧙', desc: 'Module "Développement & IA" complété' },
    { id: 'it-pro',         title: 'IT Pro',             icon: '💼', desc: 'Module "IT en entreprise" complété' },
    { id: 'digital-native', title: 'Digital Native',    icon: '📱', desc: 'Module "Numérique au quotidien" complété' },
    { id: 'os-master',      title: 'OS Master',         icon: '🐧', desc: 'Module "Systèmes d\'exploitation" complété' },
    { id: 'cloud-master',   title: 'Cloud Architect',   icon: '☁️', desc: 'Module "Cloud & DevOps" complété' }
  ];

  Data.MODULE_BADGES = {
    hardware:    'hardware-hero',
    networks:    'network-ninja',
    security:    'cyber-guardian',
    dev:         'code-wizard',
    enterprise:  'it-pro',
    daily:       'digital-native',
    os:          'os-master',
    databases:   null,
    scripting:   null,
    cloud:       'cloud-master',
    ai:          null
  };

  /* ═══════════════════════════════════════════════════
     MODULE 1 — C'est quoi l'informatique ? (Tier 1)
     ═══════════════════════════════════════════════════ */
  const hardware = {
    id: 'hardware',
    title: "C'est quoi l'informatique ?",
    icon: '🖥️',
    color: '#3b82f6',
    tier: 1,
    requiredModules: [],
    description: "Découvre les composants d'un ordinateur, comment il fonctionne et ce qu'est un système d'exploitation",
    lessons: [
      {
        title: 'Les composants d\'un ordinateur',
        icon: '🔧',
        content: [
          { type: 'paragraph', text: 'Un ordinateur, c\'est un peu comme un corps humain : chaque organe a un rôle précis et ils travaillent tous ensemble. Voyons les composants principaux !' },
          { type: 'analogy', text: '🧠 Le CPU (processeur), c\'est le cerveau de l\'ordi. C\'est lui qui fait tous les calculs et exécute les programmes. Plus il est puissant, plus tu peux faire de choses en même temps !' },
          { type: 'analogy', text: '📋 La RAM (mémoire vive), c\'est comme ton bureau de travail. Plus il est grand, plus tu peux ouvrir de cahiers en même temps. Quand tu éteins l\'ordi, le bureau se vide !' },
          { type: 'analogy', text: '📦 Le disque dur (HDD/SSD), c\'est comme ton armoire. C\'est là que sont rangés tous tes fichiers, photos, jeux... Même quand l\'ordi est éteint, tout reste dedans.' },
          { type: 'drag-match', question: 'Associe chaque composant à son rôle :', pairs: [
            { term: 'CPU', definition: 'Fait les calculs et exécute les programmes' },
            { term: 'RAM', definition: 'Mémoire de travail temporaire' },
            { term: 'SSD', definition: 'Stockage permanent rapide' },
            { term: 'GPU', definition: 'Gère l\'affichage et les graphismes' },
            { term: 'Carte mère', definition: 'Relie tous les composants' }
          ]},
          { type: 'list', title: 'Les composants essentiels :', items: [
            'CPU (processeur) — le cerveau qui calcule',
            'RAM — la mémoire de travail temporaire',
            'Disque dur/SSD — le stockage permanent',
            'Carte mère — le squelette qui relie tout',
            'Alimentation — le cœur qui fournit l\'énergie',
            'Carte graphique (GPU) — pour l\'affichage et les jeux'
          ]},
          { type: 'fun-fact', text: 'Le premier ordinateur (ENIAC, 1945) pesait 30 tonnes et occupait une pièce entière ! Aujourd\'hui, ton smartphone est des millions de fois plus puissant 📱' },
          { type: 'highlight', text: 'Un SSD est jusqu\'à 100x plus rapide qu\'un ancien disque dur mécanique. C\'est pour ça que les ordis modernes démarrent en quelques secondes !' },
          { type: 'interactive-diagram', title: 'Schéma d\'un ordinateur — clique sur chaque composant !', elements: [
            { id: 'cpu', label: '🧠 CPU', x: 50, y: 15, info: 'Le processeur (CPU) exécute toutes les instructions. Marques courantes : Intel Core, AMD Ryzen.' },
            { id: 'ram', label: '📋 RAM', x: 50, y: 35, info: 'La RAM stocke temporairement les données des programmes ouverts. Typiquement 8-32 Go.' },
            { id: 'ssd', label: '📦 SSD', x: 50, y: 55, info: 'Le SSD stocke durablement tes fichiers. Utilise des puces flash, pas de pièces mécaniques.' },
            { id: 'gpu', label: '🎮 GPU', x: 50, y: 75, info: 'La carte graphique gère les images, vidéos, jeux et aussi le machine learning.' },
            { id: 'psu', label: '⚡ Alim', x: 15, y: 90, info: 'L\'alimentation convertit le courant électrique pour tous les composants.' },
            { id: 'mobo', label: '🔌 Carte mère', x: 85, y: 90, info: 'La carte mère est le circuit imprimé qui connecte tous les composants entre eux.' }
          ]},
          { type: 'diagram', text: '┌─────────────────────────┐\n│       🧠  CPU           │ ← Cerveau (calculs)\n├─────────────────────────┤\n│       📋  RAM           │ ← Bureau (temporaire)\n├─────────────────────────┤\n│       📦  SSD / HDD     │ ← Armoire (permanent)\n├─────────────────────────┤\n│       🎮  GPU           │ ← Graphismes & jeux\n└────────────┬────────────┘\n             │\n     ┌───────┴───────┐\n     │  🔌 Carte mère │ ← Relie tout ensemble\n     └───────────────┘\n             │\n     ┌───────┴───────┐\n     │  ⚡ Alim       │ ← Fournit l\'énergie\n     └───────────────┘' }
        ]
      },
      {
        title: 'Le système d\'exploitation',
        icon: '💿',
        content: [
          { type: 'paragraph', text: 'Le système d\'exploitation (OS), c\'est le grand chef d\'orchestre de ton ordinateur. Sans lui, impossible de faire quoi que ce soit !' },
          { type: 'analogy', text: '🎭 Imagine un théâtre : le matériel (CPU, RAM...) ce sont les acteurs et la scène. Le système d\'exploitation, c\'est le metteur en scène qui dit à chacun quoi faire, quand, et dans quel ordre.' },
          { type: 'list', title: 'Les OS les plus connus :', items: [
            'Windows — le plus utilisé sur les PC (Microsoft)',
            'macOS — celui des Mac (Apple)',
            'Linux — gratuit et open source, très utilisé sur les serveurs',
            'Android — pour les smartphones (basé sur Linux)',
            'iOS — pour les iPhone et iPad (Apple)'
          ]},
          { type: 'flashcard-deck', title: 'Flashcards — Retourne les cartes pour apprendre !', cards: [
            { front: 'Windows', back: 'OS de Microsoft, le plus utilisé sur les PC (>70% des desktops)' },
            { front: 'Linux', back: 'OS libre et open source. Fait tourner 96% des serveurs web.' },
            { front: 'macOS', back: 'OS d\'Apple pour les Mac. Basé sur Unix (BSD).' },
            { front: 'Android', back: 'OS mobile de Google, basé sur le noyau Linux. >70% des smartphones.' },
            { front: 'Kernel', back: 'Le noyau de l\'OS. Il communique directement avec le matériel.' }
          ]},
          { type: 'paragraph', text: 'L\'OS gère tout : il distribue la mémoire aux programmes, envoie les images à l\'écran, gère le clavier et la souris, et s\'occupe des fichiers sur le disque dur.' },
          { type: 'fun-fact', text: 'Linux fait tourner 96% des serveurs d\'Internet, 100% des 500 supercalculateurs les plus puissants du monde, et même la Station Spatiale Internationale ! 🚀' },
          { type: 'highlight', text: 'Quand tu ouvres le Gestionnaire de tâches (Ctrl+Shift+Suppr sur Windows), tu peux voir tous les programmes que l\'OS gère en même temps. Essaie, tu seras surpris du nombre !' }
        ]
      },
      {
        title: 'Les périphériques',
        icon: '🖨️',
        content: [
          { type: 'paragraph', text: 'Les périphériques, ce sont tous les appareils connectés à ton ordinateur pour interagir avec lui. On les sépare en deux catégories :' },
          { type: 'list', title: '⬅️ Périphériques d\'entrée (tu envoies des infos à l\'ordi) :', items: [
            'Clavier — pour écrire',
            'Souris — pour pointer et cliquer',
            'Micro — pour parler',
            'Webcam — pour la vidéo',
            'Scanner — pour numériser des documents',
            'Manette de jeu — pour jouer !'
          ]},
          { type: 'list', title: '➡️ Périphériques de sortie (l\'ordi t\'envoie des infos) :', items: [
            'Écran — pour voir',
            'Haut-parleurs/casque — pour entendre',
            'Imprimante — pour imprimer sur papier'
          ]},
          { type: 'drag-match', question: 'Classe ces périphériques (entrée ou sortie) :', pairs: [
            { term: 'Clavier', definition: 'Entrée' },
            { term: 'Écran', definition: 'Sortie' },
            { term: 'Souris', definition: 'Entrée' },
            { term: 'Haut-parleur', definition: 'Sortie' },
            { term: 'Webcam', definition: 'Entrée' },
            { term: 'Imprimante', definition: 'Sortie' }
          ]},
          { type: 'analogy', text: '🎮 Le clavier et la souris sont tes "mains" pour parler à l\'ordi. L\'écran et les haut-parleurs sont ses "yeux" et sa "bouche" pour te répondre !' },
          { type: 'fun-fact', text: 'Il existe des périphériques qui sont à la fois entrée ET sortie ! Un écran tactile par exemple : il affiche des images (sortie) ET détecte tes doigts (entrée) 🤯' },
          { type: 'highlight', text: 'L\'USB (Universal Serial Bus) est le connecteur le plus utilisé. L\'USB-C peut transférer des données, de la vidéo ET de l\'énergie en même temps !' }
        ]
      }
    ],
    quiz: [
      { question: 'Quel composant est le "cerveau" de l\'ordinateur ?', options: ['RAM', 'CPU', 'Disque dur', 'Carte graphique'], correct: 1, explanation: 'Le CPU (processeur) exécute toutes les instructions et fait les calculs. C\'est bien le cerveau !' },
      { question: 'Que se passe-t-il avec la RAM quand on éteint l\'ordinateur ?', options: ['Elle garde les données', 'Elle se vide', 'Elle se met en veille', 'Elle se copie sur le disque'], correct: 1, explanation: 'La RAM est une mémoire volatile : elle se vide dès qu\'il n\'y a plus d\'électricité !' },
      { question: 'Quel OS est utilisé sur la grande majorité des serveurs Internet ?', options: ['Windows', 'macOS', 'Linux', 'Android'], correct: 2, explanation: 'Linux fait tourner environ 96% des serveurs web dans le monde, grâce à sa stabilité et sa gratuité.' },
      { question: 'Qu\'est-ce qu\'un périphérique d\'entrée ?', options: ['Un écran', 'Un haut-parleur', 'Un clavier', 'Une imprimante'], correct: 2, explanation: 'Le clavier permet d\'envoyer des informations à l\'ordi (entrée). L\'écran, lui, est un périphérique de sortie.' },
      { question: 'Que fait un SSD par rapport à un HDD classique ?', options: ['Il est plus lent', 'Il stocke plus', 'Il est beaucoup plus rapide', 'Il consomme plus'], correct: 2, explanation: 'Un SSD utilise de la mémoire flash (pas de pièces mécaniques) et est jusqu\'à 100x plus rapide qu\'un HDD !' },
      { question: 'Quel est le rôle principal du système d\'exploitation ?', options: ['Jouer à des jeux', 'Gérer le matériel et les logiciels', 'Se connecter à Internet', 'Protéger contre les virus'], correct: 1, explanation: 'L\'OS est le chef d\'orchestre qui gère le matériel, les programmes, les fichiers et toutes les ressources.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 2 — Le Numérique au Quotidien (Tier 1)
     ═══════════════════════════════════════════════════ */
  const daily = {
    id: 'daily',
    title: 'Le Numérique au Quotidien',
    icon: '📱',
    color: '#ec4899',
    tier: 1,
    requiredModules: [],
    description: 'L\'informatique dans ta vie de tous les jours : smartphone, réseaux sociaux, IA et données personnelles',
    lessons: [
      {
        title: 'Ton smartphone, un super-ordinateur',
        icon: '📱',
        content: [
          { type: 'paragraph', text: 'Ton smartphone est bien plus qu\'un téléphone. C\'est un ordinateur complet qui tient dans ta poche, et il est plus puissant que les ordinateurs qui ont envoyé l\'Homme sur la Lune !' },
          { type: 'list', title: '🔍 Ce qu\'il y a dans ton smartphone :', items: [
            'Un processeur (SoC) — le cerveau, comme dans un PC',
            'De la RAM — 4 à 16 Go en général',
            'Du stockage (flash) — 64 à 1 To !',
            'Des capteurs : GPS, accéléromètre, gyroscope, boussole, proximité...',
            'Des connexions : Wi-Fi, Bluetooth, 4G/5G, NFC',
            'Des caméras avec de l\'IA intégrée pour les photos'
          ]},
          { type: 'true-false', title: 'Vrai ou Faux ?', statements: [
            { text: 'Ton smartphone est plus puissant que l\'ordinateur d\'Apollo 11', answer: true, explanation: 'L\'ordinateur d\'Apollo 11 avait 74 Ko de RAM. Ton smartphone en a ~8 Go, soit 100 000+ fois plus !' },
            { text: 'Le Bluetooth a une portée de plusieurs kilomètres', answer: false, explanation: 'Le Bluetooth classique a une portée de 10-100 mètres selon la version.' },
            { text: 'Le NFC permet de payer sans contact avec ton téléphone', answer: true, explanation: 'Le NFC (Near Field Communication) est la technologie derrière le paiement sans contact.' }
          ]},
          { type: 'analogy', text: '🚀 L\'ordinateur de bord d\'Apollo 11 (qui a emmené les astronautes sur la Lune en 1969) avait 74 Ko de mémoire. Ton smartphone en a environ 8 Go, soit plus de 100 000 fois plus !' },
          { type: 'highlight', text: 'Les applis ne sont pas gratuites par hasard ! Beaucoup gagnent de l\'argent en collectant tes données (position, habitudes, contacts) pour vendre de la publicité ciblée.' },
          { type: 'fun-fact', text: 'Un Français passe en moyenne 3h30 par jour sur son smartphone. Sur une vie (80 ans), ça fait environ 13 années entières les yeux rivés sur un écran ! 👀' }
        ]
      },
      {
        title: 'L\'IA dans ta vie quotidienne',
        icon: '🤖',
        content: [
          { type: 'paragraph', text: 'Tu utilises de l\'IA des dizaines de fois par jour sans t\'en rendre compte. Elle est devenue invisible tellement elle est intégrée dans nos outils !' },
          { type: 'list', title: '🤖 L\'IA que tu utilises tous les jours :', items: [
            'Correction automatique / prédiction de texte sur ton clavier',
            'Reconnaissance faciale pour déverrouiller ton téléphone',
            'Filtres et effets photo sur Snap et Instagram',
            'Recommandations YouTube, TikTok, Spotify',
            'Google Maps : meilleur itinéraire, trafic en temps réel',
            'Assistants vocaux : Siri, Google Assistant, Alexa',
            'Traduction automatique dans ton navigateur'
          ]},
          { type: 'flashcard-deck', title: 'Termes IA du quotidien', cards: [
            { front: 'Algorithme de recommandation', back: 'Programme qui analyse tes goûts pour te suggérer du contenu (YouTube, TikTok, Spotify)' },
            { front: 'Deepfake', back: 'Vidéo/image truquée par IA. Le visage/voix d\'une personne est remplacé de façon réaliste.' },
            { front: 'Reconnaissance faciale', back: 'IA qui identifie un visage en analysant ses caractéristiques uniques (yeux, nez, bouche).' },
            { front: 'NLP', back: 'Natural Language Processing — IA qui comprend et génère du langage humain (ChatGPT, Siri).' }
          ]},
          { type: 'analogy', text: '🎯 L\'algorithme de TikTok, c\'est comme un ami qui te connaît super bien. Il observe ce que tu regardes, ce que tu likes, combien de temps tu restes sur une vidéo... et il te propose du contenu qu\'il pense que tu vas aimer.' },
          { type: 'highlight', text: 'Les "deepfakes" sont des vidéos ou images créées par l\'IA où le visage/la voix d\'une personne est remplacé(e). C\'est bluffant, mais ça peut servir à de la désinformation. Vérifie toujours tes sources !' },
          { type: 'fun-fact', text: 'L\'IA de TikTok analyse plus de 30 signaux pour chaque vidéo : temps de visionnage, partages, pauses, replay, et même la musique. Elle sait ce que tu veux voir avant toi ! 🧠' }
        ]
      },
      {
        title: 'Tes données personnelles',
        icon: '📊',
        content: [
          { type: 'paragraph', text: 'Tes données personnelles, c\'est l\'or du 21e siècle. Les entreprises les collectent, les analysent et les monétisent. Comprendre ça, c\'est le premier pas pour reprendre le contrôle !' },
          { type: 'list', title: '📊 Ce que les applis savent sur toi :', items: [
            'Ta position GPS à chaque instant',
            'Tes recherches Google (toutes, même celles que tu supprimes)',
            'Tes contacts, tes e-mails',
            'Tes habitudes : heures de réveil, de coucher, de sport...',
            'Tes achats en ligne',
            'Tes photos et vidéos (et les métadonnées : lieu, date, appareil)'
          ]},
          { type: 'true-false', title: 'Vrai ou Faux — Données personnelles', statements: [
            { text: 'Le mode incognito protège entièrement ta vie privée', answer: false, explanation: 'Le mode incognito ne garde pas l\'historique local, mais ton FAI et les sites voient quand même ton activité.' },
            { text: 'Le RGPD te donne le droit de demander la suppression de tes données', answer: true, explanation: 'Le RGPD européen te donne le droit d\'accès, de modification ET de suppression de tes données.' },
            { text: 'Google stocke tes recherches même si tu les supprimes de ton historique', answer: true, explanation: 'La suppression côté utilisateur n\'efface pas les données côté serveur de Google.' }
          ]},
          { type: 'analogy', text: '🏠 Imagine qu\'un inconnu te suive partout, note tout ce que tu fais, tout ce que tu achètes, tout ce que tu dis, et vende ces infos à des entreprises. C\'est un peu ce que font les applis qui collectent tes données !' },
          { type: 'list', title: '🔐 Comment protéger tes données :', items: [
            'Lis les permissions demandées par les applis avant de les accepter !',
            'Désactive la localisation pour les applis qui n\'en ont pas besoin',
            'Utilise des moteurs de recherche respectueux (DuckDuckGo)',
            'Vérifie tes paramètres de confidentialité sur chaque réseau social',
            'Le RGPD (en Europe) te donne le droit de demander la suppression de tes données'
          ]},
          { type: 'highlight', text: 'En Europe, le RGPD te donne des droits : accès, modification et suppression de tes données personnelles. Tu peux demander à n\'importe quelle entreprise de supprimer ce qu\'elle sait sur toi !' },
          { type: 'fun-fact', text: 'Google stocke environ 5 exaoctets (5 milliards de Go) de données sur ses utilisateurs. Si tu gravais tout ça sur des DVD et les empilais, la pile ferait 250 km de haut ! 🏔️' }
        ]
      }
    ],
    quiz: [
      { question: 'Pourquoi beaucoup d\'applis sont-elles gratuites ?', options: ['Par générosité', 'Parce qu\'elles vendent tes données et de la pub', 'Le gouvernement les finance', 'Elles n\'ont pas de frais'], correct: 1, explanation: 'La plupart des applis gratuites se financent en collectant tes données personnelles pour vendre de la publicité ciblée.' },
      { question: 'Qu\'est-ce qu\'un deepfake ?', options: ['Un jeu vidéo', 'Un filtre photo basique', 'Une vidéo/image truquée par IA', 'Un type de virus'], correct: 2, explanation: 'Les deepfakes sont des contenus (vidéo, audio, image) générés ou modifiés par l\'IA de manière très réaliste.' },
      { question: 'Qu\'est-ce que le RGPD ?', options: ['Un réseau social', 'Un règlement européen sur la protection des données', 'Un type d\'IA', 'Un langage de programmation'], correct: 1, explanation: 'Le RGPD (Règlement Général sur la Protection des Données) est la loi européenne qui protège tes données personnelles.' },
      { question: 'Combien de capteurs contient un smartphone moderne ?', options: ['1-2 capteurs', '3-5 capteurs', 'Plus de 10 capteurs', '0 capteur'], correct: 2, explanation: 'Un smartphone contient de nombreux capteurs : GPS, accéléromètre, gyroscope, boussole, proximité, luminosité, baromètre, et plus !' },
      { question: 'L\'ordinateur d\'Apollo 11 vs ton smartphone...', options: ['Apollo 11 était plus puissant', 'Ils sont à peu près égaux', 'Ton smartphone est 100 000x+ plus puissant', 'On ne peut pas comparer'], correct: 2, explanation: 'L\'ordinateur d\'Apollo 11 avait 74 Ko de RAM. Ton smartphone en a ~8 Go, soit environ 100 000 fois plus !' },
      { question: 'Quelle est la meilleure façon de protéger tes données sur une appli ?', options: ['Accepter toutes les permissions', 'Vérifier et limiter les permissions demandées', 'Ne jamais utiliser d\'applis', 'Changer de téléphone souvent'], correct: 1, explanation: 'Vérifie toujours les permissions demandées et n\'accorde que celles vraiment nécessaires au fonctionnement de l\'appli.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 3 — Les Réseaux & Internet (Tier 2)
     ═══════════════════════════════════════════════════ */
  const networks = {
    id: 'networks',
    title: 'Les Réseaux & Internet',
    icon: '🌐',
    color: '#8b5cf6',
    tier: 2,
    requiredModules: ['hardware'],
    description: 'Comprends comment les ordinateurs communiquent entre eux, du réseau local jusqu\'à Internet',
    lessons: [
      {
        title: 'C\'est quoi un réseau ?',
        icon: '🔗',
        content: [
          { type: 'paragraph', text: 'Un réseau informatique, c\'est simplement un groupe d\'appareils connectés entre eux pour partager des informations. C\'est comme un groupe WhatsApp, mais pour les machines !' },
          { type: 'analogy', text: '🏠 Le réseau local (LAN), c\'est comme ta maison : tous les appareils (PC, téléphone, console) sont connectés à ta box Internet par Wi-Fi ou câble Ethernet. Ils peuvent se "voir" et communiquer.' },
          { type: 'analogy', text: '🌍 Internet (WAN), c\'est comme la Poste mondiale : il connecte des milliards d\'appareils partout sur la planète. Chaque appareil a une adresse (IP) pour recevoir et envoyer des données.' },
          { type: 'flashcard-deck', title: 'Vocabulaire réseau', cards: [
            { front: 'LAN', back: 'Local Area Network — Réseau local (ta maison, ton école)' },
            { front: 'WAN', back: 'Wide Area Network — Réseau étendu (Internet)' },
            { front: 'IP', back: 'Internet Protocol — Adresse unique qui identifie ton appareil sur le réseau' },
            { front: 'DNS', back: 'Domain Name System — L\'annuaire d\'Internet (traduit les noms en adresses IP)' },
            { front: 'Routeur', back: 'Dirige le trafic entre ton réseau local et Internet' },
            { front: 'Ethernet', back: 'Connexion filaire par câble RJ45, plus stable que le Wi-Fi' }
          ]},
          { type: 'list', title: 'Les équipements réseau :', items: [
            'Routeur/Box — dirige le trafic entre ton réseau et Internet',
            'Switch — connecte les appareils entre eux dans un même réseau',
            'Point d\'accès Wi-Fi — permet la connexion sans fil',
            'Câble Ethernet (RJ45) — connexion filaire, plus rapide et stable',
            'Fibre optique — transmet les données par la lumière, ultra rapide !'
          ]},
          { type: 'fun-fact', text: 'Il y a plus de 500 câbles sous-marins (des câbles de fibre optique posés au fond des océans !) qui relient les continents entre eux. Certains font plus de 20 000 km ! 🌊' },
          { type: 'highlight', text: 'Ton adresse IP, c\'est comme ton adresse postale sur Internet. Elle permet aux autres machines de savoir où t\'envoyer les données.' }
        ]
      },
      {
        title: 'Comment fonctionne Internet ?',
        icon: '🚀',
        content: [
          { type: 'paragraph', text: 'Quand tu tapes "youtube.com" dans ton navigateur, il se passe plein de choses en quelques millisecondes !' },
          { type: 'drag-sort', question: 'Remets dans l\'ordre le voyage d\'une page web :', items: [
            'Tu tapes l\'adresse dans le navigateur',
            'Le DNS traduit le nom en adresse IP',
            'Ton PC envoie une requête HTTP au serveur',
            'Les routeurs relaient les paquets sur le réseau',
            'Le serveur reçoit et prépare la réponse',
            'Le serveur renvoie les données en paquets',
            'Ton navigateur assemble et affiche la page'
          ]},
          { type: 'analogy', text: '📞 Le DNS, c\'est l\'annuaire d\'Internet. Tu connais le nom (youtube.com) mais pas le "numéro de téléphone" (adresse IP). Le DNS le cherche pour toi !' },
          { type: 'analogy', text: '📦 Les données ne voyagent pas en un seul morceau. Elles sont découpées en petits "paquets" (comme des lettres séparées) qui peuvent prendre des chemins différents et se recombinent à l\'arrivée.' },
          { type: 'fun-fact', text: 'Un paquet de données peut traverser le monde entier en moins de 100 millisecondes. C\'est plus rapide qu\'un clignement d\'œil (300 ms) ! ⚡' },
          { type: 'highlight', text: 'HTTPS (le cadenas 🔒 dans l\'adresse) signifie que la connexion est chiffrée. Personne ne peut lire tes données entre ton ordi et le serveur !' },
          { type: 'mini-terminal', title: 'Essaie des commandes réseau !', commands: {
            'ping google.com': 'PING google.com (142.250.74.238)\n64 bytes: icmp_seq=1 ttl=118 time=12.4 ms\n64 bytes: icmp_seq=2 ttl=118 time=11.8 ms\n--- 4 packets transmitted, 4 received, 0% loss ---',
            'nslookup youtube.com': 'Server:  dns.google\nAddress: 8.8.8.8\n\nName:    youtube.com\nAddress: 142.250.179.110',
            'traceroute google.com': '1  192.168.1.1 (box) 1.2ms\n2  10.0.0.1 (FAI) 8.5ms\n3  72.14.194.65 (Paris) 12.1ms\n4  142.250.74.238 (google.com) 14.3ms\n--- Trace complete ---',
            'ipconfig': 'Adaptateur Wi-Fi :\n  Adresse IPv4 : 192.168.1.42\n  Masque : 255.255.255.0\n  Passerelle : 192.168.1.1',
            'help': 'Commandes disponibles :\n  ping <site>      — Tester la connexion\n  nslookup <site>  — Trouver l\'IP d\'un site\n  traceroute <site> — Voir le chemin réseau\n  ipconfig         — Voir ta config réseau'
          }}
        ]
      },
      {
        title: 'Le Wi-Fi et le Cloud',
        icon: '☁️',
        content: [
          { type: 'paragraph', text: 'Le Wi-Fi et le Cloud sont deux technologies qu\'on utilise tous les jours sans forcément comprendre comment ça marche !' },
          { type: 'analogy', text: '📡 Le Wi-Fi, c\'est un peu comme une radio : ta box émet un signal invisible (des ondes radio) que tes appareils captent. Plus tu es loin, plus le signal est faible, comme quand tu t\'éloignes d\'une enceinte.' },
          { type: 'list', title: 'Wi-Fi : les bandes de fréquence :', items: [
            '2.4 GHz — va loin, traverse bien les murs, mais plus lent',
            '5 GHz — plus rapide, mais portée plus courte',
            '6 GHz (Wi-Fi 6E) — encore plus rapide, technologie récente'
          ]},
          { type: 'true-false', title: 'Vrai ou Faux — Wi-Fi & Cloud', statements: [
            { text: 'Le Cloud stocke tes données dans un vrai nuage', answer: false, explanation: 'Le Cloud, ce sont des serveurs physiques bien réels dans des data centers.' },
            { text: 'Le Wi-Fi 5 GHz est plus rapide que le 2.4 GHz', answer: true, explanation: 'Le 5 GHz offre plus de débit, mais avec une portée réduite.' },
            { text: 'Un data center Google consomme autant qu\'une ville de 100 000 habitants', answer: true, explanation: 'Les grands data centers ont une consommation électrique énorme et nécessitent des systèmes de refroidissement massifs.' }
          ]},
          { type: 'paragraph', text: 'Le Cloud ("nuage"), ce n\'est pas de la magie : ce sont tout simplement des serveurs (de gros ordinateurs surpuissants) rangés dans des data centers, accessibles via Internet.' },
          { type: 'analogy', text: '🏗️ Un data center, c\'est comme un énorme entrepôt rempli d\'ordinateurs qui tournent 24h/24. Google, Amazon, Microsoft... ils en ont des centaines partout dans le monde.' },
          { type: 'fun-fact', text: 'Un data center de Google consomme autant d\'électricité qu\'une ville de 100 000 habitants ! Ils utilisent même l\'eau de mer pour refroidir leurs serveurs 🌊' },
          { type: 'highlight', text: 'Quand on dit "Mes fichiers sont dans le Cloud", ça veut simplement dire qu\'ils sont stockés sur le disque dur d\'un serveur quelque part dans le monde, accessible via Internet.' }
        ]
      }
    ],
    quiz: [
      { question: 'Que fait le DNS ?', options: ['Bloque les virus', 'Traduit les noms de domaine en adresses IP', 'Stocke les fichiers', 'Accélère le Wi-Fi'], correct: 1, explanation: 'Le DNS est l\'annuaire d\'Internet : il traduit "youtube.com" en adresse IP compréhensible par les machines.' },
      { question: 'Qu\'est-ce qu\'un réseau local (LAN) ?', options: ['Internet', 'Un réseau d\'appareils connectés localement', 'Un satellite', 'Un câble sous-marin'], correct: 1, explanation: 'Un LAN (Local Area Network) relie les appareils d\'un même lieu : maison, bureau, école...' },
      { question: 'Le Cloud, c\'est concrètement...', options: ['Un nuage de données flottant', 'Des serveurs dans des data centers', 'Un satellite en orbite', 'Un disque dur portable'], correct: 1, explanation: 'Le Cloud ce sont des serveurs physiques bien réels, installés dans d\'immenses data centers.' },
      { question: 'Quelle bande Wi-Fi a la meilleure portée ?', options: ['5 GHz', '2.4 GHz', '6 GHz', 'Bluetooth'], correct: 1, explanation: 'Le 2.4 GHz porte plus loin et traverse mieux les murs, même si le 5 GHz est plus rapide.' },
      { question: 'Que signifie HTTPS ?', options: ['Connexion rapide', 'Connexion chiffrée et sécurisée', 'Connexion gratuite', 'Connexion Wi-Fi'], correct: 1, explanation: 'Le S de HTTPS signifie "Secure" : tes données sont chiffrées pendant le transport.' },
      { question: 'Comment naviguent les données sur Internet ?', options: ['En un seul bloc', 'Découpées en paquets', 'Par satellite uniquement', 'Par Bluetooth'], correct: 1, explanation: 'Les données sont découpées en paquets qui voyagent indépendamment et se recombinent à l\'arrivée.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 4 — Le Développement & l'IA (Tier 2)
     ═══════════════════════════════════════════════════ */
  const dev = {
    id: 'dev',
    title: "Le Développement & l'IA",
    icon: '💻',
    color: '#22c55e',
    tier: 2,
    requiredModules: ['hardware'],
    description: 'Découvre comment on crée des logiciels, des sites web et comment fonctionne l\'intelligence artificielle',
    lessons: [
      {
        title: 'C\'est quoi le code ?',
        icon: '📝',
        content: [
          { type: 'paragraph', text: 'Coder, c\'est donner des instructions à un ordinateur dans un langage qu\'il comprend. C\'est un peu comme écrire une recette de cuisine ultra précise !' },
          { type: 'analogy', text: '🍳 Imagine que tu expliques à un robot comment faire un gâteau. Tu ne peux pas dire "Mets de la farine". Tu dois dire "Prends le paquet de farine sur l\'étagère 3, ouvre-le, verse 200 grammes dans le bol bleu". La programmation, c\'est ça : tout détailler !' },
          { type: 'flashcard-deck', title: 'Les langages de programmation', cards: [
            { front: 'Python', back: 'Langage simple et polyvalent. Utilisé pour l\'IA, le web, l\'automatisation. Syntaxe lisible.' },
            { front: 'JavaScript', back: 'Le langage du web. Tourne dans le navigateur. Utilisé pour les sites interactifs et les applis.' },
            { front: 'HTML/CSS', back: 'HTML = structure des pages web. CSS = design et style. Pas des langages de programmation au sens strict.' },
            { front: 'SQL', back: 'Langage pour interroger les bases de données. SELECT, INSERT, UPDATE, DELETE.' },
            { front: 'C/C++', back: 'Langages performants pour les jeux vidéo, systèmes embarqués, OS.' }
          ]},
          { type: 'list', title: 'Les langages les plus populaires :', items: [
            'Python — simple et polyvalent, idéal pour commencer',
            'JavaScript — le langage du web (sites et applis)',
            'HTML/CSS — la structure et le design des pages web',
            'Java — les applis Android, les logiciels d\'entreprise',
            'C/C++ — les jeux vidéo, les systèmes embarqués',
            'SQL — pour gérer les bases de données'
          ]},
          { type: 'fun-fact', text: 'Le premier programme informatique a été écrit en 1843 par Ada Lovelace, une femme ! Elle est considérée comme la première programmeuse de l\'histoire 👩‍💻' },
          { type: 'highlight', text: 'Ce site web que tu utilises en ce moment a été entièrement codé en HTML, CSS et JavaScript. 100% des sites web que tu visites utilisent ces 3 langages !' },
          { type: 'steps', title: 'Comment on écrit un programme (les étapes)', steps: [
            'Comprendre le problème à résoudre 🤔',
            'Imaginer l\'algorithme (la solution, étape par étape) 📝',
            'Choisir le bon langage de programmation 🗣️',
            'Écrire le code dans un éditeur (VS Code par exemple) ⌨️',
            'Tester et déboguer (corriger les erreurs) 🐛',
            'Publier le programme pour que les gens l\'utilisent 🚀'
          ]}
        ]
      },
      {
        title: 'Le développement web',
        icon: '🌐',
        content: [
          { type: 'paragraph', text: 'Le développement web, c\'est la création de sites et d\'applications utilisables dans un navigateur. C\'est divisé en deux parties :' },
          { type: 'list', title: '🎨 Frontend (ce que tu vois) :', items: [
            'HTML — la structure (titres, textes, images, boutons)',
            'CSS — le design (couleurs, polices, animations)',
            'JavaScript — le comportement (clics, animations, logique)'
          ]},
          { type: 'list', title: '⚙️ Backend (ce qui est caché) :', items: [
            'Le serveur — l\'ordinateur qui envoie les pages',
            'La base de données — stocke les utilisateurs, les messages...',
            'L\'API — le "pont" entre le frontend et le backend'
          ]},
          { type: 'drag-match', question: 'Associe chaque technologie à sa catégorie :', pairs: [
            { term: 'HTML', definition: 'Frontend — Structure' },
            { term: 'CSS', definition: 'Frontend — Design' },
            { term: 'JavaScript', definition: 'Frontend — Logique' },
            { term: 'Base de données', definition: 'Backend — Stockage' },
            { term: 'API', definition: 'Backend — Communication' }
          ]},
          { type: 'analogy', text: '🍔 Un site web, c\'est comme un restaurant. Le Frontend, c\'est la salle : le décor, le menu, le serveur qui prend ta commande. Le Backend, c\'est la cuisine : là où le plat est préparé et la recette stockée.' },
          { type: 'highlight', text: 'Un développeur "full-stack", c\'est quelqu\'un qui sait coder le frontend ET le backend. C\'est l\'un des métiers les plus demandés dans l\'informatique !' },
          { type: 'fun-fact', text: 'Le premier site web a été créé en 1991 par Tim Berners-Lee au CERN. Il était tout simple : du texte et des liens, aucune image, aucun style. Aujourd\'hui il y a plus de 2 milliards de sites web ! 🌍' },
          { type: 'diagram', text: '┌──────────────── Navigateur (Frontend) ────────────────┐\n│                                                       │\n│   HTML ──── Structure (titres, textes, boutons)       │\n│   CSS  ──── Design (couleurs, animations)             │\n│   JS   ──── Logique (clics, formulaires)              │\n│                                                       │\n└────────────────────────┬──────────────────────────────┘\n                         │ Requête HTTP\n                         ▼\n┌──────────────── Serveur (Backend) ─────────────────────┐\n│                                                       │\n│   Python/Node.js ──── Logique métier                  │\n│   API            ──── Point d\'entrée des données      │\n│   Base de données ─── Stockage (MySQL, MongoDB...)    │\n│                                                       │\n└───────────────────────────────────────────────────────┘' }
        ]
      },
      {
        title: 'L\'Intelligence Artificielle',
        icon: '🤖',
        content: [
          { type: 'paragraph', text: 'L\'IA est partout : dans les recommandations YouTube, Snapchat, la reconnaissance vocale, les voitures autonomes, la médecine... Mais c\'est quoi exactement ?' },
          { type: 'analogy', text: '🧒 Imagine que tu apprennes à reconnaître un chat. On te montre des milliers de photos de chats et de "pas chats". Au bout d\'un moment, tu sais reconnaître un chat même sur une photo que tu n\'as jamais vue. L\'IA fait exactement ça, mais avec des données numériques !' },
          { type: 'drag-sort', question: 'Remets les étapes du Machine Learning dans l\'ordre :', items: [
            'Collecter des milliers d\'exemples (données)',
            'Préparer et nettoyer les données',
            'Choisir un algorithme / modèle',
            'Entraîner le modèle sur les données',
            'Évaluer la précision du modèle',
            'Déployer le modèle en production'
          ]},
          { type: 'list', title: 'L\'IA dans ta vie quotidienne :', items: [
            'Siri, Alexa, Google Assistant — reconnaissance vocale',
            'Netflix, YouTube, TikTok — recommandations personnalisées',
            'Filtres Instagram/Snap — reconnaissance faciale',
            'Google Traduction — traduction automatique',
            'ChatGPT — IA conversationnelle',
            'Voitures Tesla — conduite assistée'
          ]},
          { type: 'highlight', text: 'L\'IA n\'est pas "intelligente" comme un humain. Elle est très forte pour une tâche précise (reconnaître des images, traduire...) mais ne comprend pas vraiment ce qu\'elle fait. C\'est de l\'intelligence "artificielle" !' },
          { type: 'fun-fact', text: 'GPT-4 (le modèle derrière ChatGPT) a été entraîné sur des billions de mots. Si tu lisais autant de texte, ça te prendrait environ 60 000 ans ! 📚' }
        ]
      }
    ],
    quiz: [
      { question: 'Qu\'est-ce qu\'un algorithme ?', options: ['Un virus informatique', 'Une suite d\'étapes pour résoudre un problème', 'Un langage de programmation', 'Un type de processeur'], correct: 1, explanation: 'Un algorithme est une série d\'instructions logiques et ordonnées pour accomplir une tâche.' },
      { question: 'Quel langage est utilisé par 100% des sites web ?', options: ['Python', 'Java', 'HTML/CSS/JavaScript', 'C++'], correct: 2, explanation: 'Tous les sites web utilisent HTML, CSS et JavaScript.' },
      { question: 'Qui est considéré comme le/la premier(e) programmeur(se) ?', options: ['Steve Jobs', 'Bill Gates', 'Ada Lovelace', 'Alan Turing'], correct: 2, explanation: 'Ada Lovelace a écrit le premier programme informatique en 1843.' },
      { question: 'Qu\'est-ce que le "frontend" d\'un site web ?', options: ['La base de données', 'La partie visible par l\'utilisateur', 'Le serveur', 'Le câble réseau'], correct: 1, explanation: 'Le frontend, c\'est tout ce que l\'utilisateur voit et avec quoi il interagit.' },
      { question: 'Comment une IA apprend-elle à reconnaître des images ?', options: ['On lui donne la réponse', 'On la programme manuellement', 'On l\'entraîne avec des milliers d\'exemples', 'Elle comprend toute seule'], correct: 2, explanation: 'Le Machine Learning consiste à montrer des milliers d\'exemples à l\'IA pour qu\'elle détecte des patterns.' },
      { question: 'Qu\'est-ce qu\'une API ?', options: ['Un type de câble', 'Un pont entre le frontend et le backend', 'Un langage de programmation', 'Un virus'], correct: 1, explanation: 'Une API permet au frontend de communiquer avec le backend pour échanger des données.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 5 — Systèmes d'exploitation (Tier 2) — NEW
     ═══════════════════════════════════════════════════ */
  const os = {
    id: 'os',
    title: "Systèmes d'exploitation",
    icon: '🐧',
    color: '#06b6d4',
    tier: 2,
    requiredModules: ['daily'],
    description: 'Plonge dans le fonctionnement des OS : noyau, processus, mémoire, et le terminal',
    lessons: [
      {
        title: 'Histoire des systèmes d\'exploitation',
        icon: '📜',
        content: [
          { type: 'paragraph', text: 'Les systèmes d\'exploitation ont une histoire fascinante, des cartes perforées aux interfaces tactiles d\'aujourd\'hui !' },
          { type: 'steps', title: 'Frise chronologique des OS', steps: [
            '1956 — GM-NAA I/O : le tout premier OS, pour un ordinateur IBM 🏭',
            '1969 — Unix naît aux Bell Labs, ancêtre de Linux et macOS 🔬',
            '1981 — MS-DOS : Microsoft entre en jeu avec IBM 💾',
            '1984 — Mac OS : Apple révolutionne avec l\'interface graphique 🖱️',
            '1991 — Linux : Linus Torvalds crée un noyau libre et gratuit 🐧',
            '1995 — Windows 95 : la révolution grand public de Microsoft 🪟',
            '2007 — iOS et Android transforment le mobile 📱',
            '2020+ — Cloud OS, conteneurs, et IA intégrée aux OS ☁️'
          ]},
          { type: 'analogy', text: '📖 L\'histoire des OS, c\'est comme l\'évolution des véhicules : on est passé de la charrette à bras (cartes perforées) au vaisseau spatial (OS modernes avec IA).' },
          { type: 'fun-fact', text: 'Le nom "Linux" vient de "Linus + Unix". Linus Torvalds avait d\'abord voulu l\'appeler "Freax" (free + Unix + x), mais l\'admin du serveur FTP a préféré "Linux" ! 🐧' },
          { type: 'highlight', text: 'Unix (1969) est l\'ancêtre de presque tous les OS modernes : macOS, iOS, Android et Linux en descendent tous directement ou indirectement !' }
        ]
      },
      {
        title: 'Architecture d\'un OS',
        icon: '🏗️',
        content: [
          { type: 'paragraph', text: 'Un OS est organisé en couches, comme un gâteau. Chaque couche a un rôle précis et communique avec les autres.' },
          { type: 'interactive-diagram', title: 'Les couches d\'un OS — clique pour explorer', elements: [
            { id: 'apps', label: '📱 Applications', x: 50, y: 10, info: 'Les programmes que tu utilises (navigateur, jeux, bureautique). Ils tournent dans l\'espace utilisateur.' },
            { id: 'shell', label: '💻 Shell / Interface', x: 50, y: 30, info: 'L\'interface entre toi et l\'OS : soit graphique (GUI), soit en ligne de commande (CLI / terminal).' },
            { id: 'syscalls', label: '🔌 Appels système', x: 50, y: 50, info: 'Les "portes" entre les applications et le noyau. Chaque action (ouvrir un fichier, envoyer des données) passe par ici.' },
            { id: 'kernel', label: '⚙️ Noyau (Kernel)', x: 50, y: 70, info: 'Le cœur de l\'OS. Il gère la mémoire, les processus, les fichiers et communique avec le matériel.' },
            { id: 'hw', label: '🖥️ Matériel', x: 50, y: 90, info: 'CPU, RAM, disque, réseau... Le noyau traduit les demandes des applications en instructions matérielles.' }
          ]},
          { type: 'list', title: 'Ce que gère le noyau (kernel) :', items: [
            'Gestion des processus — quel programme tourne quand et combien de temps',
            'Gestion de la mémoire — qui utilise quelle zone de RAM',
            'Système de fichiers — organiser et retrouver les données sur le disque',
            'Pilotes (drivers) — faire communiquer l\'OS avec le matériel',
            'Sécurité — isoler les programmes entre eux et protéger le système'
          ]},
          { type: 'analogy', text: '🏰 Le kernel, c\'est comme le roi dans un château. Les applications sont les villageois : elles ne peuvent pas accéder directement aux ressources (le trésor). Elles doivent demander au roi via les "appels système" (les gardes).' },
          { type: 'fun-fact', text: 'Le noyau Linux contient plus de 30 millions de lignes de code et plus de 15 000 développeurs y contribuent ! C\'est le plus grand projet open source de l\'histoire. 🌍' }
        ]
      },
      {
        title: 'Le terminal et les commandes',
        icon: '⌨️',
        content: [
          { type: 'paragraph', text: 'Le terminal (ou ligne de commande), c\'est l\'outil le plus puissant de l\'informaticien. Avant les interfaces graphiques, TOUT se faisait en ligne de commande !' },
          { type: 'mini-terminal', title: 'Essaie des commandes Linux !', commands: {
            'ls': 'Documents/  Downloads/  Images/  Music/  Desktop/',
            'pwd': '/home/user',
            'cd Documents': 'user@linux:~/Documents$',
            'mkdir projet': '(dossier "projet" créé)',
            'cat hello.txt': 'Bonjour et bienvenue dans le terminal Linux ! 🐧',
            'whoami': 'user',
            'uname -a': 'Linux discovery 6.1.0 #1 SMP x86_64 GNU/Linux',
            'date': 'mer. 05 mars 2026, 14:30:00 CET',
            'echo "Hello World"': 'Hello World',
            'help': 'Commandes disponibles :\n  ls          — Lister les fichiers\n  pwd         — Afficher le répertoire courant\n  cd <dir>    — Changer de répertoire\n  mkdir <dir> — Créer un dossier\n  cat <file>  — Afficher un fichier\n  whoami      — Nom d\'utilisateur\n  uname -a    — Info système\n  date        — Date et heure\n  echo <txt>  — Afficher du texte'
          }},
          { type: 'list', title: 'Commandes essentielles Linux/macOS :', items: [
            'ls — lister les fichiers du dossier courant',
            'cd — changer de répertoire (dossier)',
            'pwd — afficher le chemin du dossier courant',
            'mkdir — créer un nouveau dossier',
            'cp — copier un fichier',
            'mv — déplacer ou renommer un fichier',
            'rm — supprimer un fichier (⚠️ pas de corbeille !)',
            'cat — afficher le contenu d\'un fichier'
          ]},
          { type: 'highlight', text: 'La commande "sudo" (Super User DO) te donne les droits administrateur. C\'est tellement puissant que le dicton dit : "Avec un grand pouvoir vient une grande responsabilité" 🦸' },
          { type: 'fun-fact', text: 'Le terminal est plus rapide que l\'interface graphique pour beaucoup de tâches ! Un administrateur système expérimenté peut modifier des centaines de fichiers en une seule commande. 🚀' }
        ]
      },
      {
        title: 'Linux vs Windows vs macOS',
        icon: '⚔️',
        content: [
          { type: 'paragraph', text: 'Les trois principaux systèmes d\'exploitation de bureau ont chacun leurs forces et leurs faiblesses. Aucun n\'est "le meilleur" — ça dépend de l\'usage !' },
          { type: 'drag-match', question: 'Associe chaque caractéristique à son OS :', pairs: [
            { term: 'Open source et gratuit', definition: 'Linux' },
            { term: 'Écosystème Apple intégré', definition: 'macOS' },
            { term: 'Compatibilité logiciels/jeux max', definition: 'Windows' },
            { term: '96% des serveurs web', definition: 'Linux' },
            { term: 'DirectX et Xbox Game Pass', definition: 'Windows' },
            { term: 'Basé sur Unix (BSD)', definition: 'macOS' }
          ]},
          { type: 'list', title: '🪟 Windows — Points forts', items: [
            'Le plus compatible (logiciels, jeux, périphériques)',
            'Le plus utilisé en entreprise (Active Directory)',
            'Parfait pour le gaming (DirectX, Xbox Game Pass)'
          ]},
          { type: 'list', title: '🍎 macOS — Points forts', items: [
            'Excellent pour le créatif (photo, vidéo, musique)',
            'Intégration parfaite avec iPhone/iPad/Apple Watch',
            'Interface élégante et stable'
          ]},
          { type: 'list', title: '🐧 Linux — Points forts', items: [
            'Gratuit et open source (modifiable à l\'infini)',
            'Le roi des serveurs et du cloud',
            'Léger — peut faire revivre un vieil ordinateur',
            'Sécurisé — très peu de virus'
          ]},
          { type: 'fun-fact', text: 'Il existe plus de 600 distributions ("distros") Linux différentes ! Ubuntu, Fedora, Arch, Debian, Mint... Il y a même une distro appelée "Hannah Montana Linux" avec un thème rose 🎵' }
        ]
      }
    ],
    quiz: [
      { question: 'Quel est l\'ancêtre commun de Linux et macOS ?', options: ['Windows', 'MS-DOS', 'Unix', 'Android'], correct: 2, explanation: 'Unix (1969) est l\'ancêtre de Linux (fork) et macOS (basé sur BSD, un descendant d\'Unix).' },
      { question: 'Que fait le noyau (kernel) d\'un OS ?', options: ['Affiche l\'interface graphique', 'Gère le matériel et les processus', 'Navigue sur Internet', 'Joue de la musique'], correct: 1, explanation: 'Le kernel est le cœur de l\'OS : il gère la mémoire, les processus, le stockage et la communication avec le matériel.' },
      { question: 'Que fait la commande "ls" dans un terminal Linux ?', options: ['Éteindre l\'ordinateur', 'Lister les fichiers', 'Supprimer un fichier', 'Installer un programme'], correct: 1, explanation: '"ls" (list) affiche la liste des fichiers et dossiers du répertoire courant.' },
      { question: 'Quel OS est open source et gratuit ?', options: ['Windows', 'macOS', 'Linux', 'iOS'], correct: 2, explanation: 'Linux est entièrement open source et gratuit. Son code est modifiable par n\'importe qui.' },
      { question: 'Pour quel usage macOS est-il particulièrement réputé ?', options: ['Le gaming', 'La création (photo/vidéo/musique)', 'Les serveurs web', 'L\'administration réseau'], correct: 1, explanation: 'macOS et les Mac sont très populaires chez les créatifs grâce à des apps comme Final Cut, Logic Pro, et l\'écosystème Apple.' },
      { question: 'Que signifie "sudo" ?', options: ['Super Ultra Driver', 'Super User Do', 'System Upgrade', 'Safe Undo'], correct: 1, explanation: '"sudo" = Super User DO. Il exécute une commande avec les droits administrateur (root).' },
      { question: 'Quel OS domine les serveurs web ?', options: ['Windows (90%)', 'macOS (70%)', 'Linux (96%)', 'ChromeOS (80%)'], correct: 2, explanation: 'Linux fait tourner environ 96% des serveurs web grâce à sa stabilité, sa sécurité et sa gratuité.' },
      { question: 'Combien de lignes de code contient le noyau Linux ?', options: ['100 000', '1 million', '30+ millions', '1 milliard'], correct: 2, explanation: 'Le noyau Linux contient plus de 30 millions de lignes de code, contribuées par plus de 15 000 développeurs.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 6 — Cybersécurité (Tier 3)
     ═══════════════════════════════════════════════════ */
  const security = {
    id: 'security',
    title: 'Cybersécurité',
    icon: '🔒',
    color: '#ef4444',
    tier: 3,
    requiredModules: ['networks', 'dev'],
    description: 'Apprends à te protéger sur Internet : mots de passe, phishing, arnaques et bonnes pratiques',
    lessons: [
      {
        title: 'Les menaces en ligne',
        icon: '⚠️',
        content: [
          { type: 'paragraph', text: 'Internet c\'est génial, mais c\'est aussi un terrain de jeu pour les cybercriminels. Voici les menaces les plus courantes dont tu dois te méfier :' },
          { type: 'list', title: '🦠 Les types de menaces :', items: [
            'Virus/Malware — des programmes malveillants qui infectent ton ordi',
            'Phishing — de faux e-mails/sites qui imitent des vrais pour voler tes données',
            'Ransomware — un virus qui bloque tous tes fichiers et demande une rançon',
            'Spyware — un programme espion qui enregistre ce que tu fais',
            'Ingénierie sociale — manipuler les gens pour obtenir des informations'
          ]},
          { type: 'flashcard-deck', title: 'Types de cyberattaques', cards: [
            { front: 'Phishing', back: 'Faux e-mails/sites qui imitent des vrais pour voler tes données personnelles.' },
            { front: 'Ransomware', back: 'Virus qui chiffre tes fichiers et demande une rançon (en Bitcoin) pour les débloquer.' },
            { front: 'DDoS', back: 'Distributed Denial of Service — Submerger un serveur de requêtes pour le faire tomber.' },
            { front: 'Man-in-the-Middle', back: 'Un attaquant intercepte les communications entre toi et un serveur sans que tu le saches.' },
            { front: 'Zero-Day', back: 'Faille de sécurité inconnue de l\'éditeur, exploitée avant qu\'un correctif existe.' }
          ]},
          { type: 'analogy', text: '🎣 Le phishing, c\'est comme un pêcheur : il lance un appât (un faux e-mail de ta banque, un faux concours...) et attend que tu mordes à l\'hameçon en cliquant sur le lien et en donnant tes infos.' },
          { type: 'highlight', text: 'En 2025, un e-mail sur 100 est une tentative de phishing. Les cybercriminels deviennent de plus en plus doués !' },
          { type: 'fun-fact', text: 'Le premier virus informatique connu s\'appelait "Creeper" (1971). Il affichait juste le message "I\'m the creeper, catch me if you can!" 🕹️' }
        ]
      },
      {
        title: 'Mots de passe et authentification',
        icon: '🔑',
        content: [
          { type: 'paragraph', text: 'Ton mot de passe, c\'est la clé de ta vie numérique. Un mauvais mot de passe, c\'est comme une porte d\'entrée ouverte !' },
          { type: 'list', title: '❌ Les pires mots de passe :', items: [
            '123456 — le mot de passe le plus utilisé au monde !',
            'password, motdepasse',
            'Ton prénom, ta date de naissance',
            'Le nom de ton animal de compagnie',
            'azerty ou qwerty'
          ]},
          { type: 'list', title: '✅ Un bon mot de passe doit :', items: [
            'Faire au moins 12 caractères',
            'Mélanger majuscules, minuscules, chiffres et symboles',
            'Être différent pour chaque site/service',
            'Ne pas contenir d\'infos personnelles évidentes'
          ]},
          { type: 'interactive-reveal', question: 'Quel mot de passe est le plus sécurisé ? (clique pour vérifier)', options: [
            { text: '123456', revealed: '❌ C\'est le mot de passe le plus utilisé au monde ! Un hacker le craque en moins d\'1 seconde.' },
            { text: 'MonChat2024', revealed: '⚠️ Mieux, mais les infos personnelles (nom d\'animal, année) sont faciles à deviner.' },
            { text: 'K9#mP$2x!Lq4', revealed: '✅ Excellent ! Long (12 car.), complexe et aléatoire. Utilise un gestionnaire de mots de passe !' },
            { text: 'MonChienAdore3Tacos!', revealed: '✅ Super choix ! C\'est une "phrase de passe" : longue, mémorisable et avec des caractères variés.' }
          ]},
          { type: 'highlight', text: 'Astuce : utilise une "phrase de passe" ! Par exemple : "MonChatMange3Pizzas!" est un excellent mot de passe.' },
          { type: 'paragraph', text: 'La double authentification (2FA) ajoute une deuxième vérification : un code par SMS, une notification sur ton téléphone, ou une clé de sécurité.' },
          { type: 'fun-fact', text: 'Un mot de passe de 6 lettres minuscules peut être craqué en 10 secondes. Avec 12 caractères mixtes ? Plusieurs milliers d\'années ! 🔐' }
        ]
      },
      {
        title: 'Se protéger au quotidien',
        icon: '🛡️',
        content: [
          { type: 'paragraph', text: 'La cybersécurité n\'est pas réservée aux experts. Voici des réflexes simples pour te protéger au quotidien :' },
          { type: 'list', title: '🛡️ Les bonnes pratiques :', items: [
            'Mets toujours à jour ton OS, tes applis et ton navigateur',
            'Ne clique pas sur les liens dans les e-mails suspects',
            'Vérifie l\'URL avant de rentrer un mot de passe (le cadenas 🔒)',
            'Active la double authentification partout où c\'est possible',
            'Ne télécharge que depuis des sources officielles',
            'Fais des sauvegardes régulières de tes fichiers importants'
          ]},
          { type: 'true-false', title: 'Bonnes pratiques — Vrai ou Faux ?', statements: [
            { text: 'Un antivirus suffit à te protéger à 100%', answer: false, explanation: 'Aucun antivirus n\'est parfait. La meilleure protection c\'est la vigilance + antivirus + mises à jour.' },
            { text: 'Les mises à jour corrigent des failles de sécurité', answer: true, explanation: 'Les mises à jour patchent des vulnérabilités que les hackers pourraient exploiter.' },
            { text: 'Un réseau Wi-Fi public est aussi sûr que ton Wi-Fi maison', answer: false, explanation: 'Les Wi-Fi publics ne sont pas chiffrés — n\'importe qui sur le réseau peut potentiellement voir ton trafic.' },
            { text: 'Le cadenas 🔒 dans l\'URL garantit que le site est légitime', answer: false, explanation: 'Le cadenas signifie que la connexion est chiffrée (HTTPS), mais un site de phishing peut aussi avoir un cadenas !' }
          ]},
          { type: 'analogy', text: '🚗 La cybersécurité, c\'est comme la ceinture de sécurité en voiture. Tu ne la mets pas parce que tu penses avoir un accident à chaque trajet, mais parce que le jour où ça arrive, elle peut te sauver.' },
          { type: 'fun-fact', text: 'En moyenne, une cyberattaque a lieu toutes les 39 secondes dans le monde. Mais 90% d\'entre elles pourraient être évitées avec de bonnes pratiques simples ! 🛡️' },
          { type: 'highlight', text: 'Les mises à jour de sécurité ne sont pas là pour t\'embêter ! Elles corrigent des failles que les hackers peuvent exploiter. Mets-les le plus vite possible !' }
        ]
      }
    ],
    quiz: [
      { question: 'Qu\'est-ce que le phishing ?', options: ['Un jeu de pêche en ligne', 'Une technique d\'arnaque par faux e-mails/sites', 'Un logiciel antivirus', 'Un type de réseau Wi-Fi'], correct: 1, explanation: 'Le phishing utilise de faux e-mails ou sites web pour te piéger et voler tes données personnelles.' },
      { question: 'Quel est le meilleur mot de passe parmi ceux-ci ?', options: ['123456', 'MonPrénom2010', 'MonChatMange3Pizzas!', 'password'], correct: 2, explanation: '"MonChatMange3Pizzas!" est long, contient majuscules, minuscules, chiffre et symbole.' },
      { question: 'Que fait un ransomware ?', options: ['Il accélère ton PC', 'Il bloque tes fichiers et demande une rançon', 'Il protège contre les virus', 'Il améliore le Wi-Fi'], correct: 1, explanation: 'Un ransomware chiffre tous tes fichiers et demande de l\'argent pour les débloquer.' },
      { question: 'Qu\'est-ce que la double authentification (2FA) ?', options: ['Deux mots de passe', 'Un deuxième facteur de vérification', 'Deux antivirus', 'Un double pare-feu'], correct: 1, explanation: 'Le 2FA ajoute une 2e couche : en plus du mot de passe, tu dois confirmer par un code SMS, une appli ou une clé.' },
      { question: 'Quelle est la meilleure attitude face à un e-mail suspect ?', options: ['L\'ouvrir pour vérifier', 'Cliquer sur le lien pour voir', 'Le supprimer ou le signaler', 'Le transférer à un ami'], correct: 2, explanation: 'Ne clique jamais sur les liens d\'un e-mail suspect. Supprime-le ou signale-le.' },
      { question: 'Pourquoi les mises à jour sont-elles importantes ?', options: ['Pour changer le look', 'Pour corriger des failles de sécurité', 'Pour ralentir l\'ordi', 'Pour ajouter de la pub'], correct: 1, explanation: 'Les mises à jour corrigent des failles de sécurité que les hackers pourraient exploiter.' },
      { question: 'Le cadenas HTTPS dans l\'URL garantit...', options: ['Que le site est légitime', 'Que la connexion est chiffrée', 'Que le site est gratuit', 'Que le site est rapide'], correct: 1, explanation: 'HTTPS signifie que la connexion est chiffrée, mais un site de phishing peut aussi utiliser HTTPS.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 7 — L'informatique en entreprise (Tier 3)
     ═══════════════════════════════════════════════════ */
  const enterprise = {
    id: 'enterprise',
    title: "L'informatique en entreprise",
    icon: '🏢',
    color: '#f59e0b',
    tier: 3,
    requiredModules: ['networks', 'os'],
    description: 'Découvre comment fonctionne un service informatique dans une entreprise, les métiers et l\'infrastructure',
    lessons: [
      {
        title: 'Le service informatique',
        icon: '🏗️',
        content: [
          { type: 'paragraph', text: 'Toutes les entreprises ont besoin d\'un service IT. Une usine, un hôpital, une banque... tous dépendent de l\'informatique pour fonctionner !' },
          { type: 'analogy', text: '🏥 Le service informatique, c\'est comme les médecins d\'un hôpital. Sans eux, l\'hôpital ne fonctionne pas. C\'est pareil : sans le service IT, les employés ne peuvent ni travailler, ni communiquer.' },
          { type: 'list', title: 'Ce que gère le service informatique :', items: [
            'Les ordinateurs et postes de travail de tous les employés',
            'Les serveurs qui stockent les fichiers et les applications',
            'Le réseau (Internet, Wi-Fi, câbles, sécurité)',
            'Les logiciels et licences',
            'La sécurité (antivirus, pare-feu, sauvegardes)',
            'Le support technique (aider les utilisateurs)'
          ]},
          { type: 'fun-fact', text: 'Dans une entreprise de 200 personnes, le service informatique peut recevoir plus de 50 demandes d\'aide par jour ! 🖨️' },
          { type: 'highlight', text: 'Un informaticien en entreprise ne fait pas que "réparer des PC". C\'est un métier très varié : architecture réseau, sécurité, développement, gestion de projet, et bien plus !' }
        ]
      },
      {
        title: 'Les tickets et le support',
        icon: '🎫',
        content: [
          { type: 'paragraph', text: 'Quand un employé a un problème informatique, il crée un "ticket" : une demande enregistrée dans un logiciel spécialisé.' },
          { type: 'analogy', text: '🎟️ C\'est comme prendre un ticket au guichet de la Poste. Tu décris ton problème, et le ticket est attribué à un technicien.' },
          { type: 'drag-sort', question: 'Remets les niveaux de support dans l\'ordre (du plus basique au plus expert) :', items: [
            'Niveau 1 (L1) — Helpdesk : premiers diagnostics, problèmes simples',
            'Niveau 2 (L2) — Techniciens spécialisés : problèmes complexes',
            'Niveau 3 (L3) — Experts/ingénieurs : problèmes critiques et architecture'
          ]},
          { type: 'list', title: 'Les niveaux de priorité :', items: [
            '🔴 Urgente — L\'entreprise ne peut plus travailler',
            '🟠 Haute — Un service entier est impacté',
            '🟡 Moyenne — Un employé ne peut pas faire une tâche',
            '🟢 Basse — Demandes de changement, nouvelles installations'
          ]},
          { type: 'fun-fact', text: 'La phrase la plus entendue par les techniciens IT : "Avez-vous essayé d\'éteindre et de rallumer ?" Et ça résout réellement 50% des problèmes ! 🔄' },
          { type: 'highlight', text: 'Un bon ticket contient : une description claire, les étapes pour reproduire le problème, des captures d\'écran, et le numéro de poste.' }
        ]
      },
      {
        title: 'Les métiers de l\'informatique',
        icon: '👨‍💻',
        content: [
          { type: 'paragraph', text: 'L\'informatique offre une incroyable diversité de métiers. Que tu aimes la technique, le design, la stratégie ou la communication, il y a un métier IT pour toi !' },
          { type: 'drag-match', question: 'Associe chaque métier à sa mission :', pairs: [
            { term: 'Développeur', definition: 'Crée des logiciels et applications' },
            { term: 'Admin système', definition: 'Gère les serveurs et les OS' },
            { term: 'DevOps', definition: 'Automatise les déploiements' },
            { term: 'Data analyst', definition: 'Analyse les données' },
            { term: 'UX Designer', definition: 'Conçoit les interfaces utilisateur' },
            { term: 'Pentester', definition: 'Teste la sécurité en attaquant' }
          ]},
          { type: 'list', title: '🧑‍💻 Les principaux métiers IT :', items: [
            'Développeur — crée des logiciels et applications',
            'Administrateur système — gère les serveurs et les OS',
            'Administrateur réseau — configure et surveille le réseau',
            'Technicien support — aide les utilisateurs au quotidien',
            'Ingénieur cybersécurité — protège contre les attaques',
            'Chef de projet IT — coordonne les projets informatiques',
            'Data analyst — analyse les données de l\'entreprise',
            'DevOps — automatise les déploiements et l\'infrastructure',
            'UX/UI Designer — conçoit les interfaces utilisateur',
            'Architecte cloud — conçoit l\'infrastructure cloud'
          ]},
          { type: 'highlight', text: 'Le métier de développeur est le 2e métier le plus recherché en France. En 2025, il manque plus de 80 000 profils IT ! 🚀' },
          { type: 'fun-fact', text: 'Le salaire médian d\'un ingénieur cybersécurité en France est d\'environ 50 000€ par an en début de carrière ! 💰' }
        ]
      }
    ],
    quiz: [
      { question: 'Pourquoi une usine a-t-elle besoin d\'un service IT ?', options: ['Pour vendre des ordinateurs', 'Pour gérer les systèmes et le réseau', 'Pour faire de la pub', 'Elle n\'en a pas besoin'], correct: 1, explanation: 'Toute entreprise dépend de l\'informatique : e-mails, fichiers, logiciels métier, réseau, sécurité...' },
      { question: 'Qu\'est-ce qu\'un ticket informatique ?', options: ['Un billet de concert', 'Une demande d\'aide enregistrée', 'Un code promo', 'Un virus'], correct: 1, explanation: 'Un ticket est une demande formelle créée dans un outil spécialisé pour signaler un problème IT.' },
      { question: 'Quel niveau de support gère les problèmes les plus complexes ?', options: ['Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 0'], correct: 2, explanation: 'Le Niveau 3 regroupe les experts qui traitent les problèmes les plus critiques et complexes.' },
      { question: 'Que fait un DevOps ?', options: ['Il répare les imprimantes', 'Il automatise les déploiements', 'Il crée des designs', 'Il vend des logiciels'], correct: 1, explanation: 'Le DevOps automatise les tests, les déploiements et la gestion de l\'infrastructure.' },
      { question: 'Quel métier protège l\'entreprise contre les cyberattaques ?', options: ['Développeur', 'Data analyst', 'Support', 'Ingénieur cybersécurité'], correct: 3, explanation: 'L\'ingénieur cybersécurité est spécialisé dans la protection des systèmes et la détection des menaces.' },
      { question: 'Qu\'est-ce qu\'un SLA ?', options: ['Un langage', 'Un calendrier', 'Un contrat de niveaux de service', 'Un logiciel'], correct: 2, explanation: 'Le SLA définit les engagements de délais et de qualité pour résoudre les problèmes IT.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 8 — Bases de données & Big Data (Tier 3) — NEW
     ═══════════════════════════════════════════════════ */
  const databases = {
    id: 'databases',
    title: 'Bases de données & Big Data',
    icon: '🗄️',
    color: '#a855f7',
    tier: 3,
    requiredModules: ['dev', 'os'],
    description: 'Comprends comment les données sont stockées, organisées et analysées à grande échelle',
    lessons: [
      {
        title: 'Qu\'est-ce qu\'une base de données ?',
        icon: '📊',
        content: [
          { type: 'paragraph', text: 'Une base de données (BDD), c\'est un système organisé pour stocker, retrouver et gérer d\'énormes quantités d\'informations de façon fiable et rapide.' },
          { type: 'analogy', text: '📚 Imagine une bibliothèque géante. Sans classement, retrouver un livre prendrait des heures. Avec un bon système (par auteur, titre, genre), tu le trouves en secondes. La BDD fait pareil avec les données numériques !' },
          { type: 'list', title: 'Exemples de données stockées en BDD :', items: [
            'Tes tweets, photos Instagram, messages WhatsApp',
            'Ton panier Amazon, ton historique Netflix',
            'Les dossiers médicaux dans les hôpitaux',
            'Les transactions bancaires',
            'Les notes de ton école',
            'Les articles de Wikipédia'
          ]},
          { type: 'flashcard-deck', title: 'Vocabulaire bases de données', cards: [
            { front: 'Table', back: 'Un ensemble de données organisées en lignes et colonnes (comme un tableau Excel).' },
            { front: 'Ligne/Row', back: 'Un enregistrement unique dans une table (ex: un utilisateur).' },
            { front: 'Colonne/Column', back: 'Un champ de données (ex: nom, email, âge).' },
            { front: 'Clé primaire', back: 'Identifiant UNIQUE qui distingue chaque ligne (ex: ID utilisateur).' },
            { front: 'Index', back: 'Accélérateur de recherche, comme l\'index d\'un livre.' },
            { front: 'SGBD', back: 'Système de Gestion de Base de Données — le logiciel qui gère la BDD (MySQL, PostgreSQL...).' }
          ]},
          { type: 'highlight', text: 'Chaque fois que tu fais une recherche Google, tu interroges des milliards de lignes de données en moins de 0.5 seconde. C\'est la puissance des bases de données !' },
          { type: 'fun-fact', text: 'Facebook stocke plus de 600 téraoctets de données PAR JOUR. C\'est l\'équivalent de 150 millions de photos haute résolution quotidiennement ! 📸' }
        ]
      },
      {
        title: 'SQL — le langage des données',
        icon: '💻',
        content: [
          { type: 'paragraph', text: 'SQL (Structured Query Language) est le langage universel pour parler aux bases de données. Créé en 1974, il est toujours LE standard 50 ans plus tard !' },
          { type: 'mini-terminal', title: 'Essaie des requêtes SQL !', commands: {
            'SELECT * FROM users': '| id | nom      | age | ville    |\n|----|----------|-----|----------|\n| 1  | Alice    | 22  | Paris    |\n| 2  | Bob      | 19  | Lyon     |\n| 3  | Charlie  | 25  | Marseille|\n| 4  | Diana    | 21  | Paris    |\n(4 résultats)',
            'SELECT nom FROM users WHERE ville = \'Paris\'': '| nom   |\n|-------|\n| Alice |\n| Diana |\n(2 résultats)',
            'SELECT COUNT(*) FROM users': '| COUNT(*) |\n|----------|\n| 4        |',
            'SELECT ville, COUNT(*) FROM users GROUP BY ville': '| ville     | COUNT(*) |\n|-----------|----------|\n| Paris     | 2        |\n| Lyon      | 1        |\n| Marseille | 1        |',
            'INSERT INTO users VALUES (5, \'Eve\', 20, \'Nice\')': '(1 ligne insérée avec succès ✅)',
            'help': 'Commandes SQL disponibles :\n  SELECT * FROM users\n  SELECT nom FROM users WHERE ville = \'Paris\'\n  SELECT COUNT(*) FROM users\n  SELECT ville, COUNT(*) FROM users GROUP BY ville\n  INSERT INTO users VALUES (5, \'Eve\', 20, \'Nice\')'
          }},
          { type: 'list', title: 'Les commandes SQL essentielles :', items: [
            'SELECT — Lire des données ("Montre-moi...")',
            'INSERT — Ajouter des données ("Crée un nouveau...")',
            'UPDATE — Modifier des données ("Change la valeur de...")',
            'DELETE — Supprimer des données ("Supprime...")',
            'WHERE — Filtrer ("...seulement ceux qui...")',
            'ORDER BY — Trier ("...triés par...")',
            'GROUP BY — Regrouper ("...groupés par...")'
          ]},
          { type: 'highlight', text: 'SQL est le 3e langage le plus utilisé au monde. Même si tu ne deviens pas développeur, savoir lire du SQL est un super atout en entreprise !' },
          { type: 'fun-fact', text: 'SQL a été inventé chez IBM en 1974. 50 ans plus tard, c\'est toujours le standard universe. Presque aucun autre langage n\'a tenu aussi longtemps ! 🏛️' }
        ]
      },
      {
        title: 'NoSQL et Big Data',
        icon: '🌊',
        content: [
          { type: 'paragraph', text: 'Quand les données deviennent trop volumineuses ou trop variées pour les tables SQL classiques, on passe au NoSQL et au Big Data !' },
          { type: 'drag-match', question: 'Associe le type de base de données à son usage :', pairs: [
            { term: 'SQL (MySQL, PostgreSQL)', definition: 'Données structurées (utilisateurs, commandes)' },
            { term: 'Document (MongoDB)', definition: 'Données flexibles (articles, profils)' },
            { term: 'Clé-Valeur (Redis)', definition: 'Cache ultra-rapide, sessions' },
            { term: 'Graphe (Neo4j)', definition: 'Relations complexes (réseaux sociaux)' },
            { term: 'Colonnes (Cassandra)', definition: 'Données massives, écriture intensive' }
          ]},
          { type: 'list', title: 'Les 3 V du Big Data :', items: [
            'Volume — Des quantités astronomiques (pétaoctets, exaoctets)',
            'Vélocité — Les données arrivent à très grande vitesse',
            'Variété — Texte, images, vidéos, logs, capteurs IoT...'
          ]},
          { type: 'analogy', text: '🌊 Imagine que les données sont de l\'eau. SQL, c\'est un système de tuyaux bien organisé, parfait pour un immeuble. Le Big Data, c\'est gérer un tsunami : il faut des barrages géants (data centers), des rivières (pipelines), et des lacs (data lakes) !' },
          { type: 'highlight', text: 'Netflix utilise du Big Data pour analyser les habitudes de 200+ millions d\'abonnés et dépenser intelligemment ses 17 milliards $ de budget contenu !' },
          { type: 'fun-fact', text: 'Chaque jour, l\'humanité génère 2.5 quintillions (2 500 000 000 000 000 000) d\'octets de données. 90% des données existantes ont été créées dans les 2 dernières années ! 🤯' }
        ]
      }
    ],
    quiz: [
      { question: 'Qu\'est-ce qu\'une base de données ?', options: ['Un dossier sur le bureau', 'Un système organisé pour stocker et retrouver des données', 'Un câble réseau', 'Un type de virus'], correct: 1, explanation: 'Une BDD est un système structuré pour gérer efficacement de grandes quantités de données.' },
      { question: 'Que fait la commande SQL "SELECT" ?', options: ['Supprimer des données', 'Lire/récupérer des données', 'Modifier des données', 'Créer une table'], correct: 1, explanation: 'SELECT permet de lire et récupérer des données depuis une ou plusieurs tables.' },
      { question: 'Qu\'est-ce que MongoDB ?', options: ['Un langage de programmation', 'Une base de données NoSQL (documents)', 'Un système d\'exploitation', 'Un réseau social'], correct: 1, explanation: 'MongoDB est une BDD NoSQL qui stocke les données sous forme de documents JSON flexibles.' },
      { question: 'Que signifie les "3 V" du Big Data ?', options: ['Virus, VPN, Virtual', 'Volume, Vélocité, Variété', 'Vue, Voix, Vidéo', 'Version, Valeur, Vérité'], correct: 1, explanation: 'Les 3 V caractérisent le Big Data : Volume (quantité), Vélocité (vitesse), Variété (types de données).' },
      { question: 'Pour quoi Redis est-il principalement utilisé ?', options: ['Stocker des vidéos', 'Cache ultra-rapide en mémoire', 'Envoyer des e-mails', 'Créer des sites web'], correct: 1, explanation: 'Redis est une BDD clé-valeur en mémoire, utilisée pour le cache et les sessions (très rapide).' },
      { question: 'Qu\'est-ce qu\'une clé primaire dans une table ?', options: ['Un mot de passe', 'Un identifiant unique par ligne', 'Le nom de la table', 'Un index de recherche'], correct: 1, explanation: 'La clé primaire est un identifiant unique qui distingue chaque enregistrement (ligne) dans une table.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 9 — Automatisation & Scripting (Tier 3) — NEW
     ═══════════════════════════════════════════════════ */
  const scripting = {
    id: 'scripting',
    title: 'Automatisation & Scripting',
    icon: '⚙️',
    color: '#10b981',
    tier: 3,
    requiredModules: ['dev', 'os'],
    description: 'Apprends à automatiser les tâches répétitives avec Bash, PowerShell et Python',
    lessons: [
      {
        title: 'Pourquoi automatiser ?',
        icon: '🤖',
        content: [
          { type: 'paragraph', text: 'L\'automatisation, c\'est le super-pouvoir de l\'informaticien : faire travailler la machine à ta place pour les tâches répétitives et ennuyeuses !' },
          { type: 'analogy', text: '🏭 Imagine que tu dois trier 10 000 photos par date. À la main : 3 jours. Avec un script : 3 secondes. L\'automatisation, c\'est ça : transformer des heures de travail en secondes.' },
          { type: 'list', title: 'Exemples d\'automatisation quotidienne :', items: [
            'Renommer 500 fichiers d\'un coup selon un pattern',
            'Sauvegarder automatiquement tes projets chaque soir',
            'Envoyer un rapport par e-mail chaque lundi matin',
            'Surveiller un site web et t\'alerter s\'il tombe en panne',
            'Déployer une mise à jour sur 100 serveurs en même temps',
            'Nettoyer les vieux logs qui prennent de la place'
          ]},
          { type: 'true-false', title: 'Vrai ou Faux — Automatisation', statements: [
            { text: 'L\'automatisation fait perdre des emplois IT', answer: false, explanation: 'Elle supprime les tâches répétitives et crée de nouveaux emplois plus intéressants (DevOps, SRE).' },
            { text: 'Un script de 10 lignes peut économiser des heures de travail', answer: true, explanation: 'Un simple script de renommage ou de sauvegarde peut remplacer des heures de travail manuel.' },
            { text: 'Il faut être expert pour automatiser', answer: false, explanation: 'Des scripts basiques sont accessibles aux débutants. Même un "hello world" automatisé est un début !' }
          ]},
          { type: 'highlight', text: 'La règle des 3 : si tu fais une tâche plus de 3 fois, automatise-la ! Le temps investi dans le script est toujours rentabilisé.' },
          { type: 'fun-fact', text: 'Un ingénieur chez Google a automatisé l\'envoi d\'un SMS à sa femme quand il quittait le bureau, le brassage de son café du matin, et même les excuses à son boss quand il arrivait en retard ! ☕' }
        ]
      },
      {
        title: 'Bash et PowerShell',
        icon: '💻',
        content: [
          { type: 'paragraph', text: 'Bash (Linux/macOS) et PowerShell (Windows) sont les deux langages de scripting les plus utilisés pour l\'automatisation système.' },
          { type: 'mini-terminal', title: 'Essaie des commandes d\'automatisation !', commands: {
            'for i in 1 2 3; do echo "Fichier_$i"; done': 'Fichier_1\nFichier_2\nFichier_3',
            'echo "Hello" > message.txt': '(fichier message.txt créé avec "Hello" ✅)',
            'cat message.txt | wc -w': '1',
            'find . -name "*.log" -delete': '(tous les fichiers .log supprimés ✅)',
            'crontab -l': '# Sauvegarde automatique chaque jour à 2h du matin\n0 2 * * * /scripts/backup.sh\n# Nettoyage des logs chaque dimanche\n0 3 * * 0 /scripts/cleanup.sh',
            'chmod +x script.sh': '(droits d\'exécution ajoutés à script.sh ✅)',
            'help': 'Commandes disponibles :\n  for i in 1 2 3; do echo "Fichier_$i"; done\n  echo "Hello" > message.txt\n  cat message.txt | wc -w\n  find . -name "*.log" -delete\n  crontab -l\n  chmod +x script.sh'
          }},
          { type: 'list', title: 'Concepts clés du scripting :', items: [
            'Variables — stocker des valeurs ($nom="Alice")',
            'Boucles — répéter une action (for, while)',
            'Conditions — si/sinon (if/else)',
            'Pipe (|) — enchaîner des commandes',
            'Redirection (> >>) — envoyer la sortie dans un fichier',
            'Cron — planifier l\'exécution automatique'
          ]},
          { type: 'highlight', text: 'Le "pipe" (|) est l\'arme secrète du terminal : il envoie la sortie d\'une commande directement dans une autre. cat fichier.txt | grep "erreur" | wc -l = compter les lignes contenant "erreur" !' },
          { type: 'fun-fact', text: 'Le cron (planificateur de tâches Linux) a été créé en 1975 et est toujours utilisé. Son format "0 2 * * *" est devenu un mème dans le monde IT ! ⏰' }
        ]
      },
      {
        title: 'Python pour l\'automatisation',
        icon: '🐍',
        content: [
          { type: 'paragraph', text: 'Python est le roi de l\'automatisation grâce à sa syntaxe simple et ses milliers de bibliothèques pour tout faire.' },
          { type: 'list', title: 'Ce que Python peut automatiser :', items: [
            'Manipulation de fichiers (renommer, trier, convertir)',
            'Web scraping (extraire des données de sites web)',
            'E-mails automatiques',
            'Interactions avec des APIs',
            'Traitement d\'images en masse',
            'Génération de rapports PDF/Excel',
            'Bots Discord, Telegram, Slack'
          ]},
          { type: 'drag-sort', question: 'Remets les étapes d\'un pipeline CI/CD dans l\'ordre :', items: [
            '1. Le développeur pousse son code (git push)',
            '2. Le serveur CI détecte le changement',
            '3. Les tests automatiques sont lancés',
            '4. Le code est compilé/packagé',
            '5. Déploiement automatique en production',
            '6. Monitoring et alertes en cas de problème'
          ]},
          { type: 'analogy', text: '🏗️ Le CI/CD, c\'est comme une usine automatisée : le développeur dépose la matière première (code), et la chaîne de production (pipeline) teste, emballe et livre le produit fini (l\'appli) sans intervention humaine.' },
          { type: 'highlight', text: 'DevOps + automatisation = les métiers les mieux payés de l\'IT. Un ingénieur DevOps senior gagne en moyenne 65-85k€ en France !' },
          { type: 'fun-fact', text: 'GitHub Actions exécute plus de 30 millions de workflows automatisés par jour. C\'est comme avoir 30 millions de petits robots qui travaillent non-stop ! 🤖' }
        ]
      }
    ],
    quiz: [
      { question: 'Quel est le principal avantage de l\'automatisation ?', options: ['Rendre les choses plus complexes', 'Éliminer les tâches répétitives', 'Ralentir les processus', 'Augmenter le budget'], correct: 1, explanation: 'L\'automatisation élimine les tâches répétitives et libère du temps pour le travail créatif.' },
      { question: 'Que fait le "pipe" (|) dans un terminal ?', options: ['Supprime un fichier', 'Envoie la sortie d\'une commande dans une autre', 'Crée un dossier', 'Se connecte à Internet'], correct: 1, explanation: 'Le pipe enchaîne les commandes : la sortie de la première devient l\'entrée de la suivante.' },
      { question: 'Qu\'est-ce que le cron ?', options: ['Un virus', 'Un planificateur de tâches automatiques', 'Un langage de programmation', 'Un type de réseau'], correct: 1, explanation: 'Cron planifie l\'exécution automatique de scripts à des horaires précis (chaque jour, semaine...).' },
      { question: 'Quel langage est le plus populaire pour l\'automatisation ?', options: ['C++', 'Python', 'HTML', 'SQL'], correct: 1, explanation: 'Python est le roi de l\'automatisation grâce à sa simplicité et ses milliers de bibliothèques.' },
      { question: 'Que signifie CI/CD ?', options: ['Code Internet / Code Digital', 'Continuous Integration / Continuous Deployment', 'Computer Intelligence / Central Data', 'Crypto Internet / Cloud Data'], correct: 1, explanation: 'CI/CD = Intégration Continue / Déploiement Continu. C\'est l\'automatisation du cycle de vie du code.' },
      { question: 'La règle des 3 en automatisation dit...', options: ['Utiliser 3 langages', 'Si tu fais une tâche 3+ fois, automatise-la', 'Écrire 3 lignes de code max', 'Tester 3 fois avant de lancer'], correct: 1, explanation: 'Si tu répètes une tâche plus de 3 fois, le temps de création du script sera rentabilisé.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 10 — Cloud & DevOps (Tier 4) — NEW
     ═══════════════════════════════════════════════════ */
  const cloud = {
    id: 'cloud',
    title: 'Cloud & DevOps',
    icon: '☁️',
    color: '#0284c7',
    tier: 4,
    requiredModules: ['security', 'scripting'],
    description: 'Découvre le cloud computing, les conteneurs Docker et l\'infrastructure as code',
    lessons: [
      {
        title: 'Le Cloud Computing',
        icon: '☁️',
        content: [
          { type: 'paragraph', text: 'Le cloud computing a révolutionné l\'informatique. Plus besoin d\'acheter des serveurs : tu loues de la puissance de calcul à la demande, comme l\'électricité !' },
          { type: 'list', title: 'Les 3 modèles de service cloud :', items: [
            'IaaS (Infrastructure as a Service) — Tu loues des serveurs virtuels (AWS EC2, Azure VM)',
            'PaaS (Platform as a Service) — Tu déploies ton code, le cloud gère le reste (Heroku, Google App Engine)',
            'SaaS (Software as a Service) — Tu utilises un logiciel en ligne (Gmail, Office 365, Slack)'
          ]},
          { type: 'drag-match', question: 'Associe chaque service à son modèle cloud :', pairs: [
            { term: 'Gmail', definition: 'SaaS — Logiciel en ligne' },
            { term: 'AWS EC2', definition: 'IaaS — Serveur virtuel' },
            { term: 'Heroku', definition: 'PaaS — Plateforme de déploiement' },
            { term: 'Office 365', definition: 'SaaS — Logiciel en ligne' },
            { term: 'Azure VM', definition: 'IaaS — Serveur virtuel' }
          ]},
          { type: 'analogy', text: '🏠 Le cloud, c\'est comme la différence entre construire ta propre maison (on-premise) et louer un appartement (cloud). Avec la location, pas besoin de t\'occuper des murs, de l\'électricité ni de la plomberie !' },
          { type: 'highlight', text: 'Les 3 géants du cloud (2025) : AWS (Amazon) ~33%, Azure (Microsoft) ~22%, Google Cloud ~11%. À eux trois, ils gèrent 65% du cloud mondial !' },
          { type: 'fun-fact', text: 'AWS a commencé en 2006 quand Amazon a réalisé que ses serveurs étaient sous-utilisés 80% du temps. Ils les ont loués → c\'est devenu leur activité la plus rentable ! 💰' }
        ]
      },
      {
        title: 'Docker et les conteneurs',
        icon: '🐳',
        content: [
          { type: 'paragraph', text: 'Docker a révolutionné le déploiement logiciel. Un conteneur, c\'est une boîte fermée qui contient ton application avec TOUT ce dont elle a besoin pour fonctionner.' },
          { type: 'analogy', text: '📦 Un conteneur Docker, c\'est comme un container maritime. Peu importe le bateau (serveur), le port (OS), ou le pays (cloud) : ton container est standard et fonctionne partout pareil !' },
          { type: 'mini-terminal', title: 'Essaie des commandes Docker !', commands: {
            'docker run hello-world': 'Hello from Docker! 🐳\nThis message shows your installation is working correctly.',
            'docker ps': 'CONTAINER ID  IMAGE          STATUS    PORTS\na1b2c3d4e5    nginx:latest   Running   80/tcp\nf6g7h8i9j0    redis:7        Running   6379/tcp',
            'docker images': 'REPOSITORY  TAG      SIZE\nnginx       latest   142MB\nredis       7        130MB\npython      3.12     1.01GB\nnode        20       1.10GB',
            'docker build -t myapp .': 'Step 1/5 : FROM python:3.12\nStep 2/5 : COPY . /app\nStep 3/5 : RUN pip install -r requirements.txt\nStep 4/5 : EXPOSE 8000\nStep 5/5 : CMD ["python", "main.py"]\nSuccessfully built myapp:latest ✅',
            'help': 'Commandes Docker disponibles :\n  docker run hello-world\n  docker ps\n  docker images\n  docker build -t myapp .'
          }},
          { type: 'list', title: 'Pourquoi Docker est si populaire :', items: [
            'Fonctionne partout pareil (dev, test, prod)',
            'Démarre en secondes (pas en minutes comme une VM)',
            'Isole les applications (pas de conflit de versions)',
            'Facile à partager (Docker Hub = GitHub des images)',
            'Orchestre facilement (Kubernetes pour des milliers de conteneurs)'
          ]},
          { type: 'highlight', text: 'Ce site IT Discovery tourne lui-même dans un conteneur Docker ! Le Dockerfile copie le code, installe les dépendances, et lance le serveur. 🐳' },
          { type: 'fun-fact', text: 'Kubernetes (le chef d\'orchestre de conteneurs) a été créé par Google. Il gère automatiquement des milliers de conteneurs et est utilisé par 96% des entreprises Fortune 100 ! ⚙️' }
        ]
      },
      {
        title: 'Infrastructure as Code',
        icon: '📝',
        content: [
          { type: 'paragraph', text: 'L\'IaC (Infrastructure as Code), c\'est gérer ton infrastructure (serveurs, réseaux, BDD) avec du code au lieu de clics manuels dans une interface.' },
          { type: 'analogy', text: '🏗️ Imagine que tu construis un immeuble. Méthode ancienne : tu donnes les instructions au chef de chantier verbalement (erreurs possibles). IaC : tu as un plan détaillé numérique. Si l\'immeuble brûle, tu le reconstruis à l\'identique en appuyant sur un bouton.' },
          { type: 'list', title: 'Les outils IaC populaires :', items: [
            'Terraform — définir l\'infrastructure multi-cloud (HashiCorp)',
            'Ansible — automatiser la configuration des serveurs',
            'Docker Compose — orchestrer plusieurs conteneurs ensemble',
            'GitHub Actions — automatiser les tests et déploiements',
            'ArgoCD — déploiement GitOps pour Kubernetes'
          ]},
          { type: 'flashcard-deck', title: 'Concepts DevOps', cards: [
            { front: 'GitOps', back: 'Gérer l\'infrastructure et les déploiements via Git. Le repo est la "source de vérité".' },
            { front: 'Microservices', back: 'Découper une grosse application en petits services indépendants qui communiquent par API.' },
            { front: 'Load Balancer', back: 'Répartit le trafic entre plusieurs serveurs pour éviter la surcharge.' },
            { front: 'Auto-scaling', back: 'Ajuster automatiquement le nombre de serveurs selon la charge.' },
            { front: 'Blue/Green Deploy', back: 'Déployer sur un 2e environnement (green) puis basculer le trafic. Rollback instantané si problème.' }
          ]},
          { type: 'highlight', text: 'Avec l\'IaC, tu peux détruire et recréer toute ton infrastructure en quelques minutes. Plus besoin de "touche pas à ce serveur, personne ne sait comment il a été configuré" ! 😅' },
          { type: 'fun-fact', text: 'Netflix détruit et recrée des milliers de serveurs chaque jour automatiquement grâce à l\'IaC. Leur outil "Chaos Monkey" CASSE des serveurs volontairement pour tester la résilience ! 🐒' }
        ]
      }
    ],
    quiz: [
      { question: 'Qu\'est-ce que le IaaS ?', options: ['Un réseau social', 'De l\'infrastructure louée en cloud', 'Un langage de programmation', 'Un type de virus'], correct: 1, explanation: 'IaaS (Infrastructure as a Service) = louer des serveurs virtuels en cloud (AWS EC2, Azure VM).' },
      { question: 'Qu\'est-ce qu\'un conteneur Docker ?', options: ['Un fichier zip', 'Une boîte isolée contenant une appli et ses dépendances', 'Un type de serveur', 'Un câble réseau'], correct: 1, explanation: 'Un conteneur Docker encapsule une application avec tout ce dont elle a besoin, pour fonctionner partout pareil.' },
      { question: 'Quel est le plus grand fournisseur cloud ?', options: ['Google Cloud', 'Azure', 'AWS (Amazon)', 'Oracle'], correct: 2, explanation: 'AWS (Amazon Web Services) domine le marché cloud avec environ 33% de part de marché.' },
      { question: 'Que fait Kubernetes ?', options: ['Stocke des fichiers', 'Orchestre des milliers de conteneurs', 'Crée des sites web', 'Protège contre les virus'], correct: 1, explanation: 'Kubernetes gère automatiquement le déploiement, la mise à l\'échelle et la santé de milliers de conteneurs.' },
      { question: 'L\'IaC (Infrastructure as Code) permet de...', options: ['Coder des sites web', 'Gérer l\'infrastructure avec du code', 'Remplacer les développeurs', 'Jouer à des jeux'], correct: 1, explanation: 'L\'IaC permet de définir, versionner et reproduire toute l\'infrastructure avec du code.' },
      { question: 'Qu\'est-ce que le SaaS ?', options: ['Un serveur virtuel', 'Un logiciel utilisable en ligne', 'Un câble réseau', 'Un type de processeur'], correct: 1, explanation: 'SaaS (Software as a Service) = logiciel accessible en ligne sans installation (Gmail, Slack, Office 365).' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 11 — Intelligence Artificielle avancée (Tier 4) — NEW
     ═══════════════════════════════════════════════════ */
  const ai = {
    id: 'ai',
    title: 'Intelligence Artificielle avancée',
    icon: '🤖',
    color: '#7c3aed',
    tier: 4,
    requiredModules: ['databases', 'enterprise'],
    description: 'Va plus loin dans l\'IA : réseaux de neurones, NLP, LLMs, éthique et biais',
    lessons: [
      {
        title: 'Machine Learning vs Deep Learning',
        icon: '🧠',
        content: [
          { type: 'paragraph', text: 'L\'IA est un domaine vaste. Le Machine Learning (ML) et le Deep Learning (DL) sont deux approches différentes pour "apprendre" à partir de données.' },
          { type: 'interactive-diagram', title: 'L\'IA, le ML et le DL — clique pour comprendre', elements: [
            { id: 'ia', label: '🧠 IA', x: 50, y: 15, info: 'Intelligence Artificielle : tout programme qui simule un comportement "intelligent". Inclut les règles programmées à la main aussi.' },
            { id: 'ml', label: '📊 Machine Learning', x: 50, y: 45, info: 'Sous-ensemble de l\'IA. Le programme apprend des patterns à partir de données au lieu d\'être programmé manuellement.' },
            { id: 'dl', label: '🔮 Deep Learning', x: 50, y: 75, info: 'Sous-ensemble du ML. Utilise des réseaux de neurones à plusieurs couches. C\'est ce qui fait tourner ChatGPT, DALL-E, etc.' }
          ]},
          { type: 'drag-match', question: 'Associe chaque type d\'IA à son exemple :', pairs: [
            { term: 'Règles (IA classique)', definition: 'Filtre anti-spam simple (mots-clés)' },
            { term: 'Machine Learning', definition: 'Détection de fraude bancaire' },
            { term: 'Deep Learning', definition: 'Reconnaissance vocale (Siri)' },
            { term: 'Reinforcement Learning', definition: 'AlphaGo (apprend en jouant)' },
            { term: 'LLM (Large Language Model)', definition: 'ChatGPT, Claude, Gemini' }
          ]},
          { type: 'list', title: 'Types de Machine Learning :', items: [
            'Supervisé — On donne des exemples étiquetés (photo de chat → "chat")',
            'Non supervisé — L\'algo trouve des patterns seul (groupes de clients)',
            'Reinforcement Learning — L\'algo apprend par essai/erreur (jeux, robots)'
          ]},
          { type: 'highlight', text: 'Le Deep Learning nécessite des MILLIONS de données ET des GPU puissants. C\'est pourquoi seules les géants (Google, Meta, OpenAI) peuvent entraîner les plus gros modèles.' },
          { type: 'fun-fact', text: 'L\'entraînement de GPT-4 a coûté environ 100 millions de dollars. Et un seul cycle d\'entraînement consomme autant d\'électricité que 10 000 foyers américains pendant un an ! ⚡' }
        ]
      },
      {
        title: 'NLP & les LLMs',
        icon: '💬',
        content: [
          { type: 'paragraph', text: 'Le NLP (Natural Language Processing) permet aux machines de comprendre et générer du langage humain. Les LLMs (Large Language Models) comme ChatGPT sont la révolution NLP.' },
          { type: 'list', title: 'Comment fonctionne un LLM :', items: [
            '1. Entraînement — Le modèle lit des billions de mots (tout Internet, des livres...)',
            '2. Tokenisation — Le texte est découpé en petits morceaux (tokens)',
            '3. Prédiction — Pour chaque token, le modèle prédit le suivant le plus probable',
            '4. Fine-tuning — Le modèle est affiné pour suivre des instructions',
            '5. RLHF — Des humains évaluent les réponses pour les améliorer'
          ]},
          { type: 'flashcard-deck', title: 'Vocabulaire NLP', cards: [
            { front: 'Token', back: 'Unité de base du texte pour un LLM. "Bonjour" = 1 token, "intelligence artificielle" = 2 tokens.' },
            { front: 'Transformer', back: 'Architecture de réseau de neurones derrière GPT, Claude, Gemini. Inventé par Google en 2017.' },
            { front: 'Prompt', back: 'La question ou instruction que tu donnes à un LLM.' },
            { front: 'Hallucination', back: 'Quand un LLM invente des informations fausses avec assurance.' },
            { front: 'RLHF', back: 'Reinforcement Learning from Human Feedback — Améliorer le modèle grâce aux évaluations humaines.' },
            { front: 'Embedding', back: 'Représentation numérique (vecteur) d\'un mot ou d\'une phrase. Les mots similaires ont des vecteurs proches.' }
          ]},
          { type: 'analogy', text: '🎰 Un LLM, c\'est comme un système de complétion automatique GÉANT. Il ne "comprend" pas vraiment. Il prédit le prochain mot le plus probable basé sur des patterns statistiques appris sur des billions de mots.' },
          { type: 'highlight', text: 'Les LLMs "hallucinent" : ils peuvent générer des réponses fausses mais convaincantes. Toujours vérifier les informations critiques avec des sources fiables !' },
          { type: 'fun-fact', text: 'Le "T" de GPT signifie "Transformer", une architecture inventée par Google en 2017. Ironiquement, c\'est OpenAI (et pas Google) qui l\'a rendue célèbre avec ChatGPT ! 🔄' }
        ]
      },
      {
        title: 'Éthique et biais de l\'IA',
        icon: '⚖️',
        content: [
          { type: 'paragraph', text: 'L\'IA n\'est pas neutre. Elle reproduit et amplifie les biais présents dans ses données d\'entraînement. Comprendre ces enjeux est crucial.' },
          { type: 'list', title: 'Les principaux biais de l\'IA :', items: [
            'Biais de données — Si les données d\'entraînement ne sont pas représentatives',
            'Biais de genre — IA de recrutement qui favorise les CV masculins (cas Amazon)',
            'Biais racial — Reconnaissance faciale moins précise sur certaines ethnies',
            'Biais de confirmation — L\'IA renforce ce que tu crois déjà (bulles de filtre)',
            'Biais de survie — Ne considérer que les succès, pas les échecs'
          ]},
          { type: 'true-false', title: 'Éthique de l\'IA — Vrai ou Faux ?', statements: [
            { text: 'Un algorithme est toujours neutre et objectif', answer: false, explanation: 'Un algo reflète les biais de ses données ET de ses créateurs. "Garbage in, garbage out".' },
            { text: 'Le RGPD s\'applique aussi à l\'IA', answer: true, explanation: 'Le RGPD protège les données personnelles utilisées pour entraîner les IA en Europe.' },
            { text: 'L\'IA Act européen est la 1ère loi au monde régulant l\'IA', answer: true, explanation: 'L\'AI Act (2024) classe les IA par niveau de risque et impose des obligations aux créateurs.' },
            { text: 'Les deepfakes sont toujours illégaux', answer: false, explanation: 'Les deepfakes satiriques ou artistiques sont légaux. C\'est l\'usage malveillant (fraude, diffamation) qui est illégal.' }
          ]},
          { type: 'analogy', text: '🪞 L\'IA est un miroir de la société. Si les données qu\'on lui donne contiennent des préjugés (recrutement sexiste, profilage racial), l\'IA va reproduire et amplifier ces préjugés à grande échelle.' },
          { type: 'highlight', text: 'Amazon a dû abandonner son IA de recrutement en 2018 car elle pénalisait les CV contenant le mot "femme" — elle avait appris sur 10 ans de recrutement majoritairement masculin.' },
          { type: 'fun-fact', text: 'L\'IA Act européen (2024) est la première loi au monde à réguler l\'IA. Elle classe les IA en 4 niveaux de risque : minimal, limité, élevé, et inacceptable (interdit). 🏛️' }
        ]
      }
    ],
    quiz: [
      { question: 'Quelle est la différence entre ML et Deep Learning ?', options: ['Aucune', 'Le DL utilise des réseaux de neurones profonds', 'Le ML est plus récent', 'Le DL est plus simple'], correct: 1, explanation: 'Le Deep Learning est un sous-ensemble du ML qui utilise des réseaux de neurones à plusieurs couches (profondes).' },
      { question: 'Que signifie le "T" de GPT ?', options: ['Technology', 'Transformer', 'Translation', 'Training'], correct: 1, explanation: 'GPT = Generative Pre-trained Transformer. Le Transformer est l\'architecture de réseau de neurones inventée par Google.' },
      { question: 'Qu\'est-ce qu\'une "hallucination" d\'un LLM ?', options: ['Un bug d\'affichage', 'Quand il invente des infos fausses', 'Un problème de mémoire', 'Une mise à jour'], correct: 1, explanation: 'Les LLMs peuvent générer des informations fausses mais présentées avec assurance — c\'est une "hallucination".' },
      { question: 'Pourquoi l\'IA de recrutement d\'Amazon était-elle biaisée ?', options: ['Bug technique', 'Données d\'entraînement biaisées (recrutement masculin)', 'Piratage', 'Manque de puissance'], correct: 1, explanation: 'Entraînée sur 10 ans de recrutement majoritairement masculin, l\'IA a appris à pénaliser les profils féminins.' },
      { question: 'Combien a coûté l\'entraînement de GPT-4 ?', options: ['1 000 $', '100 000 $', '~100 millions $', '100 milliards $'], correct: 2, explanation: 'L\'entraînement de GPT-4 a coûté environ 100 millions de dollars en calcul GPU et énergie.' },
      { question: 'Quel type de ML apprend par essai/erreur ?', options: ['Supervisé', 'Non supervisé', 'Reinforcement Learning', 'Deep Learning'], correct: 2, explanation: 'Le Reinforcement Learning apprend par essai-erreur avec des récompenses/punitions (comme un jeu).' }
    ]
  };

  /* ───────── Expose all modules (ordered by tier) ───────── */
  Data.MODULES = [hardware, daily, networks, dev, os, security, enterprise, databases, scripting, cloud, ai];

  /* ───────── Mini-game question pool helper ───────── */
  Data.getAllQuizQuestions = function () {
    var questions = [];
    Data.MODULES.forEach(function (mod) {
      mod.quiz.forEach(function (q) {
        questions.push({ moduleId: mod.id, moduleTitle: mod.title, moduleIcon: mod.icon, question: q.question, options: q.options, correct: q.correct, explanation: q.explanation });
      });
    });
    return questions;
  };

  window.ITData = Data;
})();
