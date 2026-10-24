const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../app/platform.js'),'utf8');

function platform(tizen, search='') {
  const scope={setTimeout,clearTimeout,setInterval,clearInterval,location:{search},tizen};
  scope.window=scope;
  vm.runInNewContext(source,scope);
  return scope.TV;
}
const call=(tv,method,...args)=>new Promise((resolve,reject)=>tv[method](...args,(error,result)=>error?reject(error):resolve(result)));

test('the browser preview is explicit and has six illustrative apps',async()=>{
  const tv=platform();
  assert.equal(tv.isTV,false);
  const apps=await call(tv,'list');
  assert.equal(apps.length,6);
  assert.ok(apps.every(a=>a.id.startsWith('demo.')));
});
test('on a real TV the catalogue comes only from the TV',async()=>{
  const own=[{id:'real.france',name:'france.tv'}];
  const tv=platform({application:{getAppsInfo:ok=>ok(own)}});
  assert.equal(tv.isTV,true);
  assert.equal(await call(tv,'list'),own);
});
test('an unavailable real catalogue is an error, never a fake installed list',async()=>{
  const tv=platform({application:{getAppsInfo:(_ok,no)=>no({message:'denied'})}});
  await assert.rejects(call(tv,'list'),/denied/);
});
test('the read-only catalogue can recover from one startup failure',async()=>{
  let count=0;
  const apps=[{id:'real.netflix',name:'Netflix'}];
  const tv=platform({application:{getAppsInfo:(ok,no)=>{count++;if(count===1)no({message:'starting'});else ok(apps);}}});
  assert.equal(await call(tv,'list'),apps);assert.equal(count,2);
});
test('app launch targets the supplied app once and does not close other apps',async()=>{
  const calls=[];
  const tv=platform({application:{launch:(id,ok)=>{calls.push(id);ok();}}});
  await call(tv,'launch','real.netflix');
  assert.deepEqual(calls,['real.netflix']);
});
test('a rejected launch is returned without a retry or fallback launch',async()=>{
  let count=0;
  const tv=platform({application:{launch:(_id,_ok,no)=>{count++;no({message:'not installed'});}}});
  await assert.rejects(call(tv,'launch','missing.app'),/not installed/);
  assert.equal(count,1);
});
test('the explicit native exit API closes only this app',()=>{
  let exits=0;
  const tv=platform({application:{getCurrentApplication:()=>({exit:()=>{exits++;}})}});
  assert.equal(tv.leave(),true);
  assert.equal(exits,1);
});
test('volume uses the documented Tizen API and never invents a real-TV level',()=>{
  assert.equal(platform({application:{}}).volume(),null);
  let level=45,muted=false;
  const tv=platform({application:{},tvaudiocontrol:{
    getVolume:()=>level,isMute:()=>muted,setVolume:v=>{level=v;},setMute:v=>{muted=v;}
  }});
  assert.equal(tv.volume().volume,45);
  tv.changeAudio('up'); assert.equal(level,50);
  tv.changeAudio('mute'); assert.equal(muted,true);
});
test('HDMI switching is followed by Samsung TV Viewer, without a power action',async()=>{
  const calls=[];
  const tv=platform({application:{launch:(id,ok)=>{calls.push(id);ok();}},tvwindow:{
    setSource:(src,ok,_no,window)=>{calls.push(src.type+' '+src.number+' '+window);ok();}
  }});
  await call(tv,'openSource',{source:{type:'HDMI',number:2}});
  assert.deepEqual(calls,['HDMI 2 MAIN','org.tizen.tv-viewer']);
});
test('HDMI events update the catalogue and are released when monitoring stops',()=>{
  let event,removed=[],reads=0;
  const tv=platform({application:{},systeminfo:{
    getPropertyValue:(property,ok)=>{assert.equal(property,'VIDEOSOURCE');reads++;ok({connected:[{type:'HDMI',number:1,signal:null}],disconnected:[]});},
    addPropertyValueChangeListener:(property,fn)=>{assert.equal(property,'VIDEOSOURCE');event=fn;return 7;},
    removePropertyValueChangeListener:id=>removed.push(id)
  }});
  const seen=[];
  const stop=tv.watchSources((error,value)=>{assert.equal(error,null);seen.push(value);});
  assert.equal(reads,1); assert.equal(seen[0][0].connected,true);
  assert.equal(seen[0][0].name,undefined); // no invented CEC name or power state
  event({connected:[{type:'HDMI',number:2}],disconnected:[{type:'HDMI',number:1}]});
  assert.equal(seen[1][0].connected,false); assert.equal(seen[1][1].connected,true);
  stop();stop(); assert.deepEqual(removed,[7]);
  event({connected:[],disconnected:[]});assert.equal(seen.length,2);
});

test('the stable app identity is read from Tizen only once, not once per catalogue item',()=>{
  let reads=0;
  const tv=platform({application:{getCurrentApplication:()=>{reads++;return {appInfo:{id:'own.FrameHome'}};}}});
  for(let i=0;i<100;i++)assert.equal(tv.selfId(),'own.FrameHome');
  assert.equal(reads,1);
});

test('HDMI notifications and pending reads from before suspension cannot overwrite the resumed state',()=>{
  const events=[],reads=[],seen=[],listeners={};let nextId=0;
  const document={hidden:false,addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>{delete listeners[name];}};
  const scope={setTimeout,clearTimeout,setInterval,clearInterval,location:{search:''},document,
    tizen:{application:{},systeminfo:{
      getPropertyValue:(_name,ok)=>{reads.push(ok);},
      addPropertyValueChangeListener:(_name,fn)=>{events.push(fn);return ++nextId;},
      removePropertyValueChangeListener:()=>{}
    }}};
  scope.window=scope;vm.runInNewContext(source,scope);
  const stop=scope.TV.watchSources((error,value)=>{assert.equal(error,null);seen.push(value.map(s=>s.number).join(','));});
  try {
    document.hidden=true;listeners.visibilitychange();
    document.hidden=false;listeners.visibilitychange();
    reads[1]({connected:[{type:'HDMI',number:2}]});
    assert.deepEqual(seen,['2']);
    reads[0]({connected:[{type:'HDMI',number:1}]});
    events[0]({connected:[{type:'HDMI',number:1}]});
    assert.deepEqual(seen,['2']);
    events[1]({connected:[{type:'HDMI',number:3}]});
    assert.deepEqual(seen,['2','3']);
  } finally { stop(); }
});
