/**
 * SOPOR - Story & Quest System
 * Handles narrative, quests, dialogue, and story progression
 */

import { STRATA } from '../core/constants.js';
import { t } from '../core/i18n.js';

// ========== Story Acts ==========

export const STORY_ACTS = {
  PROLOGUE: 'prologue',
  ACT_1: 'act_1',     // Le Jardin du Somnambule
  ACT_2: 'act_2',     // La Forge des Cauchemars
  ACT_3: 'act_3',     // L'Abîme Cristallin
  FINALE: 'finale',   // Le Nexus de l'Oubli
  EPILOGUE: 'epilogue',
};

// ========== Story Configuration ==========

export const STORY_CONFIG = {
  [STORY_ACTS.PROLOGUE]: {
    titleKey: 'story.prologue.title',
    descKey: 'story.prologue.desc',
    stratum: null,
    requiredLevel: 1,
    introDialogue: [
      { speaker: 'narrator', key: 'story.prologue.intro.1' },
      { speaker: 'narrator', key: 'story.prologue.intro.2' },
      { speaker: 'echo', key: 'story.prologue.intro.3' },
    ],
    objectives: [
      { id: 'learn_movement', type: 'tutorial', descKey: 'objective.learn_movement' },
      { id: 'learn_attack', type: 'tutorial', descKey: 'objective.learn_attack' },
      { id: 'learn_dash', type: 'tutorial', descKey: 'objective.learn_dash' },
    ],
    completionDialogue: [
      { speaker: 'echo', key: 'story.prologue.complete.1' },
    ],
    rewards: {
      xp: 50,
      items: ['rusty_blade'],
    },
    nextAct: STORY_ACTS.ACT_1,
  },
  
  [STORY_ACTS.ACT_1]: {
    titleKey: 'story.act1.title',
    descKey: 'story.act1.desc',
    stratum: STRATA.JARDIN,
    requiredLevel: 1,
    introDialogue: [
      { speaker: 'narrator', key: 'story.act1.intro.1' },
      { speaker: 'echo', key: 'story.act1.intro.2' },
      { speaker: 'narrator', key: 'story.act1.intro.3' },
    ],
    objectives: [
      { id: 'explore_jardin', type: 'explore', descKey: 'objective.explore_jardin', target: 50 },
      { id: 'kill_enemies_1', type: 'kill', descKey: 'objective.kill_enemies', target: 15 },
      { id: 'find_memory_1', type: 'collect', descKey: 'objective.find_memory', target: 1 },
      { id: 'defeat_guardian', type: 'boss', descKey: 'objective.defeat_guardian', bossId: 'guardian_roots' },
    ],
    midDialogue: {
      explore_jardin: [
        { speaker: 'echo', key: 'story.act1.mid.explore' },
      ],
      find_memory_1: [
        { speaker: 'narrator', key: 'story.act1.mid.memory' },
        { speaker: 'voice', key: 'story.act1.mid.memory.2', style: 'italic' },
      ],
    },
    bossIntroDialogue: [
      { speaker: 'narrator', key: 'story.act1.boss.intro.1' },
      { speaker: 'guardian', key: 'story.act1.boss.intro.2' },
    ],
    completionDialogue: [
      { speaker: 'narrator', key: 'story.act1.complete.1' },
      { speaker: 'echo', key: 'story.act1.complete.2' },
    ],
    rewards: {
      xp: 500,
      items: ['seed_of_awakening', 'jardin_key'],
      skillPoints: 1,
    },
    nextAct: STORY_ACTS.ACT_2,
  },
  
  [STORY_ACTS.ACT_2]: {
    titleKey: 'story.act2.title',
    descKey: 'story.act2.desc',
    stratum: STRATA.FORGE,
    requiredLevel: 5,
    introDialogue: [
      { speaker: 'narrator', key: 'story.act2.intro.1' },
      { speaker: 'echo', key: 'story.act2.intro.2' },
      { speaker: 'narrator', key: 'story.act2.intro.3' },
    ],
    objectives: [
      { id: 'explore_forge', type: 'explore', descKey: 'objective.explore_forge', target: 60 },
      { id: 'kill_enemies_2', type: 'kill', descKey: 'objective.kill_enemies_forge', target: 25 },
      { id: 'collect_embers', type: 'collect', descKey: 'objective.collect_embers', target: 3 },
      { id: 'survive_trial', type: 'survive', descKey: 'objective.survive_trial', duration: 60 },
      { id: 'defeat_forger', type: 'boss', descKey: 'objective.defeat_forger', bossId: 'nightmare_forger' },
    ],
    midDialogue: {
      collect_embers: [
        { speaker: 'narrator', key: 'story.act2.mid.embers' },
      ],
      survive_trial: [
        { speaker: 'echo', key: 'story.act2.mid.trial' },
      ],
    },
    bossIntroDialogue: [
      { speaker: 'narrator', key: 'story.act2.boss.intro.1' },
      { speaker: 'forger', key: 'story.act2.boss.intro.2' },
      { speaker: 'forger', key: 'story.act2.boss.intro.3' },
    ],
    completionDialogue: [
      { speaker: 'narrator', key: 'story.act2.complete.1' },
      { speaker: 'echo', key: 'story.act2.complete.2' },
      { speaker: 'narrator', key: 'story.act2.complete.3' },
    ],
    rewards: {
      xp: 800,
      items: ['nightmare_ember', 'forge_key', 'forged_armor'],
      skillPoints: 2,
    },
    nextAct: STORY_ACTS.ACT_3,
  },
  
  [STORY_ACTS.ACT_3]: {
    titleKey: 'story.act3.title',
    descKey: 'story.act3.desc',
    stratum: STRATA.ABIME,
    requiredLevel: 10,
    introDialogue: [
      { speaker: 'narrator', key: 'story.act3.intro.1' },
      { speaker: 'narrator', key: 'story.act3.intro.2' },
      { speaker: 'echo', key: 'story.act3.intro.3' },
    ],
    objectives: [
      { id: 'explore_abime', type: 'explore', descKey: 'objective.explore_abime', target: 70 },
      { id: 'kill_enemies_3', type: 'kill', descKey: 'objective.kill_enemies_abime', target: 35 },
      { id: 'collect_crystals', type: 'collect', descKey: 'objective.collect_crystals', target: 5 },
      { id: 'solve_puzzle', type: 'puzzle', descKey: 'objective.solve_puzzle', puzzleId: 'crystal_alignment' },
      { id: 'defeat_crystal_lord', type: 'boss', descKey: 'objective.defeat_crystal_lord', bossId: 'crystal_lord' },
    ],
    midDialogue: {
      collect_crystals: [
        { speaker: 'narrator', key: 'story.act3.mid.crystals' },
        { speaker: 'voice', key: 'story.act3.mid.crystals.2', style: 'whisper' },
      ],
      solve_puzzle: [
        { speaker: 'echo', key: 'story.act3.mid.puzzle' },
      ],
    },
    bossIntroDialogue: [
      { speaker: 'narrator', key: 'story.act3.boss.intro.1' },
      { speaker: 'crystal_lord', key: 'story.act3.boss.intro.2' },
    ],
    completionDialogue: [
      { speaker: 'narrator', key: 'story.act3.complete.1' },
      { speaker: 'echo', key: 'story.act3.complete.2' },
      { speaker: 'echo', key: 'story.act3.complete.3', style: 'concerned' },
    ],
    rewards: {
      xp: 1200,
      items: ['crystal_heart', 'abime_key', 'frost_cloak'],
      skillPoints: 2,
    },
    nextAct: STORY_ACTS.FINALE,
  },
  
  [STORY_ACTS.FINALE]: {
    titleKey: 'story.finale.title',
    descKey: 'story.finale.desc',
    stratum: STRATA.NEXUS,
    requiredLevel: 15,
    introDialogue: [
      { speaker: 'narrator', key: 'story.finale.intro.1' },
      { speaker: 'narrator', key: 'story.finale.intro.2' },
      { speaker: 'echo', key: 'story.finale.intro.3' },
      { speaker: 'narrator', key: 'story.finale.intro.4' },
    ],
    objectives: [
      { id: 'reach_nexus', type: 'explore', descKey: 'objective.reach_nexus', target: 80 },
      { id: 'collect_fragments', type: 'collect', descKey: 'objective.collect_fragments', target: 4 },
      { id: 'defeat_architect', type: 'boss', descKey: 'objective.defeat_architect', bossId: 'fallen_architect' },
    ],
    midDialogue: {
      collect_fragments: [
        { speaker: 'narrator', key: 'story.finale.mid.fragments' },
        { speaker: 'voice', key: 'story.finale.mid.fragments.2', style: 'echo' },
      ],
    },
    bossIntroDialogue: [
      { speaker: 'narrator', key: 'story.finale.boss.intro.1' },
      { speaker: 'architect', key: 'story.finale.boss.intro.2' },
      { speaker: 'architect', key: 'story.finale.boss.intro.3' },
      { speaker: 'echo', key: 'story.finale.boss.intro.4' },
    ],
    completionDialogue: [
      { speaker: 'narrator', key: 'story.finale.complete.1' },
      { speaker: 'narrator', key: 'story.finale.complete.2' },
      { speaker: 'echo', key: 'story.finale.complete.3' },
    ],
    rewards: {
      xp: 2000,
      items: ['architect_core', 'void_essence', 'awakened_blade'],
      skillPoints: 3,
      unlocks: ['new_game_plus'],
    },
    nextAct: STORY_ACTS.EPILOGUE,
  },
  
  [STORY_ACTS.EPILOGUE]: {
    titleKey: 'story.epilogue.title',
    descKey: 'story.epilogue.desc',
    stratum: null,
    requiredLevel: 1,
    introDialogue: [
      { speaker: 'narrator', key: 'story.epilogue.1' },
      { speaker: 'narrator', key: 'story.epilogue.2' },
      { speaker: 'narrator', key: 'story.epilogue.3' },
      { speaker: 'echo', key: 'story.epilogue.4' },
      { speaker: 'narrator', key: 'story.epilogue.5' },
    ],
    objectives: [],
    completionDialogue: [],
    rewards: {
      unlocks: ['gallery', 'sound_test', 'true_ending_conditions'],
    },
    nextAct: null,
  },
};

// ========== Side Quests ==========

export const SIDE_QUESTS = {
  // Repeatable exploration quests
  explore_dungeon: {
    titleKey: 'quest.explore_dungeon.title',
    descKey: 'quest.explore_dungeon.desc',
    repeatable: true,
    objectives: [
      { id: 'clear_dungeon', type: 'dungeon', descKey: 'objective.clear_dungeon' },
    ],
    rewards: (dungeonDepth) => ({
      xp: 100 + dungeonDepth * 30,
      gold: 50 + dungeonDepth * 20,
    }),
  },
  
  // Collection quests
  collect_memories: {
    titleKey: 'quest.collect_memories.title',
    descKey: 'quest.collect_memories.desc',
    repeatable: false,
    objectives: [
      { id: 'find_memories', type: 'collect', descKey: 'objective.find_all_memories', target: 10 },
    ],
    rewards: {
      xp: 500,
      items: ['memory_crown'],
      unlocks: ['lore_gallery'],
    },
  },
  
  // Combat challenges
  defeat_horde: {
    titleKey: 'quest.defeat_horde.title',
    descKey: 'quest.defeat_horde.desc',
    repeatable: true,
    objectives: [
      { id: 'kill_wave', type: 'kill', descKey: 'objective.kill_wave', target: 50 },
    ],
    rewards: {
      xp: 300,
      gold: 100,
    },
  },
  
  // Speedrun challenge
  speedrun_stratum: {
    titleKey: 'quest.speedrun.title',
    descKey: 'quest.speedrun.desc',
    repeatable: true,
    objectives: [
      { id: 'clear_fast', type: 'timed', descKey: 'objective.clear_fast', timeLimit: 300 },
    ],
    rewards: {
      xp: 400,
      items: ['speed_boots'],
    },
  },
  
  // No damage challenge
  perfect_boss: {
    titleKey: 'quest.perfect_boss.title',
    descKey: 'quest.perfect_boss.desc',
    repeatable: true,
    objectives: [
      { id: 'no_damage_boss', type: 'nodamage', descKey: 'objective.no_damage_boss' },
    ],
    rewards: {
      xp: 1000,
      items: ['perfectionist_ring'],
      titles: ['Le Parfait'],
    },
  },
};

// ========== Quest State Management ==========

/**
 * Create default story state
 */
export function createStoryState() {
  return {
    currentAct: STORY_ACTS.PROLOGUE,
    completedActs: [],
    objectiveProgress: {},
    sideQuestsActive: [],
    sideQuestsCompleted: [],
    dialoguesSeen: new Set(),
    memoriesCollected: 0,
    totalPlayTime: 0,
    deathCount: 0,
    bossesDefeated: [],
    secretsFound: [],
    newGamePlusCount: 0,
  };
}

/**
 * Start a new act
 */
export function startAct(storyState, actId) {
  const config = STORY_CONFIG[actId];
  if (!config) return { success: false, reason: 'unknown_act' };
  
  storyState.currentAct = actId;
  storyState.objectiveProgress[actId] = {};
  
  // Initialize objective progress
  for (const obj of config.objectives) {
    storyState.objectiveProgress[actId][obj.id] = {
      completed: false,
      progress: 0,
      target: obj.target || 1,
    };
  }
  
  return {
    success: true,
    actId,
    config,
    introDialogue: config.introDialogue,
  };
}

/**
 * Update objective progress
 */
export function updateObjective(storyState, actId, objectiveId, amount = 1) {
  const actProgress = storyState.objectiveProgress[actId];
  if (!actProgress || !actProgress[objectiveId]) {
    return { success: false, reason: 'invalid_objective' };
  }
  
  const objProgress = actProgress[objectiveId];
  if (objProgress.completed) {
    return { success: false, reason: 'already_completed' };
  }
  
  objProgress.progress += amount;
  
  const config = STORY_CONFIG[actId];
  const objConfig = config.objectives.find(o => o.id === objectiveId);
  
  if (objProgress.progress >= objProgress.target) {
    objProgress.completed = true;
    objProgress.progress = objProgress.target;
    
    // Get mid-dialogue if available
    const midDialogue = config.midDialogue && config.midDialogue[objectiveId];
    
    return {
      success: true,
      completed: true,
      objective: objConfig,
      midDialogue,
    };
  }
  
  return {
    success: true,
    completed: false,
    progress: objProgress.progress,
    target: objProgress.target,
    percent: objProgress.progress / objProgress.target,
  };
}

/**
 * Check if all objectives complete
 */
export function areAllObjectivesComplete(storyState, actId) {
  const actProgress = storyState.objectiveProgress[actId];
  if (!actProgress) return false;
  
  for (const [objId, progress] of Object.entries(actProgress)) {
    if (!progress.completed) return false;
  }
  
  return true;
}

/**
 * Complete current act
 */
export function completeAct(storyState, actId) {
  const config = STORY_CONFIG[actId];
  if (!config) return { success: false, reason: 'unknown_act' };
  
  if (!areAllObjectivesComplete(storyState, actId)) {
    return { success: false, reason: 'objectives_incomplete' };
  }
  
  if (!storyState.completedActs.includes(actId)) {
    storyState.completedActs.push(actId);
  }
  
  return {
    success: true,
    completionDialogue: config.completionDialogue,
    rewards: config.rewards,
    nextAct: config.nextAct,
  };
}

/**
 * Check if can start act
 */
export function canStartAct(storyState, actId, playerLevel) {
  const config = STORY_CONFIG[actId];
  if (!config) return { can: false, reason: 'unknown_act' };
  
  // Check level requirement
  if (playerLevel < config.requiredLevel) {
    return { can: false, reason: 'level_too_low', required: config.requiredLevel };
  }
  
  // Check previous act completion
  const actKeys = Object.keys(STORY_CONFIG);
  const currentIndex = actKeys.indexOf(actId);
  
  if (currentIndex > 0) {
    const previousAct = actKeys[currentIndex - 1];
    if (!storyState.completedActs.includes(previousAct)) {
      return { can: false, reason: 'previous_incomplete', required: previousAct };
    }
  }
  
  return { can: true };
}

// ========== Dialogue System ==========

/**
 * Dialogue speaker configurations
 */
export const SPEAKERS = {
  narrator: {
    nameKey: null, // No name displayed
    color: '#ffffff',
    style: 'italic',
  },
  echo: {
    nameKey: 'speaker.echo',
    color: '#88ccff',
    style: 'normal',
  },
  voice: {
    nameKey: 'speaker.voice',
    color: '#aaaaaa',
    style: 'italic',
  },
  guardian: {
    nameKey: 'speaker.guardian',
    color: '#4a7c3f',
    style: 'bold',
  },
  forger: {
    nameKey: 'speaker.forger',
    color: '#c45c2a',
    style: 'bold',
  },
  crystal_lord: {
    nameKey: 'speaker.crystal_lord',
    color: '#6fa8dc',
    style: 'bold',
  },
  architect: {
    nameKey: 'speaker.architect',
    color: '#9933ff',
    style: 'bold',
  },
};

/**
 * Format dialogue entry for display
 */
export function formatDialogue(entry) {
  const speaker = SPEAKERS[entry.speaker] || SPEAKERS.narrator;
  
  return {
    speakerName: speaker.nameKey ? t(speaker.nameKey) : null,
    text: t(entry.key),
    color: speaker.color,
    style: entry.style || speaker.style,
    delay: entry.delay || 0,
    autoAdvance: entry.autoAdvance || false,
    autoAdvanceDelay: entry.autoAdvanceDelay || 3000,
  };
}

/**
 * Create dialogue sequence
 */
export function createDialogueSequence(entries) {
  return {
    entries: entries.map(formatDialogue),
    currentIndex: 0,
    isComplete: false,
  };
}

/**
 * Advance dialogue
 */
export function advanceDialogue(sequence) {
  if (sequence.currentIndex < sequence.entries.length - 1) {
    sequence.currentIndex++;
    return {
      hasMore: sequence.currentIndex < sequence.entries.length - 1,
      currentEntry: sequence.entries[sequence.currentIndex],
    };
  }
  
  sequence.isComplete = true;
  return { hasMore: false, currentEntry: null };
}

// ========== Memory Fragments (Lore) ==========

export const MEMORY_FRAGMENTS = {
  memory_01: {
    titleKey: 'memory.01.title',
    textKey: 'memory.01.text',
    location: STRATA.JARDIN,
  },
  memory_02: {
    titleKey: 'memory.02.title',
    textKey: 'memory.02.text',
    location: STRATA.JARDIN,
  },
  memory_03: {
    titleKey: 'memory.03.title',
    textKey: 'memory.03.text',
    location: STRATA.FORGE,
  },
  memory_04: {
    titleKey: 'memory.04.title',
    textKey: 'memory.04.text',
    location: STRATA.FORGE,
  },
  memory_05: {
    titleKey: 'memory.05.title',
    textKey: 'memory.05.text',
    location: STRATA.ABIME,
  },
  memory_06: {
    titleKey: 'memory.06.title',
    textKey: 'memory.06.text',
    location: STRATA.ABIME,
  },
  memory_07: {
    titleKey: 'memory.07.title',
    textKey: 'memory.07.text',
    location: STRATA.NEXUS,
  },
  memory_08: {
    titleKey: 'memory.08.title',
    textKey: 'memory.08.text',
    location: STRATA.NEXUS,
  },
  memory_09: {
    titleKey: 'memory.09.title',
    textKey: 'memory.09.text',
    location: STRATA.NEXUS,
  },
  memory_10: {
    titleKey: 'memory.10.title',
    textKey: 'memory.10.text',
    location: STRATA.NEXUS,
  },
};

/**
 * Collect memory fragment
 */
export function collectMemory(storyState, memoryId) {
  if (storyState.secretsFound.includes(memoryId)) {
    return { success: false, reason: 'already_collected' };
  }
  
  const fragment = MEMORY_FRAGMENTS[memoryId];
  if (!fragment) {
    return { success: false, reason: 'unknown_memory' };
  }
  
  storyState.secretsFound.push(memoryId);
  storyState.memoriesCollected++;
  
  return {
    success: true,
    fragment,
    totalCollected: storyState.memoriesCollected,
    totalFragments: Object.keys(MEMORY_FRAGMENTS).length,
  };
}

// ========== New Game Plus ==========

/**
 * Start New Game Plus
 */
export function startNewGamePlus(storyState, characterState) {
  storyState.newGamePlusCount++;
  storyState.currentAct = STORY_ACTS.PROLOGUE;
  storyState.objectiveProgress = {};
  storyState.dialoguesSeen.clear();
  
  // Keep these
  // - memoriesCollected
  // - secretsFound
  // - bossesDefeated
  // - completedActs (for achievements)
  
  // Scale difficulty
  const ngPlusScaling = 1 + storyState.newGamePlusCount * 0.2;
  
  return {
    ngPlusCount: storyState.newGamePlusCount,
    enemyScaling: ngPlusScaling,
    rewardScaling: 1 + storyState.newGamePlusCount * 0.1,
    newUnlocks: storyState.newGamePlusCount >= 1 ? ['hard_mode'] : [],
  };
}

// ========== Type Definitions ==========

/**
 * @typedef {object} StoryState
 * @property {string} currentAct
 * @property {string[]} completedActs
 * @property {object} objectiveProgress
 * @property {string[]} sideQuestsActive
 * @property {string[]} sideQuestsCompleted
 * @property {Set<string>} dialoguesSeen
 * @property {number} memoriesCollected
 */

/**
 * @typedef {object} DialogueEntry
 * @property {string} speaker
 * @property {string} key
 * @property {string} [style]
 */

export default {
  STORY_ACTS,
  STORY_CONFIG,
  SIDE_QUESTS,
  SPEAKERS,
  MEMORY_FRAGMENTS,
  
  createStoryState,
  startAct,
  updateObjective,
  areAllObjectivesComplete,
  completeAct,
  canStartAct,
  
  formatDialogue,
  createDialogueSequence,
  advanceDialogue,
  
  collectMemory,
  startNewGamePlus,
};
