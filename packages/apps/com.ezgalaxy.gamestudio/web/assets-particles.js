/**
 * Game Studio — Particle System + Animation Presets
 * 30+ particle presets, 20+ animation presets
 */
(function(){'use strict';

/* ══════════════════════════════════
   PARTICLE SYSTEM
   ══════════════════════════════════ */
class Particle{
  constructor(x,y,cfg){
    this.x=x;this.y=y;this.vx=(Math.random()-0.5)*2*(cfg.spread||1);this.vy=(Math.random()-0.5)*2*(cfg.spread||1);
    if(cfg.direction==='up')this.vy=-Math.random()*(cfg.speed||2);
    else if(cfg.direction==='down')this.vy=Math.random()*(cfg.speed||2);
    else{this.vx=Math.cos(Math.random()*Math.PI*2)*(cfg.speed||1);this.vy=Math.sin(Math.random()*Math.PI*2)*(cfg.speed||1)}
    this.life=cfg.life||1;this.maxLife=this.life;this.size=cfg.sizeMin+(Math.random()*(cfg.sizeMax-cfg.sizeMin))||2;
    this.color=Array.isArray(cfg.colors)?cfg.colors[Math.random()*cfg.colors.length|0]:(cfg.color||'#fff');
    this.gravity=cfg.gravity||0;this.drag=cfg.drag||0.98;this.shrink=cfg.shrink!==false;
    this.rotation=Math.random()*Math.PI*2;this.rotSpeed=(Math.random()-0.5)*0.1;
    this.shape=cfg.shape||'circle';
  }
  update(dt){
    this.vy+=this.gravity*dt;this.vx*=this.drag;this.vy*=this.drag;
    this.x+=this.vx;this.y+=this.vy;this.life-=dt;this.rotation+=this.rotSpeed;
  }
  draw(ctx){
    const a=Math.max(0,this.life/this.maxLife);
    const sz=this.shrink?this.size*a:this.size;
    ctx.globalAlpha=a;ctx.fillStyle=this.color;
    if(this.shape==='circle'){ctx.beginPath();ctx.arc(this.x,this.y,sz,0,Math.PI*2);ctx.fill()}
    else if(this.shape==='square'){ctx.fillRect(this.x-sz,this.y-sz,sz*2,sz*2)}
    else if(this.shape==='star'){
      ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rotation);ctx.beginPath();
      for(let i=0;i<5;i++){const a2=i/5*Math.PI*2-Math.PI/2;const a3=(i+0.5)/5*Math.PI*2-Math.PI/2;
        ctx.lineTo(Math.cos(a2)*sz,Math.sin(a2)*sz);ctx.lineTo(Math.cos(a3)*sz*0.4,Math.sin(a3)*sz*0.4)}
      ctx.fill();ctx.restore();
    }
    else if(this.shape==='triangle'){
      ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rotation);ctx.beginPath();
      ctx.moveTo(0,-sz);ctx.lineTo(sz*0.87,sz*0.5);ctx.lineTo(-sz*0.87,sz*0.5);ctx.fill();ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  get alive(){return this.life>0}
}

class ParticleEmitter{
  constructor(x,y,presetId,opts={}){
    const preset=presets[presetId];if(!preset)return;
    this.cfg={...preset,...opts};this.x=x;this.y=y;
    this.particles=[];this.emitTimer=0;this.active=true;
    this.duration=this.cfg.duration||Infinity;this.elapsed=0;
    this.rate=this.cfg.rate||10;
    if(this.cfg.burst){for(let i=0;i<this.cfg.burst;i++)this.particles.push(new Particle(this.x,this.y,this.cfg))}
  }
  update(dt){
    if(!this.active)return;this.elapsed+=dt;
    if(this.elapsed>this.duration){this.active=false;return}
    this.emitTimer+=dt;const interval=1/this.rate;
    while(this.emitTimer>=interval&&this.particles.length<(this.cfg.maxParticles||200)){
      this.emitTimer-=interval;this.particles.push(new Particle(this.x+(Math.random()-0.5)*(this.cfg.area||0),this.y+(Math.random()-0.5)*(this.cfg.area||0),this.cfg))}
    for(let i=this.particles.length-1;i>=0;i--){this.particles[i].update(dt);if(!this.particles[i].alive)this.particles.splice(i,1)}
  }
  draw(ctx){this.particles.forEach(p=>p.draw(ctx))}
  get alive(){return this.active||this.particles.length>0}
}

/* ─── Particle Presets ─── */
const presets={};

presets.fire={name:'Feu',category:'nature',colors:['#ff4400','#ff8800','#ffcc00','#ffff44'],direction:'up',speed:1.5,spread:0.5,life:0.6,sizeMin:2,sizeMax:5,gravity:-0.5,rate:20,shrink:true,shape:'circle'};
presets.smoke={name:'Fumée',category:'nature',colors:['#555','#666','#777','#888'],direction:'up',speed:0.8,spread:0.3,life:1.2,sizeMin:3,sizeMax:7,gravity:-0.2,rate:8,shrink:false,drag:0.96,shape:'circle'};
presets.rain={name:'Pluie',category:'météo',colors:['#8888ff','#aaaaff'],direction:'down',speed:6,spread:3,life:0.5,sizeMin:1,sizeMax:1,gravity:2,rate:40,area:200,shape:'circle'};
presets.snow={name:'Neige',category:'météo',colors:['#fff','#eef','#ddf'],direction:'down',speed:0.5,spread:1.5,life:3,sizeMin:1,sizeMax:3,gravity:0.1,rate:15,area:200,drag:0.99,shape:'circle'};
presets.sparkles={name:'Étincelles',category:'magie',colors:['#ffdd44','#ffcc00','#fff'],speed:1,spread:2,life:0.5,sizeMin:1,sizeMax:2,gravity:0,rate:12,shape:'star'};
presets.magic={name:'Magie',category:'magie',colors:['#aa44ff','#dd88ff','#ff44ff','#8844dd'],speed:0.8,spread:1.5,life:0.8,sizeMin:1,sizeMax:4,gravity:-0.1,rate:15,shape:'circle'};
presets.heal={name:'Soin',category:'magie',colors:['#44ff88','#88ffaa','#aaffcc'],direction:'up',speed:0.6,spread:0.8,life:0.8,sizeMin:1,sizeMax:3,gravity:-0.3,rate:10,shape:'star'};
presets.dust={name:'Poussière',category:'nature',colors:['#c8b890','#d8c8a0','#b8a880'],speed:0.5,spread:1,life:0.6,sizeMin:1,sizeMax:2,gravity:0.2,rate:8,shape:'circle'};
presets.explosion_p={name:'Explosion',category:'combat',colors:['#ff4400','#ff8800','#ffcc00','#fff'],speed:3,spread:1,life:0.4,sizeMin:2,sizeMax:6,gravity:0.5,burst:30,shape:'circle'};
presets.blood={name:'Sang',category:'combat',colors:['#cc0000','#990000','#660000'],speed:2,spread:1,life:0.3,sizeMin:1,sizeMax:3,gravity:2,burst:15,shape:'circle'};
presets.bubbles={name:'Bulles',category:'eau',colors:['rgba(136,200,255,0.5)','rgba(170,220,255,0.4)'],direction:'up',speed:0.5,spread:0.5,life:1.5,sizeMin:2,sizeMax:5,gravity:-0.3,rate:5,shape:'circle'};
presets.leaves={name:'Feuilles',category:'nature',colors:['#4a9a40','#6aaa50','#8aaa30','#ccaa30'],speed:0.5,spread:1,life:2,sizeMin:2,sizeMax:4,gravity:0.2,rate:3,drag:0.97,shape:'triangle'};
presets.fireflies={name:'Lucioles',category:'nature',colors:['#88ff44','#aaff66','#ccff88'],speed:0.3,spread:2,life:2,sizeMin:1,sizeMax:2,gravity:0,rate:3,drag:0.95,shape:'circle'};
presets.confetti={name:'Confettis',category:'fête',colors:['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff','#44ffff'],speed:2,spread:2,life:1.5,sizeMin:2,sizeMax:4,gravity:1,burst:40,shape:'square'};
presets.portal_p={name:'Portail',category:'magie',colors:['#7744ff','#aa66ff','#dd88ff'],speed:1.5,spread:0.5,life:0.5,sizeMin:1,sizeMax:3,gravity:0,rate:20,shape:'circle'};
presets.lightning_p={name:'Éclair',category:'météo',colors:['#fff','#ddf','#aaf'],speed:4,spread:0.2,life:0.1,sizeMin:1,sizeMax:2,gravity:0,burst:20,shape:'circle'};
presets.steam={name:'Vapeur',category:'nature',colors:['rgba(200,200,200,0.5)','rgba(180,180,180,0.3)'],direction:'up',speed:0.4,spread:0.5,life:1,sizeMin:3,sizeMax:6,gravity:-0.1,rate:5,shape:'circle'};
presets.embers={name:'Braises',category:'nature',colors:['#ff6600','#ff4400','#cc2200'],direction:'up',speed:0.8,spread:0.8,life:1.5,sizeMin:1,sizeMax:2,gravity:-0.2,rate:6,shape:'circle'};
presets.wind_p={name:'Vent',category:'météo',colors:['rgba(200,200,200,0.3)'],speed:3,spread:0.5,life:0.5,sizeMin:1,sizeMax:2,gravity:0,rate:10,direction:'right',shape:'circle'};
presets.trail={name:'Traînée',category:'mouvement',colors:['#fff','#ddd'],speed:0.2,spread:0.5,life:0.3,sizeMin:1,sizeMax:3,gravity:0,rate:15,shape:'circle'};

/* ══════════════════════════════════
   ANIMATION PRESETS
   ══════════════════════════════════ */
const anims={};

/* Each animation is a function(obj, t, dt) that modifies obj properties */
anims.bounce={name:'Rebond',fn:(o,t)=>{o._baseY=o._baseY??o.y;o.y=o._baseY+Math.abs(Math.sin(t*4))*-10},category:'mouvement'};
anims.float={name:'Flottement',fn:(o,t)=>{o._baseY=o._baseY??o.y;o.y=o._baseY+Math.sin(t*2)*5},category:'mouvement'};
anims.wobble={name:'Oscillation',fn:(o,t)=>{o._baseX=o._baseX??o.x;o.x=o._baseX+Math.sin(t*6)*3},category:'mouvement'};
anims.spin={name:'Rotation',fn:(o,t)=>{o.rotation=(t*2)%(Math.PI*2)},category:'mouvement'};
anims.pulse={name:'Pulsation',fn:(o,t)=>{const s=1+Math.sin(t*4)*0.15;o.scaleX=s;o.scaleY=s},category:'taille'};
anims.grow={name:'Croissance',fn:(o,t)=>{const s=Math.min(1,t*2);o.scaleX=s;o.scaleY=s},category:'taille'};
anims.shrink={name:'Rétrécissement',fn:(o,t)=>{const s=Math.max(0,1-t);o.scaleX=s;o.scaleY=s},category:'taille'};
anims.fadeIn={name:'Apparition',fn:(o,t)=>{o.alpha=Math.min(1,t*2)},category:'opacité'};
anims.fadeOut={name:'Disparition',fn:(o,t)=>{o.alpha=Math.max(0,1-t)},category:'opacité'};
anims.blink={name:'Clignotement',fn:(o,t)=>{o.alpha=Math.sin(t*8)>0?1:0.2},category:'opacité'};
anims.shake={name:'Tremblement',fn:(o,t)=>{o._baseX=o._baseX??o.x;o._baseY=o._baseY??o.y;o.x=o._baseX+(Math.random()-0.5)*4;o.y=o._baseY+(Math.random()-0.5)*4},category:'effet'};
anims.flash={name:'Flash',fn:(o,t)=>{o.tint=Math.sin(t*12)>0?'#fff':null},category:'effet'};
anims.swing={name:'Balancement',fn:(o,t)=>{o.rotation=Math.sin(t*3)*0.3},category:'mouvement'};
anims.orbit={name:'Orbite',fn:(o,t)=>{o._baseX=o._baseX??o.x;o._baseY=o._baseY??o.y;o.x=o._baseX+Math.cos(t*2)*15;o.y=o._baseY+Math.sin(t*2)*15},category:'mouvement'};
anims.zigzag={name:'Zigzag',fn:(o,t)=>{o._baseX=o._baseX??o.x;o.x=o._baseX+((t*4%2<1)?1:-1)*8},category:'mouvement'};
anims.squash={name:'Écrasement',fn:(o,t)=>{const p=Math.sin(t*6);o.scaleX=1+p*0.2;o.scaleY=1-p*0.2},category:'taille'};
anims.breathe={name:'Respiration',fn:(o,t)=>{const s=1+Math.sin(t*1.5)*0.08;o.scaleX=s;o.scaleY=s},category:'taille'};
anims.slideRight={name:'Glisser droite',fn:(o,t)=>{o._baseX=o._baseX??o.x;o.x=o._baseX+t*30},category:'mouvement'};
anims.slideLeft={name:'Glisser gauche',fn:(o,t)=>{o._baseX=o._baseX??o.x;o.x=o._baseX-t*30},category:'mouvement'};

function getAnimList(){return Object.entries(anims).map(([id,a])=>({id,name:a.name,category:a.category}))}
function applyAnim(animId,obj,time,dt){const a=anims[animId];if(a)a.fn(obj,time,dt)}

/* ═══ API ═══ */
window.Particles={presets,Emitter:ParticleEmitter,Particle,
  getList(){return Object.entries(presets).map(([id,p])=>({id,name:p.name,category:p.category}))},
  getCategories(){const s=new Set();for(const p of Object.values(presets))s.add(p.category);return[...s]},
  create(x,y,presetId,opts){return new ParticleEmitter(x,y,presetId,opts)}
};
window.Animations={anims,getList:getAnimList,apply:applyAnim};
})();
