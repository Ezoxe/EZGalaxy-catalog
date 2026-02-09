/**
 * Game Studio — Procedural Audio Assets
 * 60+ sounds generated via Web Audio API
 */
(function(){'use strict';
const sounds={};
let audioCtx=null;
function ctx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx}

/* ── Core generators ── */
function playTone(freq,dur,type='sine',vol=0.3,opts={}){
  const ac=ctx();const g=ac.createGain();const o=ac.createOscillator();
  o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);
  if(opts.freqEnd)o.frequency.linearRampToValueAtTime(opts.freqEnd,ac.currentTime+dur);
  g.gain.setValueAtTime(vol,ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
  if(opts.filter){const f=ac.createBiquadFilter();f.type=opts.filter;f.frequency.value=opts.filterFreq||1000;o.connect(f);f.connect(g)}
  else o.connect(g);
  g.connect(ac.destination);o.start(ac.currentTime);o.stop(ac.currentTime+dur);
}

function noise(dur,vol=0.15,opts={}){
  const ac=ctx();const buf=ac.createBuffer(1,ac.sampleRate*dur,ac.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
  const s=ac.createBufferSource();s.buffer=buf;
  const g=ac.createGain();g.gain.setValueAtTime(vol,ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
  if(opts.filter){const f=ac.createBiquadFilter();f.type=opts.filter;f.frequency.value=opts.filterFreq||2000;
    if(opts.filterEnd)f.frequency.linearRampToValueAtTime(opts.filterEnd,ac.currentTime+dur);
    s.connect(f);f.connect(g)}else s.connect(g);
  g.connect(ac.destination);s.start(ac.currentTime);s.stop(ac.currentTime+dur);
}

function multiTone(notes,type='sine',vol=0.2){
  notes.forEach(([freq,start,dur])=>{
    const ac=ctx();const o=ac.createOscillator();const g=ac.createGain();
    o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,ac.currentTime+start);
    g.gain.linearRampToValueAtTime(vol,ac.currentTime+start+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+start+dur);
    o.connect(g);g.connect(ac.destination);o.start(ac.currentTime+start);o.stop(ac.currentTime+start+dur);
  });
}

/* ═══════════ SFX ═══════════ */

// Actions
sounds.jump={play:()=>playTone(200,0.15,'sine',0.3,{freqEnd:600}),name:'Saut',category:'actions',tags:['mouvement']};
sounds.land={play:()=>noise(0.1,0.15,{filter:'lowpass',filterFreq:500}),name:'Atterrissage',category:'actions',tags:['mouvement']};
sounds.dash={play:()=>noise(0.08,0.2,{filter:'highpass',filterFreq:2000}),name:'Dash',category:'actions',tags:['mouvement']};
sounds.footstep={play:()=>noise(0.05,0.08,{filter:'lowpass',filterFreq:800}),name:'Pas',category:'actions',tags:['mouvement']};
sounds.swim={play:()=>{noise(0.2,0.1,{filter:'lowpass',filterFreq:600});playTone(100,0.15,'sine',0.05)},name:'Nager',category:'actions',tags:['mouvement']};

// Combat
sounds.swordSwing={play:()=>{noise(0.12,0.2,{filter:'highpass',filterFreq:3000,filterEnd:500})},name:'Épée (swing)',category:'combat',tags:['mêlée']};
sounds.swordHit={play:()=>{playTone(300,0.05,'sawtooth',0.3);noise(0.08,0.2,{filter:'highpass',filterFreq:2000})},name:'Épée (hit)',category:'combat',tags:['mêlée']};
sounds.bowShoot={play:()=>{noise(0.06,0.15,{filter:'bandpass',filterFreq:4000});playTone(800,0.1,'sine',0.1,{freqEnd:400})},name:'Arc',category:'combat',tags:['distance']};
sounds.staffCast={play:()=>playTone(600,0.3,'sine',0.2,{freqEnd:1200}),name:'Bâton magique',category:'combat',tags:['magie']};
sounds.punch={play:()=>{noise(0.05,0.3,{filter:'lowpass',filterFreq:500})},name:'Coup de poing',category:'combat',tags:['mêlée']};
sounds.explosion={play:()=>{noise(0.4,0.4,{filter:'lowpass',filterFreq:400,filterEnd:80});playTone(60,0.3,'sine',0.3,{freqEnd:20})},name:'Explosion',category:'combat',tags:['destruction']};
sounds.laserShoot={play:()=>playTone(1200,0.1,'sawtooth',0.2,{freqEnd:200}),name:'Laser',category:'combat',tags:['futuriste']};
sounds.shield={play:()=>playTone(400,0.2,'triangle',0.2,{freqEnd:800}),name:'Bouclier',category:'combat',tags:['défense']};

// Collectibles
sounds.coinPickup={play:()=>{playTone(880,0.05,'square',0.15);setTimeout(()=>playTone(1320,0.1,'square',0.15),60)},name:'Pièce',category:'collectibles',tags:['ramasser']};
sounds.gemPickup={play:()=>multiTone([[1047,0,0.08],[1319,0.06,0.08],[1568,0.12,0.12]],'sine',0.15),name:'Gemme',category:'collectibles',tags:['ramasser']};
sounds.keyPickup={play:()=>multiTone([[523,0,0.1],[659,0.08,0.1],[784,0.16,0.15]],'triangle',0.15),name:'Clé',category:'collectibles',tags:['ramasser']};
sounds.heartPickup={play:()=>multiTone([[440,0,0.1],[554,0.08,0.08],[659,0.14,0.12]],'sine',0.12),name:'Cœur',category:'collectibles',tags:['ramasser']};
sounds.itemPickup={play:()=>playTone(600,0.1,'triangle',0.2,{freqEnd:900}),name:'Objet',category:'collectibles',tags:['ramasser']};
sounds.potionDrink={play:()=>{playTone(300,0.2,'sine',0.1,{freqEnd:800});noise(0.15,0.05,{filter:'lowpass',filterFreq:1000})},name:'Potion',category:'collectibles',tags:['consommer']};

// UI
sounds.menuSelect={play:()=>playTone(700,0.06,'square',0.1),name:'Sélection menu',category:'ui',tags:['interface']};
sounds.menuConfirm={play:()=>{playTone(523,0.06,'square',0.1);setTimeout(()=>playTone(784,0.1,'square',0.1),60)},name:'Confirmation',category:'ui',tags:['interface']};
sounds.menuBack={play:()=>playTone(400,0.08,'square',0.1,{freqEnd:250}),name:'Retour',category:'ui',tags:['interface']};
sounds.menuOpen={play:()=>playTone(500,0.1,'triangle',0.12,{freqEnd:800}),name:'Ouvrir menu',category:'ui',tags:['interface']};
sounds.menuClose={play:()=>playTone(700,0.08,'triangle',0.1,{freqEnd:350}),name:'Fermer menu',category:'ui',tags:['interface']};
sounds.error={play:()=>{playTone(200,0.15,'square',0.2);setTimeout(()=>playTone(150,0.2,'square',0.2),150)},name:'Erreur',category:'ui',tags:['interface']};
sounds.success={play:()=>multiTone([[523,0,0.08],[659,0.06,0.08],[784,0.12,0.08],[1047,0.18,0.15]],'triangle',0.12),name:'Succès',category:'ui',tags:['interface']};

// Environment
sounds.doorOpen={play:()=>{noise(0.2,0.1,{filter:'lowpass',filterFreq:500});playTone(200,0.15,'sine',0.08,{freqEnd:100})},name:'Porte ouvre',category:'environment',tags:['interaction']};
sounds.doorClose={play:()=>{noise(0.15,0.15,{filter:'lowpass',filterFreq:400})},name:'Porte ferme',category:'environment',tags:['interaction']};
sounds.chestOpen={play:()=>{noise(0.1,0.1,{filter:'lowpass',filterFreq:600});playTone(400,0.1,'triangle',0.1,{freqEnd:700})},name:'Coffre',category:'environment',tags:['interaction']};
sounds.splash={play:()=>{noise(0.3,0.2,{filter:'lowpass',filterFreq:1000,filterEnd:200})},name:'Splash',category:'environment',tags:['eau']};
sounds.wind={play:()=>noise(0.5,0.1,{filter:'bandpass',filterFreq:800}),name:'Vent',category:'environment',tags:['ambiance']};
sounds.fire={play:()=>noise(0.4,0.12,{filter:'bandpass',filterFreq:600}),name:'Feu',category:'environment',tags:['ambiance']};
sounds.thunder={play:()=>{noise(0.6,0.3,{filter:'lowpass',filterFreq:300,filterEnd:50})},name:'Tonnerre',category:'environment',tags:['météo']};
sounds.rain={play:()=>noise(1,0.08,{filter:'highpass',filterFreq:4000}),name:'Pluie',category:'environment',tags:['météo']};
sounds.creaking={play:()=>playTone(80,0.3,'sawtooth',0.08,{freqEnd:120}),name:'Grincement',category:'environment',tags:['ambiance']};

// Characters
sounds.hurt={play:()=>{playTone(300,0.1,'sawtooth',0.2,{freqEnd:100});noise(0.05,0.15)},name:'Dégâts',category:'characters',tags:['combat']};
sounds.death={play:()=>{playTone(400,0.3,'sawtooth',0.2,{freqEnd:50})},name:'Mort',category:'characters',tags:['combat']};
sounds.heal={play:()=>multiTone([[523,0,0.12],[659,0.1,0.12],[784,0.2,0.15]],'sine',0.1),name:'Soin',category:'characters',tags:['magie']};
sounds.levelUp={play:()=>multiTone([[523,0,0.1],[659,0.08,0.1],[784,0.16,0.1],[1047,0.24,0.1],[1319,0.32,0.15]],'square',0.12),name:'Niveau supérieur',category:'characters',tags:['progression']};
sounds.powerUp={play:()=>playTone(300,0.3,'square',0.15,{freqEnd:1200}),name:'Power-up',category:'characters',tags:['bonus']};

// Game events
sounds.victory={play:()=>multiTone([[523,0,0.15],[659,0.12,0.15],[784,0.24,0.15],[1047,0.36,0.25]],'triangle',0.15),name:'Victoire',category:'events',tags:['jeu']};
sounds.defeat={play:()=>multiTone([[400,0,0.2],[350,0.15,0.2],[300,0.3,0.2],[200,0.45,0.4]],'sawtooth',0.12),name:'Défaite',category:'events',tags:['jeu']};
sounds.checkpoint={play:()=>multiTone([[660,0,0.08],[880,0.06,0.12]],'triangle',0.12),name:'Checkpoint',category:'events',tags:['progrès']};
sounds.teleport={play:()=>playTone(200,0.3,'sine',0.15,{freqEnd:2000}),name:'Téléportation',category:'events',tags:['magie']};
sounds.alert={play:()=>{playTone(800,0.1,'square',0.15);setTimeout(()=>playTone(800,0.1,'square',0.15),200)},name:'Alerte',category:'events',tags:['danger']};
sounds.countdown={play:()=>playTone(440,0.1,'square',0.15),name:'Compte à rebours',category:'events',tags:['jeu']};
sounds.gameStart={play:()=>multiTone([[262,0,0.1],[330,0.08,0.1],[392,0.16,0.1],[523,0.24,0.2]],'square',0.12),name:'Début de partie',category:'events',tags:['jeu']};

/* ═══ Simple music loop generator ═══ */
function playLoop(notes,bpm=120,type='triangle',vol=0.08){
  const beatDur=60/bpm;
  const noteList=notes.map((n,i)=>[n,i*beatDur,beatDur*0.8]);
  multiTone(noteList,type,vol);
  return{duration:notes.length*beatDur};
}

sounds.musicAdventure={play:()=>playLoop([523,587,659,784,659,587,523,392,440,523,587,659,784,880,784,659],140),name:'Aventure',category:'music',tags:['boucle']};
sounds.musicTense={play:()=>playLoop([220,247,262,220,233,262,220,196,220,247,262,294,262,247,220,196],100,'sawtooth'),name:'Tension',category:'music',tags:['boucle']};
sounds.musicPeaceful={play:()=>playLoop([392,440,523,659,523,440,392,330,392,440,523,659,784,659,523,440],90,'sine'),name:'Paisible',category:'music',tags:['boucle']};
sounds.musicBattle={play:()=>playLoop([330,330,392,440,330,330,392,494,440,392,330,294,330,392,440,330],160,'square'),name:'Combat',category:'music',tags:['boucle']};

/* ═══ API ═══ */
function getList(){return Object.entries(sounds).map(([id,s])=>({id,name:s.name,category:s.category,tags:s.tags||[]}))}
function getByCategory(cat){return getList().filter(s=>s.category===cat)}
function getCategories(){const s=new Set();for(const v of Object.values(sounds))s.add(v.category);return[...s].map(c=>({id:c,name:{actions:'Actions',combat:'Combat',collectibles:'Collectibles',ui:'Interface',environment:'Environnement',characters:'Personnages',events:'Événements',music:'Musique'}[c]||c}))}
function play(id){const s=sounds[id];if(s)s.play()}
function resume(){if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume()}

window.Audio={sounds,play,getList,getByCategory,getCategories,resume,ctx:()=>ctx()};
})();
