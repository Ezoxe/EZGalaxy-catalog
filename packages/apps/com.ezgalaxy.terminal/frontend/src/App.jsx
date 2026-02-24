import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

const PRESETS = {
  'Dracula': { bg:'#282a36', fg:'#f8f8f2', c0:'#21222c', c1:'#ff5555', c2:'#50fa7b', c3:'#f1fa8c', c4:'#bd93f9', c5:'#ff79c6', c6:'#8be9fd', c7:'#f8f8f2' },
  'Nord': { bg:'#2e3440', fg:'#d8dee9', c0:'#3b4252', c1:'#bf616a', c2:'#a3be8c', c3:'#ebcb8b', c4:'#81a1c1', c5:'#b48ead', c6:'#88c0d0', c7:'#e5e9f0' },
  'Gruvbox': { bg:'#282828', fg:'#ebdbb2', c0:'#282828', c1:'#cc241d', c2:'#98971a', c3:'#d79921', c4:'#458588', c5:'#b16286', c6:'#689d6a', c7:'#a89984' },
  'Solarized': { bg:'#002b36', fg:'#839496', c0:'#073642', c1:'#dc322f', c2:'#859900', c3:'#b58900', c4:'#268bd2', c5:'#d33682', c6:'#2aa198', c7:'#eee8d5' },
};

export default function App() {
  const [colors, setColors] = useState(PRESETS['Dracula']);
  const [name, setName] = useState('Mon Thème');
  const [format, setFormat] = useState('kitty');
  const [saved, setSaved] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await storage.list('themes', { limit: 50 });
      setSaved((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
    } catch (e) { console.error('Terminal: load failed', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await storage.set('themes', 'theme-' + Date.now(), { name, colors, format });
      load();
    } catch (e) { console.error('Terminal: save failed', e); }
  };

  const exportTheme = () => {
    let out = '';
    const c = colors;
    if (format === 'kitty') { out = `background ${c.bg}\nforeground ${c.fg}\ncolor0 ${c.c0}\ncolor1 ${c.c1}\ncolor2 ${c.c2}\ncolor3 ${c.c3}\ncolor4 ${c.c4}\ncolor5 ${c.c5}\ncolor6 ${c.c6}\ncolor7 ${c.c7}`; }
    else if (format === 'alacritty') { out = `[colors.primary]\nbackground = "${c.bg}"\nforeground = "${c.fg}"\n[colors.normal]\nblack = "${c.c0}"\nred = "${c.c1}"\ngreen = "${c.c2}"\nyellow = "${c.c3}"\nblue = "${c.c4}"\nmagenta = "${c.c5}"\ncyan = "${c.c6}"\nwhite = "${c.c7}"`; }
    else { out = JSON.stringify({ name, colors: c }, null, 2); }
    navigator.clipboard?.writeText(out);
    alert('Copié !');
  };

  return (
    <div className="app">
      <div className="header"><h1>🖥 Terminal Customizer</h1></div>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="card">
          <h3 style={{marginBottom:12}}>Couleurs</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du thème" style={{marginBottom:12}} />
          {Object.entries(colors).map(([k, v]) => (
            <div key={k} className="flex" style={{marginBottom:8}}>
              <label style={{width:30,color:'var(--text2)'}}>{k}</label>
              <input type="color" value={v} onChange={e => setColors({...colors, [k]: e.target.value})} style={{width:50,height:32}} />
              <input value={v} onChange={e => setColors({...colors, [k]: e.target.value})} style={{width:100}} />
            </div>
          ))}
          <div className="flex" style={{marginTop:12,flexWrap:'wrap'}}>
            {Object.keys(PRESETS).map(p => <button key={p} onClick={() => setColors(PRESETS[p])} style={{background:'var(--surface2)',fontSize:12}}>{p}</button>)}
          </div>
        </div>
        <div>
          <div className="card" style={{marginBottom:16}}>
            <h3 style={{marginBottom:12}}>Aperçu</h3>
            <div style={{background: colors.bg, color: colors.fg, padding: 16, borderRadius: 'var(--radius)', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6}}>
              <div><span style={{color: colors.c2}}>user@host</span>:<span style={{color: colors.c4}}>~</span>$ echo "Hello"</div>
              <div style={{color: colors.fg}}>Hello</div>
              <div><span style={{color: colors.c1}}>ERROR:</span> file not found</div>
              <div><span style={{color: colors.c3}}>WARNING:</span> deprecated</div>
              <div style={{color: colors.c5}}>→ 42 files processed</div>
              <div style={{color: colors.c6}}>✓ Build complete</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{marginBottom:12}}>Export</h3>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{marginBottom:12}}>
              <option value="kitty">Kitty</option>
              <option value="alacritty">Alacritty (TOML)</option>
              <option value="json">JSON</option>
            </select>
            <div className="flex">
              <button onClick={exportTheme}>📋 Copier</button>
              <button onClick={save} style={{background:'var(--success)'}}>💾 Sauvegarder</button>
            </div>
          </div>
        </div>
      </div>
      {saved.length > 0 && <div className="card" style={{marginTop:16}}>
        <h3>Thèmes sauvegardés</h3>
        {saved.map(s => <div key={s.key} className="flex" style={{marginTop:8,justifyContent:'space-between'}}>
          <span>{s.name}</span>
          <button onClick={() => { setColors(s.colors); setName(s.name); }} style={{fontSize:12}}>Charger</button>
        </div>)}
      </div>}
    </div>
  );
}