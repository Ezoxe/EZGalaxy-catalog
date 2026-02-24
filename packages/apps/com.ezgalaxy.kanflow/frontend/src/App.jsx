import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const COLORS_TAG = ['#6c5ce7','#00d2d3','#feca57','#ff6b6b','#a29bfe','#55efc4','#fd79a8','#74b9ff'];

export default function App() {
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', desc: '', tag: '', due: '', column: 'todo' });

  const load = useCallback(async () => {
    try {
      const res = await storage.list('boards', { limit: 20 });
      const items = (res.items || []).map(i => ({ key: i.record_key, ...i.data }));
      setBoards(items);
      if (!activeBoard && items.length > 0) setActiveBoard(items[0]);
    } catch (e) { console.error('KanFlow: load failed', e); }
  }, [activeBoard]);
  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    const key = 'board-' + Date.now();
    const board = { name: 'Nouveau tableau', columns: ['todo','doing','done'], cards: [] };
    try {
      await storage.set('boards', key, board);
      load();
    } catch (e) { console.error('KanFlow: create failed', e); }
  };

  const saveBoard = async (board) => {
    try {
      await storage.set('boards', board.key, { name: board.name, columns: board.columns, cards: board.cards });
      setActiveBoard(board);
      load();
    } catch (e) { console.error('KanFlow: save failed', e); }
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
        <div style={{display:'grid',gridTemplateColumns:`repeat(${columns.length},1fr)`,gap:16}}>
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
}