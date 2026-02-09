/**
 * Game Studio — Visual Scene Editor
 * Canvas editor with grid, selection, move/rotate/scale, undo/redo, tilemap brush, property inspector, test mode
 */
(function(){'use strict';
const UI=window.UI,Store=window.Store,S=window.Scripting,E2D=window.Engine2D;
if(!UI||!Store)return;

/* ═══ Command Pattern (Undo/Redo) ═══ */
class CommandStack{
  constructor(max=100){this._stack=[];this._idx=-1;this._max=max}
  execute(cmd){
    this._stack.length=this._idx+1;
    this._stack.push(cmd);if(this._stack.length>this._max)this._stack.shift();else this._idx++;
    cmd.execute();
  }
  undo(){if(this._idx<0)return;this._stack[this._idx].undo();this._idx--}
  redo(){if(this._idx>=this._stack.length-1)return;this._idx++;this._stack[this._idx].execute()}
  canUndo(){return this._idx>=0}
  canRedo(){return this._idx<this._stack.length-1}
  clear(){this._stack=[];this._idx=-1}
}

class MoveObjectCmd{
  constructor(obj,oldX,oldY,newX,newY){this.obj=obj;this.ox=oldX;this.oy=oldY;this.nx=newX;this.ny=newY}
  execute(){this.obj.x=this.nx;this.obj.y=this.ny}
  undo(){this.obj.x=this.ox;this.obj.y=this.oy}
}
class AddObjectCmd{
  constructor(scene,obj){this.scene=scene;this.obj=obj}
  execute(){this.scene.addObject(this.obj)}
  undo(){this.scene.removeObject(this.obj)}
}
class RemoveObjectCmd{
  constructor(scene,obj){this.scene=scene;this.obj=obj}
  execute(){this.scene.removeObject(this.obj)}
  undo(){this.scene.addObject(this.obj)}
}
class SetPropertyCmd{
  constructor(obj,prop,oldVal,newVal){this.obj=obj;this.prop=prop;this.ov=oldVal;this.nv=newVal}
  execute(){this.obj[this.prop]=this.nv}
  undo(){this.obj[this.prop]=this.ov}
}

/* ═══ Editor Grid ═══ */
class Grid{
  constructor(size=16){this.size=size;this.visible=true;this.snap=true;this.color='rgba(255,255,255,0.06)'}
  draw(ctx,cam){
    if(!this.visible)return;
    const s=this.size;
    const startX=Math.floor((cam.x-cam.hw/cam.zoom)/s)*s;
    const startY=Math.floor((cam.y-cam.hh/cam.zoom)/s)*s;
    const endX=Math.ceil((cam.x+cam.hw/cam.zoom)/s)*s;
    const endY=Math.ceil((cam.y+cam.hh/cam.zoom)/s)*s;
    ctx.strokeStyle=this.color;ctx.lineWidth=0.5;
    ctx.beginPath();
    for(let x=startX;x<=endX;x+=s){ctx.moveTo(x,startY);ctx.lineTo(x,endY)}
    for(let y=startY;y<=endY;y+=s){ctx.moveTo(startX,y);ctx.lineTo(endX,y)}
    ctx.stroke();
  }
  snapPos(x,y){if(!this.snap)return{x,y};return{x:Math.round(x/this.size)*this.size,y:Math.round(y/this.size)*this.size}}
}

/* ═══ Selection Gizmo ═══ */
class Gizmo{
  constructor(){this.target=null;this.mode='move'; /* move|rotate|scale */this.handleSize=8;this._dragging=false;this._handle=null;this._startMouse={x:0,y:0};this._startObj={x:0,y:0,w:0,h:0,r:0,sx:1,sy:1}}

  draw(ctx,cam){
    if(!this.target||!this.target.alive)return;
    const o=this.target;
    ctx.save();ctx.strokeStyle='#0ea5a4';ctx.lineWidth=2;
    const x=o.x-o.width/2,y=o.y-o.height/2,w=o.width,h=o.height;
    ctx.strokeRect(x,y,w,h);
    const hs=this.handleSize/cam.zoom;
    ctx.fillStyle='#0ea5a4';
    if(this.mode==='move'){
      // 4 corner handles
      this._drawHandle(ctx,x,y,hs);this._drawHandle(ctx,x+w,y,hs);
      this._drawHandle(ctx,x,y+h,hs);this._drawHandle(ctx,x+w,y+h,hs);
    }else if(this.mode==='scale'){
      ctx.fillStyle='#e5a00d';
      this._drawHandle(ctx,x+w,y+h/2,hs);this._drawHandle(ctx,x+w/2,y+h,hs);
    }else if(this.mode==='rotate'){
      ctx.fillStyle='#e54040';
      const rx=x+w/2,ry=y-20/cam.zoom;
      ctx.beginPath();ctx.arc(rx,ry,hs/2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+w/2,y);ctx.lineTo(rx,ry);ctx.stroke();
    }
    ctx.restore();
  }
  _drawHandle(ctx,x,y,s){ctx.fillRect(x-s/2,y-s/2,s,s)}

  hitTest(worldX,worldY,cam){
    if(!this.target)return null;const o=this.target;
    const hs=(this.handleSize+4)/cam.zoom;
    const x=o.x-o.width/2,y=o.y-o.height/2,w=o.width,h=o.height;
    if(this.mode==='move'){
      const corners=[[x,y,'nw'],[x+w,y,'ne'],[x,y+h,'sw'],[x+w,y+h,'se']];
      for(const[cx,cy,id] of corners){if(Math.abs(worldX-cx)<hs&&Math.abs(worldY-cy)<hs)return id}
    }
    if(this.mode==='scale'){
      if(Math.abs(worldX-(x+w))<hs&&Math.abs(worldY-(y+h/2))<hs)return'scale-x';
      if(Math.abs(worldX-(x+w/2))<hs&&Math.abs(worldY-(y+h))<hs)return'scale-y';
    }
    if(this.mode==='rotate'){
      const rx=x+w/2,ry=y-20/cam.zoom;
      if(Math.abs(worldX-rx)<hs&&Math.abs(worldY-ry)<hs)return'rotate';
    }
    // Body hit
    if(worldX>=x&&worldX<=x+w&&worldY>=y&&worldY<=y+h)return'body';
    return null;
  }

  startDrag(handle,mx,my){
    this._dragging=true;this._handle=handle;this._startMouse={x:mx,y:my};
    const o=this.target;
    this._startObj={x:o.x,y:o.y,w:o.width,h:o.height,r:o.rotation,sx:o.scaleX,sy:o.scaleY};
  }
  drag(mx,my,grid){
    if(!this._dragging||!this.target)return;
    const dx=mx-this._startMouse.x,dy=my-this._startMouse.y;
    if(this._handle==='body'){
      let nx=this._startObj.x+dx,ny=this._startObj.y+dy;
      if(grid&&grid.snap){const s=grid.snapPos(nx,ny);nx=s.x;ny=s.y}
      this.target.x=nx;this.target.y=ny;
    }else if(this._handle==='scale-x'){
      this.target.width=Math.max(8,this._startObj.w+dx);
    }else if(this._handle==='scale-y'){
      this.target.height=Math.max(8,this._startObj.h+dy);
    }else if(this._handle==='rotate'){
      const cx=this._startObj.x,cy=this._startObj.y;
      const a1=Math.atan2(this._startMouse.y-cy,this._startMouse.x-cx);
      const a2=Math.atan2(my-cy,mx-cx);
      this.target.rotation=this._startObj.r+(a2-a1);
    }else if(this._handle==='nw'||this._handle==='ne'||this._handle==='sw'||this._handle==='se'){
      let nx=this._startObj.x+dx,ny=this._startObj.y+dy;
      if(grid&&grid.snap){const s=grid.snapPos(nx,ny);nx=s.x;ny=s.y}
      this.target.x=nx;this.target.y=ny;
    }
  }
  endDrag(){
    const wasDragging=this._dragging;this._dragging=false;this._handle=null;
    return wasDragging?{start:this._startObj,end:{x:this.target?.x,y:this.target?.y,w:this.target?.width,h:this.target?.height,r:this.target?.rotation}}:null;
  }
}

/* ═══ Tilemap Brush ═══ */
class TilemapBrush{
  constructor(){this.active=false;this.tileId=null;this.size=1;this.mode='paint'; /* paint|erase|fill */}
  apply(tilemap,worldX,worldY){
    if(!tilemap||!this.active)return;
    const ts=tilemap.tileSize||16;
    const col=Math.floor(worldX/ts),row=Math.floor(worldY/ts);
    if(col<0||row<0||col>=tilemap.cols||row>=tilemap.rows)return;
    const half=Math.floor(this.size/2);
    for(let dr=-half;dr<=half;dr++){
      for(let dc=-half;dc<=half;dc++){
        const r=row+dr,c=col+dc;
        if(r<0||c<0||r>=tilemap.rows||c>=tilemap.cols)continue;
        tilemap.data[r*tilemap.cols+c]=this.mode==='erase'?0:this.tileId;
      }
    }
  }
}

/* ═══ Scene Editor ═══ */
class SceneEditor{
  constructor(container){
    this.container=container;
    this.canvas=document.createElement('canvas');
    this.canvas.className='editor-canvas';
    this.ctx=this.canvas.getContext('2d');
    this.camera=new E2D.Camera(800,500);
    this.grid=new Grid(16);
    this.gizmo=new Gizmo();
    this.commands=new CommandStack();
    this.brush=new TilemapBrush();
    this.scene=null;
    this.selectedObject=null;
    this.tool='select'; // select|move|brush|place
    this.placingAsset=null;
    this._panning=false;this._panStart={x:0,y:0};this._panCamStart={x:0,y:0};
    this._testEngine=null;this._testMode=false;
    this.onChange=null;this.onSelect=null;

    container.appendChild(this.canvas);
    this._bindEvents();
    this._resizeObserver=new ResizeObserver(()=>this._resize());
    this._resizeObserver.observe(container);
    this._resize();
    this._raf=requestAnimationFrame(()=>this._loop());
  }

  loadScene(scene){
    this.scene=scene;this.selectedObject=null;this.gizmo.target=null;
    this.camera.x=scene.width/2;this.camera.y=scene.height/2;
    this.commands.clear();
  }

  /* Tools */
  setTool(tool){this.tool=tool;if(tool!=='brush')this.brush.active=false}
  setGizmoMode(mode){this.gizmo.mode=mode}

  /* Test mode */
  startTest(){
    if(!this.scene||this._testMode)return;
    this._testMode=true;
    this._testCanvas=document.createElement('canvas');
    this._testCanvas.className='editor-canvas test-overlay';
    this._testCanvas.width=this.canvas.width;this._testCanvas.height=this.canvas.height;
    this.container.appendChild(this._testCanvas);
    this._testEngine=new E2D.Engine2D(this._testCanvas);
    // Deep clone scene
    const cloneScene=this._cloneScene(this.scene);
    this._testEngine.addScene(cloneScene);
    this._testEngine.loadScene(cloneScene.id);
    this._testEngine.start();
  }
  stopTest(){
    if(!this._testMode)return;
    this._testMode=false;
    if(this._testEngine){this._testEngine.stop();this._testEngine=null}
    if(this._testCanvas){this._testCanvas.remove();this._testCanvas=null}
  }
  _cloneScene(src){
    const s=new E2D.Scene(src.id,src.name);
    s.bgColor=src.bgColor;s.width=src.width;s.height=src.height;
    s.gravity={...src.gravity};s.lightingEnabled=src.lightingEnabled;s.ambientLight=src.ambientLight;
    if(src.tilemap)s.tilemap=JSON.parse(JSON.stringify(src.tilemap));
    for(const obj of src.objects){
      const c=new E2D.GameObject2D(obj.id,obj.x,obj.y);
      c.width=obj.width;c.height=obj.height;c.spriteId=obj.spriteId;c.tags=[...obj.tags];
      c.layer=obj.layer;c.hp=obj.hp;c.maxHp=obj.maxHp;c.scaleX=obj.scaleX;c.scaleY=obj.scaleY;
      c.rotation=obj.rotation;c.visible=obj.visible;c.facingRight=obj.facingRight;
      c.data={...obj.data};
      if(obj.scriptRunner){
        const sr=new S.ScriptRunner();
        sr.blocks=[...obj.scriptRunner.blocks];
        sr.variables={...obj.scriptRunner.variables};
        c.scriptRunner=sr;
      }
      // Create physics body
      if(obj.tags.includes('solid')||obj.tags.includes('player')||obj.tags.includes('enemy')){
        if(window.Physics){
          const body=new window.Physics.Body(c.x,c.y,c.width,c.height);
          if(obj.tags.includes('solid')){body.isStatic=true}
          body.gameObject=c;c.body=body;
        }
      }
      s.addObject(c);
    }
    return s;
  }

  /* Object operations */
  addObject(obj){
    if(!this.scene)return;
    this.commands.execute(new AddObjectCmd(this.scene,obj));
    this.selectObject(obj);
    this._changed();
  }
  removeSelected(){
    if(!this.selectedObject||!this.scene)return;
    this.commands.execute(new RemoveObjectCmd(this.scene,this.selectedObject));
    this.selectedObject=null;this.gizmo.target=null;
    this._changed();
  }
  duplicateSelected(){
    if(!this.selectedObject)return;
    const o=this.selectedObject;
    const d=new E2D.GameObject2D(o.id+'_copy',o.x+20,o.y+20);
    d.width=o.width;d.height=o.height;d.spriteId=o.spriteId;d.tags=[...o.tags];
    d.layer=o.layer;d.hp=o.hp;d.maxHp=o.maxHp;d.scaleX=o.scaleX;d.scaleY=o.scaleY;
    if(o.scriptRunner){
      const sr=new S.ScriptRunner();
      sr.blocks=[...o.scriptRunner.blocks.map(b=>new S.ScriptBlock(b.trigger,[...b.conditions],[...b.actions]))];
      d.scriptRunner=sr;
    }
    this.addObject(d);
  }
  selectObject(obj){
    this.selectedObject=obj;this.gizmo.target=obj;
    if(this.onSelect)this.onSelect(obj);
  }

  /* Hit testing */
  _hitTestObjects(wx,wy){
    if(!this.scene)return null;
    // Reverse order (top objects first)
    for(let i=this.scene.objects.length-1;i>=0;i--){
      const o=this.scene.objects[i];
      if(!o.alive||!o.visible)continue;
      const hx=o.x-o.width/2,hy=o.y-o.height/2;
      if(wx>=hx&&wx<=hx+o.width&&wy>=hy&&wy<=hy+o.height)return o;
    }
    return null;
  }

  /* ─── Events ─── */
  _bindEvents(){
    const c=this.canvas;
    c.addEventListener('mousedown',e=>this._onMouseDown(e));
    c.addEventListener('mousemove',e=>this._onMouseMove(e));
    c.addEventListener('mouseup',e=>this._onMouseUp(e));
    c.addEventListener('wheel',e=>this._onWheel(e),{passive:false});
    c.addEventListener('contextmenu',e=>e.preventDefault());
    window.addEventListener('keydown',e=>this._onKeyDown(e));
  }

  _mouseWorld(e){
    const r=this.canvas.getBoundingClientRect();
    const sx=e.clientX-r.left,sy=e.clientY-r.top;
    return this.camera.screenToWorld(sx,sy);
  }

  _onMouseDown(e){
    if(this._testMode)return;
    const w=this._mouseWorld(e);
    // Middle or right = pan
    if(e.button===1||e.button===2){
      this._panning=true;this._panStart={x:e.clientX,y:e.clientY};
      this._panCamStart={x:this.camera.x,y:this.camera.y};return;
    }
    // Brush tool
    if(this.tool==='brush'&&this.brush.active&&this.scene?.tilemap){
      this.brush.apply(this.scene.tilemap,w.x,w.y);this._changed();return;
    }
    // Place tool
    if(this.tool==='place'&&this.placingAsset){
      const pos=this.grid.snapPos(w.x,w.y);
      const obj=new E2D.GameObject2D('obj_'+Date.now(),pos.x,pos.y);
      obj.width=32;obj.height=32;obj.spriteId=this.placingAsset;
      this.addObject(obj);return;
    }
    // Gizmo handle check
    const handle=this.gizmo.hitTest(w.x,w.y,this.camera);
    if(handle){this.gizmo.startDrag(handle,w.x,w.y);return}
    // Object selection
    const hit=this._hitTestObjects(w.x,w.y);
    this.selectObject(hit);
    if(hit){this.gizmo.startDrag('body',w.x,w.y)}
  }
  _onMouseMove(e){
    if(this._testMode)return;
    if(this._panning){
      const dx=e.clientX-this._panStart.x,dy=e.clientY-this._panStart.y;
      this.camera.x=this._panCamStart.x-dx/this.camera.zoom;
      this.camera.y=this._panCamStart.y-dy/this.camera.zoom;
      return;
    }
    const w=this._mouseWorld(e);
    if(this.gizmo._dragging){this.gizmo.drag(w.x,w.y,this.grid);return}
    // Brush continuous paint
    if(this.tool==='brush'&&this.brush.active&&e.buttons===1&&this.scene?.tilemap){
      this.brush.apply(this.scene.tilemap,w.x,w.y);
    }
  }
  _onMouseUp(e){
    if(this._panning){this._panning=false;return}
    if(this.gizmo._dragging){
      const result=this.gizmo.endDrag();
      if(result&&this.selectedObject&&(result.start.x!==result.end.x||result.start.y!==result.end.y)){
        // Record as command (already moved, so record for undo)
        const obj=this.selectedObject;
        const cmd=new MoveObjectCmd(obj,result.start.x,result.start.y,result.end.x,result.end.y);
        this.commands._stack.push(cmd);this.commands._idx++;
        this._changed();
      }
    }
  }
  _onWheel(e){
    e.preventDefault();
    const factor=e.deltaY>0?0.9:1.1;
    this.camera.zoom=Math.max(0.1,Math.min(5,this.camera.zoom*factor));
  }
  _onKeyDown(e){
    if(this._testMode){if(e.key==='Escape')this.stopTest();return}
    if(e.ctrlKey&&e.key==='z'){e.preventDefault();this.commands.undo();this._changed();return}
    if(e.ctrlKey&&e.key==='y'){e.preventDefault();this.commands.redo();this._changed();return}
    if(e.key==='Delete'&&this.selectedObject){this.removeSelected();return}
    if(e.ctrlKey&&e.key==='d'&&this.selectedObject){e.preventDefault();this.duplicateSelected();return}
  }

  _changed(){if(this.onChange)this.onChange()}

  /* ─── Render Loop ─── */
  _loop(){
    this._raf=requestAnimationFrame(()=>this._loop());
    if(this._testMode)return;
    this._render();
  }
  _render(){
    const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle=this.scene?.bgColor||'#0b0f19';ctx.fillRect(0,0,w,h);
    if(!this.scene)return;

    this.camera.applyTransform(ctx);

    // Scene bounds
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
    ctx.strokeRect(0,0,this.scene.width,this.scene.height);

    // Grid
    this.grid.draw(ctx,this.camera);

    // Tilemap
    if(this.scene.tilemap){
      const tr=new E2D.TilemapRenderer();
      tr.render(ctx,this.scene.tilemap,this.camera);
    }

    // Objects
    const sorted=[...this.scene.objects].filter(o=>o.alive&&o.visible);
    sorted.sort((a,b)=>a.layer-b.layer);
    for(const obj of sorted){
      ctx.save();
      ctx.globalAlpha=obj.alpha;
      ctx.translate(obj.x,obj.y);
      if(obj.rotation)ctx.rotate(obj.rotation);

      const spriteId=obj.spriteId;
      if(spriteId&&window.Sprites){
        const img=window.Sprites.renderSprite(spriteId,obj.width,obj.height);
        if(img)ctx.drawImage(img,-obj.width/2,-obj.height/2,obj.width,obj.height);
      }else{
        // Placeholder rect
        ctx.fillStyle='rgba(14,165,164,0.3)';ctx.strokeStyle='#0ea5a4';ctx.lineWidth=1;
        ctx.fillRect(-obj.width/2,-obj.height/2,obj.width,obj.height);
        ctx.strokeRect(-obj.width/2,-obj.height/2,obj.width,obj.height);
      }

      // ID label
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='9px sans-serif';ctx.textAlign='center';
      ctx.fillText(obj.id,-0,-obj.height/2-4);
      ctx.restore();
    }

    // Gizmo
    this.gizmo.draw(ctx,this.camera);

    this.camera.restore(ctx);

    // HUD info
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px monospace';
    ctx.fillText('Objets: '+(this.scene.objects.length)+' | Zoom: '+(this.camera.zoom*100|0)+'%',8,h-8);
  }

  _resize(){
    const r=this.container.getBoundingClientRect();
    this.canvas.width=Math.max(400,r.width);this.canvas.height=Math.max(300,r.height);
    this.camera.w=this.canvas.width;this.camera.h=this.canvas.height;
    this.camera.hw=this.canvas.width/2;this.camera.hh=this.canvas.height/2;
  }

  destroy(){
    cancelAnimationFrame(this._raf);
    this._resizeObserver.disconnect();
    this.stopTest();
  }
}

/* ═══ Property Inspector Panel ═══ */
function buildInspector(container,obj,editor){
  container.innerHTML='';
  if(!obj){container.innerHTML='<p class="inspector-empty">Aucun objet sélectionné</p>';return}

  const sec=(title)=>{const s=document.createElement('div');s.className='inspector-section';
    const h=document.createElement('div');h.className='inspector-section-title';h.textContent=title;
    s.appendChild(h);container.appendChild(s);return s};

  // Identity
  const idSec=sec('Identité');
  idSec.appendChild(propInput('ID',obj.id,v=>{obj.id=v;editor._changed()}));
  idSec.appendChild(propInput('Tags',obj.tags.join(', '),v=>{obj.tags=v.split(',').map(t=>t.trim()).filter(Boolean);editor._changed()}));
  idSec.appendChild(propInput('Layer',obj.layer,v=>{obj.layer=parseInt(v)||0;editor._changed()},'number'));

  // Transform
  const trSec=sec('Transform');
  trSec.appendChild(propInput('X',Math.round(obj.x),v=>{obj.x=parseFloat(v)||0;editor._changed()},'number'));
  trSec.appendChild(propInput('Y',Math.round(obj.y),v=>{obj.y=parseFloat(v)||0;editor._changed()},'number'));
  trSec.appendChild(propInput('Largeur',obj.width,v=>{obj.width=Math.max(1,parseInt(v)||32);editor._changed()},'number'));
  trSec.appendChild(propInput('Hauteur',obj.height,v=>{obj.height=Math.max(1,parseInt(v)||32);editor._changed()},'number'));
  trSec.appendChild(propInput('Rotation',Math.round(obj.rotation*180/Math.PI),v=>{obj.rotation=(parseFloat(v)||0)*Math.PI/180;editor._changed()},'number'));
  trSec.appendChild(propInput('Échelle X',obj.scaleX,v=>{obj.scaleX=parseFloat(v)||1;editor._changed()},'number'));
  trSec.appendChild(propInput('Échelle Y',obj.scaleY,v=>{obj.scaleY=parseFloat(v)||1;editor._changed()},'number'));

  // Appearance
  const apSec=sec('Apparence');
  apSec.appendChild(propInput('Sprite',obj.spriteId||'',v=>{obj.spriteId=v||null;editor._changed()}));
  apSec.appendChild(propInput('Visible',obj.visible?'oui':'non',v=>{obj.visible=v==='oui';editor._changed()}));
  apSec.appendChild(propInput('Alpha',obj.alpha,v=>{obj.alpha=Math.max(0,Math.min(1,parseFloat(v)||1));editor._changed()},'number'));

  // Combat
  const coSec=sec('Combat');
  coSec.appendChild(propInput('HP',obj.hp,v=>{obj.hp=parseInt(v)||0;editor._changed()},'number'));
  coSec.appendChild(propInput('HP Max',obj.maxHp,v=>{obj.maxHp=parseInt(v)||100;editor._changed()},'number'));

  // Scripts summary
  if(obj.scriptRunner&&obj.scriptRunner.blocks.length>0){
    const scSec=sec('Scripts ('+obj.scriptRunner.blocks.length+')');
    for(const b of obj.scriptRunner.blocks){
      const el=document.createElement('div');el.className='inspector-script-block';
      const tName=S.triggerDefs[b.trigger.type]?.name||b.trigger.type;
      const aNames=b.actions.map(a=>S.actionDefs[a.type]?.name||a.type).join(', ');
      el.textContent='⚡ '+tName+' → '+aNames;
      scSec.appendChild(el);
    }
  }
}

function propInput(label,value,onChange,type='text'){
  const row=document.createElement('div');row.className='inspector-prop';
  const lbl=document.createElement('label');lbl.textContent=label;
  const inp=document.createElement('input');inp.type=type;inp.value=value;
  inp.addEventListener('change',()=>onChange(inp.value));
  row.appendChild(lbl);row.appendChild(inp);return row;
}

/* ═══ Script Block Editor Panel ═══ */
function buildScriptEditor(container,obj,editor){
  container.innerHTML='';
  if(!obj){container.innerHTML='<p class="inspector-empty">Sélectionnez un objet pour éditer ses scripts</p>';return}

  if(!obj.scriptRunner)obj.scriptRunner=new S.ScriptRunner();
  const sr=obj.scriptRunner;

  const toolbar=document.createElement('div');toolbar.className='script-toolbar';
  const addBtn=document.createElement('button');addBtn.className='btn btn-sm btn-primary';
  addBtn.textContent='+ Ajouter Script';
  addBtn.onclick=()=>{
    const b=new S.ScriptBlock({type:'onKeyDown',params:{key:'Space'}},[],[{type:'jump',params:{force:-350}}]);
    sr.addBlock(b);
    buildScriptEditor(container,obj,editor);editor._changed();
  };
  toolbar.appendChild(addBtn);container.appendChild(toolbar);

  for(let i=0;i<sr.blocks.length;i++){
    const block=sr.blocks[i];
    const card=document.createElement('div');card.className='script-card'+(block.enabled?'':' disabled');

    // Header
    const hdr=document.createElement('div');hdr.className='script-card-header';
    const tName=S.triggerDefs[block.trigger.type]?.name||block.trigger.type;
    hdr.innerHTML='<span class="script-trigger-label">⚡ Quand: '+tName+'</span>';
    const delBtn=document.createElement('button');delBtn.className='btn btn-xs btn-danger';delBtn.textContent='✕';
    delBtn.onclick=()=>{sr.removeBlock(block);buildScriptEditor(container,obj,editor);editor._changed()};
    hdr.appendChild(delBtn);card.appendChild(hdr);

    // Trigger params
    const tDef=S.triggerDefs[block.trigger.type];
    if(tDef&&tDef.params.length){
      const tpDiv=document.createElement('div');tpDiv.className='script-params';
      for(const p of tDef.params){
        tpDiv.appendChild(scriptParamInput(p,block.trigger.params,()=>{editor._changed()}));
      }
      card.appendChild(tpDiv);
    }

    // Trigger selector
    const tSel=document.createElement('select');tSel.className='script-select';
    for(const[id,def] of Object.entries(S.triggerDefs)){
      const opt=document.createElement('option');opt.value=id;opt.textContent=def.name;
      if(id===block.trigger.type)opt.selected=true;
      tSel.appendChild(opt);
    }
    tSel.onchange=()=>{block.trigger.type=tSel.value;block.trigger.params={};buildScriptEditor(container,obj,editor);editor._changed()};
    card.appendChild(tSel);

    // Conditions
    const condDiv=document.createElement('div');condDiv.className='script-section';
    condDiv.innerHTML='<div class="script-section-label">📋 Si:</div>';
    for(let ci=0;ci<block.conditions.length;ci++){
      const cond=block.conditions[ci];
      const cRow=document.createElement('div');cRow.className='script-row';
      const cSel=document.createElement('select');cSel.className='script-select';
      for(const[cid,cdef] of Object.entries(S.conditionDefs)){
        const opt=document.createElement('option');opt.value=cid;opt.textContent=cdef.name;
        if(cid===cond.type)opt.selected=true;cSel.appendChild(opt);
      }
      cSel.onchange=()=>{cond.type=cSel.value;cond.params={};buildScriptEditor(container,obj,editor);editor._changed()};
      cRow.appendChild(cSel);
      const cDel=document.createElement('button');cDel.className='btn btn-xs';cDel.textContent='✕';
      cDel.onclick=()=>{block.conditions.splice(ci,1);buildScriptEditor(container,obj,editor);editor._changed()};
      cRow.appendChild(cDel);condDiv.appendChild(cRow);
      // Condition params
      const cDef=S.conditionDefs[cond.type];
      if(cDef&&cDef.params.length){
        const cpDiv=document.createElement('div');cpDiv.className='script-params';
        for(const p of cDef.params)cpDiv.appendChild(scriptParamInput(p,cond.params||{},()=>{editor._changed()}));
        condDiv.appendChild(cpDiv);
      }
    }
    const addCondBtn=document.createElement('button');addCondBtn.className='btn btn-xs';addCondBtn.textContent='+ Condition';
    addCondBtn.onclick=()=>{block.conditions.push({type:'always',params:{}});buildScriptEditor(container,obj,editor);editor._changed()};
    condDiv.appendChild(addCondBtn);card.appendChild(condDiv);

    // Actions
    const actDiv=document.createElement('div');actDiv.className='script-section';
    actDiv.innerHTML='<div class="script-section-label">🎯 Alors:</div>';
    for(let ai=0;ai<block.actions.length;ai++){
      const act=block.actions[ai];
      const aRow=document.createElement('div');aRow.className='script-row';
      const aSel=document.createElement('select');aSel.className='script-select';
      for(const[aid,adef] of Object.entries(S.actionDefs)){
        const opt=document.createElement('option');opt.value=aid;opt.textContent=adef.name;
        if(aid===act.type)opt.selected=true;aSel.appendChild(opt);
      }
      aSel.onchange=()=>{act.type=aSel.value;act.params={};buildScriptEditor(container,obj,editor);editor._changed()};
      aRow.appendChild(aSel);
      const aDel=document.createElement('button');aDel.className='btn btn-xs';aDel.textContent='✕';
      aDel.onclick=()=>{block.actions.splice(ai,1);buildScriptEditor(container,obj,editor);editor._changed()};
      aRow.appendChild(aDel);actDiv.appendChild(aRow);
      // Action params
      const aDef=S.actionDefs[act.type];
      if(aDef&&aDef.params.length){
        const apDiv=document.createElement('div');apDiv.className='script-params';
        for(const p of aDef.params)apDiv.appendChild(scriptParamInput(p,act.params||{},()=>{editor._changed()}));
        actDiv.appendChild(apDiv);
      }
    }
    const addActBtn=document.createElement('button');addActBtn.className='btn btn-xs';addActBtn.textContent='+ Action';
    addActBtn.onclick=()=>{block.actions.push({type:'log',params:{message:'hello'}});buildScriptEditor(container,obj,editor);editor._changed()};
    actDiv.appendChild(addActBtn);card.appendChild(actDiv);

    container.appendChild(card);
  }
}

function scriptParamInput(paramDef,paramsObj,onChange){
  const row=document.createElement('div');row.className='script-param-row';
  const lbl=document.createElement('label');lbl.textContent=paramDef.name+':';
  row.appendChild(lbl);
  if(paramDef.type==='select'&&paramDef.options){
    const sel=document.createElement('select');sel.className='script-select small';
    for(const o of paramDef.options){
      const opt=document.createElement('option');opt.value=o;opt.textContent=o;
      if(paramsObj[paramDef.id]===o)opt.selected=true;sel.appendChild(opt);
    }
    sel.onchange=()=>{paramsObj[paramDef.id]=sel.value;onChange()};
    row.appendChild(sel);
  }else if(paramDef.type==='boolean'){
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=paramsObj[paramDef.id]!==false;
    cb.onchange=()=>{paramsObj[paramDef.id]=cb.checked;onChange()};
    row.appendChild(cb);
  }else{
    const inp=document.createElement('input');
    inp.type=paramDef.type==='number'?'number':'text';
    inp.value=paramsObj[paramDef.id]!=null?paramsObj[paramDef.id]:(paramDef.default!=null?paramDef.default:'');
    inp.placeholder=paramDef.name;
    inp.onchange=()=>{
      let v=inp.value;
      if(paramDef.type==='number')v=parseFloat(v)||0;
      paramsObj[paramDef.id]=v;onChange();
    };
    row.appendChild(inp);
  }
  return row;
}

/* ═══ Object Tree Panel ═══ */
function buildObjectTree(container,scene,editor){
  container.innerHTML='';
  if(!scene){container.innerHTML='<p class="inspector-empty">Aucune scène</p>';return}
  const list=document.createElement('div');list.className='object-tree';
  const sorted=[...scene.objects].sort((a,b)=>a.layer-b.layer);
  for(const obj of sorted){
    const item=document.createElement('div');
    item.className='tree-item'+(editor.selectedObject===obj?' selected':'');
    item.innerHTML='<span class="tree-icon">'+(obj.spriteId?'🎨':'📦')+'</span><span class="tree-label">'+obj.id+'</span>'+
      '<span class="tree-meta">L'+obj.layer+(obj.tags.length?' ['+obj.tags.join(',')+']':'')+'</span>';
    item.onclick=()=>{editor.selectObject(obj);buildObjectTree(container,scene,editor)};
    list.appendChild(item);
  }
  container.appendChild(list);
}

window.Editor={SceneEditor,CommandStack,Grid,Gizmo,TilemapBrush,
  buildInspector,buildScriptEditor,buildObjectTree};
})();
