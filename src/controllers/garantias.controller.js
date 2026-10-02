const pool = require('../config/db');
const { enviarCorreo } = require('../config/mailer');

async function crearGarantia(req, res) {
  const { nombre, contacto, producto, descripcion } = req.body;

  if (!nombre || !contacto || !producto || !descripcion) {
    return res.status(400).json({ error: 'Se requiere nombre, contacto, producto y descripcion' });
  }

  const archivo = req.file ? `/uploads/garantias/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO garantias (nombre, contacto, producto, descripcion, archivo) VALUES (?, ?, ?, ?, ?)`,
      [nombre, contacto, producto, descripcion, archivo]
    );
    const [rows] = await pool.query('SELECT numero_caso FROM vista_garantias WHERE id = ?', [result.insertId]);
    const numero_caso = rows[0].numero_caso;
    res.status(201).json({ id: result.insertId, numero_caso, mensaje: `Solicitud registrada correctamente. Tu número de caso es ${numero_caso}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la solicitud' });
  }
}

async function listarGarantias(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM vista_garantias ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las solicitudes de garantía' });
  }
}

// GET /api/garantias/:id -> la solicitud completa + su historial de comentarios
async function obtenerGarantia(req, res) {
  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_garantias WHERE id = ?', [req.params.id]);
    if (casoRows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const [comentarios] = await pool.query(
      `SELECT * FROM comentarios WHERE tipo = 'garantia' AND referencia_id = ? ORDER BY creado_en ASC`,
      [req.params.id]
    );
    res.json({ ...casoRows[0], comentarios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la solicitud' });
  }
}

// POST /api/garantias/:id/comentarios -> agrega un comentario Y le avisa al cliente por correo
async function agregarComentarioGarantia(req, res) {
  const { comentario } = req.body;
  if (!comentario) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_garantias WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await pool.query(
      `INSERT INTO comentarios (tipo, referencia_id, autor, comentario) VALUES ('garantia', ?, 'Administrador', ?)`,
      [req.params.id, comentario]
    );

    await enviarCorreo(
      caso.contacto,
      `Actualización de tu solicitud ${caso.numero_caso} — NovaImport`,
      `<p>Hola ${caso.nombre},</p>
       <p>Tu solicitud de garantía <strong>${caso.numero_caso}</strong> tiene una nueva actualización:</p>
       <blockquote style="border-left:3px solid #FF6B35;padding-left:12px;color:#333">${comentario}</blockquote>
       <p>— Equipo NovaImport</p>`
    );

    res.status(201).json({ mensaje: 'Comentario agregado y cliente notificado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar el comentario' });
  }
}

async function actualizarEstadoGarantia(req, res) {
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'en_revision', 'aprobada', 'rechazada'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${estadosValidos.join(', ')}` });
  }

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_garantias WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    await pool.query('UPDATE garantias SET estado = ? WHERE id = ?', [estado, req.params.id]);

    // Estados finales ("se cierra el caso") -> avisamos por correo.
    if (estado === 'aprobada' || estado === 'rechazada') {
      const veredicto = estado === 'aprobada' ? 'aprobada' : 'rechazada';
      await enviarCorreo(
        caso.contacto,
        `Tu solicitud de garantía ${caso.numero_caso} fue ${veredicto} — NovaImport`,
        `<p>Hola ${caso.nombre},</p>
         <p>Tu solicitud de garantía <strong>${caso.numero_caso}</strong> ha sido <strong>${veredicto}</strong>.</p>
         <p>Si tienes alguna duda adicional, puedes contactarnos de nuevo.</p>
         <p>— Equipo NovaImport</p>`
      );
    }

    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
}

module.exports = { crearGarantia, listarGarantias, obtenerGarantia, agregarComentarioGarantia, actualizarEstadoGarantia };