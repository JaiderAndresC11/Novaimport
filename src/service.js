require('dotenv').config();
const express = require('express');
const cors = require('cors');
const services = require('./config/services');
const sessions = require('./config/session');

const serviceName = process.argv[2];
const service = services.find((item) => item.name === serviceName);

if (!service) {
  console.error(`Servicio desconocido: ${serviceName || '(sin nombre)'}`);
  console.error(`Servicios disponibles: ${services.map((item) => item.name).join(', ')}`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(sessions.middleware);
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: service.name }));
app.use(service.prefix, require(service.router));

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Error al procesar el archivo' });
  }
  next();
});

const port = process.env.SERVICE_PORT || service.port;

sessions.waitUntilReady().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Servicio ${service.name} escuchando en el puerto ${port}`);
  });
}).catch((err) => {
  console.error(`No se pudo iniciar el servicio ${service.name}:`, err);
  process.exit(1);
});
