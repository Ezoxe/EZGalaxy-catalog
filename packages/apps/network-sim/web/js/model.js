/* Network Sim — topology model: devices, links, interfaces, config. */
(() => {
  'use strict';

  const NS = window.NS;
  const { uid, newMac, clone } = NS;

  // A device holds interfaces (ports). Hosts/routers have IP config per interface.
  function makeDevice(type, x, y, name) {
    const def = NS.TYPES[type];
    if (!def) throw new Error('type inconnu: ' + type);
    const dev = {
      id: uid('d'),
      type,
      name: name || '',
      x, y,
      kind: def.kind,
      interfaces: [],
      // host / router config
      gateway: '',          // default gateway (hosts, and router uplink)
      dns: '',              // resolver address (hosts)
      dhcp: null,           // router: { enabled, start, end, prefix, gateway, dns } per interface id
      nat: false,           // router: masquerade behind the uplink interface
      routes: [],           // router: [{ cidr, via }]
      rules: [],            // firewall: [{ action:'allow'|'deny', from, to, port, proto }]
      defaultPolicy: 'allow', // firewall
      services: (def.services || []).slice(),
      records: {},          // dns server: { 'name.lan': '10.0.0.5' }
      vlan: null,           // host access VLAN (via switch)
      wireless: !!def.wireless,
      compromised: false,
      note: ''
    };
    const count = def.ifaces === 0 ? 0 : def.ifaces;
    for (let i = 0; i < count; i++) addInterface(dev, i);
    return dev;
  }

  function addInterface(dev, index) {
    const iface = {
      id: uid('if'),
      name: dev.kind === 'router' ? ('eth' + dev.interfaces.length) : ('eth' + (index || 0)),
      mac: newMac(),
      ip: '',
      prefix: 24,
      dhcp: dev.kind === 'host',   // hosts default to automatic addressing
      up: true
    };
    dev.interfaces.push(iface);
    return iface;
  }

  // Switches/APs have as many ports as links; routers grow an interface per link.
  function ensurePort(dev) {
    if (dev.kind === 'l2') return null;              // l2 needs no IP interface
    if (dev.kind === 'router') return addInterface(dev, dev.interfaces.length);
    return dev.interfaces[0];
  }

  function makeLink(a, b, ifaceA, ifaceB) {
    return {
      id: uid('l'),
      a: a.id, b: b.id,
      ifaceA: ifaceA ? ifaceA.id : null,
      ifaceB: ifaceB ? ifaceB.id : null,
      medium: (a.wireless || b.wireless) ? 'wifi' : 'copper',
      up: true
    };
  }

  function defaultName(net, type) {
    const def = NS.TYPES[type];
    let n = 1;
    const base = def.label;
    const taken = new Set(net.devices.map(d => d.name));
    while (taken.has(base + ' ' + n)) n++;
    return base + ' ' + n;
  }

  function createNet() {
    return { devices: [], links: [], vlans: {}, meta: { name: 'Nouveau réseau' } };
  }

  function getDevice(net, id) { return net.devices.find(d => d.id === id) || null; }
  function getIface(dev, id) { return dev.interfaces.find(f => f.id === id) || null; }

  function linksOf(net, devId) {
    return net.links.filter(l => l.a === devId || l.b === devId);
  }

  function neighborEnd(net, link, devId) {
    const otherId = link.a === devId ? link.b : link.a;
    const otherIf = link.a === devId ? link.ifaceB : link.ifaceA;
    return { device: getDevice(net, otherId), ifaceId: otherIf };
  }

  function removeDevice(net, id) {
    net.links = net.links.filter(l => l.a !== id && l.b !== id);
    net.devices = net.devices.filter(d => d.id !== id);
  }

  function removeLink(net, id) {
    const link = net.links.find(l => l.id === id);
    if (!link) return;
    // Free the grown router interfaces at both ends.
    [[link.a, link.ifaceA], [link.b, link.ifaceB]].forEach(([devId, ifId]) => {
      const dev = getDevice(net, devId);
      if (dev && dev.kind === 'router' && ifId) {
        dev.interfaces = dev.interfaces.filter(f => f.id !== ifId);
      }
    });
    net.links = net.links.filter(l => l.id !== id);
  }

  function connect(net, a, b) {
    if (a.id === b.id) return { ok: false, error: 'Impossible de relier un appareil à lui-même.' };
    const dup = net.links.find(l =>
      (l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id));
    if (dup) return { ok: false, error: 'Ces deux appareils sont déjà reliés.' };
    const ifaceA = ensurePort(a);
    const ifaceB = ensurePort(b);
    const link = makeLink(a, b, ifaceA, ifaceB);
    net.links.push(link);
    return { ok: true, link };
  }

  // Serialisation for save / load (strip transient runtime flags).
  function serialize(net) {
    const copy = clone(net);
    copy.devices.forEach(d => { delete d.compromised; });
    return { version: 2, net: copy };
  }

  function deserialize(data) {
    if (!data || !data.net || !Array.isArray(data.net.devices)) return null;
    const net = data.net;
    net.devices.forEach(d => {
      d.interfaces.forEach(f => NS.bumpMac(f.mac));
      if (d.compromised === undefined) d.compromised = false;
    });
    net.vlans = net.vlans || {};
    net.meta = net.meta || { name: 'Réseau importé' };
    return net;
  }

  NS.model = {
    makeDevice, addInterface, ensurePort, makeLink, defaultName,
    createNet, getDevice, getIface, linksOf, neighborEnd,
    removeDevice, removeLink, connect, serialize, deserialize
  };
})();
