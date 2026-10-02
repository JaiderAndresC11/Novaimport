const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => fmt.format(Number(n) || 0);

let productos = [];
let carrito = [];
let categoriaActiva = 'todos';

const IDS_IMAGEN_CONTAIN = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19, 22];

async function cargarProductos() {
  const grid = document.getElementById('grid-productos');
  try {
    const res = await fetch('/api/productos');
    productos = await res.json();
    construirFiltros();
    renderGrid();
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">No se pudieron cargar los productos.</p>';
    console.error(err);
  }
}

function construirFiltros() {
  const categorias = [...new Set(productos.map((p) => p.categoria))];
  const contenedor = document.getElementById('filters');
  contenedor.innerHTML = '';

  const chipTodos = document.createElement('button');
  chipTodos.className = 'filter-chip' + (categoriaActiva === 'todos' ? ' active' : '');
  chipTodos.textContent = 'Todos';
  chipTodos.addEventListener('click', () => { categoriaActiva = 'todos'; construirFiltros(); renderGrid(); });
  contenedor.appendChild(chipTodos);

  categorias.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (categoriaActiva === cat ? ' active' : '');
    chip.textContent = cat;
    chip.addEventListener('click', () => { categoriaActiva = cat; construirFiltros(); renderGrid(); });
    contenedor.appendChild(chip);
  });
}

function renderGrid() {
  const grid = document.getElementById('grid-productos');
  const lista = categoriaActiva === 'todos' ? productos : productos.filter((p) => p.categoria === categoriaActiva);

  if (lista.length === 0) {
    grid.innerHTML = '<p class="empty-state">No hay productos en esta categoría.</p>';
    return;
  }

  grid.innerHTML = '';
  lista.forEach((p) => grid.appendChild(renderCard(p)));
}

function renderCard(p) {
  const card = document.createElement('div');
  card.className = 'card';

  const stockClass = p.stock === 0 ? 'out' : p.stock <= 2 ? 'low' : '';
  const stockTexto = p.stock === 0 ? 'Agotado' : `${p.stock} disponibles`;
  const imagenSrc = p.imagen || '/img/placeholder.webp';
  const claseAjuste = IDS_IMAGEN_CONTAIN.includes(p.id) ? ' ajustar' : '';

  card.innerHTML = `
    <div class="card-image${claseAjuste}">
      <img src="${escapeHtml(imagenSrc)}" alt="${escapeHtml(p.nombre)}" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.remove();" />
    </div>
    <span class="card-category">${escapeHtml(p.categoria)}</span>
    <h3 class="card-name">${escapeHtml(p.nombre)}</h3>
    <p class="card-desc">${escapeHtml(p.descripcion || '')}</p>
    <div class="card-footer">
      <span class="card-price">${money(p.precio)}</span>
      <span class="card-stock ${stockClass}">${stockTexto}</span>
    </div>
    <div class="card-actions">
      <button class="btn-add" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}</button>
      <button class="btn-buy" ${p.stock === 0 ? 'disabled' : ''}>Comprar ahora</button>
    </div>
  `;

  if (p.stock > 0) {
    card.querySelector('.btn-add').addEventListener('click', () => agregarAlCarrito(p));
    card.querySelector('.btn-buy').addEventListener('click', () => comprarAhora(p));
  }

  const imgEl = card.querySelector('.card-image img');
  if (imgEl) {
    imgEl.addEventListener('click', () => abrirImagenGrande(imagenSrc, p.nombre));
  }

  return card;
}

function abrirImagenGrande(src, alt) {
  const overlay = document.getElementById('lightbox-overlay');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.alt = alt;
  overlay.classList.remove('hidden');
}

function cerrarImagenGrande() {
  document.getElementById('lightbox-overlay').classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
}

function agregarAlCarrito(producto) {
  if (!clienteActual) {
    redirigirARegistro();
    return;
  }

  const existente = carrito.find((i) => i.producto_id === producto.id);
  if (existente) {
    if (existente.cantidad < producto.stock) existente.cantidad += 1;
  } else {
    carrito.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: 1,
      stockDisponible: producto.stock,
    });
  }
  renderCarrito();
  abrirCarrito();
}

function comprarAhora(producto) {
  if (!clienteActual) {
    redirigirARegistro();
    return;
  }

  carrito = [{
    producto_id: producto.id,
    nombre: producto.nombre,
    precio: Number(producto.precio),
    cantidad: 1,
    stockDisponible: producto.stock,
  }];
  renderCarrito();
  abrirCarrito();
  const inputNombre = document.getElementById('input-nombre');
  if (inputNombre) inputNombre.focus();
}

function redirigirARegistro() {
  abrirPanel('registro-overlay', 'registro-drawer');
  const msgEl = document.getElementById('registro-msg');
  msgEl.textContent = 'Crea tu cuenta (o inicia sesión si ya tienes una) para poder comprar.';
  msgEl.className = 'checkout-msg';
}

function cambiarCantidad(producto_id, delta) {
  const item = carrito.find((i) => i.producto_id === producto_id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) {
    carrito = carrito.filter((i) => i.producto_id !== producto_id);
  } else if (item.cantidad > item.stockDisponible) {
    item.cantidad = item.stockDisponible;
  }
  renderCarrito();
}

function renderCarrito() {
  const cont = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const countEl = document.getElementById('cart-count');

  const totalUnidades = carrito.reduce((sum, i) => sum + i.cantidad, 0);
  countEl.textContent = totalUnidades;

  if (carrito.length === 0) {
    cont.innerHTML = '<p class="empty-state">Tu carrito está vacío.</p>';
    totalEl.textContent = money(0);
    return;
  }

  cont.innerHTML = '';
  let total = 0;
  carrito.forEach((item) => {
    total += item.precio * item.cantidad;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.nombre)}</div>
        <div class="cart-item-price">${money(item.precio)} c/u</div>
      </div>
      <div class="qty-controls">
        <button type="button" class="btn-menos">−</button>
        <span>${item.cantidad}</span>
        <button type="button" class="btn-mas">+</button>
      </div>
    `;
    row.querySelector('.btn-menos').addEventListener('click', () => cambiarCantidad(item.producto_id, -1));
    row.querySelector('.btn-mas').addEventListener('click', () => cambiarCantidad(item.producto_id, 1));
    cont.appendChild(row);
  });

  totalEl.textContent = money(total);
}

function abrirCarrito() {
  document.getElementById('cart-overlay').classList.remove('hidden');
  document.getElementById('cart-drawer').classList.remove('hidden');
}

function cerrarCarrito() {
  document.getElementById('cart-overlay').classList.add('hidden');
  document.getElementById('cart-drawer').classList.add('hidden');
}

function abrirPanel(overlayId, drawerId) {
  document.getElementById(overlayId).classList.remove('hidden');
  document.getElementById(drawerId).classList.remove('hidden');
}

function cerrarPanel(overlayId, drawerId) {
  document.getElementById(overlayId).classList.add('hidden');
  document.getElementById(drawerId).classList.add('hidden');
}

document.getElementById('btn-abrir-carrito').addEventListener('click', abrirCarrito);
document.getElementById('btn-cerrar-carrito').addEventListener('click', cerrarCarrito);
document.getElementById('cart-overlay').addEventListener('click', cerrarCarrito);

document.getElementById('form-checkout').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('checkout-msg');

  if (carrito.length === 0) {
    msgEl.textContent = 'Tu carrito está vacío.';
    msgEl.className = 'checkout-msg error';
    return;
  }

  const cliente_nombre = document.getElementById('input-nombre').value;
  const cliente_contacto = document.getElementById('input-contacto').value;
  const telefono = document.getElementById('input-telefono').value;
  const direccion = document.getElementById('input-direccion').value;
  const metodo_pago = document.getElementById('input-metodo-pago').value;
  const productosPedido = carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }));

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_nombre, cliente_contacto, telefono, direccion, metodo_pago, productos: productosPedido }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'No se pudo crear el pedido');

    msgEl.textContent = '¡Pedido #' + data.id + ' confirmado! Total: ' + money(data.total);
    msgEl.className = 'checkout-msg';
    carrito = [];
    renderCarrito();
    document.getElementById('form-checkout').reset();
    setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'checkout-msg'; cerrarCarrito(); }, 4000);
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message || 'Error al crear el pedido';
    msgEl.className = 'checkout-msg error';
  }
});

document.getElementById('lightbox-close').addEventListener('click', cerrarImagenGrande);
document.getElementById('lightbox-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox-overlay') cerrarImagenGrande();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarImagenGrande();
});

// --- PQR'S ---
document.getElementById('btn-abrir-pqrs').addEventListener('click', () => abrirPanel('pqrs-overlay', 'pqrs-drawer'));
document.getElementById('btn-cerrar-pqrs').addEventListener('click', () => cerrarPanel('pqrs-overlay', 'pqrs-drawer'));
document.getElementById('pqrs-overlay').addEventListener('click', () => cerrarPanel('pqrs-overlay', 'pqrs-drawer'));

document.getElementById('form-pqrs').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('pqrs-msg');
  msgEl.textContent = 'Enviando...';
  msgEl.className = 'checkout-msg enviando';

  const formData = new FormData();
  formData.append('nombre', document.getElementById('pqrs-nombre').value);
  formData.append('contacto', document.getElementById('pqrs-contacto').value);
  formData.append('tipo', document.getElementById('pqrs-tipo').value);
  formData.append('descripcion', document.getElementById('pqrs-descripcion').value);
  const archivo = document.getElementById('pqrs-archivo').files[0];
  if (archivo) formData.append('archivo', archivo);

  try {
    const res = await fetch('/api/pqrs', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar el caso');

    msgEl.textContent = data.mensaje;
    msgEl.className = 'checkout-msg';
    document.getElementById('form-pqrs').reset();
    setTimeout(() => { msgEl.textContent = ''; cerrarPanel('pqrs-overlay', 'pqrs-drawer'); }, 4000);
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message || 'Error al enviar el caso';
    msgEl.className = 'checkout-msg error';
  }
});

// --- Garantías ---
document.getElementById('btn-abrir-garantias').addEventListener('click', () => abrirPanel('garantias-overlay', 'garantias-drawer'));
document.getElementById('btn-cerrar-garantias').addEventListener('click', () => cerrarPanel('garantias-overlay', 'garantias-drawer'));
document.getElementById('garantias-overlay').addEventListener('click', () => cerrarPanel('garantias-overlay', 'garantias-drawer'));

document.getElementById('form-garantias').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('garantias-msg');
  msgEl.textContent = 'Enviando...';
  msgEl.className = 'checkout-msg enviando';

  const formData = new FormData();
  formData.append('nombre', document.getElementById('garantias-nombre').value);
  formData.append('contacto', document.getElementById('garantias-contacto').value);
  formData.append('producto', document.getElementById('garantias-producto').value);
  formData.append('descripcion', document.getElementById('garantias-descripcion').value);
  const archivo = document.getElementById('garantias-archivo').files[0];
  if (archivo) formData.append('archivo', archivo);

  try {
    const res = await fetch('/api/garantias', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar la solicitud');

    msgEl.textContent = data.mensaje;
    msgEl.className = 'checkout-msg';
    document.getElementById('form-garantias').reset();
    setTimeout(() => { msgEl.textContent = ''; cerrarPanel('garantias-overlay', 'garantias-drawer'); }, 4000);
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message || 'Error al enviar la solicitud';
    msgEl.className = 'checkout-msg error';
  }
});

// ===================== TEMA CLARO / OSCURO =====================
// Regla clave: si NO hay sesión iniciada, el sitio siempre se ve en
// modo claro, sin excepción. El modo oscuro solo existe para clientes
// que iniciaron sesión, y su preferencia se recuerda por cuenta.
function aplicarTema(oscuro) {
  document.body.classList.toggle('tema-oscuro', oscuro);
  const switchTema = document.getElementById('switch-tema');
  if (switchTema) switchTema.checked = oscuro;
}

document.getElementById('switch-tema').addEventListener('change', (e) => {
  const nuevoValor = e.target.checked;
  aplicarTema(nuevoValor);
  // Solo guardamos la preferencia porque este switch solo es visible
  // para clientes con sesión iniciada (ver revisarSesionCliente).
  localStorage.setItem('novaimport-tema', nuevoValor ? 'oscuro' : 'claro');
});

// ===================== MENÚ DE CUENTA (avatar) =====================
function alternarDropdown() {
  document.getElementById('account-dropdown').classList.toggle('hidden');
}

document.getElementById('btn-avatar').addEventListener('click', (e) => {
  e.stopPropagation();
  alternarDropdown();
});
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('account-dropdown');
  const menu = document.getElementById('account-menu');
  if (!dropdown.classList.contains('hidden') && !menu.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

document.getElementById('btn-logout-cliente').addEventListener('click', async () => {
  await fetch('/api/clientes/logout', { method: 'POST' });
  window.location.reload();
});

// ===================== SESIÓN DE CLIENTE =====================
let clienteActual = null;

async function revisarSesionCliente() {
  try {
    const res = await fetch('/api/clientes/estado');
    const data = await res.json();

    if (data.autenticado) {
      clienteActual = data;
      document.getElementById('btn-abrir-login').classList.add('hidden');
      document.getElementById('btn-abrir-registro').classList.add('hidden');

      const primerNombre = data.nombre.split(' ')[0];
      document.getElementById('avatar-inicial').textContent = primerNombre.charAt(0).toUpperCase();
      document.getElementById('account-dropdown-nombre').textContent = `Hola, ${primerNombre}`;
      document.getElementById('account-menu').classList.remove('hidden');

      // Solo con sesión iniciada se aplica la preferencia de tema
      // que el cliente haya guardado antes.
      aplicarTema(localStorage.getItem('novaimport-tema') === 'oscuro');

      document.getElementById('input-nombre').value = data.nombre;
      document.getElementById('input-contacto').value = data.correo;
      document.getElementById('input-telefono').value = data.telefono;
      document.getElementById('input-direccion').value = data.direccion;
    } else {
      // Sin sesión: forzamos modo claro siempre, sin importar lo que
      // haya guardado en el navegador de una sesión anterior.
      document.getElementById('account-menu').classList.add('hidden');
      aplicarTema(false);
    }
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('btn-abrir-login').addEventListener('click', () => abrirPanel('login-overlay', 'login-drawer'));
document.getElementById('btn-cerrar-login').addEventListener('click', () => cerrarPanel('login-overlay', 'login-drawer'));
document.getElementById('login-overlay').addEventListener('click', () => cerrarPanel('login-overlay', 'login-drawer'));

document.getElementById('btn-abrir-registro').addEventListener('click', () => abrirPanel('registro-overlay', 'registro-drawer'));
document.getElementById('btn-cerrar-registro').addEventListener('click', () => cerrarPanel('registro-overlay', 'registro-drawer'));
document.getElementById('registro-overlay').addEventListener('click', () => cerrarPanel('registro-overlay', 'registro-drawer'));

document.getElementById('form-login-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('login-cliente-msg');
  msgEl.textContent = 'Ingresando...';
  msgEl.className = 'checkout-msg enviando';

  try {
    const res = await fetch('/api/clientes/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        correo: document.getElementById('login-correo').value,
        password: document.getElementById('login-cliente-password').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');

    window.location.reload();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'checkout-msg error';
  }
});

document.getElementById('form-registro-cliente').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('registro-msg');
  msgEl.textContent = 'Creando cuenta...';
  msgEl.className = 'checkout-msg enviando';

  try {
    const res = await fetch('/api/clientes/registrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: document.getElementById('registro-nombre').value,
        correo: document.getElementById('registro-correo').value,
        telefono: document.getElementById('registro-telefono').value,
        direccion: document.getElementById('registro-direccion').value,
        password: document.getElementById('registro-password').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo crear la cuenta');

    window.location.reload();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'checkout-msg error';
  }
});

// Checklist en vivo: marca cada requisito de la contraseña a medida
// que el usuario escribe, sin esperar a que envíe el formulario.
document.getElementById('registro-password').addEventListener('input', (e) => {
  const valor = e.target.value;
  const reglas = {
    longitud: valor.length >= 8,
    mayuscula: /[A-Z]/.test(valor),
    minuscula: /[a-z]/.test(valor),
    numero: /\d/.test(valor),
    especial: /[^A-Za-z0-9]/.test(valor),
  };

  Object.entries(reglas).forEach(([regla, cumplida]) => {
    const li = document.querySelector(`#password-checklist li[data-regla="${regla}"]`);
    if (li) li.classList.toggle('cumplido', cumplida);
  });
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
  revisarSesionCliente();
});