// ══════════════════════════════════════════════════════════
// ALFIJEER — SHARED API HELPERS
// Every page includes this file before its own <script> block:
//   <script src="./api.js"></script>
//
// It centralizes: the backend base URL, auth headers, the
// logged-in user object, and a couple of formatting helpers
// used across buyer, seller, and admin pages.
// ══════════════════════════════════════════════════════════

const _API = 'https://arewa-square-backend-production.up.railway.app/api';

// ── Auth ──
// Matches the real keys set at login (see auth.html):
//   as_token  → JWT string
//   as_role   → 'buyer' | 'seller' | 'admin'
//   as_user   → JSON string of the logged-in user { fullName, phone, ... }
//   as_seller → JSON string of the seller profile, only set for seller accounts

function getToken() {
  return localStorage.getItem('as_token');
}

function getRole() {
  return localStorage.getItem('as_role');
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('as_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isLoggedIn() {
  return !!getToken();
}

function _headers() {
  const token = getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

function logout(redirectTo) {
  localStorage.removeItem('as_token');
  localStorage.removeItem('as_role');
  localStorage.removeItem('as_user');
  localStorage.removeItem('as_seller');
  window.location.href = redirectTo || 'auth.html';
}

// Redirects to auth.html if there's no token. Call at the top of
// any page that requires a logged-in user (buyer/seller/admin dashboards).
// Pass a role ('buyer' | 'seller' | 'admin') to also enforce that
// the logged-in account is the right type for this page.
function requireAuth(role) {
  if (!isLoggedIn()) {
    window.location.href = 'auth.html';
    return false;
  }
  if (role && getRole() && getRole() !== role) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── Formatting helpers (shared across buyer/seller/admin pages) ──

function formatPrice(n) {
  return '₦' + Number(n || 0).toLocaleString();
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return days + 'd ago';
  return d.toLocaleDateString();
}

function catIcon(cat) {
  const icons = {
    'Fashion, Clothing & Shoes': '👕',
    'Electronics & Appliances': '📺',
    'Phones & Accessories': '📱',
    'Home & Furniture': '🛋️',
    'Food & Groceries': '🛒',
    'Computers & Technology': '💻',
    'Agriculture & Livestock': '🌾',
    'Health & Beauty': '💊',
    'Education & Training': '📚',
    'Services': '🔧',
    'Other': '📦',
  };
  return icons[cat] || '🏪';
}

function formatShopNum(num) {
  if (!num) return 'Shop —';
  const s = String(num).replace(/[^0-9]/g, '');
  return s ? 'Shop ' + s.padStart(3, '0') : 'Shop —';
}

// ── Shared toast notification ──
// Same look everywhere: bottom-right on desktop, matches the brand palette.
function showToast(message, type) {
  type = type || 'info';
  const existing = document.querySelector('.as-toast');
  if (existing) existing.remove();
  const colors = { success: '#128049', error: '#e74c3c', info: '#001233', warning: '#f39c12' };
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = 'as-toast';
  toast.innerHTML = '<span>' + icons[type] + '</span><span>' + message + '</span>';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '28px', right: '28px', zIndex: '9999',
    background: '#FFFFFF', border: '1px solid ' + colors[type],
    color: '#14203A', padding: '14px 20px', borderRadius: '8px',
    fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem', fontWeight: '600',
    display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 4px 24px rgba(16,40,28,0.14)', maxWidth: '340px'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Service worker registration ──
// Safe to call on every page; browsers that already have it registered just no-op.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
