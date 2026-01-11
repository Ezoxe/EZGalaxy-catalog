(() => {
  'use strict';

  const EXTENSION_ID = 'com.ezgalaxy.terminal';
  const COLLECTION_PRESETS = 'presets';

  const STORAGE_STATE = 'ez.term.customizer.state.v1';
  const STORAGE_API_BASE = 'ez.community.baseUrl';
  const STORAGE_API_TOKEN = 'ez.community.token';

  const $ = (id) => document.getElementById(id);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const THEMES = {
    dracula: {
      name: 'Dracula',
      colors: {
        background: '#282a36',
        foreground: '#f8f8f2',
        cursor: '#f8f8f2',
        selection: '#44475a',
        ansiNormal: ['#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2'],
        ansiBright: ['#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff'],
      },
    },
    nord: {
      name: 'Nord',
      colors: {
        background: '#2e3440',
        foreground: '#d8dee9',
        cursor: '#d8dee9',
        selection: '#434c5e',
        ansiNormal: ['#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0'],
        ansiBright: ['#4c566a', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4'],
      },
    },
    'one-dark': {
      name: 'One Dark',
      colors: {
        background: '#282c34',
        foreground: '#abb2bf',
        cursor: '#528bff',
        selection: '#3e4451',
        ansiNormal: ['#1e2127', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf'],
        ansiBright: ['#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'],
      },
    },
    'tokyo-night': {
      name: 'Tokyo Night',
      colors: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selection: '#28344a',
        ansiNormal: ['#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6'],
        ansiBright: ['#414868', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#c0caf5'],
      },
    },
    'catppuccin-mocha': {
      name: 'Catppuccin Mocha',
      colors: {
        background: '#1e1e2e',
        foreground: '#cdd6f4',
        cursor: '#f5e0dc',
        selection: '#585b70',
        ansiNormal: ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de'],
        ansiBright: ['#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#cdd6f4'],
      },
    },
    'catppuccin-latte': {
      name: 'Catppuccin Latte',
      colors: {
        background: '#eff1f5',
        foreground: '#4c4f69',
        cursor: '#dc8a78',
        selection: '#ccd0da',
        ansiNormal: ['#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be'],
        ansiBright: ['#6c6f85', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#bcc0cc'],
      },
    },
    'gruvbox-dark': {
      name: 'Gruvbox Dark',
      colors: {
        background: '#282828',
        foreground: '#ebdbb2',
        cursor: '#ebdbb2',
        selection: '#3c3836',
        ansiNormal: ['#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984'],
        ansiBright: ['#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'],
      },
    },
    'gruvbox-light': {
      name: 'Gruvbox Light',
      colors: {
        background: '#fbf1c7',
        foreground: '#3c3836',
        cursor: '#3c3836',
        selection: '#d5c4a1',
        ansiNormal: ['#fbf1c7', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#7c6f64'],
        ansiBright: ['#928374', '#9d0006', '#79740e', '#b57614', '#076678', '#8f3f71', '#427b58', '#3c3836'],
      },
    },
    'solarized-dark': {
      name: 'Solarized Dark',
      colors: {
        background: '#002b36',
        foreground: '#839496',
        cursor: '#93a1a1',
        selection: '#073642',
        ansiNormal: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5'],
        ansiBright: ['#002b36', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3'],
      },
    },
    'solarized-light': {
      name: 'Solarized Light',
      colors: {
        background: '#fdf6e3',
        foreground: '#657b83',
        cursor: '#586e75',
        selection: '#eee8d5',
        ansiNormal: ['#073642', '#dc322f', '#859900', '#b58900', '#268bd2', '#d33682', '#2aa198', '#eee8d5'],
        ansiBright: ['#002b36', '#cb4b16', '#586e75', '#657b83', '#839496', '#6c71c4', '#93a1a1', '#fdf6e3'],
      },
    },
    'monokai-pro': {
      name: 'Monokai Pro',
      colors: {
        background: '#2d2a2e',
        foreground: '#fcfcfa',
        cursor: '#fcfcfa',
        selection: '#403e41',
        ansiNormal: ['#403e41', '#ff6188', '#a9dc76', '#ffd866', '#78dce8', '#ab9df2', '#78dce8', '#fcfcfa'],
        ansiBright: ['#727072', '#ff6188', '#a9dc76', '#ffd866', '#78dce8', '#ab9df2', '#78dce8', '#ffffff'],
      },
    },
    everforest: {
      name: 'Everforest',
      colors: {
        background: '#2f383e',
        foreground: '#d3c6aa',
        cursor: '#d3c6aa',
        selection: '#3c4841',
        ansiNormal: ['#4b565c', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#d3c6aa'],
        ansiBright: ['#475258', '#e67e80', '#a7c080', '#dbbc7f', '#7fbbb3', '#d699b6', '#83c092', '#e6e2cc'],
      },
    },
    'rose-pine': {
      name: 'Rosé Pine',
      colors: {
        background: '#191724',
        foreground: '#e0def4',
        cursor: '#e0def4',
        selection: '#26233a',
        ansiNormal: ['#26233a', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4'],
        ansiBright: ['#6e6a86', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#ffffff'],
      },
    },
    kanagawa: {
      name: 'Kanagawa',
      colors: {
        background: '#1f1f28',
        foreground: '#dcd7ba',
        cursor: '#dcd7ba',
        selection: '#2d4f67',
        ansiNormal: ['#090618', '#c34043', '#76946a', '#c0a36e', '#7e9cd8', '#957fb8', '#6a9589', '#c8c093'],
        ansiBright: ['#727169', '#c34043', '#76946a', '#c0a36e', '#7e9cd8', '#957fb8', '#6a9589', '#dcd7ba'],
      },
    },
    material: {
      name: 'Material',
      colors: {
        background: '#263238',
        foreground: '#eeffff',
        cursor: '#ffcc00',
        selection: '#37474f',
        ansiNormal: ['#000000', '#ff5370', '#c3e88d', '#ffcb6b', '#82aaff', '#c792ea', '#89ddff', '#ffffff'],
        ansiBright: ['#546e7a', '#ff5370', '#c3e88d', '#ffcb6b', '#82aaff', '#c792ea', '#89ddff', '#ffffff'],
      },
    },
    'ayu-dark': {
      name: 'Ayu Dark',
      colors: {
        background: '#0f1419',
        foreground: '#e6e1cf',
        cursor: '#ffcc66',
        selection: '#253340',
        ansiNormal: ['#000000', '#ff3333', '#b8cc52', '#e6b450', '#59c2ff', '#d4bfff', '#95e6cb', '#ffffff'],
        ansiBright: ['#323232', '#ff6565', '#eafe84', '#fff779', '#79d2ff', '#d4bfff', '#95e6cb', '#ffffff'],
      },
    },
  };

  const DEFAULT_STATE = {
    terminal: 'kitty',
    theme: 'custom',
    colors: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selection: '#585b70',
      ansiNormal: ['#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#bac2de'],
      ansiBright: ['#585b70', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#cdd6f4'],
    },
    font: {
      family: 'JetBrains Mono',
      customFamily: '',
      size: 12,
      lineHeight: 1.2,
      bold: false,
    },
    cursor: {
      shape: 'block',
      blink: true,
      beamWidth: 2,
    },
    window: {
      opacity: 100,
      blur: 0,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      wallpaper: 'aurora',
      floating: true,
    },
    behavior: {
      scrollback: 10000,
      bell: 'none',
      confirmClose: false,
    },
    kitty: {
      ligatures: true,
      tabBarStyle: 'powerline',
      tabBarEdge: 'top',
      tabTitleTemplate: '{title}',
      colors: {
        url_color: '#89dceb',
        active_tab_background: '#11111b',
        active_tab_foreground: '#cdd6f4',
        inactive_tab_background: '#1e1e2e',
        inactive_tab_foreground: '#a6adc8',
      },
      directives: [],
      rawLines: '',
    },
  };

  const TERMINALS = {
    kitty: {
      title: 'Kitty',
      filename: 'kitty.conf',
      info: 'Placez le fichier dans <code>~/.config/kitty/kitty.conf</code> puis relancez Kitty.',
    },
    alacritty: {
      title: 'Alacritty',
      filename: 'alacritty.toml',
      info: 'Placez le fichier dans <code>~/.config/alacritty/alacritty.toml</code> puis relancez Alacritty.',
    },
    wezterm: {
      title: 'WezTerm',
      filename: 'wezterm.lua',
      info: 'Placez le fichier dans <code>~/.wezterm.lua</code> puis relancez WezTerm.',
    },
    'windows-terminal': {
      title: 'Windows Terminal',
      filename: 'windows-terminal.scheme.json',
      info: 'Ajoutez le JSON dans votre <code>settings.json</code> (section <code>schemes</code>).',
    },
    iterm2: {
      title: 'iTerm2',
      filename: 'iterm2.txt',
      info: 'Exporter iTerm2 (.itermcolors) n\'est pas encore implémenté. Utilisez Kitty/WezTerm pour l\'instant.',
    },
    'gnome-terminal': { title: 'GNOME Terminal', filename: 'gnome-terminal.txt', info: 'Export auto non implémenté (dconf). Utilisez Kitty/WezTerm pour l\'instant.' },
    konsole: { title: 'Konsole', filename: 'konsole.colorscheme', info: 'Export Konsole non implémenté. Utilisez Kitty/WezTerm pour l\'instant.' },
    hyper: { title: 'Hyper', filename: 'hyper.json', info: 'Export Hyper non implémenté. Utilisez WezTerm/Windows Terminal pour l\'instant.' },
    termux: { title: 'Termux', filename: 'termux.properties', info: 'Export Termux non implémenté. Utilisez Kitty/WezTerm pour l\'instant.' },
    foot: { title: 'Foot', filename: 'foot.ini', info: 'Export Foot non implémenté. Utilisez Kitty/WezTerm pour l\'instant.' },
    st: { title: 'st', filename: 'st.h', info: 'Export st non implémenté (patch/compilation). Utilisez Kitty/WezTerm pour l\'instant.' },
    urxvt: { title: 'urxvt', filename: 'Xresources', info: 'Export urxvt non implémenté. Utilisez Kitty/WezTerm pour l\'instant.' },
    xterm: { title: 'XTerm', filename: 'Xresources', info: 'Export XTerm non implémenté. Utilisez Kitty/WezTerm pour l\'instant.' },
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeDeep(target, patch) {
    if (!patch || typeof patch !== 'object') return target;
    for (const [key, value] of Object.entries(patch)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        mergeDeep(target[key], value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  function normalizeHexColor(input) {
    if (!input) return null;
    const str = String(input).trim();

    const hex = str.match(/^#?([0-9a-fA-F]{6})$/);
    if (hex) return `#${hex[1].toLowerCase()}`;

    const hex3 = str.match(/^#?([0-9a-fA-F]{3})$/);
    if (hex3) {
      const v = hex3[1].toLowerCase();
      return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`;
    }

    const rgb = str.match(/^rgba?\((\s*\d+\s*),\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d*\.?\d+)\s*)?\)$/i);
    if (rgb) {
      const r = clamp(Number(rgb[1]), 0, 255);
      const g = clamp(Number(rgb[2]), 0, 255);
      const b = clamp(Number(rgb[3]), 0, 255);
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return null;
  }

  function hexToRgba(hex, alpha) {
    const normalized = normalizeHexColor(hex) || '#000000';
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    const a = clamp(alpha, 0, 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  function toast(type, title, message) {
    const container = $('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        <div class="toast-title"></div>
        <div class="toast-message"></div>
      </div>
    `.trim();

    el.querySelector('.toast-title').textContent = title;
    el.querySelector('.toast-message').textContent = message;

    container.appendChild(el);

    const timeout = window.setTimeout(() => {
      el.classList.add('toast-out');
      window.setTimeout(() => el.remove(), 320);
    }, 3500);

    el.addEventListener('click', () => {
      window.clearTimeout(timeout);
      el.classList.add('toast-out');
      window.setTimeout(() => el.remove(), 320);
    });
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.remove('hidden');
  }

  function closeAllModals() {
    for (const modal of document.querySelectorAll('.modal')) {
      modal.classList.add('hidden');
    }
  }

  function slugifyRecordKey(name) {
    const base = String(name || '').trim();
    const cleaned = base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._:@-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    const safe = cleaned.length ? cleaned : 'preset';
    const leadingSafe = safe.replace(/^[^A-Za-z0-9]+/, 'p');
    return leadingSafe.slice(0, 80);
  }

  function getApiBaseUrl() {
    const stored = localStorage.getItem(STORAGE_API_BASE);
    return stored || location.origin;
  }

  function getApiToken() {
    return localStorage.getItem(STORAGE_API_TOKEN) || '';
  }

  function ensureApiToken() {
    let token = getApiToken();
    if (token) return token;

    token = window.prompt('Token API (Authorization: Bearer ...)\n\nVous pouvez le coller ici; il sera stocké en localStorage.', '');
    if (token && token.trim()) {
      localStorage.setItem(STORAGE_API_TOKEN, token.trim());
      return token.trim();
    }

    return '';
  }

  async function apiFetch(path, options = {}) {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    const token = getApiToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = typeof data === 'object' && data && data.message ? data.message : `HTTP ${res.status}`;
      const error = new Error(msg);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Interactive terminal emulator state
  const term = {
    cwd: '/home/alice',
    user: 'alice',
    host: 'ezgalaxy',
    history: [],
    historyIndex: -1,
    fs: {
      '/home/alice': {
        type: 'dir',
        entries: {
          projects: { type: 'dir', entries: { src: { type: 'dir', entries: {} }, assets: { type: 'dir', entries: {} }, 'README.md': { type: 'file', content: 'EZGalaxy Terminal Customizer\n' }, 'app.js': { type: 'file', content: '// demo\n' } } },
          '.zshrc': { type: 'file', content: '# fake shell rc\n' },
        },
      },
      '/': { type: 'dir', entries: { home: { type: 'dir', ref: '/home' } } },
      '/home': { type: 'dir', entries: { alice: { type: 'dir', ref: '/home/alice' } } },
    },
  };

  function resolvePath(inputPath) {
    if (!inputPath || inputPath === '~') return `/home/${term.user}`;
    if (inputPath.startsWith('~/')) return `/home/${term.user}/${inputPath.slice(2)}`.replace(/\/+/g, '/');
    if (inputPath.startsWith('/')) return inputPath.replace(/\/+/g, '/');
    const base = term.cwd.endsWith('/') ? term.cwd.slice(0, -1) : term.cwd;
    return `${base}/${inputPath}`.replace(/\/+/g, '/');
  }

  function normalizePath(path) {
    const parts = path.split('/');
    const out = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') out.pop();
      else out.push(p);
    }
    return '/' + out.join('/');
  }

  function getNode(path) {
    const p = normalizePath(path);
    const direct = term.fs[p];
    if (direct) return direct;

    // resolve via refs
    const segs = p.split('/').filter(Boolean);
    let curPath = '/';
    let node = term.fs['/'];
    for (const seg of segs) {
      if (!node || node.type !== 'dir') return null;
      const entry = node.entries?.[seg];
      if (!entry) return null;
      if (entry.ref) {
        curPath = entry.ref;
        node = term.fs[curPath];
      } else if (entry.type === 'dir') {
        curPath = `${curPath === '/' ? '' : curPath}/${seg}`;
        term.fs[curPath] = term.fs[curPath] || entry;
        node = term.fs[curPath];
      } else {
        return entry;
      }
    }
    return node;
  }

  function formatPrompt() {
    const home = `/home/${term.user}`;
    const short = term.cwd.startsWith(home) ? `~${term.cwd.slice(home.length) || ''}` : term.cwd;
    return `${term.user}@${term.host}:${short} $`;
  }

  function appendLine(html) {
    const screen = $('terminal-screen');
    if (!screen) return;
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.innerHTML = html;
    screen.appendChild(div);
    screen.scrollTop = screen.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function runCommand(line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    // echo command line
    appendLine(`<span class="prompt">${escapeHtml(formatPrompt())}</span> <span class="command">${escapeHtml(trimmed)}</span>`);

    const [cmdRaw, ...rest] = trimmed.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();
    const args = rest;

    if (cmd === 'help') {
      appendLine(`<span class="comment">Commandes: help, ls, cd, pwd, cat, echo, clear, whoami, date</span>`);
      return;
    }

    if (cmd === 'clear') {
      const screen = $('terminal-screen');
      if (screen) screen.innerHTML = '';
      return;
    }

    if (cmd === 'pwd') {
      appendLine(escapeHtml(term.cwd));
      return;
    }

    if (cmd === 'whoami') {
      appendLine(escapeHtml(term.user));
      return;
    }

    if (cmd === 'date') {
      appendLine(escapeHtml(new Date().toString()));
      return;
    }

    if (cmd === 'echo') {
      appendLine(escapeHtml(args.join(' ')));
      return;
    }

    if (cmd === 'cd') {
      const target = args[0] || '~';
      const resolved = normalizePath(resolvePath(target));
      const node = getNode(resolved);
      if (!node || node.type !== 'dir') {
        appendLine(`<span class="variable">cd:</span> <span class="comment">no such file or directory:</span> ${escapeHtml(target)}`);
        return;
      }
      term.cwd = resolved;
      return;
    }

    if (cmd === 'ls') {
      const target = args[0] ? normalizePath(resolvePath(args[0])) : term.cwd;
      const node = getNode(target);
      if (!node || node.type !== 'dir') {
        appendLine(`<span class="variable">ls:</span> <span class="comment">cannot access</span> ${escapeHtml(args[0] || '')}`);
        return;
      }
      const names = Object.keys(node.entries || {});
      const rendered = names
        .map((name) => {
          const entry = node.entries[name];
          const cls = entry.type === 'dir' || entry.ref ? 'dir' : 'file';
          return `<span class="${cls}">${escapeHtml(name)}</span>`;
        })
        .join('  ');
      appendLine(rendered || '<span class="comment">(empty)</span>');
      return;
    }

    if (cmd === 'cat') {
      const target = args[0];
      if (!target) {
        appendLine('<span class="comment">usage: cat file</span>');
        return;
      }
      const resolved = normalizePath(resolvePath(target));
      const node = getNode(resolved);
      if (!node || node.type !== 'file') {
        appendLine(`<span class="variable">cat:</span> <span class="comment">no such file:</span> ${escapeHtml(target)}`);
        return;
      }
      const content = node.content || '';
      for (const l of String(content).split(/\r?\n/)) {
        appendLine(escapeHtml(l));
      }
      return;
    }

    appendLine(`<span class="comment">Commande inconnue:</span> ${escapeHtml(cmdRaw)} <span class="comment">(essayez</span> <span class="keyword">help</span><span class="comment">)</span>`);
  }

  function applyPreview(state) {
    const preview = $('terminal-preview');
    if (!preview) return;

    const alpha = clamp(Number(state.window.opacity) / 100, 0.05, 1);
    preview.style.setProperty('--term-bg', hexToRgba(state.colors.background, alpha));
    preview.style.setProperty('--term-fg', state.colors.foreground);
    preview.style.setProperty('--term-cursor', state.colors.cursor);

    const padding = state.window.padding;
    preview.style.setProperty('--term-padding', `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`);

    const fontFamily = state.font.family === 'custom' ? (state.font.customFamily || 'monospace') : state.font.family;
    preview.style.setProperty('--term-font', `'${fontFamily.replace(/'/g, "\\'")}'`);
    preview.style.setProperty('--term-font-size', `${Number(state.font.size) || 12}px`);
    preview.style.setProperty('--term-line-height', `${Number(state.font.lineHeight) || 1.2}`);

    const normal = state.colors.ansiNormal;
    preview.style.setProperty('--term-comment', normal[0] || '#6c7086');
    preview.style.setProperty('--term-red', normal[1] || '#f38ba8');
    preview.style.setProperty('--term-green', normal[2] || '#a6e3a1');
    preview.style.setProperty('--term-yellow', normal[3] || '#f9e2af');
    preview.style.setProperty('--term-blue', normal[4] || '#89b4fa');
    preview.style.setProperty('--term-magenta', normal[5] || '#f5c2e7');
    preview.style.setProperty('--term-cyan', normal[6] || '#89dceb');

    if (state.font.bold) {
      preview.style.fontWeight = '700';
    } else {
      preview.style.fontWeight = '400';
    }

    // Use the real caret inside the contenteditable input.
    // (A separate "fake" cursor tends to drift to bottom-right when input is empty.)
    const inputEl = $('terminal-input');
    if (inputEl) inputEl.style.caretColor = state.colors.cursor;

    const promptEl = $('terminal-prompt');
    if (promptEl) promptEl.textContent = formatPrompt();
  }

  function installHelpTooltips() {
    const tooltip = $('help-tooltip');
    if (!tooltip) return;

    const HELP_BY_ID = {
      'terminal-select': "Choisis le terminal cible: ça change le format d'export et certaines options disponibles.",
      'theme-select': 'Applique une palette de base (tu peux ensuite retoucher chaque couleur).',
      'font-family': 'Police utilisée dans le terminal (aperçu + export selon terminal).',
      'font-family-custom': 'Nom exact de la police installée sur ta machine.',
      'font-size': 'Taille de police du terminal.',
      'line-height': 'Interligne (espace vertical entre les lignes).',
      'font-bold': 'Force le gras dans l’aperçu (Kitty: préfère régler bold_font si besoin).',
      'cursor-blink': 'Active/désactive le clignotement du curseur (export selon terminal).',
      'beam-width': 'Épaisseur du curseur beam/underline (export selon terminal).',
      opacity: "Transparence de l'arrière-plan (100% = opaque).",
      blur: "Flou d'arrière-plan (si supporté par le terminal).",
      'padding-top': 'Padding interne du terminal (haut).',
      'padding-right': 'Padding interne du terminal (droite).',
      'padding-bottom': 'Padding interne du terminal (bas).',
      'padding-left': 'Padding interne du terminal (gauche).',
      wallpaper: "Fond d'écran uniquement pour l'aperçu (ne change pas l'export).",
      'floating-window': "Active le mode fenêtre (déplaçable/redimensionnable) dans l'aperçu.",
      scrollback: 'Nombre de lignes conservées dans l’historique (scrollback).',
      bell: 'Type de bell (sonore/visuelle/désactivée).',
      'confirm-close': 'Demande confirmation avant fermeture (export selon terminal).',
      'kitty-ligatures': 'Kitty: active les ligatures (always/never).',
      'kitty-tab-bar-style': 'Kitty: style de la barre d’onglets.',
      'kitty-tab-bar-edge': 'Kitty: position de la barre d’onglets (haut/bas).',
      'kitty-tab-title-template': 'Kitty: template du titre d’onglet.',
      'kitty-raw-lines': 'Lignes brutes ajoutées telles quelles dans kitty.conf (une directive par ligne).',
      'kitty-directive-key': 'Clé de directive Kitty (ex: background_image).',
      'kitty-directive-value': 'Valeur de directive Kitty (ex: /path/image.png).',
    };

    const describeSwatch = (el) => {
      const group = el.dataset.group;
      if (group === 'special') {
        const key = el.dataset.key;
        const name =
          key === 'background'
            ? 'Arrière-plan'
            : key === 'foreground'
              ? 'Texte'
              : key === 'cursor'
                ? 'Curseur'
                : key === 'selection'
                  ? 'Sélection'
                  : key;
        return `Couleur: ${name} (clic = ouvrir le picker)`;
      }
      if (group === 'ansiNormal' || group === 'ansiBright') {
        const idx = Number(el.dataset.index);
        const base = group === 'ansiBright' ? 'ANSI bright' : 'ANSI normal';
        return `Couleur: ${base} ${Number.isFinite(idx) ? idx : ''} (clic = ouvrir le picker)`;
      }
      if (group === 'kitty') {
        const key = el.dataset.key;
        return `Kitty: ${key} (clic = ouvrir le picker)`;
      }
      return 'Clic pour choisir une couleur.';
    };

    const describeCursorShape = (el) => {
      const s = el.dataset.shape;
      if (s === 'block') return 'Curseur: bloc (export selon terminal).';
      if (s === 'beam') return 'Curseur: barre verticale (beam).';
      if (s === 'underline') return 'Curseur: souligné (underline).';
      return 'Forme du curseur.';
    };

    const describePreset = (el) => {
      const key = String(el.dataset.key || '').trim();
      let value = String(el.dataset.value || '').trim();
      if (value.toUpperCase() === 'PROMPT') value = '…';
      return `Ajoute une directive Kitty: ${key} ${value}`.trim();
    };

    const getHelpText = (el) => {
      if (!el) return '';

      if (el.classList?.contains('kitty-preset')) return describePreset(el);
      if (el.classList?.contains('color-swatch')) return describeSwatch(el);
      if (el.classList?.contains('cursor-shape')) return describeCursorShape(el);

      if (el.id && HELP_BY_ID[el.id]) return HELP_BY_ID[el.id];

      // Prefer explicit data-help if present.
      const dataHelp = el.dataset?.help;
      if (dataHelp) return String(dataHelp);

      // Fallback: try to find the label of the surrounding form-group.
      const group = el.closest?.('.form-group');
      const label = group?.querySelector?.('.form-label');
      const labelText = label?.textContent?.trim();
      if (labelText) return `Modifie: ${labelText}`;

      // Last fallback: button text
      const txt = el.textContent?.trim();
      if (txt && txt.length <= 60) return txt;
      return '';
    };

    const show = (text, x, y) => {
      if (!text) return;
      tooltip.textContent = text;
      tooltip.classList.remove('hidden');
      tooltip.setAttribute('aria-hidden', 'false');

      const pad = 14;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Position then clamp once we know size
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';
      const rect = tooltip.getBoundingClientRect();

      let left = x + 14;
      let top = y + 18;
      if (left + rect.width + pad > vw) left = vw - rect.width - pad;
      if (top + rect.height + pad > vh) top = y - rect.height - 14;
      left = Math.max(pad, left);
      top = Math.max(pad, top);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const hide = () => {
      tooltip.classList.add('hidden');
      tooltip.setAttribute('aria-hidden', 'true');
      tooltip.textContent = '';
    };

    let active = null;
    document.addEventListener(
      'pointerover',
      (ev) => {
        const t = ev.target;
        if (!t) return;
        const el = t.closest?.(
          '.color-swatch, .cursor-shape, .kitty-preset, input, select, textarea, button'
        );
        if (!el) return;
        // Ignore modal backdrops etc
        if (el.classList?.contains('modal-backdrop')) return;
        const text = getHelpText(el);
        if (!text) return;
        active = el;
        show(text, ev.clientX, ev.clientY);
      },
      true
    );

    document.addEventListener(
      'pointermove',
      (ev) => {
        if (!active) return;
        const text = getHelpText(active);
        if (!text) {
          hide();
          active = null;
          return;
        }
        show(text, ev.clientX, ev.clientY);
      },
      true
    );

    document.addEventListener(
      'pointerout',
      (ev) => {
        if (!active) return;
        const related = ev.relatedTarget;
        if (related && active.contains?.(related)) return;
        hide();
        active = null;
      },
      true
    );

    // Avoid sticky tooltip during scrolling
    document.addEventListener('scroll', () => hide(), true);
  }

  function computeExport(state) {
    const terminal = state.terminal;

    if (terminal === 'kitty') return exportKitty(state);
    if (terminal === 'alacritty') return exportAlacrittyToml(state);
    if (terminal === 'wezterm') return exportWezTerm(state);
    if (terminal === 'windows-terminal') return exportWindowsTerminalScheme(state);

    const fallback = exportKitty(state);
    return {
      filename: TERMINALS[terminal]?.filename || `${terminal}.txt`,
      content: `# Export automatique non implémenté pour: ${terminal}\n\n# Voici une config Kitty équivalente (approximative):\n\n${fallback.content}`,
      mime: 'text/plain',
    };
  }

  function exportKitty(state) {
    const colors = state.colors;

    const family = state.font.family === 'custom' ? state.font.customFamily : state.font.family;

    const opacity = clamp(Number(state.window.opacity) / 100, 0, 1);
    const pad = state.window.padding;
    const padX = Math.round((Number(pad.left) + Number(pad.right)) / 2);
    const padY = Math.round((Number(pad.top) + Number(pad.bottom)) / 2);

    const lines = [];
    lines.push('# Generated by EZGalaxy Terminal Customizer');
    lines.push('# https://github.com/EZGalaxy-catalog');
    lines.push('');

    lines.push(`# Font`);
    if (family) lines.push(`font_family ${family}`);
    lines.push(`font_size ${Number(state.font.size) || 12}`);
    if (state.font.bold) {
      lines.push('# Note: preview is bold; you may want to set bold_font in Kitty');
    }
    lines.push('');

    lines.push('# Colors');
    lines.push(`background ${colors.background}`);
    lines.push(`foreground ${colors.foreground}`);
    lines.push(`selection_background ${colors.selection}`);
    lines.push(`cursor ${colors.cursor}`);
    if (state.kitty?.colors?.url_color) lines.push(`url_color ${state.kitty.colors.url_color}`);
    lines.push('');

    for (let i = 0; i < 8; i++) lines.push(`color${i} ${colors.ansiNormal[i]}`);
    for (let i = 0; i < 8; i++) lines.push(`color${i + 8} ${colors.ansiBright[i]}`);
    lines.push('');

    lines.push('# Cursor');
    lines.push(`cursor_shape ${state.cursor.shape}`);
    if (state.cursor.shape === 'beam') lines.push(`cursor_beam_thickness ${clamp(Number(state.cursor.beamWidth) || 2, 1, 8)}`);
    if (state.cursor.shape === 'underline') lines.push(`cursor_underline_thickness ${clamp(Number(state.cursor.beamWidth) || 2, 1, 8)}`);
    lines.push(`cursor_blink_interval ${state.cursor.blink ? 0.5 : 0}`);
    lines.push('');

    lines.push('# Window');
    lines.push(`background_opacity ${opacity.toFixed(2)}`);
    lines.push(`window_padding_width ${padX}`);
    lines.push(`window_padding_height ${padY}`);
    if (Number(state.window.blur) > 0) lines.push(`background_blur ${clamp(Number(state.window.blur) || 0, 0, 64)}`);
    lines.push('');

    lines.push('# Behavior');
    lines.push(`scrollback_lines ${Math.max(0, Number(state.behavior.scrollback) || 0)}`);
    lines.push(`enable_audio_bell ${state.behavior.bell === 'audio' ? 'yes' : 'no'}`);
    lines.push(`visual_bell_duration ${state.behavior.bell === 'visual' ? '0.15' : '0'}`);
    lines.push(`confirm_os_window_close ${state.behavior.confirmClose ? 'yes' : 'no'}`);

    // Kitty advanced
    if (state.kitty) {
      lines.push('');
      lines.push('# Kitty advanced');
      lines.push(`enable_ligatures ${state.kitty.ligatures ? 'always' : 'never'}`);
      if (state.kitty.tabBarStyle) lines.push(`tab_bar_style ${state.kitty.tabBarStyle}`);
      if (state.kitty.tabBarEdge) lines.push(`tab_bar_edge ${state.kitty.tabBarEdge}`);
      if (state.kitty.tabTitleTemplate) lines.push(`tab_title_template ${state.kitty.tabTitleTemplate}`);
      const kc = state.kitty.colors || {};
      if (kc.active_tab_background) lines.push(`active_tab_background ${kc.active_tab_background}`);
      if (kc.active_tab_foreground) lines.push(`active_tab_foreground ${kc.active_tab_foreground}`);
      if (kc.inactive_tab_background) lines.push(`inactive_tab_background ${kc.inactive_tab_background}`);
      if (kc.inactive_tab_foreground) lines.push(`inactive_tab_foreground ${kc.inactive_tab_foreground}`);

      const directives = Array.isArray(state.kitty.directives) ? state.kitty.directives : [];
      const directiveLines = directives
        .map((d) => {
          const k = String(d?.key || '').trim();
          if (!k) return '';
          const v = d?.value == null ? '' : String(d.value).trim();
          return v ? `${k} ${v}` : k;
        })
        .filter(Boolean);
      if (directiveLines.length) {
        lines.push('');
        lines.push('# Directives');
        lines.push(...directiveLines);
      }
      if (state.kitty.rawLines && String(state.kitty.rawLines).trim()) {
        lines.push('');
        lines.push('# Raw lines');
        lines.push(String(state.kitty.rawLines).trim());
      }
    }

    return { filename: 'kitty.conf', mime: 'text/plain', content: lines.join('\n') + '\n' };
  }

  function exportAlacrittyToml(state) {
    const colors = state.colors;
    const family = state.font.family === 'custom' ? state.font.customFamily : state.font.family;
    const opacity = clamp(Number(state.window.opacity) / 100, 0, 1);
    const pad = state.window.padding;
    const padX = Math.round((Number(pad.left) + Number(pad.right)) / 2);
    const padY = Math.round((Number(pad.top) + Number(pad.bottom)) / 2);

    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

    const lines = [];
    lines.push('# Generated by EZGalaxy Terminal Customizer');
    lines.push('');

    lines.push('[colors.primary]');
    lines.push(`background = "${colors.background}"`);
    lines.push(`foreground = "${colors.foreground}"`);
    lines.push('');

    lines.push('[colors.cursor]');
    lines.push(`cursor = "${colors.cursor}"`);
    lines.push('');

    lines.push('[colors.selection]');
    lines.push(`background = "${colors.selection}"`);
    lines.push('');

    lines.push('[colors.normal]');
    for (let i = 0; i < 8; i++) lines.push(`${names[i]} = "${colors.ansiNormal[i]}"`);
    lines.push('');

    lines.push('[colors.bright]');
    for (let i = 0; i < 8; i++) lines.push(`${names[i]} = "${colors.ansiBright[i]}"`);
    lines.push('');

    lines.push('[font]');
    if (family) {
      lines.push('[font.normal]');
      lines.push(`family = "${family}"`);
      lines.push('');
    }
    lines.push(`size = ${Number(state.font.size) || 12}`);
    lines.push('');

    lines.push('[window]');
    lines.push(`opacity = ${opacity.toFixed(2)}`);
    lines.push('');

    lines.push('[window.padding]');
    lines.push(`x = ${padX}`);
    lines.push(`y = ${padY}`);
    lines.push('');

    lines.push('[cursor]');
    const shape = state.cursor.shape === 'beam' ? 'Beam' : state.cursor.shape === 'underline' ? 'Underline' : 'Block';
    lines.push(`style = "${shape}"`);
    lines.push(`blink = ${state.cursor.blink ? 'true' : 'false'}`);
    lines.push('');

    lines.push('[scrolling]');
    lines.push(`history = ${Math.max(0, Number(state.behavior.scrollback) || 0)}`);

    return { filename: 'alacritty.toml', mime: 'text/plain', content: lines.join('\n') + '\n' };
  }

  function exportWezTerm(state) {
    const colors = state.colors;
    const family = state.font.family === 'custom' ? state.font.customFamily : state.font.family;
    const opacity = clamp(Number(state.window.opacity) / 100, 0, 1);
    const pad = state.window.padding;

    const padX = Math.round((Number(pad.left) + Number(pad.right)) / 2);
    const padY = Math.round((Number(pad.top) + Number(pad.bottom)) / 2);

    const cursorStyle = state.cursor.shape === 'beam' ? 'SteadyBar' : state.cursor.shape === 'underline' ? 'SteadyUnderline' : 'SteadyBlock';

    const lines = [];
    lines.push('-- Generated by EZGalaxy Terminal Customizer');
    lines.push("local wezterm = require 'wezterm'");
    lines.push('');
    lines.push('return {');
    if (family) lines.push(`  font = wezterm.font('${family.replace(/'/g, "\\'")}'),`);
    lines.push(`  font_size = ${Number(state.font.size) || 12},`);
    lines.push(`  line_height = ${Number(state.font.lineHeight) || 1.2},`);
    lines.push(`  window_background_opacity = ${opacity.toFixed(2)},`);
    lines.push('  colors = {');
    lines.push(`    foreground = '${colors.foreground}',`);
    lines.push(`    background = '${colors.background}',`);
    lines.push(`    cursor_bg = '${colors.cursor}',`);
    lines.push(`    selection_bg = '${colors.selection}',`);
    lines.push('    ansi = {');
    for (let i = 0; i < 8; i++) lines.push(`      '${colors.ansiNormal[i]}',`);
    lines.push('    },');
    lines.push('    brights = {');
    for (let i = 0; i < 8; i++) lines.push(`      '${colors.ansiBright[i]}',`);
    lines.push('    },');
    lines.push('  },');
    lines.push('  cursor_thickness = ' + clamp(Number(state.cursor.beamWidth) || 2, 1, 8) + ',');
    lines.push(`  default_cursor_style = '${cursorStyle}',`);
    lines.push('  window_padding = {');
    lines.push(`    left = ${padX}, right = ${padX}, top = ${padY}, bottom = ${padY},`);
    lines.push('  },');
    lines.push('}');

    return { filename: 'wezterm.lua', mime: 'text/plain', content: lines.join('\n') + '\n' };
  }

  function exportWindowsTerminalScheme(state) {
    const c = state.colors;
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white'];

    const scheme = {
      name: 'EZGalaxy',
      foreground: c.foreground,
      background: c.background,
      cursorColor: c.cursor,
      selectionBackground: c.selection,
    };

    for (let i = 0; i < 8; i++) scheme[names[i]] = c.ansiNormal[i];
    for (let i = 0; i < 8; i++) scheme[`bright${names[i][0].toUpperCase()}${names[i].slice(1)}`] = c.ansiBright[i];

    const payload = {
      schemes: [scheme],
      note: 'Ajoutez cet objet à votre settings.json (section "schemes").',
    };

    return { filename: 'windows-terminal.scheme.json', mime: 'application/json', content: JSON.stringify(payload, null, 2) + '\n' };
  }

  function renderConfig(state) {
    const out = computeExport(state);
    const pre = $('config-preview');
    const code = pre ? pre.querySelector('code') : null;
    if (code) code.textContent = out.content;

    const filenameEl = $('export-filename');
    if (filenameEl) filenameEl.textContent = out.filename;
  }

  function renderTerminalInfo(state) {
    const info = $('terminal-info');
    if (!info) return;

    const meta = TERMINALS[state.terminal] || TERMINALS.kitty;
    info.innerHTML = meta.info;
  }

  function setTheme(themeId, state) {
    if (!THEMES[themeId]) return state;
    const next = deepClone(state);
    next.theme = themeId;
    next.colors = deepClone(THEMES[themeId].colors);
    return next;
  }

  function saveStateToLocalStorage(state) {
    try {
      localStorage.setItem(STORAGE_STATE, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  function loadStateFromLocalStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_STATE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function sanitizeState(raw) {
    const base = deepClone(DEFAULT_STATE);
    if (!raw || typeof raw !== 'object') return base;

    mergeDeep(base, raw);

    base.window.opacity = clamp(Number(base.window.opacity) || 100, 0, 100);
    base.window.blur = clamp(Number(base.window.blur) || 0, 0, 64);

    base.font.size = clamp(Number(base.font.size) || 12, 6, 32);
    base.font.lineHeight = clamp(Number(base.font.lineHeight) || 1.2, 0.8, 2.5);

    base.cursor.beamWidth = clamp(Number(base.cursor.beamWidth) || 2, 1, 8);

    base.behavior.scrollback = clamp(Number(base.behavior.scrollback) || 0, 0, 1000000);

    const p = base.window.padding;
    base.window.padding = {
      top: clamp(Number(p.top) || 0, 0, 100),
      right: clamp(Number(p.right) || 0, 0, 100),
      bottom: clamp(Number(p.bottom) || 0, 0, 100),
      left: clamp(Number(p.left) || 0, 0, 100),
    };

    base.colors.background = normalizeHexColor(base.colors.background) || DEFAULT_STATE.colors.background;
    base.colors.foreground = normalizeHexColor(base.colors.foreground) || DEFAULT_STATE.colors.foreground;
    base.colors.cursor = normalizeHexColor(base.colors.cursor) || DEFAULT_STATE.colors.cursor;
    base.colors.selection = normalizeHexColor(base.colors.selection) || DEFAULT_STATE.colors.selection;

    base.colors.ansiNormal = Array.isArray(base.colors.ansiNormal) ? base.colors.ansiNormal.slice(0, 8) : DEFAULT_STATE.colors.ansiNormal.slice();
    base.colors.ansiBright = Array.isArray(base.colors.ansiBright) ? base.colors.ansiBright.slice(0, 8) : DEFAULT_STATE.colors.ansiBright.slice();

    for (let i = 0; i < 8; i++) {
      base.colors.ansiNormal[i] = normalizeHexColor(base.colors.ansiNormal[i]) || DEFAULT_STATE.colors.ansiNormal[i];
      base.colors.ansiBright[i] = normalizeHexColor(base.colors.ansiBright[i]) || DEFAULT_STATE.colors.ansiBright[i];
    }

    if (!base.kitty || typeof base.kitty !== 'object') base.kitty = deepClone(DEFAULT_STATE.kitty);
    if (!Array.isArray(base.kitty.directives)) base.kitty.directives = [];
    base.kitty.directives = base.kitty.directives
      .map((d) => ({ key: String(d?.key || '').trim(), value: d?.value == null ? '' : String(d.value) }))
      .filter((d) => d.key.length > 0);

    return base;
  }

  function buildSpecialSwatches(state) {
    return [
      { key: 'background', label: 'BG' },
      { key: 'foreground', label: 'FG' },
      { key: 'cursor', label: 'CUR' },
      { key: 'selection', label: 'SEL' },
    ].map((x) => ({
      group: 'special',
      key: x.key,
      label: x.label,
      value: state.colors[x.key],
    }));
  }

  function buildAnsiSwatches(state, group) {
    const labels = ['K', 'R', 'G', 'Y', 'B', 'M', 'C', 'W'];
    const arr = group === 'ansiBright' ? state.colors.ansiBright : state.colors.ansiNormal;
    return arr.map((value, index) => ({
      group,
      index,
      label: labels[index],
      value,
    }));
  }

  function setSwatchColor(el, color) {
    el.style.background = color;
    const valueEl = el.querySelector('.color-swatch-value');
    if (valueEl) valueEl.textContent = color;
  }

  function createSwatchElement(swatch) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.dataset.group = swatch.group;
    if (swatch.key) btn.dataset.key = swatch.key;
    if (Number.isInteger(swatch.index)) btn.dataset.index = String(swatch.index);

    btn.innerHTML = `
      <span class="color-swatch-label"></span>
      <span class="color-swatch-value"></span>
    `.trim();

    btn.querySelector('.color-swatch-label').textContent = swatch.label;
    setSwatchColor(btn, swatch.value);
    return btn;
  }

  let activePickr = null;
  let pickrAnchorButton = null;
  let activeSwatchEl = null;
  let pickrOnColor = null;

  function clearActiveSwatch() {
    if (activeSwatchEl) activeSwatchEl.classList.remove('active');
    activeSwatchEl = null;
  }

  function ensurePickr() {
    if (activePickr) return activePickr;

    pickrAnchorButton = document.createElement('button');
    pickrAnchorButton.type = 'button';
    pickrAnchorButton.setAttribute('aria-hidden', 'true');
    pickrAnchorButton.style.position = 'fixed';
    pickrAnchorButton.style.left = '-9999px';
    pickrAnchorButton.style.top = '-9999px';
    pickrAnchorButton.style.width = '1px';
    pickrAnchorButton.style.height = '1px';
    pickrAnchorButton.style.opacity = '0';
    pickrAnchorButton.style.pointerEvents = 'none';
    document.body.appendChild(pickrAnchorButton);

    const swatches = [
      '#0f1419', '#1e1e2e', '#282a36', '#2e3440', '#282c34',
      '#ffffff', '#d8dee9', '#cdd6f4', '#abb2bf', '#ebdbb2',
      '#f38ba8', '#ff5555', '#e06c75', '#ff6188', '#eb6f92',
      '#a6e3a1', '#50fa7b', '#98c379', '#9ece6a', '#a7c080',
      '#f9e2af', '#f1fa8c', '#e5c07b', '#e0af68', '#dbbc7f',
      '#89b4fa', '#61afef', '#7aa2f7', '#82aaff', '#268bd2',
      '#f5c2e7', '#c678dd', '#bb9af7', '#d699b6', '#d33682',
      '#94e2d5', '#56b6c2', '#7dcfff', '#88c0d0', '#2aa198',
    ];

    // Pickr is global (loaded from vendor)
    activePickr = window.Pickr.create({
      el: pickrAnchorButton,
      theme: 'classic',
      useAsButton: true,
      default: '#ffffff',
      swatches,
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          hex: true,
          rgba: true,
          input: true,
          clear: false,
          save: true,
          cancel: true,
        },
      },
    });

    activePickr
      .on('change', (color) => {
        if (!color || !pickrOnColor) return;
        pickrOnColor(color.toHEXA().toString());
      })
      .on('save', (color) => {
        if (!color || !pickrOnColor) return;
        pickrOnColor(color.toHEXA().toString());
        clearActiveSwatch();
        pickrOnColor = null;
      })
      .on('cancel', () => {
        clearActiveSwatch();
        pickrOnColor = null;
      })
      .on('hide', () => {
        clearActiveSwatch();
        pickrOnColor = null;
      });

    return activePickr;
  }

  function openPickrForSwatch(swatchEl, currentColor, onColor) {
    clearActiveSwatch();
    activeSwatchEl = swatchEl;
    activeSwatchEl.classList.add('active');

    pickrOnColor = onColor;
    const pickr = ensurePickr();

    const rect = swatchEl.getBoundingClientRect();
    pickrAnchorButton.style.left = `${Math.max(0, rect.left)}px`;
    pickrAnchorButton.style.top = `${Math.max(0, rect.top)}px`;
    pickrAnchorButton.style.width = `${Math.max(1, rect.width)}px`;
    pickrAnchorButton.style.height = `${Math.max(1, rect.height)}px`;

    try {
      pickr.setColor(currentColor, true);
    } catch {
      // ignore
    }

    try {
      pickr.show();
    } catch {
      // ignore
    }
  }

  function applyStateToForm(state) {
    $('terminal-select').value = state.terminal;
    $('theme-select').value = state.theme;

    $('font-family').value = state.font.family;
    $('font-family-custom').value = state.font.customFamily;
    $('font-family-custom').classList.toggle('hidden', state.font.family !== 'custom');

    $('font-size').value = state.font.size;
    $('line-height').value = state.font.lineHeight;
    $('font-bold').checked = !!state.font.bold;

    for (const btn of document.querySelectorAll('.cursor-shape')) {
      btn.classList.toggle('active', btn.dataset.shape === state.cursor.shape);
    }

    $('cursor-blink').checked = !!state.cursor.blink;
    $('beam-width').value = state.cursor.beamWidth;
    $('beam-width-group').classList.toggle('hidden', state.cursor.shape === 'block');

    $('opacity').value = state.window.opacity;
    $('opacity-value').textContent = `${state.window.opacity}%`;
    $('blur').value = state.window.blur;

    $('wallpaper').value = state.window.wallpaper || 'aurora';
    $('floating-window').checked = state.window.floating !== false;

    $('padding-top').value = state.window.padding.top;
    $('padding-right').value = state.window.padding.right;
    $('padding-bottom').value = state.window.padding.bottom;
    $('padding-left').value = state.window.padding.left;

    $('scrollback').value = state.behavior.scrollback;
    $('bell').value = state.behavior.bell;
    $('confirm-close').checked = !!state.behavior.confirmClose;

    const kittySection = $('kitty-advanced-section');
    if (kittySection) kittySection.classList.toggle('hidden', state.terminal !== 'kitty');
    if ($('kitty-ligatures')) $('kitty-ligatures').checked = state.kitty?.ligatures !== false;
    if ($('kitty-tab-bar-style')) $('kitty-tab-bar-style').value = state.kitty?.tabBarStyle || 'powerline';
    if ($('kitty-tab-bar-edge')) $('kitty-tab-bar-edge').value = state.kitty?.tabBarEdge || 'top';
    if ($('kitty-tab-title-template')) $('kitty-tab-title-template').value = state.kitty?.tabTitleTemplate || '{title}';
    if ($('kitty-raw-lines')) $('kitty-raw-lines').value = state.kitty?.rawLines || '';
  }

  function renderKittyDirectives(state) {
    const list = $('kitty-directives');
    if (!list) return;

    const directives = Array.isArray(state.kitty?.directives) ? state.kitty.directives : [];
    list.innerHTML = '';

    if (!directives.length) {
      const empty = document.createElement('div');
      empty.className = 'terminal-info';
      empty.textContent = 'Aucune directive ajoutée.';
      list.appendChild(empty);
      return;
    }

    directives.forEach((d, index) => {
      const row = document.createElement('div');
      row.className = 'kitty-directive-row';

      const keyInput = document.createElement('input');
      keyInput.className = 'form-input';
      keyInput.value = String(d?.key || '');
      keyInput.placeholder = 'clé';

      const valueInput = document.createElement('input');
      valueInput.className = 'form-input';
      valueInput.value = d?.value == null ? '' : String(d.value);
      valueInput.placeholder = 'valeur';

      const commit = () => {
        const next = deepClone(state);
        next.kitty = next.kitty || deepClone(DEFAULT_STATE.kitty);
        next.kitty.directives = Array.isArray(next.kitty.directives) ? next.kitty.directives.slice() : [];
        if (!next.kitty.directives[index]) next.kitty.directives[index] = { key: '', value: '' };
        next.kitty.directives[index] = {
          key: String(keyInput.value || '').trim(),
          value: String(valueInput.value || '').trim(),
        };
        state = sanitizeState(next);
        saveStateToLocalStorage(state);
        renderConfig(state);
      };

      keyInput.addEventListener('blur', commit);
      valueInput.addEventListener('blur', commit);
      keyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          commit();
          valueInput.focus();
        }
      });
      valueInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          commit();
          valueInput.blur();
        }
      });

      const actions = document.createElement('div');
      actions.className = 'kitty-directive-actions';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'kitty-directive-remove';
      remove.dataset.act = 'removeKittyDirective';
      remove.dataset.index = String(index);
      remove.textContent = 'Supprimer';

      actions.appendChild(remove);
      row.appendChild(keyInput);
      row.appendChild(valueInput);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function renderSwatches(state) {
    const special = $('special-colors');
    const normal = $('ansi-normal');
    const bright = $('ansi-bright');

    special.innerHTML = '';
    normal.innerHTML = '';
    bright.innerHTML = '';

    for (const sw of buildSpecialSwatches(state)) special.appendChild(createSwatchElement(sw));
    for (const sw of buildAnsiSwatches(state, 'ansiNormal')) normal.appendChild(createSwatchElement(sw));
    for (const sw of buildAnsiSwatches(state, 'ansiBright')) bright.appendChild(createSwatchElement(sw));

    const kitty = $('kitty-colors');
    if (kitty) {
      kitty.innerHTML = '';
      const kittySw = [
        { key: 'url_color', label: 'URL' },
        { key: 'active_tab_background', label: 'TAB+' },
        { key: 'active_tab_foreground', label: 'TAB+FG' },
        { key: 'inactive_tab_background', label: 'TAB' },
        { key: 'inactive_tab_foreground', label: 'TABFG' },
      ].map((x) => ({ group: 'kitty', key: x.key, label: x.label, value: state.kitty?.colors?.[x.key] || '#ffffff' }));

      for (const sw of kittySw) kitty.appendChild(createSwatchElement(sw));
    }
  }

  function updateSwatchesFromState(state) {
    for (const el of document.querySelectorAll('.color-swatch')) {
      const group = el.dataset.group;
      if (group === 'special') {
        const key = el.dataset.key;
        setSwatchColor(el, state.colors[key]);
      } else if (group === 'ansiNormal' || group === 'ansiBright') {
        const index = Number(el.dataset.index);
        const arr = group === 'ansiBright' ? state.colors.ansiBright : state.colors.ansiNormal;
        setSwatchColor(el, arr[index]);
      } else if (group === 'kitty') {
        const key = el.dataset.key;
        setSwatchColor(el, state.kitty?.colors?.[key] || '#ffffff');
      }
    }
  }

  function setColorBySwatch(state, swatchEl, hex) {
    const group = swatchEl.dataset.group;
    const next = deepClone(state);

    if (next.theme !== 'custom') next.theme = 'custom';
    $('theme-select').value = 'custom';

    if (group === 'special') {
      next.colors[swatchEl.dataset.key] = hex;
    } else if (group === 'ansiNormal') {
      next.colors.ansiNormal[Number(swatchEl.dataset.index)] = hex;
    } else if (group === 'ansiBright') {
      next.colors.ansiBright[Number(swatchEl.dataset.index)] = hex;
    } else if (group === 'kitty') {
      next.kitty = next.kitty || deepClone(DEFAULT_STATE.kitty);
      next.kitty.colors = next.kitty.colors || {};
      next.kitty.colors[swatchEl.dataset.key] = hex;
    }

    return next;
  }

  function downloadText(filename, mime, content) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  function parseKittyConf(text) {
    const next = {
      colors: {},
      font: {},
      cursor: {},
      window: {},
      behavior: {},
      kitty: { colors: {}, directives: [], rawLines: '' },
    };

    const unknownLines = [];

    const lines = text.split(/\r?\n/);
    for (const lineRaw of lines) {
      const line = lineRaw.replace(/#.*/, '').trim();
      if (!line) continue;
      const m = line.match(/^([A-Za-z0-9_]+)\s+(.+)$/);
      if (!m) continue;

      const key = m[1];
      const value = m[2].trim();
      let recognized = false;

      if (key === 'background') {
        next.colors.background = normalizeHexColor(value);
        recognized = true;
      }
      if (key === 'foreground') {
        next.colors.foreground = normalizeHexColor(value);
        recognized = true;
      }
      if (key === 'cursor') {
        next.colors.cursor = normalizeHexColor(value);
        recognized = true;
      }
      if (key === 'selection_background') {
        next.colors.selection = normalizeHexColor(value);
        recognized = true;
      }

      const colorN = key.match(/^color(\d{1,2})$/);
      if (colorN) {
        const idx = Number(colorN[1]);
        const hex = normalizeHexColor(value);
        if (hex) {
          if (idx >= 0 && idx <= 7) {
            if (!next.colors.ansiNormal) next.colors.ansiNormal = [];
            next.colors.ansiNormal[idx] = hex;
          }
          if (idx >= 8 && idx <= 15) {
            if (!next.colors.ansiBright) next.colors.ansiBright = [];
            next.colors.ansiBright[idx - 8] = hex;
          }
          recognized = true;
        }
      }

      if (key === 'font_family') {
        next.font.family = value;
        recognized = true;
      }
      if (key === 'font_size') {
        next.font.size = Number(value);
        recognized = true;
      }

      if (key === 'cursor_shape') {
        next.cursor.shape = value;
        recognized = true;
      }
      if (key === 'cursor_beam_thickness') {
        next.cursor.beamWidth = Number(value);
        recognized = true;
      }
      if (key === 'cursor_underline_thickness') {
        next.cursor.beamWidth = Number(value);
        recognized = true;
      }
      if (key === 'cursor_blink_interval') {
        next.cursor.blink = Number(value) > 0;
        recognized = true;
      }

      if (key === 'background_opacity') {
        next.window.opacity = Math.round(clamp(Number(value), 0, 1) * 100);
        recognized = true;
      }
      if (key === 'background_blur') {
        next.window.blur = Number(value);
        recognized = true;
      }
      if (key === 'window_padding_width') {
        next.window.paddingX = Number(value);
        recognized = true;
      }
      if (key === 'window_padding_height') {
        next.window.paddingY = Number(value);
        recognized = true;
      }

      if (key === 'scrollback_lines') {
        next.behavior.scrollback = Number(value);
        recognized = true;
      }
      if (key === 'enable_audio_bell') {
        next.behavior.bell = value === 'yes' ? 'audio' : 'none';
        recognized = true;
      }
      if (key === 'visual_bell_duration') {
        next.behavior.bell = Number(value) > 0 ? 'visual' : (next.behavior.bell || 'none');
        recognized = true;
      }
      if (key === 'confirm_os_window_close') {
        next.behavior.confirmClose = value === 'yes' || value === '1' || value === 'true';
        recognized = true;
      }

      // Kitty advanced (common)
      if (key === 'enable_ligatures') {
        next.kitty.ligatures = value.toLowerCase() !== 'never';
        recognized = true;
      }
      if (key === 'tab_bar_style') {
        next.kitty.tabBarStyle = value;
        recognized = true;
      }
      if (key === 'tab_bar_edge') {
        next.kitty.tabBarEdge = value;
        recognized = true;
      }
      if (key === 'tab_title_template') {
        next.kitty.tabTitleTemplate = value;
        recognized = true;
      }
      if (key === 'url_color') {
        next.kitty.colors.url_color = normalizeHexColor(value) || value;
        recognized = true;
      }
      if (
        key === 'active_tab_background' ||
        key === 'active_tab_foreground' ||
        key === 'inactive_tab_background' ||
        key === 'inactive_tab_foreground'
      ) {
        next.kitty.colors[key] = normalizeHexColor(value) || value;
        recognized = true;
      }

      if (!recognized) unknownLines.push(`${key} ${value}`);
    }

    if (unknownLines.length) next.kitty.rawLines = unknownLines.join('\n');

    const patch = {};
    if (Object.keys(next.colors).length) patch.colors = next.colors;
    if (Object.keys(next.font).length) patch.font = next.font;
    if (Object.keys(next.cursor).length) patch.cursor = next.cursor;
    if (Object.keys(next.window).length) patch.window = next.window;
    if (Object.keys(next.behavior).length) patch.behavior = next.behavior;
    if (Object.keys(next.kitty.colors).length || next.kitty.rawLines || next.kitty.ligatures != null || next.kitty.tabBarStyle || next.kitty.tabBarEdge || next.kitty.tabTitleTemplate) {
      patch.kitty = next.kitty;
    }

    if (next.window.paddingX != null || next.window.paddingY != null) {
      patch.window = patch.window || {};
      patch.window.padding = {
        top: next.window.paddingY != null ? next.window.paddingY : DEFAULT_STATE.window.padding.top,
        bottom: next.window.paddingY != null ? next.window.paddingY : DEFAULT_STATE.window.padding.bottom,
        left: next.window.paddingX != null ? next.window.paddingX : DEFAULT_STATE.window.padding.left,
        right: next.window.paddingX != null ? next.window.paddingX : DEFAULT_STATE.window.padding.right,
      };
    }

    return patch;
  }

  function parseAlacrittyToml(text) {
    if (!window.toml || !window.toml.parse) throw new Error('Parser TOML manquant');
    const obj = window.toml.parse(text);

    const patch = { colors: {}, font: {}, cursor: {}, window: {}, behavior: {} };

    const c = obj.colors || {};
    const primary = c.primary || {};
    if (primary.background) patch.colors.background = normalizeHexColor(primary.background);
    if (primary.foreground) patch.colors.foreground = normalizeHexColor(primary.foreground);

    const cursor = c.cursor || {};
    if (cursor.cursor) patch.colors.cursor = normalizeHexColor(cursor.cursor);

    const selection = c.selection || {};
    if (selection.background) patch.colors.selection = normalizeHexColor(selection.background);

    const normal = c.normal || {};
    const bright = c.bright || {};
    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    patch.colors.ansiNormal = names.map((n, i) => normalizeHexColor(normal[n]) || DEFAULT_STATE.colors.ansiNormal[i]);
    patch.colors.ansiBright = names.map((n, i) => normalizeHexColor(bright[n]) || DEFAULT_STATE.colors.ansiBright[i]);

    const font = obj.font || {};
    if (font.normal && font.normal.family) patch.font.family = font.normal.family;
    if (font.size) patch.font.size = Number(font.size);

    const win = obj.window || {};
    if (win.opacity != null) patch.window.opacity = Math.round(clamp(Number(win.opacity), 0, 1) * 100);
    if (win.padding && (win.padding.x != null || win.padding.y != null)) {
      patch.window.padding = {
        top: win.padding.y ?? DEFAULT_STATE.window.padding.top,
        bottom: win.padding.y ?? DEFAULT_STATE.window.padding.bottom,
        left: win.padding.x ?? DEFAULT_STATE.window.padding.left,
        right: win.padding.x ?? DEFAULT_STATE.window.padding.right,
      };
    }

    const cursorCfg = obj.cursor || {};
    if (cursorCfg.style) {
      const style = String(cursorCfg.style).toLowerCase();
      patch.cursor.shape = style.includes('beam') || style.includes('bar') ? 'beam' : style.includes('underline') ? 'underline' : 'block';
    }
    if (cursorCfg.blink != null) patch.cursor.blink = !!cursorCfg.blink;

    const scrolling = obj.scrolling || {};
    if (scrolling.history != null) patch.behavior.scrollback = Number(scrolling.history);

    return patch;
  }

  function parseYaml(text) {
    if (!window.jsyaml || !window.jsyaml.load) throw new Error('Parser YAML manquant');
    const obj = window.jsyaml.load(text);

    const patch = { colors: {}, font: {}, cursor: {}, window: {}, behavior: {} };

    // Heuristic: handle Alacritty YAML layout
    const c = obj?.colors || {};
    const primary = c.primary || {};
    if (primary.background) patch.colors.background = normalizeHexColor(primary.background);
    if (primary.foreground) patch.colors.foreground = normalizeHexColor(primary.foreground);

    const cursor = c.cursor || {};
    if (cursor.cursor) patch.colors.cursor = normalizeHexColor(cursor.cursor);

    const selection = c.selection || {};
    if (selection.background) patch.colors.selection = normalizeHexColor(selection.background);

    const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    patch.colors.ansiNormal = names.map((n, i) => normalizeHexColor(c.normal?.[n]) || DEFAULT_STATE.colors.ansiNormal[i]);
    patch.colors.ansiBright = names.map((n, i) => normalizeHexColor(c.bright?.[n]) || DEFAULT_STATE.colors.ansiBright[i]);

    if (obj?.font?.normal?.family) patch.font.family = obj.font.normal.family;
    if (obj?.font?.size != null) patch.font.size = Number(obj.font.size);

    if (obj?.window?.opacity != null) patch.window.opacity = Math.round(clamp(Number(obj.window.opacity), 0, 1) * 100);

    if (obj?.window?.padding && (obj.window.padding.x != null || obj.window.padding.y != null)) {
      patch.window.padding = {
        top: obj.window.padding.y ?? DEFAULT_STATE.window.padding.top,
        bottom: obj.window.padding.y ?? DEFAULT_STATE.window.padding.bottom,
        left: obj.window.padding.x ?? DEFAULT_STATE.window.padding.left,
        right: obj.window.padding.x ?? DEFAULT_STATE.window.padding.right,
      };
    }

    return patch;
  }

  function parseWindowsTerminalJson(text) {
    const obj = JSON.parse(text);

    const schemes = obj?.schemes;
    const scheme = Array.isArray(schemes) ? schemes[0] : null;
    if (!scheme || typeof scheme !== 'object') throw new Error('Aucun scheme trouvé');

    const patch = { colors: {} };

    patch.colors.background = normalizeHexColor(scheme.background);
    patch.colors.foreground = normalizeHexColor(scheme.foreground);
    patch.colors.cursor = normalizeHexColor(scheme.cursorColor);
    patch.colors.selection = normalizeHexColor(scheme.selectionBackground);

    const normalNames = ['black', 'red', 'green', 'yellow', 'blue', 'purple', 'cyan', 'white'];
    patch.colors.ansiNormal = normalNames.map((n, i) => normalizeHexColor(scheme[n]) || DEFAULT_STATE.colors.ansiNormal[i]);

    const brightNames = normalNames.map((n) => `bright${n[0].toUpperCase()}${n.slice(1)}`);
    patch.colors.ansiBright = brightNames.map((n, i) => normalizeHexColor(scheme[n]) || DEFAULT_STATE.colors.ansiBright[i]);

    return patch;
  }

  async function importFromFile(file) {
    const text = await file.text();
    const name = (file.name || '').toLowerCase();

    let patch = null;

    if (name.endsWith('.conf') || name.includes('kitty')) {
      patch = parseKittyConf(text);
    } else if (name.endsWith('.toml')) {
      patch = parseAlacrittyToml(text);
    } else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
      patch = parseYaml(text);
    } else if (name.endsWith('.json')) {
      patch = parseWindowsTerminalJson(text);
    } else {
      // Try best-effort
      try {
        patch = parseKittyConf(text);
      } catch {
        // ignore
      }

      if (!patch || !Object.keys(patch).length) {
        throw new Error('Format non reconnu');
      }
    }

    return patch;
  }

  async function loadPresets() {
    const token = ensureApiToken();
    if (!token) {
      toast('warning', 'Token manquant', 'Impossible de charger les presets sans token API.');
      return [];
    }

    const data = await apiFetch(`/api/community/${EXTENSION_ID}/${COLLECTION_PRESETS}?limit=200&offset=0`);
    return Array.isArray(data?.items) ? data.items : [];
  }

  async function refreshPresetsModal(setStateFromPreset) {
    openModal('presets-modal');
    try {
      const items = await loadPresets();
      renderPresetsList(
        items,
        (item) => setStateFromPreset(item),
        async (item) => {
          const ok = window.confirm(`Supprimer le preset "${item?.data?.name || item.record_key}" ?`);
          if (!ok) return;
          try {
            await deletePreset(item.record_key);
            toast('success', 'Supprimé', 'Preset supprimé');
            await refreshPresetsModal(setStateFromPreset);
          } catch (e) {
            toast('error', 'Erreur', e.message || 'Suppression impossible');
          }
        }
      );
    } catch (e) {
      toast('error', 'Erreur', e.message || 'Impossible de charger les presets');
      renderPresetsList([], () => {}, () => {});
    }
  }

  async function upsertPreset(recordKey, data) {
    const token = ensureApiToken();
    if (!token) throw new Error('Token manquant');

    return apiFetch(`/api/community/${EXTENSION_ID}/${COLLECTION_PRESETS}/${encodeURIComponent(recordKey)}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }

  async function deletePreset(recordKey) {
    const token = ensureApiToken();
    if (!token) throw new Error('Token manquant');

    return apiFetch(`/api/community/${EXTENSION_ID}/${COLLECTION_PRESETS}/${encodeURIComponent(recordKey)}`, { method: 'DELETE' });
  }

  function renderPresetsList(items, onApply, onDelete) {
    const list = $('presets-list');
    const empty = $('presets-empty');

    list.innerHTML = '';

    if (!items.length) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'preset-item';

      const title = item?.data?.name || item.record_key;
      const updated = item.updated_at ? new Date(item.updated_at).toLocaleString() : '';

      row.innerHTML = `
        <div class="preset-item-main">
          <div class="preset-item-title"></div>
          <div class="preset-item-meta"></div>
        </div>
        <div class="preset-item-actions">
          <button class="ez-btn ez-btn--primary" data-act="apply">Appliquer</button>
          <button class="ez-btn" data-act="delete">Supprimer</button>
        </div>
      `.trim();

      row.querySelector('.preset-item-title').textContent = title;
      row.querySelector('.preset-item-meta').textContent = updated;

      row.querySelector('[data-act="apply"]').addEventListener('click', () => onApply(item));
      row.querySelector('[data-act="delete"]').addEventListener('click', () => onDelete(item));

      list.appendChild(row);
    }
  }

  function init() {
    let state = sanitizeState(loadStateFromLocalStorage() || DEFAULT_STATE);

    // Initial render
    renderSwatches(state);
    applyStateToForm(state);
    renderTerminalInfo(state);
    applyPreview(state);
    renderConfig(state);
    renderKittyDirectives(state);

    const desk = $('desktop-preview');
    if (desk) desk.dataset.wallpaper = state.window.wallpaper || 'aurora';

    const winEl = $('terminal-window');
    if (winEl) {
      winEl.dataset.floating = state.window.floating !== false ? 'true' : 'false';
      if (state.window.floating === false) {
        winEl.style.left = '';
        winEl.style.top = '';
        winEl.style.width = '';
        winEl.style.height = '';
      }
    }

    installHelpTooltips();

    // Seed terminal with some context
    appendLine('<span class="comment"># EZGalaxy terminal preview (faux)</span>');
    appendLine('<span class="comment"># Astuce:</span> <span class="keyword">help</span> <span class="comment">pour voir les commandes</span>');

    // Events: delegated actions
    document.addEventListener('click', async (ev) => {
      const actEl = ev.target.closest('[data-act]');
      if (!actEl) return;
      const act = actEl.dataset.act;

      if (act === 'closeModal') {
        closeAllModals();
        return;
      }

      if (act === 'toggleConfig') {
        const pre = $('config-preview');
        if (!pre) return;
        pre.classList.toggle('collapsed');
        actEl.textContent = pre.classList.contains('collapsed') ? '▲' : '▼';
        return;
      }

      if (act === 'download') {
        const out = computeExport(state);
        downloadText(out.filename, out.mime, out.content);
        toast('success', 'Téléchargé', out.filename);
        return;
      }

      if (act === 'copy') {
        const out = computeExport(state);
        try {
          await copyToClipboard(out.content);
          toast('success', 'Copié', 'Configuration copiée dans le presse-papier');
        } catch {
          toast('error', 'Erreur', 'Impossible de copier dans le presse-papier');
        }
        return;
      }

      if (act === 'import') {
        openModal('import-modal');
        return;
      }

      if (act === 'selectFile') {
        $('import-file').click();
        return;
      }

      if (act === 'loadPresets') {
        await refreshPresetsModal((item) => {
          const imported = sanitizeState(item?.data?.state || {});
          state = imported;
          saveStateToLocalStorage(state);
          applyStateToForm(state);
          renderKittyDirectives(state);
          updateSwatchesFromState(state);
          renderTerminalInfo(state);
          applyPreview(state);
          renderConfig(state);

          const desk = $('desktop-preview');
          if (desk) desk.dataset.wallpaper = state.window.wallpaper || 'aurora';
          const win = $('terminal-window');
          if (win) {
            win.dataset.floating = state.window.floating !== false ? 'true' : 'false';
            if (state.window.floating === false) {
              win.style.left = '';
              win.style.top = '';
              win.style.width = '';
              win.style.height = '';
            }
          }

          closeAllModals();
          toast('success', 'Preset chargé', item?.data?.name || item.record_key);
        });
        return;
      }

      if (act === 'savePreset') {
        openModal('save-preset-modal');
        $('preset-name').value = '';
        $('preset-name').focus();
        return;
      }

      if (act === 'confirmSavePreset') {
        const name = $('preset-name').value.trim();
        if (!name) {
          toast('warning', 'Nom requis', 'Veuillez entrer un nom de preset');
          return;
        }

        const recordKey = slugifyRecordKey(name);
        const out = computeExport(state);

        try {
          await upsertPreset(recordKey, {
            name,
            terminal: state.terminal,
            state,
            exported: { filename: out.filename, content: out.content },
            savedAt: new Date().toISOString(),
          });
          closeAllModals();
          toast('success', 'Sauvegardé', `Preset: ${name}`);
        } catch (e) {
          if (e.status === 401 || e.status === 403) {
            toast('error', 'Auth', 'Token invalide ou extension non autorisée.');
          } else {
            toast('error', 'Erreur', e.message || 'Sauvegarde impossible');
          }
        }
        return;
      }

      if (act === 'addKittyDirective') {
        const keyEl = $('kitty-directive-key');
        const valEl = $('kitty-directive-value');
        if (!keyEl || !valEl) return;

        const key = String(keyEl.value || '').trim();
        const value = String(valEl.value || '').trim();
        if (!key) {
          toast('warning', 'Clé requise', 'Entrez une clé de directive Kitty');
          return;
        }

        const next = deepClone(state);
        next.kitty = next.kitty || deepClone(DEFAULT_STATE.kitty);
        next.kitty.directives = Array.isArray(next.kitty.directives) ? next.kitty.directives.slice() : [];
        next.kitty.directives.push({ key, value });
        state = sanitizeState(next);
        saveStateToLocalStorage(state);
        keyEl.value = '';
        valEl.value = '';
        renderKittyDirectives(state);
        renderConfig(state);
        return;
      }

      if (act === 'addKittyDirectivePreset') {
        const key = String(actEl.dataset.key || '').trim();
        if (!key) return;
        let value = String(actEl.dataset.value || '').trim();
        if (value.toUpperCase() === 'PROMPT') {
          value = window.prompt(`Valeur pour: ${key}`, '') || '';
          value = value.trim();
          if (!value) return;
        }

        const next = deepClone(state);
        next.kitty = next.kitty || deepClone(DEFAULT_STATE.kitty);
        next.kitty.directives = Array.isArray(next.kitty.directives) ? next.kitty.directives.slice() : [];
        next.kitty.directives.push({ key, value });
        state = sanitizeState(next);
        saveStateToLocalStorage(state);
        renderKittyDirectives(state);
        renderConfig(state);
        toast('success', 'Directive ajoutée', `${key} ${value}`);
        return;
      }

      if (act === 'removeKittyDirective') {
        const idx = Number(actEl.dataset.index);
        if (!Number.isFinite(idx)) return;
        const next = deepClone(state);
        next.kitty = next.kitty || deepClone(DEFAULT_STATE.kitty);
        next.kitty.directives = (next.kitty.directives || []).filter((_, i) => i !== idx);
        state = sanitizeState(next);
        saveStateToLocalStorage(state);
        renderKittyDirectives(state);
        renderConfig(state);
        return;
      }
    });

    // Swatch click
    document.addEventListener('click', (ev) => {
      const sw = ev.target.closest('.color-swatch');
      if (!sw) return;
      ev.preventDefault();

      const current = sw.querySelector('.color-swatch-value')?.textContent || '#ffffff';
      openPickrForSwatch(sw, current, (hex) => {
        const next = sanitizeState(setColorBySwatch(state, sw, hex));
        state = next;
        saveStateToLocalStorage(state);
        setSwatchColor(sw, hex);
        applyPreview(state);
        renderConfig(state);
      });
    });

    // Form events
    $('terminal-select').addEventListener('change', () => {
      state = sanitizeState({ ...state, terminal: $('terminal-select').value });
      saveStateToLocalStorage(state);
      renderTerminalInfo(state);
      applyStateToForm(state);
      renderKittyDirectives(state);
      renderConfig(state);
    });

    $('wallpaper').addEventListener('change', () => {
      const wallpaper = $('wallpaper').value;
      state = sanitizeState({ ...state, window: { ...state.window, wallpaper } });
      saveStateToLocalStorage(state);
      const desk = $('desktop-preview');
      if (desk) desk.dataset.wallpaper = wallpaper;
    });

    $('floating-window').addEventListener('change', () => {
      const floating = $('floating-window').checked;
      state = sanitizeState({ ...state, window: { ...state.window, floating } });
      saveStateToLocalStorage(state);
      const win = $('terminal-window');
      if (win) {
        win.dataset.floating = floating ? 'true' : 'false';
        if (!floating) {
          win.style.left = '';
          win.style.top = '';
          win.style.width = '';
          win.style.height = '';
        }
      }
    });

    $('theme-select').addEventListener('change', () => {
      const themeId = $('theme-select').value;
      if (themeId === 'custom') {
        state = sanitizeState({ ...state, theme: 'custom' });
      } else {
        state = sanitizeState(setTheme(themeId, state));
        updateSwatchesFromState(state);
      }
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('font-family').addEventListener('change', () => {
      const family = $('font-family').value;
      state = sanitizeState({ ...state, font: { ...state.font, family } });
      $('font-family-custom').classList.toggle('hidden', family !== 'custom');
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('font-family-custom').addEventListener('input', () => {
      state = sanitizeState({ ...state, font: { ...state.font, customFamily: $('font-family-custom').value } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('font-size').addEventListener('input', () => {
      state = sanitizeState({ ...state, font: { ...state.font, size: Number($('font-size').value) } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('line-height').addEventListener('input', () => {
      state = sanitizeState({ ...state, font: { ...state.font, lineHeight: Number($('line-height').value) } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('font-bold').addEventListener('change', () => {
      state = sanitizeState({ ...state, font: { ...state.font, bold: $('font-bold').checked } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    for (const btn of document.querySelectorAll('.cursor-shape')) {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape;
        state = sanitizeState({ ...state, cursor: { ...state.cursor, shape } });
        $('beam-width-group').classList.toggle('hidden', shape === 'block');
        for (const other of document.querySelectorAll('.cursor-shape')) other.classList.toggle('active', other === btn);
        saveStateToLocalStorage(state);
        applyPreview(state);
        renderConfig(state);
      });
    }

    $('cursor-blink').addEventListener('change', () => {
      state = sanitizeState({ ...state, cursor: { ...state.cursor, blink: $('cursor-blink').checked } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('beam-width').addEventListener('input', () => {
      state = sanitizeState({ ...state, cursor: { ...state.cursor, beamWidth: Number($('beam-width').value) } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('opacity').addEventListener('input', () => {
      const val = Number($('opacity').value);
      $('opacity-value').textContent = `${val}%`;
      state = sanitizeState({ ...state, window: { ...state.window, opacity: val } });
      saveStateToLocalStorage(state);
      applyPreview(state);
      renderConfig(state);
    });

    $('blur').addEventListener('input', () => {
      state = sanitizeState({ ...state, window: { ...state.window, blur: Number($('blur').value) } });
      saveStateToLocalStorage(state);
      renderConfig(state);
    });

    // Kitty advanced
    if ($('kitty-ligatures')) {
      $('kitty-ligatures').addEventListener('change', () => {
        state = sanitizeState({ ...state, kitty: { ...state.kitty, ligatures: $('kitty-ligatures').checked } });
        saveStateToLocalStorage(state);
        renderConfig(state);
      });
    }

    if ($('kitty-tab-bar-style')) {
      $('kitty-tab-bar-style').addEventListener('change', () => {
        state = sanitizeState({ ...state, kitty: { ...state.kitty, tabBarStyle: $('kitty-tab-bar-style').value } });
        saveStateToLocalStorage(state);
        renderConfig(state);
      });
    }

    if ($('kitty-tab-bar-edge')) {
      $('kitty-tab-bar-edge').addEventListener('change', () => {
        state = sanitizeState({ ...state, kitty: { ...state.kitty, tabBarEdge: $('kitty-tab-bar-edge').value } });
        saveStateToLocalStorage(state);
        renderConfig(state);
      });
    }

    if ($('kitty-tab-title-template')) {
      $('kitty-tab-title-template').addEventListener('input', () => {
        state = sanitizeState({ ...state, kitty: { ...state.kitty, tabTitleTemplate: $('kitty-tab-title-template').value } });
        saveStateToLocalStorage(state);
        renderConfig(state);
      });
    }

    if ($('kitty-raw-lines')) {
      $('kitty-raw-lines').addEventListener('input', () => {
        state = sanitizeState({ ...state, kitty: { ...state.kitty, rawLines: $('kitty-raw-lines').value } });
        saveStateToLocalStorage(state);
        renderConfig(state);
      });
    }

    const submitKittyDirective = () => {
      const btn = document.querySelector('[data-act="addKittyDirective"]');
      if (btn) btn.click();
    };

    if ($('kitty-directive-key')) {
      $('kitty-directive-key').addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitKittyDirective();
        }
      });
    }

    if ($('kitty-directive-value')) {
      $('kitty-directive-value').addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitKittyDirective();
        }
      });
    }

    const padIds = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
    for (const id of padIds) {
      $(id).addEventListener('input', () => {
        state = sanitizeState({
          ...state,
          window: {
            ...state.window,
            padding: {
              top: Number($('padding-top').value),
              right: Number($('padding-right').value),
              bottom: Number($('padding-bottom').value),
              left: Number($('padding-left').value),
            },
          },
        });
        saveStateToLocalStorage(state);
        applyPreview(state);
        renderConfig(state);
      });
    }

    $('scrollback').addEventListener('input', () => {
      state = sanitizeState({ ...state, behavior: { ...state.behavior, scrollback: Number($('scrollback').value) } });
      saveStateToLocalStorage(state);
      renderConfig(state);
    });

    $('bell').addEventListener('change', () => {
      state = sanitizeState({ ...state, behavior: { ...state.behavior, bell: $('bell').value } });
      saveStateToLocalStorage(state);
      renderConfig(state);
    });

    $('confirm-close').addEventListener('change', () => {
      state = sanitizeState({ ...state, behavior: { ...state.behavior, confirmClose: $('confirm-close').checked } });
      saveStateToLocalStorage(state);
      renderConfig(state);
    });

    // Import handlers
    $('import-file').addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      ev.target.value = '';
      if (!file) return;
      try {
        const patch = await importFromFile(file);
        state = sanitizeState(mergeDeep(deepClone(state), patch));
        state.theme = 'custom';
        $('theme-select').value = 'custom';
        saveStateToLocalStorage(state);
        applyStateToForm(state);
        renderKittyDirectives(state);
        updateSwatchesFromState(state);
        renderTerminalInfo(state);
        applyPreview(state);
        renderConfig(state);

        const desk = $('desktop-preview');
        if (desk) desk.dataset.wallpaper = state.window.wallpaper || 'aurora';
        const win = $('terminal-window');
        if (win) {
          win.dataset.floating = state.window.floating !== false ? 'true' : 'false';
          if (state.window.floating === false) {
            win.style.left = '';
            win.style.top = '';
            win.style.width = '';
            win.style.height = '';
          }
        }

        closeAllModals();
        toast('success', 'Import réussi', file.name);
      } catch (e) {
        toast('error', 'Import impossible', e.message || 'Format non supporté');
      }
    });

    const dropzone = $('import-dropzone');
    dropzone.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', async (ev) => {
      ev.preventDefault();
      dropzone.classList.remove('dragover');
      const file = ev.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        const patch = await importFromFile(file);
        state = sanitizeState(mergeDeep(deepClone(state), patch));
        state.theme = 'custom';
        $('theme-select').value = 'custom';
        saveStateToLocalStorage(state);
        applyStateToForm(state);
        renderKittyDirectives(state);
        updateSwatchesFromState(state);
        renderTerminalInfo(state);
        applyPreview(state);
        renderConfig(state);

        const desk = $('desktop-preview');
        if (desk) desk.dataset.wallpaper = state.window.wallpaper || 'aurora';
        const win = $('terminal-window');
        if (win) {
          win.dataset.floating = state.window.floating !== false ? 'true' : 'false';
          if (state.window.floating === false) {
            win.style.left = '';
            win.style.top = '';
            win.style.width = '';
            win.style.height = '';
          }
        }

        closeAllModals();
        toast('success', 'Import réussi', file.name);
      } catch (e) {
        toast('error', 'Import impossible', e.message || 'Format non supporté');
      }
    });

    // Close modals on escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeAllModals();
    });

    // Ensure click on backdrop closes modal
    for (const backdrop of document.querySelectorAll('.modal-backdrop')) {
      backdrop.addEventListener('click', () => closeAllModals());
    }

    // Terminal typing
    const input = $('terminal-input');
    const inputRow = $('terminal-input-row');
    const screen = $('terminal-screen');
    const preview = $('terminal-preview');

    const focusInput = () => {
      if (!input) return;
      input.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    };

    if (preview) preview.addEventListener('mousedown', () => focusInput());
    if (inputRow) inputRow.addEventListener('mousedown', () => focusInput());
    if (screen) screen.addEventListener('mousedown', () => focusInput());

    if (input) {
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const cmd = input.textContent || '';
          input.textContent = '';
          term.history.push(cmd);
          term.historyIndex = term.history.length;
          runCommand(cmd);
          const promptEl = $('terminal-prompt');
          if (promptEl) promptEl.textContent = formatPrompt();
          return;
        }

        if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          term.historyIndex = Math.max(0, term.historyIndex - 1);
          input.textContent = term.history[term.historyIndex] || '';
          focusInput();
          return;
        }

        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          term.historyIndex = Math.min(term.history.length, term.historyIndex + 1);
          input.textContent = term.history[term.historyIndex] || '';
          focusInput();
          return;
        }

        if (ev.key === 'Tab') {
          ev.preventDefault();
          // minimal autocomplete for ls/cd
          const cur = (input.textContent || '').trim();
          if (cur.startsWith('cd ') || cur.startsWith('cat ') || cur.startsWith('ls ')) {
            const parts = cur.split(/\s+/);
            const prefix = parts[1] || '';
            const baseDir = term.cwd;
            const node = getNode(baseDir);
            const entries = Object.keys(node?.entries || {});
            const match = entries.find((n) => n.startsWith(prefix));
            if (match) {
              parts[1] = match;
              input.textContent = parts.join(' ') + ' ';
              focusInput();
            }
          }
          return;
        }
      });

      window.setTimeout(() => focusInput(), 50);
    }

    // Draggable window
    const win = $('terminal-window');
    const bar = document.querySelector('.terminal-titlebar');
    let dragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    if (bar && win) {
      bar.addEventListener('mousedown', (ev) => {
        if (state.window.floating === false) return;
        dragging = true;
        const rect = win.getBoundingClientRect();
        dragOffsetX = ev.clientX - rect.left;
        dragOffsetY = ev.clientY - rect.top;
        ev.preventDefault();
      });

      window.addEventListener('mousemove', (ev) => {
        if (!dragging) return;
        const desk = $('desktop-preview');
        if (!desk) return;
        const drect = desk.getBoundingClientRect();
        const x = clamp(ev.clientX - drect.left - dragOffsetX, 0, drect.width - 80);
        const y = clamp(ev.clientY - drect.top - dragOffsetY, 0, drect.height - 60);
        win.style.left = `${x}px`;
        win.style.top = `${y}px`;
      });

      window.addEventListener('mouseup', () => {
        dragging = false;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
