const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scope={};scope.window=scope;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/catalogue.js'),'utf8'),scope);
const eligible=a=>scope.AppCatalogue.consumer(a,'FrameHome1.FrameHome',true);
test('CANAL+ Launcher IDs are consumer applications',()=>{
 assert.equal(eligible({id:'QmpwflxWdt.CanalPlusLauncher',name:'CANAL+',show:true}),true);
 assert.equal(eligible({id:'guMmq95nKK.CanalPlusLauncher',name:'CANAL+',show:true}),true);
});
test('system services, privacy tools and Frame Home are excluded from the user library',()=>{
 for(const a of [{id:'org.tizen.rm-network-status',name:'Network status',show:true},{id:'w2VwCK465D.OTApp',name:'Samsung TV Plus Privacy Settings',show:true},{id:'FrameHome1.FrameHome',name:'Frame Home',show:true}])assert.equal(eligible(a),false);
 assert.equal(eligible({id:'org.tizen.netflix-app',name:'Netflix',show:false}),true);
 assert.equal(eligible({id:'com.samsung.tv.tvPlusDeeplinker',name:'Samsung TV Plus',show:true}),true);
});
