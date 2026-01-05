// Cart page logic: reads per-user cart from localStorage and allows remove/clear/checkout
(function () {
  const CURRENT_KEY = 'fw_currentUser';
  function getCurrentUser() { const v = localStorage.getItem(CURRENT_KEY); return v ? String(v).toLowerCase() : null; }

  // Listen for storage changes (helps when cart is updated on another page/tab)
  window.addEventListener('storage', function(e) {
    if (!e.key) return;
    if (e.key === 'cart_guest' || e.key.startsWith('cart_') || e.key === 'fw_currentUser') {
      // reload cart to stay in sync
      try { loadCart(); } catch (err) { console.debug('[CART] storage event load failed', err); }
    }
  });

  function showMsg(text, isError) {
    const el = document.getElementById('cart-note');
    if (el) {
      el.textContent = text;
      el.style.color = isError ? '#ff6b6b' : '#8ef08f';
      clearTimeout(el._t);
      el._t = setTimeout(() => { el.textContent = ''; }, 3000);
    }
    if (window.showToast) window.showToast(text, isError ? 'error' : 'success');
  }

  function loadCart() {
    const user = getCurrentUser();
    const container = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');
    const totalEl = document.getElementById('cart-total');
    container.innerHTML = '';
    // If not signed in, show guest cart
    if (!user) {
      const guest = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      if (!guest.length) {
        container.innerHTML = '<div>Your cart is empty.</div>';
        summary.style.display = 'none';
        updateCartCountUI(0);
        return;
      }
      // render guest cart
      let total = 0;
      guest.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        const imgSrc = item.image || 'images/placeholder1.jpg';
        const priceNumber = parseInt((item.price||'₦0').replace(/[^0-9]/g, '')) || 0;
        total += priceNumber;
        itemEl.innerHTML = `
          <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
          <div class="meta">
            <h4>${escapeHtml(item.title)}</h4>
            <div class="price">${escapeHtml(item.price)}</div>
          </div>
          <div class="actions">
            <button class="remove-btn" data-idx="${idx}">Remove</button>
          </div>
        `;
        container.appendChild(itemEl);
      });
      totalEl.textContent = '₦' + total.toLocaleString();
      summary.style.display = 'flex';
      attachRemoveHandlers();
      updateCartCountUI(guest.length);
      // make checkout button disabled for guests
      document.getElementById('checkout').disabled = true;
      return;
    }

    const key = 'cart_' + user;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    if (!cart.length) {
      // If user's cart is empty but guest cart has items, show guest items and offer to merge them
      const guest = JSON.parse(localStorage.getItem('cart_guest') || '[]');
      if (guest.length) {
        const note = document.createElement('div');
        note.className = 'cart-note';
        note.innerHTML = `You have <strong>${guest.length}</strong> item${guest.length === 1 ? '' : 's'} in your guest cart. <button id="merge-guest" class="clear-btn">Merge guest items</button>`;
        container.appendChild(note);
        // render guest items for preview
        let total = 0;
        guest.forEach((item, idx) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'cart-item';
          const imgSrc = item.image || 'images/placeholder1.jpg';
          const priceNumber = parseInt((item.price||'₦0').replace(/[^0-9]/g, '')) || 0;
          total += priceNumber;
          itemEl.innerHTML = `
            <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
            <div class="meta">
              <h4>${escapeHtml(item.title)}</h4>
              <div class="price">${escapeHtml(item.price)}</div>
            </div>
          `;
          container.appendChild(itemEl);
        });
        totalEl.textContent = '₦' + total.toLocaleString();
        summary.style.display = 'flex';
        updateCartCountUI(guest.length);
        // attach merge handler
        document.getElementById('merge-guest').addEventListener('click', function () {
          if (window.mergeGuestCartToCurrentUser) {
            const ok = window.mergeGuestCartToCurrentUser();
            if (ok) setTimeout(loadCart, 250);
          } else {
            alert('Merge helper unavailable');
          }
        });
        // disable checkout until merged
        document.getElementById('checkout').disabled = true;
        return;
      }
      container.innerHTML = '<div>Your cart is empty.</div>';
      summary.style.display = 'none';
      updateCartCountUI(0);
      return;
    }
    let total = 0;
    cart.forEach((item, idx) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      const imgSrc = item.image || 'images/placeholder1.jpg';
      const priceNumber = parseInt((item.price||'₦0').replace(/[^0-9]/g, '')) || 0;
      total += priceNumber;
      itemEl.innerHTML = `
        <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
        <div class="meta">
          <h4>${escapeHtml(item.title)}</h4>
          <div class="price">${escapeHtml(item.price)}</div>
        </div>
        <div class="actions">
          <button class="remove-btn" data-idx="${idx}">Remove</button>
        </div>
      `;
      container.appendChild(itemEl);
    });
    totalEl.textContent = '₦' + total.toLocaleString();
    summary.style.display = 'flex';
    attachRemoveHandlers();
    updateCartCountUI(cart.length);
  }

  function attachRemoveHandlers(){
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', function(){
        const idx = Number(btn.dataset.idx);
        const user = getCurrentUser();
        const key = user ? ('cart_' + user) : 'cart_guest';
        const cart = JSON.parse(localStorage.getItem(key) || '[]');
        cart.splice(idx,1);
        localStorage.setItem(key, JSON.stringify(cart));
        showMsg('Item removed');
        loadCart();
      });
    });
  }

  function updateCartCountUI(count){
    const el = document.getElementById('cart-count');
    if (el) el.textContent = count;
    const pageEl = document.getElementById('cart-items-count');
    if (pageEl) {
      if (!count) pageEl.textContent = '';
      else pageEl.textContent = `${count} item${count === 1 ? '' : 's'}`;
    }
  }

  function clearCart(){
    const user = getCurrentUser();
    if (!confirm('Clear all items in your cart?')) return;
    const key = user ? ('cart_' + user) : 'cart_guest';
    localStorage.removeItem(key);
    showMsg('Cart cleared');
    loadCart();
  }

  function checkout(){
    const user = getCurrentUser();
    if (!user) return showMsg('Sign in to checkout', true);
    const key = 'cart_' + user;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    if (!cart.length) return showMsg('Cart is empty', true);
    // compute total
    const total = cart.reduce((s,item)=> s + (parseInt((item.price||'₦0').replace(/[^0-9]/g, ''))||0), 0);
    // Save order to order history
    const ordersKey = 'orders_' + user;
    const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
    const order = { id: Date.now(), items: cart, total: total, date: (new Date()).toISOString() };
    orders.push(order);
    localStorage.setItem(ordersKey, JSON.stringify(orders));
    // clear cart
    localStorage.removeItem(key);
    showMsg('Checkout successful — order placed (id: ' + order.id + ')');
    loadCart();
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]); }); }

  document.addEventListener('DOMContentLoaded', function(){
    loadCart();
    const clearBtn = document.getElementById('clear-cart');
    const checkoutBtn = document.getElementById('checkout');
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);
  });
})();