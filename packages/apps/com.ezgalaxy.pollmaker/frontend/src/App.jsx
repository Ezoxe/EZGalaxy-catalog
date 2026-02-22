import { useState, useEffect, useCallback } from 'react';
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
        <button className={`tab ${tab==='list'?'active':''}`} onClick={() => setTab('list')}>Sondages ({polls.length})</button>
        <button className={`tab ${tab==='create'?'active':''}`} onClick={() => setTab('create')}>Créer</button>
      </div>
      {tab === 'create' ? (
        <div className="card">
          <h3 style={{marginBottom:12}}>Nouveau sondage</h3>
          <input value={form.question} onChange={e => setForm({...form, question: e.target.value})} placeholder="Question" style={{marginBottom:12}} />
          {form.options.map((o, i) => (
            <div key={i} className="flex" style={{marginBottom:8}}>
              <input value={o} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({...form, options: opts}); }} placeholder={`Option ${i+1}`} />
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
                          <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',borderRadius:4,transition:'width .3s'}} />
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
}