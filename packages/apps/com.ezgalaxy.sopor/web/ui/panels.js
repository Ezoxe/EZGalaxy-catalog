/**
 * SOPOR - UI Panels System
 * Inventory, Skills, Equipment, Settings panels
 */

import { t } from '../core/i18n.js';
import { RARITY, SKILLS, EQUIPMENT_SLOTS } from '../core/constants.js';
import { playUIClick, playMenuOpen, playMenuClose } from '../audio/sfx.js';

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
  
  // Filter items
  const filteredItems = inventory.filter(item => {
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
  const branchSkills = Object.entries(SKILLS)
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
    ctx.fillText(t(`skill.${skillId}.name`), nodeX + nodeSize / 2, nodeY + nodeSize + 12);
  });
  
  // Selected skill info
  if (manager.skills.selectedSkill) {
    const skill = SKILLS[manager.skills.selectedSkill];
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
  ctx.fillText(t(`skill.${skillId}.name`), x + 10, textY);
  textY += 25;
  
  // Description
  ctx.fillStyle = config.textColor;
  ctx.font = `${config.textSize - 2}px ${config.fontFamily}`;
  
  const desc = t(`skill.${skillId}.desc`);
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
 * Draw audio settings
 */
function drawAudioSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  const sliders = [
    { key: 'masterVolume', label: t('settings.audio.master'), value: settings.masterVolume ?? 0.7 },
    { key: 'musicVolume', label: t('settings.audio.music'), value: settings.musicVolume ?? 0.5 },
    { key: 'sfxVolume', label: t('settings.audio.sfx'), value: settings.sfxVolume ?? 0.7 },
  ];
  
  sliders.forEach((slider, i) => {
    const sliderY = y + i * 60;
    
    // Label
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.textSize}px ${config.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText(slider.label, x, sliderY + 15);
    
    // Slider track
    const trackX = x;
    const trackY = sliderY + 30;
    const trackWidth = width;
    const trackHeight = 8;
    
    ctx.fillStyle = '#333344';
    roundRect(ctx, trackX, trackY, trackWidth, trackHeight, 4);
    ctx.fill();
    
    // Slider fill
    ctx.fillStyle = config.accentColor;
    roundRect(ctx, trackX, trackY, trackWidth * slider.value, trackHeight, 4);
    ctx.fill();
    
    // Slider handle
    const handleX = trackX + trackWidth * slider.value;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(handleX, trackY + trackHeight / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Value
    ctx.fillStyle = config.textSecondary;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(slider.value * 100)}%`, x + width, sliderY + 15);
  });
}

/**
 * Draw general settings
 */
function drawGeneralSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  const options = [
    { key: 'language', label: t('settings.general.language'), value: settings.language || 'fr' },
    { key: 'showTutorial', label: t('settings.general.tutorial'), value: settings.showTutorial ?? true },
    { key: 'autosave', label: t('settings.general.autosave'), value: settings.autosave ?? true },
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
 * Draw controls settings
 */
function drawControlsSettings(ctx, settings, x, y, width, height) {
  const config = PANEL_CONFIG;
  
  ctx.fillStyle = config.textSecondary;
  ctx.font = `${config.textSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(t('settings.controls.info'), x + width / 2, y + height / 2);
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
};
