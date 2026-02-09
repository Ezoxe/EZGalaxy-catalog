/**
 * Game Studio — AI System
 * FSM-based AI, A* pathfinding, preset behaviors, dialogue, spawning
 */
(function(){'use strict';
const Vec2=window.Physics?.Vec2||(function(){function V(x,y){this.x=x||0;this.y=y||0}V.prototype.sub=function(v){return new V(this.x-v.x,this.y-v.y)};V.prototype.len=function(){return Math.sqrt(this.x*this.x+this.y*this.y)};V.prototype.norm=function(){const l=this.len();return l>0?new V(this.x/l,this.y/l):new V()};V.prototype.mul=function(s){return new V(this.x*s,this.y*s)};return V})();

/* ══════════════════════════════════
   FINITE STATE MACHINE
   ══════════════════════════════════ */
class FSM{
  constructor(){this.states={};this.current=null;this.previous=null;this.owner=null}
  addState(name,cfg){this.states[name]={enter:cfg.enter||null,update:cfg.update||null,exit:cfg.exit||null,transitions:cfg.transitions||{}};return this}
  setState(name){
    if(this.current===name)return;
    if(this.current&&this.states[this.current]?.exit)this.states[this.current].exit(this.owner);
    this.previous=this.current;this.current=name;
    if(this.states[name]?.enter)this.states[name].enter(this.owner);
  }
  update(dt){
    const s=this.states[this.current];if(!s)return;
    if(s.update)s.update(this.owner,dt);
    // Check transitions
    for(const[target,cond]of Object.entries(s.transitions)){
      if(cond(this.owner)){this.setState(target);break}
    }
  }
}

/* ══════════════════════════════════
   A* PATHFINDING
   ══════════════════════════════════ */
class PathGrid{
  constructor(w,h,cellSize=32){
    this.w=w;this.h=h;this.cellSize=cellSize;
    this.cols=Math.ceil(w/cellSize);this.rows=Math.ceil(h/cellSize);
    this.grid=new Uint8Array(this.cols*this.rows); // 0=walkable, 1=blocked
  }
  setBlocked(cx,cy,blocked=true){if(cx>=0&&cx<this.cols&&cy>=0&&cy<this.rows)this.grid[cy*this.cols+cx]=blocked?1:0}
  isBlocked(cx,cy){if(cx<0||cx>=this.cols||cy<0||cy>=this.rows)return true;return this.grid[cy*this.cols+cx]===1}
  worldToCell(x,y){return{cx:Math.floor(x/this.cellSize),cy:Math.floor(y/this.cellSize)}}
  cellToWorld(cx,cy){return{x:cx*this.cellSize+this.cellSize/2,y:cy*this.cellSize+this.cellSize/2}}

  findPath(sx,sy,ex,ey){
    const s=this.worldToCell(sx,sy),e=this.worldToCell(ex,ey);
    if(this.isBlocked(e.cx,e.cy))return null;
    const open=[];const closed=new Set();const parent=new Map();
    const g=new Map();const f=new Map();
    const key=(cx,cy)=>cy*this.cols+cx;
    const h=(cx,cy)=>Math.abs(cx-e.cx)+Math.abs(cy-e.cy);

    const sk=key(s.cx,s.cy);g.set(sk,0);f.set(sk,h(s.cx,s.cy));open.push({cx:s.cx,cy:s.cy,f:f.get(sk)});

    const dirs=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]];

    while(open.length>0){
      open.sort((a,b)=>a.f-b.f);
      const cur=open.shift();const ck=key(cur.cx,cur.cy);
      if(cur.cx===e.cx&&cur.cy===e.cy){
        // Reconstruct path
        const path=[];let k=ck;while(k!==undefined){
          const cy2=Math.floor(k/this.cols),cx2=k%this.cols;
          const wp=this.cellToWorld(cx2,cy2);path.unshift(wp);k=parent.get(k)}
        return path;
      }
      closed.add(ck);
      for(const[ddx,ddy]of dirs){
        const nx=cur.cx+ddx,ny=cur.cy+ddy;
        if(this.isBlocked(nx,ny))continue;
        const nk=key(nx,ny);if(closed.has(nk))continue;
        const isDiag=ddx!==0&&ddy!==0;
        if(isDiag&&(this.isBlocked(cur.cx+ddx,cur.cy)||this.isBlocked(cur.cx,cur.cy+ddy)))continue;
        const ng=g.get(ck)+(isDiag?1.414:1);
        if(!g.has(nk)||ng<g.get(nk)){
          g.set(nk,ng);f.set(nk,ng+h(nx,ny));parent.set(nk,ck);
          if(!open.find(o=>o.cx===nx&&o.cy===ny))open.push({cx:nx,cy:ny,f:f.get(nk)});
        }
      }
    }
    return null; // No path
  }
}

/* ══════════════════════════════════
   AI BEHAVIORS (Presets)
   ══════════════════════════════════ */
const behaviors={};

behaviors.patrol={
  name:'Patrouille',category:'mouvement',
  create(opts={}){
    const points=opts.points||[{x:0,y:0},{x:100,y:0}];
    const speed=opts.speed||60;let idx=0;
    return{
      update(owner,dt){
        const target=points[idx];const dx=target.x-owner.x,dy=target.y-owner.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<5){idx=(idx+1)%points.length;return}
        owner.x+=dx/dist*speed*dt;owner.y+=dy/dist*speed*dt;
        owner.facingRight=dx>0;
      }
    };
  }
};

behaviors.chase={
  name:'Poursuite',category:'combat',
  create(opts={}){
    const speed=opts.speed||80;const range=opts.range||200;const loseRange=opts.loseRange||300;
    return{
      update(owner,dt,target){
        if(!target)return;
        const dx=target.x-owner.x,dy=target.y-owner.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>loseRange||dist<10)return;
        if(dist<=range){owner.x+=dx/dist*speed*dt;owner.y+=dy/dist*speed*dt;owner.facingRight=dx>0}
      },
      inRange(owner,target){
        if(!target)return false;
        const dx=target.x-owner.x,dy=target.y-owner.y;
        return Math.sqrt(dx*dx+dy*dy)<=500;
      }
    };
  }
};

behaviors.flee={
  name:'Fuite',category:'mouvement',
  create(opts={}){
    const speed=opts.speed||90;const range=opts.range||150;
    return{
      update(owner,dt,target){
        if(!target)return;
        const dx=owner.x-target.x,dy=owner.y-target.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>range)return;
        if(dist<1)return;
        owner.x+=dx/dist*speed*dt;owner.y+=dy/dist*speed*dt;
      }
    };
  }
};

behaviors.wander={
  name:'Errance',category:'mouvement',
  create(opts={}){
    const speed=opts.speed||40;const changeInterval=opts.interval||2;
    let angle=Math.random()*Math.PI*2;let timer=0;
    return{
      update(owner,dt){
        timer+=dt;if(timer>=changeInterval){timer=0;angle+=((Math.random()-0.5)*Math.PI)}
        owner.x+=Math.cos(angle)*speed*dt;owner.y+=Math.sin(angle)*speed*dt;
      }
    };
  }
};

behaviors.guard={
  name:'Garde',category:'combat',
  create(opts={}){
    const guardX=opts.x||0;const guardY=opts.y||0;const radius=opts.radius||100;const speed=opts.speed||50;
    return{
      update(owner,dt,target){
        // Return to guard position if no target
        const dx=guardX-owner.x,dy=guardY-owner.y;
        const distHome=Math.sqrt(dx*dx+dy*dy);
        if(target){
          const tdx=target.x-owner.x,tdy=target.y-owner.y;
          const tdist=Math.sqrt(tdx*tdx+tdy*tdy);
          if(tdist<=radius&&distHome<=radius*2){
            owner.x+=tdx/tdist*speed*dt;owner.y+=tdy/tdist*speed*dt;return;
          }
        }
        if(distHome>5){owner.x+=dx/distHome*speed*dt;owner.y+=dy/distHome*speed*dt}
      }
    };
  }
};

behaviors.follow={
  name:'Suivre',category:'mouvement',
  create(opts={}){
    const speed=opts.speed||70;const minDist=opts.minDist||40;
    return{
      update(owner,dt,target){
        if(!target)return;
        const dx=target.x-owner.x,dy=target.y-owner.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>minDist){owner.x+=dx/dist*speed*dt;owner.y+=dy/dist*speed*dt;owner.facingRight=dx>0}
      }
    };
  }
};

behaviors.shooter={
  name:'Tireur',category:'combat',
  create(opts={}){
    const fireRate=opts.fireRate||1;const range=opts.range||250;
    let timer=0;
    return{
      update(owner,dt,target){
        if(!target)return;timer+=dt;
        const dx=target.x-owner.x,dy=target.y-owner.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<=range&&timer>=1/fireRate){
          timer=0;
          if(owner.onShoot)owner.onShoot(dx/dist,dy/dist);
        }
      }
    };
  }
};

behaviors.boss={
  name:'Boss',category:'combat',
  create(opts={}){
    const phases=opts.phases||[{hpThreshold:1,behavior:'chase'},{hpThreshold:0.5,behavior:'shooter'}];
    const instances={};
    for(const p of phases){instances[p.behavior]=behaviors[p.behavior]?.create(opts)||{update(){}}}
    return{
      update(owner,dt,target){
        const hpRatio=(owner.hp||1)/(owner.maxHp||1);
        let current=phases[0];
        for(const p of phases){if(hpRatio<=p.hpThreshold)current=p}
        instances[current.behavior]?.update(owner,dt,target);
      }
    };
  }
};

behaviors.flying={
  name:'Vol',category:'mouvement',
  create(opts={}){
    const speed=opts.speed||60;const amplitude=opts.amplitude||30;const freq=opts.freq||2;
    let t=Math.random()*10;
    return{
      update(owner,dt,target){
        t+=dt;owner._baseY=owner._baseY??owner.y;
        owner.y=owner._baseY+Math.sin(t*freq)*amplitude;
        if(target){
          const dx=target.x-owner.x;
          if(Math.abs(dx)>10)owner.x+=Math.sign(dx)*speed*dt;
          owner.facingRight=dx>0;
        }
      }
    };
  }
};

/* ══════════════════════════════════
   DIALOGUE SYSTEM
   ══════════════════════════════════ */
class DialogueTree{
  constructor(nodes=[]){this.nodes=nodes;this.currentIndex=0;this.active=false;this.onComplete=null}
  start(){this.currentIndex=0;this.active=true;return this.getCurrent()}
  getCurrent(){return this.currentIndex<this.nodes.length?this.nodes[this.currentIndex]:null}
  next(choiceIndex=0){
    const node=this.getCurrent();if(!node){this.active=false;return null}
    if(node.choices&&node.choices[choiceIndex]?.next!==undefined){this.currentIndex=node.choices[choiceIndex].next}
    else{this.currentIndex++}
    if(this.currentIndex>=this.nodes.length){this.active=false;if(this.onComplete)this.onComplete();return null}
    return this.getCurrent();
  }
}

/* ══════════════════════════════════
   SPAWN SYSTEM
   ══════════════════════════════════ */
class Spawner{
  constructor(opts={}){
    this.x=opts.x||0;this.y=opts.y||0;
    this.interval=opts.interval||3;
    this.maxCount=opts.max||5;
    this.spawnFn=opts.spawn||null;
    this.spawned=[];this.timer=0;this.active=true;
  }
  update(dt){
    if(!this.active)return;
    this.spawned=this.spawned.filter(s=>s.alive!==false);
    if(this.spawned.length>=this.maxCount)return;
    this.timer+=dt;
    if(this.timer>=this.interval){this.timer=0;if(this.spawnFn){const s=this.spawnFn(this.x,this.y);if(s)this.spawned.push(s)}}
  }
}

/* ═══ API ═══ */
function getBehaviorList(){return Object.entries(behaviors).map(([id,b])=>({id,name:b.name,category:b.category}))}
function createBehavior(id,opts){const b=behaviors[id];return b?b.create(opts):null}

window.AI={FSM,PathGrid,behaviors,getBehaviorList,createBehavior,DialogueTree,Spawner};
})();
