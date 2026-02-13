/**
 * Game Studio — State Management + Cloud Persistence
 * Pub/sub store, Community Data API, auth, LZString compression
 */
(function(){'use strict';

const EXTENSION_ID='com.ezgalaxy.gamestudio';
const LS_PREFIX='gs_';
const LS_TOKEN_KEY=LS_PREFIX+'auth_token';
const LS_USER_KEY=LS_PREFIX+'auth_user';
const LS_PROJECTS_KEY=LS_PREFIX+'projects_index';
const AUTO_SAVE_INTERVAL=120000; // 2 min

/* ── State ── */
let state={
  auth:{token:null,user:null,status:'disconnected'}, // status: disconnected|connected|syncing|error
  currentProject:null, // full project data (scenes, objects, settings)
  projectsMeta:[], // [{id,name,updatedAt,mode}...]
  editorSettings:{
    gridSize:32,snapToGrid:true,showGrid:true,
    selectedTool:'select',selectedLayer:'entities',
    zoom:1,panX:0,panY:0,
    darkTheme:true
  },
  ui:{
    activePanel:'scene', // scene|assets|tiles|timeline|console|settings
    sidebarWidth:250,inspectorWidth:300,bottomHeight:200,
    playing:false,paused:false
  }
};

const listeners=new Map();
let _nextSubId=1;

function getState(){return state}
function setState(partial){
  const prev={...state};
  state={...state,...partial};
  for(const[,cb]of listeners)try{cb(state,prev)}catch(e){console.error('[Store] listener error:',e)}
}
function subscribe(cb){const id=_nextSubId++;listeners.set(id,cb);return()=>listeners.delete(id)}
function updateEditorSettings(partial){setState({editorSettings:{...state.editorSettings,...partial}})}
function updateUI(partial){setState({ui:{...state.ui,...partial}})}

/* ── Local Storage ── */
function lsGet(key,fallback=null){
  try{const v=localStorage.getItem(LS_PREFIX+key);return v?JSON.parse(v):fallback}catch(e){return fallback}
}
function lsSet(key,val){
  try{localStorage.setItem(LS_PREFIX+key,JSON.stringify(val))}catch(e){console.warn('[Store] localStorage write failed:',e)}
}
function lsRemove(key){try{localStorage.removeItem(LS_PREFIX+key)}catch(e){}}

/* ── Auth — Community Data API ── */
function loadAuth(){
  const token=localStorage.getItem(LS_TOKEN_KEY);
  const user=lsGet('auth_user_data');
  if(token&&user)setState({auth:{token,user,status:'connected'}});
}

async function login(email,password){
  setState({auth:{...state.auth,status:'syncing'}});
  try{
    const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({email,password})});
    if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.message||'Échec de connexion')}
    const data=await res.json();
    localStorage.setItem(LS_TOKEN_KEY,data.token);
    lsSet('auth_user_data',data.user);
    setState({auth:{token:data.token,user:data.user,status:'connected'}});
    UI.toast('Connecté au cloud !','success');
    return true;
  }catch(e){
    setState({auth:{token:null,user:null,status:'error'}});
    UI.toast(e.message,'error');return false;
  }
}

function logout(){
  localStorage.removeItem(LS_TOKEN_KEY);lsRemove('auth_user_data');
  setState({auth:{token:null,user:null,status:'disconnected'}});
  UI.toast('Déconnecté du cloud','info');
}

/* ── Project CRUD ── */
function newProject(name='Sans titre',mode='2d'){
  const id='proj_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const project={
    id,name,mode,version:'1.0.0',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    scenes:[{
      id:'scene_main',name:'Scène principale',
      settings:{width:800,height:600,backgroundColor:'#1a1a2e',gravity:9.8,ambientLightColor:'#404060',ambientLightIntensity:0.4},
      objects:[],layers:['background','terrain','entities','foreground','ui']
    }],
    currentSceneIndex:0,
    globalVariables:{score:0,lives:3,level:1},
    inputMapping:{
      left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],
      up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],
      jump:['Space'],action:['KeyE'],attack:['KeyJ','MouseLeft'],
      pause:['Escape']
    },
    assets:{customSprites:[],customSounds:[],customTiles:[]}
  };
  setState({currentProject:project});
  saveProjectLocal(project);
  return project;
}

function saveProjectLocal(project){
  if(!project)project=state.currentProject;
  if(!project)return;
  project.updatedAt=new Date().toISOString();
  const compressed=LZString.compressToUTF16(JSON.stringify(project));
  lsSet('project_'+project.id,compressed);
  /* Update index */
  let index=lsGet('projects_index',[]);
  const existing=index.findIndex(p=>p.id===project.id);
  const meta={id:project.id,name:project.name,mode:project.mode,updatedAt:project.updatedAt};
  if(existing>=0)index[existing]=meta;else index.unshift(meta);
  lsSet('projects_index',index);
  setState({projectsMeta:index,currentProject:project});
}

function loadProjectLocal(id){
  const compressed=lsGet('project_'+id);
  if(!compressed)return null;
  try{
    const json=LZString.decompressFromUTF16(compressed);
    const project=JSON.parse(json);
    setState({currentProject:project});
    return project;
  }catch(e){console.error('[Store] load error:',e);return null}
}

function deleteProjectLocal(id){
  lsRemove('project_'+id);
  let index=lsGet('projects_index',[]);
  index=index.filter(p=>p.id!==id);
  lsSet('projects_index',index);
  if(state.currentProject&&state.currentProject.id===id)setState({currentProject:null});
  setState({projectsMeta:index});
}

function loadProjectsList(){
  const index=lsGet('projects_index',[]);
  setState({projectsMeta:index});
  return index;
}

/* ── Cloud Sync ── */
async function saveProjectCloud(project){
  if(!project)project=state.currentProject;
  if(!project)return false;
  setState({auth:{...state.auth,status:'syncing'}});
  try{
    const compressed=LZString.compressToUTF16(JSON.stringify(project));
    await ezgalaxy.storage.set('projects', project.id, {compressed:true,payload:compressed,name:project.name,mode:project.mode,updatedAt:project.updatedAt});
    setState({auth:{...state.auth,status:'connected'}});
    UI.toast('Projet sauvegardé dans le cloud','success');
    return true;
  }catch(e){
    setState({auth:{...state.auth,status:'error'}});
    UI.toast('Erreur cloud: '+e.message,'error');return false;
  }
}

async function loadProjectCloud(id){
  try{
    const record=await ezgalaxy.storage.get('projects', id);
    if(!record)return null;
    const data=record.data;
    let project;
    if(data.compressed&&data.payload){
      const json=LZString.decompressFromUTF16(data.payload);
      project=JSON.parse(json);
    }else project=data;
    setState({currentProject:project});
    saveProjectLocal(project); // Cache locally
    return project;
  }catch(e){UI.toast('Erreur chargement cloud: '+e.message,'error');return null}
}

async function listProjectsCloud(){
  try{
    const data=await ezgalaxy.storage.list('projects', {limit:50});
    return(data.items||[]).map(r=>({id:r.record_key||r.id,name:r.data?.name||'Sans titre',mode:r.data?.mode||'2d',updatedAt:r.data?.updatedAt||r.updated_at,cloud:true}));
  }catch(e){return[]}
}

async function deleteProjectCloud(id){
  try{await ezgalaxy.storage.delete('projects', id)}catch(e){}
}

/* ── Settings persistence ── */
function loadSettings(){
  const s=lsGet('editor_settings');
  if(s)setState({editorSettings:{...state.editorSettings,...s}});
}
function saveSettings(){lsSet('editor_settings',state.editorSettings)}

/* ── Auto-save ── */
let _autoSaveTimer=null;
function startAutoSave(){
  if(_autoSaveTimer)clearInterval(_autoSaveTimer);
  _autoSaveTimer=setInterval(()=>{
    if(state.currentProject){
      saveProjectLocal(state.currentProject);
      saveProjectCloud(state.currentProject);
    }
  },AUTO_SAVE_INTERVAL);
}
function stopAutoSave(){if(_autoSaveTimer){clearInterval(_autoSaveTimer);_autoSaveTimer=null}}

/* ── Scene helpers ── */
function getCurrentScene(){
  if(!state.currentProject)return null;
  return state.currentProject.scenes[state.currentProject.currentSceneIndex]||null;
}
function addScene(name='Nouvelle scène'){
  if(!state.currentProject)return;
  const s={id:'scene_'+Date.now(),name,settings:{width:800,height:600,backgroundColor:'#1a1a2e',gravity:9.8,ambientLightColor:'#404060',ambientLightIntensity:0.4},objects:[],layers:['background','terrain','entities','foreground','ui']};
  state.currentProject.scenes.push(s);
  state.currentProject.currentSceneIndex=state.currentProject.scenes.length-1;
  setState({currentProject:{...state.currentProject}});
  return s;
}
function switchScene(index){
  if(!state.currentProject||index<0||index>=state.currentProject.scenes.length)return;
  state.currentProject.currentSceneIndex=index;
  setState({currentProject:{...state.currentProject}});
}

/* ── GameObject helpers ── */
let _goId=1;
function createGameObject(name,overrides={}){
  return{
    id:'go_'+(_goId++)+'_'+Date.now(),name:name||'GameObject',tag:'',layer:'entities',active:true,
    transform:{x:0,y:0,z:0,rotation:0,scaleX:1,scaleY:1},
    components:[],children:[],...overrides
  };
}
function addComponent(gameObject,comp){
  gameObject.components.push({id:'comp_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),...comp});
  setState({currentProject:{...state.currentProject}});
}
function removeComponent(gameObject,compId){
  gameObject.components=gameObject.components.filter(c=>c.id!==compId);
  setState({currentProject:{...state.currentProject}});
}
function addObjectToScene(obj){
  const scene=getCurrentScene();if(!scene)return;
  scene.objects.push(obj);
  setState({currentProject:{...state.currentProject}});
}
function removeObjectFromScene(objId){
  const scene=getCurrentScene();if(!scene)return;
  scene.objects=scene.objects.filter(o=>o.id!==objId);
  setState({currentProject:{...state.currentProject}});
}
function findObject(id,objects){
  if(!objects){const scene=getCurrentScene();if(!scene)return null;objects=scene.objects}
  for(const o of objects){if(o.id===id)return o;if(o.children){const found=findObject(id,o.children);if(found)return found}}
  return null;
}
function duplicateObject(obj){
  const clone=JSON.parse(JSON.stringify(obj));
  clone.id='go_'+(_goId++)+'_'+Date.now();
  clone.name=obj.name+' (copie)';
  clone.transform.x+=32;clone.transform.y+=32;
  if(clone.children)clone.children.forEach(function regen(c){c.id='go_'+(_goId++)+'_'+Date.now();if(c.children)c.children.forEach(regen)});
  return clone;
}

/* ── Init ── */
function init(){
  loadAuth();loadSettings();loadProjectsList();startAutoSave();
  console.log('[GameStudio] Store initialized');
}

/* ── Export ── */
window.Store={
  getState,setState,subscribe,updateEditorSettings,updateUI,
  init,loadAuth,login,logout,
  newProject,saveProjectLocal,loadProjectLocal,deleteProjectLocal,loadProjectsList,
  saveProjectCloud,loadProjectCloud,listProjectsCloud,deleteProjectCloud,
  loadSettings,saveSettings,
  startAutoSave,stopAutoSave,
  getCurrentScene,addScene,switchScene,
  createGameObject,addComponent,removeComponent,addObjectToScene,removeObjectFromScene,findObject,duplicateObject,
  EXTENSION_ID
};
})();
