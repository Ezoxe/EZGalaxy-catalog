// Scenes of the module « Cloud & DevOps »
const layer = (id, y, text) => ({ id, kind: 'cell', x: 400, y, w: 360, h: 44, text, color: 'cyan' });
const LAYERS = ['app', 'data', 'runtime', 'os', 'hw'];

export default [
  {
    lesson: 0, at: 1,
    id: 'cloud-models',
    title: 'Sur site, IaaS, PaaS, SaaS : qui gère quoi ?',
    stage: { w: 800, h: 330 },
    nodes: [
      { id: 'mode', kind: 'chip', x: 400, y: 30, text: 'Sur site (on-premise)', fontSize: 16, color: 'cyan' },
      layer('app', 85, 'Application'), layer('data', 140, 'Données'), layer('runtime', 195, 'Environnement (langage, base)'),
      layer('os', 250, 'Système d\'exploitation'), layer('hw', 305, 'Serveurs, réseau, stockage'),
      { id: 'you', kind: 'chip', x: 690, y: 130, text: 'géré par toi', color: 'cyan' },
      { id: 'prov', kind: 'chip', x: 690, y: 190, text: 'géré par le fournisseur', color: 'violet' },
    ],
    links: [],
    steps: [
      {
        title: 'Sur site : tu gères tout',
        text: {
          college: 'Sans cloud, l\'entreprise achète ses propres serveurs et s\'occupe de tout elle-même, des machines jusqu\'à l\'application.',
          lycee: 'Sur site (on-premise) : achat du matériel, salle serveur, maintenance, mises à jour… tout est à la charge de l\'entreprise.',
          but: 'On-premise : investissement initial (CAPEX), capacité dimensionnée pour le pic de charge, exploitation complète en interne.',
        },
        actions: [{ do: 'pulse', nodes: LAYERS }],
      },
      {
        title: 'IaaS : tu loues les machines',
        text: {
          college: 'Avec l\'IaaS, tu loues des serveurs virtuels : le fournisseur s\'occupe du matériel, toi du reste.',
          lycee: 'IaaS (Infrastructure as a Service) : serveurs virtuels, stockage et réseau loués à la demande (AWS EC2, Azure VM).',
          but: 'IaaS : machines virtuelles facturées à l\'usage (OPEX) ; le client reste responsable de l\'OS, des correctifs et de l\'application.',
        },
        actions: [{ do: 'text', node: 'mode', text: 'IaaS · ex. AWS EC2' }, { do: 'color', node: 'hw', color: 'violet' }, { do: 'pulse', node: 'hw', color: 'violet' }],
      },
      {
        title: 'PaaS : tu déposes ton code',
        text: {
          college: 'Avec le PaaS, tu envoies juste ton code : le fournisseur gère aussi le système et l\'environnement.',
          lycee: 'PaaS (Platform as a Service) : tu déploies ton application, la plateforme gère serveurs, système et mises à jour (Heroku, Google App Engine).',
          but: 'PaaS : runtime managé, mise à l\'échelle automatique ; le client ne gère plus que le code et ses données.',
        },
        actions: [{ do: 'text', node: 'mode', text: 'PaaS · ex. Heroku' }, { do: 'color', nodes: ['os', 'runtime'], color: 'violet' }, { do: 'pulse', nodes: ['os', 'runtime'], color: 'violet' }],
      },
      {
        title: 'SaaS : tu utilises le logiciel',
        text: {
          college: 'Avec le SaaS, tu utilises directement le logiciel en ligne, comme Gmail : tout le reste est géré pour toi.',
          lycee: 'SaaS (Software as a Service) : un logiciel prêt à l\'emploi dans le navigateur, sur abonnement (Gmail, Microsoft 365, Slack).',
          but: 'SaaS : application multi-locataires entièrement exploitée par l\'éditeur ; le client garde la responsabilité de ses accès et de ses données.',
        },
        actions: [{ do: 'text', node: 'mode', text: 'SaaS · ex. Gmail' }, { do: 'color', nodes: ['app', 'data'], color: 'violet' }, { do: 'pulse', nodes: ['app', 'data'], color: 'violet' }],
      },
    ],
    quiz: {
      question: 'Gmail est un exemple de…',
      options: ['IaaS', 'PaaS', 'SaaS'],
      correct: 2,
      explanation: 'Gmail est un logiciel utilisé directement en ligne : c\'est du SaaS.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'cloud-containers',
    title: 'Docker : la même boîte, partout',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'laptop', x: 110, y: 180, icon: 'laptop', label: 'Ton PC' },
      { id: 'image', x: 340, y: 180, icon: 'container', label: 'Image Docker', size: 76, color: 'cyan', hidden: true },
      { id: 'test', x: 600, y: 85, icon: 'server', label: 'Serveur de test' },
      { id: 'prod', x: 600, y: 280, icon: 'cloud', label: 'Cloud (production)' },
      { id: 'c1', kind: 'chip', x: 740, y: 230, text: 'conteneur 1', hidden: true, color: 'green' },
      { id: 'c2', kind: 'chip', x: 740, y: 280, text: 'conteneur 2', hidden: true, color: 'green' },
      { id: 'c3', kind: 'chip', x: 740, y: 330, text: 'conteneur 3', hidden: true, color: 'green' },
    ],
    links: [{ from: 'laptop', to: 'test', dashed: true }, { from: 'laptop', to: 'image', hidden: true }, { from: 'image', to: 'test', hidden: true }, { from: 'image', to: 'prod', hidden: true }],
    steps: [
      {
        title: '« Pourtant, ça marchait sur ma machine ! »',
        text: {
          college: 'Grand classique : ton appli marche sur ton PC mais plante sur le serveur, parce qu\'il y manque une bibliothèque ou que ce n\'est pas la même version.',
          lycee: 'Les différences d\'environnement (versions, bibliothèques, réglages) font qu\'un programme se comporte différemment d\'une machine à l\'autre.',
          but: 'Dérive de configuration entre environnements : dépendances système, versions du langage, variables d\'environnement.',
        },
        actions: [{ do: 'label', node: 'laptop', text: 'ça marche ici !', pos: 'top', offset: 58, color: 'green' }, { do: 'travel', path: ['laptop', 'test'], color: 'red', once: true }, { do: 'shake', node: 'test', color: 'red', delay: 1.2 }, { do: 'label', node: 'test', text: 'ça plante ici ?!', pos: 'left', offset: 46, color: 'red', delay: 1.2 }],
      },
      {
        title: 'On met tout dans une boîte',
        text: {
          college: 'Docker emballe l\'appli avec TOUT ce dont elle a besoin (bibliothèques, réglages) dans une image, comme un container maritime.',
          lycee: 'Un Dockerfile décrit comment construire l\'image : système de base, dépendances, fichiers de l\'appli, commande de lancement.',
          but: 'Image construite en couches à partir du Dockerfile (FROM, RUN, COPY, CMD), versionnée et stockée dans un registre.',
        },
        actions: [{ do: 'show', nodes: ['image'], links: [1] }, { do: 'travel', path: ['laptop', 'image'], count: 3 }, { do: 'pulse', node: 'image' }],
      },
      {
        title: 'La même boîte partout',
        text: {
          college: 'Cette même image tourne à l\'identique sur le serveur de test et dans le cloud : fini les mauvaises surprises !',
          lycee: 'L\'image est la même partout : ce qui a été testé est exactement ce qui part en production.',
          but: 'Artefact immuable promu d\'environnement en environnement : test et production exécutent le même digest d\'image.',
        },
        actions: [{ do: 'show', links: [2, 3] }, { do: 'travel', path: ['image', 'test'], color: 'green' }, { do: 'travel', path: ['image', 'prod'], color: 'green', delay: 0.3 }, { do: 'highlight', nodes: ['test', 'prod'], color: 'green' }],
      },
      {
        title: 'Léger et rapide',
        text: {
          college: 'Un conteneur démarre en une seconde et partage le système de la machine : on peut en lancer des dizaines là où une machine virtuelle n\'en ferait tourner que quelques-unes.',
          lycee: 'Contrairement à une machine virtuelle qui embarque tout un système, le conteneur partage le noyau de la machine : il est bien plus léger.',
          but: 'Isolation par namespaces et cgroups, système de fichiers en couches ; Kubernetes orchestre le placement, le redémarrage et la mise à l\'échelle.',
        },
        actions: [{ do: 'show', nodes: ['c1'] }, { do: 'show', nodes: ['c2'], delay: 0.4 }, { do: 'show', nodes: ['c3'], delay: 0.8 }, { do: 'pulse', node: 'prod', color: 'green' }],
      },
    ],
    quiz: {
      question: 'Pourquoi utilise-t-on des conteneurs Docker ?',
      options: ['Pour que l\'appli fonctionne pareil partout', 'Pour décorer le bureau', 'Pour accélérer le Wi-Fi'],
      correct: 0,
      explanation: 'Le conteneur embarque l\'appli et ses dépendances : elle se comporte de la même façon sur toutes les machines.',
    },
  },
  {
    lesson: 2, at: 1,
    id: 'cloud-iac',
    title: 'L\'infrastructure décrite comme une recette',
    stage: { w: 800, h: 330 },
    nodes: [
      { id: 'code', kind: 'terminal', x: 20, y: 30, w: 340, h: 270, title: 'infra.tf' },
      { id: 'lb', x: 575, y: 70, icon: 'switch', label: 'Répartiteur de charge', hidden: true, color: 'violet' },
      { id: 'web1', x: 480, y: 220, icon: 'server', label: 'web-1', hidden: true },
      { id: 'web2', x: 670, y: 220, icon: 'server', label: 'web-2', hidden: true },
    ],
    links: [{ from: 'lb', to: 'web1', hidden: true }, { from: 'lb', to: 'web2', hidden: true }],
    steps: [
      {
        title: 'L\'infrastructure en code',
        text: {
          college: 'Au lieu de cliquer partout pour créer des serveurs, on décrit l\'infrastructure dans un fichier, comme une recette.',
          lycee: 'Avec l\'Infrastructure as Code (Terraform, Ansible…), serveurs, réseaux et bases sont décrits dans des fichiers texte.',
          but: 'Description déclarative de l\'état voulu ; l\'outil compare avec l\'état réel et calcule les changements (plan).',
        },
        actions: [{ do: 'type', node: 'code', text: '$ cat infra.tf\nserveurs_web    = 2\nrepartiteur     = oui\nregion          = "europe"' }],
      },
      {
        title: 'Une commande, tout se crée',
        text: {
          college: 'Une seule commande, et l\'outil crée automatiquement tous les serveurs décrits. Exactement pareil à chaque fois.',
          lycee: '« terraform apply » crée les ressources dans le cloud dans le bon ordre, sans oubli ni faute de frappe.',
          but: 'terraform apply exécute le plan, gère les dépendances entre ressources et enregistre l\'état obtenu.',
        },
        actions: [
          { do: 'type', node: 'code', text: '$ terraform apply\n3 ressources créées' },
          { do: 'show', nodes: ['lb'], delay: 1.2 }, { do: 'show', nodes: ['web1'], links: [0], delay: 1.6 }, { do: 'show', nodes: ['web2'], links: [1], delay: 2 },
        ],
      },
      {
        title: 'Catastrophe !',
        text: {
          college: 'Une panne géante détruit tous les serveurs ! Pas de panique…',
          lycee: 'Panne de région, erreur humaine : sans IaC, il faudrait se souvenir de chaque réglage fait à la main.',
          but: 'Perte totale d\'un environnement : sans IaC, sa reconstruction dépend de la mémoire des équipes et d\'une documentation souvent périmée.',
        },
        actions: [{ do: 'shake', nodes: ['lb', 'web1', 'web2'], color: 'red' }, { do: 'hide', nodes: ['lb', 'web1', 'web2'], links: [0, 1], delay: 1 }],
      },
      {
        title: 'On reconstruit à l\'identique',
        text: {
          college: 'On relance la recette : l\'infrastructure revient à l\'identique en quelques minutes. Et le fichier, rangé dans Git, garde l\'historique de chaque changement.',
          lycee: 'Le même fichier recrée la même infrastructure ; versionné dans Git, chaque modification est relue et peut être annulée.',
          but: 'Reproductibilité et traçabilité : revue des changements par pull request (GitOps), retour arrière par simple revert.',
        },
        actions: [
          { do: 'type', node: 'code', text: '$ terraform apply\n3 ressources recréées' },
          { do: 'show', nodes: ['lb'], delay: 1 }, { do: 'show', nodes: ['web1', 'web2'], links: [0, 1], delay: 1.4 },
          { do: 'pulse', nodes: ['lb', 'web1', 'web2'], color: 'green', delay: 1.4 },
        ],
      },
    ],
    quiz: {
      question: 'Quel est le grand avantage de l\'Infrastructure as Code ?',
      options: ['Recréer une infrastructure identique en une commande', 'Avoir des serveurs gratuits', 'Ne plus avoir besoin d\'électricité'],
      correct: 0,
      explanation: 'Décrite dans du code, l\'infrastructure peut être recréée à l\'identique, versionnée et relue.',
    },
  },
];
