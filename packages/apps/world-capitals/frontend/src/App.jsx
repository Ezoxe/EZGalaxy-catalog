import { useState, useCallback } from 'react';

const DATA = [
  ["France","Paris"],["Allemagne","Berlin"],["Espagne","Madrid"],["Italie","Rome"],
  ["Portugal","Lisbonne"],["Royaume-Uni","Londres"],["Japon","Tokyo"],["Chine","Pékin"],
  ["Brésil","Brasília"],["Canada","Ottawa"],["Australie","Canberra"],["Inde","New Delhi"],
  ["Russie","Moscou"],["Mexique","Mexico"],["Argentine","Buenos Aires"],["Égypte","Le Caire"],
  ["Maroc","Rabat"],["Turquie","Ankara"],["Corée du Sud","Séoul"],["Thaïlande","Bangkok"],
];

function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export default function App() {
  const [questions] = useState(() => shuffle(DATA).slice(0, 10));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);

  const check = useCallback(() => {
    const correct = input.trim().toLowerCase() === questions[idx][1].toLowerCase();
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : `❌ C'était ${questions[idx][1]}`);
    setTimeout(() => {
      setFeedback(''); setInput('');
      if (idx + 1 < questions.length) setIdx(idx + 1);
      else setDone(true);
    }, 1500);
  }, [idx, input, questions]);

  if (done) return (
    <div className="app">
      <div className="header"><h1>🌍 Capitales du Monde</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Score final : {score}/{questions.length}</h2>
        <button onClick={() => window.location.reload()} style={{marginTop:16}}>Rejouer</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="header"><h1>🌍 Capitales du Monde</h1><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span></div>
      <div className="card" style={{textAlign:'center'}}>
        <p style={{color:'var(--text2)'}}>Question {idx+1}/{questions.length}</p>
        <h2 style={{margin:'20px 0'}}>Quelle est la capitale de {questions[idx][0]} ?</h2>
        <div className="flex" style={{justifyContent:'center'}}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && check()} placeholder="Votre réponse..." style={{maxWidth:300}} />
          <button onClick={check}>Valider</button>
        </div>
        {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}