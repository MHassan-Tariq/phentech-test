document.addEventListener('DOMContentLoaded', () => {
  let cart = JSON.parse(localStorage.getItem('phentech_cart')) || [];
  let currentCategory = 'All';
  let searchQuery = '';
  let sortBy = 'default';

  const productsGrid = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const navSearchInput = document.getElementById('nav-search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoryContainer = document.getElementById('category-pills');
  const categorySelect = document.getElementById('category-select');
  const sortSelect = document.getElementById('sort-select');
  const cartBadge = document.getElementById('cart-count');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTax = document.getElementById('cart-tax');
  const cartTotal = document.getElementById('cart-total');
  const freeShippingProgress = document.getElementById('shipping-progress');
  const freeShippingMsg = document.getElementById('shipping-msg');
  const toastElement = document.getElementById('cart-toast');
  const toastMessage = document.getElementById('toast-message');
  const quickViewModal = new bootstrap.Modal(document.getElementById('quickViewModal'));

  initCategoryFilters();
  updateCartBadge();
  renderCartDrawer();
  renderProducts();

  function initCategoryFilters() {
    const categories = ['All', ...new Set(productsData.map(p => p.category))];

    categoryContainer.innerHTML = categories.map(cat => `
      <button class="category-btn ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">
        ${cat}
      </button>
    `).join('');

    categorySelect.innerHTML = categories.map(cat => `
      <option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>
    `).join('');

    categoryContainer.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.target.getAttribute('data-category');
        setCategory(cat);
      });
    });

    categorySelect.addEventListener('change', (e) => {
      setCategory(e.target.value);
    });
  }

  function setCategory(category) {
    currentCategory = category;
    
    categoryContainer.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });

    categorySelect.value = category;

    renderProducts();
  }

  function handleSearch(query) {
    searchQuery = query.trim().toLowerCase();
    
    if (searchInput) searchInput.value = query;
    if (navSearchInput) navSearchInput.value = query;

    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    }

    renderProducts();
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
  if (navSearchInput) {
    navSearchInput.addEventListener('input', (e) => handleSearch(e.target.value));
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => handleSearch(''));
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderProducts();
    });
  }

  function renderProducts() {
    let filtered = productsData.filter(product => {
      const matchCategory = (currentCategory === 'All') || (product.category === currentCategory);
      const matchQuery = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery) || 
        product.description.toLowerCase().includes(searchQuery) ||
        product.category.toLowerCase().includes(searchQuery);
      return matchCategory && matchQuery;
    });

    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    resultsCount.textContent = `Showing ${filtered.length} of ${productsData.length} products`;

    if (filtered.length === 0) {
      productsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    productsGrid.style.display = 'flex';
    emptyState.style.display = 'none';

    productsGrid.innerHTML = filtered.map(product => {
      const isDiscounted = product.originalPrice > product.price;
      
      return `
        <div class="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
          <div class="product-card w-100">
            ${product.badge ? `
              <div class="card-badge-top">
                <span class="badge ${product.badgeType}">${product.badge}</span>
              </div>
            ` : ''}
            
            <button class="btn-quick-view" data-id="${product.id}" title="Quick View">
              <i class="bi bi-eye"></i>
            </button>

            <div class="card-img-wrapper">
              <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>

            <div class="card-body p-4 d-flex flex-column justify-content-between">
              <div>
                <span class="category-tag">${product.category}</span>
                <h3 class="product-title">${product.name}</h3>
                
                <div class="rating-wrapper">
                  <i class="bi bi-star-fill"></i>
                  <span class="fw-bold text-dark me-1">${product.rating}</span>
                  <span class="rating-text">(${product.reviewsCount} reviews)</span>
                </div>

                <p class="product-description">${product.description}</p>
              </div>

              <div>
                <div class="d-flex align-items-center justify-content-between mb-3">
                  <div class="price-container">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    ${isDiscounted ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
                  </div>
                </div>

                <button class="btn btn-add-cart" data-id="${product.id}">
                  <i class="bi bi-cart-plus"></i> Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    attachCardEventListeners();
  }

  function attachCardEventListeners() {
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        addToCart(id, e.currentTarget);
      });
    });

    document.querySelectorAll('.btn-quick-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        openQuickView(id);
      });
    });
  }

  function addToCart(productId, buttonElem = null) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ id: productId, quantity: 1 });
    }

    saveCart();
    updateCartBadge();
    renderCartDrawer();
    showToast(`Added <strong>${product.name}</strong> to your cart!`);

    if (buttonElem) {
      const originalHTML = buttonElem.innerHTML;
      buttonElem.classList.add('added');
      buttonElem.innerHTML = `<i class="bi bi-check-lg"></i> Added!`;
      buttonElem.disabled = true;

      setTimeout(() => {
        buttonElem.classList.remove('added');
        buttonElem.innerHTML = originalHTML;
        buttonElem.disabled = false;
      }, 1500);
    }
  }

  function updateQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
      cart[index].quantity += delta;
      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }
      saveCart();
      updateCartBadge();
      renderCartDrawer();
    }
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCartDrawer();
  }

  function saveCart() {
    localStorage.setItem('luxemarket_cart', JSON.stringify(cart));
  }

  function updateCartBadge() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalCount;

    cartBadge.classList.remove('bounce');
    void cartBadge.offsetWidth;
    cartBadge.classList.add('bounce');
  }

  function renderCartDrawer() {
    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-cart-x text-muted display-4 mb-3 d-block"></i>
          <p class="text-muted fw-medium">Your cart is currently empty.</p>
          <button class="btn btn-sm btn-outline-primary mt-2" data-bs-dismiss="offcanvas">Start Shopping</button>
        </div>
      `;
      cartSubtotal.textContent = '$0.00';
      cartTax.textContent = '$0.00';
      cartTotal.textContent = '$0.00';
      if (freeShippingProgress) freeShippingProgress.style.width = '0%';
      if (freeShippingMsg) freeShippingMsg.textContent = 'Add $50.00 more to qualify for FREE Shipping!';
      return;
    }

    let subtotal = 0;

    cartItemsList.innerHTML = cart.map(item => {
      const product = productsData.find(p => p.id === item.id);
      if (!product) return '';
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      return `
        <div class="cart-item-row">
          <img src="${product.image}" alt="${product.name}" class="cart-item-img">
          <div class="flex-grow-1">
            <h6 class="mb-1 text-truncate" style="max-width: 170px;" title="${product.name}">${product.name}</h6>
            <div class="text-muted small mb-2">$${product.price.toFixed(2)} each</div>
            <div class="d-flex align-items-center gap-2">
              <button class="cart-qty-btn btn-qty-minus" data-id="${product.id}">-</button>
              <span class="fw-bold small px-1">${item.quantity}</span>
              <button class="cart-qty-btn btn-qty-plus" data-id="${product.id}">+</button>
            </div>
          </div>
          <div class="text-end">
            <div class="fw-bold text-dark mb-2">$${itemSubtotal.toFixed(2)}</div>
            <button class="btn-remove-item" data-id="${product.id}" title="Remove Item">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTax.textContent = `$${tax.toFixed(2)}`;
    cartTotal.textContent = `$${total.toFixed(2)}`;

    const freeShippingTarget = 50.00;
    const progressPercent = Math.min(100, (subtotal / freeShippingTarget) * 100);
    if (freeShippingProgress) freeShippingProgress.style.width = `${progressPercent}%`;
    if (freeShippingMsg) {
      if (subtotal >= freeShippingTarget) {
        freeShippingMsg.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i> You unlocked FREE Shipping!</span>`;
      } else {
        const remaining = (freeShippingTarget - subtotal).toFixed(2);
        freeShippingMsg.textContent = `Add $${remaining} more for FREE Shipping!`;
      }
    }

    cartItemsList.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        updateQuantity(id, -1);
      });
    });

    cartItemsList.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        updateQuantity(id, 1);
      });
    });

    cartItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        removeFromCart(id);
      });
    });
  }

  function showToast(message) {
    if (!toastElement) return;
    toastMessage.innerHTML = message;
    const toast = new bootstrap.Toast(toastElement, { delay: 2500 });
    toast.show();
  }

  function openQuickView(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modal-img').src = product.image;
    document.getElementById('modal-title').textContent = product.name;
    document.getElementById('modal-category').textContent = product.category;
    document.getElementById('modal-price').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('modal-original-price').textContent = product.originalPrice > product.price ? `$${product.originalPrice.toFixed(2)}` : '';
    document.getElementById('modal-description').textContent = product.description;
    document.getElementById('modal-rating').textContent = `${product.rating} (${product.reviewsCount} reviews)`;

    const featuresList = document.getElementById('modal-features');
    featuresList.innerHTML = product.features.map(f => `<li><i class="bi bi-check-circle-fill text-success me-2"></i>${f}</li>`).join('');

    const modalAddBtn = document.getElementById('modal-add-cart-btn');
    modalAddBtn.onclick = () => {
      addToCart(product.id);
      quickViewModal.hide();
    };

    quickViewModal.show();
  }

  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      handleSearch('');
      setCategory('All');
      if (sortSelect) sortSelect.value = 'default';
      sortBy = 'default';
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) return;
      alert('🎉 Thank you for trying out LuxeMarket! Checkout system integration complete.');
      cart = [];
      saveCart();
      updateCartBadge();
      renderCartDrawer();
      const offcanvasElem = document.getElementById('cartOffcanvas');
      const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElem);
      if (bsOffcanvas) bsOffcanvas.hide();
    });
  }
});
