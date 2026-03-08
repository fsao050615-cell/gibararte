// ===== JWT SIMULADO =====
const JWT_SECRET = 'gibararte-secret-key-2025';

function createToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
  const finalPayload = { ...payload, exp };
  const encodedPayload = btoa(JSON.stringify(finalPayload));
  const signature = btoa(header + '.' + encodedPayload + JWT_SECRET);
  return header + '.' + encodedPayload + '.' + signature;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, encodedPayload, signature] = parts;
    const expectedSignature = btoa(header + '.' + encodedPayload + JWT_SECRET);
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(atob(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function saveToken(token) {
  localStorage.setItem('adminToken', token);
  document.cookie = `adminToken=${token}; path=/; max-age=7200`;
}

function getToken() {
  return localStorage.getItem('adminToken');
}

function removeToken() {
  localStorage.removeItem('adminToken');
  document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// ===== ADMIN PANEL =====
const ADMIN_USER = 'Karel';
const ADMIN_PASS = 'gibararte2025';
let isLoggedIn = false;
let uploadedImages = [];

// --- Verificar token al cargar ---
(function checkInitialToken() {
  const token = getToken();
  if (token && verifyToken(token)) {
    isLoggedIn = true;
  } else {
    removeToken();
    isLoggedIn = false;
  }
})();

// --- Abrir overlay ---
document.getElementById('adminFloatBtn').addEventListener('click', () => {
  document.getElementById('adminOverlay').classList.add('open');
  const token = getToken();
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    isLoggedIn = true;
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    refreshAdminProductsList();
    updateAdminStats();
  } else {
    isLoggedIn = false;
    removeToken();
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
  }
});

function closeAdminOverlay() {
  document.getElementById('adminOverlay').classList.remove('open');
}
document.getElementById('closeAdminLogin').addEventListener('click', closeAdminOverlay);
document.getElementById('closeAdminPanel').addEventListener('click', closeAdminOverlay);
document.getElementById('adminOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('adminOverlay')) closeAdminOverlay();
});

// --- Login ---
document.getElementById('doLogin').addEventListener('click', doLogin);
document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doLogin() {
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value;
  const err = document.getElementById('loginError');
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    const token = createToken({ user: u });
    saveToken(token);
    isLoggedIn = true;
    err.textContent = '';
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    window.showToast('✅ Bienvenido al panel de administración');
    refreshAdminProductsList();
    updateAdminStats();
  } else {
    err.textContent = '❌ Usuario o contraseña incorrectos';
    document.getElementById('adminPass').value = '';
    document.getElementById('adminPass').focus();
  }
}

// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', () => {
  removeToken();
  isLoggedIn = false;
  closeAdminOverlay();
  setTimeout(() => {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
  }, 400);
  window.showToast('↩ Sesión cerrada');
});

// --- Verificación de autenticación ---
function checkAuth() {
  const token = getToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    removeToken();
    isLoggedIn = false;
    closeAdminOverlay();
    window.showToast('⏰ Sesión expirada, inicia sesión nuevamente', true);
    return false;
  }
  return true;
}

// --- Tabs ---
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (!checkAuth()) return;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const t = tab.dataset.tab;
    ['nuevo','productos','stats'].forEach(id => {
      document.getElementById('tab-' + id).style.display = id === t ? 'block' : 'none';
    });
    if (t === 'productos') refreshAdminProductsList();
    if (t === 'stats') updateAdminStats();
  });
});

// --- Subida de imágenes ---
const photoInput = document.getElementById('photoInput');
const uploadPreview = document.getElementById('uploadPreview');
const uploadZone = document.getElementById('uploadZone');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (!checkAuth()) return;
  handleFiles(e.dataTransfer.files);
});

photoInput.addEventListener('change', e => {
  if (!checkAuth()) return;
  handleFiles(e.target.files);
});

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { window.showToast('⚠️ Imagen muy grande (máx. 5MB)', true); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      uploadedImages.push(ev.target.result);
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.className = 'preview-thumb';
      img.title = file.name;
      img.addEventListener('click', () => {
        const idx = uploadedImages.indexOf(ev.target.result);
        if (idx > -1) uploadedImages.splice(idx, 1);
        img.remove();
      });
      uploadPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// --- Crear producto (POST) ---
document.getElementById('submitProduct').addEventListener('click', async () => {
  if (!checkAuth()) return;

  const name = document.getElementById('newName').value.trim();
  const price = parseFloat(document.getElementById('newPrice').value);
  const desc = document.getElementById('newDesc').value.trim();
  const category = document.getElementById('newCategory').value;
  const badge = document.getElementById('newBadge').value || null;
  const emoji = document.getElementById('newEmoji').value.trim() || '🪵';
  const stock = parseInt(document.getElementById('newStock').value) || 1;

  if (!name) { window.showToast('⚠️ El nombre es obligatorio', true); return; }
  if (!price || price < 1) { window.showToast('⚠️ Introduce un precio válido', true); return; }
  if (!desc) { window.showToast('⚠️ La descripción es obligatoria', true); return; }

  const newProduct = {
    name,
    price,
    desc,
    category,
    badge,
    emoji,
    stock,
    image: uploadedImages[0] || null,
    variants: [] // por ahora vacío
  };

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    if (!response.ok) throw new Error('Error al crear producto');
    const saved = await response.json();
    window.showToast(`✅ "${saved.name}" publicado en la tienda`);
    
    // Resetear formulario
    document.getElementById('newName').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newDesc').value = '';
    document.getElementById('newEmoji').value = '';
    document.getElementById('newStock').value = '';
    document.getElementById('newBadge').value = '';
    uploadedImages = [];
    uploadPreview.innerHTML = '';
    photoInput.value = '';

    closeAdminOverlay();
    await loadProducts(); // recargar productos globales
    setTimeout(() => document.getElementById('productos').scrollIntoView({ behavior:'smooth' }), 400);
  } catch (error) {
    console.error(error);
    window.showToast('❌ Error al guardar producto', true);
  }
});

// --- Refrescar lista de productos en admin (GET) ---
async function refreshAdminProductsList() {
  if (!checkAuth()) return;

  const list = document.getElementById('adminProductsList');
  const count = document.getElementById('adminProductCount');
  
  // Usar productos globales (ya cargados por main.js)
  const prods = window.products || [];
  count.textContent = prods.length;

  if (prods.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;font-family:Oswald;letter-spacing:2px;font-size:0.8rem;">No hay productos publicados aún</p>';
    return;
  }

  list.innerHTML = '';
  [...prods].reverse().forEach(p => {
    const row = document.createElement('div');
    row.className = 'admin-product-row';
    row.id = 'admin-row-' + p._id;

    const catMap = { folklore:'Folklore', musica:'Música', naturaleza:'Naturaleza', animales:'Animales', otros:'Otros' };

    row.innerHTML = `
      <div class="admin-product-img">
        ${p.image ? `<img src="${p.image}" alt="${p.name}">` : p.emoji}
      </div>
      <div class="admin-product-info">
        <strong>${p.name}</strong>
        <small>${catMap[p.category] || p.category} · Stock: ${p.stock || 1} · ID: ${p._id.slice(-4)}</small>
      </div>
      <div class="admin-product-price">$${p.price}</div>
      <div class="admin-row-actions">
        <button class="admin-action-btn edit" data-id="${p._id}" title="Editar precio">✏️</button>
        <button class="admin-action-btn toggle" data-id="${p._id}" title="Ocultar/Mostrar">👁</button>
        <button class="admin-action-btn delete" data-id="${p._id}" title="Eliminar">🗑</button>
      </div>`;

    // Editar precio (PUT)
    row.querySelector('.edit').addEventListener('click', async () => {
      if (!checkAuth()) return;
      const newPrice = prompt(`Nuevo precio para "${p.name}" (actual: $${p.price} USD):`);
      if (newPrice !== null) {
        const parsed = parseFloat(newPrice);
        if (!isNaN(parsed) && parsed > 0) {
          try {
            const response = await fetch(`${API_URL}/products/${p._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price: parsed })
            });
            if (!response.ok) throw new Error();
            p.price = parsed;
            row.querySelector('.admin-product-price').textContent = `$${parsed}`;
            window.renderProducts();
            window.showToast(`✏️ Precio actualizado a $${parsed} USD`);
          } catch {
            window.showToast('❌ Error al actualizar precio', true);
          }
        } else { window.showToast('⚠️ Precio inválido', true); }
      }
    });

    // Ocultar/Mostrar (toggle hidden) - se maneja localmente, pero idealmente debería persistir en BD
    row.querySelector('.toggle').addEventListener('click', () => {
      if (!checkAuth()) return;
      p.hidden = !p.hidden;
      row.style.opacity = p.hidden ? '0.35' : '1';
      window.renderProducts();
      window.showToast(p.hidden ? `👁 "${p.name}" ocultado de la tienda` : `👁 "${p.name}" visible en la tienda`);
    });

    // Eliminar (DELETE)
    row.querySelector('.delete').addEventListener('click', async () => {
      if (!checkAuth()) return;
      if (!confirm(`¿Eliminar "${p.name}" permanentemente?`)) return;
      try {
        const response = await fetch(`${API_URL}/products/${p._id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error();
        row.style.animation = 'none';
        row.style.opacity = '0';
        row.style.transform = 'translateX(30px)';
        row.style.transition = 'all 0.3s';
        setTimeout(async () => {
          await loadProducts(); // recargar productos globales
          refreshAdminProductsList();
        }, 300);
        window.showToast(`🗑 "${p.name}" eliminado`);
      } catch {
        window.showToast('❌ Error al eliminar producto', true);
      }
    });

    list.appendChild(row);
  });
}

// --- Estadísticas (usa productos globales) ---
function updateAdminStats() {
  if (!checkAuth()) return;

  const all = window.products || [];
  const prices = all.map(p => p.price);
  const cats = [...new Set(all.map(p => p.category))];
  const totalStock = all.reduce((s, p) => s + (p.stock || 1), 0);

  document.getElementById('statTotal').textContent = all.length;
  document.getElementById('statCats').textContent = cats.length;
  document.getElementById('statAvgPrice').textContent = all.length ? '$' + (prices.reduce((a,b)=>a+b,0)/prices.length).toFixed(0) : '$0';
  document.getElementById('statMinPrice').textContent = all.length ? '$' + Math.min(...prices) : '$0';
  document.getElementById('statMaxPrice').textContent = all.length ? '$' + Math.max(...prices) : '$0';
  document.getElementById('statStock').textContent = totalStock;

  const catMap = { folklore:'Folklore', musica:'Música', naturaleza:'Naturaleza', animales:'Animales', otros:'Otros' };
  const catColors = { folklore:'var(--rojo)', musica:'var(--amarillo)', naturaleza:'var(--verde)', animales:'var(--naranja)', otros:'var(--azul)' };
  const statsByCat = document.getElementById('statsByCat');
  statsByCat.innerHTML = '';
  cats.forEach(cat => {
    const count = all.filter(p => p.category === cat).length;
    const pct = all.length ? Math.round(count / all.length * 100) : 0;
    statsByCat.innerHTML += `
      <div style="display:flex;align-items:center;gap:1rem">
        <div style="font-family:'Oswald';font-size:0.75rem;letter-spacing:2px;text-transform:uppercase;color:var(--text-muted);width:90px;flex-shrink:0">${catMap[cat]||cat}</div>
        <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${catColors[cat]||'var(--naranja)'};border-radius:4px;transition:width 0.8s cubic-bezier(0.16,1,0.3,1)"></div>
        </div>
        <div style="font-family:'Oswald';font-size:0.8rem;color:var(--amarillo);width:40px;text-align:right">${count} (${pct}%)</div>
      </div>`;
  });
  if (!cats.length) statsByCat.innerHTML = '<p style="color:var(--text-muted);font-family:Oswald;font-size:0.8rem;letter-spacing:2px">Sin datos aún</p>';
}