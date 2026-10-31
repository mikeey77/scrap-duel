// ---------- GLSL ----------
// Glyph sets: each a contiguous run in the atlas, ordered sparse -> dense
const GLYPH_SETS = {
  RAMP: ' .:-=+*#%@',
  GRASS: " .,'|/\\\"",
  ROCK: ' .,:;icoaqdbpQS$&#M',
  CLIFF: ' .:!|lI1[H#M',
  WATER: ' .-~=',
  LEAF: ' .:;o%&@8',
  PINE: ' .^A*M',
  DIRT: " .,:;'",
  FLOWER: '*o+x',
  BODY: ' .:+xX#MW@',
  SPARK: '*+o.',
  RAIN: '/|',
  BRICK: '[]=#_',
  ROOF: '^/\\A=',
  CROP: 'Y|wv',
  PLANK: '|=#n',
  FIRE: "'^*\"",
  MISC: '~&m$!?',
  WEAP: '|/\\-',
  SMOKE: '.,oO'
};
let GLYPHS = '', GLYPH_DEFS = '';
const GI = {};
for (const [k, v] of Object.entries(GLYPH_SETS)) {
  GI[k] = GLYPHS.length;
  GLYPH_DEFS += `#define G_${k} ${GLYPHS.length}\n#define G_${k}_N ${v.length}\n`;
  GLYPHS += v;
}

const VS = `#version 300 es
in vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;

const SCENE_FS = `#version 300 es
precision highp float; precision highp int;
uniform sampler2D uH, uB, uD;
uniform vec2 uRes, uCell, uCamS;
uniform float uPPU, uTime, uNight, uRain, uWet, uCloud, uExp;
uniform vec3 uSunDir, uSunCol, uAmb, uSky;
uniform int uSeed, uNF, uNL, uNP, uNPl;
uniform vec2 uPl[4];
layout(location=0) out vec4 o0;
layout(location=1) out vec4 o1;
#define WORLD 320.
#define HS 6.4
#define YS .82
#define ZS .72
#define TG 2.5
#define ZMAX 6.6
#define STEPS 30
${GLYPH_DEFS}

float hf(ivec2 c,int s){
  uint x=uint(c.x), y=uint(c.y);
  uint h=(x*0x27d4eb2du)^(y*0x165667b1u+uint(s));
  h^=h>>15u; h*=0x2c1b3c6du; h^=h>>12u; h*=0x297a2d39u; h^=h>>15u;
  return float(h&0xffffffu)/16777216.;
}
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s/.9375; }
int pick(int base,int n,float v){ return base+int(clamp(v,0.,.999)*float(n)); }
vec3 tm(vec3 c){ return pow(1.-exp(-c*uExp), vec3(.92)); }
float lum(vec3 c){ return dot(c,vec3(.3,.55,.15)); }

vec4 Hs(vec2 p){ return texture(uH,p/WORLD); }
vec4 Bt(vec2 p){ return texelFetch(uB,clamp(ivec2(floor(p)),ivec2(0),ivec2(319)),0); }
float rockH(vec2 p){ float r=Hs(p).r*HS; if(r<.05) return 0.; return max(0.,r+(vn(p*1.7)-.5)*.5*min(r,1.)); }
float bldH(vec2 p){ vec4 b=Bt(p); if(int(b.g*255.+.5)==13 && length(fract(p)-.5)>.17) return 0.; return b.r*HS; }

// trees on a jittered grid; density baked into the map (identical rule on the CPU)
int treeAt(vec3 P, out vec3 ti, out vec2 tc){
  ivec2 ci=ivec2(floor(P.xy/TG));
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    ivec2 c=ci+ivec2(i,j);
    float d0=texelFetch(uH,clamp(ivec2(floor((vec2(c)+.5)*TG)),ivec2(0),ivec2(319)),0).b;
    if(!(hf(c,uSeed+11)<d0*.85)) continue;
    float j1=hf(c,uSeed+12);
    vec2 p=(vec2(c)+.2+.6*vec2(j1,hf(c,uSeed+13)))*TG;
    vec2 d=P.xy-p; float dl=length(d);
    if(dl>2.6) continue;
    float s=.75+.5*hf(c,uSeed+14);
    float el=texelFetch(uH,clamp(ivec2(floor(p)),ivec2(0),ivec2(319)),0).a;
    bool pine=el>.55||j1>.86;
    if(pine){
      float ht=5.8*s;
      if(P.z<1.1 && dl<.2){ tc=p; ti=vec3(1.,0.,s); return 1; }
      if(P.z>.7 && P.z<ht){
        float u=(P.z-.7)/(ht-.7);
        float rr=1.55*s*(1.-u)*(.72+.38*fract(P.z*1.35+j1));
        if(dl<rr){ tc=p; ti=vec3(1.,ht,s); return 2; }
      }
    } else {
      if(P.z<2.6*s && dl<.24*s+.06){ tc=p; ti=vec3(0.,0.,s); return 1; }
      float R=(1.65+.6*hf(c,uSeed+15))*s, zc=3.3*s;
      float rr=R*(.8+.32*vn(P.xy*1.25+p));
      if(dl<rr){
        float vz=R*.7*sqrt(1.-dl*dl/(rr*rr));
        if(abs(P.z-zc)<vz){ tc=p; ti=vec3(0.,zc,R); return 2; }
      }
    }
  }
  return 0;
}
// 0 empty, 1 rock, 2 building, 3 trunk, 4 canopy
int solid(vec3 P, out vec3 ti, out vec2 tc){
  if(rockH(P.xy)>P.z) return 1;
  if(bldH(P.xy)>P.z) return 2;
  int t=treeAt(P,ti,tc);
  return t==0?0:t+2;
}
int march(vec2 S, out vec3 P, out vec3 ti, out vec2 tc){
  float dz=ZMAX/float(STEPS);
  for(int i=0;i<STEPS;i++){
    float z=ZMAX-(float(i)+.5)*dz;
    vec3 Q=vec3(S.x,(S.y-z*ZS)/YS,z);
    int k=solid(Q,ti,tc);
    if(k>0){
      // see-through cut-out where something stands in front of a player
      bool cut=false;
      for(int j=0;j<4;j++){ if(j>=uNPl) break;
        vec2 pp=uPl[j]; vec2 d=(S-vec2(pp.x,pp.y*YS+1.*ZS))*vec2(1.,1.25);
        float r=length(d);
        if(Q.y<pp.y-.2&&r<2.1&&(r<1.6||h21(floor(S*7.))>(r-1.6)*2.)) cut=true; }
      if(cut) continue;
      float lo=z, hi=z+dz; vec3 t2; vec2 c2;
      for(int r=0;r<3;r++){ float m=(lo+hi)*.5; if(solid(vec3(S.x,(S.y-m*ZS)/YS,m),t2,c2)>0) lo=m; else hi=m; }
      P=vec3(S.x,(S.y-lo*ZS)/YS,lo);
      int k2=solid(P,ti,tc);
      if(k2==0){ P=vec3(S.x,(S.y-z*ZS)/YS,z); k2=solid(P,ti,tc); }
      return k2;
    }
  }
  P=vec3(S.x,S.y/YS,0.);
  return 0;
}
float shadowAt(vec3 P, vec3 L, float t, float cm){
  float sh=1.;
  for(int i=0;i<14;i++){
    vec3 q=P+L*t;
    if(q.z>ZMAX) break;
    vec3 ti; vec2 tc;
    int k=solid(q,ti,tc);
    if(k==4) sh*=cm; else if(k>0){ sh=0.; break; }
    t+=.22+t*.2;
  }
  return sh;
}
vec3 pointLights(vec3 P, vec3 n, out vec3 spec){
  vec3 acc=vec3(0); spec=vec3(0);
  for(int i=0;i<32;i++){
    if(i>=uNL) break;
    vec4 a=texelFetch(uD,ivec2(i,6),0), c=texelFetch(uD,ivec2(i,7),0);
    vec3 d=a.xyz-P; float dd=dot(d,d), r=a.w;
    if(dd>r*r) continue;
    float fl=(c.a>.5&&c.a<2.5)?(.82+.18*sin(uTime*13.+float(i)*7.)*sin(uTime*7.3+float(i))):1.;
    float att=fl/(1.+dd*.33)*(1.-smoothstep(r*r*.35,r*r,dd));
    vec3 ld=d*inversesqrt(dd+1e-4);
    acc+=c.rgb*att*(max(dot(n,ld),0.)*.75+.25)*2.3;
    spec+=c.rgb*att*pow(max(dot(reflect(-ld,n),vec3(0,-.6,.8)),0.),16.);
  }
  return acc;
}
vec3 fireflies(vec3 P, float t, out float near, out vec3 nearCol){
  vec3 acc=vec3(0); near=1e9; nearCol=vec3(0);
  if(uNight<.3) return acc;
  vec2 id=floor(P.xy/6.);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 cid=id+vec2(i,j); float h=h21(cid+31.), h2=h21(cid+57.);
    if(h<.45) continue;
    float ph=h2*6.283;
    vec2 fp=(cid+.5)*6.+vec2(sin(t*(.3+h*.4)+ph),cos(t*(.25+h2*.3)+ph*1.7))*2.2;
    float blink=smoothstep(.2,.9,sin(t*(.8+h)+ph*3.)*.5+.5)*uNight;
    float d=length(P.xy-fp);
    acc+=vec3(.75,1.,.45)*blink*.5/(1.+d*d*2.);
  }
  return acc;
}
// screen-plane distance test for small floating things (z is height)
vec2 toS(vec3 p){ return vec2(p.x,p.y*YS+p.z*ZS); }

struct FH { int part; vec2 nrm; float d; };
void cap(inout FH h, vec2 q, vec2 a, vec2 b, float r, int part){
  vec2 pa=q-a, ba=b-a; float k=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); vec2 v=pa-ba*k; float d=length(v)-r;
  h.d=min(h.d,d);
  if(d<0.){ h.part=part; h.nrm=v/r; }
}
void ell(inout FH h, vec2 q, vec2 c, vec2 r, int part){
  vec2 v=(q-c)/r; float d=(length(v)-1.)*min(r.x,r.y);
  h.d=min(h.d,d);
  if(d<0.){ h.part=part; h.nrm=v; }
}
// parts: 1 cape 2 limb 3 torso 4 head 5 helm 6 weapon 7 shield 8 eye 9 trail 10 slime 11 core 12 chest 13 lid 14 gold 15 boot
FH figure(vec2 q, int type, float ph, float atk, float mv, float helm, float wpn, float shield, out vec2 wdir){
  FH h; h.part=0; h.nrm=vec2(0); h.d=1e9; wdir=vec2(0,1);
  if(type<=2){
    float th = type==2 ? .62 : 1.;
    float sw=sin(ph)*.28*mv, bob=abs(cos(ph))*.05*mv+sin(uTime*2.1+ph)*.018*(1.-mv);
    q.y-=bob;
    float sway=sin(uTime*1.7+ph*.3)*.07+mv*.16;
    if(type==0) cap(h,q,vec2(-.02,1.42),vec2(-.24-sway,.5+mv*.08),.27,1);
    // back arm + back leg
    vec2 sb=vec2(-.2,1.38), hb=sb+vec2(-.04-sw*.35,-.5);
    cap(h,q,sb,hb,.1*th,2);
    cap(h,q,vec2(-.12,.86),vec2(-.12-sw,.1),.12*th,2);
    cap(h,q,vec2(-.12-sw,.08),vec2(-.05-sw,.06),.09,15);
    cap(h,q,vec2(0,.9),vec2(0,1.4),.28*th,3);
    cap(h,q,vec2(.12,.86),vec2(.12+sw,.1),.12*th,2);
    cap(h,q,vec2(.12+sw,.08),vec2(.2+sw,.06),.09,15);
    ell(h,q,vec2(.03,1.72),vec2(.2,.21),4);
    if(helm>.5) ell(h,q,vec2(.02,1.8),vec2(.23,.16),5);
    if(type==2){ if(length(q-vec2(.1,1.73))<.05) { h.part=8; } }
    if(shield>.5) ell(h,q,vec2(-.28,1.0),vec2(.2,.32),7);
    // front arm + weapon
    float a=atk>0.?1.-pow(1.-atk,2.5):0.;
    float th0=.35+sin(ph)*.18*mv;
    float ang=atk>0.?mix(2.7,-.35,a):th0;
    vec2 sf=vec2(.22,1.38), hand=sf+.5*vec2(sin(ang),-cos(ang));
    if(wpn>.5){
      float wa=ang+(atk>0.?.5:1.25);
      wdir=vec2(sin(wa),-cos(wa));
      float len=wpn<1.5?1.05:wpn<2.5?.8:wpn<3.5?.5:wpn<4.5?.8:1.5;
      vec2 tip=hand+wdir*len;
      vec2 base=wpn>4.5?hand-wdir*.5:hand-wdir*.1;
      cap(h,q,base,tip,.05,6);
      if(wpn>1.5&&wpn<2.5) ell(h,q,hand+wdir*.68+vec2(wdir.y,-wdir.x)*.12,vec2(.17,.17),6);
      if(wpn>3.5&&wpn<4.5) ell(h,q,tip,vec2(.14,.14),6);
      if(wpn>4.5&&length(q-tip)<.13) h.part=11;
      if(atk>.08&&atk<.75){
        vec2 v=q-sf; float r=length(v), an=atan(v.x,-v.y);
        if(r>.55&&r<.6+len&&an>ang&&an<ang+1.3&&h.part==0) { h.part=9; }
      }
    }
    cap(h,q,sf,hand,.1*th,2);
  } else if(type==3){
    float sq=.14*sin(ph*2.);
    ell(h,q,vec2(0,.42+max(0.,sin(ph))*.25),vec2(.62*(1.+sq),.46*(1.-sq)),10);
    vec2 e=q-vec2(.18,.55+max(0.,sin(ph))*.25);
    if(length(e)<.06||length(e-vec2(-.2,0))<.06) h.part=8;
  } else if(type==4){
    float fy=1.35+sin(ph)*.18;
    ell(h,q,vec2(0,fy),vec2(.2,.22),11);
    vec2 v=q-vec2(0,fy);
    bool tail=v.y<0.&&v.y>-1.1&&abs(v.x+sin(v.y*4.+ph*2.)*.12)<.16*(1.+v.y);
    if(tail&&h.part==0) h.part=9;
  } else if(type==5){
    cap(h,q,vec2(-.38,.3),vec2(.38,.3),.26,12);
    if(atk>.5) cap(h,q,vec2(-.38,.85),vec2(.38,.85),.12,13);
    else cap(h,q,vec2(-.38,.6),vec2(.38,.6),.12,13);
    if(atk>.5&&abs(q.x)<.3&&q.y>.5&&q.y<.66) h.part=14;
  } else if(type==6){
    float b=.25+sin(ph)*.08;
    if(length((q-vec2(0,b))*vec2(1.,1.3))<.2) h.part=14;
  }
  return h;
}

void main(){
  vec2 cell=floor(gl_FragCoord.xy);
  vec2 S=uCamS+((cell+.5)*uCell-uRes*.5)/uPPU;
  vec2 wc=floor(S*uPPU/uCell+.5);
  float rnd=hf(ivec2(wc),71), rnd2=hf(ivec2(wc),93), t=uTime;
  vec3 L=uSunDir; L.z=max(L.z,.13); L=normalize(L);

  vec3 P, ti; vec2 tc;
  int kind=march(S,P,ti,tc);
  vec4 Hp=Hs(P.xy), Bp=Bt(P.xy);
  int mat=int(Bp.g*255.+.5);
  bool front=false;
  if(kind==1||kind==2){ vec3 t2; vec2 c2; front=solid(P+vec3(0,0,.3),t2,c2)==kind; }

  float sh=kind==4?max(shadowAt(P,L,1.1,.82),.3):shadowAt(P,L,.3,.62);
  // cloud shadows drift across the land
  float cl=smoothstep(.45,.8,fbm(P.xy*.025+t*vec2(.012,.006)))*uCloud;
  sh*=1.-cl*.6;
  // figure blob shadows on the ground
  if(kind==0){
    for(int i=0;i<64;i++){ if(i>=uNF) break;
      vec4 A=texelFetch(uD,ivec2(i,0),0), B=texelFetch(uD,ivec2(i,1),0);
      if(B.x>5.5) continue;
      vec2 d=(P.xy-A.xy-L.xy*.35)*vec2(1.,1.8);
      sh*=mix(.4,1.,smoothstep(.25,.6,length(d)));
    }
  }

  vec3 col=vec3(0), emis=vec3(0), n=vec3(0,0,1), alb=vec3(.5);
  int g=0;
  float ao=1.;
  vec3 spl; vec3 pl;
  float ffNear; vec3 ffc; vec3 ff=fireflies(P,t,ffNear,ffc);

  if(kind==1){
    float e=.22;
    float hx=rockH(P.xy+vec2(e,0))-rockH(P.xy-vec2(e,0)), hy=rockH(P.xy+vec2(0,e))-rockH(P.xy-vec2(0,e));
    float rn=fbm(P.xy*.8+P.z*.3);
    if(!front){
      n=normalize(vec3(-hx,-hy,2.*e));
      alb=mix(vec3(.27,.28,.31),vec3(.44,.42,.38),rn);
      alb=mix(alb,vec3(.18,.3,.14),smoothstep(.55,.75,vn(P.xy*.5))*smoothstep(3.,1.,P.z));
      if(P.z>4.3) alb=mix(alb,vec3(.9,.93,1.),smoothstep(4.3,4.9,P.z+rn));
    } else {
      vec2 gd=vec2(hx,hy); gd=length(gd)>.01?normalize(gd):vec2(0,1);
      n=normalize(vec3(-gd.x*.8,-1.,.12));
      alb=mix(vec3(.22,.22,.25),vec3(.36,.34,.31),rn)*(.78+.22*sin(P.z*8.+vn(P.xy*2.)*4.));
      ao=.5+.5*smoothstep(0.,1.3,P.z);
    }
    pl=pointLights(P,n,spl);
    col=alb*(uAmb*ao*(.55+.45*max(n.z,0.))+uSunCol*max(dot(n,L),0.)*sh+pl+ff);
    vec3 ct=tm(col); float l=lum(ct);
    g = front ? pick(G_CLIFF,G_CLIFF_N,l*1.6+(rnd-.5)*.15) : pick(G_ROCK,G_ROCK_N,l*1.5+(rnd-.5)*.12);
  } else if(kind==2){
    int v=int(Bp.b*255.+.5);
    if(mat==6){ // ruin: stone blocks
      float row=floor(P.z*2.6);
      vec2 bq=vec2(P.x*1.5+mod(row,2.)*.5+P.y*.4,P.z*2.6);
      bool mortar=fract(bq.x)<.14||fract(bq.y)<.2;
      alb=vec3(.38,.37,.35)*(.8+.4*h21(floor(bq)));
      alb=mix(alb,vec3(.16,.3,.13),smoothstep(.55,.8,vn(P.xy*1.3+P.z)));
      if(front){ n=vec3(0,-1,.05); ao=.55+.45*smoothstep(0.,1.2,P.z); if(mortar) alb*=.45; }
      pl=pointLights(P,n,spl);
      col=alb*(uAmb*ao*(.55+.45*max(n.z,0.))+uSunCol*max(dot(n,L),0.)*sh+pl+ff);
      float l=lum(tm(col));
      g = !front ? (l<.08?G_RAMP+1:G_BRICK+2) : (mortar ? (fract(bq.y)<.2?G_BRICK+4:G_RAMP+2) : (l<.1?G_RAMP+3:G_BRICK+3));
    } else if(mat==13){ // lantern post
      alb=vec3(.2,.14,.09); n=vec3(0,-1,0);
      pl=pointLights(P,n,spl);
      col=alb*(uAmb+uSunCol*max(dot(n,L),0.)*sh+pl);
      g=G_PLANK;
    } else { // house
      bool alongX=(v&1)==0; int cid=v>>1;
      bool roof=P.z>2.28||!front;
      if(roof){
        float gx=bldH(P.xy+vec2(1,0))-bldH(P.xy-vec2(1,0)), gy=bldH(P.xy+vec2(0,1))-bldH(P.xy-vec2(0,1));
        n=normalize(vec3(-gx*.45,-gy*.45,1.));
        if(front) n=normalize(vec3(0,-1,.4));
        vec3 rc=cid==1?vec3(.5,.2,.13):cid==2?vec3(.26,.29,.35):vec3(.6,.48,.26);
        float rows=fract((alongX?P.y:P.x)*2.2);
        alb=rc*(.75+.25*h21(floor(P.xy*vec2(2.2,1.)))) *(rows<.25?.7:1.);
        pl=pointLights(P,n,spl);
        col=alb*(uAmb*(.55+.45*n.z)+uSunCol*max(dot(n,L),0.)*sh+pl+ff);
        float l=lum(tm(col));
        if(l<.04) g=G_RAMP+1;
        else if(alongX) g = rows<.25 ? G_BRICK+4 : (abs(gy)<.05 ? G_ROOF : (fract(P.x*1.6+floor((alongX?P.y:P.x)*2.2)*.5)<.5 ? G_ROOF+3 : G_ROOF+4));
        else g = abs(gx)<.05 ? G_ROOF : (gx>0. ? G_ROOF+1 : G_ROOF+2);
      } else {
        n=vec3(0,-1,.05);
        float beam=fract(P.x*.5);
        bool isBeam=beam<.12||P.z<.25||abs(P.z-1.2)<.08;
        bool win=P.z>.85&&P.z<1.75&&fract(P.x*.5+.5)>.35&&fract(P.x*.5+.5)<.75&&h21(floor(P.xy*.5))>.25;
        alb=isBeam?vec3(.25,.16,.09):vec3(.66,.6,.5);
        ao=.6+.4*smoothstep(0.,1.,P.z);
        pl=pointLights(P,n,spl);
        col=alb*(uAmb*ao+uSunCol*max(dot(n,L),0.)*sh+pl+ff);
        float l=lum(tm(col));
        g = isBeam ? G_PLANK : (l<.06 ? G_RAMP+1 : G_PLANK+1);
        if(win){
          float lit=uNight*step(.3,h21(floor(P.xy*.5)+3.));
          vec3 wl=vec3(1.,.68,.32)*(.9+.1*sin(t*3.+P.x));
          col=mix(vec3(.04,.05,.07)+uSky*.15,wl*1.6,lit);
          emis+=wl*lit*.9;
          g=G_PLANK+2;
        }
      }
    }
  } else if(kind==3){
    alb=vec3(.24,.16,.1)*(.8+.4*fract(P.z*3.));
    n=normalize(vec3(sign(P.x-tc.x)*.7,-.7,0.));
    pl=pointLights(P,n,spl);
    col=alb*(uAmb*.8+uSunCol*max(dot(n,L),0.)*sh+pl+ff);
    float l=lum(tm(col));
    g=l<.04?G_RAMP+1:(P.x<tc.x-.05?G_CLIFF+4:(P.x>tc.x+.05?G_CLIFF+5:G_CLIFF+4));
  } else if(kind==4){
    float leaf=fbm(P.xy*1.9+tc+P.z);
    if(ti.x>.5){
      n=normalize(vec3((P.xy-tc)*1.1,.6+leaf*.4));
      alb=mix(vec3(.04,.14,.1),vec3(.12,.3,.2),leaf);
    } else {
      n=normalize(vec3((P.xy-tc)/ti.z,(P.z-ti.y)*1.5/ti.z+.15)+vec3(leaf-.5)*.6);
      float autumn=step(.88,h21(floor(tc)));
      alb=mix(vec3(.05,.17,.08),vec3(.17,.38,.17),leaf);
      alb=mix(alb,mix(vec3(.45,.2,.05),vec3(.75,.5,.1),leaf),autumn*.85);
    }
    pl=pointLights(P,n,spl);
    float trans=max(dot(-n,L),0.)*.25;
    ao=ti.x>.5?.55+.45*clamp((P.z-.7)/(ti.y-.7)+.3,0.,1.):.45+.55*clamp(n.z+.25,0.,1.);
    col=alb*ao*(uAmb*(.6+.5*max(n.z,0.))+uSunCol*(max(dot(n,L),0.)+trans)*sh+pl*.7+ff*.7);
    float l=lum(tm(col));
    if(ti.x>.5) g=pick(G_PINE,G_PINE_N,l*2.2+(rnd-.5)*.2);
    else g = leaf>.62&&rnd>.45 ? G_LEAF+5+int(rnd2*3.) : pick(G_LEAF,5,l*3.6);
  } else {
    // ---------- ground ----------
    float e=.6;
    float ex=Hs(P.xy+vec2(e,0)).a-Hs(P.xy-vec2(e,0)).a, ey=Hs(P.xy+vec2(0,e)).a-Hs(P.xy-vec2(0,e)).a;
    n=normalize(vec3(-ex*6.,-ey*6.,1.));
    float occ=max(max(rockH(P.xy+vec2(.8,0)),rockH(P.xy+vec2(-.8,0))),max(rockH(P.xy+vec2(0,.8)),bldH(P.xy+vec2(0,.9))));
    occ=max(occ,max(bldH(P.xy+vec2(.9,0)),bldH(P.xy-vec2(.9,0))));
    ao=1.-.45*smoothstep(0.,1.6,occ);
    pl=pointLights(P,n,spl);
    vec3 irr=uAmb*ao*(.55+.45*n.z)+uSunCol*max(dot(n,L),0.)*sh+pl+ff;
    float wind=sin(dot(P.xy,vec2(.35,.18))-t*1.7+vn(P.xy*.2+t*.1)*3.);
    float wet=uWet;
    float wdep=Hp.g;
    if(wdep>.3&&mat!=11){
      // water: waves, sky reflection, sun/moon glints
      float w1=vn(P.xy*vec2(.7,2.2)+vec2(t*.35,t*.1)), w2=vn(P.xy*vec2(1.6,3.)-vec2(t*.2,t*.4));
      vec3 wn=normalize(vec3((w1-.5)*.6,(w2-.5)*.6-.2,1.));
      vec3 deep=mix(vec3(.03,.1,.14),vec3(.01,.04,.08),smoothstep(.3,1.,wdep));
      float fres=.25+.35*(1.-wn.z);
      float sp=pow(max(dot(reflect(-L,wn),vec3(0,-.55,.83)),0.),60.)*sh;
      col=deep*(uAmb*.6+uSunCol*.3*sh)+uSky*fres*.45+uSunCol*sp*2.5+pl*.25+spl*1.5+ff;
      emis+=uSunCol*sp*.8+spl*.6;
      float l=lum(tm(col));
      float wv=w1*.7+w2*.3;
      g = sp>.25 ? G_SPARK : (wv>.62 ? G_WATER+4 : (wv>.5 ? G_WATER+3 : pick(G_WATER,3,l*5.)));
      if(wdep<.42&&rnd>.6){ col+=vec3(.25,.3,.32)*(.6+.4*sin(t*2.+P.x)); g=G_WATER+1; }
      if(uRain>.3&&h21(wc+floor(t*6.))>.94){ g=G_SPARK+2; col+=vec3(.25,.3,.4); }
    } else if(mat==11){ // bridge planks
      alb=vec3(.36,.25,.15)*(fract(P.x*1.6)<.15?.5:1.);
      col=alb*irr;
      g=fract(P.x*1.6)<.15?G_PLANK:G_PLANK+1;
    } else if(mat==2||mat==8||mat==12){ // road, plaza, ruin floor
      if(mat==2){
        alb=mix(vec3(.3,.24,.17),vec3(.42,.35,.25),fbm(P.xy*1.4));
        alb*=1.-wet*.35;
        col=alb*irr+uSky*wet*.15;
        float l=lum(tm(col));
        g=pick(G_DIRT,G_DIRT_N,l*3.+(rnd-.5)*.25);
      } else {
        float row=floor(P.y*1.1);
        vec2 cq=vec2(P.x*.9+mod(row,2.)*.5+vn(P.xy*.7)*.25,P.y*1.1);
        bool gap=fract(cq.x)<.1||fract(cq.y)<.12;
        float stn=hf(ivec2(floor(cq)),5);
        alb=(mat==8?vec3(.42,.4,.37):vec3(.3,.31,.3))*(.75+.4*stn);
        if(mat==12) alb=mix(alb*.75,vec3(.13,.24,.1),smoothstep(.45,.75,vn(P.xy*.9)));
        if(gap) alb*=.45;
        alb*=1.-wet*.3;
        col=alb*irr+uSky*wet*.12;
        float l=lum(tm(col));
        g= gap ? G_GRASS : (l<.05 ? G_RAMP+1 : (l<.1 ? G_RAMP+2 : (stn>.6 ? G_RAMP+4 : G_RAMP+3)));
        if(!gap&&rnd2>.9) g=G_DIRT+2;
      }
      if(uRain>.3&&h21(wc+floor(t*5.))>.96){ g=G_SPARK+2; col+=vec3(.25,.3,.4); }
    } else if(mat==3||wdep>.12){ // sand + shore
      alb=mix(vec3(.55,.5,.38),vec3(.68,.62,.48),fbm(P.xy*2.));
      alb*=1.-smoothstep(.12,.3,wdep)*.4-wet*.25;
      col=alb*irr;
      float l=lum(tm(col));
      g=pick(G_DIRT,4,l*2.6+(rnd-.5)*.3);
    } else if(mat==10){ // crop field
      bool rowc=fract(P.y*1.25)<.55;
      float sway=wind*.8+(rnd2-.5)*.6;
      alb=rowc?mix(vec3(.6,.5,.18),vec3(.75,.65,.25),rnd):vec3(.26,.19,.12);
      col=alb*irr;
      float l=lum(tm(col));
      g=rowc?(l<.05?G_RAMP+1:(sway>.4?G_GRASS+5:(sway<-.4?G_GRASS+6:G_CROP+int(rnd*2.)))):G_DIRT+1;
    } else {
      // grass / forest floor / meadow
      bool forest=mat==1;
      float gn=fbm(P.xy*.22);
      float el=Hp.a;
      vec3 a1=forest?vec3(.1,.17,.07):vec3(.09,.26,.09), a2=forest?vec3(.2,.24,.1):vec3(.25,.48,.17);
      alb=mix(a1,a2,gn)*(.65+.7*rnd);
      alb=mix(alb,vec3(.3,.3,.15),smoothstep(.5,.62,el)*.5);
      alb*=1.-wet*.25;
      col=alb*irr*(.85+.3*wind*rnd2);
      float l=lum(tm(col));
      float lean=wind*.8+(rnd2-.5)*1.1;
      if(forest){
        g = l<.03 ? G_GRASS : (l<.07 ? G_GRASS+1+int(rnd*2.) : (rnd>.8 ? G_LEAF+3 : (rnd>.55 ? G_GRASS+3 : G_DIRT+3)));
        if(rnd>.997){ // glowing mushrooms
          vec3 mc=vec3(.3,.8,1.);
          col=mc*(.12+uNight*.55); emis+=mc*uNight*.25; g=G_MISC+2;
        }
      } else {
        if(l<.025) g=G_GRASS;
        else if(l<.06) g=G_GRASS+1+int(rnd*2.);
        else g = lean>.35 ? G_GRASS+5 : (lean<-.35 ? G_GRASS+6 : (rnd>.85 ? G_GRASS+7 : G_GRASS+4));
        float fl=vn(P.xy*.33+5.);
        float fth = mat==9 ? .35 : .68;
        if(fl>fth && rnd>(mat==9?.55:.8)){
          float hue=vn(P.xy*.12+11.);
          vec3 fc=hue>.66?vec3(.85,.85,1.):hue>.33?vec3(.62,.42,.95):vec3(.95,.75,.25);
          col=fc*irr*1.3;
          g=G_FLOWER+int(rnd2*4.);
        }
      }
    }
  }

  // ---------- light sources drawn as glyphs ----------
  for(int i=0;i<32;i++){
    if(i>=uNL) break;
    vec4 a=texelFetch(uD,ivec2(i,6),0), c=texelFetch(uD,ivec2(i,7),0);
    int ty=int(c.a+.5);
    vec2 base=toS(vec3(a.xy,0.));
    vec2 q=S-base; q.y/=ZS;
    if(abs(q.x)>1.2||q.y<-.5||q.y>6.) continue;
    bool behind=P.z>.3&&P.y<a.y;
    if(behind) continue;
    if(ty==1||ty==2){
      float fs=ty==1?1.:.6;
      float fh=1.25*fs;
      if(q.y>-.15&&q.y<.12&&abs(q.x)<.6*fs&&ty==1){ col=vec3(.22,.13,.07)*(uAmb+vec3(1.,.5,.2)); g=G_PLANK+1; }
      float u=q.y/fh;
      float wdt=.42*fs*(1.-u)*(.75+.5*vn(vec2(q.x*3.,q.y*3.-t*5.)));
      if(u>0.&&u<1.&&abs(q.x)<wdt){
        vec3 fc=ty==1?mix(vec3(1.,.85,.4),vec3(.9,.25,.05),u):mix(vec3(.6,.85,1.),vec3(.2,.35,1.),u);
        col=fc*2.2; emis+=fc*1.4;
        g=pick(G_FIRE,G_FIRE_N,vn(vec2(q.x*5.,q.y*4.-t*6.)));
      }
      if(ty==1&&u>1.&&q.y<5.){
        float qz=q.y-fh;
        float sx=q.x-sin(qz*1.1-t*.7)*.25*qz;
        float dsm=(1.-qz/4.)*vn(vec2(sx*2.5,qz*1.6-t*.9));
        if(abs(sx)<.25+qz*.18&&dsm>.32){ col=mix(col,vec3(.35,.36,.4)*(uAmb*2.+.3),.8); g=pick(G_SMOKE,G_SMOKE_N,dsm*1.3); }
      }
    } else if(ty==0){
      vec2 lq=S-toS(a.xyz); lq.y/=ZS;
      if(length(lq*vec2(1.,.8))<.22){ col=c.rgb*2.*(.4+.6*uNight); emis+=c.rgb*uNight*1.2; g=G_SPARK; }
    }
  }

  // ---------- figures (y-sorted billboards with depth against the terrain) ----------
  float best=1e9; float edge=1e9;
  for(int i=0;i<64;i++){
    if(i>=uNF) break;
    vec4 A=texelFetch(uD,ivec2(i,0),0), B=texelFetch(uD,ivec2(i,1),0);
    vec4 C=texelFetch(uD,ivec2(i,2),0);
    float sc=C.w;
    vec2 base=toS(vec3(A.xy,A.z));
    vec2 q=(S-base); q.y/=ZS; q/=sc; q.x*=A.w;
    if(abs(q.x)>2.2||q.y<-.3||q.y>3.) continue;
    if(A.y>=best) continue;
    if(P.z>.25&&P.y<A.y-.05) continue; // terrain in front
    vec4 D=texelFetch(uD,ivec2(i,3),0), E=texelFetch(uD,ivec2(i,4),0), F=texelFetch(uD,ivec2(i,5),0);
    int type=int(B.x+.5);
    vec2 wdir;
    FH h=figure(q,type,B.y,B.z,F.x,F.y,D.w,E.w,wdir);
    if(h.part==0){ if(type<5) edge=min(edge,h.d); continue; }
    best=A.y;
    vec3 fn=normalize(vec3(h.nrm.x*A.w,-sqrt(max(0.,1.-dot(h.nrm,h.nrm)))-.2,h.nrm.y));
    vec3 FP=vec3(A.xy,1.);
    vec3 fsp; vec3 fpl=pointLights(FP+vec3(0,-.3,0),fn,fsp);
    float fsh=shadowAt(FP,L,.3,.7)*(1.-cl*.6);
    vec3 irr=uAmb*(.6+.4*max(fn.z,0.))+uSunCol*max(dot(fn,L),0.)*fsh+fpl+ff;
    float rim=pow(1.-max(-fn.y,0.),2.)*.6;
    vec3 fa=C.rgb; int gs=G_BODY; int gn=G_BODY_N; vec3 fe=vec3(0);
    int p=h.part;
    if(p==1) fa=D.rgb*.55;
    else if(p==2) fa=type==2?C.rgb:C.rgb*.8;
    else if(p==15) fa=D.rgb*.45;
    else if(p==4) fa=type==2?C.rgb:vec3(.82,.64,.52);
    else if(p==5) fa=D.rgb;
    else if(p==7){ fa=D.rgb*.9; }
    else if(p==6){ fa=E.rgb; }
    else if(p==8){ fe=type==2?vec3(1.,.25,.1):vec3(.02); fa=fe; }
    else if(p==9){ fe=type==4?C.rgb*.8:E.rgb*.6; fa=fe; }
    else if(p==10){ fa=C.rgb; fe=C.rgb*.12; }
    else if(p==11){ fa=C.rgb; fe=C.rgb*1.6; }
    else if(p==12){ fa=vec3(.36,.22,.11)*(abs(q.x)<.06||abs(abs(q.x)-.3)<.05?1.7:1.); }
    else if(p==13){ fa=vec3(.42,.27,.13); }
    else if(p==14){ fa=C.rgb; fe=C.rgb*(.7+.3*sin(t*5.+A.x)); }
    col=fa*(irr+rim*(uAmb+uSunCol*.3))+fe;
    col=mix(col,vec3(2.),B.w);
    emis=fe;
    float l=lum(tm(col));
    if(p==6){
      vec2 sd=vec2(wdir.x*A.w,wdir.y);
      float an=abs(sd.x)/(abs(sd.y)+1e-3);
      g = an>2.4 ? G_WEAP+3 : (an<.42 ? G_WEAP : (sd.x*sd.y>0. ? G_WEAP+1 : G_WEAP+2));
      col+=E.rgb*.25;
    } else if(p==8) g=G_SPARK+3;
    else if(p==9) g=type==4?G_SPARK+3:G_SPARK+1;
    else if(p==11) g=G_SPARK;
    else if(p==14) g=G_MISC+3;
    else if(p==12||p==13) g=pick(G_PLANK,3,l*2.5);
    else if(p==3&&type==2) g=fract(q.y*7.)<.5?G_RAMP+4:G_RAMP+1;
    else if(p==10) g=pick(G_SMOKE,G_SMOKE_N,l*2.+.2);
    else g=pick(gs,gn,l*1.45+.1+(rnd-.5)*.12);
  }

  if(best>1e8&&edge<.11){ col*=.35; g=g==0?0:G_RAMP+1; }
  // ---------- particles ----------
  for(int i=0;i<128;i++){
    if(i>=uNP) break;
    vec4 a=texelFetch(uD,ivec2(i,8),0), c=texelFetch(uD,ivec2(i,9),0);
    vec2 d=S-toS(a.xyz); d.y/=ZS;
    if(length(d)<a.w){ col=c.rgb; emis=c.rgb*.7; g=int(c.a+.5); }
  }
  if(ffNear<.28){ g=ffNear<.14?G_SPARK:G_SPARK+3; col=vec3(.85,1.,.55)*1.6; emis=vec3(.6,.9,.3); }

  // ---------- rain streaks ----------
  if(uRain>.05){
    float colid=floor(cell.x-cell.y*.3);
    float sy=cell.y+t*42.+h21(vec2(colid,1.))*97.;
    float sg=floor(sy/10.), f=fract(sy/10.);
    if(h21(vec2(colid,sg))>1.-.2*uRain&&f<.22){ g=G_RAIN; col=mix(col,(uAmb+uSunCol*.3)*1.4+vec3(.08),.75); }
  }

  o0=vec4(tm(col),float(g)/255.);
  o1=vec4(1.-exp(-emis*1.3),1.);
}
`;

const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene, uEmis, uAtlas;
uniform vec2 uRes, uCell, uGrid, uCamS;
uniform float uPPU, uTime, uRaw, uFlash, uMist, uNight, uBloom;
uniform vec3 uAmb;
out vec4 o;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
void main(){
  ivec2 fc=ivec2(gl_FragCoord.xy), cs=ivec2(uCell);
  ivec2 cell=fc/cs, lc=fc-cell*cs;
  vec4 s=texelFetch(uScene,cell,0);
  int idx=int(s.a*255.+.5);
  float g=texelFetch(uAtlas,ivec2(idx*cs.x+lc.x,cs.y-1-lc.y),0).r;
  vec3 c=uRaw>.5?s.rgb:s.rgb*g*1.75+s.rgb*.15;
  vec2 uv=gl_FragCoord.xy/(uGrid*uCell);
  vec3 bl=textureLod(uEmis,uv,1.).rgb*.35+textureLod(uEmis,uv,2.).rgb*.5+textureLod(uEmis,uv,3.).rgb*.65+textureLod(uEmis,uv,4.5).rgb*.8;
  c+=bl*uBloom;
  // drifting ground mist: a soft layer above the glyphs
  vec2 S=uCamS+(gl_FragCoord.xy-uRes*.5)/uPPU;
  float m=vn(S*.08+vec2(uTime*.05,0.))*.6+vn(S*.21-vec2(uTime*.08,uTime*.02))*.4;
  c+=(uAmb*1.6+vec3(.02))*smoothstep(.45,.9,m)*uMist*.35;
  c+=vec3(.7,.75,.9)*uFlash;
  vec2 q=gl_FragCoord.xy/uRes;
  c*=1.-.6*pow(length(q-.5)*1.2,2.4);
  c+=(h21(gl_FragCoord.xy+fract(uTime)*91.)-.5)*.02;
  o=vec4(c,1.);
}
`;
