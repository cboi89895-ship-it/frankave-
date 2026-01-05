// Lightweight client-side auth + cart (localStorage)
(function () {
  const USERS_KEY = 'fw_users';
  const CURRENT_KEY = 'fw_currentUser';

  function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function setCurrentUser(email) { if (!email) { localStorage.removeItem(CURRENT_KEY); } else { localStorage.setItem(CURRENT_KEY, String(email).toLowerCase()); } }
  function getCurrentUser() { const v = localStorage.getItem(CURRENT_KEY); return v ? String(v).toLowerCase() : null; }
  function logout() { localStorage.removeItem(CURRENT_KEY); updateUI(); }

  // Expose simple state for debugging if needed
  function getState() { return { current: getCurrentUser(), users: Object.keys(getUsers()).length, guest: (JSON.parse(localStorage.getItem('cart_guest')||'[]').length) }; }

  // Merge guest cart into user cart (called after login/register)
  function mergeGuestCartToUser(email) {
    if (!email) return;
    const guest = JSON.parse(localStorage.getItem('cart_guest') || '[]');
    if (!guest.length) return;
    const key = 'cart_' + email;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    const merged = cart.concat(guest);
    localStorage.setItem(key, JSON.stringify(merged));
    localStorage.removeItem('cart_guest');
    showMsg('Guest items moved to your cart');
    debug('Merged guest cart into', key, merged.length);
  }

  function showMsg(msg, isError) {
    const el = document.getElementById('auth-msg');
    if (el) {
      el.textContent = msg;
      el.style.color = isError ? '#ff6b6b' : '#8ef08f';
      clearTimeout(el._t);
      el._t = setTimeout(() => { el.textContent = ''; }, 3500);
    }
    showToast(msg, isError ? 'error' : 'success');
  }

  // Site-wide toast helper
  function showToast(message, type = 'success', timeout = 3500) {
    if (!message) return;
    const containerId = 'toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div'); container.id = containerId; container.className = 'toast-container'; document.body.appendChild(container);
    }
    const t = document.createElement('div'); t.className = 'toast ' + (type === 'error' ? 'error' : 'success'); t.textContent = message;
    container.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, timeout);
  }
  window.showToast = showToast;

  // Simple debug helper
  function debug() { if (window && window.console) { console.debug.apply(console, ['[AUTH]'].concat(Array.from(arguments))); } }

  // Utility: set/clear field errors
  function setFieldError(id, msg) {
    const input = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    if (input) input.classList.add('input-error');
    if (err) err.textContent = msg || '';
  }
  function clearFieldError(id) {
    const input = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    if (input) input.classList.remove('input-error');
    if (err) err.textContent = '';
  }

  // Attach input listeners to clear errors on typing
  ['login-email','login-password','reg-email','reg-password','reg-first','reg-last','reg-phone','fp-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => clearFieldError(id));
  });

  // Register
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const first = document.getElementById('reg-first').value.trim();
      const last = document.getElementById('reg-last').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const email = document.getElementById('reg-email').value.trim().toLowerCase();
      const password = document.getElementById('reg-password').value;
      // clear previous
      ['reg-first','reg-last','reg-email','reg-password','reg-phone'].forEach(clearFieldError);
      if (!first) { setFieldError('reg-first','First name required'); return; }
      if (!last) { setFieldError('reg-last','Last name required'); return; }
      if (!email) { setFieldError('reg-email', 'Email is required'); return; }
      if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError('reg-email', 'Enter a valid email'); return; }
      if (phone && !/^[0-9+ ]{7,15}$/.test(phone)) { setFieldError('reg-phone','Enter a valid phone'); return; }
      if (!password) { setFieldError('reg-password', 'Password is required'); return; }
      if (password.length < 6) { setFieldError('reg-password', 'Minimum 6 characters'); return; }
      const users = getUsers();
      if (users[email]) { setFieldError('reg-email', 'Email already registered'); return; }
      users[email] = { password: password, firstName: first, lastName: last, phone: phone };
      saveUsers(users);
      setCurrentUser(email);
      mergeGuestCartToUser(email);
      updateUI();
      showMsg('Account created — signed in');
      setTimeout(() => { window.location = 'shop.html'; }, 700);
    });
  }

  // Login
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;
      ['login-email','login-password'].forEach(clearFieldError);
      if (!email) { setFieldError('login-email','Email is required'); return; }
      if (!password) { setFieldError('login-password','Password is required'); return; }
      const users = getUsers();
      if (!users[email] || users[email].password !== password) { setFieldError('login-email','Invalid credentials'); setFieldError('login-password',''); return; }
      setCurrentUser(email);
      mergeGuestCartToUser(email);
      updateUI();
      showMsg('Signed in');
      setTimeout(() => { window.location = 'shop.html'; }, 600);
    });
  }

  // Forgot password flow
  const forgotLink = document.getElementById('forgot-link');
  const forgotForm = document.getElementById('forgot-form');
  if (forgotLink && forgotForm) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      forgotForm.style.display = forgotForm.style.display === 'block' ? 'none' : 'block';
    });
    document.getElementById('cancel-forgot').addEventListener('click', function () {
      forgotForm.style.display = 'none';
    });
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('fp-email').value.trim().toLowerCase();
      clearFieldError('fp-email');
      if (!email) { setFieldError('fp-email','Email required'); return; }
      const users = getUsers();
      if (!users[email]) { setFieldError('fp-email','No account found'); return; }
      // step 2: prompt to set a new password
      forgotForm.innerHTML = `\n        <label for="fp-newpass">New password</label>\n        <div class="input-with-toggle">\n          <input id="fp-newpass" type="password" placeholder="New password">\n          <button type="button" class="toggle-pass" data-target="fp-newpass">👁️</button>\n        </div>\n        <span class="field-error" id="err-fp-newpass"></span>\n        <button id="fp-set" class="btn-primary">Set password</button>\n        <button type="button" id="cancel-forgot" class="clear-btn">Cancel</button>\n      `;
      // bind set/cancel
      document.getElementById('cancel-forgot').addEventListener('click', function () { forgotForm.style.display = 'none'; location.reload(); });
      document.getElementById('fp-set').addEventListener('click', function () {
        const newp = document.getElementById('fp-newpass').value;
        const errId = 'fp-newpass';
        clearFieldError(errId);
        if (!newp || newp.length < 6) { setFieldError('err-fp-newpass','Password must be at least 6 chars'); return; }
        const users2 = getUsers();
        users2[email].password = newp;
        saveUsers(users2);
        showMsg('Password updated — please sign in');
        setTimeout(() => { window.location = 'account.html'; }, 900);
      });
    });
  }

  // Update header UI and cart count
  function getCartCount() {
    const user = getCurrentUser();
    if (!user) {
      const guest = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      return guest.length;
    }
    const cart = JSON.parse(localStorage.getItem('cart_' + user) || '[]');
    return cart.length;
  }

  function updateCartCount() {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const count = getCartCount();
    el.textContent = (count ? String(count) : '0');
  }

  // Expose a utility to merge guest cart into current user (used by cart page UI)
  window.mergeGuestCartToCurrentUser = function () {
    const user = getCurrentUser();
    if (!user) { showMsg('Sign in to merge guest items', true); return false; }
    mergeGuestCartToUser(user);
    updateCartCount();
    showMsg('Guest items merged to your cart');
    return true;
  };

  // Listen for storage changes to keep the header count in sync
  window.addEventListener('storage', function (e) {
    if (!e.key) return;
    if (e.key === 'cart_guest' || e.key.startsWith('cart_') || e.key === CURRENT_KEY) {
      try { updateCartCount(); } catch (err) { console.debug('[AUTH] storage updateCartCount failed', err); }
    }
  });

  // Enable/disable Add-to-Cart buttons depending on auth state
  function updateAddToCartButtons() {
    // Ensure add buttons display their original label for all users (guest or signed-in)
    document.querySelectorAll('.add-btn').forEach((btn) => {
      const orig = btn.dataset.origLabel || btn.textContent.trim();
      btn.dataset.origLabel = orig;
      btn.textContent = orig || 'Add to Cart';
      btn.classList.remove('require-signin');
      btn.disabled = false;
    });
  }

  function updateUI() {
    debug('updateUI', { current: getCurrentUser(), users: getUsers() });
    let user = getCurrentUser();
    const userLink = document.getElementById('user-link');
    const avatar = document.getElementById('user-avatar');
    // ensure session points to a real user; if not, clear it
    const allUsers = getUsers();
    if (user && !allUsers[user]) { debug('Clearing invalid session for', user); localStorage.removeItem(CURRENT_KEY); user = null; }
    if (userLink) {
      if (user) {
        const users = allUsers;
        const u = users[user] || {};
        // fallback: if no profile, display the email prefix
        const fallbackName = user && typeof user === 'string' ? (user.split('@')[0]) : user;
        const display = u.firstName ? ('Welcome, ' + u.firstName) : ('Welcome, ' + fallbackName);
        userLink.textContent = display;
        userLink.href = '#';
        // avatar
        if (avatar) {
          let initials = '';
          if (u.firstName) initials += u.firstName[0];
          if (u.lastName) initials += u.lastName[0];
          if (!initials) initials = (fallbackName || '').slice(0,2);
          avatar.textContent = (initials || '').toUpperCase();
          avatar.classList.remove('hidden');
          avatar.title = (u.firstName ? u.firstName + (u.lastName ? ' ' + u.lastName : '') : user);
        }
        // add logout button next to link for convenience
        const existing = document.querySelector('.link-btn');
        if (user && !existing) {
          const btn = document.createElement('button');
          btn.className = 'link-btn';
          btn.textContent = 'Logout';
          btn.addEventListener('click', function (e) { e.preventDefault(); logout(); showMsg('Signed out'); });
          userLink.parentNode.insertBefore(btn, userLink.nextSibling);
        }
      } else {
        userLink.textContent = 'Login / Register';
        userLink.href = 'account.html';
        if (avatar) { avatar.textContent = ''; avatar.classList.add('hidden'); }
        const existing = document.querySelector('.link-btn');
        if (existing) existing.remove();
      }
    }
    updateCartCount();
    updateAddToCartButtons();
    // update visible debug info if present
    const dbg = document.getElementById('auth-debug'); if (dbg) { const s = getState(); dbg.textContent = 'user:' + (s.current || '-') + ' users:' + s.users + ' guest:' + s.guest; }
  }

  // Add to cart behavior (requires login)
  function attachAddToCart() {
    document.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const user = getCurrentUser();
        debug('addToCart clicked', { user });
        const users = getUsers();
        // if there is a stale current user (no profile), clear it
        if (user && !users[user]) { debug('Found stale current user, clearing'); localStorage.removeItem(CURRENT_KEY); }
        const card = btn.closest('.product-card');
        const title = card?.querySelector('.product-title')?.textContent.trim() || 'Product';
        const price = card?.querySelector('.price')?.textContent.trim() || '₦0';
        const img = card?.querySelector('img')?.getAttribute('src') || 'images/placeholder1.jpg';
        const key = user ? ('cart_' + user) : 'cart_guest';
        const cart = JSON.parse(localStorage.getItem(key) || '[]');
        cart.push({ title, price, image: img, added: Date.now() });
        localStorage.setItem(key, JSON.stringify(cart));
        showMsg('Added to cart');
        updateCartCount();
        debug('cart saved', key, JSON.parse(localStorage.getItem(key) || '[]').length);
        // Redirect user to cart page so they see the item immediately
        // If you prefer not to redirect automatically, remove the next line.
        window.location = 'cart.html';
      });
    });
  }

  // initialize
  document.addEventListener('DOMContentLoaded', function () {
    updateUI();
    attachAddToCart();
    updateAddToCartButtons();
    // password visibility toggles
    document.querySelectorAll('.toggle-pass').forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; } else { input.type = 'password'; btn.textContent = '👁️'; }
      });
    });

    // tab switching (Signin / Register) on account page
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const which = tab.dataset.tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById(which);
        if (target) target.classList.add('active');
      });
    });
    // allow logout from account page as well
    const logoutBtn = document.querySelector('.link-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { logout(); });
  });
})();