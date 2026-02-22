import { useState, useCallback } from 'react';

function generatePassword(opts) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let chars = '';
  if (opts.lower) chars += lower;
  if (opts.upper) chars += upper;
  if (opts.digits) chars += digits;
  if (opts.symbols) chars += symbols;
  if (!chars) chars = lower + upper + digits;
  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => chars[v % chars.length]).join('');
}

function generatePassphrase(words = 4) {
  const wordList = ['soleil','montagne','rivière','château','dragon','étoile','forêt','océan','cristal','lumière','ombre','tempête','flamme','glacier','aurore','tonnerre','jardin','nuage','phoenix','comète','horizon','falaise','brume','volcan','diamant','saphir','rubis','marbre','corail','onyx'];
  const arr = new Uint32Array(words);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => wordList[v % wordList.length]).join('-');
}

function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++; if (pw.length >= 12) score++; if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return ['Très faible','Faible','Moyen','Bon','Fort','Très fort'][Math.min(score, 5)];
}

const strengthColors = { 'Très faible':'var(--danger)','Faible':'var(--danger)','Moyen':'var(--warning)','Bon':'var(--info)','Fort':'var(--success)','Très fort':'var(--success)' };

export default function App() {
  const [pw, setPw] = useState('');
  const [opts, setOpts] = useState({ length: 16, lower: true, upper: true, digits: true, symbols: true });
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('password');

  const generate = useCallback(() => {
    const p = mode === 'password' ? generatePassword(opts) : generatePassphrase(Math.ceil(opts.length / 4));
    setPw(p);
    setHistory(h => [{ pw: p, date: new Date().toLocaleTimeString(), str: strength(p) }, ...h].slice(0, 20));
  }, [opts, mode]);

  const copy = () => { navigator.clipboard?.writeText(pw); };

  const s = strength(pw);

  return (
    <div className="app">
      <div className="header"><h1>🔐 VaultGen</h1></div>
      <div className="tabs">
        <button className={`tab ${mode==='password'?'active':''}`} onClick={() => setMode('password')}>Mot de passe</button>
        <button className={`tab ${mode==='passphrase'?'active':''}`} onClick={() => setMode('passphrase')}>Passphrase</button>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{background:'var(--bg)',padding:16,borderRadius:'var(--radius)',fontFamily:'monospace',fontSize:18,wordBreak:'break-all',marginBottom:12}}>
          {pw || 'Cliquez sur Générer'}
        </div>
        {pw && <div className="flex" style={{marginBottom:12}}>
          <span style={{color: strengthColors[s] || 'var(--text2)'}}>{s}</span>
          <span style={{color:'var(--text2)',fontSize:12}}>{pw.length} caractères</span>
        </div>}
        <div className="flex">
          <button onClick={generate}>🔄 Générer</button>
          <button onClick={copy} style={{background:'var(--success)'}}>📋 Copier</button>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Options</h3>
        <div className="flex" style={{marginBottom:8}}>
          <label>Longueur: {opts.length}</label>
          <input type="range" min="4" max="64" value={opts.length} onChange={e => setOpts({...opts, length: +e.target.value})} style={{flex:1}} />
        </div>
        {mode === 'password' && <div className="flex" style={{flexWrap:'wrap'}}>
          {[['lower','Minuscules'],['upper','Majuscules'],['digits','Chiffres'],['symbols','Symboles']].map(([k,v]) => (
            <label key={k} style={{cursor:'pointer'}} className="flex">
              <input type="checkbox" checked={opts[k]} onChange={e => setOpts({...opts, [k]: e.target.checked})} /> {v}
            </label>
          ))}
        </div>}
      </div>
      {history.length > 0 && <div className="card">
        <h3>Historique</h3>
        {history.map((h, i) => (
          <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontFamily:'monospace',fontSize:12,maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis'}}>{h.pw}</span>
            <div className="flex">
              <span style={{color: strengthColors[h.str],fontSize:11}}>{h.str}</span>
              <button onClick={() => { navigator.clipboard?.writeText(h.pw); }} style={{fontSize:10,padding:'2px 6px',background:'var(--surface2)'}}>📋</button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}