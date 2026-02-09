/**
 * Game Studio — Unified Asset Library Browser
 * Central registry + search + thumbnail generation
 */
(function(){'use strict';
const thumbCache=new Map();

/* ── Generate thumbnail canvas for any asset ── */
function generateThumb(type,id,size=48){
  const key=type+'_'+id+'_'+size;
  if(thumbCache.has(key))return thumbCache.get(key);
  const cvs=document.createElement('canvas');cvs.width=size;cvs.height=size;
  const ctx=cvs.getContext('2d');

  if(type==='sprite'){
    const sp=window.Sprites?.sprites[id];
    if(sp)sp.draw(ctx,size/2,size/2,size);
  }else if(type==='tile'){
    const tile=window.Tiles?.create(id);
    if(tile){ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,0,0,size,size)}
  }else if(type==='particle'){
    const p=window.Particles?.presets[id];
    if(p){
      const colors=p.colors||[p.color||'#fff'];
      colors.forEach((col,i)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(size/2+(i-1)*6,size/2,size/6,0,Math.PI*2);ctx.fill()});
    }
  }else if(type==='animation'){
    ctx.fillStyle='#0ea5a4';ctx.font=`${size*0.5}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('▶',size/2,size/2);
  }else if(type==='sound'){
    ctx.fillStyle='#0ea5a4';ctx.font=`${size*0.4}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🔊',size/2,size/2);
  }else if(type==='model3d'){
    ctx.fillStyle='#0ea5a4';ctx.font=`${size*0.25}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('3D',size/2,size/2);
    ctx.strokeStyle='#0ea5a4';ctx.lineWidth=1;ctx.strokeRect(size*0.2,size*0.2,size*0.6,size*0.6);
  }
  thumbCache.set(key,cvs);
  return cvs;
}

/* ── Unified asset list ── */
function getAllAssets(){
  const all=[];
  if(window.Sprites){window.Sprites.getSpriteList().forEach(s=>all.push({type:'sprite',id:s.id,name:s.name,category:s.category,tags:s.tags||[]}))}
  if(window.Models3D){window.Models3D.getList().forEach(m=>all.push({type:'model3d',id:m.id,name:m.name,category:m.category,tags:m.tags||[]}))}
  if(window.Audio){window.Audio.getList().forEach(s=>all.push({type:'sound',id:s.id,name:s.name,category:s.category,tags:s.tags||[]}))}
  if(window.Tiles){window.Tiles.getList().forEach(t=>all.push({type:'tile',id:t.id,name:t.name,category:t.category,tags:[]}))}
  if(window.Particles){window.Particles.getList().forEach(p=>all.push({type:'particle',id:p.id,name:p.name,category:p.category,tags:[]}))}
  if(window.Animations){window.Animations.getList().forEach(a=>all.push({type:'animation',id:a.id,name:a.name,category:a.category,tags:[]}))}
  return all;
}

function search(query){
  const q=query.toLowerCase();
  return getAllAssets().filter(a=>a.name.toLowerCase().includes(q)||a.category.toLowerCase().includes(q)||(a.tags||[]).some(t=>t.toLowerCase().includes(q)));
}

function getAssetTypes(){
  return[
    {id:'sprite',name:'Sprites 2D',icon:'brush'},
    {id:'model3d',name:'Modèles 3D',icon:'3d'},
    {id:'sound',name:'Sons',icon:'music'},
    {id:'tile',name:'Tuiles',icon:'tilemap'},
    {id:'particle',name:'Particules',icon:'particle'},
    {id:'animation',name:'Animations',icon:'animation'}
  ];
}

function getByType(type){return getAllAssets().filter(a=>a.type===type)}

/* ── Build browser panel UI ── */
function createBrowserPanel(onSelect){
  const el=window.UI.el;
  const panel=el('div',{className:'asset-browser'});
  const searchInput=el('input',{type:'text',placeholder:'Rechercher un asset...',className:'asset-search'});
  const typeBar=el('div',{className:'asset-type-bar'});
  const grid=el('div',{className:'asset-grid'});

  let currentType='sprite';let currentQuery='';

  function renderGrid(){
    grid.innerHTML='';
    let assets=currentQuery?search(currentQuery).filter(a=>a.type===currentType):getByType(currentType);
    if(assets.length===0){grid.appendChild(el('div',{className:'asset-empty',textContent:'Aucun asset trouvé'}));return}
    assets.forEach(asset=>{
      const card=el('div',{className:'asset-card',title:asset.name});
      const thumb=generateThumb(asset.type,asset.id,48);
      card.appendChild(thumb.cloneNode?thumb.cloneNode(true):thumb);
      card.appendChild(el('span',{className:'asset-card-name',textContent:asset.name}));
      card.onclick=()=>{
        grid.querySelectorAll('.asset-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        if(onSelect)onSelect(asset);
        if(asset.type==='sound')window.Audio?.play(asset.id);
      };
      card.draggable=true;
      card.ondragstart=(e)=>{e.dataTransfer.setData('application/json',JSON.stringify(asset));e.dataTransfer.effectAllowed='copy'};
      grid.appendChild(card);
    });
  }

  function renderTypes(){
    typeBar.innerHTML='';
    getAssetTypes().forEach(t=>{
      const btn=el('button',{className:'asset-type-btn'+(currentType===t.id?' active':''),textContent:t.name});
      btn.onclick=()=>{currentType=t.id;typeBar.querySelectorAll('.asset-type-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderGrid()};
      typeBar.appendChild(btn);
    });
  }

  searchInput.oninput=()=>{currentQuery=searchInput.value;renderGrid()};
  panel.appendChild(searchInput);panel.appendChild(typeBar);panel.appendChild(grid);
  renderTypes();renderGrid();
  panel.refresh=renderGrid;
  return panel;
}

window.AssetLibrary={getAllAssets,search,getAssetTypes,getByType,generateThumb,createBrowserPanel};
})();
