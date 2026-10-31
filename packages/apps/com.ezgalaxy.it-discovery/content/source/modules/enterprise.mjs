export default {
  "id": "enterprise",
  "title": "L'informatique en entreprise",
  "icon": "🏢",
  "color": "#f59e0b",
  "tier": 3,
  "requiredModules": [
    "networks",
    "os"
  ],
  "description": "Découvre comment fonctionne un service informatique dans une entreprise, les métiers et l'infrastructure",
  "lessons": [
    {
      "title": "Le service informatique",
      "icon": "🏗️",
      "content": [
        {
          "type": "paragraph",
          "text": "Toutes les entreprises ont besoin d'un service IT. Une usine, un hôpital, une banque... tous dépendent de l'informatique pour fonctionner !"
        },
        {
          "type": "analogy",
          "text": "🏥 Le service informatique, c'est comme les médecins d'un hôpital. Sans eux, l'hôpital ne fonctionne pas. C'est pareil : sans le service IT, les employés ne peuvent ni travailler, ni communiquer."
        },
        {
          "type": "list",
          "title": "Ce que gère le service informatique :",
          "items": [
            "Les ordinateurs et postes de travail de tous les employés",
            "Les serveurs qui stockent les fichiers et les applications",
            "Le réseau (Internet, Wi-Fi, câbles, sécurité)",
            "Les logiciels et licences",
            "La sécurité (antivirus, pare-feu, sauvegardes)",
            "Le support technique (aider les utilisateurs)"
          ]
        },
        {
          "type": "fun-fact",
          "text": "Dans une entreprise de 200 personnes, le service informatique peut recevoir des dizaines de demandes d'aide par jour ! 🖨️"
        },
        {
          "type": "highlight",
          "text": "Un informaticien en entreprise ne fait pas que \"réparer des PC\". C'est un métier très varié : architecture réseau, sécurité, développement, gestion de projet, et bien plus !"
        }
      ]
    },
    {
      "title": "Les tickets et le support",
      "icon": "🎫",
      "content": [
        {
          "type": "paragraph",
          "text": "Quand un employé a un problème informatique, il crée un \"ticket\" : une demande enregistrée dans un logiciel spécialisé."
        },
        {
          "type": "analogy",
          "text": "🎟️ C'est comme prendre un ticket au guichet de la Poste. Tu décris ton problème, et le ticket est attribué à un technicien."
        },
        {
          "type": "drag-sort",
          "question": "Remets les niveaux de support dans l'ordre (du plus basique au plus expert) :",
          "items": [
            "Niveau 1 (L1) — Helpdesk : premiers diagnostics, problèmes simples",
            "Niveau 2 (L2) — Techniciens spécialisés : problèmes complexes",
            "Niveau 3 (L3) — Experts/ingénieurs : problèmes critiques et architecture"
          ]
        },
        {
          "type": "list",
          "title": "Les niveaux de priorité :",
          "items": [
            "🔴 Urgente — L'entreprise ne peut plus travailler",
            "🟠 Haute — Un service entier est impacté",
            "🟡 Moyenne — Un employé ne peut pas faire une tâche",
            "🟢 Basse — Demandes de changement, nouvelles installations"
          ]
        },
        {
          "type": "fun-fact",
          "text": "La phrase la plus entendue par les techniciens IT : \"Avez-vous essayé d'éteindre et de rallumer ?\" Et ça résout vraiment beaucoup de problèmes ! 🔄"
        },
        {
          "type": "highlight",
          "text": "Un bon ticket contient : une description claire, les étapes pour reproduire le problème, des captures d'écran, et le numéro de poste."
        },
        {
          "type": "highlight",
          "text": "Le SLA (Service Level Agreement, ou contrat de niveau de service) fixe les délais promis aux utilisateurs : par exemple, un ticket urgent doit être pris en charge en moins d'une heure."
        }
      ]
    },
    {
      "title": "Les métiers de l'informatique",
      "icon": "👨‍💻",
      "content": [
        {
          "type": "paragraph",
          "text": "L'informatique offre une incroyable diversité de métiers. Que tu aimes la technique, le design, la stratégie ou la communication, il y a un métier IT pour toi !"
        },
        {
          "type": "drag-match",
          "question": "Associe chaque métier à sa mission :",
          "pairs": [
            {
              "term": "Développeur",
              "definition": "Crée des logiciels et applications"
            },
            {
              "term": "Admin système",
              "definition": "Gère les serveurs et les OS"
            },
            {
              "term": "DevOps",
              "definition": "Automatise les déploiements"
            },
            {
              "term": "Data analyst",
              "definition": "Analyse les données"
            },
            {
              "term": "UX Designer",
              "definition": "Conçoit les interfaces utilisateur"
            },
            {
              "term": "Pentester",
              "definition": "Teste la sécurité en attaquant"
            }
          ]
        },
        {
          "type": "list",
          "title": "🧑‍💻 Les principaux métiers IT :",
          "items": [
            "Développeur — crée des logiciels et applications",
            "Administrateur système — gère les serveurs et les OS",
            "Administrateur réseau — configure et surveille le réseau",
            "Technicien support — aide les utilisateurs au quotidien",
            "Ingénieur cybersécurité — protège contre les attaques",
            "Chef de projet IT — coordonne les projets informatiques",
            "Data analyst — analyse les données de l'entreprise",
            "DevOps — automatise les déploiements et l'infrastructure",
            "UX/UI Designer — conçoit les interfaces utilisateur",
            "Architecte cloud — conçoit l'infrastructure cloud"
          ]
        },
        {
          "type": "highlight",
          "text": "Les métiers du numérique recrutent énormément : en France, les entreprises peinent à trouver assez de profils qualifiés, surtout en développement et en cybersécurité ! 🚀"
        },
        {
          "type": "fun-fact",
          "text": "Les métiers de l'informatique font partie de ceux qui offrent les meilleurs salaires aux jeunes diplômés, notamment en cybersécurité ! 💰"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Pourquoi une usine a-t-elle besoin d'un service IT ?",
      "options": [
        "Pour vendre des ordinateurs",
        "Pour gérer les systèmes et le réseau",
        "Pour faire de la pub",
        "Elle n'en a pas besoin"
      ],
      "correct": 1,
      "explanation": "Toute entreprise dépend de l'informatique : e-mails, fichiers, logiciels métier, réseau, sécurité..."
    },
    {
      "question": "Qu'est-ce qu'un ticket informatique ?",
      "options": [
        "Un billet de concert",
        "Une demande d'aide enregistrée",
        "Un code promo",
        "Un virus"
      ],
      "correct": 1,
      "explanation": "Un ticket est une demande formelle créée dans un outil spécialisé pour signaler un problème IT."
    },
    {
      "question": "Quel niveau de support gère les problèmes les plus complexes ?",
      "options": [
        "Niveau 1",
        "Niveau 2",
        "Niveau 3",
        "Niveau 0"
      ],
      "correct": 2,
      "explanation": "Le Niveau 3 regroupe les experts qui traitent les problèmes les plus critiques et complexes."
    },
    {
      "question": "Que fait un DevOps ?",
      "options": [
        "Il répare les imprimantes",
        "Il automatise les déploiements",
        "Il crée des designs",
        "Il vend des logiciels"
      ],
      "correct": 1,
      "explanation": "Le DevOps automatise les tests, les déploiements et la gestion de l'infrastructure."
    },
    {
      "question": "Quel métier protège l'entreprise contre les cyberattaques ?",
      "options": [
        "Développeur",
        "Data analyst",
        "Support",
        "Ingénieur cybersécurité"
      ],
      "correct": 3,
      "explanation": "L'ingénieur cybersécurité est spécialisé dans la protection des systèmes et la détection des menaces."
    },
    {
      "question": "Qu'est-ce qu'un SLA ?",
      "options": [
        "Un langage",
        "Un calendrier",
        "Un contrat de niveaux de service",
        "Un logiciel"
      ],
      "correct": 2,
      "explanation": "Le SLA définit les engagements de délais et de qualité pour résoudre les problèmes IT."
    },
    {
      "question": "Que doit contenir un bon ticket ?",
      "options": [
        "Juste « ça marche pas »",
        "Une description claire, les étapes pour reproduire le problème et une capture d'écran",
        "Le mot de passe de l'utilisateur",
        "Rien, le technicien devine"
      ],
      "correct": 1,
      "explanation": "Plus le ticket est précis, plus le technicien peut résoudre le problème rapidement. On ne donne jamais son mot de passe !"
    },
    {
      "question": "Quel niveau de support répond en premier aux utilisateurs ?",
      "options": [
        "Le niveau 1 (helpdesk)",
        "Le niveau 2",
        "Le niveau 3",
        "La direction"
      ],
      "correct": 0,
      "explanation": "Le helpdesk (niveau 1) reçoit les demandes, les trie et règle les cas simples."
    }
  ]
};
