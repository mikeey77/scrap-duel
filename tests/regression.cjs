const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const source=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
new vm.Script(source);

function runtime(options={}){
  let clock=0,tid=0;const elements=new Map(),timers=new Map(),rafs=[],events=new Map(),storage=new Map();
  const gradient={addColorStop(){}};
  const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createPattern:()=>({}),measureText:t=>({width:String(t).length*7}),getImageData:()=>({data:new Uint8ClampedArray(16)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
  class El{
    constructor(id=''){this.id=id;this.tagName='DIV';this.hidden=true;this.style={};this.dataset={};this.attrs={};this.listeners={};this.value='';this.clientWidth=720;this.classList={add(){},remove(){},toggle(){}};}
    set innerHTML(h){this.html=h;for(const m of h.matchAll(/id="([^"]+)"/g)){const e=new El(m[1]);e.hidden=false;elements.set(m[1],e);}}
    get innerHTML(){return this.html||'';}
    addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
    setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
    getContext(){return ctx;}toDataURL(){return 'data:image/png;base64,AA';}
    getBoundingClientRect(){return {width:720,height:600,left:0,top:0};}
    appendChild(e){elements.set(e.id,e);}focus(){}setSelectionRange(){}setPointerCapture(){}
    click(){this.onclick?.({target:this});for(const f of this.listeners.click||[])f({target:this});}
  }
  for(const m of html.matchAll(/id="([^"]+)"/g))elements.set(m[1],new El(m[1]));
  const doc={hidden:false,querySelector:s=>elements.get(s.slice(1))||(elements.set(s.slice(1),new El(s.slice(1))),elements.get(s.slice(1))),querySelectorAll:()=>[],createElement:()=>new El(),head:new El('head'),addEventListener(){},fonts:null,documentElement:{clientWidth:1440,clientHeight:900}};
  const context={console,document:doc,performance:{now:()=>clock},crypto:crypto.webcrypto,Math,Map,Set,WeakMap,JSON,Promise,Uint8Array,Uint8ClampedArray,Float32Array,Image:class{},devicePixelRatio:1,innerWidth:1440,innerHeight:900,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    matchMedia:()=>({matches:false,addEventListener(){}}),
    addEventListener:(k,f)=>{(events.get(k)||events.set(k,[]).get(k)).push(f);},
    requestAnimationFrame:f=>{rafs.push(f);return rafs.length;},cancelAnimationFrame(){},
    setTimeout:(f,ms=0)=>{timers.set(++tid,{f,at:clock+ms});return tid;},clearTimeout:id=>timers.delete(id),
    setInterval:(f,ms)=>{timers.set(++tid,{f,at:clock+ms,ms});return tid;},clearInterval:id=>timers.delete(id),
    __SD_TEST__:true,...options};context.window=context;
  vm.createContext(context);vm.runInContext(source,context,{timeout:15000});
  return {api:context.__SD,context,elements,timers,rafs,
    advance(ms){clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){if(t.ms)t.at=clock+t.ms;else timers.delete(id);t.f();}},
    event(k,e){for(const f of events.get(k)||[])f(e);}};
}
let passed=0;
function test(name,f){try{f();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}}
const r=runtime(),a=r.api,G=a.G;
const start=()=>{a.startMatch('solo');a.openBuild();};
test('catalog loads and every starter is connected, usable and owned',()=>{
  const signatures=new Set();
  for(let n=0;n<200;n++){
    start();assert.equal(G.base.size+G.top.size,23);assert(a.designConnected(G.base));assert.equal(a.blockedList().length,0);
    const used={};for(const e of [...G.base.values(),...G.top.values()])used[e.id]=(used[e.id]||0)+1;
    for(const [id,count] of Object.entries(used))assert.equal(count,G.inv[id]);
    signatures.add(G.starterGuns.join(','));
  }
  assert(signatures.size>10);assert.equal(a.MODS.length,140);
});
test('all heavy drafted modules include enough free support',()=>{
  for(const m of a.MODS.filter(m=>m.layer==='t'&&m.mnt===2)){
    start();a.takeOption({type:'module',id:m.id,n:2});
    assert.equal(a.draftSupportCount(m.id,2),0);assert(G.inv.girder>=2);
    a.autoPlace(true);assert.equal(a.blockedList().length,0,m.name);
    assert.equal([...G.top.values()].filter(e=>e.id===m.id).length,2,m.name);
  }
});
test('auto-place never creates blocked directional parts',()=>{
  for(let n=0;n<60;n++){
    start();G.inv.spike+=4;G.inv.frame+=3;G.inv.mg=(G.inv.mg||0)+4;
    a.autoPlace(true);assert.equal(a.blockedList().length,0);
    assert(a.designConnected(G.base));
    for(const id of Object.keys(G.inv))assert([...G.base.values(),...G.top.values()].filter(e=>e.id===id).length<=G.inv[id]);
  }
});
test('auto-build creates a connected car and one undo returns the original design',()=>{
  start();G.inv.spike+=6;G.inv.frame+=4;const before=JSON.stringify([[...G.base],[...G.top]]);
  const historyLength=G.hist.length;
  a.autoBuild();assert(a.designConnected(G.base));assert.equal(a.blockedList().length,0);assert.equal(G.hist.at(-1),before);assert.equal(G.hist.length,historyLength+1);
});
test('scoring is one point per round and a double-point finale everywhere',()=>{
  assert.equal(Array.from({length:10},(_,i)=>a.roundPoints(i+1)).reduce((x,y)=>x+y),11);
  assert.equal(a.pointsRemaining(0),11);assert.equal(a.pointsRemaining(1),10);assert.equal(a.pointsRemaining(9),2);assert.equal(a.pointsRemaining(10),0);
});
test('Space fires while J remains a separate jump action',()=>{
  start();G.phase='battle';const b=a.getB();
  // readLocal needs only a car for aim; resetProfile does not start the arena.
  a.setB({touch:false,cars:[],me:0});a.keys.add('Space');assert.equal(a.readLocal().fire,true);
  a.keys.delete('Space');a.keys.add('KeyJ');assert.equal(a.readLocal().fire,false);a.keys.clear();a.setB(b);
});
test('search, rarity, favorites and mount filters combine',()=>{
  start();G.catalogQ='machine';assert(a.catalogMatches(a.MOD.mg));assert(!a.catalogMatches(a.MOD.spike));
  G.catalogQ='';G.catalogRarity='3';assert(!a.catalogMatches(a.MOD.mg));
  G.catalogRarity='all';G.favoritesOnly=true;G.favorites=new Set(['mg']);assert(a.catalogMatches(a.MOD.mg));assert(!a.catalogMatches(a.MOD.pulse));
  G.favoritesOnly=false;G.compatibleOnly=true;assert(a.catalogMatches(a.MOD.mg));assert(!a.catalogMatches(a.MOD.shield));G.compatibleOnly=false;
});
test('weak-link analysis identifies fragile branches',()=>{
  start();G.base=new Map([['0,0',{id:'cockpit',x:0,y:0,rot:0}],['0,-1',{id:'frame',x:0,y:-1,rot:0}],['0,-2',{id:'frame',x:0,y:-2,rot:0}]]);G.top=new Map();
  assert.equal(a.weakLinks().length,1);assert.equal(a.weakLinks()[0].y,-1);
});
test('crate charges once, grants once and skip cannot duplicate rewards',()=>{
  start();const count=()=>Object.values(G.inv).reduce((x,y)=>x+y,0),before=count();
  a.openCrate();assert.equal(G.coins,20);const gained=count();assert(gained>before);
  a.openCrate();assert.equal(G.coins,20);assert.equal(count(),gained);
  r.elements.get('cSkip').click();r.elements.get('cSkip').click();assert.equal(count(),gained);
  r.elements.get('cDone').click();assert(r.elements.get('ovCrate').hidden);
});
test('connection loss preserves the car and pauses instead of ending immediately',()=>{
  start();G.mode='mp';G.started=true;G.phase='battle';a.Net.role='host';a.Net.connected=true;a.Net.conn={close(){}};
  const before=JSON.stringify([...G.base]);a.Net.lost();assert(a.Net.reconnecting);assert.equal(G.phase,'battle');assert.equal(JSON.stringify([...G.base]),before);assert(!r.elements.get('ovReconnect').hidden);
  a.Net.resumeConnection();assert(!a.Net.reconnecting);assert.equal(G.phase,'battle');assert(r.elements.get('ovReconnect').hidden);
});
test('ping and connection quality update from round-trip messages',()=>{
  a.Net.connected=true;a.Net.ping=null;r.advance(50);a.Net.recv({t:'pong',at:0});assert.equal(a.Net.ping,50);a.Net.updateStatus();assert(r.elements.get('netStatus').textContent.includes('50 ms'));
});
test('reconnect timeout ends cleanly without deleting the vehicle',()=>{
  a.Net.role='host';a.Net.conn={close(){}};a.Net.connected=true;a.Net.lost();r.advance(31000);assert.equal(G.phase,'final');assert(!a.Net.reconnecting);assert(G.base.size>0);a.Net.close();
});
test('breaking a connector records the detached branch for replay',()=>{
  start();const v=a.makeCar({base:new Map([['0,0',{id:'cockpit',x:0,y:0,rot:0}],['0,-1',{id:'frame',x:0,y:-1,rot:0}],['0,-2',{id:'frame',x:0,y:-2,rot:0}]]),top:new Map()},0,100,100,0,{tune:[]});
  const b={rec:true,ev:[],fx:[],cars:[v],time:0,objs:[],uidc:0,nums:[],shots:[],debris:[],hitDirs:[]};a.setB(b);
  a.killInst(v,v.insts.find(i=>i.id==='frame'&&i.cells.some(c=>c.gy===-1)));
  assert(b.ev.some(e=>e[0]==='lesson'&&e[4].includes('attached part')));
});
test('release version contains all requested UI affordances',()=>{
  for(const text of ['Skip animation','Firing arcs','Weak links','Search modules','Battle music','Reconnect window expired','LMB/Space','data-k="KeyJ"'])assert(html.includes(text),text);
  assert(!html.includes('round N is worth N points'));
});
test('two peers recover a dropped battle with authoritative score, clock and cooldowns',()=>{
  const host=runtime(),guest=runtime(),h=host.api,g=guest.api;
  for(const x of [h,g]){x.startMatch('solo');x.openBuild();x.G.mode='mp';x.G.started=true;}
  h.Net.role='host';g.Net.role='client';
  function pair(){
    const messages=[];
    const make=peer=>({peer,open:false,handlers:{},on(k,f){this.handlers[k]=f;},send(d){messages.push(()=>this.other.handlers.data?.(JSON.parse(JSON.stringify(d))));},close(){if(!this.open)return;this.open=false;this.handlers.close?.();this.other.open=false;this.other.handlers.close?.();}});
    const hc=make('guest-id'),gc=make('host-id');hc.other=gc;gc.other=hc;
    h.Net.bind(hc);g.Net.bind(gc);hc.open=gc.open=true;hc.handlers.open();gc.handlers.open();
    const flush=()=>{let n=0;while(messages.length){assert(n++<100);messages.shift()();}};flush();return {hc,gc,flush};
  }
  let channel=pair();assert(h.Net.connected&&g.Net.connected);
  const cfg=h.makeCfg(g.myCarCfg());h.toBattle({...cfg,net:'host',me:0});g.toBattle({...cfg,net:'client',me:1});
  h.G.score=[3,1];h.getB().time=12;h.getB().t=78;h.getB().cars[0].insts[0].bcd=16;
  channel.hc.close();assert(h.Net.reconnecting&&g.Net.reconnecting);assert.equal(h.G.phase,'battle');
  channel=pair();assert(!h.Net.reconnecting&&!g.Net.reconnecting);assert.deepEqual([...g.G.score],[1,3]);assert.equal(g.getB().time,12);assert.equal(g.getB().t,78);assert.equal(g.getB().cars[0].insts[0].bcd,16);
  h.Net.close();channel.flush();g.Net.close();
});
test('recovery cannot double-award a completed round or skip a player draft',()=>{
  const rr=runtime(),aa=rr.api;aa.startMatch('solo');aa.openBuild();aa.G.mode='mp';aa.Net.role='client';
  const cfg=aa.makeCfg(aa.myCarCfg());aa.toBattle({...cfg,net:'client',me:1});
  const result={round:1,win:0,why:'test',stats:aa.getB().stats};
  aa.Net.recv({t:'recover',round:2,score:[1,0],sched:aa.G.sched,phase:'build',result,resultScoreIncluded:true});
  assert.equal(aa.G.round,1);assert.deepEqual([...aa.G.score],[0,0]);assert.equal(aa.getB().seq,'end');
  aa.G.phase='result';aa.Net.recv({t:'recover',round:2,score:[1,0],sched:aa.G.sched,phase:'build',result,resultScoreIncluded:true});
  assert.equal(aa.G.round,1);assert.deepEqual([...aa.G.score],[0,1]);
});
test('music schedules sound in battle and stops for pause, recovery and zero volume',()=>{
  let notes=0;
  const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){notes++;},stop(){}});
  class AudioContext {constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination=node();}createGain(){return node();}createDynamicsCompressor(){return node();}createOscillator(){return node();}createBiquadFilter(){return node();}createBufferSource(){return node();}createBuffer(){return {getChannelData:()=>new Float32Array(100)};}resume(){this.state='running';}}
  const rr=runtime({AudioContext}),aa=rr.api;aa.unlock();aa.G.phase='battle';aa.setB({t:90});aa.BattleMusic.update();assert(aa.BattleMusic.timer);assert(notes>0);
  const timer=aa.BattleMusic.timer;aa.BattleMusic.update();assert.equal(aa.BattleMusic.timer,timer);
  aa.getB().paused=true;aa.BattleMusic.update();assert.equal(aa.BattleMusic.timer,null);aa.getB().paused=false;aa.Net.reconnecting=true;aa.BattleMusic.update();assert.equal(aa.BattleMusic.timer,null);
  aa.Net.reconnecting=false;aa.SETTINGS.music=0;aa.BattleMusic.update();assert.equal(aa.BattleMusic.timer,null);
});
console.log(`\n${passed} regression tests passed.`);
