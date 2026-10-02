const pool = require('../config/db');

// GET /api/productos -> lista todos los productos
async function listarProductos(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
}

// GET /api/productos/:id -> obtiene un producto específico
async function obtenerProducto(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
}

// POST /api/productos -> crea un producto nuevo (multipart/form-data, campo "imagen" es el archivo)
async function crearProducto(req, res) {
  const { nombre, categoria, descripcion, precio, stock } = req.body;

  if (!nombre || !categoria || precio == null) {
    return res.status(400).json({ error: 'Faltan campos requeridos: nombre, categoria, precio' });
  }

  const imagen = req.file ? `/img/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO productos (nombre, categoria, descripcion, precio, stock, imagen)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, descripcion || null, precio, stock || 0, imagen]
    );
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
}

// PUT /api/productos/:id -> edita un producto (si se sube una nueva imagen, se reemplaza; si no, se conserva la actual)
async function editarProducto(req, res) {
  const { nombre, categoria, descripcion, precio, stock } = req.body;
  const nuevaImagen = req.file ? `/img/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `UPDATE productos
       SET nombre = COALESCE(?, nombre),
           categoria = COALESCE(?, categoria),
           descripcion = COALESCE(?, descripcion),
           precio = COALESCE(?, precio),
           stock = COALESCE(?, stock),
           imagen = COALESCE(?, imagen)
       WHERE id = ?`,
      [nombre ?? null, categoria ?? null, descripcion ?? null, precio ?? null, stock ?? null, nuevaImagen, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar el producto' });
  }
}

// DELETE /api/productos/:id -> elimina un producto
async function eliminarProducto(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await pool.query('DELETE FROM productos WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado', producto: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
}

module.exports = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  editarProducto,
  eliminarProducto,
};