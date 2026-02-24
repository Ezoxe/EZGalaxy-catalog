import { useState, useRef, useEffect, useCallback } from 'react';
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
    try {
      const res = await storage.list('projects', { limit: 50 });
      setProjects((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch (e) { console.error('GameStudio: load failed', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const newProject = async (template) => {
    const key = 'proj-' + Date.now();
    const data = { name: `Mon ${template}`, template, sprites: [], created: new Date().toISOString() };
    try {
      await storage.set('projects', key, data);
      setCurrent({ key, ...data });
      setSprites([]);
      load();
    } catch (e) { console.error('GameStudio: create failed', e); }
  };

  const openProject = async (p) => {
    setCurrent(p);
    setSprites(p.sprites || []);
  };

  const saveProject = async () => {
    if (!current) return;
    try {
      await storage.set('projects', current.key, { ...current, sprites });
      load();
    } catch (e) { console.error('GameStudio: save failed', e); }
  };

  const deleteProject = async (key) => {
    try {
      await storage.delete('projects', key);
      if (current?.key === key) { setCurrent(null); setSprites([]); }
      load();
    } catch (e) { console.error('GameStudio: delete failed', e); }
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
}