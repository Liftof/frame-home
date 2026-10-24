/* Apple publisher frames, packaged locally. Selection follows the TV's local
   solar clock; no location access, network download, video loop or background task. */
(function () {
  'use strict';
  var data=window.FrameWallpaperData;
  var current=null, pending=null, pendingImage=null, generation=0;
  function cancelPending() {
    pending=null;
    if (pendingImage) {
      pendingImage.onload=null;pendingImage.onerror=null;
      pendingImage.src='';pendingImage=null;
    }
  }
  function pause() { generation++;cancelPending(); }
  function resolve(id,date) {
    var entry=data.filter(function (w) { return w.id===id; })[0] || data[data.length-1];
    var solar=window.FrameSolar ? FrameSolar.state(date) : null;
    var minute=solar ? solar.minute : date.getHours()*60+date.getMinutes(), file=null;
    entry.frames.forEach(function (frame) { if (frame.from<=minute) file=frame.file; });
    return {id:entry.id,name:entry.name,file:file,color:entry.id==='slate' && solar && solar.appearance==='light' ? '#e7ecf2' : entry.color || '#18202b'};
  }
  function apply(element,id,date) {
    var frame=resolve(id,date), key=frame.id+':'+frame.file+':'+frame.color;
    if (current===key) { if (pending && pending!==key) pause(); return; }
    if (pending===key) return;
    var ticket=++generation;cancelPending();
    if (!frame.file) {
      pending=null;current=key;element.style.backgroundImage='none';element.style.backgroundColor=frame.color;return;
    }
    // Decode first and keep the previous background until ready. In particular,
    // repeated clock refreshes must not recreate/reload an unchanged image.
    pending=key;
    var image=new Image();pendingImage=image;image.decoding='async';
    function valid() { return ticket===generation && pendingImage===image; }
    function release() { image.onload=null;image.onerror=null;pendingImage=null;pending=null; }
    function publish() {
      if (!valid()) return;
      element.style.backgroundColor=frame.color;
      element.style.backgroundImage='url("'+frame.file+'")';
      current=key;release();
    }
    function fail() { if (valid()) release(); }
    image.onload=function () {
      if (!valid()) return;
      // onload alone does not guarantee a decoded bitmap. Finish the asynchronous
      // decode before attaching it to CSS, retaining the current background meanwhile.
      if (typeof image.decode==='function') {
        try { image.decode().then(publish,fail); } catch (e) { fail(); }
      } else publish();
    };
    image.onerror=fail;
    image.src=frame.file;
  }
  window.FrameWallpapers={list:function () { return data; },resolve:resolve,apply:apply,pause:pause};
})();
