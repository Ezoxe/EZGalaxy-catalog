export default {
  "id": "os",
  "title": "Systèmes d'exploitation",
  "icon": "🐧",
  "color": "#06b6d4",
  "tier": 2,
  "requiredModules": [
    "daily"
  ],
  "description": "Plonge dans le fonctionnement des OS : noyau, processus, mémoire, et le terminal",
  "lessons": [
    {
      "title": "Histoire des systèmes d'exploitation",
      "icon": "📜",
      "content": [
        {
          "type": "paragraph",
          "text": "Les systèmes d'exploitation ont une histoire fascinante, des cartes perforées aux interfaces tactiles d'aujourd'hui !"
        },
        {
          "type": "steps",
          "title": "Frise chronologique des OS",
          "steps": [
            "1956 — GM-NAA I/O : le tout premier OS, pour un ordinateur IBM 🏭",
            "1969 — Unix naît aux Bell Labs, ancêtre de Linux et macOS 🔬",
            "1981 — MS-DOS : Microsoft entre en jeu avec IBM 💾",
            "1984 — Mac OS : Apple révolutionne avec l'interface graphique 🖱️",
            "1991 — Linux : Linus Torvalds crée un noyau libre et gratuit 🐧",
            "1995 — Windows 95 : la révolution grand public de Microsoft 🪟",
            "2007 — iOS et Android transforment le mobile 📱",
            "2020+ — Cloud OS, conteneurs, et IA intégrée aux OS ☁️"
          ]
        },
        {
          "type": "analogy",
          "text": "📖 L'histoire des OS, c'est comme l'évolution des véhicules : on est passé de la charrette à bras (cartes perforées) au vaisseau spatial (OS modernes avec IA)."
        },
        {
          "type": "fun-fact",
          "text": "Le nom \"Linux\" vient de \"Linus + Unix\". Linus Torvalds avait d'abord voulu l'appeler \"Freax\" (free + Unix + x), mais l'admin du serveur FTP a préféré \"Linux\" ! 🐧"
        },
        {
          "type": "highlight",
          "text": "Unix (1969) a inspiré presque tous les OS modernes : macOS et iOS en descendent directement, Linux et Android en reprennent les principes !"
        }
      ]
    },
    {
      "title": "Architecture d'un OS",
      "icon": "🏗️",
      "content": [
        {
          "type": "paragraph",
          "text": "Un OS est organisé en couches, comme un gâteau. Chaque couche a un rôle précis et communique avec les autres."
        },
        {
          "type": "interactive-diagram",
          "title": "Les couches d'un OS — clique pour explorer",
          "elements": [
            {
              "id": "apps",
              "label": "📱 Applications",
              "x": 50,
              "y": 10,
              "info": "Les programmes que tu utilises (navigateur, jeux, bureautique). Ils tournent dans l'espace utilisateur."
            },
            {
              "id": "shell",
              "label": "💻 Shell / Interface",
              "x": 50,
              "y": 30,
              "info": "L'interface entre toi et l'OS : soit graphique (GUI), soit en ligne de commande (CLI / terminal)."
            },
            {
              "id": "syscalls",
              "label": "🔌 Appels système",
              "x": 50,
              "y": 50,
              "info": "Les \"portes\" entre les applications et le noyau. Chaque action (ouvrir un fichier, envoyer des données) passe par ici."
            },
            {
              "id": "kernel",
              "label": "⚙️ Noyau (Kernel)",
              "x": 50,
              "y": 70,
              "info": "Le cœur de l'OS. Il gère la mémoire, les processus, les fichiers et communique avec le matériel."
            },
            {
              "id": "hw",
              "label": "🖥️ Matériel",
              "x": 50,
              "y": 90,
              "info": "CPU, RAM, disque, réseau... Le noyau traduit les demandes des applications en instructions matérielles."
            }
          ]
        },
        {
          "type": "list",
          "title": "Ce que gère le noyau (kernel) :",
          "items": [
            "Gestion des processus — quel programme tourne quand et combien de temps",
            "Gestion de la mémoire — qui utilise quelle zone de RAM",
            "Système de fichiers — organiser et retrouver les données sur le disque",
            "Pilotes (drivers) — faire communiquer l'OS avec le matériel",
            "Sécurité — isoler les programmes entre eux et protéger le système"
          ]
        },
        {
          "type": "analogy",
          "text": "🏰 Le kernel, c'est comme le roi dans un château. Les applications sont les villageois : elles ne peuvent pas accéder directement aux ressources (le trésor). Elles doivent demander au roi via les \"appels système\" (les gardes)."
        },
        {
          "type": "fun-fact",
          "text": "Le noyau Linux contient plus de 30 millions de lignes de code, écrites par des milliers de développeurs du monde entier ! C'est l'un des plus grands projets open source de l'histoire. 🌍"
        }
      ]
    },
    {
      "title": "Le terminal et les commandes",
      "icon": "⌨️",
      "content": [
        {
          "type": "paragraph",
          "text": "Le terminal (ou ligne de commande), c'est l'outil le plus puissant de l'informaticien. Avant les interfaces graphiques, TOUT se faisait en ligne de commande !"
        },
        {
          "type": "mini-terminal",
          "title": "Essaie des commandes Linux !",
          "commands": {
            "ls": "Documents/  Downloads/  Images/  Music/  Desktop/",
            "pwd": "/home/user",
            "cd Documents": "user@linux:~/Documents$",
            "mkdir projet": "(dossier \"projet\" créé)",
            "cat hello.txt": "Bonjour et bienvenue dans le terminal Linux ! 🐧",
            "whoami": "user",
            "uname -a": "Linux discovery 6.1.0 #1 SMP x86_64 GNU/Linux",
            "date": "mer. 05 mars 2026, 14:30:00 CET",
            "echo \"Hello World\"": "Hello World",
            "help": "Commandes disponibles :\n  ls          — Lister les fichiers\n  pwd         — Afficher le répertoire courant\n  cd <dir>    — Changer de répertoire\n  mkdir <dir> — Créer un dossier\n  cat <file>  — Afficher un fichier\n  whoami      — Nom d'utilisateur\n  uname -a    — Info système\n  date        — Date et heure\n  echo <txt>  — Afficher du texte"
          }
        },
        {
          "type": "list",
          "title": "Commandes essentielles Linux/macOS :",
          "items": [
            "ls — lister les fichiers du dossier courant",
            "cd — changer de répertoire (dossier)",
            "pwd — afficher le chemin du dossier courant",
            "mkdir — créer un nouveau dossier",
            "cp — copier un fichier",
            "mv — déplacer ou renommer un fichier",
            "rm — supprimer un fichier (⚠️ pas de corbeille !)",
            "cat — afficher le contenu d'un fichier"
          ]
        },
        {
          "type": "highlight",
          "text": "La commande \"sudo\" (Super User DO) te donne les droits administrateur. C'est tellement puissant que le dicton dit : \"Avec un grand pouvoir vient une grande responsabilité\" 🦸"
        },
        {
          "type": "fun-fact",
          "text": "Le terminal est plus rapide que l'interface graphique pour beaucoup de tâches ! Un administrateur système expérimenté peut modifier des centaines de fichiers en une seule commande. 🚀"
        }
      ]
    },
    {
      "title": "Linux vs Windows vs macOS",
      "icon": "⚔️",
      "content": [
        {
          "type": "paragraph",
          "text": "Les trois principaux systèmes d'exploitation de bureau ont chacun leurs forces et leurs faiblesses. Aucun n'est \"le meilleur\" — ça dépend de l'usage !"
        },
        {
          "type": "drag-match",
          "question": "Associe chaque caractéristique à son OS :",
          "pairs": [
            {
              "term": "Open source et gratuit",
              "definition": "Linux"
            },
            {
              "term": "Écosystème Apple intégré",
              "definition": "macOS"
            },
            {
              "term": "Compatibilité logiciels/jeux max",
              "definition": "Windows"
            },
            {
              "term": "Domine les serveurs web",
              "definition": "Linux"
            },
            {
              "term": "DirectX et Xbox Game Pass",
              "definition": "Windows"
            },
            {
              "term": "Basé sur Unix (BSD)",
              "definition": "macOS"
            }
          ]
        },
        {
          "type": "list",
          "title": "🪟 Windows — Points forts",
          "items": [
            "Le plus compatible (logiciels, jeux, périphériques)",
            "Le plus utilisé en entreprise (Active Directory)",
            "Parfait pour le gaming (DirectX, Xbox Game Pass)"
          ]
        },
        {
          "type": "list",
          "title": "🍎 macOS — Points forts",
          "items": [
            "Excellent pour le créatif (photo, vidéo, musique)",
            "Intégration parfaite avec iPhone/iPad/Apple Watch",
            "Interface élégante et stable"
          ]
        },
        {
          "type": "list",
          "title": "🐧 Linux — Points forts",
          "items": [
            "Gratuit et open source (modifiable à l'infini)",
            "Le roi des serveurs et du cloud",
            "Léger — peut faire revivre un vieil ordinateur",
            "Sécurisé — beaucoup moins visé par les virus grand public"
          ]
        },
        {
          "type": "fun-fact",
          "text": "Il existe des centaines de distributions (« distros ») Linux différentes ! Ubuntu, Fedora, Arch, Debian, Mint... Il y a même une distro appelée \"Hannah Montana Linux\" avec un thème rose 🎵"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Quel est l'ancêtre commun de Linux et macOS ?",
      "options": [
        "Windows",
        "MS-DOS",
        "Unix",
        "Android"
      ],
      "correct": 2,
      "explanation": "Unix (1969) est l'ancêtre de Linux (fork) et macOS (basé sur BSD, un descendant d'Unix)."
    },
    {
      "question": "Que fait le noyau (kernel) d'un OS ?",
      "options": [
        "Affiche l'interface graphique",
        "Gère le matériel et les processus",
        "Navigue sur Internet",
        "Joue de la musique"
      ],
      "correct": 1,
      "explanation": "Le kernel est le cœur de l'OS : il gère la mémoire, les processus, le stockage et la communication avec le matériel."
    },
    {
      "question": "Que fait la commande \"ls\" dans un terminal Linux ?",
      "options": [
        "Éteindre l'ordinateur",
        "Lister les fichiers",
        "Supprimer un fichier",
        "Installer un programme"
      ],
      "correct": 1,
      "explanation": "\"ls\" (list) affiche la liste des fichiers et dossiers du répertoire courant."
    },
    {
      "question": "Quel OS est open source et gratuit ?",
      "options": [
        "Windows",
        "macOS",
        "Linux",
        "iOS"
      ],
      "correct": 2,
      "explanation": "Linux est entièrement open source et gratuit. Son code est modifiable par n'importe qui."
    },
    {
      "question": "Pour quel usage macOS est-il particulièrement réputé ?",
      "options": [
        "Le gaming",
        "La création (photo/vidéo/musique)",
        "Les serveurs web",
        "L'administration réseau"
      ],
      "correct": 1,
      "explanation": "macOS et les Mac sont très populaires chez les créatifs grâce à des apps comme Final Cut, Logic Pro, et l'écosystème Apple."
    },
    {
      "question": "Que signifie \"sudo\" ?",
      "options": [
        "Super Ultra Driver",
        "Super User Do",
        "System Upgrade",
        "Safe Undo"
      ],
      "correct": 1,
      "explanation": "\"sudo\" = Super User DO. Il exécute une commande avec les droits administrateur (root)."
    },
    {
      "question": "Quel OS domine les serveurs web ?",
      "options": [
        "Windows (90%)",
        "macOS (70%)",
        "Linux",
        "ChromeOS (80%)"
      ],
      "correct": 2,
      "explanation": "Linux fait tourner environ Domine les serveurs web grâce à sa stabilité, sa sécurité et sa gratuité."
    },
    {
      "question": "Combien de lignes de code contient le noyau Linux ?",
      "options": [
        "100 000",
        "1 million",
        "30+ millions",
        "1 milliard"
      ],
      "correct": 2,
      "explanation": "Le noyau Linux contient plus de 30 millions de lignes de code, contribuées par plus de 15 000 développeurs."
    }
  ]
};
