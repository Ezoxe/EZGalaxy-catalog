/* Network Sim — guided missions. Each mission loads a starting network and
   checks, on demand, whether the learner reached the goal. Checks read the
   live net/engine so they reward real understanding, not button-pressing. */
(() => {
  'use strict';

  const NS = window.NS;
  const { engine } = NS;

  const MISSIONS = [
    {
      id: 'connect', title: 'Relier deux ordinateurs', icon: '🔌',
      level: 'Débutant',
      brief: 'Le réseau est vide. Ajoute deux ordinateurs et un switch, relie-les, donne-leur une adresse IP du même réseau, puis fais un Ping de l\'un vers l\'autre.',
      steps: [
        'Glisse 2 ordinateurs et 1 switch sur la scène.',
        'Relie chaque ordinateur au switch (bouton Relier).',
        'Donne-leur 192.168.0.1 et 192.168.0.2, masque /24.',
        'Sélectionne un PC, action Ping vers l\'autre.'
      ],
      start: () => NS.model.createNet(),
      check(ctx) {
        const { net, events } = ctx;
        const pcs = net.devices.filter(d => d.type === 'pc');
        if (pcs.length < 2) return fail('Il faut au moins deux ordinateurs.');
        const withIp = pcs.filter(d => engine.primaryIface(d) && engine.primaryIface(d).ip);
        if (withIp.length < 2) return fail('Les deux ordinateurs doivent avoir une IP.');
        if (!events.some(e => e.type === 'ping' && e.ok)) return fail('Fais un Ping réussi entre les deux.');
        return pass('Bravo : les deux machines se parlent sur le même réseau local.');
      }
    },
    {
      id: 'gateway', title: 'Sortir de son réseau', icon: '🚪',
      level: 'Débutant',
      brief: 'Les PC n\'ont pas de passerelle configurée, donc ils ne joignent pas le serveur de l\'autre réseau. Répare-le.',
      steps: [
        'Fais un Ping du PC vers exemple.fr : il échoue.',
        'Ouvre le PC et renseigne la passerelle (l\'IP du routeur sur ce réseau).',
        'Relance le Ping : il doit aboutir.'
      ],
      start: () => {
        const net = NS.scenarios.load('office');
        net.devices.filter(d => d.type === 'pc').forEach(d => { d.gateway = ''; });
        net.meta.name = 'Mission : passerelle';
        return net;
      },
      check(ctx) {
        const pcMissing = ctx.net.devices.some(d => d.type === 'pc' && !d.gateway);
        if (pcMissing) return fail('Un PC n\'a toujours pas de passerelle.');
        if (!ctx.events.some(e => e.type === 'ping' && e.ok && e.crossedRouter)) return fail('Fais un Ping réussi vers un autre réseau.');
        return pass('Parfait : avec la bonne passerelle, le PC sort de son réseau.');
      }
    },
    {
      id: 'protect', title: 'Protéger un service exposé', icon: '🛡️',
      level: 'Intermédiaire',
      brief: 'Un serveur web est joignable, mais la base de données l\'est aussi depuis Internet. Mets un pare-feu qui n\'autorise que le web.',
      steps: [
        'Place un pare-feu entre Internet et les serveurs.',
        'Politique par défaut : tout refuser.',
        'Ajoute une règle : autoriser le port 443 vers le serveur web.',
        'Vérifie qu\'on atteint le web mais plus la base.'
      ],
      start: () => {
        const net = NS.scenarios.load('dmz');
        const fw = net.devices.find(d => d.type === 'firewall');
        if (fw) { fw.rules = []; fw.defaultPolicy = 'allow'; }
        net.meta.name = 'Mission : pare-feu';
        return net;
      },
      check(ctx) {
        const fw = ctx.net.devices.find(d => d.type === 'firewall');
        if (!fw) return fail('Aucun pare-feu sur le réseau.');
        if (fw.defaultPolicy !== 'deny') return fail('Mets la politique par défaut sur « tout refuser ».');
        const allowsWeb = fw.rules.some(r => r.action === 'allow' && Number(r.port) === 443);
        if (!allowsWeb) return fail('Ajoute une règle autorisant le port 443 vers le web.');
        const allowsDb = fw.rules.some(r => r.action === 'allow' && Number(r.port) === 3306 && (!r.from || r.from === 'any'));
        if (allowsDb) return fail('La base ne doit pas être ouverte à tout le monde.');
        return pass('Bien joué : seul le web est exposé, la base reste protégée.');
      }
    }
  ];

  function pass(msg) { return { done: true, msg }; }
  function fail(msg) { return { done: false, msg }; }

  NS.missions = { MISSIONS };
})();
