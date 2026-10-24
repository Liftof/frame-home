/* A static frame for the TV's own icons, composed once when an image loads.
   No pixel readback, export, network request, blur, timer or focus-time work. */
(function () {
  'use strict';
  function fit(art,image) {
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth/image.naturalHeight>1.5) return false;
    if (art.querySelector('canvas')) return true;
    var canvas=document.createElement('canvas');canvas.width=508;canvas.height=306;
    canvas.setAttribute('aria-hidden','true');
    try {
      var ctx=canvas.getContext('2d',{alpha:false});if (!ctx) return false;
      var w=image.naturalWidth,h=image.naturalHeight;
      var scale=Math.min(canvas.width/w,canvas.height/h),dw=Math.round(w*scale),dh=Math.round(h*scale);
      var x=Math.floor((canvas.width-dw)/2),y=Math.floor((canvas.height-dh)/2);
      ctx.fillStyle='#202630';ctx.fillRect(0,0,canvas.width,canvas.height);
      var edge=Math.max(0,Math.min(2,w-1));
      if (x>0) {
        ctx.drawImage(image,edge,0,1,h,0,y,x,dh);
        ctx.drawImage(image,w-1-edge,0,1,h,x+dw,y,canvas.width-x-dw,dh);
      }
      ctx.drawImage(image,0,0,w,h,x,y,dw,dh);
    } catch (e) { return false; }
    art.insertBefore(canvas,image);art.classList.add('native-framed');return true;
  }
  window.FrameArtwork={fit:fit};
})();
