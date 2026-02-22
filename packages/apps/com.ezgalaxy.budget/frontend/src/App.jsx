import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ label: '', amount: '', type: 'expense', category: 'Autre' });
  const [loading, setLoading] = useState(true);
  const categories = ['Alimentation','Logement','Transport','Loisirs','Santé','Shopping','Autre'];

  const load = useCallback(async () => {
    try {
      const res = await storage.list('transactions', { limit: 200, sort_by: 'updated_at', sort_order: 'desc' });
      setTransactions((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.label || !form.amount) return;
    const key = 'tx-' + Date.now();
    const data = { ...form, amount: parseFloat(form.amount), date: new Date().toISOString() };
    await storage.set('transactions', key, data);
    setForm({ label: '', amount: '', type: 'expense', category: 'Autre' });
    load();
  };

  const remove = async (key) => { await storage.delete('transactions', key); load(); };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expenses;

  if (loading) return <div className="app"><p>Chargement...</p></div>;

  return (
    <div className="app">
      <div className="header"><h1>💰 Budget Graphique</h1></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:24}}>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Revenus</p><h2 style={{color:'var(--success)'}}>{income.toFixed(2)} €</h2></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Dépenses</p><h2 style={{color:'var(--danger)'}}>{expenses.toFixed(2)} €</h2></div>
        <div className="card" style={{textAlign:'center'}}><p style={{color:'var(--text2)'}}>Solde</p><h2 style={{color: balance >= 0 ? 'var(--success)' : 'var(--danger)'}}>{balance.toFixed(2)} €</h2></div>
      </div>
      <div className="card" style={{marginBottom:24}}>
        <h3 style={{marginBottom:12}}>Nouvelle transaction</h3>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr auto',alignItems:'end'}}>
          <input placeholder="Libellé" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          <input type="number" placeholder="Montant" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="expense">Dépense</option><option value="income">Revenu</option></select>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <button onClick={add}>Ajouter</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:12}}>Transactions</h3>
        {transactions.length === 0 ? <p style={{color:'var(--text2)'}}>Aucune transaction</p> :
          transactions.map(t => (
            <div key={t.key} className="flex" style={{padding:'10px 0',borderBottom:'1px solid var(--border)',justifyContent:'space-between'}}>
              <div>
                <strong>{t.label}</strong>
                <span className="badge" style={{background:'var(--surface2)',marginLeft:8}}>{t.category}</span>
              </div>
              <div className="flex">
                <span style={{color: t.type==='income'?'var(--success)':'var(--danger)',fontWeight:700}}>{t.type==='income'?'+':'-'}{(t.amount||0).toFixed(2)} €</span>
                <button onClick={() => remove(t.key)} style={{background:'var(--danger)',padding:'4px 10px'}}>🗑</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}