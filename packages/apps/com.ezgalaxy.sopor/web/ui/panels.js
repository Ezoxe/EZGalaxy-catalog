/**
 * SOPOR - UI Panels System
 * Inventory, Skills, Equipment, Settings panels
 */

import { t } from '../core/i18n.js';
import { RARITY, EQUIPMENT_SLOTS } from '../core/constants.js';
import { playUIClick, playMenuOpen, playMenuClose } from '../audio/sfx.js';
import { SKILL_TREE, SKILL_BRANCHES, canUpgradeSkill, upgradeSkill } from '../game/progression.js';

// ========== Panel Configuration ==========

export const PANEL_CONFIG = {
  // Overlay
  overlayColor: 'rgba(0, 0, 0, 0.7)',
  
  // Panel
  panelBg: '#1a1a2e',
  panelBorder: '#333355',
  panelRadius: 12,
  
  // Header
  headerBg: '#252540',
  headerHeight: 50,
  
  // Colors
  textColor: '#ffffff',
  textSecondary: '#aaaaaa',
  accentColor: '#6677cc',
  
  // Fonts
  fontFamily: 'monospace',
  titleSize: 20,
  textSize: 14,
  
  // Spacing
  padding: 20,
  itemSize: 48,
  itemSpacing: 8,
};

// ========== Rarity Colors ==========

export const RARITY_COLORS = {
  [RARITY.COMMON]: '#888888',
  [RARITY.UNCOMMON]: '#44aa44',
  [RARITY.RARE]: '#4488ff',
  [RARITY.EPIC]: '#aa44aa',
  [RARITY.LEGENDARY]: '#ffaa00',
};

// ========== Panel State ==========

/**
 * Create panel manager state
 */
export function createPanelManager() {
  return {
    activePanel: null,
    
    // Inventory state
    inventory: {
      selectedSlot: -1,
      scrollOffset: 0,
      filter: 'all', // all, weapon, armor, consumable
    },
    
    // Skills state
    skills: {
      selectedBranch: 0, // 0=eveil, 1=combat, 2=essence
      selectedSkill: null,
      skillPoints: 0,
    },
    
    // Equipment state
    equipment: {
      selectedSlot: null,
      comparing: null,
    },
    
    // Settings state
    settings: {
      section: 'general', // general, audio, controls, graphics
    },
    
    // Animation
    panelAlpha: 0,
    targetAlpha: 0,
  };
}

/**
 * Open panel
 */
export function openPanel(manager, panelName) {
  manager.activePanel = panelName;
  manager.targetAlpha = 1;
  playMenuOpen();
}

/**
 * Close panel
 */
export function closePanel(manager) {
  manager.targetAlpha = 0;
  playMenuClose();
  
  // Delay clearing active panel for animation
  setTimeout(() => {
    if (manager.targetAlpha === 0) {
      manager.activePanel = null;
    }
  }, 200);
}

/**
 * Toggle panel
 */
export function togglePanel(manager, panelName) {
  if (manager.activePanel === panelName) {
    closePanel(manager);
  } else {
    openPanel(manager, panelName);
  }
}

/**
 * Update panel animation
 */
export function updatePanels(manager, delta) {
  const speed = 0.15;
  manager.panelAlpha += (manager.targetAlpha - manager.panelAlpha) * speed;
  
  if (manager.panelAlpha < 0.01) {
    manager.panelAlpha = 0;
  }
  if (manager.panelAlpha > 0.99) {
    manager.panelAlpha = 1;
  }
}

// ========== Inventory Panel ==========

/**
 * Draw inventory panel
 */
export function drawInventoryPanel(ctx, manager, inventory, screenWidth, screenHeight) {
  const config = PANEL_CONFIG;
  const panelWidth = Math.min(600, screenWidth - 40);
  const panelHeight = Math.min(500, screenHeight - 80);
  const x = (screenWidth - panelWidth) / 2;
  const y = (screenHeight - panelHeight) / 2;
  
  // Panel background
  drawPanelBackground(ctx, x, y, panelWidth, panelHeight, t('inventory.title'));
  
  // Filter tabs
  const filters = ['all', 'weapon', 'armor', 'consumable'];
  const tabWidth = (panelWidth - config.padding * 2) / filters.length;
  const tabY = y + config.headerHeight + config.padding;
  
  filters.forEach((filter, i) => {
    const tabX = x + config.padding + i * tabWidth;
    const isActive = manager.inventory.filter === filter;
    
    ctx.fillStyle = isActive ? config.accentColor : '#333344';
    roundRect(ctx, tabX + 2, tabY, tabWidth - 4, 30, 4);
    ctx.fill();
    
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t(`inventory.filter.${filter}`), tabX + tabWidth / 2, tabY + 15);
  });
  
  // Item grid
  const gridY = tabY + 40;
  const gridWidth = panelWidth - config.padding * 2;
  const gridHeight = panelHeight - config.headerHeight - config.padding * 3 - 40;
  
  const cols = Math.floor(gridWidth / (config.itemSize + config.itemSpacing));
  
  // Ensure inventory is an array
  const items = Array.isArray(inventory) ? inventory : (inventory?.items || []);
  
  // Filter items
  const filteredItems = items.filter(item => {
    if (manager.inventory.filter === 'all') return true;
    return item.type === manager.inventory.filter;
  });
  
  // Draw items
  filteredItems.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const itemX = x + config.padding + col * (config.itemSize + config.itemSpacing);
    const itemY = gridY + row * (config.itemSize + config.itemSpacing) - manager.inventory.scrollOffset;
    
    // Skip if outside visible area
    if (itemY < gridY - config.itemSize || itemY > gridY + gridHeight) return;
    
    const isSelected = manager.inventory.selectedSlot === i;
    
    // Item background
    ctx.fillStyle = isSelected ? '#444466' : '#222233';
    ctx.strokeStyle = RARITY_COLORS[item.rarity] || RARITY_COLORS[RARITY.COMMON];
    ctx.lineWidth = 2;
    roundRect(ctx, itemX, itemY, config.itemSize, config.itemSize, 6);
    ctx.fill();
    ctx.stroke();
    
    // Item icon (placeholder)
    ctx.fillStyle = RARITY_COLORS[item.rarity] || config.textColor;
    ctx.font = `24px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getItemIcon(item.type), itemX + config.itemSize / 2, itemY + config.itemSize / 2);
    
    // Stack count
    if (item.count && item.count > 1) {
      ctx.fillStyle = config.textColor;
      ctx.font = `bold 12px ${config.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${item.count}`, itemX + config.itemSize - 4, itemY + config.itemSize - 4);
    }
  });
  
  // Selected item info
  if (manager.inventory.selectedSlot >= 0 && filteredItems[manager.inventory.selectedSlot]) {
    drawItemInfo(ctx, filteredItems[manager.inventory.selectedSlot], 
      x + panelWidth - 180, gridY, 160, gridHeight);
  }
}

/**
 * Draw item info tooltip
 */
function drawItemInfo(ctx, item, x, y, width, maxHeight) {
  const config = PANEL_CONFIG;
  
  ctx.fillStyle = '#1a1a2ecc';
  roundRect(ctx, x, y, width, 200, 8);
  ctx.fill();
  
  ctx.strokeStyle = RARITY_COLORS[item.rarity] || config.panelBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, 200, 8);
  ctx.stroke();
  
  let textY = y + 20;
  
  // Name
  ctx.fillStyle = RARITY_COLORS[item.rarity] || config.textColor;
  ctx.font = `bold ${config.textSize}px ${config.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText(item.name, x + 10, textY);
  textY += 20;
  
  // Type
  ctx.fillStyle = config.textSecondary;
  ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
  ctx.fillText(t(`item.type.${item.type}`), x + 10, textY);
  textY += 25;
  
  // Stats
  if (item.stats) {
    ctx.fillStyle = config.textColor;
    Object.entries(item.stats).forEach(([stat, value]) => {
      const sign = value >= 0 ? '+' : '';
      ctx.fillText(`${t(`stat.${stat}`)}: ${sign}${value}`, x + 10, textY);
      textY += 18;
    });
  }
  
  // Description
  if (item.description) {
    textY += 10;
    ctx.fillStyle = config.textSecondary;
    ctx.font = `italic ${config.textSize - 2}px ${config.fontFamily}`;
    
    // Word wrap
    const words = item.description.split(' ');
    let line = '';
    
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > width - 20) {
        ctx.fillText(line.trim(), x + 10, textY);
        textY += 16;
        line = word + ' ';
      } else {
        line = testLine;
      }
    });
    
    if (line.trim()) {
      ctx.fillText(line.trim(), x + 10, textY);
    }
  }
}

// ========== Skills Panel ==========

/**
 * Draw skills panel
 */
export function drawSkillsPanel(ctx, manager, playerSkills, skillPoints, screenWidth, screenHeight) {
  const config = PANEL_CONFIG;
  const panelWidth = Math.min(700, screenWidth - 40);
  const panelHeight = Math.min(550, screenHeight - 80);
  const x = (screenWidth - panelWidth) / 2;
  const y = (screenHeight - panelHeight) / 2;
  
  // Panel background
  drawPanelBackground(ctx, x, y, panelWidth, panelHeight, t('skills.title'));
  
  // Skill points
  ctx.fillStyle = '#ffcc44';
  ctx.font = `bold ${config.textSize}px ${config.fontFamily}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    `${t('skills.points')}: ${skillPoints}`,
    x + panelWidth - config.padding,
    y + config.headerHeight / 2 + 5
  );
  
  // Branch tabs
  const branches = ['eveil', 'combat', 'essence'];
  const branchNames = [t('skills.branch.eveil'), t('skills.branch.combat'), t('skills.branch.essence')];
  const tabWidth = (panelWidth - config.padding * 2) / 3;
  const tabY = y + config.headerHeight + config.padding;
  
  branches.forEach((branch, i) => {
    const tabX = x + config.padding + i * tabWidth;
    const isActive = manager.skills.selectedBranch === i;
    
    ctx.fillStyle = isActive ? getBranchColor(branch) : '#333344';
    roundRect(ctx, tabX + 4, tabY, tabWidth - 8, 36, 6);
    ctx.fill();
    
    ctx.fillStyle = config.textColor;
    ctx.font = `bold ${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(branchNames[i], tabX + tabWidth / 2, tabY + 18);
  });
  
  // Skill tree area
  const treeY = tabY + 50;
  const treeHeight = panelHeight - config.headerHeight - config.padding * 2 - 60;
  const selectedBranch = branches[manager.skills.selectedBranch];
  
  // Get skills for branch
  const branchSkills = Object.entries(SKILL_TREE)
    .filter(([key, skill]) => skill.branch === selectedBranch);
  
  // Draw skill nodes
  const nodeSize = 50;
  const nodesPerRow = 4;
  
  branchSkills.forEach(([skillId, skill], i) => {
    const col = i % nodesPerRow;
    const row = Math.floor(i / nodesPerRow);
    
    const nodeX = x + config.padding + 40 + col * (nodeSize + 40);
    const nodeY = treeY + row * (nodeSize + 30);
    
    const isUnlocked = playerSkills.includes(skillId);
    const canUnlock = !isUnlocked && skillPoints > 0 && checkPrerequisites(playerSkills, skill);
    const isSelected = manager.skills.selectedSkill === skillId;
    
    // Node background
    ctx.fillStyle = isUnlocked ? getBranchColor(selectedBranch) : 
                    canUnlock ? '#444455' : '#222233';
    
    if (isSelected) {
      ctx.shadowColor = getBranchColor(selectedBranch);
      ctx.shadowBlur = 10;
    }
    
    ctx.beginPath();
    ctx.arc(nodeX + nodeSize / 2, nodeY + nodeSize / 2, nodeSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Border
    ctx.strokeStyle = isSelected ? '#ffffff' : 
                      isUnlocked ? '#ffffff66' : '#44445566';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // Icon
    ctx.fillStyle = isUnlocked ? '#ffffff' : canUnlock ? '#aaaaaa' : '#555555';
    ctx.font = `${nodeSize / 2}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skill.icon || '★', nodeX + nodeSize / 2, nodeY + nodeSize / 2);
    
    // Name below
    ctx.fillStyle = isUnlocked ? config.textColor : config.textSecondary;
    ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
    ctx.fillText(t(`skill.${skillId}`) || skillId, nodeX + nodeSize / 2, nodeY + nodeSize + 12);
  });
  
  // Selected skill info
  if (manager.skills.selectedSkill) {
    const skill = SKILL_TREE[manager.skills.selectedSkill];
    if (skill) {
      drawSkillInfo(ctx, manager.skills.selectedSkill, skill, 
        x + panelWidth - 200, treeY, 180, treeHeight);
    }
  }
}

/**
 * Draw skill info
 */
function drawSkillInfo(ctx, skillId, skill, x, y, width, maxHeight) {
  const config = PANEL_CONFIG;
  
  ctx.fillStyle = '#1a1a2ecc';
  roundRect(ctx, x, y, width, 180, 8);
  ctx.fill();
  
  ctx.strokeStyle = getBranchColor(skill.branch);
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, 180, 8);
  ctx.stroke();
  
  let textY = y + 25;
  
  // Name
  ctx.fillStyle = getBranchColor(skill.branch);
  ctx.font = `bold ${config.textSize}px ${config.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText(t(`skill.${skillId}`) || skillId, x + 10, textY);
  textY += 25;
  
  // Description
  ctx.fillStyle = config.textColor;
  ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
  
  const desc = t(`skill.${skillId}_desc`) || '';
  const words = desc.split(' ');
  let line = '';
  
  words.forEach(word => {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > width - 20) {
      ctx.fillText(line.trim(), x + 10, textY);
      textY += 16;
      line = word + ' ';
    } else {
      line = testLine;
    }
  });
  
  if (line.trim()) {
    ctx.fillText(line.trim(), x + 10, textY);
  }
}

/**
 * Get branch color
 */
function getBranchColor(branch) {
  switch (branch) {
    case 'eveil': return '#44aaff';
    case 'combat': return '#ff6644';
    case 'essence': return '#aa44ff';
    default: return '#888888';
  }
}

/**
 * Check skill prerequisites
 */
function checkPrerequisites(playerSkills, skill) {
  if (!skill.requires) return true;
  return skill.requires.every(req => playerSkills.includes(req));
}

// ========== Equipment Panel ==========

/**
 * Draw equipment panel
 */
export function drawEquipmentPanel(ctx, manager, equipment, inventory, screenWidth, screenHeight) {
  const config = PANEL_CONFIG;
  const panelWidth = Math.min(500, screenWidth - 40);
  const panelHeight = Math.min(450, screenHeight - 80);
  const x = (screenWidth - panelWidth) / 2;
  const y = (screenHeight - panelHeight) / 2;
  
  // Panel background
  drawPanelBackground(ctx, x, y, panelWidth, panelHeight, t('equipment.title'));
  
  // Equipment slots
  const slots = [
    { key: EQUIPMENT_SLOTS.WEAPON, label: t('equipment.slot.weapon'), x: 0.2, y: 0.4 },
    { key: EQUIPMENT_SLOTS.ARMOR, label: t('equipment.slot.armor'), x: 0.5, y: 0.3 },
    { key: EQUIPMENT_SLOTS.ACCESSORY_1, label: t('equipment.slot.accessory1'), x: 0.8, y: 0.4 },
    { key: EQUIPMENT_SLOTS.ACCESSORY_2, label: t('equipment.slot.accessory2'), x: 0.5, y: 0.7 },
  ];
  
  const contentY = y + config.headerHeight + config.padding;
  const contentHeight = panelHeight - config.headerHeight - config.padding * 2;
  
  // Draw character silhouette (placeholder)
  ctx.fillStyle = '#333344';
  ctx.beginPath();
  ctx.arc(x + panelWidth * 0.5, contentY + contentHeight * 0.4, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + panelWidth * 0.5 - 15, contentY + contentHeight * 0.4 + 30, 30, 50);
  
  // Draw slots
  const slotSize = 56;
  
  slots.forEach(slot => {
    const slotX = x + panelWidth * slot.x - slotSize / 2;
    const slotY = contentY + contentHeight * slot.y - slotSize / 2;
    const isSelected = manager.equipment.selectedSlot === slot.key;
    const item = equipment[slot.key];
    
    // Slot background
    ctx.fillStyle = isSelected ? '#444466' : '#222233';
    ctx.strokeStyle = item ? RARITY_COLORS[item.rarity] : config.panelBorder;
    ctx.lineWidth = isSelected ? 3 : 2;
    roundRect(ctx, slotX, slotY, slotSize, slotSize, 8);
    ctx.fill();
    ctx.stroke();
    
    // Item or placeholder
    if (item) {
      ctx.fillStyle = RARITY_COLORS[item.rarity] || config.textColor;
      ctx.font = `28px ${config.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getItemIcon(item.type), slotX + slotSize / 2, slotY + slotSize / 2);
    } else {
      ctx.fillStyle = '#444455';
      ctx.font = `${config.textSize}px ${config.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', slotX + slotSize / 2, slotY + slotSize / 2);
    }
    
    // Label
    ctx.fillStyle = config.textSecondary;
    ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText(slot.label, slotX + slotSize / 2, slotY + slotSize + 15);
  });
  
  // Stats summary
  const statsX = x + config.padding;
  const statsY = contentY + contentHeight - 80;
  
  ctx.fillStyle = '#1a1a2eaa';
  roundRect(ctx, statsX, statsY, panelWidth - config.padding * 2, 70, 6);
  ctx.fill();
  
  ctx.fillStyle = config.textColor;
  ctx.font = `bold ${config.textSize}px ${config.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText(t('equipment.stats'), statsX + 10, statsY + 20);
  
  // Calculate total stats from equipment
  const totalStats = calculateEquipmentStats(equipment);
  
  ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
  let statX = statsX + 10;
  let statY = statsY + 40;
  
  Object.entries(totalStats).forEach(([stat, value], i) => {
    const sign = value >= 0 ? '+' : '';
    ctx.fillStyle = value >= 0 ? '#44ff44' : '#ff4444';
    ctx.fillText(`${t(`stat.${stat}`)}: ${sign}${value}`, statX, statY);
    statX += 120;
    
    if ((i + 1) % 3 === 0) {
      statX = statsX + 10;
      statY += 18;
    }
  });
}

/**
 * Calculate total equipment stats
 */
function calculateEquipmentStats(equipment) {
  const stats = {};
  
  Object.values(equipment).forEach(item => {
    if (item && item.stats) {
      Object.entries(item.stats).forEach(([stat, value]) => {
        stats[stat] = (stats[stat] || 0) + value;
      });
    }
  });
  
  return stats;
}

// ========== Settings Panel ==========

/**
 * Draw settings panel
 */
export function drawSettingsPanel(ctx, manager, settings, screenWidth, screenHeight) {
  const config = PANEL_CONFIG;
  const panelWidth = Math.min(500, screenWidth - 40);
  const panelHeight = Math.min(400, screenHeight - 80);
  const x = (screenWidth - panelWidth) / 2;
  const y = (screenHeight - panelHeight) / 2;
  
  // Panel background
  drawPanelBackground(ctx, x, y, panelWidth, panelHeight, t('settings.title'));
  
  // Section tabs
  const sections = ['general', 'audio', 'controls', 'graphics'];
  const tabWidth = (panelWidth - config.padding * 2) / sections.length;
  const tabY = y + config.headerHeight + config.padding;
  
  sections.forEach((section, i) => {
    const tabX = x + config.padding + i * tabWidth;
    const isActive = manager.settings.section === section;
    
    ctx.fillStyle = isActive ? config.accentColor : '#333344';
    roundRect(ctx, tabX + 2, tabY, tabWidth - 4, 30, 4);
    ctx.fill();
    
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t(`settings.section.${section}`), tabX + tabWidth / 2, tabY + 15);
  });
  
  // Content area
  const contentY = tabY + 45;
  const contentHeight = panelHeight - config.headerHeight - config.padding * 2 - 50;
  
  switch (manager.settings.section) {
    case 'audio':
      drawAudioSettings(ctx, settings, x + config.padding, contentY, 
        panelWidth - config.padding * 2, contentHeight);
      break;
    case 'controls':
      drawControlsSettings(ctx, settings, x + config.padding, contentY,
        panelWidth - config.padding * 2, contentHeight);
      break;
    case 'graphics':
      drawGraphicsSettings(ctx, settings, x + config.padding, contentY,
        panelWidth - config.padding * 2, contentHeight);
      break;
    default:
      drawGeneralSettings(ctx, settings, x + config.padding, contentY,
        panelWidth - config.padding * 2, contentHeight);
  }
}

/**
 * Draw audio settings (volume sliders with mute toggle)
 */
function drawAudioSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  // Ensure settings is defined
  const safeSettings = settings || {};
  
  // Mute toggles first
  const toggles = [
    { key: 'musicEnabled', label: 'Musique activée', value: safeSettings.musicEnabled ?? true },
    { key: 'sfxEnabled', label: 'Effets sonores activés', value: safeSettings.sfxEnabled ?? true },
  ];
  
  toggles.forEach((toggle, i) => {
    const toggleY = y + i * 35;
    
    // Label
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize - 1}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(toggle.label, x, toggleY + 15);
    
    // Toggle box
    const boxX = x + width - 50;
    const boxY = toggleY + 3;
    const boxW = 40;
    const boxH = 20;
    
    ctx.fillStyle = toggle.value ? '#44aa66' : '#664444';
    roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    
    // Toggle circle
    const circleX = toggle.value ? boxX + boxW - 12 : boxX + 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(circleX, boxY + boxH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Status text
    ctx.fillStyle = config.textSecondary;
    ctx.textAlign = 'right';
    ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
    ctx.fillText(toggle.value ? 'ON' : 'OFF', boxX - 10, toggleY + 15);
  });
  
  const sliders = [
    { key: 'masterVolume', label: t('settings.audio.master'), value: safeSettings.masterVolume ?? 0.7 },
    { key: 'musicVolume', label: t('settings.audio.music'), value: safeSettings.musicVolume ?? 0.5 },
    { key: 'sfxVolume', label: t('settings.audio.sfx'), value: safeSettings.sfxVolume ?? 0.7 },
  ];
  
  const sliderStartY = y + toggles.length * 35 + 20;
  
  sliders.forEach((slider, i) => {
    const sliderY = sliderStartY + i * 55;
    
    // Label
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize - 1}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(slider.label, x, sliderY + 12);
    
    // Slider track
    const trackX = x;
    const trackY = sliderY + 25;
    const trackWidth = width;
    const trackHeight = 6;
    
    ctx.fillStyle = '#333344';
    roundRect(ctx, trackX, trackY, trackWidth, trackHeight, 3);
    ctx.fill();
    
    // Slider fill
    ctx.fillStyle = config.accentColor;
    roundRect(ctx, trackX, trackY, trackWidth * slider.value, trackHeight, 3);
    ctx.fill();
    
    // Slider handle
    const handleX = trackX + trackWidth * slider.value;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(handleX, trackY + trackHeight / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Value
    ctx.fillStyle = config.textSecondary;
    ctx.textAlign = 'right';
    ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
    ctx.fillText(`${Math.round(slider.value * 100)}%`, x + width, sliderY + 12);
  });
}

/**
 * Draw general settings
 */
function drawGeneralSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  // Ensure settings is defined
  const safeSettings = settings || {};
  
  const options = [
    { key: 'language', label: t('settings.general.language'), value: safeSettings.language || 'fr' },
    { key: 'showTutorial', label: t('settings.general.tutorial'), value: safeSettings.showTutorial ?? true },
    { key: 'autosave', label: t('settings.general.autosave'), value: safeSettings.autosave ?? true },
  ];
  
  options.forEach((option, i) => {
    const optionY = y + i * 45;
    
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(option.label, x, optionY + 15);
    
    // Toggle or dropdown
    if (typeof option.value === 'boolean') {
      drawToggle(ctx, x + width - 50, optionY + 5, 44, 24, option.value);
    } else {
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = 'right';
      ctx.fillText(option.value.toUpperCase(), x + width, optionY + 15);
    }
  });
}

/**
 * Draw controls settings (key rebinding)
 */
function drawControlsSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  const controls = [
    { key: 'moveUp', label: 'Haut', default: 'W / ↑' },
    { key: 'moveDown', label: 'Bas', default: 'S / ↓' },
    { key: 'moveLeft', label: 'Gauche', default: 'A / ←' },
    { key: 'moveRight', label: 'Droite', default: 'D / →' },
    { key: 'attack', label: 'Attaquer', default: 'ESPACE / Z' },
    { key: 'dodge', label: 'Esquiver', default: 'SHIFT' },
    { key: 'interact', label: 'Interagir', default: 'E / F' },
    { key: 'heal', label: 'Utiliser soin', default: 'H' },
  ];
  
  ctx.fillStyle = '#888899';
  ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('Contrôles du jeu:', x + width / 2, y + 15);
  
  controls.forEach((control, i) => {
    const controlY = y + 35 + i * 28;
    
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize - 1}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(control.label, x, controlY);
    
    ctx.fillStyle = config.accentColor;
    ctx.textAlign = 'right';
    ctx.fillText(control.default, x + width, controlY);
  });
}

/**
 * Draw graphics settings
 */
function drawGraphicsSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  const options = [
    { key: 'particles', label: t('settings.graphics.particles'), value: settings.particles ?? true },
    { key: 'screenShake', label: t('settings.graphics.shake'), value: settings.screenShake ?? true },
    { key: 'showFPS', label: t('settings.graphics.fps'), value: settings.showFPS ?? false },
  ];
  
  options.forEach((option, i) => {
    const optionY = y + i * 45;
    
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(option.label, x, optionY + 15);
    
    drawToggle(ctx, x + width - 50, optionY + 5, 44, 24, option.value);
  });
}

// ========== Helper Functions ==========

/**
 * Draw panel background
 */
function drawPanelBackground(ctx, x, y, width, height, title) {
  const config = PANEL_CONFIG;
  
  // Shadow
  ctx.fillStyle = '#00000044';
  roundRect(ctx, x + 4, y + 4, width, height, config.panelRadius);
  ctx.fill();
  
  // Main background
  ctx.fillStyle = config.panelBg;
  roundRect(ctx, x, y, width, height, config.panelRadius);
  ctx.fill();
  
  // Border
  ctx.strokeStyle = config.panelBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, height, config.panelRadius);
  ctx.stroke();
  
  // Header
  ctx.fillStyle = config.headerBg;
  ctx.beginPath();
  ctx.moveTo(x + config.panelRadius, y);
  ctx.lineTo(x + width - config.panelRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + config.panelRadius);
  ctx.lineTo(x + width, y + config.headerHeight);
  ctx.lineTo(x, y + config.headerHeight);
  ctx.lineTo(x, y + config.panelRadius);
  ctx.quadraticCurveTo(x, y, x + config.panelRadius, y);
  ctx.fill();
  
  // Title
  ctx.fillStyle = config.textColor;
  ctx.font = `bold ${config.titleSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + width / 2, y + config.headerHeight / 2);
  
  // Header line
  ctx.strokeStyle = config.panelBorder;
  ctx.beginPath();
  ctx.moveTo(x, y + config.headerHeight);
  ctx.lineTo(x + width, y + config.headerHeight);
  ctx.stroke();
}

/**
 * Draw toggle switch
 */
function drawToggle(ctx, x, y, width, height, value) {
  const config = PANEL_CONFIG;
  
  ctx.fillStyle = value ? config.accentColor : '#333344';
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  
  // Handle
  const handleX = value ? x + width - height + 4 : x + 4;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(handleX + (height - 8) / 2, y + height / 2, (height - 8) / 2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Get item type icon
 */
function getItemIcon(type) {
  switch (type) {
    case 'weapon': return '⚔';
    case 'armor': return '🛡';
    case 'accessory': return '💎';
    case 'consumable': return '🧪';
    default: return '📦';
  }
}

// ========== Level Up Popup ==========

/**
 * Create level up popup state
 */
export function createLevelUpPopup() {
  return {
    active: false,
    newLevel: 1,
    skillPoints: 0,
    selectedSkillIndex: 0,
    availableSkills: [],
    animPhase: 0,
  };
}

/**
 * Open level up popup
 */
export function openLevelUpPopup(popup, newLevel, skillPoints, currentSkills) {
  popup.active = true;
  popup.newLevel = newLevel;
  popup.skillPoints = skillPoints;
  popup.selectedSkillIndex = 0;
  popup.animPhase = 0;
  
  // Get all skills that can be upgraded
  popup.availableSkills = Object.entries(SKILL_TREE)
    .filter(([skillId, skill]) => {
      const check = canUpgradeSkill(skillId, currentSkills, skillPoints);
      return check.can;
    })
    .map(([skillId, skill]) => ({
      id: skillId,
      skill,
      branch: skill.branch,
    }));
  
  playMenuOpen();
}

/**
 * Close level up popup
 */
export function closeLevelUpPopup(popup) {
  popup.active = false;
  playMenuClose();
}

/**
 * Draw level up popup
 */
export function drawLevelUpPopup(ctx, popup, currentSkills, screenWidth, screenHeight) {
  if (!popup.active) return;
  
  const config = PANEL_CONFIG;
  popup.animPhase += 0.05;
  
  // Overlay
  ctx.fillStyle = 'rgba(0, 0, 30, 0.85)';
  ctx.fillRect(0, 0, screenWidth, screenHeight);
  
  // Panel dimensions
  const panelWidth = Math.min(550, screenWidth - 60);
  const panelHeight = Math.min(480, screenHeight - 100);
  const x = (screenWidth - panelWidth) / 2;
  const y = (screenHeight - panelHeight) / 2;
  
  // Glow effect
  const glowRadius = 20 + Math.sin(popup.animPhase) * 5;
  ctx.shadowColor = '#ffcc44';
  ctx.shadowBlur = glowRadius;
  
  // Panel background
  ctx.fillStyle = '#1a1a2e';
  roundRect(ctx, x, y, panelWidth, panelHeight, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Border
  ctx.strokeStyle = '#ffcc44';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, panelWidth, panelHeight, 16);
  ctx.stroke();
  
  // Header
  ctx.fillStyle = '#252540';
  roundRect(ctx, x, y, panelWidth, 70, 16);
  ctx.fill();
  
  // Level up title
  ctx.fillStyle = '#ffcc44';
  ctx.font = `bold 28px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`✦ ${t('notification.level_up', { level: popup.newLevel })} ✦`, x + panelWidth / 2, y + 35);
  
  // Skill points
  ctx.fillStyle = '#ffffff';
  ctx.font = `16px ${config.fontFamily}`;
  ctx.fillText(`${t('skills.points')}: ${popup.skillPoints}`, x + panelWidth / 2, y + 90);
  
  // Skills list
  const listY = y + 120;
  const listHeight = panelHeight - 180;
  const itemHeight = 70;
  
  if (popup.availableSkills.length === 0) {
    ctx.fillStyle = config.textSecondary;
    ctx.font = `italic 14px ${config.fontFamily}`;
    ctx.fillText(t('skills.locked'), x + panelWidth / 2, listY + 50);
  } else {
    popup.availableSkills.forEach((skillData, i) => {
      const itemY = listY + i * (itemHeight + 8);
      if (itemY > listY + listHeight - itemHeight) return;
      
      const isSelected = popup.selectedSkillIndex === i;
      const branchColor = getBranchColor(skillData.branch);
      
      // Item background
      ctx.fillStyle = isSelected ? '#333355' : '#222238';
      roundRect(ctx, x + 20, itemY, panelWidth - 40, itemHeight, 8);
      ctx.fill();
      
      // Selection border
      if (isSelected) {
        ctx.strokeStyle = branchColor;
        ctx.lineWidth = 2;
        roundRect(ctx, x + 20, itemY, panelWidth - 40, itemHeight, 8);
        ctx.stroke();
      }
      
      // Icon
      ctx.fillStyle = branchColor;
      ctx.font = `28px ${config.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillText(skillData.skill.icon || '★', x + 35, itemY + 35);
      
      // Skill name
      ctx.fillStyle = config.textColor;
      ctx.font = `bold 16px ${config.fontFamily}`;
      ctx.fillText(t(`skill.${skillData.id}`) || skillData.id, x + 75, itemY + 25);
      
      // Description
      ctx.fillStyle = config.textSecondary;
      ctx.font = `12px ${config.fontFamily}`;
      const desc = t(`skill.${skillData.id}_desc`) || '';
      ctx.fillText(desc.substring(0, 45) + (desc.length > 45 ? '...' : ''), x + 75, itemY + 48);
      
      // Branch badge
      ctx.fillStyle = branchColor;
      ctx.font = `bold 11px ${config.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(t(`skills.branch.${skillData.branch}`) || skillData.branch, x + panelWidth - 35, itemY + 25);
      
      // Cost
      const cost = skillData.skill.cost[currentSkills[skillData.id] || 0] || 1;
      ctx.fillStyle = '#ffcc44';
      ctx.font = `14px ${config.fontFamily}`;
      ctx.fillText(`${t('skills.cost')}: ${cost}`, x + panelWidth - 35, itemY + 48);
    });
  }
  
  // Controls hint
  ctx.fillStyle = config.textSecondary;
  ctx.font = `12px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ Sélectionner  •  Entrée: Débloquer  •  Échap: Fermer', x + panelWidth / 2, y + panelHeight - 25);
}

/**
 * Handle level up popup input
 * Returns: { action: 'select'|'close'|null, skillId?: string }
 */
export function handleLevelUpInput(popup, code, currentSkills, skillPoints) {
  if (!popup.active) return { action: null };
  
  if (code === 'ArrowUp' || code === 'KeyW' || code === 'KeyZ') {
    popup.selectedSkillIndex = Math.max(0, popup.selectedSkillIndex - 1);
    playUIClick();
    return { action: null };
  }
  
  if (code === 'ArrowDown' || code === 'KeyS') {
    popup.selectedSkillIndex = Math.min(popup.availableSkills.length - 1, popup.selectedSkillIndex + 1);
    playUIClick();
    return { action: null };
  }
  
  if (code === 'Enter' || code === 'Space') {
    const selected = popup.availableSkills[popup.selectedSkillIndex];
    if (selected) {
      const result = upgradeSkill(selected.id, currentSkills, skillPoints);
      if (result.success) {
        playUIClick();
        return { 
          action: 'select', 
          skillId: selected.id,
          newSkills: result.newSkills,
          remainingPoints: result.remainingPoints,
        };
      }
    }
    return { action: null };
  }
  
  if (code === 'Escape') {
    closeLevelUpPopup(popup);
    return { action: 'close' };
  }
  
  return { action: null };
}

export default {
  PANEL_CONFIG,
  RARITY_COLORS,
  
  // State
  createPanelManager,
  openPanel,
  closePanel,
  togglePanel,
  updatePanels,
  
  // Panels
  drawInventoryPanel,
  drawSkillsPanel,
  drawEquipmentPanel,
  drawSettingsPanel,
  
  // Level Up
  createLevelUpPopup,
  openLevelUpPopup,
  closeLevelUpPopup,
  drawLevelUpPopup,
  handleLevelUpInput,
};
