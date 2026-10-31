export default {
  "id": "scripting",
  "title": "Automatisation & Scripting",
  "icon": "⚙️",
  "color": "#10b981",
  "tier": 3,
  "requiredModules": [
    "dev",
    "os"
  ],
  "description": "Apprends à automatiser les tâches répétitives avec Bash, PowerShell et Python",
  "lessons": [
    {
      "title": "Pourquoi automatiser ?",
      "icon": "🤖",
      "content": [
        {
          "type": "paragraph",
          "text": "L'automatisation, c'est le super-pouvoir de l'informaticien : faire travailler la machine à ta place pour les tâches répétitives et ennuyeuses !"
        },
        {
          "type": "analogy",
          "text": "🏭 Imagine que tu dois trier 10 000 photos par date. À la main : 3 jours. Avec un script : 3 secondes. L'automatisation, c'est ça : transformer des heures de travail en secondes."
        },
        {
          "type": "list",
          "title": "Exemples d'automatisation quotidienne :",
          "items": [
            "Renommer 500 fichiers d'un coup selon un pattern",
            "Sauvegarder automatiquement tes projets chaque soir",
            "Envoyer un rapport par e-mail chaque lundi matin",
            "Surveiller un site web et t'alerter s'il tombe en panne",
            "Déployer une mise à jour sur 100 serveurs en même temps",
            "Nettoyer les vieux logs qui prennent de la place"
          ]
        },
        {
          "type": "true-false",
          "title": "Vrai ou Faux — Automatisation",
          "statements": [
            {
              "text": "Un script peut se lancer tout seul à heure fixe, même la nuit",
              "answer": false,
              "explanation": "Elle supprime les tâches répétitives et crée de nouveaux emplois plus intéressants (DevOps, SRE)."
            },
            {
              "text": "Un script de 10 lignes peut économiser des heures de travail",
              "answer": true,
              "explanation": "Un simple script de renommage ou de sauvegarde peut remplacer des heures de travail manuel."
            },
            {
              "text": "Il faut être expert pour automatiser",
              "answer": false,
              "explanation": "Des scripts basiques sont accessibles aux débutants. Même un \"hello world\" automatisé est un début !"
            }
          ]
        },
        {
          "type": "highlight",
          "text": "La règle des 3 : si tu fais une tâche plus de 3 fois, automatise-la ! Le temps investi dans le script est toujours rentabilisé."
        },
        {
          "type": "fun-fact",
          "text": "Une histoire célèbre raconte qu'un développeur avait automatisé l'envoi d'un SMS « je travaille tard » à sa compagne et même le lancement de la machine à café ! Vraie ou embellie, elle résume bien l'esprit de l'automatisation ☕"
        }
      ]
    },
    {
      "title": "Bash et PowerShell",
      "icon": "💻",
      "content": [
        {
          "type": "paragraph",
          "text": "Bash (Linux/macOS) et PowerShell (Windows) sont les deux langages de scripting les plus utilisés pour l'automatisation système."
        },
        {
          "type": "mini-terminal",
          "title": "Essaie des commandes d'automatisation !",
          "commands": {
            "for i in 1 2 3; do echo \"Fichier_$i\"; done": "Fichier_1\nFichier_2\nFichier_3",
            "echo \"Hello\" > message.txt": "(fichier message.txt créé avec \"Hello\" ✅)",
            "cat message.txt | wc -w": "1",
            "find . -name \"*.log\" -delete": "(tous les fichiers .log supprimés ✅)",
            "crontab -l": "# Sauvegarde automatique chaque jour à 2h du matin\n0 2 * * * /scripts/backup.sh\n# Nettoyage des logs chaque dimanche\n0 3 * * 0 /scripts/cleanup.sh",
            "chmod +x script.sh": "(droits d'exécution ajoutés à script.sh ✅)",
            "help": "Commandes disponibles :\n  for i in 1 2 3; do echo \"Fichier_$i\"; done\n  echo \"Hello\" > message.txt\n  cat message.txt | wc -w\n  find . -name \"*.log\" -delete\n  crontab -l\n  chmod +x script.sh"
          }
        },
        {
          "type": "list",
          "title": "Concepts clés du scripting :",
          "items": [
            "Variables — stocker des valeurs (nom=\"Alice\" en Bash, $nom = \"Alice\" en PowerShell)",
            "Boucles — répéter une action (for, while)",
            "Conditions — si/sinon (if/else)",
            "Pipe (|) — enchaîner des commandes",
            "Redirection (> >>) — envoyer la sortie dans un fichier",
            "Cron — planifier l'exécution automatique"
          ]
        },
        {
          "type": "highlight",
          "text": "Le \"pipe\" (|) est l'arme secrète du terminal : il envoie la sortie d'une commande directement dans une autre. cat fichier.txt | grep \"erreur\" | wc -l = compter les lignes contenant \"erreur\" !"
        },
        {
          "type": "fun-fact",
          "text": "Le cron (planificateur de tâches Linux) a été créé en 1975 et est toujours utilisé. Son format « 0 2 * * * » (tous les jours à 2 h du matin) est connu de tous les administrateurs ! ⏰"
        }
      ]
    },
    {
      "title": "Python pour l'automatisation",
      "icon": "🐍",
      "content": [
        {
          "type": "paragraph",
          "text": "Python est le roi de l'automatisation grâce à sa syntaxe simple et ses milliers de bibliothèques pour tout faire."
        },
        {
          "type": "list",
          "title": "Ce que Python peut automatiser :",
          "items": [
            "Manipulation de fichiers (renommer, trier, convertir)",
            "Web scraping (extraire des données de sites web)",
            "E-mails automatiques",
            "Interactions avec des APIs",
            "Traitement d'images en masse",
            "Génération de rapports PDF/Excel",
            "Bots Discord, Telegram, Slack"
          ]
        },
        {
          "type": "drag-sort",
          "question": "Remets les étapes d'un pipeline CI/CD dans l'ordre :",
          "items": [
            "1. Le développeur pousse son code (git push)",
            "2. Le serveur CI détecte le changement",
            "3. Les tests automatiques sont lancés",
            "4. Le code est compilé/packagé",
            "5. Déploiement automatique en production",
            "6. Monitoring et alertes en cas de problème"
          ]
        },
        {
          "type": "analogy",
          "text": "🏗️ Le CI/CD, c'est comme une usine automatisée : le développeur dépose la matière première (code), et la chaîne de production (pipeline) teste, emballe et livre le produit fini (l'appli) sans intervention humaine."
        },
        {
          "type": "highlight",
          "text": "DevOps et automatisation font partie des compétences les plus recherchées en entreprise !"
        },
        {
          "type": "fun-fact",
          "text": "Des millions de pipelines automatisés tournent chaque jour sur des plateformes comme GitHub Actions ou GitLab CI : autant de petits robots qui testent et livrent du code sans s'arrêter ! 🤖"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Quel est le principal avantage de l'automatisation ?",
      "options": [
        "Rendre les choses plus complexes",
        "Éliminer les tâches répétitives",
        "Ralentir les processus",
        "Augmenter le budget"
      ],
      "correct": 1,
      "explanation": "L'automatisation élimine les tâches répétitives et libère du temps pour le travail créatif."
    },
    {
      "question": "Que fait le \"pipe\" (|) dans un terminal ?",
      "options": [
        "Supprime un fichier",
        "Envoie la sortie d'une commande dans une autre",
        "Crée un dossier",
        "Se connecte à Internet"
      ],
      "correct": 1,
      "explanation": "Le pipe enchaîne les commandes : la sortie de la première devient l'entrée de la suivante."
    },
    {
      "question": "Qu'est-ce que le cron ?",
      "options": [
        "Un virus",
        "Un planificateur de tâches automatiques",
        "Un langage de programmation",
        "Un type de réseau"
      ],
      "correct": 1,
      "explanation": "Cron planifie l'exécution automatique de scripts à des horaires précis (chaque jour, semaine...)."
    },
    {
      "question": "Quel langage est le plus populaire pour l'automatisation ?",
      "options": [
        "C++",
        "Python",
        "HTML",
        "SQL"
      ],
      "correct": 1,
      "explanation": "Python est le roi de l'automatisation grâce à sa simplicité et ses milliers de bibliothèques."
    },
    {
      "question": "Que signifie CI/CD ?",
      "options": [
        "Code Internet / Code Digital",
        "Continuous Integration / Continuous Deployment",
        "Computer Intelligence / Central Data",
        "Crypto Internet / Cloud Data"
      ],
      "correct": 1,
      "explanation": "CI/CD = Intégration Continue / Déploiement Continu. C'est l'automatisation du cycle de vie du code."
    },
    {
      "question": "La règle des 3 en automatisation dit...",
      "options": [
        "Utiliser 3 langages",
        "Si tu fais une tâche 3+ fois, automatise-la",
        "Écrire 3 lignes de code max",
        "Tester 3 fois avant de lancer"
      ],
      "correct": 1,
      "explanation": "Si tu répètes une tâche plus de 3 fois, le temps de création du script sera rentabilisé."
    },
    {
      "question": "Que fait la redirection « > » dans un terminal ?",
      "options": [
        "Elle supprime un fichier",
        "Elle envoie la sortie d'une commande dans un fichier",
        "Elle redémarre l'ordinateur",
        "Elle ouvre un site web"
      ],
      "correct": 1,
      "explanation": "« commande > fichier.txt » écrit le résultat dans le fichier (« >> » l'ajoute à la fin)."
    },
    {
      "question": "Dans un pipeline CI/CD, que se passe-t-il juste après l'envoi du code ?",
      "options": [
        "Le code part directement en production",
        "Le serveur d'intégration lance les tests automatiques",
        "Le serveur s'éteint",
        "Rien"
      ],
      "correct": 1,
      "explanation": "L'intégration continue vérifie d'abord le code avec les tests, avant toute livraison."
    }
  ]
};
