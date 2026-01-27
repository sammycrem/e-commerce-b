// static/js/cart.js
// Full cart script: renders session cart, lets user update quantities/remove items,
// selects shipping country, applies promo codes, shows VAT/shipping breakdown and performs checkout.

document.addEventListener('DOMContentLoaded', () => {
  // Elements from the new cart.html structure
  const cartContainer = document.getElementById('cart-container');
  const cartSummary = document.getElementById('cart-summary');
  const subtotalEl = document.getElementById('subtotal');
  const discountEl = document.getElementById('discount-amount');
  const totalEl = document.getElementById('total-price');
  const applyPromoBtn = document.getElementById('apply-promo-btn');
  const promoInput = document.getElementById('promo-code');
  const promoFeedback = document.getElementById('promo-feedback');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutFeedback = document.getElementById('checkout-feedback');
  const countrySelect = document.getElementById('country-select');
  const vatEl = document.getElementById('vat-amount');
  const shippingEl = document.getElementById('shipping-amount');
  const continueShoppingBtn = document.querySelector('.continue-shopping');
  const clearCartBtn = document.querySelector('.clear-cart');

  // Local state
  let cartData = { items: [], subtotal_cents: 0 };
  let lastCalc = null; // keep last calculate-totals response

  // Format cents -> €X.YY
  function formatPrice(cents) {
    if (typeof cents !== 'number') cents = Number(cents || 0);
    return `€${(cents / 100).toFixed(2)}`;
  }

  // Load countries into selector
  async function loadCountries() {
    try {
      const res = await fetch('/api/countries', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load countries');
      const data = await res.json();
      countrySelect.innerHTML = '<option value="">Select country</option>';
      data.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.iso_code;
        opt.textContent = `${c.name} (${c.iso_code})`;
        countrySelect.appendChild(opt);
      });
    } catch (err) {
      console.warn('Could not load countries:', err);
    }
  }

  // Fetch session cart from backend and render
  async function refreshCart() {
    try {
      const res = await fetch('/api/cart', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to load cart');
      const data = await res.json();
      cartData = data;
      renderCart(data);
      await recalcTotals(promoInput.value.trim());
    } catch (err) {
      console.error('refreshCart error:', err);
      cartContainer.innerHTML = '<tr><td colspan="4">Unable to load cart. Try reloading the page.</td></tr>';
    }
  }

  function renderCart(data) {
    cartContainer.innerHTML = ''; // Clear existing content

    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      cartContainer.innerHTML = '<tr><td colspan="4">Your cart is empty.</td></tr>';
      cartSummary.style.display = 'none';
      return;
    }

    cartSummary.style.display = 'block';

    data.items.forEach(item => {
      const tr = document.createElement('tr');

      // Product Info Cell
      const tdProduct = document.createElement('td');
      const productInfo = document.createElement('div');
      productInfo.className = 'product-info';
      const img = document.createElement('img');
      img.src = item.image_url || 'https://via.placeholder.com/100';
      img.alt = item.product_name || '';
      const details = document.createElement('div');
      const title = document.createElement('p');
      title.textContent = item.product_name || item.sku;
      const meta = document.createElement('span');
      meta.textContent = `${item.color || ''} ${item.size ? '- ' + item.size : ''}`.trim();
      const sku = document.createElement('p');
      sku.textContent = `SKU: ${item.sku}`;
      details.appendChild(title);
      details.appendChild(meta);
      details.appendChild(sku);
      productInfo.appendChild(img);
      productInfo.appendChild(details);
      tdProduct.appendChild(productInfo);

      // Price Cell
      const tdPrice = document.createElement('td');
      tdPrice.textContent = formatPrice(item.unit_price_cents);

      // Quantity Cell
      const tdQuantity = document.createElement('td');
      const quantitySelector = document.createElement('div');
      quantitySelector.className = 'quantity-selector';
      const minusBtn = document.createElement('button');
      minusBtn.textContent = '-';
      const qtyInput = document.createElement('input');
      qtyInput.type = 'text';
      qtyInput.value = item.quantity;
      qtyInput.dataset.sku = item.sku;
      qtyInput.className = 'quantity-input';
      const plusBtn = document.createElement('button');
      plusBtn.textContent = '+';
      quantitySelector.appendChild(minusBtn);
      quantitySelector.appendChild(qtyInput);
      quantitySelector.appendChild(plusBtn);
      tdQuantity.appendChild(quantitySelector);

      // Total Cell
      const tdTotal = document.createElement('td');
      tdTotal.textContent = formatPrice(item.line_total_cents);

      // Delete Cell
      const tdDelete = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '🗑️';
      deleteBtn.dataset.sku = item.sku;
      tdDelete.appendChild(deleteBtn);

      tr.appendChild(tdProduct);
      tr.appendChild(tdPrice);
      tr.appendChild(tdQuantity);
      tr.appendChild(tdTotal);
      tr.appendChild(tdDelete);
      cartContainer.appendChild(tr);

      // Event Listeners for quantity controls
      minusBtn.addEventListener('click', () => updateCartItem(item.sku, item.quantity - 1));
      plusBtn.addEventListener('click', () => updateCartItem(item.sku, item.quantity + 1));
      qtyInput.addEventListener('change', (e) => {
        const newQty = parseInt(e.target.value, 10);
        if (!isNaN(newQty) && newQty >= 0) {
          updateCartItem(item.sku, newQty);
        }
      });
      deleteBtn.addEventListener('click', () => updateCartItem(item.sku, 0));
    });
  }

  async function updateCartItem(sku, quantity) {
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, quantity: Math.max(0, quantity) })
      });
      if (!res.ok) {
        const data = await res.json();
        promoFeedback.textContent = data.error || 'Failed to update cart';
        promoFeedback.className = 'feedback error';
        return;
      }
      await refreshCart();
    } catch (err) {
      console.error('updateCartItem error:', err);
      promoFeedback.textContent = 'Network error while updating cart';
      promoFeedback.className = 'feedback error';
    }
  }

  async function recalcTotals(promoCode = '') {
    const items = (cartData.items || []).map(it => ({ sku: it.sku, quantity: it.quantity }));
    const country = countrySelect.value || null;

    try {
      const res = await fetch('/api/calculate-totals', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shipping_country_iso: country, promo_code: promoCode || null })
      });
      const data = await res.json();

      if (!res.ok) {
        subtotalEl.textContent = formatPrice(cartData.subtotal_cents || 0);
        discountEl.textContent = formatPrice(0);
        vatEl.textContent = formatPrice(0);
        shippingEl.textContent = formatPrice(0);
        totalEl.textContent = formatPrice(cartData.subtotal_cents || 0);
        return;
      }

      lastCalc = data;
      subtotalEl.textContent = formatPrice(data.subtotal_cents || 0);
      discountEl.textContent = formatPrice(data.discount_cents || 0);
      vatEl.textContent = formatPrice(data.vat_cents || 0);
      shippingEl.textContent = `${formatPrice(data.shipping_cost_cents || 0)} ${data.shipping_zone ? '(' + data.shipping_zone + ')' : ''}`;
      totalEl.textContent = formatPrice(data.total_cents || 0);
    } catch (err) {
      console.error('recalcTotals error:', err);
      promoFeedback.textContent = 'Unable to calculate totals. Try again.';
      promoFeedback.className = 'feedback error';
    }
  }

  applyPromoBtn.addEventListener('click', async () => {
    const code = promoInput.value.trim();
    promoFeedback.textContent = '';
    await recalcTotals(code);
    if (lastCalc && lastCalc.discount_cents && lastCalc.discount_cents > 0) {
      promoFeedback.textContent = `Promo '${code}' applied`;
      promoFeedback.className = 'feedback success';
    } else if (code) {
      promoFeedback.textContent = `Promo '${code}' not applied`;
      promoFeedback.className = 'feedback error';
    }
  });

  checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isAuthenticated = checkoutBtn.dataset.isAuthenticated === 'true';
    if (isAuthenticated) {
      window.location.href = '/checkout/shipping-address';
    } else {
      window.location.href = '/checkout/login';
    }
  });

  countrySelect.addEventListener('change', () => {
    recalcTotals(promoInput.value.trim());
  });

  continueShoppingBtn.addEventListener('click', () => {
    window.location.href = '/index';
  });

  clearCartBtn.addEventListener('click', async () => {
    const itemsToClear = (cartData.items || []).map(item => updateCartItem(item.sku, 0));
    await Promise.all(itemsToClear);
    await refreshCart();
  });

  (async function init() {
    await loadCountries();
    await refreshCart();
  })();
});
