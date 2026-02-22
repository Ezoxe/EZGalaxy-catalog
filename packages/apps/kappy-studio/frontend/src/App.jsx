import { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#6c5ce7');

  return (
    <div className="app">
      <div className="header"><h1>🎨 Kappy Studio</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <h3 style={{marginBottom:12}}>Paramètres</h3>
        <div className="flex" style={{flexWrap:'wrap'}}>
          <label>Taille: <input type="range" min="10" max="72" value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{width:150}} /></label>
          <label>Couleur: <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{width:50,height:36}} /></label>
        </div>
      </div>
      <div className="card">
        <textarea rows={6} placeholder="Écrivez votre texte ici..." value={text} onChange={e => setText(e.target.value)} style={{marginBottom:16}} />
        <div style={{padding:24,background:'var(--bg)',borderRadius:'var(--radius)',fontSize,color,minHeight:100,whiteSpace:'pre-wrap'}}>
          {text || 'Aperçu...'}
        </div>
      </div>
    </div>
  );
}