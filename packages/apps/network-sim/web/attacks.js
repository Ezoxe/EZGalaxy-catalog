/* ============================================================
   Network Sim — attacks.js
   All attack functions (13 original + 4 new)
   ============================================================ */

// ─────────── DDoS ───────────
function startDDoSAttack() {
  if (!activeAttacks.ddos) startActionMode('ddos', '💥', 'DDoS Attack');
  else stopDDoSAttack();
}
function stopDDoSAttack() {
  activeAttacks.ddos = false;
  clearInterval(activeAttacks.ddosInterval);
  document.querySelector('[data-attack="ddos"]')?.classList.remove('active');
  nodes.forEach(n => n.attacked = false);
  checkAttackStatus();
  addLog('info', 'DDoS arrêté');
}

// ─────────── MITM ───────────
function startMITMAttack() {
  if (!activeAttacks.mitm) startActionMode('mitm', '🕵️', 'Man-in-the-Middle');
  else stopMITMAttack();
}
function stopMITMAttack() {
  activeAttacks.mitm = false;
  const m = nodes.find(n => n.type === 'mitm');
  if (m) m.intercepting = false;
  document.querySelector('[data-attack="mitm"]')?.classList.remove('active');
  checkAttackStatus();
  addLog('info', 'MITM arrêté');
}

// ─────────── Port Scan ───────────
function startPortScan() {
  if (!activeAttacks.portscan) startActionMode('portscan', '🔍', 'Port Scanning');
  else stopPortScan();
}
function stopPortScan() {
  activeAttacks.portscan = false;
  clearInterval(activeAttacks.portscanInterval);
  document.querySelector('[data-attack="portscan"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── DNS Spoofing ───────────
function startDNSSpoof() {
  if (!activeAttacks.dnsspoof) {
    const attacker = nodes.find(n => n.type === 'attacker');
    if (!attacker) { showToast('DNS Spoofing nécessite un Attaquant', 'warning'); return; }
    activeAttacks.dnsspoof = true;
    document.querySelector('[data-attack="dnsspoof"]')?.classList.add('active');
    document.getElementById('attackStatus').style.display = 'flex';
    addLog('attack', '🔮 DNS Spoofing activé');
    addLog('danger', 'www.banque-secure.com → ' + attacker.ip + ' (malveillant)');
    if (activeDefenses.dnssec) {
      addLog('success', '🔐 DNSSEC actif — le spoofing sera détecté et rejeté');
    }
  } else stopDNSSpoof();
}
function stopDNSSpoof() {
  activeAttacks.dnsspoof = false;
  document.querySelector('[data-attack="dnsspoof"]')?.classList.remove('active');
  checkAttackStatus();
  addLog('info', 'DNS Spoofing arrêté');
}

// ─────────── ARP Poisoning ───────────
function startARPPoisoning() {
  if (!activeAttacks.arp) {
    const attacker = nodes.find(n => n.type === 'attacker');
    if (!attacker) { addLog('warning', 'ARP Poisoning nécessite Attaquant'); return; }
    if (activeDefenses.dai) {
      addLog('success', '🛡️ Dynamic ARP Inspection bloque le ARP Poisoning');
      showToast('DAI bloque le ARP Poisoning!', 'success', '🛡️ DAI');
      return;
    }
    activeAttacks.arp = true;
    document.querySelector('[data-attack="arp"]')?.classList.add('active');
    document.getElementById('attackStatus').style.display = 'flex';
    addLog('attack', '🧪 ARP Poisoning depuis ' + attacker.name);
    activeAttacks.arpInterval = setInterval(() => {
      if (activeAttacks.arp) {
        nodes.filter(n => n !== attacker && n.type !== 'mitm').forEach(n => createPacket(attacker, n, 'arp'));
      }
    }, 1500);
  } else stopARPPoisoning();
}
function stopARPPoisoning() {
  activeAttacks.arp = false;
  clearInterval(activeAttacks.arpInterval);
  document.querySelector('[data-attack="arp"]')?.classList.remove('active');
  checkAttackStatus();
  addLog('info', 'ARP Poisoning arrêté');
}

// ─────────── Brute Force ───────────
function startBruteForce() {
  if (!activeAttacks.bruteforce) {
    const attacker = nodes.find(n => n.type === 'attacker');
    const target = nodes.find(n => n.type === 'server');
    if (!attacker || !target) { addLog('warning', 'Brute Force nécessite Attaquant + Serveur'); return; }
    activeAttacks.bruteforce = true;
    document.querySelector('[data-attack="bruteforce"]')?.classList.add('active');
    document.getElementById('attackStatus').style.display = 'flex';
    addLog('attack', '🔨 Brute Force SSH sur ' + target.name);
    const passwords = ['admin', 'password', '123456', 'root', 'admin123', 'qwerty', 'letmein', 'welcome'];
    let i = 0;
    activeAttacks.bruteforceInterval = setInterval(() => {
      if (activeAttacks.bruteforce && i < passwords.length) {
        createPacket(attacker, target, 'syn', { port: 22 });
        addLog('warning', 'SSH: root:' + passwords[i]);
        i++;
      } else if (i >= passwords.length) {
        if (activeDefenses.ids) addLog('success', '🛡️ IDS: Brute force bloqué!');
        else if (activeDefenses.accountlockout) addLog('success', '🔒 Account Lockout après ' + passwords.length + ' tentatives');
        else if (activeDefenses['2fa']) addLog('success', '🛡️ 2FA: Mot de passe trouvé mais 2FA requis!');
        else addLog('danger', '💀 SSH réussi avec root:admin123!');
        stopBruteForce();
      }
    }, 400);
  } else stopBruteForce();
}
function stopBruteForce() {
  activeAttacks.bruteforce = false;
  clearInterval(activeAttacks.bruteforceInterval);
  document.querySelector('[data-attack="bruteforce"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── SYN Flood ───────────
function startSYNFlood() {
  if (!activeAttacks.synflood) {
    const attacker = nodes.find(n => n.type === 'attacker');
    const target = nodes.find(n => n.type === 'server');
    if (!attacker || !target) { addLog('warning', 'SYN Flood nécessite Attaquant + Serveur'); return; }
    if (activeDefenses.syncookies) {
      addLog('success', '🛡️ SYN Cookies: Flood SYN atténué automatiquement');
      showToast('SYN Cookies protège contre le flood!', 'success', '🛡️ SYN Cookies');
      return;
    }
    activeAttacks.synflood = true;
    document.querySelector('[data-attack="synflood"]')?.classList.add('active');
    document.getElementById('attackStatus').style.display = 'flex';
    addLog('attack', '🌊 SYN Flood sur ' + target.name);
    activeAttacks.synfloodInterval = setInterval(() => {
      if (activeAttacks.synflood) {
        for (let i = 0; i < 4; i++) createPacket(attacker, target, 'syn');
        target.attacked = true;
      }
    }, 250);
  } else stopSYNFlood();
}
function stopSYNFlood() {
  activeAttacks.synflood = false;
  clearInterval(activeAttacks.synfloodInterval);
  document.querySelector('[data-attack="synflood"]')?.classList.remove('active');
  const t = nodes.find(n => n.type === 'server');
  if (t) t.attacked = false;
  checkAttackStatus();
  addLog('info', 'SYN Flood arrêté');
}

// ─────────── Phishing (multi-stage kill chain) ───────────
function startPhishing() {
  if (activeAttacks.phishing) return;

  const attacker = nodes.find(n => n.type === 'attacker');
  const targets = nodes.filter(n => n.type === 'computer' || n.type === 'phone');
  if (!attacker || targets.length === 0) {
    showToast('Phishing nécessite Attaquant + PC/Téléphone', 'warning');
    return;
  }

  // ── User-training blocks immediately ──
  if (activeDefenses.usertraining) {
    addLog('attack', '🎣 ═══ TENTATIVE DE PHISHING ═══');
    addLog('info', '📧 Email frauduleux envoyé à ' + targets.length + ' employé(s)...');
    createPacket(attacker, targets[0], 'phishing', {
      from: 'support@banque-secure.com',
      to: targets[0].name.toLowerCase().replace(/\s+/g, '.') + '@entreprise.com',
      subject: '⚠️ [URGENT] Activité suspecte sur votre compte',
      body: 'Cher(e) employé(e),\n\nConnexion inhabituelle détectée.\n\n🔗 https://banque-secure.com.evil.net/verify\n\n⚠️ Vérifiez sous 24h ou votre compte sera suspendu.\n\nÉquipe Sécurité'
    });
    setTimeout(() => {
      addLog('success', '🏫 Formation: Les employés ont identifié le phishing!');
      addLog('success', '↳ Indicateurs repérés : URL suspecte, urgence artificielle, expéditeur inconnu');
      addLog('success', '↳ Email signalé au SOC — Phishing neutralisé');
      showToast('Utilisateurs formés : phishing détecté et signalé!', 'success', '🏫 Formation');
      showDetailPopup(targets[0], '🏫 Formation Efficace', {
        tentative: 'Email de phishing reçu',
        réaction: '✅ Signalé immédiatement au SOC',
        indicateurs: 'URL suspecte, urgence, expéditeur inconnu',
        résultat: '🟢 Attaque neutralisée'
      }, 'success');
    }, 1800);
    return;
  }

  activeAttacks.phishing = true;
  document.querySelector('[data-attack="phishing"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';

  // ── Phase 1 : Reconnaissance ──
  addLog('attack', '🎣 ═══ CAMPAGNE DE PHISHING ═══');
  addLog('warning', '🔍 Phase 1/5 — Reconnaissance');
  addLog('info', '↳ Collecte d\'adresses email via LinkedIn, site web, OSINT...');
  addLog('info', '↳ ' + targets.length + ' cible(s) identifiée(s) dans l\'entreprise');
  showToast('Phase 1 : Reconnaissance des cibles...', 'warning', '🎣 Phishing');

  // ── Phase 2 : Envoi des emails (1.5s) ──
  setTimeout(function () {
    if (!activeAttacks.phishing) return;
    addLog('warning', '📧 Phase 2/5 — Envoi des emails de phishing');
    addLog('danger', '↳ De : "support@banque-secure.com" (domaine usurpé)');
    addLog('danger', '↳ Objet : "[URGENT] Activité suspecte — Vérifiez votre compte"');
    addLog('danger', '↳ Lien piégé : https://banque-secure.com.evil.net/login');

    targets.forEach(function (target, i) {
      setTimeout(function () {
        if (!activeAttacks.phishing) return;
        createPacket(attacker, target, 'phishing', {
          from: 'support@banque-secure.com',
          to: target.name.toLowerCase().replace(/\s+/g, '.') + '@entreprise.com',
          subject: '⚠️ [URGENT] Activité suspecte sur votre compte',
          body: 'Cher(e) employé(e),\n\nNous avons détecté une connexion inhabituelle\nà votre compte depuis un appareil inconnu.\n\n🔴 Action requise immédiatement :\n\n🔗 https://banque-secure.com.evil.net/verify\n\n⚠️ Si vous ne vérifiez pas dans les 24h,\nvotre compte sera suspendu.\n\nCordialement,\nÉquipe Sécurité'
        });
        addLog('info', '  📤 Email envoyé → ' + target.name);
      }, i * 600);
    });

    // ── Phase 3 : Victim clicks (after all emails sent) ──
    var phase3Delay = targets.length * 600 + 2500;
    setTimeout(function () {
      if (!activeAttacks.phishing) return;
      var victim = targets[0];
      addLog('warning', '🖱️ Phase 3/5 — ' + victim.name + ' clique sur le lien');
      addLog('danger', '↳ Redirection vers la fausse page de connexion');
      addLog('danger', '↳ Certificat SSL invalide ⚠️ (ignoré par la victime)');

      victim.attacked = true;
      createRingEffect(victim, '#ef4444');

      showDetailPopup(victim, '🎣 Fausse Page de Connexion', {
        URL: 'banque-secure.com.evil.net/login',
        apparence: '🟢 Clone parfait du site légitime',
        certificat: '❌ Non valide (domaine différent)',
        formulaire: 'Email + Mot de passe',
        piège: 'Les données vont directement à l\'attaquant'
      }, 'blocked');

      // ── Phase 4 : Saisie des credentials (2.5s) ──
      setTimeout(function () {
        if (!activeAttacks.phishing) return;
        var victimEmail = victim.name.toLowerCase().replace(/\s+/g, '.') + '@entreprise.com';
        addLog('warning', '⌨️ Phase 4/5 — Saisie des identifiants');
        addLog('danger', '↳ Email : ' + victimEmail);
        addLog('danger', '↳ Mot de passe : ••••••••• (P@ssw0rd!)');
        addLog('danger', '📤 Credentials exfiltrés vers le serveur C&C de l\'attaquant');
        showToast('Credentials volés et envoyés au C&C!', 'error', '🎣 Phishing');

        createPacket(victim, attacker, 'exfiltration');
        addSequenceMessage(victim, attacker, 'Credentials → C&C', 'attack');

        // ── Phase 5 : Exploitation ou 2FA (2.5s) ──
        setTimeout(function () {
          if (!activeAttacks.phishing) return;

          if (activeDefenses['2fa']) {
            addLog('warning', '🔑 Phase 5/5 — Tentative d\'accès avec credentials volés');
            addLog('success', '🛡️ 2FA ACTIVÉ — Code OTP requis!');
            addLog('success', '↳ L\'attaquant a le mot de passe MAIS pas le code 2FA');
            addLog('success', '↳ Le code TOTP change toutes les 30 secondes — inutilisable');
            addLog('success', '✅ Compte protégé malgré le vol de credentials!');
            showToast('2FA bloque l\'accès! Mot de passe inutilisable seul.', 'success', '🛡️ 2FA');

            showDetailPopup(victim, '🛡️ 2FA — Protection Active', {
              credentials: '⚠️ Volés par phishing',
              tentative: 'Login avec mot de passe volé',
              '2FA': '📱 Code OTP requis (TOTP/FIDO2)',
              résultat: '✅ Accès BLOQUÉ — Compte protégé'
            }, 'success');
            createRingEffect(victim, '#22c55e');
          } else {
            addLog('danger', '💀 Phase 5/5 — Exploitation des credentials');
            addLog('danger', '↳ Connexion réussie au compte de ' + victim.name);
            addLog('danger', '↳ Accès obtenu : emails, documents, contacts internes');
            addLog('danger', '↳ Données exfiltrées vers serveur C&C');
            victim.compromised = true;

            showDetailPopup(victim, '💀 Compte Compromis', {
              victime: victim.name,
              identifiants: victimEmail + ' / P@ssw0rd!',
              accès: 'Emails, Documents, Contacts',
              exfiltration: 'Données copiées vers serveur C&C',
              impact: '🔴 Fuite de données confidentielles'
            }, 'blocked');
            showToast('Compte compromis! Données volées.', 'error', '🎣 Phishing');

            // Attacker tries to pivot to server
            var server = nodes.find(function (n) { return n.type === 'server'; });
            if (server) {
              setTimeout(function () {
                if (!activeAttacks.phishing) return;
                addLog('danger', '🔓 L\'attaquant utilise les credentials pour accéder au serveur');
                createPacket(attacker, server, 'credstuffing');
                addSequenceMessage(attacker, server, 'Login avec credentials volés', 'attack');
              }, 1500);
            }
          }

          // Cleanup
          setTimeout(function () { stopPhishing(); }, 4000);
        }, 2500);
      }, 2500);
    }, phase3Delay);
  }, 1500);
}

function stopPhishing() {
  activeAttacks.phishing = false;
  document.querySelector('[data-attack="phishing"]')?.classList.remove('active');
  nodes.forEach(function (n) { if (n.type === 'computer' || n.type === 'phone') n.attacked = false; });
  checkAttackStatus();
}

// ─────────── Ransomware ───────────
function startRansomware() {
  if (!activeAttacks.ransomware) startActionMode('ransomware', '💀', 'Ransomware');
  else stopRansomware();
}
function executeRansomwareAttack(attacker, target) {
  activeAttacks.ransomware = true;
  document.querySelector('[data-attack="ransomware"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '💀 Ransomware lancé vers ' + target.name);
  showToast('Ransomware en cours de déploiement...', 'error', '💀 Ransomware');
  let progress = 0;
  const progressBar = showProgressBar(target, 'Chiffrement', 0);
  activeAttacks.ransomwareInterval = setInterval(() => {
    if (activeAttacks.ransomware) {
      createPacket(attacker, target, 'ransomware');
      progress += 10;
      updateProgressBar(progressBar, progress);
      if (progress >= 100) {
        if (activeDefenses.antimalware) {
          showToast('Ransomware bloqué par Anti-Malware!', 'success', '🛡️ Défense');
          addLog('success', '🛡️ Anti-Malware a bloqué le ransomware!');
        } else {
          target.attacked = true;
          target.compromised = true;
          showToast('Fichiers chiffrés! Rançon demandée: 5 BTC', 'error', '💀 Ransomware');
          addLog('danger', '💀 ' + target.name + ' chiffré! Rançon: 5 BTC');
          showDetailPopup(target, 'Ransomware', { status: 'Système compromis', details: 'Tous les fichiers ont été chiffrés', ransom: '5 BTC', deadline: '72 heures' }, 'blocked');
        }
        stopRansomware();
        removeProgressBar(progressBar);
      }
    }
  }, 500);
}
function stopRansomware() {
  activeAttacks.ransomware = false;
  clearInterval(activeAttacks.ransomwareInterval);
  document.querySelector('[data-attack="ransomware"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── SQL Injection ───────────
function startSQLInjection() {
  if (!activeAttacks.sqli) startActionMode('sqli', '💉', 'SQL Injection');
  else stopSQLInjection();
}
function executeSQLInjection(attacker, target) {
  activeAttacks.sqli = true;
  document.querySelector('[data-attack="sqli"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '💉 SQL Injection sur ' + target.name);
  showToast('Injection SQL en cours...', 'warning', '💉 SQLi');
  createPacket(attacker, target, 'sqli');
  setTimeout(() => {
    if (activeDefenses.waf) {
      showToast('SQL Injection bloquée par WAF!', 'success', '🛡️ WAF');
      addLog('success', '🛡️ WAF a bloqué l\'injection SQL');
    } else {
      showToast('Base de données compromise!', 'error', '💉 SQLi');
      addLog('danger', '💉 SQL Injection réussie sur ' + target.name);
      showDetailPopup(target, 'SQL Injection', { query: "'; DROP TABLE users; --", tables: 'users, credentials', rows: '45,892 enregistrements volés' }, 'blocked');
    }
    stopSQLInjection();
  }, 2000);
}
function stopSQLInjection() {
  activeAttacks.sqli = false;
  document.querySelector('[data-attack="sqli"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── XSS ───────────
function startXSS() {
  if (!activeAttacks.xss) startActionMode('xss', '📜', 'XSS Attack');
  else stopXSS();
}
function executeXSS(attacker, target) {
  activeAttacks.xss = true;
  document.querySelector('[data-attack="xss"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '📜 XSS Attack sur ' + target.name);
  showToast('Script malveillant injecté...', 'warning', '📜 XSS');
  createPacket(attacker, target, 'xss');
  setTimeout(() => {
    if (activeDefenses.waf) {
      showToast('XSS bloqué par WAF!', 'success', '🛡️ WAF');
      addLog('success', '🛡️ WAF a bloqué le script XSS');
    } else {
      showToast('Cookies de session volés!', 'error', '📜 XSS');
      addLog('danger', '📜 XSS réussi - cookies volés de ' + target.name);
    }
    stopXSS();
  }, 1500);
}
function stopXSS() {
  activeAttacks.xss = false;
  document.querySelector('[data-attack="xss"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Zero-Day Exploit ───────────
function startZeroDay() {
  if (!activeAttacks.zeroday) startActionMode('zeroday', '🎯', 'Zero-Day Exploit');
  else stopZeroDay();
}
function executeZeroDay(attacker, target) {
  activeAttacks.zeroday = true;
  document.querySelector('[data-attack="zeroday"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '🎯 Zero-Day exploit sur ' + target.name);
  showToast('Exploitation de vulnérabilité...', 'error', '🎯 Zero-Day');
  createPacket(attacker, target, 'zeroday');
  createParticles(target, 15, '#4c1d95');
  setTimeout(() => {
    if (activeDefenses.patchmgmt) {
      showToast('Système à jour - exploit atténué!', 'success', '🛡️ Patch Mgmt');
      addLog('success', '🛡️ Patch Management a limité l\'impact');
    } else {
      target.attacked = true;
      target.compromised = true;
      showToast('Accès root obtenu!', 'error', '🎯 Zero-Day');
      addLog('danger', '🎯 Zero-Day réussi - accès root sur ' + target.name);
    }
    stopZeroDay();
  }, 2500);
}
function stopZeroDay() {
  activeAttacks.zeroday = false;
  document.querySelector('[data-attack="zeroday"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Credential Stuffing ───────────
function startCredentialStuffing() {
  if (!activeAttacks.credstuffing) startActionMode('credstuffing', '🔑', 'Credential Stuffing');
  else stopCredentialStuffing();
}
function executeCredentialStuffing(attacker, target) {
  activeAttacks.credstuffing = true;
  document.querySelector('[data-attack="credstuffing"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '🔑 Credential Stuffing sur ' + target.name);
  showToast('Test de credentials volés...', 'warning', '🔑 Creds');
  const credentials = ['admin:password123', 'user:123456', 'root:toor', 'admin:admin', 'test:test123'];
  let i = 0, progress = 0;
  const progressBar = showProgressBar(target, 'Tentatives', 0);
  activeAttacks.credstuffingInterval = setInterval(() => {
    if (activeAttacks.credstuffing && i < credentials.length) {
      createPacket(attacker, target, 'credstuffing');
      addLog('warning', '🔑 Test: ' + credentials[i]);
      i++;
      progress = Math.round((i / credentials.length) * 100);
      updateProgressBar(progressBar, progress);
    } else if (i >= credentials.length) {
      if (activeDefenses.accountlockout) {
        showToast('Compte verrouillé!', 'success', '🛡️ Lockout');
        addLog('success', '🛡️ Account Lockout a bloqué l\'attaque');
      } else if (activeDefenses['2fa']) {
        showToast('2FA requis', 'success', '🛡️ 2FA');
        addLog('success', '🛡️ 2FA a bloqué l\'accès');
      } else {
        showToast('Accès obtenu!', 'error', '🔑 Creds');
        addLog('danger', '🔑 Credential Stuffing réussi');
      }
      removeProgressBar(progressBar);
      stopCredentialStuffing();
    }
  }, 600);
}
function stopCredentialStuffing() {
  activeAttacks.credstuffing = false;
  clearInterval(activeAttacks.credstuffingInterval);
  document.querySelector('[data-attack="credstuffing"]')?.classList.remove('active');
  checkAttackStatus();
}

// ═══════════════════════════════════════════
//  NEW ATTACKS
// ═══════════════════════════════════════════

// ─────────── Evil Twin (WiFi) ───────────
function startEvilTwin() {
  if (!activeAttacks.eviltwin) startActionMode('eviltwin', '📡', 'Evil Twin WiFi');
  else stopEvilTwin();
}
function executeEvilTwin(attacker, target) {
  activeAttacks.eviltwin = true;
  document.querySelector('[data-attack="eviltwin"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '📡 Evil Twin: Faux point d\'accès WiFi créé');
  showToast('Point d\'accès malveillant activé...', 'error', '📡 Evil Twin');
  createPacket(attacker, target, 'eviltwin');
  setTimeout(() => {
    if (activeDefenses.encryption) {
      showToast('TLS protège les données malgré le Evil Twin', 'success', '🔒 TLS');
      addLog('success', '🔒 TLS: Données chiffrées même via Evil Twin');
    } else if (activeDefenses.usertraining) {
      showToast('Utilisateur formé: WiFi suspect détecté!', 'success', '🏫 Formation');
      addLog('success', '🏫 Utilisateur a identifié le faux réseau WiFi');
    } else {
      showToast('Trafic intercepté via faux WiFi!', 'error', '📡 Evil Twin');
      addLog('danger', '📡 Evil Twin réussi - trafic intercepté sur ' + target.name);
    }
    stopEvilTwin();
  }, 2000);
}
function stopEvilTwin() {
  activeAttacks.eviltwin = false;
  document.querySelector('[data-attack="eviltwin"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Privilege Escalation ───────────
function startPrivilegeEscalation() {
  if (!activeAttacks.privesc) startActionMode('privesc', '🔓', 'Privilege Escalation');
  else stopPrivilegeEscalation();
}
function executePrivilegeEscalation(attacker, target) {
  activeAttacks.privesc = true;
  document.querySelector('[data-attack="privesc"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '🔓 Escalade de privilèges sur ' + target.name);
  showToast('Tentative d\'escalade de privilèges...', 'warning', '🔓 PrivEsc');
  createPacket(attacker, target, 'privesc');
  let progress = 0;
  const pb = showProgressBar(target, 'Escalade', 0);
  activeAttacks.privescInterval = setInterval(() => {
    progress += 20;
    updateProgressBar(pb, progress);
    if (progress >= 100) {
      if (activeDefenses.patchmgmt) {
        addLog('success', '🛡️ Système patché: escalade échouée');
        showToast('Vulnérabilité corrigée!', 'success', '📦 Patch');
      } else if (activeDefenses.ids) {
        addLog('success', '🛡️ IDS: Activité suspecte détectée et bloquée');
        showToast('IDS a détecté l\'escalade!', 'success', '🛡️ IDS');
      } else {
        target.compromised = true;
        addLog('danger', '🔓 Privilèges root obtenus sur ' + target.name);
        showToast('Accès root obtenu!', 'error', '🔓 Root');
      }
      removeProgressBar(pb);
      stopPrivilegeEscalation();
    }
  }, 500);
}
function stopPrivilegeEscalation() {
  activeAttacks.privesc = false;
  clearInterval(activeAttacks.privescInterval);
  document.querySelector('[data-attack="privesc"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Lateral Movement ───────────
function startLateralMovement() {
  if (!activeAttacks.lateral) startActionMode('lateral', '🕸️', 'Mouvement Latéral');
  else stopLateralMovement();
}
function executeLateralMovement(attacker, target) {
  activeAttacks.lateral = true;
  document.querySelector('[data-attack="lateral"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '🕸️ Mouvement latéral: ' + attacker.name + ' → ' + target.name);
  showToast('Propagation latérale en cours...', 'warning', '🕸️ Latéral');
  createPacket(attacker, target, 'lateral');
  setTimeout(() => {
    if (activeDefenses.segmentation) {
      addLog('success', '🔀 Segmentation: Mouvement latéral bloqué!');
      showToast('Segmentation réseau bloque la propagation!', 'success', '🔀 Segmentation');
    } else if (activeDefenses.ids) {
      addLog('success', '🛡️ IDS: Mouvement latéral détecté');
      showToast('IDS a détecté le mouvement latéral', 'success', '🛡️ IDS');
    } else {
      target.compromised = true;
      addLog('danger', '🕸️ ' + target.name + ' compromis par mouvement latéral');
      showToast(target.name + ' compromis!', 'error', '🕸️ Latéral');
    }
    stopLateralMovement();
  }, 2500);
}
function stopLateralMovement() {
  activeAttacks.lateral = false;
  document.querySelector('[data-attack="lateral"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Social Engineering ───────────
function startSocialEngineering() {
  if (!activeAttacks.socialeng) startActionMode('socialeng', '🎭', 'Social Engineering');
  else stopSocialEngineering();
}
function executeSocialEngineering(attacker, target) {
  activeAttacks.socialeng = true;
  document.querySelector('[data-attack="socialeng"]')?.classList.add('active');
  document.getElementById('attackStatus').style.display = 'flex';
  addLog('attack', '🎭 Social Engineering sur ' + target.name);
  showToast('Manipulation en cours (prétexting)...', 'warning', '🎭 Social Eng');
  createPacket(attacker, target, 'socialeng');
  setTimeout(() => {
    if (activeDefenses.usertraining) {
      addLog('success', '🏫 Formation: Employé a détecté la manipulation!');
      showToast('Formation sécurité efficace!', 'success', '🏫 Formation');
    } else if (activeDefenses['2fa']) {
      addLog('success', '🛡️ 2FA bloque l\'accès malgré credentials obtenus');
      showToast('2FA protège le compte!', 'success', '🛡️ 2FA');
    } else {
      addLog('danger', '🎭 Credentials obtenus par manipulation!');
      showToast('Identifiants volés par ingénierie sociale!', 'error', '🎭 Social Eng');
      showDetailPopup(target, 'Social Engineering', {
        technique: 'Prétexting + Urgence',
        résultat: 'Credentials obtenus',
        impact: 'Accès au système interne',
        cible: target.name
      }, 'blocked');
    }
    stopSocialEngineering();
  }, 3000);
}
function stopSocialEngineering() {
  activeAttacks.socialeng = false;
  document.querySelector('[data-attack="socialeng"]')?.classList.remove('active');
  checkAttackStatus();
}

// ─────────── Helpers ───────────
function checkAttackStatus() {
  if (!Object.values(activeAttacks).some(v => v === true)) {
    document.getElementById('attackStatus').style.display = 'none';
  }
}

function stopAllAttacks() {
  Object.keys(activeAttacks).forEach(k => {
    activeAttacks[k] = false;
    clearInterval(activeAttacks[k + 'Interval']);
  });
  document.querySelectorAll('.attack-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('attackStatus').style.display = 'none';
  nodes.forEach(n => { n.attacked = false; n.intercepting = false; });
  addLog('info', '🛑 Toutes les attaques arrêtées');
  showToast('Toutes les attaques arrêtées', 'info');
}
