/* ============================================================
   Network Sim — defenses.js
   All defense toggle functions (10 original + 6 new)
   ============================================================ */

// ─────────── Firewall ───────────
function toggleFirewall() {
  activeDefenses.firewall = !activeDefenses.firewall;
  document.querySelector('[data-defense="firewall"]')?.classList.toggle('active', activeDefenses.firewall);
  const state = activeDefenses.firewall ? 'activé' : 'désactivé';
  addLog(activeDefenses.firewall ? 'success' : 'info', '🧱 Firewall ' + state);
  showToast('Firewall ' + state, activeDefenses.firewall ? 'success' : 'info', '🧱 Firewall');
  if (activeDefenses.firewall && activeDefenses.siem) {
    addLog('info', '📊 SIEM: Règles firewall intégrées au monitoring');
  }
}

// ─────────── IDS/IPS ───────────
function toggleIDS() {
  activeDefenses.ids = !activeDefenses.ids;
  document.querySelector('[data-defense="ids"]')?.classList.toggle('active', activeDefenses.ids);
  const state = activeDefenses.ids ? 'activé' : 'désactivé';
  addLog(activeDefenses.ids ? 'success' : 'info', '🔍 IDS/IPS ' + state);
  showToast('IDS/IPS ' + state, activeDefenses.ids ? 'success' : 'info', '🔍 IDS');
  if (activeDefenses.ids) {
    addLog('info', '🔍 IDS détecte : DDoS (90%), Port Scan (85%), Brute Force (80%), Latéral (70%), PrivEsc (75%)');
  }
}

// ─────────── Encryption / TLS ───────────
function toggleEncryption() {
  activeDefenses.encryption = !activeDefenses.encryption;
  document.querySelector('[data-defense="encryption"]')?.classList.toggle('active', activeDefenses.encryption);
  const state = activeDefenses.encryption ? 'activé' : 'désactivé';
  addLog(activeDefenses.encryption ? 'success' : 'info', '🔒 Chiffrement TLS ' + state);
  showToast('TLS ' + state, activeDefenses.encryption ? 'success' : 'info', '🔒 TLS');
}

// ─────────── Rate Limiting ───────────
function toggleRateLimiting() {
  activeDefenses.ratelimit = !activeDefenses.ratelimit;
  document.querySelector('[data-defense="ratelimit"]')?.classList.toggle('active', activeDefenses.ratelimit);
  const state = activeDefenses.ratelimit ? 'activé' : 'désactivé';
  addLog(activeDefenses.ratelimit ? 'success' : 'info', '⏱️ Rate Limiting ' + state);
  showToast('Rate Limiting ' + state, activeDefenses.ratelimit ? 'success' : 'info', '⏱️ Rate Limit');
  if (activeDefenses.ratelimit) {
    addLog('info', '⏱️ Limite: max 100 req/min. Bloque DDoS + SYN Flood');
  }
}

// ─────────── 2FA ───────────
function toggle2FA() {
  activeDefenses['2fa'] = !activeDefenses['2fa'];
  document.querySelector('[data-defense="2fa"]')?.classList.toggle('active', activeDefenses['2fa']);
  const state = activeDefenses['2fa'] ? 'activé' : 'désactivé';
  addLog(activeDefenses['2fa'] ? 'success' : 'info', '📱 2FA ' + state);
  showToast('2FA ' + state, activeDefenses['2fa'] ? 'success' : 'info', '📱 2FA');
}

// ─────────── Anti-Malware ───────────
function toggleAntiMalware() {
  activeDefenses.antimalware = !activeDefenses.antimalware;
  document.querySelector('[data-defense="antimalware"]')?.classList.toggle('active', activeDefenses.antimalware);
  const state = activeDefenses.antimalware ? 'activé' : 'désactivé';
  addLog(activeDefenses.antimalware ? 'success' : 'info', '🦠 Anti-Malware ' + state);
  showToast('Anti-Malware ' + state, activeDefenses.antimalware ? 'success' : 'info', '🦠 Anti-Malware');
}

// ─────────── WAF ───────────
function toggleWAF() {
  activeDefenses.waf = !activeDefenses.waf;
  document.querySelector('[data-defense="waf"]')?.classList.toggle('active', activeDefenses.waf);
  const state = activeDefenses.waf ? 'activé' : 'désactivé';
  addLog(activeDefenses.waf ? 'success' : 'info', '🌐 WAF ' + state);
  showToast('WAF ' + state, activeDefenses.waf ? 'success' : 'info', '🌐 WAF');
  if (activeDefenses.waf) {
    addLog('info', '🌐 WAF protège contre : SQL Injection, XSS');
  }
}

// ─────────── Patch Management ───────────
function togglePatchMgmt() {
  activeDefenses.patchmgmt = !activeDefenses.patchmgmt;
  document.querySelector('[data-defense="patchmgmt"]')?.classList.toggle('active', activeDefenses.patchmgmt);
  const state = activeDefenses.patchmgmt ? 'activé' : 'désactivé';
  addLog(activeDefenses.patchmgmt ? 'success' : 'info', '📦 Patch Management ' + state);
  showToast('Patch Management ' + state, activeDefenses.patchmgmt ? 'success' : 'info', '📦 Patch');
}

// ─────────── Account Lockout ───────────
function toggleAccountLockout() {
  activeDefenses.accountlockout = !activeDefenses.accountlockout;
  document.querySelector('[data-defense="accountlockout"]')?.classList.toggle('active', activeDefenses.accountlockout);
  const state = activeDefenses.accountlockout ? 'activé' : 'désactivé';
  addLog(activeDefenses.accountlockout ? 'success' : 'info', '🔒 Account Lockout ' + state);
  showToast('Account Lockout ' + state, activeDefenses.accountlockout ? 'success' : 'info', '🔒 Lockout');
}

// ─────────── VPN ───────────
function toggleVPN() {
  startActionMode('vpn', '🔐', 'Tunnel VPN');
}

// ═══════════════════════════════════════════
//  NEW DEFENSES
// ═══════════════════════════════════════════

// ─────────── DNSSEC ───────────
function toggleDNSSEC() {
  activeDefenses.dnssec = !activeDefenses.dnssec;
  document.querySelector('[data-defense="dnssec"]')?.classList.toggle('active', activeDefenses.dnssec);
  const state = activeDefenses.dnssec ? 'activé' : 'désactivé';
  addLog(activeDefenses.dnssec ? 'success' : 'info', '🔐 DNSSEC ' + state);
  showToast('DNSSEC ' + state, activeDefenses.dnssec ? 'success' : 'info', '🔐 DNSSEC');
  if (activeDefenses.dnssec) {
    addLog('info', '🔐 DNSSEC valide les réponses DNS — protège contre DNS Spoofing');
    if (activeAttacks.dnsspoof) {
      addLog('success', '🔐 DNSSEC: Le DNS Spoofing actif est maintenant détecté et rejeté');
    }
  }
}

// ─────────── SYN Cookies ───────────
function toggleSYNCookies() {
  activeDefenses.syncookies = !activeDefenses.syncookies;
  document.querySelector('[data-defense="syncookies"]')?.classList.toggle('active', activeDefenses.syncookies);
  const state = activeDefenses.syncookies ? 'activé' : 'désactivé';
  addLog(activeDefenses.syncookies ? 'success' : 'info', '🍪 SYN Cookies ' + state);
  showToast('SYN Cookies ' + state, activeDefenses.syncookies ? 'success' : 'info', '🍪 SYN Cookies');
  if (activeDefenses.syncookies) {
    addLog('info', '🍪 SYN Cookies: Pas de mémoire allouée avant handshake complet');
    if (activeAttacks.synflood) {
      addLog('success', '🍪 SYN Cookies absorbe le SYN Flood actif!');
      showToast('SYN Cookies atténue le flood!', 'success');
    }
  }
}

// ─────────── Dynamic ARP Inspection ───────────
function toggleDAI() {
  activeDefenses.dai = !activeDefenses.dai;
  document.querySelector('[data-defense="dai"]')?.classList.toggle('active', activeDefenses.dai);
  const state = activeDefenses.dai ? 'activé' : 'désactivé';
  addLog(activeDefenses.dai ? 'success' : 'info', '🔎 Dynamic ARP Inspection ' + state);
  showToast('DAI ' + state, activeDefenses.dai ? 'success' : 'info', '🔎 DAI');
  if (activeDefenses.dai) {
    addLog('info', '🔎 DAI compare les paquets ARP avec la table DHCP snooping');
    if (activeAttacks.arp) {
      addLog('success', '🔎 DAI: ARP Poisoning actif est maintenant bloqué!');
      stopARPPoisoning();
    }
  }
}

// ─────────── Network Segmentation ───────────
function toggleSegmentation() {
  activeDefenses.segmentation = !activeDefenses.segmentation;
  document.querySelector('[data-defense="segmentation"]')?.classList.toggle('active', activeDefenses.segmentation);
  const state = activeDefenses.segmentation ? 'activé' : 'désactivé';
  addLog(activeDefenses.segmentation ? 'success' : 'info', '🔀 Segmentation Réseau ' + state);
  showToast('Segmentation ' + state, activeDefenses.segmentation ? 'success' : 'info', '🔀 Segmentation');
  if (activeDefenses.segmentation) {
    addLog('info', '🔀 Segmentation: Mouvement latéral entre zones bloqué, VLAN isolation activée');
  }
}

// ─────────── SIEM Rules ───────────
function toggleSIEMRules() {
  activeDefenses.siem = !activeDefenses.siem;
  document.querySelector('[data-defense="siem"]')?.classList.toggle('active', activeDefenses.siem);
  const state = activeDefenses.siem ? 'activé' : 'désactivé';
  addLog(activeDefenses.siem ? 'success' : 'info', '📊 SIEM ' + state);
  showToast('SIEM ' + state, activeDefenses.siem ? 'success' : 'info', '📊 SIEM');
  if (activeDefenses.siem) {
    addLog('info', '📊 SIEM corrèle logs firewall, IDS, auth — alertes centralisées');
    const siemNode = nodes.find(n => n.type === 'siem');
    if (siemNode) {
      addLog('info', '📊 SIEM connecté au noeud ' + siemNode.name);
    }
  }
}

// ─────────── User Training ───────────
function toggleUserTraining() {
  activeDefenses.usertraining = !activeDefenses.usertraining;
  document.querySelector('[data-defense="usertraining"]')?.classList.toggle('active', activeDefenses.usertraining);
  const state = activeDefenses.usertraining ? 'activé' : 'désactivé';
  addLog(activeDefenses.usertraining ? 'success' : 'info', '🏫 Formation Utilisateur ' + state);
  showToast('Formation Utilisateur ' + state, activeDefenses.usertraining ? 'success' : 'info', '🏫 Formation');
  if (activeDefenses.usertraining) {
    addLog('info', '🏫 Utilisateurs formés : détectent phishing, social engineering, evil twin');
  }
}

// ─────────── Toggle all defenses ───────────
function activateAllDefenses() {
  Object.keys(activeDefenses).forEach(k => { activeDefenses[k] = true; });
  document.querySelectorAll('.defense-btn').forEach(b => b.classList.add('active'));
  addLog('success', '🛡️ Toutes les défenses activées');
  showToast('Toutes les défenses activées', 'success', '🛡️ Défenses');
}

function deactivateAllDefenses() {
  Object.keys(activeDefenses).forEach(k => { activeDefenses[k] = false; });
  document.querySelectorAll('.defense-btn').forEach(b => b.classList.remove('active'));
  addLog('info', '⚠️ Toutes les défenses désactivées');
  showToast('Toutes les défenses désactivées', 'warning', '⚠️ Sans protection');
}
