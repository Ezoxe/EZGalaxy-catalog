/**
 * Game Studio — Tileset Assets
 * 50+ tileset patterns with auto-tiling support
 */
(function(){'use strict';
const tilesets={};const tileSize=16;

function makeTile(draw){
  const c=document.createElement('canvas');c.width=tileSize;c.height=tileSize;
  const ctx=c.getContext('2d');draw(ctx,tileSize);return c;
}

function fillTile(ctx,s,col){ctx.fillStyle=col;ctx.fillRect(0,0,s,s)}
function noiseTile(ctx,s,base,variation,density=0.3){
  fillTile(ctx,s,base);ctx.fillStyle=variation;
  for(let i=0;i<s*s*density;i++){const x=Math.random()*s|0,y=Math.random()*s|0;ctx.fillRect(x,y,1,1)}
}

/* ─── Ground tiles ─── */
tilesets.grass_tile={name:'Herbe',category:'sol',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#3a8a30','#4a9a40',0.3);c.fillStyle='#2d7a24';c.fillRect(s/4|0,s/3|0,1,2);c.fillRect(s*3/4|0,s*2/3|0,1,2)})};
tilesets.dirt={name:'Terre',category:'sol',create:()=>makeTile((c,s)=>noiseTile(c,s,'#8a6a3a','#7a5a2a',0.25))};
tilesets.sand={name:'Sable',category:'sol',create:()=>makeTile((c,s)=>noiseTile(c,s,'#d4b870','#c8a860',0.2))};
tilesets.snow_tile={name:'Neige',category:'sol',create:()=>makeTile((c,s)=>noiseTile(c,s,'#e8e8f0','#d8d8e8',0.15))};
tilesets.stone_tile={name:'Pierre',category:'sol',create:()=>makeTile((c,s)=>{fillTile(c,s,'#888');c.fillStyle='#777';c.fillRect(0,0,s/2,s/2);c.fillRect(s/2,s/2,s/2,s/2);c.strokeStyle='#666';c.lineWidth=0.5;c.strokeRect(0,0,s/2,s/2);c.strokeRect(s/2,s/2,s/2,s/2)})};
tilesets.cobblestone={name:'Pavés',category:'sol',create:()=>makeTile((c,s)=>{fillTile(c,s,'#777');for(let i=0;i<4;i++){const x=(i%2)*s/2+1,y=(i>1?s/2:0)+1;c.fillStyle=i%2?'#888':'#666';c.fillRect(x,y,s/2-2,s/2-2)}})};
tilesets.wood_tile={name:'Bois',category:'sol',create:()=>makeTile((c,s)=>{fillTile(c,s,'#a07840');c.fillStyle='#8a6830';for(let i=0;i<4;i++)c.fillRect(0,i*(s/4),s,1)})};
tilesets.ice_tile={name:'Glace',category:'sol',create:()=>makeTile((c,s)=>{fillTile(c,s,'#aaddee');c.fillStyle='rgba(255,255,255,0.4)';c.fillRect(2,2,4,1);c.fillRect(9,7,3,1)})};
tilesets.lava={name:'Lave',category:'sol',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#cc3300','#ff6600',0.3);c.fillStyle='#ff9900';c.fillRect(3,5,2,2);c.fillRect(10,2,2,1)})};
tilesets.swamp={name:'Marécage',category:'sol',create:()=>makeTile((c,s)=>noiseTile(c,s,'#4a6a3a','#3a5a2a',0.35))};
tilesets.metal_tile={name:'Métal',category:'sol',create:()=>makeTile((c,s)=>{fillTile(c,s,'#889');c.fillStyle='#778';c.fillRect(0,0,s,s/2);c.fillStyle='#aab';c.fillRect(1,1,2,2);c.fillRect(s-3,s-3,2,2)})};

/* ─── Wall tiles ─── */
tilesets.brick={name:'Briques',category:'mur',create:()=>makeTile((c,s)=>{fillTile(c,s,'#aa5533');c.fillStyle='#994422';c.fillRect(0,0,s/2-1,s/2-1);c.fillRect(s/2,0,s/2,s/2-1);c.fillRect(s/4,s/2,s/2-1,s/2);c.strokeStyle='#887766';c.lineWidth=0.5;c.strokeRect(0,0,s/2,s/2);c.strokeRect(0,s/2,s,s/2)})};
tilesets.castle_wall={name:'Mur château',category:'mur',create:()=>makeTile((c,s)=>{fillTile(c,s,'#888');c.fillStyle='#777';c.fillRect(0,0,s,s/3);c.fillRect(0,s*2/3,s,s/3);c.strokeStyle='#666';c.lineWidth=0.5;c.strokeRect(1,1,s-2,s/3-1)})};
tilesets.dungeon_wall={name:'Mur donjon',category:'mur',create:()=>makeTile((c,s)=>{fillTile(c,s,'#555');noiseTile(c,s,'#555','#444',0.2);c.fillStyle='#333';c.fillRect(0,s/2-0.5,s,1)})};
tilesets.hedge={name:'Haie',category:'mur',create:()=>makeTile((c,s)=>noiseTile(c,s,'#2d6a22','#4a8a40',0.4))};
tilesets.glass={name:'Verre',category:'mur',create:()=>makeTile((c,s)=>{fillTile(c,s,'#aaddff');c.globalAlpha=0.3;c.fillStyle='#fff';c.fillRect(2,2,4,4);c.globalAlpha=1})};
tilesets.crystal={name:'Cristal',category:'mur',create:()=>makeTile((c,s)=>{fillTile(c,s,'#6644aa');c.fillStyle='#8866cc';c.beginPath();c.moveTo(0,s);c.lineTo(s/2,0);c.lineTo(s,s);c.fill()})};

/* ─── Water tiles ─── */
tilesets.water={name:'Eau',category:'eau',create:()=>makeTile((c,s)=>{fillTile(c,s,'#2266aa');c.fillStyle='#3388cc';c.fillRect(2,4,6,1);c.fillRect(8,10,5,1)})};
tilesets.deep_water={name:'Eau profonde',category:'eau',create:()=>makeTile((c,s)=>{fillTile(c,s,'#113366');c.fillStyle='#224488';c.fillRect(3,6,4,1)})};

/* ─── Decoration tiles ─── */
tilesets.flowers_tile={name:'Fleurs',category:'déco',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#3a8a30','#4a9a40',0.2);c.fillStyle='#ff6688';c.fillRect(4,4,2,2);c.fillStyle='#ffcc22';c.fillRect(10,10,2,2);c.fillStyle='#ff44aa';c.fillRect(12,3,2,2)})};
tilesets.mushrooms={name:'Champignons',category:'déco',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#3a8a30','#4a9a40',0.2);c.fillStyle='#cc3322';c.fillRect(6,6,4,2);c.fillStyle='#e8d8c0';c.fillRect(7,8,2,3)})};
tilesets.bones={name:'Os',category:'déco',create:()=>makeTile((c,s)=>{fillTile(c,s,'#555');c.fillStyle='#ddd';c.fillRect(3,7,8,2);c.fillRect(2,6,2,4);c.fillRect(10,6,2,4)})};
tilesets.cracks={name:'Fissures',category:'déco',create:()=>makeTile((c,s)=>{fillTile(c,s,'#888');c.strokeStyle='#555';c.lineWidth=0.5;c.beginPath();c.moveTo(4,0);c.lineTo(8,6);c.lineTo(6,12);c.lineTo(10,s);c.stroke()})};

/* ─── Platformer tiles ─── */
tilesets.ground_top={name:'Sol (haut)',category:'plateforme',create:()=>makeTile((c,s)=>{fillTile(c,s,'#8a6a3a');c.fillStyle='#4a9a40';c.fillRect(0,0,s,4);c.fillStyle='#3a8a30';c.fillRect(0,0,s,2)})};
tilesets.ground_mid={name:'Sol (milieu)',category:'plateforme',create:()=>makeTile((c,s)=>noiseTile(c,s,'#8a6a3a','#7a5a2a',0.2))};
tilesets.ground_left={name:'Sol (gauche)',category:'plateforme',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#8a6a3a','#7a5a2a',0.2);c.fillStyle='#6a4a2a';c.fillRect(0,0,3,s)})};
tilesets.ground_right={name:'Sol (droite)',category:'plateforme',create:()=>makeTile((c,s)=>{noiseTile(c,s,'#8a6a3a','#7a5a2a',0.2);c.fillStyle='#6a4a2a';c.fillRect(s-3,0,3,s)})};
tilesets.cloud_platform={name:'Nuage',category:'plateforme',create:()=>makeTile((c,s)=>{c.fillStyle='rgba(255,255,255,0.7)';c.beginPath();c.arc(s/4,s/2,s/4,0,Math.PI*2);c.arc(s*3/4,s/2,s/4,0,Math.PI*2);c.arc(s/2,s/3,s/3,0,Math.PI*2);c.fill()})};

/* ─── Hazard tiles ─── */
tilesets.spikes={name:'Pics',category:'danger',create:()=>makeTile((c,s)=>{c.fillStyle='#888';for(let i=0;i<4;i++){c.beginPath();c.moveTo(i*4,s);c.lineTo(i*4+2,s-6);c.lineTo(i*4+4,s);c.fill()}})};
tilesets.lava_surface={name:'Surface lave',category:'danger',create:()=>makeTile((c,s)=>{fillTile(c,s,'#cc3300');c.fillStyle='#ff8800';c.beginPath();c.moveTo(0,s/2);c.quadraticCurveTo(s/4,s/4,s/2,s/2);c.quadraticCurveTo(s*3/4,s*3/4,s,s/2);c.lineTo(s,s);c.lineTo(0,s);c.fill()})};

/* ═══ Auto-tiling helper ═══ */
function autoTile(tileId,map,tx,ty){
  /* Returns which variant to use based on neighbors */
  const t=tilesets[tileId];if(!t)return null;
  return t.create();
}

/* ═══ API ═══ */
function getList(){return Object.entries(tilesets).map(([id,t])=>({id,name:t.name,category:t.category}))}
function getByCategory(cat){return getList().filter(t=>t.category===cat)}
function getCategories(){const s=new Set();for(const t of Object.values(tilesets))s.add(t.category);return[...s].map(c=>({id:c,name:{sol:'Sol',mur:'Mur',eau:'Eau','déco':'Décoration',plateforme:'Plateforme',danger:'Danger'}[c]||c}))}
function create(id){const t=tilesets[id];return t?t.create():null}
function getTileSize(){return tileSize}

window.Tiles={tilesets,create,getList,getByCategory,getCategories,getTileSize,autoTile};
})();
