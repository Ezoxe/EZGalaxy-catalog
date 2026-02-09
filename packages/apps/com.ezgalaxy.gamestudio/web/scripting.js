/**
 * Game Studio — Visual Scripting System
 * Event-driven "When/If/Then" blocks — no eval()
 */
(function(){'use strict';

/* ══════════════
   TRIGGERS (When)
   ══════════════ */
const triggerDefs={
  onStart:{name:'Au démarrage',params:[],category:'jeu'},
  onUpdate:{name:'Chaque frame',params:[],category:'jeu'},
  onKeyDown:{name:'Touche pressée',params:[{id:'key',name:'Touche',type:'key'}],category:'entrée'},
  onKeyUp:{name:'Touche relâchée',params:[{id:'key',name:'Touche',type:'key'}],category:'entrée'},
  onKeyHeld:{name:'Touche maintenue',params:[{id:'key',name:'Touche',type:'key'}],category:'entrée'},
  onClick:{name:'Clic souris',params:[],category:'entrée'},
  onCollision:{name:'Collision avec',params:[{id:'tag',name:'Tag',type:'string'}],category:'physique'},
  onTriggerEnter:{name:'Entre dans zone',params:[{id:'tag',name:'Tag',type:'string'}],category:'physique'},
  onTimer:{name:'Chaque X secondes',params:[{id:'interval',name:'Intervalle (s)',type:'number',default:1}],category:'temps'},
  onHPZero:{name:'HP atteint 0',params:[],category:'combat'},
  onDamage:{name:'Reçoit des dégâts',params:[],category:'combat'},
  onVariableChange:{name:'Variable change',params:[{id:'varName',name:'Variable',type:'variable'}],category:'données'},
  onSceneStart:{name:'Début de scène',params:[],category:'jeu'},
  onAnimEnd:{name:'Animation terminée',params:[],category:'animation'},
  onMessage:{name:'Message reçu',params:[{id:'message',name:'Message',type:'string'}],category:'communication'}
};

/* ══════════════
   CONDITIONS (If)
   ══════════════ */
const conditionDefs={
  always:{name:'Toujours',params:[],fn:(ctx)=>true},
  isGrounded:{name:'Est au sol',params:[],fn:(ctx)=>ctx.owner?.body?.grounded===true},
  hpAbove:{name:'HP supérieur à',params:[{id:'value',name:'Valeur',type:'number',default:50}],fn:(ctx,p)=>(ctx.owner?.hp||0)>p.value},
  hpBelow:{name:'HP inférieur à',params:[{id:'value',name:'Valeur',type:'number',default:25}],fn:(ctx,p)=>(ctx.owner?.hp||0)<p.value},
  varEquals:{name:'Variable égale',params:[{id:'varName',name:'Variable',type:'variable'},{id:'value',name:'Valeur',type:'any'}],fn:(ctx,p)=>ctx.getVariable(p.varName)===p.value},
  varGreater:{name:'Variable supérieure',params:[{id:'varName',name:'Variable',type:'variable'},{id:'value',name:'Valeur',type:'number'}],fn:(ctx,p)=>ctx.getVariable(p.varName)>p.value},
  varLess:{name:'Variable inférieure',params:[{id:'varName',name:'Variable',type:'variable'},{id:'value',name:'Valeur',type:'number'}],fn:(ctx,p)=>ctx.getVariable(p.varName)<p.value},
  distanceLess:{name:'Distance < à',params:[{id:'tag',name:'Tag cible',type:'string'},{id:'value',name:'Distance',type:'number',default:100}],fn:(ctx,p)=>{
    const t=ctx.findByTag(p.tag);if(!t)return false;const dx=t.x-ctx.owner.x,dy=t.y-ctx.owner.y;return Math.sqrt(dx*dx+dy*dy)<p.value;
  }},
  random:{name:'Chance (%)',params:[{id:'percent',name:'Probabilité',type:'number',default:50}],fn:(ctx,p)=>Math.random()*100<p.percent},
  keyHeld:{name:'Touche maintenue',params:[{id:'key',name:'Touche',type:'key'}],fn:(ctx,p)=>ctx.input?.isDown(p.key)},
  isAlive:{name:'Est en vie',params:[],fn:(ctx)=>(ctx.owner?.hp||1)>0},
  hasTag:{name:'Possède tag',params:[{id:'tag',name:'Tag',type:'string'}],fn:(ctx,p)=>ctx.owner?.tags?.includes(p.tag)},
  isFacing:{name:'Regarde vers',params:[{id:'dir',name:'Direction',type:'select',options:['droite','gauche']}],fn:(ctx,p)=>p.dir==='droite'?ctx.owner?.facingRight:!ctx.owner?.facingRight}
};

/* ══════════════
   ACTIONS (Then)
   ══════════════ */
const actionDefs={
  move:{name:'Déplacer',category:'mouvement',params:[{id:'dx',name:'X',type:'number',default:0},{id:'dy',name:'Y',type:'number',default:0}],
    fn:(ctx,p)=>{ctx.owner.x+=(p.dx||0);ctx.owner.y+=(p.dy||0)}},
  moveToward:{name:'Déplacer vers',category:'mouvement',params:[{id:'tag',name:'Tag cible',type:'string'},{id:'speed',name:'Vitesse',type:'number',default:100}],
    fn:(ctx,p)=>{const t=ctx.findByTag(p.tag);if(!t)return;const dx=t.x-ctx.owner.x,dy=t.y-ctx.owner.y,d=Math.sqrt(dx*dx+dy*dy);if(d>1){ctx.owner.x+=dx/d*p.speed*ctx.dt;ctx.owner.y+=dy/d*p.speed*ctx.dt}}},
  setVelocity:{name:'Définir vélocité',category:'mouvement',params:[{id:'vx',name:'VX',type:'number',default:0},{id:'vy',name:'VY',type:'number',default:0}],
    fn:(ctx,p)=>{if(ctx.owner.body){ctx.owner.body.vx=p.vx;ctx.owner.body.vy=p.vy}}},
  addForce:{name:'Ajouter force',category:'mouvement',params:[{id:'fx',name:'FX',type:'number',default:0},{id:'fy',name:'FY',type:'number',default:-300}],
    fn:(ctx,p)=>{if(ctx.owner.body)ctx.owner.body.applyImpulse(p.fx*ctx.dt,p.fy*ctx.dt)}},
  jump:{name:'Sauter',category:'mouvement',params:[{id:'force',name:'Force',type:'number',default:-350}],
    fn:(ctx,p)=>{if(ctx.owner.body&&ctx.owner.body.grounded)ctx.owner.body.vy=p.force}},
  teleport:{name:'Téléporter',category:'mouvement',params:[{id:'x',name:'X',type:'number'},{id:'y',name:'Y',type:'number'}],
    fn:(ctx,p)=>{ctx.owner.x=p.x;ctx.owner.y=p.y}},
  setHP:{name:'Définir HP',category:'combat',params:[{id:'value',name:'HP',type:'number',default:100}],
    fn:(ctx,p)=>{ctx.owner.hp=p.value}},
  damage:{name:'Infliger dégâts',category:'combat',params:[{id:'value',name:'Dégâts',type:'number',default:10}],
    fn:(ctx,p)=>{ctx.owner.hp=Math.max(0,(ctx.owner.hp||100)-p.value)}},
  heal:{name:'Soigner',category:'combat',params:[{id:'value',name:'Soin',type:'number',default:20}],
    fn:(ctx,p)=>{ctx.owner.hp=Math.min(ctx.owner.maxHp||100,(ctx.owner.hp||0)+p.value)}},
  destroy:{name:'Détruire',category:'objet',params:[],fn:(ctx)=>{ctx.owner.alive=false;ctx.owner.destroyed=true}},
  spawn:{name:'Créer objet',category:'objet',params:[{id:'prefab',name:'Prefab',type:'string'},{id:'ox',name:'Offset X',type:'number',default:0},{id:'oy',name:'Offset Y',type:'number',default:0}],
    fn:(ctx,p)=>{if(ctx.spawn)ctx.spawn(p.prefab,ctx.owner.x+p.ox,ctx.owner.y+p.oy)}},
  setVariable:{name:'Définir variable',category:'données',params:[{id:'varName',name:'Variable',type:'variable'},{id:'value',name:'Valeur',type:'any'}],
    fn:(ctx,p)=>{ctx.setVariable(p.varName,p.value)}},
  addToVariable:{name:'Ajouter à variable',category:'données',params:[{id:'varName',name:'Variable',type:'variable'},{id:'value',name:'Valeur',type:'number',default:1}],
    fn:(ctx,p)=>{ctx.setVariable(p.varName,(ctx.getVariable(p.varName)||0)+p.value)}},
  playSound:{name:'Jouer son',category:'média',params:[{id:'soundId',name:'Son',type:'sound'}],
    fn:(ctx,p)=>{window.Audio?.play(p.soundId)}},
  playAnimation:{name:'Jouer animation',category:'média',params:[{id:'animId',name:'Animation',type:'animation'}],
    fn:(ctx,p)=>{ctx.owner.currentAnim=p.animId}},
  emitParticles:{name:'Émettre particules',category:'média',params:[{id:'presetId',name:'Preset',type:'particle'}],
    fn:(ctx,p)=>{if(ctx.emitParticles)ctx.emitParticles(p.presetId,ctx.owner.x,ctx.owner.y)}},
  setSprite:{name:'Changer sprite',category:'apparence',params:[{id:'spriteId',name:'Sprite',type:'sprite'}],
    fn:(ctx,p)=>{ctx.owner.spriteId=p.spriteId}},
  setVisible:{name:'Visibilité',category:'apparence',params:[{id:'visible',name:'Visible',type:'boolean',default:true}],
    fn:(ctx,p)=>{ctx.owner.visible=p.visible}},
  setScale:{name:'Échelle',category:'apparence',params:[{id:'sx',name:'X',type:'number',default:1},{id:'sy',name:'Y',type:'number',default:1}],
    fn:(ctx,p)=>{ctx.owner.scaleX=p.sx;ctx.owner.scaleY=p.sy}},
  flipX:{name:'Retourner X',category:'apparence',params:[],fn:(ctx)=>{ctx.owner.facingRight=!ctx.owner.facingRight}},
  sendMessage:{name:'Envoyer message',category:'communication',params:[{id:'message',name:'Message',type:'string'},{id:'tag',name:'Tag cible',type:'string'}],
    fn:(ctx,p)=>{if(ctx.sendMessage)ctx.sendMessage(p.message,p.tag)}},
  switchScene:{name:'Changer scène',category:'jeu',params:[{id:'sceneId',name:'Scène',type:'scene'}],
    fn:(ctx,p)=>{if(ctx.switchScene)ctx.switchScene(p.sceneId)}},
  cameraFollow:{name:'Caméra suit',category:'caméra',params:[],fn:(ctx)=>{if(ctx.cameraFollow)ctx.cameraFollow(ctx.owner)}},
  cameraShake:{name:'Secouer caméra',category:'caméra',params:[{id:'intensity',name:'Intensité',type:'number',default:5},{id:'duration',name:'Durée',type:'number',default:0.3}],
    fn:(ctx,p)=>{if(ctx.cameraShake)ctx.cameraShake(p.intensity,p.duration)}},
  wait:{name:'Attendre',category:'temps',params:[{id:'seconds',name:'Secondes',type:'number',default:1}],fn:(ctx,p)=>{ctx.owner._waitTimer=(ctx.owner._waitTimer||0)+ctx.dt;if(ctx.owner._waitTimer>=p.seconds){ctx.owner._waitTimer=0;return true}return false}},
  log:{name:'Log console',category:'debug',params:[{id:'message',name:'Message',type:'string'}],fn:(ctx,p)=>{console.log('[Script]',p.message,ctx.owner?.id)}}
};

/* ══════════════
   SCRIPT RUNNER
   ══════════════ */
class ScriptBlock{
  constructor(trigger,conditions=[],actions=[]){
    this.trigger=trigger; // {type, params}
    this.conditions=conditions; // [{type, params}]
    this.actions=actions; // [{type, params}]
    this.enabled=true;
    this._timer=0;
  }
}

class ScriptRunner{
  constructor(){this.blocks=[];this.variables={};this.messages=[];this._pendingMessages=[]}

  addBlock(block){this.blocks.push(block);return block}
  removeBlock(block){const i=this.blocks.indexOf(block);if(i>=0)this.blocks.splice(i,1)}

  createContext(owner,dt,engine){
    return{
      owner,dt,
      getVariable:(name)=>this.variables[name],
      setVariable:(name,val)=>{this.variables[name]=val},
      findByTag:(tag)=>engine?.findByTag?.(tag),
      spawn:(prefab,x,y)=>engine?.spawn?.(prefab,x,y),
      emitParticles:(id,x,y)=>engine?.emitParticles?.(id,x,y),
      sendMessage:(msg,tag)=>{this._pendingMessages.push({msg,tag})},
      switchScene:(id)=>engine?.switchScene?.(id),
      cameraFollow:(obj)=>engine?.cameraFollow?.(obj),
      cameraShake:(i,d)=>engine?.cameraShake?.(i,d),
      input:engine?.input||null
    };
  }

  processTrigger(triggerType,owner,dt,engine,eventData={}){
    const ctx=this.createContext(owner,dt,engine);
    for(const block of this.blocks){
      if(!block.enabled||block.trigger.type!==triggerType)continue;
      // Check trigger params match
      const tp=block.trigger.params||{};
      if(triggerType==='onKeyDown'||triggerType==='onKeyUp'||triggerType==='onKeyHeld'){
        if(tp.key&&eventData.key!==tp.key)continue;
      }
      if(triggerType==='onCollision'||triggerType==='onTriggerEnter'){
        if(tp.tag&&!eventData.otherTags?.includes(tp.tag))continue;
      }
      if(triggerType==='onMessage'){
        if(tp.message&&eventData.message!==tp.message)continue;
      }
      if(triggerType==='onTimer'){
        block._timer+=dt;if(block._timer<(tp.interval||1))continue;block._timer=0;
      }
      // Check conditions
      let pass=true;
      for(const cond of block.conditions){
        const def=conditionDefs[cond.type];
        if(def&&!def.fn(ctx,cond.params||{})){pass=false;break}
      }
      if(!pass)continue;
      // Execute actions
      for(const action of block.actions){
        const def=actionDefs[action.type];
        if(def)def.fn(ctx,action.params||{});
      }
    }
    // Flush messages
    this.messages=this._pendingMessages.splice(0);
  }
}

/* ═══ Serialization ═══ */
function serializeScript(blocks){
  return blocks.map(b=>({trigger:b.trigger,conditions:b.conditions.map(c=>({type:c.type,params:c.params})),actions:b.actions.map(a=>({type:a.type,params:a.params})),enabled:b.enabled}));
}
function deserializeScript(data){
  return data.map(d=>new ScriptBlock(d.trigger,d.conditions||[],d.actions||[]));
}

/* ═══ API ═══ */
function getTriggerList(){return Object.entries(triggerDefs).map(([id,t])=>({id,name:t.name,category:t.category,params:t.params}))}
function getConditionList(){return Object.entries(conditionDefs).map(([id,c])=>({id,name:c.name,params:c.params}))}
function getActionList(){return Object.entries(actionDefs).map(([id,a])=>({id,name:a.name,category:a.category,params:a.params}))}

window.Scripting={ScriptBlock,ScriptRunner,triggerDefs,conditionDefs,actionDefs,
  getTriggerList,getConditionList,getActionList,serializeScript,deserializeScript};
})();
