/**
 * Game Studio — Main Application
 * Layout, project management, menus, panels, welcome screen, export
 */
(function(){'use strict';
const UI=window.UI,Store=window.Store,Ed=window.Editor,E2D=window.Engine2D,
  S=window.Scripting,AL=window.AssetLibrary,Tpl=window.Templates;

let editor=null,currentProject=null,activeTab='scene';
let inspectorEl,scriptPanelEl,objectTreeEl,scenesListEl,assetBrowserEl,statusBarEl,toolbarEl;

/* ═══ Init ═══ */
function init(){
  buildLayout();
  showWelcome();
  setupAutoSave();
  window.addEventListener('beforeunload',()=>{if(currentProject)saveCurrentState()});
}

/* ═══ Layout ═══ */
function buildLayout(){
  const root=document.getElementById('app');root.innerHTML='';

  // Toolbar
  toolbarEl=el('div','toolbar');
  toolbarEl.innerHTML=`
    <div class="toolbar-group">
      <button class="tbtn" id="btn-menu" title="Menu">☰</button>
      <button class="tbtn" id="btn-new" title="Nouveau projet">📄</button>
      <button class="tbtn" id="btn-open" title="Ouvrir">📂</button>
      <button class="tbtn" id="btn-save" title="Sauvegarder">💾</button>
    </div>
    <div class="toolbar-group">
      <button class="tbtn active" id="btn-select" title="Sélection">🔲</button>
      <button class="tbtn" id="btn-move" title="Déplacer">✋</button>
      <button class="tbtn" id="btn-rotate" title="Rotation">🔄</button>
      <button class="tbtn" id="btn-scale" title="Échelle">↔️</button>
      <button class="tbtn" id="btn-brush" title="Pinceau tuiles">🖌️</button>
    </div>
    <div class="toolbar-group">
      <button class="tbtn" id="btn-grid" title="Grille On/Off">📐</button>
      <button class="tbtn" id="btn-snap" title="Snap On/Off">🧲</button>
    </div>
    <div class="toolbar-group">
      <button class="tbtn" id="btn-undo" title="Annuler (Ctrl+Z)">↩️</button>
      <button class="tbtn" id="btn-redo" title="Refaire (Ctrl+Y)">↪️</button>
    </div>
    <div class="toolbar-group toolbar-right">
      <button class="tbtn btn-play" id="btn-test" title="Tester (F5)">▶️ Tester</button>
      <button class="tbtn" id="btn-export" title="Exporter">📦 Exporter</button>
      <button class="tbtn" id="btn-cloud" title="Cloud">☁️</button>
    </div>
  `;
  root.appendChild(toolbarEl);

  // Main area
  const main=el('div','main-area');

  // Left sidebar (scenes + objects)
  const leftBar=el('div','sidebar sidebar-left');
  leftBar.innerHTML='<div class="sidebar-tabs"><button class="stab active" data-tab="scenes">Scènes</button><button class="stab" data-tab="objects">Objets</button></div>';
  scenesListEl=el('div','sidebar-content scenes-panel');
  objectTreeEl=el('div','sidebar-content objects-panel hidden');
  leftBar.appendChild(scenesListEl);leftBar.appendChild(objectTreeEl);
  main.appendChild(leftBar);

  // Center (canvas)
  const center=el('div','center-area');
  const editorContainer=el('div','editor-container');
  center.appendChild(editorContainer);
  main.appendChild(center);

  // Right sidebar (inspector/scripts/assets)
  const rightBar=el('div','sidebar sidebar-right');
  rightBar.innerHTML='<div class="sidebar-tabs"><button class="stab active" data-tab="inspector">Propriétés</button><button class="stab" data-tab="scripts">Scripts</button><button class="stab" data-tab="assets">Assets</button></div>';
  inspectorEl=el('div','sidebar-content inspector-panel');
  scriptPanelEl=el('div','sidebar-content script-panel hidden');
  assetBrowserEl=el('div','sidebar-content asset-panel hidden');
  rightBar.appendChild(inspectorEl);rightBar.appendChild(scriptPanelEl);rightBar.appendChild(assetBrowserEl);
  main.appendChild(rightBar);

  root.appendChild(main);

  // Status bar
  statusBarEl=el('div','status-bar');
  statusBarEl.textContent='Game Studio — Prêt';
  root.appendChild(statusBarEl);

  // Bind toolbar events
  bindToolbar();
  bindSidebarTabs(leftBar);
  bindSidebarTabs(rightBar);

  // Create editor
  editor=new Ed.SceneEditor(editorContainer);
  editor.onSelect=(obj)=>{
    Ed.buildInspector(inspectorEl,obj,editor);
    Ed.buildScriptEditor(scriptPanelEl,obj,editor);
    if(objectTreeEl.parentElement)Ed.buildObjectTree(objectTreeEl,editor.scene,editor);
  };
  editor.onChange=()=>{
    if(objectTreeEl.parentElement)Ed.buildObjectTree(objectTreeEl,editor.scene,editor);
    setStatus('Modifié');
  };

  // Build asset browser
  if(AL){
    const panel=AL.createBrowserPanel((asset)=>{
      // Drop asset into scene
      if(!editor.scene)return;
      const obj=new E2D.GameObject2D('obj_'+Date.now(),editor.camera.x,editor.camera.y);
      obj.width=32;obj.height=32;
      if(asset.type==='sprite')obj.spriteId=asset.id;
      else if(asset.type==='3d')obj.data.model3d=asset.id;
      else if(asset.type==='tile')obj.spriteId=asset.id;
      editor.addObject(obj);
      UI.toast('Asset ajouté: '+asset.name,'success');
    });
    assetBrowserEl.appendChild(panel);
  }
}

function el(tag,cls){const e=document.createElement(tag);e.className=cls;return e}

function bindToolbar(){
  on('btn-new',()=>showNewProject());
  on('btn-open',()=>showOpenProject());
  on('btn-save',()=>saveProject());
  on('btn-select',()=>setTool('select'));
  on('btn-move',()=>{setTool('select');editor.setGizmoMode('move')});
  on('btn-rotate',()=>{setTool('select');editor.setGizmoMode('rotate')});
  on('btn-scale',()=>{setTool('select');editor.setGizmoMode('scale')});
  on('btn-brush',()=>setTool('brush'));
  on('btn-grid',()=>{editor.grid.visible=!editor.grid.visible});
  on('btn-snap',()=>{editor.grid.snap=!editor.grid.snap;UI.toast(editor.grid.snap?'Snap activé':'Snap désactivé')});
  on('btn-undo',()=>{editor.commands.undo()});
  on('btn-redo',()=>{editor.commands.redo()});
  on('btn-test',()=>toggleTest());
  on('btn-export',()=>exportProject());
  on('btn-cloud',()=>showCloudSync());
  on('btn-menu',()=>showMenu());

  window.addEventListener('keydown',e=>{
    if(e.key==='F5'){e.preventDefault();toggleTest()}
  });
}

function on(id,fn){const el=document.getElementById(id);if(el)el.addEventListener('click',fn)}

function setTool(tool){
  editor.setTool(tool);
  document.querySelectorAll('.toolbar-group .tbtn').forEach(b=>{
    if(['btn-select','btn-move','btn-rotate','btn-scale','btn-brush'].includes(b.id)){
      b.classList.toggle('active',
        (tool==='select'&&b.id==='btn-select')||
        (tool==='brush'&&b.id==='btn-brush'));
    }
  });
  if(tool==='brush'){editor.brush.active=true;UI.toast('Mode pinceau activé')}
}

function bindSidebarTabs(sidebar){
  sidebar.querySelectorAll('.stab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      sidebar.querySelectorAll('.stab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      sidebar.querySelectorAll('.sidebar-content').forEach(c=>c.classList.add('hidden'));
      const target=tab.dataset.tab;
      sidebar.querySelector('.'+target+'-panel')?.classList.remove('hidden');
    });
  });
}

function setStatus(msg){if(statusBarEl)statusBarEl.textContent='Game Studio — '+msg}

/* ═══ Welcome Screen ═══ */
function showWelcome(){
  const overlay=el('div','welcome-overlay');
  overlay.innerHTML=`
    <div class="welcome-card">
      <h1>🎮 Game Studio</h1>
      <p>Créateur de mini-jeux vidéo</p>
      <div class="welcome-actions">
        <button class="btn btn-primary btn-lg" id="welcome-new">✨ Nouveau projet</button>
        <button class="btn btn-lg" id="welcome-open">📂 Ouvrir un projet</button>
      </div>
      <div class="welcome-templates">
        <h3>Modèles de départ</h3>
        <div class="template-grid" id="template-grid"></div>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  // Templates
  if(Tpl){
    const grid=overlay.querySelector('#template-grid');
    for(const t of Tpl.list()){
      const card=el('div','template-card');
      card.innerHTML=`<span class="template-icon">${t.icon}</span><span class="template-name">${t.name}</span><span class="template-desc">${t.description}</span>`;
      card.onclick=()=>{createFromTemplate(t.id);overlay.remove()};
      grid.appendChild(card);
    }
  }

  overlay.querySelector('#welcome-new').onclick=()=>{showNewProject();overlay.remove()};
  overlay.querySelector('#welcome-open').onclick=()=>{showOpenProject();overlay.remove()};
}

/* ═══ New Project ═══ */
function showNewProject(){
  UI.prompt('Nom du projet','Mon Jeu',(name)=>{
    if(!name)return;
    currentProject={name,scenes:{},variables:{},prefabs:{},settings:{width:800,height:600,fps:60}};
    const scene=new E2D.Scene('scene_1','Scène 1');
    scene.width=1600;scene.height=900;
    currentProject.scenes[scene.id]=scene;
    editor.loadScene(scene);
    refreshSceneList();
    setStatus(name+' — créé');
    UI.toast('Projet "'+name+'" créé !','success');
  });
}

function createFromTemplate(templateId){
  const result=Tpl.create(templateId);
  if(!result){UI.toast('Erreur template','error');return}
  const tplInfo=Tpl.all[templateId];
  currentProject={name:tplInfo?.name||'Mon Jeu',scenes:{},variables:result.variables||{},prefabs:result.prefabs||{},settings:{width:800,height:600,fps:60}};
  for(const s of result.scenes){currentProject.scenes[s.id]=s}
  // Register prefabs in editor context
  editor.loadScene(result.scenes[0]);
  refreshSceneList();
  setStatus(currentProject.name+' — chargé');
  UI.toast('Template "'+currentProject.name+'" chargé !','success');
}

/* ═══ Open Project ═══ */
async function showOpenProject(){
  setStatus('Chargement...');
  try{
    const projects=await Store.listProjects?.();
    if(!projects||projects.length===0){UI.toast('Aucun projet sauvegardé','info');setStatus('Prêt');return}
    const items=projects.map(p=>({label:p.name||p.key,value:p.key}));
    UI.dropdown(items,(selected)=>{
      loadProject(selected.value);
    });
  }catch(e){
    // Fallback: prompt for name
    UI.prompt('Clé du projet','mon-jeu',(key)=>{if(key)loadProject(key)});
  }
}

async function loadProject(key){
  try{
    setStatus('Chargement de '+key+'...');
    const data=await Store.load(key);
    if(!data){UI.toast('Projet introuvable','error');return}
    // Deserialize
    currentProject={name:data.name||key,scenes:{},variables:data.variables||{},prefabs:{},settings:data.settings||{}};
    if(data.scenes){
      for(const[id,sd] of Object.entries(data.scenes)){
        const scene=new E2D.Scene(id,sd.name||id);
        scene.bgColor=sd.bgColor;scene.width=sd.width||1600;scene.height=sd.height||900;
        scene.gravity=sd.gravity||{x:0,y:600};scene.lightingEnabled=sd.lightingEnabled||false;
        scene.ambientLight=sd.ambientLight||'#111122';
        if(sd.tilemap)scene.tilemap=sd.tilemap;
        if(sd.objects){
          for(const od of sd.objects){
            const obj=new E2D.GameObject2D(od.id,od.x,od.y);
            obj.width=od.width||32;obj.height=od.height||32;obj.spriteId=od.spriteId;
            obj.tags=od.tags||[];obj.layer=od.layer||0;obj.hp=od.hp||100;obj.maxHp=od.maxHp||100;
            obj.scaleX=od.scaleX||1;obj.scaleY=od.scaleY||1;obj.rotation=od.rotation||0;
            obj.visible=od.visible!==false;obj.alpha=od.alpha!=null?od.alpha:1;
            obj.facingRight=od.facingRight!==false;obj.data=od.data||{};
            if(od.scripts){
              const sr=new S.ScriptRunner();
              sr.blocks=S.deserializeScript(od.scripts);
              obj.scriptRunner=sr;
            }
            scene.addObject(obj);
          }
        }
        currentProject.scenes[id]=scene;
      }
    }
    const firstScene=Object.values(currentProject.scenes)[0];
    if(firstScene)editor.loadScene(firstScene);
    refreshSceneList();
    setStatus(currentProject.name+' — chargé');
    UI.toast('Projet chargé !','success');
  }catch(e){UI.toast('Erreur: '+e.message,'error');setStatus('Erreur')}
}

/* ═══ Save Project ═══ */
async function saveProject(){
  if(!currentProject){UI.toast('Aucun projet','warning');return}
  setStatus('Sauvegarde...');
  try{
    const data=serializeProject();
    await Store.save(currentProject.name.toLowerCase().replace(/\s+/g,'-'),data);
    setStatus(currentProject.name+' — sauvegardé ☁️');
    UI.toast('Projet sauvegardé !','success');
  }catch(e){
    // Fallback local
    try{
      localStorage.setItem('gs_project_'+currentProject.name,JSON.stringify(serializeProject()));
      setStatus(currentProject.name+' — sauvegardé (local)');
      UI.toast('Sauvegardé localement','info');
    }catch(le){UI.toast('Erreur sauvegarde: '+e.message,'error')}
  }
}

function serializeProject(){
  const data={name:currentProject.name,variables:currentProject.variables,settings:currentProject.settings,scenes:{}};
  for(const[id,scene] of Object.entries(currentProject.scenes)){
    const sd={name:scene.name,bgColor:scene.bgColor,width:scene.width,height:scene.height,
      gravity:scene.gravity,lightingEnabled:scene.lightingEnabled,ambientLight:scene.ambientLight,
      tilemap:scene.tilemap,objects:[]};
    for(const obj of scene.objects){
      const od={id:obj.id,x:obj.x,y:obj.y,width:obj.width,height:obj.height,spriteId:obj.spriteId,
        tags:obj.tags,layer:obj.layer,hp:obj.hp,maxHp:obj.maxHp,scaleX:obj.scaleX,scaleY:obj.scaleY,
        rotation:obj.rotation,visible:obj.visible,alpha:obj.alpha,facingRight:obj.facingRight,data:obj.data};
      if(obj.scriptRunner&&obj.scriptRunner.blocks.length)od.scripts=S.serializeScript(obj.scriptRunner.blocks);
      sd.objects.push(od);
    }
    data.scenes[id]=sd;
  }
  return data;
}

function saveCurrentState(){
  try{localStorage.setItem('gs_autosave',JSON.stringify(serializeProject()))}catch(e){}
}

function setupAutoSave(){
  setInterval(()=>{if(currentProject)saveCurrentState()},120000); // 2min
}

/* ═══ Export ═══ */
function exportProject(){
  if(!currentProject){UI.toast('Aucun projet','warning');return}
  const data=JSON.stringify(serializeProject(),null,2);
  const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=currentProject.name.replace(/\s+/g,'_')+'.json';a.click();
  URL.revokeObjectURL(a.href);
  UI.toast('Projet exporté !','success');
}

/* ═══ Cloud Sync ═══ */
async function showCloudSync(){
  try{
    if(!Store.isAuthenticated?.()){
      UI.prompt('Email de connexion','',async(email)=>{
        if(!email)return;
        const pwd=prompt('Mot de passe:');
        if(!pwd)return;
        const ok=await Store.login?.(email,pwd);
        if(ok){UI.toast('Connecté !','success');setStatus('Connecté ☁️')}
        else UI.toast('Échec connexion','error');
      });
    }else{
      if(currentProject)await saveProject();
      else UI.toast('Aucun projet à synchroniser','info');
    }
  }catch(e){UI.toast('Erreur cloud: '+e.message,'error')}
}

/* ═══ Test Mode ═══ */
function toggleTest(){
  if(editor._testMode){
    editor.stopTest();
    document.getElementById('btn-test').textContent='▶️ Tester';
    setStatus(currentProject?.name||'Prêt');
  }else{
    if(!editor.scene){UI.toast('Aucune scène','warning');return}
    editor.startTest();
    document.getElementById('btn-test').textContent='⏹️ Arrêter';
    setStatus('Mode test en cours...');
  }
}

/* ═══ Scene List ═══ */
function refreshSceneList(){
  if(!scenesListEl||!currentProject)return;
  scenesListEl.innerHTML='';
  const addBtn=document.createElement('button');addBtn.className='btn btn-sm btn-primary';addBtn.textContent='+ Scène';
  addBtn.onclick=()=>{
    const id='scene_'+(Object.keys(currentProject.scenes).length+1);
    const s=new E2D.Scene(id,'Scène '+(Object.keys(currentProject.scenes).length+1));
    currentProject.scenes[id]=s;
    editor.loadScene(s);refreshSceneList();
  };
  scenesListEl.appendChild(addBtn);

  for(const[id,scene] of Object.entries(currentProject.scenes)){
    const item=el('div','scene-item'+(editor.scene===scene?' active':''));
    item.innerHTML='<span class="scene-icon">🎬</span><span>'+scene.name+'</span>';
    item.onclick=()=>{editor.loadScene(scene);refreshSceneList();Ed.buildObjectTree(objectTreeEl,scene,editor)};
    scenesListEl.appendChild(item);
  }
}

/* ═══ Menu ═══ */
function showMenu(){
  const items=[
    {label:'✨ Nouveau projet',action:showNewProject},
    {label:'📂 Ouvrir',action:showOpenProject},
    {label:'💾 Sauvegarder',action:saveProject},
    {label:'📦 Exporter JSON',action:exportProject},
    {label:'---'},
    {label:'📐 Grille: '+(editor?.grid?.visible?'ON':'OFF'),action:()=>{editor.grid.visible=!editor.grid.visible}},
    {label:'🧲 Snap: '+(editor?.grid?.snap?'ON':'OFF'),action:()=>{editor.grid.snap=!editor.grid.snap}},
    {label:'---'},
    {label:'ℹ️ À propos',action:()=>UI.modal('À propos','<p><strong>Game Studio</strong> v1.0.0</p><p>Créateur de mini-jeux vidéo pour EZGalaxy.</p><p>Moteurs 2D et 3D, assets procéduraux, scriptage visuel, IA, physique, éclairage.</p>')}
  ];
  if(UI.contextMenu){
    UI.contextMenu(items,{x:50,y:50});
  }else{
    // Fallback simple menu
    const ov=el('div','menu-overlay');
    const menu=el('div','menu-dropdown');
    for(const it of items){
      if(it.label==='---'){menu.appendChild(el('hr','menu-sep'));continue}
      const btn=document.createElement('button');btn.className='menu-item';btn.textContent=it.label;
      btn.onclick=()=>{ov.remove();it.action?.()};
      menu.appendChild(btn);
    }
    ov.onclick=(e)=>{if(e.target===ov)ov.remove()};
    ov.appendChild(menu);document.body.appendChild(ov);
  }
}

/* ═══ Boot ═══ */
document.addEventListener('DOMContentLoaded',init);
})();
