export default {
  "id": "cloud",
  "title": "Cloud & DevOps",
  "icon": "☁️",
  "color": "#0284c7",
  "tier": 4,
  "requiredModules": [
    "security",
    "scripting"
  ],
  "description": "Découvre le cloud computing, les conteneurs Docker et l'infrastructure as code",
  "lessons": [
    {
      "title": "Le Cloud Computing",
      "icon": "☁️",
      "content": [
        {
          "type": "paragraph",
          "text": "Le cloud computing a révolutionné l'informatique. Plus besoin d'acheter des serveurs : tu loues de la puissance de calcul à la demande, comme l'électricité !"
        },
        {
          "type": "list",
          "title": "Les 3 modèles de service cloud :",
          "items": [
            "IaaS (Infrastructure as a Service) — Tu loues des serveurs virtuels (AWS EC2, Azure VM)",
            "PaaS (Platform as a Service) — Tu déploies ton code, le cloud gère le reste (Heroku, Google App Engine)",
            "SaaS (Software as a Service) — Tu utilises un logiciel en ligne (Gmail, Office 365, Slack)"
          ]
        },
        {
          "type": "drag-match",
          "question": "Associe chaque service à son modèle cloud :",
          "pairs": [
            {
              "term": "Gmail",
              "definition": "SaaS — Logiciel en ligne"
            },
            {
              "term": "AWS EC2",
              "definition": "IaaS — Serveur virtuel"
            },
            {
              "term": "Heroku",
              "definition": "PaaS — Plateforme de déploiement"
            },
            {
              "term": "Office 365",
              "definition": "SaaS — Logiciel en ligne"
            },
            {
              "term": "Azure VM",
              "definition": "IaaS — Serveur virtuel"
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🏠 Le cloud, c'est comme la différence entre construire ta propre maison (on-premise) et louer un appartement (cloud). Avec la location, pas besoin de t'occuper des murs, de l'électricité ni de la plomberie !"
        },
        {
          "type": "highlight",
          "text": "Les 3 géants du cloud : AWS (Amazon) environ 30 %, Azure (Microsoft) environ 20 %, Google Cloud environ 13 %. À eux trois, ils pèsent près des deux tiers du marché mondial !"
        },
        {
          "type": "fun-fact",
          "text": "AWS a ouvert en 2006 en vendant à d'autres entreprises les outils qu'Amazon avait construits pour ses propres besoins. C'est aujourd'hui la branche la plus rentable d'Amazon ! 💰"
        }
      ]
    },
    {
      "title": "Docker et les conteneurs",
      "icon": "🐳",
      "content": [
        {
          "type": "paragraph",
          "text": "Docker a révolutionné le déploiement logiciel. Un conteneur, c'est une boîte fermée qui contient ton application avec TOUT ce dont elle a besoin pour fonctionner."
        },
        {
          "type": "analogy",
          "text": "📦 Un conteneur Docker, c'est comme un container maritime. Peu importe le bateau (serveur), le port (OS), ou le pays (cloud) : ton container est standard et fonctionne partout pareil !"
        },
        {
          "type": "mini-terminal",
          "title": "Essaie des commandes Docker !",
          "commands": {
            "docker run hello-world": "Hello from Docker! 🐳\nThis message shows your installation is working correctly.",
            "docker ps": "CONTAINER ID  IMAGE          STATUS    PORTS\na1b2c3d4e5    nginx:latest   Running   80/tcp\nf6g7h8i9j0    redis:7        Running   6379/tcp",
            "docker images": "REPOSITORY  TAG      SIZE\nnginx       latest   142MB\nredis       7        130MB\npython      3.12     1.01GB\nnode        20       1.10GB",
            "docker build -t myapp .": "Step 1/5 : FROM python:3.12\nStep 2/5 : COPY . /app\nStep 3/5 : RUN pip install -r requirements.txt\nStep 4/5 : EXPOSE 8000\nStep 5/5 : CMD [\"python\", \"main.py\"]\nSuccessfully built myapp:latest ✅",
            "help": "Commandes Docker disponibles :\n  docker run hello-world\n  docker ps\n  docker images\n  docker build -t myapp ."
          }
        },
        {
          "type": "list",
          "title": "Pourquoi Docker est si populaire :",
          "items": [
            "Fonctionne partout pareil (dev, test, prod)",
            "Démarre en secondes (pas en minutes comme une VM)",
            "Isole les applications (pas de conflit de versions)",
            "Facile à partager (Docker Hub = GitHub des images)",
            "Orchestre facilement (Kubernetes pour des milliers de conteneurs)"
          ]
        },
        {
          "type": "highlight",
          "text": "Ce site IT Discovery tourne lui-même dans un conteneur Docker ! Le Dockerfile copie le code, installe les dépendances, et lance le serveur. 🐳"
        },
        {
          "type": "fun-fact",
          "text": "Kubernetes (le chef d'orchestre de conteneurs) a été créé par Google. Il gère automatiquement des milliers de conteneurs et il est aujourd'hui utilisé par une grande partie des grandes entreprises du monde ! ⚙️"
        }
      ]
    },
    {
      "title": "Infrastructure as Code",
      "icon": "📝",
      "content": [
        {
          "type": "paragraph",
          "text": "L'IaC (Infrastructure as Code), c'est gérer ton infrastructure (serveurs, réseaux, BDD) avec du code au lieu de clics manuels dans une interface."
        },
        {
          "type": "analogy",
          "text": "🏗️ Imagine que tu construis un immeuble. Méthode ancienne : tu donnes les instructions au chef de chantier verbalement (erreurs possibles). IaC : tu as un plan détaillé numérique. Si l'immeuble brûle, tu le reconstruis à l'identique en appuyant sur un bouton."
        },
        {
          "type": "list",
          "title": "Les outils IaC populaires :",
          "items": [
            "Terraform — définir l'infrastructure multi-cloud (HashiCorp)",
            "Ansible — automatiser la configuration des serveurs",
            "Docker Compose — orchestrer plusieurs conteneurs ensemble",
            "GitHub Actions — automatiser les tests et déploiements",
            "ArgoCD — déploiement GitOps pour Kubernetes"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Concepts DevOps",
          "cards": [
            {
              "front": "GitOps",
              "back": "Gérer l'infrastructure et les déploiements via Git. Le repo est la \"source de vérité\"."
            },
            {
              "front": "Microservices",
              "back": "Découper une grosse application en petits services indépendants qui communiquent par API."
            },
            {
              "front": "Load Balancer",
              "back": "Répartit le trafic entre plusieurs serveurs pour éviter la surcharge."
            },
            {
              "front": "Auto-scaling",
              "back": "Ajuster automatiquement le nombre de serveurs selon la charge."
            },
            {
              "front": "Blue/Green Deploy",
              "back": "Déployer sur un 2e environnement (green) puis basculer le trafic. Rollback instantané si problème."
            }
          ]
        },
        {
          "type": "highlight",
          "text": "Avec l'IaC, tu peux détruire et recréer toute ton infrastructure en quelques minutes. Plus besoin de \"touche pas à ce serveur, personne ne sait comment il a été configuré\" ! 😅"
        },
        {
          "type": "fun-fact",
          "text": "Netflix remplace en permanence des serveurs de façon automatique. Son outil « Chaos Monkey » éteint même des serveurs au hasard, exprès, pour vérifier que le service tient le coup ! 🐒"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Qu'est-ce que le IaaS ?",
      "options": [
        "Un réseau social",
        "De l'infrastructure louée en cloud",
        "Un langage de programmation",
        "Un type de virus"
      ],
      "correct": 1,
      "explanation": "IaaS (Infrastructure as a Service) = louer des serveurs virtuels en cloud (AWS EC2, Azure VM)."
    },
    {
      "question": "Qu'est-ce qu'un conteneur Docker ?",
      "options": [
        "Un fichier zip",
        "Une boîte isolée contenant une appli et ses dépendances",
        "Un type de serveur",
        "Un câble réseau"
      ],
      "correct": 1,
      "explanation": "Un conteneur Docker encapsule une application avec tout ce dont elle a besoin, pour fonctionner partout pareil."
    },
    {
      "question": "Quel est le plus grand fournisseur cloud ?",
      "options": [
        "Google Cloud",
        "Azure",
        "AWS (Amazon)",
        "Oracle"
      ],
      "correct": 2,
      "explanation": "AWS (Amazon Web Services) domine le marché cloud avec environ 33% de part de marché."
    },
    {
      "question": "Que fait Kubernetes ?",
      "options": [
        "Stocke des fichiers",
        "Orchestre des milliers de conteneurs",
        "Crée des sites web",
        "Protège contre les virus"
      ],
      "correct": 1,
      "explanation": "Kubernetes gère automatiquement le déploiement, la mise à l'échelle et la santé de milliers de conteneurs."
    },
    {
      "question": "L'IaC (Infrastructure as Code) permet de...",
      "options": [
        "Coder des sites web",
        "Gérer l'infrastructure avec du code",
        "Remplacer les développeurs",
        "Jouer à des jeux"
      ],
      "correct": 1,
      "explanation": "L'IaC permet de définir, versionner et reproduire toute l'infrastructure avec du code."
    },
    {
      "question": "Qu'est-ce que le SaaS ?",
      "options": [
        "Un serveur virtuel",
        "Un logiciel utilisable en ligne",
        "Un câble réseau",
        "Un type de processeur"
      ],
      "correct": 1,
      "explanation": "SaaS (Software as a Service) = logiciel accessible en ligne sans installation (Gmail, Slack, Office 365)."
    },
    {
      "question": "Quel est l'intérêt principal d'un conteneur Docker ?",
      "options": [
        "Il fonctionne partout de la même façon",
        "Il remplace Internet",
        "Il rend le Wi-Fi plus rapide",
        "Il sert de clavier"
      ],
      "correct": 0,
      "explanation": "Le conteneur embarque l'application et tout ce dont elle a besoin : elle tourne pareil partout."
    },
    {
      "question": "Que permet l'auto-scaling ?",
      "options": [
        "Ajuster automatiquement le nombre de serveurs selon la charge",
        "Agrandir l'écran",
        "Compresser les photos",
        "Changer de mot de passe"
      ],
      "correct": 0,
      "explanation": "Quand le trafic augmente, des serveurs sont ajoutés automatiquement, puis retirés quand il baisse."
    }
  ]
};
