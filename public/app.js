const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => fmt.format(Number(n) || 0);

let productos = [];
let carrito = [];
let categoriaActiva = 'todos';

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

  card.innerHTML = `
    <span class="card-category">${escapeHtml(p.categoria)}</span>
    <h3 class="card-name">${escapeHtml(p.nombre)}</h3>
    <p class="card-desc">${escapeHtml(p.descripcion || '')}</p>
    <div class="card-footer">
      <span class="card-price">${money(p.precio)}</span>
      <span class="card-stock ${stockClass}">${stockTexto}</span>
    </div>
    <button class="btn-add" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}</button>
  `;

  if (p.stock > 0) {
    card.querySelector('.btn-add').addEventListener('click', () => agregarAlCarrito(p));
  }

  return card;
}

function agregarAlCarrito(producto) {
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
  const productosPedido = carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }));

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_nombre, cliente_contacto, productos: productosPedido }),
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarProductos();
});