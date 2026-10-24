(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var preferenceKey = 'frame-home.preferences.v1';
  var catalog = [], favorites = [], screen = 'home', focus = null, panel = false, menu = false;
  var returnFocus = null, contextApp = null, moving = null, busy = false, toastTimer, holdTimer, held = false, focusTimer;
  var enterDown=false, enterTarget=null, clockTimer=null;
  // Device names are configured by each installation, never inferred from a port.
  var preferences = {theme:FrameConfig.theme,appearance:'auto',favorites:null,devices:{}};
  var sourceList=[], sourceState='loading', sourceSignature='', contextSource=null, contextKind='app';
  var deviceProfiles=[{id:'ps5',name:'PlayStation 5',icon:'gamepad'},{id:'switch',name:'Nintendo Switch',icon:'gamepad'},{id:'xbox',name:'Xbox',icon:'gamepad'},{id:'computer',name:'Ordinateur',icon:'computer'},{id:'player',name:'Lecteur multimédia',icon:'play'},{id:'hdmi',name:'Appareil HDMI',icon:'hdmi'}];
  var themes = FrameWallpapers.list().map(function (w) { return w.id; });
  var liveDirty=true, libraryDirty=true, cataloguePending=false, lastCatalogueRead=0;
  var startup=window.FrameStartup={startedMs:performance.now(),cacheUsed:false,tilesMs:null,logosMs:null,liveCatalogueMs:null};
  var brands = [
    {key:'canal',name:'CANAL+',test:/canal|mycanal/i},
    {key:'disney',name:'Disney+',test:/disney/i},
    {key:'samsung',name:'Samsung TV+',test:/samsung.*tv.?plus|tvplus|tv plus/i},
    {key:'netflix',name:'Netflix',test:/netflix/i},
    {key:'youtube',name:'YouTube',test:/youtube/i},
    {key:'francetv',name:'france.tv',test:/france.?tv|francetv/i}
  ];
  try {
    var saved = JSON.parse(localStorage.getItem(preferenceKey) || 'null');
    if (saved && typeof saved === 'object') {
      if (['auto','light','dark'].indexOf(saved.appearance)!==-1) preferences.appearance=saved.appearance;
      if (themes.indexOf(saved.theme) !== -1) preferences.theme = saved.theme;
      if (Array.isArray(saved.favorites)) preferences.favorites = saved.favorites.filter(function (id) { return typeof id === 'string' && id.length < 160; }).slice(0,6);
      if (saved.devices && typeof saved.devices==='object') Object.keys(saved.devices).forEach(function (key) {
        if (/^HDMI:[1-9][0-9]?$/.test(key) && deviceProfiles.some(function (p) { return p.id===saved.devices[key]; })) preferences.devices[key]=saved.devices[key];
      });
    }
  } catch (e) {}
  function persist() {
    preferences.favorites = favorites.slice();
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); }
    catch (e) { toast('L’accueil ne peut pas mémoriser ce changement.'); }
  }
  function text(id,value) { if ($(id).textContent!==value) $(id).textContent=value; }
  function appearance(now) {
    FrameSolar.setMode(preferences.appearance);
    var next=FrameSolar.state(now).appearance;
    if (document.body.getAttribute('data-appearance')!==next) document.body.setAttribute('data-appearance',next);
    text('appearance-label',preferences.appearance==='auto' ? 'Automatique · '+FrameSolar.label() : preferences.appearance==='light' ? 'Clair' : 'Sombre');
  }
  function theme() {
    var now=FrameSolar.now();appearance(now);
    if (document.body.getAttribute('data-theme')!==preferences.theme) document.body.setAttribute('data-theme', preferences.theme);
    text('theme-label',FrameWallpapers.resolve(preferences.theme,now).name);
    if (!document.hidden) FrameWallpapers.apply(document.querySelector('.wallpaper'),preferences.theme,now);
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { $('toast').classList.remove('visible'); }, 3800);
  }
  function icon(name) {
    return '<svg aria-hidden="true"><use href="#' + name + '"/></svg>';
  }
  function brand(app) {
    for (var i=0;i<brands.length;i++) if (brands[i].test.test(app.name + ' ' + app.id)) return brands[i];
    return null;
  }
  function find(id) { return catalog.filter(function (a) { return a.id === id; })[0]; }
  function consumer(a) {
    return AppCatalogue.consumer(a,TV.selfId(),TV.isTV);
  }
  function visibleButtons() {
    var container = menu ? $('context-menu') : panel ? $('settings-panel') : null;
    var nodes = container ? container.querySelectorAll('button') :
      document.querySelectorAll('#' + screen + '-screen button,.topbar button');
    return Array.prototype.filter.call(nodes, function (b) { return !b.disabled && b.getClientRects().length > 0; });
  }
  function setFocus(el) {
    if (!el) return;
    // A device can disappear while its menu or the settings panel is open.
    if (!document.documentElement.contains(el) || !el.getClientRects().length) {
      el=(screen==='home' && !menu && !panel && $('favorites').querySelector('button')) || visibleButtons()[0];
      if (!el) return;
    }
    if (focus===el && el.classList.contains('focused') && document.activeElement===el) return;
    if (focus && focus!==el) focus.classList.remove('focused');
    focus = el; focus.classList.add('focused');
    try { focus.focus({preventScroll:true}); } catch (e) { focus.focus(); }
    clearTimeout(focusTimer);
    keepLibraryFocusVisible(el);
    // Tizen may finish its native focus scroll after focus() returns. Recheck
    // once the tile has reached its enlarged size, without chasing every frame.
    if (el.closest && el.closest('#library-grid,#live-scroll')) focusTimer=setTimeout(function () { keepLibraryFocusVisible(el); },220);
  }
  function keepLibraryFocusVisible(el) {
    if (el!==focus || !el.closest || !el.closest('#library-grid,#live-scroll') || !el.getClientRects().length) return;
    var g=el.closest('#live-scroll') || $('library-grid'), r=el.getBoundingClientRect(), gr=g.getBoundingClientRect();
    var scale=$('stage').getBoundingClientRect().width/1920;
    var inset=24*scale;
    if (r.top < gr.top+inset) g.scrollTop -= (gr.top+inset-r.top)/scale;
    if (r.bottom > gr.bottom-inset) g.scrollTop += (r.bottom-gr.bottom+inset)/scale;
  }

  function firstFocus() { setFocus(visibleButtons()[0]); }
  function byData(selector, value) {
    return Array.prototype.filter.call(document.querySelectorAll(selector),function (el) { return el.getAttribute('data-id') === value; })[0];
  }
  function drawTile(app, pinned, inLibrary) {
    var b = brand(app), button = document.createElement('button');
    button.className = 'app-tile'; button.setAttribute('data-id',app.id); button.setAttribute('data-action','app');
    button.setAttribute('aria-label',app.name);
    button._artKey=JSON.stringify([app.name,app.iconPath || '']);
    var art = document.createElement('span'); art.className = 'app-art ' + (b ? b.key : 'generic');
    // Publisher artwork comes from this installation's own native catalogue.
    // The repository never ships a copy of anybody's installed app icons.
    var custom=FrameConfig.cards && FrameConfig.cards[app.name.toLowerCase()];
    var sources=[];
    [custom,app.iconPath].forEach(function (src) { if (src && sources.indexOf(src)===-1) sources.push(src); });
    if (sources.length) {
      var image=document.createElement('img'); image.alt='';image.decoding='async';
      art.classList.add('loading-logo');
      image.onload=function () { FrameArtwork.fit(art,image);art.classList.remove('loading-logo');markLogosReady(); };
      image.onerror=function () {
        if (sources.length) { this.src=sources.shift(); return; }
        this.remove(); art.classList.remove('loading-logo'); var name=document.createElement('span'); name.textContent=app.name; art.appendChild(name);
      };
      image.src=sources.shift();
      art.appendChild(image);
    } else { var title=document.createElement('span'); title.textContent=app.name; art.appendChild(title); }
    if (pinned && inLibrary) pinBadge(art,true);
    button.appendChild(art); return button;
  }
  function pinBadge(art,pinned) {
    var existing=art.querySelector('.pin');
    if (pinned && !existing) {
      var mark=document.createElement('i'); mark.className='pin'; mark.setAttribute('title','Épinglée à l’accueil'); mark.innerHTML=icon('pin'); art.appendChild(mark);
    } else if (!pinned && existing) existing.remove();
  }
  // Reconcile by native app ID and artwork metadata. Pin edits and catalogue
  // refreshes retain image nodes; a genuinely changed icon gets a fresh tile.
  function reconcileTiles(target,apps,inLibrary) {
    var old={};
    Array.prototype.forEach.call(target.querySelectorAll('button[data-id]'),function (b) { old[b.getAttribute('data-id')]=b; });
    var desired=apps.map(function (app) {
      var tile=old[app.id], key=JSON.stringify([app.name,app.iconPath || '']);
      if (!tile || tile._artKey!==key) tile=drawTile(app,false,inLibrary);
      if (inLibrary) pinBadge(tile.querySelector('.app-art'),favorites.indexOf(app.id)!==-1);
      return tile;
    });
    Array.prototype.slice.call(target.children).forEach(function (child) { if (desired.indexOf(child)===-1) child.remove(); });
    desired.forEach(function (tile,index) { if (target.children[index]!==tile) target.insertBefore(tile,target.children[index] || null); });
  }
  function markLogosReady() {
    if (startup.logosMs!==null || !favorites.length) return;
    var imgs=$('favorites').querySelectorAll('img');
    if (imgs.length===favorites.length && Array.prototype.every.call(imgs,function (img) { return img.complete && img.naturalWidth>0; })) startup.logosMs=performance.now();
  }
  function skeletons(target,count) {
    target.innerHTML='';target.setAttribute('aria-busy','true');
    for (var i=0;i<count;i++) { var tile=document.createElement('span');tile.className='skeleton-tile';tile.setAttribute('aria-hidden','true');target.appendChild(tile); }
  }
  function drawFavorites() {
    $('favorites').setAttribute('aria-busy','false');
    $('loading-status').textContent='';
    var target=$('favorites');
    reconcileTiles(target,favorites.map(find).filter(function (app) { return !!app; }),false);
    if (startup.tilesMs===null && favorites.length) startup.tilesMs=performance.now();
    markLogosReady();
    if (!favorites.length) {
      var empty=document.createElement('p'); empty.className='empty'; empty.textContent='Choisissez vos favoris dans Toutes les apps.'; target.appendChild(empty);
    }
  }
  function drawLibrary() {
    if (!catalog.length) { skeletons($('library-grid'),18); return; }
    $('library-grid').setAttribute('aria-busy','false');
    if (!libraryDirty && $('library-grid').children.length) return;
    reconcileTiles($('library-grid'),catalog,true);
    libraryDirty=false;
  }
  function drawLive() {
    if (!liveDirty && $('live-french').children.length) return;
    var french=$('live-french'),english=$('live-english');french.innerHTML='';english.innerHTML='';
    function provider(test) {
      var app=catalog.filter(function (a) { return test.test(a.name+' '+a.id); })[0];
      if (!app) return;
      var card=drawTile(app,false,false);card.classList.add('live-card','provider-card');
      french.appendChild(card);
    }
    provider(/samsung.*tv.?plus|tvplus/i);
    provider(/canal|mycanal/i);
    FrameChannels.filter(function (c) { return c.section==='french'; }).forEach(function (c) { french.appendChild(channelCard(c)); });
    provider(/france.?tv|francetv/i);
    provider(/tf1/i);
    FrameChannels.filter(function (c) { return c.section==='english'; }).forEach(function (c) { english.appendChild(channelCard(c)); });
    liveDirty=false;
  }
  function channelCard(channel) {
    var card=document.createElement('button');card.className='app-tile live-card channel-card';
    card.setAttribute('data-action','channel');card.setAttribute('data-channel',channel.id);card.setAttribute('aria-label',channel.name);
    var art=document.createElement('span');art.className='app-art channel-art channel-'+channel.id;
    var label=document.createElement('span');label.className='channel-name';label.textContent=channel.name;art.appendChild(label);
    var custom=window.FrameConfig && FrameConfig.cards && FrameConfig.cards[channel.name.toLowerCase()];
    var source=custom || channel.logo;
    if (source) {
      var img=document.createElement('img');img.decoding='async';img.src=source;img.alt='';
      img.onload=function () {
        label.classList.add('hidden');
        if (window.FrameArtwork) FrameArtwork.fit(art,img);
      };
      img.onerror=function () { this.remove();label.classList.remove('hidden'); };
      art.appendChild(img);
    }
    card.appendChild(art);return card;
  }
  function openChannel(id) {
    var channel=FrameChannels.filter(function (c) { return c.id===id; })[0];
    if (!channel || busy) return;
    busy=true;$('loading-status').textContent='Ouverture de '+channel.name;
    FrameLiveTV.tune(channel,function (error,result) {
      busy=false;$('loading-status').textContent='';
      if (error) toast('Cette chaîne ne répond pas. Réessayez dans Samsung TV+.');
      else if (result && result.preview) toast('Aperçu : direct simulé de '+channel.name+'.');
      else { clearTimeout(toastTimer);$('toast').classList.remove('visible'); }
    });
  }
  function drawWallpapers() {
    $('wallpapers-grid').innerHTML='';
    FrameWallpapers.list().forEach(function (wallpaper) {
      var variant=FrameWallpapers.resolve(wallpaper.id,FrameSolar.now()), b=document.createElement('button');
      b.className='wallpaper-choice'+(preferences.theme===wallpaper.id ? ' selected' : '');
      b.setAttribute('data-action','wallpaper');b.setAttribute('data-wallpaper',wallpaper.id);b.setAttribute('aria-pressed',String(preferences.theme===wallpaper.id));
      var preview=document.createElement('span');preview.className='wallpaper-preview';
      if (variant.file) { var img=document.createElement('img');img.src=variant.file.replace(/\.jpg$/,"-thumb.jpg");img.alt='';preview.appendChild(img); }
      else preview.style.backgroundColor=wallpaper.color;
      var label=document.createElement('span');label.className='wallpaper-name';label.textContent=wallpaper.name;
      b.appendChild(preview);b.appendChild(label);
      if (preferences.theme===wallpaper.id) { var check=document.createElement('i');check.innerHTML=icon('check');b.appendChild(check); }
      $('wallpapers-grid').appendChild(b);
    });
  }
  function show(next) {
    closeMenu(false); closePanel(false);
    screen=next;
    document.body.setAttribute('data-screen',next);
    ['home','library','live','sources','wallpapers','error'].forEach(function (s) { $(s+'-screen').classList.toggle('hidden',s!==next); });
    Array.prototype.forEach.call(document.querySelectorAll('.main-nav button'),function (b) { b.classList.toggle('nav-active',b.getAttribute('data-action')===(next==='library' ? 'library' : next==='live' ? 'live' : 'home')); });
    if (next==='library') { drawLibrary(); $('library-grid').scrollTop=0; }
    if (next==='live') { drawLive();$('live-scroll').scrollTop=0; }
    if (next==='sources') drawSources();
    if (next==='wallpapers') drawWallpapers();
    var preferred = next==='home' ? ($('favorites').querySelector('button') || document.querySelector('.main-nav [data-action="library"]')) :
      next==='library' ? $('library-grid').querySelector('button') :
      next==='live' ? $('live-french').querySelector('button') :
      next==='sources' ? $('sources-grid').querySelector('button') :
      next==='wallpapers' ? $('wallpapers-grid').querySelector('.selected') || $('wallpapers-grid').querySelector('button') :
      next==='error' ? document.querySelector('#error-screen [data-action="reload"]') : null;
    setFocus(preferred || visibleButtons()[0]);
  }
  function acceptCatalogue(apps) {
    var seen={}, previous=JSON.stringify(catalog);
    catalog=(apps||[]).filter(consumer).filter(function (a) { if (seen[a.id]) return false;seen[a.id]=true;return true; })
      .map(function (a) { return {id:a.id,name:a.name,iconPath:a.iconPath}; })
      .sort(function (a,b) { return a.name.localeCompare(b.name); });
    if (preferences.favorites) favorites=preferences.favorites.filter(function (id) { return !!find(id); });
    else {
      favorites=[];
      var preferred=FrameConfig.favoriteNames || [];
      preferred.forEach(function (name) { var a=catalog.filter(function (app) { return app.name.toLowerCase()===name.toLowerCase(); })[0];if (a && favorites.indexOf(a.id)===-1 && favorites.length<6) favorites.push(a.id); });
      if (!preferred.length && TV.isTV) brands.forEach(function (b) { var a=catalog.filter(function (app) { return b.test.test(app.name+' '+app.id); })[0];if (a && favorites.indexOf(a.id)===-1) favorites.push(a.id); });
      if (!TV.isTV && !preferred.length) ['demo.movies','demo.series','demo.music','demo.live','demo.games','demo.library'].forEach(function (id) { if (find(id)) favorites.push(id); });
      catalog.forEach(function (app) { if (favorites.length<6 && favorites.indexOf(app.id)===-1) favorites.push(app.id); });
    }
    if (previous!==JSON.stringify(catalog)) { libraryDirty=true;liveDirty=true; }
    drawFavorites();
  }
  function reload() {
    if (cataloguePending) return;
    cataloguePending=true;lastCatalogueRead=Date.now();
    var blocking=!catalog.length;
    if (blocking) busy=true;
    TV.list(function (error, apps) {
      cataloguePending=false;
      if (blocking) busy=false;
      if (error) {
        startup.catalogueError=error.message;
        if (!catalog.length) { $('loading-status').textContent='';show('error'); }
        return;
      }
      startup.liveCatalogueMs=performance.now();
      var first=!catalog.length, oldId=focus && focus.getAttribute('data-id');
      acceptCatalogue(apps);
      FrameCatalogueCache.write(catalog,TV.isTV,Date.now());
      if (screen==='error' || (first && screen==='home')) show('home');
      else if (screen==='library') {
        drawLibrary();if (!menu && !panel) setFocus(byData('#library-grid button',oldId) || $('library-grid').querySelector('button'));
      } else if (screen==='live' && liveDirty) {
        var oldChannel=focus && focus.getAttribute('data-channel');drawLive();
        if (!panel && !menu) setFocus(byData('#live-french button',oldId) || (oldChannel && document.querySelector('[data-channel="'+oldChannel+'"]')) || $('live-french').querySelector('button'));
      } else if (screen==='home' && !menu && !panel && (!focus || !document.documentElement.contains(focus))) {
        setFocus(byData('#favorites button',oldId) || $('favorites').querySelector('button') || document.querySelector('.main-nav [data-action="library"]'));
      }
    });
  }

  function launch(app) {
    if (!app || busy) return;
    busy=true;
    TV.launch(app.id,function (error,result) {
      busy=false;
      if (error) { toast('Impossible d’ouvrir '+app.name+'. L’accueil Samsung reste disponible.'); return; }
      if (result && result.preview) toast('Aperçu : ouverture simulée de '+app.name+'.');
    });
  }
  function nativeApp(id, label) {
    if (busy) return;
    busy=true;
    TV.launch(id,function (error,result) {
      busy=false;
      if (error) toast('Ce raccourci est indisponible. Utilisez la touche Maison de la télécommande.');
      else if (result && result.preview) toast('Aperçu : '+label+'.');
    });
  }
  function updateVolume() {
    var v=TV.volume();
    $('volume-value').textContent=v ? String(v.volume) : '—';
    $('volume-fill').style.width=(v ? v.volume : 0)+'%';
    $('mute-button').textContent=v && v.mute ? 'Rétablir' : 'Muet';
    ['volume-up','volume-down','mute'].forEach(function (action) {
      document.querySelector('[data-action="'+action+'"]').disabled=!v;
    });
  }
  function openPanel() {
    returnFocus=focus; panel=true;
    $('settings-panel').classList.remove('hidden'); $('panel-shade').classList.remove('hidden');
    updateVolume();
    setFocus(document.querySelector('[data-action="tv-settings"]'));
  }
  function closePanel(restore) {
    if (!panel) return;
    panel=false; $('settings-panel').classList.add('hidden'); $('panel-shade').classList.add('hidden');
    if (restore) setFocus(returnFocus);
  }
  function sourceKey(source) { return source.type+':'+source.number; }
  function deviceVisual(p) {
    return icon(p.icon);
  }
  function profile(source) {
    var id=preferences.devices[sourceKey(source)];
    return deviceProfiles.filter(function (p) { return p.id===id; })[0] || deviceProfiles[deviceProfiles.length-1];
  }
  function deviceCard(source) {
    var p=profile(source), b=document.createElement('button');
    b.className='device-card device-'+p.id+(sourceState==='error' ? ' unknown' : source.connected ? '' : ' offline'); b.setAttribute('data-action','source'); b.setAttribute('data-source',sourceKey(source)); b._source=source;
    b.innerHTML=deviceVisual(p)+'<span class="device-copy"><strong></strong><small></small></span><span class="device-status"></span>';
    b.querySelector('strong').textContent=p.id==='hdmi' ? 'HDMI '+source.number : p.name;
    b.querySelector('small').textContent='HDMI '+source.number;
    var status=b.querySelector('.device-status');
    status.textContent=sourceState==='error' ? 'Indisponible' : source.connected ? '' : 'Offline';
    status.classList.toggle('hidden',sourceState!=='error' && source.connected);
    b.setAttribute('aria-label',b.querySelector('strong').textContent+', HDMI '+source.number+', '+(sourceState==='error' ? 'état indisponible' : source.connected ? 'connexion détectée' : 'Offline'));
    return b;
  }
  function drawSources() {
    var homeSection=$('home-device-section');
    var wasHomeDevice=focus && homeSection.contains(focus);
    var oldKey=focus && focus.getAttribute('data-source'), oldParent=focus && focus.parentNode && focus.parentNode.id;
    var connected=sourceState==='ready' ? sourceList.filter(function (s) { return s.connected===true; }) : [];
    homeSection.classList.toggle('hidden',!connected.length);
    $('home-screen').classList.toggle('has-devices',!!connected.length);
    ['home-devices','sources-grid'].forEach(function (id) {
      var target=$(id); target.innerHTML='';
      var items=id==='home-devices' ? connected : sourceList;
      items.slice(0,4).forEach(function (source) { target.appendChild(deviceCard(source)); });
      if (id!=='home-devices' && !items.length) {
        var empty=document.createElement('p'); empty.className='empty';
        empty.textContent=sourceState==='loading' ? 'Recherche des appareils…' : sourceState==='error' ? 'Les appareils sont indisponibles. Réessayez depuis les sources Samsung.' : 'Aucun appareil connecté.';
        target.appendChild(empty);
      }
    });
    if (screen==='sources' && !$('sources-hint')) {
      var hint=document.createElement('p');hint.id='sources-hint';hint.className='source-hint';hint.textContent='Maintenez OK pour choisir le nom et l’icône d’un appareil.';$('sources-screen').appendChild(hint);
    }
    if (oldKey && (oldParent==='home-devices' || oldParent==='sources-grid') && !menu && !panel) {
      var next=Array.prototype.filter.call($(oldParent).querySelectorAll('button'),function (b) { return b.getAttribute('data-source')===oldKey; })[0];
      setFocus(next || (screen==='home' && $('favorites').querySelector('button')) || document.querySelector('.main-nav [data-action="home"]'));
    } else if (wasHomeDevice && !connected.length && !menu && !panel) {
      setFocus($('favorites').querySelector('button') || document.querySelector('.main-nav [data-action="home"]'));
    }
  }
  function updateSources(error,sources) {
    var nextState=error ? 'error' : 'ready';
    var signature=JSON.stringify(error ? ['error'] : sources);
    if (signature===sourceSignature && nextState===sourceState) return;
    var previous=sourceList;
    sourceState=nextState; sourceSignature=signature;
    if (!error) sourceList=sources || [];
    drawSources();
    if (!error && previous.length) sourceList.forEach(function (s) {
      var before=previous.filter(function (p) { return sourceKey(p)===sourceKey(s); })[0];
      if (s.connected && (!before || !before.connected)) toast((profile(s).id==='hdmi' ? 'HDMI '+s.number : profile(s).name)+' connecté.');
    });
  }
  function sourceContext(source) {
    contextSource=source;contextKind='source';returnFocus=focus;menu=true;
    $('context-menu').setAttribute('aria-label','Options de l’appareil');
    $('context-name').textContent='HDMI '+source.number+' · Nom et icône';$('context-actions').innerHTML='';
    deviceProfiles.forEach(function (p) { var b=document.createElement('button');b.setAttribute('data-action','device-profile');b.setAttribute('data-profile',p.id);b.innerHTML=deviceVisual(p);var text=document.createElement('span');text.textContent=p.name;b.appendChild(text);$('context-actions').appendChild(b); });
    var cancel=document.createElement('button');cancel.setAttribute('data-action','close-menu');cancel.textContent='Annuler';$('context-actions').appendChild(cancel);
    $('context-menu').classList.remove('hidden');$('context-shade').classList.remove('hidden');firstFocus();
  }
  function context(app) {
    if (!app || busy || moving) return;
    contextApp=app; contextKind='app'; returnFocus=focus; menu=true;
    $('context-menu').setAttribute('aria-label','Options de l’application');
    $('context-name').textContent=app.name;
    var pinned=favorites.indexOf(app.id)!==-1;
    $('context-actions').innerHTML='';
    function option(action,text) { var b=document.createElement('button'); b.setAttribute('data-action',action); b.textContent=text; $('context-actions').appendChild(b); }
    if (pinned) { option('move','Déplacer'); option('unpin','Retirer des favoris'); }
    else option('pin','Ajouter aux favoris');
    option('close-menu','Annuler');
    $('context-menu').classList.remove('hidden'); $('context-shade').classList.remove('hidden'); firstFocus();
  }
  function closeMenu(restore) {
    if (!menu) return;
    menu=false; $('context-menu').classList.add('hidden'); $('context-shade').classList.add('hidden');
    if (restore) setFocus(returnFocus);
  }
  function endMove(save) {
    if (!moving) return;
    var id=moving.id;
    if (!save) favorites=moving.before;
    moving=null; $('edit-hint').classList.add('hidden');
    Array.prototype.forEach.call($('favorites').querySelectorAll('.moving'),function (b) { b.classList.remove('moving'); });
    if (save) persist();
    drawFavorites(); setFocus(byData('#favorites button',id));
  }
  function action(button) {
    if (!button || button.disabled || busy) return;
    var a=button.getAttribute('data-action');
    if (a==='app') { launch(find(button.getAttribute('data-id'))); return; }
    if (a==='channel') { openChannel(button.getAttribute('data-channel'));return; }
    if (a==='live') { show('live');return; }
    if (a==='home') { show('home'); return; }
    if (a==='library' || a==='edit') { show('library'); return; }
    if (a==='sources') { show(a); return; }
    if (a==='appearance') { preferences.appearance=['auto','light','dark'][(['auto','light','dark'].indexOf(preferences.appearance)+1)%3];persist();theme();return; }
    if (a==='wallpapers') { show('wallpapers'); return; }
    if (a==='wallpaper') {
      preferences.theme=button.getAttribute('data-wallpaper');theme();persist();show('home');return;
    }
    if (a==='device-profile' && contextKind==='source') {
      preferences.devices[sourceKey(contextSource)]=button.getAttribute('data-profile');persist();closeMenu(false);drawSources();
      var target=Array.prototype.filter.call(document.querySelectorAll('#'+(screen==='home' ? 'home-devices' : 'sources-grid')+' button'),function (b) { return b.getAttribute('data-source')===sourceKey(contextSource); })[0];setFocus(target);return;
    }
    if (a==='settings') { openPanel(); return; }
    if (a==='close-panel') { closePanel(true); return; }
    if (a==='close-menu') { closeMenu(true); return; }
    if (a==='samsung') { nativeApp('com.samsung.tv.csfs','accueil Samsung'); return; }
    if (a==='tv-settings') { nativeApp('org.tizen.menu','réglages Samsung'); return; }
    if (a==='reload') { reload(); return; }
    if (a==='volume-up' || a==='volume-down' || a==='mute') {
      try { TV.changeAudio(a==='mute' ? 'mute' : a==='volume-up' ? 'up' : 'down'); updateVolume(); } catch (e) { toast(e.message); }
      return;
    }
    if (a==='source') {
      busy=true;
      TV.openSource(button._source,function (error,result) {
        busy=false;
        if (error) toast('Impossible d’ouvrir cette entrée. Utilisez les sources Samsung.');
        else if (result && result.preview) toast('Aperçu : HDMI '+button._source.number+'.');
      }); return;
    }
    if (a==='pin' || a==='unpin') {
      var id=contextApp.id;
      if (a==='pin' && favorites.length>=6) { closeMenu(true); toast('Six favoris maximum. Retirez-en un pour faire de la place.'); return; }
      if (a==='pin') favorites.push(id); else favorites=favorites.filter(function (v) { return v!==id; });
      persist(); libraryDirty=true; closeMenu(false); drawFavorites();
      if (screen==='library') { drawLibrary();setFocus(byData('#library-grid button',id)); }
      else setFocus($('favorites').querySelector('button') || document.querySelector('.main-nav [data-action="library"]'));
      return;
    }
    if (a==='move') {
      var selected=contextApp.id; closeMenu(false); show('home');
      moving={id:selected,before:favorites.slice()}; $('edit-hint').classList.remove('hidden');
      setFocus(byData('#favorites button',selected)); focus.classList.add('moving');
    }
  }
  function back() {
    if (moving) { endMove(false); return; }
    if (menu) { closeMenu(true); return; }
    if (panel) { closePanel(true); return; }
    if (screen!=='home') { show('home'); return; }
    // This is the user's launcher: short Back at its root must stay here.
    // Samsung Home remains an explicit action in Settings; long Exit stays native.
  }
  function move(direction) {
    if (moving) {
      if (direction!==37 && direction!==39) return;
      var index=favorites.indexOf(moving.id), next=index+(direction===39 ? 1 : -1);
      if (next<0 || next>=favorites.length) return;
      var swap=favorites[next]; favorites[next]=moving.id; favorites[index]=swap;
      drawFavorites(); setFocus(byData('#favorites button',moving.id)); focus.classList.add('moving'); return;
    }
    var buttons=visibleButtons();
    if (!focus || buttons.indexOf(focus)===-1) { firstFocus(); return; }
    var box=focus.getBoundingClientRect(), cx=box.left+box.width/2, cy=box.top+box.height/2, best=null, score=Infinity;
    buttons.forEach(function (b) {
      if (b===focus) return;
      var r=b.getBoundingClientRect(), dx=r.left+r.width/2-cx, dy=r.top+r.height/2-cy;
      var primary=direction===37 ? -dx : direction===39 ? dx : direction===38 ? -dy : dy;
      var cross=(direction===37 || direction===39) ? Math.abs(dy) : Math.abs(dx);
      if (primary<5) return;
      var value=primary+cross*2.8;
      if (value<score) { score=value; best=b; }
    });
    if (best) setFocus(best);
  }
  function cancelPress() {
    clearTimeout(holdTimer);holdTimer=null;held=false;enterDown=false;enterTarget=null;
  }
  document.addEventListener('keydown',function (event) {
    var key=event.keyCode;
    if ([37,38,39,40,13,27,8,10009].indexOf(key)===-1) return;
    event.preventDefault();
    if (document.hidden) return;
    if (key>=37 && key<=40) { cancelPress();move(key); return; }
    if (key===27 || key===8 || key===10009) { cancelPress();back(); return; }
    if (key===13) {
      if (event.repeat || enterDown || busy || !focus) return;
      enterDown=true;enterTarget=focus;held=false;
      holdTimer=setTimeout(function () {
        holdTimer=null;
        if (!enterDown || focus!==enterTarget || document.hidden || busy) return;
        held=true;
        if (!moving && focus && focus.getAttribute('data-action')==='app') context(find(focus.getAttribute('data-id')));
        else if (!moving && focus && focus.getAttribute('data-action')==='source') sourceContext(focus._source);
      },650);
    }
  });
  document.addEventListener('keyup',function (event) {
    if (event.keyCode!==13) return;
    var pressed=enterDown, target=enterTarget, wasHeld=held;cancelPress();
    if (!pressed || wasHeld || document.hidden || target!==focus || !target || !document.documentElement.contains(target)) return;
    if (moving) endMove(true); else action(target);
  });
  document.addEventListener('click',function (event) {
    var target=event.target;
    while (target && target!==document && target.tagName!=='BUTTON') target=target.parentNode;
    if (target && target.tagName==='BUTTON') { setFocus(target); if (moving) endMove(true); else action(target); }
  });
  document.addEventListener('contextmenu',function (event) {
    var target=event.target.closest('button');if (!target) return;
    var a=target.getAttribute('data-action');if (a!=='app' && a!=='source') return;
    event.preventDefault();setFocus(target);if (a==='app') context(find(target.getAttribute('data-id')));else sourceContext(target._source);
  });
  document.addEventListener('focusin',function (event) {
    if (event.target.tagName==='BUTTON' && event.target!==focus) setFocus(event.target);
  });
  document.addEventListener('visibilitychange',function () {
    cancelPress();clearTimeout(focusTimer);
    if (document.hidden) {
      stopClock();FrameWallpapers.pause();
      clearTimeout(toastTimer);$('toast').classList.remove('visible');
    } else { busy=false;startClock();if (Date.now()-lastCatalogueRead>60000) reload(); }
  });
  window.addEventListener('blur',cancelPress);
  function fit() {
    var root=document.documentElement;
    var scale=Math.min((root.clientWidth || window.innerWidth)/1920,(root.clientHeight || window.innerHeight)/1080);
    $('stage').style.transform='translate(-50%, -50%) scale('+scale+')';
  }
  function clock() {
    var now=FrameSolar.now();appearance(now);
    var value=('0'+now.getHours()).slice(-2)+':'+('0'+now.getMinutes()).slice(-2);
    if ($('time').textContent!==value) $('time').textContent=value;
    if (!document.hidden) FrameWallpapers.apply(document.querySelector('.wallpaper'),preferences.theme,now);
  }
  function stopClock() { if (clockTimer!==null) clearInterval(clockTimer);clockTimer=null; }
  function startClock() {
    if (document.hidden || clockTimer!==null) return;
    clock();clockTimer=setInterval(clock,30000);
  }
  fit(); window.addEventListener('resize',fit);
  // Paint the existing local catalogue before fonts/images and native API reads finish.
  theme();clock();
  var cached=FrameCatalogueCache.read(TV.isTV,Date.now());
  if (cached) { startup.cacheUsed=true;acceptCatalogue(cached);show('home'); }
  function start() {
    fit();
    if (!TV.isTV) $('preview-label').classList.remove('hidden');
    startClock();
    reload();
    var stopSources=TV.watchSources(updateSources);
    window.addEventListener('pagehide',function () { cancelPress();stopClock();stopSources();FrameWallpapers.pause(); });
  }
  if (document.readyState==='complete') start(); else window.addEventListener('load',start);
  window.FrameHome={reload:reload,state:function () { return {screen:screen,panel:panel,menu:menu,moving:!!moving,favorites:favorites.slice(),catalog:catalog.map(function (a) { return {id:a.id,name:a.name}; }),busy:busy,theme:preferences.theme}; }};
})();
