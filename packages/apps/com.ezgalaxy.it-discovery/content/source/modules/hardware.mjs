export default {
  "id": "hardware",
  "title": "C'est quoi l'informatique ?",
  "icon": "🖥️",
  "color": "#3b82f6",
  "tier": 1,
  "requiredModules": [],
  "description": "Découvre les composants d'un ordinateur, comment il fonctionne et ce qu'est un système d'exploitation",
  "lessons": [
    {
      "title": "Les composants d'un ordinateur",
      "icon": "🔧",
      "content": [
        {
          "type": "paragraph",
          "text": "Un ordinateur, c'est un peu comme un corps humain : chaque organe a un rôle précis et ils travaillent tous ensemble. Voyons les composants principaux !"
        },
        {
          "type": "analogy",
          "text": "🧠 Le CPU (processeur), c'est le cerveau de l'ordi. C'est lui qui fait tous les calculs et exécute les programmes. Plus il est puissant, plus tu peux faire de choses en même temps !"
        },
        {
          "type": "analogy",
          "text": "📋 La RAM (mémoire vive), c'est comme ton bureau de travail. Plus il est grand, plus tu peux ouvrir de cahiers en même temps. Quand tu éteins l'ordi, le bureau se vide !"
        },
        {
          "type": "analogy",
          "text": "📦 Le disque dur (HDD/SSD), c'est comme ton armoire. C'est là que sont rangés tous tes fichiers, photos, jeux... Même quand l'ordi est éteint, tout reste dedans."
        },
        {
          "type": "drag-match",
          "question": "Associe chaque composant à son rôle :",
          "pairs": [
            {
              "term": "CPU",
              "definition": "Fait les calculs et exécute les programmes"
            },
            {
              "term": "RAM",
              "definition": "Mémoire de travail temporaire"
            },
            {
              "term": "SSD",
              "definition": "Stockage permanent rapide"
            },
            {
              "term": "GPU",
              "definition": "Gère l'affichage et les graphismes"
            },
            {
              "term": "Carte mère",
              "definition": "Relie tous les composants"
            }
          ]
        },
        {
          "type": "list",
          "title": "Les composants essentiels :",
          "items": [
            "CPU (processeur) — le cerveau qui calcule",
            "RAM — la mémoire de travail temporaire",
            "Disque dur/SSD — le stockage permanent",
            "Carte mère — le squelette qui relie tout",
            "Alimentation — le cœur qui fournit l'énergie",
            "Carte graphique (GPU) — pour l'affichage et les jeux"
          ]
        },
        {
          "type": "fun-fact",
          "text": "Le premier ordinateur (ENIAC, 1945) pesait 30 tonnes et occupait une pièce entière ! Aujourd'hui, ton smartphone est des milliards de fois plus puissant, et il tient dans ta poche 📱"
        },
        {
          "type": "highlight",
          "text": "Un SSD est jusqu'à 100x plus rapide qu'un ancien disque dur mécanique. C'est pour ça que les ordis modernes démarrent en quelques secondes !"
        },
        {
          "type": "interactive-diagram",
          "title": "Schéma d'un ordinateur — clique sur chaque composant !",
          "elements": [
            {
              "id": "cpu",
              "label": "🧠 CPU",
              "x": 50,
              "y": 15,
              "info": "Le processeur (CPU) exécute toutes les instructions. Marques courantes : Intel Core, AMD Ryzen."
            },
            {
              "id": "ram",
              "label": "📋 RAM",
              "x": 50,
              "y": 35,
              "info": "La RAM stocke temporairement les données des programmes ouverts. Typiquement 8-32 Go."
            },
            {
              "id": "ssd",
              "label": "📦 SSD",
              "x": 50,
              "y": 55,
              "info": "Le SSD stocke durablement tes fichiers. Utilise des puces flash, pas de pièces mécaniques."
            },
            {
              "id": "gpu",
              "label": "🎮 GPU",
              "x": 50,
              "y": 75,
              "info": "La carte graphique gère les images, vidéos, jeux et aussi le machine learning."
            },
            {
              "id": "psu",
              "label": "⚡ Alim",
              "x": 15,
              "y": 90,
              "info": "L'alimentation convertit le courant électrique pour tous les composants."
            },
            {
              "id": "mobo",
              "label": "🔌 Carte mère",
              "x": 85,
              "y": 90,
              "info": "La carte mère est le circuit imprimé qui connecte tous les composants entre eux."
            }
          ]
        }
      ]
    },
    {
      "title": "Le système d'exploitation",
      "icon": "💿",
      "content": [
        {
          "type": "paragraph",
          "text": "Le système d'exploitation (OS), c'est le grand chef d'orchestre de ton ordinateur. Sans lui, impossible de faire quoi que ce soit !"
        },
        {
          "type": "analogy",
          "text": "🎭 Imagine un théâtre : le matériel (CPU, RAM...) ce sont les acteurs et la scène. Le système d'exploitation, c'est le metteur en scène qui dit à chacun quoi faire, quand, et dans quel ordre."
        },
        {
          "type": "list",
          "title": "Les OS les plus connus :",
          "items": [
            "Windows — le plus utilisé sur les PC (Microsoft)",
            "macOS — celui des Mac (Apple)",
            "Linux — gratuit et open source, très utilisé sur les serveurs",
            "Android — pour les smartphones (basé sur Linux)",
            "iOS — pour les iPhone et iPad (Apple)"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Flashcards — Retourne les cartes pour apprendre !",
          "cards": [
            {
              "front": "Windows",
              "back": "OS de Microsoft, le plus utilisé sur les PC (>70% des desktops)"
            },
            {
              "front": "Linux",
              "back": "OS libre et open source. Il fait tourner la grande majorité des serveurs web."
            },
            {
              "front": "macOS",
              "back": "OS d'Apple pour les Mac. Basé sur Unix (BSD)."
            },
            {
              "front": "Android",
              "back": "OS mobile de Google, basé sur le noyau Linux. >70% des smartphones."
            },
            {
              "front": "Kernel",
              "back": "Le noyau de l'OS. Il communique directement avec le matériel."
            }
          ]
        },
        {
          "type": "paragraph",
          "text": "L'OS gère tout : il distribue la mémoire aux programmes, envoie les images à l'écran, gère le clavier et la souris, et s'occupe des fichiers sur le disque dur."
        },
        {
          "type": "fun-fact",
          "text": "Linux fait tourner la grande majorité des serveurs d'Internet, 100 % des 500 supercalculateurs les plus puissants du monde, et même la Station Spatiale Internationale ! 🚀"
        },
        {
          "type": "highlight",
          "text": "Quand tu ouvres le Gestionnaire des tâches (Ctrl+Shift+Échap sur Windows), tu peux voir tous les programmes que l'OS gère en même temps. Essaie, tu seras surpris du nombre !"
        }
      ]
    },
    {
      "title": "Les périphériques",
      "icon": "🖨️",
      "content": [
        {
          "type": "paragraph",
          "text": "Les périphériques, ce sont tous les appareils connectés à ton ordinateur pour interagir avec lui. On les sépare en deux catégories :"
        },
        {
          "type": "list",
          "title": "⬅️ Périphériques d'entrée (tu envoies des infos à l'ordi) :",
          "items": [
            "Clavier — pour écrire",
            "Souris — pour pointer et cliquer",
            "Micro — pour parler",
            "Webcam — pour la vidéo",
            "Scanner — pour numériser des documents",
            "Manette de jeu — pour jouer !"
          ]
        },
        {
          "type": "list",
          "title": "➡️ Périphériques de sortie (l'ordi t'envoie des infos) :",
          "items": [
            "Écran — pour voir",
            "Haut-parleurs/casque — pour entendre",
            "Imprimante — pour imprimer sur papier"
          ]
        },
        {
          "type": "drag-match",
          "question": "Classe ces périphériques (entrée ou sortie) :",
          "pairs": [
            {
              "term": "Clavier",
              "definition": "Entrée"
            },
            {
              "term": "Écran",
              "definition": "Sortie"
            },
            {
              "term": "Souris",
              "definition": "Entrée"
            },
            {
              "term": "Haut-parleur",
              "definition": "Sortie"
            },
            {
              "term": "Webcam",
              "definition": "Entrée"
            },
            {
              "term": "Imprimante",
              "definition": "Sortie"
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🎮 Le clavier et la souris sont tes \"mains\" pour parler à l'ordi. L'écran et les haut-parleurs sont ses \"yeux\" et sa \"bouche\" pour te répondre !"
        },
        {
          "type": "fun-fact",
          "text": "Il existe des périphériques qui sont à la fois entrée ET sortie ! Un écran tactile par exemple : il affiche des images (sortie) ET détecte tes doigts (entrée) 🤯"
        },
        {
          "type": "highlight",
          "text": "L'USB (Universal Serial Bus) est le connecteur le plus utilisé. L'USB-C peut transférer des données, de la vidéo ET de l'énergie en même temps !"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Quel composant est le \"cerveau\" de l'ordinateur ?",
      "options": [
        "RAM",
        "CPU",
        "Disque dur",
        "Carte graphique"
      ],
      "correct": 1,
      "explanation": "Le CPU (processeur) exécute toutes les instructions et fait les calculs. C'est bien le cerveau !"
    },
    {
      "question": "Que se passe-t-il avec la RAM quand on éteint l'ordinateur ?",
      "options": [
        "Elle garde les données",
        "Elle se vide",
        "Elle se met en veille",
        "Elle se copie sur le disque"
      ],
      "correct": 1,
      "explanation": "La RAM est une mémoire volatile : elle se vide dès qu'il n'y a plus d'électricité !"
    },
    {
      "question": "Quel OS est utilisé sur la grande majorité des serveurs Internet ?",
      "options": [
        "Windows",
        "macOS",
        "Linux",
        "Android"
      ],
      "correct": 2,
      "explanation": "Linux fait tourner la grande majorité des serveurs web dans le monde, grâce à sa stabilité et à sa gratuité."
    },
    {
      "question": "Qu'est-ce qu'un périphérique d'entrée ?",
      "options": [
        "Un écran",
        "Un haut-parleur",
        "Un clavier",
        "Une imprimante"
      ],
      "correct": 2,
      "explanation": "Le clavier permet d'envoyer des informations à l'ordi (entrée). L'écran, lui, est un périphérique de sortie."
    },
    {
      "question": "Que fait un SSD par rapport à un HDD classique ?",
      "options": [
        "Il est plus lent",
        "Il stocke plus",
        "Il est beaucoup plus rapide",
        "Il consomme plus"
      ],
      "correct": 2,
      "explanation": "Un SSD utilise de la mémoire flash (pas de pièces mécaniques) et est jusqu'à 100x plus rapide qu'un HDD !"
    },
    {
      "question": "Quel est le rôle principal du système d'exploitation ?",
      "options": [
        "Jouer à des jeux",
        "Gérer le matériel et les logiciels",
        "Se connecter à Internet",
        "Protéger contre les virus"
      ],
      "correct": 1,
      "explanation": "L'OS est le chef d'orchestre qui gère le matériel, les programmes, les fichiers et toutes les ressources."
    },
    {
      "question": "Quel raccourci ouvre directement le Gestionnaire des tâches sous Windows ?",
      "options": [
        "Ctrl+Alt+F4",
        "Ctrl+Shift+Échap",
        "Alt+Tab",
        "Win+L"
      ],
      "correct": 1,
      "explanation": "Ctrl+Shift+Échap ouvre directement le Gestionnaire des tâches (Ctrl+Alt+Suppr affiche d'abord un menu)."
    },
    {
      "question": "Quel composant relie tous les autres entre eux ?",
      "options": [
        "L'alimentation",
        "La carte mère",
        "La carte graphique",
        "La RAM"
      ],
      "correct": 1,
      "explanation": "La carte mère est le grand circuit sur lequel se branchent processeur, mémoire, stockage et cartes d'extension."
    }
  ]
};
