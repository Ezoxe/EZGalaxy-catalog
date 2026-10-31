// Shared metadata: module order, tiers, levels and badges.
// The server awards badges (backend/game.py) from the ids listed here.

export const MODULE_ORDER = [
  'hardware', 'daily', 'networks', 'dev', 'os', 'security',
  'enterprise', 'databases', 'scripting', 'cloud', 'ai',
];

export const TIERS = {
  1: 'Découverte',
  2: 'Intermédiaire',
  3: 'Avancé',
  4: 'Expert',
};

export const LEVELS = [
  { min: 0, title: 'Stagiaire', icon: '🐣' },
  { min: 50, title: 'Initié', icon: '🌱' },
  { min: 150, title: 'Technicien', icon: '🔧' },
  { min: 300, title: 'Expert', icon: '🚀' },
  { min: 500, title: 'Hacker Éthique', icon: '🎯' },
  { min: 750, title: 'Architecte IT', icon: '👑' },
  { min: 1000, title: 'CTO', icon: '🏆' },
  { min: 1500, title: 'Légende', icon: '💎' },
];

export const BADGES = [
  { id: 'first-login', title: 'Bienvenue', icon: '👋', desc: 'Créer ton compte', group: 'special' },
  { id: 'first-step', title: 'Premier Pas', icon: '👣', desc: 'Terminer ta première leçon', group: 'progress' },
  { id: 'curious', title: 'Curieux', icon: '🔍', desc: 'Terminer 5 leçons', group: 'progress' },
  { id: 'encyclopedia', title: 'Encyclopédie', icon: '📚', desc: 'Terminer toutes les leçons', group: 'progress' },
  { id: 'quiz-master', title: 'Quiz Master', icon: '🏆', desc: 'Faire un sans-faute à un quiz de module', group: 'quiz' },
  { id: 'flawless', title: 'Sans Faute', icon: '💎', desc: 'Faire un sans-faute à 3 quiz', group: 'quiz' },
  { id: 'perfectionist', title: 'Perfectionniste', icon: '🌟', desc: 'Faire un sans-faute à 5 quiz', group: 'quiz' },
  { id: 'speed-demon', title: 'Speed Demon', icon: '⚡', desc: 'Sans-faute à un quiz en moins de 30 secondes', group: 'quiz' },
  { id: 'unstoppable', title: 'Inarrêtable', icon: '🔥', desc: '5 bonnes réponses d\'affilée', group: 'streak' },
  { id: 'streak-10', title: 'Flamme Éternelle', icon: '🔥', desc: '10 bonnes réponses d\'affilée', group: 'streak' },
  { id: 'streak-20', title: 'Machine', icon: '🤖', desc: '20 bonnes réponses d\'affilée', group: 'streak' },
  { id: 'xp-100', title: 'Centurion', icon: '💯', desc: 'Atteindre 100 XP', group: 'xp' },
  { id: 'xp-500', title: 'Demi-Millier', icon: '⭐', desc: 'Atteindre 500 XP', group: 'xp' },
  { id: 'xp-1000', title: 'Millionnaire', icon: '💰', desc: 'Atteindre 1000 XP', group: 'xp' },
  { id: 'tier-2-unlocked', title: 'Explorateur', icon: '🗺️', desc: 'Débloquer le niveau Intermédiaire', group: 'tiers' },
  { id: 'tier-3-unlocked', title: 'Aventurier', icon: '⛰️', desc: 'Débloquer le niveau Avancé', group: 'tiers' },
  { id: 'tier-4-unlocked', title: 'Maître IT', icon: '🏔️', desc: 'Débloquer le niveau Expert', group: 'tiers' },
  { id: 'completionist', title: 'Complétiste', icon: '🏅', desc: 'Terminer tous les modules', group: 'special' },
  { id: 'speedrun-25', title: 'Speedrunner', icon: '🏃', desc: 'Marquer 25 points en Speedrun', group: 'arcade' },
  { id: 'survivor-10', title: 'Survivant', icon: '🛡️', desc: 'Marquer 10 points en Survie', group: 'arcade' },
  { id: 'daily-3', title: 'Régulier', icon: '📅', desc: 'Réussir 3 défis du jour', group: 'arcade' },
  { id: 'daily-7', title: 'Assidu', icon: '🔁', desc: 'Réussir 7 défis du jour', group: 'arcade' },
  { id: 'hardware-hero', title: 'Hardware Hero', icon: '🖥️', desc: 'Module « C\'est quoi l\'informatique ? » terminé', group: 'modules' },
  { id: 'digital-native', title: 'Digital Native', icon: '📱', desc: 'Module « Le numérique au quotidien » terminé', group: 'modules' },
  { id: 'network-ninja', title: 'Network Ninja', icon: '🌐', desc: 'Module « Réseaux & Internet » terminé', group: 'modules' },
  { id: 'code-wizard', title: 'Code Wizard', icon: '🧙', desc: 'Module « Développement & IA » terminé', group: 'modules' },
  { id: 'os-master', title: 'OS Master', icon: '🐧', desc: 'Module « Systèmes d\'exploitation » terminé', group: 'modules' },
  { id: 'cyber-guardian', title: 'Cyber Guardian', icon: '🛡️', desc: 'Module « Cybersécurité » terminé', group: 'modules' },
  { id: 'it-pro', title: 'IT Pro', icon: '💼', desc: 'Module « L\'informatique en entreprise » terminé', group: 'modules' },
  { id: 'data-master', title: 'Data Master', icon: '🗄️', desc: 'Module « Bases de données & Big Data » terminé', group: 'modules' },
  { id: 'script-master', title: 'Script Master', icon: '⚙️', desc: 'Module « Automatisation & Scripting » terminé', group: 'modules' },
  { id: 'cloud-master', title: 'Cloud Architect', icon: '☁️', desc: 'Module « Cloud & DevOps » terminé', group: 'modules' },
  { id: 'ai-master', title: 'IA Master', icon: '🤖', desc: 'Module « Intelligence artificielle avancée » terminé', group: 'modules' },
];

export const MODULE_BADGES = {
  hardware: 'hardware-hero',
  daily: 'digital-native',
  networks: 'network-ninja',
  dev: 'code-wizard',
  os: 'os-master',
  security: 'cyber-guardian',
  enterprise: 'it-pro',
  databases: 'data-master',
  scripting: 'script-master',
  cloud: 'cloud-master',
  ai: 'ai-master',
};
