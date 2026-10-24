/* Opt-in city coordinates stay in the local package. No GPS or remote service. */
(function () {
  'use strict';
  var mode='auto',cache={},formatter=null,site=window.FrameConfig && FrameConfig.solar;
  if (!site || !Number.isFinite(site.latitude) || !Number.isFinite(site.longitude) || Math.abs(site.latitude)>66 || Math.abs(site.longitude)>180) site=null;
  if (site) {
    try { formatter=new Intl.DateTimeFormat('en-GB',{timeZone:site.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}); }
    catch (e) { site=null; }
  }
  function noon(date) {
    var parts={};formatter.formatToParts(date).forEach(function (part) { parts[part.type]=part.value; });
    return new Date(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),12));
  }
  function times(day) {
    var key=day.toISOString().slice(0,10);
    if (!cache[key]) {
      if (Object.keys(cache).length>6) cache={};
      cache[key]=SunCalc.getTimes(day,site.latitude,site.longitude);
    }
    return cache[key];
  }
  function scheduled(date) {
    var minute=date.getHours()*60+date.getMinutes()+date.getSeconds()/60;
    return {city:null,mode:mode,appearance:mode==='auto' ? (minute>=420 && minute<1140 ? 'light' : 'dark') : mode,sunrise:null,sunset:null,minute:minute};
  }
  function state(date) {
    if (!site || !formatter || !formatter.formatToParts) return scheduled(date);
    var day=noon(date),sun=times(day),t=date.getTime();
    var rise=sun.sunrise.getTime(),set=sun.sunset.getTime(),minute;
    if (!Number.isFinite(rise) || !Number.isFinite(set)) return scheduled(date);
    if (t>=rise && t<set) minute=420+720*(t-rise)/(set-rise);
    else {
      var before=t<rise ? times(new Date(day.getTime()-86400000)).sunset.getTime() : set;
      var after=t<rise ? rise : times(new Date(day.getTime()+86400000)).sunrise.getTime();
      minute=(1140+720*(t-before)/(after-before))%1440;
    }
    return {city:site.label || null,mode:mode,appearance:mode==='auto' ? (t>=rise && t<set ? 'light' : 'dark') : mode,sunrise:sun.sunrise,sunset:sun.sunset,minute:minute};
  }
  window.FrameSolar={now:function () { return new Date(); },state:state,
    label:function () { return site ? site.label || 'soleil local' : 'heure locale'; },
    setMode:function (next) { if (['auto','light','dark'].indexOf(next)!==-1) mode=next; }};
})();
