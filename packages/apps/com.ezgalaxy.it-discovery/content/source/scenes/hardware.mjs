// Scenes of the module « C'est quoi l'informatique ? »
export default [
  {
    lesson: 0, at: 1,
    id: 'hw-components',
    title: 'Que se passe-t-il quand tu lances un jeu ?',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'board', kind: 'zone', x: 30, y: 40, w: 600, h: 300, label: 'Carte mère' },
      { id: 'power', x: 120, y: 270, icon: 'power', label: 'Alimentation', color: 'green' },
      { id: 'ssd', x: 120, y: 140, icon: 'disk', label: 'SSD · armoire' },
      { id: 'ram', x: 330, y: 140, icon: 'ram', label: 'RAM · bureau' },
      { id: 'cpu', x: 540, y: 140, icon: 'cpu', label: 'CPU · cerveau', color: 'violet' },
      { id: 'gpu', x: 540, y: 270, icon: 'gpu', label: 'GPU', color: 'pink' },
      { id: 'screen', x: 720, y: 270, icon: 'screen', label: 'Écran' },
      { id: 'ramBar', kind: 'bar', x: 330, y: 72, w: 150, label: 'RAM utilisée', value: 0 },
      { id: 'ops', kind: 'text', x: 680, y: 72, text: '', fontSize: 14 },
    ],
    links: [
      { from: 'ssd', to: 'ram' }, { from: 'ram', to: 'cpu' }, { from: 'cpu', to: 'gpu' },
      { from: 'gpu', to: 'screen' }, { from: 'power', to: 'ssd', dashed: true }, { from: 'power', to: 'cpu', dashed: true, curve: 40 },
    ],
    steps: [
      {
        title: 'Tout commence par l\'énergie',
        text: {
          college: 'L\'alimentation transforme le courant de la prise en énergie pour chaque composant. La carte mère, comme un réseau de routes, relie tout le monde.',
          lycee: 'L\'alimentation (PSU) convertit le 230 V alternatif en tensions continues (12 V, 5 V, 3,3 V). La carte mère distribue l\'énergie et les données entre les composants.',
          but: 'Le PSU fournit les rails 12 V / 5 V / 3,3 V ; la carte mère porte le chipset, les lignes PCIe et les canaux mémoire qui interconnectent CPU, RAM, stockage et GPU.',
        },
        actions: [{ do: 'pulse', node: 'power', color: 'green' }, { do: 'flow', path: ['power', 'ssd'], color: 'green' }, { do: 'flow', from: 'power', to: 'cpu', curve: 40, color: 'green' }],
      },
      {
        title: 'Le jeu dort dans le SSD',
        text: {
          college: 'Ton jeu est rangé dans le SSD, l\'armoire de l\'ordinateur. Même quand l\'ordi est éteint, tout reste dedans.',
          lycee: 'Le SSD stocke durablement les fichiers du jeu (mémoire flash non volatile). Il est rapide, mais encore trop lent pour que le processeur y travaille directement.',
          but: 'Stockage non volatil NAND en NVMe (environ 3 à 7 Go/s). Avec une latence d\'environ 100 µs, il est bien trop lent pour un CPU qui raisonne en nanosecondes.',
        },
        actions: [{ do: 'highlight', node: 'ssd' }, { do: 'label', node: 'ssd', text: 'jeu · 50 Go', pos: 'top', offset: 62 }],
      },
      {
        title: 'Chargement dans la RAM',
        text: {
          college: 'Quand tu lances le jeu, il est copié du SSD vers la RAM, ton bureau de travail. Ce qui est posé sur le bureau est à portée de main.',
          lycee: 'Le système charge le programme et ses données en RAM (mémoire vive, volatile), des centaines de fois plus réactive que le SSD.',
          but: 'Le chargeur de l\'OS mappe l\'exécutable en mémoire virtuelle ; les pages arrivent en DRAM (latence d\'environ 80 ns, plusieurs dizaines de Go/s).',
        },
        actions: [{ do: 'travel', path: ['ssd', 'ram'], count: 3 }, { do: 'fill', node: 'ramBar', to: 65 }, { do: 'highlight', node: 'ram' }],
      },
      {
        title: 'Le processeur calcule',
        text: {
          college: 'Le processeur lit les instructions posées sur le bureau, fait les calculs et y range les résultats. Des milliards de fois par seconde !',
          lycee: 'Le CPU répète sans arrêt : lire une instruction, la décoder, l\'exécuter, écrire le résultat. À 3 GHz, cela fait 3 milliards de cycles par seconde.',
          but: 'Cycle fetch-decode-execute dans un pipeline, sur plusieurs cœurs ; les caches L1/L2/L3 évitent d\'attendre la DRAM à chaque accès.',
        },
        actions: [
          { do: 'travel', path: ['ram', 'cpu', 'ram'], count: 4, color: 'violet', duration: 1.6 },
          { do: 'pulse', node: 'cpu', color: 'violet' },
          { do: 'counter', node: 'ops', from: 0, to: 3000000000, suffix: ' calculs/s', duration: 2 },
        ],
      },
      {
        title: 'L\'image s\'affiche',
        text: {
          college: 'Le processeur dit à la carte graphique quoi dessiner. Le GPU fabrique l\'image et l\'envoie à l\'écran, 60 fois par seconde ou plus.',
          lycee: 'Le GPU possède des milliers de petits cœurs qui calculent les pixels en parallèle, puis il envoie chaque image à l\'écran par HDMI ou DisplayPort.',
          but: 'Le CPU soumet des commandes de rendu au GPU via PCIe ; le GPU exécute les shaders en parallèle et envoie le framebuffer à l\'écran (60 à 240 Hz).',
        },
        actions: [{ do: 'travel', path: ['cpu', 'gpu', 'screen'], count: 3, color: 'amber' }, { do: 'pulse', node: 'screen', color: 'amber' }],
      },
      {
        title: 'Et quand on éteint ?',
        text: {
          college: 'Quand tu éteins l\'ordi, la RAM se vide : le bureau est rangé. Ton jeu, lui, est toujours dans le SSD.',
          lycee: 'La RAM est volatile : sans courant, son contenu disparaît. C\'est pour ça qu\'il faut enregistrer sa partie sur le SSD.',
          but: 'La DRAM perd ses données sans rafraîchissement (quelques millisecondes). Seul le stockage non volatil (NAND, disque) conserve l\'état.',
        },
        actions: [
          { do: 'fill', node: 'ramBar', to: 0, color: 'red' },
          { do: 'text', node: 'ops', text: '' },
          { do: 'dim', nodes: ['ram', 'cpu', 'gpu', 'screen', 'power'] },
          { do: 'highlight', node: 'ssd', color: 'green' },
        ],
      },
    ],
    quiz: {
      question: 'Où le jeu est-il copié pour que le processeur puisse travailler vite ?',
      options: ['Dans le SSD', 'Dans la RAM', 'Dans l\'écran'],
      correct: 1,
      explanation: 'La RAM est la mémoire de travail : beaucoup plus rapide que le SSD, mais elle se vide quand on éteint.',
    },
  },
  {
    lesson: 1, at: 2,
    id: 'hw-os-conductor',
    title: 'Le système d\'exploitation, chef d\'orchestre',
    stage: { w: 800, h: 380 },
    nodes: [
      { id: 'music', x: 150, y: 60, icon: 'speaker', label: 'Musique' },
      { id: 'web', x: 400, y: 60, icon: 'globe', label: 'Navigateur' },
      { id: 'game', x: 650, y: 60, icon: 'rocket', label: 'Jeu' },
      { id: 'os', x: 400, y: 190, icon: 'gear', label: 'Système d\'exploitation', size: 76, color: 'violet' },
      { id: 'cpu', x: 150, y: 300, icon: 'cpu', label: 'Processeur' },
      { id: 'ram', x: 400, y: 300, icon: 'ram', label: 'Mémoire' },
      { id: 'disk', x: 650, y: 300, icon: 'disk', label: 'Disque' },
    ],
    links: [
      { from: 'music', to: 'os' }, { from: 'web', to: 'os' }, { from: 'game', to: 'os' },
      { from: 'os', to: 'cpu' }, { from: 'os', to: 'ram' }, { from: 'os', to: 'disk' },
    ],
    steps: [
      {
        title: 'Plein de programmes en même temps',
        text: {
          college: 'Tu écoutes de la musique, tu navigues et tu joues en même temps. Pourtant, il n\'y a qu\'un processeur et une mémoire à se partager !',
          lycee: 'Plusieurs applications tournent en même temps alors que les ressources matérielles (processeur, mémoire, disque) sont limitées.',
          but: 'Plusieurs processus concurrents se disputent des ressources limitées : il faut un arbitre, le noyau du système.',
        },
        actions: [{ do: 'pulse', nodes: ['music', 'web', 'game'] }],
      },
      {
        title: 'Tout le monde demande au chef',
        text: {
          college: 'Aucun programme ne touche directement le matériel : ils demandent tous la permission au système d\'exploitation.',
          lycee: 'Les applications passent par l\'OS grâce aux appels système : « ouvre ce fichier », « affiche ceci », « donne-moi de la mémoire ».',
          but: 'Les programmes, en mode utilisateur, font des appels système (syscalls) ; seul le noyau, en mode privilégié, accède au matériel.',
        },
        actions: [
          { do: 'travel', path: ['music', 'os'], shape: 'dot' },
          { do: 'travel', path: ['web', 'os'], shape: 'dot', delay: 0.3, color: 'amber' },
          { do: 'travel', path: ['game', 'os'], shape: 'dot', delay: 0.6, color: 'pink' },
          { do: 'highlight', node: 'os', color: 'violet' },
        ],
      },
      {
        title: 'Il partage le processeur',
        text: {
          college: 'L\'OS prête le processeur à chaque programme à tour de rôle, quelques millisecondes chacun. Ça va si vite que tout semble tourner en même temps !',
          lycee: 'L\'ordonnanceur découpe le temps du processeur en petites tranches et les attribue à tour de rôle à chaque programme.',
          but: 'L\'ordonnanceur préemptif alloue des quanta de quelques millisecondes ; à chaque changement de contexte, les registres du processus sont sauvegardés puis restaurés.',
        },
        actions: [
          { do: 'travel', path: ['os', 'cpu'], color: 'cyan', duration: 0.9, rest: 1.2 },
          { do: 'travel', path: ['os', 'cpu'], color: 'amber', duration: 0.9, rest: 1.2, delay: 0.7 },
          { do: 'travel', path: ['os', 'cpu'], color: 'pink', duration: 0.9, rest: 1.2, delay: 1.4 },
          { do: 'label', node: 'cpu', text: 'chacun son tour', pos: 'right', offset: 40 },
        ],
      },
      {
        title: 'Il range la mémoire',
        text: {
          college: 'Il donne aussi à chaque programme son coin à lui dans la mémoire, pour qu\'aucun ne marche sur les affaires des autres.',
          lycee: 'L\'OS attribue à chaque programme un espace mémoire séparé et protégé : si un programme plante, les autres continuent.',
          but: 'Mémoire virtuelle : chaque processus a son propre espace d\'adressage, traduit par la MMU grâce aux tables de pages ; un accès interdit provoque une erreur de segmentation.',
        },
        actions: [{ do: 'travel', path: ['os', 'ram'], count: 3, color: 'green' }, { do: 'label', node: 'ram', text: 'un espace par programme', pos: 'right', offset: 40 }],
      },
      {
        title: 'Il s\'occupe des fichiers',
        text: {
          college: 'Quand le navigateur enregistre une image, c\'est l\'OS qui l\'écrit au bon endroit sur le disque, puis la retrouve quand tu en as besoin.',
          lycee: 'Le système de fichiers (NTFS, ext4, APFS) organise le disque en dossiers et en fichiers ; l\'OS vérifie aussi qui a le droit de les lire.',
          but: 'Le VFS transmet les opérations au pilote du système de fichiers (ext4, NTFS…), qui gère blocs, inodes, journalisation et permissions.',
        },
        actions: [{ do: 'travel', path: ['web', 'os', 'disk'], color: 'amber' }, { do: 'pulse', node: 'disk', color: 'amber' }],
      },
    ],
    quiz: {
      question: 'Qui décide quel programme utilise le processeur à un instant donné ?',
      options: ['Le programme le plus rapide', 'Le système d\'exploitation', 'L\'écran'],
      correct: 1,
      explanation: 'C\'est l\'ordonnanceur de l\'OS qui distribue le temps du processeur à tour de rôle.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'hw-io',
    title: 'Entrées et sorties : le dialogue avec l\'ordinateur',
    stage: { w: 800, h: 380 },
    nodes: [
      { id: 'zin', kind: 'zone', x: 20, y: 10, w: 160, h: 360, label: 'ENTRÉES' },
      { id: 'zout', kind: 'zone', x: 620, y: 10, w: 160, h: 360, label: 'SORTIES' },
      { id: 'keyboard', x: 100, y: 80, icon: 'keyboard', label: 'Clavier' },
      { id: 'mouse', x: 100, y: 185, icon: 'mouse', label: 'Souris' },
      { id: 'mic', x: 100, y: 290, icon: 'mic', label: 'Micro' },
      { id: 'pc', x: 400, y: 150, icon: 'desktop', label: 'Ordinateur', size: 80, color: 'violet' },
      { id: 'screen', x: 700, y: 80, icon: 'screen', label: 'Écran' },
      { id: 'speaker', x: 700, y: 185, icon: 'speaker', label: 'Haut-parleur' },
      { id: 'printer', x: 700, y: 290, icon: 'printer', label: 'Imprimante' },
      { id: 'touch', x: 400, y: 300, icon: 'phone', label: 'Écran tactile', hidden: true, color: 'green' },
    ],
    links: [
      { from: 'keyboard', to: 'pc' }, { from: 'mouse', to: 'pc' }, { from: 'mic', to: 'pc' },
      { from: 'pc', to: 'screen' }, { from: 'pc', to: 'speaker' }, { from: 'pc', to: 'printer' },
      { from: 'touch', to: 'pc', hidden: true },
    ],
    steps: [
      {
        title: 'Les entrées : tu parles à l\'ordi',
        text: {
          college: 'Les périphériques d\'entrée envoient des informations À l\'ordinateur : une touche, un clic, ta voix.',
          lycee: 'Clavier, souris et micro transforment une action physique en signal numérique envoyé à l\'ordinateur.',
          but: 'Chaque périphérique d\'entrée produit des événements (scancodes, déplacements, échantillons audio) transmis en USB HID ou Bluetooth, puis traités par un pilote.',
        },
        actions: [
          { do: 'travel', path: ['keyboard', 'pc'], label: 'A' },
          { do: 'travel', path: ['mouse', 'pc'], delay: 0.4, label: 'clic' },
          { do: 'travel', path: ['mic', 'pc'], delay: 0.8, shape: 'dot' },
        ],
      },
      {
        title: 'L\'ordi réfléchit',
        text: {
          college: 'L\'ordinateur reçoit ces informations, les comprend et décide quoi faire.',
          lycee: 'Le pilote transmet l\'événement au système d\'exploitation, qui le passe à l\'application ouverte.',
          but: 'Interruption matérielle → pilote → file d\'événements de l\'OS → boucle d\'événements de l\'application.',
        },
        actions: [{ do: 'pulse', node: 'pc', color: 'violet' }, { do: 'label', node: 'pc', text: 'traitement…', pos: 'top', offset: 66, color: 'violet' }],
      },
      {
        title: 'Les sorties : l\'ordi te répond',
        text: {
          college: 'Les périphériques de sortie te renvoient le résultat : une image, un son, une feuille imprimée.',
          lycee: 'Écran, haut-parleurs et imprimante transforment des données numériques en lumière, en son ou en encre.',
          but: 'Sorties : framebuffer vers signal HDMI/DisplayPort, flux audio PCM vers le convertisseur numérique-analogique, travail d\'impression en PCL ou PostScript.',
        },
        actions: [
          { do: 'travel', path: ['pc', 'screen'], color: 'amber' },
          { do: 'travel', path: ['pc', 'speaker'], color: 'amber', delay: 0.4, shape: 'dot' },
          { do: 'travel', path: ['pc', 'printer'], color: 'amber', delay: 0.8, shape: 'mail' },
        ],
      },
      {
        title: 'Certains font les deux',
        text: {
          college: 'Un écran tactile fait les deux à la fois : il affiche l\'image (sortie) et sent ton doigt (entrée) !',
          lycee: 'Périphériques mixtes : écran tactile, casque avec micro, clé USB qu\'on lit et sur laquelle on écrit.',
          but: 'Un écran tactile combine une dalle d\'affichage (sortie) et un capteur capacitif (entrée HID) ; une clé USB est un périphérique de stockage en lecture et écriture.',
        },
        actions: [
          { do: 'show', nodes: ['touch'], links: [6] },
          { do: 'travel', path: ['touch', 'pc'], color: 'cyan' },
          { do: 'travel', path: ['pc', 'touch'], color: 'amber', delay: 0.9 },
        ],
      },
    ],
    quiz: {
      question: 'Un micro est un périphérique…',
      options: ['d\'entrée', 'de sortie', 'de stockage'],
      correct: 0,
      explanation: 'Il envoie ta voix vers l\'ordinateur : c\'est une entrée.',
    },
  },
];
