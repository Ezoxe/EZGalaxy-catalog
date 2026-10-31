export default {
  "id": "dev",
  "title": "Le Développement & l'IA",
  "icon": "💻",
  "color": "#22c55e",
  "tier": 2,
  "requiredModules": [
    "hardware"
  ],
  "description": "Découvre comment on crée des logiciels, des sites web et comment fonctionne l'intelligence artificielle",
  "lessons": [
    {
      "title": "C'est quoi le code ?",
      "icon": "📝",
      "content": [
        {
          "type": "paragraph",
          "text": "Coder, c'est donner des instructions à un ordinateur dans un langage qu'il comprend. C'est un peu comme écrire une recette de cuisine ultra précise !"
        },
        {
          "type": "analogy",
          "text": "🍳 Imagine que tu expliques à un robot comment faire un gâteau. Tu ne peux pas dire \"Mets de la farine\". Tu dois dire \"Prends le paquet de farine sur l'étagère 3, ouvre-le, verse 200 grammes dans le bol bleu\". La programmation, c'est ça : tout détailler !"
        },
        {
          "type": "flashcard-deck",
          "title": "Les langages de programmation",
          "cards": [
            {
              "front": "Python",
              "back": "Langage simple et polyvalent. Utilisé pour l'IA, le web, l'automatisation. Syntaxe lisible."
            },
            {
              "front": "JavaScript",
              "back": "Le langage du web. Tourne dans le navigateur. Utilisé pour les sites interactifs et les applis."
            },
            {
              "front": "HTML/CSS",
              "back": "HTML = structure des pages web. CSS = design et style. Pas des langages de programmation au sens strict."
            },
            {
              "front": "SQL",
              "back": "Langage pour interroger les bases de données. SELECT, INSERT, UPDATE, DELETE."
            },
            {
              "front": "C/C++",
              "back": "Langages performants pour les jeux vidéo, systèmes embarqués, OS."
            }
          ]
        },
        {
          "type": "list",
          "title": "Les langages les plus populaires :",
          "items": [
            "Python — simple et polyvalent, idéal pour commencer",
            "JavaScript — le langage du web (sites et applis)",
            "HTML/CSS — la structure et le design des pages web",
            "Java — les applis Android, les logiciels d'entreprise",
            "C/C++ — les jeux vidéo, les systèmes embarqués",
            "SQL — pour gérer les bases de données"
          ]
        },
        {
          "type": "fun-fact",
          "text": "Le premier programme informatique a été écrit en 1843 par Ada Lovelace, une femme ! Elle est considérée comme la première programmeuse de l'histoire 👩‍💻"
        },
        {
          "type": "highlight",
          "text": "Ce site web que tu utilises en ce moment a été entièrement codé en HTML, CSS et JavaScript. Presque tous les sites web que tu visites utilisent ces 3 langages !"
        },
        {
          "type": "steps",
          "title": "Comment on écrit un programme (les étapes)",
          "steps": [
            "Comprendre le problème à résoudre 🤔",
            "Imaginer l'algorithme (la solution, étape par étape) 📝",
            "Choisir le bon langage de programmation 🗣️",
            "Écrire le code dans un éditeur (VS Code par exemple) ⌨️",
            "Tester et déboguer (corriger les erreurs) 🐛",
            "Publier le programme pour que les gens l'utilisent 🚀"
          ]
        }
      ]
    },
    {
      "title": "Le développement web",
      "icon": "🌐",
      "content": [
        {
          "type": "paragraph",
          "text": "Le développement web, c'est la création de sites et d'applications utilisables dans un navigateur. C'est divisé en deux parties :"
        },
        {
          "type": "list",
          "title": "🎨 Frontend (ce que tu vois) :",
          "items": [
            "HTML — la structure (titres, textes, images, boutons)",
            "CSS — le design (couleurs, polices, animations)",
            "JavaScript — le comportement (clics, animations, logique)"
          ]
        },
        {
          "type": "list",
          "title": "⚙️ Backend (ce qui est caché) :",
          "items": [
            "Le serveur — l'ordinateur qui envoie les pages",
            "La base de données — stocke les utilisateurs, les messages...",
            "L'API — le \"pont\" entre le frontend et le backend"
          ]
        },
        {
          "type": "drag-match",
          "question": "Associe chaque technologie à sa catégorie :",
          "pairs": [
            {
              "term": "HTML",
              "definition": "Frontend — Structure"
            },
            {
              "term": "CSS",
              "definition": "Frontend — Design"
            },
            {
              "term": "JavaScript",
              "definition": "Frontend — Logique"
            },
            {
              "term": "Base de données",
              "definition": "Backend — Stockage"
            },
            {
              "term": "API",
              "definition": "Backend — Communication"
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🍔 Un site web, c'est comme un restaurant. Le Frontend, c'est la salle : le décor, le menu, le serveur qui prend ta commande. Le Backend, c'est la cuisine : là où le plat est préparé et la recette stockée."
        },
        {
          "type": "highlight",
          "text": "Un développeur \"full-stack\", c'est quelqu'un qui sait coder le frontend ET le backend. C'est l'un des métiers les plus demandés dans l'informatique !"
        },
        {
          "type": "fun-fact",
          "text": "Le premier site web a été créé en 1991 par Tim Berners-Lee au CERN. Il était tout simple : du texte et des liens, aucune image, aucun style. Aujourd'hui, il existe plus d'un milliard de sites web ! 🌍"
        }
      ]
    },
    {
      "title": "L'Intelligence Artificielle",
      "icon": "🤖",
      "content": [
        {
          "type": "paragraph",
          "text": "L'IA est partout : dans les recommandations YouTube, Snapchat, la reconnaissance vocale, les voitures autonomes, la médecine... Mais c'est quoi exactement ?"
        },
        {
          "type": "analogy",
          "text": "🧒 Imagine que tu apprennes à reconnaître un chat. On te montre des milliers de photos de chats et de \"pas chats\". Au bout d'un moment, tu sais reconnaître un chat même sur une photo que tu n'as jamais vue. L'IA fait exactement ça, mais avec des données numériques !"
        },
        {
          "type": "drag-sort",
          "question": "Remets les étapes du Machine Learning dans l'ordre :",
          "items": [
            "Collecter des milliers d'exemples (données)",
            "Préparer et nettoyer les données",
            "Choisir un algorithme / modèle",
            "Entraîner le modèle sur les données",
            "Évaluer la précision du modèle",
            "Déployer le modèle en production"
          ]
        },
        {
          "type": "list",
          "title": "L'IA dans ta vie quotidienne :",
          "items": [
            "Siri, Alexa, Google Assistant — reconnaissance vocale",
            "Netflix, YouTube, TikTok — recommandations personnalisées",
            "Filtres Instagram/Snap — reconnaissance faciale",
            "Google Traduction — traduction automatique",
            "ChatGPT — IA conversationnelle",
            "Voitures Tesla — conduite assistée"
          ]
        },
        {
          "type": "highlight",
          "text": "L'IA n'est pas \"intelligente\" comme un humain. Elle est très forte pour une tâche précise (reconnaître des images, traduire...) mais ne comprend pas vraiment ce qu'elle fait. C'est de l'intelligence \"artificielle\" !"
        },
        {
          "type": "fun-fact",
          "text": "Les grands modèles de langage, comme ceux derrière ChatGPT, sont entraînés sur des milliers de milliards de mots. Une personne qui lirait jour et nuit mettrait des dizaines de milliers d'années à tout lire ! 📚"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Qu'est-ce qu'un algorithme ?",
      "options": [
        "Un virus informatique",
        "Une suite d'étapes pour résoudre un problème",
        "Un langage de programmation",
        "Un type de processeur"
      ],
      "correct": 1,
      "explanation": "Un algorithme est une série d'instructions logiques et ordonnées pour accomplir une tâche."
    },
    {
      "question": "Quels langages trouve-t-on dans presque tous les sites web ?",
      "options": [
        "Python",
        "Java",
        "HTML/CSS/JavaScript",
        "C++"
      ],
      "correct": 2,
      "explanation": "Tous les sites web utilisent HTML, CSS et JavaScript."
    },
    {
      "question": "Qui est considéré comme le/la premier(e) programmeur(se) ?",
      "options": [
        "Steve Jobs",
        "Bill Gates",
        "Ada Lovelace",
        "Alan Turing"
      ],
      "correct": 2,
      "explanation": "Ada Lovelace a écrit le premier programme informatique en 1843."
    },
    {
      "question": "Qu'est-ce que le \"frontend\" d'un site web ?",
      "options": [
        "La base de données",
        "La partie visible par l'utilisateur",
        "Le serveur",
        "Le câble réseau"
      ],
      "correct": 1,
      "explanation": "Le frontend, c'est tout ce que l'utilisateur voit et avec quoi il interagit."
    },
    {
      "question": "Comment une IA apprend-elle à reconnaître des images ?",
      "options": [
        "On lui donne la réponse",
        "On la programme manuellement",
        "On l'entraîne avec des milliers d'exemples",
        "Elle comprend toute seule"
      ],
      "correct": 2,
      "explanation": "Le Machine Learning consiste à montrer des milliers d'exemples à l'IA pour qu'elle détecte des patterns."
    },
    {
      "question": "Qu'est-ce qu'une API ?",
      "options": [
        "Un type de câble",
        "Un pont entre le frontend et le backend",
        "Un langage de programmation",
        "Un virus"
      ],
      "correct": 1,
      "explanation": "Une API permet au frontend de communiquer avec le backend pour échanger des données."
    },
    {
      "question": "À quoi sert le CSS dans une page web ?",
      "options": [
        "À la structure",
        "Au style et à la mise en page",
        "Aux calculs du serveur",
        "À la base de données"
      ],
      "correct": 1,
      "explanation": "Le CSS décrit l'apparence : couleurs, polices, espacements, mise en page."
    },
    {
      "question": "Ton programme donne un résultat faux. Que fais-tu ?",
      "options": [
        "Je le jette",
        "Je le débogue : je cherche l'erreur et je la corrige",
        "J'éteins l'ordinateur",
        "Je change d'écran"
      ],
      "correct": 1,
      "explanation": "Déboguer, c'est tester, trouver la cause de l'erreur puis la corriger."
    }
  ]
};
