require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'novaimport-clave-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));

const { requireAuth } = require('./middleware/auth');
app.get('/admin.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

const productosRoutes = require('./routes/productos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const pqrsRoutes = require('./routes/pqrs.routes');
const garantiasRoutes = require('./routes/garantias.routes');
const authRoutes = require('./routes/auth.routes');
const clientesRoutes = require('./routes/clientes.routes');

app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pqrs', pqrsRoutes);
app.use('/api/garantias', garantiasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);

app.use(express.static('public'));

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Error al procesar el archivo' });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});