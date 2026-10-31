// Scenes of the module « Bases de données & Big Data »
const cell = (id, x, y, text, extra = {}) => ({ id, kind: 'cell', x, y, w: x === 160 ? 90 : 150, h: 40, text, ...extra });

export default [
  {
    lesson: 0, at: 1,
    id: 'db-table',
    title: 'À l\'intérieur d\'une table',
    stage: { w: 800, h: 330 },
    nodes: [
      cell('h0', 160, 50, 'id', { color: 'violet' }), cell('h1', 290, 50, 'pseudo', { color: 'cyan' }), cell('h2', 450, 50, 'ville', { color: 'cyan' }),
      cell('a0', 160, 105, '1'), cell('a1', 290, 105, 'Lina'), cell('a2', 450, 105, 'Paris'),
      cell('b0', 160, 155, '2'), cell('b1', 290, 155, 'Tom'), cell('b2', 450, 155, 'Lyon'),
      cell('c0', 160, 205, '3'), cell('c1', 290, 205, 'Noa'), cell('c2', 450, 205, 'Paris'),
      cell('d0', 160, 255, '4', { hidden: true, color: 'green' }), cell('d1', 290, 255, 'Eve', { hidden: true, color: 'green' }), cell('d2', 450, 255, 'Nice', { hidden: true, color: 'green' }),
      { id: 'db', x: 670, y: 150, icon: 'database', label: 'Table « eleves »', size: 76, color: 'violet' },
    ],
    links: [],
    steps: [
      {
        title: 'Une table, comme un tableau',
        text: {
          college: 'Une base de données range les informations dans des tables, comme un grand tableau : chaque colonne est un type d\'info (pseudo, ville).',
          lycee: 'Une table est faite de colonnes (des attributs avec un type) et de lignes (les enregistrements).',
          but: 'Modèle relationnel : une relation est un ensemble de tuples ; chaque attribut a un domaine ; le schéma est défini en SQL (CREATE TABLE).',
        },
        actions: [{ do: 'highlight', nodes: ['h0', 'h1', 'h2'] }, { do: 'pulse', node: 'db', color: 'violet' }],
      },
      {
        title: 'Chaque ligne est unique',
        text: {
          college: 'Chaque ligne a un numéro unique : l\'identifiant (id). Deux élèves peuvent s\'appeler Tom, mais jamais avoir le même id.',
          lycee: 'La clé primaire identifie chaque ligne de façon unique et ne peut jamais être vide.',
          but: 'Contrainte PRIMARY KEY (unicité et NOT NULL), indexée automatiquement ; elle sert de cible aux clés étrangères.',
        },
        actions: [{ do: 'highlight', nodes: ['a0', 'b0', 'c0'], color: 'violet' }, { do: 'label', node: 'h0', text: 'clé primaire', pos: 'left', offset: 50, color: 'violet' }],
      },
      {
        title: 'Une nouvelle ligne',
        text: {
          college: 'Quand une nouvelle élève s\'inscrit, on ajoute une ligne à la table.',
          lycee: 'INSERT ajoute un enregistrement ; la base vérifie au passage les contraintes (types, unicité).',
          but: 'INSERT INTO … VALUES … dans une transaction ACID : si une contrainte est violée, l\'insertion est refusée.',
        },
        actions: [{ do: 'show', nodes: ['d0', 'd1', 'd2'] }, { do: 'pulse', nodes: ['d0', 'd1', 'd2'], color: 'green' }],
      },
      {
        title: 'Retrouver en un éclair',
        text: {
          college: 'Pour trouver tous ceux qui habitent à Paris, la base n\'a pas besoin de tout relire : un index, comme celui d\'un livre, l\'emmène droit aux bonnes lignes.',
          lycee: 'Un index sur la colonne « ville » évite de parcourir toute la table : la recherche reste quasi instantanée, même sur des millions de lignes.',
          but: 'Index B-tree : recherche en O(log n) au lieu d\'un parcours séquentiel en O(n) ; en contrepartie, les écritures sont un peu plus lentes.',
        },
        actions: [{ do: 'highlight', nodes: ['a1', 'a2', 'c1', 'c2'], color: 'amber' }, { do: 'dim', nodes: ['b0', 'b1', 'b2', 'd0', 'd1', 'd2'] }, { do: 'label', node: 'db', text: 'index « ville »', pos: 'bottom', offset: 72, color: 'amber' }],
      },
    ],
    quiz: {
      question: 'Comment s\'appelle l\'identifiant unique de chaque ligne d\'une table ?',
      options: ['La clé primaire', 'Le mot de passe', 'La colonne vide'],
      correct: 0,
      explanation: 'La clé primaire distingue chaque ligne : elle est unique et jamais vide.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'db-sql-query',
    title: 'Parler à une base de données en SQL',
    stage: { w: 800, h: 340 },
    nodes: [
      { id: 'term', kind: 'terminal', x: 15, y: 20, w: 420, h: 300, title: 'SQL' },
      { id: 'hp', kind: 'cell', x: 545, y: 50, w: 130, h: 38, text: 'pseudo', color: 'cyan' },
      { id: 'hv', kind: 'cell', x: 690, y: 50, w: 130, h: 38, text: 'ville', color: 'cyan' },
      { id: 'p1', kind: 'cell', x: 545, y: 100, w: 130, h: 38, text: 'Lina' }, { id: 'v1', kind: 'cell', x: 690, y: 100, w: 130, h: 38, text: 'Paris' },
      { id: 'p2', kind: 'cell', x: 545, y: 148, w: 130, h: 38, text: 'Tom' }, { id: 'v2', kind: 'cell', x: 690, y: 148, w: 130, h: 38, text: 'Lyon' },
      { id: 'p3', kind: 'cell', x: 545, y: 196, w: 130, h: 38, text: 'Noa' }, { id: 'v3', kind: 'cell', x: 690, y: 196, w: 130, h: 38, text: 'Paris' },
      { id: 'p4', kind: 'cell', x: 545, y: 244, w: 130, h: 38, text: 'Eve' }, { id: 'v4', kind: 'cell', x: 690, y: 244, w: 130, h: 38, text: 'Nice' },
      { id: 'result', kind: 'chip', x: 617, y: 305, text: 'résultat : —', color: 'amber' },
    ],
    links: [],
    steps: [
      {
        title: 'SELECT : « montre-moi »',
        text: {
          college: 'SELECT veut dire « montre-moi ». Ici : « montre-moi les pseudos de la table élèves ».',
          lycee: 'SELECT choisit les colonnes à afficher, FROM indique dans quelle table chercher.',
          but: 'Projection : SELECT liste les colonnes voulues ; le SGBD construit un plan d\'exécution avant de lire les données.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ SELECT pseudo FROM eleves;\nLina | Tom | Noa | Eve' }, { do: 'highlight', nodes: ['p1', 'p2', 'p3', 'p4'] }],
      },
      {
        title: 'WHERE : « seulement ceux qui… »',
        text: {
          college: 'WHERE garde seulement les lignes qui respectent une condition : ici, les élèves qui habitent à Paris.',
          lycee: 'WHERE filtre les lignes selon une condition (=, <, >, LIKE…).',
          but: 'Restriction : le prédicat est évalué pour chaque ligne, idéalement en s\'appuyant sur un index de la colonne ville.',
        },
        actions: [
          { do: 'type', node: 'term', text: '$ SELECT pseudo FROM eleves\n      WHERE ville = \'Paris\';\nLina | Noa' },
          { do: 'dim', nodes: ['p2', 'v2', 'p4', 'v4'] }, { do: 'highlight', nodes: ['p1', 'v1', 'p3', 'v3'], color: 'amber' },
        ],
      },
      {
        title: 'COUNT : « combien ? »',
        text: {
          college: 'COUNT compte les lignes. Résultat : 2 élèves habitent à Paris.',
          lycee: 'Les fonctions d\'agrégation (COUNT, SUM, AVG, MAX) résument plusieurs lignes en une seule valeur.',
          but: 'Agrégation ; avec GROUP BY ville, on obtiendrait un comptage pour chaque ville en une seule requête.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ SELECT COUNT(*) FROM eleves\n      WHERE ville = \'Paris\';\n2' }, { do: 'text', node: 'result', text: 'résultat : 2', delay: 2.2 }, { do: 'pulse', node: 'result', color: 'amber' }],
      },
      {
        title: 'UPDATE : prudence !',
        text: {
          college: 'UPDATE modifie, DELETE supprime. Attention : sans WHERE, on modifierait TOUTES les lignes d\'un coup !',
          lycee: 'UPDATE et DELETE agissent sur toutes les lignes qui respectent le WHERE ; sans WHERE, sur la table entière.',
          but: 'Bon réflexe : tester le WHERE avec un SELECT, puis travailler dans une transaction (BEGIN … COMMIT ou ROLLBACK) pour pouvoir annuler.',
        },
        actions: [
          { do: 'undim', nodes: ['p2', 'v2', 'p4', 'v4'] },
          { do: 'type', node: 'term', text: '$ UPDATE eleves SET ville = \'Lyon\'\n      WHERE pseudo = \'Noa\';\n1 ligne modifiée' },
          { do: 'text', node: 'v3', text: 'Lyon', delay: 2.6 }, { do: 'highlight', node: 'v3', color: 'green', delay: 2.6 },
        ],
      },
    ],
    quiz: {
      question: 'Que fait une requête SELECT ?',
      options: ['Elle supprime des lignes', 'Elle affiche des données', 'Elle éteint le serveur'],
      correct: 1,
      explanation: 'SELECT lit les données demandées, sans rien modifier.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'db-bigdata',
    title: 'Le Big Data : quand un serveur ne suffit plus',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'iot', x: 80, y: 70, icon: 'signal', label: 'Capteurs' },
      { id: 'apps', x: 80, y: 180, icon: 'phone', label: 'Applis' },
      { id: 'cams', x: 80, y: 290, icon: 'camera', label: 'Vidéos' },
      { id: 'lake', x: 300, y: 180, icon: 'database', label: 'Data lake', size: 80, color: 'violet' },
      { id: 'n1', x: 520, y: 70, icon: 'server', label: 'Nœud 1' },
      { id: 'n2', x: 520, y: 180, icon: 'server', label: 'Nœud 2' },
      { id: 'n3', x: 520, y: 290, icon: 'server', label: 'Nœud 3' },
      { id: 'result', x: 720, y: 180, icon: 'chart', label: 'Résultat', color: 'amber' },
    ],
    links: [
      { from: 'iot', to: 'lake' }, { from: 'apps', to: 'lake' }, { from: 'cams', to: 'lake' },
      { from: 'lake', to: 'n1' }, { from: 'lake', to: 'n2' }, { from: 'lake', to: 'n3' },
      { from: 'n1', to: 'result' }, { from: 'n2', to: 'result' }, { from: 'n3', to: 'result' },
    ],
    steps: [
      {
        title: 'Volume, vitesse, variété',
        text: {
          college: 'Des millions de capteurs, d\'applis et de vidéos envoient des données sans arrêt, sous toutes les formes : c\'est le Big Data.',
          lycee: 'Les 3 V : Volume (énorme), Vélocité (en continu), Variété (texte, images, mesures…).',
          but: 'Ingestion de flux (Kafka) et de lots dans un data lake en stockage objet ; le schéma est appliqué à la lecture.',
        },
        actions: [
          { do: 'travel', path: ['iot', 'lake'], shape: 'dot', count: 4, gap: 0.2 },
          { do: 'travel', path: ['apps', 'lake'], shape: 'dot', count: 4, gap: 0.2, color: 'amber' },
          { do: 'travel', path: ['cams', 'lake'], shape: 'dot', count: 4, gap: 0.2, color: 'pink' },
        ],
      },
      {
        title: 'Trop pour un seul serveur',
        text: {
          college: 'C\'est beaucoup trop pour un seul ordinateur : il mettrait des mois à tout analyser.',
          lycee: 'Un seul serveur atteint vite ses limites de stockage et de calcul : on passe à l\'échelle « horizontalement ».',
          but: 'Au-delà des limites du scale-up, on choisit le scale-out sur un cluster de machines standard.',
        },
        actions: [{ do: 'shake', node: 'lake', color: 'red' }, { do: 'label', node: 'lake', text: '1 serveur = des mois de calcul', pos: 'bottom', offset: 80, color: 'red' }],
      },
      {
        title: 'On découpe le travail',
        text: {
          college: 'On découpe les données en morceaux et on les répartit sur plein de serveurs qui travaillent tous en même temps.',
          lycee: 'Le partitionnement (sharding) répartit les données : chaque nœud traite sa part en parallèle.',
          but: 'Partitionnement, réplication et traitement distribué (MapReduce, Spark) : « map » sur chaque partition, puis « reduce ».',
        },
        actions: [{ do: 'travel', path: ['lake', 'n1'], color: 'violet' }, { do: 'travel', path: ['lake', 'n2'], color: 'violet', delay: 0.2 }, { do: 'travel', path: ['lake', 'n3'], color: 'violet', delay: 0.4 }, { do: 'pulse', nodes: ['n1', 'n2', 'n3'] }],
      },
      {
        title: 'On rassemble les résultats',
        text: {
          college: 'Chaque serveur renvoie son petit résultat et on les rassemble : l\'analyse prend quelques minutes au lieu de plusieurs mois !',
          lycee: 'Les résultats partiels sont combinés : c\'est ainsi que les plateformes vidéo ou la météo analysent des quantités gigantesques de données.',
          but: 'Phase de réduction et d\'agrégation ; les bases NoSQL (Cassandra, MongoDB) acceptent parfois une cohérence différée pour rester disponibles (théorème CAP).',
        },
        actions: [{ do: 'travel', path: ['n1', 'result'], color: 'amber' }, { do: 'travel', path: ['n2', 'result'], color: 'amber', delay: 0.2 }, { do: 'travel', path: ['n3', 'result'], color: 'amber', delay: 0.4 }, { do: 'pulse', node: 'result', color: 'amber' }],
      },
    ],
    quiz: {
      question: 'Comment traite-t-on des données trop grosses pour un seul serveur ?',
      options: ['On les jette', 'On les répartit sur plusieurs serveurs qui travaillent en parallèle', 'On les imprime'],
      correct: 1,
      explanation: 'Le traitement distribué découpe le travail entre de nombreux serveurs qui calculent en même temps.',
    },
  },
];
