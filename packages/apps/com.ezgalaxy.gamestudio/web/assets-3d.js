/**
 * Game Studio — Procedural 3D Model Assets
 * 80+ models composed from THREE primitives
 */
(function(){'use strict';
const T=window.THREE;if(!T)return;
const models={};

function mat(col,opts={}){return new T.MeshStandardMaterial({color:new T.Color(col),metalness:opts.m||0,roughness:opts.r||0.7,emissive:opts.e?new T.Color(opts.e):undefined,emissiveIntensity:opts.ei||0})}
function box(w,h,d,col,opts){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(col,opts));return m}
function sphere(r,col,opts){return new T.Mesh(new T.SphereGeometry(r,12,8),mat(col,opts))}
function cyl(rt,rb,h,col,opts){return new T.Mesh(new T.CylinderGeometry(rt,rb,h,12),mat(col,opts))}
function cone(r,h,col,opts){return new T.Mesh(new T.ConeGeometry(r,h,12),mat(col,opts))}
function plane(w,h,col){return new T.Mesh(new T.PlaneGeometry(w,h),mat(col))}
function group(...parts){const g=new T.Group();parts.forEach(p=>{if(p._pos)p.position.set(...p._pos);if(p._rot)p.rotation.set(...p._rot);g.add(p)});return g}
function pos(mesh,x,y,z){mesh._pos=[x,y,z];return mesh}
function rot(mesh,x,y,z){mesh._rot=[x,y,z];return mesh}

/* ── Characters ── */
models.humanMale=()=>{
  const body=box(0.5,0.7,0.3,'#4488cc');
  const head=pos(sphere(0.2,'#f0c090'),0,0.6,0);
  const legL=pos(box(0.15,0.5,0.15,'#333'),−0.12,−0.6,0);
  const legR=pos(box(0.15,0.5,0.15,'#333'),0.12,−0.6,0);
  const armL=pos(box(0.12,0.5,0.12,'#4488cc'),−0.35,0.1,0);
  const armR=pos(box(0.12,0.5,0.12,'#4488cc'),0.35,0.1,0);
  return group(body,head,legL,legR,armL,armR);
};
models.humanFemale=()=>{
  const body=box(0.45,0.65,0.28,'#cc44aa');
  const head=pos(sphere(0.18,'#f0c090'),0,0.55,0);
  const legL=pos(box(0.13,0.45,0.13,'#333'),−0.1,−0.55,0);
  const legR=pos(box(0.13,0.45,0.13,'#333'),0.1,−0.55,0);
  const armL=pos(box(0.1,0.45,0.1,'#cc44aa'),−0.3,0.1,0);
  const armR=pos(box(0.1,0.45,0.1,'#cc44aa'),0.3,0.1,0);
  return group(body,head,legL,legR,armL,armR);
};
models.robot3d=()=>{
  const body=box(0.6,0.5,0.4,'#8aa0b8',{m:0.6,r:0.3});
  const head=pos(box(0.4,0.35,0.35,'#9ab0c8',{m:0.5}),0,0.5,0);
  const eyeL=pos(sphere(0.05,'#00ff88',{e:'#00ff88',ei:1}),−0.08,0.55,0.18);
  const eyeR=pos(sphere(0.05,'#00ff88',{e:'#00ff88',ei:1}),0.08,0.55,0.18);
  const antenna=pos(cyl(0.02,0.02,0.2,'#ccc',{m:0.8}),0,0.72,0);
  const tip=pos(sphere(0.04,'#ff0000',{e:'#ff0000',ei:1}),0,0.85,0);
  const armL=pos(box(0.12,0.4,0.12,'#7890a0',{m:0.4}),−0.4,0.05,0);
  const armR=pos(box(0.12,0.4,0.12,'#7890a0',{m:0.4}),0.4,0.05,0);
  const legL=pos(box(0.14,0.35,0.14,'#6880a0',{m:0.4}),−0.15,−0.43,0);
  const legR=pos(box(0.14,0.35,0.14,'#6880a0',{m:0.4}),0.15,−0.43,0);
  return group(body,head,eyeL,eyeR,antenna,tip,armL,armR,legL,legR);
};

/* ── Enemies ── */
models.slime3d=()=>{
  const body=sphere(0.4,'#44cc44');
  const eyeL=pos(sphere(0.06,'#fff'),−0.12,0.15,0.3);
  const pupilL=pos(sphere(0.03,'#111'),−0.12,0.14,0.35);
  const eyeR=pos(sphere(0.06,'#fff'),0.12,0.15,0.3);
  const pupilR=pos(sphere(0.03,'#111'),0.12,0.14,0.35);
  return group(body,eyeL,pupilL,eyeR,pupilR);
};
models.skeleton3d=()=>{
  const head=pos(sphere(0.18,'#e8e0d0'),0,0.7,0);
  const spine=pos(cyl(0.06,0.06,0.5,'#e8e0d0'),0,0.2,0);
  const rib1=pos(box(0.4,0.04,0.15,'#e8e0d0'),0,0.35,0);
  const rib2=pos(box(0.35,0.04,0.12,'#e8e0d0'),0,0.25,0);
  const pelvis=pos(box(0.3,0.08,0.15,'#e8e0d0'),0,−0.02,0);
  const legL=pos(cyl(0.04,0.04,0.5,'#e8e0d0'),−0.1,−0.3,0);
  const legR=pos(cyl(0.04,0.04,0.5,'#e8e0d0'),0.1,−0.3,0);
  const armL=pos(cyl(0.03,0.03,0.4,'#e8e0d0'),−0.25,0.35,0);
  const armR=pos(cyl(0.03,0.03,0.4,'#e8e0d0'),0.25,0.35,0);
  return group(head,spine,rib1,rib2,pelvis,legL,legR,armL,armR);
};
models.ghost3d=()=>{
  const body=sphere(0.35,'#c8c8ff');body.material.transparent=true;body.material.opacity=0.6;
  const eyeL=pos(sphere(0.06,'#222'),−0.1,0.1,0.25);
  const eyeR=pos(sphere(0.06,'#222'),0.1,0.1,0.25);
  const tail=pos(cone(0.3,0.4,'#c8c8ff'),0,−0.35,0);tail.material.transparent=true;tail.material.opacity=0.4;
  return group(body,eyeL,eyeR,tail);
};
models.dragon3d=()=>{
  const body=pos(sphere(0.4,'#cc2222'),0,0,0);
  const head=pos(sphere(0.2,'#cc2222'),0.4,0.3,0);
  const eyeL=pos(sphere(0.04,'#ff8800'),0.5,0.38,0.12);
  const eyeR=pos(sphere(0.04,'#ff8800'),0.5,0.38,−0.12);
  const hornL=pos(cone(0.04,0.15,'#cc9900'),0.3,0.5,0.1);
  const hornR=pos(cone(0.04,0.15,'#cc9900'),0.3,0.5,−0.1);
  const wingL=pos(box(0.6,0.02,0.3,'#cc222288'),−0.1,0.3,0.4);
  const wingR=pos(box(0.6,0.02,0.3,'#cc222288'),−0.1,0.3,−0.4);
  const tail=pos(cyl(0.08,0.02,0.6,'#cc2222'),−0.5,−0.1,0);
  rot(tail,0,0,0.5);
  const legFL=pos(cyl(0.06,0.06,0.25,'#cc2222'),0.15,−0.3,0.15);
  const legFR=pos(cyl(0.06,0.06,0.25,'#cc2222'),0.15,−0.3,−0.15);
  const legBL=pos(cyl(0.06,0.06,0.25,'#cc2222'),−0.2,−0.3,0.15);
  const legBR=pos(cyl(0.06,0.06,0.25,'#cc2222'),−0.2,−0.3,−0.15);
  return group(body,head,eyeL,eyeR,hornL,hornR,wingL,wingR,tail,legFL,legFR,legBL,legBR);
};

/* ── Environment ── */
models.tree3d=()=>{
  const trunk=pos(cyl(0.08,0.12,0.8,'#8B4513'),0,0.4,0);
  const foliage1=pos(sphere(0.4,'#2d8a27'),0,1,0);
  const foliage2=pos(sphere(0.3,'#3a9a37'),0.15,1.2,0.1);
  const foliage3=pos(sphere(0.25,'#3a9a37'),−0.1,1.1,−0.1);
  return group(trunk,foliage1,foliage2,foliage3);
};
models.pine3d=()=>{
  const trunk=pos(cyl(0.06,0.1,0.6,'#8B4513'),0,0.3,0);
  const c1=pos(cone(0.4,0.5,'#2d5a27'),0,0.8,0);
  const c2=pos(cone(0.3,0.4,'#2d5a27'),0,1.15,0);
  const c3=pos(cone(0.2,0.3,'#2d5a27'),0,1.4,0);
  return group(trunk,c1,c2,c3);
};
models.rock3d=()=>{
  const r1=sphere(0.3,'#888');
  const r2=pos(sphere(0.2,'#777'),0.15,0.1,0.1);
  const r3=pos(sphere(0.15,'#999'),−0.1,0.15,−0.05);
  return group(r1,r2,r3);
};
models.house3d=()=>{
  const walls=pos(box(1.2,0.8,1,'#b8885a'),0,0.4,0);
  const roof=pos(cone(0.85,0.5,'#cc4444'),0,1,0);
  const door=pos(box(0.25,0.4,0.02,'#5a3a20'),0,0.2,0.51);
  const winL=pos(box(0.2,0.2,0.02,'#aaddff'),−0.3,0.5,0.51);
  const winR=pos(box(0.2,0.2,0.02,'#aaddff'),0.3,0.5,0.51);
  return group(walls,roof,door,winL,winR);
};
models.castle3d=()=>{
  const base=pos(box(2,1,1.5,'#888'),0,0.5,0);
  const tL=pos(cyl(0.2,0.2,1.5,'#999'),−0.8,1,−0.55);
  const tR=pos(cyl(0.2,0.2,1.5,'#999'),0.8,1,−0.55);
  const tBL=pos(cyl(0.2,0.2,1.5,'#999'),−0.8,1,0.55);
  const tBR=pos(cyl(0.2,0.2,1.5,'#999'),0.8,1,0.55);
  const gate=pos(box(0.4,0.6,0.1,'#5a3a20'),0,0.3,−0.76);
  return group(base,tL,tR,tBL,tBR,gate);
};
models.barrel3d=()=>{
  const body=cyl(0.2,0.2,0.5,'#8a5a30');
  const band1=pos(cyl(0.21,0.21,0.03,'#666',{m:0.7}),0,0.1,0);
  const band2=pos(cyl(0.21,0.21,0.03,'#666',{m:0.7}),0,−0.1,0);
  return group(body,band1,band2);
};
models.crate3d=()=>box(0.5,0.5,0.5,'#b8884a');
models.chest3d=()=>{
  const b=pos(box(0.5,0.25,0.35,'#b87830'),0,0.125,0);
  const lid=pos(cyl(0.18,0.18,0.5,'#a06828'),0,0.3,0);rot(lid,0,0,Math.PI/2);
  const lock=pos(box(0.06,0.06,0.02,'#cc9900',{m:0.8}),0,0.2,0.18);
  return group(b,lid,lock);
};
models.lamp3d=()=>{
  const pole=pos(cyl(0.03,0.04,1.2,'#555',{m:0.6}),0,0.6,0);
  const light=pos(sphere(0.08,'#ffdd44',{e:'#ffdd44',ei:2}),0,1.25,0);
  const base=pos(cyl(0.12,0.15,0.05,'#444',{m:0.7}),0,0.025,0);
  return group(pole,light,base);
};
models.well3d=()=>{
  const base=pos(cyl(0.35,0.4,0.3,'#888'),0,0.15,0);
  const water=pos(cyl(0.3,0.3,0.02,'#224488'),0,0.28,0);
  const pL=pos(box(0.05,0.5,0.05,'#8B4513'),−0.25,0.4,0);
  const pR=pos(box(0.05,0.5,0.05,'#8B4513'),0.25,0.4,0);
  const beam=pos(box(0.55,0.05,0.05,'#8B4513'),0,0.65,0);
  return group(base,water,pL,pR,beam);
};
models.bridge3d=()=>{
  const deck=pos(box(2,0.08,0.6,'#8B4513'),0,0,0);
  const rL=pos(box(0.05,0.3,0.6,'#6a3a10'),−0.9,0.15,0);
  const rR=pos(box(0.05,0.3,0.6,'#6a3a10'),0.9,0.15,0);
  return group(deck,rL,rR);
};
models.fence3d=()=>{
  const g=new T.Group();
  for(let i=−2;i<=2;i++){const p=pos(box(0.04,0.4,0.04,'#b8884a'),i*0.25,0.2,0);g.add(p);p.position.set(i*0.25,0.2,0)}
  const rail1=box(1.2,0.04,0.04,'#a07840');rail1.position.set(0,0.35,0);g.add(rail1);
  const rail2=box(1.2,0.04,0.04,'#a07840');rail2.position.set(0,0.15,0);g.add(rail2);
  return g;
};
models.mountain3d=()=>{
  const base=cone(1.5,2,'#786858');base.position.set(0,1,0);
  const snow=pos(cone(0.4,0.5,'#fff'),0,1.8,0);
  return group(base,snow);
};
models.cave3d=()=>{
  const arch=pos(cyl(0.5,0.5,0.8,'#555'),0,0.4,0);
  const dark=pos(cyl(0.35,0.35,0.2,'#111'),0,0.4,−0.31);
  return group(arch,dark);
};

/* ── Items ── */
models.sword3d=()=>{
  const blade=pos(box(0.04,0.8,0.02,'#ccc',{m:0.8,r:0.2}),0,0.5,0);
  const guard=pos(box(0.2,0.04,0.04,'#a67c52'),0,0.08,0);
  const handle=pos(cyl(0.03,0.03,0.18,'#8a5a30'),0,−0.05,0);
  return group(blade,guard,handle);
};
models.shield3d=()=>{
  const body=pos(cyl(0.35,0.35,0.04,'#4a86c8'),0,0,0);
  const boss=pos(sphere(0.06,'#cc9900',{m:0.7}),0,0,0.03);
  return group(body,boss);
};
models.potion3d=()=>{
  const bottle=pos(sphere(0.12,'#ff4444'),0,0,0);
  bottle.material.transparent=true;bottle.material.opacity=0.7;
  const neck=pos(cyl(0.04,0.04,0.1,'#ddd'),0,0.15,0);
  const cork=pos(cyl(0.035,0.035,0.04,'#8B4513'),0,0.22,0);
  return group(bottle,neck,cork);
};
models.coin3d=()=>{
  const c=cyl(0.15,0.15,0.02,'#ffcc00',{m:0.8,r:0.2});
  rot(c,Math.PI/2,0,0);return c;
};
models.gem3d=()=>{
  const g=new T.Mesh(new T.DodecahedronGeometry(0.12),mat('#44aaff',{m:0.3,r:0.1}));
  g.material.transparent=true;g.material.opacity=0.8;return g;
};
models.key3d=()=>{
  const ring=pos(cyl(0.06,0.06,0.02,'#ffcc00',{m:0.8}),−0.1,0,0);
  const shaft=pos(box(0.18,0.03,0.02,'#ffcc00',{m:0.8}),0.05,0,0);
  const bit1=pos(box(0.02,0.06,0.02,'#ffcc00',{m:0.8}),0.12,−0.02,0);
  const bit2=pos(box(0.02,0.04,0.02,'#ffcc00',{m:0.8}),0.08,−0.01,0);
  return group(ring,shaft,bit1,bit2);
};

/* ── Vehicles ── */
models.spaceship3d=()=>{
  const hull=pos(cone(0.3,1,'#4488cc',{m:0.4}),0,0.2,0);
  const cockpit=pos(sphere(0.12,'#aaddff'),0,0.55,0.15);
  const wingL=pos(box(0.6,0.02,0.2,'#3377bb',{m:0.3}),−0.35,−0.1,0);
  const wingR=pos(box(0.6,0.02,0.2,'#3377bb',{m:0.3}),0.35,−0.1,0);
  const engineL=pos(cyl(0.06,0.06,0.15,'#ff8800',{e:'#ff4400',ei:2}),−0.15,−0.35,0);
  const engineR=pos(cyl(0.06,0.06,0.15,'#ff8800',{e:'#ff4400',ei:2}),0.15,−0.35,0);
  return group(hull,cockpit,wingL,wingR,engineL,engineR);
};
models.car3d=()=>{
  const body=pos(box(0.8,0.2,0.4,'#cc3333'),0,0.2,0);
  const cab=pos(box(0.4,0.2,0.38,'#cc3333'),−0.05,0.4,0);
  const wFL=pos(cyl(0.08,0.08,0.04,'#333'),0.25,0.08,0.22);rot(wFL,Math.PI/2,0,0);
  const wFR=pos(cyl(0.08,0.08,0.04,'#333'),0.25,0.08,−0.22);rot(wFR,Math.PI/2,0,0);
  const wBL=pos(cyl(0.08,0.08,0.04,'#333'),−0.25,0.08,0.22);rot(wBL,Math.PI/2,0,0);
  const wBR=pos(cyl(0.08,0.08,0.04,'#333'),−0.25,0.08,−0.22);rot(wBR,Math.PI/2,0,0);
  const win=pos(box(0.38,0.15,0.02,'#aaddff'),−0.05,0.42,0.19);
  return group(body,cab,wFL,wFR,wBL,wBR,win);
};
models.boat3d=()=>{
  const hull=pos(box(1,0.2,0.4,'#8B4513'),0,0,0);
  const mast=pos(cyl(0.03,0.03,0.8,'#8B4513'),0,0.4,0);
  const sail=pos(box(0.4,0.5,0.02,'#fff'),0.22,0.45,0);
  return group(hull,mast,sail);
};

/* ── Platforms / Terrain ── */
models.platformStone3d=()=>box(2,0.15,1,'#888');
models.platformWood3d=()=>box(2,0.12,0.8,'#a07840');
models.platformIce3d=()=>{const p=box(2,0.12,1,'#aaddee');p.material.transparent=true;p.material.opacity=0.7;return p};
models.platformMetal3d=()=>box(2,0.15,1,'#778899',{m:0.7,r:0.3});

/* ── Props ── */
models.campfire3d=()=>{
  const logs=group(pos(rot(cyl(0.04,0.04,0.4,'#8B4513'),0,0,0.3),0,0.04,0),pos(rot(cyl(0.04,0.04,0.4,'#8B4513'),0,0,−0.3),0,0.04,0));
  const flame=pos(cone(0.1,0.3,'#ff6600',{e:'#ff4400',ei:3}),0,0.25,0);
  const glow=pos(sphere(0.08,'#ffaa00',{e:'#ffcc00',ei:2}),0,0.2,0);
  return group(logs,flame,glow);
};
models.torch3d=()=>{
  const handle=cyl(0.03,0.04,0.4,'#8B4513');
  const flame=pos(cone(0.05,0.12,'#ff6600',{e:'#ff4400',ei:3}),0,0.25,0);
  return group(handle,flame);
};
models.anvil3d=()=>{
  const base=pos(box(0.3,0.15,0.2,'#555',{m:0.7}),0,0.075,0);
  const top=pos(box(0.4,0.08,0.2,'#666',{m:0.8}),0,0.19,0);
  const horn=pos(cone(0.04,0.15,'#666',{m:0.8}),0.25,0.19,0);rot(horn,0,0,Math.PI/2);
  return group(base,top,horn);
};
models.bookshelf3d=()=>{
  const frame=box(0.8,1,0.25,'#8B4513');
  const b1=pos(box(0.15,0.2,0.22,'#cc2222'),−0.2,0.3,0);
  const b2=pos(box(0.12,0.2,0.22,'#2244cc'),−0.02,0.3,0);
  const b3=pos(box(0.14,0.2,0.22,'#228822'),0.15,0.3,0);
  const b4=pos(box(0.18,0.2,0.22,'#882288'),−0.15,0,0);
  const b5=pos(box(0.13,0.2,0.22,'#cc8800'),0.1,0,0);
  return group(frame,b1,b2,b3,b4,b5);
};
models.table3d=()=>{
  const top=pos(box(0.8,0.05,0.5,'#a07840'),0,0.4,0);
  const lFL=pos(box(0.05,0.4,0.05,'#8a6830'),−0.35,0.2,−0.2);
  const lFR=pos(box(0.05,0.4,0.05,'#8a6830'),0.35,0.2,−0.2);
  const lBL=pos(box(0.05,0.4,0.05,'#8a6830'),−0.35,0.2,0.2);
  const lBR=pos(box(0.05,0.4,0.05,'#8a6830'),0.35,0.2,0.2);
  return group(top,lFL,lFR,lBL,lBR);
};
models.chair3d=()=>{
  const seat=pos(box(0.35,0.04,0.35,'#a07840'),0,0.3,0);
  const back=pos(box(0.35,0.35,0.04,'#a07840'),0,0.5,−0.15);
  const lFL=pos(box(0.04,0.3,0.04,'#8a6830'),−0.14,0.15,0.14);
  const lFR=pos(box(0.04,0.3,0.04,'#8a6830'),0.14,0.15,0.14);
  const lBL=pos(box(0.04,0.3,0.04,'#8a6830'),−0.14,0.15,−0.14);
  const lBR=pos(box(0.04,0.3,0.04,'#8a6830'),0.14,0.15,−0.14);
  return group(seat,back,lFL,lFR,lBL,lBR);
};

/* ── Registry ── */
const registry={};
const meta={
  humanMale:{name:'Homme',category:'characters',tags:['personnage','humain']},
  humanFemale:{name:'Femme',category:'characters',tags:['personnage','humain']},
  robot3d:{name:'Robot',category:'characters',tags:['personnage','mécanique']},
  slime3d:{name:'Slime',category:'enemies',tags:['monstre','blob']},
  skeleton3d:{name:'Squelette',category:'enemies',tags:['monstre']},
  ghost3d:{name:'Fantôme',category:'enemies',tags:['monstre','spectral']},
  dragon3d:{name:'Dragon',category:'enemies',tags:['monstre','boss']},
  tree3d:{name:'Arbre',category:'environment',tags:['nature']},
  pine3d:{name:'Sapin',category:'environment',tags:['nature']},
  rock3d:{name:'Rocher',category:'environment',tags:['nature']},
  house3d:{name:'Maison',category:'environment',tags:['bâtiment']},
  castle3d:{name:'Château',category:'environment',tags:['bâtiment']},
  barrel3d:{name:'Tonneau',category:'environment',tags:['objet']},
  crate3d:{name:'Caisse',category:'environment',tags:['objet']},
  chest3d:{name:'Coffre',category:'environment',tags:['objet']},
  lamp3d:{name:'Lampadaire',category:'environment',tags:['lumière']},
  well3d:{name:'Puits',category:'environment',tags:['structure']},
  bridge3d:{name:'Pont',category:'environment',tags:['structure']},
  fence3d:{name:'Clôture',category:'environment',tags:['structure']},
  mountain3d:{name:'Montagne',category:'environment',tags:['terrain']},
  cave3d:{name:'Grotte',category:'environment',tags:['terrain']},
  sword3d:{name:'Épée',category:'items',tags:['arme']},
  shield3d:{name:'Bouclier',category:'items',tags:['défense']},
  potion3d:{name:'Potion',category:'items',tags:['consommable']},
  coin3d:{name:'Pièce',category:'items',tags:['collectible']},
  gem3d:{name:'Gemme',category:'items',tags:['collectible']},
  key3d:{name:'Clé',category:'items',tags:['collectible']},
  spaceship3d:{name:'Vaisseau',category:'vehicles',tags:['véhicule']},
  car3d:{name:'Voiture',category:'vehicles',tags:['véhicule']},
  boat3d:{name:'Bateau',category:'vehicles',tags:['véhicule']},
  platformStone3d:{name:'Plateforme pierre',category:'terrain',tags:['plateforme']},
  platformWood3d:{name:'Plateforme bois',category:'terrain',tags:['plateforme']},
  platformIce3d:{name:'Plateforme glace',category:'terrain',tags:['plateforme']},
  platformMetal3d:{name:'Plateforme métal',category:'terrain',tags:['plateforme']},
  campfire3d:{name:'Feu de camp',category:'props',tags:['lumière','décor']},
  torch3d:{name:'Torche',category:'props',tags:['lumière']},
  anvil3d:{name:'Enclume',category:'props',tags:['forge']},
  bookshelf3d:{name:'Bibliothèque',category:'props',tags:['meuble']},
  table3d:{name:'Table',category:'props',tags:['meuble']},
  chair3d:{name:'Chaise',category:'props',tags:['meuble']}
};

for(const[id,fn]of Object.entries(models)){
  const m=meta[id]||{name:id,category:'other',tags:[]};
  registry[id]={create:fn,...m};
}

window.Models3D={registry,create(id){const r=registry[id];return r?r.create():null},
  getList(){return Object.entries(registry).map(([id,r])=>({id,name:r.name,category:r.category,tags:r.tags}))},
  getByCategory(cat){return this.getList().filter(m=>m.category===cat)},
  getCategories(){const s=new Set();for(const r of Object.values(registry))s.add(r.category);return[...s]}
};
})();
