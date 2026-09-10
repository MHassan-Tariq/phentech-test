/**
 * LuxeMarket Product Listing Application Logic
 * Manages rendering, real-time search, category filtering, sorting, and cart state.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let cart = JSON.parse(localStorage.getItem('luxemarket_cart')) || [];
  let currentCategory = 'All';
  let searchQuery = '';
  let sortBy = 'default';

  // DOM Elements
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

  // Initialize App
  initCategoryFilters();
  updateCartBadge();
  renderCartDrawer();
  renderProducts();

  // --- Category Filters Setup ---
  function initCategoryFilters() {
    // Extract unique categories
    const categories = ['All', ...new Set(productsData.map(p => p.category))];

    // Render Pills
    categoryContainer.innerHTML = categories.map(cat => `
      <button class="category-btn ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">
        ${cat}
      </button>
    `).join('');

    // Render Select options for mobile view sync
    categorySelect.innerHTML = categories.map(cat => `
      <option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>
    `).join('');

    // Event listeners for category buttons
    categoryContainer.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.target.getAttribute('data-category');
        setCategory(cat);
      });
    });

    // Event listener for select dropdown
    categorySelect.addEventListener('change', (e) => {
      setCategory(e.target.value);
    });
  }

  function setCategory(category) {
    currentCategory = category;
    
    // Update active class on pills
    categoryContainer.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });

    // Update select element value
    categorySelect.value = category;

    renderProducts();
  }

  // --- Search Listeners ---
  function handleSearch(query) {
    searchQuery = query.trim().toLowerCase();
    
    // Sync both search inputs (navbar search and main filter bar search)
    if (searchInput) searchInput.value = query;
    if (navSearchInput) navSearchInput.value = query;

    // Toggle clear search button visibility
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

  // --- Sorting Listener ---
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderProducts();
    });
  }

  // --- Render Products Function ---
  function renderProducts() {
    // 1. Filter by category
    let filtered = productsData.filter(product => {
      const matchCategory = (currentCategory === 'All') || (product.category === currentCategory);
      const matchQuery = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery) || 
        product.description.toLowerCase().includes(searchQuery) ||
        product.category.toLowerCase().includes(searchQuery);
      return matchCategory && matchQuery;
    });

    // 2. Sort Products
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Update results counter
    resultsCount.textContent = `Showing ${filtered.length} of ${productsData.length} products`;

    // Handle empty state
    if (filtered.length === 0) {
      productsGrid.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    productsGrid.style.display = 'flex';
    emptyState.style.display = 'none';

    // 3. Render HTML Grid cards (3 per row desktop: col-lg-4, 2 per row tablet: col-md-6, 1 per row mobile: col-12)
    productsGrid.innerHTML = filtered.map(product => {
      const isDiscounted = product.originalPrice > product.price;
      
      return `
        <div class="col-12 col-md-6 col-lg-4 d-flex align-items-stretch">
          <div class="product-card w-100">
            <!-- Badge -->
            ${product.badge ? `
              <div class="card-badge-top">
                <span class="badge ${product.badgeType}">${product.badge}</span>
              </div>
            ` : ''}
            
            <!-- Quick View Icon Button -->
            <button class="btn-quick-view" data-id="${product.id}" title="Quick View">
              <i class="bi bi-eye"></i>
            </button>

            <!-- Image Container -->
            <div class="card-img-wrapper">
              <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>

            <!-- Card Body -->
            <div class="card-body p-4 d-flex flex-column justify-content-between">
              <div>
                <span class="category-tag">${product.category}</span>
                <h3 class="product-title">${product.name}</h3>
                
                <!-- Rating -->
                <div class="rating-wrapper">
                  <i class="bi bi-star-fill"></i>
                  <span class="fw-bold text-dark me-1">${product.rating}</span>
                  <span class="rating-text">(${product.reviewsCount} reviews)</span>
                </div>

                <p class="product-description">${product.description}</p>
              </div>

              <!-- Card Footer: Price & Add to Cart -->
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

    // Attach Event Listeners to generated buttons
    attachCardEventListeners();
  }

  function attachCardEventListeners() {
    // Add to Cart buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        addToCart(id, e.currentTarget);
      });
    });

    // Quick View buttons
    document.querySelectorAll('.btn-quick-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.getAttribute('data-id'));
        openQuickView(id);
      });
    });
  }

  // --- Cart Operations ---
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

    // UI button feedback micro-animation
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

    // Trigger bounce animation on badge update
    cartBadge.classList.remove('bounce');
    void cartBadge.offsetWidth; // trigger reflow
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

    // Free Shipping Progress
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

    // Attach listeners to cart drawer quantity & delete buttons
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

  // --- Toast Notification ---
  function showToast(message) {
    if (!toastElement) return;
    toastMessage.innerHTML = message;
    const toast = new bootstrap.Toast(toastElement, { delay: 2500 });
    toast.show();
  }

  // --- Quick View Modal Functionality ---
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

  // Global reset search & filters button in Empty State
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      handleSearch('');
      setCategory('All');
      if (sortSelect) sortSelect.value = 'default';
      sortBy = 'default';
    });
  }

  // Checkout Button Trigger
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
