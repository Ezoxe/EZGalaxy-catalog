import { useState, useCallback } from 'react';

const CHALLENGES = [
  { q: "Quel mot-clé déclare une variable en JavaScript?", opts: ["var", "int", "dim", "string"], answer: 0 },
  { q: "Quel symbole commence un commentaire en Python?", opts: ["//", "#", "/*", "--"], answer: 1 },
  { q: "Quelle balise HTML crée un lien?", opts: ["<link>", "<href>", "<a>", "<url>"], answer: 2 },
  { q: "Quel langage est typé statiquement?", opts: ["Python", "JavaScript", "Ruby", "Java"], answer: 3 },
  { q: "Que signifie CSS?", opts: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Coded Style Sheets"], answer: 1 },
  { q: "Quel opérateur vérifie l'égalité stricte en JS?", opts: ["==", "===", "!=", "=>"], answer: 1 },
  { q: "Quelle structure répète du code?", opts: ["if", "switch", "for", "try"], answer: 2 },
  { q: "Quel type de donnée est 'true'?", opts: ["String", "Number", "Boolean", "Object"], answer: 2 },
];

export default function App() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState('');

  const answer = useCallback((i) => {
    const correct = i === CHALLENGES[idx].answer;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : '❌ Mauvaise réponse');
    setTimeout(() => {
      setFeedback('');
      if (idx + 1 < CHALLENGES.length) setIdx(idx + 1);
      else setDone(true);
    }, 1000);
  }, [idx]);

  if (done) return (
    <div className="app">
      <div className="header"><h1>🎮 Code Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Partie terminée !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{CHALLENGES.length}</p>
        <button onClick={() => { setIdx(0); setScore(0); setDone(false); }}>Rejouer</button>
      </div>
    </div>
  );

  const c = CHALLENGES[idx];
  return (
    <div className="app">
      <div className="header"><h1>🎮 Code Game</h1><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span></div>
      <div className="card">
        <p style={{color:'var(--text2)',marginBottom:8}}>Question {idx+1}/{CHALLENGES.length}</p>
        <h2 style={{marginBottom:20}}>{c.q}</h2>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
          {c.opts.map((o, i) => <button key={i} onClick={() => answer(i)} style={{padding:16}}>{o}</button>)}
        </div>
        {feedback && <p style={{textAlign:'center',marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}