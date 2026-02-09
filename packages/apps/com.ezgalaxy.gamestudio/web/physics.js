/**
 * Game Studio — Physics Engine
 * AABB + Circle collision, gravity, rigid bodies, triggers, raycasting, one-way platforms
 */
(function(){'use strict';

/* ── Vector2 helper ── */
class Vec2{
  constructor(x=0,y=0){this.x=x;this.y=y}
  add(v){return new Vec2(this.x+v.x,this.y+v.y)}
  sub(v){return new Vec2(this.x-v.x,this.y-v.y)}
  mul(s){return new Vec2(this.x*s,this.y*s)}
  dot(v){return this.x*v.x+this.y*v.y}
  len(){return Math.sqrt(this.x*this.x+this.y*this.y)}
  norm(){const l=this.len();return l>0?this.mul(1/l):new Vec2()}
  clone(){return new Vec2(this.x,this.y)}
  set(x,y){this.x=x;this.y=y;return this}
}

/* ── AABB ── */
class AABB{
  constructor(x,y,w,h){this.x=x;this.y=y;this.w=w;this.h=h}
  get left(){return this.x}
  get right(){return this.x+this.w}
  get top(){return this.y}
  get bottom(){return this.y+this.h}
  get cx(){return this.x+this.w/2}
  get cy(){return this.y+this.h/2}
  overlaps(o){return this.left<o.right&&this.right>o.left&&this.top<o.bottom&&this.bottom>o.top}
  contains(px,py){return px>=this.left&&px<=this.right&&py>=this.top&&py<=this.bottom}
  expand(m){return new AABB(this.x-m,this.y-m,this.w+m*2,this.h+m*2)}
}

/* ── Circle ── */
class Circle{
  constructor(x,y,r){this.x=x;this.y=y;this.r=r}
}

/* ── Collision tests ── */
function aabbVsAabb(a,b){
  if(!a.overlaps(b))return null;
  const dx=a.cx-b.cx,dy=a.cy-b.cy;
  const ox=(a.w+b.w)/2-Math.abs(dx),oy=(a.h+b.h)/2-Math.abs(dy);
  if(ox<=0||oy<=0)return null;
  if(ox<oy)return{normal:new Vec2(dx>0?1:-1,0),depth:ox};
  return{normal:new Vec2(0,dy>0?1:-1),depth:oy};
}

function circleVsCircle(a,b){
  const dx=b.x-a.x,dy=b.y-a.y;
  const dist=Math.sqrt(dx*dx+dy*dy);
  const minDist=a.r+b.r;
  if(dist>=minDist)return null;
  const normal=dist>0?new Vec2(dx/dist,dy/dist):new Vec2(1,0);
  return{normal,depth:minDist-dist};
}

function aabbVsCircle(aabb,circle){
  const cx=Math.max(aabb.left,Math.min(circle.x,aabb.right));
  const cy=Math.max(aabb.top,Math.min(circle.y,aabb.bottom));
  const dx=circle.x-cx,dy=circle.y-cy;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>=circle.r)return null;
  const normal=dist>0?new Vec2(dx/dist,dy/dist):new Vec2(0,-1);
  return{normal,depth:circle.r-dist};
}

/* ── Raycast ── */
function raycastAABB(ox,oy,dx,dy,box,maxDist=Infinity){
  let tmin=0,tmax=maxDist;
  const dirs=[{d:dx,o:ox,min:box.left,max:box.right},{d:dy,o:oy,min:box.top,max:box.bottom}];
  for(const{d,o,min,max}of dirs){
    if(Math.abs(d)<1e-8){if(o<min||o>max)return null}
    else{
      let t1=(min-o)/d,t2=(max-o)/d;
      if(t1>t2)[t1,t2]=[t2,t1];
      tmin=Math.max(tmin,t1);tmax=Math.min(tmax,t2);
      if(tmin>tmax)return null;
    }
  }
  return{t:tmin,x:ox+dx*tmin,y:oy+dy*tmin};
}

/* ── Rigid Body ── */
class Body{
  constructor(opts={}){
    this.id=opts.id||('body_'+(Body._nextId++));
    this.x=opts.x||0;this.y=opts.y||0;
    this.w=opts.w||32;this.h=opts.h||32;
    this.vx=0;this.vy=0;
    this.mass=opts.mass||1;
    this.invMass=opts.static?0:1/this.mass;
    this.restitution=opts.restitution||0;
    this.friction=opts.friction||0.1;
    this.isStatic=!!opts.static;
    this.isTrigger=!!opts.trigger;
    this.isOneWay=!!opts.oneWay;
    this.useGravity=opts.useGravity!==false&&!opts.static;
    this.grounded=false;
    this.collisionLayer=opts.layer||0;
    this.collisionMask=opts.mask??0xFFFF;
    this.shape=opts.shape||'aabb'; // 'aabb' or 'circle'
    this.radius=opts.radius||Math.min(this.w,this.h)/2;
    this.gameObject=opts.gameObject||null;
    this.onCollision=opts.onCollision||null;
    this.onTrigger=opts.onTrigger||null;
  }
  get aabb(){return new AABB(this.x,this.y,this.w,this.h)}
  get circle(){return new Circle(this.x+this.w/2,this.y+this.h/2,this.radius)}
  applyForce(fx,fy){if(!this.isStatic){this.vx+=fx*this.invMass;this.vy+=fy*this.invMass}}
  applyImpulse(ix,iy){if(!this.isStatic){this.vx+=ix;this.vy+=iy}}
}
Body._nextId=0;

/* ── Physics World ── */
class PhysicsWorld{
  constructor(opts={}){
    this.gravity=new Vec2(0,opts.gravity??600);
    this.bodies=[];
    this.iterations=opts.iterations||4;
    this.collisionPairs=[];
    this.triggerPairs=[];
  }

  addBody(body){this.bodies.push(body);return body}
  removeBody(body){const i=this.bodies.indexOf(body);if(i>=0)this.bodies.splice(i,1)}
  clear(){this.bodies=[];this.collisionPairs=[];this.triggerPairs=[]}

  update(dt){
    const subDt=dt/this.iterations;
    for(let iter=0;iter<this.iterations;iter++){
      // Apply gravity
      for(const b of this.bodies){
        if(b.useGravity&&!b.isStatic){
          b.vx+=this.gravity.x*subDt;
          b.vy+=this.gravity.y*subDt;
        }
      }
      // Move bodies
      for(const b of this.bodies){
        if(!b.isStatic){
          b.x+=b.vx*subDt;
          b.y+=b.vy*subDt;
        }
      }
      // Reset grounded
      for(const b of this.bodies)b.grounded=false;
      // Detect & resolve collisions
      this.collisionPairs=[];
      this.triggerPairs=[];
      for(let i=0;i<this.bodies.length;i++){
        for(let j=i+1;j<this.bodies.length;j++){
          const a=this.bodies[i],b=this.bodies[j];
          if(a.isStatic&&b.isStatic)continue;
          if(!(a.collisionMask&(1<<b.collisionLayer))&&!(b.collisionMask&(1<<a.collisionLayer)))continue;

          let hit=null;
          if(a.shape==='aabb'&&b.shape==='aabb')hit=aabbVsAabb(a.aabb,b.aabb);
          else if(a.shape==='circle'&&b.shape==='circle')hit=circleVsCircle(a.circle,b.circle);
          else if(a.shape==='aabb'&&b.shape==='circle')hit=aabbVsCircle(a.aabb,b.circle);
          else if(a.shape==='circle'&&b.shape==='aabb'){hit=aabbVsCircle(b.aabb,a.circle);if(hit)hit.normal=hit.normal.mul(-1)}

          if(!hit)continue;

          if(a.isTrigger||b.isTrigger){
            this.triggerPairs.push({a,b,hit});
            if(a.onTrigger)a.onTrigger(b,hit);
            if(b.onTrigger)b.onTrigger(a,hit);
            continue;
          }

          // One-way platform: only block if coming from above
          if(a.isOneWay){
            if(hit.normal.y>0||b.vy<0)continue;
          }
          if(b.isOneWay){
            if(hit.normal.y<0||a.vy<0)continue;
          }

          this.collisionPairs.push({a,b,hit});

          // Resolve
          const totalInv=a.invMass+b.invMass;
          if(totalInv===0)continue;
          const sep=hit.depth/totalInv;
          if(!a.isStatic){a.x-=hit.normal.x*sep*a.invMass;a.y-=hit.normal.y*sep*a.invMass}
          if(!b.isStatic){b.x+=hit.normal.x*sep*b.invMass;b.y+=hit.normal.y*sep*b.invMass}

          // Grounded detection
          if(hit.normal.y<-0.5){b.grounded=true}
          if(hit.normal.y>0.5){a.grounded=true}

          // Velocity resolution
          const rv=new Vec2(b.vx-a.vx,b.vy-a.vy);
          const velAlongNormal=rv.dot(hit.normal);
          if(velAlongNormal>0)continue;
          const e=Math.min(a.restitution,b.restitution);
          const imp=-(1+e)*velAlongNormal/totalInv;
          if(!a.isStatic){a.vx-=hit.normal.x*imp*a.invMass;a.vy-=hit.normal.y*imp*a.invMass}
          if(!b.isStatic){b.vx+=hit.normal.x*imp*b.invMass;b.vy+=hit.normal.y*imp*b.invMass}

          // Friction
          const tangent=new Vec2(rv.x-hit.normal.x*velAlongNormal,rv.y-hit.normal.y*velAlongNormal);
          const tLen=tangent.len();
          if(tLen>0.001){
            const tn=tangent.mul(1/tLen);
            const fric=Math.sqrt(a.friction*b.friction)*Math.abs(imp);
            if(!a.isStatic){a.vx+=tn.x*fric*a.invMass;a.vy+=tn.y*fric*a.invMass}
            if(!b.isStatic){b.vx-=tn.x*fric*b.invMass;b.vy-=tn.y*fric*b.invMass}
          }

          // Callbacks
          if(a.onCollision)a.onCollision(b,hit);
          if(b.onCollision)b.onCollision(a,{...hit,normal:hit.normal.mul(-1)});
        }
      }
    }
  }

  raycast(ox,oy,dx,dy,maxDist=1000,filter=null){
    let closest=null;let closestT=maxDist;
    const len=Math.sqrt(dx*dx+dy*dy);
    const ndx=dx/len,ndy=dy/len;
    for(const b of this.bodies){
      if(b.isTrigger)continue;
      if(filter&&!filter(b))continue;
      const result=raycastAABB(ox,oy,ndx,ndy,b.aabb,closestT);
      if(result&&result.t<closestT){closestT=result.t;closest={body:b,...result}}
    }
    return closest;
  }

  queryAABB(aabb){return this.bodies.filter(b=>b.aabb.overlaps(aabb))}
  queryCircle(cx,cy,r){
    const c=new Circle(cx,cy,r);
    return this.bodies.filter(b=>{
      if(b.shape==='circle')return circleVsCircle(c,b.circle);
      return aabbVsCircle(b.aabb,c);
    });
  }
}

window.Physics={Vec2,AABB,Circle,Body,World:PhysicsWorld,
  aabbVsAabb,circleVsCircle,aabbVsCircle,raycastAABB};
})();
