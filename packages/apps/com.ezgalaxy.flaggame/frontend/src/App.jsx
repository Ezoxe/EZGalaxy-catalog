import { useState, useEffect, useCallback } from 'react';
import { storage, appStorage } from './api.js';

const FLAGS = [
  ['🇫🇷','France'],['🇩🇪','Allemagne'],['🇮🇹','Italie'],['🇪🇸','Espagne'],['🇬🇧','Royaume-Uni'],
  ['🇯🇵','Japon'],['🇧🇷','Brésil'],['🇨🇦','Canada'],['🇦🇺','Australie'],['🇮🇳','Inde'],
  ['🇷🇺','Russie'],['🇲🇽','Mexique'],['🇰🇷','Corée du Sud'],['🇹🇷','Turquie'],['🇪🇬','Égypte'],
  ['🇲🇦','Maroc'],['🇹🇭','Thaïlande'],['🇵🇹','Portugal'],['🇳🇱','Pays-Bas'],['🇸🇪','Suède'],
  ['🇳🇴','Norvège'],['🇩🇰','Danemark'],['🇫🇮','Finlande'],['🇵🇱','Pologne'],['🇬🇷','Grèce'],
  ['🇨🇭','Suisse'],['🇧🇪','Belgique'],['🇦🇷','Argentine'],['🇨🇴','Colombie'],['🇨🇱','Chili'],
];

function shuffle(a) { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }

export default function App() {
  const [mode, setMode] = useState(null); // 'easy','normal','hard'
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);
  const [input, setInput] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [username, setUsername] = useState('');

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await appStorage.list('leaderboard', { limit: 20, sort_by: 'updated_at', sort_order: 'desc' });
      const items = (res.items || []).map(i => i.data).sort((a,b) => (b.score||0) - (a.score||0));
      setLeaderboard(items);
    } catch(e) {}
  }, []);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const start = (m) => {
    setMode(m); setScore(0); setLives(3); setIdx(0); setDone(false); setFeedback('');
    const count = m === 'easy' ? 10 : m === 'normal' ? 15 : 20;
    const qs = shuffle(FLAGS).slice(0, count).map(([flag, country]) => {
      const wrongs = shuffle(FLAGS.filter(f => f[1] !== country)).slice(0, 3).map(f => f[1]);
      const opts = shuffle([country, ...wrongs]);
      return { flag, country, opts };
    });
    setQuestions(qs);
  };

  const answer = (ans) => {
    const correct = ans === questions[idx].country;
    if (correct) { setScore(s => s + 1); setFeedback('✅ Correct !'); }
    else { setLives(l => l - 1); setFeedback(`❌ C'était ${questions[idx].country}`); }
    setTimeout(() => {
      setFeedback('');
      if (!correct && lives <= 1) { setDone(true); return; }
      if (idx + 1 >= questions.length) { setDone(true); return; }
      setIdx(i => i + 1);
    }, 1000);
  };

  const submitScore = async () => {
    if (!username.trim()) return;
    await appStorage.set('leaderboard', 'score-' + Date.now(), { name: username, score, mode, date: new Date().toISOString() });
    loadLeaderboard();
  };

  if (!mode) return (
    <div className="app">
      <div className="header"><h1>🏁 Flag Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2 style={{marginBottom:20}}>Choisis un mode</h2>
        <div className="flex" style={{justifyContent:'center'}}>
          <button onClick={() => start('easy')} style={{background:'var(--success)'}}>Facile (10)</button>
          <button onClick={() => start('normal')} style={{background:'var(--warning)',color:'#000'}}>Normal (15)</button>
          <button onClick={() => start('hard')} style={{background:'var(--danger)'}}>Difficile (20)</button>
        </div>
      </div>
      {leaderboard.length > 0 && <div className="card" style={{marginTop:16}}>
        <h3>🏆 Classement</h3>
        {leaderboard.slice(0,10).map((l,i) => <div key={i} className="flex" style={{justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
          <span>{i+1}. {l.name}</span><span style={{color:'var(--accent2)'}}>{l.score} pts ({l.mode})</span>
        </div>)}
      </div>}
    </div>
  );

  if (done) return (
    <div className="app">
      <div className="header"><h1>🏁 Flag Game</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Partie terminée !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{questions.length}</p>
        <div className="flex" style={{justifyContent:'center',marginBottom:16}}>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ton pseudo" style={{maxWidth:200}} />
          <button onClick={submitScore} style={{background:'var(--success)'}}>Envoyer score</button>
        </div>
        <button onClick={() => setMode(null)}>Retour</button>
      </div>
    </div>
  );

  const q = questions[idx];
  return (
    <div className="app">
      <div className="header">
        <h1>🏁 Flag Game</h1>
        <div className="flex"><span className="badge" style={{background:'var(--accent)'}}>{score} pts</span><span className="badge" style={{background:'var(--danger)'}}>{'❤️'.repeat(lives)}</span></div>
      </div>
      <div className="card" style={{textAlign:'center'}}>
        <p style={{color:'var(--text2)'}}>Question {idx+1}/{questions.length} • {mode}</p>
        <p style={{fontSize:96,margin:'20px 0'}}>{q.flag}</p>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr',maxWidth:500,margin:'0 auto'}}>
          {q.opts.map((o, i) => <button key={i} onClick={() => answer(o)} style={{padding:16}}>{o}</button>)}
        </div>
        {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
      </div>
    </div>
  );
}