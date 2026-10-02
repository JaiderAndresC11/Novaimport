const bcrypt = require('bcryptjs');
const pool = require('../config/db');


const REGLA_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

async function registrar(req, res) {
  const { nombre, correo, telefono, direccion, password } = req.body;

  if (!nombre || !correo || !telefono || !direccion || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!REGLA_PASSWORD.test(password)) {
    return res.status(400).json({
      error: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y un carácter especial (ej: !@#$%).',
    });
  }

  try {
    const [existentes] = await pool.query('SELECT id FROM clientes WHERE correo = ?', [correo]);
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo' });
    }

    // bcrypt "encripta" la contraseña de forma que no se puede revertir.
    // El número 10 es el "costo": entre más alto, más lento de calcular
    // (a propósito, así es más difícil de adivinar por fuerza bruta).
    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, correo, telefono, direccion, password_hash) VALUES (?, ?, ?, ?, ?)`,
      [nombre, correo, telefono, direccion, password_hash]
    );

    req.session.clienteId = result.insertId;
    req.session.clienteNombre = nombre;

    res.status(201).json({ mensaje: 'Cuenta creada correctamente', nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar la cuenta' });
  }
}

async function login(req, res) {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE correo = ?', [correo]);
    const cliente = rows[0];

    // Comparamos aunque no exista el cliente, para no revelar con el
    // tiempo de respuesta si el correo existe o no (buena práctica).
    const hashComparar = cliente ? cliente.password_hash : '$2a$10$invalidoinvalidoinvalidoinvalidoinvalidoinv';
    const passwordValido = await bcrypt.compare(password, hashComparar);

    if (!cliente || !passwordValido) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    req.session.clienteId = cliente.id;
    req.session.clienteNombre = cliente.nombre;

    res.json({
      mensaje: 'Sesión iniciada',
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

function logout(req, res) {
  req.session.clienteId = null;
  req.session.clienteNombre = null;
  res.json({ mensaje: 'Sesión cerrada' });
}

async function estado(req, res) {
  if (!req.session || !req.session.clienteId) {
    return res.json({ autenticado: false });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, telefono, direccion FROM clientes WHERE id = ?',
      [req.session.clienteId]
    );
    if (rows.length === 0) {
      return res.json({ autenticado: false });
    }
    res.json({ autenticado: true, ...rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la sesión' });
  }
}

module.exports = { registrar, login, logout, estado };