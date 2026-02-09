/**
 * Game Studio — 3D Game Engine
 * THREE.js-based engine wrapping the mini three.min.js renderer
 */
(function(){'use strict';
if(!window.THREE){console.warn('three.min.js required');return}
const T=window.THREE;

class Engine3D{
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new T.WebGLRenderer(canvas);
    this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(60,canvas.width/canvas.height,0.1,1000);
    this.camera.position.set(0,5,10);this.camera.lookAt(0,0,0);
    this.objects=[];this._running=false;this._raf=0;this._lastTime=0;
    this._listeners={};
    this.ambientLight=null;this.directionalLight=null;
    this._initLights();
  }

  _initLights(){
    this.ambientLight=new T.AmbientLight('#404040');
    this.scene.add(this.ambientLight);
    this.directionalLight=new T.DirectionalLight('#ffffff',0.8);
    this.directionalLight.position.set(5,10,5);
    this.scene.add(this.directionalLight);
  }

  /* Object management */
  add(mesh){this.scene.add(mesh);this.objects.push(mesh);return mesh}
  remove(mesh){this.scene.remove(mesh);const i=this.objects.indexOf(mesh);if(i>=0)this.objects.splice(i,1)}
  clear(){for(const o of[...this.objects])this.remove(o)}

  /* Model helpers */
  createFromPreset(presetId,x=0,y=0,z=0){
    if(!window.Models3D)return null;
    const m=window.Models3D.create(presetId);
    if(m){m.position.set(x,y,z);this.add(m)}
    return m;
  }
  createPrimitive(type,params={}){
    let geom;
    switch(type){
      case'box':geom=new T.BoxGeometry(params.w||1,params.h||1,params.d||1);break;
      case'sphere':geom=new T.SphereGeometry(params.r||0.5,params.seg||16);break;
      case'cylinder':geom=new T.CylinderGeometry(params.rTop||0.5,params.rBot||0.5,params.h||1,params.seg||16);break;
      case'plane':geom=new T.PlaneGeometry(params.w||10,params.h||10);break;
      case'cone':geom=new T.ConeGeometry(params.r||0.5,params.h||1,params.seg||16);break;
      default:geom=new T.BoxGeometry(1,1,1);
    }
    const mat=new T.StandardMaterial({color:params.color||'#888888',metalness:params.metalness||0,roughness:params.roughness||0.7});
    const mesh=new T.Mesh(geom,mat);
    mesh.position.set(params.x||0,params.y||0,params.z||0);
    this.add(mesh);return mesh;
  }

  /* Camera */
  setCameraPosition(x,y,z){this.camera.position.set(x,y,z)}
  lookAt(x,y,z){this.camera.lookAt(x,y,z)}
  orbitCamera(target,speed=0.01){
    this._orbitTarget=target||{x:0,y:0,z:0};this._orbitSpeed=speed;this._orbitAngle=0;
  }

  /* Lights */
  addPointLight(x,y,z,color='#ffffff',intensity=1){
    const l=new T.PointLight(color,intensity,50);l.position.set(x,y,z);this.scene.add(l);return l;
  }
  addSpotLight(x,y,z,tx=0,ty=0,tz=0,color='#ffffff',intensity=1){
    const l=new T.SpotLight(color,intensity,100,Math.PI/4);
    l.position.set(x,y,z);l.target={position:{x:tx,y:ty,z:tz}};
    this.scene.add(l);return l;
  }
  setFog(color='#1a1a2e',near=10,far=100){this.scene.fog=new T.Fog(color,near,far)}

  /* Game Loop */
  start(){
    if(this._running)return;this._running=true;this._lastTime=performance.now();
    const loop=(now)=>{
      this._raf=requestAnimationFrame(loop);
      const dt=(now-this._lastTime)/1000;this._lastTime=now;
      if(dt>0.25)return; // skip huge delta
      // Orbit camera
      if(this._orbitTarget){
        this._orbitAngle+=this._orbitSpeed;
        const r=Math.sqrt(Math.pow(this.camera.position.x-this._orbitTarget.x,2)+Math.pow(this.camera.position.z-this._orbitTarget.z,2))||10;
        this.camera.position.x=this._orbitTarget.x+Math.cos(this._orbitAngle)*r;
        this.camera.position.z=this._orbitTarget.z+Math.sin(this._orbitAngle)*r;
        this.camera.lookAt(this._orbitTarget.x,this._orbitTarget.y,this._orbitTarget.z);
      }
      this._emit('update',dt);
      this.renderer.render(this.scene,this.camera);
    };
    this._raf=requestAnimationFrame(loop);
  }
  stop(){this._running=false;cancelAnimationFrame(this._raf)}

  /* Simple events */
  on(event,fn){if(!this._listeners[event])this._listeners[event]=[];this._listeners[event].push(fn)}
  _emit(event,...args){for(const fn of this._listeners[event]||[])fn(...args)}

  /* Resize */
  resize(w,h){
    this.canvas.width=w;this.canvas.height=h;
    this.camera.aspect=w/h;
    this.renderer.setSize(w,h);
  }

  /* Snapshot */
  renderSnapshot(){
    this.renderer.render(this.scene,this.camera);
    return this.canvas.toDataURL('image/png');
  }
}

window.Engine3D={Engine3D};
})();
