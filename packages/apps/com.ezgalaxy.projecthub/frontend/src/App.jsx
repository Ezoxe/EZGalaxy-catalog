import { useState, useEffect, useCallback } from 'react';
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
        {['kanban','list'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t === 'kanban' ? 'Kanban' : 'Liste'}</button>)}
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
}