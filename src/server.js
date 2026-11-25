require('dotenv').config();
const { createGateway } = require('./gateway');
const sessions = require('./config/session');

const app = createGateway({ sessionMiddleware: sessions.middleware });
const port = process.env.PORT || 3000;

sessions.waitUntilReady().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`API gateway escuchando en el puerto ${port}`);
  });
}).catch((err) => {
  console.error('No se pudo iniciar la API gateway:', err);
  process.exit(1);
});
