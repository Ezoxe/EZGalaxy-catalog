export default {
  "id": "daily",
  "title": "Le Numérique au Quotidien",
  "icon": "📱",
  "color": "#ec4899",
  "tier": 1,
  "requiredModules": [],
  "description": "L'informatique dans ta vie de tous les jours : smartphone, réseaux sociaux, IA et données personnelles",
  "lessons": [
    {
      "title": "Ton smartphone, un super-ordinateur",
      "icon": "📱",
      "content": [
        {
          "type": "paragraph",
          "text": "Ton smartphone est bien plus qu'un téléphone. C'est un ordinateur complet qui tient dans ta poche, et il est plus puissant que les ordinateurs qui ont envoyé l'Homme sur la Lune !"
        },
        {
          "type": "list",
          "title": "🔍 Ce qu'il y a dans ton smartphone :",
          "items": [
            "Un processeur (SoC) — le cerveau, comme dans un PC",
            "De la RAM — 4 à 16 Go en général",
            "Du stockage (flash) — 64 à 1 To !",
            "Des capteurs : GPS, accéléromètre, gyroscope, boussole, proximité...",
            "Des connexions : Wi-Fi, Bluetooth, 4G/5G, NFC",
            "Des caméras avec de l'IA intégrée pour les photos"
          ]
        },
        {
          "type": "true-false",
          "title": "Vrai ou Faux ?",
          "statements": [
            {
              "text": "Ton smartphone est plus puissant que l'ordinateur d'Apollo 11",
              "answer": true,
              "explanation": "L'ordinateur d'Apollo 11 avait 74 Ko de RAM. Ton smartphone en a ~8 Go, soit 100 000+ fois plus !"
            },
            {
              "text": "Le Bluetooth a une portée de plusieurs kilomètres",
              "answer": false,
              "explanation": "Le Bluetooth classique a une portée de 10-100 mètres selon la version."
            },
            {
              "text": "Le NFC permet de payer sans contact avec ton téléphone",
              "answer": true,
              "explanation": "Le NFC (Near Field Communication) est la technologie derrière le paiement sans contact."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🚀 L'ordinateur de bord d'Apollo 11 (qui a emmené les astronautes sur la Lune en 1969) avait 74 Ko de mémoire. Ton smartphone en a environ 8 Go, soit plus de 100 000 fois plus !"
        },
        {
          "type": "highlight",
          "text": "Les applis ne sont pas gratuites par hasard ! Beaucoup gagnent de l'argent en collectant tes données (position, habitudes, contacts) pour vendre de la publicité ciblée."
        },
        {
          "type": "fun-fact",
          "text": "Un Français passe en moyenne 3h30 par jour sur son smartphone. Sur une vie de 80 ans, ça ferait près de 12 années entières les yeux rivés sur un écran ! 👀"
        }
      ]
    },
    {
      "title": "L'IA dans ta vie quotidienne",
      "icon": "🤖",
      "content": [
        {
          "type": "paragraph",
          "text": "Tu utilises de l'IA des dizaines de fois par jour sans t'en rendre compte. Elle est devenue invisible tellement elle est intégrée dans nos outils !"
        },
        {
          "type": "list",
          "title": "🤖 L'IA que tu utilises tous les jours :",
          "items": [
            "Correction automatique / prédiction de texte sur ton clavier",
            "Reconnaissance faciale pour déverrouiller ton téléphone",
            "Filtres et effets photo sur Snap et Instagram",
            "Recommandations YouTube, TikTok, Spotify",
            "Google Maps : meilleur itinéraire, trafic en temps réel",
            "Assistants vocaux : Siri, Google Assistant, Alexa",
            "Traduction automatique dans ton navigateur"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Termes IA du quotidien",
          "cards": [
            {
              "front": "Algorithme de recommandation",
              "back": "Programme qui analyse tes goûts pour te suggérer du contenu (YouTube, TikTok, Spotify)"
            },
            {
              "front": "Deepfake",
              "back": "Vidéo/image truquée par IA. Le visage/voix d'une personne est remplacé de façon réaliste."
            },
            {
              "front": "Reconnaissance faciale",
              "back": "IA qui identifie un visage en analysant ses caractéristiques uniques (yeux, nez, bouche)."
            },
            {
              "front": "NLP",
              "back": "Natural Language Processing — IA qui comprend et génère du langage humain (ChatGPT, Siri)."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🎯 L'algorithme de TikTok, c'est comme un ami qui te connaît super bien. Il observe ce que tu regardes, ce que tu likes, combien de temps tu restes sur une vidéo... et il te propose du contenu qu'il pense que tu vas aimer."
        },
        {
          "type": "highlight",
          "text": "Les \"deepfakes\" sont des vidéos ou images créées par l'IA où le visage/la voix d'une personne est remplacé(e). C'est bluffant, mais ça peut servir à de la désinformation. Vérifie toujours tes sources !"
        },
        {
          "type": "fun-fact",
          "text": "L'algorithme de TikTok tient compte de nombreux signaux : temps de visionnage, partages, revisionnages, et même la musique utilisée. Il apprend très vite ce qui te retient ! 🧠"
        }
      ]
    },
    {
      "title": "Tes données personnelles",
      "icon": "📊",
      "content": [
        {
          "type": "paragraph",
          "text": "Tes données personnelles, c'est l'or du 21e siècle. Les entreprises les collectent, les analysent et les monétisent. Comprendre ça, c'est le premier pas pour reprendre le contrôle !"
        },
        {
          "type": "list",
          "title": "📊 Ce que les applis savent sur toi :",
          "items": [
            "Ta position GPS à chaque instant",
            "Tes recherches (tant que l'historique est activé)",
            "Tes contacts, tes e-mails",
            "Tes habitudes : heures de réveil, de coucher, de sport...",
            "Tes achats en ligne",
            "Tes photos et vidéos (et les métadonnées : lieu, date, appareil)"
          ]
        },
        {
          "type": "true-false",
          "title": "Vrai ou Faux — Données personnelles",
          "statements": [
            {
              "text": "Le mode incognito protège entièrement ta vie privée",
              "answer": false,
              "explanation": "Le mode incognito ne garde pas l'historique local, mais ton FAI et les sites voient quand même ton activité."
            },
            {
              "text": "Le RGPD te donne le droit de demander la suppression de tes données",
              "answer": true,
              "explanation": "Le RGPD européen te donne le droit d'accès, de modification ET de suppression de tes données."
            },
            {
              "text": "Une photo peut révéler l'endroit où elle a été prise",
              "answer": true,
              "explanation": "La suppression côté utilisateur n'efface pas les données côté serveur de Google."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🏠 Imagine qu'un inconnu te suive partout, note tout ce que tu fais, tout ce que tu achètes, tout ce que tu dis, et vende ces infos à des entreprises. C'est un peu ce que font les applis qui collectent tes données !"
        },
        {
          "type": "list",
          "title": "🔐 Comment protéger tes données :",
          "items": [
            "Lis les permissions demandées par les applis avant de les accepter !",
            "Désactive la localisation pour les applis qui n'en ont pas besoin",
            "Utilise des moteurs de recherche respectueux (DuckDuckGo)",
            "Vérifie tes paramètres de confidentialité sur chaque réseau social",
            "Le RGPD (en Europe) te donne le droit de demander la suppression de tes données"
          ]
        },
        {
          "type": "highlight",
          "text": "En Europe, le RGPD te donne des droits : accès, modification et suppression de tes données personnelles. Tu peux demander à n'importe quelle entreprise de supprimer ce qu'elle sait sur toi !"
        },
        {
          "type": "fun-fact",
          "text": "Chaque minute, environ 500 heures de vidéo sont mises en ligne sur YouTube. Il faudrait des semaines pour regarder ce qui arrive en une seule minute ! 🏔️"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Pourquoi beaucoup d'applis sont-elles gratuites ?",
      "options": [
        "Par générosité",
        "Parce qu'elles vendent tes données et de la pub",
        "Le gouvernement les finance",
        "Elles n'ont pas de frais"
      ],
      "correct": 1,
      "explanation": "La plupart des applis gratuites se financent en collectant tes données personnelles pour vendre de la publicité ciblée."
    },
    {
      "question": "Qu'est-ce qu'un deepfake ?",
      "options": [
        "Un jeu vidéo",
        "Un filtre photo basique",
        "Une vidéo/image truquée par IA",
        "Un type de virus"
      ],
      "correct": 2,
      "explanation": "Les deepfakes sont des contenus (vidéo, audio, image) générés ou modifiés par l'IA de manière très réaliste."
    },
    {
      "question": "Qu'est-ce que le RGPD ?",
      "options": [
        "Un réseau social",
        "Un règlement européen sur la protection des données",
        "Un type d'IA",
        "Un langage de programmation"
      ],
      "correct": 1,
      "explanation": "Le RGPD (Règlement Général sur la Protection des Données) est la loi européenne qui protège tes données personnelles."
    },
    {
      "question": "Combien de capteurs contient un smartphone moderne ?",
      "options": [
        "1-2 capteurs",
        "3-5 capteurs",
        "Plus de 10 capteurs",
        "0 capteur"
      ],
      "correct": 2,
      "explanation": "Un smartphone contient de nombreux capteurs : GPS, accéléromètre, gyroscope, boussole, proximité, luminosité, baromètre, et plus !"
    },
    {
      "question": "L'ordinateur d'Apollo 11 vs ton smartphone...",
      "options": [
        "Apollo 11 était plus puissant",
        "Ils sont à peu près égaux",
        "Ton smartphone est 100 000x+ plus puissant",
        "On ne peut pas comparer"
      ],
      "correct": 2,
      "explanation": "L'ordinateur d'Apollo 11 avait 74 Ko de RAM. Ton smartphone en a ~8 Go, soit environ 100 000 fois plus !"
    },
    {
      "question": "Quelle est la meilleure façon de protéger tes données sur une appli ?",
      "options": [
        "Accepter toutes les permissions",
        "Vérifier et limiter les permissions demandées",
        "Ne jamais utiliser d'applis",
        "Changer de téléphone souvent"
      ],
      "correct": 1,
      "explanation": "Vérifie toujours les permissions demandées et n'accorde que celles vraiment nécessaires au fonctionnement de l'appli."
    },
    {
      "question": "Que révèlent souvent les métadonnées d'une photo ?",
      "options": [
        "Rien du tout",
        "Le lieu, la date et l'appareil",
        "Ton mot de passe",
        "Ton numéro de carte"
      ],
      "correct": 1,
      "explanation": "Les données EXIF d'une photo contiennent souvent la date, le modèle d'appareil et la position GPS."
    },
    {
      "question": "Une vidéo choc circule et pourrait être un deepfake. Quel est le bon réflexe ?",
      "options": [
        "La partager vite",
        "Vérifier la source et chercher si des médias fiables en parlent",
        "La commenter",
        "La télécharger"
      ],
      "correct": 1,
      "explanation": "Avant de partager, on vérifie la source et on recoupe avec des médias fiables."
    }
  ]
};
