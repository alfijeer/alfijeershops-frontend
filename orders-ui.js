// ══════════════════════════════════════════════════════════
// ALFIJEER — ORDERS UI (shared by buyer-dashboard and seller-dashboard)
// Include AFTER the page defines _API, _headers, showToast, formatPrice
// (api.js on the buyer page, inline on the seller page):
//   <script src="./orders-ui.js"></script>
// Use:  OrdersUI.mount(containerEl, orders, 'buyer' | 'seller', reloadFunction)
// The server decides what is allowed. These buttons only mirror its rules.
// ══════════════════════════════════════════════════════════
(function () {
  'use strict';

  var TERMINAL = ['COMPLETED', 'CANCELLED', 'REFUNDED'];
  var LABEL = { PENDING: 'Pending', ACCEPTED: 'Accepted', PAYMENT_SUBMITTED: 'Payment Submitted', PAYMENT_CONFIRMED: 'Payment Confirmed',
    DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled', PAYMENT_ISSUE: 'Payment Issue', DELIVERY_REVIEW: 'Delivery Review',
    DISPUTED: 'Disputed', REPLACEMENT_PENDING: 'Replacement Pending', REFUND_PENDING: 'Refund Pending', REFUNDED: 'Refunded' };
  var ICON = { PENDING: '🕐', ACCEPTED: '👍', PAYMENT_SUBMITTED: '💸', PAYMENT_CONFIRMED: '✅', DELIVERED: '🚚', COMPLETED: '🎉',
    CANCELLED: '❌', PAYMENT_ISSUE: '⚠️', DELIVERY_REVIEW: '⏱️', DISPUTED: '⚖️', REPLACEMENT_PENDING: '🔁', REFUND_PENDING: '↩️', REFUNDED: '💵' };
  var CANCEL_WHY = { SELLER_TIMEOUT: 'The seller did not accept in time.', SELLER_DECLINED: 'The seller declined the order.',
    BUYER_CANCELLED: 'The buyer cancelled.', PAYMENT_DEADLINE_EXPIRED: 'Payment was not made in time.',
    PAYMENT_INVALID: 'Admin found the payment invalid.', ADMIN_DECISION: 'Cancelled by admin.' };

  var NEXT = {
    buyer: { PENDING: 'Waiting for the seller to accept your order.',
      ACCEPTED: 'Message the seller on WhatsApp for payment details. Pay them directly, then tap "I have paid".',
      PAYMENT_SUBMITTED: 'Waiting for the seller to confirm your payment. Keep your receipt until this order is completed.',
      PAYMENT_CONFIRMED: 'Payment confirmed. The seller is preparing your order.',
      DELIVERED: 'Check your order, then confirm it or report a problem.',
      PAYMENT_ISSUE: 'There is a problem with the payment. Upload your receipt so admin can review it.',
      DELIVERY_REVIEW: 'The seller is late. Admin is reviewing this order.',
      DISPUTED: 'Admin is reviewing your report and will decide.',
      REPLACEMENT_PENDING: 'Admin approved a replacement. The seller will deliver it.',
      REFUND_PENDING: 'The seller must refund you directly. Tap the button once you have received your money.',
      COMPLETED: 'Order completed. Thank you!', REFUNDED: 'Your refund is complete.' },
    seller: { PENDING: 'Accept this order before the time runs out, or it will be cancelled.',
      ACCEPTED: 'Waiting for the buyer to pay. Message them on WhatsApp with your payment details.',
      PAYMENT_SUBMITTED: 'The buyer says they paid. Check your account, then confirm.',
      PAYMENT_CONFIRMED: 'Prepare and deliver the order, then mark it as delivered.',
      DELIVERED: 'Waiting for the buyer to confirm. It completes automatically if they do not respond.',
      PAYMENT_ISSUE: 'Admin is reviewing the payment. If you did receive the money, you can confirm it now.',
      DELIVERY_REVIEW: 'Delivery is late. Admin is reviewing this order.',
      DISPUTED: 'The buyer reported a problem. Admin will decide.',
      REPLACEMENT_PENDING: 'Deliver the replacement item.',
      REFUND_PENDING: 'You must refund the buyer directly. An overdue refund earns a strike.',
      COMPLETED: 'Order completed.', REFUNDED: 'Refund completed.' }
  };

  var REASON = { key: 'reason', label: 'Please explain', type: 'textarea', required: true, placeholder: 'Write at least a few words' };
  var META = {
    BUYER_CANCEL: { label: 'Cancel order', danger: true, confirm: 'Cancel this order?' },
    BUYER_PAID: { label: 'I have paid', form: { title: 'Confirm your payment', intro: 'Only tap this after you have paid the seller directly.',
      fields: [{ key: 'method', label: 'How did you pay?', type: 'select', options: ['Bank transfer', 'POS', 'Cash', 'Other'], required: true }] } },
    BUYER_REPORT_PAYMENT_ISSUE: { label: 'Report a payment problem', danger: true, form: { title: 'Report a payment problem', fields: [REASON] } },
    BUYER_UPLOAD_PROOF: { label: 'Upload payment proof', upload: true },
    BUYER_CONFIRM_RECEIPT: { label: 'I received my order', confirm: 'Confirm that you received the correct order?' },
    BUYER_DISPUTE: { label: 'Not as ordered', danger: true, form: { title: 'What is wrong with the order?', fields: [REASON] } },
    BUYER_CONFIRM_REFUND: { label: 'I received my refund', confirm: 'Confirm that the money is back in your account?' },
    SELLER_ACCEPT: { label: 'Receive order' },
    SELLER_DECLINE: { label: 'Decline', danger: true, confirm: 'Decline this order?' },
    SELLER_CONFIRM_PAYMENT: { label: 'I have received payment', confirm: 'Confirm that the money is in your account?' },
    SELLER_REPORT_PAYMENT_ISSUE: { label: 'I did not receive payment', danger: true, form: { title: 'What is wrong with the payment?', fields: [REASON] } },
    SELLER_DELIVER: { label: 'Mark as delivered' },
    SELLER_REQUEST_CANCEL: { label: 'Cannot supply: refund buyer', danger: true, form: { title: 'Why can you not supply this order?', intro: 'The buyer will be refunded by you directly.', fields: [REASON] } }
  };
  var BUTTONS = {
    buyer: { PENDING: ['BUYER_CANCEL'], ACCEPTED: ['BUYER_PAID', 'BUYER_CANCEL'], PAYMENT_SUBMITTED: ['BUYER_REPORT_PAYMENT_ISSUE'],
      PAYMENT_ISSUE: ['BUYER_UPLOAD_PROOF'], DELIVERED: ['BUYER_CONFIRM_RECEIPT', 'BUYER_DISPUTE'], REFUND_PENDING: ['BUYER_CONFIRM_REFUND'] },
    seller: { PENDING: ['SELLER_ACCEPT', 'SELLER_DECLINE'], PAYMENT_SUBMITTED: ['SELLER_CONFIRM_PAYMENT', 'SELLER_REPORT_PAYMENT_ISSUE'],
      PAYMENT_ISSUE: ['SELLER_CONFIRM_PAYMENT'], PAYMENT_CONFIRMED: ['SELLER_DELIVER', 'SELLER_REQUEST_CANCEL'], REPLACEMENT_PENDING: ['SELLER_DELIVER'] }
  };
  var NEEDS = {
    buyer: ['ACCEPTED', 'PAYMENT_ISSUE', 'DELIVERED', 'REFUND_PENDING'],
    seller: ['PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'REPLACEMENT_PENDING']
  };
  var STEPS = [['PENDING', 'Placed'], ['ACCEPTED', 'Accepted'], ['PAYMENT_SUBMITTED', 'Paid'], ['PAYMENT_CONFIRMED', 'Confirmed'], ['DELIVERED', 'Delivered'], ['COMPLETED', 'Completed']];

  // ── helpers ──
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return typeof formatPrice === 'function' ? formatPrice(n) : '₦' + Number(n || 0).toLocaleString(); }
  function toast(m, t) { if (typeof showToast === 'function') showToast(m, t); else alert(m); }
  function when(d) { return d ? new Date(d).toLocaleString('en-GB') : ''; }
  function waLink(phone, text) {
    var p = String(phone || '').replace(/\D/g, '');
    if (!p) return '';
    if (p.charAt(0) === '0') p = '234' + p.slice(1);
    return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
  }
  function timeLeft(o) {
    if (!o.deadlineAt || TERMINAL.indexOf(o.status) >= 0 || o.status === 'DISPUTED' || o.status === 'DELIVERY_REVIEW') return '';
    var ms = new Date(o.deadlineAt) - Date.now();
    if (ms <= 0) return 'Deadline passed. The system will update this order shortly.';
    var h = Math.floor(ms / 3600000);
    return 'Time left: ' + (h >= 24 ? Math.floor(h / 24) + 'd ' + (h % 24) + 'h' : h + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm');
  }
  function pill(s) {
    var c = (s === 'COMPLETED' || s === 'REFUNDED') ? ['#e6f6ec', '#128049']
      : (s === 'CANCELLED' || s === 'PAYMENT_ISSUE' || s === 'DISPUTED') ? ['#fdecea', '#c0392b']
      : (s === 'DELIVERY_REVIEW' || s === 'REFUND_PENDING') ? ['#fff4dc', '#b57f00'] : ['#e8eefb', '#2a4a8a'];
    return '<span class="ou-pill" style="background:' + c[0] + ';color:' + c[1] + ';">' + (ICON[s] || '') + ' ' + esc(LABEL[s] || s) + '</span>';
  }

  // ── styles (self-contained, uses the page's colour variables when present) ──
  var css = '.ou-card{background:var(--card-bg,#fff);border:1px solid var(--border,#e2e2e2);border-radius:12px;padding:16px;margin-bottom:14px;}' +
    '.ou-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:8px;}' +
    '.ou-num{font-weight:800;font-size:.9rem;color:var(--white,#14203A);}.ou-sub{font-size:.74rem;color:var(--white-dim,#5C6B85);}' +
    '.ou-pill{font-size:.72rem;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;}' +
    '.ou-items{border-top:1px solid var(--border,#e2e2e2);border-bottom:1px solid var(--border,#e2e2e2);padding:8px 0;margin:8px 0;font-size:.82rem;}' +
    '.ou-row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;}.ou-total{font-weight:800;}' +
    '.ou-tl{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;}.ou-step{font-size:.68rem;font-weight:700;padding:3px 8px;border-radius:12px;background:#f0f0f0;color:#8a8a8a;}' +
    '.ou-step.done{background:#e6f6ec;color:#128049;}.ou-step.bad{background:#fdecea;color:#c0392b;}' +
    '.ou-next{font-size:.8rem;color:var(--white,#14203A);background:rgba(255,190,26,.12);border-radius:8px;padding:9px 12px;margin:8px 0;line-height:1.5;}' +
    '.ou-time{font-size:.72rem;font-weight:700;color:#b57f00;margin:4px 0;}' +
    '.ou-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}' +
    '.ou-btn{border:none;border-radius:8px;padding:9px 14px;font-weight:800;font-size:.78rem;cursor:pointer;font-family:inherit;background:#128049;color:#fff;text-decoration:none;display:inline-block;}' +
    '.ou-btn.danger{background:#fff;color:#c0392b;border:1px solid #c0392b;}.ou-btn.wa{background:#25D366;}.ou-btn:disabled{opacity:.5;cursor:default;}' +
    '.ou-hist{font-size:.72rem;color:var(--white-dim,#5C6B85);margin-top:8px;}.ou-hist div{padding:2px 0;}' +
    '.ou-empty{text-align:center;color:var(--white-dim,#5C6B85);padding:36px 12px;font-size:.85rem;}' +
    '.ou-ov{position:fixed;inset:0;background:rgba(0,18,51,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;}' +
    '.ou-modal{background:#fff;color:#14203A;border-radius:14px;padding:20px;width:100%;max-width:400px;max-height:90vh;overflow-y:auto;}' +
    '.ou-modal h4{margin:0 0 6px;font-size:1rem;}.ou-modal p{font-size:.8rem;color:#5C6B85;margin:0 0 10px;line-height:1.5;}' +
    '.ou-modal label{display:block;font-size:.75rem;font-weight:700;margin:10px 0 4px;}' +
    '.ou-modal input,.ou-modal select,.ou-modal textarea{width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd6e4;border-radius:8px;font-family:inherit;font-size:.85rem;}' +
    '.ou-modal textarea{min-height:80px;}.ou-mfoot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ── small form / confirm dialog; resolves to values or null ──
  function ask(opts) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div'); ov.className = 'ou-ov';
      var f = (opts.fields || []).map(function (fl) {
        var id = 'ou-f-' + fl.key, inp;
        if (fl.type === 'select') inp = '<select id="' + id + '"><option value="">Choose…</option>' + fl.options.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>';
        else if (fl.type === 'textarea') inp = '<textarea id="' + id + '" placeholder="' + esc(fl.placeholder || '') + '"></textarea>';
        else if (fl.type === 'file') inp = '<input id="' + id + '" type="file" accept="image/*"/>';
        else inp = '<input id="' + id + '" type="' + (fl.type || 'text') + '" placeholder="' + esc(fl.placeholder || '') + '"/>';
        return '<label for="' + id + '">' + esc(fl.label) + (fl.required ? ' *' : '') + '</label>' + inp;
      }).join('');
      ov.innerHTML = '<div class="ou-modal"><h4>' + esc(opts.title) + '</h4>' + (opts.intro ? '<p>' + esc(opts.intro) + '</p>' : '') + f +
        '<div class="ou-mfoot"><button class="ou-btn danger" data-x="cancel">Back</button><button class="ou-btn" data-x="ok">' + esc(opts.okText || 'Confirm') + '</button></div></div>';
      document.body.appendChild(ov);
      function close(v) { ov.remove(); resolve(v); }
      ov.addEventListener('click', function (e) {
        if (e.target === ov || (e.target.dataset && e.target.dataset.x === 'cancel')) return close(null);
        if (e.target.dataset && e.target.dataset.x === 'ok') {
          var vals = {};
          for (var i = 0; i < (opts.fields || []).length; i++) {
            var fl = opts.fields[i], el = ov.querySelector('#ou-f-' + fl.key);
            var v = fl.type === 'file' ? (el.files && el.files[0]) : el.value.trim();
            if (fl.required && !v) { toast('Please fill in: ' + fl.label, 'error'); return; }
            vals[fl.key] = v;
          }
          close(vals);
        }
      });
    });
  }

  // ── server calls ──
  function failMsg(data) { return (data && data.message) || 'Something went wrong. Please try again.'; }
  async function post(id, action, body) {
    var res = await fetch(_API + '/orders/' + encodeURIComponent(id) + '/actions/' + action, { method: 'POST', headers: _headers(), body: JSON.stringify(body || {}) });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(failMsg(data));
    return data;
  }
  async function uploadProof(id, v) {
    if (v.proof.size > 5 * 1024 * 1024) throw new Error('The image is too large (maximum 5 MB).');
    var fd = new FormData();
    fd.append('proof', v.proof);
    if (v.amount) fd.append('amount', v.amount);
    if (v.reference) fd.append('reference', v.reference);
    var res = await fetch(_API + '/orders/' + encodeURIComponent(id) + '/proof', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('as_token') }, body: fd });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(failMsg(data));
    return data;
  }

  async function run(btn, ctx) {
    var id = btn.dataset.id, action = btn.dataset.action, m = META[action];
    if (!m) return;
    try {
      var body = {};
      if (m.upload) {
        var v = await ask({ title: 'Upload payment proof', intro: 'Upload a clear photo or screenshot of your receipt. Admin will see it only to settle this payment problem.', okText: 'Upload',
          fields: [{ key: 'proof', label: 'Receipt image', type: 'file', required: true }, { key: 'amount', label: 'Amount paid (₦)', type: 'number', placeholder: 'Optional' }, { key: 'reference', label: 'Transaction reference', type: 'text', placeholder: 'Optional' }] });
        if (!v) return;
        btn.disabled = true;
        await uploadProof(id, v);
        toast('Proof uploaded ✅', 'success');
      } else {
        if (m.form) { body = await ask({ title: m.form.title, intro: m.form.intro, fields: m.form.fields }); if (!body) return; }
        else if (m.confirm) { if (!(await ask({ title: m.confirm, okText: 'Yes' }))) return; }
        btn.disabled = true;
        await post(id, action, body);
        toast('Done ✅', 'success');
      }
      if (ctx && ctx.reload) ctx.reload();
    } catch (e) {
      btn.disabled = false;
      toast(e.message, 'error');
    }
  }

  // ── rendering ──
  function timeline(o) {
    var reached = {}; reached[o.status] = true;
    (o.statusHistory || []).forEach(function (h) { reached[h.to] = true; });
    var html = STEPS.map(function (s) { return '<span class="ou-step ' + (reached[s[0]] ? 'done' : '') + '">' + (reached[s[0]] ? '✓ ' : '') + s[1] + '</span>'; }).join('');
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') html += '<span class="ou-step bad">' + esc(LABEL[o.status]) + '</span>';
    return '<div class="ou-tl">' + html + '</div>';
  }
  function card(o, role) {
    var other = role === 'buyer'
      ? ((o.seller && o.seller.businessName) || 'Shop')
      : ((o.buyer && o.buyer.fullName) || 'Buyer');
    var phone = role === 'buyer' ? (o.seller && o.seller.whatsappNumber) : (o.buyer && o.buyer.phone);
    var wa = waLink(phone, 'Hello, this is about order ' + o.orderId + ' on ALFIJEER.');
    var items = (o.items || []).map(function (i) { return '<div class="ou-row"><span>' + esc(i.name) + ' × ' + esc(i.quantity) + '</span><span>' + money(i.price * i.quantity) + '</span></div>'; }).join('');
    var btns = ((BUTTONS[role] || {})[o.status] || []).map(function (a) {
      return '<button class="ou-btn ' + (META[a].danger ? 'danger' : '') + '" data-ou-action="1" data-id="' + esc(o._id) + '" data-action="' + a + '">' + esc(META[a].label) + '</button>';
    }).join('');
    if (wa && TERMINAL.indexOf(o.status) < 0) btns += '<a class="ou-btn wa" target="_blank" rel="noopener" href="' + esc(wa) + '">💬 WhatsApp</a>';
    var next = (NEXT[role] || {})[o.status] || (o.status === 'CANCELLED' ? 'This order was cancelled. ' + (CANCEL_WHY[o.cancelReason] || '') : '');
    var tl = timeLeft(o);
    var hist = (o.statusHistory || []).map(function (h) {
      return '<div>' + esc(LABEL[h.from] || '—') + ' → <b>' + esc(LABEL[h.to] || h.to) + '</b> · ' + esc(h.byRole) + ' · ' + esc(when(h.at)) + (h.reason ? ' · ' + esc(h.reason) : '') + '</div>';
    }).join('');
    return '<div class="ou-card"><div class="ou-head"><div><div class="ou-num">' + esc(o.orderId || o._id) + '</div>' +
      '<div class="ou-sub">' + (role === 'buyer' ? '🏪 ' : '👤 ') + esc(other) + ' · ' + esc(when(o.createdAt)) + '</div></div>' + pill(o.status) + '</div>' +
      '<div class="ou-items">' + items + '<div class="ou-row ou-total"><span>Total</span><span>' + money(o.total) + '</span></div></div>' +
      timeline(o) + (next ? '<div class="ou-next">' + esc(next) + '</div>' : '') + (tl ? '<div class="ou-time">⏳ ' + esc(tl) + '</div>' : '') +
      (btns ? '<div class="ou-actions">' + btns + '</div>' : '') +
      (hist ? '<details class="ou-hist"><summary>History</summary>' + hist + '</details>' : '') + '</div>';
  }

  function mount(el, orders, role, reload) {
    if (!el) return;
    el._ouCtx = { reload: reload };
    if (!orders || !orders.length) { el.innerHTML = '<div class="ou-empty">📭<br/>No orders yet.</div>'; return; }
    el.innerHTML = orders.map(function (o) { return card(o, role); }).join('');
    if (!el._ouBound) {
      el._ouBound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-ou-action]') : null;
        if (b) run(b, el._ouCtx);
      });
    }
  }
  function needsAction(o, role) { return (NEEDS[role] || []).indexOf(o.status) >= 0; }

  window.OrdersUI = { mount: mount, needsAction: needsAction, icon: function (s) { return ICON[s] || '⬜'; }, label: function (s) { return LABEL[s] || s; }, esc: esc };
})();
