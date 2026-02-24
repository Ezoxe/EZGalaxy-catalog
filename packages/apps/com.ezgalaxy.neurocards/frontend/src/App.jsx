import { useState, useEffect, useCallback } from 'react';
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
    try {
      const res = await storage.list('decks', { limit: 30 });
      setDecks((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch (e) { console.error('NeuroCards: load failed', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createDeck = async () => {
    const name = prompt('Nom du deck:');
    if (!name) return;
    try {
      await storage.set('decks', 'deck-' + Date.now(), { name, cards: [] });
      load();
    } catch (e) { console.error('NeuroCards: create failed', e); }
  };

  const openDeck = (d) => { setActiveDeck(d); setCards(d.cards || []); setMode('list'); };

  const addCard = async () => {
    if (!form.front || !form.back || !activeDeck) return;
    const newCard = { id: Date.now(), front: form.front, back: form.back, ef: 2.5, interval: 0, repetitions: 0, nextReview: 0 };
    const updated = { ...activeDeck, cards: [...cards, newCard] };
    try {
      await storage.set('decks', activeDeck.key, updated);
      setCards(updated.cards); setActiveDeck(updated); setForm({ front: '', back: '' }); load();
    } catch (e) { console.error('NeuroCards: add card failed', e); }
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
    try {
      await storage.set('decks', activeDeck.key, deck);
      setActiveDeck(deck);
      if (reviewIdx + 1 < cards.length) { setReviewIdx(reviewIdx + 1); setShowAnswer(false); }
      else { setMode('list'); setCards(allCards); load(); }
    } catch (e) { console.error('NeuroCards: rate failed', e); }
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
}