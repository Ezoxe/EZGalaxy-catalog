import { useState, useEffect, useRef, useCallback } from 'react';
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
          <button key={k} className={`tab ${mode===k?'active':''}`} onClick={() => switchMode(k)}>{v}</button>
        )}
      </div>
      <div className="card" style={{textAlign:'center',marginBottom:24}}>
        <div style={{width:200,height:200,borderRadius:'50%',border:'8px solid var(--border)',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',background:`conic-gradient(var(--accent) ${progress}%, var(--surface2) 0)`}}>
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
}