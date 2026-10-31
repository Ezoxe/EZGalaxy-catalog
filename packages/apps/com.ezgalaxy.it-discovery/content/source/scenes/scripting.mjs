// Scenes of the module « Automatisation & Scripting »
const file = (id, y, text) => ({ id, kind: 'cell', x: 170, y, w: 250, h: 44, text });

export default [
  {
    lesson: 0, at: 1,
    id: 'script-why',
    title: '500 photos à renommer : à la main ou avec un script ?',
    stage: { w: 800, h: 340 },
    nodes: [
      file('f1', 60, 'IMG_0001.jpg'), file('f2', 125, 'IMG_0002.jpg'), file('f3', 190, 'IMG_0003.jpg'), file('f4', 255, '… et 497 autres'),
      { id: 'human', x: 500, y: 95, icon: 'user', label: 'À la main' },
      { id: 'robot', x: 500, y: 245, icon: 'robot', label: 'Avec un script', color: 'green' },
      { id: 't1', kind: 'text', x: 660, y: 100, text: '', fontSize: 18 },
      { id: 't2', kind: 'text', x: 660, y: 250, text: '', fontSize: 18 },
    ],
    links: [],
    steps: [
      {
        title: 'Une tâche répétitive',
        text: {
          college: 'Tu dois renommer 500 photos « IMG_0001.jpg » avec leur date. Une par une, c\'est long et très ennuyeux…',
          lycee: 'Tâche répétitive : les mêmes actions sur beaucoup de fichiers, avec un gros risque d\'erreur à la main.',
          but: 'Tâche déterministe, répétée et sans jugement humain : la candidate idéale à l\'automatisation.',
        },
        actions: [{ do: 'pulse', nodes: ['f1', 'f2', 'f3', 'f4'] }],
      },
      {
        title: 'À la main',
        text: {
          college: 'À la main : environ 5 secondes par photo… plus de 40 minutes, et tu risques des fautes de frappe.',
          lycee: '500 × 5 secondes ≈ 42 minutes de travail, sans compter les erreurs à corriger.',
          but: 'Coût manuel proportionnel au nombre de fichiers, avec un taux d\'erreur jamais nul.',
        },
        actions: [{ do: 'highlight', node: 'human', color: 'amber' }, { do: 'counter', node: 't1', from: 0, to: 42, suffix: ' min', duration: 3 }, { do: 'text', node: 'f1', text: '2026-07-14_001.jpg', delay: 1.5 }],
      },
      {
        title: 'Avec un script',
        text: {
          college: 'Avec un script de quelques lignes, l\'ordinateur renomme les 500 photos en 2 secondes, sans aucune erreur.',
          lycee: 'Une boucle parcourt tous les fichiers, lit la date de chaque photo et la renomme : quelques lignes de code suffisent.',
          but: 'Boucle sur le répertoire, lecture des métadonnées EXIF, renommage ; le script peut être relancé à volonté.',
        },
        actions: [
          { do: 'highlight', node: 'robot', color: 'green' }, { do: 'counter', node: 't2', from: 0, to: 2, suffix: ' s', duration: 0.6 },
          { do: 'text', node: 'f2', text: '2026-07-14_002.jpg' }, { do: 'text', node: 'f3', text: '2026-07-15_003.jpg' }, { do: 'text', node: 'f4', text: '… 497 renommées !' },
          { do: 'pulse', nodes: ['f1', 'f2', 'f3', 'f4'], color: 'green' },
        ],
      },
      {
        title: 'La règle des 3',
        text: {
          college: 'Et la prochaine fois, il suffit de relancer le script ! Règle d\'or : si tu fais une tâche plus de 3 fois, automatise-la.',
          lycee: 'Le temps passé à écrire le script est vite rentabilisé ; on peut même le lancer automatiquement à heure fixe.',
          but: 'Coût d\'écriture fixe, coût d\'exécution presque nul : on versionne et on documente le script pour toute l\'équipe.',
        },
        actions: [{ do: 'label', node: 'robot', text: 'réutilisable à l\'infini', pos: 'right', offset: 44, dy: 40, color: 'green' }],
      },
    ],
    quiz: {
      question: 'Quand vaut-il la peine d\'automatiser une tâche ?',
      options: ['Jamais', 'Quand on la répète souvent', 'Seulement le dimanche'],
      correct: 1,
      explanation: 'Plus une tâche est répétée, plus le temps passé à l\'automatiser est vite rentabilisé.',
    },
  },
  {
    lesson: 1, at: 1,
    id: 'script-pipe',
    title: 'Le pipe : enchaîner des petites commandes',
    stage: { w: 800, h: 360 },
    nodes: [
      { id: 'cat', x: 120, y: 80, icon: 'file', label: 'cat app.log' },
      { id: 'grep', x: 400, y: 80, icon: 'eye', label: 'grep erreur', color: 'amber' },
      { id: 'wc', x: 680, y: 80, icon: 'chart', label: 'wc -l', color: 'green' },
      { id: 'term', kind: 'terminal', x: 20, y: 175, w: 760, h: 170, title: 'bash' },
    ],
    links: [{ from: 'cat', to: 'grep' }, { from: 'grep', to: 'wc' }],
    steps: [
      {
        title: 'Un fichier de journal',
        text: {
          college: 'Le fichier app.log contient des milliers de lignes écrites par un programme. « cat » les affiche toutes.',
          lycee: 'Un journal (log) enregistre ce qui se passe dans un programme, ligne par ligne, avec l\'heure.',
          but: 'Les journaux applicatifs sont des flux de texte horodatés : idéaux pour les outils Unix qui lisent ligne par ligne.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ cat app.log\n09:12 INFO démarrage\n09:13 INFO connexion de Lina' }, { do: 'pulse', node: 'cat' }],
      },
      {
        title: 'Le pipe enchaîne',
        text: {
          college: 'Le pipe « | » envoie le résultat d\'une commande à la suivante. « grep erreur » ne garde que les lignes qui contiennent le mot « erreur ».',
          lycee: 'La sortie de cat devient l\'entrée de grep : on chaîne de petits outils qui font chacun une seule chose.',
          but: 'Tube anonyme : la sortie standard de cat alimente l\'entrée standard de grep ; les deux processus tournent en parallèle.',
        },
        actions: [
          { do: 'type', node: 'term', text: '$ cat app.log | grep erreur\n09:20 erreur disque plein\n10:02 erreur réseau\n11:45 erreur disque plein' },
          { do: 'travel', path: ['cat', 'grep'], shape: 'dot', count: 6, gap: 0.15, color: 'slate' },
          { do: 'travel', path: ['grep', 'wc'], shape: 'dot', count: 3, gap: 0.4, color: 'red', delay: 0.6 },
        ],
      },
      {
        title: 'On compte',
        text: {
          college: '« wc -l » compte les lignes : il y a 3 erreurs. Trois petites commandes, une réponse en une seconde !',
          lycee: 'wc -l compte les lignes reçues : en une ligne de commande, on a filtré puis compté.',
          but: 'Composition de filtres : cat | grep | wc -l ; on pourrait aussi écrire grep -c erreur app.log.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ cat app.log | grep erreur | wc -l\n3' }, { do: 'pulse', node: 'wc', color: 'green' }],
      },
      {
        title: 'On planifie avec cron',
        text: {
          college: 'Avec cron, on peut lancer ce contrôle tout seul chaque nuit à 2 h du matin, même quand personne n\'est là.',
          lycee: 'La ligne « 0 2 * * * » signifie : à la minute 0 de 2 h, tous les jours, tous les mois, quel que soit le jour de la semaine.',
          but: 'Format cron : minute, heure, jour du mois, mois, jour de la semaine ; on redirige la sortie vers un journal ou une alerte.',
        },
        actions: [{ do: 'type', node: 'term', text: '$ crontab -e\n0 2 * * * /home/neo/verifier-logs.sh' }],
      },
    ],
    quiz: {
      question: 'Que fait le symbole « | » (pipe) dans un terminal ?',
      options: ['Il supprime un fichier', 'Il envoie la sortie d\'une commande à la suivante', 'Il éteint le terminal'],
      correct: 1,
      explanation: 'Le pipe relie deux commandes : ce que la première affiche devient ce que lit la seconde.',
    },
  },
  {
    lesson: 2, at: 2,
    id: 'script-cicd',
    title: 'Une chaîne de livraison automatique (CI/CD)',
    stage: { w: 800, h: 320 },
    nodes: [
      { id: 'dev', x: 70, y: 160, icon: 'user', label: 'Développeur' },
      { id: 'git', x: 200, y: 160, icon: 'branch', label: 'git push' },
      { id: 'tests', x: 330, y: 160, icon: 'check', label: 'Tests' },
      { id: 'build', x: 460, y: 160, icon: 'container', label: 'Build' },
      { id: 'deploy', x: 590, y: 160, icon: 'rocket', label: 'Mise en ligne' },
      { id: 'mon', x: 720, y: 160, icon: 'chart', label: 'Surveillance' },
    ],
    links: [{ from: 'dev', to: 'git' }, { from: 'git', to: 'tests' }, { from: 'tests', to: 'build' }, { from: 'build', to: 'deploy' }, { from: 'deploy', to: 'mon' }],
    steps: [
      {
        title: 'Le code est envoyé',
        text: {
          college: 'Le développeur termine une fonctionnalité et envoie son code sur le serveur de l\'équipe (git push).',
          lycee: 'Git garde l\'historique de toutes les modifications ; un « push » envoie les nouvelles versions au dépôt commun.',
          but: 'Push sur une branche, ouverture d\'une pull request et déclenchement du pipeline par un webhook.',
        },
        actions: [{ do: 'travel', path: ['dev', 'git'] }, { do: 'pulse', node: 'git' }],
      },
      {
        title: 'Un test échoue : tout s\'arrête',
        text: {
          college: 'Un robot lance des centaines de tests. Si un seul échoue, la chaîne s\'arrête : le code bugué n\'arrive jamais chez les utilisateurs.',
          lycee: 'L\'intégration continue (CI) lance les tests à chaque envoi ; un échec bloque la suite et prévient le développeur.',
          but: 'Étape CI : lint, tests unitaires et d\'intégration ; un statut rouge empêche la fusion (protection de branche).',
        },
        actions: [{ do: 'travel', path: ['git', 'tests'], once: true }, { do: 'shake', node: 'tests', color: 'red', delay: 1 }, { do: 'label', node: 'tests', text: '1 test échoué : livraison bloquée', pos: 'top', offset: 62, color: 'red', delay: 1 }],
      },
      {
        title: 'Corrigé, tout est vert',
        text: {
          college: 'Le développeur corrige son erreur et renvoie le code. Cette fois, tous les tests passent !',
          lycee: 'Après correction, le pipeline repart du début : les tests passent, la suite peut continuer.',
          but: 'Nouveau commit, nouvelle exécution du pipeline ; tous les contrôles au vert, la pull request peut être fusionnée.',
        },
        actions: [{ do: 'travel', path: ['dev', 'git', 'tests'], color: 'green' }, { do: 'highlight', node: 'tests', color: 'green' }, { do: 'label', node: 'tests', text: '128 tests réussis', pos: 'top', offset: 62, color: 'green' }],
      },
      {
        title: 'Construire et livrer',
        text: {
          college: 'Le code est emballé (build) puis mis en ligne automatiquement, sans que personne n\'ait à cliquer.',
          lycee: 'Le déploiement continu (CD) emballe l\'application et l\'installe sur les serveurs de production.',
          but: 'Construction d\'une image versionnée, déploiement progressif (canary ou blue/green) avec retour arrière automatique.',
        },
        actions: [{ do: 'travel', path: ['tests', 'build', 'deploy'], count: 2 }, { do: 'pulse', node: 'deploy' }],
      },
      {
        title: 'Surveiller',
        text: {
          college: 'Après la mise en ligne, on surveille : si un problème apparaît, une alerte prévient l\'équipe tout de suite.',
          lycee: 'La supervision mesure les erreurs et les temps de réponse ; une alerte se déclenche si quelque chose cloche.',
          but: 'Observabilité : métriques, journaux et traces ; des alertes sur les indicateurs de service (taux d\'erreur, latence).',
        },
        actions: [{ do: 'travel', path: ['deploy', 'mon'], color: 'amber' }, { do: 'pulse', node: 'mon', color: 'amber' }],
      },
    ],
    quiz: {
      question: 'Que se passe-t-il si un test automatique échoue dans un pipeline CI/CD ?',
      options: ['Le code est quand même mis en ligne', 'La livraison est bloquée', 'L\'ordinateur s\'éteint'],
      correct: 1,
      explanation: 'Un test qui échoue arrête la chaîne : le code défectueux ne part pas en production.',
    },
  },
];
