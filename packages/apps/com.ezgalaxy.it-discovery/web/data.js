/**
 * IT Discovery — Module Data
 * All lessons and quiz content for 6 IT discovery modules
 */
(() => {
  'use strict';

  const Data = {};

  /* ───────── Levels & Badges definitions ───────── */
  Data.LEVELS = [
    { min: 0,   title: 'Stagiaire',       icon: '🐣' },
    { min: 50,  title: 'Initié',          icon: '🌱' },
    { min: 150, title: 'Technicien',      icon: '🔧' },
    { min: 300, title: 'Expert',          icon: '🚀' },
    { min: 450, title: 'Hacker Éthique',  icon: '🎯' },
    { min: 600, title: 'Architecte IT',   icon: '👑' }
  ];

  Data.BADGES = [
    { id: 'first-step',   title: 'Premier Pas',      icon: '👣', desc: 'Compléter ta première leçon' },
    { id: 'curious',      title: 'Curieux',           icon: '🔍', desc: 'Compléter 5 leçons' },
    { id: 'encyclopedia', title: 'Encyclopédie',      icon: '📚', desc: 'Compléter toutes les leçons' },
    { id: 'quiz-master',  title: 'Quiz Master',       icon: '🏆', desc: 'Obtenir un score parfait à un quiz' },
    { id: 'flawless',     title: 'Sans Faute',        icon: '💎', desc: 'Obtenir 3 scores parfaits aux quiz' },
    { id: 'unstoppable',  title: 'Inarrêtable',       icon: '🔥', desc: 'Streak de 5 bonnes réponses consécutives' },
    { id: 'hardware-hero',  title: 'Hardware Hero',   icon: '🖥️', desc: 'Module "C\'est quoi l\'informatique" complété' },
    { id: 'network-ninja',  title: 'Network Ninja',   icon: '🌐', desc: 'Module "Réseaux & Internet" complété' },
    { id: 'cyber-guardian', title: 'Cyber Guardian',   icon: '🛡️', desc: 'Module "Cybersécurité" complété' },
    { id: 'code-wizard',   title: 'Code Wizard',      icon: '🧙', desc: 'Module "Développement & IA" complété' },
    { id: 'it-pro',        title: 'IT Pro',            icon: '💼', desc: 'Module "IT en entreprise" complété' },
    { id: 'digital-native', title: 'Digital Native',   icon: '📱', desc: 'Module "Numérique au quotidien" complété' }
  ];

  Data.MODULE_BADGES = {
    hardware:   'hardware-hero',
    networks:   'network-ninja',
    security:   'cyber-guardian',
    dev:        'code-wizard',
    enterprise: 'it-pro',
    daily:      'digital-native'
  };

  /* ═══════════════════════════════════════════════════
     MODULE 1 — C'est quoi l'informatique ?
     ═══════════════════════════════════════════════════ */
  const hardware = {
    id: 'hardware',
    title: "C'est quoi l'informatique ?",
    icon: '🖥️',
    color: '#3b82f6',
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
     MODULE 2 — Les Réseaux & Internet
     ═══════════════════════════════════════════════════ */
  const networks = {
    id: 'networks',
    title: 'Les Réseaux & Internet',
    icon: '🌐',
    color: '#8b5cf6',
    description: 'Comprends comment les ordinateurs communiquent entre eux, du réseau local jusqu\'à Internet',
    lessons: [
      {
        title: 'C\'est quoi un réseau ?',
        icon: '🔗',
        content: [
          { type: 'paragraph', text: 'Un réseau informatique, c\'est simplement un groupe d\'appareils connectés entre eux pour partager des informations. C\'est comme un groupe WhatsApp, mais pour les machines !' },
          { type: 'analogy', text: '🏠 Le réseau local (LAN), c\'est comme ta maison : tous les appareils (PC, téléphone, console) sont connectés à ta box Internet par Wi-Fi ou câble Ethernet. Ils peuvent se "voir" et communiquer.' },
          { type: 'analogy', text: '🌍 Internet (WAN), c\'est comme la Poste mondiale : il connecte des milliards d\'appareils partout sur la planète. Chaque appareil a une adresse (IP) pour recevoir et envoyer des données.' },
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
          { type: 'list', title: 'Le trajet d\'une requête web :', items: [
            '1. Tu tapes l\'adresse → ton navigateur demande au DNS "qui est youtube.com ?"',
            '2. Le DNS répond "c\'est à l\'adresse IP 142.250.xx.xx"',
            '3. Ton ordi envoie une requête HTTP(S) à cette adresse',
            '4. Le serveur de YouTube reçoit, traite et renvoie la page web',
            '5. Ton navigateur affiche la page avec les vidéos !'
          ]},
          { type: 'analogy', text: '📞 Le DNS, c\'est l\'annuaire d\'Internet. Tu connais le nom (youtube.com) mais pas le "numéro de téléphone" (adresse IP). Le DNS le cherche pour toi !' },
          { type: 'analogy', text: '📦 Les données ne voyagent pas en un seul morceau. Elles sont découpées en petits "paquets" (comme des lettres séparées) qui peuvent prendre des chemins différents et se recombinent à l\'arrivée.' },
          { type: 'fun-fact', text: 'Un paquet de données peut traverser le monde entier en moins de 100 millisecondes. C\'est plus rapide qu\'un clignement d\'œil (300 ms) ! ⚡' },
          { type: 'highlight', text: 'HTTPS (le cadenas 🔒 dans l\'adresse) signifie que la connexion est chiffrée. Personne ne peut lire tes données entre ton ordi et le serveur !' },
          { type: 'steps', title: 'Le voyage d\'une page web (clic → affichage)', steps: [
            'Tu tapes "www.google.fr" dans ton navigateur 🖥️',
            'Le DNS traduit ce nom en adresse IP (ex: 142.250.74.227) 📖',
            'Ton PC envoie des paquets via ta box Internet 📦',
            'Les routeurs relaient les paquets à travers le réseau 🔄',
            'Les paquets arrivent au serveur de destination 🏢',
            'Le serveur prépare la page et renvoie les données 📤',
            'Ton navigateur reçoit et assemble les paquets 🧩',
            'La page s\'affiche sur ton écran ! ✨'
          ]}
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
          { type: 'paragraph', text: 'Le Cloud ("nuage"), ce n\'est pas de la magie : ce sont tout simplement des serveurs (de gros ordinateurs surpuissants) rangés dans des data centers, accessibles via Internet.' },
          { type: 'analogy', text: '🏗️ Un data center, c\'est comme un énorme entrepôt rempli d\'ordinateurs qui tournent 24h/24. Google, Amazon, Microsoft... ils en ont des centaines partout dans le monde. Tes photos Google, tes fichiers OneDrive, tes saves de jeux : tout est là-dedans !' },
          { type: 'fun-fact', text: 'Un data center de Google consomme autant d\'électricité qu\'une ville de 100 000 habitants ! Ils utilisent même l\'eau de mer pour refroidir leurs serveurs 🌊' },
          { type: 'highlight', text: 'Quand on dit "Mes fichiers sont dans le Cloud", ça veut simplement dire qu\'ils sont stockés sur le disque dur d\'un serveur quelque part dans le monde, accessible via Internet.' }
        ]
      }
    ],
    quiz: [
      { question: 'Que fait le DNS ?', options: ['Bloque les virus', 'Traduit les noms de domaine en adresses IP', 'Stocke les fichiers', 'Accélère le Wi-Fi'], correct: 1, explanation: 'Le DNS est l\'annuaire d\'Internet : il traduit "youtube.com" en adresse IP (numérique) compréhensible par les machines.' },
      { question: 'Qu\'est-ce qu\'un réseau local (LAN) ?', options: ['Internet', 'Un réseau d\'appareils connectés localement', 'Un satellite', 'Un câble sous-marin'], correct: 1, explanation: 'Un LAN (Local Area Network) relie les appareils d\'un même lieu : maison, bureau, école...' },
      { question: 'Le Cloud, c\'est concrètement...', options: ['Un nuage de données flottant', 'Des serveurs dans des data centers', 'Un satellite en orbite', 'Un disque dur portable'], correct: 1, explanation: 'Le Cloud ce sont des serveurs physiques bien réels, installés dans d\'immenses data centers.' },
      { question: 'Quelle bande Wi-Fi a la meilleure portée ?', options: ['5 GHz', '2.4 GHz', '6 GHz', 'Bluetooth'], correct: 1, explanation: 'Le 2.4 GHz porte plus loin et traverse mieux les murs, même si le 5 GHz est plus rapide.' },
      { question: 'Que signifie HTTPS ?', options: ['Connexion rapide', 'Connexion chiffrée et sécurisée', 'Connexion gratuite', 'Connexion Wi-Fi'], correct: 1, explanation: 'Le S de HTTPS signifie "Secure" : tes données sont chiffrées pendant le transport.' },
      { question: 'Comment naviguent les données sur Internet ?', options: ['En un seul bloc', 'Découpées en paquets', 'Par satellite uniquement', 'Par Bluetooth'], correct: 1, explanation: 'Les données sont découpées en paquets qui voyagent indépendamment et se recombinent à l\'arrivée.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 3 — Cybersécurité
     ═══════════════════════════════════════════════════ */
  const security = {
    id: 'security',
    title: 'Cybersécurité',
    icon: '🔒',
    color: '#ef4444',
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
          { type: 'analogy', text: '🎣 Le phishing, c\'est comme un pêcheur : il lance un appât (un faux e-mail de ta banque, un faux concours...) et attend que tu mordes à l\'hameçon en cliquant sur le lien et en donnant tes infos.' },
          { type: 'highlight', text: 'En 2025, un e-mail sur 100 est une tentative de phishing. Les cybercriminels deviennent de plus en plus doués : les faux e-mails ressemblent parfois parfaitement aux vrais !' },
          { type: 'fun-fact', text: 'Le premier virus informatique connu s\'appelait "Creeper" (1971). Il affichait juste le message "I\'m the creeper, catch me if you can!" Un autre programme, "Reaper", a été créé pour l\'effacer. C\'était le premier antivirus ! 🕹️' },
          { type: 'paragraph', text: 'Les attaques ne visent pas que les entreprises. N\'importe qui peut être ciblé : toi, ta famille, tes profs. C\'est pourquoi il est important de connaître les bons réflexes !' }
        ]
      },
      {
        title: 'Mots de passe et authentification',
        icon: '🔑',
        content: [
          { type: 'paragraph', text: 'Ton mot de passe, c\'est la clé de ta vie numérique. Un mauvais mot de passe, c\'est comme une porte d\'entrée ouverte !' },
          { type: 'list', title: '❌ Les pires mots de passe (à ne JAMAIS utiliser) :', items: [
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
          { type: 'analogy', text: '🏠 Imagine que ta maison, ton casier, ton journal intime et ta console avaient tous la même serrure et la même clé. Si quelqu\'un trouve la clé, il a accès à tout ! C\'est pareil avec les mots de passe : chaque compte doit avoir le sien.' },
          { type: 'highlight', text: 'Astuce : utilise une "phrase de passe" ! Par exemple : "MonChatMange3Pizzas!" est un excellent mot de passe : long, avec des majuscules, un chiffre et un symbole, et facile à retenir !' },
          { type: 'paragraph', text: 'La double authentification (2FA) ajoute une deuxième vérification : un code par SMS, une notification sur ton téléphone, ou une clé de sécurité. Même si quelqu\'un vole ton mot de passe, il ne pourra pas entrer sans le 2e facteur !' },
          { type: 'fun-fact', text: 'Un mot de passe de 6 lettres minuscules peut être craqué en 10 secondes. Avec 12 caractères mixtes ? Plusieurs milliers d\'années ! 🔐' },
          { type: 'interactive-reveal', question: 'Quel mot de passe est le plus sécurisé ? (clique pour vérifier)', options: [
            { text: '123456', revealed: '❌ C\'est le mot de passe le plus utilisé au monde ! Un hacker le craque en moins d\'1 seconde.' },
            { text: 'MonChat2024', revealed: '⚠️ Mieux, mais les infos personnelles (nom d\'animal, année) sont faciles à deviner avec l\'ingénierie sociale.' },
            { text: 'K9#mP$2x!Lq4', revealed: '✅ Excellent ! Long (12 car.), complexe et aléatoire. Utilise un gestionnaire de mots de passe pour t\'en souvenir !' },
            { text: 'MonChienAdore3Tacos!', revealed: '✅ Super choix ! C\'est une "phrase de passe" : longue, mémorisable et avec des caractères variés. Difficile à craquer !' }
          ]}
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
          { type: 'analogy', text: '🚗 La cybersécurité, c\'est comme la ceinture de sécurité en voiture. Tu ne la mets pas parce que tu penses avoir un accident à chaque trajet, mais parce que le jour où ça arrive, elle peut te sauver.' },
          { type: 'list', title: '📱 Sur les réseaux sociaux :', items: [
            'Rends ton profil privé',
            'Ne partage jamais ton adresse, ton école ou ton emploi du temps',
            'Refuse les demandes d\'amis de personnes que tu ne connais pas en vrai',
            'Signale les comportements inappropriés',
            'Réfléchis avant de poster : Internet n\'oublie jamais !'
          ]},
          { type: 'fun-fact', text: 'En moyenne, une cyberattaque a lieu toutes les 39 secondes dans le monde. Mais 90% d\'entre elles pourraient être évitées avec de bonnes pratiques simples ! 🛡️' },
          { type: 'highlight', text: 'Les mises à jour de sécurité ne sont pas là pour t\'embêter ! Elles corrigent des failles que les hackers peuvent exploiter. Mets-les le plus vite possible !' }
        ]
      }
    ],
    quiz: [
      { question: 'Qu\'est-ce que le phishing ?', options: ['Un jeu de pêche en ligne', 'Une technique d\'arnaque par faux e-mails/sites', 'Un logiciel antivirus', 'Un type de réseau Wi-Fi'], correct: 1, explanation: 'Le phishing (hameçonnage) utilise de faux e-mails ou sites web pour te piéger et voler tes données personnelles.' },
      { question: 'Quel est le meilleur mot de passe parmi ceux-ci ?', options: ['123456', 'MonPrénom2010', 'MonChatMange3Pizzas!', 'password'], correct: 2, explanation: '"MonChatMange3Pizzas!" est long (20 caractères), contient majuscules, minuscules, chiffre et symbole, et n\'est pas devinable.' },
      { question: 'Que fait un ransomware ?', options: ['Il accélère ton PC', 'Il bloque tes fichiers et demande une rançon', 'Il protège contre les virus', 'Il améliore le Wi-Fi'], correct: 1, explanation: 'Un ransomware chiffre (verrouille) tous tes fichiers et demande de l\'argent pour les débloquer.' },
      { question: 'Qu\'est-ce que la double authentification (2FA) ?', options: ['Deux mots de passe', 'Un deuxième facteur de vérification en plus du mot de passe', 'Deux antivirus', 'Un double pare-feu'], correct: 1, explanation: 'Le 2FA ajoute une 2e couche : en plus du mot de passe, tu dois confirmer par un code SMS, une appli ou une clé physique.' },
      { question: 'Quelle est la meilleure attitude face à un e-mail suspect ?', options: ['L\'ouvrir pour vérifier', 'Cliquer sur le lien pour voir', 'Le supprimer ou le signaler', 'Le transférer à un ami'], correct: 2, explanation: 'Ne clique jamais sur les liens d\'un e-mail suspect. Supprime-le ou signale-le comme spam/phishing.' },
      { question: 'Pourquoi les mises à jour sont-elles importantes ?', options: ['Pour changer le look', 'Pour corriger des failles de sécurité', 'Pour ralentir l\'ordi', 'Pour ajouter de la pub'], correct: 1, explanation: 'Les mises à jour corrigent des failles de sécurité que les hackers pourraient exploiter pour infecter ton appareil.' },
      { question: 'Que faut-il vérifier avant d\'entrer un mot de passe sur un site ?', options: ['La couleur du site', 'L\'URL et le cadenas HTTPS', 'Le nombre de visiteurs', 'La taille du logo'], correct: 1, explanation: 'Vérifie toujours que l\'URL est correcte et que le cadenas 🔒 est présent. Les sites de phishing copient le design mais ont une URL différente.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 4 — Le Développement & l'IA
     ═══════════════════════════════════════════════════ */
  const dev = {
    id: 'dev',
    title: "Le Développement & l'IA",
    icon: '💻',
    color: '#22c55e',
    description: 'Découvre comment on crée des logiciels, des sites web et comment fonctionne l\'intelligence artificielle',
    lessons: [
      {
        title: 'C\'est quoi le code ?',
        icon: '📝',
        content: [
          { type: 'paragraph', text: 'Coder, c\'est donner des instructions à un ordinateur dans un langage qu\'il comprend. C\'est un peu comme écrire une recette de cuisine ultra précise !' },
          { type: 'analogy', text: '🍳 Imagine que tu expliques à un robot comment faire un gâteau. Tu ne peux pas dire "Mets de la farine". Tu dois dire "Prends le paquet de farine sur l\'étagère 3, ouvre-le, verse 200 grammes dans le bol bleu". La programmation, c\'est ça : tout détailler !' },
          { type: 'list', title: 'Les langages les plus populaires :', items: [
            'Python — simple et polyvalent, idéal pour commencer',
            'JavaScript — le langage du web (sites et applis)',
            'HTML/CSS — la structure et le design des pages web',
            'Java — les applis Android, les logiciels d\'entreprise',
            'C/C++ — les jeux vidéo, les systèmes embarqués',
            'SQL — pour gérer les bases de données'
          ]},
          { type: 'paragraph', text: 'Un algorithme, c\'est une suite d\'étapes logiques pour résoudre un problème. Tu en utilises tous les jours sans le savoir : une recette de cuisine, les instructions d\'un jeu de société, l\'itinéraire Google Maps... ce sont tous des algorithmes !' },
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
          { type: 'list', title: 'Comment l\'IA apprend (Machine Learning) :', items: [
            '1. On lui donne des milliers d\'exemples (données d\'entraînement)',
            '2. Elle cherche des patterns (motifs récurrents)',
            '3. Elle construit un modèle mathématique',
            '4. Elle peut faire des prédictions sur de nouvelles données',
            '5. On la corrige si elle se trompe → elle s\'améliore !'
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
      { question: 'Qu\'est-ce qu\'un algorithme ?', options: ['Un virus informatique', 'Une suite d\'étapes pour résoudre un problème', 'Un langage de programmation', 'Un type de processeur'], correct: 1, explanation: 'Un algorithme est une série d\'instructions logiques et ordonnées pour accomplir une tâche ou résoudre un problème.' },
      { question: 'Quel langage est utilisé par 100% des sites web ?', options: ['Python', 'Java', 'HTML/CSS/JavaScript', 'C++'], correct: 2, explanation: 'Tous les sites web utilisent HTML (structure), CSS (design) et JavaScript (interactivité). C\'est la base du web !' },
      { question: 'Qui est considéré comme le/la premier(e) programmeur(se) ?', options: ['Steve Jobs', 'Bill Gates', 'Ada Lovelace', 'Alan Turing'], correct: 2, explanation: 'Ada Lovelace a écrit le premier programme informatique en 1843, bien avant l\'invention des ordinateurs modernes.' },
      { question: 'Qu\'est-ce que le "frontend" d\'un site web ?', options: ['La base de données', 'La partie visible par l\'utilisateur', 'Le serveur', 'Le câble réseau'], correct: 1, explanation: 'Le frontend, c\'est tout ce que l\'utilisateur voit et avec quoi il interagit : le design, les boutons, les animations.' },
      { question: 'Comment une IA apprend-elle à reconnaître des images ?', options: ['On lui donne la réponse à chaque fois', 'On la programme manuellement', 'On l\'entraîne avec des milliers d\'exemples', 'Elle comprend toute seule'], correct: 2, explanation: 'Le Machine Learning consiste à montrer des milliers d\'exemples à l\'IA pour qu\'elle détecte des patterns et apprenne.' },
      { question: 'Qu\'est-ce qu\'une API ?', options: ['Un type de câble', 'Un pont entre le frontend et le backend', 'Un langage de programmation', 'Un virus'], correct: 1, explanation: 'Une API (Application Programming Interface) permet au frontend de communiquer avec le backend pour échanger des données.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 5 — L'informatique en entreprise
     ═══════════════════════════════════════════════════ */
  const enterprise = {
    id: 'enterprise',
    title: "L'informatique en entreprise",
    icon: '🏢',
    color: '#f59e0b',
    description: 'Découvre comment fonctionne un service informatique dans une entreprise, les métiers et l\'infrastructure',
    lessons: [
      {
        title: 'Le service informatique',
        icon: '🏗️',
        content: [
          { type: 'paragraph', text: 'Toutes les entreprises, même celles qui ne vendent pas de produits informatiques, ont besoin d\'un service IT. Une usine de pièces aéronautiques, un hôpital, une banque... tous dépendent de l\'informatique pour fonctionner !' },
          { type: 'analogy', text: '🏥 Le service informatique, c\'est un peu comme les médecins et infirmiers d\'un hôpital. Ils ne sont pas les "stars" (les chirurgiens qui opèrent), mais sans eux, l\'hôpital ne fonctionne pas. C\'est pareil : sans le service IT, les employés ne peuvent ni travailler, ni communiquer, ni accéder à leurs fichiers.' },
          { type: 'list', title: 'Ce que gère le service informatique :', items: [
            'Les ordinateurs et postes de travail de tous les employés',
            'Les serveurs qui stockent les fichiers et les applications',
            'Le réseau (Internet, Wi-Fi, câbles, sécurité)',
            'Les logiciels et licences',
            'Les téléphones, visioconfé, messagerie',
            'La sécurité (antivirus, pare-feu, sauvegardes)',
            'Le support technique (aider les utilisateurs)'
          ]},
          { type: 'fun-fact', text: 'Dans une entreprise de 200 personnes, le service informatique peut recevoir plus de 50 demandes d\'aide par jour ! "Mon écran est noir", "J\'ai oublié mon mot de passe", "L\'imprimante ne marche plus"... 🖨️' },
          { type: 'highlight', text: 'Un informaticien en entreprise ne fait pas que "réparer des PC". C\'est un métier très varié : architecture réseau, sécurité, développement, gestion de projet, conseil, et bien plus !' }
        ]
      },
      {
        title: 'Les tickets et le support',
        icon: '🎫',
        content: [
          { type: 'paragraph', text: 'Quand un employé a un problème informatique, il ne débarque pas directement dans le bureau IT. Il crée un "ticket" : une demande enregistrée dans un logiciel spécialisé.' },
          { type: 'analogy', text: '🎟️ C\'est comme prendre un ticket au guichet de la Poste. Tu décris ton problème, et le ticket est attribué à un technicien qui le résoudra par ordre de priorité. C\'est organisé pour que rien ne soit oublié !' },
          { type: 'list', title: 'Les niveaux de priorité :', items: [
            '🔴 Urgente — L\'entreprise ne peut plus travailler (serveur planté, panne réseau)',
            '🟠 Haute — Un service entier est impacté',
            '🟡 Moyenne — Un employé ne peut pas faire une tâche spécifique',
            '🟢 Basse — Demandes de changement, nouvelles installations'
          ]},
          { type: 'list', title: 'Les niveaux de support :', items: [
            'Niveau 1 (L1) — Le helpdesk : premiers diagnostics, problèmes simples',
            'Niveau 2 (L2) — Les techniciens spécialisés : problèmes plus complexes',
            'Niveau 3 (L3) — Les experts/ingénieurs : problèmes critiques et architecture'
          ]},
          { type: 'paragraph', text: 'Le SLA (Service Level Agreement), c\'est un contrat qui définit les délais de résolution. Par exemple : une panne critique doit être résolue en 4 heures maximum !' },
          { type: 'fun-fact', text: 'La phrase la plus entendue par les techniciens IT : "Avez-vous essayé d\'éteindre et de rallumer ?" Et le plus drôle, c\'est que ça résout réellement 50% des problèmes ! 🔄' },
          { type: 'highlight', text: 'Un bon ticket contient : une description claire du problème, les étapes pour le reproduire, des captures d\'écran, et le numéro de poste. Plus c\'est précis, plus c\'est résolu vite !' }
        ]
      },
      {
        title: 'Les métiers de l\'informatique',
        icon: '👨‍💻',
        content: [
          { type: 'paragraph', text: 'L\'informatique offre une incroyable diversité de métiers. Que tu aimes la technique, le design, la stratégie ou la communication, il y a un métier IT pour toi !' },
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
          { type: 'analogy', text: '🏙️ Si l\'IT était une ville, les administrateurs seraient les urbanistes (ils planifient), les développeurs seraient les constructeurs (ils bâtissent), les techniciens support seraient les pompiers (ils interviennent vite), et les ingénieurs sécurité seraient la police (ils protègent).' },
          { type: 'highlight', text: 'Le métier de développeur est le 2e métier le plus recherché en France. En 2025, il manque plus de 80 000 profils IT en France : les opportunités sont énormes !' },
          { type: 'fun-fact', text: 'Le salaire médian d\'un ingénieur cybersécurité en France est d\'environ 50 000€ par an. En début de carrière ! Et ça peut aller bien au-delà avec l\'expérience 💰' }
        ]
      }
    ],
    quiz: [
      { question: 'Pourquoi une usine aéronautique a-t-elle besoin d\'un service IT ?', options: ['Pour vendre des ordinateurs', 'Pour gérer les systèmes, réseaux et postes de travail', 'Pour faire de la publicité', 'Elle n\'en a pas besoin'], correct: 1, explanation: 'Toute entreprise, même non-tech, dépend de l\'informatique : e-mails, fichiers, logiciels métier, réseau, sécurité...' },
      { question: 'Qu\'est-ce qu\'un ticket informatique ?', options: ['Un billet de concert', 'Une demande d\'aide enregistrée', 'Un code promo', 'Un virus'], correct: 1, explanation: 'Un ticket est une demande formelle créée dans un outil spécialisé pour signaler un problème ou faire une demande IT.' },
      { question: 'Quel niveau de support gère les problèmes les plus complexes ?', options: ['Niveau 1 (L1)', 'Niveau 2 (L2)', 'Niveau 3 (L3)', 'Niveau 0'], correct: 2, explanation: 'Le Niveau 3 regroupe les experts et ingénieurs qui traitent les problèmes les plus critiques et complexes.' },
      { question: 'Qu\'est-ce qu\'un SLA ?', options: ['Un langage de programmation', 'Un calendrier de vacances', 'Un contrat de niveaux de service', 'Un logiciel de sécurité'], correct: 2, explanation: 'Le SLA (Service Level Agreement) définit les engagements de délais et de qualité pour résoudre les problèmes IT.' },
      { question: 'Quel métier protège l\'entreprise contre les cyberattaques ?', options: ['Développeur', 'Data analyst', 'Technicien support', 'Ingénieur cybersécurité'], correct: 3, explanation: 'L\'ingénieur cybersécurité est spécialisé dans la protection des systèmes, la détection des menaces et la réponse aux incidents.' },
      { question: 'Que fait un DevOps ?', options: ['Il répare les imprimantes', 'Il automatise les déploiements', 'Il crée des designs', 'Il vend des logiciels'], correct: 1, explanation: 'Le DevOps combine développement et opérations : il automatise les tests, les déploiements et la gestion de l\'infrastructure.' }
    ]
  };

  /* ═══════════════════════════════════════════════════
     MODULE 6 — Le Numérique au Quotidien
     ═══════════════════════════════════════════════════ */
  const daily = {
    id: 'daily',
    title: 'Le Numérique au Quotidien',
    icon: '📱',
    color: '#ec4899',
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
          { type: 'analogy', text: '🎯 L\'algorithme de TikTok, c\'est comme un ami qui te connaît super bien. Il observe ce que tu regardes, ce que tu likes, combien de temps tu restes sur une vidéo... et il te propose du contenu qu\'il pense que tu vas aimer. Plus tu l\'utilises, mieux il te connaît !' },
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
            'Tes messages (parfois même ceux des messageries "privées")',
            'Tes photos et vidéos (et les métadonnées : lieu, date, appareil)'
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

  /* ───────── Expose all modules ───────── */
  Data.MODULES = [hardware, networks, security, dev, enterprise, daily];

  window.ITData = Data;
})();
