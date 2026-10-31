/* Network Sim — simulation engine.
   Resolves addressing (DHCP), L2 (ARP + switch learning), L3 (routing, NAT),
   name resolution (DNS), transport (TCP handshake) and firewall filtering.
   Everything is deterministic and step-logged so the UI can animate it. */
(() => {
  'use strict';

  const NS = window.NS;
  const { ip, model } = NS;

  // ───────────── addressing (DHCP + static) ─────────────
  // Assigns IPs to every host interface set to dhcp, from the nearest router
  // with a DHCP pool on the same L2 segment. Returns a list of leases granted.
  function applyAddressing(net) {
    const leases = [];
    const segments = computeSegments(net);
    for (const seg of segments) {
      const serverIf = seg.ifaces.find(e =>
        e.device.kind === 'router' && e.device.dhcp && e.device.dhcp.enabled &&
        e.iface.ip && getDhcpFor(e.device, e.iface));
      if (!serverIf) continue;
      const pool = getDhcpFor(serverIf.device, serverIf.iface);
      const used = new Set(seg.ifaces.map(e => e.iface.ip).filter(Boolean));
      used.add(pool.gateway || serverIf.iface.ip);
      let cursor = ip.parse(pool.start);
      const end = ip.parse(pool.end);
      for (const e of seg.ifaces) {
        if (e.device.kind !== 'host' || !e.iface.dhcp) continue;
        if (e.iface.ip) continue;
        while (cursor <= end && used.has(ip.str(cursor))) cursor++;
        if (cursor > end) { leases.push({ device: e.device, error: 'pool DHCP épuisé' }); continue; }
        const addr = ip.str(cursor);
        used.add(addr);
        e.iface.ip = addr;
        e.iface.prefix = pool.prefix;
        if (!e.device.gateway) e.device.gateway = pool.gateway || serverIf.iface.ip;
        if (!e.device.dns) e.device.dns = pool.dns || pool.gateway || serverIf.iface.ip;
        leases.push({ device: e.device, ip: addr, gateway: e.device.gateway, dns: e.device.dns });
      }
    }
    return leases;
  }

  function getDhcpFor(router, iface) {
    if (!router.dhcp || !router.dhcp.enabled) return null;
    if (router.dhcp.ifaceId && router.dhcp.ifaceId !== iface.id) return null;
    if (!router.dhcp.start || !router.dhcp.end) return null;
    return {
      start: router.dhcp.start, end: router.dhcp.end,
      prefix: router.dhcp.prefix || iface.prefix,
      gateway: router.dhcp.gateway || iface.ip,
      dns: router.dhcp.dns
    };
  }

  // ───────────── L2 segments (switch flooding domain) ─────────────
  // A segment is the set of IP interfaces reachable without crossing a router.
  // Switches/APs are transparent; routers are boundaries.
  function computeSegments(net) {
    const segments = [];
    const seenLink = new Set();
    for (const link of net.links) {
      if (seenLink.has(link.id) || !link.up) continue;
      const ifaces = [];
      const queue = [link];
      const visitedLinks = new Set();
      while (queue.length) {
        const l = queue.shift();
        if (visitedLinks.has(l.id) || !l.up) continue;
        visitedLinks.add(l.id);
        seenLink.add(l.id);
        for (const [devId, ifId] of [[l.a, l.ifaceA], [l.b, l.ifaceB]]) {
          const dev = model.getDevice(net, devId);
          if (!dev) continue;
          if (dev.kind === 'l2') {
            // transparent: follow all its other links
            model.linksOf(net, devId).forEach(nl => { if (!visitedLinks.has(nl.id)) queue.push(nl); });
          } else {
            const iface = model.getIface(dev, ifId);
            if (iface) ifaces.push({ device: dev, iface });
          }
        }
      }
      if (ifaces.length) segments.push({ ifaces });
    }
    return segments;
  }

  // Which segment holds this interface (for ARP / same-subnet checks).
  function segmentOf(net, dev, iface) {
    return computeSegments(net).find(s => s.ifaces.some(e => e.iface.id === iface.id)) || null;
  }

  // ───────────── host interface lookup ─────────────
  function primaryIface(dev) {
    return dev.interfaces.find(f => f.ip) || dev.interfaces[0] || null;
  }

  function findByIp(net, addr) {
    for (const dev of net.devices) {
      for (const iface of dev.interfaces) {
        if (iface.ip === addr) return { device: dev, iface };
      }
    }
    return null;
  }

  // ───────────── routing decision at a router ─────────────
  // Returns the egress interface + next-hop IP, or null if unroutable.
  function routeLookup(net, router, destIp) {
    // directly connected?
    for (const iface of router.interfaces) {
      if (iface.ip && ip.sameNet(iface.ip, destIp, iface.prefix)) {
        return { iface, nextHop: destIp, connected: true };
      }
    }
    // static routes (longest prefix first)
    const sorted = router.routes.slice().sort((a, b) => prefixLen(b.cidr) - prefixLen(a.cidr));
    for (const r of sorted) {
      if (ip.inCidr(destIp, r.cidr)) {
        const egress = router.interfaces.find(f => f.ip && ip.sameNet(f.ip, r.via, f.prefix));
        if (egress) return { iface: egress, nextHop: r.via, via: r.via };
      }
    }
    // default gateway (router uplink)
    if (router.gateway) {
      const egress = router.interfaces.find(f => f.ip && ip.sameNet(f.ip, router.gateway, f.prefix));
      if (egress) return { iface: egress, nextHop: router.gateway, def: true };
    }
    return null;
  }

  function prefixLen(cidr) {
    const p = String(cidr).split('/')[1];
    return p === undefined ? 32 : Number(p);
  }

  // ───────────── end-to-end path with full trace ─────────────
  // Produces a hop-by-hop trace of a packet from src host to a destination IP,
  // honouring ARP, switching, routing, NAT and firewall rules.
  // Returns { ok, hops:[...], delivered, blockedBy, reason, natApplied }.
  function tracePath(net, srcDev, destIp, opts) {
    opts = opts || {};
    const hops = [];
    const srcIf = primaryIface(srcDev);
    if (!srcIf || !srcIf.ip) return fail(hops, 'La source n\'a pas d\'adresse IP.');

    let current = { device: srcDev, iface: srcIf };
    let effectiveSrc = srcIf.ip;      // changes when a NAT router rewrites it
    const natStack = [];
    let guard = 0;

    // Resolve first hop: same subnet → direct; else via gateway.
    while (guard++ < 64) {
      const dev = current.device;
      const iface = current.iface;
      hops.push({ device: dev, iface, arrivedWith: effectiveSrc });

      // delivered?
      if (iface.ip === destIp || (dev.kind === 'host' && dev.interfaces.some(f => f.ip === destIp))) {
        return { ok: true, delivered: true, hops, natApplied: natStack.length > 0, dest: { device: dev, iface } };
      }

      // On a host (source or intermediate that is not a router): must reach gateway.
      if (dev.kind === 'host') {
        const sameLink = sameSegmentHost(net, dev, iface, destIp);
        if (sameLink) {
          const arp = resolveArp(net, dev, iface, destIp);
          if (!arp.ok) return fail(hops, 'ARP sans réponse pour ' + destIp + ' (hôte absent du réseau local).');
          current = arp.target;
          continue;
        }
        // need a gateway
        if (!dev.gateway) return fail(hops, dev.name + ' n\'a pas de passerelle configurée.');
        const gw = resolveArp(net, dev, iface, dev.gateway);
        if (!gw.ok) return fail(hops, 'Passerelle ' + dev.gateway + ' injoignable (ARP).');
        current = gw.target;
        continue;
      }

      // Router / firewall: filter, maybe NAT, then route.
      if (dev.kind === 'router') {
        if (dev.type === 'firewall') {
          const verdict = firewallCheck(dev, effectiveSrc, destIp, opts);
          if (!verdict.allow) {
            return { ok: true, delivered: false, hops, blockedBy: dev, reason: verdict.reason };
          }
        }
        const route = routeLookup(net, dev, destIp);
        if (!route) return fail(hops, dev.name + ' ne sait pas router vers ' + destIp + '.');
        if (dev.nat && route.def && ip.isPrivate(effectiveSrc) && !ip.isPrivate(destIp)) {
          natStack.push({ router: dev, original: effectiveSrc });
          effectiveSrc = route.iface.ip;   // masquerade behind uplink IP
        }
        const nh = resolveArp(net, dev, route.iface, route.nextHop);
        if (!nh.ok) return fail(hops, 'Prochain saut ' + route.nextHop + ' injoignable depuis ' + dev.name + '.');
        current = nh.target;
        continue;
      }

      return fail(hops, 'Équipement intermédiaire inattendu: ' + dev.name + '.');
    }
    return fail(hops, 'Boucle de routage détectée (TTL dépassé).');
  }

  function fail(hops, reason) { return { ok: false, delivered: false, hops, reason }; }

  function sameSegmentHost(net, dev, iface, destIp) {
    if (!ip.sameNet(iface.ip, destIp, iface.prefix)) return false;
    const seg = segmentOf(net, dev, iface);
    return seg && seg.ifaces.some(e => e.iface.ip === destIp);
  }

  // ARP within the sender's L2 segment: find the interface owning targetIp.
  function resolveArp(net, dev, iface, targetIp) {
    const seg = segmentOf(net, dev, iface);
    if (!seg) return { ok: false };
    const hit = seg.ifaces.find(e => e.iface.ip === targetIp);
    if (!hit) return { ok: false };
    return { ok: true, target: { device: hit.device, iface: hit.iface } };
  }

  // ───────────── firewall ─────────────
  function firewallCheck(fw, srcIp, destIp, opts) {
    const port = opts.port;
    const proto = opts.proto || 'tcp';
    for (const rule of fw.rules) {
      if (!ruleMatches(rule, srcIp, destIp, port, proto)) continue;
      return { allow: rule.action === 'allow', reason: 'Règle pare-feu: ' + describeRule(rule) };
    }
    return {
      allow: fw.defaultPolicy !== 'deny',
      reason: fw.defaultPolicy === 'deny' ? 'Politique par défaut: tout refuser' : ''
    };
  }

  function ruleMatches(rule, srcIp, destIp, port, proto) {
    if (rule.from && !ip.inCidr(srcIp, rule.from)) return false;
    if (rule.to && !ip.inCidr(destIp, rule.to)) return false;
    if (rule.port && Number(rule.port) !== Number(port)) return false;
    if (rule.proto && rule.proto !== 'any' && proto && rule.proto !== proto) return false;
    return true;
  }

  function describeRule(rule) {
    const parts = [rule.action === 'allow' ? 'autoriser' : 'refuser'];
    if (rule.from) parts.push('de ' + rule.from);
    if (rule.to) parts.push('vers ' + rule.to);
    if (rule.port) parts.push('port ' + rule.port);
    return parts.join(' ');
  }

  // ───────────── DNS resolution ─────────────
  function resolveName(net, srcDev, name) {
    const resolverIp = srcDev.dns;
    if (!resolverIp) return { ok: false, reason: 'Aucun serveur DNS configuré sur ' + srcDev.name + '.' };
    // reach the resolver first
    const toResolver = tracePath(net, srcDev, resolverIp, { port: 53, proto: 'udp' });
    if (!toResolver.delivered) return { ok: false, reason: 'Serveur DNS ' + resolverIp + ' injoignable.', trace: toResolver };
    const resolver = toResolver.dest.device;
    if (!resolver.services.includes(53)) return { ok: false, reason: resolver.name + ' n\'est pas un serveur DNS.' };
    const addr = resolver.records[name] || resolver.records[name.toLowerCase()];
    if (!addr) return { ok: false, reason: 'Nom inconnu: ' + name + ' (pas d\'enregistrement DNS).' };
    return { ok: true, ip: addr, resolver, trace: toResolver };
  }

  // ───────────── high-level actions ─────────────
  // ping: ICMP echo there and back.
  function ping(net, srcDev, destIp) {
    const out = tracePath(net, srcDev, destIp, { proto: 'icmp' });
    if (!out.ok) return { ok: false, reason: out.reason };
    if (!out.delivered) return { ok: false, blocked: true, reason: out.reason || 'bloqué', blockedBy: out.blockedBy, hops: out.hops };
    return { ok: true, hops: out.hops, rtt: out.hops.length * 2, natApplied: out.natApplied, dest: out.dest };
  }

  function traceroute(net, srcDev, destIp) {
    const out = tracePath(net, srcDev, destIp, { proto: 'icmp' });
    return { ok: out.ok, delivered: out.delivered, reason: out.reason, hops: out.hops };
  }

  // tcp connect: deliver SYN to a listening service, mirror handshake back.
  function tcpConnect(net, srcDev, destIp, port) {
    const out = tracePath(net, srcDev, destIp, { port, proto: 'tcp' });
    if (!out.ok) return { ok: false, reason: out.reason, hops: out.hops };
    if (!out.delivered) return { ok: false, blocked: true, reason: out.reason, blockedBy: out.blockedBy, hops: out.hops };
    const server = out.dest.device;
    if (!server.services.includes(Number(port))) {
      return { ok: false, refused: true, reason: 'Port ' + port + ' fermé sur ' + server.name + '.', hops: out.hops };
    }
    return { ok: true, hops: out.hops, server, port, service: NS.SERVICES[port], natApplied: out.natApplied };
  }

  // Connect by name: DNS first, then TCP.
  function openService(net, srcDev, host, port) {
    let destIp = host;
    let dns = null;
    if (!ip.valid(host)) {
      dns = resolveName(net, srcDev, host);
      if (!dns.ok) return { ok: false, phase: 'dns', reason: dns.reason };
      destIp = dns.ip;
    }
    const tcp = tcpConnect(net, srcDev, destIp, port);
    return Object.assign({ dns, destIp }, tcp);
  }

  // Validate the whole topology; returns problems to show as badges.
  function validate(net) {
    const problems = [];
    for (const dev of net.devices) {
      if (dev.kind === 'l2') continue;
      for (const iface of dev.interfaces) {
        if (dev.kind === 'host' && !iface.ip && !iface.dhcp)
          problems.push({ device: dev, msg: 'sans adresse IP' });
      }
      if (dev.kind === 'host' && model.linksOf(net, dev.id).length === 0)
        problems.push({ device: dev, msg: 'non relié' });
    }
    // duplicate IPs on one segment
    for (const seg of computeSegments(net)) {
      const byIp = {};
      for (const e of seg.ifaces) {
        if (!e.iface.ip) continue;
        (byIp[e.iface.ip] = byIp[e.iface.ip] || []).push(e.device);
      }
      Object.entries(byIp).forEach(([addr, devs]) => {
        if (devs.length > 1) problems.push({ device: devs[1], msg: 'IP en double: ' + addr });
      });
    }
    return problems;
  }

  NS.engine = {
    applyAddressing, computeSegments, segmentOf, primaryIface, findByIp,
    routeLookup, tracePath, resolveArp, firewallCheck, resolveName,
    ping, traceroute, tcpConnect, openService, validate
  };
})();
