/**
 * generate-react-fastapi.js
 * Generates React + FastAPI Docker apps for all 28 EZGalaxy packages.
 * Each app gets: backend/ (main.py, requirements.txt) + frontend/ (React) + Dockerfile + docker-compose.yml + ezcontainer.json
 * 
 * Usage: node tools/generate-react-fastapi.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'shared', 'react-fastapi-template');
const APPS_DIR = path.join(ROOT, 'packages', 'apps');

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf-8'));

// ── helpers ──────────────────────────────────────────────────────────────────
function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf-8');
}

function cleanOldFiles(appDir) {
  const toDelete = ['server.js', 'ezgalaxy-sdk.js', 'package.json', 'package-lock.json', 'node_modules'];
  for (const f of toDelete) {
    const fp = path.join(appDir, f);
    if (fs.existsSync(fp)) {
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) fs.rmSync(fp, { recursive: true });
      else fs.unlinkSync(fp);
    }
  }
}

// ── Docker compose template ─────────────────────────────────────────────────
function dockerCompose(id, port) {
  return `services:
  app:
    build: .
    container_name: ${id}
    ports:
      - "${port}:8000"
    volumes:
      - app-data:/app/data
    restart: unless-stopped

volumes:
  app-data:
`;
}

function ezcontainerJson(id, title, fn, port) {
  return JSON.stringify({
    schemaVersion: 2,
    id,
    title,
    function: fn,
    version: "1.0.0",
    createdAt: new Date().toISOString().slice(0, 10),
    author: "EZGalaxy",
    docker: {
      dockerfile: "Dockerfile",
      port: 8000,
      env: { DB_PATH: "/app/data/database.sqlite" },
      volumes: ["/app/data"],
      healthcheck: {
        endpoint: "/health",
        interval: 30,
        timeout: 10
      }
    }
  }, null, 2) + '\n';
}

// ── App CSS template (shared base) ──────────────────────────────────────────
const BASE_CSS = `* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --bg: #0a0a1a; --surface: #141428; --surface2: #1e1e3a;
  --border: #2a2a5a; --text: #e0e0ff; --text2: #8888bb;
  --accent: #6c5ce7; --accent2: #a29bfe; --success: #00d2d3;
  --warning: #feca57; --danger: #ff6b6b; --info: #54a0ff;
  --radius: 12px; --shadow: 0 4px 20px rgba(0,0,0,.4);
}
body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
.app { max-width: 1200px; margin: 0 auto; padding: 20px; }
h1, h2, h3 { color: var(--accent2); }
button {
  padding: 8px 16px; border: none; border-radius: var(--radius);
  background: var(--accent); color: #fff; cursor: pointer;
  font-size: 14px; transition: all .2s;
}
button:hover { background: var(--accent2); transform: translateY(-1px); }
button:disabled { opacity: .5; cursor: default; transform: none; }
input, textarea, select {
  padding: 10px 14px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); color: var(--text); font-size: 14px; width: 100%;
}
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--accent); }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow);
}
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding: 16px 0; border-bottom: 1px solid var(--border); }
.header h1 { font-size: 24px; }
.grid { display: grid; gap: 16px; }
.flex { display: flex; gap: 12px; align-items: center; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border); margin-bottom: 20px; }
.tab { padding: 10px 20px; cursor: pointer; border: none; background: none; color: var(--text2); font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: var(--accent2); border-bottom-color: var(--accent); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; min-width: 400px; max-width: 90vw; max-height: 90vh; overflow: auto; }
@media (max-width: 768px) { .app { padding: 12px; } .modal { min-width: auto; width: 95vw; } }
`;

// ── React App components per app ────────────────────────────────────────────────
const APPS = {};

APPS['com.ezgalaxy.example'] = () => `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <div className="header"><h1>🚀 EZGalaxy Example</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Page de démonstration</h2>
        <p style={{margin:'20px 0',color:'var(--text2)'}}>Cette application est un exemple de page EZGalaxy containerisée avec React + FastAPI.</p>
        <p style={{fontSize:'48px',margin:'20px 0'}}>{count}</p>
        <button onClick={() => setCount(c => c + 1)}>Incrémenter</button>
      </div>
    </div>
  );
}`;

APPS['test'] = () => `import { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => { fetch('/health').then(r => r.json()).then(setHealth); }, []);
  return (
    <div className="app">
      <div className="header"><h1>🧪 Test App</h1></div>
      <div className="card">
        <h2>Status</h2>
        <pre style={{marginTop:12, color:'var(--success)'}}>{JSON.stringify(health, null, 2)}</pre>
      </div>
    </div>
  );
}`;

APPS['code-game'] = () => `import { useState, useCallback } from 'react';

const CHALLENGES = [
  { q: "Quel mot-clé déclare une variable en JavaScript?", opts: ["var", "int", "dim", "string"], answer: 0 },
  { q: "Quel symbole commence un commentaire en Python?", opts: ["//", "#", "/*", "--"], answer: 1 },
  { q: "Quelle balise HTML crée un lien?", opts: ["<link>", "<href>", "<a>", "<url>"], answer: 2 },
  { q: "Quel langage est typé statiquement?", opts: ["Python", "JavaScript", "Ruby", "Java"], answer: 3 },
  { q: "Que signifie CSS?", opts: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Coded Style Sheets"], answer: 1 },
  { q: "Quel opérateur vérifie l'égalité stricte en JS?", opts: ["==", "===", "!=", "=>"], answer: 1 },
  { q: "Quelle structure répète du code?", opts: ["if", "switch", "for", "try"], answer: 2 },
  { q: "Quel type de donnée est 'true'?", opts: ["String", "Number", "Boolean", "Object"], answer: 2 },
];

export default function App() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState('');

  const answer = useCallback((i) => {
    const correct = i === CHALLENGES[idx].answer;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : '❌ Mauvaise réponse');
    setTimeout(() => {
      setFeedback('');
      if (idx + 1 < CHALLENGES.length) setIdx(idx + 1);
      else setDone(true);
    }, 1000);
  }, [idx]);

  if (done) return (
    <div className="app">
      <div className="header"><h1>🎮 Code Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Partie terminée !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{CHALLENGES.length}</p>
        <button onClick={() => { setIdx(0); setScore(0); setDone(false); }}>Rejouer</button>
      </div>
    </div>
  );

  const c = CHALLENGES[idx];
  return (
    <div className="app">
      <div className="header"><h1>🎮 Code Game</h1><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span></div>
      <div className="card">
        <p style={{color:'var(--text2)',marginBottom:8}}>Question {idx+1}/{CHALLENGES.length}</p>
        <h2 style={{marginBottom:20}}>{c.q}</h2>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          {c.opts.map((o, i) => <button key={i} onClick={() => answer(i)} style={{padding:16}}>{o}</button>)}
        </div>
        {feedback && <p style={{textAlign:'center',marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}`;

APPS['kappy-studio'] = () => `import { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#6c5ce7');

  return (
    <div className="app">
      <div className="header"><h1>🎨 Kappy Studio</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Paramètres</h3>
        <div className="flex" style={{flexWrap:'wrap'}}>
          <label>Taille: <input type="range" min="10" max="72" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{width:150}} /></label>
          <label>Couleur: <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width:50,height:36}} /></label>
        </div>
      </div>
      <div className="card">
        <textarea rows={6} placeholder="Écrivez votre texte ici..." value={text} onChange={e => setText(e.target.value)} style={{marginBottom:16}} />
        <div style={{padding:24,background:'var(--bg)',borderRadius:'var(--radius)',fontSize,color,minHeight:100,whiteSpace:'pre-wrap'}}>
          {text || 'Aperçu...'}
        </div>
      </div>
    </div>
  );
}`;

APPS['world-capitals'] = () => `import { useState, useCallback } from 'react';

const DATA = [
  ["France","Paris"],["Allemagne","Berlin"],["Espagne","Madrid"],["Italie","Rome"],
  ["Portugal","Lisbonne"],["Royaume-Uni","Londres"],["Japon","Tokyo"],["Chine","Pékin"],
  ["Brésil","Brasília"],["Canada","Ottawa"],["Australie","Canberra"],["Inde","New Delhi"],
  ["Russie","Moscou"],["Mexique","Mexico"],["Argentine","Buenos Aires"],["Égypte","Le Caire"],
  ["Maroc","Rabat"],["Turquie","Ankara"],["Corée du Sud","Séoul"],["Thaïlande","Bangkok"],
];

function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export default function App() {
  const [questions] = useState(() => shuffle(DATA).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);

  const check = useCallback(() => {
    const correct = input.trim().toLowerCase() === questions[idx][1].toLowerCase();
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : \`❌ C'était \${questions[idx][1]}\`);
    setTimeout(() => {
      setFeedback(''); setInput('');
      if (idx + 1 < questions.length) setIdx(idx + 1);
      else setDone(true);
    }, 1500);
  }, [idx, input, questions]);

  if (done) return (
    <div className="app">
      <div className="header"><h1>🌍 Capitales du Monde</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Score final : {score}/{questions.length}</h2>
        <button onClick={() => window.location.reload()} style={{marginTop:16}}>Rejouer</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="header"><h1>🌍 Capitales du Monde</h1><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span></div>
      <div className="card" style={{textAlign:'center'}}>
        <p style={{color:'var(--text2)'}}>Question {idx+1}/{questions.length}</p>
        <h2 style={{margin:'20px 0'}}>Quelle est la capitale de {questions[idx][0]} ?</h2>
        <div className="flex" style={{justifyContent:'center'}}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && check()} placeholder="Votre réponse..." style={{maxWidth:300}} />
          <button onClick={check}>Valider</button>
        </div>
        {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}`;

APPS['network-sim'] = () => `import { useState, useRef, useEffect, useCallback } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([
    { id: 1, x: 200, y: 150, label: 'Router', type: 'router' },
    { id: 2, x: 400, y: 100, label: 'Server', type: 'server' },
    { id: 3, x: 400, y: 250, label: 'PC-1', type: 'pc' },
    { id: 4, x: 600, y: 150, label: 'PC-2', type: 'pc' },
  ]);
  const [links, setLinks] = useState([{from:1,to:2},{from:1,to:3},{from:2,to:4}]);
  const [dragging, setDragging] = useState(null);
  const [tool, setTool] = useState('move');
  const nextId = useRef(5);

  const colors = { router: '#6c5ce7', server: '#00d2d3', pc: '#feca57' };

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = c.parentElement.clientWidth; c.height = 400;
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, c.width, c.height);
    // links
    ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 2;
    links.forEach(l => {
      const a = nodes.find(n => n.id === l.from), b = nodes.find(n => n.id === l.to);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    });
    // nodes
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = colors[n.type] || '#6c5ce7'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 40);
    });
  }, [nodes, links]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (tool === 'move') {
      const n = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 28);
      if (n) setDragging(n.id);
    } else if (tool === 'add') {
      setNodes(ns => [...ns, { id: nextId.current++, x, y, label: 'Node-' + nextId.current, type: 'pc' }]);
    }
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setNodes(ns => ns.map(n => n.id === dragging ? { ...n, x: e.clientX - rect.left, y: e.clientY - rect.top } : n));
  };
  const onMouseUp = () => setDragging(null);

  return (
    <div className="app">
      <div className="header"><h1>🌐 Network Simulator</h1></div>
      <div className="flex" style={{marginBottom:16}}>
        <button onClick={() => setTool('move')} style={{background: tool==='move'?'var(--accent)':'var(--surface2)'}}>🖱 Déplacer</button>
        <button onClick={() => setTool('add')} style={{background: tool==='add'?'var(--accent)':'var(--surface2)'}}>➕ Ajouter</button>
        <button onClick={() => { setNodes(ns => ns.slice(0, -1)); }}>🗑 Supprimer dernier</button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{display:'block',width:'100%',cursor: tool==='add'?'crosshair':'grab'}} />
      </div>
      <div className="flex" style={{marginTop:12,flexWrap:'wrap'}}>
        {Object.entries(colors).map(([k,v]) => <span key={k} className="badge" style={{background:v,color:'#000'}}>{k}</span>)}
        <span style={{color:'var(--text2)',fontSize:12}}>{nodes.length} nœuds, {links.length} liens</span>
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.budget'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ label: '', amount: '', type: 'expense', category: 'Autre' });
  const [loading, setLoading] = useState(true);
  const categories = ['Alimentation','Logement','Transport','Loisirs','Santé','Shopping','Autre'];

  const load = useCallback(async () => {
    try {
      const res = await storage.list('transactions', { limit: 200, sort_by: 'updated_at', sort_order: 'desc' });
      setTransactions((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.label || !form.amount) return;
    const key = 'tx-' + Date.now();
    const data = { ...form, amount: parseFloat(form.amount), date: new Date().toISOString() };
    await storage.set('transactions', key, data);
    setForm({ label: '', amount: '', type: 'expense', category: 'Autre' });
    load();
  };

  const remove = async (key) => { await storage.delete('transactions', key); load(); };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expenses;

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>💰 Budget Graphique</h1></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:24}}>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Revenus</p><h2 style={{color:'var(--success)'}}>{income.toFixed(2)} €</h2></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Dépenses</p><h2 style={{color:'var(--danger)'}}>{expenses.toFixed(2)} €</h2></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Solde</p><h2 style={{color: balance >= 0 ? 'var(--success)' : 'var(--danger)'}}>{balance.toFixed(2)} €</h2></div>
      </div>
      <div className="card" style={{marginBottom:24}}>
        <h3 style={{marginBottom:12}}>Nouvelle transaction</h3>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr auto',alignItems:'end'}}>
          <input placeholder="Libellé" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          <input type="number" placeholder="Montant" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="expense">Dépense</option><option value="income">Revenu</option></select>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <button onClick={add}>Ajouter</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:12}}>Transactions</h3>
        {transactions.length === 0 ? <p style={{color:'var(--text2)'}}>Aucune transaction</p> :
          transactions.map(t => (
            <div key={t.key} className="flex" style={{padding:'10px 0',borderBottom:'1px solid var(--border)',justifyContent:'space-between'}}>
              <div>
                <strong>{t.label}</strong>
                <span className="badge" style={{background:'var(--surface2)',marginLeft:8}}>{t.category}</span>
              </div>
              <div className="flex">
                <span style={{color: t.type==='income'?'var(--success)':'var(--danger)',fontWeight:700}}>{t.type==='income'?'+':'-'}{(t.amount||0).toFixed(2)} €</span>
                <button onClick={() => remove(t.key)} style={{background:'var(--danger)',padding:'4px 10px'}}>🗑</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.osint'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [tab, setTab] = useState('search');
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    const res = await storage.list('searches', { limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
    setSavedSearches((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const sources = [
    { name: 'Google', url: q => \`https://www.google.com/search?q=\${encodeURIComponent(q)}\` },
    { name: 'DuckDuckGo', url: q => \`https://duckduckgo.com/?q=\${encodeURIComponent(q)}\` },
    { name: 'Shodan', url: q => \`https://www.shodan.io/search?query=\${encodeURIComponent(q)}\` },
    { name: 'VirusTotal', url: q => \`https://www.virustotal.com/gui/search/\${encodeURIComponent(q)}\` },
    { name: 'Archive.org', url: q => \`https://web.archive.org/web/*/\${encodeURIComponent(q)}\` },
    { name: 'Whois', url: q => \`https://who.is/whois/\${encodeURIComponent(q)}\` },
    { name: 'DNSDumpster', url: q => \`https://dnsdumpster.com/?q=\${encodeURIComponent(q)}\` },
    { name: 'crt.sh', url: q => \`https://crt.sh/?q=%25\${encodeURIComponent(q)}%25\` },
  ];

  const search = () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(sources.map(s => ({ name: s.name, url: s.url(query) })));
    setLoading(false);
  };

  const save = async () => {
    if (!query.trim()) return;
    const key = 'search-' + Date.now();
    await storage.set('searches', key, { query, date: new Date().toISOString(), results });
    loadSaved();
  };

  const deleteSaved = async (key) => { await storage.delete('searches', key); loadSaved(); };

  return (
    <div className="app">
      <div className="header"><h1>🔍 OSINT Suite</h1></div>
      <div className="tabs">
        <button className={\`tab \${tab==='search'?'active':''}\`} onClick={() => setTab('search')}>Recherche</button>
        <button className={\`tab \${tab==='saved'?'active':''}\`} onClick={() => setTab('saved')}>Sauvegardes ({savedSearches.length})</button>
      </div>
      {tab === 'search' ? (<>
        <div className="card" style={{marginBottom:16}}>
          <div className="flex">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && search()} placeholder="Domaine, IP, email, nom d'utilisateur..." />
            <button onClick={search} disabled={loading}>🔍 Rechercher</button>
            <button onClick={save} style={{background:'var(--success)'}}>💾 Sauver</button>
          </div>
        </div>
        {results.length > 0 && (
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))'}}>
            {results.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="card" style={{textDecoration:'none',color:'var(--text)'}}>
                <h3 style={{color:'var(--accent2)'}}>{r.name}</h3>
                <p style={{color:'var(--text2)',fontSize:12,marginTop:8,wordBreak:'break-all'}}>{r.url.slice(0, 80)}...</p>
              </a>
            ))}
          </div>
        )}
      </>) : (
        <div className="grid">
          {savedSearches.length === 0 ? <p style={{color:'var(--text2)'}}>Aucune recherche sauvegardée</p> :
            savedSearches.map(s => (
              <div key={s.key} className="card flex" style={{justifyContent:'space-between'}}>
                <div>
                  <strong>{s.query}</strong>
                  <p style={{color:'var(--text2)',fontSize:12}}>{new Date(s.date).toLocaleString()}</p>
                </div>
                <div className="flex">
                  <button onClick={() => { setQuery(s.query); setTab('search'); search(); }}>🔍</button>
                  <button onClick={() => deleteSaved(s.key)} style={{background:'var(--danger)'}}>🗑</button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.sopor'] = () => `import { useState, useRef, useEffect, useCallback } from 'react';

const TILES = { grass: '#2d5a27', water: '#1a4a7a', sand: '#c4a35a', stone: '#5a5a6a', path: '#7a6a4a' };
const NPCS = [
  { id: 1, x: 5, y: 3, name: 'Gardien Lyos', dialog: 'Bienvenue, Rêveur. Le monde se fragmente... Retrouve les Piliers.' },
  { id: 2, x: 12, y: 8, name: 'Marchande Nyx', dialog: 'J\\'ai des potions. 10 Essences chacune.' },
  { id: 3, x: 8, y: 14, name: 'Sage Mira', dialog: 'Trois Piliers maintiennent la réalité. Un est tombé au nord.' },
];

export default function App() {
  const canvasRef = useRef(null);
  const [player, setPlayer] = useState({ x: 10, y: 10, hp: 100, maxHp: 100, essence: 50, level: 1, xp: 0 });
  const [dialog, setDialog] = useState('');
  const [log, setLog] = useState(['Bienvenue dans Sopor. Utilisez ZQSD ou les flèches pour vous déplacer.']);
  const mapW = 20, mapH = 18, tileSize = 28;

  const mapRef = useRef(null);
  if (!mapRef.current) {
    const m = [];
    for (let y = 0; y < mapH; y++) {
      const row = [];
      for (let x = 0; x < mapW; x++) {
        if (y === 0 || y === mapH-1 || x === 0 || x === mapW-1) row.push('water');
        else if (Math.random() < 0.05) row.push('sand');
        else if (Math.random() < 0.08) row.push('stone');
        else row.push('grass');
      }
      m.push(row);
    }
    m[10][10] = 'path';
    mapRef.current = m;
  }

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = mapW * tileSize; c.height = mapH * tileSize;
    const map = mapRef.current;
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      ctx.fillStyle = TILES[map[y][x]] || '#333';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
    NPCS.forEach(n => {
      ctx.fillStyle = '#ff6b6b'; ctx.beginPath();
      ctx.arc(n.x * tileSize + tileSize/2, n.y * tileSize + tileSize/2, tileSize/3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.name.split(' ')[0], n.x * tileSize + tileSize/2, n.y * tileSize - 4);
    });
    ctx.fillStyle = '#6c5ce7'; ctx.beginPath();
    ctx.arc(player.x * tileSize + tileSize/2, player.y * tileSize + tileSize/2, tileSize/3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('P', player.x * tileSize + tileSize/2, player.y * tileSize + tileSize/2 + 4);
  }, [player]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const handle = (e) => {
      let dx = 0, dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'z') dy = -1;
      else if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
      else if (e.key === 'ArrowLeft' || e.key === 'q') dx = -1;
      else if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;
      else return;
      e.preventDefault();
      setPlayer(p => {
        const nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || nx >= mapW || ny < 0 || ny >= mapH) return p;
        if (mapRef.current[ny][nx] === 'water') return p;
        const npc = NPCS.find(n => n.x === nx && n.y === ny);
        if (npc) { setDialog(npc.name + ': ' + npc.dialog); return p; }
        const newXp = p.xp + 1;
        const levelUp = newXp >= p.level * 20;
        if (levelUp) setLog(l => [...l, \`Niveau \${p.level + 1} atteint !\`]);
        return { ...p, x: nx, y: ny, xp: levelUp ? 0 : newXp, level: levelUp ? p.level + 1 : p.level };
      });
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  return (
    <div className="app">
      <div className="header"><h1>🌙 Sopor</h1></div>
      <div className="flex" style={{marginBottom:12,flexWrap:'wrap'}}>
        <span className="badge" style={{background:'var(--danger)'}}>❤️ {player.hp}/{player.maxHp}</span>
        <span className="badge" style={{background:'var(--accent)'}}>✨ {player.essence} Essences</span>
        <span className="badge" style={{background:'var(--success)'}}>Nv.{player.level} (XP: {player.xp})</span>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden',display:'inline-block'}}>
        <canvas ref={canvasRef} style={{display:'block'}} />
      </div>
      {dialog && (
        <div className="card" style={{marginTop:12,borderColor:'var(--accent)'}}>
          <p>{dialog}</p>
          <button onClick={() => setDialog('')} style={{marginTop:8}}>Fermer</button>
        </div>
      )}
      <div className="card" style={{marginTop:12,maxHeight:120,overflow:'auto'}}>
        {log.slice(-5).map((l, i) => <p key={i} style={{color:'var(--text2)',fontSize:12}}>{l}</p>)}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.terminal'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const PRESETS = {
  'Dracula': { bg:'#282a36', fg:'#f8f8f2', c0:'#21222c', c1:'#ff5555', c2:'#50fa7b', c3:'#f1fa8c', c4:'#bd93f9', c5:'#ff79c6', c6:'#8be9fd', c7:'#f8f8f2' },
  'Nord': { bg:'#2e3440', fg:'#d8dee9', c0:'#3b4252', c1:'#bf616a', c2:'#a3be8c', c3:'#ebcb8b', c4:'#81a1c1', c5:'#b48ead', c6:'#88c0d0', c7:'#e5e9f0' },
  'Gruvbox': { bg:'#282828', fg:'#ebdbb2', c0:'#282828', c1:'#cc241d', c2:'#98971a', c3:'#d79921', c4:'#458588', c5:'#b16286', c6:'#689d6a', c7:'#a89984' },
  'Solarized': { bg:'#002b36', fg:'#839496', c0:'#073642', c1:'#dc322f', c2:'#859900', c3:'#b58900', c4:'#268bd2', c5:'#d33682', c6:'#2aa198', c7:'#eee8d5' },
};

export default function App() {
  const [colors, setColors] = useState(PRESETS['Dracula']);
  const [name, setName] = useState('Mon Thème');
  const [format, setFormat] = useState('kitty');
  const [saved, setSaved] = useState([]);

  const load = useCallback(async () => {
    const res = await storage.list('themes', { limit: 50 });
    setSaved((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    await storage.set('themes', 'theme-' + Date.now(), { name, colors, format });
    load();
  };

  const exportTheme = () => {
    let out = '';
    const c = colors;
    if (format === 'kitty') { out = \`background \${c.bg}\\nforeground \${c.fg}\\ncolor0 \${c.c0}\\ncolor1 \${c.c1}\\ncolor2 \${c.c2}\\ncolor3 \${c.c3}\\ncolor4 \${c.c4}\\ncolor5 \${c.c5}\\ncolor6 \${c.c6}\\ncolor7 \${c.c7}\`; }
    else if (format === 'alacritty') { out = \`[colors.primary]\\nbackground = "\${c.bg}"\\nforeground = "\${c.fg}"\\n[colors.normal]\\nblack = "\${c.c0}"\\nred = "\${c.c1}"\\ngreen = "\${c.c2}"\\nyellow = "\${c.c3}"\\nblue = "\${c.c4}"\\nmagenta = "\${c.c5}"\\ncyan = "\${c.c6}"\\nwhite = "\${c.c7}"\`; }
    else { out = JSON.stringify({ name, colors: c }, null, 2); }
    navigator.clipboard?.writeText(out);
    alert('Copié !');
  };

  return (
    <div className="app">
      <div className="header"><h1>🖥 Terminal Customizer</h1></div>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="card">
          <h3 style={{marginBottom:12}}>Couleurs</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du thème" style={{marginBottom:12}} />
          {Object.entries(colors).map(([k, v]) => (
            <div key={k} className="flex" style={{marginBottom:8}}>
              <label style={{width:30,color:'var(--text2)'}}>{k}</label>
              <input type="color" value={v} onChange={e => setColors({...colors, [k]: e.target.value})} style={{width:50,height:32}} />
              <input value={v} onChange={e => setColors({...colors, [k]: e.target.value})} style={{width:100}} />
            </div>
          ))}
          <div className="flex" style={{marginTop:12,flexWrap:'wrap'}}>
            {Object.keys(PRESETS).map(p => <button key={p} onClick={() => setColors(PRESETS[p])} style={{background:'var(--surface2)',fontSize:12}}>{p}</button>)}
          </div>
        </div>
        <div>
          <div className="card" style={{marginBottom:16}}>
            <h3 style={{marginBottom:12}}>Aperçu</h3>
            <div style={{background: colors.bg, color: colors.fg, padding: 16, borderRadius: 'var(--radius)', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6}}>
              <div><span style={{color: colors.c2}}>user@host</span>:<span style={{color: colors.c4}}>~</span>$ echo "Hello"</div>
              <div style={{color: colors.fg}}>Hello</div>
              <div><span style={{color: colors.c1}}>ERROR:</span> file not found</div>
              <div><span style={{color: colors.c3}}>WARNING:</span> deprecated</div>
              <div style={{color: colors.c5}}>→ 42 files processed</div>
              <div style={{color: colors.c6}}>✓ Build complete</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{marginBottom:12}}>Export</h3>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{marginBottom:12}}>
              <option value="kitty">Kitty</option>
              <option value="alacritty">Alacritty (TOML)</option>
              <option value="json">JSON</option>
            </select>
            <div className="flex">
              <button onClick={exportTheme}>📋 Copier</button>
              <button onClick={save} style={{background:'var(--success)'}}>💾 Sauvegarder</button>
            </div>
          </div>
        </div>
      </div>
      {saved.length > 0 && <div className="card" style={{marginTop:16}}>
        <h3>Thèmes sauvegardés</h3>
        {saved.map(s => <div key={s.key} className="flex" style={{marginTop:8,justifyContent:'space-between'}}>
          <span>{s.name}</span>
          <button onClick={() => { setColors(s.colors); setName(s.name); }} style={{fontSize:12}}>Charger</button>
        </div>)}
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.flaggame'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage, appStorage } from './api.js';

const FLAGS = [
  ['🇫🇷','France'],['🇩🇪','Allemagne'],['🇮🇹','Italie'],['🇪🇸','Espagne'],['🇬🇧','Royaume-Uni'],
  ['🇯🇵','Japon'],['🇧🇷','Brésil'],['🇨🇦','Canada'],['🇦🇺','Australie'],['🇮🇳','Inde'],
  ['🇷🇺','Russie'],['🇲🇽','Mexique'],['🇰🇷','Corée du Sud'],['🇹🇷','Turquie'],['🇪🇬','Égypte'],
  ['🇲🇦','Maroc'],['🇹🇭','Thaïlande'],['🇵🇹','Portugal'],['🇳🇱','Pays-Bas'],['🇸🇪','Suède'],
  ['🇳🇴','Norvège'],['🇩🇰','Danemark'],['🇫🇮','Finlande'],['🇵🇱','Pologne'],['🇬🇷','Grèce'],
  ['🇨🇭','Suisse'],['🇧🇪','Belgique'],['🇦🇷','Argentine'],['🇨🇴','Colombie'],['🇨🇱','Chili'],
];

function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }

export default function App() {
  const [mode, setMode] = useState(null); // 'easy','normal','hard'
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);
  const [input, setInput] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [username, setUsername] = useState('');

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await appStorage.list('leaderboard', { limit: 20, sort_by: 'updated_at', sort_order: 'desc' });
      const items = (res.items || []).map(i => i.data).sort((a,b) => (b.score||0) - (a.score||0));
      setLeaderboard(items);
    } catch(e) {}
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const start = (m) => {
    setMode(m); setScore(0); setLives(3); setIdx(0); setDone(false); setFeedback('');
    const count = m === 'easy' ? 10 : m === 'normal' ? 15 : 20;
    const qs = shuffle(FLAGS).slice(0, count).map(([flag, country]) => {
      const wrongs = shuffle(FLAGS.filter(f => f[1] !== country)).slice(0, 3).map(f => f[1]);
      const opts = shuffle([country, ...wrongs]);
      return { flag, country, opts };
    });
    setQuestions(qs);
  };

  const answer = (ans) => {
    const correct = ans === questions[idx].country;
    if (correct) { setScore(s => s + 1); setFeedback('✅ Correct !'); }
    else { setLives(l => l - 1); setFeedback(\`❌ C'était \${questions[idx].country}\`); }
    setTimeout(() => {
      setFeedback('');
      if (!correct && lives <= 1) { setDone(true); return; }
      if (idx + 1 >= questions.length) { setDone(true); return; }
      setIdx(i => i + 1);
    }, 1000);
  };

  const submitScore = async () => {
    if (!username.trim()) return;
    await appStorage.set('leaderboard', 'score-' + Date.now(), { name: username, score, mode, date: new Date().toISOString() });
    loadLeaderboard();
  };

  if (!mode) return (
    <div className="app">
      <div className="header"><h1>🏁 Flag Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2 style={{marginBottom:20}}>Choisis un mode</h2>
        <div className="flex" style={{justifyContent:'center'}}>
          <button onClick={() => start('easy')} style={{background:'var(--success)'}}>Facile (10)</button>
          <button onClick={() => start('normal')} style={{background:'var(--warning)',color:'#000'}}>Normal (15)</button>
          <button onClick={() => start('hard')} style={{background:'var(--danger)'}}>Difficile (20)</button>
        </div>
      </div>
      {leaderboard.length > 0 && <div className="card" style={{marginTop:16}}>
        <h3>🏆 Classement</h3>
        {leaderboard.slice(0,10).map((l,i) => <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
          <span>{i+1}. {l.name}</span><span style={{color:'var(--accent2)'}}>{l.score} pts ({l.mode})</span>
        </div>)}
      </div>}
    </div>
  );

  if (done) return (
    <div className="app">
      <div className="header"><h1>🏁 Flag Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Partie terminée !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{questions.length}</p>
        <div className="flex" style={{justifyContent:'center',marginBottom:16}}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ton pseudo" style={{maxWidth:200}} />
          <button onClick={submitScore} style={{background:'var(--success)'}}>Envoyer score</button>
        </div>
        <button onClick={() => setMode(null)}>Retour</button>
      </div>
    </div>
  );

  const q = questions[idx];
  return (
    <div className="app">
      <div className="header">
        <h1>🏁 Flag Game</h1>
        <div className="flex"><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span><span className="badge" style={{background:'var(--danger)'}}>{'❤️'.repeat(lives)}</span></div>
      </div>
      <div className="card" style={{textAlign:'center'}}>
        <p style={{color:'var(--text2)'}}>Question {idx+1}/{questions.length} • {mode}</p>
        <p style={{fontSize:96,margin:'20px 0'}}>{q.flag}</p>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr',maxWidth:500,margin:'0 auto'}}>
          {q.opts.map((o, i) => <button key={i} onClick={() => answer(o)} style={{padding:16}}>{o}</button>)}
        </div>
        {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.projecthub'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const STATUS = ['todo','in-progress','review','done'];
const COLORS = { todo: 'var(--text2)', 'in-progress': 'var(--info)', review: 'var(--warning)', done: 'var(--success)' };

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('kanban');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', desc: '', status: 'todo', priority: 'medium', assignee: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await storage.list('tasks', { limit: 200 });
    setTasks((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const key = modal?.key || 'task-' + Date.now();
    await storage.set('tasks', key, { ...form, updated: new Date().toISOString() });
    setModal(null); setForm({ title: '', desc: '', status: 'todo', priority: 'medium', assignee: '' }); load();
  };
  const remove = async (key) => { await storage.delete('tasks', key); load(); };
  const moveTask = async (task, newStatus) => {
    await storage.set('tasks', task.key, { ...task, status: newStatus, updated: new Date().toISOString() });
    load();
  };

  const priorities = { high: '🔴', medium: '🟡', low: '🟢' };
  const stats = { total: tasks.length, done: tasks.filter(t => t.status==='done').length };

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header">
        <h1>📊 Project Hub</h1>
        <button onClick={() => { setForm({ title: '', desc: '', status: 'todo', priority: 'medium', assignee: '' }); setModal({}); }}>+ Nouvelle tâche</button>
      </div>
      <div className="flex" style={{marginBottom:16}}>
        <span className="badge" style={{background:'var(--surface2)'}}>{stats.total} tâches</span>
        <span className="badge" style={{background:'var(--success)'}}>{stats.done} terminées</span>
        <span className="badge" style={{background:'var(--accent)'}}>{stats.total > 0 ? Math.round(stats.done / stats.total * 100) : 0}%</span>
      </div>
      <div className="tabs">
        {['kanban','list'].map(t => <button key={t} className={\`tab \${tab===t?'active':''}\`} onClick={() => setTab(t)}>{t === 'kanban' ? 'Kanban' : 'Liste'}</button>)}
      </div>
      {tab === 'kanban' ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {STATUS.map(s => (
            <div key={s}>
              <h3 style={{color:COLORS[s],marginBottom:12,textTransform:'capitalize'}}>{s} ({tasks.filter(t=>t.status===s).length})</h3>
              {tasks.filter(t => t.status === s).map(t => (
                <div key={t.key} className="card" style={{marginBottom:8,cursor:'pointer'}} onClick={() => { setForm(t); setModal(t); }}>
                  <div className="flex" style={{justifyContent:'space-between'}}>
                    <strong>{priorities[t.priority]||''} {t.title}</strong>
                    <button onClick={e => { e.stopPropagation(); remove(t.key); }} style={{background:'var(--danger)',padding:'2px 8px',fontSize:12}}>×</button>
                  </div>
                  {t.assignee && <p style={{color:'var(--text2)',fontSize:12,marginTop:4}}>👤 {t.assignee}</p>}
                  <div className="flex" style={{marginTop:8,gap:4}}>
                    {STATUS.filter(ns => ns !== s).map(ns => <button key={ns} onClick={e => { e.stopPropagation(); moveTask(t, ns); }} style={{fontSize:10,padding:'2px 6px',background:'var(--surface2)'}}>{ns}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          {tasks.map(t => (
            <div key={t.key} className="flex" style={{padding:'10px 0',borderBottom:'1px solid var(--border)',justifyContent:'space-between'}}>
              <div><span>{priorities[t.priority]||''}</span> <strong>{t.title}</strong> <span className="badge" style={{background:COLORS[t.status],marginLeft:8}}>{t.status}</span></div>
              <div className="flex">
                <button onClick={() => { setForm(t); setModal(t); }} style={{fontSize:12,background:'var(--surface2)'}}>✏️</button>
                <button onClick={() => remove(t.key)} style={{fontSize:12,background:'var(--danger)'}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{marginBottom:16}}>{modal.key ? 'Modifier' : 'Nouvelle tâche'}</h2>
            <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Titre" style={{marginBottom:12}} />
            <textarea value={form.desc||''} onChange={e => setForm({...form,desc:e.target.value})} placeholder="Description" rows={3} style={{marginBottom:12}} />
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr',marginBottom:16}}>
              <select value={form.status} onChange={e => setForm({...form,status:e.target.value})}>{STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <select value={form.priority} onChange={e => setForm({...form,priority:e.target.value})}><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select>
              <input value={form.assignee||''} onChange={e => setForm({...form,assignee:e.target.value})} placeholder="Assignée à" />
            </div>
            <div className="flex" style={{justifyContent:'flex-end'}}>
              <button onClick={() => setModal(null)} style={{background:'var(--surface2)'}}>Annuler</button>
              <button onClick={save}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.pentest-lab'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const FLAGS_DATA = [
  { id: 1, level: 'facile', hint: 'Regarde le code source de la page...', name: 'Flag Source' },
  { id: 2, level: 'facile', hint: "Un cookie pourrait contenir quelque chose d'intéressant.", name: 'Flag Cookie' },
  { id: 3, level: 'facile', hint: "Les commentaires HTML cachent parfois des secrets.", name: 'Flag Commentaire' },
  { id: 4, level: 'moyen', hint: "L'URL peut être manipulée... essaie des paramètres inattendus.", name: 'Flag URL' },
  { id: 5, level: 'moyen', hint: "Les en-têtes HTTP ont des informations cachées.", name: 'Flag Header' },
  { id: 6, level: 'moyen', hint: "Un fichier robots.txt existe peut-être.", name: 'Flag Robots' },
  { id: 7, level: 'difficile', hint: "L'API a peut-être des endpoints non documentés.", name: 'Flag API' },
  { id: 8, level: 'difficile', hint: 'Le JavaScript contient des variables encodées.', name: 'Flag JS' },
  { id: 9, level: 'difficile', hint: "Combine plusieurs techniques pour trouver ce flag.", name: 'Flag Ultime' },
];

export default function App() {
  const [found, setFound] = useState([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [tab, setTab] = useState('challenge');

  const load = useCallback(async () => {
    try {
      const res = await storage.getData('found-flags');
      if (res && Array.isArray(res)) setFound(res);
    } catch(e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const flagNum = parseInt(input.replace(/[^0-9]/g, ''));
    const flag = FLAGS_DATA.find(f => f.id === flagNum);
    if (flag && !found.includes(flag.id)) {
      const newFound = [...found, flag.id];
      setFound(newFound);
      await storage.setData('found-flags', newFound);
      setFeedback(\`✅ \${flag.name} trouvé ! (\${newFound.length}/\${FLAGS_DATA.length})\`);
    } else if (found.includes(flagNum)) {
      setFeedback('⚠️ Flag déjà trouvé !');
    } else {
      setFeedback('❌ Flag invalide');
    }
    setInput('');
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="app">
      <div className="header"><h1>🔓 EzPentest Lab</h1><span className="badge" style={{background:'var(--accent)'}}>{found.length}/{FLAGS_DATA.length} flags</span></div>
      <div className="tabs">
        <button className={\`tab \${tab==='challenge'?'active':''}\`} onClick={() => setTab('challenge')}>Challenge</button>
        <button className={\`tab \${tab==='hints'?'active':''}\`} onClick={() => setTab('hints')}>Indices</button>
      </div>
      {tab === 'challenge' ? (<>
        <div className="card" style={{marginBottom:16}}>
          <h3 style={{marginBottom:12}}>Soumettre un flag</h3>
          <div className="flex">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()} placeholder="Entrez le flag trouvé (ex: flag{1})" />
            <button onClick={submit}>Valider</button>
          </div>
          {feedback && <p style={{marginTop:12}}>{feedback}</p>}
        </div>
        <div className="card">
          <h3>Progression</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
            {FLAGS_DATA.map(f => (
              <div key={f.id} className="badge" style={{background: found.includes(f.id) ? 'var(--success)' : 'var(--surface2)', padding:'8px 12px'}}>
                {found.includes(f.id) ? '🏁' : '🔒'} Flag {f.id}
                <span style={{fontSize:10,display:'block',color: found.includes(f.id) ? '#fff' : 'var(--text2)'}}>{f.level}</span>
              </div>
            ))}
          </div>
        </div>
      </>) : (
        <div className="grid">
          {FLAGS_DATA.map(f => (
            <div key={f.id} className="card">
              <div className="flex" style={{justifyContent:'space-between'}}>
                <strong>{f.name}</strong>
                <span className="badge" style={{background: f.level==='facile'?'var(--success)':f.level==='moyen'?'var(--warning)':'var(--danger)'}}>{f.level}</span>
              </div>
              <p style={{color:'var(--text2)',marginTop:8}}>{f.hint}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.finvest'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [tab, setTab] = useState('profil');
  const [profile, setProfile] = useState({ age: 30, income: 3000, savings: 10000, riskTolerance: 'moderate', goals: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await storage.getData('profile');
      if (res) setProfile(res);
    } catch(e) {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    await storage.setData('profile', profile);
    alert('Profil sauvegardé !');
  };

  const riskScore = profile.riskTolerance === 'aggressive' ? 85 : profile.riskTolerance === 'moderate' ? 55 : 25;
  const healthScore = Math.min(100, Math.round((profile.savings / (profile.income * 6)) * 100));
  const allocation = profile.riskTolerance === 'aggressive'
    ? { actions: 70, obligations: 15, crypto: 10, cash: 5 }
    : profile.riskTolerance === 'moderate'
    ? { actions: 50, obligations: 30, crypto: 5, cash: 15 }
    : { actions: 20, obligations: 50, crypto: 0, cash: 30 };
  const allocColors = { actions: '#6c5ce7', obligations: '#00d2d3', crypto: '#feca57', cash: '#ff6b6b' };

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>💹 FinVest</h1></div>
      <div className="tabs">
        {['profil','analyse','allocation','projection'].map(t => <button key={t} className={\`tab \${tab===t?'active':''}\`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
      </div>
      {tab === 'profil' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Profil investisseur</h3>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Âge</label><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Revenu mensuel (€)</label><input type="number" value={profile.income} onChange={e => setProfile({...profile, income: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Épargne totale (€)</label><input type="number" value={profile.savings} onChange={e => setProfile({...profile, savings: +e.target.value})} /></div>
            <div><label style={{color:'var(--text2)',fontSize:12}}>Tolérance au risque</label>
              <select value={profile.riskTolerance} onChange={e => setProfile({...profile, riskTolerance: e.target.value})}>
                <option value="conservative">Prudent</option><option value="moderate">Modéré</option><option value="aggressive">Agressif</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} style={{marginTop:16}}>💾 Sauvegarder</button>
        </div>
      )}
      {tab === 'analyse' && (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          <div className="card" style={{textAlign:'center'}}>
            <h3>Score de santé financière</h3>
            <p style={{fontSize:64,color: healthScore >= 70 ? 'var(--success)' : healthScore >= 40 ? 'var(--warning)' : 'var(--danger)'}}>{healthScore}%</p>
            <p style={{color:'var(--text2)'}}>{healthScore >= 70 ? 'Excellent' : healthScore >= 40 ? 'Correct' : 'À améliorer'}</p>
          </div>
          <div className="card" style={{textAlign:'center'}}>
            <h3>Profil de risque</h3>
            <p style={{fontSize:64,color:'var(--accent2)'}}>{riskScore}</p>
            <p style={{color:'var(--text2)'}}>{profile.riskTolerance}</p>
          </div>
          <div className="card" style={{gridColumn:'1/-1'}}>
            <h3>Conseils</h3>
            <ul style={{marginTop:12,paddingLeft:20,color:'var(--text2)'}}>
              {healthScore < 70 && <li>Constituez un fonds d'urgence de {(profile.income * 6 - profile.savings).toFixed(0)} € supplémentaires.</li>}
              <li>Diversifiez vos investissements selon votre profil {profile.riskTolerance}.</li>
              <li>Épargnez au moins {Math.round(profile.income * 0.2)} €/mois (20% du revenu).</li>
              {profile.age < 40 && <li>Profitez de votre horizon long terme pour investir en actions.</li>}
            </ul>
          </div>
        </div>
      )}
      {tab === 'allocation' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Allocation recommandée</h3>
          {Object.entries(allocation).map(([k, v]) => (
            <div key={k} style={{marginBottom:12}}>
              <div className="flex" style={{justifyContent:'space-between',marginBottom:4}}>
                <span style={{textTransform:'capitalize'}}>{k}</span><span>{v}%</span>
              </div>
              <div style={{height:24,background:'var(--surface2)',borderRadius:12,overflow:'hidden'}}>
                <div style={{width:\`\${v}%\`,height:'100%',background:allocColors[k],borderRadius:12,transition:'width .5s'}} />
              </div>
            </div>
          ))}
          <p style={{color:'var(--text2)',marginTop:16}}>Montant total à investir : {profile.savings.toLocaleString()} €</p>
        </div>
      )}
      {tab === 'projection' && (
        <div className="card">
          <h3 style={{marginBottom:16}}>Projections à 10, 20, 30 ans</h3>
          {[10, 20, 30].map(years => {
            const rate = profile.riskTolerance === 'aggressive' ? 0.08 : profile.riskTolerance === 'moderate' ? 0.05 : 0.03;
            const monthly = profile.income * 0.15;
            const future = profile.savings * Math.pow(1 + rate, years) + monthly * 12 * ((Math.pow(1 + rate, years) - 1) / rate);
            return (
              <div key={years} className="flex" style={{justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                <span>{years} ans</span>
                <span style={{color:'var(--success)',fontSize:20,fontWeight:700}}>{Math.round(future).toLocaleString()} €</span>
              </div>
            );
          })}
          <p style={{color:'var(--text2)',marginTop:16,fontSize:12}}>Hypothèse : épargne mensuelle de {Math.round(profile.income * 0.15)} € + rendement {profile.riskTolerance === 'aggressive' ? '8' : profile.riskTolerance === 'moderate' ? '5' : '3'}%/an</p>
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.gamestudio'] = () => `import { useState, useRef, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const TEMPLATES = ['Platformer','RPG','Space Shooter','Puzzle'];
const SPRITE_TYPES = ['player','enemy','npc','item','obstacle'];
const COLORS = { player:'#6c5ce7', enemy:'#ff6b6b', npc:'#00d2d3', item:'#feca57', obstacle:'#8888bb' };

export default function App() {
  const [projects, setProjects] = useState([]);
  const [current, setCurrent] = useState(null);
  const [sprites, setSprites] = useState([]);
  const [selectedSprite, setSelectedSprite] = useState(null);
  const [tool, setTool] = useState('select');
  const [addType, setAddType] = useState('player');
  const canvasRef = useRef(null);

  const load = useCallback(async () => {
    const res = await storage.list('projects', { limit: 50 });
    setProjects((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const newProject = async (template) => {
    const key = 'proj-' + Date.now();
    const data = { name: \`Mon \${template}\`, template, sprites: [], created: new Date().toISOString() };
    await storage.set('projects', key, data);
    setCurrent({ key, ...data });
    setSprites([]);
    load();
  };

  const openProject = async (p) => {
    setCurrent(p);
    setSprites(p.sprites || []);
  };

  const saveProject = async () => {
    if (!current) return;
    await storage.set('projects', current.key, { ...current, sprites });
    load();
  };

  const deleteProject = async (key) => {
    await storage.delete('projects', key);
    if (current?.key === key) { setCurrent(null); setSprites([]); }
    load();
  };

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = c.parentElement.clientWidth; c.height = 400;
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height);
    // grid
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    for (let y = 0; y < c.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
    sprites.forEach((s, i) => {
      ctx.fillStyle = COLORS[s.type] || '#fff';
      ctx.fillRect(s.x, s.y, 32, 32);
      ctx.strokeStyle = selectedSprite === i ? '#fff' : 'transparent';
      ctx.lineWidth = 2; ctx.strokeRect(s.x, s.y, 32, 32);
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.type[0].toUpperCase(), s.x + 16, s.y + 20);
    });
  }, [sprites, selectedSprite]);

  useEffect(() => { draw(); }, [draw]);

  const canvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 32) * 32;
    const y = Math.floor((e.clientY - rect.top) / 32) * 32;
    if (tool === 'add') {
      setSprites(s => [...s, { type: addType, x, y, id: Date.now() }]);
    } else if (tool === 'select') {
      const idx = sprites.findIndex(s => x >= s.x && x < s.x + 32 && y >= s.y && y < s.y + 32);
      setSelectedSprite(idx >= 0 ? idx : null);
    } else if (tool === 'delete') {
      setSprites(s => s.filter(sp => !(x >= sp.x && x < sp.x + 32 && y >= sp.y && y < sp.y + 32)));
    }
  };

  if (!current) return (
    <div className="app">
      <div className="header"><h1>🎮 Game Studio</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Nouveau projet</h3>
        <div className="flex" style={{flexWrap:'wrap'}}>
          {TEMPLATES.map(t => <button key={t} onClick={() => newProject(t)}>{t}</button>)}
        </div>
      </div>
      <div className="card">
        <h3>Projets sauvegardés</h3>
        {projects.length === 0 ? <p style={{color:'var(--text2)',marginTop:8}}>Aucun projet</p> :
          projects.map(p => (
            <div key={p.key} className="flex" style={{justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div><strong>{p.name}</strong> <span className="badge" style={{background:'var(--surface2)'}}>{p.template}</span></div>
              <div className="flex">
                <button onClick={() => openProject(p)} style={{fontSize:12}}>Ouvrir</button>
                <button onClick={() => deleteProject(p.key)} style={{fontSize:12,background:'var(--danger)'}}>🗑</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="header">
        <h1>🎮 {current.name}</h1>
        <div className="flex">
          <button onClick={saveProject} style={{background:'var(--success)'}}>💾 Sauver</button>
          <button onClick={() => { setCurrent(null); setSprites([]); }} style={{background:'var(--surface2)'}}>← Retour</button>
        </div>
      </div>
      <div className="flex" style={{marginBottom:12}}>
        <button onClick={() => setTool('select')} style={{background: tool==='select'?'var(--accent)':'var(--surface2)'}}>🖱 Sélection</button>
        <button onClick={() => setTool('add')} style={{background: tool==='add'?'var(--accent)':'var(--surface2)'}}>➕ Ajouter</button>
        <button onClick={() => setTool('delete')} style={{background: tool==='delete'?'var(--danger)':'var(--surface2)'}}>🗑 Suppr</button>
        {tool === 'add' && <select value={addType} onChange={e => setAddType(e.target.value)} style={{width:120}}>{SPRITE_TYPES.map(t => <option key={t}>{t}</option>)}</select>}
        <span style={{color:'var(--text2)',fontSize:12,marginLeft:'auto'}}>{sprites.length} sprites</span>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <canvas ref={canvasRef} onClick={canvasClick} style={{display:'block',width:'100%',cursor: tool==='add'?'crosshair':tool==='delete'?'not-allowed':'default'}} />
      </div>
      <div className="flex" style={{marginTop:8,flexWrap:'wrap'}}>
        {SPRITE_TYPES.map(t => <span key={t} className="badge" style={{background:COLORS[t]}}>{t}: {sprites.filter(s=>s.type===t).length}</span>)}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.it-discovery'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const MODULES = [
  { id: 'binary', title: 'Binaire & Données', questions: [
    { q: 'Combien de bits dans un octet ?', opts: ['4','8','16','32'], answer: 1 },
    { q: 'Que vaut 1010 en décimal ?', opts: ['8','10','12','14'], answer: 1 },
    { q: 'Quel est le préfixe pour 1024 octets ?', opts: ['kilo','kibi','mega','giga'], answer: 1 },
  ]},
  { id: 'network', title: 'Réseaux', questions: [
    { q: "Quel protocole utilise le port 80 ?", opts: ['FTP','SSH','HTTP','SMTP'], answer: 2 },
    { q: "Quelle couche OSI gère le routage ?", opts: ['1','2','3','4'], answer: 2 },
    { q: "Que signifie DNS ?", opts: ['Domain Name System','Data Network Service','Digital Name Server','Domain Node System'], answer: 0 },
  ]},
  { id: 'security', title: 'Cybersécurité', questions: [
    { q: "Qu'est-ce qu'un firewall ?", opts: ['Antivirus','Pare-feu','VPN','Proxy'], answer: 1 },
    { q: "Quel type d'attaque vole des identifiants via email ?", opts: ['DDoS','Phishing','Brute Force','XSS'], answer: 1 },
    { q: "Que protège le chiffrement ?", opts: ['Vitesse','Confidentialité','Disponibilité','Performance'], answer: 1 },
  ]},
];

export default function App() {
  const [progress, setProgress] = useState({});
  const [activeModule, setActiveModule] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await storage.getData('progress');
      if (res) setProgress(res);
    } catch(e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const startModule = (m) => { setActiveModule(m); setQIdx(0); setScore(0); setDone(false); setFeedback(''); };

  const answer = async (i) => {
    const correct = i === activeModule.questions[qIdx].answer;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : '❌ Mauvaise réponse');
    setTimeout(async () => {
      setFeedback('');
      if (qIdx + 1 < activeModule.questions.length) { setQIdx(qIdx + 1); }
      else {
        setDone(true);
        const newProgress = { ...progress, [activeModule.id]: Math.max(progress[activeModule.id] || 0, score + (correct ? 1 : 0)) };
        setProgress(newProgress);
        await storage.setData('progress', newProgress);
      }
    }, 1000);
  };

  const totalBadges = MODULES.filter(m => (progress[m.id] || 0) === m.questions.length).length;

  if (activeModule && !done) {
    const q = activeModule.questions[qIdx];
    return (
      <div className="app">
        <div className="header"><h1>💻 {activeModule.title}</h1><button onClick={() => setActiveModule(null)} style={{background:'var(--surface2)'}}>← Retour</button></div>
        <div className="card" style={{textAlign:'center'}}>
          <p style={{color:'var(--text2)'}}>Question {qIdx+1}/{activeModule.questions.length}</p>
          <h2 style={{margin:'20px 0'}}>{q.q}</h2>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr',maxWidth:500,margin:'0 auto'}}>
            {q.opts.map((o, i) => <button key={i} onClick={() => answer(i)} style={{padding:16}}>{o}</button>)}
          </div>
          {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
        </div>
      </div>
    );
  }

  if (activeModule && done) return (
    <div className="app">
      <div className="header"><h1>💻 {activeModule.title}</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Module terminé !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{activeModule.questions.length}</p>
        {score === activeModule.questions.length && <p style={{color:'var(--success)',fontSize:24}}>🏅 Badge obtenu !</p>}
        <button onClick={() => setActiveModule(null)} style={{marginTop:16}}>Retour aux modules</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="header"><h1>💻 IT Discovery</h1><span className="badge" style={{background:'var(--success)'}}>🏅 {totalBadges} badges</span></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}>
        {MODULES.map(m => (
          <div key={m.id} className="card" style={{cursor:'pointer'}} onClick={() => startModule(m)}>
            <h3>{m.title}</h3>
            <p style={{color:'var(--text2)',margin:'8px 0'}}>{m.questions.length} questions</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{flex:1,height:8,background:'var(--surface2)',borderRadius:4,marginRight:12}}>
                <div style={{width:\`\${((progress[m.id]||0)/m.questions.length)*100}%\`,height:'100%',background:'var(--accent)',borderRadius:4}} />
              </div>
              <span style={{fontSize:12,color:'var(--text2)'}}>{progress[m.id]||0}/{m.questions.length}</span>
            </div>
            {(progress[m.id]||0) === m.questions.length && <span style={{color:'var(--success)'}}>🏅 Complété</span>}
          </div>
        ))}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.pomodoro'] = () => `import { useState, useEffect, useRef, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [mode, setMode] = useState('work'); // work, break, longBreak
  const [time, setTime] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [stats, setStats] = useState([]);
  const [settings, setSettings] = useState({ work: 25, break: 5, longBreak: 15, autoStart: false });
  const intervalRef = useRef(null);

  const durations = { work: settings.work * 60, break: settings.break * 60, longBreak: settings.longBreak * 60 };

  const loadStats = useCallback(async () => {
    try {
      const res = await storage.list('sessions', { limit: 100, sort_by: 'updated_at', sort_order: 'desc' });
      setStats((res.items || []).map(i => i.data));
    } catch(e) {}
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTime(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'work') {
              const newSessions = sessions + 1;
              setSessions(newSessions);
              storage.set('sessions', 'session-' + Date.now(), { mode, duration: durations[mode], completed: new Date().toISOString() });
              loadStats();
              setMode(newSessions % 4 === 0 ? 'longBreak' : 'break');
              setTime(newSessions % 4 === 0 ? durations.longBreak : durations.break);
            } else {
              setMode('work');
              setTime(durations.work);
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = (m) => { setMode(m); setTime(durations[m]); setRunning(false); };
  const mm = String(Math.floor(time / 60)).padStart(2, '0');
  const ss = String(time % 60).padStart(2, '0');
  const progress = ((durations[mode] - time) / durations[mode]) * 100;

  return (
    <div className="app">
      <div className="header"><h1>🍅 Pomodoro Pro</h1><span className="badge" style={{background:'var(--accent)'}}>{sessions} sessions</span></div>
      <div className="tabs">
        {[['work','Travail'],['break','Pause'],['longBreak','Longue pause']].map(([k,v]) =>
          <button key={k} className={\`tab \${mode===k?'active':''}\`} onClick={() => switchMode(k)}>{v}</button>
        )}
      </div>
      <div className="card" style={{textAlign:'center',marginBottom:24}}>
        <div style={{width:200,height:200,borderRadius:'50%',border:'8px solid var(--border)',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',background:\`conic-gradient(var(--accent) \${progress}%, var(--surface2) 0)\`}}>
          <div style={{width:170,height:170,borderRadius:'50%',background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:48,fontWeight:700,fontFamily:'monospace'}}>{mm}:{ss}</span>
          </div>
        </div>
        <div className="flex" style={{justifyContent:'center',marginTop:20}}>
          <button onClick={() => setRunning(!running)} style={{padding:'12px 32px',fontSize:18}}>{running ? '⏸ Pause' : '▶ Démarrer'}</button>
          <button onClick={() => { setRunning(false); setTime(durations[mode]); }} style={{background:'var(--surface2)'}}>🔄 Reset</button>
        </div>
      </div>
      {stats.length > 0 && <div className="card">
        <h3>Historique récent</h3>
        {stats.slice(0, 10).map((s, i) => (
          <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span>{s.mode === 'work' ? '🍅' : '☕'} {Math.round(s.duration / 60)} min</span>
            <span style={{color:'var(--text2)',fontSize:12}}>{new Date(s.completed).toLocaleString()}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.habits'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await storage.list('habits', { limit: 50 });
    setHabits((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!newHabit.trim()) return;
    const key = 'habit-' + Date.now();
    await storage.set('habits', key, { name: newHabit, checks: {}, streak: 0, created: new Date().toISOString() });
    setNewHabit(''); load();
  };

  const toggle = async (habit) => {
    const today = new Date().toISOString().slice(0, 10);
    const checks = { ...habit.checks };
    if (checks[today]) delete checks[today]; else checks[today] = true;
    // calc streak
    let streak = 0, d = new Date();
    while (checks[d.toISOString().slice(0,10)]) { streak++; d.setDate(d.getDate()-1); }
    await storage.set('habits', habit.key, { ...habit, checks, streak });
    load();
  };

  const remove = async (key) => { await storage.delete('habits', key); load(); };

  const today = new Date().toISOString().slice(0, 10);
  const last30 = Array.from({length:30}, (_, i) => { const d = new Date(); d.setDate(d.getDate()-29+i); return d.toISOString().slice(0,10); });

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>🔥 Habit Forge</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <div className="flex">
          <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key==='Enter' && add()} placeholder="Nouvelle habitude..." />
          <button onClick={add}>Ajouter</button>
        </div>
      </div>
      {habits.length === 0 ? <p style={{color:'var(--text2)'}}>Ajoutez votre première habitude !</p> :
        habits.map(h => (
          <div key={h.key} className="card" style={{marginBottom:12}}>
            <div className="flex" style={{justifyContent:'space-between',marginBottom:12}}>
              <div className="flex">
                <button onClick={() => toggle(h)} style={{width:36,height:36,borderRadius:'50%',padding:0,background: h.checks?.[today] ? 'var(--success)' : 'var(--surface2)'}}>{h.checks?.[today] ? '✓' : ''}</button>
                <strong>{h.name}</strong>
              </div>
              <div className="flex">
                <span className="badge" style={{background:'var(--accent)'}}>🔥 {h.streak || 0}j</span>
                <button onClick={() => remove(h.key)} style={{background:'var(--danger)',padding:'4px 8px',fontSize:12}}>🗑</button>
              </div>
            </div>
            <div style={{display:'flex',gap:2}}>
              {last30.map(d => (
                <div key={d} title={d} style={{width:8,height:20,borderRadius:2,background: h.checks?.[d] ? 'var(--success)' : 'var(--surface2)'}} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}`;

APPS['com.ezgalaxy.markdown'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

function renderMd(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>').replace(/\\*(.+?)\\*/g, '<em>$1</em>')
    .replace(/\`([^\`]+)\`/g, '<code style="background:var(--surface2);padding:2px 6px;border-radius:4px">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:12px;color:var(--text2)">$1</blockquote>')
    .replace(/\\n/g, '<br/>');
}

export default function App() {
  const [docs, setDocs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    const res = await storage.list('documents', { limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
    setDocs((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const key = current || 'doc-' + Date.now();
    await storage.set('documents', key, { title: title || 'Sans titre', content: text, updated: new Date().toISOString() });
    setCurrent(key); load();
  };

  const open = (d) => { setCurrent(d.key); setText(d.content || ''); setTitle(d.title || ''); };
  const newDoc = () => { setCurrent(null); setText(''); setTitle(''); };
  const remove = async (key) => { await storage.delete('documents', key); if (current === key) newDoc(); load(); };

  const toolbar = [
    ['# ', 'H1'], ['## ', 'H2'], ['**', 'Gras'], ['*', 'Italique'], ['\\n- ', 'Liste'], ['\\n> ', 'Citation'], ['\`', 'Code']
  ];

  return (
    <div className="app">
      <div className="header">
        <h1>📝 MarkDown Studio</h1>
        <div className="flex">
          <button onClick={newDoc} style={{background:'var(--surface2)'}}>📄 Nouveau</button>
          <button onClick={save} style={{background:'var(--success)'}}>💾 Sauver</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr 1fr',gap:16,minHeight:'70vh'}}>
        <div className="card" style={{overflow:'auto',maxHeight:'75vh'}}>
          <h3 style={{marginBottom:8}}>Documents</h3>
          {docs.map(d => (
            <div key={d.key} style={{padding:'8px',cursor:'pointer',borderRadius:8,background: current===d.key?'var(--surface2)':'transparent',marginBottom:4}} onClick={() => open(d)}>
              <p style={{fontSize:13}}>{d.title || 'Sans titre'}</p>
              <div className="flex"><span style={{fontSize:10,color:'var(--text2)'}}>{new Date(d.updated).toLocaleDateString()}</span>
              <button onClick={e => { e.stopPropagation(); remove(d.key); }} style={{fontSize:10,padding:'2px 6px',background:'var(--danger)'}}>×</button></div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du document" />
          <div className="flex" style={{flexWrap:'wrap'}}>
            {toolbar.map(([s, label]) => <button key={label} onClick={() => setText(text + s)} style={{fontSize:11,padding:'4px 8px',background:'var(--surface2)'}}>{label}</button>)}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} style={{flex:1,fontFamily:'monospace',resize:'none'}} placeholder="Écrivez en Markdown..." />
        </div>
        <div className="card" style={{overflow:'auto'}}>
          <div dangerouslySetInnerHTML={{ __html: renderMd(text) }} />
        </div>
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.chroma'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function luminance(hex) {
  const {r,g,b} = hexToRgb(hex);
  const [rs,gs,bs] = [r,g,b].map(c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); });
  return 0.2126*rs + 0.7152*gs + 0.0722*bs;
}

function contrastRatio(c1, c2) {
  const l1 = luminance(c1), l2 = luminance(c2);
  const lighter = Math.max(l1,l2), darker = Math.min(l1,l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

export default function App() {
  const [baseHue, setBaseHue] = useState(260);
  const [harmony, setHarmony] = useState('complementary');
  const [palettes, setPalettes] = useState([]);

  const load = useCallback(async () => {
    const res = await storage.list('palettes', { limit: 30 });
    setPalettes((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const harmonies = {
    complementary: [0, 180],
    analogous: [-30, 0, 30],
    triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210],
    tetradic: [0, 90, 180, 270],
  };

  const colors = harmonies[harmony].map(offset => {
    const h = (baseHue + offset) % 360;
    return [hslToHex(h, 70, 50), hslToHex(h, 60, 40), hslToHex(h, 80, 60), hslToHex(h, 50, 70), hslToHex(h, 40, 30)];
  }).flat();

  const savePalette = async () => {
    await storage.set('palettes', 'palette-' + Date.now(), { harmony, baseHue, colors, date: new Date().toISOString() });
    load();
  };

  const exportCSS = () => {
    const css = colors.map((c, i) => \`  --color-\${i}: \${c};\`).join('\\n');
    navigator.clipboard?.writeText(\`:root {\\n\${css}\\n}\`);
    alert('CSS copié !');
  };

  return (
    <div className="app">
      <div className="header"><h1>🎨 ChromaLab</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <div className="flex" style={{flexWrap:'wrap'}}>
          <label>Teinte: <input type="range" min="0" max="359" value={baseHue} onChange={e => setBaseHue(+e.target.value)} style={{width:200}} /> {baseHue}°</label>
          <select value={harmony} onChange={e => setHarmony(e.target.value)}>
            {Object.keys(harmonies).map(h => <option key={h}>{h}</option>)}
          </select>
          <button onClick={savePalette} style={{background:'var(--success)'}}>💾 Sauver</button>
          <button onClick={exportCSS}>📋 CSS</button>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',marginBottom:24}}>
        {colors.map((c, i) => (
          <div key={i} style={{textAlign:'center'}}>
            <div style={{width:'100%',paddingTop:'100%',background:c,borderRadius:'var(--radius)',cursor:'pointer',position:'relative'}} onClick={() => { navigator.clipboard?.writeText(c); }}>
              <span style={{position:'absolute',bottom:4,left:0,right:0,fontSize:10,color: luminance(c) > 0.5 ? '#000' : '#fff'}}>{c}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3>Contraste WCAG</h3>
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',marginTop:12}}>
          {colors.slice(0,4).map((c, i) => {
            const ratio = contrastRatio(c, '#ffffff');
            const pass = parseFloat(ratio) >= 4.5;
            return <div key={i} style={{padding:12,background:c,borderRadius:8,textAlign:'center'}}>
              <span style={{color:'#fff',fontSize:12}}>{ratio}:1</span>
              <span className="badge" style={{background: pass?'var(--success)':'var(--danger)',display:'block',marginTop:4}}>{pass?'AA ✓':'Fail'}</span>
            </div>;
          })}
        </div>
      </div>
      {palettes.length > 0 && <div className="card">
        <h3>Palettes sauvegardées</h3>
        {palettes.map(p => (
          <div key={p.key} className="flex" style={{marginTop:8}}>
            {(p.colors||[]).slice(0,6).map((c,i) => <div key={i} style={{width:24,height:24,borderRadius:'50%',background:c}} />)}
            <span style={{color:'var(--text2)',fontSize:12,marginLeft:8}}>{p.harmony}</span>
            <button onClick={() => setBaseHue(p.baseHue)} style={{fontSize:11,padding:'2px 8px',background:'var(--surface2)',marginLeft:'auto'}}>Charger</button>
          </div>
        ))}
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.kanflow'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const COLORS_TAG = ['#6c5ce7','#00d2d3','#feca57','#ff6b6b','#a29bfe','#55efc4','#fd79a8','#74b9ff'];

export default function App() {
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', desc: '', tag: '', due: '', column: 'todo' });

  const load = useCallback(async () => {
    const res = await storage.list('boards', { limit: 20 });
    const items = (res.items || []).map(i => ({ key: i.record_key, ...i.data }));
    setBoards(items);
    if (!activeBoard && items.length > 0) setActiveBoard(items[0]);
  }, [activeBoard]);
  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    const key = 'board-' + Date.now();
    const board = { name: 'Nouveau tableau', columns: ['todo','doing','done'], cards: [] };
    await storage.set('boards', key, board);
    load();
  };

  const saveBoard = async (board) => {
    await storage.set('boards', board.key, { name: board.name, columns: board.columns, cards: board.cards });
    setActiveBoard(board);
    load();
  };

  const addCard = () => {
    if (!form.title || !activeBoard) return;
    const card = { id: Date.now(), ...form };
    const updated = { ...activeBoard, cards: [...(activeBoard.cards||[]), card] };
    saveBoard(updated);
    setModal(null); setForm({ title: '', desc: '', tag: '', due: '', column: 'todo' });
  };

  const moveCard = (cardId, newCol) => {
    const updated = { ...activeBoard, cards: activeBoard.cards.map(c => c.id === cardId ? { ...c, column: newCol } : c) };
    saveBoard(updated);
  };

  const deleteCard = (cardId) => {
    const updated = { ...activeBoard, cards: activeBoard.cards.filter(c => c.id !== cardId) };
    saveBoard(updated);
  };

  const columns = activeBoard?.columns || ['todo','doing','done'];
  const cards = activeBoard?.cards || [];

  return (
    <div className="app">
      <div className="header">
        <h1>📋 KanFlow</h1>
        <div className="flex">
          <button onClick={createBoard} style={{background:'var(--surface2)'}}>+ Tableau</button>
          {activeBoard && <button onClick={() => { setForm({ title:'',desc:'',tag:'',due:'',column:'todo' }); setModal({}); }}>+ Carte</button>}
        </div>
      </div>
      {boards.length > 1 && <div className="flex" style={{marginBottom:16,flexWrap:'wrap'}}>
        {boards.map(b => <button key={b.key} onClick={() => setActiveBoard(b)} style={{background: activeBoard?.key===b.key?'var(--accent)':'var(--surface2)',fontSize:12}}>{b.name}</button>)}
      </div>}
      {activeBoard ? (
        <div style={{display:'grid',gridTemplateColumns:\`repeat(\${columns.length},1fr)\`,gap:16}}>
          {columns.map(col => (
            <div key={col}>
              <h3 style={{textTransform:'capitalize',marginBottom:12,color:'var(--accent2)'}}>{col} ({cards.filter(c=>c.column===col).length})</h3>
              {cards.filter(c => c.column === col).map(c => (
                <div key={c.id} className="card" style={{marginBottom:8}}>
                  <div className="flex" style={{justifyContent:'space-between'}}>
                    <strong>{c.title}</strong>
                    <button onClick={() => deleteCard(c.id)} style={{background:'var(--danger)',padding:'2px 6px',fontSize:11}}>×</button>
                  </div>
                  {c.desc && <p style={{color:'var(--text2)',fontSize:12,marginTop:4}}>{c.desc}</p>}
                  {c.tag && <span className="badge" style={{background:COLORS_TAG[c.tag.length % COLORS_TAG.length],marginTop:4}}>{c.tag}</span>}
                  {c.due && <p style={{fontSize:11,color:'var(--warning)',marginTop:4}}>📅 {c.due}</p>}
                  <div className="flex" style={{marginTop:8,gap:4}}>
                    {columns.filter(nc => nc !== col).map(nc => <button key={nc} onClick={() => moveCard(c.id, nc)} style={{fontSize:10,padding:'2px 6px',background:'var(--surface2)'}}>{nc}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : <p style={{color:'var(--text2)'}}>Créez un tableau pour commencer</p>}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{marginBottom:16}}>Nouvelle carte</h2>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Titre" style={{marginBottom:12}} />
            <textarea value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} placeholder="Description" rows={3} style={{marginBottom:12}} />
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr',marginBottom:16}}>
              <input value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} placeholder="Tag" />
              <input type="date" value={form.due} onChange={e => setForm({...form, due: e.target.value})} />
              <select value={form.column} onChange={e => setForm({...form, column: e.target.value})}>{columns.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div className="flex" style={{justifyContent:'flex-end'}}>
              <button onClick={() => setModal(null)} style={{background:'var(--surface2)'}}>Annuler</button>
              <button onClick={addCard}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.neurocards'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

function sm2(card, quality) {
  let { ef, interval, repetitions } = card;
  ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ef);
    repetitions++;
  } else { repetitions = 0; interval = 1; }
  return { ef, interval, repetitions, nextReview: Date.now() + interval * 86400000 };
}

export default function App() {
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState({ front: '', back: '' });

  const load = useCallback(async () => {
    const res = await storage.list('decks', { limit: 30 });
    setDecks((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const createDeck = async () => {
    const name = prompt('Nom du deck:');
    if (!name) return;
    await storage.set('decks', 'deck-' + Date.now(), { name, cards: [] });
    load();
  };

  const openDeck = (d) => { setActiveDeck(d); setCards(d.cards || []); setMode('list'); };

  const addCard = async () => {
    if (!form.front || !form.back || !activeDeck) return;
    const newCard = { id: Date.now(), front: form.front, back: form.back, ef: 2.5, interval: 0, repetitions: 0, nextReview: 0 };
    const updated = { ...activeDeck, cards: [...cards, newCard] };
    await storage.set('decks', activeDeck.key, updated);
    setCards(updated.cards); setActiveDeck(updated); setForm({ front: '', back: '' }); load();
  };

  const startReview = () => {
    const due = cards.filter(c => (c.nextReview || 0) <= Date.now());
    if (due.length === 0) { alert('Aucune carte à réviser !'); return; }
    setCards(due); setReviewIdx(0); setShowAnswer(false); setMode('review');
  };

  const rateCard = async (quality) => {
    const card = cards[reviewIdx];
    const updated = { ...card, ...sm2(card, quality) };
    const allCards = activeDeck.cards.map(c => c.id === card.id ? updated : c);
    const deck = { ...activeDeck, cards: allCards };
    await storage.set('decks', activeDeck.key, deck);
    setActiveDeck(deck);
    if (reviewIdx + 1 < cards.length) { setReviewIdx(reviewIdx + 1); setShowAnswer(false); }
    else { setMode('list'); setCards(allCards); load(); }
  };

  if (!activeDeck) return (
    <div className="app">
      <div className="header"><h1>🧠 NeuroCards</h1><button onClick={createDeck}>+ Deck</button></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))'}}>
        {decks.map(d => (
          <div key={d.key} className="card" style={{cursor:'pointer'}} onClick={() => openDeck(d)}>
            <h3>{d.name}</h3>
            <p style={{color:'var(--text2)'}}>{(d.cards||[]).length} cartes</p>
            <p style={{color:'var(--warning)',fontSize:12}}>{(d.cards||[]).filter(c=>(c.nextReview||0)<=Date.now()).length} à réviser</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (mode === 'review') {
    const card = cards[reviewIdx];
    return (
      <div className="app">
        <div className="header"><h1>🧠 Révision</h1><span className="badge" style={{background:'var(--accent)'}}>{reviewIdx+1}/{cards.length}</span></div>
        <div className="card" style={{textAlign:'center',minHeight:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <h2 style={{marginBottom:20}}>{card.front}</h2>
          {showAnswer ? (<>
            <p style={{fontSize:20,color:'var(--success)',marginBottom:20}}>{card.back}</p>
            <div className="flex">
              <button onClick={() => rateCard(1)} style={{background:'var(--danger)'}}>Oublié</button>
              <button onClick={() => rateCard(3)} style={{background:'var(--warning)',color:'#000'}}>Difficile</button>
              <button onClick={() => rateCard(4)} style={{background:'var(--info)'}}>Bien</button>
              <button onClick={() => rateCard(5)} style={{background:'var(--success)'}}>Facile</button>
            </div>
          </>) : <button onClick={() => setShowAnswer(true)} style={{padding:'12px 32px'}}>Voir la réponse</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🧠 {activeDeck.name}</h1>
        <div className="flex">
          <button onClick={startReview} style={{background:'var(--success)'}}>▶ Réviser</button>
          <button onClick={() => { setActiveDeck(null); }} style={{background:'var(--surface2)'}}>← Retour</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Ajouter une carte</h3>
        <input value={form.front} onChange={e => setForm({...form, front: e.target.value})} placeholder="Recto (question)" style={{marginBottom:8}} />
        <input value={form.back} onChange={e => setForm({...form, back: e.target.value})} placeholder="Verso (réponse)" style={{marginBottom:8}} />
        <button onClick={addCard}>Ajouter</button>
      </div>
      <div className="card">
        <h3>Cartes ({cards.length})</h3>
        {cards.map(c => (
          <div key={c.id} className="flex" style={{justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <div><strong>{c.front}</strong> → <span style={{color:'var(--text2)'}}>{c.back}</span></div>
            <span style={{fontSize:11,color:'var(--text2)'}}>EF: {(c.ef||2.5).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.vaultgen'] = () => `import { useState, useCallback } from 'react';

function generatePassword(opts) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let chars = '';
  if (opts.lower) chars += lower;
  if (opts.upper) chars += upper;
  if (opts.digits) chars += digits;
  if (opts.symbols) chars += symbols;
  if (!chars) chars = lower + upper + digits;
  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => chars[v % chars.length]).join('');
}

function generatePassphrase(words = 4) {
  const wordList = ['soleil','montagne','rivière','château','dragon','étoile','forêt','océan','cristal','lumière','ombre','tempête','flamme','glacier','aurore','tonnerre','jardin','nuage','phoenix','comète','horizon','falaise','brume','volcan','diamant','saphir','rubis','marbre','corail','onyx'];
  const arr = new Uint32Array(words);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => wordList[v % wordList.length]).join('-');
}

function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++; if (pw.length >= 12) score++; if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return ['Très faible','Faible','Moyen','Bon','Fort','Très fort'][Math.min(score, 5)];
}

const strengthColors = { 'Très faible':'var(--danger)','Faible':'var(--danger)','Moyen':'var(--warning)','Bon':'var(--info)','Fort':'var(--success)','Très fort':'var(--success)' };

export default function App() {
  const [pw, setPw] = useState('');
  const [opts, setOpts] = useState({ length: 16, lower: true, upper: true, digits: true, symbols: true });
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('password');

  const generate = useCallback(() => {
    const p = mode === 'password' ? generatePassword(opts) : generatePassphrase(Math.ceil(opts.length / 4));
    setPw(p);
    setHistory(h => [{ pw: p, date: new Date().toLocaleTimeString(), str: strength(p) }, ...h].slice(0, 20));
  }, [opts, mode]);

  const copy = () => { navigator.clipboard?.writeText(pw); };

  const s = strength(pw);

  return (
    <div className="app">
      <div className="header"><h1>🔐 VaultGen</h1></div>
      <div className="tabs">
        <button className={\`tab \${mode==='password'?'active':''}\`} onClick={() => setMode('password')}>Mot de passe</button>
        <button className={\`tab \${mode==='passphrase'?'active':''}\`} onClick={() => setMode('passphrase')}>Passphrase</button>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{background:'var(--bg)',padding:16,borderRadius:'var(--radius)',fontFamily:'monospace',fontSize:18,wordBreak:'break-all',marginBottom:12}}>
          {pw || 'Cliquez sur Générer'}
        </div>
        {pw && <div className="flex" style={{marginBottom:12}}>
          <span style={{color: strengthColors[s] || 'var(--text2)'}}>{s}</span>
          <span style={{color:'var(--text2)',fontSize:12}}>{pw.length} caractères</span>
        </div>}
        <div className="flex">
          <button onClick={generate}>🔄 Générer</button>
          <button onClick={copy} style={{background:'var(--success)'}}>📋 Copier</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Options</h3>
        <div className="flex" style={{marginBottom:8}}>
          <label>Longueur: {opts.length}</label>
          <input type="range" min="4" max="64" value={opts.length} onChange={e => setOpts({...opts, length: +e.target.value})} style={{flex:1}} />
        </div>
        {mode === 'password' && <div className="flex" style={{flexWrap:'wrap'}}>
          {[['lower','Minuscules'],['upper','Majuscules'],['digits','Chiffres'],['symbols','Symboles']].map(([k,v]) => (
            <label key={k} style={{cursor:'pointer'}} className="flex">
              <input type="checkbox" checked={opts[k]} onChange={e => setOpts({...opts, [k]: e.target.checked})} /> {v}
            </label>
          ))}
        </div>}
      </div>
      {history.length > 0 && <div className="card">
        <h3>Historique</h3>
        {history.map((h, i) => (
          <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontFamily:'monospace',fontSize:12,maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis'}}>{h.pw}</span>
            <div className="flex">
              <span style={{color: strengthColors[h.str],fontSize:11}}>{h.str}</span>
              <button onClick={() => { navigator.clipboard?.writeText(h.pw); }} style={{fontSize:10,padding:'2px 6px',background:'var(--surface2)'}}>📋</button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.pollmaker'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage, appStorage } from './api.js';

export default function App() {
  const [polls, setPolls] = useState([]);
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ question: '', options: ['', ''] });
  const [activePoll, setActivePoll] = useState(null);

  const load = useCallback(async () => {
    const res = await appStorage.list('polls', { limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
    setPolls((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.question || form.options.filter(o => o.trim()).length < 2) return;
    const key = 'poll-' + Date.now();
    await appStorage.set('polls', key, { question: form.question, options: form.options.filter(o => o.trim()).map(o => ({ text: o, votes: 0 })), created: new Date().toISOString() });
    setForm({ question: '', options: ['', ''] }); setTab('list'); load();
  };

  const vote = async (poll, optIdx) => {
    const updated = { ...poll, options: poll.options.map((o, i) => i === optIdx ? { ...o, votes: (o.votes||0) + 1 } : o) };
    await appStorage.set('polls', poll.key, updated);
    load();
  };

  const deletePoll = async (key) => { await appStorage.delete('polls', key); load(); };

  const totalVotes = (poll) => poll.options.reduce((s, o) => s + (o.votes || 0), 0);

  return (
    <div className="app">
      <div className="header"><h1>📊 PollMaker</h1></div>
      <div className="tabs">
        <button className={\`tab \${tab==='list'?'active':''}\`} onClick={() => setTab('list')}>Sondages ({polls.length})</button>
        <button className={\`tab \${tab==='create'?'active':''}\`} onClick={() => setTab('create')}>Créer</button>
      </div>
      {tab === 'create' ? (
        <div className="card">
          <h3 style={{marginBottom:12}}>Nouveau sondage</h3>
          <input value={form.question} onChange={e => setForm({...form, question: e.target.value})} placeholder="Question" style={{marginBottom:12}} />
          {form.options.map((o, i) => (
            <div key={i} className="flex" style={{marginBottom:8}}>
              <input value={o} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({...form, options: opts}); }} placeholder={\`Option \${i+1}\`} />
              {form.options.length > 2 && <button onClick={() => setForm({...form, options: form.options.filter((_, j) => j !== i)})} style={{background:'var(--danger)',padding:'4px 8px'}}>×</button>}
            </div>
          ))}
          <div className="flex">
            <button onClick={() => setForm({...form, options: [...form.options, '']})} style={{background:'var(--surface2)'}}>+ Option</button>
            <button onClick={create}>Créer le sondage</button>
          </div>
        </div>
      ) : (
        <div className="grid">
          {polls.length === 0 ? <p style={{color:'var(--text2)'}}>Aucun sondage</p> :
            polls.map(p => {
              const total = totalVotes(p);
              return (
                <div key={p.key} className="card">
                  <div className="flex" style={{justifyContent:'space-between',marginBottom:12}}>
                    <h3>{p.question}</h3>
                    <button onClick={() => deletePoll(p.key)} style={{background:'var(--danger)',padding:'4px 8px',fontSize:12}}>🗑</button>
                  </div>
                  {p.options.map((o, i) => {
                    const pct = total > 0 ? Math.round((o.votes||0)/total*100) : 0;
                    return (
                      <div key={i} style={{marginBottom:8,cursor:'pointer'}} onClick={() => vote(p, i)}>
                        <div className="flex" style={{justifyContent:'space-between',marginBottom:4}}>
                          <span>{o.text}</span><span style={{color:'var(--text2)'}}>{o.votes||0} ({pct}%)</span>
                        </div>
                        <div style={{height:8,background:'var(--surface2)',borderRadius:4}}>
                          <div style={{width:\`\${pct}%\`,height:'100%',background:'var(--accent)',borderRadius:4,transition:'width .3s'}} />
                        </div>
                      </div>
                    );
                  })}
                  <p style={{color:'var(--text2)',fontSize:12,marginTop:8}}>{total} votes total</p>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}`;

APPS['com.ezgalaxy.typeracer'] = () => `import { useState, useEffect, useRef, useCallback } from 'react';
import { storage, appStorage } from './api.js';

const TEXTS = [
  "La programmation informatique est l'art de dire à un ordinateur ce qu'il doit faire, étape par étape, avec precision et logique.",
  "Le développement web moderne utilise des technologies comme React, Python et Docker pour créer des applications performantes.",
  "L'intelligence artificielle transforme notre façon de travailler et d'interagir avec la technologie au quotidien.",
  "Les bases de données relationnelles permettent de stocker et d'organiser l'information de manière structurée et efficace.",
  "La cybersécurité est devenue un enjeu majeur pour protéger les données sensibles des entreprises et des particuliers.",
  "Le cloud computing offre une flexibilité sans précédent pour déployer et gérer des applications à grande échelle.",
];

export default function App() {
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [scores, setScores] = useState([]);
  const inputRef = useRef(null);

  const loadScores = useCallback(async () => {
    try {
      const res = await appStorage.list('scores', { limit: 20, sort_by: 'updated_at', sort_order: 'desc' });
      setScores((res.items || []).map(i => i.data).sort((a,b) => (b.wpm||0) - (a.wpm||0)));
    } catch(e) {}
  }, []);
  useEffect(() => { loadScores(); }, [loadScores]);

  const start = () => {
    const t = TEXTS[Math.floor(Math.random() * TEXTS.length)];
    setText(t); setInput(''); setStarted(true); setDone(false); setStartTime(Date.now());
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    if (!started) return;
    // accuracy
    let correct = 0;
    for (let i = 0; i < val.length; i++) if (val[i] === text[i]) correct++;
    setAccuracy(val.length > 0 ? Math.round(correct / val.length * 100) : 100);
    // WPM
    const elapsed = (Date.now() - startTime) / 60000;
    const words = val.trim().split(/\\s+/).length;
    setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);

    if (val.length >= text.length) {
      setDone(true); setStarted(false);
      const finalWpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
      await appStorage.set('scores', 'score-' + Date.now(), { wpm: finalWpm, accuracy: Math.round(correct / val.length * 100), date: new Date().toISOString() });
      loadScores();
    }
  };

  return (
    <div className="app">
      <div className="header"><h1>⌨️ TypeRacer</h1></div>
      <div className="flex" style={{marginBottom:16}}>
        <span className="badge" style={{background:'var(--accent)'}}>{wpm} WPM</span>
        <span className="badge" style={{background: accuracy >= 95 ? 'var(--success)' : accuracy >= 80 ? 'var(--warning)' : 'var(--danger)'}}>{accuracy}% précision</span>
      </div>
      <div className="card" style={{marginBottom:16}}>
        {text ? (
          <div style={{fontFamily:'monospace',fontSize:16,lineHeight:2,marginBottom:16}}>
            {text.split('').map((c, i) => (
              <span key={i} style={{color: i < input.length ? (input[i] === c ? 'var(--success)' : 'var(--danger)') : 'var(--text2)', background: i === input.length ? 'var(--accent)' : 'transparent'}}>{c}</span>
            ))}
          </div>
        ) : <p style={{color:'var(--text2)',textAlign:'center'}}>Cliquez sur Démarrer pour commencer</p>}
        <textarea ref={inputRef} value={input} onChange={handleInput} disabled={!started} placeholder={started ? "Tapez le texte ci-dessus..." : ""} rows={3} style={{fontFamily:'monospace',marginBottom:12}} />
        <div className="flex" style={{justifyContent:'center'}}>
          {!started && <button onClick={start} style={{padding:'12px 32px'}}>{done ? '🔄 Rejouer' : '▶ Démarrer'}</button>}
        </div>
        {done && <p style={{textAlign:'center',marginTop:12,color:'var(--success)',fontSize:20}}>🏁 Terminé ! {wpm} WPM à {accuracy}%</p>}
      </div>
      {scores.length > 0 && <div className="card">
        <h3>🏆 Meilleurs scores</h3>
        {scores.slice(0,10).map((s,i) => (
          <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span>{i+1}. {s.wpm} WPM</span><span style={{color:'var(--text2)',fontSize:12}}>{s.accuracy}% • {new Date(s.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.soundscape'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const SOUNDS = [
  { id: 'rain', name: 'Pluie', emoji: '🌧️', freq: 200 },
  { id: 'thunder', name: 'Tonnerre', emoji: '⚡', freq: 80 },
  { id: 'wind', name: 'Vent', emoji: '🌬️', freq: 300 },
  { id: 'waves', name: 'Vagues', emoji: '🌊', freq: 150 },
  { id: 'fire', name: 'Feu', emoji: '🔥', freq: 250 },
  { id: 'birds', name: 'Oiseaux', emoji: '🐦', freq: 1200 },
  { id: 'forest', name: 'Forêt', emoji: '🌲', freq: 400 },
  { id: 'cafe', name: 'Café', emoji: '☕', freq: 500 },
  { id: 'river', name: 'Rivière', emoji: '🏞️', freq: 350 },
  { id: 'night', name: 'Nuit', emoji: '🌙', freq: 180 },
];

export default function App() {
  const [volumes, setVolumes] = useState({});
  const [presets, setPresets] = useState([]);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const load = useCallback(async () => {
    const res = await storage.list('presets', { limit: 20 });
    setPresets((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!timerActive || timer <= 0) return;
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { setTimerActive(false); setVolumes({}); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [timerActive, timer]);

  const toggleSound = (id) => {
    setVolumes(v => {
      const nv = { ...v };
      if (nv[id]) delete nv[id]; else nv[id] = 50;
      return nv;
    });
  };

  const setVol = (id, vol) => setVolumes(v => ({ ...v, [id]: +vol }));

  const savePreset = async () => {
    const name = prompt('Nom du preset:');
    if (!name) return;
    await storage.set('presets', 'preset-' + Date.now(), { name, volumes });
    load();
  };

  const active = Object.keys(volumes).length;
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  return (
    <div className="app">
      <div className="header"><h1>🎵 SoundScape</h1><span className="badge" style={{background:'var(--accent)'}}>{active} actifs</span></div>
      <div className="card" style={{marginBottom:16}}>
        <div className="flex" style={{justifyContent:'space-between'}}>
          <div className="flex">
            <button onClick={savePreset} style={{background:'var(--success)'}}>💾 Sauver</button>
            <button onClick={() => setVolumes({})} style={{background:'var(--danger)'}}>⏹ Stop</button>
          </div>
          <div className="flex">
            <span style={{fontFamily:'monospace',fontSize:20}}>{mm}:{ss}</span>
            {[15,30,60].map(m => <button key={m} onClick={() => { setTimer(m*60); setTimerActive(true); }} style={{fontSize:11,padding:'4px 8px',background:'var(--surface2)'}}>{m}m</button>)}
          </div>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))'}}>
        {SOUNDS.map(s => (
          <div key={s.id} className="card" style={{textAlign:'center',cursor:'pointer',borderColor: volumes[s.id] ? 'var(--accent)' : 'var(--border)'}} onClick={() => toggleSound(s.id)}>
            <p style={{fontSize:40}}>{s.emoji}</p>
            <p style={{marginTop:8}}>{s.name}</p>
            {volumes[s.id] !== undefined && (
              <input type="range" min="0" max="100" value={volumes[s.id]} onChange={e => { e.stopPropagation(); setVol(s.id, e.target.value); }} onClick={e => e.stopPropagation()} style={{width:'100%',marginTop:8}} />
            )}
          </div>
        ))}
      </div>
      {presets.length > 0 && <div className="card" style={{marginTop:16}}>
        <h3>Presets</h3>
        <div className="flex" style={{flexWrap:'wrap',marginTop:8}}>
          {presets.map(p => <button key={p.key} onClick={() => setVolumes(p.volumes || {})} style={{background:'var(--surface2)',fontSize:12}}>{p.name}</button>)}
        </div>
      </div>}
    </div>
  );
}`;

APPS['com.ezgalaxy.unitswift'] = () => `import { useState } from 'react';

const CATEGORIES = {
  Longueur: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, ft:0.3048, in:0.0254, yd:0.9144 },
  Poids: { kg:1, g:0.001, mg:0.000001, lb:0.453592, oz:0.0283495, t:1000 },
  Température: { C:'c', F:'f', K:'k' },
  Volume: { L:1, mL:0.001, gal:3.78541, qt:0.946353, pt:0.473176, cup:0.236588, tbsp:0.0147868, tsp:0.00492892 },
  Surface: { 'm²':1, 'km²':1e6, 'cm²':1e-4, ha:1e4, acre:4046.86, 'ft²':0.092903 },
  Vitesse: { 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 },
  Données: { B:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776 },
};

function convertTemp(value, from, to) {
  let celsius;
  if (from === 'C') celsius = value;
  else if (from === 'F') celsius = (value - 32) * 5/9;
  else celsius = value - 273.15;
  if (to === 'C') return celsius;
  if (to === 'F') return celsius * 9/5 + 32;
  return celsius + 273.15;
}

export default function App() {
  const [cat, setCat] = useState('Longueur');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('km');
  const [value, setValue] = useState('1');

  const units = Object.keys(CATEGORIES[cat]);

  const convert = () => {
    const v = parseFloat(value);
    if (isNaN(v)) return '';
    if (cat === 'Température') return convertTemp(v, from, to).toFixed(4);
    const factors = CATEGORIES[cat];
    return ((v * factors[from]) / factors[to]).toFixed(6).replace(/\\.?0+$/, '');
  };

  return (
    <div className="app">
      <div className="header"><h1>🔄 UnitSwift</h1></div>
      <div className="flex" style={{marginBottom:16,flexWrap:'wrap'}}>
        {Object.keys(CATEGORIES).map(c => (
          <button key={c} onClick={() => { setCat(c); const u = Object.keys(CATEGORIES[c]); setFrom(u[0]); setTo(u[1]); }} style={{background: cat===c?'var(--accent)':'var(--surface2)',fontSize:12}}>{c}</button>
        ))}
      </div>
      <div className="card">
        <div className="grid" style={{gridTemplateColumns:'1fr auto 1fr',alignItems:'center'}}>
          <div>
            <input type="number" value={value} onChange={e => setValue(e.target.value)} style={{fontSize:24,textAlign:'center',marginBottom:8}} />
            <select value={from} onChange={e => setFrom(e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select>
          </div>
          <button onClick={() => { setFrom(to); setTo(from); }} style={{background:'var(--surface2)',fontSize:20,width:48,height:48,borderRadius:'50%',padding:0}}>⇄</button>
          <div>
            <p style={{fontSize:24,textAlign:'center',color:'var(--accent2)',fontWeight:700,padding:'10px 14px',marginBottom:8}}>{convert()}</p>
            <select value={to} onChange={e => setTo(e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select>
          </div>
        </div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginBottom:12}}>Toutes les conversions</h3>
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))'}}>
          {units.filter(u => u !== from).map(u => {
            const v = parseFloat(value);
            let result;
            if (cat === 'Température') result = convertTemp(v || 0, from, u).toFixed(2);
            else result = ((v || 0) * CATEGORIES[cat][from] / CATEGORIES[cat][u]).toFixed(4).replace(/\\.?0+$/, '');
            return <div key={u} style={{padding:8,background:'var(--surface2)',borderRadius:8,textAlign:'center'}}>
              <p style={{color:'var(--accent2)',fontWeight:700}}>{result}</p>
              <p style={{color:'var(--text2)',fontSize:12}}>{u}</p>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}`;

APPS['com.ezgalaxy.moodtracker'] = () => `import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const MOODS = [
  { emoji: '😄', label: 'Excellent', value: 5, color: '#00d2d3' },
  { emoji: '🙂', label: 'Bien', value: 4, color: '#54a0ff' },
  { emoji: '😐', label: 'Neutre', value: 3, color: '#feca57' },
  { emoji: '😟', label: 'Bas', value: 2, color: '#ff9f43' },
  { emoji: '😢', label: 'Mauvais', value: 1, color: '#ff6b6b' },
];

export default function App() {
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const res = await storage.list('moods', { limit: 90, sort_by: 'updated_at', sort_order: 'desc' });
    setEntries((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const logMood = async (mood) => {
    const key = 'mood-' + today;
    await storage.set('moods', key, { date: today, mood: mood.value, emoji: mood.emoji, label: mood.label, note, color: mood.color });
    setNote(''); load();
  };

  const todayEntry = entries.find(e => e.date === today);
  const last7 = entries.filter(e => { const d = new Date(e.date); const w = new Date(); w.setDate(w.getDate()-7); return d >= w; });
  const avg = last7.length > 0 ? (last7.reduce((s,e) => s + (e.mood||3), 0) / last7.length).toFixed(1) : '-';
  const streak = (() => {
    let s = 0, d = new Date();
    while (entries.find(e => e.date === d.toISOString().slice(0,10))) { s++; d.setDate(d.getDate()-1); }
    return s;
  })();

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>😊 MoodTracker</h1></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:24}}>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Aujourd'hui</p><p style={{fontSize:36}}>{todayEntry?.emoji || '—'}</p></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Moyenne 7j</p><h2 style={{color:'var(--accent2)'}}>{avg}/5</h2></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Série</p><h2 style={{color:'var(--success)'}}>{streak} jours</h2></div>
      </div>
      <div className="card" style={{marginBottom:24}}>
        <h3 style={{marginBottom:12}}>Comment te sens-tu ?</h3>
        <div className="flex" style={{justifyContent:'center',marginBottom:12}}>
          {MOODS.map(m => (
            <button key={m.value} onClick={() => logMood(m)} style={{fontSize:36,background:'transparent',border:'2px solid var(--border)',width:64,height:64,borderRadius:'50%',padding:0,transition:'all .2s'}} title={m.label}>
              {m.emoji}
            </button>
          ))}
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note optionnelle..." />
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3>Tendance (7 derniers jours)</h3>
        <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginTop:12}}>
          {last7.reverse().map((e, i) => (
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
              <span style={{fontSize:20}}>{e.emoji}</span>
              <div style={{width:'100%',height:\`\${(e.mood||1)*20}%\`,background:e.color||'var(--accent)',borderRadius:'4px 4px 0 0',marginTop:4,minHeight:10}} />
              <span style={{fontSize:10,color:'var(--text2)',marginTop:4}}>{e.date?.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Historique</h3>
        {entries.slice(0, 14).map(e => (
          <div key={e.key} className="flex" style={{justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
            <div className="flex"><span style={{fontSize:24}}>{e.emoji}</span><div><strong>{e.label}</strong>{e.note && <p style={{color:'var(--text2)',fontSize:12}}>{e.note}</p>}</div></div>
            <span style={{color:'var(--text2)',fontSize:12}}>{e.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

// ── Main generation loop ────────────────────────────────────────────────────
let portCounter = 10000;
let generated = 0;
let errors = [];

for (const pkg of catalog.packages) {
  const appDir = path.join(ROOT, pkg.path);
  const dirName = path.basename(appDir);

  if (!fs.existsSync(appDir)) {
    errors.push(`Directory not found: ${appDir}`);
    continue;
  }

  const id = pkg.id;
  const title = pkg.title;
  const fn = pkg.function;
  const port = portCounter++;

  console.log(`[${generated + 1}/28] Generating ${id} → port ${port}...`);

  // 1) Clean old Express files
  cleanOldFiles(appDir);

  // 2) Backend
  copyFile(path.join(TEMPLATE, 'backend', 'main.py'), path.join(appDir, 'backend', 'main.py'));
  copyFile(path.join(TEMPLATE, 'backend', 'requirements.txt'), path.join(appDir, 'backend', 'requirements.txt'));

  // 3) Frontend
  copyFile(path.join(TEMPLATE, 'frontend', 'package.json'), path.join(appDir, 'frontend', 'package.json'));
  copyFile(path.join(TEMPLATE, 'frontend', 'index.html'), path.join(appDir, 'frontend', 'index.html'));
  copyFile(path.join(TEMPLATE, 'frontend', 'vite.config.js'), path.join(appDir, 'frontend', 'vite.config.js'));
  copyFile(path.join(TEMPLATE, 'frontend', 'src', 'main.jsx'), path.join(appDir, 'frontend', 'src', 'main.jsx'));
  copyFile(path.join(TEMPLATE, 'frontend', 'src', 'api.js'), path.join(appDir, 'frontend', 'src', 'api.js'));

  // App.css (shared)
  writeFile(path.join(appDir, 'frontend', 'src', 'App.css'), BASE_CSS);

  // App.jsx (unique per app)
  const appKey = APPS[id] ? id : (dirName in APPS ? dirName : null);
  const appFn = APPS[id] || APPS[dirName];
  if (appFn) {
    writeFile(path.join(appDir, 'frontend', 'src', 'App.jsx'), appFn());
  } else {
    // Fallback: simple placeholder
    writeFile(path.join(appDir, 'frontend', 'src', 'App.jsx'), `import { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => { fetch('/health').then(r => r.json()).then(setHealth).catch(() => {}); }, []);
  return (
    <div className="app">
      <div className="header"><h1>${title}</h1></div>
      <div className="card">
        <p style={{color:'var(--text2)'}}>${fn}</p>
        {health && <pre style={{marginTop:12,color:'var(--success)'}}>{JSON.stringify(health, null, 2)}</pre>}
      </div>
    </div>
  );
}`);
  }

  // 4) Dockerfile
  copyFile(path.join(TEMPLATE, 'Dockerfile'), path.join(appDir, 'Dockerfile'));

  // 5) docker-compose.yml
  writeFile(path.join(appDir, 'docker-compose.yml'), dockerCompose(id, port));

  // 6) ezcontainer.json
  writeFile(path.join(appDir, 'ezcontainer.json'), ezcontainerJson(id, title, fn, port));

  generated++;
}

console.log(`\n✅ Generated ${generated}/${catalog.packages.length} React+FastAPI apps.`);
if (errors.length) {
  console.log(`\n⚠️ Errors:`);
  errors.forEach(e => console.log(`  - ${e}`));
}
