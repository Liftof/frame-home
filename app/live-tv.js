/* Native Samsung TV+ channels. No stream URLs, playback engine, account data or power control. */
(function () {
  'use strict';
  var pending=false;
  function tune(channel,done) {
    if (pending) { done(new Error('Une chaîne est déjà en cours d’ouverture.'));return; }
    if (!channel || channel.provider!=='tvplus' || !Number.isInteger(channel.major) || channel.major<1) { done(new Error('Cette chaîne n’a pas de raccourci direct disponible.'));return; }
    if (!TV.isTV) {
      window.__previewEvents=window.__previewEvents || [];
      window.__previewEvents.push({action:'channel',id:channel.id,major:channel.major,provider:channel.provider});
      done(null,{preview:true});return;
    }
    pending=true;
    var finished=false,launching=false,timer=null,deadline=null;
    function finish(error,result) {
      if (finished) return;
      finished=true;pending=false;clearTimeout(timer);clearTimeout(deadline);done(error,result);
    }
    function openViewer() {
      if (finished || launching) return;
      launching=true;clearTimeout(timer);clearTimeout(deadline);
      TV.launch('org.tizen.tv-viewer',finish);
    }
    function check() {
      clearTimeout(timer);timer=null;
      if (finished || launching) return;
      try {
        var current=tizen.tvchannel.getCurrentChannel();
        if (current && current.major===channel.major && (!current.minor || current.minor===0)) { openViewer();return; }
      } catch (e) { /* The viewer may not have a current channel during the switch. */ }
      if (!finished && !launching) timer=setTimeout(check,400);
    }
    deadline=setTimeout(function () { finish(new Error('La TV n’a pas confirmé cette chaîne.')); },8000);
    try {
      tizen.tvchannel.tune({major:channel.major,minor:0},{
        // Some firmwares change channel without invoking onsuccess. Verify the current
        // major number before launching the viewer; never treat acceptance as playback.
        onsuccess:function () { clearTimeout(timer);check(); },
        onnosignal:function () { finish(new Error('Aucun signal pour cette chaîne.')); }
      },function (error) { finish(new Error((error && error.message) || 'Chaîne indisponible.')); },'MAIN');
      if (!finished && !launching) check();
    } catch (e) { finish(e); }
  }
  window.FrameLiveTV={tune:tune};
})();
