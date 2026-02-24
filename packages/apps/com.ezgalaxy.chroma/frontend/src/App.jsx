import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * c).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function luminance(hex) {
  const {r,g,b} = hexToRgb(hex);
  const [rs,gs,bs] = [r,g,b].map(c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); });
  return 0.2126*rs + 0.7152*gs + 0.0722*bs;
}

function contrastRatio(c1, c2) {
  const l1 = luminance(c1), l2 = luminance(c2);
  const lighter = Math.max(l1,l2), darker = Math.min(l1,l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

export default function App() {
  const [baseHue, setBaseHue] = useState(260);
  const [harmony, setHarmony] = useState('complementary');
  const [palettes, setPalettes] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await storage.list('palettes', { limit: 30 });
      setPalettes((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch (e) { console.error('Chroma: load failed', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const harmonies = {
    complementary: [0, 180],
    analogous: [-30, 0, 30],
    triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210],
    tetradic: [0, 90, 180, 270],
  };

  const colors = harmonies[harmony].map(offset => {
    const h = (baseHue + offset) % 360;
    return [hslToHex(h, 70, 50), hslToHex(h, 60, 40), hslToHex(h, 80, 60), hslToHex(h, 50, 70), hslToHex(h, 40, 30)];
  }).flat();

  const savePalette = async () => {
    try {
      await storage.set('palettes', 'palette-' + Date.now(), { harmony, baseHue, colors, date: new Date().toISOString() });
      load();
    } catch (e) { console.error('Chroma: save failed', e); }
  };

  const exportCSS = () => {
    const css = colors.map((c, i) => `  --color-${i}: ${c};`).join('\n');
    navigator.clipboard?.writeText(`:root {\n${css}\n}`);
    alert('CSS copié !');
  };

  return (
    <div className="app">
      <div className="header"><h1>🎨 ChromaLab</h1></div>
      <div className="card" style={{marginBottom:16}}>
        <div className="flex" style={{flexWrap:'wrap'}}>
          <label>Teinte: <input type="range" min="0" max="359" value={baseHue} onChange={e => setBaseHue(+e.target.value)} style={{width:200}} /> {baseHue}°</label>
          <select value={harmony} onChange={e => setHarmony(e.target.value)}>
            {Object.keys(harmonies).map(h => <option key={h}>{h}</option>)}
          </select>
          <button onClick={savePalette} style={{background:'var(--success)'}}>💾 Sauver</button>
          <button onClick={exportCSS}>📋 CSS</button>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',marginBottom:24}}>
        {colors.map((c, i) => (
          <div key={i} style={{textAlign:'center'}}>
            <div style={{width:'100%',paddingTop:'100%',background:c,borderRadius:'var(--radius)',cursor:'pointer',position:'relative'}} onClick={() => { navigator.clipboard?.writeText(c); }}>
              <span style={{position:'absolute',bottom:4,left:0,right:0,fontSize:10,color: luminance(c) > 0.5 ? '#000' : '#fff'}}>{c}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16}}>
        <h3>Contraste WCAG</h3>
        <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',marginTop:12}}>
          {colors.slice(0,4).map((c, i) => {
            const ratio = contrastRatio(c, '#ffffff');
            const pass = parseFloat(ratio) >= 4.5;
            return <div key={i} style={{padding:12,background:c,borderRadius:8,textAlign:'center'}}>
              <span style={{color:'#fff',fontSize:12}}>{ratio}:1</span>
              <span className="badge" style={{background: pass?'var(--success)':'var(--danger)',display:'block',marginTop:4}}>{pass?'AA ✓':'Fail'}</span>
            </div>;
          })}
        </div>
      </div>
      {palettes.length > 0 && <div className="card">
        <h3>Palettes sauvegardées</h3>
        {palettes.map(p => (
          <div key={p.key} className="flex" style={{marginTop:8}}>
            {(p.colors||[]).slice(0,6).map((c,i) => <div key={i} style={{width:24,height:24,borderRadius:'50%',background:c}} />)}
            <span style={{color:'var(--text2)',fontSize:12,marginLeft:8}}>{p.harmony}</span>
            <button onClick={() => setBaseHue(p.baseHue)} style={{fontSize:11,padding:'2px 8px',background:'var(--surface2)',marginLeft:'auto'}}>Charger</button>
          </div>
        ))}
      </div>}
    </div>
  );
}