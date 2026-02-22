import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const MODULES = [
  { id: 'binary', title: 'Binaire & Données', questions: [
    { q: 'Combien de bits dans un octet ?', opts: ['4','8','16','32'], answer: 1 },
    { q: 'Que vaut 1010 en décimal ?', opts: ['8','10','12','14'], answer: 1 },
    { q: 'Quel est le préfixe pour 1024 octets ?', opts: ['kilo','kibi','mega','giga'], answer: 1 },
  ]},
  { id: 'network', title: 'Réseaux', questions: [
    { q: "Quel protocole utilise le port 80 ?", opts: ['FTP','SSH','HTTP','SMTP'], answer: 2 },
    { q: "Quelle couche OSI gère le routage ?", opts: ['1','2','3','4'], answer: 2 },
    { q: "Que signifie DNS ?", opts: ['Domain Name System','Data Network Service','Digital Name Server','Domain Node System'], answer: 0 },
  ]},
  { id: 'security', title: 'Cybersécurité', questions: [
    { q: "Qu'est-ce qu'un firewall ?", opts: ['Antivirus','Pare-feu','VPN','Proxy'], answer: 1 },
    { q: "Quel type d'attaque vole des identifiants via email ?", opts: ['DDoS','Phishing','Brute Force','XSS'], answer: 1 },
    { q: "Que protège le chiffrement ?", opts: ['Vitesse','Confidentialité','Disponibilité','Performance'], answer: 1 },
  ]},
];

export default function App() {
  const [progress, setProgress] = useState({});
  const [activeModule, setActiveModule] = useState(null);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await storage.getData('progress');
      if (res) setProgress(res);
    } catch(e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const startModule = (m) => { setActiveModule(m); setQIdx(0); setScore(0); setDone(false); setFeedback(''); };

  const answer = async (i) => {
    const correct = i === activeModule.questions[qIdx].answer;
    if (correct) setScore(s => s + 1);
    setFeedback(correct ? '✅ Correct !' : '❌ Mauvaise réponse');
    setTimeout(async () => {
      setFeedback('');
      if (qIdx + 1 < activeModule.questions.length) { setQIdx(qIdx + 1); }
      else {
        setDone(true);
        const newProgress = { ...progress, [activeModule.id]: Math.max(progress[activeModule.id] || 0, score + (correct ? 1 : 0)) };
        setProgress(newProgress);
        await storage.setData('progress', newProgress);
      }
    }, 1000);
  };

  const totalBadges = MODULES.filter(m => (progress[m.id] || 0) === m.questions.length).length;

  if (activeModule && !done) {
    const q = activeModule.questions[qIdx];
    return (
      <div className="app">
        <div className="header"><h1>💻 {activeModule.title}</h1><button onClick={() => setActiveModule(null)} style={{background:'var(--surface2)'}}>← Retour</button></div>
        <div className="card" style={{textAlign:'center'}}>
          <p style={{color:'var(--text2)'}}>Question {qIdx+1}/{activeModule.questions.length}</p>
          <h2 style={{margin:'20px 0'}}>{q.q}</h2>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr',maxWidth:500,margin:'0 auto'}}>
            {q.opts.map((o, i) => <button key={i} onClick={() => answer(i)} style={{padding:16}}>{o}</button>)}
          </div>
          {feedback && <p style={{marginTop:16,fontSize:18}}>{feedback}</p>}
        </div>
      </div>
    );
  }

  if (activeModule && done) return (
    <div className="app">
      <div className="header"><h1>💻 {activeModule.title}</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Module terminé !</h2>
        <p style={{fontSize:48,margin:'20px 0'}}>{score}/{activeModule.questions.length}</p>
        {score === activeModule.questions.length && <p style={{color:'var(--success)',fontSize:24}}>🏅 Badge obtenu !</p>}
        <button onClick={() => setActiveModule(null)} style={{marginTop:16}}>Retour aux modules</button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="header"><h1>💻 IT Discovery</h1><span className="badge" style={{background:'var(--success)'}}>🏅 {totalBadges} badges</span></div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}>
        {MODULES.map(m => (
          <div key={m.id} className="card" style={{cursor:'pointer'}} onClick={() => startModule(m)}>
            <h3>{m.title}</h3>
            <p style={{color:'var(--text2)',margin:'8px 0'}}>{m.questions.length} questions</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{flex:1,height:8,background:'var(--surface2)',borderRadius:4,marginRight:12}}>
                <div style={{width:`${((progress[m.id]||0)/m.questions.length)*100}%`,height:'100%',background:'var(--accent)',borderRadius:4}} />
              </div>
              <span style={{fontSize:12,color:'var(--text2)'}}>{progress[m.id]||0}/{m.questions.length}</span>
            </div>
            {(progress[m.id]||0) === m.questions.length && <span style={{color:'var(--success)'}}>🏅 Complété</span>}
          </div>
        ))}
      </div>
    </div>
  );
}