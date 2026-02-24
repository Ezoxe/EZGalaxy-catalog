import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [tab, setTab] = useState('search');
  const [loading, setLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    const res = await storage.list('searches', { limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
    setSavedSearches((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const sources = [
    { name: 'Google', url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    { name: 'DuckDuckGo', url: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
    { name: 'Shodan', url: q => `https://www.shodan.io/search?query=${encodeURIComponent(q)}` },
    { name: 'VirusTotal', url: q => `https://www.virustotal.com/gui/search/${encodeURIComponent(q)}` },
    { name: 'Archive.org', url: q => `https://web.archive.org/web/*/${encodeURIComponent(q)}` },
    { name: 'Whois', url: q => `https://who.is/whois/${encodeURIComponent(q)}` },
    { name: 'DNSDumpster', url: q => `https://dnsdumpster.com/?q=${encodeURIComponent(q)}` },
    { name: 'crt.sh', url: q => `https://crt.sh/?q=%25${encodeURIComponent(q)}%25` },
  ];

  const search = () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(sources.map(s => ({ name: s.name, url: s.url(query) })));
    setLoading(false);
  };

  const save = async () => {
    if (!query.trim()) return;
    const key = 'search-' + Date.now();
    await storage.set('searches', key, { query, date: new Date().toISOString(), results });
    loadSaved();
  };

  const deleteSaved = async (key) => { await storage.delete('searches', key); loadSaved(); };

  return (
    <div className="app">
      <div className="header"><h1>🔍 OSINT Suite</h1></div>
      <div className="tabs">
        <button className={`tab ${tab==='search'?'active':''}`} onClick={() => setTab('search')}>Recherche</button>
        <button className={`tab ${tab==='saved'?'active':''}`} onClick={() => setTab('saved')}>Sauvegardes ({savedSearches.length})</button>
      </div>
      {tab === 'search' ? (<>
        <div className="card" style={{marginBottom:16}}>
          <div className="flex">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && search()} placeholder="Domaine, IP, email, nom d'utilisateur..." />
            <button onClick={search} disabled={loading}>🔍 Rechercher</button>
            <button onClick={save} style={{background:'var(--success)'}}>💾 Sauver</button>
          </div>
        </div>
        {results.length > 0 && (
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))'}}>
            {results.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="card" style={{textDecoration:'none',color:'var(--text)'}}>
                <h3 style={{color:'var(--accent2)'}}>{r.name}</h3>
                <p style={{color:'var(--text2)',fontSize:12,marginTop:8,wordBreak:'break-all'}}>{r.url.slice(0, 80)}...</p>
              </a>
            ))}
          </div>
        )}
      </>) : (
        <div className="grid">
          {savedSearches.length === 0 ? <p style={{color:'var(--text2)'}}>Aucune recherche sauvegardée</p> :
            savedSearches.map(s => (
              <div key={s.key} className="card flex" style={{justifyContent:'space-between'}}>
                <div>
                  <strong>{s.query}</strong>
                  <p style={{color:'var(--text2)',fontSize:12}}>{new Date(s.date).toLocaleString()}</p>
                </div>
                <div className="flex">
                  <button onClick={() => { setQuery(s.query); setTab('search'); setTimeout(() => { const btn = document.querySelector('.flex button'); if(btn) btn.click(); }, 0); }}>🔍</button>
                  <button onClick={() => deleteSaved(s.key)} style={{background:'var(--danger)'}}>🗑</button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}