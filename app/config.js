/* Public defaults. tools/preview.py and tools/build.py can prepend local settings. */
(function () {
  'use strict';
  var defaults={solar:null,channelProfile:'fr-tvplus',favoriteNames:[],cards:{},wallpapers:[],theme:'coast'};
  var local=window.FrameUserConfig || {};
  Object.keys(defaults).forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(local,key)) defaults[key]=local[key];
  });
  window.FrameConfig=defaults;
})();
