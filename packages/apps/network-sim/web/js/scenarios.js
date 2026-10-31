/* Network Sim — ready-made demonstration networks.
   Each builder returns a fully addressed, routable topology so the learner
   can try actions straight away, then tinker. Hosts left on DHCP get their
   address when the UI calls engine.applyAddressing() after loading. */
(() => {
  'use strict';

  const NS = window.NS;
  const { model } = NS;

  // Small builder DSL over the model.
  function build(name) {
    const net = model.createNet();
    net.meta.name = name;
    const byRef = {};
    return {
      net,
      add(ref, type, x, y, cfg) {
        cfg = cfg || {};
        const d = model.makeDevice(type, x, y, cfg.name || model.defaultName(net, type));
        net.devices.push(d);
        byRef[ref] = d;
        Object.assign(d, cfg.set || {});
        // Routers start without interfaces: their addresses go through rif().
        const f = d.interfaces[0];
        if (cfg.ip && f) { f.ip = cfg.ip; f.dhcp = false; f.prefix = cfg.prefix || 24; }
        if (cfg.gateway) d.gateway = cfg.gateway;
        if (cfg.dns) d.dns = cfg.dns;
        if (cfg.services) d.services = cfg.services.slice();
        if (cfg.records) d.records = cfg.records;
        return d;
      },
      link(r1, r2) { return model.connect(net, byRef[r1], byRef[r2]).link; },
      // Address the router interface that faces a given neighbour.
      rif(routerRef, facing, addr, prefix) {
        const router = byRef[routerRef];
        const other = byRef[facing];
        const link = net.links.find(l =>
          (l.a === router.id && l.b === other.id) || (l.b === router.id && l.a === other.id));
        if (!link) return;
        const f = model.getIface(router, link.a === router.id ? link.ifaceA : link.ifaceB);
        if (f) { f.ip = addr; f.prefix = prefix || 24; f.dhcp = false; }
      },
      get: ref => byRef[ref],
      done() { return net; }
    };
  }

  // Public side shared by several scenarios: a web site and a public DNS.
  function publicSide(b, x) {
    b.add('pubsw', 'switch', x, 40, { name: 'Datacenter public' });
    b.add('site', 'web', x - 110, 40, { name: 'exemple.fr', ip: '93.184.216.34', gateway: '93.184.216.1' });
    b.add('pubdns', 'dns', x + 110, 40, { name: 'DNS public', ip: '93.184.216.53', gateway: '93.184.216.1',
      records: { 'exemple.fr': '93.184.216.34', 'www.exemple.fr': '93.184.216.34' } });
    b.link('net', 'pubsw');
    b.rif('net', 'pubsw', '93.184.216.1', 24);
    b.link('pubsw', 'site');
    b.link('pubsw', 'pubdns');
  }

  const SCENARIOS = {
    home: {
      label: 'Maison connectée', tag: 'Débutant', icon: '🏠',
      hint: 'La box distribue les adresses (DHCP) et partage une seule adresse publique (NAT). Ouvre exemple.fr depuis le PC.',
      make() {
        const b = build('Maison connectée');
        b.add('net', 'internet', 420, 150, { name: 'Internet' });
        b.add('box', 'box', 420, 270, { name: 'Box', set: {
          nat: true, gateway: '203.0.113.1',
          dhcp: { enabled: true, start: '192.168.1.10', end: '192.168.1.50', prefix: 24, gateway: '192.168.1.1', dns: '93.184.216.53' }
        } });
        b.add('sw', 'ap', 420, 390, { name: 'Wi-Fi maison' });
        b.add('pc', 'pc', 220, 510, { name: 'PC du salon' });
        b.add('laptop', 'laptop', 360, 540);
        b.add('phone', 'phone', 500, 540);
        b.add('tv', 'iot', 640, 500, { name: 'TV connectée' });
        b.link('net', 'box');
        b.rif('net', 'box', '203.0.113.1', 24);
        b.rif('box', 'net', '203.0.113.10', 24);
        b.link('box', 'sw');
        b.rif('box', 'sw', '192.168.1.1', 24);
        ['pc', 'laptop', 'phone', 'tv'].forEach(r => b.link('sw', r));
        publicSide(b, 420);
        return b.done();
      }
    },

    office: {
      label: 'Petite entreprise', tag: 'Intermédiaire', icon: '🏢',
      hint: 'Un routeur, un serveur web et un DNS interne. Ouvre intranet.lan depuis un PC.',
      make() {
        const b = build('Petite entreprise');
        b.add('net', 'internet', 420, 150, { name: 'Internet' });
        b.add('r', 'router', 420, 270, { name: 'Routeur', set: { gateway: '198.51.100.1', nat: true } });
        b.add('sw', 'switch', 420, 390);
        b.add('dns', 'dns', 160, 520, { name: 'DNS interne', ip: '10.0.0.53', gateway: '10.0.0.1',
          records: { 'intranet.lan': '10.0.0.80', 'dns.lan': '10.0.0.53', 'exemple.fr': '93.184.216.34' } });
        b.add('web', 'web', 320, 540, { name: 'Serveur intranet', ip: '10.0.0.80', gateway: '10.0.0.1' });
        b.add('pc1', 'pc', 500, 540, { name: 'PC compta', ip: '10.0.0.21', gateway: '10.0.0.1', dns: '10.0.0.53' });
        b.add('pc2', 'pc', 660, 520, { name: 'PC accueil', ip: '10.0.0.22', gateway: '10.0.0.1', dns: '10.0.0.53' });
        b.link('net', 'r');
        b.rif('net', 'r', '198.51.100.1', 24);
        b.rif('r', 'net', '198.51.100.9', 24);
        b.link('r', 'sw');
        b.rif('r', 'sw', '10.0.0.1', 24);
        ['dns', 'web', 'pc1', 'pc2'].forEach(r => b.link('sw', r));
        publicSide(b, 420);
        return b.done();
      }
    },

    dmz: {
      label: 'Entreprise avec DMZ', tag: 'Avancé', icon: '🛡️',
      hint: 'Le pare-feu laisse Internet voir le site (DMZ) mais protège le réseau interne. Teste depuis l\'internaute.',
      make() {
        const b = build('Entreprise avec DMZ');
        b.add('net', 'internet', 420, 120, { name: 'Internet', set: {
          routes: [{ cidr: '172.16.0.0/24', via: '198.51.100.9' }, { cidr: '10.0.0.0/24', via: '198.51.100.9' }]
        } });
        b.add('visitor', 'laptop', 160, 60, { name: 'Internaute', ip: '203.0.113.50', gateway: '203.0.113.1' });
        b.add('attacker', 'attacker', 680, 60, { name: 'Attaquant', ip: '203.0.113.66', gateway: '203.0.113.1' });
        b.add('wan', 'switch', 420, 20, { name: 'Accès Internet' });
        b.add('fw', 'firewall', 420, 250, { name: 'Pare-feu', set: {
          gateway: '198.51.100.1', defaultPolicy: 'deny',
          rules: [
            { action: 'allow', to: '172.16.0.0/24', port: 443, proto: 'tcp' },
            { action: 'allow', to: '172.16.0.0/24', port: 80, proto: 'tcp' },
            { action: 'allow', from: '10.0.0.0/24', to: 'any' },
            { action: 'allow', from: '172.16.0.0/24', to: '10.0.0.30', port: 3306, proto: 'tcp' }
          ]
        } });
        b.add('dmzsw', 'switch', 640, 380, { name: 'Switch DMZ' });
        b.add('web', 'web', 640, 520, { name: 'Site public', ip: '172.16.0.80', gateway: '172.16.0.1' });
        b.add('lansw', 'switch', 220, 380, { name: 'Switch LAN' });
        b.add('db', 'database', 120, 520, { name: 'Base clients', ip: '10.0.0.30', gateway: '10.0.0.1' });
        b.add('pc', 'pc', 320, 530, { name: 'PC employé', ip: '10.0.0.20', gateway: '10.0.0.1' });
        b.link('net', 'wan');
        b.rif('net', 'wan', '203.0.113.1', 24);
        b.link('wan', 'visitor');
        b.link('wan', 'attacker');
        b.link('net', 'fw');
        b.rif('net', 'fw', '198.51.100.1', 24);
        b.rif('fw', 'net', '198.51.100.9', 24);
        b.link('fw', 'dmzsw');
        b.rif('fw', 'dmzsw', '172.16.0.1', 24);
        b.link('fw', 'lansw');
        b.rif('fw', 'lansw', '10.0.0.1', 24);
        b.link('dmzsw', 'web');
        ['db', 'pc'].forEach(r => b.link('lansw', r));
        return b.done();
      }
    },

    vlan: {
      label: 'Deux services séparés', tag: 'Intermédiaire', icon: '🔀',
      hint: 'Deux réseaux distincts reliés par un routeur : le trafic entre eux passe forcément par lui.',
      make() {
        const b = build('Deux services séparés');
        b.add('r', 'router', 420, 160, { name: 'Routeur central' });
        b.add('swa', 'switch', 220, 300, { name: 'Switch Compta' });
        b.add('swb', 'switch', 620, 300, { name: 'Switch Atelier' });
        b.add('a1', 'pc', 120, 440, { name: 'Compta 1', ip: '10.10.1.11', gateway: '10.10.1.1' });
        b.add('a2', 'pc', 300, 450, { name: 'Compta 2', ip: '10.10.1.12', gateway: '10.10.1.1' });
        b.add('srv', 'server', 220, 560, { name: 'Serveur compta', ip: '10.10.1.20', gateway: '10.10.1.1', services: [22, 445] });
        b.add('b1', 'pc', 540, 450, { name: 'Atelier 1', ip: '10.10.2.11', gateway: '10.10.2.1' });
        b.add('cam', 'iot', 720, 440, { name: 'Caméra atelier', ip: '10.10.2.50', gateway: '10.10.2.1' });
        b.add('prn', 'printer', 620, 560, { name: 'Imprimante', ip: '10.10.2.60', gateway: '10.10.2.1' });
        b.link('r', 'swa');
        b.rif('r', 'swa', '10.10.1.1', 24);
        b.link('r', 'swb');
        b.rif('r', 'swb', '10.10.2.1', 24);
        ['a1', 'a2', 'srv'].forEach(r => b.link('swa', r));
        ['b1', 'cam', 'prn'].forEach(r => b.link('swb', r));
        return b.done();
      }
    },

    datacenter: {
      label: 'Datacenter', tag: 'Avancé', icon: '☁️',
      hint: 'Un répartiteur devant trois serveurs web identiques, et une base de données derrière.',
      make() {
        const b = build('Datacenter');
        b.add('net', 'internet', 420, 120, { name: 'Internet' });
        b.add('client', 'laptop', 160, 40, { name: 'Client', ip: '203.0.113.50', gateway: '203.0.113.1' });
        b.add('wan', 'switch', 420, 20, { name: 'Accès Internet' });
        b.add('r', 'router', 420, 240, { name: 'Routeur datacenter', set: { gateway: '198.51.100.1' } });
        b.add('sw', 'switch', 420, 360);
        b.add('lb', 'loadbalancer', 420, 470, { name: 'Répartiteur', ip: '10.1.0.10', gateway: '10.1.0.1' });
        b.add('w1', 'web', 200, 520, { name: 'Web 1', ip: '10.1.0.21', gateway: '10.1.0.1' });
        b.add('w2', 'web', 300, 600, { name: 'Web 2', ip: '10.1.0.22', gateway: '10.1.0.1' });
        b.add('w3', 'web', 540, 600, { name: 'Web 3', ip: '10.1.0.23', gateway: '10.1.0.1' });
        b.add('db', 'database', 640, 520, { name: 'Base', ip: '10.1.0.30', gateway: '10.1.0.1' });
        b.get('net').routes = [{ cidr: '10.1.0.0/24', via: '198.51.100.9' }];
        b.link('net', 'wan');
        b.rif('net', 'wan', '203.0.113.1', 24);
        b.link('wan', 'client');
        b.link('net', 'r');
        b.rif('net', 'r', '198.51.100.1', 24);
        b.rif('r', 'net', '198.51.100.9', 24);
        b.link('r', 'sw');
        b.rif('r', 'sw', '10.1.0.1', 24);
        ['lb', 'w1', 'w2', 'w3', 'db'].forEach(r => b.link('sw', r));
        return b.done();
      }
    }
  };

  function load(id) {
    const s = SCENARIOS[id];
    return s ? s.make() : null;
  }

  NS.scenarios = { SCENARIOS, load };
})();
