/**
 * Game Studio — 2D Lighting System
 * Raycasting lights, shadows, ambient, day/night cycle
 */
(function(){'use strict';

class Light2D{
  constructor(opts={}){
    this.x=opts.x||0;this.y=opts.y||0;
    this.radius=opts.radius||150;
    this.color=opts.color||'#ffdd88';
    this.intensity=opts.intensity||1;
    this.type=opts.type||'point'; // 'point','spot','directional'
    this.angle=opts.angle||0;
    this.spread=opts.spread||Math.PI/3;
    this.flickerAmount=opts.flicker||0;
    this.castShadows=opts.shadows!==false;
    this.active=true;
  }
}

class LightingSystem{
  constructor(w=800,h=600){
    this.width=w;this.height=h;
    this.lights=[];
    this.ambientColor='#111122';
    this.ambientIntensity=0.3;
    this.canvas=document.createElement('canvas');
    this.canvas.width=w;this.canvas.height=h;
    this.ctx=this.canvas.getContext('2d');
    this.shadowCasters=[]; // array of {x,y,w,h}
    this.dayNightCycle=false;
    this.dayTime=0.5; // 0=midnight, 0.5=noon, 1=midnight
  }

  addLight(opts){const l=new Light2D(opts);this.lights.push(l);return l}
  removeLight(l){const i=this.lights.indexOf(l);if(i>=0)this.lights.splice(i,1)}
  clear(){this.lights=[]}
  resize(w,h){this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h}

  setShadowCasters(casters){this.shadowCasters=casters}

  render(camX=0,camY=0){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.width,this.height);

    // Day-night ambient
    let ambient=this.ambientIntensity;
    if(this.dayNightCycle){
      const t=this.dayTime;
      ambient=0.1+Math.max(0,Math.sin(t*Math.PI))*0.8;
    }

    // Fill with ambient darkness
    ctx.globalCompositeOperation='source-over';
    const ai=Math.round((1-ambient)*255);
    ctx.fillStyle=`rgba(${this._hexR(this.ambientColor)},${this._hexG(this.ambientColor)},${this._hexB(this.ambientColor)},${1-ambient})`;
    ctx.fillRect(0,0,this.width,this.height);

    // Additive light blending
    ctx.globalCompositeOperation='destination-out';

    for(const light of this.lights){
      if(!light.active)continue;
      const lx=light.x-camX,ly=light.y-camY;
      const flicker=light.flickerAmount>0?1-Math.random()*light.flickerAmount:1;
      const r=light.radius*flicker;

      ctx.save();
      if(light.type==='spot'){
        ctx.beginPath();ctx.moveTo(lx,ly);
        ctx.arc(lx,ly,r,light.angle-light.spread/2,light.angle+light.spread/2);
        ctx.closePath();ctx.clip();
      }

      const grad=ctx.createRadialGradient(lx,ly,0,lx,ly,r);
      grad.addColorStop(0,`rgba(0,0,0,${light.intensity*flicker})`);
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.arc(lx,ly,r,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }

    // Colored light overlay (additive)
    ctx.globalCompositeOperation='source-over';
    const colorCanvas=document.createElement('canvas');
    colorCanvas.width=this.width;colorCanvas.height=this.height;
    const cctx=colorCanvas.getContext('2d');
    cctx.globalCompositeOperation='lighter';

    for(const light of this.lights){
      if(!light.active||light.color==='#ffffff'||light.color==='#fff')continue;
      const lx=light.x-camX,ly=light.y-camY;
      const flicker=light.flickerAmount>0?1-Math.random()*light.flickerAmount:1;
      const r=light.radius*flicker;
      const grad=cctx.createRadialGradient(lx,ly,0,lx,ly,r);
      const c=light.color;
      grad.addColorStop(0,c+'66');
      grad.addColorStop(1,c+'00');
      cctx.fillStyle=grad;cctx.beginPath();cctx.arc(lx,ly,r,0,Math.PI*2);cctx.fill();
    }

    ctx.globalAlpha=0.3;
    ctx.drawImage(colorCanvas,0,0);
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    return this.canvas;
  }

  _hexR(c){return parseInt(c.length>4?c.slice(1,3):c[1]+c[1],16)}
  _hexG(c){return parseInt(c.length>4?c.slice(3,5):c[2]+c[2],16)}
  _hexB(c){return parseInt(c.length>4?c.slice(5,7):c[3]+c[3],16)}

  updateDayNight(dt,speed=0.01){
    if(!this.dayNightCycle)return;
    this.dayTime=(this.dayTime+dt*speed)%1;
  }
}

/* ── 3D Lighting helpers for THREE.js integration ── */
function create3DLight(type,opts={}){
  const T=window.THREE;if(!T)return null;
  const col=new T.Color(opts.color||'#ffffff');
  switch(type){
    case'ambient':return new T.AmbientLight(col,opts.intensity||0.4);
    case'directional':{const l=new T.DirectionalLight(col,opts.intensity||0.8);l.position.set(opts.x||5,opts.y||10,opts.z||5);return l}
    case'point':{const l=new T.PointLight(col,opts.intensity||1,opts.distance||50);l.position.set(opts.x||0,opts.y||5,opts.z||0);return l}
    case'spot':{const l=new T.SpotLight(col,opts.intensity||1,opts.distance||50,opts.angle||Math.PI/6);l.position.set(opts.x||0,opts.y||10,opts.z||0);return l}
    default:return null;
  }
}

/* ── Lighting presets ── */
const presets={
  torch:{color:'#ff8844',radius:120,intensity:0.9,flicker:0.15},
  campfire:{color:'#ff6622',radius:180,intensity:1,flicker:0.2},
  lantern:{color:'#ffdd88',radius:100,intensity:0.7,flicker:0.05},
  moonlight:{color:'#8888ff',radius:400,intensity:0.4,flicker:0},
  sunlight:{color:'#ffffcc',radius:600,intensity:0.9,flicker:0},
  neon_red:{color:'#ff2244',radius:80,intensity:0.8,flicker:0},
  neon_blue:{color:'#2244ff',radius:80,intensity:0.8,flicker:0},
  neon_green:{color:'#22ff44',radius:80,intensity:0.8,flicker:0},
  crystal:{color:'#44ddff',radius:60,intensity:0.6,flicker:0.03},
  lava:{color:'#ff4400',radius:150,intensity:0.7,flicker:0.1},
  magic:{color:'#aa44ff',radius:100,intensity:0.8,flicker:0.08},
  firefly:{color:'#88ff44',radius:30,intensity:0.5,flicker:0.3},
  explosion_light:{color:'#ff8800',radius:250,intensity:1,flicker:0},
  portal_light:{color:'#7744ff',radius:120,intensity:0.9,flicker:0.05},
  underwater:{color:'#2266aa',radius:200,intensity:0.5,flicker:0.02}
};

function getPresetList(){return Object.entries(presets).map(([id,p])=>({id,name:{torch:'Torche',campfire:'Feu de camp',lantern:'Lanterne',moonlight:'Clair de lune',sunlight:'Soleil',neon_red:'Néon rouge',neon_blue:'Néon bleu',neon_green:'Néon vert',crystal:'Cristal',lava:'Lave',magic:'Magie',firefly:'Luciole',explosion_light:'Explosion',portal_light:'Portail',underwater:'Sous-marin'}[id]||id,...p}))}

window.Lighting={Light2D,System:LightingSystem,create3DLight,presets,getPresetList};
})();
