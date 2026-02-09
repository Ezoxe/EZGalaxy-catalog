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
    sr.addBlock(block('onHPZero',{},[],[ ['playSound',{soundId:'death'}],['setVariable',{varName:'lives',value:-1}] ]));
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

/* ═══ Export ═══ */
function getTemplateList(){
  return Object.values(Templates).map(t=>({id:t.id,name:t.name,icon:t.icon,description:t.description}));
}
function createFromTemplate(templateId){
  const tpl=Templates[templateId];if(!tpl)return null;return tpl.create();
}

window.Templates={list:getTemplateList,create:createFromTemplate,all:Templates};
})();
