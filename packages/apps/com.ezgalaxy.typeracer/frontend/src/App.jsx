import { useState, useEffect, useRef, useCallback } from 'react';
import { storage, appStorage } from './api.js';

const TEXTS = [
  "La programmation informatique est l'art de dire à un ordinateur ce qu'il doit faire, étape par étape, avec precision et logique.",
  "Le développement web moderne utilise des technologies comme React, Python et Docker pour créer des applications performantes.",
  "L'intelligence artificielle transforme notre façon de travailler et d'interagir avec la technologie au quotidien.",
  "Les bases de données relationnelles permettent de stocker et d'organiser l'information de manière structurée et efficace.",
  "La cybersécurité est devenue un enjeu majeur pour protéger les données sensibles des entreprises et des particuliers.",
  "Le cloud computing offre une flexibilité sans précédent pour déployer et gérer des applications à grande échelle.",
];

export default function App() {
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [scores, setScores] = useState([]);
  const inputRef = useRef(null);

  const loadScores = useCallback(async () => {
    try {
      const res = await appStorage.list('scores', { limit: 20, sort_by: 'updated_at', sort_order: 'desc' });
      setScores((res.items || []).map(i => i.data).sort((a,b) => (b.wpm||0) - (a.wpm||0)));
    } catch(e) {}
  }, []);
  useEffect(() => { loadScores(); }, [loadScores]);

  const start = () => {
    const t = TEXTS[Math.floor(Math.random() * TEXTS.length)];
    setText(t); setInput(''); setStarted(true); setDone(false); setStartTime(Date.now());
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInput = async (e) => {
    const val = e.target.value;
    setInput(val);
    if (!started) return;
    // accuracy
    let correct = 0;
    for (let i = 0; i < val.length; i++) if (val[i] === text[i]) correct++;
    setAccuracy(val.length > 0 ? Math.round(correct / val.length * 100) : 100);
    // WPM
    const elapsed = (Date.now() - startTime) / 60000;
    const words = val.trim().split(/\s+/).length;
    setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0);

    if (val.length >= text.length) {
      setDone(true); setStarted(false);
      const finalWpm = elapsed > 0 ? Math.round(words / elapsed) : 0;
      await appStorage.set('scores', 'score-' + Date.now(), { wpm: finalWpm, accuracy: Math.round(correct / val.length * 100), date: new Date().toISOString() });
      loadScores();
    }
  };

  return (
    <div className="app">
      <div className="header"><h1>⌨️ TypeRacer</h1></div>
      <div className="flex" style={{marginBottom:16}}>
        <span className="badge" style={{background:'var(--accent)'}}>{wpm} WPM</span>
        <span className="badge" style={{background: accuracy >= 95 ? 'var(--success)' : accuracy >= 80 ? 'var(--warning)' : 'var(--danger)'}}>{accuracy}% précision</span>
      </div>
      <div className="card" style={{marginBottom:16}}>
        {text ? (
          <div style={{fontFamily:'monospace',fontSize:16,lineHeight:2,marginBottom:16}}>
            {text.split('').map((c, i) => (
              <span key={i} style={{color: i < input.length ? (input[i] === c ? 'var(--success)' : 'var(--danger)') : 'var(--text2)', background: i === input.length ? 'var(--accent)' : 'transparent'}}>{c}</span>
            ))}
          </div>
        ) : <p style={{color:'var(--text2)',textAlign:'center'}}>Cliquez sur Démarrer pour commencer</p>}
        <textarea ref={inputRef} value={input} onChange={handleInput} disabled={!started} placeholder={started ? "Tapez le texte ci-dessus..." : ""} rows={3} style={{fontFamily:'monospace',marginBottom:12}} />
        <div className="flex" style={{justifyContent:'center'}}>
          {!started && <button onClick={start} style={{padding:'12px 32px'}}>{done ? '🔄 Rejouer' : '▶ Démarrer'}</button>}
        </div>
        {done && <p style={{textAlign:'center',marginTop:12,color:'var(--success)',fontSize:20}}>🏁 Terminé ! {wpm} WPM à {accuracy}%</p>}
      </div>
      {scores.length > 0 && <div className="card">
        <h3>🏆 Meilleurs scores</h3>
        {scores.slice(0,10).map((s,i) => (
          <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
            <span>{i+1}. {s.wpm} WPM</span><span style={{color:'var(--text2)',fontSize:12}}>{s.accuracy}% • {new Date(s.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}