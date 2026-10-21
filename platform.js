// ALFIJEER — platform guard: maintenance screen + announcements.
// Loaded on every public page. Admin pages load it too, but with <html data-no-platform-guard> so it
// never blocks them (they only use AlfPlatform.showMaintenance for the "preview" button).
(function () {
  var API = 'https://alfijeershops-backend-production.up.railway.app/api';
  var role = null; try { role = localStorage.getItem('as_role'); } catch (e) {}
  var guard = !document.documentElement.hasAttribute('data-no-platform-guard') && role !== 'admin';
  var staffPage = /auth\.html$/.test(location.pathname) && /staff=1/.test(location.search);   // lets admins sign in during maintenance
  var shown = false, timer = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function showMaintenance(info, opts) {
    opts = opts || {};
    if (shown) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { showMaintenance(info, opts); }); return; }
    shown = true;
    var d = document.createElement('div');
    d.id = 'as-maint';
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(165deg,#0A294D,#001233 70%);color:#fff;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center;font-family:Nunito,system-ui,sans-serif;overflow:auto';
    d.innerHTML =
      '<div style="max-width:420px;width:100%">' +
      '<div style="width:96px;height:96px;margin:0 auto 18px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(255,190,26,.25)"><img src="/icons/icon-192.png" alt="" style="width:88px;height:88px;border-radius:50%"></div>' +
      '<div style="font-size:2.4rem;margin-bottom:6px">🛠️</div>' +
      '<h1 style="font-family:Cinzel,serif;font-size:1.5rem;color:#FFBE1A;margin-bottom:10px">We’ll be right back</h1>' +
      '<p style="font-size:.95rem;line-height:1.7;color:rgba(255,255,255,.82);margin-bottom:16px">' + esc(info.message) + '</p>' +
      (info.eta ? '<div style="display:inline-block;background:rgba(255,190,26,.16);border:1px solid rgba(255,190,26,.4);color:#FFBE1A;font-weight:800;font-size:.85rem;padding:8px 16px;border-radius:20px;margin-bottom:20px">⏱ ' + esc(info.eta) + '</div><br>' : '') +
      (opts.preview
        ? '<button id="as-maint-close" style="margin-top:6px;background:#FFBE1A;color:#001233;border:0;border-radius:14px;padding:14px 28px;font:800 .95rem Nunito,sans-serif;cursor:pointer">Close preview</button>'
        : '<button id="as-maint-retry" style="margin-top:6px;background:#FFBE1A;color:#001233;border:0;border-radius:14px;padding:14px 28px;font:800 .95rem Nunito,sans-serif;cursor:pointer">Check again</button>' +
          '<p style="margin-top:22px;font-size:.78rem;color:rgba(255,255,255,.5)">Thank you for your patience 💛 — ALFIJEER</p>' +
          '<a href="auth.html?staff=1#login" style="display:inline-block;margin-top:14px;font-size:.7rem;color:rgba(255,255,255,.35);text-decoration:none">Staff sign-in</a>') +
      '</div>';
    document.body.appendChild(d);
    document.documentElement.style.overflow = 'hidden';
    var retry = document.getElementById('as-maint-retry');
    if (retry) retry.onclick = function () { retry.textContent = 'Checking…'; check(true); setTimeout(function () { retry.textContent = 'Check again'; }, 1500); };
    var close = document.getElementById('as-maint-close');
    if (close) close.onclick = function () { d.remove(); shown = false; document.documentElement.style.overflow = ''; };
    if (!opts.preview && !timer) timer = setInterval(function () { check(true); }, 60000);
  }

  function check(reloadIfBack) {
    return fetch(API + '/platform/status', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (s) {
      if (s && s.maintenance && s.maintenance.enabled) { if (guard && !staffPage) showMaintenance(s.maintenance); }
      else if (reloadIfBack && shown) location.reload();
      return s;
    }).catch(function () {});
  }

  // Any API call that answers "maintenance" (e.g. it started while the page was open) shows the screen straight away.
  if (guard && !staffPage) {
    var _f = window.fetch.bind(window);
    window.fetch = function () {
      var url = String(arguments[0] && arguments[0].url || arguments[0]);
      return _f.apply(null, arguments).then(function (r) {
        if (r.status === 503 && url.indexOf('/api/') > -1 && url.indexOf('/platform/status') < 0) {
          r.clone().json().then(function (d) { if (d && d.code === 'MAINTENANCE') showMaintenance({ message: d.message, eta: d.eta }); }).catch(function () {});
        }
        return r;
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { check(false); });
    else check(false);
  }

  // Announcements from the ALFIJEER team, shown at the top of a dashboard.
  function announcements(el) {
    var token = null; try { token = localStorage.getItem('as_token'); } catch (e) {}
    if (!el || !token) return;
    fetch(API + '/announcements', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : { announcements: [] }; })
      .then(function (d) {
        var seen = {}; try { seen = JSON.parse(localStorage.getItem('as_ann_seen') || '{}'); } catch (e) {}
        var list = (d.announcements || []).filter(function (a) { return !seen[a._id]; });
        var st = { info: ['#EAF2FF', '#2563eb', '📢'], important: ['#FFF7E0', '#C99000', '⭐'], warning: ['#FDECEA', '#e74c3c', '⚠️'] };
        el.innerHTML = list.map(function (a) {
          var c = st[a.type] || st.info;
          return '<div class="as-ann" data-id="' + esc(a._id) + '" style="background:' + c[0] + ';border:1px solid ' + c[1] + '55;border-left:4px solid ' + c[1] + ';border-radius:14px;padding:12px 14px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start">' +
            '<span style="font-size:1.2rem">' + c[2] + '</span><div style="flex:1;min-width:0"><b style="display:block;color:#14203A;font-size:.92rem;margin-bottom:3px">' + esc(a.title) + '</b>' +
            '<span style="color:#34415a;font-size:.84rem;line-height:1.55;white-space:pre-line">' + esc(a.message) + '</span></div>' +
            '<button aria-label="Dismiss" style="background:none;border:0;color:#5C6B85;font-size:1.1rem;cursor:pointer;padding:2px 6px">✕</button></div>';
        }).join('');
        el.querySelectorAll('.as-ann button').forEach(function (b) {
          b.onclick = function () {
            var box = b.closest('.as-ann'); seen[box.dataset.id] = 1;
            try { localStorage.setItem('as_ann_seen', JSON.stringify(seen)); } catch (e) {}
            box.remove();
          };
        });
      }).catch(function () {});
  }

  function auto() { var box = document.getElementById('ann-box'); if (box) announcements(box); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();

  window.AlfPlatform = { showMaintenance: showMaintenance, announcements: announcements };
})();
