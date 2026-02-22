import { useState, useRef, useEffect, useCallback } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([
    { id: 1, x: 200, y: 150, label: 'Router', type: 'router' },
    { id: 2, x: 400, y: 100, label: 'Server', type: 'server' },
    { id: 3, x: 400, y: 250, label: 'PC-1', type: 'pc' },
    { id: 4, x: 600, y: 150, label: 'PC-2', type: 'pc' },
  ]);
  const [links, setLinks] = useState([{from:1,to:2},{from:1,to:3},{from:2,to:4}]);
  const [dragging, setDragging] = useState(null);
  const [tool, setTool] = useState('move');
  const nextId = useRef(5);

  const colors = { router: '#6c5ce7', server: '#00d2d3', pc: '#feca57' };

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = c.parentElement.clientWidth; c.height = 400;
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, c.width, c.height);
    // links
    ctx.strokeStyle = '#2a2a5a'; ctx.lineWidth = 2;
    links.forEach(l => {
      const a = nodes.find(n => n.id === l.from), b = nodes.find(n => n.id === l.to);
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    });
    // nodes
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = colors[n.type] || '#6c5ce7'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + 40);
    });
  }, [nodes, links]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (tool === 'move') {
      const n = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 28);
      if (n) setDragging(n.id);
    } else if (tool === 'add') {
      setNodes(ns => [...ns, { id: nextId.current++, x, y, label: 'Node-' + nextId.current, type: 'pc' }]);
    }
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setNodes(ns => ns.map(n => n.id === dragging ? { ...n, x: e.clientX - rect.left, y: e.clientY - rect.top } : n));
  };
  const onMouseUp = () => setDragging(null);

  return (
    <div className="app">
      <div className="header"><h1>🌐 Network Simulator</h1></div>
      <div className="flex" style={{marginBottom:16}}>
        <button onClick={() => setTool('move')} style={{background: tool==='move'?'var(--accent)':'var(--surface2)'}}>🖱 Déplacer</button>
        <button onClick={() => setTool('add')} style={{background: tool==='add'?'var(--accent)':'var(--surface2)'}}>➕ Ajouter</button>
        <button onClick={() => { setNodes(ns => ns.slice(0, -1)); }}>🗑 Supprimer dernier</button>
      </div>
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <canvas ref={canvasRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} style={{display:'block',width:'100%',cursor: tool==='add'?'crosshair':'grab'}} />
      </div>
      <div className="flex" style={{marginTop:12,flexWrap:'wrap'}}>
        {Object.entries(colors).map(([k,v]) => <span key={k} className="badge" style={{background:v,color:'#000'}}>{k}</span>)}
        <span style={{color:'var(--text2)',fontSize:12}}>{nodes.length} nœuds, {links.length} liens</span>
      </div>
    </div>
  );
}