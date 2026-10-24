/* Last successful local catalogue, never a synthetic real-TV app list. */
(function () {
  'use strict';
  var ttl=7*86400000;
  function key(tv) { return 'frame-home.catalogue.v1.'+(tv ? 'tv' : 'preview'); }
  function clean(apps,tv) {
    if (!Array.isArray(apps) || !apps.length || apps.length>500) return null;
    var seen={}, result=[];
    for (var i=0;i<apps.length;i++) {
      var a=apps[i];
      if (!a || typeof a.id!=='string' || !/^[a-zA-Z0-9_.-]{1,160}$/.test(a.id) ||
          typeof a.name!=='string' || !a.name.trim() || a.name.length>256 || seen[a.id]) return null;
      if (tv && a.id.indexOf('demo.')===0) return null;
      seen[a.id]=true;
      var item={id:a.id,name:a.name};
      if (typeof a.iconPath==='string' && a.iconPath.length<1024 &&
          (tv ? /^\/opt\/usr\//.test(a.iconPath) : /^assets\//.test(a.iconPath))) item.iconPath=a.iconPath;
      result.push(item);
    }
    return result;
  }
  function read(tv,now) {
    try {
      var value=JSON.parse(localStorage.getItem(key(tv)) || 'null');
      if (!value || value.version!==1 || value.tv!==tv || typeof value.at!=='number' ||
          value.at>now+300000 || value.at<now-ttl) return null;
      return clean(value.apps,tv);
    } catch (e) { return null; }
  }
  function write(apps,tv,now) {
    var checked=clean(apps,tv); if (!checked) return false;
    try { localStorage.setItem(key(tv),JSON.stringify({version:1,tv:tv,at:now,apps:checked}));return true; }
    catch (e) { return false; }
  }
  window.FrameCatalogueCache={read:read,write:write,key:key};
})();
