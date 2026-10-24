const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=path.join(__dirname,'../app');
function setup(options={}){
  const images=[];
  function Image(){
    images.push(this);
    if(options.decode)this.decode=()=>new Promise((resolve,reject)=>{this.resolveDecode=resolve;this.rejectDecode=reject;});
  }
  const scope={Image};scope.window=scope;
  for(const file of ['wallpapers-data.js','wallpapers.js']) vm.runInNewContext(fs.readFileSync(path.join(app,file),'utf8'),scope);
  return {wallpapers:scope.FrameWallpapers,images};
}
const at=(hours,minutes=0)=>({getHours:()=>hours,getMinutes:()=>minutes,getSeconds:()=>0});
test('all wallpaper phases and picker thumbnails are bundled locally',()=>{
  const {wallpapers}=setup();
  assert.equal(wallpapers.list().length,2);
  for(const entry of wallpapers.list()) for(const frame of entry.frames){
    assert.match(frame.file,/^assets\/wallpapers\/[a-z0-9-]+\.jpg$/);
    assert.ok(fs.existsSync(path.join(app,frame.file)));
    assert.ok(fs.existsSync(path.join(app,frame.file.replace(/\.jpg$/,'-thumb.jpg'))));
  }
});
test('time selection changes at local boundaries and wraps to night at midnight',()=>{
  const {wallpapers:w}=setup();
  assert.match(w.resolve('coast',at(6,59)).file,/night/);
  assert.match(w.resolve('coast',at(7)).file,/day/);
  assert.match(w.resolve('coast',at(18,59)).file,/day/);
  assert.match(w.resolve('coast',at(19)).file,/night/);
  assert.match(w.resolve('coast',at(0)).file,/night/);
  assert.equal(w.resolve('missing',at(12)).file,null);
});
test('clock refreshes reuse a decoded wallpaper and keep the old image while the next loads',()=>{
  const {wallpapers:w,images}=setup();const el={style:{backgroundImage:'old'}};
  w.apply(el,'coast',at(12));w.apply(el,'coast',at(12,30));
  assert.equal(images.length,1);assert.equal(el.style.backgroundImage,'old');
  images[0].onload();const day=el.style.backgroundImage;
  w.apply(el,'coast',at(13));assert.equal(images.length,1);
  w.apply(el,'coast',at(22));assert.equal(images.length,2);assert.equal(el.style.backgroundImage,day);
  images[1].onload();assert.match(el.style.backgroundImage,/night/);
});
test('a slow earlier decode cannot override a later wallpaper or the plain background',()=>{
  const {wallpapers:w,images}=setup();const el={style:{}};
  w.apply(el,'coast',at(22));const lateFirst=images[0].onload;w.apply(el,'coast',at(12));
  assert.equal(images[0].src,'');assert.equal(images[0].onload,null);
  lateFirst();assert.equal(el.style.backgroundImage,undefined);
  const lateSecond=images[1].onload;w.apply(el,'slate',at(12));lateSecond();
  assert.equal(el.style.backgroundImage,'none');assert.equal(el.style.backgroundColor,'#242a32');
});
test('a failed image leaves the previous background visible without a reload loop',()=>{
  const {wallpapers:w,images}=setup();const el={style:{backgroundImage:'previous'}};
  w.apply(el,'coast',at(12));images[0].onerror();
  assert.equal(el.style.backgroundImage,'previous');assert.equal(images.length,1);
  w.apply(el,'coast',at(12,1));assert.equal(images.length,2);
});
test('returning to the displayed wallpaper cancels a different pending decode',()=>{
  const {wallpapers:w,images}=setup();const el={style:{}};
  w.apply(el,'coast',at(12));images[0].onload();const first=el.style.backgroundImage;
  w.apply(el,'coast',at(22));const late=images[1].onload;w.apply(el,'coast',at(12));late();
  assert.equal(el.style.backgroundImage,first);
});

test('the displayed wallpaper is retained until the asynchronous decode completes',async()=>{
  const {wallpapers:w,images}=setup({decode:true});const el={style:{backgroundImage:'previous'}};
  w.apply(el,'coast',at(12));assert.equal(images[0].decoding,'async');images[0].onload();
  assert.equal(el.style.backgroundImage,'previous');images[0].resolveDecode();await Promise.resolve();
  assert.match(el.style.backgroundImage,/coast-day.jpg/);assert.equal(images[0].onload,null);assert.equal(images[0].onerror,null);
});
test('a decoded stale image cannot replace a newer choice, and obsolete loads are cancelled',async()=>{
  const {wallpapers:w,images}=setup({decode:true});const el={style:{backgroundImage:'previous'}};
  w.apply(el,'coast',at(12));images[0].onload();w.apply(el,'coast',at(22));
  assert.equal(images[0].src,'');images[0].resolveDecode();await Promise.resolve();assert.equal(el.style.backgroundImage,'previous');
  images[1].onload();images[1].resolveDecode();await Promise.resolve();assert.match(el.style.backgroundImage,/coast-night.jpg/);
});
test('decode rejection preserves the old wallpaper and a later refresh can retry',async()=>{
  const {wallpapers:w,images}=setup({decode:true});const el={style:{backgroundImage:'previous'}};
  w.apply(el,'coast',at(12));images[0].onload();images[0].rejectDecode(new Error('decode failed'));await Promise.resolve();
  assert.equal(el.style.backgroundImage,'previous');w.apply(el,'coast',at(12));assert.equal(images.length,2);
});
test('backgrounding cancels pending work while preserving the current image and enables resume',async()=>{
  const {wallpapers:w,images}=setup({decode:true});const el={style:{backgroundImage:'previous'}};
  w.apply(el,'coast',at(12));images[0].onload();w.pause();assert.equal(images[0].src,'');
  images[0].resolveDecode();await Promise.resolve();assert.equal(el.style.backgroundImage,'previous');
  w.apply(el,'coast',at(12));images[1].onload();images[1].resolveDecode();await Promise.resolve();assert.match(el.style.backgroundImage,/coast-day.jpg/);
});
