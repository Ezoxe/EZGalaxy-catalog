import { useState, useRef, useEffect, useCallback } from 'react';

const TILES = { grass: '#2d5a27', water: '#1a4a7a', sand: '#c4a35a', stone: '#5a5a6a', path: '#7a6a4a' };
const NPCS = [
  { id: 1, x: 5, y: 3, name: 'Gardien Lyos', dialog: 'Bienvenue, Rêveur. Le monde se fragmente... Retrouve les Piliers.' },
  { id: 2, x: 12, y: 8, name: 'Marchande Nyx', dialog: 'J\'ai des potions. 10 Essences chacune.' },
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
        if (levelUp) setLog(l => [...l, `Niveau ${p.level + 1} atteint !`]);
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
}