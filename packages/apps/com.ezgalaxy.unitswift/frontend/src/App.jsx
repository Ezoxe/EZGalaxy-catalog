import { useState } from 'react';

const CATEGORIES = {
  Longueur: { m:1, km:1000, cm:0.01, mm:0.001, mi:1609.344, ft:0.3048, in:0.0254, yd:0.9144 },
  Poids: { kg:1, g:0.001, mg:0.000001, lb:0.453592, oz:0.0283495, t:1000 },
  Température: { C:'c', F:'f', K:'k' },
  Volume: { L:1, mL:0.001, gal:3.78541, qt:0.946353, pt:0.473176, cup:0.236588, tbsp:0.0147868, tsp:0.00492892 },
  Surface: { 'm²':1, 'km²':1e6, 'cm²':1e-4, ha:1e4, acre:4046.86, 'ft²':0.092903 },
  Vitesse: { 'm/s':1, 'km/h':0.277778, mph:0.44704, knot:0.514444 },
  Données: { B:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776 },
};

function convertTemp(value, from, to) {
  let celsius;
  if (from === 'C') celsius = value;
  else if (from === 'F') celsius = (value - 32) * 5/9;
  else celsius = value - 273.15;
  if (to === 'C') return celsius;
  if (to === 'F') return celsius * 9/5 + 32;
  return celsius + 273.15;
}

export default function App() {
  const [cat, setCat] = useState('Longueur');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('km');
  const [value, setValue] = useState('1');

  const units = Object.keys(CATEGORIES[cat]);

  const convert = () => {
    const v = parseFloat(value);
    if (isNaN(v)) return '';
    if (cat === 'Température') return convertTemp(v, from, to).toFixed(4);
    const factors = CATEGORIES[cat];
    return ((v * factors[from]) / factors[to]).toFixed(6).replace(/\.?0+$/, '');
  };

  return (
    <div className="app">
      <div className="header"><h1>🔄 UnitSwift</h1></div>
      <div className="flex" style={{marginBottom:16,flexWrap:'wrap'}}>
        {Object.keys(CATEGORIES).map(c => (
          <button key={c} onClick={() => { setCat(c); const u = Object.keys(CATEGORIES[c]); setFrom(u[0]); setTo(u[1]); }} style={{background: cat===c?'var(--accent)':'var(--surface2)',fontSize:12}}>{c}</button>
        ))}
      </div>
      <div className="card">
        <div className="grid" style={{gridTemplateColumns:'1fr auto 1fr',alignItems:'center'}}>
          <div>
            <input type="number" value={value} onChange={e => setValue(e.target.value)} style={{fontSize:24,textAlign:'center',marginBottom:8}} />
            <select value={from} onChange={e => setFrom(e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select>
          </div>
          <button onClick={() => { setFrom(to); setTo(from); }} style={{background:'var(--surface2)',fontSize:20,width:48,height:48,borderRadius:'50%',padding:0}}>⇄</button>
          <div>
            <p style={{fontSize:24,textAlign:'center',color:'var(--accent2)',fontWeight:700,padding:'10px 14px',marginBottom:8}}>{convert()}</p>
            <select value={to} onChange={e => setTo(e.target.value)}>{units.map(u => <option key={u}>{u}</option>)}</select>
          </div>
        </div>
      </div>
      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginBottom:12}}>Toutes les conversions</h3>
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))'}}>
          {units.filter(u => u !== from).map(u => {
            const v = parseFloat(value);
            let result;
            if (cat === 'Température') result = convertTemp(v || 0, from, u).toFixed(2);
            else result = ((v || 0) * CATEGORIES[cat][from] / CATEGORIES[cat][u]).toFixed(4).replace(/\.?0+$/, '');
            return <div key={u} style={{padding:8,background:'var(--surface2)',borderRadius:8,textAlign:'center'}}>
              <p style={{color:'var(--accent2)',fontWeight:700}}>{result}</p>
              <p style={{color:'var(--text2)',fontSize:12}}>{u}</p>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}