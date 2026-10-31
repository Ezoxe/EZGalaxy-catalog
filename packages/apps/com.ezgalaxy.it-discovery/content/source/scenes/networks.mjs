// Scenes of the module « Les Réseaux & Internet »
export default [
  {
    lesson: 0, at: 1,
    id: 'net-lan-wan',
    title: 'De ta maison jusqu\'à Internet',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'home', kind: 'zone', x: 15, y: 20, w: 345, h: 320, label: 'Ta maison · réseau local (LAN)' },
      { id: 'wan', kind: 'zone', x: 380, y: 20, w: 405, h: 320, label: 'Internet (WAN)' },
      { id: 'pc', x: 90, y: 110, icon: 'laptop', label: 'PC' },
      { id: 'console', x: 90, y: 260, icon: 'play', label: 'Console' },
      { id: 'phone', x: 200, y: 185, icon: 'phone', label: 'Téléphone' },
      { id: 'box', x: 305, y: 185, icon: 'router', label: 'Box', color: 'violet' },
      { id: 'isp', x: 460, y: 185, icon: 'router', label: 'Opérateur' },
      { id: 'core', x: 600, y: 105, icon: 'globe', label: 'Routeurs' },
      { id: 'server', x: 715, y: 255, icon: 'server', label: 'Serveur du jeu' },
    ],
    links: [
      { from: 'pc', to: 'box' }, { from: 'console', to: 'box' }, { from: 'phone', to: 'box', dashed: true },
      { from: 'box', to: 'isp' }, { from: 'isp', to: 'core' }, { from: 'core', to: 'server' },
    ],
    steps: [
      {
        title: 'Un réseau local',
        text: {
          college: 'Chez toi, le PC, le téléphone et la console sont reliés à la box, par câble ou par Wi-Fi. Ensemble, ils forment un réseau local.',
          lycee: 'Le réseau local (LAN) relie les appareils d\'un même lieu. La box donne à chacun une adresse IP privée, par exemple 192.168.1.12.',
          but: 'LAN Ethernet et Wi-Fi ; la box joue le rôle de serveur DHCP et attribue des adresses privées (RFC 1918) dans 192.168.1.0/24.',
        },
        actions: [
          { do: 'flow', path: ['pc', 'box'] }, { do: 'flow', path: ['console', 'box'] }, { do: 'flow', path: ['phone', 'box'] },
          { do: 'label', node: 'pc', text: '192.168.1.12', pos: 'top', offset: 56 },
        ],
      },
      {
        title: 'Les appareils se parlent',
        text: {
          college: 'Les appareils peuvent s\'échanger des données entre eux sans passer par Internet, par exemple pour jouer en réseau local.',
          lycee: 'Dans le LAN, les données passent par le switch intégré à la box, qui les envoie au bon appareil grâce à son adresse MAC.',
          but: 'Commutation de niveau 2 : le switch apprend sur quel port se trouve chaque adresse MAC et ne transmet la trame qu\'au destinataire.',
        },
        actions: [{ do: 'travel', path: ['pc', 'box', 'console'], count: 2 }],
      },
      {
        title: 'La box ouvre la porte',
        text: {
          college: 'Pour aller sur Internet, tout passe par la box : c\'est la porte entre ta maison et le reste du monde.',
          lycee: 'La box relie le LAN au WAN. Vu de l\'extérieur, toute la maison partage une seule adresse IP publique.',
          but: 'Routage vers la passerelle par défaut puis NAT/PAT : la box remplace l\'IP source privée par son IP publique et mémorise la correspondance des ports.',
        },
        actions: [
          { do: 'travel', path: ['console', 'box', 'isp', 'core', 'server'], count: 2 },
          { do: 'label', node: 'box', text: 'IP publique : 82.64.x.x', pos: 'top', offset: 60, color: 'violet' },
        ],
      },
      {
        title: 'Internet, le réseau des réseaux',
        text: {
          college: 'Internet, ce sont des millions de réseaux reliés entre eux par des routeurs et des câbles, jusqu\'au fond des océans ! La réponse du serveur refait le chemin dans l\'autre sens.',
          lycee: 'Les opérateurs relient leurs réseaux entre eux ; des câbles sous-marins en fibre optique relient les continents.',
          but: 'Internet interconnecte des systèmes autonomes (AS) qui échangent leurs routes avec BGP, dans des points d\'échange (IXP) et par câbles sous-marins.',
        },
        actions: [
          { do: 'flow', path: ['box', 'isp', 'core', 'server'], color: 'amber', reverse: true },
          { do: 'travel', path: ['server', 'core', 'isp', 'box', 'console'], color: 'amber', count: 3 },
          { do: 'pulse', node: 'core' },
        ],
      },
    ],
    quiz: {
      question: 'Quel appareil relie ton réseau local à Internet ?',
      options: ['La box (routeur)', 'L\'imprimante', 'La souris'],
      correct: 0,
      explanation: 'La box est un routeur : elle fait le lien entre ton réseau local et celui de ton opérateur.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'net-web-journey',
    title: 'Comment une page web arrive jusqu\'à toi ?',
    stage: { w: 800, h: 340 },
    nodes: [
      { id: 'pc', x: 80, y: 220, icon: 'laptop', label: 'Ton ordi', color: 'cyan' },
      { id: 'box', x: 240, y: 220, icon: 'router', label: 'Ta box' },
      { id: 'isp', x: 400, y: 220, icon: 'router', label: 'Routeur FAI' },
      { id: 'core', x: 560, y: 220, icon: 'globe', label: 'Internet' },
      { id: 'server', x: 720, y: 220, icon: 'server', label: 'Serveur' },
      { id: 'dns', x: 400, y: 70, icon: 'book', label: 'DNS (l\'annuaire)' },
      { id: 'url', kind: 'chip', x: 90, y: 120, text: 'monsite.fr', color: 'cyan' },
    ],
    links: [
      { from: 'pc', to: 'box' }, { from: 'box', to: 'isp' }, { from: 'isp', to: 'core' },
      { from: 'core', to: 'server' }, { from: 'pc', to: 'dns', dashed: true },
    ],
    steps: [
      {
        title: 'Tu tapes l\'adresse',
        text: {
          college: 'Tu tapes « monsite.fr » dans ton navigateur. Ton ordi prépare un petit message : « Envoie-moi la page, s\'il te plaît ! »',
          lycee: 'Le navigateur analyse l\'URL : protocole HTTPS, nom de domaine monsite.fr, chemin /. Il prépare une requête HTTP GET.',
          but: 'Analyse de l\'URL, puis ouverture d\'une connexion TCP (SYN, SYN-ACK, ACK) et négociation TLS 1.3 avant d\'envoyer la requête GET.',
        },
        actions: [{ do: 'pulse', node: 'pc' }, { do: 'pulse', node: 'url' }],
      },
      {
        title: 'L\'annuaire DNS',
        text: {
          college: 'Ton ordi ne connaît pas le « numéro » de monsite.fr. Il le demande à l\'annuaire d\'Internet, le DNS, qui lui répond : 185.31.40.12.',
          lycee: 'Résolution DNS : le résolveur interroge les serveurs DNS et obtient l\'adresse IP associée au nom de domaine.',
          but: 'Requête DNS récursive (UDP 53) : cache local, résolveur du FAI, serveurs racine, TLD .fr, puis serveur faisant autorité qui renvoie l\'enregistrement A.',
        },
        actions: [
          { do: 'travel', path: ['pc', 'dns', 'pc'], duration: 2.4 },
          { do: 'flow', from: 'pc', to: 'dns' },
          { do: 'label', node: 'dns', text: 'monsite.fr → 185.31.40.12', pos: 'right', offset: 48 },
        ],
      },
      {
        title: 'Direction la box',
        text: {
          college: 'Le message est découpé en petits paquets qui partent vers ta box. La box, c\'est la porte entre ta maison et Internet.',
          lycee: 'La requête est découpée en paquets TCP/IP. Chaque paquet porte l\'IP source, l\'IP de destination et un numéro d\'ordre.',
          but: 'Encapsulation : HTTP dans TCP (segment), dans IP (paquet), dans Wi-Fi ou Ethernet (trame). La box fait ensuite du NAT vers son IP publique.',
        },
        actions: [{ do: 'travel', path: ['pc', 'box'], count: 3 }, { do: 'flow', from: 'pc', to: 'box' }],
      },
      {
        title: 'Le grand voyage',
        text: {
          college: 'Les paquets sautent de routeur en routeur, comme une lettre qui passe de bureau de poste en bureau de poste, jusqu\'au serveur.',
          lycee: 'Chaque routeur lit l\'IP de destination et choisit le meilleur chemin. Deux paquets peuvent prendre des routes différentes.',
          but: 'Routage saut par saut : chaque routeur consulte sa table de routage (BGP entre opérateurs) et décrémente le TTL du paquet.',
        },
        actions: [{ do: 'travel', path: ['box', 'isp', 'core', 'server'], count: 2 }, { do: 'flow', path: ['box', 'isp', 'core', 'server'] }, { do: 'pulse', node: 'server' }],
      },
      {
        title: 'La réponse revient',
        text: {
          college: 'Le serveur renvoie la page, elle aussi en paquets. Ton navigateur les remet dans l\'ordre et l\'affiche : voilà ta page !',
          lycee: 'Le serveur répond « 200 OK » avec le HTML. TCP vérifie qu\'il ne manque rien et remet les paquets dans l\'ordre.',
          but: 'Réponse HTTP 200, contrôle de flux et retransmissions TCP en cas de perte, puis rendu par le navigateur : DOM, CSS, JavaScript.',
        },
        actions: [
          { do: 'travel', path: ['server', 'core', 'isp', 'box', 'pc'], count: 3, color: 'amber' },
          { do: 'flow', path: ['server', 'core', 'isp', 'box', 'pc'], color: 'amber' },
          { do: 'label', node: 'server', text: '200 OK · index.html', pos: 'top', offset: 62, color: 'amber' },
        ],
      },
    ],
    quiz: {
      question: 'Qui traduit « monsite.fr » en adresse IP ?',
      options: ['La box', 'Le DNS', 'Le serveur du site'],
      correct: 1,
      explanation: 'Le DNS est l\'annuaire d\'Internet : il associe les noms de domaine aux adresses IP.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'net-wifi-cloud',
    title: 'Le Wi-Fi, puis le Cloud',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'box', x: 110, y: 190, icon: 'router', label: 'Box Wi-Fi', color: 'violet' },
      { id: 'near', x: 320, y: 110, icon: 'phone', label: 'Près de la box' },
      { id: 'far', x: 470, y: 300, icon: 'laptop', label: 'Loin, derrière un mur' },
      { id: 'barNear', kind: 'bar', x: 320, y: 40, w: 120, label: 'Signal', value: 0 },
      { id: 'barFar', kind: 'bar', x: 470, y: 232, w: 120, label: 'Signal', value: 0 },
      { id: 'cloud', x: 690, y: 90, icon: 'cloud', label: 'Le « Cloud »' },
      { id: 'dc', x: 690, y: 260, icon: 'server', label: 'Data center' },
    ],
    links: [
      { from: 'box', to: 'near', dashed: true }, { from: 'box', to: 'far', dashed: true },
      { from: 'box', to: 'cloud', curve: -50 }, { from: 'cloud', to: 'dc' },
    ],
    steps: [
      {
        title: 'Des ondes radio',
        text: {
          college: 'La box envoie des ondes radio, comme une enceinte envoie du son. Plus tu t\'éloignes, plus le signal faiblit, surtout à travers les murs.',
          lycee: 'Le Wi-Fi utilise des ondes radio (2,4 GHz, 5 GHz ou 6 GHz). Le signal s\'affaiblit avec la distance et les obstacles.',
          but: 'Le signal 802.11 s\'atténue avec le carré de la distance et à chaque obstacle ; le débit dépend du rapport signal/bruit (modulation adaptative).',
        },
        actions: [
          { do: 'pulse', node: 'box', color: 'violet' },
          { do: 'flow', from: 'box', to: 'near', color: 'green' }, { do: 'flow', from: 'box', to: 'far', color: 'amber' },
          { do: 'fill', node: 'barNear', to: 90, color: 'green' }, { do: 'fill', node: 'barFar', to: 35, color: 'amber' },
        ],
      },
      {
        title: '2,4 GHz ou 5 GHz ?',
        text: {
          college: 'Le 2,4 GHz va plus loin et traverse mieux les murs. Le 5 GHz est plus rapide mais porte moins loin. Le 6 GHz, le plus récent, est encore plus rapide.',
          lycee: 'Fréquence basse = meilleure portée ; fréquence haute = plus de débit mais portée réduite. Le Wi-Fi 6E ajoute la bande 6 GHz.',
          but: 'Les bandes hautes offrent des canaux plus larges (80 à 160 MHz), donc plus de débit, mais traversent moins bien les obstacles.',
        },
        actions: [
          { do: 'label', node: 'near', text: '5 GHz : rapide', pos: 'right', offset: 44, color: 'green' },
          { do: 'label', node: 'far', text: '2,4 GHz : va plus loin', pos: 'left', offset: 44, color: 'amber' },
        ],
      },
      {
        title: 'Ta photo part dans le Cloud',
        text: {
          college: 'Quand tu sauvegardes une photo « dans le Cloud », elle passe par ta box, puis par Internet…',
          lycee: 'La synchronisation envoie le fichier, chiffré, vers les serveurs du service (Google Photos, iCloud, OneDrive…).',
          but: 'Envoi en HTTPS vers une API de stockage objet, découpé en morceaux pour pouvoir reprendre en cas de coupure.',
        },
        actions: [{ do: 'travel', path: ['near', 'box', 'cloud'], count: 2 }],
      },
      {
        title: '… jusqu\'à un vrai data center',
        text: {
          college: '… et elle arrive sur le disque d\'un vrai ordinateur, dans un énorme bâtiment appelé data center. Le « nuage », ce sont des serveurs bien réels !',
          lycee: 'Elle est enregistrée sur des serveurs, dans des data centers, souvent copiée à plusieurs endroits pour ne jamais être perdue.',
          but: 'Stockage objet répliqué (ou codes d\'effacement) sur plusieurs zones de disponibilité pour garantir la durabilité des données.',
        },
        actions: [{ do: 'travel', path: ['cloud', 'dc'], count: 3 }, { do: 'pulse', node: 'dc' }, { do: 'label', node: 'dc', text: 'copiée 3 fois', pos: 'left', offset: 44 }],
      },
    ],
    quiz: {
      question: 'Concrètement, le Cloud c\'est…',
      options: ['Un vrai nuage', 'Des serveurs dans des data centers', 'Une appli météo'],
      correct: 1,
      explanation: 'Le Cloud désigne des serveurs bien réels, installés dans des data centers et accessibles par Internet.',
    },
  },
];
