/* ============================================================
   Network Sim — scenarios.js
   All scenario definitions (21 original + 2 new)
   ============================================================ */

function loadScenario(scenario) {
  // ── Clean-up ──
  document.querySelectorAll('.html-node').forEach(el => el.remove());
  document.querySelectorAll('.progress-bar-container').forEach(el => el.remove());
  document.querySelectorAll('.detail-popup').forEach(el => el.remove());

  nodes = []; connections = []; packets = []; packetCounter = 0; particles = [];
  zones = []; vpnTunnels = [];
  viewportX = 0; viewportY = 0; zoomLevel = 1;
  Object.keys(activeAttacks).forEach(k => { activeAttacks[k] = false; clearInterval(activeAttacks[k + 'Interval']); });
  Object.keys(activeDefenses).forEach(k => activeDefenses[k] = false);
  document.querySelectorAll('.attack-btn, .defense-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('attackStatus').style.display = 'none';
  cancelActionMode();
  clearLogs();

  // ── Select scenario ──
  const loader = scenarioDefinitions[scenario];
  if (loader) loader();
  else { addLog('warning', 'Scénario inconnu: ' + scenario); return; }

  // ── Switch to simulation tab ──
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="simulation"]')?.classList.add('active');
  currentTab = 'simulation';
  document.getElementById('canvasContainer').style.display = 'block';
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('learnPanel')?.classList.remove('visible');
  document.getElementById('scenariosPanel')?.classList.remove('visible');
  updateStatusBar();
}

/* ─── helper: connect nodes after microtask so DOM settles ─── */
function afterCreate(fn) { setTimeout(fn, 100); }

/* ════════════════════════════════════════════════════════════
   SCENARIO REGISTRY
   ════════════════════════════════════════════════════════════ */
const scenarioDefinitions = {

  /* ──────── Réseau Basique ──────── */
  'basic': function () {
    createNode('computer', 150, 250); createNode('router', 400, 250); createNode('server', 650, 250);
    afterCreate(() => { createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); });
    addLog('success', 'Scénario "Réseau basique" chargé');
    addLog('info', 'Essayez Ping, Traceroute, HTTP');
  },

  /* ──────── DDoS ──────── */
  'ddos': function () {
    createNode('attacker', 100, 150); createNode('attacker', 100, 350); createNode('router', 300, 250);
    createNode('firewall', 500, 250); createNode('server', 700, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[2]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[3], nodes[4]);
    });
    addLog('success', 'Scénario "DDoS" chargé');
    addLog('info', '1. Lancez DDoS  2. Activez Firewall');
  },

  /* ──────── MITM ──────── */
  'mitm': function () {
    createNode('computer', 100, 250);
    createNode('mitm', 300, 250);
    createNode('router', 500, 250);
    createNode('vpngateway', 500, 380);
    createNode('server', 700, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]);
      createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[4]);
      createConnection(nodes[0], nodes[3]);
      createConnection(nodes[3], nodes[2]);
    });
    addLog('success', 'Scénario "MITM" chargé');
    addLog('info', '1. Activez MITM 2. Envoyez email depuis PC vers Serveur');
    addLog('info', '3. L\'email est intercepté! 😱');
    addLog('info', '💡 Pour contrer: Créez un tunnel VPN (PC → VPN Gateway)');
  },

  /* ──────── Réseau Sécurisé ──────── */
  'secure': function () {
    createNode('computer', 100, 200); createNode('computer', 100, 350); createNode('switch', 250, 275);
    createNode('firewall', 400, 275); createNode('router', 550, 275);
    createNode('server', 700, 200); createNode('dns', 700, 350);
    afterCreate(() => {
      createConnection(nodes[0], nodes[2]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[3], nodes[4]);
      createConnection(nodes[4], nodes[5]); createConnection(nodes[4], nodes[6]);
      toggleFirewall(); toggleEncryption(); toggleIDS();
    });
    addLog('success', 'Scénario "Sécurisé" chargé');
  },

  /* ──────── Entreprise ──────── */
  'enterprise': function () {
    createNode('computer', 80, 150); createNode('computer', 80, 300); createNode('computer', 80, 450);
    createNode('switch', 200, 300); createNode('firewall', 350, 300); createNode('router', 500, 300);
    createNode('firewall', 650, 200); createNode('server', 780, 150); createNode('server', 780, 250);
    createNode('dns', 650, 400);
    afterCreate(() => {
      createConnection(nodes[0], nodes[3]); createConnection(nodes[1], nodes[3]); createConnection(nodes[2], nodes[3]);
      createConnection(nodes[3], nodes[4]); createConnection(nodes[4], nodes[5]);
      createConnection(nodes[5], nodes[6]); createConnection(nodes[6], nodes[7]); createConnection(nodes[6], nodes[8]);
      createConnection(nodes[5], nodes[9]);
    });
    addLog('success', 'Scénario "Entreprise" chargé');
  },

  /* ──────── DNS Spoofing ──────── */
  'dnsspoof': function () {
    createNode('computer', 100, 250); createNode('attacker', 300, 150);
    createNode('dns', 300, 350); createNode('router', 500, 250); createNode('server', 700, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[3]); createConnection(nodes[1], nodes[3]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[3], nodes[4]);
    });
    addLog('success', 'Scénario "DNS Spoofing" chargé');
    addLog('info', '1. Requête DNS  2. Activez DNS Spoofing  3. Refaites');
  },

  /* ──────── Datacenter Cloud ──────── */
  'datacenter': function () {
    createNode('internet', 100, 250); createNode('loadbalancer', 280, 250);
    createNode('server', 450, 120); createNode('server', 450, 250); createNode('server', 450, 380);
    createNode('database', 620, 185); createNode('database', 620, 315); createNode('cloud', 780, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[1], nodes[3]); createConnection(nodes[1], nodes[4]);
      createConnection(nodes[2], nodes[5]); createConnection(nodes[3], nodes[5]);
      createConnection(nodes[3], nodes[6]); createConnection(nodes[4], nodes[6]);
      createConnection(nodes[5], nodes[7]); createConnection(nodes[6], nodes[7]);
    });
    addLog('success', 'Scénario "Datacenter Cloud" chargé');
    addLog('info', 'Architecture cloud avec load balancing et réplication');
    showToast('Infrastructure cloud avec haute disponibilité', 'info', '☁️ Datacenter');
  },

  /* ──────── IoT Network ──────── */
  'iot-network': function () {
    createNode('router', 400, 200); createNode('iot', 200, 100); createNode('iot', 600, 100);
    createNode('iot', 200, 300); createNode('phone', 600, 300); createNode('printer', 400, 380);
    createNode('attacker', 100, 200);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[0], nodes[2]); createConnection(nodes[0], nodes[3]);
      createConnection(nodes[0], nodes[4]); createConnection(nodes[0], nodes[5]); createConnection(nodes[6], nodes[0]);
    });
    addLog('success', 'Scénario "Réseau IoT" chargé');
    addLog('danger', '⚠️ Réseau IoT vulnérable - ports ouverts, pas de chiffrement');
    showToast('Réseau IoT avec équipements vulnérables', 'warning', '📟 IoT');
  },

  /* ──────── Réseau domestique ──────── */
  'home-network': function () {
    createNode('internet', 100, 250); createNode('router', 280, 250);
    createNode('computer', 450, 120); createNode('phone', 450, 250);
    createNode('phone', 450, 380); createNode('iot', 600, 180); createNode('printer', 600, 320);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[1], nodes[3]); createConnection(nodes[1], nodes[4]);
      createConnection(nodes[1], nodes[5]); createConnection(nodes[1], nodes[6]);
    });
    addLog('success', 'Scénario "Réseau domestique" chargé');
    addLog('info', 'Réseau typique avec box internet et appareils connectés');
    showToast('Réseau domestique - testez la sécurité de votre maison', 'info', '🏠 Home');
  },

  /* ──────── Phishing ──────── */
  'phishing-scenario': function () {
    createNode('attacker', 80, 250); createNode('internet', 220, 250); createNode('server', 360, 180);
    createNode('router', 500, 250);
    createNode('computer', 650, 150); createNode('computer', 650, 250); createNode('computer', 650, 350);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); createConnection(nodes[1], nodes[3]);
      createConnection(nodes[3], nodes[4]); createConnection(nodes[3], nodes[5]); createConnection(nodes[3], nodes[6]);
    });
    addLog('success', 'Scénario "Campagne Phishing" chargé');
    addLog('attack', '🎣 L\'attaquant envoie des emails malveillants aux employés');
    addLog('info', '1. Lancez Phishing  2. Activez 2FA pour protéger');
    showToast('Campagne de phishing ciblée', 'warning', '🎣 Phishing');
  },

  /* ──────── Ransomware ──────── */
  'ransomware-scenario': function () {
    createNode('attacker', 80, 300); createNode('internet', 200, 300); createNode('firewall', 340, 300);
    createNode('switch', 480, 300);
    createNode('computer', 620, 150); createNode('computer', 620, 250); createNode('computer', 620, 350);
    createNode('server', 760, 200); createNode('database', 760, 380);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); createConnection(nodes[2], nodes[3]);
      createConnection(nodes[3], nodes[4]); createConnection(nodes[3], nodes[5]); createConnection(nodes[3], nodes[6]);
      createConnection(nodes[3], nodes[7]); createConnection(nodes[7], nodes[8]);
    });
    addLog('success', 'Scénario "Attaque Ransomware" chargé');
    addLog('attack', '💀 Le ransomware se propage latéralement');
    addLog('info', '1. Lancez Ransomware  2. Activez Anti-Malware');
    showToast('Simulation de propagation ransomware', 'error', '💀 Ransomware');
  },

  /* ──────── Zero Trust ──────── */
  'zero-trust': function () {
    createNode('vpngateway', 150, 250); createNode('firewall', 300, 250); createNode('loadbalancer', 450, 250);
    createNode('server', 600, 150); createNode('server', 600, 350); createNode('database', 750, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[2], nodes[4]);
      createConnection(nodes[3], nodes[5]); createConnection(nodes[4], nodes[5]);
      toggleFirewall(); toggleEncryption(); toggleIDS(); toggle2FA();
    });
    addLog('success', 'Scénario "Zero Trust" chargé');
    addLog('info', '🔒 Architecture sans confiance implicite - tout est vérifié');
    showToast('Zero Trust: ne jamais faire confiance, toujours vérifier', 'success', '🔐 Zero Trust');
  },

  /* ──────── SQL Injection ──────── */
  'sql-injection': function () {
    createNode('attacker', 100, 250); createNode('internet', 250, 250); createNode('firewall', 400, 250);
    createNode('server', 550, 250); createNode('database', 700, 250);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[3], nodes[4]);
    });
    addLog('success', 'Scénario "SQL Injection" chargé');
    addLog('attack', '💉 Application web vulnérable aux injections SQL');
    addLog('info', '1. Lancez SQL Injection  2. Activez WAF pour bloquer');
    showToast('Application vulnérable - testez les injections', 'warning', '💉 SQLi');
  },

  /* ──────── Cloud Hybride ──────── */
  'hybrid-cloud': function () {
    createNode('enterprise', 100, 200); createNode('firewall', 250, 200); createNode('router', 400, 200);
    createNode('internet', 400, 350);
    createNode('cloud', 550, 200); createNode('loadbalancer', 700, 150);
    createNode('server', 850, 100); createNode('server', 850, 200); createNode('database', 700, 280);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); createConnection(nodes[2], nodes[3]);
      createConnection(nodes[2], nodes[4]); createConnection(nodes[4], nodes[5]); createConnection(nodes[5], nodes[6]);
      createConnection(nodes[5], nodes[7]); createConnection(nodes[4], nodes[8]);
      toggleEncryption();
    });
    addLog('success', 'Scénario "Cloud Hybride" chargé');
    addLog('info', '☁️ Infrastructure mixte on-premise et cloud public');
    showToast('Architecture hybride avec VPN site-to-cloud', 'info', '☁️ Hybrid');
  },

  /* ──────── Hôpital ──────── */
  'hospital': function () {
    createNode('internet', 50, 250); createNode('firewall', 180, 250); createNode('router', 320, 250);
    createNode('switch', 460, 150); createNode('switch', 460, 350);
    createNode('server', 600, 80); createNode('database', 720, 150); createNode('computer', 600, 220);
    createNode('iot', 600, 320); createNode('iot', 600, 400); createNode('printer', 720, 350);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[2], nodes[4]);
      createConnection(nodes[3], nodes[5]); createConnection(nodes[3], nodes[6]); createConnection(nodes[3], nodes[7]);
      createConnection(nodes[4], nodes[8]); createConnection(nodes[4], nodes[9]); createConnection(nodes[4], nodes[10]);
      toggleFirewall(); toggleEncryption();
    });
    addLog('success', 'Scénario "Réseau Hôpital" chargé');
    addLog('danger', '🏥 Infrastructure critique - équipements médicaux connectés');
    addLog('info', 'Les IoT représentent les appareils médicaux (scanners, pompes)');
    showToast('Réseau hospitalier - protégez les vies!', 'warning', '🏥 Hôpital');
  },

  /* ──────── SCADA ──────── */
  'scada': function () {
    createNode('internet', 80, 200); createNode('firewall', 200, 200); createNode('router', 340, 200);
    createNode('server', 480, 120); createNode('computer', 480, 280);
    createNode('iot', 620, 80); createNode('iot', 620, 160); createNode('iot', 620, 240); createNode('iot', 620, 320);
    createNode('attacker', 80, 350);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[2], nodes[4]);
      createConnection(nodes[3], nodes[5]); createConnection(nodes[3], nodes[6]);
      createConnection(nodes[4], nodes[7]); createConnection(nodes[4], nodes[8]);
      createConnection(nodes[9], nodes[0]);
      toggleFirewall();
    });
    addLog('success', 'Scénario "SCADA Industriel" chargé');
    addLog('danger', '⚙️ Réseau OT/IT - automates industriels vulnérables');
    addLog('warning', 'Les IoT sont des PLCs contrôlant des processus physiques');
    showToast('Infrastructure industrielle critique', 'error', '⚙️ SCADA');
  },

  /* ──────── Banque ──────── */
  'bank': function () {
    createNode('internet', 80, 250); createNode('firewall', 200, 250); createNode('loadbalancer', 340, 250);
    createNode('server', 480, 150); createNode('server', 480, 350);
    createNode('firewall', 620, 250); createNode('database', 760, 180); createNode('database', 760, 320);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]);
      createConnection(nodes[2], nodes[3]); createConnection(nodes[2], nodes[4]);
      createConnection(nodes[3], nodes[5]); createConnection(nodes[4], nodes[5]);
      createConnection(nodes[5], nodes[6]); createConnection(nodes[5], nodes[7]);
      toggleFirewall(); toggleIDS(); toggleEncryption(); toggle2FA(); toggleWAF();
    });
    addLog('success', 'Scénario "Infrastructure Bancaire" chargé');
    addLog('info', '🏦 Architecture PCI-DSS avec segmentation stricte');
    showToast('Infrastructure financière haute sécurité', 'success', '🏦 Banque');
  },

  /* ──────── VPN Télétravail ──────── */
  'vpn-remote': function () {
    createNode('computer', 80, 150);
    createNode('phone', 80, 350);
    createNode('mitm', 250, 180);
    createNode('internet', 250, 320);
    createNode('vpngateway', 420, 250);
    createNode('firewall', 570, 250);
    createNode('router', 700, 250);
    createNode('server', 850, 180);
    createNode('server', 850, 320);
    afterCreate(() => {
      createConnection(nodes[0], nodes[2]);
      createConnection(nodes[2], nodes[4]);
      createConnection(nodes[1], nodes[3]);
      createConnection(nodes[3], nodes[4]);
      createConnection(nodes[4], nodes[5]); createConnection(nodes[5], nodes[6]);
      createConnection(nodes[6], nodes[7]); createConnection(nodes[6], nodes[8]);
      setTimeout(() => {
        const pc = nodes[0], vpnGw = nodes[4];
        const tunnel = { id: generateId(), client: pc, gateway: vpnGw, path: findPath(pc, vpnGw), color: '#15803d' };
        vpnTunnels.push(tunnel);
        activeDefenses.vpn = true;
        document.querySelector('[data-defense="vpn"]')?.classList.add('active');
        addLog('success', '🔐 Tunnel VPN établi: ' + pc.name + ' ↔ ' + vpnGw.name);
      }, 200);
      toggleEncryption(); toggle2FA();
    });
    addLog('success', 'Scénario "VPN Télétravail" chargé');
    addLog('info', '🔐 Le PC a un tunnel VPN - le MITM ne peut pas intercepter!');
    addLog('info', '💡 1. Activez MITM 2. Envoyez email depuis PC → protégé!');
    addLog('info', '💡 Le téléphone n\'a pas de VPN - essayez depuis le téléphone');
    showToast('Le tunnel VPN protège contre le MITM', 'success', '🔐 VPN');
  },

  /* ──────── APT ──────── */
  'apt': function () {
    createNode('attacker', 50, 300); createNode('internet', 180, 300); createNode('firewall', 320, 300);
    createNode('router', 460, 300);
    createNode('switch', 600, 200); createNode('switch', 600, 400);
    createNode('computer', 740, 120); createNode('computer', 740, 200); createNode('computer', 740, 280);
    createNode('server', 740, 380); createNode('database', 740, 460);
    createNode('mitm', 460, 150);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); createConnection(nodes[2], nodes[3]);
      createConnection(nodes[3], nodes[4]); createConnection(nodes[3], nodes[5]); createConnection(nodes[11], nodes[4]);
      createConnection(nodes[4], nodes[6]); createConnection(nodes[4], nodes[7]); createConnection(nodes[4], nodes[8]);
      createConnection(nodes[5], nodes[9]); createConnection(nodes[5], nodes[10]);
      toggleFirewall();
    });
    addLog('success', 'Scénario "Menace APT" chargé');
    addLog('attack', '👹 Menace Persistante Avancée - attaque sophistiquée');
    addLog('danger', 'L\'attaquant a déjà un accès interne via le nœud MITM!');
    showToast('APT: L\'attaquant est déjà dans le réseau', 'error', '👹 APT');
  },

  /* ──────── Pentest ──────── */
  'pentest': function () {
    createNode('attacker', 80, 250); createNode('internet', 200, 250); createNode('firewall', 350, 250);
    createNode('router', 500, 250);
    createNode('switch', 650, 150); createNode('switch', 650, 350);
    createNode('enterprise', 800, 80); createNode('server', 800, 150); createNode('database', 800, 220);
    createNode('computer', 800, 320); createNode('phone', 800, 390); createNode('vpngateway', 500, 100);
    afterCreate(() => {
      createConnection(nodes[0], nodes[1]); createConnection(nodes[1], nodes[2]); createConnection(nodes[2], nodes[3]);
      createConnection(nodes[3], nodes[4]); createConnection(nodes[3], nodes[5]); createConnection(nodes[3], nodes[11]);
      createConnection(nodes[4], nodes[6]); createConnection(nodes[4], nodes[7]); createConnection(nodes[4], nodes[8]);
      createConnection(nodes[5], nodes[9]); createConnection(nodes[5], nodes[10]);
      toggleFirewall(); toggleIDS(); toggleEncryption();
    });
    addLog('success', 'Scénario "Pentest Complet" chargé');
    addLog('info', 'Infrastructure d\'entreprise complète - testez toutes les attaques!');
    showToast('Environnement de test d\'intrusion complet', 'info', '🎯 Pentest');
  },

  /* ──────── Internet Structuré ──────── */
  'internet': function () {
    // ── Zones ──
    createZone(850, 580, 500, 320, '🌐 FAI / Backbone Internet', 'rgba(100,116,139,0.12)', 'rgba(100,116,139,0.5)');
    createZone(750, 350, 700, 200, '☁️ Services Cloud', 'rgba(56,189,248,0.1)', 'rgba(56,189,248,0.4)');
    createZone(50, 50, 380, 380, '🏢 Entreprise TechCorp', 'rgba(249,115,22,0.1)', 'rgba(249,115,22,0.4)');
    createZone(1770, 50, 380, 380, '🏥 Hôpital Central', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)');
    createZone(50, 980, 550, 380, '🏠 Quartier Résidentiel Ouest', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.4)');
    createZone(650, 980, 550, 380, '🏠 Quartier Résidentiel Centre', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.4)');
    createZone(1250, 980, 550, 380, '🏠 Quartier Résidentiel Est', 'rgba(34,197,94,0.1)', 'rgba(34,197,94,0.4)');
    createZone(2000, 480, 180, 400, '👹 Darknet', 'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.6)');
    createZone(1600, 480, 350, 400, '🖥️ Datacenter Cloud', 'rgba(139,92,246,0.1)', 'rgba(139,92,246,0.4)');

    // ── Backbone / FAI ──
    createNode('internet', 1100, 740);
    createNode('router', 1000, 650);
    createNode('router', 1200, 650);
    createNode('dns', 1100, 850);

    // ── Cloud ──
    createNode('cloud', 850, 450);
    createNode('cloud', 1050, 450);
    createNode('cloud', 1250, 450);
    createNode('loadbalancer', 1350, 450);

    // ── Entreprise TechCorp ──
    createNode('firewall', 200, 100);
    createNode('router', 200, 180);
    createNode('switch', 120, 270);
    createNode('switch', 280, 270);
    createNode('computer', 70, 360);
    createNode('computer', 130, 360);
    createNode('computer', 190, 360);
    createNode('server', 250, 360);
    createNode('database', 320, 360);
    createNode('vpngateway', 370, 180);

    // ── Hôpital ──
    createNode('firewall', 1950, 100);
    createNode('router', 1950, 180);
    createNode('switch', 1870, 270);
    createNode('switch', 2030, 270);
    createNode('computer', 1820, 360);
    createNode('computer', 1880, 360);
    createNode('server', 1970, 360);
    createNode('database', 2040, 360);
    createNode('iot', 2100, 360);

    // ── Foyer 1 ──
    createNode('router', 150, 1050);
    createNode('computer', 80, 1150);
    createNode('phone', 150, 1150);
    createNode('iot', 220, 1150);
    createNode('printer', 150, 1230);

    // ── Foyer 2 Télétravailleur ──
    createNode('router', 400, 1050);
    createNode('computer', 330, 1150);
    createNode('computer', 400, 1150);
    createNode('phone', 470, 1150);

    // ── Foyer 3 Gamer ──
    createNode('router', 780, 1050);
    createNode('computer', 710, 1150);
    createNode('computer', 780, 1150);
    createNode('phone', 850, 1150);
    createNode('iot', 780, 1230);

    // ── Foyer 4 Famille ──
    createNode('router', 1050, 1050);
    createNode('computer', 970, 1150);
    createNode('computer', 1050, 1150);
    createNode('phone', 1130, 1150);
    createNode('phone', 970, 1230);
    createNode('iot', 1050, 1230);
    createNode('iot', 1130, 1230);

    // ── Foyer 5 Étudiant ──
    createNode('router', 1380, 1050);
    createNode('computer', 1320, 1150);
    createNode('phone', 1440, 1150);

    // ── Foyer 6 Retraités ──
    createNode('router', 1620, 1050);
    createNode('computer', 1560, 1150);
    createNode('phone', 1680, 1150);
    createNode('iot', 1620, 1230);

    // ── Datacenter ──
    createNode('firewall', 1680, 550);
    createNode('loadbalancer', 1750, 630);
    createNode('server', 1680, 720);
    createNode('server', 1750, 720);
    createNode('server', 1820, 720);
    createNode('database', 1720, 810);
    createNode('database', 1800, 810);

    // ── Attaquants ──
    createNode('attacker', 2080, 550);
    createNode('attacker', 2080, 650);
    createNode('mitm', 2080, 750);
    createNode('attacker', 2080, 850);

    afterCreate(() => {
      /* Backbone */
      createConnection(nodes[0], nodes[1]); createConnection(nodes[0], nodes[2]);
      createConnection(nodes[1], nodes[2]); createConnection(nodes[1], nodes[3]); createConnection(nodes[2], nodes[3]);
      /* Cloud */
      createConnection(nodes[0], nodes[4]); createConnection(nodes[0], nodes[5]);
      createConnection(nodes[0], nodes[6]); createConnection(nodes[6], nodes[7]);
      /* TechCorp */
      createConnection(nodes[1], nodes[8]); createConnection(nodes[8], nodes[9]);
      createConnection(nodes[9], nodes[10]); createConnection(nodes[9], nodes[11]);
      createConnection(nodes[10], nodes[12]); createConnection(nodes[10], nodes[13]); createConnection(nodes[10], nodes[14]);
      createConnection(nodes[11], nodes[15]); createConnection(nodes[11], nodes[16]);
      createConnection(nodes[9], nodes[17]);
      /* Hôpital */
      createConnection(nodes[2], nodes[18]); createConnection(nodes[18], nodes[19]);
      createConnection(nodes[19], nodes[20]); createConnection(nodes[19], nodes[21]);
      createConnection(nodes[20], nodes[22]); createConnection(nodes[20], nodes[23]);
      createConnection(nodes[21], nodes[24]); createConnection(nodes[21], nodes[25]); createConnection(nodes[21], nodes[26]);
      /* Foyer 1 */
      createConnection(nodes[1], nodes[27]); createConnection(nodes[27], nodes[28]);
      createConnection(nodes[27], nodes[29]); createConnection(nodes[27], nodes[30]); createConnection(nodes[27], nodes[31]);
      /* Foyer 2 */
      createConnection(nodes[1], nodes[32]); createConnection(nodes[32], nodes[33]);
      createConnection(nodes[32], nodes[34]); createConnection(nodes[32], nodes[35]);
      createConnection(nodes[33], nodes[17]);
      /* Foyer 3 */
      createConnection(nodes[1], nodes[36]); createConnection(nodes[36], nodes[37]);
      createConnection(nodes[36], nodes[38]); createConnection(nodes[36], nodes[39]); createConnection(nodes[36], nodes[40]);
      /* Foyer 4 */
      createConnection(nodes[2], nodes[41]); createConnection(nodes[41], nodes[42]);
      createConnection(nodes[41], nodes[43]); createConnection(nodes[41], nodes[44]);
      createConnection(nodes[41], nodes[45]); createConnection(nodes[41], nodes[46]); createConnection(nodes[41], nodes[47]);
      /* Foyer 5 */
      createConnection(nodes[2], nodes[48]); createConnection(nodes[48], nodes[49]); createConnection(nodes[48], nodes[50]);
      /* Foyer 6 */
      createConnection(nodes[2], nodes[51]); createConnection(nodes[51], nodes[52]);
      createConnection(nodes[51], nodes[53]); createConnection(nodes[51], nodes[54]);
      /* Datacenter */
      createConnection(nodes[5], nodes[55]); createConnection(nodes[55], nodes[56]);
      createConnection(nodes[56], nodes[57]); createConnection(nodes[56], nodes[58]); createConnection(nodes[56], nodes[59]);
      createConnection(nodes[57], nodes[60]); createConnection(nodes[58], nodes[60]);
      createConnection(nodes[59], nodes[61]); createConnection(nodes[60], nodes[61]);
      /* Attaquants */
      createConnection(nodes[0], nodes[62]); createConnection(nodes[62], nodes[63]);
      createConnection(nodes[63], nodes[64]); createConnection(nodes[64], nodes[65]);
      /* Cloud↔DC */
      createConnection(nodes[5], nodes[7]);
    });

    setTimeout(() => { zoomLevel = 0.5; viewportX = 50; viewportY = 50; }, 200);
    addLog('success', '🌐 Scénario "Internet Structuré" chargé!');
    addLog('info', '📊 66 équipements répartis en zones');
    addLog('info', '🌐 FAI central avec 2 routeurs + DNS');
    addLog('info', '☁️ 3 clouds + CDN (AWS, Azure, Google)');
    addLog('info', '🏢 TechCorp: 3 PC, serveur, BDD, VPN');
    addLog('info', '🏥 Hôpital: admin, dossiers patients, IRM');
    addLog('info', '🏠 6 foyers variés connectés aux FAI');
    addLog('info', '🖥️ Datacenter: LB + 3 serveurs + 2 BDD');
    addLog('info', '👹 4 attaquants incluant MITM et Botnet');
    addLog('warning', '💡 Les zones colorées identifient chaque réseau');
    showToast('Internet structuré - 66 équipements en zones!', 'success', '🌐');
  },

  /* ════════════════════════════════════════════════
     NEW SCENARIOS
     ════════════════════════════════════════════════ */

  /* ──────── WiFi Evil Twin ──────── */
  'evil-twin': function () {
    createNode('router', 400, 120);  // 0 - Legit AP
    createNode('attacker', 400, 380); // 1 - Evil Twin
    createNode('computer', 200, 200); // 2
    createNode('phone', 250, 320);   // 3
    createNode('phone', 550, 200);   // 4
    createNode('computer', 550, 320); // 5
    createNode('internet', 650, 120); // 6
    createNode('server', 800, 120);  // 7
    afterCreate(() => {
      // Legit path
      createConnection(nodes[0], nodes[6]);
      createConnection(nodes[6], nodes[7]);
      createConnection(nodes[0], nodes[2]);
      createConnection(nodes[0], nodes[4]);
      // Victims connect to evil twin
      createConnection(nodes[1], nodes[3]);
      createConnection(nodes[1], nodes[5]);
      // Evil twin bridges to legit (transparent proxy)
      createConnection(nodes[1], nodes[0]);
    });
    addLog('success', 'Scénario "Evil Twin WiFi" chargé');
    addLog('attack', '📡 Un faux point d\'accès WiFi imite le réseau légitime');
    addLog('info', '📲 Les appareils du bas sont connectés au faux AP');
    addLog('info', '💡 Activez Chiffrement TLS + Formation Utilisateur pour contrer');
    showToast('Evil Twin: faux WiFi identique au vrai!', 'error', '📡 Evil Twin');
  },

  /* ──────── Segmentation & Mouvement Latéral ──────── */
  'lateral-movement': function () {
    createZone(50, 50, 300, 350, '🖥️ Zone Bureautique', 'rgba(56,189,248,0.1)', 'rgba(56,189,248,0.4)');
    createZone(400, 50, 300, 350, '🗄️ Zone Serveurs', 'rgba(139,92,246,0.1)', 'rgba(139,92,246,0.4)');
    createZone(750, 50, 200, 350, '🔒 Zone Critique', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.4)');

    createNode('attacker', 50, 450);   // 0
    createNode('computer', 100, 120);  // 1
    createNode('computer', 100, 220);  // 2
    createNode('computer', 100, 320);  // 3
    createNode('switch', 250, 220);    // 4 - Switch bureaux
    createNode('firewall', 370, 220);  // 5
    createNode('server', 500, 120);    // 6
    createNode('server', 500, 220);    // 7
    createNode('server', 500, 320);    // 8
    createNode('firewall', 680, 220);  // 9 - FW critique
    createNode('database', 820, 170);  // 10
    createNode('database', 820, 280);  // 11

    afterCreate(() => {
      createConnection(nodes[0], nodes[4]); // attacker → switch
      createConnection(nodes[1], nodes[4]); createConnection(nodes[2], nodes[4]); createConnection(nodes[3], nodes[4]);
      createConnection(nodes[4], nodes[5]);
      createConnection(nodes[5], nodes[6]); createConnection(nodes[5], nodes[7]); createConnection(nodes[5], nodes[8]);
      createConnection(nodes[7], nodes[9]);
      createConnection(nodes[9], nodes[10]); createConnection(nodes[9], nodes[11]);
      toggleFirewall();
    });
    addLog('success', 'Scénario "Mouvement Latéral" chargé');
    addLog('attack', '🕸️ L\'attaquant tente de se propager entre les zones');
    addLog('info', '💡 Activez Segmentation Réseau + IDS pour bloquer');
    addLog('info', '🔀 Les zones colorées montrent la segmentation');
    showToast('Testez la segmentation contre le mouvement latéral', 'warning', '🕸️ Latéral');
  }
};

/* ── Shortcut ── */
function loadDemoNetwork() { loadScenario('mitm'); closeTutorial(); }
