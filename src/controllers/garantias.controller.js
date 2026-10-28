const path = require('path');
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
    const [rows] = await pool.query("SELECT * FROM vista_garantias WHERE estado <> 'cerrada' ORDER BY creado_en DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las solicitudes de garantía' });
  }
}

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

async function agregarComentarioGarantia(req, res) {
  const { comentario } = req.body;
  if (!comentario) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  const archivoGuardado = req.file ? `/uploads/comentarios/${req.file.filename}` : null;
  const archivoLocalAbsoluto = req.file ? path.join(__dirname, '..', '..', 'public', 'uploads', 'comentarios', req.file.filename) : null;

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_garantias WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (caso.estado === 'cerrada') {
      return res.status(409).json({ error: 'No se pueden agregar comentarios a una solicitud cerrada' });
    }

    await pool.query(
      `INSERT INTO comentarios (tipo, referencia_id, autor, comentario, archivo) VALUES ('garantia', ?, 'Administrador', ?, ?)`,
      [req.params.id, comentario, archivoGuardado]
    );

    await enviarCorreo(
      caso.contacto,
      `Actualización de tu solicitud ${caso.numero_caso} — NovaImport`,
      {
        nombre: caso.nombre,
        numeroCaso: caso.numero_caso,
        estado: caso.estado,
        tituloMensaje: 'Nueva actualización de tu solicitud',
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

async function actualizarEstadoGarantia(req, res) {
  const { estado } = req.body;
  const estadosValidos = ['pendiente', 'en_revision', 'aprobada', 'rechazada', 'cerrada'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${estadosValidos.join(', ')}` });
  }

  try {
    const [casoRows] = await pool.query('SELECT * FROM vista_garantias WHERE id = ?', [req.params.id]);
    const caso = casoRows[0];
    if (!caso) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (caso.estado === 'cerrada') {
      return res.status(409).json({ error: 'La solicitud ya está cerrada y no se puede modificar' });
    }
    if (caso.estado === estado) {
      return res.json({ mensaje: 'La solicitud ya tenía ese estado', estado });
    }

    await pool.query('UPDATE garantias SET estado = ? WHERE id = ?', [estado, req.params.id]);

    const etiquetaEstado = {
      pendiente: 'Pendiente',
      en_revision: 'En revisión',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cerrada: 'Cerrada',
    }[estado];
    const estaCerrada = estado === 'cerrada';
    await enviarCorreo(
      caso.contacto,
      estaCerrada
        ? `Tu solicitud de garantía ${caso.numero_caso} fue cerrada — NovaImport`
        : `Actualización de tu solicitud de garantía ${caso.numero_caso} — NovaImport`,
      {
        nombre: caso.nombre,
        numeroCaso: caso.numero_caso,
        estado,
        tituloMensaje: estaCerrada ? 'Tu solicitud ha sido cerrada' : 'Tu solicitud fue actualizada',
        cuerpoMensaje: estaCerrada
          ? 'Hemos cerrado tu solicitud de garantía. Gracias por comunicarte con NovaImport.'
          : `El estado de tu solicitud ahora es: ${etiquetaEstado}. Te enviaremos otra actualización cuando haya novedades.`,
      }
    );

    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el estado' });
  }
}

module.exports = { crearGarantia, listarGarantias, obtenerGarantia, agregarComentarioGarantia, actualizarEstadoGarantia };