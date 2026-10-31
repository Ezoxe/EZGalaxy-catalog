export default {
  "id": "ai",
  "title": "Intelligence Artificielle avancée",
  "icon": "🤖",
  "color": "#7c3aed",
  "tier": 4,
  "requiredModules": [
    "databases",
    "enterprise"
  ],
  "description": "Va plus loin dans l'IA : réseaux de neurones, NLP, LLMs, éthique et biais",
  "lessons": [
    {
      "title": "Machine Learning vs Deep Learning",
      "icon": "🧠",
      "content": [
        {
          "type": "paragraph",
          "text": "L'IA est un domaine vaste. Le Machine Learning (ML) et le Deep Learning (DL) sont deux approches différentes pour \"apprendre\" à partir de données."
        },
        {
          "type": "interactive-diagram",
          "title": "L'IA, le ML et le DL — clique pour comprendre",
          "elements": [
            {
              "id": "ia",
              "label": "🧠 IA",
              "x": 50,
              "y": 15,
              "info": "Intelligence Artificielle : tout programme qui simule un comportement \"intelligent\". Inclut les règles programmées à la main aussi."
            },
            {
              "id": "ml",
              "label": "📊 Machine Learning",
              "x": 50,
              "y": 45,
              "info": "Sous-ensemble de l'IA. Le programme apprend des patterns à partir de données au lieu d'être programmé manuellement."
            },
            {
              "id": "dl",
              "label": "🔮 Deep Learning",
              "x": 50,
              "y": 75,
              "info": "Sous-ensemble du ML. Utilise des réseaux de neurones à plusieurs couches. C'est ce qui fait tourner ChatGPT, DALL-E, etc."
            }
          ]
        },
        {
          "type": "drag-match",
          "question": "Associe chaque type d'IA à son exemple :",
          "pairs": [
            {
              "term": "Règles (IA classique)",
              "definition": "Filtre anti-spam simple (mots-clés)"
            },
            {
              "term": "Machine Learning",
              "definition": "Détection de fraude bancaire"
            },
            {
              "term": "Deep Learning",
              "definition": "Reconnaissance vocale (Siri)"
            },
            {
              "term": "Reinforcement Learning",
              "definition": "AlphaGo (apprend en jouant)"
            },
            {
              "term": "LLM (Large Language Model)",
              "definition": "ChatGPT, Claude, Gemini"
            }
          ]
        },
        {
          "type": "list",
          "title": "Types de Machine Learning :",
          "items": [
            "Supervisé — On donne des exemples étiquetés (photo de chat → \"chat\")",
            "Non supervisé — L'algo trouve des patterns seul (groupes de clients)",
            "Reinforcement Learning — L'algo apprend par essai/erreur (jeux, robots)"
          ]
        },
        {
          "type": "highlight",
          "text": "Le Deep Learning nécessite des MILLIONS de données ET des GPU puissants. C'est pourquoi seuls les géants (Google, Meta, OpenAI, Anthropic…) peuvent entraîner les plus gros modèles."
        },
        {
          "type": "fun-fact",
          "text": "L'entraînement de GPT-4 aurait coûté plus de 100 millions de dollars et mobilisé des milliers de processeurs graphiques pendant des mois ! ⚡"
        }
      ]
    },
    {
      "title": "NLP & les LLMs",
      "icon": "💬",
      "content": [
        {
          "type": "paragraph",
          "text": "Le NLP (Natural Language Processing) permet aux machines de comprendre et générer du langage humain. Les LLMs (Large Language Models) comme ChatGPT sont la révolution NLP."
        },
        {
          "type": "list",
          "title": "Comment fonctionne un LLM :",
          "items": [
            "1. Entraînement — Le modèle lit des milliers de milliards de mots (une grande partie du web public, des livres…)",
            "2. Tokenisation — Le texte est découpé en petits morceaux (tokens)",
            "3. Prédiction — Pour chaque token, le modèle prédit le suivant le plus probable",
            "4. Fine-tuning — Le modèle est affiné pour suivre des instructions",
            "5. RLHF — Des humains évaluent les réponses pour les améliorer"
          ]
        },
        {
          "type": "flashcard-deck",
          "title": "Vocabulaire NLP",
          "cards": [
            {
              "front": "Token",
              "back": "Unité de base du texte pour un LLM. Un mot courant comme « Bonjour » fait souvent 1 ou 2 tokens ; un mot rare est découpé en plusieurs morceaux."
            },
            {
              "front": "Transformer",
              "back": "Architecture de réseau de neurones derrière GPT, Claude, Gemini. Inventé par Google en 2017."
            },
            {
              "front": "Prompt",
              "back": "La question ou instruction que tu donnes à un LLM."
            },
            {
              "front": "Hallucination",
              "back": "Quand un LLM invente des informations fausses avec assurance."
            },
            {
              "front": "RLHF",
              "back": "Reinforcement Learning from Human Feedback — Améliorer le modèle grâce aux évaluations humaines."
            },
            {
              "front": "Embedding",
              "back": "Représentation numérique (vecteur) d'un mot ou d'une phrase. Les mots similaires ont des vecteurs proches."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🎰 Un LLM, c'est comme un système de complétion automatique GÉANT. Il ne \"comprend\" pas vraiment. Il prédit le prochain mot le plus probable basé sur des patterns statistiques appris sur des milliers de milliards de mots."
        },
        {
          "type": "highlight",
          "text": "Les LLMs \"hallucinent\" : ils peuvent générer des réponses fausses mais convaincantes. Toujours vérifier les informations critiques avec des sources fiables !"
        },
        {
          "type": "fun-fact",
          "text": "Le \"T\" de GPT signifie \"Transformer\", une architecture inventée par Google en 2017. Ironiquement, c'est OpenAI (et pas Google) qui l'a rendue célèbre avec ChatGPT ! 🔄"
        }
      ]
    },
    {
      "title": "Éthique et biais de l'IA",
      "icon": "⚖️",
      "content": [
        {
          "type": "paragraph",
          "text": "L'IA n'est pas neutre. Elle reproduit et amplifie les biais présents dans ses données d'entraînement. Comprendre ces enjeux est crucial."
        },
        {
          "type": "list",
          "title": "Les principaux biais de l'IA :",
          "items": [
            "Biais de données — Si les données d'entraînement ne sont pas représentatives",
            "Biais de genre — IA de recrutement qui favorise les CV masculins (cas Amazon)",
            "Biais racial — Reconnaissance faciale moins précise sur les peaux foncées (étude Gender Shades, 2018)",
            "Biais de confirmation — L'IA renforce ce que tu crois déjà (bulles de filtre)",
            "Biais de survie — Ne considérer que les succès, pas les échecs"
          ]
        },
        {
          "type": "true-false",
          "title": "Éthique de l'IA — Vrai ou Faux ?",
          "statements": [
            {
              "text": "Un algorithme est toujours neutre et objectif",
              "answer": false,
              "explanation": "Un algo reflète les biais de ses données ET de ses créateurs. \"Garbage in, garbage out\"."
            },
            {
              "text": "Le RGPD s'applique aussi à l'IA",
              "answer": true,
              "explanation": "Le RGPD protège les données personnelles utilisées pour entraîner les IA en Europe."
            },
            {
              "text": "L'AI Act européen est la première grande loi au monde dédiée à l'IA",
              "answer": true,
              "explanation": "L'AI Act (2024) classe les IA par niveau de risque et impose des obligations aux créateurs."
            },
            {
              "text": "Les deepfakes sont toujours illégaux",
              "answer": false,
              "explanation": "Les deepfakes satiriques ou artistiques sont légaux. C'est l'usage malveillant (fraude, diffamation) qui est illégal."
            }
          ]
        },
        {
          "type": "analogy",
          "text": "🪞 L'IA est un miroir de la société. Si les données qu'on lui donne contiennent des préjugés (recrutement sexiste, profilage racial), l'IA va reproduire et amplifier ces préjugés à grande échelle."
        },
        {
          "type": "highlight",
          "text": "Amazon a dû abandonner son IA de recrutement (l'affaire a été révélée en 2018) car elle pénalisait les CV contenant le mot « femmes » — elle avait appris sur 10 ans de recrutement majoritairement masculin."
        },
        {
          "type": "fun-fact",
          "text": "L'AI Act européen (2024) est la première grande loi au monde dédiée à l'IA. Elle classe les IA en 4 niveaux de risque : minimal, limité, élevé, et inacceptable (interdit). 🏛️"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Quelle est la différence entre ML et Deep Learning ?",
      "options": [
        "Aucune",
        "Le DL utilise des réseaux de neurones profonds",
        "Le ML est plus récent",
        "Le DL est plus simple"
      ],
      "correct": 1,
      "explanation": "Le Deep Learning est un sous-ensemble du ML qui utilise des réseaux de neurones à plusieurs couches (profondes)."
    },
    {
      "question": "Que signifie le \"T\" de GPT ?",
      "options": [
        "Technology",
        "Transformer",
        "Translation",
        "Training"
      ],
      "correct": 1,
      "explanation": "GPT = Generative Pre-trained Transformer. Le Transformer est l'architecture de réseau de neurones inventée par Google."
    },
    {
      "question": "Qu'est-ce qu'une \"hallucination\" d'un LLM ?",
      "options": [
        "Un bug d'affichage",
        "Quand il invente des infos fausses",
        "Un problème de mémoire",
        "Une mise à jour"
      ],
      "correct": 1,
      "explanation": "Les LLMs peuvent générer des informations fausses mais présentées avec assurance — c'est une \"hallucination\"."
    },
    {
      "question": "Pourquoi l'IA de recrutement d'Amazon était-elle biaisée ?",
      "options": [
        "Bug technique",
        "Données d'entraînement biaisées (recrutement masculin)",
        "Piratage",
        "Manque de puissance"
      ],
      "correct": 1,
      "explanation": "Entraînée sur 10 ans de recrutement majoritairement masculin, l'IA a appris à pénaliser les profils féminins."
    },
    {
      "question": "Combien a coûté l'entraînement de GPT-4 ?",
      "options": [
        "1 000 $",
        "100 000 $",
        "~100 millions $",
        "100 milliards $"
      ],
      "correct": 2,
      "explanation": "L'entraînement de GPT-4 a coûté environ 100 millions de dollars en calcul GPU et énergie."
    },
    {
      "question": "Quel type de ML apprend par essai/erreur ?",
      "options": [
        "Supervisé",
        "Non supervisé",
        "Reinforcement Learning",
        "Deep Learning"
      ],
      "correct": 2,
      "explanation": "Le Reinforcement Learning apprend par essai-erreur avec des récompenses/punitions (comme un jeu)."
    },
    {
      "question": "Qu'est-ce qu'un prompt ?",
      "options": [
        "Une panne de serveur",
        "L'instruction ou la question donnée à une IA",
        "Un type de processeur",
        "Un virus"
      ],
      "correct": 1,
      "explanation": "Le prompt est le texte qu'on donne au modèle : plus il est précis, meilleure est la réponse."
    },
    {
      "question": "Comment l'AI Act européen classe-t-il les IA ?",
      "options": [
        "Par couleur",
        "Par niveau de risque",
        "Par prix",
        "Par langue"
      ],
      "correct": 1,
      "explanation": "Quatre niveaux : risque minimal, limité, élevé et inacceptable (interdit)."
    }
  ]
};
