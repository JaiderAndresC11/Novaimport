const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (n) => fmt.format(Number(n) || 0);
const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

// ===================== PESTAÑAS =====================
document.querySelectorAll('.admin-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// ===================== PRODUCTOS =====================
async function cargarProductosAdmin() {
  const tbody = document.getElementById('tbody-productos');
  try {
    const res = await fetch('/api/productos');
    const productos = await res.json();

    if (productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay productos todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    productos.forEach((p) => {
      const tr = document.createElement('tr');
      const imgSrc = p.imagen || '';
      tr.innerHTML = `
        <td>${imgSrc ? `<img class="admin-thumb" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.nombre)}" onerror="this.style.visibility='hidden'" />` : '—'}</td>
        <td>${escapeHtml(p.nombre)}</td>
        <td><strong>${escapeHtml(p.capacidad || '—')}</strong></td>
        <td>${escapeHtml(p.descripcion || '—')}</td>
        <td>${escapeHtml(p.categoria)}</td>
        <td>${money(p.precio)}</td>
        <td>${p.stock}</td>
        <td class="admin-actions">
          <button class="btn-small" data-editar="${p.id}">Editar</button>
          <button class="btn-small danger" data-eliminar="${p.id}">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-editar]').forEach((btn) => {
      btn.addEventListener('click', () => abrirFormularioProducto(productos.find((p) => p.id == btn.dataset.editar)));
    });
    tbody.querySelectorAll('[data-eliminar]').forEach((btn) => {
      btn.addEventListener('click', () => eliminarProducto(btn.dataset.eliminar));
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Error al cargar los productos.</td></tr>';
  }
}

function abrirFormularioProducto(producto) {
  document.getElementById('form-producto').reset();
  const actualEl = document.getElementById('producto-imagen-actual');

  if (producto) {
    document.getElementById('producto-form-titulo').textContent = `Editar: ${producto.nombre}`;
    document.getElementById('producto-id').value = producto.id;
    document.getElementById('producto-nombre').value = producto.nombre;
    document.getElementById('producto-categoria').value = producto.categoria;
    document.getElementById('producto-capacidad').value = producto.capacidad || '';
    document.getElementById('producto-descripcion').value = producto.descripcion || '';
    document.getElementById('producto-precio').value = producto.precio;
    document.getElementById('producto-stock').value = producto.stock;
    actualEl.textContent = producto.imagen ? '(ya tiene imagen — sube una solo si quieres reemplazarla)' : '';
  } else {
    document.getElementById('producto-form-titulo').textContent = 'Nuevo producto';
    document.getElementById('producto-id').value = '';
    actualEl.textContent = '';
  }

  document.getElementById('producto-msg').textContent = '';
  document.getElementById('producto-overlay').classList.remove('hidden');
  document.getElementById('producto-drawer').classList.remove('hidden');
}

function cerrarFormularioProducto() {
  document.getElementById('producto-overlay').classList.add('hidden');
  document.getElementById('producto-drawer').classList.add('hidden');
}

document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirFormularioProducto(null));
document.getElementById('btn-cerrar-producto').addEventListener('click', cerrarFormularioProducto);
document.getElementById('producto-overlay').addEventListener('click', cerrarFormularioProducto);

document.getElementById('form-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('producto-msg');
  msgEl.textContent = 'Guardando...';
  msgEl.className = 'checkout-msg enviando';

  const id = document.getElementById('producto-id').value;
  const formData = new FormData();
  formData.append('nombre', document.getElementById('producto-nombre').value);
  formData.append('categoria', document.getElementById('producto-categoria').value);
  formData.append('capacidad', document.getElementById('producto-capacidad').value);
  formData.append('descripcion', document.getElementById('producto-descripcion').value);
  formData.append('precio', document.getElementById('producto-precio').value);
  formData.append('stock', document.getElementById('producto-stock').value);
  const archivo = document.getElementById('producto-imagen').files[0];
  if (archivo) formData.append('imagen', archivo);

  try {
    const url = id ? `/api/productos/${id}` : '/api/productos';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo guardar el producto');

    msgEl.textContent = '¡Producto guardado!';
    msgEl.className = 'checkout-msg';
    cargarProductosAdmin();
    setTimeout(cerrarFormularioProducto, 900);
  } catch (err) {
    console.error(err);
    msgEl.textContent = err.message || 'Error al guardar el producto';
    msgEl.className = 'checkout-msg error';
  }
});

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
  try {
    const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');
    cargarProductosAdmin();
  } catch (err) {
    alert(err.message || 'Error al eliminar el producto');
  }
}

// ===================== PQR'S / GARANTÍAS =====================
const ESTADOS_PQRS = ['pendiente', 'en_proceso', 'resuelto'];
const ESTADOS_GARANTIAS = ['pendiente', 'en_revision', 'aprobada', 'rechazada'];

function renderArchivo(ruta) {
  if (!ruta) return '—';
  const esVideo = /\.(mp4|mov|avi|webm)$/i.test(ruta);
  return `<a class="admin-file-link" href="${escapeHtml(ruta)}" target="_blank" rel="noopener">${esVideo ? 'Ver video' : 'Ver foto'}</a>`;
}

function formatEstado(estado) {
  return (estado || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function obtenerTelefonoCaso(caso) {
  const valor = caso && (caso.telefono || caso.contacto);
  if (!valor) return '—';
  const texto = String(valor).trim();
  if (/^[+]?[(]?[0-9]{1,4}[)]?[-\s0-9]{7,15}$/.test(texto) && !texto.includes('@')) {
    return texto;
  }
  return '—';
}

function renderSelectEstado(estados, actual, onChange) {
  const select = document.createElement('select');
  select.className = 'estado-select';
  estados.forEach((estado) => {
    const opt = document.createElement('option');
    opt.value = estado;
    opt.textContent = formatEstado(estado);
    if (estado === actual) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function renderEstadoSelectDetalle(tipo, actual, onChange) {
  const select = document.getElementById('caso-estado-select');
  const estados = tipo === 'pqrs' ? ESTADOS_PQRS : ESTADOS_GARANTIAS;
  select.innerHTML = '';

  estados.forEach((estado) => {
    const opt = document.createElement('option');
    opt.value = estado;
    opt.textContent = formatEstado(estado);
    if (estado === actual) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = () => onChange(select.value);
}

async function cargarPqrs() {
  const tbody = document.getElementById('tbody-pqrs');
  try {
    const res = await fetch('/api/pqrs');
    const casos = await res.json();
    document.getElementById('count-pqrs').textContent = casos.length;

    if (casos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay casos registrados.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    casos.forEach((c) => {
      const tr = document.createElement('tr');
      const telefono = obtenerTelefonoCaso(c);
      const contacto = c.contacto ? escapeHtml(c.contacto) : '—';
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.numero_caso)}</strong></td>
        <td>${escapeHtml(c.nombre)}<br><span class="admin-file-link" style="color:var(--ink-muted)">${contacto}</span>${telefono !== '—' ? `<br><span class="admin-file-link" style="color:var(--ink-muted)">${escapeHtml(telefono)}</span>` : ''}</td>
        <td>${escapeHtml(c.tipo)}</td>
        <td>${escapeHtml(c.descripcion)}</td>
        <td>${renderArchivo(c.archivo)}</td>
        <td>${fecha(c.creado_en)}</td>
        <td class="td-estado"></td>
        <td><button class="btn-small" data-ver-pqrs="${c.id}">Ver</button></td>
      `;
      tr.querySelector('.td-estado').appendChild(renderSelectEstado(ESTADOS_PQRS, c.estado, (nuevoEstado) => actualizarEstado('pqrs', c.id, nuevoEstado)));
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-ver-pqrs]').forEach((btn) => {
      btn.addEventListener('click', () => abrirDetalleCaso('pqrs', btn.dataset.verPqrs));
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error al cargar los casos.</td></tr>';
  }
}

async function cargarGarantias() {
  const tbody = document.getElementById('tbody-garantias');
  try {
    const res = await fetch('/api/garantias');
    const casos = await res.json();
    document.getElementById('count-garantias').textContent = casos.length;

    if (casos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay solicitudes registradas.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    casos.forEach((c) => {
      const tr = document.createElement('tr');
      const telefono = obtenerTelefonoCaso(c);
      const contacto = c.contacto ? escapeHtml(c.contacto) : '—';
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.numero_caso)}</strong></td>
        <td>${escapeHtml(c.nombre)}<br><span class="admin-file-link" style="color:var(--ink-muted)">${contacto}</span>${telefono !== '—' ? `<br><span class="admin-file-link" style="color:var(--ink-muted)">${escapeHtml(telefono)}</span>` : ''}</td>
        <td>${escapeHtml(c.producto)}</td>
        <td>${escapeHtml(c.descripcion)}</td>
        <td>${renderArchivo(c.archivo)}</td>
        <td>${fecha(c.creado_en)}</td>
        <td class="td-estado"></td>
        <td><button class="btn-small" data-ver-garantia="${c.id}">Ver</button></td>
      `;
      tr.querySelector('.td-estado').appendChild(renderSelectEstado(ESTADOS_GARANTIAS, c.estado, (nuevoEstado) => actualizarEstado('garantias', c.id, nuevoEstado)));
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-ver-garantia]').forEach((btn) => {
      btn.addEventListener('click', () => abrirDetalleCaso('garantias', btn.dataset.verGarantia));
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Error al cargar las solicitudes.</td></tr>';
  }
}

async function actualizarEstado(recurso, id, estado) {
  try {
    const res = await fetch(`/api/${recurso}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el estado');

    if (recurso === 'pqrs') {
      await cargarPqrs();
    } else {
      await cargarGarantias();
    }

    const modalAbierto = !document.getElementById('caso-overlay').classList.contains('hidden');
    if (modalAbierto && document.getElementById('caso-id').value == id && document.getElementById('caso-tipo').value === recurso) {
      await abrirDetalleCaso(recurso, id);
    }
  } catch (err) {
    alert(err.message || 'Error al actualizar el estado');
    recurso === 'pqrs' ? cargarPqrs() : cargarGarantias();
  }
}

// ===================== DETALLE DE CASO + COMENTARIOS =====================
async function abrirDetalleCaso(tipo, id) {
  document.getElementById('caso-tipo').value = tipo;
  document.getElementById('caso-id').value = id;
  document.getElementById('comentario-msg').textContent = '';

  try {
    const res = await fetch(`/api/${tipo}/${id}`);
    const caso = await res.json();
    if (!res.ok) throw new Error(caso.error || 'No se pudo cargar el caso');

    document.getElementById('caso-numero').textContent = caso.numero_caso;
    document.getElementById('caso-nombre-cliente').textContent = caso.nombre || '—';
    document.getElementById('caso-contacto-cliente').textContent = caso.contacto || '—';
    document.getElementById('caso-telefono-cliente').textContent = obtenerTelefonoCaso(caso);
    document.getElementById('caso-tipo-cliente').textContent = caso.producto || caso.tipo || '—';
    document.getElementById('caso-fecha').textContent = fecha(caso.creado_en || new Date());
    document.getElementById('caso-descripcion').textContent = caso.descripcion || '—';
    document.getElementById('caso-archivo-wrap').innerHTML = renderArchivo(caso.archivo);
    renderEstadoSelectDetalle(tipo, caso.estado, (nuevoEstado) => actualizarEstado(tipo, id, nuevoEstado));

    const cont = document.getElementById('caso-comentarios');
    if (!caso.comentarios || caso.comentarios.length === 0) {
      cont.innerHTML = '<p class="empty-state">Sin comentarios todavía.</p>';
    } else {
      cont.innerHTML = '';
      caso.comentarios.forEach((c) => {
        const div = document.createElement('div');
        div.className = 'caso-comentario';
        div.innerHTML = `
          <div class="caso-comentario-meta">${escapeHtml(c.autor)} · ${fecha(c.creado_en)}</div>
          <div class="caso-comentario-texto">${escapeHtml(c.comentario)}</div>
        `;
        cont.appendChild(div);
      });
    }

    document.getElementById('caso-overlay').classList.remove('hidden');
    document.getElementById('caso-drawer').classList.remove('hidden');
  } catch (err) {
    alert(err.message || 'Error al cargar el caso');
  }
}

function cerrarDetalleCaso() {
  document.getElementById('caso-overlay').classList.add('hidden');
  document.getElementById('caso-drawer').classList.add('hidden');
  document.getElementById('form-comentario').reset();
}

document.getElementById('btn-cerrar-caso').addEventListener('click', cerrarDetalleCaso);
document.getElementById('caso-overlay').addEventListener('click', cerrarDetalleCaso);

document.getElementById('form-comentario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipo = document.getElementById('caso-tipo').value;
  const id = document.getElementById('caso-id').value;
  const msgEl = document.getElementById('comentario-msg');
  msgEl.textContent = 'Enviando y notificando al cliente...';
  msgEl.className = 'checkout-msg enviando';

  try {
    const res = await fetch(`/api/${tipo}/${id}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comentario: document.getElementById('comentario-texto').value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar el comentario');

    msgEl.textContent = '¡Comentario enviado! El cliente fue notificado por correo.';
    msgEl.className = 'checkout-msg';
    document.getElementById('comentario-texto').value = '';
    abrirDetalleCaso(tipo, id); // recarga el historial con el nuevo comentario
  } catch (err) {
    msgEl.textContent = err.message || 'Error al enviar el comentario';
    msgEl.className = 'checkout-msg error';
  }
});

// ===================== SOLICITUDES DE ACCESO ADMIN =====================
async function cargarSolicitudes() {
  const tbody = document.getElementById('tbody-solicitudes');
  try {
    const res = await fetch('/api/auth/solicitudes');
    const solicitudes = await res.json();

    const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length;
    document.getElementById('count-solicitudes').textContent = pendientes;

    if (solicitudes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay solicitudes todavía.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    solicitudes.forEach((s) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(s.nombre)}</td>
        <td>${escapeHtml(s.correo)}</td>
        <td>${fecha(s.creado_en)}</td>
        <td><span class="badge badge-${s.estado}">${s.estado}</span></td>
        <td class="admin-actions"></td>
      `;
      const tdAcciones = tr.querySelector('.admin-actions');

      if (s.estado === 'pendiente') {
        const btnAprobar = document.createElement('button');
        btnAprobar.className = 'btn-small success';
        btnAprobar.textContent = 'Aprobar';
        btnAprobar.addEventListener('click', () => actualizarSolicitud(s.id, 'aprobado'));

        const btnRechazar = document.createElement('button');
        btnRechazar.className = 'btn-small danger';
        btnRechazar.textContent = 'Rechazar';
        btnRechazar.addEventListener('click', () => actualizarSolicitud(s.id, 'rechazado'));

        tdAcciones.appendChild(btnAprobar);
        tdAcciones.appendChild(btnRechazar);
      } else {
        tdAcciones.innerHTML = '—';
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error al cargar las solicitudes.</td></tr>';
  }
}

async function actualizarSolicitud(id, estado) {
  try {
    const res = await fetch(`/api/auth/solicitudes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la solicitud');
    cargarSolicitudes();
  } catch (err) {
    alert(err.message || 'Error al actualizar la solicitud');
  }
}

// ===================== INICIO =====================
document.getElementById('btn-logout').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin-login.html';
});

document.addEventListener('DOMContentLoaded', () => {
  cargarProductosAdmin();
  cargarPqrs();
  cargarGarantias();
  cargarSolicitudes();
});