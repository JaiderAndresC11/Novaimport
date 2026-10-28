const path = require('path');
const pool = require('../config/db');
const { enviarCorreo } = require('../config/mailer');

async function crearPqrs(req, res) {
  const { nombre, contacto, tipo, descripcion } = req.body;

  if (!nombre || !contacto || !descripcion) {
    return res.status(400).json({ error: 'Se requiere nombre, contacto y descripcion' });
  }

  const archivo = req.file ? `/uploads/pqrs/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO pqrs (nombre, contacto, tipo, descripcion, archivo) VALUES (?, ?, ?, ?, ?)`,
      [nombre, contacto, tipo || 'reclamo', descripcion, archivo]
    );
    const [rows] = await pool.query('SELECT numero_caso FROM vista_pqrs WHERE id = ?', [result.insertId]);
    const numero_caso = rows[0].numero_caso;
    res.status(201).json({ id: result.insertId, numero_caso, mensaje: `Caso registrado correctamente. Tu número de caso es ${numero_caso}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el caso' });
  }
}

async function listarPqrs(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM vista_pqrs ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los casos de PQR\'S' });
  }
}

async function obtenerPqrs(req, res) {
  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_pqrs WHERE id = ?', [req.params.id]);
    if (casoRows.length === 0) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }
    const [comentarios] = await pool.query(
      `SELECT * FROM comentarios WHERE tipo = 'pqrs' AND referencia_id = ? ORDER BY creado_en ASC`,
      [req.params.id]
    );
    res.json({ ...casoRows[0], comentarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el caso' });
  }
}

// POST /api/pqrs/:id/comentarios (multipart: comentario + archivo opcional)
async function agregarComentarioPqrs(req, res) {
  const { comentario } = req.body;
  if (!comentario) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  const archivoGuardado = req.file ? `/uploads/comentarios/${req.file.filename}` : null;
  const archivoLocalAbsoluto = req.file ? path.join(__dirname, '..', '..', 'public', 'uploads', 'comentarios', req.file.filename) : null;

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_pqrs WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    await pool.query(
      `INSERT INTO comentarios (tipo, referencia_id, autor, comentario, archivo) VALUES ('pqrs', ?, 'Administrador', ?, ?)`,
      [req.params.id, comentario, archivoGuardado]
    );

    await enviarCorreo(
      caso.contacto,
      `Actualización de tu caso ${caso.numero_caso} — NovaImport`,
      {
        nombre: caso.nombre,
        numeroCaso: caso.numero_caso,
        estado: caso.estado,
        tituloMensaje: 'Nueva actualización de tu caso',
        cuerpoMensaje: comentario,
      },
      archivoLocalAbsoluto
    );

    res.status(201).json({ mensaje: 'Comentario agregado y cliente notificado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar el comentario' });
  }
}

async function actualizarEstadoPqrs(req, res) {
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'en_proceso', 'resuelto'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${estadosValidos.join(', ')}` });
  }

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_pqrs WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Caso no encontrado' });
    }

    await pool.query('UPDATE pqrs SET estado = ? WHERE id = ?', [estado, req.params.id]);

    if (estado === 'resuelto') {
      await enviarCorreo(
        caso.contacto,
        `Tu caso ${caso.numero_caso} fue cerrado — NovaImport`,
        {
          nombre: caso.nombre,
          numeroCaso: caso.numero_caso,
          estado: 'resuelto',
          tituloMensaje: 'Tu caso ha sido cerrado',
          cuerpoMensaje: 'Gracias por tu paciencia. Si tienes alguna duda adicional, puedes contactarnos de nuevo.',
        }
      );
    }

    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
}

module.exports = { crearPqrs, listarPqrs, obtenerPqrs, agregarComentarioPqrs, actualizarEstadoPqrs };