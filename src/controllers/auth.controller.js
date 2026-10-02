const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// ===================== LOGIN =====================
// Dos caminos posibles:
// 1) El súper-admin definido en .env (ADMIN_USER / ADMIN_PASSWORD) —
//    siempre puede entrar, así nunca te quedas sin acceso al panel.
// 2) Un administrador de la tabla `administradores`, pero SOLO si su
//    estado es "aprobado" — si está "pendiente" o "rechazado", se le
//    niega el acceso aunque la contraseña sea correcta.
async function login(req, res) {
  const { usuario, password } = req.body;

  // Camino 1: súper-admin del .env
  if (usuario === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.adminNombre = 'Administrador principal';
    return res.json({ mensaje: 'Sesión iniciada correctamente' });
  }

  // Camino 2: administrador registrado y aprobado (usa su correo como "usuario")
  try {
    const [rows] = await pool.query('SELECT * FROM administradores WHERE correo = ?', [usuario]);
    const admin = rows[0];

    const hashComparar = admin ? admin.password_hash : '$2a$10$invalidoinvalidoinvalidoinvalidoinvalidoinv';
    const passwordValido = await bcrypt.compare(password, hashComparar);

    if (!admin || !passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    if (admin.estado === 'pendiente') {
      return res.status(403).json({ error: 'Tu cuenta todavía no ha sido aprobada por un administrador.' });
    }
    if (admin.estado === 'rechazado') {
      return res.status(403).json({ error: 'Tu solicitud de acceso fue rechazada.' });
    }

    req.session.isAdmin = true;
    req.session.adminNombre = admin.nombre;
    res.json({ mensaje: 'Sesión iniciada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ mensaje: 'Sesión cerrada' });
  });
}

function estado(req, res) {
  res.json({ autenticado: !!(req.session && req.session.isAdmin), nombre: req.session ? req.session.adminNombre : null });
}

// ===================== SOLICITUD DE ACCESO (pública) =====================
async function solicitarAcceso(req, res) {
  const { nombre, correo, password } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!REGLA_PASSWORD.test(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y un carácter especial.',
    });
  }

  try {
    const [existentes] = await pool.query('SELECT id FROM administradores WHERE correo = ?', [correo]);
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ya existe una solicitud o cuenta con ese correo' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO administradores (nombre, correo, password_hash, estado) VALUES (?, ?, ?, 'pendiente')`,
      [nombre, correo, password_hash]
    );

    res.status(201).json({ mensaje: 'Tu solicitud fue enviada. Un administrador debe aprobarla antes de que puedas ingresar.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar la solicitud' });
  }
}

// ===================== GESTIÓN DE SOLICITUDES (protegidas) =====================
async function listarSolicitudes(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, estado, creado_en FROM administradores ORDER BY creado_en DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las solicitudes' });
  }
}

async function actualizarSolicitud(req, res) {
  const { estado: nuevoEstado } = req.body;
  const estadosValidos = ['pendiente', 'aprobado', 'rechazado'];

  if (!estadosValidos.includes(nuevoEstado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${estadosValidos.join(', ')}` });
  }

  try {
    const [result] = await pool.query('UPDATE administradores SET estado = ? WHERE id = ?', [nuevoEstado, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    res.json({ mensaje: 'Estado actualizado', estado: nuevoEstado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la solicitud' });
  }
}

module.exports = { login, logout, estado, solicitarAcceso, listarSolicitudes, actualizarSolicitud };