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
    if (path.indexOf('/genre') === 0) key = 'genre';
    else if (path.indexOf('/category/anime') === 0) key = 'anime';
    else if (path.indexOf('/category/classic') === 0) key = 'classic';
    else if (path.indexOf('/library') === 0) key = 'library';
    else if (path !== '/') key = '';
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

  /* ── Season tabs (cartoon page) ── */
  var tabs = document.getElementById('season-tabs');
  if (tabs) {
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.season-tab');
      if (!btn) return;
      var id = btn.dataset.season;
      tabs.querySelectorAll('.season-tab').forEach(function (t) { t.classList.toggle('active', t === btn); });
      document.querySelectorAll('.season-list').forEach(function (list) {
        list.style.display = list.dataset.season === id ? '' : 'none';
      });
    });
  }

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
