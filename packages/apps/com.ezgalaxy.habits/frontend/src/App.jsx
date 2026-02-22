import { useState, useEffect, useCallback } from 'react';
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
}