import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <div className="header"><h1>🚀 EZGalaxy Example</h1></div>
      <div className="card" style={{textAlign:'center'}}>
        <h2>Page de démonstration</h2>
        <p style={{margin:'20px 0',color:'var(--text2)'}}>Cette application est un exemple de page EZGalaxy containerisée avec React + FastAPI.</p>
        <p style={{fontSize:'48px',margin:'20px 0'}}>{count}</p>
        <button onClick={() => setCount(c => c + 1)}>Incrémenter</button>
      </div>
    </div>
  );
}