/* Network Sim — shared helpers (IPv4 maths, ids, escaping). */
(() => {
  'use strict';

  const NS = window.NS = window.NS || {};

  const ip = {
    parse(text) {
      if (typeof text !== 'string') return null;
      const parts = text.trim().split('.');
      if (parts.length !== 4) return null;
      let value = 0;
      for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return null;
        const n = Number(part);
        if (n > 255) return null;
        value = value * 256 + n;
      }
      return value >>> 0;
    },
    str(value) {
      return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
    },
    valid(text) { return ip.parse(text) !== null; },
    mask(prefix) {
      return prefix <= 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    },
    maskStr(prefix) { return ip.str(ip.mask(prefix)); },
    network(addr, prefix) {
      const a = typeof addr === 'string' ? ip.parse(addr) : addr;
      return (a & ip.mask(prefix)) >>> 0;
    },
    sameNet(a, b, prefix) {
      const x = ip.parse(a), y = ip.parse(b);
      if (x === null || y === null) return false;
      return ip.network(x, prefix) === ip.network(y, prefix);
    },
    cidr(addr, prefix) { return ip.str(ip.network(addr, prefix)) + '/' + prefix; },
    // "any", "10.0.0.0/24" or a single address.
    inCidr(addr, cidr) {
      if (!cidr || cidr === 'any') return true;
      const [base, p] = cidr.split('/');
      const prefix = p === undefined ? 32 : Number(p);
      const a = ip.parse(addr), b = ip.parse(base);
      if (a === null || b === null || !(prefix >= 0 && prefix <= 32)) return false;
      return ip.network(a, prefix) === ip.network(b, prefix);
    },
    validCidr(cidr) {
      if (cidr === 'any') return true;
      const [base, p] = String(cidr).split('/');
      if (!ip.valid(base)) return false;
      if (p === undefined) return true;
      return /^\d{1,2}$/.test(p) && Number(p) <= 32;
    },
    isPrivate(text) {
      return ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'].some(c => ip.inCidr(text, c));
    },
    hostCount(prefix) { return prefix >= 31 ? 0 : Math.pow(2, 32 - prefix) - 2; },
    BROADCAST: '255.255.255.255',
    ZERO: '0.0.0.0'
  };

  let macCounter = 0x10;
  function newMac() {
    macCounter += 1;
    const n = macCounter;
    const bytes = [0x02, 0x4e, 0x53, (n >> 16) & 255, (n >> 8) & 255, n & 255];
    return bytes.map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
  }
  // Loaded topologies keep their MACs: never hand out one already in use.
  function bumpMac(mac) {
    const parts = String(mac).split(':').map(h => parseInt(h, 16));
    if (parts.length !== 6 || parts.some(Number.isNaN)) return;
    const n = (parts[3] << 16) | (parts[4] << 8) | parts[5];
    if (n > macCounter) macCounter = n;
  }

  let idCounter = 0;
  function uid(prefix) {
    idCounter += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + idCounter.toString(36);
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clone(value) {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };

  NS.ip = ip;
  NS.newMac = newMac;
  NS.bumpMac = bumpMac;
  NS.uid = uid;
  NS.esc = esc;
  NS.clone = clone;
  NS.storage = storage;
})();
