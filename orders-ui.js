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
  var LABEL = { PENDING: 'Pending', ACCEPTED: 'Accepted', TOTAL_SENT: 'Total Sent', TOTAL_ACCEPTED: 'Total Accepted', PAYMENT_SUBMITTED: 'Payment Submitted', PAYMENT_CONFIRMED: 'Payment Confirmed',
    DELIVERED: 'Delivered', COMPLETED: 'Completed', CANCELLED: 'Cancelled', PAYMENT_ISSUE: 'Payment Issue', DELIVERY_REVIEW: 'Delivery Review',
    DISPUTED: 'Disputed', REPLACEMENT_PENDING: 'Replacement Pending', REFUND_PENDING: 'Refund Pending', REFUNDED: 'Refunded' };
  var ICON = { PENDING: '🕐', ACCEPTED: '👍', TOTAL_SENT: '🧾', TOTAL_ACCEPTED: '🤝', PAYMENT_SUBMITTED: '💸', PAYMENT_CONFIRMED: '✅', DELIVERED: '🚚', COMPLETED: '🎉',
    CANCELLED: '❌', PAYMENT_ISSUE: '⚠️', DELIVERY_REVIEW: '⏱️', DISPUTED: '⚖️', REPLACEMENT_PENDING: '🔁', REFUND_PENDING: '↩️', REFUNDED: '💵' };
  var CANCEL_WHY = { SELLER_TIMEOUT: 'The seller did not accept in time.', SELLER_DECLINED: 'The seller declined the order.',
    BUYER_CANCELLED: 'The buyer cancelled.', PAYMENT_DEADLINE_EXPIRED: 'Payment was not made in time.',
    PAYMENT_INVALID: 'Admin found the payment invalid.', ADMIN_DECISION: 'Cancelled by admin.',
    SELLER_NO_TOTAL: 'The seller did not send the delivery total in time.', TOTAL_DECLINED: 'The buyer did not accept the total.',
    TOTAL_EXPIRED: 'The buyer did not respond to the total in time.' };
  var FEE_NOTICE = "Delivery fee is based on the delivery location and the current rider's charge.";

  var NEXT = {
    buyer: { PENDING: 'Waiting for the seller to accept your order.',
      ACCEPTED: 'Message the seller on WhatsApp for payment details. Pay them directly, then tap "I have paid".',
      ACCEPTED_PICKUP: 'The seller accepted your order. Transfer the amount below to the seller\'s account, then tap "I have paid".',
      ACCEPTED_DELIVERY: 'The seller accepted your order and is working out the delivery fee. You will get the total shortly.',
      TOTAL_SENT: 'The seller sent your total with the delivery fee. Check it below, then accept it or cancel the order.',
      TOTAL_ACCEPTED: 'You accepted the total. Transfer the amount below to the seller\'s account, then tap "I have paid".',
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
      ACCEPTED: 'Waiting for the buyer to pay. The buyer can see your payment details.',
      ACCEPTED_DELIVERY: 'Enter the delivery fee and send the total to the buyer before the time runs out, or the order will be cancelled.',
      TOTAL_SENT: 'Waiting for the buyer to accept the total.',
      TOTAL_ACCEPTED: 'The buyer accepted the total and can now see your payment details. Waiting for the payment.',
      PAYMENT_SUBMITTED: 'The buyer says they paid. Check your bank account (and the receipt, if they uploaded one), then confirm.',
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
  var OPTIONAL_REASON = { key: 'reason', label: 'Reason for the buyer (optional)', type: 'textarea', required: false, placeholder: 'For example: item is out of stock' };
  var META = {
    BUYER_CANCEL: { label: 'Cancel order', danger: true, confirm: 'Cancel this order?' },
    BUYER_ACCEPT_TOTAL: { label: 'Accept total', confirm: 'Accept this total and see the seller\'s payment details?' },
    BUYER_DECLINE_TOTAL: { label: 'Cancel order', danger: true, confirm: 'Cancel this order because you do not accept the total?' },
    // "I have paid": the receipt and transfer reference are optional. Only you, the seller and Alfijeer admin can ever see the receipt.
    BUYER_PAID: { label: 'I have paid', pay: true, form: { title: 'Confirm your payment', okText: 'I have paid',
      intro: 'Only tap this after you have paid the seller directly. Adding your receipt is optional. It is private: only you, the seller and Alfijeer admin can see it.',
      fields: [{ key: 'method', label: 'How did you pay?', type: 'select', options: ['Bank transfer', 'POS', 'Cash', 'Other'], required: true },
        { key: 'reference', label: 'Transfer reference (optional)', type: 'text', placeholder: 'From your bank receipt' },
        { key: 'receipt', label: 'Payment receipt (optional)', type: 'file' }] } },
    BUYER_REPORT_PAYMENT_ISSUE: { label: 'Report a payment problem', danger: true, form: { title: 'Report a payment problem', fields: [REASON] } },
    BUYER_UPLOAD_PROOF: { label: 'Upload payment proof', upload: true },
    BUYER_CONFIRM_RECEIPT: { label: 'I received my order', confirm: 'Confirm that you received the correct order?' },
    BUYER_DISPUTE: { label: 'Not as ordered', danger: true, multipart: true, form: { title: 'What is wrong with the order?',
      intro: 'Admin will review your report. Photos help a lot, but they are optional.',
      fields: [REASON, { key: 'evidence', label: 'Photos (optional, up to 3)', type: 'files', hint: 'Show the item you received, or add your payment receipt.' }] } },
    BUYER_CONFIRM_REFUND: { label: 'I received my refund', confirm: 'Confirm that the money is back in your account?' },
    SELLER_ACCEPT: { label: 'Accept order' },
    SELLER_DECLINE: { label: 'Reject order', danger: true, form: { title: 'Reject this order?', okText: 'Reject order', fields: [OPTIONAL_REASON] } },
    // The seller enters ONLY the delivery fee. The product total is already known; the buyer always sees the fixed fee notice.
    SELLER_SEND_TOTAL: { label: 'Send total to buyer', sendTotal: true, form: function (o) {
      var base = o.productTotal != null ? o.productTotal : o.total;
      var d = o.delivery || {};
      return { title: 'Delivery fee', okText: 'Send total to buyer',
        intro: 'Product total: ' + money(base) + '. Deliver to: ' + (d.address || 'the buyer\'s address') + '. Enter only the delivery fee (0 if delivery is free). Alfijeer adds it to the total. The buyer will be told: "' + FEE_NOTICE + '"',
        fields: [{ key: 'deliveryFee', label: 'Delivery fee (₦)', type: 'number', required: true, placeholder: 'e.g. 500' }] };
    } },
    SELLER_CONFIRM_PAYMENT: { label: 'I have received payment', confirm: 'Confirm that the money is in your account?' },
    SELLER_REPORT_PAYMENT_ISSUE: { label: 'I did not receive payment', danger: true, form: { title: 'What is wrong with the payment?', fields: [REASON] } },
    SELLER_DELIVER: { label: 'Mark as delivered' },
    SELLER_REQUEST_CANCEL: { label: 'Cannot supply: refund buyer', danger: true, form: { title: 'Why can you not supply this order?', intro: 'The buyer will be refunded by you directly.', fields: [REASON] } }
  };
  // Orders created before pickup/delivery existed have no fulfilment: they are pickup orders.
  function isDelivery(o) { return o && o.fulfilment === 'DELIVERY'; }
  var BUTTONS = {
    buyer: { PENDING: ['BUYER_CANCEL'], TOTAL_SENT: ['BUYER_ACCEPT_TOTAL', 'BUYER_DECLINE_TOTAL'], TOTAL_ACCEPTED: ['BUYER_PAID', 'BUYER_CANCEL'],
      PAYMENT_SUBMITTED: ['BUYER_REPORT_PAYMENT_ISSUE'], PAYMENT_ISSUE: ['BUYER_UPLOAD_PROOF'], DELIVERED: ['BUYER_CONFIRM_RECEIPT', 'BUYER_DISPUTE'], REFUND_PENDING: ['BUYER_CONFIRM_REFUND'] },
    seller: { PENDING: ['SELLER_ACCEPT', 'SELLER_DECLINE'], PAYMENT_SUBMITTED: ['SELLER_CONFIRM_PAYMENT', 'SELLER_REPORT_PAYMENT_ISSUE'],
      PAYMENT_ISSUE: ['SELLER_CONFIRM_PAYMENT'], PAYMENT_CONFIRMED: ['SELLER_DELIVER', 'SELLER_REQUEST_CANCEL'], REPLACEMENT_PENDING: ['SELLER_DELIVER'] }
  };
  // ACCEPTED is different for the two kinds of order: a pickup order waits for the buyer to pay, a delivery order waits for the seller's total
  function buttonsFor(role, o) {
    if (o.status === 'ACCEPTED') {
      if (role === 'buyer') return isDelivery(o) ? ['BUYER_CANCEL'] : ['BUYER_PAID', 'BUYER_CANCEL'];
      return isDelivery(o) ? ['SELLER_SEND_TOTAL'] : [];
    }
    return (BUTTONS[role] || {})[o.status] || [];
  }
  var NEEDS = {
    buyer: ['TOTAL_SENT', 'TOTAL_ACCEPTED', 'PAYMENT_ISSUE', 'DELIVERED', 'REFUND_PENDING'],
    seller: ['PENDING', 'PAYMENT_SUBMITTED', 'PAYMENT_CONFIRMED', 'REPLACEMENT_PENDING']
  };
  var STEPS_PICKUP = [['PENDING', 'Placed'], ['ACCEPTED', 'Accepted'], ['PAYMENT_SUBMITTED', 'Paid'], ['PAYMENT_CONFIRMED', 'Confirmed'], ['DELIVERED', 'Delivered'], ['COMPLETED', 'Completed']];
  var STEPS_DELIVERY = [['PENDING', 'Placed'], ['ACCEPTED', 'Accepted'], ['TOTAL_SENT', 'Total sent'], ['TOTAL_ACCEPTED', 'Total accepted'], ['PAYMENT_SUBMITTED', 'Paid'],
    ['PAYMENT_CONFIRMED', 'Confirmed'], ['DELIVERED', 'Delivered'], ['COMPLETED', 'Completed']];
  function nextText(role, o) {
    var t = NEXT[role] || {};
    if (o.status === 'ACCEPTED') {
      if (isDelivery(o)) return t.ACCEPTED_DELIVERY;
      // older orders have no payment details saved on them: keep the WhatsApp instruction for them
      return role === 'buyer' && o.paymentDetails ? t.ACCEPTED_PICKUP : t.ACCEPTED;
    }
    return t[o.status] || (o.status === 'CANCELLED' ? 'This order was cancelled. ' + (CANCEL_WHY[o.cancelReason] || '') : '');
  }

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
    '.ou-modal textarea{min-height:80px;}.ou-mfoot{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;}' +
    '.ou-ful{font-size:.78rem;background:#f6f8fc;border-radius:8px;padding:8px 10px;margin:8px 0;line-height:1.55;color:var(--white,#14203A);}' +
    '.ou-fee{font-size:.72rem;color:var(--white-dim,#5C6B85);font-style:italic;margin:2px 0 4px;}.ou-muted{color:var(--white-dim,#5C6B85);}' +
    '.ou-bank{border:1px solid #128049;background:#f1faf4;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:.8rem;}' +
    '.ou-bank h5{margin:0 0 6px;font-size:.78rem;color:#128049;}.ou-bank .ou-row{padding:2px 0;}.ou-copy{border:1px solid #128049;background:#fff;color:#128049;border-radius:6px;padding:2px 8px;font-size:.7rem;font-weight:800;cursor:pointer;margin-left:6px;}';
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
        else if (fl.type === 'files') inp = '<input id="' + id + '" type="file" accept="image/*" multiple/>' + (fl.hint ? '<div style="font-size:.7rem;color:#5C6B85;margin-top:4px;">' + esc(fl.hint) + '</div>' : '');
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
            var v = fl.type === 'file' ? (el.files && el.files[0]) : fl.type === 'files' ? Array.prototype.slice.call(el.files || []) : el.value.trim();
            if (fl.type === 'files' && v.length) {
              if (v.length > 3) { toast('You can attach up to 3 photos.', 'error'); return; }
              for (var k = 0; k < v.length; k++) {
                if (!/^image\//.test(v[k].type)) { toast('Please choose photos only (JPG, PNG or WEBP).', 'error'); return; }
                if (v[k].size > 5 * 1024 * 1024) { toast('Each photo must be 5 MB or less.', 'error'); return; }
              }
            }
            if (fl.required && (!v || (fl.type === 'files' && !v.length))) { toast('Please fill in: ' + fl.label, 'error'); return; }
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
    if (!res.ok) { var err = new Error(failMsg(data)); err.code = data && data.code; throw err; }
    return data;
  }
  // "I have paid", with an optional receipt (private: see the note shown to the buyer in the form)
  async function sendPayment(id, v) {
    var fd = new FormData();
    fd.append('method', v.method);
    if (v.reference) fd.append('reference', v.reference);
    if (v.receipt) {
      if (!/^image\//.test(v.receipt.type)) throw new Error('Please choose a photo or screenshot (JPG, PNG or WEBP).');
      if (v.receipt.size > 5 * 1024 * 1024) throw new Error('The receipt image is too large (maximum 5 MB).');
      fd.append('receipt', v.receipt);
    }
    var res = await fetch(_API + '/orders/' + encodeURIComponent(id) + '/pay', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('as_token') }, body: fd });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(failMsg(data));
    return data;
  }
  // Opens the receipt in a new tab through a short-lived private link. Only the buyer of the order and its shop can get one.
  async function viewReceipt(id) {
    var w = window.open('about:blank', '_blank'); // opened first so phones do not block it
    try {
      var res = await fetch(_API + '/orders/' + encodeURIComponent(id) + '/receipt', { headers: _headers() });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !/^https:\/\//.test(data.url || '')) throw new Error(failMsg(data));
      if (w) { w.opener = null; w.location = data.url; } else window.location.href = data.url;
    } catch (e) { if (w) w.close(); toast(e.message, 'error'); }
  }
  async function sendDispute(id, v) {
    var fd = new FormData();
    fd.append('reason', v.reason);
    (v.evidence || []).forEach(function (f) { fd.append('evidence', f); });
    var res = await fetch(_API + '/orders/' + encodeURIComponent(id) + '/dispute', { method: 'POST', headers: { Authorization: 'Bearer ' + localStorage.getItem('as_token') }, body: fd });
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
        var v = await ask({ title: 'Upload payment proof', intro: 'Upload a clear photo or screenshot of your receipt. It is private: only you, the seller and Alfijeer admin can see it.', okText: 'Upload',
          fields: [{ key: 'proof', label: 'Receipt image', type: 'file', required: true }, { key: 'amount', label: 'Amount paid (₦)', type: 'number', placeholder: 'Optional' }, { key: 'reference', label: 'Transaction reference', type: 'text', placeholder: 'Optional' }] });
        if (!v) return;
        btn.disabled = true;
        await uploadProof(id, v);
        toast('Proof uploaded ✅', 'success');
      } else {
        if (m.form) { var fm = typeof m.form === 'function' ? m.form(ctx.orders[id] || {}) : m.form; body = await ask({ title: fm.title, intro: fm.intro, fields: fm.fields, okText: fm.okText }); if (!body) return; }
        else if (m.confirm) { if (!(await ask({ title: m.confirm, okText: 'Yes' }))) return; }
        if (m.sendTotal) {
          // whole naira only (the server checks again); a comma or ₦ typed by mistake is ignored
          var fee = Number(String(body.deliveryFee).replace(/[,\s₦]/g, ''));
          if (!isFinite(fee) || fee < 0 || Math.floor(fee) !== fee) { toast('Enter the delivery fee as a whole amount in naira (0 if free).', 'error'); return; }
          body = { deliveryFee: fee };
        }
        btn.disabled = true;
        if (m.multipart) { await sendDispute(id, body); toast('Report sent. Admin will review it.', 'success'); }
        else if (m.pay) { await sendPayment(id, body); toast('Payment submitted. The seller will confirm it. ✅', 'success'); }
        else { await post(id, action, body); toast(m.sendTotal ? 'Total sent to the buyer ✅' : 'Done ✅', 'success'); }
      }
      if (ctx && ctx.reload) ctx.reload();
    } catch (e) {
      btn.disabled = false;
      toast(e.message, 'error');
      // a seller without bank details is sent to Settings → Payment Details (the dashboard sets this hook)
      if (e.code === 'BANK_DETAILS_REQUIRED' && typeof window.OrdersUI.onBankRequired === 'function') window.OrdersUI.onBankRequired();
    }
  }

  // ── rendering ──
  function timeline(o) {
    var reached = {}; reached[o.status] = true;
    (o.statusHistory || []).forEach(function (h) { reached[h.to] = true; });
    var html = (isDelivery(o) ? STEPS_DELIVERY : STEPS_PICKUP).map(function (s) { return '<span class="ou-step ' + (reached[s[0]] ? 'done' : '') + '">' + (reached[s[0]] ? '✓ ' : '') + s[1] + '</span>'; }).join('');
    if (o.status === 'CANCELLED' || o.status === 'REFUNDED') html += '<span class="ou-step bad">' + esc(LABEL[o.status]) + '</span>';
    return '<div class="ou-tl">' + html + '</div>';
  }
  function reachedStatus(o, s) { return o.status === s || (o.statusHistory || []).some(function (h) { return h.to === s; }); }
  function fulfilmentBlock(o) {
    if (!isDelivery(o)) return '<div class="ou-ful">🏪 <b>Pickup from shop</b>. No delivery fee.</div>';
    var d = o.delivery || {};
    return '<div class="ou-ful">🛵 <b>Delivery</b><br/>' + esc(d.name || '') + (d.phone ? ' · ' + esc(d.phone) : '') + '<br/>' + esc(d.address || '') +
      (d.landmark ? '<br/><span class="ou-muted">Landmark:</span> ' + esc(d.landmark) : '') + (d.note ? '<br/><span class="ou-muted">Note:</span> ' + esc(d.note) : '') + '</div>';
  }
  // Items, then (delivery only) the fee once the seller has sent it, then the total the buyer pays
  function totalsBlock(o, items) {
    if (!isDelivery(o)) return '<div class="ou-items">' + items + '<div class="ou-row ou-total"><span>Total</span><span>' + money(o.total) + '</span></div></div>';
    var base = o.productTotal != null ? o.productTotal : o.total;
    if (!reachedStatus(o, 'TOTAL_SENT')) {
      return '<div class="ou-items">' + items + '<div class="ou-row"><span>Products</span><span>' + money(base) + '</span></div>' +
        '<div class="ou-row ou-muted"><span>Delivery fee</span><span>Seller will add it</span></div></div>';
    }
    return '<div class="ou-items">' + items + '<div class="ou-row"><span>Products</span><span>' + money(base) + '</span></div>' +
      '<div class="ou-row"><span>Delivery fee</span><span>' + money(o.deliveryFee) + '</span></div>' +
      '<div class="ou-fee">' + esc(FEE_NOTICE) + '</div>' +
      '<div class="ou-row ou-total"><span>Total amount</span><span>' + money(o.total) + '</span></div></div>';
  }
  // The seller's account, shown to the buyer only once the server has saved it on the order (after accept / after the total is accepted)
  function bankBlock(o, role) {
    var d = o.paymentDetails;
    if (role !== 'buyer' || !d || !d.accountNumber || ['ACCEPTED', 'TOTAL_ACCEPTED', 'PAYMENT_SUBMITTED', 'PAYMENT_ISSUE'].indexOf(o.status) < 0) return '';
    return '<div class="ou-bank"><h5>Pay the seller directly</h5>' +
      '<div class="ou-row"><span>Bank</span><b>' + esc(d.bankName) + '</b></div>' +
      '<div class="ou-row"><span>Account name</span><b>' + esc(d.accountName) + '</b></div>' +
      '<div class="ou-row"><span>Account number</span><span><b>' + esc(d.accountNumber) + '</b><button class="ou-copy" data-ou-copy="' + esc(d.accountNumber) + '">Copy</button></span></div>' +
      '<div class="ou-row"><span>Amount to pay</span><b>' + money(o.total) + '</b></div></div>';
  }
  // What the buyer entered when paying, and the receipt (a short-lived private link, opened on request)
  function paymentBlock(o) {
    var p = o.payment || {};
    if (!p.method && !p.reference && !p.hasProof) return '';
    var line = [p.method ? 'Paid by: ' + esc(p.method) : '', p.reference ? 'Reference: ' + esc(p.reference) : ''].filter(Boolean).join(' · ');
    return '<div class="ou-sub" style="margin:6px 0;">' + line + (p.hasProof ? (line ? ' · ' : '') + '<a href="#" data-ou-receipt="' + esc(o._id) + '" style="color:#128049;font-weight:800;">🧾 View receipt</a>' : '') + '</div>';
  }
  function card(o, role) {
    var other = role === 'buyer'
      ? ((o.seller && o.seller.businessName) || 'Shop')
      : ((o.buyer && o.buyer.fullName) || 'Buyer');
    var phone = role === 'buyer' ? (o.seller && o.seller.whatsappNumber) : (o.buyer && o.buyer.phone);
    var wa = waLink(phone, 'Hello, this is about order ' + o.orderId + ' on ALFIJEER.');
    var items = (o.items || []).map(function (i) { return '<div class="ou-row"><span>' + esc(i.name) + ' × ' + esc(i.quantity) + '</span><span>' + money(i.price * i.quantity) + '</span></div>'; }).join('');
    var btns = buttonsFor(role, o).map(function (a) {
      return '<button class="ou-btn ' + (META[a].danger ? 'danger' : '') + '" data-ou-action="1" data-id="' + esc(o._id) + '" data-action="' + a + '">' + esc(META[a].label) + '</button>';
    }).join('');
    if (wa && TERMINAL.indexOf(o.status) < 0) btns += '<a class="ou-btn wa" target="_blank" rel="noopener" href="' + esc(wa) + '">💬 WhatsApp</a>';
    var next = nextText(role, o);
    var tl = timeLeft(o);
    var hist = (o.statusHistory || []).map(function (h) {
      return '<div>' + esc(LABEL[h.from] || '—') + ' → <b>' + esc(LABEL[h.to] || h.to) + '</b> · ' + esc(h.byRole) + ' · ' + esc(when(h.at)) + (h.reason ? ' · ' + esc(h.reason) : '') + '</div>';
    }).join('');
    return '<div class="ou-card"><div class="ou-head"><div><div class="ou-num">' + esc(o.orderId || o._id) + '</div>' +
      '<div class="ou-sub">' + (role === 'buyer' ? '🏪 ' : '👤 ') + esc(other) + ' · ' + esc(when(o.createdAt)) + '</div></div>' + pill(o.status) + '</div>' +
      fulfilmentBlock(o) + totalsBlock(o, items) + timeline(o) + bankBlock(o, role) + paymentBlock(o) + (next ? '<div class="ou-next">' + esc(next) + '</div>' : '') + (tl ? '<div class="ou-time">⏳ ' + esc(tl) + '</div>' : '') +
      (btns ? '<div class="ou-actions">' + btns + '</div>' : '') +
      (role === 'buyer' && o.dispute && o.dispute.evidence && o.dispute.evidence.length ? '<div class="ou-sub" style="margin:6px 0;">📎 You attached ' + o.dispute.evidence.length + ' photo' + (o.dispute.evidence.length === 1 ? '' : 's') + ' to your report.</div>' : '') +
      (hist ? '<details class="ou-hist"><summary>History</summary>' + hist + '</details>' : '') + '</div>';
  }

  function mount(el, orders, role, reload) {
    if (!el) return;
    el._ouCtx = { reload: reload, orders: {} };
    (orders || []).forEach(function (o) { el._ouCtx.orders[o._id] = o; });
    if (!orders || !orders.length) { el.innerHTML = '<div class="ou-empty">📭<br/>No orders yet.</div>'; return; }
    el.innerHTML = orders.map(function (o) { return card(o, role); }).join('');
    if (!el._ouBound) {
      el._ouBound = true;
      el.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target : null;
        if (!t) return;
        var b = t.closest('[data-ou-action]');
        if (b) return run(b, el._ouCtx);
        var r = t.closest('[data-ou-receipt]');
        if (r) { e.preventDefault(); return viewReceipt(r.getAttribute('data-ou-receipt')); }
        var c = t.closest('[data-ou-copy]');
        if (c) {
          var num = c.getAttribute('data-ou-copy');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(function () { toast('Account number copied', 'success'); }, function () { toast(num, 'info'); });
          else toast(num, 'info');
        }
      });
    }
  }
  function needsAction(o, role) {
    if (o.status === 'ACCEPTED') return role === 'seller' ? isDelivery(o) : !isDelivery(o);   // delivery: seller owes the total. pickup: buyer owes the payment
    return (NEEDS[role] || []).indexOf(o.status) >= 0;
  }

  window.OrdersUI = { mount: mount, needsAction: needsAction, icon: function (s) { return ICON[s] || '⬜'; }, label: function (s) { return LABEL[s] || s; }, esc: esc };
})();
