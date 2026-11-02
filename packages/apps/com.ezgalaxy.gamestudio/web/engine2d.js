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
    const typing=e=>{const t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)};
    const GAME_KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
    this._keyDown=e=>{
      if(typing(e))return;
      if(!e.repeat)this.keysJustDown[e.code]=true;
      this.keys[e.code]=true;
      if(GAME_KEYS.includes(e.code))e.preventDefault();
    };
    this._keyUp=e=>{this.keysJustUp[e.code]=true;this.keys[e.code]=false};
    this._blur=()=>{this.keys={}};
    window.addEventListener('keydown',this._keyDown);
    window.addEventListener('keyup',this._keyUp);
    window.addEventListener('blur',this._blur);
    canvas.addEventListener('mousedown',e=>{this.mouse.down=true;this.mouse.clicked=true;this.mouse.button=e.button;if(e.button===2)this.mouse.rightClicked=true;this._updateMousePos(e)});
    canvas.addEventListener('mouseup',e=>{this.mouse.down=false});
    canvas.addEventListener('mousemove',e=>this._updateMousePos(e));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('touchstart',e=>{e.preventDefault();this.touches=Array.from(e.touches).map(t=>this._touchPos(t));this.mouse.down=true;this.mouse.clicked=true;if(e.touches[0])this._updateTouchPos(e.touches[0])},{passive:false});
    canvas.addEventListener('touchend',e=>{this.touches=Array.from(e.touches).map(t=>this._touchPos(t));if(!e.touches.length)this.mouse.down=false});
    canvas.addEventListener('touchmove',e=>{e.preventDefault();this.touches=Array.from(e.touches).map(t=>this._touchPos(t));if(e.touches[0])this._updateTouchPos(e.touches[0])},{passive:false});
  }
  destroy(){
    window.removeEventListener('keydown',this._keyDown);
    window.removeEventListener('keyup',this._keyUp);
    window.removeEventListener('blur',this._blur);
  }
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
      this._physicsWorld.gravity.x=s.gravity?.x??0;
      this._physicsWorld.gravity.y=s.gravity?.y??600;
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
    // Camera: follow the player unless a script chose a target, stay inside the level.
    if(!this.camera.target){
      const player=s.objects.find(o=>o.alive&&(o.tags||[]).includes('player'));
      if(player){this.camera.follow(player);this.camera.x=player.x;this.camera.y=player.y}
      else{this.camera.x=(s.width||this.width)/2;this.camera.y=(s.height||this.height)/2}
    }
    if(s.width&&s.height){
      this.camera.bounds={minX:0,minY:0,maxX:Math.max(s.width,this.width),maxY:Math.max(s.height,this.height)};
    }
    if(this.onSceneStart)this.onSceneStart(s);
  }
  switchScene(id){this.loadScene(id)}

  /* Prefabs */
  registerPrefab(name,factory){this.prefabs[name]=factory}
  spawn(prefabName,x,y){
    const factory=this.prefabs[prefabName];if(!factory)return null;
    const obj=factory(x,y);if(!obj)return null;
    if(!obj.body)attachBody(obj);
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

  // opts.burst: one-shot puff; otherwise a continuous emitter (opts.duration in s, default 1).
  emitParticles(presetId,x,y,opts={}){
    if(!window.Particles||!window.Particles.presets[presetId])return null;
    const o={...opts};
    if(o.burst&&o.duration===undefined)o.duration=0.01;
    if(o.duration===undefined&&!window.Particles.presets[presetId].burst)o.duration=1;
    const e=new window.Particles.Emitter(x,y,presetId,o);
    if(this._particleEmitters.length>40)this._particleEmitters.shift();
    this._particleEmitters.push(e);
    return e;
  }
  sendMessage(msg,tag){this._pendingMessages.push({msg,tag})}

  /* ─── Game Loop ─── */
  start(){
    if(this.running)return;this.running=true;this._lastTime=performance.now();
    const loop=(now)=>{
      this._raf=requestAnimationFrame(loop);
      if(this.paused){if(this.gameOver||this.victory)this._render();return}
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
  stop(){this.running=false;cancelAnimationFrame(this._raf);if(this.input&&this.input.destroy)this.input.destroy()}
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
      // A script moved the object directly: carry the move over to its body.
      if(obj.body&&obj._px!==undefined&&(obj.x!==obj._px||obj.y!==obj._py))obj.body.setCenter(obj.x,obj.y);
    }

    // Physics
    if(this._physicsWorld){
      this._physicsWorld.step(dt);
      // Sync physics body → position (bodies are top-left, objects are centred)
      for(const obj of objs){
        if(!obj.body||!obj.alive)continue;
        const p=obj.body.position;
        obj.x=p.x;obj.y=p.y;obj._px=obj.x;obj._py=obj.y;
      }
      // Collision scripts (solid hits and trigger overlaps)
      const pairs=(this._physicsWorld.getCollisionPairs?.()||[]).concat(this._physicsWorld.getTriggerPairs?.()||[]);
      for(const pair of pairs){
        const a=pair.a?.gameObject,b=pair.b?.gameObject;
        if(!a||!b||!a.alive||!b.alive)continue;
        for(const trig of ['onCollision','onTriggerEnter']){
          if(a.scriptRunner)a.scriptRunner.processTrigger(trig,a,dt,this,{otherTags:b.tags||[],other:b});
          if(b.scriptRunner)b.scriptRunner.processTrigger(trig,b,dt,this,{otherTags:a.tags||[],other:a});
        }
        // Collectibles vanish once the player picks them up.
        for(const [p,item] of [[a,b],[b,a]]){
          if((p.tags||[]).includes('player')&&(item.tags||[]).includes('collectible')&&item.alive){
            item.alive=false;item.destroyed=true;
            this.emitParticles('sparkles',item.x,item.y,{burst:14});
          }
        }
      }
    }

    // Health events: onDamage when HP drops, onHPZero when it reaches 0.
    for(const obj of objs){
      if(!obj.alive||!obj.scriptRunner||typeof obj.hp!=='number')continue;
      const prev=obj._lastHp;
      obj._lastHp=obj.hp;
      if(prev===undefined||obj.hp>=prev)continue;
      obj.scriptRunner.processTrigger('onDamage',obj,dt,this,{amount:prev-obj.hp});
      if(obj.hp<=0&&prev>0)obj.scriptRunner.processTrigger('onHPZero',obj,dt,this,{});
    }
    // Variable changes
    const vars=this.scene.variables||{};
    this._lastVars=this._lastVars||{...vars};
    for(const k in vars){
      if(vars[k]!==this._lastVars[k]){this._lastVars[k]=vars[k];this._fireScripts('onVariableChange',{varName:k})}
    }
    // Out of lives: the game stops on a game-over screen.
    if(typeof vars.lives==='number'&&vars.lives<=0&&!this.gameOver){this.gameOver=true;this.paused=true}

    // Particles
    for(let i=this._particleEmitters.length-1;i>=0;i--){
      this._particleEmitters[i].update(dt);
      if(!this._particleEmitters[i].alive)this._particleEmitters.splice(i,1);
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
      const img=spriteId&&window.Sprites?window.Sprites.renderSprite(spriteId,obj.width,obj.height):null;
      if(img){
        ctx.drawImage(img,-obj.width/2,-obj.height/2,obj.width,obj.height);
      }else if(obj.color){
        ctx.fillStyle=obj.color;
        ctx.fillRect(-obj.width/2,-obj.height/2,obj.width,obj.height);
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
    if(this.showHud!==false)this._drawHud(ctx);
    if(this.onRender)this.onRender(ctx);
  }

  // Score, lives and other script variables, player health, controls reminder.
  _drawHud(ctx){
    const vars={...(this.scene.variables||{})};
    for(const obj of this.scene.objects){
      const v=obj.scriptRunner&&obj.scriptRunner.variables;
      if(v)for(const k in v){if(typeof v[k]==='number'||typeof v[k]==='string')vars[k]=v[k]}
    }
    const labels={score:'Score',lives:'Vies',coins:'Pièces',level:'Niveau',wave:'Vague',gold:'Or',time:'Temps'};
    const entries=Object.entries(vars).slice(0,5);
    const player=this.scene.objects.find(o=>o.alive&&(o.tags||[]).includes('player'));
    ctx.save();
    ctx.font='600 14px system-ui, sans-serif';ctx.textBaseline='middle';
    let y=14;
    if(entries.length||player){
      const h=12+entries.length*22+(player&&player.maxHp?22:0);
      ctx.fillStyle='rgba(8,12,24,0.62)';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(10,10,190,h,10);ctx.fill()}else ctx.fillRect(10,10,190,h);
      y=28;
      for(const [k,v] of entries){
        ctx.fillStyle='#9fb0d0';ctx.textAlign='left';ctx.fillText(labels[k]||k,22,y);
        ctx.fillStyle='#fff';ctx.textAlign='right';ctx.fillText(String(v),188,y);
        y+=22;
      }
      if(player&&player.maxHp){
        const ratio=Math.max(0,Math.min(1,(player.hp||0)/player.maxHp));
        ctx.fillStyle='rgba(255,255,255,0.12)';ctx.fillRect(22,y-5,166,10);
        ctx.fillStyle=ratio>0.5?'#34d399':ratio>0.25?'#fbbf24':'#f87171';ctx.fillRect(22,y-5,166*ratio,10);
      }
    }
    if(this.gameOver||this.victory){
      ctx.fillStyle='rgba(5,8,18,0.72)';ctx.fillRect(0,0,this.width,this.height);
      ctx.textAlign='center';ctx.fillStyle=this.victory?'#34d399':'#f87171';
      ctx.font='800 40px system-ui, sans-serif';ctx.fillText(this.victory?'Victoire !':'Partie terminée',this.width/2,this.height/2-14);
      ctx.fillStyle='#cbd5e1';ctx.font='15px system-ui, sans-serif';
      ctx.fillText("Échap pour revenir à l'éditeur",this.width/2,this.height/2+24);
    }
    ctx.textAlign='center';ctx.font='12px system-ui, sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.fillText(this.hint||'Flèches : bouger · Espace : sauter · Échap : quitter le test',this.width/2,this.height-14);
    ctx.restore();
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

/* Give an object the physics body its tags call for:
   solid = static wall/ground, player/enemy = moving body,
   collectible/obstacle/hazard/goal/projectile = trigger (overlap fires onCollision). */
function attachBody(obj){
  if(!window.Physics||obj.body)return obj.body||null;
  const t=obj.tags||[];
  const solid=t.includes('solid');
  const moving=t.includes('player')||t.includes('enemy');
  const trigger=!solid&&!moving&&['collectible','obstacle','hazard','goal','portal','projectile','bullet'].some(x=>t.includes(x));
  if(!solid&&!moving&&!trigger)return null;
  const body=new window.Physics.Body({x:obj.x-obj.width/2,y:obj.y-obj.height/2,w:obj.width,h:obj.height,static:solid||trigger,trigger,friction:0.4});
  if(t.includes('flying'))body.useGravity=false;
  body.gameObject=obj;obj.body=body;
  return body;
}

window.Engine2D={Engine2D,Input,Camera,TilemapRenderer,SpriteAnimator,GameObject2D,Scene,attachBody};
})();
