// ALFIJEER — install-as-app helper.
// Shows a small "Install Alfijeer" bar on phones: one tap on Android/Chrome,
// "Add to Home Screen" instructions on iPhone Safari. Never shown inside the
// installed app, and stays away for 14 days after the person dismisses it.
(function () {
  var KEY = 'as_install_dismissed';
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return;
  try { var t = +localStorage.getItem(KEY) || 0; if (Date.now() - t < 14 * 864e5) return; } catch (e) {}

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
  var deferred = null, bar = null;

  var css = document.createElement('style');
  css.textContent =
    '.as-install{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:9000;background:#001233;color:#fff;border-radius:16px;padding:12px 12px 12px 14px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px rgba(0,18,51,.35);font-family:Nunito,system-ui,sans-serif;animation:asUp .35s ease both}' +
    '.as-install img{width:42px;height:42px;border-radius:10px;flex-shrink:0;background:#fff}' +
    '.as-install div{flex:1;min-width:0;font-size:.78rem;line-height:1.35;color:rgba(255,255,255,.8)}' +
    '.as-install b{display:block;color:#FFBE1A;font-size:.9rem}' +
    '.as-install button{border:0;cursor:pointer;font:800 .8rem Nunito,system-ui,sans-serif}' +
    '.as-install .go{background:#FFBE1A;color:#001233;padding:10px 14px;border-radius:10px}' +
    '.as-install .x{background:none;color:rgba(255,255,255,.6);font-size:1.1rem;padding:6px}' +
    '@keyframes asUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}' +
    '@media(min-width:900px){.as-install{display:none}}';
  document.head.appendChild(css);

  function dismiss() {
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    if (bar) { bar.remove(); bar = null; }
  }
  function show(text, action) {
    if (bar || document.querySelector('.as-bar')) return;
    bar = document.createElement('div');
    bar.className = 'as-install as-bar';
    bar.innerHTML = '<img src="/icons/icon-192.png" alt=""><div><b>Get the ALFIJEER app</b>' + text + '</div>' +
      (action ? '<button class="go">Install</button>' : '') + '<button class="x" aria-label="Close">✕</button>';
    bar.querySelector('.x').onclick = dismiss;
    if (action) bar.querySelector('.go').onclick = action;
    document.body.appendChild(bar);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    setTimeout(function () {
      show('Opens full-screen, faster, one tap from your home screen.', function () {
        if (!deferred) return;
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; dismiss(); });
      });
    }, 4000);
  });
  window.addEventListener('appinstalled', function () { dismiss(); });

  if (isIOS && isSafari) {
    setTimeout(function () {
      show('Tap <b style="display:inline;font-size:inherit">Share</b> then <b style="display:inline;font-size:inherit">Add to Home Screen</b>.', null);
    }, 5000);
  }
})();


// ── Order notifications ──
// Logged-in buyers and sellers are offered notifications once; if they already agreed, the
// phone is quietly re-registered so it keeps working.
(function () {
  var API = 'https://alfijeershops-backend-production.up.railway.app/api';
  var KEY = 'as_notify_dismissed';
  var token = null, role = null;
  try { token = localStorage.getItem('as_token'); role = localStorage.getItem('as_role'); } catch (e) {}
  if (!token || (role !== 'buyer' && role !== 'seller' && role !== 'admin')) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function auth() { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('as_token') }; }

  function subscribe() {
    return fetch(API + '/push/public-key').then(function (r) { if (!r.ok) throw new Error('off'); return r.json(); })
      .then(function (k) {
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) }); });
        });
      })
      .then(function (sub) { try { localStorage.setItem('as_push_ep', sub.endpoint); } catch (e) {} return fetch(API + '/push/subscribe', { method: 'POST', headers: auth(), body: JSON.stringify({ subscription: sub.toJSON() }) }); });
  }

  // used when someone logs out, so the next person on this phone does not get their alerts
  window.asPushOff = function () {
    try {
      var ep = localStorage.getItem('as_push_ep');
      if (ep) fetch(API + '/push/unsubscribe', { method: 'POST', keepalive: true, headers: auth(), body: JSON.stringify({ endpoint: ep }) });
      localStorage.removeItem('as_push_ep');
    } catch (e) {}
  };

  if (Notification.permission === 'granted') { subscribe().catch(function () {}); return; }
  if (Notification.permission === 'denied') return;
  try { var t = +localStorage.getItem(KEY) || 0; if (Date.now() - t < 7 * 864e5) return; } catch (e) {}
  if (!/dashboard|admin/.test(location.pathname)) return;
  // iPhone only allows notifications for the installed app
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIOS && !standalone) return;

  fetch(API + '/push/public-key').then(function (r) { if (!r.ok) return; setTimeout(showBar, 2500); }).catch(function () {});

  function showBar() {
    if (document.querySelector('.as-bar')) return;
    var b = document.createElement('div');
    b.className = 'as-install as-bar as-notify';
    var msg = role === 'seller' ? 'Hear about new orders the moment they arrive.' : role === 'admin' ? 'Get alerted the moment a dispute or payment problem needs you.' : 'Know when the shop accepts or delivers your order.';
    b.innerHTML = '<img src="/icons/icon-192.png" alt=""><div><b>Turn on notifications</b>' + msg + '</div><button class="go">Enable</button><button class="x" aria-label="Close">✕</button>';
    b.querySelector('.x').onclick = function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} b.remove(); };
    b.querySelector('.go').onclick = function () {
      Notification.requestPermission().then(function (p) {
        b.remove();
        if (p === 'granted') subscribe().catch(function () {});
        else { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
      });
    };
    document.body.appendChild(b);
  }
})();
