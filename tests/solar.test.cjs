const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=path.join(__dirname,'../app');
function setup(solar={label:'Test city',latitude:51.5074,longitude:-0.1278,timeZone:'Europe/London'}){const scope={Intl,Date,FrameConfig:{solar}};scope.window=scope;for(const name of ['vendor/suncalc.js','solar.js','wallpapers-data.js','wallpapers.js'])vm.runInNewContext(fs.readFileSync(path.join(app,name),'utf8'),scope);return scope;}
const date=s=>new Date(s);
test('Configured city solar times move with the seasons instead of a fixed daily schedule',()=>{
 const s=setup().FrameSolar;
 for(const [d,rise,set] of [['2026-06-21T12:00:00Z','2026-06-21T03:43:00Z','2026-06-21T20:22:00Z'],['2026-12-21T12:00:00Z','2026-12-21T08:04:00Z','2026-12-21T15:54:00Z']]){
  const t=s.state(date(d));assert.ok(Math.abs(t.sunrise-date(rise))<5*60000);assert.ok(Math.abs(t.sunset-date(set))<5*60000);
 }
});
test('automatic appearance changes at sunrise and sunset, and solar wallpapers use the same boundaries',()=>{
 const w=setup(),s=w.FrameSolar,t=s.state(date('2026-10-24T12:00:00Z'));
 const before=new Date(+t.sunrise-1),rise=t.sunrise,set=t.sunset;
 assert.equal(s.state(before).appearance,'dark');assert.equal(s.state(rise).appearance,'light');
 assert.equal(s.state(new Date(+set-1)).appearance,'light');assert.equal(s.state(set).appearance,'dark');
 assert.equal(s.state(rise).minute,420);assert.equal(s.state(set).minute,1140);
 assert.match(w.FrameWallpapers.resolve('coast',before).file,/coast-night.jpg$/);
 assert.match(w.FrameWallpapers.resolve('coast',rise).file,/coast-day.jpg$/);
 assert.match(w.FrameWallpapers.resolve('coast',set).file,/coast-night.jpg$/);
});
test('Configured city calendar and night phases remain valid across daylight-saving changes and midnight',()=>{
 const s=setup().FrameSolar;
 for(const start of ['2026-03-28T12:00:00Z','2026-10-24T12:00:00Z'])for(let h=0;h<60;h++){
  const t=s.state(new Date(+date(start)+h*3600000));assert.ok(Number.isFinite(t.minute)&&t.minute>=0&&t.minute<1440);
 }
 assert.equal(s.state(date('2026-10-25T00:30:00Z')).appearance,'dark');
 assert.equal(s.state(date('2026-10-25T01:30:00Z')).appearance,'dark');
 assert.match(s.state(date('2026-10-24T23:30:00Z')).sunrise.toISOString(),/^2026-10-25/);
});
test('manual appearance is reversible, and Ardoise changes without an image download',()=>{
 const w=setup(),s=w.FrameSolar,t=date('2026-10-24T23:00:00Z');
 s.setMode('light');assert.equal(s.state(t).appearance,'light');assert.equal(w.FrameWallpapers.resolve('slate',t).color,'#e7ecf2');
 s.setMode('invalid');assert.equal(s.state(t).mode,'light');
 s.setMode('auto');assert.equal(s.state(t).appearance,'dark');assert.equal(w.FrameWallpapers.resolve('slate',t).file,null);
});

test('the public defaults contain no city and use a local daytime schedule',()=>{
 const s=setup(null).FrameSolar;
 assert.equal(s.label(),'heure locale');
 assert.equal(s.state(new Date(2026,5,1,6,59)).appearance,'dark');
 const day=s.state(new Date(2026,5,1,7));assert.equal(day.appearance,'light');assert.equal(day.city,null);assert.equal(day.sunrise,null);
 assert.equal(s.state(new Date(2026,5,1,19)).appearance,'dark');
});
test('invalid solar configuration falls back without blocking the launcher',()=>{
 const s=setup({latitude:999,longitude:0,timeZone:'Invalid/Zone'}).FrameSolar;
 assert.equal(s.label(),'heure locale');assert.equal(s.state(new Date(2026,5,1,12)).appearance,'light');
});
