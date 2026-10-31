/* Network Sim — course content. Short, plain-language lessons tied to what
   the simulator shows. Each card has a title, body paragraphs and a "try it"
   line pointing back to the sandbox. */
(() => {
  'use strict';

  const NS = window.NS;

  const CHAPTERS = [
    {
      id: 'basics', title: 'Les bases du réseau', icon: '🌐',
      cards: [
        {
          t: 'Qu\'est-ce qu\'un réseau ?',
          b: ['Un réseau, c\'est des appareils reliés pour échanger des données : ordinateurs, serveurs, téléphones, imprimantes.',
              'Chaque échange se découpe en petits paquets qui voyagent d\'un appareil à l\'autre, comme des lettres dans le courrier.'],
          try: 'Charge « Maison connectée » et fais un Ping entre deux appareils.'
        },
        {
          t: 'L\'adresse IP',
          b: ['Chaque appareil a une adresse IP, comme 192.168.1.10. C\'est son adresse postale sur le réseau.',
              'Le masque (le /24) dit quelle partie de l\'adresse désigne le quartier (le réseau) et quelle partie désigne la maison (l\'appareil).',
              'Deux appareils du même quartier se parlent directement. Pour un autre quartier, il faut passer par la passerelle.'],
          try: 'Clique sur un appareil : tu vois son IP, son masque et sa passerelle.'
        },
        {
          t: 'Le switch et les adresses MAC',
          b: ['Le switch relie les appareils d\'un même réseau local. Il apprend derrière quel port se trouve chaque adresse MAC (l\'identifiant gravé dans la carte réseau).',
              'Contrairement au routeur, le switch ne regarde pas les adresses IP : il travaille au niveau juste en dessous.'],
          try: 'Dans « Petite entreprise », les PC et serveurs sont tous reliés par un switch.'
        }
      ]
    },
    {
      id: 'routing', title: 'Router et sortir sur Internet', icon: '📡',
      cards: [
        {
          t: 'Le routeur',
          b: ['Le routeur relie des réseaux différents. Quand un paquet vise un autre réseau, il consulte sa table de routage et choisit par où l\'envoyer.',
              'La passerelle par défaut, c\'est « pour tout ce que je ne connais pas, envoie au routeur ».'],
          try: 'Fais un Traceroute depuis un PC vers exemple.fr : chaque saut est un routeur traversé.'
        },
        {
          t: 'Le NAT',
          b: ['À la maison, tous les appareils partagent une seule adresse publique. C\'est le NAT : la box remplace l\'adresse privée de l\'appareil par la sienne en sortant.',
              'C\'est pour ça que 192.168.x.x n\'existe que chez toi : des millions de maisons utilisent les mêmes adresses privées.'],
          try: 'Ping exemple.fr depuis le PC de la maison : la trace indique « NAT appliqué ».'
        },
        {
          t: 'Le DNS',
          b: ['Personne ne retient les adresses IP. Le DNS est l\'annuaire : il traduit exemple.fr en 93.184.216.34.',
              'Avant d\'ouvrir un site, l\'appareil demande d\'abord au serveur DNS l\'adresse correspondant au nom.'],
          try: 'Ouvre un service par son nom : le simulateur montre d\'abord la requête DNS, puis la connexion.'
        }
      ]
    },
    {
      id: 'security', title: 'Sécuriser le réseau', icon: '🛡️',
      cards: [
        {
          t: 'Le pare-feu',
          b: ['Le pare-feu filtre le trafic selon des règles : telle source, telle destination, tel port, autorisé ou refusé.',
              'Une bonne règle de base : tout refuser, puis n\'ouvrir que le strict nécessaire.'],
          try: 'Dans « Entreprise avec DMZ », le pare-feu laisse voir le site mais bloque l\'accès direct à la base de données.'
        },
        {
          t: 'Chiffrement et VPN',
          b: ['Sans chiffrement, un intermédiaire sur le chemin peut lire les données qui passent (mots de passe, mails).',
              'Le HTTPS chiffre la navigation ; le VPN crée un tunnel chiffré pour relier un télétravailleur ou un site distant.'],
          try: 'Active « Chiffrement (TLS) » puis relance la menace « Interception du trafic ».'
        },
        {
          t: 'Cloisonner',
          b: ['Si tout est sur le même réseau à plat, un appareil compromis touche tout le reste.',
              'Séparer en zones (VLAN, DMZ) limite la casse : un problème dans une zone ne se propage pas aux autres.'],
          try: 'Compare « Deux services séparés » et un réseau à plat face au rançongiciel.'
        }
      ]
    }
  ];

  NS.learn = { CHAPTERS };
})();
