/* ============================================================
   Network Sim — learn.js
   Pedagogical learn panel content, categorised
   ============================================================ */

function openLearnPanel() {
  const panel = document.getElementById('learnPanel');
  if (!panel) return;
  panel.classList.add('visible');
  renderLearnContent();
}

function closeLearnPanel() {
  document.getElementById('learnPanel')?.classList.remove('visible');
}

/* ── Data ── */
const learnCategories = [
  {
    title: '🌐 Réseau',
    items: [
      { icon: '🖥️', title: 'Modèle OSI', desc: 'Les 7 couches du modèle OSI structurent la communication réseau : Physique, Liaison, Réseau, Transport, Session, Présentation, Application. Chaque couche a un rôle spécifique et communique avec les couches adjacentes.', scenario: 'basic' },
      { icon: '🔀', title: 'Routage IP', desc: 'Le routage permet d\'acheminer les paquets entre réseaux différents. Un routeur examine l\'adresse IP de destination et consulte sa table de routage pour trouver le meilleur chemin (next-hop).', scenario: 'enterprise' },
      { icon: '📡', title: 'DNS', desc: 'Le Domain Name System traduit les noms de domaine (www.example.com) en adresses IP (93.184.216.34). La résolution passe par plusieurs serveurs : résolveur local → root → TLD → autoritaire.', scenario: 'dnsspoof' },
      { icon: '🔗', title: 'TCP/IP', desc: 'Le protocole TCP assure une transmission fiable grâce au three-way handshake (SYN → SYN-ACK → ACK), au contrôle de flux et à la retransmission. UDP est plus rapide mais sans garantie de livraison.', scenario: 'basic' },
      { icon: '🏗️', title: 'VLAN & Segmentation', desc: 'Les VLANs séparent logiquement un réseau physique en segments isolés. Le trafic inter-VLAN nécessite un routeur. Cela limite la propagation des broadcasts et améliore la sécurité.', scenario: 'lateral-movement' },
      { icon: '⚖️', title: 'Load Balancing', desc: 'Un load balancer distribue le trafic entre plusieurs serveurs pour assurer haute disponibilité et performance. Les algorithmes courants : Round Robin, Least Connections, IP Hash.', scenario: 'datacenter' },
      { icon: '☁️', title: 'Cloud & Hybride', desc: 'L\'architecture cloud hybride combine infrastructure on-premise et services cloud publics (AWS, Azure, GCP). Un VPN site-to-site sécurise la liaison entre les deux environnements.', scenario: 'hybrid-cloud' },
    ]
  },
  {
    title: '⚔️ Attaques',
    items: [
      { icon: '💥', title: 'DDoS', desc: 'Distributed Denial of Service : saturation d\'un serveur par des milliers de requêtes simultanées provenant de multiples sources (botnet). Cible la bande passante, les ressources CPU/mémoire ou la couche applicative.', scenario: 'ddos' },
      { icon: '🕵️', title: 'Man-in-the-Middle', desc: 'L\'attaquant s\'interpose entre deux parties communicantes pour intercepter, lire ou modifier les données en transit. Exploite ARP spoofing, DNS poisoning ou rogue access points.', scenario: 'mitm' },
      { icon: '🎣', title: 'Phishing', desc: 'Technique d\'ingénierie sociale utilisant emails ou sites frauduleux pour voler des credentials. Le spear-phishing cible des individus spécifiques avec des messages personnalisés.', scenario: 'phishing-scenario' },
      { icon: '💀', title: 'Ransomware', desc: 'Malware qui chiffre les fichiers de la victime et exige une rançon pour la clé de déchiffrement. Se propage souvent par phishing ou exploitation de vulnérabilités. Kill chain : intrusion → escalade → propagation latérale → chiffrement.', scenario: 'ransomware-scenario' },
      { icon: '💉', title: 'SQL Injection', desc: 'Insertion de code SQL malveillant via les champs de saisie d\'une application web. Permet d\'extraire, modifier ou supprimer des données. Exemple : \' OR 1=1 -- bypass l\'authentification.', scenario: 'sql-injection' },
      { icon: '📜', title: 'XSS', desc: 'Cross-Site Scripting : injection de JavaScript malveillant dans une page web. Permet le vol de cookies, le détournement de session ou la redirection vers un site malveillant.', scenario: 'sql-injection' },
      { icon: '🌊', title: 'SYN Flood', desc: 'Envoi massif de paquets SYN sans compléter le handshake TCP. Le serveur alloue des ressources pour chaque connexion half-open, épuisant sa mémoire. Les SYN Cookies contrent cette attaque.', scenario: 'ddos' },
      { icon: '🧪', title: 'ARP Poisoning', desc: 'Envoi de faux paquets ARP pour associer l\'adresse MAC de l\'attaquant à l\'IP de la passerelle. Tout le trafic est alors redirigé vers l\'attaquant. Contré par Dynamic ARP Inspection (DAI).', scenario: 'mitm' },
      { icon: '🎯', title: 'Zero-Day', desc: 'Exploitation d\'une vulnérabilité inconnue du fournisseur (0 jour depuis la découverte). Très dangereuse car aucun patch n\'existe. Le Patch Management rapide limite l\'exposition.', scenario: 'pentest' },
      { icon: '📡', title: 'Evil Twin', desc: 'Création d\'un faux point d\'accès WiFi imitant un réseau légitime. Les victimes s\'y connectent et leur trafic est intercepté. Le chiffrement TLS et la sensibilisation des utilisateurs sont essentiels.', scenario: 'evil-twin' },
      { icon: '🕸️', title: 'Mouvement Latéral', desc: 'Après compromission initiale, l\'attaquant se propage horizontalement dans le réseau pour atteindre des cibles plus critiques. La segmentation réseau et le monitoring SIEM limitent cette propagation.', scenario: 'lateral-movement' },
      { icon: '👹', title: 'APT', desc: 'Advanced Persistent Threat : attaque sophistiquée et prolongée par un acteur étatique ou organisé. Combine multiple techniques : phishing, zero-day, escalade, exfiltration furtive sur des mois.', scenario: 'apt' },
    ]
  },
  {
    title: '🛡️ Défenses',
    items: [
      { icon: '🧱', title: 'Firewall', desc: 'Filtre le trafic réseau selon des règles (ports, IPs, protocoles). Peut être stateful (suit les connexions) ou next-gen (inspection applicative, DPI). Première ligne de défense périmétrique.', scenario: 'secure' },
      { icon: '🔍', title: 'IDS/IPS', desc: 'Intrusion Detection/Prevention System analyse le trafic pour détecter des signatures d\'attaque ou des anomalies comportementales. L\'IPS peut bloquer automatiquement le trafic malveillant.', scenario: 'pentest' },
      { icon: '🔒', title: 'Chiffrement TLS', desc: 'Transport Layer Security chiffre les communications de bout en bout. Le handshake TLS échange des clés asymétriques, puis les données sont chiffrées symétriquement (AES-256).', scenario: 'secure' },
      { icon: '🔐', title: 'VPN', desc: 'Virtual Private Network crée un tunnel chiffré entre deux points. IPSec ou WireGuard encapsulent le trafic. Protège contre l\'interception (MITM) sur les réseaux non fiables.', scenario: 'vpn-remote' },
      { icon: '📱', title: '2FA', desc: 'L\'authentification à deux facteurs exige un second élément en plus du mot de passe : code OTP, clé FIDO2, ou notification push. Bloque 99% des attaques de credentials.', scenario: 'zero-trust' },
      { icon: '🌐', title: 'WAF', desc: 'Web Application Firewall protège les applications web contre les injections SQL, XSS, CSRF et autres attaques OWASP Top 10. Analyse et filtre les requêtes HTTP/HTTPS.', scenario: 'sql-injection' },
      { icon: '🔐', title: 'DNSSEC', desc: 'DNS Security Extensions ajoute des signatures cryptographiques aux réponses DNS. Permet de vérifier l\'authenticité des réponses et de détecter le DNS spoofing/cache poisoning.', scenario: 'dnsspoof' },
      { icon: '🍪', title: 'SYN Cookies', desc: 'Mécanisme du kernel qui n\'alloue pas de mémoire pour les connexions TCP tant que le handshake n\'est pas complet. Contrecarre efficacement les attaques SYN Flood.', scenario: 'ddos' },
      { icon: '🔎', title: 'Dynamic ARP Inspection', desc: 'DAI vérifie les paquets ARP contre la table de binding DHCP snooping. Rejette les paquets ARP avec des correspondances IP-MAC invalides, bloquant le ARP poisoning.', scenario: 'mitm' },
      { icon: '🔀', title: 'Segmentation Réseau', desc: 'Division du réseau en zones isolées (DMZ, VLAN, micro-segmentation). Limite la propagation des attaques et le mouvement latéral. Principe du moindre privilège réseau.', scenario: 'lateral-movement' },
      { icon: '📊', title: 'SIEM', desc: 'Security Information & Event Management centralise et corrèle les logs de multiples sources (firewall, IDS, auth, endpoints). Détecte les APT et incidents complexes grâce aux règles de corrélation.', scenario: 'apt' },
      { icon: '🏫', title: 'Formation Utilisateur', desc: 'La sensibilisation à la cybersécurité est la défense la plus efficace contre le phishing et l\'ingénierie sociale. Inclut : simulations de phishing, bonnes pratiques mots de passe, signalement d\'incidents.', scenario: 'phishing-scenario' },
      { icon: '🏰', title: 'Zero Trust', desc: 'Architecture « ne jamais faire confiance, toujours vérifier ». Chaque accès est authentifié et autorisé, même depuis le réseau interne. Combine 2FA, micro-segmentation et least privilege.', scenario: 'zero-trust' },
    ]
  }
];

/* ── Render ── */
function renderLearnContent() {
  const container = document.getElementById('learnContent');
  if (!container) return;

  let html = '';
  learnCategories.forEach(cat => {
    html += '<div class="learn-category"><h3 class="learn-category-title">' + cat.title + '</h3><div class="learn-cards-grid">';
    cat.items.forEach(item => {
      html += '<div class="learn-card">'
        + '<h3>' + item.icon + ' ' + item.title + '</h3>'
        + '<p>' + item.desc + '</p>';
      if (item.scenario) {
        html += '<button class="try-btn" onclick="loadScenario(\'' + item.scenario + '\');closeLearnPanel()">▶ Essayer</button>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  });

  container.innerHTML = html;
}
