import { useState, useEffect, useCallback } from 'react';
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
              <div style={{width:'100%',height:`${(e.mood||1)*20}%`,background:e.color||'var(--accent)',borderRadius:'4px 4px 0 0',marginTop:4,minHeight:10}} />
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
}