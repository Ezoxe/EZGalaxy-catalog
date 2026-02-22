import { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => { fetch('/health').then(r => r.json()).then(setHealth); }, []);
  return (
    <div className="app">
      <div className="header"><h1>🧪 Test App</h1></div>
      <div className="card">
        <h2>Status</h2>
        <pre style={{marginTop:12, color:'var(--success)'}}>{JSON.stringify(health, null, 2)}</pre>
      </div>
    </div>
  );
}