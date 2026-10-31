export default {
  "id": "security",
  "title": "Cybersécurité",
  "icon": "🔒",
  "color": "#ef4444",
  "tier": 3,
  "requiredModules": [
    "networks",
    "dev"
  ],
  "description": "Apprends à te protéger sur Internet : mots de passe, phishing, arnaques et bonnes pratiques",
  "lessons": [
    {
      "title": "Les menaces en ligne",
      "icon": "⚠️",
      "content": [
        {
          "type": "paragraph",
          "text": "Internet c'est génial, mais c'est aussi un terrain de jeu pour les cybercriminels. Voici les menaces les plus courantes dont tu dois te méfier :"
        },
        {
          "type": "list",
          "title": "🦠 Les types de menaces :",
          "items": [
            "Virus/Malware — des programmes malveillants qui infectent ton ordi",
            "Phishing — de faux e-mails/sites qui imitent des vrais pour voler tes données",
            "Ransomware — un virus qui bloque tous tes fichiers et demande une rançon",
            "Spyware — un programme espion qui enregistre ce que tu fais",
            "Ingénierie sociale — manipuler les gens pour obtenir des informations"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Types de cyberattaques",
          "cards": [
            {
              "front": "Phishing",
              "back": "Faux e-mails/sites qui imitent des vrais pour voler tes données personnelles."
            },
            {
              "front": "Ransomware",
              "back": "Virus qui chiffre tes fichiers et demande une rançon (en Bitcoin) pour les débloquer."
            },
            {
              "front": "DDoS",
              "back": "Distributed Denial of Service — Submerger un serveur de requêtes pour le faire tomber."
            },
            {
              "front": "Man-in-the-Middle",
              "back": "Un attaquant intercepte les communications entre toi et un serveur sans que tu le saches."
            },
            {
              "front": "Zero-Day",
              "back": "Faille de sécurité inconnue de l'éditeur, exploitée avant qu'un correctif existe."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🎣 Le phishing, c'est comme un pêcheur : il lance un appât (un faux e-mail de ta banque, un faux concours...) et attend que tu mordes à l'hameçon en cliquant sur le lien et en donnant tes infos."
        },
        {
          "type": "highlight",
          "text": "Le phishing est l'attaque la plus répandue : chaque jour, des milliards d'e-mails frauduleux sont envoyés dans le monde. Et les arnaqueurs deviennent de plus en plus doués !"
        },
        {
          "type": "fun-fact",
          "text": "Le premier virus informatique connu s'appelait \"Creeper\" (1971). Il affichait juste le message \"I'm the creeper, catch me if you can!\" 🕹️"
        }
      ]
    },
    {
      "title": "Mots de passe et authentification",
      "icon": "🔑",
      "content": [
        {
          "type": "paragraph",
          "text": "Ton mot de passe, c'est la clé de ta vie numérique. Un mauvais mot de passe, c'est comme une porte d'entrée ouverte !"
        },
        {
          "type": "list",
          "title": "❌ Les pires mots de passe :",
          "items": [
            "123456 — le mot de passe le plus utilisé au monde !",
            "password, motdepasse",
            "Ton prénom, ta date de naissance",
            "Le nom de ton animal de compagnie",
            "azerty ou qwerty"
          ]
        },
        {
          "type": "list",
          "title": "✅ Un bon mot de passe doit :",
          "items": [
            "Faire au moins 12 caractères",
            "Mélanger majuscules, minuscules, chiffres et symboles",
            "Être différent pour chaque site/service",
            "Ne pas contenir d'infos personnelles évidentes"
          ]
        },
        {
          "type": "interactive-reveal",
          "question": "Quel mot de passe est le plus sécurisé ? (clique pour vérifier)",
          "options": [
            {
              "text": "123456",
              "revealed": "❌ C'est le mot de passe le plus utilisé au monde ! Un hacker le craque en moins d'1 seconde."
            },
            {
              "text": "MonChat2024",
              "revealed": "⚠️ Mieux, mais les infos personnelles (nom d'animal, année) sont faciles à deviner."
            },
            {
              "text": "K9#mP$2x!Lq4",
              "revealed": "✅ Excellent ! Long (12 car.), complexe et aléatoire. Utilise un gestionnaire de mots de passe !"
            },
            {
              "text": "MonChienAdore3Tacos!",
              "revealed": "✅ Super choix ! C'est une \"phrase de passe\" : longue, mémorisable et avec des caractères variés."
            }
          ]
        },
        {
          "type": "highlight",
          "text": "Astuce : utilise une \"phrase de passe\" ! Par exemple : \"MonChatMange3Pizzas!\" est un excellent mot de passe."
        },
        {
          "type": "paragraph",
          "text": "La double authentification (2FA) ajoute une deuxième vérification : un code par SMS, une notification sur ton téléphone, ou une clé de sécurité."
        },
        {
          "type": "fun-fact",
          "text": "Un mot de passe de 6 lettres minuscules peut être deviné en moins d'une seconde. Avec 12 caractères variés ? Des milliers d'années ! 🔐"
        }
      ]
    },
    {
      "title": "Se protéger au quotidien",
      "icon": "🛡️",
      "content": [
        {
          "type": "paragraph",
          "text": "La cybersécurité n'est pas réservée aux experts. Voici des réflexes simples pour te protéger au quotidien :"
        },
        {
          "type": "list",
          "title": "🛡️ Les bonnes pratiques :",
          "items": [
            "Mets toujours à jour ton OS, tes applis et ton navigateur",
            "Ne clique pas sur les liens dans les e-mails suspects",
            "Vérifie l'URL avant de rentrer un mot de passe (le cadenas 🔒)",
            "Active la double authentification partout où c'est possible",
            "Ne télécharge que depuis des sources officielles",
            "Fais des sauvegardes régulières de tes fichiers importants"
          ]
        },
        {
          "type": "true-false",
          "title": "Bonnes pratiques — Vrai ou Faux ?",
          "statements": [
            {
              "text": "Un antivirus suffit à te protéger à 100%",
              "answer": false,
              "explanation": "Aucun antivirus n'est parfait. La meilleure protection c'est la vigilance + antivirus + mises à jour."
            },
            {
              "text": "Les mises à jour corrigent des failles de sécurité",
              "answer": true,
              "explanation": "Les mises à jour patchent des vulnérabilités que les hackers pourraient exploiter."
            },
            {
              "text": "Un réseau Wi-Fi public est aussi sûr que ton Wi-Fi maison",
              "answer": false,
              "explanation": "Les Wi-Fi publics ne sont pas chiffrés — n'importe qui sur le réseau peut potentiellement voir ton trafic."
            },
            {
              "text": "Le cadenas 🔒 dans l'URL garantit que le site est légitime",
              "answer": false,
              "explanation": "Le cadenas signifie que la connexion est chiffrée (HTTPS), mais un site de phishing peut aussi avoir un cadenas !"
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🚗 La cybersécurité, c'est comme la ceinture de sécurité en voiture. Tu ne la mets pas parce que tu penses avoir un accident à chaque trajet, mais parce que le jour où ça arrive, elle peut te sauver."
        },
        {
          "type": "fun-fact",
          "text": "Une grande partie des piratages commence par une erreur humaine : un clic sur un lien piégé, un mot de passe réutilisé… Les bons réflexes protègent vraiment ! 🛡️"
        },
        {
          "type": "highlight",
          "text": "Les mises à jour de sécurité ne sont pas là pour t'embêter ! Elles corrigent des failles que les hackers peuvent exploiter. Mets-les le plus vite possible !"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Qu'est-ce que le phishing ?",
      "options": [
        "Un jeu de pêche en ligne",
        "Une technique d'arnaque par faux e-mails/sites",
        "Un logiciel antivirus",
        "Un type de réseau Wi-Fi"
      ],
      "correct": 1,
      "explanation": "Le phishing utilise de faux e-mails ou sites web pour te piéger et voler tes données personnelles."
    },
    {
      "question": "Quel est le meilleur mot de passe parmi ceux-ci ?",
      "options": [
        "123456",
        "MonPrénom2010",
        "MonChatMange3Pizzas!",
        "password"
      ],
      "correct": 2,
      "explanation": "\"MonChatMange3Pizzas!\" est long, contient majuscules, minuscules, chiffre et symbole."
    },
    {
      "question": "Que fait un ransomware ?",
      "options": [
        "Il accélère ton PC",
        "Il bloque tes fichiers et demande une rançon",
        "Il protège contre les virus",
        "Il améliore le Wi-Fi"
      ],
      "correct": 1,
      "explanation": "Un ransomware chiffre tous tes fichiers et demande de l'argent pour les débloquer."
    },
    {
      "question": "Qu'est-ce que la double authentification (2FA) ?",
      "options": [
        "Deux mots de passe",
        "Un deuxième facteur de vérification",
        "Deux antivirus",
        "Un double pare-feu"
      ],
      "correct": 1,
      "explanation": "Le 2FA ajoute une 2e couche : en plus du mot de passe, tu dois confirmer par un code SMS, une appli ou une clé."
    },
    {
      "question": "Quelle est la meilleure attitude face à un e-mail suspect ?",
      "options": [
        "L'ouvrir pour vérifier",
        "Cliquer sur le lien pour voir",
        "Le supprimer ou le signaler",
        "Le transférer à un ami"
      ],
      "correct": 2,
      "explanation": "Ne clique jamais sur les liens d'un e-mail suspect. Supprime-le ou signale-le."
    },
    {
      "question": "Pourquoi les mises à jour sont-elles importantes ?",
      "options": [
        "Pour changer le look",
        "Pour corriger des failles de sécurité",
        "Pour ralentir l'ordi",
        "Pour ajouter de la pub"
      ],
      "correct": 1,
      "explanation": "Les mises à jour corrigent des failles de sécurité que les hackers pourraient exploiter."
    },
    {
      "question": "Le cadenas HTTPS dans l'URL garantit...",
      "options": [
        "Que le site est légitime",
        "Que la connexion est chiffrée",
        "Que le site est gratuit",
        "Que le site est rapide"
      ],
      "correct": 1,
      "explanation": "HTTPS signifie que la connexion est chiffrée, mais un site de phishing peut aussi utiliser HTTPS."
    },
    {
      "question": "Quel est le principal intérêt d'un gestionnaire de mots de passe ?",
      "options": [
        "Il rend Internet plus rapide",
        "Il permet d'avoir un mot de passe différent et solide pour chaque site",
        "Il supprime les virus",
        "Il remplace la double authentification"
      ],
      "correct": 1,
      "explanation": "Il crée et retient pour toi un mot de passe unique et solide par site : tu n'as plus qu'un seul mot de passe principal à retenir."
    }
  ]
};
