/**
 * Game Studio — 2D Game Engine
 * Canvas-based engine: fixed-timestep loop, input, camera, tilemap, sprites, physics/particle/lighting integration
 */
(function(){'use strict';
const FPS=60,DT=1/FPS;

/* ═══ Input Manager ═══ */
class Input{
  constructor(canvas){
    this.keys={};this.keysJustDown={};this.keysJustUp={};
    this.mouse={x:0,y:0,worldX:0,worldY:0,down:false,clicked:false,rightClicked:false,button:0};
    this.touches=[];this._canvas=canvas;
    this._onKey=this._onKey.bind(this);this._onMouse=this._onMouse.bind(this);this._onTouch=this._onTouch.bind(this);
    window.addEventListener('keydown',e=>{if(!e.repeat){this.keysJustDown[e.code]=true}this.keys[e.code]=true;e.preventDefault()});
    window.addEventListener('keyup',e=>{this.keysJustUp[e.code]=true;this.keys[e.code]=false});
    canvas.addEventListener('mousedown',e=>{this.mouse.down=true;this.mouse.clicked=true;this.mouse.button=e.button;if(e.button===2)this.mouse.rightClicked=true;this._updateMousePos(e)});
    canvas.addEventListener('mouseup',e=>{this.mouse.down=false});
    canvas.addEventListener('mousemove',e=>this._updateMousePos(e));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('touchstart',e=>{e.preventDefault();this.touches=Array.from(e.touches).map(t=>this._touchPos(t));this.mouse.down=true;this.mouse.clicked=true;if(e.touches[0])this._updateTouchPos(e.touches[0])},{passive:false});
    canvas.addEventListener('touchend',e=>{this.touches=Array.from(e.touches).map(t=>this._touchPos(t));if(!e.touches.length)this.mouse.down=false});
    canvas.addEventListener('touchmove',e=>{e.preventDefault();this.touches=Array.from(e.touches).map(t=>this._touchPos(t));if(e.touches[0])this._updateTouchPos(e.touches[0])},{passive:false});
  }
  _onKey(){}
  _onMouse(){}
  _onTouch(){}
  _updateMousePos(e){const r=this._canvas.getBoundingClientRect();this.mouse.x=e.clientX-r.left;this.mouse.y=e.clientY-r.top}
  _updateTouchPos(t){const r=this._canvas.getBoundingClientRect();this.mouse.x=t.clientX-r.left;this.mouse.y=t.clientY-r.top}
  _touchPos(t){const r=this._canvas.getBoundingClientRect();return{x:t.clientX-r.left,y:t.clientY-r.top,id:t.identifier}}
  isDown(code){return!!this.keys[code]}
  justDown(code){return!!this.keysJustDown[code]}
  justUp(code){return!!this.keysJustUp[code]}
  endFrame(){this.keysJustDown={};this.keysJustUp={};this.mouse.clicked=false;this.mouse.rightClicked=false}
  updateWorldMouse(cam){this.mouse.worldX=this.mouse.x+cam.x-cam.hw;this.mouse.worldY=this.mouse.y+cam.y-cam.hh}
}

/* ═══ Camera ═══ */
class Camera{
  constructor(w,h){this.x=0;this.y=0;this.w=w;this.h=h;this.hw=w/2;this.hh=h/2;this.zoom=1;
    this.target=null;this.smoothing=0.1;this.shakeX=0;this.shakeY=0;this._shakeDur=0;this._shakeInt=0;
    this.bounds=null; // {minX,minY,maxX,maxY}
  }
  follow(obj){this.target=obj}
  shake(intensity=5,duration=0.3){this._shakeInt=intensity;this._shakeDur=duration}
  update(dt){
    if(this.target){
      this.x+=(this.target.x-this.x)*this.smoothing;
      this.y+=(this.target.y-this.y)*this.smoothing;
    }
    if(this._shakeDur>0){
      this._shakeDur-=dt;
      this.shakeX=(Math.random()-0.5)*2*this._shakeInt;
      this.shakeY=(Math.random()-0.5)*2*this._shakeInt;
    }else{this.shakeX=0;this.shakeY=0}
    if(this.bounds){
      const b=this.bounds;
      this.x=Math.max(b.minX+this.hw,Math.min(b.maxX-this.hw,this.x));
      this.y=Math.max(b.minY+this.hh,Math.min(b.maxY-this.hh,this.y));
    }
  }
  applyTransform(ctx){
    ctx.save();
    ctx.translate(this.hw+this.shakeX,this.hh+this.shakeY);
    ctx.scale(this.zoom,this.zoom);
    ctx.translate(-this.x,-this.y);
  }
  restore(ctx){ctx.restore()}
  screenToWorld(sx,sy){return{x:sx/this.zoom+this.x-this.hw/this.zoom,y:sy/this.zoom+this.y-this.hh/this.zoom}}
  worldToScreen(wx,wy){return{x:(wx-this.x)*this.zoom+this.hw,y:(wy-this.y)*this.zoom+this.hh}}
  isVisible(x,y,w,h){
    const l=this.x-this.hw/this.zoom-w,r=this.x+this.hw/this.zoom+w;
    const t=this.y-this.hh/this.zoom-h,b=this.y+this.hh/this.zoom+h;
    return x>=l&&x<=r&&y>=t&&y<=b;
  }
}

/* ═══ Tilemap Renderer ═══ */
class TilemapRenderer{
  constructor(){this._cache={}}
  render(ctx,tilemap,camera){
    if(!tilemap||!tilemap.data)return;
    const ts=tilemap.tileSize||16;
    const cols=tilemap.cols||0,rows=tilemap.rows||0;
    // Cull to visible
    const startCol=Math.max(0,Math.floor((camera.x-camera.hw/camera.zoom)/ts)-1);
    const endCol=Math.min(cols,Math.ceil((camera.x+camera.hw/camera.zoom)/ts)+1);
    const startRow=Math.max(0,Math.floor((camera.y-camera.hh/camera.zoom)/ts)-1);
    const endRow=Math.min(rows,Math.ceil((camera.y+camera.hh/camera.zoom)/ts)+1);
    for(let r=startRow;r<endRow;r++){
      for(let c=startCol;c<endCol;c++){
        const tileId=tilemap.data[r*cols+c];
        if(!tileId||tileId===0)continue;
        const tile=this._getTileSrc(tileId,ts,tilemap.palette);
        if(tile)ctx.drawImage(tile,c*ts,r*ts,ts,ts);
      }
    }
  }
  _getTileSrc(tileId,ts,palette){
    const key=tileId+'_'+ts;
    if(this._cache[key])return this._cache[key];
    if(window.Tiles){
      const off=document.createElement('canvas');off.width=ts;off.height=ts;
      const tctx=off.getContext('2d');
      const entry=palette?palette[tileId]:null;
      if(entry&&window.Tiles.drawTile){window.Tiles.drawTile(tctx,entry.type||tileId,0,0,ts)}
      else if(window.Tiles.drawTile){window.Tiles.drawTile(tctx,tileId,0,0,ts)}
      this._cache[key]=off;return off;
    }
    return null;
  }
  clearCache(){this._cache={}}
}

/* ═══ Sprite Animator ═══ */
class SpriteAnimator{
  constructor(){this.anims={};this.current=null;this.frame=0;this.timer=0;this.loop=true}
  addAnim(name,frames,fps=8,loop=true){this.anims[name]={frames,fps,loop,dt:1/fps}}
  play(name){if(this.current===name)return;this.current=name;this.frame=0;this.timer=0}
  update(dt){
    if(!this.current)return;const a=this.anims[this.current];if(!a)return;
    this.timer+=dt;if(this.timer>=a.dt){this.timer-=a.dt;this.frame++;
      if(this.frame>=a.frames.length){if(a.loop)this.frame=0;else this.frame=a.frames.length-1}
    }
  }
  getFrame(){const a=this.anims[this.current];return a?a.frames[this.frame]:null}
}

/* ═══ Game Object ═══ */
class GameObject2D{
  constructor(id,x=0,y=0){
    this.id=id;this.x=x;this.y=y;this.width=32;this.height=32;
    this.scaleX=1;this.scaleY=1;this.rotation=0;this.alpha=1;this.visible=true;
    this.facingRight=true;this.layer=0;this.tags=[];this.alive=true;this.destroyed=false;
    this.spriteId=null;this.tint=null;
    this.hp=100;this.maxHp=100;
    this.body=null; // Physics.Body
    this.animator=new SpriteAnimator();
    this.scriptRunner=null;
    this.children=[];this.parent=null;
    this.data={}; // custom data
  }
  addChild(child){child.parent=this;this.children.push(child)}
  removeChild(child){const i=this.children.indexOf(child);if(i>=0){this.children.splice(i,1);child.parent=null}}
  hasTag(tag){return this.tags.includes(tag)}
  addTag(tag){if(!this.tags.includes(tag))this.tags.push(tag)}
  worldX(){return this.parent?this.parent.worldX()+this.x:this.x}
  worldY(){return this.parent?this.parent.worldY()+this.y:this.y}
}

/* ═══ Scene ═══ */
class Scene{
  constructor(id,name){
    this.id=id;this.name=name||id;
    this.objects=[];this.tilemap=null;
    this.bgColor='#1a1a2e';this.bgImage=null;
    this.gravity={x:0,y:600};
    this.ambientLight='#111122';this.lightingEnabled=false;
    this.width=1600;this.height=900;
    this.variables={};
  }
  addObject(obj){this.objects.push(obj);return obj}
  removeObject(obj){const i=this.objects.indexOf(obj);if(i>=0)this.objects.splice(i,1)}
  findByTag(tag){return this.objects.find(o=>o.alive&&o.tags.includes(tag))}
  findAllByTag(tag){return this.objects.filter(o=>o.alive&&o.tags.includes(tag))}
  findById(id){return this.objects.find(o=>o.id===id)}
}

/* ═══ Engine2D ═══ */
class Engine2D{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    this.width=canvas.width;this.height=canvas.height;
    this.input=new Input(canvas);
    this.camera=new Camera(canvas.width,canvas.height);
    this.tilemapRenderer=new TilemapRenderer();
    this.scene=null;this.scenes={};this.prefabs={};
    this.running=false;this.paused=false;this._raf=0;this._accumulator=0;this._lastTime=0;
    this._physicsWorld=null;this._lightingSystem=null;
    this._particleEmitters=[];this._scriptVars={};
    this._pendingMessages=[];
    this.onSceneStart=null;this.onUpdate=null;this.onRender=null;
    this.debug=false;
    this._spriteCache={};
  }

  /* Scene management */
  addScene(scene){this.scenes[scene.id]=scene}
  loadScene(id){
    const s=this.scenes[id];if(!s)return;
    this.scene=s;
    // Init physics world
    if(window.Physics){
      this._physicsWorld=new window.Physics.PhysicsWorld();
      this._physicsWorld.gravity.x=s.gravity?.x||0;
      this._physicsWorld.gravity.y=s.gravity?.y||600;
      // Register bodies
      for(const obj of s.objects){
        if(obj.body){this._physicsWorld.addBody(obj.body);obj.body.gameObject=obj}
      }
    }
    // Init lighting
    if(s.lightingEnabled&&window.Lighting){
      this._lightingSystem=new window.Lighting.LightingSystem(this.width,this.height);
      this._lightingSystem.ambientColor=s.ambientLight||'#111122';
    }else{this._lightingSystem=null}
    this._particleEmitters=[];
    // Fire scene start scripts
    this._fireScripts('onSceneStart',{});
    this._fireScripts('onStart',{});
    if(this.onSceneStart)this.onSceneStart(s);
  }
  switchScene(id){this.loadScene(id)}

  /* Prefabs */
  registerPrefab(name,factory){this.prefabs[name]=factory}
  spawn(prefabName,x,y){
    const factory=this.prefabs[prefabName];if(!factory)return null;
    const obj=factory(x,y);if(!obj)return null;
    if(this.scene){
      this.scene.addObject(obj);
      if(obj.body&&this._physicsWorld){this._physicsWorld.addBody(obj.body);obj.body.gameObject=obj}
    }
    return obj;
  }

  /* Camera */
  cameraFollow(obj){this.camera.follow(obj)}
  cameraShake(intensity,duration){this.camera.shake(intensity,duration)}

  /* Misc engine-level helpers */
  findByTag(tag){return this.scene?.findByTag(tag)}
  findAllByTag(tag){return this.scene?.findAllByTag(tag)||[]}

  emitParticles(presetId,x,y){
    if(!window.Particles)return;
    const e=window.Particles.createEmitter(presetId,x,y);
    if(e)this._particleEmitters.push(e);
    return e;
  }
  sendMessage(msg,tag){this._pendingMessages.push({msg,tag})}

  /* ─── Game Loop ─── */
  start(){
    if(this.running)return;this.running=true;this._lastTime=performance.now();
    const loop=(now)=>{
      this._raf=requestAnimationFrame(loop);
      if(this.paused)return;
      let elapsed=(now-this._lastTime)/1000;
      this._lastTime=now;
      if(elapsed>0.25)elapsed=0.25; // clamp spiral of death
      this._accumulator+=elapsed;
      while(this._accumulator>=DT){
        this._update(DT);
        this._accumulator-=DT;
      }
      this._render();
      this.input.endFrame();
    };
    this._raf=requestAnimationFrame(loop);
  }
  stop(){this.running=false;cancelAnimationFrame(this._raf)}
  pause(){this.paused=true}
  resume(){this.paused=false;this._lastTime=performance.now()}

  /* ─── Update ─── */
  _update(dt){
    if(!this.scene)return;
    const objs=this.scene.objects;
    this.input.updateWorldMouse(this.camera);

    // Input-triggered scripts
    for(const code in this.input.keysJustDown){if(this.input.keysJustDown[code])this._fireScripts('onKeyDown',{key:code})}
    for(const code in this.input.keysJustUp){if(this.input.keysJustUp[code])this._fireScripts('onKeyUp',{key:code})}
    for(const code in this.input.keys){if(this.input.keys[code])this._fireScripts('onKeyHeld',{key:code})}
    if(this.input.mouse.clicked)this._fireScripts('onClick',{});

    // Message dispatching
    for(const m of this._pendingMessages){
      const targets=m.tag?this.findAllByTag(m.tag):objs;
      for(const obj of targets){
        if(obj.scriptRunner)obj.scriptRunner.processTrigger('onMessage',obj,dt,this,{message:m.msg});
      }
    }
    this._pendingMessages=[];

    // Per-frame scripts + timer + animator
    this._fireScripts('onUpdate',{});
    this._fireScripts('onTimer',{});

    for(const obj of objs){
      if(!obj.alive)continue;
      obj.animator.update(dt);
      // Sync physics body → position
      if(obj.body){obj.x=obj.body.position.x;obj.y=obj.body.position.y}
    }

    // Physics
    if(this._physicsWorld){
      this._physicsWorld.step(dt);
      // Collision scripts
      for(const pair of this._physicsWorld.getCollisionPairs?.()||[]){
        const a=pair.a?.gameObject,b=pair.b?.gameObject;
        if(a?.scriptRunner){a.scriptRunner.processTrigger('onCollision',a,dt,this,{otherTags:b?.tags||[]})}
        if(b?.scriptRunner){b.scriptRunner.processTrigger('onCollision',b,dt,this,{otherTags:a?.tags||[]})}
      }
    }

    // Particles
    for(let i=this._particleEmitters.length-1;i>=0;i--){
      this._particleEmitters[i].update(dt);
      if(this._particleEmitters[i].dead)this._particleEmitters.splice(i,1);
    }

    // Lighting day/night
    if(this._lightingSystem)this._lightingSystem.update(dt);

    // Cleanup
    for(let i=objs.length-1;i>=0;i--){
      if(objs[i].destroyed){
        if(objs[i].body&&this._physicsWorld)this._physicsWorld.removeBody(objs[i].body);
        objs.splice(i,1);
      }
    }

    this.camera.update(dt);
    if(this.onUpdate)this.onUpdate(dt);
  }

  _fireScripts(trigger,data){
    if(!this.scene)return;
    for(const obj of this.scene.objects){
      if(!obj.alive||!obj.scriptRunner)continue;
      obj.scriptRunner.processTrigger(trigger,obj,DT,this,data);
    }
  }

  /* ─── Render ─── */
  _render(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.width,this.height);
    if(!this.scene){ctx.fillStyle='#0b0f19';ctx.fillRect(0,0,this.width,this.height);return}

    // Background
    ctx.fillStyle=this.scene.bgColor||'#1a1a2e';
    ctx.fillRect(0,0,this.width,this.height);

    this.camera.applyTransform(ctx);

    // Tilemap
    if(this.scene.tilemap)this.tilemapRenderer.render(ctx,this.scene.tilemap,this.camera);

    // Objects sorted by layer then y
    const sorted=this.scene.objects.filter(o=>o.alive&&o.visible);
    sorted.sort((a,b)=>a.layer-b.layer||(a.y+a.height)-(b.y+b.height));

    for(const obj of sorted){
      if(!this.camera.isVisible(obj.x,obj.y,obj.width*obj.scaleX,obj.height*obj.scaleY))continue;
      ctx.save();
      ctx.globalAlpha=obj.alpha;
      ctx.translate(obj.x,obj.y);
      if(obj.rotation)ctx.rotate(obj.rotation);
      const sx=obj.scaleX*(obj.facingRight?1:-1);
      ctx.scale(sx,obj.scaleY);

      // Sprite
      const spriteId=obj.animator.getFrame()||obj.spriteId;
      if(spriteId&&window.Sprites){
        const img=window.Sprites.renderSprite(spriteId,obj.width,obj.height);
        if(img)ctx.drawImage(img,-obj.width/2,-obj.height/2,obj.width,obj.height);
      }

      // Debug bounds
      if(this.debug){
        ctx.strokeStyle='#0f0';ctx.lineWidth=1;
        ctx.strokeRect(-obj.width/2,-obj.height/2,obj.width,obj.height);
      }
      ctx.restore();

      // Children
      for(const child of obj.children){
        if(!child.visible)continue;
        ctx.save();
        ctx.translate(obj.x+child.x,obj.y+child.y);
        const cSpr=child.animator.getFrame()||child.spriteId;
        if(cSpr&&window.Sprites){
          const img=window.Sprites.renderSprite(cSpr,child.width,child.height);
          if(img)ctx.drawImage(img,-child.width/2,-child.height/2,child.width,child.height);
        }
        ctx.restore();
      }
    }

    // Particles
    for(const em of this._particleEmitters){
      for(const p of em.particles||[]){
        if(!p.alive)continue;
        ctx.save();ctx.globalAlpha=p.alpha||1;ctx.fillStyle=p.color||'#fff';
        ctx.beginPath();ctx.arc(p.x,p.y,p.size||2,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }
    }

    this.camera.restore(ctx);

    // Lighting overlay
    if(this._lightingSystem&&this.scene.lightingEnabled){
      this._lightingSystem.render(ctx,this.camera);
    }

    // HUD layer (post-camera)
    if(this.onRender)this.onRender(ctx);
  }

  /* ─── Resize ─── */
  resize(w,h){
    this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;
    this.camera.w=w;this.camera.h=h;this.camera.hw=w/2;this.camera.hh=h/2;
    if(this._lightingSystem)this._lightingSystem.resize(w,h);
  }

  /* ─── Collision Pairs (simple broad) ─── */
  getCollisionPairs(){
    // Fallback if physics world doesn't expose pairs
    const pairs=[];
    if(!this._physicsWorld)return pairs;
    // The physics world resolves internally; this is for script events
    return pairs;
  }

  /* ─── Snapshot for editor preview ─── */
  renderSnapshot(w,h){
    const off=document.createElement('canvas');off.width=w;off.height=h;
    const octx=off.getContext('2d');
    const oldCtx=this.ctx;const oldW=this.width;const oldH=this.height;
    this.ctx=octx;this.width=w;this.height=h;
    this.camera.w=w;this.camera.h=h;this.camera.hw=w/2;this.camera.hh=h/2;
    this._render();
    this.ctx=oldCtx;this.width=oldW;this.height=oldH;
    this.camera.w=oldW;this.camera.h=oldH;this.camera.hw=oldW/2;this.camera.hh=oldH/2;
    return off;
  }
}

window.Engine2D={Engine2D,Input,Camera,TilemapRenderer,SpriteAnimator,GameObject2D,Scene};
})();
