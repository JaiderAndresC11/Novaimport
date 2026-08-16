const pool = require('../config/db');

async function crearPedido(req, res) {
  const { cliente_nombre, cliente_contacto, productos } = req.body;

  if (!cliente_nombre || !cliente_contacto || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      error: 'Se requiere cliente_nombre, cliente_contacto, y una lista de productos [{producto_id, cantidad}]',
    });
  }

  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    let total = 0;
    const detalles = [];

    for (const item of productos) {
      const [rows] = await conexion.query('SELECT * FROM productos WHERE id = ? FOR UPDATE', [item.producto_id]);
      const producto = rows[0];

      if (!producto) {
        throw new Error(`El producto con id ${item.producto_id} no existe`);
      }
      if (producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock})`);
      }

      const subtotal = Number(producto.precio) * item.cantidad;
      total += subtotal;
      detalles.push({ producto_id: producto.id, cantidad: item.cantidad, precio_unitario: producto.precio });
    }

    const [resultPedido] = await conexion.query(
      `INSERT INTO pedidos (cliente_nombre, cliente_contacto, total) VALUES (?, ?, ?)`,
      [cliente_nombre, cliente_contacto, total]
    );
    const pedidoId = resultPedido.insertId;

    for (const d of detalles) {
      await conexion.query(
        `INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`,
        [pedidoId, d.producto_id, d.cantidad, d.precio_unitario]
      );
      await conexion.query(
        `UPDATE productos SET stock = stock - ? WHERE id = ?`,
        [d.cantidad, d.producto_id]
      );
    }

    await conexion.commit();

    res.status(201).json({ id: pedidoId, cliente_nombre, cliente_contacto, total, estado: 'pendiente' });
  } catch (err) {
    await conexion.rollback();
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    conexion.release();
  }
}

async function listarPedidos(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM pedidos ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
}

async function obtenerPedido(req, res) {
  try {
    const [pedidoRows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
    if (pedidoRows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const [detalleRows] = await pool.query(
      `SELECT dp.cantidad, dp.precio_unitario, p.nombre, p.id AS producto_id
       FROM detalle_pedidos dp
       JOIN productos p ON p.id = dp.producto_id
       WHERE dp.pedido_id = ?`,
      [req.params.id]
    );

    res.json({ ...pedidoRows[0], productos: detalleRows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
}

async function actualizarEstado(req, res) {
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'pagado', 'enviado', 'cancelado'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${estadosValidos.join(', ')}` });
  }

  try {
    const [result] = await pool.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
}

module.exports = { crearPedido, listarPedidos, obtenerPedido, actualizarEstado };
