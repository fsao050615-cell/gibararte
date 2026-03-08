// ===== VARIABLES GLOBALES =====
let products = [];
let cart = [];
let activeFilter = 'all';

const grid = document.getElementById('productsGrid');
const filterBtns = document.getElementById('filterBtns');
const cartOverlay = document.getElementById('cartOverlay');
const cartPanel = document.getElementById('cartPanel');
const variantsOverlay = document.getElementById('variantsOverlay');
const variantsContent = document.getElementById('variantsContent');
const closeVariants = document.getElementById('closeVariants');

// ===== CONFIGURACIÓN =====
const API_URL = 'http://localhost:5000/api';

// ===== CARGAR PRODUCTOS DESDE LA API =====
async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    products = await response.json();
    renderProducts();
    if (typeof updateAdminProductsList === 'function') updateAdminProductsList();
    if (typeof updateAdminStats === 'function') updateAdminStats();
  } catch (error) {
    console.error('Error al cargar productos:', error);
    showToast('Error al cargar productos', true);
  }
}

// ===== RENDER PRODUCTOS =====
function renderProducts() {
  const filtered = (activeFilter === 'all' ? products : products.filter(p => p.category === activeFilter))
    .filter(p => !p.hidden);
  grid.innerHTML = '';
  filtered.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card fade-up';
    card.style.transitionDelay = `${i * 0.05}s`;

    const imgHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1">`
      : '';

    card.innerHTML = `
      ${p.badge ? `<span class="product-badge badge-${p.badge}">${p.badge === 'hot' ? '🔥 Popular' : p.badge === 'new' ? '✨ Nuevo' : '⏳ Limitado'}</span>` : ''}
      <div class="product-image" style="position:relative">
        <div class="wood-grain"></div>
        ${imgHtml}
        <span style="position:relative;z-index:${p.image?0:2}">${p.image?'':p.emoji}</span>
      </div>
      <div class="product-info">
        <p class="product-category">${getCategoryName(p.category)}</p>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <div class="product-price"><span class="currency">$</span>${p.price} <small style="font-size:0.6rem;color:var(--text-muted);font-family:'Oswald'">USD</small></div>
          <button class="add-to-cart" data-id="${p._id}" title="Añadir al carrito">
            <span>+</span>
          </button>
        </div>
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart')) return;
      openVariantsModal(p);
    });

    grid.appendChild(card);
    setTimeout(() => card.classList.add('visible'), 50 + i * 60);
  });

  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.dataset.id;
      const product = products.find(p => p._id === productId);
      addToCart(product);
      btn.classList.add('added');
      btn.innerHTML = '<span>✓</span>';
      setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = '<span>+</span>'; }, 800);
    });
  });
}

function getCategoryName(cat) {
  const map = { folklore:'Folklore', musica:'Música', naturaleza:'Naturaleza', animales:'Animales', otros:'Otros' };
  return map[cat] || cat;
}

// ===== CARRITO =====
function addToCart(product) {
  const existing = cart.find(i => i._id === product._id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });
  updateCart();
  showToast(`✓ ${product.name} añadido al carrito`);
}

function updateCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)} USD`;

  const itemsEl = document.getElementById('cartItems');
  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><span class="empty-icon">🪵</span><p>Tu carrito está vacío</p></div>`;
    return;
  }
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item._id}">
      <span class="cart-item-emoji">${item.emoji}</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${item.price} USD × ${item.qty} = <strong>$${(item.price * item.qty).toFixed(2)}</strong></div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-action="minus" data-id="${item._id}">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-action="plus" data-id="${item._id}">+</button>
      </div>
      <button class="remove-item" data-id="${item._id}">✕</button>
    </div>`).join('');

  itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = cart.find(i => i._id === id);
      if (btn.dataset.action === 'plus') item.qty++;
      else { item.qty--; if (item.qty <= 0) cart = cart.filter(i => i._id !== id); }
      updateCart();
    });
  });
  itemsEl.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      cart = cart.filter(i => i._id !== id);
      updateCart();
    });
  });
}

// ===== MODAL DE VARIANTES =====
function openVariantsModal(product) {
  const variants = product.variants && product.variants.length ? product.variants : [{
    name: product.name,
    price: product.price,
    emoji: product.emoji,
    desc: product.desc,
    image: product.image
  }];

  variantsContent.innerHTML = variants.map(v => `
    <div class="variant-item">
      <div class="variant-img">
        ${v.image ? `<img src="${v.image}" alt="${v.name}">` : v.emoji}
      </div>
      <div class="variant-info">
        <div class="variant-name">${v.name}</div>
        <div class="variant-desc">${v.desc}</div>
        <div class="variant-footer">
          <div class="variant-price">$${v.price} USD</div>
          <button class="add-variant-btn" data-product-id="${product._id}" data-variant-name="${v.name}" data-variant-price="${v.price}" data-variant-emoji="${v.emoji}">Añadir al carrito</button>
        </div>
      </div>
    </div>
  `).join('');

  variantsContent.querySelectorAll('.add-variant-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const variantId = btn.dataset.productId + '-' + btn.dataset.variantName.replace(/\s+/g, '');
      const variant = {
        _id: variantId,
        name: btn.dataset.variantName,
        price: parseFloat(btn.dataset.variantPrice),
        emoji: btn.dataset.variantEmoji,
        qty: 1
      };
      const existing = cart.find(i => i._id === variantId);
      if (existing) existing.qty++;
      else cart.push(variant);
      updateCart();
      showToast(`✓ ${variant.name} añadido al carrito`);
      closeVariantsModal();
    });
  });

  variantsOverlay.classList.add('open');
}

function closeVariantsModal() {
  variantsOverlay.classList.remove('open');
}

// ===== FILTROS =====
filterBtns.addEventListener('click', e => {
  if (e.target.classList.contains('filter-btn')) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    activeFilter = e.target.dataset.filter;
    renderProducts();
  }
});

// ===== CARRITO OPEN/CLOSE =====
document.getElementById('cartToggle').addEventListener('click', () => { cartOverlay.classList.add('open'); cartPanel.classList.add('open'); });
document.getElementById('closeCart').addEventListener('click', closeCartFn);
cartOverlay.addEventListener('click', closeCartFn);
function closeCartFn() { cartOverlay.classList.remove('open'); cartPanel.classList.remove('open'); }

// ===== CLEAR CART =====
document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (cart.length === 0) { showToast('El carrito ya está vacío', true); return; }
  cart = [];
  updateCart();
  showToast('🗑 Carrito vaciado');
});

// ===== ENVIAR PEDIDO POR EMAIL =====
document.getElementById('sendOrderBtn').addEventListener('click', () => {
  const email = document.getElementById('emailInput').value.trim();
  if (cart.length === 0) { showToast('❌ Tu carrito está vacío', true); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('❌ Introduce un email válido', true); return; }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const subject = encodeURIComponent('Pedido Gibararte – ' + new Date().toLocaleDateString('es-ES'));
  const body = encodeURIComponent(
    `¡Hola Gibararte!\n\nMe gustaría realizar el siguiente pedido:\n\n` +
    cart.map(i => `• ${i.name} × ${i.qty} = $${(i.price * i.qty).toFixed(2)} USD`).join('\n') +
    `\n\n────────────────────\nTOTAL: $${total.toFixed(2)} USD\n────────────────────\n\nEmail de contacto: ${email}\n\nGracias!`
  );

  window.location.href = `mailto:gibararte@gmail.com?subject=${subject}&body=${body}&cc=${encodeURIComponent(email)}`;
  showToast('📩 Abriendo cliente de correo...');
});

// ===== TOAST =====
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${isError ? 'error' : ''} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== INTERSECTION OBSERVER (fade-up) =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ===== CONTADORES ESTÁTICOS =====
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target.querySelector('[data-target]');
      if (el && !el.dataset.done) {
        el.dataset.done = true;
        const target = parseInt(el.dataset.target);
        let current = 0;
        const step = target / 60;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = Math.floor(current) + (target >= 100 ? '+' : '');
          if (current >= target) clearInterval(timer);
        }, 16);
      }
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-card').forEach(el => counterObserver.observe(el));

// ===== CERRAR MODAL DE VARIANTES =====
closeVariants.addEventListener('click', closeVariantsModal);
variantsOverlay.addEventListener('click', (e) => {
  if (e.target === variantsOverlay) closeVariantsModal();
});

// ===== HAMBURGUESA =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const menuOverlay = document.getElementById('menuOverlay');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
  menuOverlay.classList.toggle('open');
});
menuOverlay.addEventListener('click', () => {
  hamburger.classList.remove('open');
  navLinks.classList.remove('open');
  menuOverlay.classList.remove('open');
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  hamburger.classList.remove('open');
  navLinks.classList.remove('open');
  menuOverlay.classList.remove('open');
}));

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 50 ? '0 4px 30px rgba(0,0,0,0.5)' : 'none';
});

// ===== INICIALIZAR =====
loadProducts();

// ===== GLOBALS PARA ADMIN.JS =====
window.products = products; // se actualizará después de load
window.renderProducts = renderProducts;
window.showToast = showToast;
window.loadProducts = loadProducts;
window.API_URL = API_URL;