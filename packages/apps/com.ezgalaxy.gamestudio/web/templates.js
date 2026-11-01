/**
 * Game Studio — Game Templates
 * 6 complete pre-built game templates with scenes, objects, behaviors, and variables
 */
(function(){'use strict';
const S=window.Scripting;const E=window.Engine2D;
if(!S||!E)return;

function block(triggerType,triggerParams,conditions,actions){
  return new S.ScriptBlock({type:triggerType,params:triggerParams||{}},
    conditions.map(c=>({type:c[0],params:c[1]||{}})),
    actions.map(a=>({type:a[0],params:a[1]||{}})));
}

function makeObj(id,x,y,w,h,spriteId,tags=[],layer=0){
  const o=new E.GameObject2D(id,x,y);o.width=w;o.height=h;o.spriteId=spriteId;o.tags=tags;o.layer=layer;return o;
}

const Templates={};

/* ═══════════════════════════
   1. Platformer 2D
   ═══════════════════════════ */
Templates.platformer2d={
  id:'platformer2d',name:'Platformer 2D',icon:'🏃',
  description:'Un jeu de plateformes classique avec sauts, ennemis et collectibles.',
  create(){
    const scene=new E.Scene('main','Niveau 1');
    scene.gravity={x:0,y:600};scene.bgColor='#0f1b2d';scene.width=3200;scene.height=600;
    scene.variables={score:0,lives:3};

    // Player
    const player=makeObj('player',100,400,32,32,'knight',['player'],5);
    player.hp=100;player.maxHp=100;
    const sr=new S.ScriptRunner();
    // Move left/right
    sr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['setVelocity',{vx:200,vy:null}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['setVelocity',{vx:-200,vy:null}] ]));
    sr.addBlock(block('onKeyDown',{key:'ArrowUp'},[['isGrounded',{}]],[ ['jump',{force:-400}] ]));
    sr.addBlock(block('onKeyDown',{key:'Space'},[['isGrounded',{}]],[ ['jump',{force:-400}] ]));
    // Collect coins
    sr.addBlock(block('onCollision',{tag:'coin'},[],[ ['addToVariable',{varName:'score',value:10}],['playSound',{soundId:'coinPickup'}] ]));
    // Damage from enemy
    sr.addBlock(block('onCollision',{tag:'enemy'},[],[ ['damage',{value:25}],['cameraShake',{intensity:4,duration:0.2}],['playSound',{soundId:'hurt'}] ]));
    sr.addBlock(block('onHPZero',{},[],[ ['playSound',{soundId:'death'}],['addToVariable',{varName:'lives',value:-1}],['setHP',{value:100}],['teleport',{x:100,y:400}] ]));
    player.scriptRunner=sr;
    scene.addObject(player);

    // Ground platforms
    const groundTiles=[];
    for(let i=0;i<100;i++){
      const g=makeObj('ground_'+i,i*32,568,32,32,'platform_grass',['ground','solid'],0);
      groundTiles.push(g);scene.addObject(g);
    }
    // Floating platforms
    const plats=[[300,450],[500,380],[700,320],[950,400],[1200,350],[1500,300],[1800,380],[2100,320],[2400,400],[2700,350]];
    plats.forEach(([px,py],i)=>{
      scene.addObject(makeObj('plat_'+i,px,py,96,16,'platform_stone',['ground','solid'],0));
    });

    // Coins
    const coinPos=[[350,410],[550,340],[750,280],[1000,360],[1250,310],[1550,260],[1850,340],[2150,280],[2450,360],[2750,310],
      [200,530],[400,530],[600,530],[800,530],[1000,530],[1200,530],[1400,530],[1600,530],[1800,530],[2000,530]];
    coinPos.forEach(([cx,cy],i)=>{
      const c=makeObj('coin_'+i,cx,cy,16,16,'coin',['coin','collectible'],2);
      const csr=new S.ScriptRunner();
      csr.addBlock(block('onCollision',{tag:'player'},[],[ ['destroy',{}] ]));
      c.scriptRunner=csr;
      scene.addObject(c);
    });

    // Enemies
    const enemyPos=[[600,536],[1100,536],[1700,536],[2300,536]];
    enemyPos.forEach(([ex,ey],i)=>{
      const e=makeObj('enemy_'+i,ex,ey,32,32,'slime',['enemy','hostile'],3);
      const esr=new S.ScriptRunner();
      // Patrol
      esr.addBlock(block('onUpdate',{},[],[ ['move',{dx:1,dy:0}] ]));
      e.scriptRunner=esr;scene.addObject(e);
    });

    return{scenes:[scene],variables:scene.variables,prefabs:{}};
  }
};

/* ═══════════════════════════
   2. RPG Top-Down
   ═══════════════════════════ */
Templates.rpgTopDown={
  id:'rpgTopDown',name:'RPG Top-Down',icon:'⚔️',
  description:'Un RPG vue du dessus avec NPCs, dialogues et combats.',
  create(){
    const scene=new E.Scene('village','Village');
    scene.gravity={x:0,y:0};scene.bgColor='#2d5a27';scene.width=1600;scene.height=1200;
    scene.variables={gold:0,xp:0,level:1,questDone:false};

    // Player
    const player=makeObj('player',400,600,32,32,'knight',['player'],5);
    player.hp=100;player.maxHp=100;
    const sr=new S.ScriptRunner();
    sr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['move',{dx:3,dy:0}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['move',{dx:-3,dy:0}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowUp'},[],[ ['move',{dx:0,dy:-3}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowDown'},[],[ ['move',{dx:0,dy:3}] ]));
    sr.addBlock(block('onCollision',{tag:'npc'},[],[ ['playSound',{soundId:'menuSelect'}] ]));
    sr.addBlock(block('onCollision',{tag:'enemy'},[],[ ['damage',{value:15}],['playSound',{soundId:'swordHit'}],['cameraShake',{intensity:3,duration:0.15}] ]));
    player.scriptRunner=sr;scene.addObject(player);

    // NPCs
    const npcData=[
      {id:'merchant',x:300,y:400,sprite:'merchant',name:'Marchand'},
      {id:'elder',x:600,y:350,sprite:'elder',name:'Ancien'},
      {id:'guard',x:200,y:500,sprite:'guard',name:'Garde'}
    ];
    npcData.forEach(n=>{
      const npc=makeObj(n.id,n.x,n.y,32,32,n.sprite,['npc',n.id],3);
      npc.data.name=n.name;scene.addObject(npc);
    });

    // Houses
    for(let i=0;i<4;i++){
      scene.addObject(makeObj('house_'+i,150+i*250,250,64,64,'house',['solid'],1));
    }

    // Trees
    for(let i=0;i<20;i++){
      const tx=Math.random()*1500+50,ty=Math.random()*1100+50;
      scene.addObject(makeObj('tree_'+i,tx,ty,32,48,'tree1',['solid'],1));
    }

    // Dungeon scene
    const dungeon=new E.Scene('dungeon','Donjon');
    dungeon.gravity={x:0,y:0};dungeon.bgColor='#1a1a1a';dungeon.width=800;dungeon.height=800;
    dungeon.lightingEnabled=true;dungeon.ambientLight='#050510';

    const dp=makeObj('player_d',400,700,32,32,'knight',['player'],5);
    dp.hp=100;dp.maxHp=100;
    const dsr=new S.ScriptRunner();
    dsr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['move',{dx:3,dy:0}] ]));
    dsr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['move',{dx:-3,dy:0}] ]));
    dsr.addBlock(block('onKeyHeld',{key:'ArrowUp'},[],[ ['move',{dx:0,dy:-3}] ]));
    dsr.addBlock(block('onKeyHeld',{key:'ArrowDown'},[],[ ['move',{dx:0,dy:3}] ]));
    dp.scriptRunner=dsr;dungeon.addObject(dp);

    // Dungeon enemies
    for(let i=0;i<5;i++){
      const de=makeObj('dEnemy_'+i,200+i*100,300+Math.random()*200,32,32,'skeleton',['enemy','hostile'],3);
      const desr=new S.ScriptRunner();
      desr.addBlock(block('onUpdate',{},[['distanceLess',{tag:'player',value:150}]],[ ['moveToward',{tag:'player',speed:60}] ]));
      de.scriptRunner=desr;de.hp=50;dungeon.addObject(de);
    }

    return{scenes:[scene,dungeon],variables:scene.variables,prefabs:{}};
  }
};

/* ═══════════════════════════
   3. Space Shooter
   ═══════════════════════════ */
Templates.spaceShooter={
  id:'spaceShooter',name:'Space Shooter',icon:'🚀',
  description:'Un shoot\'em up spatial avec vagues d\'ennemis et power-ups.',
  create(){
    const scene=new E.Scene('main','Espace');
    scene.gravity={x:0,y:0};scene.bgColor='#050510';scene.width=800;scene.height=600;
    scene.variables={score:0,wave:1,lives:3};

    // Player ship
    const ship=makeObj('player',400,500,32,32,'spaceship',['player'],5);
    ship.hp=100;ship.maxHp=100;
    const sr=new S.ScriptRunner();
    sr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['move',{dx:5,dy:0}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['move',{dx:-5,dy:0}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowUp'},[],[ ['move',{dx:0,dy:-4}] ]));
    sr.addBlock(block('onKeyHeld',{key:'ArrowDown'},[],[ ['move',{dx:0,dy:4}] ]));
    sr.addBlock(block('onKeyDown',{key:'Space'},[],[ ['spawn',{prefab:'bullet',ox:0,oy:-20}],['playSound',{soundId:'laserShoot'}] ]));
    sr.addBlock(block('onCollision',{tag:'enemy'},[],[ ['damage',{value:30}],['cameraShake',{intensity:6,duration:0.3}],['playSound',{soundId:'explosion'}] ]));
    ship.scriptRunner=sr;scene.addObject(ship);

    // Stars background
    for(let i=0;i<50;i++){
      const st=makeObj('star_'+i,Math.random()*800,Math.random()*600,2,2,'star',['star'],0);
      const stsr=new S.ScriptRunner();
      stsr.addBlock(block('onUpdate',{},[],[ ['move',{dx:0,dy:1+Math.random()*2}] ]));
      st.scriptRunner=stsr;scene.addObject(st);
    }

    // Initial enemies
    for(let i=0;i<6;i++){
      const e=makeObj('enemy_'+i,100+i*110,50+Math.random()*100,28,28,'bat',['enemy','hostile'],3);
      const esr=new S.ScriptRunner();
      esr.addBlock(block('onUpdate',{},[],[ ['move',{dx:Math.sin(i)*2,dy:1}] ]));
      esr.addBlock(block('onCollision',{tag:'bullet'},[],[ ['destroy',{}],['playSound',{soundId:'explosion'}] ]));
      e.scriptRunner=esr;e.hp=20;scene.addObject(e);
    }

    return{
      scenes:[scene],
      variables:scene.variables,
      prefabs:{
        bullet:(x,y)=>{
          const b=makeObj('bullet_'+Date.now(),x,y,6,12,'bullet',['bullet','projectile'],4);
          const bsr=new S.ScriptRunner();
          bsr.addBlock(block('onUpdate',{},[],[ ['move',{dx:0,dy:-8}] ]));
          b.scriptRunner=bsr;return b;
        }
      }
    };
  }
};

/* ═══════════════════════════
   4. Tower Defense
   ═══════════════════════════ */
Templates.towerDefense={
  id:'towerDefense',name:'Tower Defense',icon:'🏰',
  description:'Placez des tours pour défendre votre base contre des vagues d\'ennemis.',
  create(){
    const scene=new E.Scene('main','Défense');
    scene.gravity={x:0,y:0};scene.bgColor='#1a3a1a';scene.width=800;scene.height=600;
    scene.variables={gold:200,lives:20,wave:0,score:0};

    // Base
    scene.addObject(makeObj('base',750,300,48,48,'castle',['base'],1));

    // Path waypoints
    const path=[{x:0,y:300},{x:200,y:300},{x:200,y:100},{x:400,y:100},{x:400,y:500},{x:600,y:500},{x:600,y:300},{x:750,y:300}];

    // Path markers (visual)
    for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1];
      const steps=Math.ceil(Math.sqrt((b.x-a.x)**2+(b.y-a.y)**2)/20);
      for(let s=0;s<=steps;s++){
        const t=s/steps;
        scene.addObject(makeObj('path_'+i+'_'+s,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,16,16,'dirt',['path'],0));
      }
    }

    // Pre-placed towers
    const towerPos=[[150,200],[300,200],[350,400],[500,400],[550,200]];
    towerPos.forEach(([tx,ty],i)=>{
      const tower=makeObj('tower_'+i,tx,ty,32,32,'archer',['tower'],3);
      const tsr=new S.ScriptRunner();
      tsr.addBlock(block('onTimer',{interval:1.5},[['distanceLess',{tag:'enemy',value:120}]],[
        ['spawn',{prefab:'arrow',ox:0,oy:0}],['playSound',{soundId:'bowShoot'}]
      ]));
      tower.scriptRunner=tsr;scene.addObject(tower);
    });

    return{
      scenes:[scene],variables:scene.variables,
      prefabs:{
        arrow:(x,y)=>{
          const a=makeObj('arrow_'+Date.now(),x,y,8,8,'arrow',['projectile'],4);
          const asr=new S.ScriptRunner();
          asr.addBlock(block('onUpdate',{},[],[ ['moveToward',{tag:'enemy',speed:200}] ]));
          asr.addBlock(block('onCollision',{tag:'enemy'},[],[ ['destroy',{}] ]));
          a.scriptRunner=asr;return a;
        },
        enemy:(x,y)=>{
          const e=makeObj('wave_enemy_'+Date.now(),x,y,24,24,'slime',['enemy','hostile'],3);
          e.hp=60;
          const esr=new S.ScriptRunner();
          esr.addBlock(block('onUpdate',{},[],[ ['moveToward',{tag:'base',speed:40}] ]));
          esr.addBlock(block('onCollision',{tag:'base'},[],[ ['destroy',{}],['addToVariable',{varName:'lives',value:-1}] ]));
          esr.addBlock(block('onHPZero',{},[],[ ['destroy',{}],['addToVariable',{varName:'gold',value:15}],['addToVariable',{varName:'score',value:50}] ]));
          e.scriptRunner=esr;return e;
        }
      }
    };
  }
};

/* ═══════════════════════════
   5. Puzzle
   ═══════════════════════════ */
Templates.puzzle={
  id:'puzzle',name:'Puzzle',icon:'🧩',
  description:'Un jeu de puzzle avec grille, blocs à déplacer et mécaniques de match.',
  create(){
    const scene=new E.Scene('main','Puzzle');
    scene.gravity={x:0,y:0};scene.bgColor='#1a1a2e';scene.width=800;scene.height=600;
    scene.variables={score:0,moves:0,level:1};

    const colors=['gem_red','gem_blue','gem_green','gem_yellow'];
    const gridW=8,gridH=8,cellSize=40,ox=200,oy=100;

    for(let r=0;r<gridH;r++){
      for(let c=0;c<gridW;c++){
        const sprite=colors[Math.floor(Math.random()*colors.length)];
        const gem=makeObj('gem_'+r+'_'+c,ox+c*cellSize+cellSize/2,oy+r*cellSize+cellSize/2,36,36,sprite,['gem'],2);
        gem.data.row=r;gem.data.col=c;gem.data.color=sprite;
        scene.addObject(gem);
      }
    }

    // Grid border
    scene.addObject(makeObj('grid_bg',ox+gridW*cellSize/2,oy+gridH*cellSize/2,gridW*cellSize+8,gridH*cellSize+8,null,['grid_bg'],0));

    return{scenes:[scene],variables:scene.variables,prefabs:{}};
  }
};

/* ═══════════════════════════
   6. Endless Runner
   ═══════════════════════════ */
Templates.endlessRunner={
  id:'endlessRunner',name:'Endless Runner',icon:'🏃‍♂️',
  description:'Un runner infini avec obstacles, collectibles et vitesse croissante.',
  create(){
    const scene=new E.Scene('main','Run');
    scene.gravity={x:0,y:800};scene.bgColor='#0f1b2d';scene.width=800;scene.height=600;
    scene.variables={score:0,speed:4,distance:0,bestDistance:0};

    // Player
    const player=makeObj('player',150,450,32,32,'ninja',['player'],5);
    player.hp=1;player.maxHp=1;
    const sr=new S.ScriptRunner();
    sr.addBlock(block('onKeyDown',{key:'Space'},[['isGrounded',{}]],[ ['jump',{force:-450}],['playSound',{soundId:'jump'}] ]));
    sr.addBlock(block('onKeyDown',{key:'ArrowUp'},[['isGrounded',{}]],[ ['jump',{force:-450}],['playSound',{soundId:'jump'}] ]));
    sr.addBlock(block('onClick',{},[['isGrounded',{}]],[ ['jump',{force:-450}],['playSound',{soundId:'jump'}] ]));
    sr.addBlock(block('onUpdate',{},[],[ ['addToVariable',{varName:'distance',value:1}],['addToVariable',{varName:'score',value:1}] ]));
    sr.addBlock(block('onCollision',{tag:'obstacle'},[],[ ['damage',{value:1}],['playSound',{soundId:'hurt'}],['cameraShake',{intensity:8,duration:0.4}] ]));
    sr.addBlock(block('onCollision',{tag:'coin'},[],[ ['addToVariable',{varName:'score',value:50}],['playSound',{soundId:'coinPickup'}] ]));
    player.scriptRunner=sr;scene.addObject(player);

    // Ground
    for(let i=0;i<30;i++){
      scene.addObject(makeObj('ground_'+i,i*32,568,32,32,'platform_grass',['ground','solid'],0));
    }

    // Initial obstacles
    const obstPos=[400,600,850,1100];
    obstPos.forEach((ox,i)=>{
      const o=makeObj('obs_'+i,ox,540,24,28,'crate',['obstacle'],2);
      const osr=new S.ScriptRunner();
      osr.addBlock(block('onUpdate',{},[],[ ['move',{dx:-4,dy:0}] ]));
      o.scriptRunner=osr;scene.addObject(o);
    });

    // Coins
    for(let i=0;i<5;i++){
      const c=makeObj('rcoin_'+i,300+i*200,450+Math.random()*80,16,16,'coin',['coin','collectible'],2);
      const csr=new S.ScriptRunner();
      csr.addBlock(block('onUpdate',{},[],[ ['move',{dx:-4,dy:0}] ]));
      csr.addBlock(block('onCollision',{tag:'player'},[],[ ['destroy',{}] ]));
      c.scriptRunner=csr;scene.addObject(c);
    }

    return{scenes:[scene],variables:scene.variables,prefabs:{
      obstacle:(x,y)=>{
        const o=makeObj('obs_'+Date.now(),x,y,24,28,'crate',['obstacle'],2);
        const osr=new S.ScriptRunner();
        osr.addBlock(block('onUpdate',{},[],[ ['move',{dx:-4,dy:0}] ]));
        o.scriptRunner=osr;return o;
      }
    }};
  }
};

const FLYERS=['bat','ghost','flyingEye','dragon'];
/* ═══════════════════════════
   Shared building blocks for the extra templates
   ═══════════════════════════ */
function row(scene,prefix,x0,y,count,sprite,tags,size=32,layer=0){
  for(let i=0;i<count;i++)scene.addObject(makeObj(prefix+i,x0+i*size,y,size,size,sprite,tags||['ground','solid'],layer));
}
function slab(scene,id,x,y,w,h,sprite){scene.addObject(makeObj(id,x,y,w,h,sprite,['ground','solid'],0))}
function deco(scene,id,x,y,w,h,sprite){scene.addObject(makeObj(id,x,y,w,h,sprite,['decor'],-1))}
function item(scene,id,x,y,sprite,tag,size=24){scene.addObject(makeObj(id,x,y,size,size,sprite,[tag,'collectible'],2))}
function goal(scene,id,x,y,sprite,size=40){scene.addObject(makeObj(id,x,y,size,size,sprite,['goal'],2))}
function hazard(scene,id,x,y,w,h,sprite){scene.addObject(makeObj(id,x,y,w,h,sprite,['hazard'],2))}

// Pick-ups, damage, healing and victory, shared by every player.
function commonBlocks(sr,start){
  sr.addBlock(block('onCollision',{tag:'coin'},[],[ ['addToVariable',{varName:'score',value:10}],['playSound',{soundId:'coinPickup'}] ]));
  sr.addBlock(block('onCollision',{tag:'gem'},[],[ ['addToVariable',{varName:'score',value:50}],['playSound',{soundId:'gemPickup'}] ]));
  sr.addBlock(block('onCollision',{tag:'key'},[],[ ['addToVariable',{varName:'clés',value:1}],['playSound',{soundId:'keyPickup'}] ]));
  sr.addBlock(block('onCollision',{tag:'heart'},[],[ ['heal',{value:30}],['playSound',{soundId:'heartPickup'}] ]));
  sr.addBlock(block('onCollision',{tag:'enemy'},[],[ ['damage',{value:25}],['cameraShake',{intensity:4,duration:0.2}],['playSound',{soundId:'hurt'}] ]));
  sr.addBlock(block('onCollision',{tag:'hazard'},[],[ ['damage',{value:34}],['cameraShake',{intensity:6,duration:0.25}],['playSound',{soundId:'hurt'}] ]));
  sr.addBlock(block('onCollision',{tag:'goal'},[],[ ['playSound',{soundId:'victory'}],['win',{}] ]));
  sr.addBlock(block('onHPZero',{},[],[ ['playSound',{soundId:'death'}],['addToVariable',{varName:'lives',value:-1}],['setHP',{value:100}],['teleport',{x:start[0],y:start[1]}] ]));
}
function platformPlayer(x,y,sprite,opts={}){
  const p=makeObj('player',x,y,opts.w||30,opts.h||32,sprite,['player'],5);p.hp=100;p.maxHp=100;
  const sr=new S.ScriptRunner(),v=opts.speed||210,j=opts.jump||-430;
  sr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['setVelocity',{vx:v,vy:null}] ]));
  sr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['setVelocity',{vx:-v,vy:null}] ]));
  sr.addBlock(block('onKeyDown',{key:'ArrowUp'},[['isGrounded',{}]],[ ['jump',{force:j}],['playSound',{soundId:'jump'}] ]));
  sr.addBlock(block('onKeyDown',{key:'Space'},[['isGrounded',{}]],[ ['jump',{force:j}],['playSound',{soundId:'jump'}] ]));
  commonBlocks(sr,[x,y]);p.scriptRunner=sr;return p;
}
function topDownPlayer(x,y,sprite,opts={}){
  const p=makeObj('player',x,y,opts.w||28,opts.h||28,sprite,['player'],5);p.hp=100;p.maxHp=100;
  const sr=new S.ScriptRunner(),v=opts.speed||170;
  sr.addBlock(block('onKeyHeld',{key:'ArrowRight'},[],[ ['setVelocity',{vx:v,vy:null}] ]));
  sr.addBlock(block('onKeyHeld',{key:'ArrowLeft'},[],[ ['setVelocity',{vx:-v,vy:null}] ]));
  sr.addBlock(block('onKeyHeld',{key:'ArrowUp'},[],[ ['setVelocity',{vx:null,vy:-v}] ]));
  sr.addBlock(block('onKeyHeld',{key:'ArrowDown'},[],[ ['setVelocity',{vx:null,vy:v}] ]));
  commonBlocks(sr,[x,y]);p.scriptRunner=sr;return p;
}
// Walks back and forth: speed dx px/frame, turns around every `every` seconds.
function patrol(scene,id,x,y,sprite,dx,size=30,every=2){
  const e=makeObj(id,x,y,size,size,sprite,FLYERS.includes(sprite)?['enemy','hostile','flying']:['enemy','hostile'],3);e.hp=50;e.maxHp=50;
  const sr=new S.ScriptRunner();
  sr.addBlock(block('onUpdate',{},[['isFacing',{dir:'droite'}]],[ ['move',{dx:Math.abs(dx),dy:0}] ]));
  sr.addBlock(block('onUpdate',{},[['isFacing',{dir:'gauche'}]],[ ['move',{dx:-Math.abs(dx),dy:0}] ]));
  sr.addBlock(block('onTimer',{interval:every},[],[ ['flipX',{}] ]));
  e.scriptRunner=sr;scene.addObject(e);return e;
}
function chaser(scene,id,x,y,sprite,speed=60,size=28){
  const e=makeObj(id,x,y,size,size,sprite,FLYERS.includes(sprite)?['enemy','hostile','flying']:['enemy','hostile'],3);e.hp=50;e.maxHp=50;
  const sr=new S.ScriptRunner();
  sr.addBlock(block('onUpdate',{},[['distanceLess',{tag:'player',value:260}]],[ ['moveToward',{tag:'player',speed}] ]));
  e.scriptRunner=sr;scene.addObject(e);return e;
}
function walls(scene,w,h,sprite,size=32){
  for(let x=0;x<w;x+=size){slab(scene,'wt'+x,x+size/2,size/2,size,size,sprite);slab(scene,'wb'+x,x+size/2,h-size/2,size,size,sprite)}
  for(let y=size;y<h-size;y+=size){slab(scene,'wl'+y,size/2,y+size/2,size,size,sprite);slab(scene,'wr'+y,w-size/2,y+size/2,size,size,sprite)}
}
function spawner(scene,id,x,y,rules){
  const sp=makeObj(id,x,y,10,10,null,['spawner'],-2);sp.visible=false;
  const sr=new S.ScriptRunner();
  rules.forEach(([interval,percent,prefab])=>sr.addBlock(block('onTimer',{interval},[['random',{percent}]],[ ['spawn',{prefab,ox:0,oy:0}] ])));
  sp.scriptRunner=sr;scene.addObject(sp);
}
function faller(sprite,tags,speed=3,size=24){
  return(x,y)=>{
    const o=makeObj(sprite+'_'+Math.random().toString(36).slice(2),x+(Math.random()-0.5)*60,y,size,size,sprite,tags,4);
    const sr=new S.ScriptRunner();
    sr.addBlock(block('onUpdate',{},[],[ ['move',{dx:0,dy:speed}] ]));
    sr.addBlock(block('onTimer',{interval:4},[],[ ['destroy',{}] ]));
    o.scriptRunner=sr;return o;
  };
}
function winAt(player,score){
  player.scriptRunner.addBlock(block('onVariableChange',{varName:'score'},[['varGreater',{varName:'score',value:score-1}]],[ ['playSound',{soundId:'victory'}],['win',{}] ]));
}
function done(scene,prefabs){return{scenes:[scene],variables:scene.variables,prefabs:prefabs||{}}}

/* ═══ 7. Course aux nuages ═══ */
Templates.cloudClimb={id:'cloudClimb',name:'Course aux nuages',icon:'☁️',
  description:'Grimpe de nuage en nuage jusqu\'à l\'étoile tout en haut. Attention aux chauves-souris !',
  create(){
    const scene=new E.Scene('main','Ciel');scene.gravity={x:0,y:700};scene.bgColor='#6db3f2';scene.width=800;scene.height=2000;
    scene.variables={score:0,lives:3};
    row(scene,'g',16,1984,25,'platformGrass');
    const steps=[[200,1880],[420,1790],[620,1700],[400,1600],[180,1510],[380,1420],[600,1330],[700,1230],[480,1140],[260,1050],[120,950],[340,860],[560,770],[680,670],[460,580],[240,490],[400,390],[600,300],[400,200]];
    steps.forEach(([x,y],i)=>{slab(scene,'n'+i,x,y,110,22,'platformCloud');item(scene,'c'+i,x,y-34,'coin','coin')});
    [[300,1650],[520,1250],[300,820],[520,450]].forEach(([x,y],i)=>patrol(scene,'b'+i,x,y,'bat',1.2));
    deco(scene,'sun',680,120,90,90,'sun');
    [[120,300],[650,900],[150,1400],[620,1700]].forEach(([x,y],i)=>deco(scene,'cl'+i,x,y,120,60,'cloud'));
    goal(scene,'star',400,150,'starItem',44);
    scene.addObject(platformPlayer(100,1940,'astronaut',{jump:-470}));
    return done(scene);
  }};

/* ═══ 8. Chasse au trésor ═══ */
Templates.treasureHunt={id:'treasureHunt',name:'Chasse au trésor',icon:'💎',
  description:'Explore une île vue du dessus, ramasse les gemmes et ouvre le coffre en évitant les squelettes.',
  create(){
    const scene=new E.Scene('main','Île');scene.gravity={x:0,y:0};scene.bgColor='#3f8f4a';scene.width=1280;scene.height=960;
    scene.variables={score:0,lives:3};
    walls(scene,1280,960,'rockMedium');
    [[300,250],[500,400],[700,200],[900,500],[350,650],[1050,300],[650,700],[200,450],[1000,750],[800,380]].forEach(([x,y],i)=>slab(scene,'t'+i,x,y,48,56,i%2?'treePine':'treeOak'));
    [[250,150],[600,300],[850,650],[1150,200],[450,820],[1100,850],[150,780],[750,120]].forEach(([x,y],i)=>item(scene,'gm'+i,x,y,['gemBlue','gemRed','gemGreen','gemYellow'][i%4],'gem'));
    [[400,500],[900,250],[700,820]].forEach(([x,y],i)=>chaser(scene,'sk'+i,x,y,'skeleton',55));
    item(scene,'h0',1150,500,'heart','heart');
    goal(scene,'chest',1180,880,'chestClosed',44);
    for(let i=0;i<14;i++)deco(scene,'f'+i,90+(i*89)%1100,90+(i*157)%780,18,18,['flowerRed','flowerYellow','flowerBlue','bush'][i%4]);
    scene.addObject(topDownPlayer(120,120,'pirate'));
    return done(scene);
  }};

/* ═══ 9. Arène de survie ═══ */
Templates.arena={id:'arena',name:'Arène de survie',icon:'⚔️',
  description:'Tiens bon dans l\'arène : les monstres te poursuivent, les cœurs te soignent. Ramasse les 30 gemmes pour gagner.',
  create(){
    const scene=new E.Scene('main','Arène');scene.gravity={x:0,y:0};scene.bgColor='#3a2f2a';scene.width=800;scene.height=600;
    scene.variables={score:0,lives:3};
    walls(scene,800,600,'platformStone');
    [[200,150],[600,150],[200,450],[600,450]].forEach(([x,y],i)=>slab(scene,'p'+i,x,y,40,40,'barrel'));
    [[120,120],[680,120],[120,480],[680,480],[400,100],[400,500]].forEach(([x,y],i)=>chaser(scene,'z'+i,x,y,['zombie','goblin','orc'][i%3],45+i*6));
    for(let i=0;i<30;i++)item(scene,'g'+i,80+(i*137)%640,80+(i*211)%440,'gemPurple','gem',20);
    [[400,300],[150,300],[650,300]].forEach(([x,y],i)=>item(scene,'h'+i,x,y,'heart','heart'));
    const p=topDownPlayer(400,250,'knight',{speed:190});
    winAt(p,1500);
    scene.addObject(p);
    return done(scene);
  }};

/* ═══ 10. Grotte de glace ═══ */
Templates.iceCave={id:'iceCave',name:'Grotte de glace',icon:'🧊',
  description:'Un platformer glacé : trouve la clé, évite les pics et les araignées, rejoins le portail.',
  create(){
    const scene=new E.Scene('main','Grotte');scene.gravity={x:0,y:650};scene.bgColor='#13233a';scene.width=2400;scene.height=600;
    scene.variables={score:0,lives:3,'clés':0};
    row(scene,'g',16,584,22,'platformIce');row(scene,'h',864,584,20,'platformIce');row(scene,'k',1600,584,26,'platformIce');
    [[300,470],[520,400],[760,330],[1000,420],[1240,360],[1480,300],[1720,430],[1960,360],[2180,300]].forEach(([x,y],i)=>{slab(scene,'p'+i,x,y,100,20,'platformIce');item(scene,'c'+i,x,y-30,'coin','coin')});
    [[740,560],[1540,560],[1180,560]].forEach(([x,y],i)=>hazard(scene,'pic'+i,x,y,60,18,'rockSmall'));
    [[600,552],[1400,552],[2000,552]].forEach(([x,y],i)=>patrol(scene,'sp'+i,x,y,'spider',1));
    item(scene,'key',1480,260,'keyGold','key',26);
    scene.addObject(makeObj('portal',2330,530,48,64,'portal',['portal','goal-locked'],2));
    const p=platformPlayer(80,540,'ninja',{speed:230});
    p.scriptRunner.addBlock(block('onCollision',{tag:'portal'},[['varGreater',{varName:'clés',value:0}]],[ ['playSound',{soundId:'teleport'}],['win',{}] ]));
    scene.addObject(p);
    return done(scene);
  }};

/* ═══ 11. Pluie de météores ═══ */
Templates.meteorRain={id:'meteorRain',name:'Pluie de météores',icon:'☄️',
  description:'Esquive les boules de feu qui tombent du ciel. Chaque seconde survécue rapporte 5 points, 300 pour gagner.',
  create(){
    const scene=new E.Scene('main','Désert');scene.gravity={x:0,y:900};scene.bgColor='#2b1640';scene.width=800;scene.height=600;
    scene.variables={score:0,lives:3};
    row(scene,'g',16,584,25,'dirt');
    deco(scene,'moon',680,90,70,70,'moon');deco(scene,'m1',150,520,200,90,'mountain');deco(scene,'m2',620,520,220,100,'mountain');
    const p=platformPlayer(400,540,'cowboy',{speed:260});
    p.scriptRunner.addBlock(block('onTimer',{interval:1},[],[ ['addToVariable',{varName:'score',value:5}] ]));
    winAt(p,300);
    scene.addObject(p);
    for(let i=0;i<5;i++)spawner(scene,'spawn'+i,80+i*160,-20,[[1.4+i*0.37,70,'meteor']]);
    return done(scene,{meteor:faller('fireball',['hazard'],4,26)});
  }};

/* ═══ 12. Château hanté ═══ */
Templates.hauntedCastle={id:'hauntedCastle',name:'Château hanté',icon:'🏰',
  description:'Traverse les remparts la nuit : fantômes, chauves-souris, potions de vie et un drapeau à atteindre.',
  create(){
    const scene=new E.Scene('main','Remparts');scene.gravity={x:0,y:620};scene.bgColor='#0d0a1f';scene.width=2800;scene.height=600;
    scene.variables={score:0,lives:3};
    row(scene,'g',16,584,88,'platformStone');
    [[260,480],[420,400],[640,460],[860,380],[1060,300],[1300,420],[1520,340],[1760,260],[2000,400],[2240,320],[2480,420]].forEach(([x,y],i)=>{slab(scene,'p'+i,x,y,120,20,'platformMetal');item(scene,'c'+i,x,y-30,i%3?'coin':'gemRed',i%3?'coin':'gem')});
    [[700,500],[1400,480],[2100,500]].forEach(([x,y],i)=>chaser(scene,'gh'+i,x,y,'ghost',50));
    [[1000,250],[1800,200],[2400,260]].forEach(([x,y],i)=>patrol(scene,'bat'+i,x,y,'bat',1.4));
    [[900,540],[1900,540]].forEach(([x,y],i)=>item(scene,'pv'+i,x,y,'potionHP','heart',22));
    deco(scene,'moon',400,90,80,80,'moon');
    [[200,520],[1200,520],[2200,520]].forEach(([x,y],i)=>deco(scene,'lamp'+i,x,y,24,64,'lamp'));
    goal(scene,'flag',2740,536,'flagGreen',48);
    scene.addObject(platformPlayer(80,540,'knight'));
    return done(scene);
  }};

/* ═══ 13. Labyrinthe ═══ */
Templates.maze={id:'maze',name:'Labyrinthe',icon:'🌀',
  description:'Trouve la sortie du labyrinthe vu du dessus. Les loups rôdent dans les couloirs.',
  create(){
    const scene=new E.Scene('main','Labyrinthe');scene.gravity={x:0,y:0};scene.bgColor='#1d3b2a';scene.width=800;scene.height=544;
    scene.variables={score:0,lives:3};
    const map=[
      '#########################',
      '#S..#.......#.......#...#',
      '#.#.#.#####.#.#####.#.#.#',
      '#.#...#...#...#...#...#.#',
      '#.#####.#.#####.#.#####.#',
      '#.....#.#.....#.#.....#.#',
      '#####.#.#####.#.#####.#.#',
      '#...#.#.....#.#.....#...#',
      '#.#.#.#####.#.#####.#####',
      '#.#...#.....#.....#.....#',
      '#.#####.#########.#####.#',
      '#.......#.......#.......#',
      '#.#######.#####.#.#####.#',
      '#.#.......#...#.#.#...#.#',
      '#.#.#######.#.#.#.#.#.#.#',
      '#...#.......#...#...#..E#',
      '#########################'];
    const T=32;let start=[48,48];
    map.forEach((line,r)=>[...line].forEach((ch,c)=>{
      const x=c*T+T/2,y=r*T+T/2;
      if(ch==='#')slab(scene,'w'+r+'_'+c,x,y,T,T,'fence');
      else if(ch==='S')start=[x,y];
      else if(ch==='E')goal(scene,'exit',x,y,'portal',30);
      else if((r*7+c*3)%11===0)item(scene,'c'+r+'_'+c,x,y,'coin','coin',18);
    }));
    [[11*T+16,5*T+16],[17*T+16,11*T+16],[5*T+16,13*T+16]].forEach(([x,y],i)=>chaser(scene,'wolf'+i,x,y,'wolf',40,24));
    scene.addObject(topDownPlayer(start[0],start[1],'archer',{w:22,h:22,speed:150}));
    return done(scene);
  }};

/* ═══ 14. Verger ═══ */
Templates.orchard={id:'orchard',name:'Verger',icon:'🍎',
  description:'Attrape les pommes qui tombent des arbres et évite les bombes. 300 points pour gagner.',
  create(){
    const scene=new E.Scene('main','Verger');scene.gravity={x:0,y:900};scene.bgColor='#9ad3f0';scene.width=800;scene.height=600;
    scene.variables={score:0,lives:3};
    row(scene,'g',16,584,25,'platformGrass');
    [[120,200],[400,180],[680,200]].forEach(([x,y],i)=>deco(scene,'tree'+i,x,y,200,220,'treeOak'));
    const p=platformPlayer(400,540,'villager',{speed:300,jump:-380});
    winAt(p,300);
    scene.addObject(p);
    for(let i=0;i<6;i++)spawner(scene,'spawn'+i,80+i*128,120,[[1.1+i*0.29,55,'apple'],[3.3+i*0.5,35,'bomb']]);
    return done(scene,{apple:faller('apple',['coin','collectible']),bomb:faller('bomb',['hazard'])});
  }};

/* ═══ Export ═══ */
function getTemplateList(){
  return Object.values(Templates).map(t=>({id:t.id,name:t.name,icon:t.icon,description:t.description}));
}
function createFromTemplate(templateId){
  const tpl=Templates[templateId];if(!tpl)return null;return tpl.create();
}

window.Templates={list:getTemplateList,create:createFromTemplate,all:Templates};
})();
