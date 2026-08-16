require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const productosRoutes = require('./routes/productos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');

app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'API de NovaImport funcionando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
