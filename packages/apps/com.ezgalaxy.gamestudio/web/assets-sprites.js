/**
 * Game Studio — Procedural Sprite Assets
 * ~200+ sprites drawn programmatically on Canvas 2D
 * Categories: characters, enemies, npcs, environment, items, ui, vehicles, effects
 */
(function(){'use strict';

const sprites={};

/* ── Drawing helpers ── */
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h)}
function circle(c,x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function ellipse(c,x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function tri(c,x1,y1,x2,y2,x3,y3,col){c.fillStyle=col;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.lineTo(x3,y3);c.fill()}
function roundRect(c,x,y,w,h,r,col){c.fillStyle=col;c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.fill()}
function line(c,x1,y1,x2,y2,col,lw=1){c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function eyes(c,x,y,s,col='#fff'){circle(c,x-s*0.15,y-s*0.05,s*0.06,col);circle(c,x+s*0.15,y-s*0.05,s*0.06,col);circle(c,x-s*0.15,y-s*0.04,s*0.03,'#111');circle(c,x+s*0.15,y-s*0.04,s*0.03,'#111')}

/* ══════════════════════════════════
   CHARACTERS (Heroes)
   ══════════════════════════════════ */

function drawKnight(c,x,y,s,opt={}){
  const col=opt.color||'#4a86c8';const skin=opt.skin||'#f0c090';
  // Body armor
  roundRect(c,x-s*0.2,y-s*0.1,s*0.4,s*0.35,s*0.05,col);
  // Head
  circle(c,x,y-s*0.25,s*0.15,skin);
  // Helmet
  roundRect(c,x-s*0.17,y-s*0.4,s*0.34,s*0.15,s*0.05,'#888');
  rect(c,x-s*0.2,y-s*0.28,s*0.4,s*0.04,'#888');
  // Eyes
  rect(c,x-s*0.1,y-s*0.27,s*0.07,s*0.04,'#222');
  rect(c,x+s*0.03,y-s*0.27,s*0.07,s*0.04,'#222');
  // Legs
  rect(c,x-s*0.15,y+s*0.25,s*0.12,s*0.2,col);
  rect(c,x+s*0.03,y+s*0.25,s*0.12,s*0.2,col);
  // Boots
  rect(c,x-s*0.17,y+s*0.4,s*0.16,s*0.08,'#5a3a20');
  rect(c,x+s*0.01,y+s*0.4,s*0.16,s*0.08,'#5a3a20');
  // Sword
  if(!opt.noWeapon){rect(c,x+s*0.25,y-s*0.3,s*0.04,s*0.4,'#ccc');rect(c,x+s*0.2,y-s*0.05,s*0.14,s*0.04,'#a67c52')}
}
sprites.knight={draw:drawKnight,category:'characters',name:'Chevalier',tags:['héros','guerrier']};

function drawMage(c,x,y,s,opt={}){
  const col=opt.color||'#7b42bd';const skin=opt.skin||'#f0c090';
  // Robe
  c.fillStyle=col;c.beginPath();c.moveTo(x-s*0.25,y+s*0.45);c.lineTo(x-s*0.15,y-s*0.1);c.lineTo(x+s*0.15,y-s*0.1);c.lineTo(x+s*0.25,y+s*0.45);c.fill();
  // Head
  circle(c,x,y-s*0.2,s*0.13,skin);
  // Hat
  tri(c,x-s*0.2,y-s*0.22,x,y-s*0.5,x+s*0.2,y-s*0.22,col);
  rect(c,x-s*0.22,y-s*0.25,s*0.44,s*0.05,col);
  // Eyes
  eyes(c,x,y-s*0.18,s*0.7);
  // Staff
  rect(c,x+s*0.2,y-s*0.4,s*0.03,s*0.7,'#8B4513');
  circle(c,x+s*0.215,y-s*0.42,s*0.06,'#ff44ff');
  circle(c,x+s*0.215,y-s*0.42,s*0.03,'#fff');
}
sprites.mage={draw:drawMage,category:'characters',name:'Mage',tags:['héros','magicien']};

function drawArcher(c,x,y,s,opt={}){
  const col=opt.color||'#2d8a4e';const skin=opt.skin||'#f0c090';
  roundRect(c,x-s*0.18,y-s*0.1,s*0.36,s*0.3,s*0.04,col);
  circle(c,x,y-s*0.22,s*0.13,skin);
  // Hood
  c.fillStyle='#1a5c30';c.beginPath();c.arc(x,y-s*0.22,s*0.14,Math.PI,0);c.fill();
  eyes(c,x,y-s*0.2,s*0.7);
  rect(c,x-s*0.13,y+s*0.2,s*0.1,s*0.22,col);
  rect(c,x+s*0.03,y+s*0.2,s*0.1,s*0.22,col);
  rect(c,x-s*0.15,y+s*0.38,s*0.12,s*0.06,'#5a3a20');
  rect(c,x+s*0.03,y+s*0.38,s*0.12,s*0.06,'#5a3a20');
  // Bow
  c.strokeStyle='#8B4513';c.lineWidth=s*0.025;c.beginPath();c.arc(x+s*0.3,y-s*0.05,s*0.25,Math.PI*0.7,Math.PI*1.3);c.stroke();
  line(c,x+s*0.3-s*0.08,y+s*0.18,x+s*0.3-s*0.08,y-s*0.28,'#ccc',s*0.015);
}
sprites.archer={draw:drawArcher,category:'characters',name:'Archer',tags:['héros','ranger']};

function drawNinja(c,x,y,s,opt={}){
  const col=opt.color||'#2a2a3a';const skin=opt.skin||'#f0c090';
  roundRect(c,x-s*0.16,y-s*0.08,s*0.32,s*0.28,s*0.03,col);
  circle(c,x,y-s*0.2,s*0.12,col);
  // Eyes only
  rect(c,x-s*0.08,y-s*0.22,s*0.04,s*0.03,'#ddd');
  rect(c,x+s*0.04,y-s*0.22,s*0.04,s*0.03,'#ddd');
  // Scarf
  c.fillStyle='#c0392b';c.beginPath();c.moveTo(x+s*0.1,y-s*0.18);c.lineTo(x+s*0.35,y-s*0.1);c.lineTo(x+s*0.3,y-s*0.05);c.lineTo(x+s*0.1,y-s*0.13);c.fill();
  rect(c,x-s*0.12,y+s*0.2,s*0.09,s*0.2,col);
  rect(c,x+s*0.03,y+s*0.2,s*0.09,s*0.2,col);
  rect(c,x-s*0.13,y+s*0.36,s*0.1,s*0.06,'#333');
  rect(c,x+s*0.03,y+s*0.36,s*0.1,s*0.06,'#333');
  // Shuriken
  circle(c,x-s*0.3,y-s*0.1,s*0.05,'#ccc');
}
sprites.ninja={draw:drawNinja,category:'characters',name:'Ninja',tags:['héros','furtif']};

function drawAstronaut(c,x,y,s,opt={}){
  const col=opt.color||'#e8e8e8';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.35,s*0.06,col);
  // Helmet
  circle(c,x,y-s*0.2,s*0.17,col);
  circle(c,x,y-s*0.2,s*0.12,'#44aadd');
  circle(c,x,y-s*0.2,s*0.1,'#113355');
  // Visor reflection
  circle(c,x-s*0.04,y-s*0.23,s*0.03,'rgba(255,255,255,0.5)');
  // Backpack
  roundRect(c,x+s*0.2,y-s*0.05,s*0.1,s*0.25,s*0.03,'#999');
  // Legs
  rect(c,x-s*0.15,y+s*0.3,s*0.12,s*0.18,col);
  rect(c,x+s*0.03,y+s*0.3,s*0.12,s*0.18,col);
  rect(c,x-s*0.17,y+s*0.44,s*0.15,s*0.06,'#666');
  rect(c,x+s*0.02,y+s*0.44,s*0.15,s*0.06,'#666');
}
sprites.astronaut={draw:drawAstronaut,category:'characters',name:'Astronaute',tags:['héros','espace']};

function drawRobot(c,x,y,s,opt={}){
  const col=opt.color||'#8aa0b8';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.3,s*0.04,col);
  // Head
  roundRect(c,x-s*0.15,y-s*0.32,s*0.3,s*0.22,s*0.04,'#9ab0c8');
  // Antenna
  rect(c,x-s*0.02,y-s*0.42,s*0.04,s*0.1,'#ccc');
  circle(c,x,y-s*0.44,s*0.04,'#ff4444');
  // Eyes (LEDs)
  circle(c,x-s*0.07,y-s*0.22,s*0.04,'#00ff88');
  circle(c,x+s*0.07,y-s*0.22,s*0.04,'#00ff88');
  // Mouth
  rect(c,x-s*0.08,y-s*0.13,s*0.16,s*0.03,'#555');
  // Arms
  rect(c,x-s*0.3,y-s*0.02,s*0.1,s*0.2,'#7890a0');
  rect(c,x+s*0.2,y-s*0.02,s*0.1,s*0.2,'#7890a0');
  // Legs
  rect(c,x-s*0.15,y+s*0.25,s*0.1,s*0.2,'#6880a0');
  rect(c,x+s*0.05,y+s*0.25,s*0.1,s*0.2,'#6880a0');
}
sprites.robot={draw:drawRobot,category:'characters',name:'Robot',tags:['héros','mécanique']};

function drawViking(c,x,y,s,opt={}){
  const col=opt.color||'#8B6914';const skin=opt.skin||'#f0c090';
  roundRect(c,x-s*0.22,y-s*0.05,s*0.44,s*0.35,s*0.05,col);
  circle(c,x,y-s*0.2,s*0.15,skin);
  // Helmet with horns
  roundRect(c,x-s*0.17,y-s*0.35,s*0.34,s*0.12,s*0.04,'#888');
  tri(c,x-s*0.2,y-s*0.3,x-s*0.3,y-s*0.48,x-s*0.12,y-s*0.3,'#888');
  tri(c,x+s*0.2,y-s*0.3,x+s*0.3,y-s*0.48,x+s*0.12,y-s*0.3,'#888');
  // Beard
  roundRect(c,x-s*0.1,y-s*0.1,s*0.2,s*0.12,s*0.03,'#c8883a');
  eyes(c,x,y-s*0.2,s*0.8);
  rect(c,x-s*0.16,y+s*0.3,s*0.12,s*0.18,col);
  rect(c,x+s*0.04,y+s*0.3,s*0.12,s*0.18,col);
  // Axe
  rect(c,x-s*0.35,y-s*0.2,s*0.04,s*0.5,'#8B4513');
  c.fillStyle='#aaa';c.beginPath();c.moveTo(x-s*0.38,y-s*0.2);c.quadraticCurveTo(x-s*0.48,y-s*0.1,x-s*0.38,y);c.lineTo(x-s*0.3,y);c.quadraticCurveTo(x-s*0.28,y-s*0.1,x-s*0.3,y-s*0.2);c.fill();
}
sprites.viking={draw:drawViking,category:'characters',name:'Viking',tags:['héros','guerrier']};

function drawPirate(c,x,y,s,opt={}){
  const col=opt.color||'#c0392b';const skin=opt.skin||'#e8b878';
  roundRect(c,x-s*0.18,y-s*0.05,s*0.36,s*0.3,s*0.04,col);
  circle(c,x,y-s*0.2,s*0.14,skin);
  // Hat
  c.fillStyle='#222';c.beginPath();c.moveTo(x-s*0.25,y-s*0.22);c.quadraticCurveTo(x,y-s*0.5,x+s*0.25,y-s*0.22);c.fill();
  rect(c,x-s*0.27,y-s*0.25,s*0.54,s*0.05,'#222');
  // Skull on hat
  circle(c,x,y-s*0.35,s*0.04,'#fff');
  // Eye patch
  rect(c,x+s*0.02,y-s*0.22,s*0.08,s*0.06,'#111');
  rect(c,x-s*0.1,y-s*0.22,s*0.06,s*0.04,'#fff');
  circle(c,x-s*0.07,y-s*0.2,s*0.02,'#111');
  rect(c,x-s*0.13,y+s*0.25,s*0.1,s*0.2,col);
  rect(c,x+s*0.03,y+s*0.25,s*0.1,s*0.2,col);
  // Sword
  rect(c,x+s*0.22,y-s*0.1,s*0.03,s*0.35,'#ddd');
  rect(c,x+s*0.17,y+s*0.05,s*0.13,s*0.03,'#c8a23a');
}
sprites.pirate={draw:drawPirate,category:'characters',name:'Pirate',tags:['héros','aventurier']};

function drawSamurai(c,x,y,s,opt={}){
  const col=opt.color||'#d42f2f';const skin=opt.skin||'#f0c090';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.3,s*0.04,col);
  circle(c,x,y-s*0.2,s*0.14,skin);
  // Helmet
  roundRect(c,x-s*0.2,y-s*0.35,s*0.4,s*0.1,s*0.03,'#333');
  tri(c,x-s*0.02,y-s*0.35,x,y-s*0.48,x+s*0.02,y-s*0.35,'#cc9900');
  eyes(c,x,y-s*0.2,s*0.8);
  rect(c,x-s*0.14,y+s*0.25,s*0.1,s*0.2,'#222');
  rect(c,x+s*0.04,y+s*0.25,s*0.1,s*0.2,'#222');
  // Katana
  rect(c,x+s*0.25,y-s*0.35,s*0.025,s*0.55,'#ccc');
  roundRect(c,x+s*0.22,y-s*0.05,s*0.08,s*0.04,s*0.01,'#333');
}
sprites.samurai={draw:drawSamurai,category:'characters',name:'Samouraï',tags:['héros','guerrier']};

function drawCowboy(c,x,y,s,opt={}){
  const col=opt.color||'#c8883a';const skin=opt.skin||'#e8b878';
  roundRect(c,x-s*0.18,y-s*0.05,s*0.36,s*0.3,s*0.04,col);
  circle(c,x,y-s*0.2,s*0.13,skin);
  // Hat
  ellipse(c,x,y-s*0.3,s*0.28,s*0.04,'#5a3a20');
  roundRect(c,x-s*0.12,y-s*0.42,s*0.24,s*0.14,s*0.04,'#5a3a20');
  eyes(c,x,y-s*0.2,s*0.7);
  rect(c,x-s*0.12,y+s*0.25,s*0.1,s*0.2,col);
  rect(c,x+s*0.02,y+s*0.25,s*0.1,s*0.2,col);
  rect(c,x-s*0.14,y+s*0.4,s*0.13,s*0.06,'#5a3a20');
  rect(c,x+s*0.01,y+s*0.4,s*0.13,s*0.06,'#5a3a20');
  // Gun
  rect(c,x+s*0.2,y+s*0.05,s*0.15,s*0.04,'#555');
  rect(c,x+s*0.2,y+s*0.05,s*0.06,s*0.1,'#8B4513');
}
sprites.cowboy={draw:drawCowboy,category:'characters',name:'Cowboy',tags:['héros','western']};

/* ══════════════════════════════════
   ENEMIES / MONSTERS
   ══════════════════════════════════ */

function drawSlime(c,x,y,s,opt={}){
  const col=opt.color||'#44cc44';
  c.fillStyle=col;c.beginPath();c.moveTo(x-s*0.3,y+s*0.2);c.quadraticCurveTo(x-s*0.35,y-s*0.15,x,y-s*0.25);c.quadraticCurveTo(x+s*0.35,y-s*0.15,x+s*0.3,y+s*0.2);c.lineTo(x-s*0.3,y+s*0.2);c.fill();
  // Highlight
  c.fillStyle='rgba(255,255,255,0.3)';c.beginPath();c.ellipse(x-s*0.08,y-s*0.1,s*0.06,s*0.08,0,0,Math.PI*2);c.fill();
  eyes(c,x,y-s*0.02,s*0.65);
  // Mouth
  c.strokeStyle='#222';c.lineWidth=s*0.015;c.beginPath();c.arc(x,y+s*0.08,s*0.06,0,Math.PI);c.stroke();
}
sprites.slime={draw:drawSlime,category:'enemies',name:'Slime',tags:['monstre','blob'],variants:['#44cc44','#4488dd','#dd4444','#dddd44','#cc44cc']};

function drawSkeleton(c,x,y,s,opt={}){
  const bone='#e8e0d0';
  circle(c,x,y-s*0.22,s*0.13,bone);
  // Skull features
  circle(c,x-s*0.06,y-s*0.24,s*0.04,'#222');
  circle(c,x+s*0.06,y-s*0.24,s*0.04,'#222');
  tri(c,x-s*0.02,y-s*0.18,x+s*0.02,y-s*0.18,x,y-s*0.14,'#222');
  rect(c,x-s*0.06,y-s*0.12,s*0.12,s*0.03,'#222');
  // Ribs
  for(let i=0;i<3;i++){rect(c,x-s*0.12,y-s*0.05+i*s*0.08,s*0.24,s*0.03,bone)}
  rect(c,x-s*0.01,y-s*0.05,s*0.02,s*0.3,bone);
  // Arms
  rect(c,x-s*0.25,y-s*0.02,s*0.13,s*0.03,bone);
  rect(c,x+s*0.12,y-s*0.02,s*0.13,s*0.03,bone);
  // Legs
  rect(c,x-s*0.08,y+s*0.25,s*0.04,s*0.2,bone);
  rect(c,x+s*0.04,y+s*0.25,s*0.04,s*0.2,bone);
}
sprites.skeleton={draw:drawSkeleton,category:'enemies',name:'Squelette',tags:['monstre','mort-vivant']};

function drawBat(c,x,y,s,opt={}){
  const col=opt.color||'#442266';
  // Wings
  c.fillStyle=col;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-s*0.2,y-s*0.2,x-s*0.4,y-s*0.15);c.quadraticCurveTo(x-s*0.25,y+s*0.05,x-s*0.1,y+s*0.1);c.fill();
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+s*0.2,y-s*0.2,x+s*0.4,y-s*0.15);c.quadraticCurveTo(x+s*0.25,y+s*0.05,x+s*0.1,y+s*0.1);c.fill();
  // Body
  ellipse(c,x,y,s*0.08,s*0.1,col);
  // Eyes
  circle(c,x-s*0.04,y-s*0.02,s*0.025,'#ff4444');
  circle(c,x+s*0.04,y-s*0.02,s*0.025,'#ff4444');
  // Ears
  tri(c,x-s*0.06,y-s*0.08,x-s*0.02,y-s*0.18,x+s*0.02,y-s*0.08,col);
  tri(c,x-s*0.02,y-s*0.08,x+s*0.02,y-s*0.18,x+s*0.06,y-s*0.08,col);
}
sprites.bat={draw:drawBat,category:'enemies',name:'Chauve-souris',tags:['monstre','volant']};

function drawGhost(c,x,y,s,opt={}){
  c.fillStyle='rgba(200,200,255,0.7)';c.beginPath();c.arc(x,y-s*0.1,s*0.2,Math.PI,0);c.lineTo(x+s*0.2,y+s*0.2);
  for(let i=0;i<4;i++){const bx=x+s*0.2-i*s*0.1;c.quadraticCurveTo(bx-s*0.025,y+s*0.28,bx-s*0.05,y+s*0.2)}
  c.lineTo(x-s*0.2,y+s*0.2);c.fill();
  circle(c,x-s*0.07,y-s*0.1,s*0.05,'#222');
  circle(c,x+s*0.07,y-s*0.1,s*0.05,'#222');
  ellipse(c,x,y+s*0.02,s*0.04,s*0.03,'#222');
}
sprites.ghost={draw:drawGhost,category:'enemies',name:'Fantôme',tags:['monstre','spectral']};

function drawDragon(c,x,y,s,opt={}){
  const col=opt.color||'#cc2222';
  // Body
  ellipse(c,x,y+s*0.05,s*0.2,s*0.15,col);
  // Head
  ellipse(c,x+s*0.22,y-s*0.1,s*0.12,s*0.1,col);
  circle(c,x+s*0.3,y-s*0.12,s*0.03,'#ff8800');circle(c,x+s*0.3,y-s*0.12,s*0.015,'#111');
  // Horns
  tri(c,x+s*0.2,y-s*0.18,x+s*0.17,y-s*0.32,x+s*0.24,y-s*0.18,'#cc9900');
  tri(c,x+s*0.26,y-s*0.18,x+s*0.28,y-s*0.3,x+s*0.3,y-s*0.18,'#cc9900');
  // Wing
  c.fillStyle=col+'88';c.beginPath();c.moveTo(x-s*0.05,y-s*0.05);c.lineTo(x-s*0.15,y-s*0.35);c.lineTo(x+s*0.1,y-s*0.3);c.lineTo(x+s*0.05,y-s*0.05);c.fill();
  // Tail
  c.strokeStyle=col;c.lineWidth=s*0.05;c.beginPath();c.moveTo(x-s*0.2,y+s*0.05);c.quadraticCurveTo(x-s*0.35,y+s*0.15,x-s*0.4,y);c.stroke();
  // Legs
  rect(c,x-s*0.1,y+s*0.15,s*0.06,s*0.12,col);
  rect(c,x+s*0.05,y+s*0.15,s*0.06,s*0.12,col);
  // Fire
  if(opt.fire!==false){tri(c,x+s*0.34,y-s*0.14,x+s*0.5,y-s*0.1,x+s*0.34,y-s*0.06,'#ff4400');tri(c,x+s*0.36,y-s*0.12,x+s*0.46,y-s*0.1,x+s*0.36,y-s*0.08,'#ffaa00')}
}
sprites.dragon={draw:drawDragon,category:'enemies',name:'Dragon',tags:['monstre','boss']};

function drawZombie(c,x,y,s,opt={}){
  const skin='#7ab87a';
  roundRect(c,x-s*0.18,y-s*0.05,s*0.36,s*0.3,s*0.04,'#554433');
  circle(c,x,y-s*0.2,s*0.14,skin);
  eyes(c,x,y-s*0.2,s*0.8);
  // Mouth
  c.strokeStyle='#333';c.lineWidth=s*0.02;c.beginPath();c.moveTo(x-s*0.06,y-s*0.12);c.lineTo(x-s*0.04,y-s*0.1);c.lineTo(x,y-s*0.12);c.lineTo(x+s*0.04,y-s*0.1);c.lineTo(x+s*0.06,y-s*0.12);c.stroke();
  // Arms outstretched
  rect(c,x-s*0.35,y-s*0.02,s*0.17,s*0.06,skin);
  rect(c,x+s*0.18,y-s*0.02,s*0.17,s*0.06,skin);
  rect(c,x-s*0.13,y+s*0.25,s*0.1,s*0.2,'#443322');
  rect(c,x+s*0.03,y+s*0.25,s*0.1,s*0.2,'#443322');
}
sprites.zombie={draw:drawZombie,category:'enemies',name:'Zombie',tags:['monstre','mort-vivant']};

function drawSpider(c,x,y,s,opt={}){
  const col=opt.color||'#333';
  ellipse(c,x,y,s*0.12,s*0.1,col);
  circle(c,x,y-s*0.12,s*0.08,col);
  circle(c,x-s*0.03,y-s*0.14,s*0.025,'#ff0000');
  circle(c,x+s*0.03,y-s*0.14,s*0.025,'#ff0000');
  // Legs
  const legAngles=[-0.5,-0.25,0.1,0.35];
  c.strokeStyle=col;c.lineWidth=s*0.02;
  for(const a of legAngles){
    const lx=Math.cos(Math.PI+a)*s*0.3,ly=Math.sin(Math.PI+a)*s*0.15;
    line(c,x-s*0.08,y+ly*0.3,x+lx,y+s*0.15,col,s*0.02);
    const rx=Math.cos(a)*s*0.3,ry=Math.sin(a)*s*0.15;
    line(c,x+s*0.08,y+ry*0.3,x+rx,y+s*0.15,col,s*0.02);
  }
}
sprites.spider={draw:drawSpider,category:'enemies',name:'Araignée',tags:['monstre','insecte']};

function drawGolem(c,x,y,s,opt={}){
  const col=opt.color||'#8B7355';
  roundRect(c,x-s*0.25,y-s*0.1,s*0.5,s*0.4,s*0.06,col);
  roundRect(c,x-s*0.18,y-s*0.32,s*0.36,s*0.25,s*0.06,col);
  // Eyes (glowing)
  circle(c,x-s*0.07,y-s*0.22,s*0.04,'#ffcc00');
  circle(c,x+s*0.07,y-s*0.22,s*0.04,'#ffcc00');
  // Cracks
  line(c,x-s*0.1,y-s*0.15,x-s*0.05,y,col+'88',s*0.015);
  line(c,x+s*0.08,y-s*0.1,x+s*0.12,y+s*0.1,col+'88',s*0.015);
  // Arms
  roundRect(c,x-s*0.4,y-s*0.05,s*0.15,s*0.3,s*0.05,col);
  roundRect(c,x+s*0.25,y-s*0.05,s*0.15,s*0.3,s*0.05,col);
  // Legs
  rect(c,x-s*0.18,y+s*0.3,s*0.14,s*0.15,col);
  rect(c,x+s*0.04,y+s*0.3,s*0.14,s*0.15,col);
}
sprites.golem={draw:drawGolem,category:'enemies',name:'Golem',tags:['monstre','pierre']};

function drawGoblin(c,x,y,s,opt={}){
  const skin='#6a9a3a';
  roundRect(c,x-s*0.15,y-s*0.05,s*0.3,s*0.25,s*0.03,'#554422');
  circle(c,x,y-s*0.18,s*0.12,skin);
  // Ears
  ellipse(c,x-s*0.16,y-s*0.18,s*0.06,s*0.04,skin);
  ellipse(c,x+s*0.16,y-s*0.18,s*0.06,s*0.04,skin);
  circle(c,x-s*0.05,y-s*0.2,s*0.04,'#ff0');circle(c,x-s*0.05,y-s*0.2,s*0.02,'#111');
  circle(c,x+s*0.05,y-s*0.2,s*0.04,'#ff0');circle(c,x+s*0.05,y-s*0.2,s*0.02,'#111');
  // Grin
  c.strokeStyle='#222';c.lineWidth=s*0.015;c.beginPath();c.arc(x,y-s*0.11,s*0.06,0.1,Math.PI-0.1);c.stroke();
  rect(c,x-s*0.1,y+s*0.2,s*0.08,s*0.18,'#554422');
  rect(c,x+s*0.02,y+s*0.2,s*0.08,s*0.18,'#554422');
}
sprites.goblin={draw:drawGoblin,category:'enemies',name:'Gobelin',tags:['monstre','humanoïde']};

function drawWolf(c,x,y,s,opt={}){
  const col=opt.color||'#777';
  ellipse(c,x-s*0.05,y+s*0.05,s*0.2,s*0.12,col);
  circle(c,x+s*0.18,y-s*0.05,s*0.1,col);
  tri(c,x+s*0.13,y-s*0.13,x+s*0.1,y-s*0.22,x+s*0.17,y-s*0.13,col);
  tri(c,x+s*0.2,y-s*0.13,x+s*0.2,y-s*0.22,x+s*0.26,y-s*0.13,col);
  circle(c,x+s*0.23,y-s*0.05,s*0.02,'#ff4444');
  // Legs
  rect(c,x-s*0.15,y+s*0.12,s*0.05,s*0.15,col);
  rect(c,x-s*0.02,y+s*0.12,s*0.05,s*0.15,col);
  rect(c,x+s*0.08,y+s*0.12,s*0.05,s*0.15,col);
  // Tail
  c.strokeStyle=col;c.lineWidth=s*0.04;c.beginPath();c.moveTo(x-s*0.25,y+s*0.02);c.quadraticCurveTo(x-s*0.35,y-s*0.1,x-s*0.3,y-s*0.15);c.stroke();
}
sprites.wolf={draw:drawWolf,category:'enemies',name:'Loup',tags:['monstre','animal']};

function drawOrc(c,x,y,s,opt={}){
  const skin='#5a8a3a';
  roundRect(c,x-s*0.22,y-s*0.05,s*0.44,s*0.35,s*0.05,'#4a3020');
  circle(c,x,y-s*0.2,s*0.16,skin);
  circle(c,x-s*0.08,y-s*0.22,s*0.04,'#ff0');circle(c,x-s*0.08,y-s*0.22,s*0.02,'#111');
  circle(c,x+s*0.08,y-s*0.22,s*0.04,'#ff0');circle(c,x+s*0.08,y-s*0.22,s*0.02,'#111');
  // Tusks
  tri(c,x-s*0.06,y-s*0.1,x-s*0.04,y-s*0.16,x-s*0.02,y-s*0.1,'#fff');
  tri(c,x+s*0.02,y-s*0.1,x+s*0.04,y-s*0.16,x+s*0.06,y-s*0.1,'#fff');
  roundRect(c,x-s*0.35,y-s*0.02,s*0.13,s*0.25,s*0.04,skin);
  roundRect(c,x+s*0.22,y-s*0.02,s*0.13,s*0.25,s*0.04,skin);
  rect(c,x-s*0.16,y+s*0.3,s*0.12,s*0.18,'#3a2010');
  rect(c,x+s*0.04,y+s*0.3,s*0.12,s*0.18,'#3a2010');
}
sprites.orc={draw:drawOrc,category:'enemies',name:'Orc',tags:['monstre','humanoïde']};

function drawMushroom(c,x,y,s,opt={}){
  const col=opt.color||'#cc2222';
  // Stem
  roundRect(c,x-s*0.08,y,s*0.16,s*0.2,s*0.03,'#e8d8c0');
  // Cap
  c.fillStyle=col;c.beginPath();c.arc(x,y,s*0.2,Math.PI,0);c.fill();
  // Spots
  circle(c,x-s*0.08,y-s*0.12,s*0.04,'#fff');
  circle(c,x+s*0.08,y-s*0.08,s*0.03,'#fff');
  circle(c,x,y-s*0.02,s*0.03,'#fff');
  // Evil eyes
  circle(c,x-s*0.06,y+s*0.04,s*0.03,'#fff');circle(c,x-s*0.06,y+s*0.04,s*0.015,'#111');
  circle(c,x+s*0.06,y+s*0.04,s*0.03,'#fff');circle(c,x+s*0.06,y+s*0.04,s*0.015,'#111');
}
sprites.evilMushroom={draw:drawMushroom,category:'enemies',name:'Champignon',tags:['monstre','plante']};

function drawFlyingEye(c,x,y,s,opt={}){
  circle(c,x,y,s*0.2,'#cc4488');
  circle(c,x,y,s*0.14,'#fff');
  circle(c,x,y,s*0.08,'#44aaff');
  circle(c,x,y,s*0.04,'#111');
  circle(c,x-s*0.03,y-s*0.02,s*0.02,'#fff');
  // Wings
  c.fillStyle='#aa3366';c.beginPath();c.moveTo(x-s*0.18,y);c.quadraticCurveTo(x-s*0.3,y-s*0.2,x-s*0.35,y-s*0.1);c.quadraticCurveTo(x-s*0.3,y+s*0.05,x-s*0.18,y);c.fill();
  c.beginPath();c.moveTo(x+s*0.18,y);c.quadraticCurveTo(x+s*0.3,y-s*0.2,x+s*0.35,y-s*0.1);c.quadraticCurveTo(x+s*0.3,y+s*0.05,x+s*0.18,y);c.fill();
}
sprites.flyingEye={draw:drawFlyingEye,category:'enemies',name:'Œil volant',tags:['monstre','volant']};

function drawDemon(c,x,y,s,opt={}){
  const col=opt.color||'#991111';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.35,s*0.05,col);
  circle(c,x,y-s*0.2,s*0.15,col);
  // Horns
  tri(c,x-s*0.15,y-s*0.28,x-s*0.22,y-s*0.45,x-s*0.08,y-s*0.28,'#661111');
  tri(c,x+s*0.08,y-s*0.28,x+s*0.22,y-s*0.45,x+s*0.15,y-s*0.28,'#661111');
  // Eyes
  circle(c,x-s*0.06,y-s*0.22,s*0.04,'#ff4400');circle(c,x-s*0.06,y-s*0.22,s*0.02,'#111');
  circle(c,x+s*0.06,y-s*0.22,s*0.04,'#ff4400');circle(c,x+s*0.06,y-s*0.22,s*0.02,'#111');
  // Wings
  c.fillStyle=col+'88';c.beginPath();c.moveTo(x-s*0.2,y-s*0.05);c.lineTo(x-s*0.45,y-s*0.25);c.lineTo(x-s*0.35,y+s*0.1);c.fill();
  c.beginPath();c.moveTo(x+s*0.2,y-s*0.05);c.lineTo(x+s*0.45,y-s*0.25);c.lineTo(x+s*0.35,y+s*0.1);c.fill();
  rect(c,x-s*0.14,y+s*0.3,s*0.1,s*0.15,col);
  rect(c,x+s*0.04,y+s*0.3,s*0.1,s*0.15,col);
}
sprites.demon={draw:drawDemon,category:'enemies',name:'Démon',tags:['monstre','boss']};

function drawMinotaur(c,x,y,s,opt={}){
  const skin='#8a5a3a';
  roundRect(c,x-s*0.25,y-s*0.05,s*0.5,s*0.35,s*0.06,skin);
  circle(c,x,y-s*0.2,s*0.16,skin);
  tri(c,x-s*0.18,y-s*0.3,x-s*0.28,y-s*0.42,x-s*0.1,y-s*0.28,'#5a3a1a');
  tri(c,x+s*0.1,y-s*0.3,x+s*0.28,y-s*0.42,x+s*0.18,y-s*0.28,'#5a3a1a');
  // Snout
  ellipse(c,x,y-s*0.12,s*0.08,s*0.05,'#6a4a2a');
  circle(c,x-s*0.03,y-s*0.12,s*0.015,'#222');
  circle(c,x+s*0.03,y-s*0.12,s*0.015,'#222');
  circle(c,x-s*0.07,y-s*0.22,s*0.03,'#ff2200');
  circle(c,x+s*0.07,y-s*0.22,s*0.03,'#ff2200');
  roundRect(c,x-s*0.4,y-s*0.02,s*0.15,s*0.28,s*0.05,skin);
  roundRect(c,x+s*0.25,y-s*0.02,s*0.15,s*0.28,s*0.05,skin);
  rect(c,x-s*0.18,y+s*0.3,s*0.14,s*0.18,'#5a3a1a');
  rect(c,x+s*0.04,y+s*0.3,s*0.14,s*0.18,'#5a3a1a');
}
sprites.minotaur={draw:drawMinotaur,category:'enemies',name:'Minotaure',tags:['monstre','boss']};

function drawSnake(c,x,y,s,opt={}){
  const col=opt.color||'#44aa44';
  c.strokeStyle=col;c.lineWidth=s*0.08;c.lineCap='round';
  c.beginPath();c.moveTo(x-s*0.3,y+s*0.1);c.quadraticCurveTo(x-s*0.15,y-s*0.1,x,y+s*0.05);c.quadraticCurveTo(x+s*0.15,y+s*0.2,x+s*0.25,y);c.stroke();
  circle(c,x+s*0.27,y-s*0.02,s*0.06,col);
  circle(c,x+s*0.29,y-s*0.04,s*0.02,'#ff0');circle(c,x+s*0.29,y-s*0.04,s*0.01,'#111');
  // Tongue
  c.strokeStyle='#ff0000';c.lineWidth=s*0.015;c.beginPath();c.moveTo(x+s*0.33,y-s*0.02);c.lineTo(x+s*0.38,y-s*0.04);c.moveTo(x+s*0.36,y-s*0.03);c.lineTo(x+s*0.38,y);c.stroke();
}
sprites.snake={draw:drawSnake,category:'enemies',name:'Serpent',tags:['monstre','animal']};

function drawTroll(c,x,y,s,opt={}){
  const skin='#6a8a4a';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.35,s*0.05,skin);
  circle(c,x,y-s*0.18,s*0.16,skin);
  circle(c,x-s*0.08,y-s*0.18,s*0.05,'#fff');circle(c,x-s*0.08,y-s*0.18,s*0.025,'#111');
  circle(c,x+s*0.08,y-s*0.18,s*0.05,'#fff');circle(c,x+s*0.08,y-s*0.18,s*0.025,'#111');
  ellipse(c,x,y-s*0.07,s*0.08,s*0.04,skin);
  c.strokeStyle='#222';c.lineWidth=s*0.02;c.beginPath();c.arc(x,y-s*0.03,s*0.05,0.3,Math.PI-0.3);c.stroke();
  roundRect(c,x-s*0.35,y,s*0.15,s*0.3,s*0.05,skin);
  roundRect(c,x+s*0.2,y,s*0.15,s*0.3,s*0.05,skin);
  rect(c,x-s*0.15,y+s*0.3,s*0.12,s*0.15,skin);
  rect(c,x+s*0.03,y+s*0.3,s*0.12,s*0.15,skin);
}
sprites.troll={draw:drawTroll,category:'enemies',name:'Troll',tags:['monstre','humanoïde']};

/* ══════════════════════════════════
   NPCs
   ══════════════════════════════════ */

function drawVillager(c,x,y,s,opt={}){
  const col=opt.color||'#6688aa';const skin=opt.skin||'#f0c090';const hair=opt.hair||'#8a5a3a';
  roundRect(c,x-s*0.15,y-s*0.05,s*0.3,s*0.28,s*0.03,col);
  circle(c,x,y-s*0.18,s*0.12,skin);
  // Hair
  c.fillStyle=hair;c.beginPath();c.arc(x,y-s*0.18,s*0.13,Math.PI,Math.PI*2);c.fill();
  eyes(c,x,y-s*0.17,s*0.6);
  c.strokeStyle='#222';c.lineWidth=s*0.01;c.beginPath();c.arc(x,y-s*0.1,s*0.04,0.2,Math.PI-0.2);c.stroke();
  rect(c,x-s*0.1,y+s*0.23,s*0.08,s*0.18,col);
  rect(c,x+s*0.02,y+s*0.23,s*0.08,s*0.18,col);
}
sprites.villager={draw:drawVillager,category:'npcs',name:'Villageois',tags:['pnj','neutre']};

function drawMerchant(c,x,y,s,opt={}){
  const skin='#f0c090';
  roundRect(c,x-s*0.18,y-s*0.05,s*0.36,s*0.3,s*0.04,'#8a4090');
  circle(c,x,y-s*0.2,s*0.13,skin);
  // Turban
  roundRect(c,x-s*0.14,y-s*0.35,s*0.28,s*0.15,s*0.05,'#cc8800');
  circle(c,x,y-s*0.3,s*0.04,'#ff4444');
  eyes(c,x,y-s*0.18,s*0.7);
  // Beard
  roundRect(c,x-s*0.06,y-s*0.1,s*0.12,s*0.08,s*0.02,'#555');
  rect(c,x-s*0.12,y+s*0.25,s*0.09,s*0.18,'#8a4090');
  rect(c,x+s*0.03,y+s*0.25,s*0.09,s*0.18,'#8a4090');
  // Bag
  roundRect(c,x+s*0.18,y+s*0.05,s*0.12,s*0.15,s*0.03,'#8a6830');
}
sprites.merchant={draw:drawMerchant,category:'npcs',name:'Marchand',tags:['pnj','commerce']};

function drawGuard(c,x,y,s,opt={}){
  const skin='#f0c090';
  roundRect(c,x-s*0.18,y-s*0.05,s*0.36,s*0.3,s*0.04,'#666');
  circle(c,x,y-s*0.2,s*0.13,skin);
  roundRect(c,x-s*0.15,y-s*0.35,s*0.3,s*0.12,s*0.04,'#777');
  eyes(c,x,y-s*0.2,s*0.7);
  rect(c,x-s*0.13,y+s*0.25,s*0.1,s*0.2,'#555');
  rect(c,x+s*0.03,y+s*0.25,s*0.1,s*0.2,'#555');
  // Spear
  rect(c,x-s*0.28,y-s*0.4,s*0.025,s*0.7,'#8B4513');
  tri(c,x-s*0.3,y-s*0.4,x-s*0.268,y-s*0.48,x-s*0.235,y-s*0.4,'#ccc');
}
sprites.guard={draw:drawGuard,category:'npcs',name:'Garde',tags:['pnj','protection']};

function drawElder(c,x,y,s,opt={}){
  const skin='#e8c8a0';
  c.fillStyle='#6a4a8a';c.beginPath();c.moveTo(x-s*0.22,y+s*0.42);c.lineTo(x-s*0.12,y-s*0.05);c.lineTo(x+s*0.12,y-s*0.05);c.lineTo(x+s*0.22,y+s*0.42);c.fill();
  circle(c,x,y-s*0.18,s*0.13,skin);
  // Long beard
  c.fillStyle='#ddd';c.beginPath();c.moveTo(x-s*0.08,y-s*0.1);c.quadraticCurveTo(x,y+s*0.15,x+s*0.08,y-s*0.1);c.fill();
  eyes(c,x,y-s*0.18,s*0.7);
  // Staff
  rect(c,x+s*0.2,y-s*0.35,s*0.025,s*0.65,'#8B4513');
  circle(c,x+s*0.213,y-s*0.37,s*0.04,'#44ddff');
}
sprites.elder={draw:drawElder,category:'npcs',name:'Ancien',tags:['pnj','sage']};

function drawKing(c,x,y,s,opt={}){
  const skin='#f0c090';
  roundRect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.3,s*0.04,'#cc2222');
  // Cape
  roundRect(c,x-s*0.25,y-s*0.08,s*0.5,s*0.4,s*0.04,'#990000');
  circle(c,x,y-s*0.2,s*0.14,skin);
  // Crown
  c.fillStyle='#cc9900';c.beginPath();c.moveTo(x-s*0.14,y-s*0.28);c.lineTo(x-s*0.12,y-s*0.4);c.lineTo(x-s*0.06,y-s*0.32);c.lineTo(x,y-s*0.42);c.lineTo(x+s*0.06,y-s*0.32);c.lineTo(x+s*0.12,y-s*0.4);c.lineTo(x+s*0.14,y-s*0.28);c.fill();
  circle(c,x,y-s*0.35,s*0.025,'#ff4444');
  eyes(c,x,y-s*0.2,s*0.7);
  rect(c,x-s*0.13,y+s*0.25,s*0.1,s*0.18,'#cc2222');
  rect(c,x+s*0.03,y+s*0.25,s*0.1,s*0.18,'#cc2222');
}
sprites.king={draw:drawKing,category:'npcs',name:'Roi',tags:['pnj','royauté']};

function drawPrincess(c,x,y,s,opt={}){
  const skin='#f8d0a8';const col='#dd66aa';
  c.fillStyle=col;c.beginPath();c.moveTo(x-s*0.2,y+s*0.42);c.lineTo(x-s*0.12,y-s*0.05);c.lineTo(x+s*0.12,y-s*0.05);c.lineTo(x+s*0.2,y+s*0.42);c.fill();
  circle(c,x,y-s*0.18,s*0.13,skin);
  // Hair
  c.fillStyle='#cc8800';c.beginPath();c.arc(x,y-s*0.18,s*0.14,Math.PI*1.2,Math.PI*1.8);c.fill();
  rect(c,x-s*0.14,y-s*0.15,s*0.04,s*0.2,'#cc8800');
  rect(c,x+s*0.1,y-s*0.15,s*0.04,s*0.2,'#cc8800');
  // Tiara
  c.fillStyle='#cc9900';c.beginPath();c.moveTo(x-s*0.08,y-s*0.28);c.lineTo(x-s*0.04,y-s*0.35);c.lineTo(x,y-s*0.3);c.lineTo(x+s*0.04,y-s*0.35);c.lineTo(x+s*0.08,y-s*0.28);c.fill();
  eyes(c,x,y-s*0.18,s*0.6);
  c.strokeStyle='#cc4488';c.lineWidth=s*0.01;c.beginPath();c.arc(x,y-s*0.12,s*0.03,0.2,Math.PI-0.2);c.stroke();
}
sprites.princess={draw:drawPrincess,category:'npcs',name:'Princesse',tags:['pnj','royauté']};

/* ══════════════════════════════════
   ENVIRONMENT
   ══════════════════════════════════ */

function drawTree(c,x,y,s,opt={}){
  const type=opt.type||'oak';
  rect(c,x-s*0.05,y+s*0.1,s*0.1,s*0.25,'#8B4513');
  if(type==='pine'){
    const g='#2d5a27';
    tri(c,x-s*0.2,y+s*0.1,x,y-s*0.35,x+s*0.2,y+s*0.1,g);
    tri(c,x-s*0.16,y-s*0.05,x,y-s*0.42,x+s*0.16,y-s*0.05,g);
  }else if(type==='palm'){
    c.strokeStyle='#8B4513';c.lineWidth=s*0.06;c.beginPath();c.moveTo(x,y+s*0.35);c.quadraticCurveTo(x+s*0.1,y,x+s*0.05,y-s*0.25);c.stroke();
    for(let a=-0.8;a<=0.8;a+=0.4){
      c.strokeStyle='#228a22';c.lineWidth=s*0.03;c.beginPath();c.moveTo(x+s*0.05,y-s*0.25);c.quadraticCurveTo(x+s*0.05+Math.cos(a)*s*0.15,y-s*0.3,x+s*0.05+Math.cos(a)*s*0.25,y-s*0.15+Math.sin(a)*s*0.1);c.stroke();
    }
  }else if(type==='cherry'){
    circle(c,x,y-s*0.1,s*0.2,'#ffaacc');
    circle(c,x-s*0.08,y-s*0.15,s*0.04,'#ff6699');
    circle(c,x+s*0.1,y-s*0.08,s*0.03,'#ff6699');
  }else if(type==='dead'){
    c.strokeStyle='#5a4030';c.lineWidth=s*0.04;
    c.beginPath();c.moveTo(x,y+s*0.35);c.lineTo(x,y-s*0.2);c.stroke();
    c.beginPath();c.moveTo(x,y-s*0.05);c.lineTo(x-s*0.15,y-s*0.2);c.stroke();
    c.beginPath();c.moveTo(x,y-s*0.12);c.lineTo(x+s*0.12,y-s*0.25);c.stroke();
  }else{
    circle(c,x,y-s*0.1,s*0.22,'#2d8a27');
    circle(c,x-s*0.1,y-s*0.15,s*0.12,'#3a9a37');
    circle(c,x+s*0.08,y-s*0.08,s*0.1,'#3a9a37');
  }
}
sprites.treeOak={draw:(c,x,y,s,o)=>drawTree(c,x,y,s,{...o,type:'oak'}),category:'environment',name:'Chêne',tags:['arbre','nature']};
sprites.treePine={draw:(c,x,y,s,o)=>drawTree(c,x,y,s,{...o,type:'pine'}),category:'environment',name:'Sapin',tags:['arbre','nature']};
sprites.treePalm={draw:(c,x,y,s,o)=>drawTree(c,x,y,s,{...o,type:'palm'}),category:'environment',name:'Palmier',tags:['arbre','tropical']};
sprites.treeCherry={draw:(c,x,y,s,o)=>drawTree(c,x,y,s,{...o,type:'cherry'}),category:'environment',name:'Cerisier',tags:['arbre','nature']};
sprites.treeDead={draw:(c,x,y,s,o)=>drawTree(c,x,y,s,{...o,type:'dead'}),category:'environment',name:'Arbre mort',tags:['arbre','sombre']};

function drawRock(c,x,y,s,opt={}){
  const col=opt.color||'#888';const sz=opt.size||'medium';
  const sc=sz==='small'?0.5:sz==='large'?1.3:1;
  c.fillStyle=col;c.beginPath();
  c.moveTo(x-s*0.2*sc,y+s*0.1);c.lineTo(x-s*0.22*sc,y-s*0.05);c.lineTo(x-s*0.1*sc,y-s*0.15*sc);c.lineTo(x+s*0.05,y-s*0.18*sc);c.lineTo(x+s*0.2*sc,y-s*0.08);c.lineTo(x+s*0.22*sc,y+s*0.1);c.fill();
  // Highlight
  c.fillStyle='rgba(255,255,255,0.15)';c.beginPath();c.moveTo(x-s*0.1*sc,y-s*0.14*sc);c.lineTo(x+s*0.05,y-s*0.17*sc);c.lineTo(x+s*0.1*sc,y-s*0.05);c.lineTo(x-s*0.05,y);c.fill();
}
sprites.rockSmall={draw:(c,x,y,s,o)=>drawRock(c,x,y,s,{...o,size:'small'}),category:'environment',name:'Petit rocher',tags:['pierre','nature']};
sprites.rockMedium={draw:(c,x,y,s,o)=>drawRock(c,x,y,s,{...o,size:'medium'}),category:'environment',name:'Rocher',tags:['pierre','nature']};
sprites.rockLarge={draw:(c,x,y,s,o)=>drawRock(c,x,y,s,{...o,size:'large'}),category:'environment',name:'Gros rocher',tags:['pierre','nature']};

function drawBush(c,x,y,s,opt={}){
  const col=opt.color||'#2d8a27';
  circle(c,x-s*0.1,y,s*0.12,col);circle(c,x+s*0.1,y,s*0.12,col);circle(c,x,y-s*0.06,s*0.13,col);
  circle(c,x-s*0.05,y-s*0.08,s*0.04,'#3aaa37');
}
sprites.bush={draw:drawBush,category:'environment',name:'Buisson',tags:['végétation','nature']};

function drawFlower(c,x,y,s,opt={}){
  const col=opt.color||'#ff6688';
  rect(c,x-s*0.01,y,s*0.02,s*0.15,'#4a8a22');
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;circle(c,x+Math.cos(a)*s*0.06,y-s*0.08+Math.sin(a)*s*0.06,s*0.04,col)}
  circle(c,x,y-s*0.08,s*0.03,'#ffcc00');
}
sprites.flowerRed={draw:(c,x,y,s,o)=>drawFlower(c,x,y,s,{...o,color:'#ff4466'}),category:'environment',name:'Fleur rouge',tags:['fleur','nature']};
sprites.flowerBlue={draw:(c,x,y,s,o)=>drawFlower(c,x,y,s,{...o,color:'#4488ff'}),category:'environment',name:'Fleur bleue',tags:['fleur','nature']};
sprites.flowerYellow={draw:(c,x,y,s,o)=>drawFlower(c,x,y,s,{...o,color:'#ffcc22'}),category:'environment',name:'Fleur jaune',tags:['fleur','nature']};
sprites.flowerPurple={draw:(c,x,y,s,o)=>drawFlower(c,x,y,s,{...o,color:'#aa44ff'}),category:'environment',name:'Fleur violette',tags:['fleur','nature']};
sprites.flowerWhite={draw:(c,x,y,s,o)=>drawFlower(c,x,y,s,{...o,color:'#fff'}),category:'environment',name:'Fleur blanche',tags:['fleur','nature']};

function drawGrass(c,x,y,s){
  c.strokeStyle='#3a9a37';c.lineWidth=s*0.02;
  for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(x+i*s*0.05,y+s*0.1);c.quadraticCurveTo(x+i*s*0.07,y-s*0.05,x+i*s*0.03,y-s*0.1);c.stroke()}
}
sprites.grass={draw:drawGrass,category:'environment',name:'Herbe',tags:['végétation','nature']};

function drawCloud(c,x,y,s){
  c.fillStyle='rgba(255,255,255,0.8)';
  circle(c,x-s*0.12,y,s*0.1,'rgba(255,255,255,0.8)');circle(c,x,y-s*0.05,s*0.13,'rgba(255,255,255,0.8)');
  circle(c,x+s*0.12,y,s*0.1,'rgba(255,255,255,0.8)');circle(c,x+s*0.05,y+s*0.02,s*0.09,'rgba(255,255,255,0.7)');
}
sprites.cloud={draw:drawCloud,category:'environment',name:'Nuage',tags:['ciel','décor']};

function drawStar(c,x,y,s){
  c.fillStyle='#ffdd44';c.beginPath();
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;const a2=(i+0.5)/5*Math.PI*2-Math.PI/2;
    c.lineTo(x+Math.cos(a)*s*0.15,y+Math.sin(a)*s*0.15);c.lineTo(x+Math.cos(a2)*s*0.06,y+Math.sin(a2)*s*0.06)}
  c.fill();
}
sprites.starDecor={draw:drawStar,category:'environment',name:'Étoile',tags:['ciel','décor']};

function drawSun(c,x,y,s){
  circle(c,x,y,s*0.12,'#ffdd44');
  c.strokeStyle='#ffcc00';c.lineWidth=s*0.02;
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;c.beginPath();c.moveTo(x+Math.cos(a)*s*0.15,y+Math.sin(a)*s*0.15);c.lineTo(x+Math.cos(a)*s*0.22,y+Math.sin(a)*s*0.22);c.stroke()}
}
sprites.sun={draw:drawSun,category:'environment',name:'Soleil',tags:['ciel','décor']};

function drawMoon(c,x,y,s){
  circle(c,x,y,s*0.15,'#e8e8d0');circle(c,x+s*0.06,y-s*0.03,s*0.12,'#0b0f19');
}
sprites.moon={draw:drawMoon,category:'environment',name:'Lune',tags:['ciel','nuit']};

function drawHouse(c,x,y,s){
  rect(c,x-s*0.2,y-s*0.05,s*0.4,s*0.35,'#b8885a');
  tri(c,x-s*0.25,y-s*0.05,x,y-s*0.3,x+s*0.25,y-s*0.05,'#cc4444');
  rect(c,x-s*0.05,y+s*0.1,s*0.1,s*0.2,'#5a3a20');
  rect(c,x-s*0.15,y+s*0.02,s*0.07,s*0.07,'#aaddff');
  rect(c,x+s*0.08,y+s*0.02,s*0.07,s*0.07,'#aaddff');
}
sprites.house={draw:drawHouse,category:'environment',name:'Maison',tags:['bâtiment','construction']};

function drawCastle(c,x,y,s){
  rect(c,x-s*0.2,y-s*0.1,s*0.4,s*0.4,'#888');
  for(let i=-1;i<=1;i+=2){rect(c,x+i*s*0.22,y-s*0.3,s*0.1,s*0.5,'#999');
    rect(c,x+i*s*0.2,y-s*0.35,s*0.04,s*0.06,'#777');rect(c,x+i*s*0.26,y-s*0.35,s*0.04,s*0.06,'#777')}
  rect(c,x-s*0.04,y-s*0.2,s*0.08,s*0.08,'#777');
  // Gate
  c.fillStyle='#5a3a20';c.beginPath();c.arc(x,y+s*0.1,s*0.06,Math.PI,0);c.lineTo(x+s*0.06,y+s*0.3);c.lineTo(x-s*0.06,y+s*0.3);c.fill();
  // Battlements
  for(let i=-2;i<=2;i++)rect(c,x+i*s*0.08-s*0.025,y-s*0.16,s*0.05,s*0.06,'#aaa');
}
sprites.castle={draw:drawCastle,category:'environment',name:'Château',tags:['bâtiment','médiéval']};

function drawBridge(c,x,y,s){
  rect(c,x-s*0.3,y,s*0.6,s*0.08,'#8B4513');
  rect(c,x-s*0.28,y-s*0.02,s*0.04,s*0.12,'#6a3a10');
  rect(c,x+s*0.24,y-s*0.02,s*0.04,s*0.12,'#6a3a10');
  c.strokeStyle='#8B4513';c.lineWidth=s*0.015;c.beginPath();c.moveTo(x-s*0.26,y-s*0.02);c.lineTo(x+s*0.26,y-s*0.02);c.stroke();
}
sprites.bridge={draw:drawBridge,category:'environment',name:'Pont',tags:['structure','passage']};

function drawBarrel(c,x,y,s){
  roundRect(c,x-s*0.1,y-s*0.12,s*0.2,s*0.28,s*0.03,'#8a5a30');
  rect(c,x-s*0.11,y-s*0.05,s*0.22,s*0.03,'#666');
  rect(c,x-s*0.11,y+s*0.08,s*0.22,s*0.03,'#666');
}
sprites.barrel={draw:drawBarrel,category:'environment',name:'Tonneau',tags:['objet','décor']};

function drawCrate(c,x,y,s){
  rect(c,x-s*0.12,y-s*0.12,s*0.24,s*0.24,'#b8884a');
  line(c,x-s*0.12,y-s*0.12,x+s*0.12,y+s*0.12,'#8a6a3a',s*0.015);
  line(c,x+s*0.12,y-s*0.12,x-s*0.12,y+s*0.12,'#8a6a3a',s*0.015);
  rect(c,x-s*0.12,y-s*0.01,s*0.24,s*0.02,'#8a6a3a');
}
sprites.crate={draw:drawCrate,category:'environment',name:'Caisse',tags:['objet','destructible']};

function drawChest(c,x,y,s,opt={}){
  const open=opt.open;
  roundRect(c,x-s*0.14,y-s*0.02,s*0.28,s*0.16,s*0.03,'#b87830');
  if(open){roundRect(c,x-s*0.14,y-s*0.16,s*0.28,s*0.1,s*0.03,'#a06828');rect(c,x-s*0.03,y-s*0.14,s*0.06,s*0.04,'#cc9900')}
  else{roundRect(c,x-s*0.14,y-s*0.08,s*0.28,s*0.08,s*0.03,'#a06828')}
  rect(c,x-s*0.03,y+s*0.02,s*0.06,s*0.04,'#cc9900');
}
sprites.chestClosed={draw:(c,x,y,s,o)=>drawChest(c,x,y,s,{...o,open:false}),category:'environment',name:'Coffre fermé',tags:['objet','trésor']};
sprites.chestOpen={draw:(c,x,y,s,o)=>drawChest(c,x,y,s,{...o,open:true}),category:'environment',name:'Coffre ouvert',tags:['objet','trésor']};

function drawSign(c,x,y,s){
  rect(c,x-s*0.02,y,s*0.04,s*0.25,'#8B4513');
  roundRect(c,x-s*0.12,y-s*0.15,s*0.24,s*0.16,s*0.02,'#c8a060');
  rect(c,x-s*0.08,y-s*0.1,s*0.16,s*0.02,'#8a6a3a');
  rect(c,x-s*0.06,y-s*0.06,s*0.12,s*0.02,'#8a6a3a');
}
sprites.sign={draw:drawSign,category:'environment',name:'Panneau',tags:['objet','indication']};

function drawLamp(c,x,y,s){
  rect(c,x-s*0.02,y-s*0.05,s*0.04,s*0.4,'#555');
  circle(c,x,y-s*0.1,s*0.06,'#ffdd44');
  circle(c,x,y-s*0.1,s*0.08,'rgba(255,221,68,0.3)');
  rect(c,x-s*0.06,y-s*0.08,s*0.12,s*0.02,'#444');
}
sprites.lamp={draw:drawLamp,category:'environment',name:'Lampadaire',tags:['objet','lumière']};

function drawFlag(c,x,y,s,opt={}){
  const col=opt.color||'#cc2222';
  rect(c,x-s*0.02,y-s*0.3,s*0.04,s*0.55,'#8B4513');
  c.fillStyle=col;c.beginPath();c.moveTo(x+s*0.02,y-s*0.3);c.lineTo(x+s*0.2,y-s*0.22);c.lineTo(x+s*0.02,y-s*0.14);c.fill();
}
sprites.flagRed={draw:(c,x,y,s,o)=>drawFlag(c,x,y,s,{...o,color:'#cc2222'}),category:'environment',name:'Drapeau rouge',tags:['objet','marqueur']};
sprites.flagBlue={draw:(c,x,y,s,o)=>drawFlag(c,x,y,s,{...o,color:'#2244cc'}),category:'environment',name:'Drapeau bleu',tags:['objet','marqueur']};
sprites.flagGreen={draw:(c,x,y,s,o)=>drawFlag(c,x,y,s,{...o,color:'#22cc44'}),category:'environment',name:'Drapeau vert',tags:['objet','marqueur']};

function drawFence(c,x,y,s){
  for(let i=-2;i<=2;i++)rect(c,x+i*s*0.1-s*0.02,y-s*0.1,s*0.04,s*0.24,'#b8884a');
  rect(c,x-s*0.24,y-s*0.05,s*0.48,s*0.03,'#a07840');
  rect(c,x-s*0.24,y+s*0.06,s*0.48,s*0.03,'#a07840');
}
sprites.fence={draw:drawFence,category:'environment',name:'Clôture',tags:['structure','barrière']};

function drawDoor(c,x,y,s,opt={}){
  roundRect(c,x-s*0.1,y-s*0.2,s*0.2,s*0.35,s*0.02,'#8B4513');
  circle(c,x+s*0.06,y,s*0.02,'#cc9900');
  rect(c,x-s*0.12,y-s*0.22,s*0.24,s*0.03,'#6a4a2a');
}
sprites.door={draw:drawDoor,category:'environment',name:'Porte',tags:['structure','passage']};

function drawWell(c,x,y,s){
  ellipse(c,x,y+s*0.1,s*0.15,s*0.06,'#888');
  rect(c,x-s*0.15,y-s*0.05,s*0.04,s*0.15,'#888');
  rect(c,x+s*0.11,y-s*0.05,s*0.04,s*0.15,'#888');
  rect(c,x-s*0.16,y-s*0.08,s*0.32,s*0.03,'#8B4513');
  ellipse(c,x,y+s*0.1,s*0.1,s*0.04,'#224488');
  rect(c,x-s*0.02,y-s*0.08,s*0.04,s*0.08,'#8B4513');
}
sprites.well={draw:drawWell,category:'environment',name:'Puits',tags:['structure','eau']};

function drawMountain(c,x,y,s){
  tri(c,x-s*0.35,y+s*0.2,x,y-s*0.35,x+s*0.35,y+s*0.2,'#786858');
  tri(c,x-s*0.08,y-s*0.15,x,y-s*0.35,x+s*0.1,y-s*0.12,'#fff');
}
sprites.mountain={draw:drawMountain,category:'environment',name:'Montagne',tags:['terrain','fond']};

function drawCave(c,x,y,s){
  c.fillStyle='#555';c.beginPath();c.arc(x,y+s*0.15,s*0.25,Math.PI,0);c.fill();
  c.fillStyle='#111';c.beginPath();c.arc(x,y+s*0.15,s*0.15,Math.PI,0);c.fill();
}
sprites.cave={draw:drawCave,category:'environment',name:'Grotte',tags:['terrain','entrée']};

/* ══════════════════════════════════
   ITEMS
   ══════════════════════════════════ */

function drawSword(c,x,y,s){
  rect(c,x-s*0.015,y-s*0.3,s*0.03,s*0.35,'#ccc');
  rect(c,x-s*0.08,y+s*0.02,s*0.16,s*0.03,'#a67c52');
  roundRect(c,x-s*0.03,y+s*0.04,s*0.06,s*0.1,s*0.02,'#8a5a30');
  tri(c,x-s*0.015,y-s*0.3,x,y-s*0.38,x+s*0.015,y-s*0.3,'#ddd');
}
sprites.swordItem={draw:drawSword,category:'items',name:'Épée',tags:['arme','mêlée']};

function drawBow(c,x,y,s){
  c.strokeStyle='#8B4513';c.lineWidth=s*0.03;c.beginPath();c.arc(x-s*0.05,y,s*0.2,Math.PI*0.7,Math.PI*1.3);c.stroke();
  line(c,x-s*0.05+Math.cos(Math.PI*0.7)*s*0.2,y+Math.sin(Math.PI*0.7)*s*0.2,x-s*0.05+Math.cos(Math.PI*1.3)*s*0.2,y+Math.sin(Math.PI*1.3)*s*0.2,'#aaa',s*0.015);
  line(c,x+s*0.05,y-s*0.22,x+s*0.05,y+s*0.22,'#8B4513',s*0.02);
  tri(c,x+s*0.04,y-s*0.22,x+s*0.06,y-s*0.28,x+s*0.08,y-s*0.22,'#888');
}
sprites.bowItem={draw:drawBow,category:'items',name:'Arc',tags:['arme','distance']};

function drawStaff(c,x,y,s){
  rect(c,x-s*0.015,y-s*0.2,s*0.03,s*0.5,'#8B4513');
  circle(c,x,y-s*0.22,s*0.06,'#aa44ff');
  circle(c,x,y-s*0.22,s*0.035,'#dd88ff');
}
sprites.staffItem={draw:drawStaff,category:'items',name:'Bâton magique',tags:['arme','magie']};

function drawAxe(c,x,y,s){
  rect(c,x-s*0.015,y-s*0.15,s*0.03,s*0.4,'#8B4513');
  c.fillStyle='#aaa';c.beginPath();c.moveTo(x-s*0.01,y-s*0.15);c.quadraticCurveTo(x-s*0.15,y-s*0.08,x-s*0.01,y+s*0.02);c.fill();
}
sprites.axeItem={draw:drawAxe,category:'items',name:'Hache',tags:['arme','mêlée']};

function drawShield(c,x,y,s,opt={}){
  const col=opt.color||'#4a86c8';
  c.fillStyle=col;c.beginPath();c.moveTo(x,y-s*0.2);c.lineTo(x+s*0.16,y-s*0.12);c.lineTo(x+s*0.16,y+s*0.05);c.quadraticCurveTo(x,y+s*0.2,x,y+s*0.2);c.quadraticCurveTo(x,y+s*0.2,x-s*0.16,y+s*0.05);c.lineTo(x-s*0.16,y-s*0.12);c.fill();
  line(c,x,y-s*0.18,x,y+s*0.17,'#cc9900',s*0.02);
  line(c,x-s*0.14,y-s*0.02,x+s*0.14,y-s*0.02,'#cc9900',s*0.02);
}
sprites.shieldItem={draw:drawShield,category:'items',name:'Bouclier',tags:['défense','protection']};

function drawPotion(c,x,y,s,opt={}){
  const col=opt.color||'#ff4444';
  roundRect(c,x-s*0.04,y-s*0.2,s*0.08,s*0.08,s*0.01,'#ddd');
  c.fillStyle=col;c.beginPath();c.moveTo(x-s*0.04,y-s*0.12);c.lineTo(x-s*0.1,y+s*0.05);c.quadraticCurveTo(x-s*0.1,y+s*0.15,x,y+s*0.15);c.quadraticCurveTo(x+s*0.1,y+s*0.15,x+s*0.1,y+s*0.05);c.lineTo(x+s*0.04,y-s*0.12);c.fill();
  // Highlight
  c.fillStyle='rgba(255,255,255,0.4)';c.beginPath();c.ellipse(x-s*0.03,y,s*0.02,s*0.04,0,0,Math.PI*2);c.fill();
}
sprites.potionHP={draw:(c,x,y,s,o)=>drawPotion(c,x,y,s,{...o,color:'#ff4444'}),category:'items',name:'Potion HP',tags:['consommable','soin']};
sprites.potionMana={draw:(c,x,y,s,o)=>drawPotion(c,x,y,s,{...o,color:'#4488ff'}),category:'items',name:'Potion Mana',tags:['consommable','magie']};
sprites.potionSpeed={draw:(c,x,y,s,o)=>drawPotion(c,x,y,s,{...o,color:'#44ff44'}),category:'items',name:'Potion Vitesse',tags:['consommable','buff']};

function drawCoin(c,x,y,s){
  circle(c,x,y,s*0.1,'#ffcc00');circle(c,x,y,s*0.07,'#ffdd44');
  c.fillStyle='#cc9900';c.font=`bold ${s*0.1}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('$',x,y);
}
sprites.coin={draw:drawCoin,category:'items',name:'Pièce d\'or',tags:['collectible','monnaie']};

function drawGem(c,x,y,s,opt={}){
  const col=opt.color||'#44aaff';
  c.fillStyle=col;c.beginPath();c.moveTo(x,y-s*0.12);c.lineTo(x+s*0.1,y-s*0.04);c.lineTo(x+s*0.06,y+s*0.1);c.lineTo(x-s*0.06,y+s*0.1);c.lineTo(x-s*0.1,y-s*0.04);c.fill();
  c.fillStyle='rgba(255,255,255,0.4)';c.beginPath();c.moveTo(x,y-s*0.12);c.lineTo(x+s*0.05,y-s*0.04);c.lineTo(x,y+s*0.02);c.lineTo(x-s*0.05,y-s*0.04);c.fill();
}
sprites.gemBlue={draw:(c,x,y,s,o)=>drawGem(c,x,y,s,{...o,color:'#44aaff'}),category:'items',name:'Gemme bleue',tags:['collectible','trésor']};
sprites.gemRed={draw:(c,x,y,s,o)=>drawGem(c,x,y,s,{...o,color:'#ff4444'}),category:'items',name:'Gemme rouge',tags:['collectible','trésor']};
sprites.gemGreen={draw:(c,x,y,s,o)=>drawGem(c,x,y,s,{...o,color:'#44ff44'}),category:'items',name:'Gemme verte',tags:['collectible','trésor']};
sprites.gemPurple={draw:(c,x,y,s,o)=>drawGem(c,x,y,s,{...o,color:'#aa44ff'}),category:'items',name:'Gemme violette',tags:['collectible','trésor']};

function drawKey(c,x,y,s,opt={}){
  const col=opt.color||'#ffcc00';
  circle(c,x-s*0.08,y-s*0.05,s*0.07,col);circle(c,x-s*0.08,y-s*0.05,s*0.04,'#0b0f19');
  rect(c,x-s*0.02,y-s*0.07,s*0.2,s*0.04,col);
  rect(c,x+s*0.12,y-s*0.07,s*0.03,s*0.08,col);
  rect(c,x+s*0.08,y-s*0.07,s*0.03,s*0.06,col);
}
sprites.keyGold={draw:(c,x,y,s,o)=>drawKey(c,x,y,s,{...o,color:'#ffcc00'}),category:'items',name:'Clé dorée',tags:['collectible','accès']};
sprites.keySilver={draw:(c,x,y,s,o)=>drawKey(c,x,y,s,{...o,color:'#cccccc'}),category:'items',name:'Clé argentée',tags:['collectible','accès']};
sprites.keyRed={draw:(c,x,y,s,o)=>drawKey(c,x,y,s,{...o,color:'#ff4444'}),category:'items',name:'Clé rouge',tags:['collectible','accès']};

function drawHeart(c,x,y,s){
  c.fillStyle='#ff4466';c.beginPath();
  c.moveTo(x,y+s*0.1);c.bezierCurveTo(x-s*0.2,y-s*0.05,x-s*0.15,y-s*0.2,x,y-s*0.1);c.bezierCurveTo(x+s*0.15,y-s*0.2,x+s*0.2,y-s*0.05,x,y+s*0.1);c.fill();
}
sprites.heart={draw:drawHeart,category:'items',name:'Cœur',tags:['collectible','vie']};

function drawStarItem(c,x,y,s){
  c.fillStyle='#ffdd44';c.beginPath();
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;const a2=(i+0.5)/5*Math.PI*2-Math.PI/2;
    c.lineTo(x+Math.cos(a)*s*0.15,y+Math.sin(a)*s*0.15);c.lineTo(x+Math.cos(a2)*s*0.06,y+Math.sin(a2)*s*0.06)}
  c.fill();
}
sprites.starItem={draw:drawStarItem,category:'items',name:'Étoile',tags:['collectible','bonus']};

function drawApple(c,x,y,s){
  circle(c,x,y,s*0.1,'#cc2222');rect(c,x-s*0.01,y-s*0.15,s*0.02,s*0.06,'#5a3a20');
  circle(c,x+s*0.04,y-s*0.12,s*0.03,'#22aa22');
}
sprites.apple={draw:drawApple,category:'items',name:'Pomme',tags:['consommable','nourriture']};

function drawBread(c,x,y,s){
  c.fillStyle='#d4a040';c.beginPath();c.ellipse(x,y,s*0.12,s*0.07,0,0,Math.PI*2);c.fill();
  c.fillStyle='#c89030';c.beginPath();c.ellipse(x,y-s*0.02,s*0.1,s*0.04,0,Math.PI,Math.PI*2);c.fill();
}
sprites.bread={draw:drawBread,category:'items',name:'Pain',tags:['consommable','nourriture']};

function drawBomb(c,x,y,s){
  circle(c,x,y+s*0.02,s*0.1,'#333');
  rect(c,x-s*0.02,y-s*0.12,s*0.04,s*0.06,'#666');
  c.strokeStyle='#ff8800';c.lineWidth=s*0.02;c.beginPath();c.moveTo(x,y-s*0.12);c.quadraticCurveTo(x+s*0.08,y-s*0.2,x+s*0.05,y-s*0.22);c.stroke();
  circle(c,x+s*0.05,y-s*0.23,s*0.03,'#ffaa00');
}
sprites.bomb={draw:drawBomb,category:'items',name:'Bombe',tags:['arme','explosif']};

function drawLaserGun(c,x,y,s){
  roundRect(c,x-s*0.15,y-s*0.03,s*0.25,s*0.06,s*0.02,'#888');
  roundRect(c,x-s*0.05,y+s*0.03,s*0.08,s*0.1,s*0.02,'#666');
  circle(c,x+s*0.12,y,s*0.03,'#44ff44');
}
sprites.laserGun={draw:drawLaserGun,category:'items',name:'Pistolet laser',tags:['arme','futuriste']};

function drawArmor(c,x,y,s){
  roundRect(c,x-s*0.12,y-s*0.15,s*0.24,s*0.25,s*0.03,'#888');
  rect(c,x-s*0.18,y-s*0.12,s*0.06,s*0.18,'#777');
  rect(c,x+s*0.12,y-s*0.12,s*0.06,s*0.18,'#777');
  line(c,x,y-s*0.13,x,y+s*0.08,'#aaa',s*0.02);
  line(c,x-s*0.1,y-s*0.02,x+s*0.1,y-s*0.02,'#aaa',s*0.02);
}
sprites.armor={draw:drawArmor,category:'items',name:'Armure',tags:['défense','équipement']};

function drawHelmet(c,x,y,s){
  roundRect(c,x-s*0.1,y-s*0.08,s*0.2,s*0.15,s*0.05,'#999');
  rect(c,x-s*0.12,y+s*0.02,s*0.24,s*0.04,'#888');
  rect(c,x-s*0.03,y-s*0.02,s*0.06,s*0.08,'#666');
}
sprites.helmet={draw:drawHelmet,category:'items',name:'Casque',tags:['défense','équipement']};

function drawScroll(c,x,y,s){
  roundRect(c,x-s*0.08,y-s*0.12,s*0.16,s*0.24,s*0.01,'#e8d8b0');
  circle(c,x-s*0.08,y-s*0.1,s*0.03,'#c8b890');
  circle(c,x-s*0.08,y+s*0.1,s*0.03,'#c8b890');
  circle(c,x+s*0.08,y-s*0.1,s*0.03,'#c8b890');
  circle(c,x+s*0.08,y+s*0.1,s*0.03,'#c8b890');
  for(let i=0;i<3;i++)rect(c,x-s*0.05,y-s*0.06+i*s*0.06,s*0.1,s*0.015,'#8a7a5a');
}
sprites.scroll={draw:drawScroll,category:'items',name:'Parchemin',tags:['objet','quête']};

function drawBook(c,x,y,s){
  roundRect(c,x-s*0.1,y-s*0.12,s*0.2,s*0.24,s*0.02,'#8B4513');
  rect(c,x-s*0.08,y-s*0.1,s*0.16,s*0.2,'#e8e0c8');
  rect(c,x-s*0.01,y-s*0.12,s*0.02,s*0.24,'#6a4a2a');
}
sprites.book={draw:drawBook,category:'items',name:'Livre',tags:['objet','connaissance']};

/* ══════════════════════════════════
   UI SPRITES
   ══════════════════════════════════ */

function drawArrowRight(c,x,y,s){
  c.fillStyle='#fff';c.beginPath();c.moveTo(x-s*0.1,y-s*0.08);c.lineTo(x+s*0.05,y);c.lineTo(x-s*0.1,y+s*0.08);c.fill();
}
sprites.arrowRight={draw:drawArrowRight,category:'ui',name:'Flèche droite',tags:['ui','direction']};

function drawArrowLeft(c,x,y,s){
  c.fillStyle='#fff';c.beginPath();c.moveTo(x+s*0.1,y-s*0.08);c.lineTo(x-s*0.05,y);c.lineTo(x+s*0.1,y+s*0.08);c.fill();
}
sprites.arrowLeft={draw:drawArrowLeft,category:'ui',name:'Flèche gauche',tags:['ui','direction']};

function drawCheckpoint(c,x,y,s){
  rect(c,x-s*0.02,y-s*0.25,s*0.04,s*0.5,'#888');
  c.fillStyle='#ffcc00';c.beginPath();c.moveTo(x+s*0.02,y-s*0.25);c.lineTo(x+s*0.18,y-s*0.18);c.lineTo(x+s*0.02,y-s*0.11);c.fill();
}
sprites.checkpoint={draw:drawCheckpoint,category:'ui',name:'Checkpoint',tags:['système','sauvegarde']};

/* ══════════════════════════════════
   VEHICLES
   ══════════════════════════════════ */

function drawSpaceship(c,x,y,s,opt={}){
  const col=opt.color||'#4488cc';
  c.fillStyle=col;c.beginPath();c.moveTo(x,y-s*0.25);c.lineTo(x+s*0.12,y+s*0.15);c.lineTo(x-s*0.12,y+s*0.15);c.fill();
  // Cockpit
  circle(c,x,y-s*0.05,s*0.05,'#aaddff');
  // Thrusters
  rect(c,x-s*0.08,y+s*0.15,s*0.04,s*0.05,'#ff8800');
  rect(c,x+s*0.04,y+s*0.15,s*0.04,s*0.05,'#ff8800');
  // Wings
  tri(c,x-s*0.12,y+s*0.05,x-s*0.25,y+s*0.18,x-s*0.12,y+s*0.15,col);
  tri(c,x+s*0.12,y+s*0.05,x+s*0.25,y+s*0.18,x+s*0.12,y+s*0.15,col);
}
sprites.spaceship={draw:drawSpaceship,category:'vehicles',name:'Vaisseau',tags:['véhicule','espace']};

function drawCar(c,x,y,s,opt={}){
  const col=opt.color||'#cc3333';
  roundRect(c,x-s*0.2,y-s*0.02,s*0.4,s*0.12,s*0.03,col);
  roundRect(c,x-s*0.1,y-s*0.12,s*0.22,s*0.12,s*0.03,col);
  rect(c,x-s*0.06,y-s*0.1,s*0.06,s*0.06,'#aaddff');
  rect(c,x+s*0.02,y-s*0.1,s*0.06,s*0.06,'#aaddff');
  circle(c,x-s*0.12,y+s*0.1,s*0.04,'#333');
  circle(c,x+s*0.12,y+s*0.1,s*0.04,'#333');
}
sprites.car={draw:drawCar,category:'vehicles',name:'Voiture',tags:['véhicule','terrestre']};

function drawBoat(c,x,y,s){
  c.fillStyle='#8B4513';c.beginPath();c.moveTo(x-s*0.25,y+s*0.05);c.lineTo(x-s*0.15,y+s*0.15);c.lineTo(x+s*0.15,y+s*0.15);c.lineTo(x+s*0.25,y+s*0.05);c.fill();
  rect(c,x-s*0.01,y-s*0.2,s*0.02,s*0.25,'#8B4513');
  tri(c,x+s*0.01,y-s*0.2,x+s*0.2,y-s*0.05,x+s*0.01,y-s*0.05,'#fff');
}
sprites.boat={draw:drawBoat,category:'vehicles',name:'Bateau',tags:['véhicule','eau']};

/* ══════════════════════════════════
   PROJECTILES
   ══════════════════════════════════ */

function drawBullet(c,x,y,s){circle(c,x,y,s*0.04,'#ffcc00')}
sprites.bullet={draw:drawBullet,category:'projectiles',name:'Projectile',tags:['projectile','basique']};

function drawFireball(c,x,y,s){
  circle(c,x,y,s*0.06,'#ff4400');circle(c,x,y,s*0.04,'#ffaa00');circle(c,x,y,s*0.02,'#ffff44');
}
sprites.fireball={draw:drawFireball,category:'projectiles',name:'Boule de feu',tags:['projectile','magie']};

function drawArrowProjectile(c,x,y,s){
  rect(c,x-s*0.12,y-s*0.008,s*0.2,s*0.016,'#8B4513');
  tri(c,x+s*0.08,y-s*0.025,x+s*0.14,y,x+s*0.08,y+s*0.025,'#888');
  // Feathers
  tri(c,x-s*0.12,y-s*0.008,x-s*0.15,y-s*0.03,x-s*0.09,y-s*0.008,'#ddd');
  tri(c,x-s*0.12,y+s*0.008,x-s*0.15,y+s*0.03,x-s*0.09,y+s*0.008,'#ddd');
}
sprites.arrowProjectile={draw:drawArrowProjectile,category:'projectiles',name:'Flèche',tags:['projectile','physique']};

function drawLaser(c,x,y,s){
  rect(c,x-s*0.15,y-s*0.01,s*0.3,s*0.02,'#44ff44');
  rect(c,x-s*0.15,y-s*0.005,s*0.3,s*0.01,'rgba(68,255,68,0.5)');
}
sprites.laser={draw:drawLaser,category:'projectiles',name:'Laser',tags:['projectile','futuriste']};

function drawMagicBolt(c,x,y,s){
  circle(c,x,y,s*0.05,'#aa44ff');circle(c,x,y,s*0.03,'#dd88ff');
  // Sparkle trail
  for(let i=1;i<=3;i++)circle(c,x-i*s*0.04,y+Math.sin(i)*s*0.02,s*0.02-i*0.003,'rgba(170,68,255,'+(0.6-i*0.15)+')');
}
sprites.magicBolt={draw:drawMagicBolt,category:'projectiles',name:'Sort magique',tags:['projectile','magie']};

/* ══════════════════════════════════
   EFFECTS / VFX
   ══════════════════════════════════ */

function drawExplosion(c,x,y,s){
  circle(c,x,y,s*0.2,'rgba(255,100,0,0.8)');circle(c,x,y,s*0.15,'rgba(255,170,0,0.7)');circle(c,x,y,s*0.08,'rgba(255,255,100,0.9)');
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const r=s*0.18;circle(c,x+Math.cos(a)*r,y+Math.sin(a)*r,s*0.04,'rgba(255,130,0,0.6)')}
}
sprites.explosion={draw:drawExplosion,category:'effects',name:'Explosion',tags:['effet','destruction']};

function drawShieldEffect(c,x,y,s){
  c.strokeStyle='rgba(68,170,255,0.6)';c.lineWidth=s*0.03;c.beginPath();c.arc(x,y,s*0.2,0,Math.PI*2);c.stroke();
  c.strokeStyle='rgba(68,170,255,0.3)';c.lineWidth=s*0.02;c.beginPath();c.arc(x,y,s*0.25,0,Math.PI*2);c.stroke();
}
sprites.shieldEffect={draw:drawShieldEffect,category:'effects',name:'Bouclier',tags:['effet','protection']};

function drawHealEffect(c,x,y,s){
  c.fillStyle='rgba(34,200,80,0.6)';
  rect(c,x-s*0.015,y-s*0.1,s*0.03,s*0.2,'rgba(34,200,80,0.6)');
  rect(c,x-s*0.1,y-s*0.015,s*0.2,s*0.03,'rgba(34,200,80,0.6)');
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2+Math.PI/4;circle(c,x+Math.cos(a)*s*0.12,y+Math.sin(a)*s*0.12,s*0.02,'rgba(34,255,80,0.5)')}
}
sprites.healEffect={draw:drawHealEffect,category:'effects',name:'Soin',tags:['effet','magie']};

function drawSparkle(c,x,y,s){
  c.fillStyle='#ffdd44';
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a-0.15)*s*0.03,y+Math.sin(a-0.15)*s*0.03);c.lineTo(x+Math.cos(a)*s*0.12,y+Math.sin(a)*s*0.12);c.lineTo(x+Math.cos(a+0.15)*s*0.03,y+Math.sin(a+0.15)*s*0.03);c.fill()}
}
sprites.sparkle={draw:drawSparkle,category:'effects',name:'Étincelle',tags:['effet','brillant']};

function drawPortal(c,x,y,s){
  for(let i=3;i>=0;i--){
    c.fillStyle=`rgba(${100+i*40},${50+i*30},${200+i*15},${0.3+i*0.15})`;
    c.beginPath();c.ellipse(x,y,s*(0.2-i*0.03),s*(0.25-i*0.04),0,0,Math.PI*2);c.fill();
  }
}
sprites.portal={draw:drawPortal,category:'effects',name:'Portail',tags:['effet','téléportation']};

/* ══════════════════════════════════
   TERRAIN PLATFORM SPRITES
   ══════════════════════════════════ */

function drawPlatform(c,x,y,s,opt={}){
  const type=opt.type||'stone';
  const colors={stone:'#888',wood:'#a07840',ice:'#aaddee',metal:'#778899',cloud:'rgba(255,255,255,0.7)'};
  const col=colors[type]||colors.stone;
  roundRect(c,x-s*0.3,y-s*0.04,s*0.6,s*0.08,s*0.02,col);
  if(type==='stone'){for(let i=0;i<3;i++)rect(c,x-s*0.25+i*s*0.2,y-s*0.04,s*0.18,s*0.04,'rgba(0,0,0,0.15)')}
  if(type==='ice'){rect(c,x-s*0.2,y-s*0.03,s*0.08,s*0.02,'rgba(255,255,255,0.5)')}
}
sprites.platformStone={draw:(c,x,y,s,o)=>drawPlatform(c,x,y,s,{...o,type:'stone'}),category:'terrain',name:'Plateforme pierre',tags:['plateforme','sol']};
sprites.platformWood={draw:(c,x,y,s,o)=>drawPlatform(c,x,y,s,{...o,type:'wood'}),category:'terrain',name:'Plateforme bois',tags:['plateforme','sol']};
sprites.platformIce={draw:(c,x,y,s,o)=>drawPlatform(c,x,y,s,{...o,type:'ice'}),category:'terrain',name:'Plateforme glace',tags:['plateforme','glissant']};
sprites.platformMetal={draw:(c,x,y,s,o)=>drawPlatform(c,x,y,s,{...o,type:'metal'}),category:'terrain',name:'Plateforme métal',tags:['plateforme','sol']};
sprites.platformCloud={draw:(c,x,y,s,o)=>drawPlatform(c,x,y,s,{...o,type:'cloud'}),category:'terrain',name:'Plateforme nuage',tags:['plateforme','traversable']};

/* ══════════════════════════════════
   UTILITY: Cached sprite rendering
   ══════════════════════════════════ */
const spriteCache=new Map();

function renderSprite(spriteId,size,options={}){
  const key=spriteId+'_'+size+'_'+JSON.stringify(options);
  if(spriteCache.has(key))return spriteCache.get(key);
  const s=sprites[spriteId];if(!s)return null;
  const cvs=document.createElement('canvas');cvs.width=size;cvs.height=size;
  const ctx=cvs.getContext('2d');
  s.draw(ctx,size/2,size/2,size,options);
  spriteCache.set(key,cvs);
  return cvs;
}

function renderSpriteToCtx(ctx,spriteId,x,y,size,options={}){
  const s=sprites[spriteId];if(!s)return;
  s.draw(ctx,x,y,size,options);
}

function getSpriteList(){return Object.entries(sprites).map(([id,s])=>({id,name:s.name,category:s.category,tags:s.tags||[],variants:s.variants}))}

function getSpritesByCategory(cat){return getSpriteList().filter(s=>s.category===cat)}

function getCategories(){
  const cats=new Set();for(const s of Object.values(sprites))cats.add(s.category);
  return[...cats].map(c=>({id:c,name:{characters:'Personnages',enemies:'Ennemis',npcs:'PNJ',environment:'Environnement',items:'Objets',ui:'Interface',vehicles:'Véhicules',projectiles:'Projectiles',effects:'Effets',terrain:'Terrain'}[c]||c}));
}

window.Sprites={sprites,renderSprite,renderSpriteToCtx,getSpriteList,getSpritesByCategory,getCategories};
})();
