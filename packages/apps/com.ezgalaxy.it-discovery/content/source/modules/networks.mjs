export default {
  "id": "networks",
  "title": "Les Réseaux & Internet",
  "icon": "🌐",
  "color": "#8b5cf6",
  "tier": 2,
  "requiredModules": [
    "hardware"
  ],
  "description": "Comprends comment les ordinateurs communiquent entre eux, du réseau local jusqu'à Internet",
  "lessons": [
    {
      "title": "C'est quoi un réseau ?",
      "icon": "🔗",
      "content": [
        {
          "type": "paragraph",
          "text": "Un réseau informatique, c'est simplement un groupe d'appareils connectés entre eux pour partager des informations. C'est comme un groupe WhatsApp, mais pour les machines !"
        },
        {
          "type": "analogy",
          "text": "🏠 Le réseau local (LAN), c'est comme ta maison : tous les appareils (PC, téléphone, console) sont connectés à ta box Internet par Wi-Fi ou câble Ethernet. Ils peuvent se \"voir\" et communiquer."
        },
        {
          "type": "analogy",
          "text": "🌍 Internet (WAN), c'est comme la Poste mondiale : il connecte des milliards d'appareils partout sur la planète. Chaque appareil a une adresse (IP) pour recevoir et envoyer des données."
        },
        {
          "type": "flashcard-deck",
          "title": "Vocabulaire réseau",
          "cards": [
            {
              "front": "LAN",
              "back": "Local Area Network — Réseau local (ta maison, ton école)"
            },
            {
              "front": "WAN",
              "back": "Wide Area Network — Réseau étendu (Internet)"
            },
            {
              "front": "IP",
              "back": "Internet Protocol — Adresse unique qui identifie ton appareil sur le réseau"
            },
            {
              "front": "DNS",
              "back": "Domain Name System — L'annuaire d'Internet (traduit les noms en adresses IP)"
            },
            {
              "front": "Routeur",
              "back": "Dirige le trafic entre ton réseau local et Internet"
            },
            {
              "front": "Ethernet",
              "back": "Connexion filaire par câble RJ45, plus stable que le Wi-Fi"
            }
          ]
        },
        {
          "type": "list",
          "title": "Les équipements réseau :",
          "items": [
            "Routeur/Box — dirige le trafic entre ton réseau et Internet",
            "Switch — connecte les appareils entre eux dans un même réseau",
            "Point d'accès Wi-Fi — permet la connexion sans fil",
            "Câble Ethernet (RJ45) — connexion filaire, plus rapide et stable",
            "Fibre optique — transmet les données par la lumière, ultra rapide !"
          ]
        },
        {
          "type": "fun-fact",
          "text": "Il y a plus de 500 câbles sous-marins (des câbles de fibre optique posés au fond des océans !) qui relient les continents entre eux. Certains font plus de 20 000 km ! 🌊"
        },
        {
          "type": "highlight",
          "text": "Ton adresse IP, c'est comme ton adresse postale sur Internet. Elle permet aux autres machines de savoir où t'envoyer les données."
        }
      ]
    },
    {
      "title": "Comment fonctionne Internet ?",
      "icon": "🚀",
      "content": [
        {
          "type": "paragraph",
          "text": "Quand tu tapes \"youtube.com\" dans ton navigateur, il se passe plein de choses en quelques millisecondes !"
        },
        {
          "type": "drag-sort",
          "question": "Remets dans l'ordre le voyage d'une page web :",
          "items": [
            "Tu tapes l'adresse dans le navigateur",
            "Le DNS traduit le nom en adresse IP",
            "Ton PC envoie une requête HTTP au serveur",
            "Les routeurs relaient les paquets sur le réseau",
            "Le serveur reçoit et prépare la réponse",
            "Le serveur renvoie les données en paquets",
            "Ton navigateur assemble et affiche la page"
          ]
        },
        {
          "type": "analogy",
          "text": "📞 Le DNS, c'est l'annuaire d'Internet. Tu connais le nom (youtube.com) mais pas le \"numéro de téléphone\" (adresse IP). Le DNS le cherche pour toi !"
        },
        {
          "type": "analogy",
          "text": "📦 Les données ne voyagent pas en un seul morceau. Elles sont découpées en petits \"paquets\" (comme des lettres séparées) qui peuvent prendre des chemins différents et se recombinent à l'arrivée."
        },
        {
          "type": "fun-fact",
          "text": "Un paquet de données peut faire le tour de la planète en une à deux dixièmes de seconde, à peu près le temps d'un clignement d'œil ! ⚡"
        },
        {
          "type": "highlight",
          "text": "HTTPS (le cadenas 🔒 dans l'adresse) signifie que la connexion est chiffrée. Personne ne peut lire tes données pendant le trajet entre ton ordi et le serveur (le site, lui, les reçoit bien sûr)."
        },
        {
          "type": "mini-terminal",
          "title": "Essaie des commandes réseau !",
          "commands": {
            "ping google.com": "PING google.com (142.250.74.238)\n64 bytes: icmp_seq=1 ttl=118 time=12.4 ms\n64 bytes: icmp_seq=2 ttl=118 time=11.8 ms\n--- 4 packets transmitted, 4 received, 0% loss ---",
            "nslookup youtube.com": "Server:  dns.google\nAddress: 8.8.8.8\n\nName:    youtube.com\nAddress: 142.250.179.110",
            "traceroute google.com": "1  192.168.1.1 (box) 1.2ms\n2  10.0.0.1 (FAI) 8.5ms\n3  72.14.194.65 (Paris) 12.1ms\n4  142.250.74.238 (google.com) 14.3ms\n--- Trace complete ---",
            "ipconfig": "Adaptateur Wi-Fi :\n  Adresse IPv4 : 192.168.1.42\n  Masque : 255.255.255.0\n  Passerelle : 192.168.1.1",
            "help": "Commandes disponibles :\n  ping <site>      — Tester la connexion\n  nslookup <site>  — Trouver l'IP d'un site\n  traceroute <site> — Voir le chemin réseau\n  ipconfig         — Voir ta config réseau"
          }
        }
      ]
    },
    {
      "title": "Le Wi-Fi et le Cloud",
      "icon": "☁️",
      "content": [
        {
          "type": "paragraph",
          "text": "Le Wi-Fi et le Cloud sont deux technologies qu'on utilise tous les jours sans forcément comprendre comment ça marche !"
        },
        {
          "type": "analogy",
          "text": "📡 Le Wi-Fi, c'est un peu comme une radio : ta box émet un signal invisible (des ondes radio) que tes appareils captent. Plus tu es loin, plus le signal est faible, comme quand tu t'éloignes d'une enceinte."
        },
        {
          "type": "list",
          "title": "Wi-Fi : les bandes de fréquence :",
          "items": [
            "2.4 GHz — va loin, traverse bien les murs, mais plus lent",
            "5 GHz — plus rapide, mais portée plus courte",
            "6 GHz (Wi-Fi 6E) — encore plus rapide, technologie récente"
          ]
        },
        {
          "type": "true-false",
          "title": "Vrai ou Faux — Wi-Fi & Cloud",
          "statements": [
            {
              "text": "Le Cloud stocke tes données dans un vrai nuage",
              "answer": false,
              "explanation": "Le Cloud, ce sont des serveurs physiques bien réels dans des data centers."
            },
            {
              "text": "Le Wi-Fi 5 GHz est plus rapide que le 2.4 GHz",
              "answer": true,
              "explanation": "Le 5 GHz offre plus de débit, mais avec une portée réduite."
            },
            {
              "text": "Un grand data center peut consommer autant d'électricité qu'une ville moyenne",
              "answer": true,
              "explanation": "Les grands data centers ont une consommation électrique énorme et nécessitent des systèmes de refroidissement massifs."
            }
          ]
        },
        {
          "type": "paragraph",
          "text": "Le Cloud (\"nuage\"), ce n'est pas de la magie : ce sont tout simplement des serveurs (de gros ordinateurs surpuissants) rangés dans des data centers, accessibles via Internet."
        },
        {
          "type": "analogy",
          "text": "🏗️ Un data center, c'est comme un énorme entrepôt rempli d'ordinateurs qui tournent 24h/24. Google, Amazon, Microsoft... ils en ont des centaines partout dans le monde."
        },
        {
          "type": "fun-fact",
          "text": "Un grand data center peut consommer autant d'électricité qu'une ville moyenne ! Celui de Google en Finlande utilise même l'eau de mer pour refroidir ses serveurs 🌊"
        },
        {
          "type": "highlight",
          "text": "Quand on dit \"Mes fichiers sont dans le Cloud\", ça veut simplement dire qu'ils sont stockés sur le disque dur d'un serveur quelque part dans le monde, accessible via Internet."
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Que fait le DNS ?",
      "options": [
        "Bloque les virus",
        "Traduit les noms de domaine en adresses IP",
        "Stocke les fichiers",
        "Accélère le Wi-Fi"
      ],
      "correct": 1,
      "explanation": "Le DNS est l'annuaire d'Internet : il traduit \"youtube.com\" en adresse IP compréhensible par les machines."
    },
    {
      "question": "Qu'est-ce qu'un réseau local (LAN) ?",
      "options": [
        "Internet",
        "Un réseau d'appareils connectés localement",
        "Un satellite",
        "Un câble sous-marin"
      ],
      "correct": 1,
      "explanation": "Un LAN (Local Area Network) relie les appareils d'un même lieu : maison, bureau, école..."
    },
    {
      "question": "Le Cloud, c'est concrètement...",
      "options": [
        "Un nuage de données flottant",
        "Des serveurs dans des data centers",
        "Un satellite en orbite",
        "Un disque dur portable"
      ],
      "correct": 1,
      "explanation": "Le Cloud ce sont des serveurs physiques bien réels, installés dans d'immenses data centers."
    },
    {
      "question": "Quelle bande Wi-Fi a la meilleure portée ?",
      "options": [
        "5 GHz",
        "2.4 GHz",
        "6 GHz",
        "Bluetooth"
      ],
      "correct": 1,
      "explanation": "Le 2.4 GHz porte plus loin et traverse mieux les murs, même si le 5 GHz est plus rapide."
    },
    {
      "question": "Que signifie HTTPS ?",
      "options": [
        "Connexion rapide",
        "Connexion chiffrée et sécurisée",
        "Connexion gratuite",
        "Connexion Wi-Fi"
      ],
      "correct": 1,
      "explanation": "Le S de HTTPS signifie \"Secure\" : tes données sont chiffrées pendant le transport."
    },
    {
      "question": "Comment naviguent les données sur Internet ?",
      "options": [
        "En un seul bloc",
        "Découpées en paquets",
        "Par satellite uniquement",
        "Par Bluetooth"
      ],
      "correct": 1,
      "explanation": "Les données sont découpées en paquets qui voyagent indépendamment et se recombinent à l'arrivée."
    },
    {
      "question": "Que fait un routeur ?",
      "options": [
        "Il stocke les sites web",
        "Il dirige les paquets vers le bon réseau",
        "Il traduit les noms en adresses IP",
        "Il chiffre ton disque"
      ],
      "correct": 1,
      "explanation": "Le routeur choisit par où envoyer chaque paquet pour qu'il atteigne sa destination."
    },
    {
      "question": "Quel support transmet les données sous forme de lumière ?",
      "options": [
        "Le câble RJ45",
        "Le Wi-Fi",
        "La fibre optique",
        "Le Bluetooth"
      ],
      "correct": 2,
      "explanation": "La fibre optique guide des impulsions de lumière dans un fil de verre très fin."
    }
  ]
};
