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
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'as-install';
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
