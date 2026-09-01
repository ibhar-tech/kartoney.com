/* Kartoney modern player — lifecycle-driven, zero dependencies.
 * Keeps the native controls as the base (kids + mobile safe) and adds the
 * monetization/UX layer the native player can't do:
 *
 *   PREROLL   first play of a session → countdown overlay with a 300x250
 *             banner, resumes inside the user's tap gesture.
 *   PAUSE AD  user pause mid-video → 300x250 overlay, hides on resume;
 *             ✕ close starts a cooldown so frequent pausing isn't punished.
 *   BINGE     after auto-next navigation, tries sound-on autoplay, falls back
 *             to muted autoplay + «اضغط للصوت» pill (mobile autoplay policy).
 *   GESTURES  double-tap to seek ±10s, long-press for 2x speed (touch only —
 *             desktop keeps native click/double-click semantics).
 *   EXTRAS    Media Session lockscreen controls, buffering spinner.
 *
 * The <video> element is still the single source of truth; nothing here
 * wrappers or replaces it. Ad unit keys arrive via data-* attributes on
 * #video-container (rendered by src/templates.mjs from src/config.mjs). */
(function () {
  'use strict';

  var v = document.getElementById('video-player');
  var box = document.getElementById('video-container');
  if (!v || !box) return;

  /* ── config from the server ─────────────────────────────────────────── */
  function num(x, d) { var n = parseInt(x, 10); return isNaN(n) ? d : n; }
  var PREROLL = {
    key: box.getAttribute('data-preroll-key') || '',
    src: box.getAttribute('data-preroll-src') || '',
    seconds: num(box.getAttribute('data-preroll-seconds'), 5),
    once: box.getAttribute('data-preroll-once') !== 'false'
  };
  var PAUSE = {
    key: box.getAttribute('data-pause-key') || '',
    src: box.getAttribute('data-pause-src') || '',
    cooldownMin: num(box.getAttribute('data-pause-cooldown'), 5)
  };
  PREROLL.enabled = !!(PREROLL.key && PREROLL.src);
  PAUSE.enabled = !!(PAUSE.key && PAUSE.src);

  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, val) { try { sessionStorage.setItem(k, val); } catch (e) {} }
  function sdel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  function nowSec() { return Math.floor(Date.now() / 1000); }

  /* ── isolated banner iframe (same technique as js/widgets.js) ────────── */
  function mountBanner(host, key, src, w, h) {
    var f = document.createElement('iframe');
    f.width = w; f.height = h; f.scrolling = 'no'; f.title = 'إعلان';
    f.setAttribute('frameborder', '0');
    f.style.cssText = 'border:0;display:block;margin:0 auto;max-width:100%;width:' + w + 'px;height:' + h + 'px;';
    host.appendChild(f);
    try {
      var d = f.contentDocument;
      d.open();
      d.write('<body style="margin:0"><script>var atOptions={"key":"' + key + '","format":"iframe","height":' + h + ',"width":' + w + ',"params":{}};<\/script><script src="' + src + '"><\/script></body>');
      d.close();
    } catch (e) {}
    return f;
  }

  /* ═══════════════════════ PREROLL ═══════════════════════
   * One overlay, created on demand at the first play intent of the session.
   * The native 'play' event is intercepted: we pause the video, show the
   * countdown + ad, and hand control back through a button the user taps
   * (a programmatic play() five seconds after the gesture would be blocked
   * by mobile autoplay policies — a button tap never is). */
  var holdingForPreroll = false, prerollShown = false;

  function prerollDue() {
    if (!PREROLL.enabled) return false;
    if (PREROLL.once && sget('kg_pr_done') === '1') return false;
    if (v.currentTime > 2) return false; // mid-video: never interrupt
    if (v.muted) return false;           // muted plays are programmatic (binge auto-next), never interrupt
    return true;
  }

  function showPreroll() {
    prerollShown = true;
    holdingForPreroll = true;
    v.pause();
    sset('kg_pr_done', '1');

    var ov = document.createElement('div');
    ov.className = 'kp-preroll';
    ov.innerHTML =
      '<div class="kp-preroll-head">ستبدأ الحلقة بعد ثوانٍ…</div>' +
      '<div class="kp-preroll-ad"></div>' +
      '<button type="button" class="kp-preroll-go" disabled>الرجاء الانتظار ' + PREROLL.seconds + '…</button>' +
      '<div class="kp-preroll-note">الإعلانات هي ما يُبقي كارتوني مجاناً 💛</div>';
    box.appendChild(ov);
    mountBanner(ov.querySelector('.kp-preroll-ad'), PREROLL.key, PREROLL.src, 300, 250);

    var btn = ov.querySelector('.kp-preroll-go');
    var left = PREROLL.seconds;
    var iv = setInterval(function () {
      left -= 1;
      if (left > 0) { btn.textContent = 'الرجاء الانتظار ' + left + '…'; return; }
      clearInterval(iv);
      btn.disabled = false;
      btn.textContent = '▶ تشغيل الحلقة';
      btn.focus({ preventScroll: true });
    }, 1000);

    btn.addEventListener('click', function () {
      ov.remove();
      holdingForPreroll = false;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  v.addEventListener('play', function () {
    if (!holdingForPreroll && !prerollShown && prerollDue()) showPreroll();
    hidePauseAd();
    hideSpinner();
  });

  /* ═══════════════════════ PAUSE AD ═══════════════════════
   * Pausing is a natural attention gap — the exact moment the koralive
   * guide monetizes. The ad iframe is created on the first pause (an
   * impression is only burned when someone actually pauses) and kept for
   * reuse; closing it starts the cooldown timer. */
  var pauseOv = null, pauseClosedAt = 0, userPaused = false;

  function pauseAdDue() {
    if (!PAUSE.enabled) return false;
    if (sget('kg_pr_hold') === '1') return false;
    var until = num(sget('kg_pause_until'), 0);
    if (until && nowSec() < until) return false;
    if (v.currentTime < 1) return false;                    // not started
    if (v.duration && v.duration - v.currentTime < 2) return false; // about to end
    return true;
  }

  function showPauseAd() {
    if (!pauseOv) {
      pauseOv = document.createElement('div');
      pauseOv.className = 'kp-pause';
      pauseOv.innerHTML =
        '<button type="button" class="kp-pause-close" aria-label="إغلاق الإعلان">✕</button>' +
        '<div class="kp-pause-ad"></div>' +
        '<button type="button" class="kp-pause-resume">▶ متابعة المشاهدة</button>';
      pauseOv.querySelector('.kp-pause-close').addEventListener('click', function () {
        pauseClosedAt = nowSec();
        sset('kg_pause_until', String(pauseClosedAt + PAUSE.cooldownMin * 60));
        pauseOv.style.display = 'none';
      });
      pauseOv.querySelector('.kp-pause-resume').addEventListener('click', function () {
        pauseOv.style.display = 'none';
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
      box.appendChild(pauseOv);
      mountBanner(pauseOv.querySelector('.kp-pause-ad'), PAUSE.key, PAUSE.src, 300, 250);
    } else if (pauseClosedAt && nowSec() - pauseClosedAt < PAUSE.cooldownMin * 60) {
      return; // closed recently — reopened ad before cooldown looks naggy
    }
    pauseOv.style.display = 'flex';
  }

  function hidePauseAd() { if (pauseOv) pauseOv.style.display = 'none'; }

  v.addEventListener('pause', function () {
    // Only a real mid-video user pause earns the overlay.
    if (!holdingForPreroll && !v.ended && v.currentTime > 0.5 && pauseAdDue()) showPauseAd();
    showSpinner();
  });

  /* ═══════════════════════ BUFFERING SPINNER ═══════════════════════ */
  var spinner = document.createElement('div');
  spinner.className = 'kp-spinner';
  spinner.innerHTML = '<div class="kp-spinner-ring"></div>';
  spinner.style.display = 'none';
  box.appendChild(spinner);
  var spinTimer = null;

  function showSpinner() {
    if (v.ended || v.readyState >= 3) return;
    if (spinTimer) return;
    spinTimer = setTimeout(function () {
      spinTimer = null;
      if (!v.paused || v.readyState < 3) spinner.style.display = 'flex';
    }, 350);
  }
  function hideSpinner() { spinner.style.display = 'none'; }
  ['playing', 'canplay', 'ended'].forEach(function (ev) { v.addEventListener(ev, hideSpinner); });
  v.addEventListener('waiting', showSpinner);
  v.addEventListener('seeking', showSpinner);
  v.addEventListener('seeked', hideSpinner);

  /* ═══════════════════════ GESTURES (touch only) ═══════════════════════
   * Attached to the video element itself — no overlay layer, so the native
   * controls stay fully usable. Double-tap seeks (timeline convention:
   * right = +10s, left = −10s); long-press temporarily plays at 2x. */
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    var lastTap = 0, lastX = 0;
    var ripple = document.createElement('div');
    ripple.className = 'kp-ripple';
    ripple.style.display = 'none';
    box.appendChild(ripple);
    var rippleTimer = null;
    function showRipple(text, rightSide) {
      ripple.textContent = text;
      ripple.style.display = 'block';
      ripple.style[rightSide ? 'right' : 'left'] = '18%';
      ripple.style[rightSide ? 'left' : 'right'] = 'auto';
      clearTimeout(rippleTimer);
      rippleTimer = setTimeout(function () { ripple.style.display = 'none'; }, 550);
    }

    v.addEventListener('click', function (e) {
      var t = Date.now();
      var r = v.getBoundingClientRect();
      var onRight = (e.clientX - r.left) > r.width / 2;
      if (t - lastTap < 320 && Math.abs(e.clientX - lastX) < 120) {
        lastTap = 0;
        if (v.readyState >= 1 && v.duration) {
          var target = Math.min(Math.max(0, v.currentTime + (onRight ? 10 : -10)), v.duration - 1);
          try { v.currentTime = target; } catch (err) {}
          showRipple(onRight ? '+10 ⏩' : '⏪ −10', onRight);
        }
      } else {
        lastTap = t;
        lastX = e.clientX;
      }
    });

    var pressTimer = null, rateShown = false;
    var badge = document.createElement('div');
    badge.className = 'kp-rate';
    badge.textContent = '2x ▶▶';
    badge.style.display = 'none';
    box.appendChild(badge);
    v.addEventListener('touchstart', function () {
      pressTimer = setTimeout(function () {
        if (!v.paused && v.playbackRate === 1) {
          v.playbackRate = 2;
          rateShown = true;
          badge.style.display = 'block';
        }
      }, 550);
    }, { passive: true });
    function endPress() {
      clearTimeout(pressTimer);
      if (rateShown) { v.playbackRate = 1; rateShown = false; badge.style.display = 'none'; }
    }
    v.addEventListener('touchend', endPress);
    v.addEventListener('touchcancel', endPress);
    v.addEventListener('touchmove', endPress, { passive: true });
  }

  /* ═══════════════════════ BINGE: auto-next autoplay + unmute pill ══════ */
  try {
    if (sget('kg_auto') === '1') {
      sdel('kg_auto');
      var pill = null;
      function showUnmutePill() {
        if (pill) return;
        pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'kp-unmute';
        pill.innerHTML = '🔇 اضغط لتشغيل الصوت';
        pill.addEventListener('click', function () {
          v.muted = false;
          v.volume = 1;
          pill.remove();
          pill = null;
        });
        box.appendChild(pill);
        v.addEventListener('volumechange', function onVol() {
          if (!v.muted && pill) { pill.remove(); pill = null; v.removeEventListener('volumechange', onVol); }
        });
      }
      var p = v.play();
      if (p && p.catch) {
        p.catch(function () {
          // Sound-on blocked → muted autoplay (always allowed), then a pill.
          v.muted = true;
          var p2 = v.play();
          if (p2 && p2.then) p2.then(showUnmutePill).catch(function () {});
          else showUnmutePill();
        });
      }
    }
  } catch (e) {}

  /* ═══════════════════════ MEDIA SESSION (lockscreen) ══════════════════ */
  if ('mediaSession' in navigator) {
    try {
      var title = v.getAttribute('data-title') || document.title;
      var series = v.getAttribute('data-series') || 'كارتوني';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: series,
        album: 'كارتوني',
        artwork: v.poster ? [{ src: v.poster, sizes: '640x360', type: 'image/webp' }] : []
      });
      navigator.mediaSession.setActionHandler('play', function () { v.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { v.pause(); });
      navigator.mediaSession.setActionHandler('seekbackward', function () { try { v.currentTime -= 10; } catch (e) {} });
      navigator.mediaSession.setActionHandler('seekforward', function () { try { v.currentTime += 10; } catch (e) {} });
    } catch (e) {}
  }
})();
