const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/live-tv.js'),'utf8');
function harness(options={}) {
  let timers=new Map(),next=0,launches=[],tunes=[];
  const scope={TV:{isTV:true,launch:(id,done)=>{launches.push(id);done(null);}},
    tizen:{tvchannel:{getCurrentChannel:()=>({major:options.current||1,minor:0}),tune:(target,listener,error,window)=>{tunes.push({target,window});options.tune?.(scope,listener,error);}}},
    setTimeout:(fn,delay)=>{const id=++next;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  scope.window=scope;vm.runInNewContext(source,scope);
  return {scope,timers,launches,tunes,tick:delay=>{const found=[...timers].find(([id,t])=>t.delay===delay);assert.ok(found,`timer ${delay}`);timers.delete(found[0]);found[1].fn();}};
}
const channel={id:'aljazeera',provider:'tvplus',major:4564};
test('silent native tune callback is confirmed by the actual channel before one viewer launch',()=>{
  const h=harness();let result;
  h.scope.FrameLiveTV.tune(channel,e=>result=e);
  assert.equal(h.launches.length,0);assert.equal(h.tunes.length,1);
  h.scope.tizen.tvchannel.getCurrentChannel=()=>({major:4564,minor:0});h.tick(400);
  assert.equal(result,null);assert.deepEqual(h.launches,['org.tizen.tv-viewer']);assert.equal(h.timers.size,0);
});
test('success callback cannot turn the wrong current channel into a successful shortcut',()=>{
  const h=harness({tune:(_s,l)=>l.onsuccess()});let result;
  h.scope.FrameLiveTV.tune(channel,e=>result=e);assert.equal(h.launches.length,0);h.tick(8000);
  assert.match(result.message,/confirmé/);assert.equal(h.launches.length,0);assert.equal(h.timers.size,0);
});
test('duplicate native callbacks open the viewer at most once',()=>{
  let listener;const h=harness({current:4564,tune:(_s,l)=>{listener=l;}});let count=0;
  h.scope.FrameLiveTV.tune(channel,()=>count++);listener.onsuccess();listener.onsuccess();
  assert.equal(h.launches.length,1);assert.equal(count,1);assert.equal(h.timers.size,0);
});
test('native failure has no fallback channel or provider launch and releases timers',()=>{
  const h=harness({tune:(_s,_l,error)=>error({message:'unavailable'})});let result;
  h.scope.FrameLiveTV.tune(channel,e=>result=e);assert.match(result.message,/unavailable/);assert.equal(h.launches.length,0);assert.equal(h.timers.size,0);
});
test('unavailable or malformed channel never invokes native APIs',()=>{
  const h=harness();for(const c of [{provider:'canal',major:4564},{provider:'tvplus',major:NaN},null])h.scope.FrameLiveTV.tune(c,e=>assert.ok(e));
  assert.equal(h.tunes.length,0);assert.equal(h.launches.length,0);
});
test('the preview records a simulated channel action and never claims native playback',()=>{
  const h=harness();h.scope.TV.isTV=false;let result;h.scope.FrameLiveTV.tune(channel,(e,r)=>{assert.equal(e,null);result=r;});
  assert.equal(result.preview,true);assert.equal(h.tunes.length,0);assert.equal(h.scope.__previewEvents[0].major,4564);
});
test('a second tune request cannot race the pending channel selection',()=>{
  const h=harness();let second;
  h.scope.FrameLiveTV.tune(channel,()=>{});h.scope.FrameLiveTV.tune({...channel,major:4002},e=>second=e);
  assert.match(second.message,/déjà/);assert.equal(h.tunes.length,1);h.tick(8000);assert.equal(h.timers.size,0);
});
