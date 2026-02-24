import { useState, useEffect, useCallback } from 'react';
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
    try {
      const res = await storage.list('presets', { limit: 20 });
      setPresets((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch (e) { console.error('SoundScape: load failed', e); }
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
    try {
      await storage.set('presets', 'preset-' + Date.now(), { name, volumes });
      load();
    } catch (e) { console.error('SoundScape: save failed', e); }
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
}