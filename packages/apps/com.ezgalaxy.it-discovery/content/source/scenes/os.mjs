// Scenes of the module « Systèmes d'exploitation »
export default [
  {
    lesson: 0, at: 1,
    id: 'os-timeline',
    title: 'Soixante-dix ans de systèmes d\'exploitation',
    stage: { w: 800, h: 320 },
    nodes: [
      { id: 'card', x: 60, y: 160, icon: 'file', label: '1956', sub: 'cartes perforées', size: 56 },
      { id: 'unix', x: 175, y: 160, icon: 'terminal', label: '1969', sub: 'Unix', size: 56, hidden: true },
      { id: 'dos', x: 290, y: 160, icon: 'desktop', label: '1981', sub: 'MS-DOS', size: 56, hidden: true },
      { id: 'gui', x: 405, y: 160, icon: 'mouse', label: '1984', sub: 'Macintosh', size: 56, hidden: true },
      { id: 'linux', x: 520, y: 160, icon: 'code', label: '1991', sub: 'Linux', size: 56, hidden: true, color: 'amber' },
      { id: 'win', x: 635, y: 160, icon: 'screen', label: '1995', sub: 'Windows 95', size: 56, hidden: true },
      { id: 'mobile', x: 745, y: 160, icon: 'phone', label: '2007', sub: 'iPhone, Android', size: 56, hidden: true, color: 'green' },
    ],
    links: [
      { from: 'card', to: 'unix', hidden: true }, { from: 'unix', to: 'dos', hidden: true }, { from: 'dos', to: 'gui', hidden: true },
      { from: 'gui', to: 'linux', hidden: true }, { from: 'linux', to: 'win', hidden: true }, { from: 'win', to: 'mobile', hidden: true },
    ],
    steps: [
      {
        title: 'Les débuts : 1956',
        text: {
          college: 'Dans les années 1950, un ordinateur remplissait une pièce entière. On lui donnait les programmes sur des cartes perforées, et un premier « système » les enchaînait.',
          lycee: 'Les premiers OS, comme GM-NAA I/O en 1956, enchaînaient automatiquement les programmes chargés par cartes perforées : c\'est le traitement par lots.',
          but: 'Moniteurs de traitement par lots : enchaînement automatique des travaux, sans interactivité ni multitâche.',
        },
        actions: [{ do: 'pulse', node: 'card' }],
      },
      {
        title: 'Unix : 1969',
        text: {
          college: 'En 1969, des chercheurs inventent Unix : plusieurs personnes peuvent utiliser le même ordinateur en même temps, en tapant des commandes.',
          lycee: 'Unix (laboratoires Bell) apporte le multi-utilisateur, le multitâche et l\'idée que « tout est fichier ». Écrit en langage C, il peut tourner sur différentes machines.',
          but: 'Unix : noyau écrit en C, système de fichiers hiérarchique, tubes (pipes) ; ses principes sont repris par la norme POSIX.',
        },
        actions: [{ do: 'show', nodes: ['unix'], links: [0] }, { do: 'travel', path: ['card', 'unix'], once: true }, { do: 'pulse', node: 'unix' }],
      },
      {
        title: 'L\'ordinateur arrive à la maison',
        text: {
          college: 'Les ordinateurs arrivent à la maison ! D\'abord avec des commandes à taper (MS-DOS, 1981), puis avec une souris et des fenêtres (Macintosh, 1984).',
          lycee: 'MS-DOS équipe les PC d\'IBM dès 1981 ; Apple rend célèbre l\'interface graphique (fenêtres, icônes, souris) avec le Macintosh en 1984.',
          but: 'MS-DOS : monotâche, sans protection mémoire ; le Macintosh démocratise l\'interface graphique imaginée au Xerox PARC.',
        },
        actions: [{ do: 'show', nodes: ['dos', 'gui'], links: [1, 2] }, { do: 'travel', path: ['unix', 'dos', 'gui'], once: true, duration: 1.8 }, { do: 'pulse', node: 'gui' }],
      },
      {
        title: 'Linux et Windows : 1991-1995',
        text: {
          college: 'En 1991, un étudiant finlandais, Linus Torvalds, crée Linux, gratuit et ouvert à tous. En 1995, Windows 95 conquiert les PC du monde entier.',
          lycee: 'Linux, un noyau libre inspiré d\'Unix, est amélioré par des milliers de bénévoles. Windows 95 popularise le menu Démarrer et la barre des tâches.',
          but: 'Linux, sous licence GPL, devient la base des distributions GNU/Linux ; Windows 95 apporte au grand public le multitâche préemptif 32 bits.',
        },
        actions: [{ do: 'show', nodes: ['linux', 'win'], links: [3, 4] }, { do: 'travel', path: ['gui', 'linux', 'win'], once: true, duration: 1.8 }, { do: 'pulse', nodes: ['linux', 'win'] }],
      },
      {
        title: 'Dans ta poche : 2007',
        text: {
          college: 'En 2007 arrive l\'iPhone, puis le premier téléphone Android en 2008 : les systèmes d\'exploitation tiennent maintenant dans ta poche !',
          lycee: 'iOS, dérivé de macOS, et Android, basé sur le noyau Linux, équipent aujourd\'hui presque tous les smartphones.',
          but: 'iOS repose sur le noyau XNU (Darwin), Android sur un noyau Linux et l\'environnement d\'exécution ART pour les applis Java et Kotlin.',
        },
        actions: [{ do: 'show', nodes: ['mobile'], links: [5] }, { do: 'travel', path: ['win', 'mobile'], once: true }, { do: 'pulse', node: 'mobile', color: 'green' }],
      },
    ],
    quiz: {
      question: 'Quel système, né en 1969, a inspiré Linux et macOS ?',
      options: ['MS-DOS', 'Unix', 'Windows 95'],
      correct: 1,
      explanation: 'Unix a posé les bases que reprennent macOS (qui en descend) et Linux (qui s\'en inspire).',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'os-layers',
    title: 'Le trajet d\'une demande dans les couches de l\'OS',
    stage: { w: 800, h: 380 },
    nodes: [
      { id: 'apps', kind: 'cell', x: 330, y: 35, w: 380, h: 44, text: 'Applications (navigateur, jeux…)', color: 'cyan' },
      { id: 'sys', kind: 'cell', x: 330, y: 100, w: 380, h: 44, text: 'Appels système', color: 'amber' },
      { id: 'kernel', kind: 'cell', x: 330, y: 165, w: 380, h: 50, text: 'Noyau (kernel)', fontSize: 16, color: 'violet' },
      { id: 'drivers', kind: 'cell', x: 330, y: 233, w: 380, h: 44, text: 'Pilotes (drivers)', color: 'green' },
      { id: 'hw', kind: 'cell', x: 330, y: 300, w: 380, h: 44, text: 'Matériel : disque, écran, réseau…', color: 'slate' },
      { id: 'photo', x: 660, y: 300, icon: 'file', label: 'photo.jpg', size: 52, color: 'pink' },
    ],
    links: [],
    steps: [
      {
        title: 'Tu veux ouvrir une photo',
        text: {
          college: 'Tu veux ouvrir une photo dans une appli. Mais l\'appli n\'a pas le droit d\'aller la chercher elle-même sur le disque.',
          lycee: 'Les applications tournent dans l\'espace utilisateur, sans accès direct au matériel.',
          but: 'Espace utilisateur (anneau 3) : pas d\'instruction privilégiée, aucun accès direct aux périphériques ni à la mémoire physique.',
        },
        actions: [{ do: 'highlight', node: 'apps' }, { do: 'pulse', node: 'photo', color: 'pink' }],
      },
      {
        title: 'Elle frappe à la porte du noyau',
        text: {
          college: 'Elle passe par une porte spéciale : un appel système. C\'est comme demander au guichet au lieu d\'entrer dans les coulisses.',
          lycee: 'L\'application fait un appel système (open, read) : c\'est la seule façon de demander un service au noyau.',
          but: 'L\'instruction syscall bascule en mode noyau ; les arguments sont vérifiés avant d\'entrer dans le gestionnaire d\'appels système.',
        },
        actions: [{ do: 'travel', path: ['apps', 'sys'], color: 'amber' }, { do: 'highlight', node: 'sys', color: 'amber' }, { do: 'label', node: 'sys', text: 'open("photo.jpg")', pos: 'right', offset: 250, color: 'amber' }],
      },
      {
        title: 'Le noyau décide',
        text: {
          college: 'Le noyau, le chef du système, vérifie que l\'appli a le droit de lire la photo, puis organise le travail.',
          lycee: 'Le noyau contrôle les permissions, puis gère les processus, la mémoire et les fichiers.',
          but: 'Contrôle d\'accès (droits Unix, ACL), résolution du chemin par le VFS, réservation de tampons dans le cache de pages.',
        },
        actions: [{ do: 'travel', path: ['sys', 'kernel'], color: 'violet' }, { do: 'pulse', node: 'kernel', color: 'violet' }],
      },
      {
        title: 'Les pilotes parlent au matériel',
        text: {
          college: 'Le pilote traduit la demande dans la langue du disque, qui lit la photo.',
          lycee: 'Chaque pilote sait commander un matériel précis : disque, carte graphique, puce Wi-Fi…',
          but: 'Le pilote programme le contrôleur (NVMe) par ses registres et le DMA, puis attend l\'interruption de fin d\'opération.',
        },
        actions: [{ do: 'travel', path: ['kernel', 'drivers', 'hw'], color: 'green' }, { do: 'highlight', node: 'photo', color: 'green' }],
      },
      {
        title: 'Et la photo remonte',
        text: {
          college: 'La photo remonte toutes les couches jusqu\'à l\'appli, qui l\'affiche. Tout ça en une fraction de seconde !',
          lycee: 'Les données remontent couche par couche ; chaque couche ne parle qu\'à ses voisines, ce qui rend le système solide.',
          but: 'Retour de l\'appel système avec les données copiées en espace utilisateur ; l\'isolation protège le noyau des erreurs des applications.',
        },
        actions: [{ do: 'travel', path: ['hw', 'drivers', 'kernel', 'sys', 'apps'], color: 'pink', count: 3, duration: 2.2 }, { do: 'highlight', node: 'apps', color: 'pink' }],
      },
    ],
    quiz: {
      question: 'Par où une application passe-t-elle pour lire un fichier sur le disque ?',
      options: ['Elle lit le disque directement', 'Par un appel système au noyau', 'Par l\'écran'],
      correct: 1,
      explanation: 'Les applications demandent au noyau grâce aux appels système ; seul le noyau parle au matériel.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'os-terminal',
    title: 'Piloter l\'ordinateur avec le terminal',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'term', kind: 'terminal', x: 20, y: 30, w: 390, h: 300, title: 'neo@pc : ~' },
      { id: 'home', x: 600, y: 70, icon: 'folder', label: '/home/neo', size: 56 },
      { id: 'docs', x: 510, y: 195, icon: 'folder', label: 'Documents', size: 56 },
      { id: 'projet', x: 700, y: 195, icon: 'folder', label: 'projet', size: 56, hidden: true, color: 'green' },
      { id: 'hello', x: 510, y: 305, icon: 'file', label: 'hello.txt', size: 50, color: 'amber' },
    ],
    links: [{ from: 'home', to: 'docs' }, { from: 'home', to: 'projet', hidden: true }, { from: 'docs', to: 'hello' }],
    steps: [
      {
        title: 'Où suis-je ?',
        text: {
          college: 'Dans le terminal, on tape des commandes au lieu de cliquer. « pwd » affiche le dossier dans lequel tu te trouves.',
          lycee: '« pwd » (print working directory) affiche le chemin complet du dossier courant.',
          but: 'pwd renvoie le répertoire de travail du shell, hérité par chaque processus qu\'il lance.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ pwd\n/home/neo' }, { do: 'highlight', node: 'home' }],
      },
      {
        title: 'Qu\'y a-t-il ici ?',
        text: {
          college: '« ls » liste ce qu\'il y a dans le dossier, comme quand tu ouvres une fenêtre de l\'explorateur de fichiers.',
          lycee: '« ls » liste le contenu du dossier ; « ls -l » ajoute la taille, la date et les droits de chaque fichier.',
          but: 'ls lit les entrées du répertoire ; l\'option -l affiche les métadonnées de l\'inode (droits, propriétaire, taille, date).',
        },
        actions: [{ do: 'type', node: 'term', text: '$ ls\nDocuments' }, { do: 'highlight', node: 'docs' }],
      },
      {
        title: 'Créer un dossier',
        text: {
          college: '« mkdir » crée un nouveau dossier. Regarde : « projet » apparaît tout de suite !',
          lycee: '« mkdir projet » crée un dossier dans le répertoire courant ; « mkdir -p » crée aussi les dossiers parents.',
          but: 'mkdir crée une entrée de répertoire avec les droits par défaut, calculés à partir du umask.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ mkdir projet' }, { do: 'show', nodes: ['projet'], links: [1], delay: 1 }, { do: 'pulse', node: 'projet', color: 'green', delay: 1 }],
      },
      {
        title: 'Entrer et lire',
        text: {
          college: '« cd » te fait entrer dans un dossier, « cat » affiche ce qu\'il y a dans un fichier.',
          lycee: '« cd Documents » change le dossier courant ; « cat hello.txt » affiche le contenu du fichier.',
          but: 'cd est une commande interne du shell (elle change son propre répertoire) ; cat écrit le fichier sur la sortie standard.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ cd Documents\n$ cat hello.txt\nBonjour !' }, { do: 'travel', path: ['home', 'docs', 'hello'], once: true, duration: 1.6 }, { do: 'highlight', node: 'hello', color: 'amber' }],
      },
      {
        title: 'Attention aux commandes puissantes',
        text: {
          college: '« rm » supprime un fichier pour de bon : il n\'y a pas de corbeille ! Dans le terminal, on réfléchit avant d\'appuyer sur Entrée.',
          lycee: '« rm » supprime définitivement ; avec « sudo », une commande obtient les droits d\'administrateur : prudence !',
          but: 'rm supprime le lien vers l\'inode, sans corbeille ; sudo exécute la commande en root, sans aucun garde-fou.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ rm hello.txt' }, { do: 'shake', node: 'hello', color: 'red' }, { do: 'hide', nodes: ['hello'], delay: 1.4 }],
      },
    ],
    quiz: {
      question: 'Quelle commande crée un nouveau dossier ?',
      options: ['ls', 'mkdir', 'rm'],
      correct: 1,
      explanation: '« mkdir » (make directory) crée un dossier ; « ls » liste, « rm » supprime.',
    },
  },
  {
    lesson: 3, at: 1,
    id: 'os-compare',
    title: 'Windows, macOS, Linux : chacun son terrain',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'scenario', kind: 'chip', x: 400, y: 45, text: 'Trois grands systèmes', fontSize: 16, color: 'cyan' },
      { id: 'win', x: 150, y: 170, icon: 'desktop', label: 'Windows', size: 72 },
      { id: 'mac', x: 400, y: 170, icon: 'laptop', label: 'macOS', size: 72 },
      { id: 'lin', x: 650, y: 170, icon: 'terminal', label: 'Linux', size: 72 },
      { id: 'bw', kind: 'bar', x: 150, y: 300, w: 170, label: 'PC de bureau', hideValue: true },
      { id: 'bm', kind: 'bar', x: 400, y: 300, w: 170, label: 'PC de bureau', hideValue: true },
      { id: 'bl', kind: 'bar', x: 650, y: 300, w: 170, label: 'PC de bureau', hideValue: true },
    ],
    links: [],
    steps: [
      {
        title: 'Trois grands systèmes',
        text: {
          college: 'Sur les ordinateurs, trois systèmes dominent : Windows, macOS et Linux. Aucun n\'est « le meilleur » : tout dépend de ce que tu veux faire.',
          lycee: 'Chaque système a ses points forts : compatibilité, intégration, liberté. Le bon choix dépend de l\'usage.',
          but: 'Les critères de choix : écosystème logiciel, matériel visé, coût de licence, administration et sécurité.',
        },
        actions: [{ do: 'pulse', nodes: ['win', 'mac', 'lin'] }],
      },
      {
        title: 'Pour jouer',
        text: {
          college: 'La plupart des jeux PC sortent sur Windows, qui marche avec presque tous les ordinateurs et accessoires.',
          lycee: 'Windows profite de DirectX et du plus grand catalogue de jeux et de logiciels.',
          but: 'Écosystème DirectX et Win32, compatibilité matérielle maximale grâce aux pilotes des fabricants.',
        },
        actions: [{ do: 'text', node: 'scenario', text: 'Jouer aux jeux PC' }, { do: 'highlight', node: 'win' }, { do: 'dim', nodes: ['mac', 'lin'] }],
      },
      {
        title: 'Pour créer',
        text: {
          college: 'Les Mac sont très appréciés pour la vidéo, la photo et la musique, et ils marchent main dans la main avec l\'iPhone.',
          lycee: 'macOS est réputé pour la création (Final Cut Pro, Logic Pro) et son intégration avec iPhone et iPad.',
          but: 'macOS (noyau XNU, base Unix certifiée) maîtrise matériel et logiciel ; puces Apple Silicon très efficaces pour l\'encodage vidéo.',
        },
        actions: [{ do: 'undim', nodes: ['mac', 'lin'] }, { do: 'text', node: 'scenario', text: 'Monter une vidéo, faire de la musique' }, { do: 'highlight', node: 'mac', color: 'pink' }, { do: 'dim', nodes: ['win', 'lin'] }],
      },
      {
        title: 'Pour les serveurs',
        text: {
          college: 'Linux est gratuit et libre : n\'importe qui peut le modifier. C\'est lui qui fait tourner la plupart des serveurs d\'Internet.',
          lycee: 'Linux, gratuit et open source, domine les serveurs, le cloud et les supercalculateurs, avec des centaines de distributions.',
          but: 'Distributions (Debian, Ubuntu, RHEL…), gestion par paquets et automatisation : le standard des serveurs et du cloud.',
        },
        actions: [{ do: 'undim', nodes: ['win', 'lin'] }, { do: 'text', node: 'scenario', text: 'Faire tourner des sites web' }, { do: 'highlight', node: 'lin', color: 'amber' }, { do: 'dim', nodes: ['win', 'mac'] }],
      },
      {
        title: 'Sur les PC de bureau',
        text: {
          college: 'Sur les ordinateurs de bureau, Windows est de loin le plus répandu, devant macOS puis Linux. Mais sur les serveurs, c\'est Linux qui gagne !',
          lycee: 'Sur les PC de bureau, Windows équipe environ 7 machines sur 10 ; macOS vient ensuite et Linux reste minoritaire.',
          but: 'Parts de marché bureau (ordre de grandeur) : Windows ≈ 70 %, macOS ≈ 15 %, Linux ≈ 4 %. La situation s\'inverse sur les serveurs.',
        },
        actions: [
          { do: 'undim', nodes: ['win', 'mac'] }, { do: 'text', node: 'scenario', text: 'Part des PC de bureau (ordre de grandeur)' },
          { do: 'fill', node: 'bw', to: 70, color: 'cyan', duration: 1.5 }, { do: 'fill', node: 'bm', to: 15, color: 'pink', duration: 1.5 }, { do: 'fill', node: 'bl', to: 4, color: 'amber', duration: 1.5 },
        ],
      },
    ],
    quiz: {
      question: 'Quel système fait tourner la majorité des serveurs web ?',
      options: ['Windows', 'macOS', 'Linux'],
      correct: 2,
      explanation: 'Linux, gratuit, libre et robuste, est le système le plus utilisé sur les serveurs.',
    },
  },
];
