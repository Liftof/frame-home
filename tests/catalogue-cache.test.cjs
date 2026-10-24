const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){const values={};const localStorage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v};const scope={localStorage};scope.window=scope;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/catalogue-cache.js'),'utf8'),scope);return {cache:scope.FrameCatalogueCache,values,localStorage};}
const apps=[{id:'real.Netflix',name:'Netflix',iconPath:'/opt/usr/apps/netflix/icon.png'}],now=1792840000000;
test('only a successful validated local catalogue can be reused during startup',()=>{
 const {cache:c}=setup();assert.equal(c.read(true,now),null);assert.equal(c.write(apps,true,now),true);
 assert.deepEqual(JSON.parse(JSON.stringify(c.read(true,now+1000))),apps);assert.equal(c.read(false,now),null);
});
test('expired, malformed, future and incompatible cache records are ignored',()=>{
 const {cache:c,values}=setup();c.write(apps,true,now);
 assert.equal(c.read(true,now+8*86400000),null);assert.equal(c.read(true,now-600000),null);
 values[c.key(true)]='{broken';assert.equal(c.read(true,now),null);
 values[c.key(true)]=JSON.stringify({version:2,tv:true,at:now,apps});assert.equal(c.read(true,now),null);
});
test('demo apps, duplicates and remote icon URLs cannot contaminate a real TV catalogue',()=>{
 const {cache:c}=setup();assert.equal(c.write([{id:'demo.netflix',name:'Netflix'}],true,now),false);
 assert.equal(c.write([...apps,...apps],true,now),false);
 assert.equal(c.write([{id:'real.App',name:'Example',iconPath:'https://tracker.invalid/logo.png'}],true,now),true);
 assert.equal(c.read(true,now)[0].iconPath,undefined);
});
test('unavailable local storage does not prevent native startup',()=>{
 const {cache:c,localStorage}=setup();localStorage.getItem=()=>{throw Error('Denied')};localStorage.setItem=()=>{throw Error('Full')};
 assert.equal(c.read(true,now),null);assert.equal(c.write(apps,true,now),false);
});
