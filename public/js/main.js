/* Kartoney.com — client enhancements for the static site.
 * The site works without JS; this adds search, hero rotation, season tabs,
 * nav state, PWA install, and legacy #hash redirects. */
(function () {
  'use strict';

  /* ── Legacy hash-route redirects (old SPA links → real URLs) ── */
  (function redirectLegacyHash() {
    var h = location.hash.slice(1);
    if (!h) return;
    var p = h.split('/');
    var to = null;
    if (p[0] === 'cartoon' && p[1]) to = '/cartoon/' + p[1] + '/';
    else if (p[0] === 'genre') to = p[1] ? '/genre/' + p[1] + '/' : '/genre/';
    else if (p[0] === 'browse' && p[1] === 'type' && p[2]) to = '/category/' + p[2] + '/';
    else if (p[0] === 'browse' && p[1] === 'era' && p[2]) to = '/era/' + p[2] + '/';
    else if (p[0] === 'home') to = '/';
    if (to && to !== location.pathname) location.replace(to);
  })();

  /* ── Active nav state from current path ── */
  (function markActiveNav() {
    var path = location.pathname;
    var key = 'home';
    if (path === '/') key = 'landing';
    else if (path.indexOf('/lives') === 0) key = 'home';
    else if (path.indexOf('/genre') === 0) key = 'genre';
    else if (path.indexOf('/category/anime') === 0) key = 'anime';
    else if (path.indexOf('/category/classic') === 0) key = 'classic';
    else if (path.indexOf('/library') === 0) key = 'library';
    else key = '';
    document.querySelectorAll('[data-page]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === key);
    });
  })();

  /* ── Navbar background on scroll ── */
  var nav = document.getElementById('top-nav');
  if (nav) {
    var onScroll = function () {
      nav.style.background = window.scrollY > 100 ? 'rgba(14,14,14,0.95)' : 'rgba(14,14,14,0.6)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Hero rotation (homepage) ── */
  var hero = document.getElementById('hero-section');
  if (hero && hero.dataset.hero) {
    var slides = [];
    try { slides = JSON.parse(hero.dataset.hero); } catch (e) {}
    if (slides.length > 1) {
      var i = 0;
      var img = document.getElementById('hero-img');
      var title = document.getElementById('hero-title');
      var desc = document.getElementById('hero-desc');
      var link = document.getElementById('hero-link');
      var dots = document.querySelectorAll('#hero-dots button');
      var show = function (n) {
        i = n;
        var s = slides[i];
        if (img) img.src = s.logo;
        if (title) title.textContent = s.name;
        if (desc) desc.textContent = s.desc || '';
        if (link) link.href = s.href;
        dots.forEach(function (d, k) {
          d.style.width = k === i ? '24px' : '8px';
          d.style.background = k === i ? 'var(--primary)' : 'var(--surface-container-highest)';
        });
      };
      dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.dataset.i); }); });
      setInterval(function () { show((i + 1) % slides.length); }, 6000);
    }
  }

  /* ── Season tabs (cartoon page) ──
   * Chips on desktop, native <select> on mobile — both drive the same switch. */
  var tabs = document.getElementById('season-tabs');
  function switchSeason(id) {
    document.querySelectorAll('.season-list').forEach(function (list) {
      list.style.display = list.dataset.season === id ? '' : 'none';
    });
    if (tabs) tabs.querySelectorAll('.season-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.season === id); });
    var sel = document.getElementById('season-select');
    if (sel && sel.value !== id) sel.value = id;
  }
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.season-tab');
      if (!btn) return;
      switchSeason(btn.dataset.season);
    });
    var act = tabs.querySelector('.season-tab.active');
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  var seasonSel = document.getElementById('season-select');
  if (seasonSel) seasonSel.addEventListener('change', function () { switchSeason(seasonSel.value); });

  /* ── Mobile playlist sheet (watch page) ──
   * The player-sidebar doubles as a bottom sheet: one tap on the toolbar
   * button opens it without scrolling past the whole page. */
  (function playlistSheet() {
    var openBtn = document.getElementById('open-playlist');
    var panel = document.getElementById('playlist-panel');
    var backdrop = document.getElementById('playlist-backdrop');
    var closeBtn = document.getElementById('close-playlist');
    if (!openBtn || !panel) return;
    function show() {
      panel.classList.add('open');
      if (backdrop) backdrop.hidden = false;
      var act = panel.querySelector('.sidebar-ep.active');
      if (act && act.scrollIntoView) setTimeout(function () { act.scrollIntoView({ block: 'center' }); }, 250);
    }
    function hide() {
      panel.classList.remove('open');
      if (backdrop) backdrop.hidden = true;
    }
    openBtn.addEventListener('click', show);
    if (closeBtn) closeBtn.addEventListener('click', hide);
    if (backdrop) backdrop.addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  })();

  /* ── Auto-next episode ──
   * On 'ended', offer the next episode with a short countdown (cancelable).
   * Keeps binge sessions going = more watched episodes per visit. */
  (function autoNext() {
    var v = document.getElementById('video-player');
    var nextLink = document.getElementById('next-ep-link');
    if (!v || !nextLink) return;
    v.addEventListener('ended', function () {
      var holder = document.getElementById('video-container');
      if (!holder || document.getElementById('next-up-card')) return;
      var card = document.createElement('div');
      card.id = 'next-up-card';
      var title = (nextLink.textContent || 'الحلقة التالية').trim().replace(/\s+/g, ' ');
      card.innerHTML =
        '<div class="nu-label">الحلقة التالية</div>' +
        '<div class="nu-title">' + title.replace(/^التالي\s*/, '') + '</div>' +
        '<div class="nu-timer">تبدأ بعد <span class="nu-count">7</span></div>' +
        '<div class="nu-actions"><button type="button" class="nu-cancel">إلغاء</button></div>';
      holder.appendChild(card);
      var count = 7;
      var timerEl = card.querySelector('.nu-count');
      var iv = setInterval(function () {
        count -= 1;
        if (timerEl) timerEl.textContent = String(count);
        if (count <= 0) { clearInterval(iv); try { sessionStorage.setItem('kg_auto', '1'); } catch (e) {} location.href = nextLink.href; }
      }, 1000);
      card.querySelector('.nu-cancel').addEventListener('click', function () {
        clearInterval(iv);
        card.remove();
      });
    });
    /* Playback after the auto-next navigation is handled by js/player.js:
       sound-on first, muted + unmute pill as the mobile-policy fallback. */
  })();

  /* ── Search overlay ── */
  var searchIndex = null;
  var loadingIndex = false;
  function ensureIndex() {
    if (searchIndex || loadingIndex) return;
    loadingIndex = true;
    fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (data) {
      searchIndex = data;
      var input = document.getElementById('search-input');
      if (input && input.value.trim().length >= 2) doSearch();
    }).catch(function () { loadingIndex = false; });
  }

  window.openSearch = function () {
    var ov = document.getElementById('search-overlay');
    if (!ov) return;
    ov.classList.add('open');
    ensureIndex();
    setTimeout(function () { var i = document.getElementById('search-input'); if (i) i.focus(); }, 150);
  };
  window.closeSearch = function () {
    var ov = document.getElementById('search-overlay');
    if (!ov) return;
    ov.classList.remove('open');
    var i = document.getElementById('search-input');
    if (i) i.value = '';
    var c = document.getElementById('search-results');
    if (c) c.innerHTML = '<p class="text-center text-muted" style="padding:2rem">اكتب اسم المسلسل للبحث...</p>';
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function doSearch() {
    var input = document.getElementById('search-input');
    var c = document.getElementById('search-results');
    if (!input || !c) return;
    var q = input.value.trim().toLowerCase();
    if (q.length < 2) { c.innerHTML = '<p class="text-center text-muted" style="padding:2rem">اكتب اسم المسلسل للبحث...</p>'; return; }
    if (!searchIndex) { ensureIndex(); c.innerHTML = '<p class="text-center text-muted" style="padding:2rem">جارٍ التحميل...</p>'; return; }
    var res = searchIndex.filter(function (x) {
      return (x.n && x.n.toLowerCase().indexOf(q) !== -1) || (x.s && x.s.toLowerCase().indexOf(q) !== -1) || (x.g && x.g.toLowerCase().indexOf(q) !== -1);
    }).slice(0, 20);
    if (!res.length) { c.innerHTML = '<p class="text-center text-muted" style="padding:2rem">لا توجد نتائج لـ "' + esc(q) + '"</p>'; return; }
    c.innerHTML = res.map(function (x) {
      return '<a class="search-result-item" href="/cartoon/' + esc(x.s) + '/">' +
        '<div class="search-result-thumb"><img src="' + esc(x.l) + '" alt="' + esc(x.n) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'"></div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;margin-bottom:.25rem">' + esc(x.n) + '</div>' +
        '<div style="font-size:.8rem;color:var(--on-surface-variant)">' + esc(x.ep) + ' حلقة • ' + esc(x.g || '') + '</div></div>' +
        (x.e ? '<span style="font-size:.7rem;background:var(--surface-container-high);padding:.2rem .5rem;border-radius:var(--radius-full);color:var(--primary)">' + esc(x.e) + '</span>' : '') +
        '</a>';
    }).join('');
  }

  var input = document.getElementById('search-input');
  if (input) {
    var t = null;
    var trigger = function () { clearTimeout(t); t = setTimeout(doSearch, 150); };
    ['input', 'keyup', 'compositionend'].forEach(function (ev) { input.addEventListener(ev, trigger); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeSearch();
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); window.openSearch(); }
  });

  /* ── Video player: keep playback inside the page player ──
   * PIP (and the controls download button) move viewing outside the page,
   * which bypasses the player experience the site is monetized around.
   * The <video> tag carries disablepictureinpicture + controlslist="nodownload"
   * server-side; this is the belt-and-suspenders fallback for browsers that
   * ignore the attribute or expose PIP via their own UI (Safari). */
  (function guardPlayer() {
    var v = document.getElementById('video-player');
    if (!v) return;
    try { v.disablePictureInPicture = true; } catch (e) {}
    v.addEventListener('enterpictureinpicture', function () {
      if (document.pictureInPictureElement) document.exitPictureInPicture().catch(function () {});
    });
    if (typeof v.webkitSetPresentationMode === 'function') {
      v.addEventListener('webkitpresentationmodechanged', function () {
        if (v.webkitPresentationMode === 'picture-in-picture') v.webkitSetPresentationMode('inline');
      });
    }
    v.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  })();

  /* ── PWA: install prompt + service worker ── */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    var btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'inline-flex';
  });
  window.installPWA = function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; });
  };
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
