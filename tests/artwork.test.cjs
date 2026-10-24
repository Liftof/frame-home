const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup({noContext=false,fail=false}={}){
 const draws=[],nodes=[],classes=new Set();
 const canvas={setAttribute(){},getContext(){if(noContext)return null;return {fillRect(){},drawImage(...args){if(fail)throw Error('Unavailable bitmap');draws.push(args);}};}};
 const scope={document:{createElement:()=>canvas}};scope.window=scope;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/artwork.js'),'utf8'),scope);
 return {fit:scope.FrameArtwork.fit,draws,nodes,classes,canvas,art:{querySelector:()=>nodes[0]||null,insertBefore:n=>nodes.push(n),classList:{add:c=>classes.add(c)}}};
}
test('square publisher icons are drawn once without cropping the centre image or reading pixels',()=>{
 const h=setup(),image={naturalWidth:256,naturalHeight:256};
 assert.equal(h.fit(h.art,image),true);assert.equal(h.draws.length,3);
 assert.deepEqual(h.draws[2],[image,0,0,256,256,101,0,306,306]);
 assert.equal(h.fit(h.art,image),true);assert.equal(h.draws.length,3);
 assert.ok(h.classes.has('native-framed'));
});
test('existing rectangular artwork and an unavailable canvas preserve the original image',()=>{
 const h=setup();assert.equal(h.fit(h.art,{naturalWidth:508,naturalHeight:306}),false);assert.equal(h.nodes.length,0);
 const absent=setup({noContext:true});assert.equal(absent.fit(absent.art,{naturalWidth:100,naturalHeight:100}),false);assert.equal(absent.nodes.length,0);
 const failed=setup({fail:true});assert.equal(failed.fit(failed.art,{naturalWidth:100,naturalHeight:100}),false);assert.equal(failed.nodes.length,0);assert.equal(failed.classes.size,0);
});
