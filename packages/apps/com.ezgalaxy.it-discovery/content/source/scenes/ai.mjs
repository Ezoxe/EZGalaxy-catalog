// Scenes of the module « Intelligence Artificielle avancée »
const INPUTS = ['i1', 'i2', 'i3'];
const HIDDEN = ['h1', 'h2', 'h3', 'h4'];
const OUTPUTS = ['o1', 'o2'];
const neuron = (id, x, y) => ({ id, kind: 'cell', x, y, w: 40, h: 40, text: '', color: 'violet' });
const netLinks = [
  ...INPUTS.flatMap((i) => HIDDEN.map((h) => ({ from: i, to: h }))),
  ...HIDDEN.flatMap((h) => OUTPUTS.map((o) => ({ from: h, to: o }))),
];

export default [
  {
    lesson: 0, at: 1,
    id: 'ai-neural-net',
    title: 'À l\'intérieur d\'un réseau de neurones',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'i1', kind: 'cell', x: 110, y: 90, w: 110, h: 44, text: 'pixels', color: 'cyan' },
      { id: 'i2', kind: 'cell', x: 110, y: 180, w: 110, h: 44, text: 'pixels', color: 'cyan' },
      { id: 'i3', kind: 'cell', x: 110, y: 270, w: 110, h: 44, text: 'pixels', color: 'cyan' },
      neuron('h1', 400, 60), neuron('h2', 400, 140), neuron('h3', 400, 220), neuron('h4', 400, 300),
      { id: 'o1', kind: 'chip', x: 680, y: 130, text: 'chat', fontSize: 16, color: 'slate' },
      { id: 'o2', kind: 'chip', x: 680, y: 240, text: 'chien', fontSize: 16, color: 'slate' },
    ],
    links: netLinks,
    steps: [
      {
        title: 'Des neurones artificiels',
        text: {
          college: 'Le Deep Learning utilise un « réseau de neurones » : de petits calculs reliés entre eux, en couches, un peu comme les neurones du cerveau.',
          lycee: 'Un réseau de neurones est organisé en couches : l\'entrée (les données), des couches cachées, puis la sortie (la réponse).',
          but: 'Perceptron multicouche : chaque neurone calcule une somme pondérée de ses entrées, suivie d\'une fonction d\'activation non linéaire.',
        },
        actions: [{ do: 'pulse', nodes: HIDDEN, color: 'violet' }],
      },
      {
        title: 'L\'image entre',
        text: {
          college: 'On lui donne une image : les pixels entrent dans la première couche du réseau.',
          lycee: 'Chaque pixel (sa couleur, en nombres) est transmis à tous les neurones de la couche suivante.',
          but: 'Le vecteur d\'entrée est multiplié par la matrice des poids de la première couche (produit matriciel).',
        },
        actions: INPUTS.map((i, k) => ({ do: 'travel', path: [i, HIDDEN[k + (k > 0 ? 1 : 0)]], shape: 'dot', count: 2, delay: k * 0.2 }))
          .concat(INPUTS.map((i) => ({ do: 'flow', from: i, to: 'h2' }))),
      },
      {
        title: 'Les couches cachées repèrent des formes',
        text: {
          college: 'Les couches cachées repèrent des détails : des bords, puis des oreilles, puis un museau… Plus il y a de couches, plus le réseau est « profond ».',
          lycee: 'Les premières couches détectent des formes simples, les suivantes les combinent en formes de plus en plus complexes.',
          but: 'Hiérarchie de représentations : contours, textures, parties d\'objets ; la profondeur permet d\'apprendre des fonctions très complexes.',
        },
        actions: [{ do: 'pulse', nodes: HIDDEN, color: 'violet' }].concat(HIDDEN.map((h, k) => ({ do: 'travel', path: [h, 'o1'], shape: 'dot', color: 'violet', delay: k * 0.15 }))),
      },
      {
        title: 'La réponse sort',
        text: {
          college: 'En sortie, le réseau donne sa réponse avec un score de confiance : chat à 93 %.',
          lycee: 'La couche de sortie donne une probabilité pour chaque réponse possible ; on garde la plus élevée.',
          but: 'Fonction softmax en sortie : distribution de probabilités sur les classes ; la prédiction est l\'argmax.',
        },
        actions: [{ do: 'text', node: 'o1', text: 'chat · 93 %' }, { do: 'color', node: 'o1', color: 'green' }, { do: 'text', node: 'o2', text: 'chien · 7 %' }, { do: 'pulse', node: 'o1', color: 'green' }],
      },
      {
        title: 'L\'entraînement coûte très cher',
        text: {
          college: 'Pour bien régler toutes les connexions, il faut des montagnes de données et des milliers de puces graphiques qui calculent pendant des semaines, voire des mois.',
          lycee: 'L\'entraînement ajuste le poids de chaque connexion en remontant l\'erreur ; les plus gros modèles en ont des centaines de milliards.',
          but: 'Rétropropagation sur des milliers de GPU (parallélisme de données et de modèle) ; un coût de calcul et d\'énergie considérable.',
        },
        actions: [{ do: 'travel', path: ['o1', 'h2', 'i2'], color: 'red', count: 3, duration: 1.6 }, { do: 'travel', path: ['o2', 'h4', 'i3'], color: 'red', count: 3, duration: 1.6, delay: 0.4 }],
      },
    ],
    quiz: {
      question: 'Qu\'est-ce qui rend un réseau de neurones « profond » ?',
      options: ['Il a beaucoup de couches', 'Il est rangé sous terre', 'Il est très lent'],
      correct: 0,
      explanation: 'Le « deep » de Deep Learning désigne le grand nombre de couches cachées.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'ai-llm-next-token',
    title: 'Comment ChatGPT écrit, mot après mot',
    stage: { w: 800, h: 370 },
    nodes: [
      { id: 't1', kind: 'chip', x: 80, y: 50, text: 'Le', color: 'cyan' },
      { id: 't2', kind: 'chip', x: 170, y: 50, text: 'chat', color: 'cyan' },
      { id: 't3', kind: 'chip', x: 270, y: 50, text: 'dort', color: 'cyan' },
      { id: 't4', kind: 'chip', x: 365, y: 50, text: 'sur', color: 'cyan' },
      { id: 't5', kind: 'chip', x: 450, y: 50, text: 'le', color: 'cyan' },
      { id: 't6', kind: 'chip', x: 560, y: 50, text: 'canapé', color: 'green', hidden: true },
      { id: 'model', x: 260, y: 230, icon: 'brain', label: 'Modèle de langage', size: 90, color: 'violet' },
      { id: 'b1', kind: 'bar', x: 610, y: 210, w: 220, label: 'canapé', value: 0 },
      { id: 'b2', kind: 'bar', x: 610, y: 265, w: 220, label: 'lit', value: 0 },
      { id: 'b3', kind: 'bar', x: 610, y: 320, w: 220, label: 'toit', value: 0 },
    ],
    links: [],
    steps: [
      {
        title: 'Découper en tokens',
        text: {
          college: 'Le texte est découpé en petits morceaux appelés « tokens » : des mots ou des bouts de mots.',
          lycee: 'La tokenisation transforme le texte en une suite de nombres : chaque token correspond à un mot ou à un morceau de mot.',
          but: 'Tokenisation par sous-mots (BPE) avec un vocabulaire de quelques dizaines à centaines de milliers d\'entrées ; chaque token devient un vecteur.',
        },
        actions: [{ do: 'pulse', nodes: ['t1', 't2', 't3', 't4', 't5'] }],
      },
      {
        title: 'Le modèle lit toute la phrase',
        text: {
          college: 'Le modèle lit toute la phrase et regarde comment les mots sont liés entre eux.',
          lycee: 'Grâce au mécanisme d\'attention, chaque token « regarde » les autres pour comprendre le contexte.',
          but: 'Auto-attention multi-têtes d\'un Transformer : chaque position pondère son lien avec toutes les autres positions du contexte.',
        },
        actions: ['t1', 't2', 't3', 't4', 't5'].map((t, k) => ({ do: 'travel', path: [t, 'model'], shape: 'dot', delay: k * 0.2 })),
      },
      {
        title: 'Il prédit le mot suivant',
        text: {
          college: 'Il calcule quel mot a le plus de chances de venir ensuite : « canapé » 62 %, « lit » 25 %, « toit » 8 %.',
          lycee: 'La sortie est une probabilité pour chaque token possible du vocabulaire.',
          but: 'Distribution de probabilités (softmax sur les logits) sur tout le vocabulaire pour la position suivante.',
        },
        actions: [{ do: 'fill', node: 'b1', to: 62, color: 'green' }, { do: 'fill', node: 'b2', to: 25, color: 'amber' }, { do: 'fill', node: 'b3', to: 8, color: 'slate' }, { do: 'pulse', node: 'model', color: 'violet' }],
      },
      {
        title: 'Mot après mot',
        text: {
          college: 'Il choisit un mot, l\'ajoute à la phrase, puis recommence pour le suivant. C\'est comme ça qu\'il écrit des réponses entières !',
          lycee: 'Génération autorégressive : chaque mot produit est ajouté au contexte pour prédire le suivant.',
          but: 'Décodage autorégressif avec échantillonnage (température, top-p), répété jusqu\'au token de fin.',
        },
        actions: [{ do: 'show', nodes: ['t6'] }, { do: 'travel', path: ['model', 't6'], color: 'green', once: true }, { do: 'pulse', node: 't6', color: 'green' }],
      },
      {
        title: 'D\'où les hallucinations',
        text: {
          college: 'Le modèle choisit ce qui est probable, pas forcément ce qui est vrai : il peut inventer avec beaucoup d\'aplomb. Vérifie toujours !',
          lycee: 'Une réponse fluide n\'est pas une preuve : le modèle peut produire des faits faux mais convaincants (hallucinations).',
          but: 'Le modèle optimise la vraisemblance du texte, pas sa véracité : d\'où l\'intérêt de citer des sources et de vérifier (RAG, vérification humaine).',
        },
        actions: [{ do: 'label', node: 'model', text: 'probable ≠ vrai', pos: 'right', offset: 110, dy: -40, color: 'red' }, { do: 'shake', node: 'model', color: 'red' }],
      },
    ],
    quiz: {
      question: 'Que fait un modèle comme ChatGPT pour écrire une réponse ?',
      options: ['Il recopie une page web', 'Il prédit le mot suivant le plus probable, encore et encore', 'Il appelle un humain'],
      correct: 1,
      explanation: 'Un LLM génère son texte token après token, en choisissant à chaque fois une suite probable.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'ai-bias',
    title: 'Comment une IA peut devenir injuste',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'cv1', kind: 'cell', x: 110, y: 60, w: 150, h: 46, text: 'CV · homme', color: 'cyan' },
      { id: 'cv2', kind: 'cell', x: 110, y: 130, w: 150, h: 46, text: 'CV · homme', color: 'cyan' },
      { id: 'cv3', kind: 'cell', x: 110, y: 200, w: 150, h: 46, text: 'CV · homme', color: 'cyan' },
      { id: 'cv4', kind: 'cell', x: 110, y: 270, w: 150, h: 46, text: 'CV · femme', color: 'pink' },
      { id: 'model', x: 420, y: 170, icon: 'robot', label: 'IA de tri des CV', size: 84, color: 'violet' },
      { id: 'yes', x: 690, y: 90, icon: 'check', label: 'Retenu', color: 'green' },
      { id: 'no', x: 690, y: 260, icon: 'cross', label: 'Écarté', color: 'red' },
    ],
    links: [{ from: 'model', to: 'yes' }, { from: 'model', to: 'no' }],
    steps: [
      {
        title: 'Des données du passé',
        text: {
          college: 'Pour trier des CV, une IA apprend à partir des recrutements des dix dernières années… pendant lesquelles on a surtout embauché des hommes.',
          lycee: 'Les données historiques reflètent les choix du passé, avec leurs déséquilibres.',
          but: 'Biais d\'échantillonnage et d\'étiquetage : la variable cible encode les décisions humaines passées.',
        },
        actions: [{ do: 'pulse', nodes: ['cv1', 'cv2', 'cv3'] }, { do: 'dim', nodes: ['cv4'] }],
      },
      {
        title: 'L\'IA copie le passé',
        text: {
          college: 'L\'IA en déduit qu\'un « bon » CV ressemble à celui d\'un homme. Elle n\'a aucune mauvaise intention : elle copie ses données.',
          lycee: 'Le modèle apprend des corrélations, y compris les injustes : ici, « homme » est associé à « embauché ».',
          but: 'Des variables proches du genre (mots, activités, écoles) servent de « proxy » même si le genre est retiré des données.',
        },
        actions: [{ do: 'undim', nodes: ['cv4'] }, { do: 'travel', path: ['cv1', 'model'], shape: 'dot' }, { do: 'travel', path: ['cv2', 'model'], shape: 'dot', delay: 0.2 }, { do: 'travel', path: ['cv3', 'model'], shape: 'dot', delay: 0.4 }, { do: 'pulse', node: 'model', color: 'violet' }],
      },
      {
        title: 'Des décisions injustes',
        text: {
          college: 'Résultat : à compétences égales, les CV de femmes sont écartés. C\'est arrivé chez Amazon, qui a dû abandonner son outil.',
          lycee: 'Le biais se répète à grande échelle, automatiquement et sans que personne ne le remarque tout de suite.',
          but: 'Effet de discrimination indirecte, amplifié par l\'automatisation et l\'opacité du modèle.',
        },
        actions: [{ do: 'travel', path: ['cv2', 'model', 'yes'], color: 'cyan' }, { do: 'travel', path: ['cv4', 'model', 'no'], color: 'red', delay: 0.6 }, { do: 'shake', node: 'no', color: 'red', delay: 1.4 }],
      },
      {
        title: 'Corriger',
        text: {
          college: 'Pour corriger, on rééquilibre les données, on teste l\'IA sur chaque groupe et on garde un humain pour les décisions importantes. En Europe, l\'AI Act l\'impose pour le recrutement.',
          lycee: 'Audit d\'équité, données rééquilibrées, supervision humaine : l\'AI Act classe le recrutement parmi les usages « à haut risque ».',
          but: 'Métriques d\'équité (parité démographique, égalité des chances), audits, documentation et contrôle humain exigés par l\'AI Act pour les systèmes à haut risque.',
        },
        actions: [{ do: 'text', node: 'cv3', text: 'CV · femme' }, { do: 'color', node: 'cv3', color: 'pink' }, { do: 'travel', path: ['cv4', 'model', 'yes'], color: 'green' }, { do: 'highlight', node: 'yes', color: 'green' }],
      },
    ],
    quiz: {
      question: 'D\'où viennent la plupart des biais d\'une IA ?',
      options: ['Des données utilisées pour l\'entraîner', 'De la couleur de l\'écran', 'De la vitesse du processeur'],
      correct: 0,
      explanation: 'Une IA reproduit les déséquilibres de ses données d\'entraînement : il faut les vérifier et les corriger.',
    },
  },
];
