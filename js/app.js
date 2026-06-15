/**
 * Kartoney.com — Main Application
 * SPA-like routing with hash-based navigation
 */

// ══════════════════════════════════════════════
// PWA Installation Handlers
// ══════════════════════════════════════════════
let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ ServiceWorker registered with scope:', reg.scope))
      .catch(err => console.log('❌ ServiceWorker registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show the install button if it exists
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.style.display = 'none';
    }
    deferredPrompt = null;
  });
}

// ══════════════════════════════════════════════
// State
// ══════════════════════════════════════════════
let currentPage = 'home';
let currentCartoon = null;
let currentEpisode = null;
let heroInterval = null;
let heroCartoons = [];
let heroIndex = 0;

// ══════════════════════════════════════════════
// Router
// ══════════════════════════════════════════════
function navigate(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'home';
  const parts = hash.split('/');
  const page = parts[0];

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Close search if open
  closeSearch();

  switch (page) {
    case 'home':
      showHomePage();
      break;
    case 'cartoon':
      showCartoonPage(parts[1]); // slug
      break;
    case 'watch':
      showPlayerPage(parseInt(parts[1]), parseInt(parts[2])); // cartoonId, episodeId
      break;
    case 'genre':
      showGenrePage(parts[1]); // genre slug
      break;
    case 'browse':
      showBrowsePage(parts[1], parts[2]); // type, value
      break;
    default:
      showHomePage();
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', handleRoute);

// ══════════════════════════════════════════════
// Initialize
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initDB().then(() => {
    document.getElementById('loading-screen').classList.add('hidden');
    handleRoute();
  }).catch(err => {
    document.getElementById('loading-screen').innerHTML = `
      <div style="text-align:center;color:var(--error)">
        <p style="font-size:1.5rem;font-weight:700;margin-bottom:1rem">خطأ في تحميل البيانات</p>
        <p>يرجى تحديث الصفحة</p>
      </div>
    `;
  });
});

// ══════════════════════════════════════════════
// HOME PAGE
// ══════════════════════════════════════════════
function showHomePage() {
  currentPage = 'home';
  updateNavActive('home');
  const page = document.getElementById('page-home');
  page.classList.add('active');

  // Only render if not already rendered
  if (page.dataset.rendered) return;
  page.dataset.rendered = '1';

  renderHero();
  renderPopularRow();
  renderGenreChips();
  renderGenreResults(null);
  renderBentoGrid();
  renderSuggestedRow();
  renderEraSection();
  document.title = 'كارتوني - عالم الكرتون العربي | Kartoney.com';
}

function renderHero() {
  heroCartoons = getFeaturedCartoons();
  if (heroCartoons.length === 0) return;

  heroIndex = 0;
  updateHero();

  // Auto-rotate hero every 6 seconds
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(() => {
    heroIndex = (heroIndex + 1) % heroCartoons.length;
    updateHero();
  }, 6000);
}

function updateHero() {
  const c = heroCartoons[heroIndex];
  if (!c) return;

  const hero = document.getElementById('hero-section');
  hero.innerHTML = `
    <div class="hero-bg">
      <img src="${c.logo}" alt="${c.name}" loading="eager"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 450%22><rect fill=%22%231a1919%22 width=%22800%22 height=%22450%22/></svg>'">
      <div class="hero-gradient"></div>
      <div class="hero-side-gradient"></div>
    </div>
    <div class="hero-content fadeIn">
      <div class="hero-badge">
        <span class="tag">⭐ الأكثر شهرة</span>
      </div>
      <h1>${c.name}</h1>
      <p class="hero-desc">${c.description || ''}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="navigate('cartoon/${c.slug}')">
          <span class="icon icon-filled">play_arrow</span>
          مشاهدة
        </button>
        <button class="btn btn-glass" onclick="navigate('cartoon/${c.slug}')">
          <span class="icon">info</span>
          المزيد
        </button>
      </div>
      <div class="hero-dots" style="display:flex;gap:8px;margin-top:1.5rem">
        ${heroCartoons.map((_, i) => `
          <button onclick="heroIndex=${i};updateHero()"
            style="width:${i === heroIndex ? '24px' : '8px'};height:8px;border-radius:4px;
            background:${i === heroIndex ? 'var(--primary)' : 'var(--surface-container-highest)'};
            transition:all 0.3s;cursor:pointer;border:none"></button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPopularRow() {
  const cartoons = getPopularCartoons(12);
  const container = document.getElementById('popular-row');
  container.innerHTML = cartoons.map(c => createLandscapeCard(c)).join('');
}

function renderGenreChips() {
  const genres = getGenres();
  const container = document.getElementById('genre-chips');
  container.innerHTML = `
    <button class="genre-chip active" onclick="filterByGenre(null, this)">
      <span class="genre-icon">🎬</span> الكل
    </button>
    ${genres.map(g => `
      <button class="genre-chip" onclick="filterByGenre('${g.name_en}', this)">
        <span class="genre-icon">${g.icon}</span> ${g.name_ar}
      </button>
    `).join('')}
  `;
}

function filterByGenre(genre, btn) {
  // Update active state
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderGenreResults(genre);
}

function renderGenreResults(genre) {
  const container = document.getElementById('genre-results');
  let cartoons;
  if (genre) {
    cartoons = getCartoonsByGenre(genre, 20);
  } else {
    cartoons = getCartoons({ limit: 20 });
  }
  // Animate in
  container.style.opacity = '0';
  container.innerHTML = cartoons.map(c => createPortraitCard(c)).join('');
  requestAnimationFrame(() => {
    container.style.transition = 'opacity 0.4s ease';
    container.style.opacity = '1';
  });
}

function renderBentoGrid() {
  const cartoons = getCartoons({ limit: 4 });
  const container = document.getElementById('bento-grid');
  if (cartoons.length < 4) return;

  container.innerHTML = `
    <div class="bento-item featured" onclick="navigate('cartoon/${cartoons[0].slug}')">
      <img src="${cartoons[0].logo}" alt="${cartoons[0].name}"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 600%22><rect fill=%22%231a1919%22 width=%22400%22 height=%22600%22/></svg>'">
      <div class="bento-overlay"></div>
      <div class="bento-content">
        <span style="display:inline-block;background:var(--secondary);color:var(--on-secondary);padding:0.2rem 0.6rem;border-radius:var(--radius-full);font-size:0.7rem;font-weight:700;margin-bottom:0.5rem">
          ${cartoons[0].total_episodes} حلقة
        </span>
        <h3 style="font-size:1.5rem;font-weight:900;margin-bottom:0.25rem">${cartoons[0].name}</h3>
        <p style="color:var(--on-surface-variant);font-size:0.8rem">${cartoons[0].genres_ar || ''}</p>
      </div>
    </div>
    ${cartoons.slice(1, 4).map(c => `
      <div class="bento-item" onclick="navigate('cartoon/${c.slug}')" style="min-height:180px">
        <img src="${c.logo}" alt="${c.name}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 200%22><rect fill=%22%231a1919%22 width=%22400%22 height=%22200%22/></svg>'">
        <div class="bento-small-overlay"></div>
        <div class="bento-small-title">
          <h4>${c.name}</h4>
        </div>
      </div>
    `).join('')}
  `;
}

function renderSuggestedRow() {
  const cartoons = getRandomCartoons(8);
  const container = document.getElementById('suggested-row');
  container.innerHTML = cartoons.map(c => createPortraitCard(c)).join('');
}

function renderEraSection() {
  const eras = [
    { key: '80s', label: 'كرتون الثمانينات', emoji: '📺' },
    { key: '90s', label: 'كرتون التسعينات', emoji: '🎮' },
    { key: '2000s', label: 'كرتون الألفية', emoji: '💿' },
    { key: '2010s', label: 'أنمي حديث', emoji: '🔥' }
  ];

  const container = document.getElementById('era-section');
  container.innerHTML = eras.map(era => {
    const cartoons = getCartoonsByEra(era.key, 6);
    if (cartoons.length === 0) return '';
    return `
      <section style="margin-bottom:var(--space-16)">
        <div class="section-header">
          <h2 class="section-title">
            <span class="accent"></span>
            ${era.emoji} ${era.label}
          </h2>
          <a href="#browse/era/${era.key}" class="section-link">عرض الكل</a>
        </div>
        <div class="scroll-row no-scrollbar">
          ${cartoons.map(c => createLandscapeCard(c)).join('')}
        </div>
      </section>
    `;
  }).join('');
}

// ══════════════════════════════════════════════
// CARTOON DETAIL PAGE
// ══════════════════════════════════════════════
function showCartoonPage(slug) {
  currentPage = 'cartoon';
  updateNavActive('');
  document.getElementById('page-home').dataset.rendered = '';

  const page = document.getElementById('page-cartoon');
  page.classList.add('active');

  const cartoon = getCartoonBySlug(slug);
  if (!cartoon) {
    page.innerHTML = '<div style="padding:8rem 2rem;text-align:center"><h2>لم يتم العثور على المسلسل</h2></div>';
    return;
  }

  currentCartoon = cartoon;
  const seasons = getSeasons(cartoon.id);
  const firstSeason = seasons[0];
  const episodes = firstSeason ? getEpisodes(firstSeason.id) : [];

  page.innerHTML = `
    <!-- Detail Hero -->
    <div class="detail-hero">
      <div class="detail-hero-bg">
        <img src="${cartoon.logo}" alt="${cartoon.name}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 450%22><rect fill=%22%231a1919%22 width=%22800%22 height=%22450%22/></svg>'">
      </div>
      <div class="detail-hero-gradient"></div>
      <div class="detail-hero-content fadeIn">
        ${seasons.length > 1 ? `<span class="detail-season-badge">${seasons.length} أجزاء</span>` : ''}
        <h1 class="detail-title">${cartoon.name}</h1>
        <p class="detail-desc">${cartoon.description || ''}</p>
        <div class="detail-info">
          <span><span class="icon" style="font-size:18px">calendar_today</span> ${cartoon.era || ''}</span>
          <span><span class="icon" style="font-size:18px">movie</span> ${cartoon.total_episodes} حلقة</span>
          <span><span class="icon" style="font-size:18px">tv</span> ${cartoon.total_seasons} ${cartoon.total_seasons > 1 ? 'أجزاء' : 'جزء'}</span>
          <span style="background:var(--surface-container-high);padding:0.2rem 0.6rem;border-radius:var(--radius-full);font-size:0.75rem">
            ${cartoon.status === 'completed' ? '✅ مكتمل' : '🔄 مستمر'}
          </span>
        </div>
        <div class="hero-actions">
          ${episodes.length > 0 ? `
            <button class="btn btn-primary" onclick="navigate('watch/${cartoon.id}/${episodes[0].id}')">
              <span class="icon icon-filled">play_arrow</span>
              شاهد الآن
            </button>
          ` : ''}
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
          ${(cartoon.genres_ar || '').split(',').map(g => `
            <span style="background:var(--surface-container-high);padding:0.3rem 0.8rem;border-radius:var(--radius-full);font-size:0.75rem;color:var(--primary)">${g.trim()}</span>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Episodes Section -->
    <div class="episodes-section" style="padding-right:2rem;padding-left:2rem">
      <div class="section-header">
        <h2 class="section-title">
          <span class="accent gold"></span>
          قائمة الحلقات
        </h2>
      </div>

      <!-- Season Tabs -->
      ${seasons.length > 1 ? `
        <div class="season-tabs no-scrollbar" id="season-tabs">
          ${seasons.map((s, i) => `
            <button class="season-tab ${i === 0 ? 'active' : ''}"
                    onclick="switchSeason(${s.id}, ${cartoon.id}, this)">
              ${s.name}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <!-- Episode List -->
      <div class="episode-list" id="episode-list">
        ${renderEpisodeList(episodes, cartoon.id)}
      </div>
    </div>

    <!-- Related Cartoons -->
    <div style="padding:2rem">
      <div class="section-header">
        <h2 class="section-title">
          <span class="accent red"></span>
          مسلسلات مشابهة
        </h2>
      </div>
      <div class="scroll-row no-scrollbar">
        ${getRandomCartoons(8, cartoon.id).map(c => createLandscapeCard(c)).join('')}
      </div>
    </div>
  `;
}

function switchSeason(seasonId, cartoonId, btn) {
  // Update active tab
  document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // Load episodes
  const episodes = getEpisodes(seasonId);
  document.getElementById('episode-list').innerHTML = renderEpisodeList(episodes, cartoonId);
}

function renderEpisodeList(episodes, cartoonId) {
  return episodes.map((ep, i) => `
    <div class="episode-item" onclick="navigate('watch/${cartoonId}/${ep.id}')">
      <span class="episode-number">${i + 1}</span>
      <div class="episode-thumb">
        <img src="${ep.logo}" alt="${ep.title}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 160 90%22><rect fill=%22%231a1919%22 width=%22160%22 height=%2290%22/></svg>'">
      </div>
      <div class="episode-info">
        <h4>${ep.title}</h4>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════
// VIDEO PLAYER PAGE
// ══════════════════════════════════════════════
function showPlayerPage(cartoonId, episodeId) {
  currentPage = 'watch';
  updateNavActive('');

  const page = document.getElementById('page-player');
  page.classList.add('active');

  const cartoon = getCartoonById(cartoonId);
  const episode = getEpisodeById(episodeId);
  if (!cartoon || !episode) {
    page.innerHTML = '<div style="padding:8rem 2rem;text-align:center"><h2>الحلقة غير موجودة</h2></div>';
    return;
  }

  currentCartoon = cartoon;
  currentEpisode = episode;

  const { prev, next } = getAdjacentEpisodes(episodeId, cartoonId);
  const allEps = getAllEpisodes(cartoonId);

  page.innerHTML = `
    <div class="player-page">
      <div class="player-main">
        <!-- Video Player -->
        <div class="video-container" id="video-container">
          <video id="video-player" controls preload="metadata" poster="${episode.logo}">
            <source src="${episode.url}" type="video/mp4">
            المتصفح لا يدعم تشغيل الفيديو
          </video>
        </div>

        <!-- Title -->
        <h1 class="video-title">${episode.title}</h1>

        <!-- Cartoon Info Bar -->
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:var(--surface-container);border-radius:var(--radius)">
          <img src="${cartoon.logo}" alt="${cartoon.name}" style="width:48px;height:48px;border-radius:var(--radius-sm);object-fit:cover"
               onerror="this.style.display='none'">
          <div style="flex:1">
            <a href="#cartoon/${cartoon.slug}" style="font-weight:700;color:var(--primary);font-size:0.95rem">${cartoon.name}</a>
            <p style="color:var(--on-surface-variant);font-size:0.8rem">${cartoon.total_episodes} حلقة • ${cartoon.genres_ar || ''}</p>
          </div>
        </div>

        <!-- Navigation -->
        <div class="video-nav">
          ${prev ? `
            <a href="#watch/${cartoonId}/${prev.id}">
              <span class="icon">arrow_forward</span>
              <div>
                <div class="label">السابق</div>
                <div>${prev.title}</div>
              </div>
            </a>
          ` : '<div></div>'}
          ${next ? `
            <a href="#watch/${cartoonId}/${next.id}" style="text-align:left">
              <div>
                <div class="label">التالي</div>
                <div>${next.title}</div>
              </div>
              <span class="icon">arrow_back</span>
            </a>
          ` : '<div></div>'}
        </div>
      </div>

      <!-- Sidebar - Episode List -->
      <div class="player-sidebar">
        <h3>
          <span class="icon" style="font-size:20px;color:var(--primary)">playlist_play</span>
          قائمة الحلقات
        </h3>
        <div class="sidebar-ep-list no-scrollbar">
          ${allEps.map(ep => `
            <a href="#watch/${cartoonId}/${ep.id}" class="sidebar-ep ${ep.id === episodeId ? 'active' : ''}">
              <div class="sidebar-ep-thumb">
                <img src="${ep.logo}" alt="${ep.title}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 160 90%22><rect fill=%22%231a1919%22 width=%22160%22 height=%2290%22/></svg>'">
              </div>
              <div class="sidebar-ep-info">
                <h5>${ep.title}</h5>
                <small>${ep.season_name || ''}</small>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Scroll the active episode into view in the sidebar
  setTimeout(() => {
    const activeEp = document.querySelector('.sidebar-ep.active');
    if (activeEp) activeEp.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 300);
}

// ══════════════════════════════════════════════
// GENRE PAGE
// ══════════════════════════════════════════════
function showGenrePage(genreSlug) {
  currentPage = 'genre';
  updateNavActive('');

  const page = document.getElementById('page-genre');
  page.classList.add('active');

  const genres = getGenres();
  const genre = genres.find(g => g.name_en === genreSlug);
  const cartoons = genreSlug ? getCartoonsByGenre(genreSlug, 100) : getCartoons({ limit: 100 });
  const label = genre ? genre.name_ar : 'جميع المسلسلات';

  page.innerHTML = `
    <div style="padding:calc(var(--navbar-h) + 2rem) 2rem 6rem">
      <h1 style="font-size:2rem;font-weight:900;margin-bottom:0.5rem">
        ${genre ? genre.icon : '🎬'} ${label}
      </h1>
      <p style="color:var(--on-surface-variant);margin-bottom:2rem">${cartoons.length} مسلسل</p>

      <div class="genre-row no-scrollbar" style="margin-bottom:2rem">
        <button class="genre-chip ${!genreSlug ? 'active' : ''}" onclick="navigate('genre/')">
          🎬 الكل
        </button>
        ${genres.map(g => `
          <button class="genre-chip ${g.name_en === genreSlug ? 'active' : ''}" onclick="navigate('genre/${g.name_en}')">
            ${g.icon} ${g.name_ar}
          </button>
        `).join('')}
      </div>

      <div class="cartoons-grid">
        ${cartoons.map(c => createPortraitCard(c)).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// BROWSE PAGE
// ══════════════════════════════════════════════
function showBrowsePage(type, value) {
  currentPage = 'browse';
  updateNavActive('');

  const page = document.getElementById('page-genre');
  page.classList.add('active');

  let cartoons = [];
  let title = '';

  if (type === 'era') {
    cartoons = getCartoonsByEra(value, 100);
    const eraLabels = { '80s': 'كرتون الثمانينات', '90s': 'كرتون التسعينات', '2000s': 'كرتون الألفية', '2010s': 'أنمي حديث' };
    title = eraLabels[value] || value;
  } else if (type === 'type') {
    cartoons = getCartoons({ type: value, limit: 100 });
    const typeLabels = { 'anime': 'أنمي', 'classic': 'كرتون كلاسيكي', 'modern': 'كرتون حديث' };
    title = typeLabels[value] || value;
  }

  page.innerHTML = `
    <div style="padding:calc(var(--navbar-h) + 2rem) 2rem 6rem">
      <h1 style="font-size:2rem;font-weight:900;margin-bottom:0.5rem">${title}</h1>
      <p style="color:var(--on-surface-variant);margin-bottom:2rem">${cartoons.length} مسلسل</p>
      <div class="cartoons-grid">
        ${cartoons.map(c => createPortraitCard(c)).join('')}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════
let searchDebounce = null;

function openSearch() {
  document.getElementById('search-overlay').classList.add('open');
  const input = document.getElementById('search-input');
  setTimeout(() => {
    input.focus();
    input.click();
  }, 150);
}

function closeSearch() {
  document.getElementById('search-overlay').classList.remove('open');
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  const container = document.getElementById('search-results');
  if (container) container.innerHTML = '<p style="text-align:center;color:var(--on-surface-variant);padding:2rem">اكتب اسم المسلسل للبحث...</p>';
}

function doSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  const q = input.value.trim();
  const container = document.getElementById('search-results');

  if (q.length < 2) {
    container.innerHTML = '<p style="text-align:center;color:var(--on-surface-variant);padding:2rem">اكتب اسم المسلسل للبحث...</p>';
    return;
  }

  const cartoons = searchCartoons(q, 15);

  if (cartoons.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--on-surface-variant);padding:2rem">لا توجد نتائج لـ "' + q + '"</p>';
    return;
  }

  container.innerHTML = cartoons.map(c => `
    <div class="search-result-item" onclick="closeSearch();navigate('cartoon/${c.slug}')">
      <div class="search-result-thumb">
        <img src="${c.logo}" alt="${c.name}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 60 60%22><rect fill=%22%231a1919%22 width=%2260%22 height=%2260%22/></svg>'">
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;margin-bottom:0.25rem">${c.name}</div>
        <div style="font-size:0.8rem;color:var(--on-surface-variant)">${c.total_episodes} حلقة • ${c.genres_ar || ''}</div>
      </div>
      <span style="font-size:0.7rem;background:var(--surface-container-high);padding:0.2rem 0.5rem;border-radius:var(--radius-full);color:var(--primary)">${c.era || ''}</span>
    </div>
  `).join('');
}

// Attach search listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    // Debounced search handler
    const triggerSearch = () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(doSearch, 150);
    };
    // Multiple events to cover all browsers/keyboards
    searchInput.addEventListener('input', triggerSearch);
    searchInput.addEventListener('keyup', triggerSearch);
    searchInput.addEventListener('compositionend', triggerSearch);
    searchInput.addEventListener('change', triggerSearch);
  }
});

// ══════════════════════════════════════════════
// CARD TEMPLATES
// ══════════════════════════════════════════════
function createLandscapeCard(c) {
  return `
    <div class="card-landscape" onclick="navigate('cartoon/${c.slug}')">
      <div class="card-thumb">
        <img src="${c.logo}" alt="${c.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 280 158%22><rect fill=%22%231a1919%22 width=%22280%22 height=%22158%22/></svg>'">
        <div class="card-overlay">
          <div class="card-play">
            <span class="icon icon-filled" style="font-size:20px">play_arrow</span>
          </div>
        </div>
      </div>
      <h3 class="card-title">${c.name}</h3>
      <div class="card-meta">
        <span>${c.total_episodes} حلقة</span>
        <span class="dot"></span>
        <span>${c.genres_ar || ''}</span>
      </div>
    </div>
  `;
}

function createPortraitCard(c) {
  return `
    <div class="card-portrait" onclick="navigate('cartoon/${c.slug}')">
      <div class="card-thumb">
        <img src="${c.logo}" alt="${c.name}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 180 270%22><rect fill=%22%231a1919%22 width=%22180%22 height=%22270%22/></svg>'">
        <span class="badge">${c.era || ''}</span>
      </div>
      <h3 class="card-title">${c.name}</h3>
    </div>
  `;
}

// ══════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════
function updateNavActive(page) {
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSearch();
  if (e.key === '/' && !document.querySelector('.search-overlay.open') && 
      document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    openSearch();
  }
});

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const nav = document.getElementById('top-nav');
  const scrollY = window.scrollY;
  if (scrollY > 100) {
    nav.style.background = 'rgba(14, 14, 14, 0.95)';
  } else {
    nav.style.background = 'rgba(14, 14, 14, 0.6)';
  }
  lastScroll = scrollY;
});
