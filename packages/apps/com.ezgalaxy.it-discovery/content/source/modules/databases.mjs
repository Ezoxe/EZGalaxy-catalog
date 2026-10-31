export default {
  "id": "databases",
  "title": "Bases de données & Big Data",
  "icon": "🗄️",
  "color": "#a855f7",
  "tier": 3,
  "requiredModules": [
    "dev",
    "os"
  ],
  "description": "Comprends comment les données sont stockées, organisées et analysées à grande échelle",
  "lessons": [
    {
      "title": "Qu'est-ce qu'une base de données ?",
      "icon": "📊",
      "content": [
        {
          "type": "paragraph",
          "text": "Une base de données (BDD), c'est un système organisé pour stocker, retrouver et gérer d'énormes quantités d'informations de façon fiable et rapide."
        },
        {
          "type": "analogy",
          "text": "📚 Imagine une bibliothèque géante. Sans classement, retrouver un livre prendrait des heures. Avec un bon système (par auteur, titre, genre), tu le trouves en secondes. La BDD fait pareil avec les données numériques !"
        },
        {
          "type": "list",
          "title": "Exemples de données stockées en BDD :",
          "items": [
            "Tes tweets, photos Instagram, messages WhatsApp",
            "Ton panier Amazon, ton historique Netflix",
            "Les dossiers médicaux dans les hôpitaux",
            "Les transactions bancaires",
            "Les notes de ton école",
            "Les articles de Wikipédia"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Vocabulaire bases de données",
          "cards": [
            {
              "front": "Table",
              "back": "Un ensemble de données organisées en lignes et colonnes (comme un tableau Excel)."
            },
            {
              "front": "Ligne/Row",
              "back": "Un enregistrement unique dans une table (ex: un utilisateur)."
            },
            {
              "front": "Colonne/Column",
              "back": "Un champ de données (ex: nom, email, âge)."
            },
            {
              "front": "Clé primaire",
              "back": "Identifiant UNIQUE qui distingue chaque ligne (ex: ID utilisateur)."
            },
            {
              "front": "Index",
              "back": "Accélérateur de recherche, comme l'index d'un livre."
            },
            {
              "front": "SGBD",
              "back": "Système de Gestion de Base de Données — le logiciel qui gère la BDD (MySQL, PostgreSQL...)."
            }
          ]
        },
        {
          "type": "highlight",
          "text": "Chaque fois que tu fais une recherche Google, tu interroges des milliards de lignes de données en moins de 0.5 seconde. C'est la puissance des bases de données !"
        },
        {
          "type": "fun-fact",
          "text": "Les grandes plateformes comme Facebook enregistrent des centaines de téraoctets de nouvelles données chaque jour : photos, messages, likes… 📸"
        }
      ]
    },
    {
      "title": "SQL — le langage des données",
      "icon": "💻",
      "content": [
        {
          "type": "paragraph",
          "text": "SQL (Structured Query Language) est le langage universel pour parler aux bases de données. Créé en 1974, il est toujours LE standard 50 ans plus tard !"
        },
        {
          "type": "mini-terminal",
          "title": "Essaie des requêtes SQL !",
          "commands": {
            "SELECT * FROM users": "| id | nom      | age | ville    |\n|----|----------|-----|----------|\n| 1  | Alice    | 22  | Paris    |\n| 2  | Bob      | 19  | Lyon     |\n| 3  | Charlie  | 25  | Marseille|\n| 4  | Diana    | 21  | Paris    |\n(4 résultats)",
            "SELECT nom FROM users WHERE ville = 'Paris'": "| nom   |\n|-------|\n| Alice |\n| Diana |\n(2 résultats)",
            "SELECT COUNT(*) FROM users": "| COUNT(*) |\n|----------|\n| 4        |",
            "SELECT ville, COUNT(*) FROM users GROUP BY ville": "| ville     | COUNT(*) |\n|-----------|----------|\n| Paris     | 2        |\n| Lyon      | 1        |\n| Marseille | 1        |",
            "INSERT INTO users VALUES (5, 'Eve', 20, 'Nice')": "(1 ligne insérée avec succès ✅)",
            "help": "Commandes SQL disponibles :\n  SELECT * FROM users\n  SELECT nom FROM users WHERE ville = 'Paris'\n  SELECT COUNT(*) FROM users\n  SELECT ville, COUNT(*) FROM users GROUP BY ville\n  INSERT INTO users VALUES (5, 'Eve', 20, 'Nice')"
          }
        },
        {
          "type": "list",
          "title": "Les commandes SQL essentielles :",
          "items": [
            "SELECT — Lire des données (\"Montre-moi...\")",
            "INSERT — Ajouter des données (\"Crée un nouveau...\")",
            "UPDATE — Modifier des données (\"Change la valeur de...\")",
            "DELETE — Supprimer des données (\"Supprime...\")",
            "WHERE — Filtrer (\"...seulement ceux qui...\")",
            "ORDER BY — Trier (\"...triés par...\")",
            "GROUP BY — Regrouper (\"...groupés par...\")"
          ]
        },
        {
          "type": "highlight",
          "text": "SQL fait partie des langages les plus utilisés au monde. Même si tu ne deviens pas développeur, savoir lire du SQL est un super atout en entreprise !"
        },
        {
          "type": "fun-fact",
          "text": "SQL a été inventé chez IBM en 1974. 50 ans plus tard, c'est toujours le standard universel. Presque aucun autre langage n'a tenu aussi longtemps ! 🏛️"
        }
      ]
    },
    {
      "title": "NoSQL et Big Data",
      "icon": "🌊",
      "content": [
        {
          "type": "paragraph",
          "text": "Quand les données deviennent trop volumineuses ou trop variées pour les tables SQL classiques, on passe au NoSQL et au Big Data !"
        },
        {
          "type": "drag-match",
          "question": "Associe le type de base de données à son usage :",
          "pairs": [
            {
              "term": "SQL (MySQL, PostgreSQL)",
              "definition": "Données structurées (utilisateurs, commandes)"
            },
            {
              "term": "Document (MongoDB)",
              "definition": "Données flexibles (articles, profils)"
            },
            {
              "term": "Clé-Valeur (Redis)",
              "definition": "Cache ultra-rapide, sessions"
            },
            {
              "term": "Graphe (Neo4j)",
              "definition": "Relations complexes (réseaux sociaux)"
            },
            {
              "term": "Colonnes (Cassandra)",
              "definition": "Données massives, écriture intensive"
            }
          ]
        },
        {
          "type": "list",
          "title": "Les 3 V du Big Data :",
          "items": [
            "Volume — Des quantités astronomiques (pétaoctets, exaoctets)",
            "Vélocité — Les données arrivent à très grande vitesse",
            "Variété — Texte, images, vidéos, logs, capteurs IoT..."
          ]
        },
        {
          "type": "analogy",
          "text": "🌊 Imagine que les données sont de l'eau. SQL, c'est un système de tuyaux bien organisé, parfait pour un immeuble. Le Big Data, c'est gérer un tsunami : il faut des barrages géants (data centers), des rivières (pipelines), et des lacs (data lakes) !"
        },
        {
          "type": "highlight",
          "text": "Netflix utilise le Big Data pour analyser les habitudes de plus de 250 millions d'abonnés et décider dans quels films et séries investir ses milliards de dollars de budget !"
        },
        {
          "type": "fun-fact",
          "text": "La quantité de données produites dans le monde double environ tous les deux à trois ans. On la compte désormais en zettaoctets, soit des milliers de milliards de gigaoctets ! 🤯"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Qu'est-ce qu'une base de données ?",
      "options": [
        "Un dossier sur le bureau",
        "Un système organisé pour stocker et retrouver des données",
        "Un câble réseau",
        "Un type de virus"
      ],
      "correct": 1,
      "explanation": "Une BDD est un système structuré pour gérer efficacement de grandes quantités de données."
    },
    {
      "question": "Que fait la commande SQL \"SELECT\" ?",
      "options": [
        "Supprimer des données",
        "Lire/récupérer des données",
        "Modifier des données",
        "Créer une table"
      ],
      "correct": 1,
      "explanation": "SELECT permet de lire et récupérer des données depuis une ou plusieurs tables."
    },
    {
      "question": "Qu'est-ce que MongoDB ?",
      "options": [
        "Un langage de programmation",
        "Une base de données NoSQL (documents)",
        "Un système d'exploitation",
        "Un réseau social"
      ],
      "correct": 1,
      "explanation": "MongoDB est une BDD NoSQL qui stocke les données sous forme de documents JSON flexibles."
    },
    {
      "question": "Que signifie les \"3 V\" du Big Data ?",
      "options": [
        "Virus, VPN, Virtual",
        "Volume, Vélocité, Variété",
        "Vue, Voix, Vidéo",
        "Version, Valeur, Vérité"
      ],
      "correct": 1,
      "explanation": "Les 3 V caractérisent le Big Data : Volume (quantité), Vélocité (vitesse), Variété (types de données)."
    },
    {
      "question": "Pour quoi Redis est-il principalement utilisé ?",
      "options": [
        "Stocker des vidéos",
        "Cache ultra-rapide en mémoire",
        "Envoyer des e-mails",
        "Créer des sites web"
      ],
      "correct": 1,
      "explanation": "Redis est une BDD clé-valeur en mémoire, utilisée pour le cache et les sessions (très rapide)."
    },
    {
      "question": "Qu'est-ce qu'une clé primaire dans une table ?",
      "options": [
        "Un mot de passe",
        "Un identifiant unique par ligne",
        "Le nom de la table",
        "Un index de recherche"
      ],
      "correct": 1,
      "explanation": "La clé primaire est un identifiant unique qui distingue chaque enregistrement (ligne) dans une table."
    },
    {
      "question": "Quel mot SQL sert à filtrer les lignes ?",
      "options": [
        "ORDER BY",
        "WHERE",
        "INSERT",
        "DROP"
      ],
      "correct": 1,
      "explanation": "WHERE ne garde que les lignes qui respectent une condition."
    },
    {
      "question": "À quoi sert un index dans une base de données ?",
      "options": [
        "À accélérer les recherches",
        "À supprimer les doublons",
        "À chiffrer les données",
        "À dessiner des graphiques"
      ],
      "correct": 0,
      "explanation": "Comme l'index d'un livre, il permet de trouver une valeur sans tout relire."
    }
  ]
};
