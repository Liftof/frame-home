/* Public Tizen application/source APIs, informed by Arn0 Launcher (MIT).
   No Home routing, system preferences, package removal, boot service or Art API. */
(function () {
  'use strict';
  var isTV = !!(window.tizen && window.tizen.application);
  // Six original illustrative fixtures. Never used as a real-TV inventory.
  var demo = [
  {
    "id": "demo.movies",
    "name": "Cinéma",
    "show": true,
    "iconPath": "assets/demo/movies.svg?v=1"
  },
  {
    "id": "demo.series",
    "name": "Séries",
    "show": true,
    "iconPath": "assets/demo/series.svg?v=1"
  },
  {
    "id": "demo.music",
    "name": "Musique",
    "show": true,
    "iconPath": "assets/demo/music.svg?v=1"
  },
  {
    "id": "demo.live",
    "name": "En direct",
    "show": true,
    "iconPath": "assets/demo/live.svg?v=1"
  },
  {
    "id": "demo.games",
    "name": "Jeux",
    "show": true,
    "iconPath": "assets/demo/games.svg?v=1"
  },
  {
    "id": "demo.library",
    "name": "Médiathèque",
    "show": true,
    "iconPath": "assets/demo/library.svg?v=1"
  }
];
  function bounded(run, done, timeout) {
    var finished = false;
    var timer = setTimeout(function () { end(new Error('La TV ne répond pas.')); }, timeout || 6500);
    function end(error, value) {
      if (finished) return;
      finished = true; clearTimeout(timer); done(error, value);
    }
    try { run(function (v) { end(null, v); }, function (e) { end(new Error((e && e.message) || 'Action indisponible.')); }); }
    catch (e) { end(e); }
  }
  function list(done) {
    if (!isTV) {
      if (location.search.indexOf('catalog-error=1') !== -1) { done(new Error('Catalogue indisponible.')); return; }
      var delay=/(?:^|[?&])catalog-delay=([0-9]{1,4})(?:&|$)/.exec(location.search);
      if (delay) { setTimeout(function () { done(null,demo.slice()); },Math.min(8000,Number(delay[1])));return; }
      done(null, demo.slice()); return;
    }
    var attempts=0;
    function read() {
      attempts++;
      bounded(function (ok, no) { tizen.application.getAppsInfo(ok, no); },function (error,apps) {
        if (error && attempts<2) { setTimeout(read,700); return; }
        done(error,apps);
      },15000);
    }
    read();
  }
  function launch(id, done) {
    if (!isTV) {
      window.__previewEvents = window.__previewEvents || [];
      window.__previewEvents.push({action:'launch',id:id});
      setTimeout(function () { done(null, {preview:true}); }, 80); return;
    }
    bounded(function (ok, no) { tizen.application.launch(id, ok, no); }, done);
  }
  var currentAppId=null;
  function selfId() {
    if (currentAppId) return currentAppId;
    if (!isTV) return 'FrameHome1.FrameHome';
    try { currentAppId=tizen.application.getCurrentApplication().appInfo.id; }
    catch (e) { currentAppId='FrameHome1.FrameHome'; }
    return currentAppId;
  }
  function leave() {
    if (!isTV) return false;
    try { tizen.application.getCurrentApplication().exit(); return true; }
    catch (e) { return false; }
  }
  var demoSources = [{type:'HDMI',number:1,connected:false},{type:'HDMI',number:2,connected:false},{type:'HDMI',number:3,connected:false},{type:'HDMI',number:4,connected:false}];
  var previewPort=!isTV && /(?:^|[?&])hdmi=([1-4])(?:&|$)/.exec(location.search);
  if (previewPort) demoSources[Number(previewPort[1])-1].connected=true;
  function normalizeSources(value) {
    var found = {};
    (value.disconnected || []).forEach(function (s) { if (s.type === 'HDMI') found[s.number] = {source:s,connected:false}; });
    (value.connected || []).forEach(function (s) { if (s.type === 'HDMI') found[s.number] = {source:s,connected:true}; });
    return Object.keys(found).sort(function (a,b) { return Number(a)-Number(b); }).map(function (key) {
      return {type:'HDMI',number:Number(key),connected:found[key].connected,source:found[key].source};
    });
  }
  function sources(done) {
    if (!isTV) { done(null, demoSources.map(function (s) { return {type:s.type,number:s.number,connected:s.connected}; })); return; }
    bounded(function (ok, no) {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (value) { ok(normalizeSources(value)); }, no);
    }, done);
  }
  // Connection status is not a CEC device name or proof that a console is powered on.
  // Listen while visible, with a bounded fallback refresh for firmwares missing events.
  function watchSources(done) {
    var stopped=false, pending=false, listener=null, timer=null, active=false, generation=0;
    function refresh() {
      if (stopped || !active || pending) return;
      pending=true; var current=generation;
      sources(function (error, value) {
        if (current!==generation) return;
        pending=false;
        if (!stopped && active) done(error,value);
      });
    }
    function pause() {
      active=false; pending=false; generation++;
      clearInterval(timer); timer=null;
      if (listener!==null) { try { tizen.systeminfo.removePropertyValueChangeListener(listener); } catch (e) {} listener=null; }
    }
    function resume() {
      if (stopped || active) return;
      active=true;
      if (isTV) {
        var subscription=generation;
        try { listener=tizen.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE',function (value) {
          if (!stopped && active && subscription===generation) done(null,normalizeSources(value));
        },null,function () {}); } catch (e) {}
      }
      refresh(); timer=setInterval(refresh,4000);
    }
    function visibility() { if (document.hidden) pause(); else resume(); }
    function stop() { if (stopped) return; stopped=true; pause(); if (typeof document!=='undefined') document.removeEventListener('visibilitychange',visibility); }
    if (typeof document!=='undefined') document.addEventListener('visibilitychange',visibility);
    if (typeof document==='undefined' || !document.hidden) resume();
    return stop;
  }
  function openSource(source, done) {
    if (!isTV) { done(null, {preview:true}); return; }
    bounded(function (ok, no) {
      tizen.tvwindow.setSource(source.source, function () {
        tizen.application.launch('org.tizen.tv-viewer', ok, no);
      }, no, 'MAIN');
    }, done);
  }
  function audio() {
    try { return window.tizen && tizen.tvaudiocontrol; } catch (e) { return null; }
  }
  var demoVolume = 30, demoMute = false;
  function volume() {
    if (!isTV) return {volume:demoVolume,mute:demoMute};
    try { var a = audio(); return a ? {volume:a.getVolume(),mute:a.isMute()} : null; } catch (e) { return null; }
  }
  function changeAudio(action) {
    if (!isTV) {
      if (action === 'mute') demoMute = !demoMute;
      else demoVolume = Math.min(100, Math.max(0, demoVolume + (action === 'up' ? 5 : -5)));
      return volume();
    }
    var a = audio();
    if (!a) throw new Error('Ouvrez les réglages son de la TV.');
    if (action === 'mute') a.setMute(!a.isMute());
    else a.setVolume(Math.min(100, Math.max(0, a.getVolume() + (action === 'up' ? 5 : -5))));
    return volume();
  }
  window.TV = {isTV:isTV,list:list,launch:launch,selfId:selfId,leave:leave,sources:sources,watchSources:watchSources,openSource:openSource,volume:volume,changeAudio:changeAudio};
})();
