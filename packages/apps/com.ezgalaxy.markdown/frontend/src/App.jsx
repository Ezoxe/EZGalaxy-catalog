import { useState, useEffect, useCallback } from 'react';
import { storage } from './api.js';

function renderMd(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--surface2);padding:2px 6px;border-radius:4px">$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid var(--accent);padding-left:12px;color:var(--text2)">$1</blockquote>')
    .replace(/\n/g, '<br/>');
}

export default function App() {
  const [docs, setDocs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');

  const load = useCallback(async () => {
    const res = await storage.list('documents', { limit: 50, sort_by: 'updated_at', sort_order: 'desc' });
    setDocs((res.items || []).map(i => ({ key: i.record_key, ...i.data })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const key = current || 'doc-' + Date.now();
    await storage.set('documents', key, { title: title || 'Sans titre', content: text, updated: new Date().toISOString() });
    setCurrent(key); load();
  };

  const open = (d) => { setCurrent(d.key); setText(d.content || ''); setTitle(d.title || ''); };
  const newDoc = () => { setCurrent(null); setText(''); setTitle(''); };
  const remove = async (key) => { await storage.delete('documents', key); if (current === key) newDoc(); load(); };

  const toolbar = [
    ['# ', 'H1'], ['## ', 'H2'], ['**', 'Gras'], ['*', 'Italique'], ['\n- ', 'Liste'], ['\n> ', 'Citation'], ['`', 'Code']
  ];

  return (
    <div className="app">
      <div className="header">
        <h1>📝 MarkDown Studio</h1>
        <div className="flex">
          <button onClick={newDoc} style={{background:'var(--surface2)'}}>📄 Nouveau</button>
          <button onClick={save} style={{background:'var(--success)'}}>💾 Sauver</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr 1fr',gap:16,minHeight:'70vh'}}>
        <div className="card" style={{overflow:'auto',maxHeight:'75vh'}}>
          <h3 style={{marginBottom:8}}>Documents</h3>
          {docs.map(d => (
            <div key={d.key} style={{padding:'8px',cursor:'pointer',borderRadius:8,background: current===d.key?'var(--surface2)':'transparent',marginBottom:4}} onClick={() => open(d)}>
              <p style={{fontSize:13}}>{d.title || 'Sans titre'}</p>
              <div className="flex"><span style={{fontSize:10,color:'var(--text2)'}}>{new Date(d.updated).toLocaleDateString()}</span>
              <button onClick={e => { e.stopPropagation(); remove(d.key); }} style={{fontSize:10,padding:'2px 6px',background:'var(--danger)'}}>×</button></div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du document" />
          <div className="flex" style={{flexWrap:'wrap'}}>
            {toolbar.map(([s, label]) => <button key={label} onClick={() => setText(text + s)} style={{fontSize:11,padding:'4px 8px',background:'var(--surface2)'}}>{label}</button>)}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} style={{flex:1,fontFamily:'monospace',resize:'none'}} placeholder="Écrivez en Markdown..." />
        </div>
        <div className="card" style={{overflow:'auto'}}>
          <div dangerouslySetInnerHTML={{ __html: renderMd(text) }} />
        </div>
      </div>
    </div>
  );
}