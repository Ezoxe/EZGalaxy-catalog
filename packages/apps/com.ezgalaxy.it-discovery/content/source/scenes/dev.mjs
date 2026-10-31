// Scenes of the module « Le Développement & l'IA »
export default [
  {
    lesson: 0, at: 2,
    id: 'dev-algorithm',
    title: 'Programmer un robot, pas à pas',
    stage: { w: 800, h: 340 },
    nodes: [
      { id: 'code', kind: 'terminal', x: 20, y: 30, w: 330, h: 270, title: 'robot.py' },
      { id: 'c0', kind: 'cell', x: 430, y: 180, w: 70, h: 70, text: '' },
      { id: 'c1', kind: 'cell', x: 510, y: 180, w: 70, h: 70, text: '' },
      { id: 'c2', kind: 'cell', x: 590, y: 180, w: 70, h: 70, text: '' },
      { id: 'c3', kind: 'cell', x: 670, y: 180, w: 70, h: 70, text: '' },
      { id: 'goal', x: 750, y: 180, icon: 'star', label: 'Gâteau', size: 54, color: 'amber' },
      { id: 'robot', x: 430, y: 180, icon: 'robot', label: 'Robot', size: 54, color: 'cyan' },
    ],
    links: [],
    steps: [
      {
        title: 'Le problème',
        text: {
          college: 'Un robot doit aller chercher le gâteau. Il ne sait rien faire tout seul : il faut lui donner des instructions, une par une.',
          lycee: 'Programmer, c\'est décrire un problème et sa solution sous forme d\'instructions qu\'une machine peut exécuter.',
          but: 'On spécifie le problème : état initial, état final attendu et actions élémentaires disponibles (avancer, prendre).',
        },
        actions: [{ do: 'pulse', node: 'goal', color: 'amber' }, { do: 'label', node: 'robot', text: 'objectif : le gâteau', pos: 'top', offset: 62 }],
      },
      {
        title: 'On écrit l\'algorithme',
        text: {
          college: 'On écrit la solution étape par étape : c\'est l\'algorithme. Ici : « avance 3 fois, puis prends le gâteau ».',
          lycee: 'Un algorithme est une suite finie d\'instructions précises. Une boucle permet de répéter une action sans la réécrire.',
          but: 'Structure itérative (boucle for) : son corps est exécuté un nombre fini de fois, ce qui garantit que le programme se termine.',
        },
        actions: [{ do: 'type', node: 'code', text: '$ for i in range(3):\n      avancer()\n$ prendre("gâteau")' }],
      },
      {
        title: 'L\'ordinateur exécute',
        text: {
          college: 'L\'ordinateur exécute les instructions dans l\'ordre, sans jamais en sauter une. Un pas, deux pas, trois pas…',
          lycee: 'Le processeur exécute les instructions l\'une après l\'autre ; la boucle répète « avancer » trois fois.',
          but: 'Exécution séquentielle : le compteur ordinal avance d\'instruction en instruction et revient en arrière à chaque tour de boucle.',
        },
        actions: [
          { do: 'move', node: 'robot', to: { x: 510, y: 180 }, duration: 0.7 },
          { do: 'move', node: 'robot', to: { x: 590, y: 180 }, duration: 0.7, delay: 1 },
          { do: 'move', node: 'robot', to: { x: 670, y: 180 }, duration: 0.7, delay: 2 },
          { do: 'type', node: 'code', text: '> avancer()  ×3', delay: 2.8 },
        ],
      },
      {
        title: 'Oups, un bug !',
        text: {
          college: 'Si on s\'était trompé et écrit « 4 fois », le robot foncerait dans le mur ! C\'est un bug. On relit, on teste, on corrige : c\'est le débogage.',
          lycee: 'Une erreur de logique (bug) donne un résultat faux sans forcément afficher d\'erreur. On teste le programme pour la trouver, puis on la corrige.',
          but: 'Erreur classique « off-by-one » sur la borne de la boucle ; des tests unitaires la détectent avant la mise en production.',
        },
        actions: [{ do: 'shake', node: 'robot', color: 'red' }, { do: 'label', node: 'robot', text: 'range(4) → boum !', pos: 'top', offset: 62, color: 'red' }],
      },
      {
        title: 'Mission accomplie',
        text: {
          college: 'Avec le bon programme, le robot rapporte le gâteau. Programmer, c\'est écrire une recette ultra précise qu\'une machine suit à la lettre.',
          lycee: 'Un programme correct produit le résultat attendu pour toutes les situations prévues : c\'est ce qu\'on vérifie par les tests.',
          but: 'Programme correct = il se termine et respecte sa spécification ; on le prouve par des tests, voire par une preuve formelle.',
        },
        actions: [{ do: 'type', node: 'code', text: '> prendre("gâteau")\nGâteau récupéré !' }, { do: 'pulse', node: 'goal', color: 'green' }, { do: 'highlight', node: 'robot', color: 'green' }],
      },
    ],
    quiz: {
      question: 'Comment appelle-t-on une suite d\'étapes précises pour résoudre un problème ?',
      options: ['Un algorithme', 'Un pixel', 'Un câble'],
      correct: 0,
      explanation: 'Un algorithme est une suite finie d\'instructions qui mène à la solution.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'dev-frontend-backend',
    title: 'Ce qui se passe quand tu cliques sur « J\'aime »',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'front', kind: 'zone', x: 15, y: 20, w: 345, h: 320, label: 'Frontend · ton navigateur' },
      { id: 'back', kind: 'zone', x: 420, y: 20, w: 365, h: 320, label: 'Backend · le serveur' },
      { id: 'page', x: 185, y: 115, icon: 'screen', label: 'Page web', size: 76 },
      { id: 'html', kind: 'chip', x: 85, y: 245, text: 'HTML', color: 'amber' },
      { id: 'css', kind: 'chip', x: 185, y: 295, text: 'CSS', color: 'pink' },
      { id: 'js', kind: 'chip', x: 285, y: 245, text: 'JavaScript', color: 'green' },
      { id: 'api', x: 500, y: 180, icon: 'code', label: 'API' },
      { id: 'server', x: 680, y: 105, icon: 'server', label: 'Serveur' },
      { id: 'db', x: 680, y: 265, icon: 'database', label: 'Base de données', color: 'violet' },
    ],
    links: [
      { from: 'html', to: 'page' }, { from: 'css', to: 'page' }, { from: 'js', to: 'page' },
      { from: 'page', to: 'api' }, { from: 'api', to: 'server' }, { from: 'server', to: 'db' },
    ],
    steps: [
      {
        title: 'La structure : HTML',
        text: {
          college: 'HTML pose la structure de la page : un titre, un texte, une image, un bouton. C\'est le squelette.',
          lycee: 'HTML décrit le contenu et sa structure grâce à des balises : <h1> pour un titre, <p> pour un paragraphe, <button> pour un bouton.',
          but: 'HTML construit l\'arbre du document (DOM) : éléments sémantiques, attributs et informations d\'accessibilité.',
        },
        actions: [{ do: 'pulse', node: 'html', color: 'amber' }, { do: 'flow', from: 'html', to: 'page', color: 'amber' }],
      },
      {
        title: 'Le look : CSS',
        text: {
          college: 'CSS habille la page : couleurs, polices, espaces, animations. C\'est le style.',
          lycee: 'CSS applique des règles de style aux éléments : couleurs, tailles, mise en page en flexbox ou en grille.',
          but: 'Cascade, spécificité et héritage ; mise en page flexbox/grid et media queries pour s\'adapter à chaque écran.',
        },
        actions: [{ do: 'pulse', node: 'css', color: 'pink' }, { do: 'flow', from: 'css', to: 'page', color: 'pink' }, { do: 'color', node: 'page', color: 'pink' }],
      },
      {
        title: 'L\'action : JavaScript',
        text: {
          college: 'JavaScript rend la page vivante : quand tu cliques sur « J\'aime », il réagit tout de suite.',
          lycee: 'JavaScript réagit aux événements (clic, saisie) et modifie la page sans la recharger.',
          but: 'Le JavaScript manipule le DOM grâce à des écouteurs d\'événements et envoie des requêtes asynchrones (fetch).',
        },
        actions: [{ do: 'travel', path: ['js', 'page'], color: 'green', count: 2 }, { do: 'label', node: 'page', text: 'clic sur « J\'aime »', pos: 'top', offset: 66, color: 'green' }],
      },
      {
        title: 'Le message part vers l\'API',
        text: {
          college: 'Pour enregistrer ton « J\'aime », la page envoie un message au serveur, en passant par l\'API, le guichet du backend.',
          lycee: 'Le frontend appelle une API (par exemple POST /likes) ; le serveur reçoit la requête et applique les règles du site.',
          but: 'Requête HTTP vers une API REST (POST /api/likes en JSON), authentifiée par un jeton et validée côté serveur.',
        },
        actions: [{ do: 'travel', path: ['page', 'api', 'server'], count: 2 }, { do: 'label', node: 'api', text: 'POST /likes', pos: 'bottom', offset: 60 }],
      },
      {
        title: 'La base de données retient tout',
        text: {
          college: 'Le serveur range l\'information dans la base de données, puis renvoie la réponse. La page affiche ton cœur rouge !',
          lycee: 'Le serveur met à jour la base de données puis renvoie une réponse que la page affiche.',
          but: 'Transaction SQL (UPDATE posts SET likes = likes + 1), réponse 200 en JSON, puis mise à jour de l\'interface.',
        },
        actions: [
          { do: 'travel', path: ['server', 'db', 'server', 'api', 'page'], color: 'amber', count: 2, duration: 3 },
          { do: 'label', node: 'db', text: 'likes = 42', pos: 'left', offset: 46, color: 'violet' },
        ],
      },
    ],
    quiz: {
      question: 'Dans un site web, où sont rangées les données des utilisateurs ?',
      options: ['Dans le CSS', 'Dans la base de données du backend', 'Dans l\'écran'],
      correct: 1,
      explanation: 'Le backend stocke les données (comptes, messages, likes) dans une base de données.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'dev-ml-training',
    title: 'Comment une IA apprend à reconnaître un chat',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'img1', kind: 'cell', x: 100, y: 80, w: 150, h: 56, text: 'photo · chat', color: 'cyan' },
      { id: 'img2', kind: 'cell', x: 100, y: 180, w: 150, h: 56, text: 'photo · chien', color: 'cyan' },
      { id: 'img3', kind: 'cell', x: 100, y: 280, w: 150, h: 56, text: 'photo · chat', color: 'cyan' },
      { id: 'model', x: 400, y: 180, icon: 'brain', label: 'Modèle', size: 84, color: 'violet' },
      { id: 'pred', kind: 'chip', x: 660, y: 110, text: '?', fontSize: 16, color: 'slate' },
      { id: 'acc', kind: 'bar', x: 660, y: 260, w: 200, label: 'Précision', value: 0 },
    ],
    links: [{ from: 'img1', to: 'model' }, { from: 'img2', to: 'model' }, { from: 'img3', to: 'model' }, { from: 'model', to: 'pred' }],
    steps: [
      {
        title: 'Des exemples étiquetés',
        text: {
          college: 'Pour apprendre à reconnaître un chat, on montre à l\'IA des milliers de photos en lui disant à chaque fois : « chat » ou « pas chat ».',
          lycee: 'Apprentissage supervisé : on fournit des données étiquetées, c\'est-à-dire des photos avec la bonne réponse.',
          but: 'Jeu de données (x, y) étiqueté, séparé en entraînement, validation et test pour mesurer la capacité à généraliser.',
        },
        actions: [{ do: 'pulse', nodes: ['img1', 'img2', 'img3'] }],
      },
      {
        title: 'Elle devine… et se trompe',
        text: {
          college: 'Au début, l\'IA répond un peu au hasard. Elle se trompe souvent !',
          lycee: 'Le modèle, initialisé au hasard, fait une prédiction ; on mesure son erreur par rapport à la bonne réponse.',
          but: 'Propagation avant avec des poids aléatoires ; la fonction de perte (entropie croisée) mesure l\'écart avec l\'étiquette.',
        },
        actions: [{ do: 'travel', path: ['img1', 'model', 'pred'], once: true, duration: 1.6 }, { do: 'text', node: 'pred', text: 'chien ?', delay: 1.6 }, { do: 'color', node: 'pred', color: 'red', delay: 1.6 }],
      },
      {
        title: 'Elle corrige ses réglages',
        text: {
          college: 'À chaque erreur, elle ajuste un tout petit peu ses réglages internes pour faire mieux la fois suivante.',
          lycee: 'Le modèle modifie ses paramètres (les poids) pour réduire son erreur : c\'est l\'entraînement.',
          but: 'Rétropropagation du gradient puis descente de gradient : w ← w − η·∂L/∂w, répétée sur des milliers de lots.',
        },
        actions: [{ do: 'travel', path: ['pred', 'model'], color: 'red', shape: 'dot', count: 3 }, { do: 'pulse', node: 'model', color: 'violet' }, { do: 'fill', node: 'acc', to: 40, color: 'amber' }],
      },
      {
        title: 'Des milliers de fois',
        text: {
          college: 'Après des milliers d\'exemples, elle reconnaît un chat même sur une photo qu\'elle n\'a jamais vue !',
          lycee: 'Après de nombreux passages sur les données, la précision augmente ; on la vérifie sur des photos jamais vues.',
          but: 'On suit la précision sur le jeu de validation pour arrêter avant le surapprentissage (overfitting).',
        },
        actions: [
          { do: 'travel', path: ['img1', 'model'], count: 2, duration: 1 },
          { do: 'travel', path: ['img2', 'model'], count: 2, duration: 1, delay: 0.3 },
          { do: 'travel', path: ['img3', 'model'], count: 2, duration: 1, delay: 0.6 },
          { do: 'fill', node: 'acc', to: 94, color: 'green', duration: 2.5 },
          { do: 'text', node: 'pred', text: 'chat (97 %)' }, { do: 'color', node: 'pred', color: 'green' },
        ],
      },
      {
        title: 'Mais elle ne « comprend » pas',
        text: {
          college: 'Attention : l\'IA ne sait pas ce qu\'est un chat. Elle a juste appris à repérer des formes qui reviennent souvent sur les photos de chats.',
          lycee: 'Le modèle a appris des liens statistiques, pas le sens des choses : avec des données biaisées, on obtient une IA biaisée.',
          but: 'Corrélations apprises ≠ compréhension causale ; le modèle reste sensible aux biais du jeu de données et aux exemples adverses.',
        },
        actions: [{ do: 'label', node: 'model', text: 'repère des formes, pas des idées', pos: 'bottom', offset: 84, color: 'violet' }],
      },
    ],
    quiz: {
      question: 'Comment une IA apprend-elle à reconnaître des chats ?',
      options: ['On lui explique la définition d\'un chat', 'On lui montre beaucoup d\'exemples étiquetés', 'Elle le sait dès le départ'],
      correct: 1,
      explanation: 'L\'apprentissage supervisé repose sur des milliers d\'exemples accompagnés de la bonne réponse.',
    },
  },
];
