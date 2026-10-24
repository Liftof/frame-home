/* Samsung publishes internal system components alongside installed consumer apps. */
(function () {
  'use strict';
  var store=/^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/;
  var preloaded=['org.tizen.netflix-app','org.tizen.primevideo','org.tizen.apple.apple-music','org.tizen.browser','com.samsung.tv.aria-video','com.samsung.tv.tvPlusDeeplinker'];
  var internal=['WykOS4t4F0.cmsWebApp','25emanual3.emanual','ZODRT12q2l.WebAccountExtension','ByJlgt0XeD.CastSettingsApp','tv6pbVMQFF.PrivacyChoices','2022ePop01.SmartTV','w2VwCK465D.OTApp','J9fZJDMi1v.SecurityCenter'];
  var noise=/service|worker|preview|promotion|plugin|test|sdk|factory|daemon|dummy|e-?manual|account|adplayer|privacy|security/i;
  function consumer(app,selfId,isTV) {
    if (!app || !app.id || !app.name || app.id===selfId) return false;
    if (!isTV && /^demo\./.test(app.id)) return true;
    if (preloaded.indexOf(app.id)!==-1) return true;
    if (app.show===false || internal.indexOf(app.id)!==-1) return false;
    if (!store.test(app.id) && !/^\d{9,13}$/.test(app.id)) return false;
    // CANAL+ is legitimately named CanalPlusLauncher in its application ID.
    return !noise.test(app.name);
  }
  window.AppCatalogue={consumer:consumer};
})();
